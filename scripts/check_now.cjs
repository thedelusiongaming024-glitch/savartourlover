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

const url = env.NEXT_PUBLIC_SUPABASE_URL || 'https://kfxlyxmjlslidvjufzpa.supabase.co';
const key = env.SUPABASE_SERVICE_ROLE_KEY;

const sb = createClient(url, key);

async function checkNow() {
  for (const t of ['destinations', 'tours', 'bookings', 'payments', 'customers', 'operational_alerts']) {
    const { data } = await sb.from(t).select('id');
    console.log(`Postgres table '${t}' count:`, data?.length);
  }

  const { data: storageData, error: sErr } = await sb.storage.from('tourlover-data').download('db.json');
  if (sErr) {
    console.log('Storage download error:', sErr.message);
  } else {
    const text = await storageData.text();
    const parsed = JSON.parse(text);
    console.log('Storage bucket tours:', parsed.tours?.length, 'bookings:', parsed.bookings?.length, 'destinations:', parsed.destinations?.length, 'payments:', parsed.payments?.length);
  }

  // Also check local files
  const localDb = JSON.parse(fs.readFileSync('.data/db.json', 'utf8'));
  console.log('Local .data/db.json tours:', localDb.tours?.length, 'bookings:', localDb.bookings?.length, 'destinations:', localDb.destinations?.length);
}
checkNow();
