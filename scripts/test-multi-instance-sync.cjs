const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function testMultiInstanceSync() {
  console.log('\n======================================================');
  console.log('  TESTING MULTI-INSTANCE VERCEL SERVERLESS DATA SYNC');
  console.log('======================================================\n');

  // Step 1: Login as Admin
  console.log('1. Authenticating as Super Admin...');
  const loginRes = await fetch(`${BASE_URL}/api/v1/auth/staff/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'adminpassword123' })
  });
  const { access: token } = await loginRes.json();
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  console.log('✓ Admin authenticated.');

  // Step 2: Create a unique test tour via Admin API
  const uniqueTitle = `Live Sync Test Tour ${Date.now()}`;
  const uniqueSlug = `live-sync-test-${Date.now()}`;
  console.log(`\n2. Creating Tour: "${uniqueTitle}"...`);
  const createRes = await fetch(`${BASE_URL}/api/v1/admin/tours`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: uniqueTitle,
      slug: uniqueSlug,
      base_price: '4500',
      destination_slug: 'bangladesh',
      duration_days: 2,
      duration_nights: 1,
      total_seats: 20,
      status: 'published'
    })
  });
  const createdTour = await createRes.json();
  console.log('✓ Created Tour ID:', createdTour.id);

  // Step 3: Simulate 5 concurrent/fresh requests to /tours as if from different serverless instances
  console.log('\n3. Simulating 5 separate client requests to /tours (verifying NO old data appears)...');
  let allSeeNewTour = true;
  for (let i = 1; i <= 5; i++) {
    const res = await fetch(`${BASE_URL}/tours`, { cache: 'no-store' });
    const html = await res.text();
    const hasNew = html.includes(uniqueTitle);
    console.log(`   Request #${i} to /tours saw new tour: ${hasNew ? 'YES ✓' : 'NO ✗'}`);
    if (!hasNew) allSeeNewTour = false;
  }

  // Step 4: Verify /api/v1/tours public endpoint as well
  console.log('\n4. Checking public API /api/v1/tours...');
  const apiRes = await fetch(`${BASE_URL}/api/v1/tours`, { cache: 'no-store' });
  const apiData = await apiRes.json();
  const foundInApi = (apiData.results || apiData).some(t => t.title === uniqueTitle);
  console.log(`   Public API saw new tour: ${foundInApi ? 'YES ✓' : 'NO ✗'}`);

  // Step 5: Clean up by deleting test tour
  console.log('\n5. Cleaning up test tour...');
  const delRes = await fetch(`${BASE_URL}/api/v1/admin/tours/${createdTour.id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  console.log('✓ Deleted test tour status:', delRes.status);

  // Step 6: Verify deletion is immediately reflected
  const checkRes = await fetch(`${BASE_URL}/tours`, { cache: 'no-store' });
  const checkHtml = await checkRes.text();
  const isDeleted = !checkHtml.includes(uniqueTitle);
  console.log(`   Tour completely removed from /tours: ${isDeleted ? 'YES ✓' : 'NO ✗'}`);

  console.log('\n======================================================');
  console.log(`FINAL RESULT: ${allSeeNewTour && foundInApi && isDeleted ? 'ALL TESTS PASSED ✓' : 'FAILED ✗'}`);
  console.log('======================================================\n');
}

testMultiInstanceSync().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
