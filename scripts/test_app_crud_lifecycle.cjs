const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
let SUPABASE_URL = '';
let SUPABASE_SERVICE_ROLE_KEY = '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key === 'SUPABASE_URL' || (key === 'NEXT_PUBLIC_SUPABASE_URL' && !SUPABASE_URL)) {
        SUPABASE_URL = val;
      }
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
        SUPABASE_SERVICE_ROLE_KEY = val;
      }
    }
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BASE_URL = 'http://localhost:3000';

async function testAppCrudLifecycle() {
  console.log('\n======================================================================');
  console.log('   FULL APPLICATION CRUD & BI-DIRECTIONAL PERSISTENCE TEST');
  console.log('======================================================================\n');

  // Step 1: Admin Login to get Auth token
  console.log('1. Authenticating as Super Admin...');
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/staff/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'adminpassword123' })
  });
  const loginData = await loginRes.json();
  if (!loginData.access) {
    throw new Error('Admin login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.access;
  console.log('✓ Admin authenticated successfully. Access token acquired.');

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Step 2: Create a Destination via Admin API (Tier 1 + Tier 3 simultaneous write)
  const testDestId = `dest-test-${Date.now()}`;
  const testDestSlug = `test-sundarbans-${Date.now()}`;
  console.log(`\n2. Creating Destination "${testDestSlug}" via Admin API...`);
  
  const createDestRes = await fetch(`${BASE_URL}/api/v1/admin/destinations`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      id: testDestId,
      name: 'Sundarbans Mangrove Forest',
      slug: testDestSlug,
      division: 'KHULNA',
      tagline: 'World largest mangrove',
      description: 'UNESCO World Heritage wildlife safari',
      best_time_to_visit: 'November to February',
      status: 'published'
    })
  });
  const createDestData = await createDestRes.json();
  console.log('✓ Admin API Create Destination response status:', createDestRes.status);

  // Step 3: Verify Destination in Tier 1 (Public API)
  const getPubDestRes = await fetch(`${BASE_URL}/api/v1/destinations`);
  const pubDestData = await getPubDestRes.json();
  const list = Array.isArray(pubDestData) ? pubDestData : (pubDestData.results || []);
  const foundInTier1 = list.some(d => d.slug === testDestSlug);
  console.log(`✓ [Tier 1 - RAM/API] Destination immediately visible in Public API: ${foundInTier1}`);

  // Step 4: Verify Destination in Tier 3 (Supabase PostgreSQL directly)
  const { data: sbDest, error: sbDestErr } = await supabase
    .from('destinations')
    .select('*')
    .eq('slug', testDestSlug);
  
  const foundInTier3 = Boolean(sbDest && sbDest.length > 0);
  console.log(`✓ [Tier 3 - Supabase PostgreSQL] Destination immediately persisted in Cloud DB: ${foundInTier3}`);

  if (sbDest && sbDest.length > 0) {
    console.log(`  Supabase Record: ID=${sbDest[0].id}, Name="${sbDest[0].name}"`);
  }

  // Step 5: Delete Destination via Admin API
  console.log(`\n3. Deleting Destination via Admin API (Testing Deletion Sync)...`);
  const delDestRes = await fetch(`${BASE_URL}/api/v1/admin/destinations/${testDestId}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  console.log('✓ Admin API Delete Destination response status:', delDestRes.status);

  // Step 6: Verify Deletion in Tier 1 & Tier 3
  const getPubDestAfter = await fetch(`${BASE_URL}/api/v1/destinations`);
  const pubDestAfterData = await getPubDestAfter.json();
  const listAfter = Array.isArray(pubDestAfterData) ? pubDestAfterData : (pubDestAfterData.results || []);
  const existsInTier1After = listAfter.some(d => d.slug === testDestSlug);
  console.log(`✓ [Tier 1 - RAM/API] Destination deleted from memory/API: ${!existsInTier1After}`);

  const { data: sbDestAfter } = await supabase
    .from('destinations')
    .select('*')
    .eq('slug', testDestSlug);
  const existsInTier3After = Boolean(sbDestAfter && sbDestAfter.length > 0);
  console.log(`✓ [Tier 3 - Supabase PostgreSQL] Destination deleted from Cloud DB: ${!existsInTier3After}`);

  // Final Audit check
  console.log('\n======================================================================');
  console.log(`TEST RESULTS:`);
  console.log(`- Tier 1 RAM Read/Write:         ${foundInTier1 ? 'PASSED' : 'FAILED'}`);
  console.log(`- Tier 3 Supabase Instant Sync:  ${foundInTier3 ? 'PASSED' : 'FAILED'}`);
  console.log(`- Deletion Consistency:          ${(!existsInTier1After && !existsInTier3After) ? 'PASSED' : 'FAILED'}`);
  console.log('======================================================================\n');
}

testAppCrudLifecycle().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
