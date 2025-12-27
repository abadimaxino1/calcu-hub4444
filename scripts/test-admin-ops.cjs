/**
 * Smoke test for new Admin Control Center endpoints
 * Run with: node scripts/test-admin-ops.cjs
 */

const http = require('http');

const COOKIE = process.env.CALCU_ADMIN_COOKIE;
if (!COOKIE) {
  console.error('❌ CALCU_ADMIN_COOKIE environment variable is required');
  process.exit(1);
}

const BASE_URL = 'http://localhost:4000';

async function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path,
      method,
      headers: {
        'Cookie': COOKIE,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Admin Ops Smoke Tests...');

  const tests = [
    { name: 'Health Check', path: '/api/admin/ops/health' },
    { name: 'Audit Logs', path: '/api/admin/audit-logs/' },
    { name: 'Error Logs', path: '/api/admin/ops/errors' },
    { name: 'Jobs List', path: '/api/admin/ops/jobs/' },
    { name: 'Backups List', path: '/api/admin/ops/backups/' },
    { name: 'CMS Pages (Admin)', path: '/api/admin/content/pages' },
    { name: 'Calculators (Public)', path: '/api/calculators/public' },
    { name: 'Feature Flags (Public)', path: '/api/flags/' },
    { name: 'AI Templates', path: '/api/admin/ai/templates' },
    { name: 'Analytics Providers', path: '/api/admin/growth/analytics/providers' },
    { name: 'SEO Config', path: '/api/admin/growth/seo/config' }
  ];

  for (const test of tests) {
    try {
      const res = await request(test.path);
      if (res.status === 200) {
        console.log(`✅ ${test.name}: OK`);
      } else {
        console.log(`❌ ${test.name}: Failed (Status ${res.status})`);
        console.log('   Response:', res.data);
      }
    } catch (e) {
      console.log(`❌ ${test.name}: Error - ${e.message}`);
    }
  }

  console.log('\n🏁 Smoke tests completed.');
}

runTests();
