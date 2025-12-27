/**
 * COMPREHENSIVE VERIFICATION SCRIPT
 * Admin Control Center Modules B1-B12
 * Supports Authenticated & Unauthenticated Testing
 */

const http = require('http');

const BASE_URL = 'http://localhost:4000';
const ADMIN_CREDENTIALS = {
  email: process.env.ADMIN_EMAIL || process.env.CALCU_ADMIN_EMAIL || 'admin@calcuhub.com',
  password: process.env.ADMIN_PASSWORD || process.env.CALCU_ADMIN_PASSWORD || 'ChangeThisPassword123!'
};

let failures = 0;
let sessionCookie = null;

function assertStatus(name, response, expected) {
  const status = response.status;
  const isExpected = Array.isArray(expected) ? expected.includes(status) : status === expected;
  
  if (isExpected && status !== 500) {
    console.log(`[${name}]: ✅ (${status})`);
    return true;
  } else {
    console.log(`[${name}]: ❌ (${status}) ${status === 500 ? '!!! SERVER ERROR !!!' : ''}`);
    if (response.data && response.data.error) {
      console.log(`   Error: ${response.data.error}`);
    }
    failures++;
    return false;
  }
}

async function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function request(path, method = 'GET', body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data.startsWith('{') || data.startsWith('[') ? JSON.parse(data) : data;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login() {
  console.log('--- Authentication ---');
  // Try multiple common login paths
  const paths = ['/api/admin/auth/login', '/api/admin/login', '/api/auth/login'];
  
  for (const path of paths) {
    try {
      const res = await request(path, 'POST', ADMIN_CREDENTIALS);
      if (res.status === 200) {
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          sessionCookie = setCookie[0].split(';')[0];
          console.log(`✅ Login successful via ${path}`);
          return true;
        }
        if (res.data && res.data.token) {
          sessionCookie = `calcu_admin=${res.data.token}`;
          console.log(`✅ Login successful via ${path} (Token)`);
          return true;
        }
      }
    } catch (e) {
      // Continue to next path
    }
  }
  
  console.log('❌ Login failed. Admin routes will likely return 401/403.');
  return false;
}

async function runTests() {
  console.log('🚀 Starting Admin Control Center Verification (Hardened)...\n');

  try {
    const isRunning = await checkHealth();
    if (!isRunning) {
      console.log('❌ Server not running at ' + BASE_URL);
      process.exit(1);
    }

    // 0. Login
    await login();

    // 1. B1: Audit Logs
    console.log('\n--- B1: Audit Logs ---');
    const auditList = await request('/api/admin/audit-logs', 'GET', null, sessionCookie);
    assertStatus('GET /api/admin/audit-logs', auditList, 200);
    
    const auditExport = await request('/api/admin/audit-logs/export?format=csv', 'GET', null, sessionCookie);
    const isCsv = auditExport.headers['content-type']?.includes('text/csv');
    const hasDisposition = auditExport.headers['content-disposition']?.includes('attachment');
    if (assertStatus('GET /api/admin/audit-logs/export (CSV)', auditExport, 200)) {
        if (!isCsv || !hasDisposition) {
            console.log('   ❌ Missing CSV headers');
            failures++;
        }
    }

    // 2. B5: Backups
    console.log('\n--- B5: Backups ---');
    const backupList = await request('/api/admin/ops/backups', 'GET', null, sessionCookie);
    assertStatus('GET /api/admin/ops/backups', backupList, 200);

    const restoreAttempt = await request('/api/admin/ops/backups/123/restore', 'POST', { confirmation: 'RESTORE' }, sessionCookie);
    // We expect 404 (not found) or 403 (unauthorized for non-super-admin). 
    assertStatus('POST /api/admin/ops/backups/123/restore (Should be 404/403)', restoreAttempt, [404, 403]);

    // 3. B7: Calculators & Caching
    console.log('\n--- B7: Calculators & Caching ---');
    const calcPublic = await request('/api/calculators/public', 'GET');
    assertStatus('GET /api/calculators/public', calcPublic, 200);
    
    const hasCacheHeader = calcPublic.headers['x-cache'] !== undefined;
    const hasCacheControl = calcPublic.headers['cache-control']?.includes('public');
    console.log(`[CACHE] X-Cache Header: ${hasCacheHeader ? '✅' : '❌'}`);
    console.log(`[CACHE] Cache-Control: ${hasCacheControl ? '✅' : '❌'}`);
    if (!hasCacheHeader || !hasCacheControl) failures++;
    
    const calcAdmin = await request('/api/admin/calculators', 'GET', null, sessionCookie);
    assertStatus('GET /api/admin/calculators', calcAdmin, 200);

    // 4. Public Content API
    console.log('\n--- Public Content API ---');
    const blogList = await request('/api/content/blog', 'GET');
    assertStatus('GET /api/content/blog', blogList, 200);
    
    if (blogList.data && blogList.data.posts && blogList.data.posts.length > 0) {
      const firstPost = blogList.data.posts[0];
      const hasTitle = !!firstPost.title;
      const hasExcerpt = !!firstPost.excerpt;
      console.log(`[CMS] Post Title Present: ${hasTitle ? '✅' : '❌'}`);
      console.log(`[CMS] Post Excerpt Present: ${hasExcerpt ? '✅' : '❌'}`);
      if (!hasTitle || !hasExcerpt) {
        console.log('   Warning: Blog post missing title or excerpt. Check repository mapping.');
        failures++;
      }
    }

    const faqList = await request('/api/content/faqs', 'GET');
    assertStatus('GET /api/content/faqs', faqList, 200);

    // 5. B12: Navigation Aliases
    console.log('\n--- B12: Navigation Aliases ---');
    const aliasAudit = await request('/admin/audit-logs', 'GET');
    assertStatus('GET /admin/audit-logs (Alias Redirect)', aliasAudit, 302);

    // 6. Route Map Correctness
    console.log('\n--- Route Map Correctness ---');
    const jobs = await request('/api/admin/ops/jobs', 'GET', null, sessionCookie);
    assertStatus('GET /api/admin/ops/jobs', jobs, 200);

    const health = await request('/api/admin/ops/health', 'GET', null, sessionCookie);
    assertStatus('GET /api/admin/ops/health', health, 200);

    const settings = await request('/api/admin/settings', 'GET', null, sessionCookie);
    assertStatus('GET /api/admin/settings', settings, 200);

    // 9. CMS Repository Unification (Blog + Pages)
    console.log('\n--- CMS Repository Unification ---');
    const adminBlog = await request('/api/admin/content/blog', 'GET', null, sessionCookie);
    assertStatus('GET /api/admin/content/blog', adminBlog, 200);
    if (adminBlog.data && adminBlog.data.posts) {
      console.log(`[CMS Admin] Blog posts found: ${adminBlog.data.posts.length} ✅`);
    } else {
      console.log('[CMS Admin] No blog posts found or invalid response ❌');
      failures++;
    }

    const adminPages = await request('/api/admin/content/pages', 'GET', null, sessionCookie);
    assertStatus('GET /api/admin/content/pages', adminPages, 200);
    if (adminPages.data && adminPages.data.pages) {
      console.log(`[CMS Admin] Static pages found: ${adminPages.data.pages.length} ✅`);
    } else {
      console.log('[CMS Admin] No static pages found or invalid response ❌');
      failures++;
    }

    // 10. B11: Feature Flags (B11)
    console.log('\n--- B11: Feature Flags ---');
    const flags = await request('/api/admin/flags', 'GET', null, sessionCookie);
    assertStatus('GET /api/admin/flags', flags, 200);

    // 8. Security Hardening (Unauthenticated Access)
    console.log('\n--- Security Hardening (Unauthenticated) ---');
    const unauthAudit = await request('/api/admin/audit-logs', 'GET');
    assertStatus('GET /api/admin/audit-logs (Unauth)', unauthAudit, [401, 403]);

    const unauthJobs = await request('/api/admin/ops/jobs', 'GET');
    assertStatus('GET /api/admin/ops/jobs (Unauth)', unauthJobs, [401, 403]);

    console.log('\n--- Summary ---');
    if (failures === 0) {
      console.log('✨ All tightened verification checks passed!');
      process.exit(0);
    } else {
      console.log(`❌ Verification failed with ${failures} errors.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Verification script error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch(console.error);
}


