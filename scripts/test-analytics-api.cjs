const http = require('http');
const https = require('https');

// Configuration
const PORT = process.env.PORT || 4000;
const BASE_URL = process.env.CALCU_BASE_URL || `http://localhost:${PORT}`;
const COOKIE = process.env.CALCU_ADMIN_COOKIE;

// Endpoints to test
const ENDPOINTS = [
  '/api/health',
  '/api/admin/monetization/summary',
  '/api/admin/monetization/by-page',
  '/api/admin/monetization/by-slot',
  '/api/admin/monetization/alerts',
  // Note: Analytics dashboard is mounted at /api/analytics/dashboard, not /api/admin/analytics/dashboard
  '/api/analytics/dashboard',
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

console.log(`${colors.blue}Starting Analytics API Smoke Test on ${BASE_URL}...${colors.reset}`);
if (COOKIE) {
  console.log(`${colors.blue}Using provided CALCU_ADMIN_COOKIE${colors.reset}\n`);
} else {
  console.log(`${colors.yellow}No CALCU_ADMIN_COOKIE provided. Protected routes may return 401/403 (which is acceptable for reachability check).${colors.reset}\n`);
}

function testEndpoint(path) {
  return new Promise((resolve) => {
    const urlStr = `${BASE_URL}${path}`;
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;
    
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': 'SmokeTest/1.0',
      }
    };

    if (COOKIE) {
      options.headers['Cookie'] = COOKIE;
    }

    let completed = false;

    const req = lib.request(url, options, (res) => {
      const { statusCode } = res;
      const contentType = res.headers['content-type'] || '';
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        // Guard against multiple callbacks
        if (completed) return;
        completed = true;

        // Determine expected status codes
        // If cookie is provided, protected routes MUST return 200
        // If no cookie, protected routes can return 401/403
        const isProtected = path.startsWith('/api/admin/');
        let allowedCodes = [200];
        
        if (!COOKIE && isProtected) {
          allowedCodes = [200, 401, 403];
        } else if (!COOKIE && !isProtected) {
          // Public routes should always be 200
          allowedCodes = [200];
        } else if (COOKIE && isProtected) {
          // With cookie, admin routes must be 200
          allowedCodes = [200];
        } else {
          // With cookie, public routes must be 200
          allowedCodes = [200];
        }

        // Special case: /api/analytics/dashboard is also protected but not under /admin/
        if (path === '/api/analytics/dashboard') {
          if (COOKIE) allowedCodes = [200];
          else allowedCodes = [200, 401, 403];
        }

        const isReachable = allowedCodes.includes(statusCode);
        let isSuccess = isReachable;
        let failReason = '';
        let warnings = [];

        // Check JSON parsing if content-type says so
        if (isReachable && contentType.includes('application/json')) {
          try {
            const json = JSON.parse(data);
            
            // Specific assertions for /api/admin/monetization/alerts
            if (path === '/api/admin/monetization/alerts' && statusCode === 200) {
              if (!Array.isArray(json.alerts)) throw new Error('alerts is not an array');
              if (!Array.isArray(json.counts)) throw new Error('counts is not an array');
              
              // Check up to 10 alerts
              json.alerts.slice(0, 10).forEach((alert, i) => {
                if (typeof alert.isResolved !== 'boolean') {
                  throw new Error(`alerts[${i}].isResolved is ${typeof alert.isResolved}, expected boolean`);
                }
              });
              
              // Check up to 20 counts
              json.counts.slice(0, 20).forEach((c, i) => {
                if (typeof c.isResolved !== 'boolean') {
                  throw new Error(`counts[${i}].isResolved is ${typeof c.isResolved}, expected boolean`);
                }
                if (typeof c.count !== 'number') {
                  throw new Error(`counts[${i}].count is ${typeof c.count}, expected number`);
                }
              });
              
              if (json.counts.length === 0 && json.alerts.length === 0) {
                warnings.push('Warning: Dataset has no alerts or counts.');
              }
            }

            // Specific assertions for /api/admin/monetization/by-page
            if (path === '/api/admin/monetization/by-page' && statusCode === 200) {
              if (!Array.isArray(json.pages)) throw new Error('pages is not an array');
              if (json.pages.length > 0) {
                const p = json.pages[0];
                if (typeof p.pagePath !== 'string') throw new Error(`pages[0].pagePath is ${typeof p.pagePath}, expected string`);
                if (typeof p.pageViews !== 'number') throw new Error(`pages[0].pageViews is ${typeof p.pageViews}, expected number`);
                if (typeof p.calculations !== 'number') throw new Error(`pages[0].calculations is ${typeof p.calculations}, expected number`);
                if (typeof p.adImpressions !== 'number') throw new Error(`pages[0].adImpressions is ${typeof p.adImpressions}, expected number`);
                if (typeof p.adClicks !== 'number') throw new Error(`pages[0].adClicks is ${typeof p.adClicks}, expected number`);
                if (typeof p.estimatedRevenue !== 'number') throw new Error(`pages[0].estimatedRevenue is ${typeof p.estimatedRevenue}, expected number`);
              }
            }

            // Specific assertions for /api/admin/monetization/by-slot
            if (path === '/api/admin/monetization/by-slot' && statusCode === 200) {
              if (!Array.isArray(json.slots)) throw new Error('slots is not an array');
              if (json.slots.length > 0) {
                const s = json.slots[0];
                if (typeof s.name !== 'string') throw new Error(`slots[0].name is ${typeof s.name}, expected string`);
                if (typeof s.impressions !== 'number') throw new Error(`slots[0].impressions is ${typeof s.impressions}, expected number`);
                if (typeof s.clicks !== 'number') throw new Error(`slots[0].clicks is ${typeof s.clicks}, expected number`);
                if (typeof s.ctr !== 'string' && typeof s.ctr !== 'number') throw new Error(`slots[0].ctr is ${typeof s.ctr}, expected string or number`);
                if (typeof s.estimatedRevenue !== 'number') throw new Error(`slots[0].estimatedRevenue is ${typeof s.estimatedRevenue}, expected number`);
              }
            }
          } catch (e) {
            isSuccess = false;
            failReason = e.message || 'Invalid JSON response';
          }
        }

        const statusColor = isSuccess ? colors.green : colors.red;
        const statusIcon = isSuccess ? 'PASS' : 'FAIL';
        
        console.log(`[${statusColor}${statusIcon}${colors.reset}] ${path} (Status: ${statusCode})`);
        
        warnings.forEach(w => console.log(`  ${colors.yellow}${w}${colors.reset}`));

        if (!isSuccess) {
          if (!isReachable) {
             console.log(`  ${colors.red}Error: Unexpected status code (Expected 200, 401, 403)${colors.reset}`);
          }
          if (failReason) {
             console.log(`  ${colors.red}Error: ${failReason}${colors.reset}`);
          }
          
          if (data && data.length < 500) {
             console.log(`  Response: ${data}`);
          } else if (data) {
             console.log(`  Response: ${data.substring(0, 500)}...`);
          }
        }

        resolve(isSuccess);
      });
    });

    req.on('error', (e) => {
      // Guard against multiple callbacks
      if (completed) return;
      completed = true;
      console.log(`[${colors.red}FAIL${colors.reset}] ${path}`);
      console.log(`  ${colors.red}Connection Error: ${e.message}${colors.reset}`);
      resolve(false);
    });
    
    req.end();
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const endpoint of ENDPOINTS) {
    const success = await testEndpoint(endpoint);
    if (success) passed++;
    else failed++;
  }

  console.log('\n----------------------------------------');
  console.log(`Tests Completed.`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  if (failed > 0) {
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.blue}All endpoints reachable.${colors.reset}`);
    process.exit(0);
  }
}

runTests();