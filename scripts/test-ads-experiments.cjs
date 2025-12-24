const fetch = require('node-fetch');

async function testAdsAndExperiments() {
  const baseUrl = 'http://localhost:4000/api/admin';
  const cookie = 'calcu_admin=test-session-token'; // Assuming a valid session exists for testing

  console.log('--- Testing Ad Inventory ---');
  
  // Create Ad Slot
  const slotRes = await fetch(`${baseUrl}/revenue/ads/slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      key: 'sidebar_top',
      name: 'Sidebar Top Banner',
      placement: 'sidebar',
      pageType: 'calculator',
      enabled: true
    })
  });
  const slot = await slotRes.json();
  console.log('Created Slot:', slot.key);

  // Create Ad Profile
  const profileRes = await fetch(`${baseUrl}/revenue/ads/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      name: 'Aggressive Ads',
      slotsOrderJson: JSON.stringify(['sidebar_top', 'in_content_1']),
      policiesJson: JSON.stringify({ maxUnits: 5, safeSpacing: 500 })
    })
  });
  const profile = await profileRes.json();
  console.log('Created Profile:', profile.name);

  console.log('\n--- Testing Experiments ---');

  // Create Experiment
  const expRes = await fetch(`${baseUrl}/growth/experiments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({
      key: 'new_ad_layout_v1',
      name: 'New Ad Layout Test',
      status: 'running',
      allocationJson: JSON.stringify({ control: 50, variant: 50 }),
      primaryMetric: 'ad_clicks'
    })
  });
  const exp = await expRes.json();
  console.log('Created Experiment:', exp.key);

  // Verify Feature Flag was created
  const flagRes = await fetch(`http://localhost:4000/api/flags`, {
    headers: { 'Cookie': cookie }
  });
  const flags = await flagRes.json();
  const expFlag = flags.find(f => f.key === `exp_${exp.key}`);
  console.log('Verified Experiment Flag:', expFlag ? 'Found' : 'Not Found');

  console.log('\n--- Cleanup ---');
  await fetch(`${baseUrl}/revenue/ads/slots/${slot.id}`, { method: 'DELETE', headers: { 'Cookie': cookie } });
  await fetch(`${baseUrl}/revenue/ads/profiles/${profile.id}`, { method: 'DELETE', headers: { 'Cookie': cookie } });
  await fetch(`${baseUrl}/growth/experiments/${exp.id}`, { method: 'DELETE', headers: { 'Cookie': cookie } });
  console.log('Cleanup complete.');
}

// Note: This test requires the server to be running and a valid session.
// testAdsAndExperiments();
