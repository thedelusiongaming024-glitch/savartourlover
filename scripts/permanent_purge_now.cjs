const fs = require('fs');
const path = require('path');
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

const url = env.NEXT_PUBLIC_SUPABASE_URL || 'https://tuvgeaflyxbldpmpafdk.supabase.co';
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!key) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, key);

const targetBookings = [
  'book-1791544963481-c2011f7eb50d23a1',
  'STL-2026-00009',
  'book-1792489579315-ecd449c68c2c4480',
  'STL-2026-00010',
  'book-1792491356820-9df69440550a3436',
  'STL-2026-00011',
  'book-1793692290655-c5e2f49311358855',
  'STL-2026-00012'
];

const targetCustomers = [
  { id: 'cust-1791544962712-959', phone: '+8801613574834' },
  { id: 'cust-1792478208255-188', phone: '+8801700000000' },
  { id: 'cust-1792489578542-568', phone: '+8801620593007' },
  { id: 'cust-1792819513158-717', phone: '+8801822504678' },
  { id: 'cust-1793116090815-378', phone: '+8801700112233' },
  { id: 'cust-1793732299269-427', phone: '+8801410207480' },
];

async function purgeAll() {
  console.log('=== Step 1: Purging target Bookings from Supabase PostgreSQL ===');
  for (const bId of targetBookings) {
    await sb.from('payments').delete().eq('booking_id', bId);
    await sb.from('clearance_tickets').delete().eq('booking_id', bId);
    await sb.from('bookings').delete().eq('id', bId);
    await sb.from('bookings').delete().eq('reference', bId);
  }
  console.log('✓ Target bookings purged from Supabase');

  console.log('\n=== Step 2: Purging target Customers from Supabase PostgreSQL ===');
  for (const c of targetCustomers) {
    await sb.from('bookings').update({ customer_id: null }).eq('customer_id', c.id);
    await sb.from('bookings').update({ customer_id: null }).eq('customer_phone', c.phone);
    await sb.from('customer_activities').delete().eq('customer_id', c.id);
    await sb.from('customers').delete().eq('id', c.id);
    await sb.from('customers').delete().eq('phone_number', c.phone);
  }
  console.log('✓ Target customers purged from Supabase');

  console.log('\n=== Step 3: Cleaning local DB JSON files across workspaces ===');
  const filesToClean = [
    path.resolve(process.cwd(), '.data', 'db.json'),
    path.resolve(process.cwd(), 'data_storage', 'db.json'),
    path.resolve(process.cwd(), '..', 'savartourlover-main', '.data', 'db.json'),
    path.resolve(process.cwd(), '..', 'savartourlover-main', 'data_storage', 'db.json'),
  ];

  const bookingSet = new Set(targetBookings);
  const custIdSet = new Set(targetCustomers.map(c => c.id));
  const custPhoneSet = new Set(targetCustomers.map(c => c.phone));

  let cleanSnapshot = null;

  for (const file of filesToClean) {
    if (!fs.existsSync(file)) {
      console.log('File does not exist:', file);
      continue;
    }
    try {
      const db = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!db.deletedEntities) db.deletedEntities = {};
      if (!Array.isArray(db.deletedEntities.bookings)) db.deletedEntities.bookings = [];
      if (!Array.isArray(db.deletedEntities.customers)) db.deletedEntities.customers = [];

      // Record in deletedEntities
      targetBookings.forEach(id => {
        if (!db.deletedEntities.bookings.includes(id)) db.deletedEntities.bookings.push(id);
      });
      targetCustomers.forEach(c => {
        if (!db.deletedEntities.customers.includes(c.id)) db.deletedEntities.customers.push(c.id);
        if (!db.deletedEntities.customers.includes(c.phone)) db.deletedEntities.customers.push(c.phone);
      });

      // Purge bookings
      if (Array.isArray(db.bookings)) {
        db.bookings = db.bookings.filter(b => !bookingSet.has(b.id) && !bookingSet.has(b.reference) && b.status !== 'cancelled');
      }

      // Purge customers
      if (Array.isArray(db.customers)) {
        db.customers = db.customers.filter(c => !custIdSet.has(c.id) && !custPhoneSet.has(c.phone_number));
      }

      // Purge payments & tickets
      if (Array.isArray(db.payments)) {
        db.payments = db.payments.filter(p => !bookingSet.has(p.booking_id));
      }
      if (Array.isArray(db.clearanceTickets)) {
        db.clearanceTickets = db.clearanceTickets.filter(t => !bookingSet.has(t.booking_id));
      }

      fs.writeFileSync(file, JSON.stringify(db, null, 2), 'utf8');
      console.log('✓ Cleaned and saved:', file);

      if (!cleanSnapshot && file.includes('savartourlover-vercel')) {
        cleanSnapshot = db;
      }
    } catch (err) {
      console.warn('Failed cleaning file', file, err.message);
    }
  }

  console.log('\n=== Step 4: Uploading clean snapshot to Supabase Storage ===');
  if (cleanSnapshot) {
    const { error: upErr } = await sb.storage.from('tourlover-data').upload('db.json', JSON.stringify(cleanSnapshot, null, 2), {
      contentType: 'application/json',
      upsert: true,
      cacheControl: '300',
    });
    if (upErr) {
      console.warn('⚠️ Storage upload warning:', upErr.message);
    } else {
      console.log('✓ Storage snapshot db.json updated successfully');
    }
  }

  console.log('\n=== Step 5: Verification Check ===');
  const { data: bCheck } = await sb.from('bookings').select('id, reference, status');
  console.log('Postgres bookings count:', bCheck?.length);
  console.log('Postgres bookings remaining:', bCheck);

  const { data: cCheck } = await sb.from('customers').select('id, phone_number, full_name');
  console.log('Postgres customers count:', cCheck?.length);
  console.log('Postgres customers remaining:', cCheck);
}

purgeAll();
