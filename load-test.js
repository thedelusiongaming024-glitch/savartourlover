#!/usr/bin/env node
/**
 * Staged load test for the locally running Docker container.
 *
 * Usage:
 *   npm install --no-save autocannon
 *   node load-test.js
 *
 * What it does:
 *   Runs a series of autocannon runs against http://localhost:3000 with
 *   increasing concurrent connections (10 -> 20 -> 50 -> 100 -> 200),
 *   30 seconds each, and prints a summary table at the end plus writes
 *   full results to load-test-results.json.
 *
 * While this runs, watch resource usage in another terminal with:
 *   docker stats savartourlover_app
 *
 * What to look for:
 *   - The stage where p99 latency spikes or errors/timeouts appear is
 *     roughly your practical ceiling on this droplet size (1 vCPU / 512MB).
 *   - Cross-reference with docker stats: if MEM USAGE approaches 512MiB
 *     or CPU % pins near 100% at the same stage, that confirms which
 *     resource is the bottleneck.
 */

const fs = require("fs");

const TARGET_URL = process.env.LOAD_TEST_URL || "http://localhost:3000";
const DURATION_SECONDS = 30;
const CONNECTION_STAGES = [10, 20, 50, 100, 200];

async function run() {
  let autocannon;
  try {
    autocannon = require("autocannon");
  } catch (err) {
    console.error(
      "\nMissing dependency. Install it first (no need to add it to package.json):\n" +
        "  npm install --no-save autocannon\n"
    );
    process.exit(1);
  }

  console.log(`Target: ${TARGET_URL}`);
  console.log(`Stages: ${CONNECTION_STAGES.join(", ")} concurrent connections, ${DURATION_SECONDS}s each`);
  console.log("Keep `docker stats savartourlover_app` running in another terminal while this runs.\n");

  const results = [];

  for (const connections of CONNECTION_STAGES) {
    console.log(`\n=== Stage: ${connections} concurrent connections ===`);

    const result = await new Promise((resolve, reject) => {
      const instance = autocannon(
        {
          url: TARGET_URL,
          connections,
          duration: DURATION_SECONDS,
          pipelining: 1,
        },
        (err, res) => {
          if (err) reject(err);
          else resolve(res);
        }
      );
      autocannon.track(instance, { renderProgressBar: true });
    });

    const summary = {
      connections,
      requestsPerSec: result.requests.average,
      latencyAvgMs: result.latency.average,
      latencyP99Ms: result.latency.p99,
      throughputMBps: (result.throughput.average / 1024 / 1024).toFixed(2),
      errors: result.errors,
      timeouts: result.timeouts,
      non2xx: result.non2xx,
    };

    results.push(summary);

    console.log(
      `  req/s avg: ${summary.requestsPerSec}  |  latency avg: ${summary.latencyAvgMs}ms  |  p99: ${summary.latencyP99Ms}ms  |  errors: ${summary.errors}  timeouts: ${summary.timeouts}  non2xx: ${summary.non2xx}`
    );

    if (summary.errors > 0 || summary.timeouts > 0) {
      console.log(`  -> Failures appeared at ${connections} connections. This is likely your practical ceiling.`);
      break;
    }
  }

  console.log("\n=== Summary ===");
  console.table(results);

  fs.writeFileSync("load-test-results.json", JSON.stringify(results, null, 2));
  console.log("\nFull results written to load-test-results.json");
  console.log(
    "Cross-check the stage where latency/errors jumped against docker stats output taken at the same time."
  );
}

run().catch((err) => {
  console.error("Load test failed:", err);
  process.exit(1);
});
