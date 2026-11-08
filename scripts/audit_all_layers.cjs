const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key);

async function fullAudit() {
  console.log('================================================================');
  console.log('       COMPLETE COMPREHENSIVE AUDIT OF ALL DATA LAYERS');
  console.log('================================================================\n');

  console.log('--- 1. TIER 3: Supabase Cloud PostgreSQL Tables (Master of Record) ---');
  const tables = [
    'destinations',
    'tours',
    'customers',
    'customer_activities',
    'bookings',
    'payments',
    'clearance_tickets',
    'operational_alerts',
    'offers',
    'testimonials',
    'blog_posts',
    'contact_inquiries',
    'staff_users',
    'homepage_blocks'
  ];

  for (const t of tables) {
    const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log('  ' + t.padEnd(24) + '=> ERROR: ' + error.message);
    } else {
      console.log('  ' + t.padEnd(24) + '=> ' + count + ' record(s)');
    }
  }

  console.log('\n--- 2. TIER 4: Supabase Storage Bucket Mirror (tourlover-data/db.json) ---');
  const { data: sData, error: sErr } = await sb.storage.from('tourlover-data').download('db.json');
  if (sErr) {
    console.log('  Storage download error:', sErr.message);
  } else {
    const json = JSON.parse(await sData.text());
    for (const [k, v] of Object.entries(json)) {
      if (Array.isArray(v)) {
        console.log('  ' + k.padEnd(24) + '=> ' + v.length + ' item(s)');
      }
    }
  }

  console.log('\n--- 3. TIER 2: Local Disk JSON Storage (.data/db.json) ---');
  if (fs.existsSync('.data/db.json')) {
    const local = JSON.parse(fs.readFileSync('.data/db.json', 'utf8'));
    for (const [k, v] of Object.entries(local)) {
      if (Array.isArray(v)) {
        console.log('  ' + k.padEnd(24) + '=> ' + v.length + ' item(s)');
      }
    }
  }

  console.log('\n--- 4. TIER 1: In-Memory / Live Next.js API Endpoints ---');
  // We can check how the live running server responds
  const http = require('http');
  const authPayload = JSON.stringify({ username: 'admin', password: 'adminpassword123' });
  
  const token = await new Promise((resolve) => {
    const req = http.request('http://localhost:3000/api/v1/auth/staff/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(authPayload)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const d = JSON.parse(b);
          resolve(d.access || null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.write(authPayload);
    req.end();
  });

  if (!token) {
    console.log('  Could not authenticate with local dev server.');
    return;
  }

  async function testApi(path) {
    return new Promise((resolve) => {
      http.get('http://localhost:3000' + path, {
        headers: { 'Authorization': 'Bearer ' + token }
      }, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => {
          try {
            resolve(JSON.parse(b));
          } catch {
            resolve({ rawLength: b.length });
          }
        });
      }).on('error', () => resolve({ error: 'connection failed' }));
    });
  }

  const custRes = await testApi('/api/v1/admin/customers');
  console.log('  /api/v1/admin/customers  =>', custRes.count !== undefined ? custRes.count + ' customer(s)' : custRes);

  const toursRes = await testApi('/api/v1/tours');
  console.log('  /api/v1/tours            =>', Array.isArray(toursRes.results) ? toursRes.results.length + ' tour(s)' : toursRes);

  const destsRes = await testApi('/api/v1/destinations');
  console.log('  /api/v1/destinations     =>', Array.isArray(destsRes.results) ? destsRes.results.length + ' destination(s)' : destsRes);

  const alertsRes = await testApi('/api/v1/alerts');
  console.log('  /api/v1/alerts           =>', Array.isArray(alertsRes.results) ? alertsRes.results.length + ' alert(s)' : alertsRes);
}

fullAudit();
