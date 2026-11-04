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
  const { data: bData } = await sb.from('bookings').select('id, reference, status, created_at');
  console.log('Postgres bookings count:', bData?.length);
  console.log('Postgres bookings right now:', bData);

  const { data: cData } = await sb.from('customers').select('id, phone_number, full_name, created_at');
  console.log('Postgres customers count:', cData?.length);
  console.log('Postgres customers right now:', cData);
}
checkNow();
