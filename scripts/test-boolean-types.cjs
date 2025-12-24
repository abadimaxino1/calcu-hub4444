const { prisma } = require('../server/db.cjs');

async function runTests() {
  console.log('Starting boolean type verification...');
  let failures = 0;

  const checks = [
    { model: 'maintenanceMode', method: 'findFirst', field: 'isEnabled' },
    { model: 'toolCard', method: 'findMany', field: 'isPublished', take: 1 },
    { model: 'adSlot', method: 'findMany', field: 'isActive', take: 1 },
    { model: 'blogPost', method: 'findMany', field: 'isPublished', take: 1 },
    { model: 'seoConfig', method: 'findMany', field: 'isIndexable', take: 1 },
    { model: 'pageRegistry', method: 'findMany', field: 'isVisible', take: 1 },
    { model: 'aIIntegration', method: 'findMany', field: 'isEnabled', take: 1 },
    { model: 'benefitFeature', method: 'findMany', field: 'isPublished', take: 1 },
  ];

  for (const check of checks) {
    try {
      let result;
      if (check.method === 'findFirst') {
        result = await prisma[check.model].findFirst();
      } else {
        const results = await prisma[check.model].findMany({ take: 1 });
        result = results[0];
      }

      if (!result) {
        console.log(`[SKIP] ${check.model}.${check.field}: No records found`);
        continue;
      }

      const value = result[check.field];
      const type = typeof value;

      if (type === 'boolean') {
        console.log(`[PASS] ${check.model}.${check.field} is boolean (${value})`);
      } else {
        console.error(`[FAIL] ${check.model}.${check.field} is ${type} (${value})`);
        failures++;
      }
    } catch (error) {
      console.error(`[ERROR] Checking ${check.model}:`, error.message);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} tests failed.`);
    process.exit(1);
  } else {
    console.log('\nAll checks passed.');
    process.exit(0);
  }
}

runTests();
