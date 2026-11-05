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

async function check() {
  const { data: buckets } = await sb.storage.listBuckets();
  console.log('All buckets:', buckets?.map(b => b.name));

  const { data: files, error } = await sb.storage.from('tourlover-data').list('');
  console.log('Files in tourlover-data:', files?.map(f => f.name), error);
}

check();
