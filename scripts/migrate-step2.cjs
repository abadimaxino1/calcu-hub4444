const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
const db = new Database(dbPath);

console.log('Migrating database...');

// 1. Add scope to faqs
try {
  db.prepare('ALTER TABLE faqs ADD COLUMN scope TEXT DEFAULT "global"').run();
  console.log('Added scope to faqs');
} catch (e) {
  if (!e.message.includes('duplicate column')) console.log('scope column already exists in faqs');
  else console.error(e.message);
}

// 2. Add blocksJson, status to static_page_contents
try {
  db.prepare('ALTER TABLE static_page_contents ADD COLUMN blocksJson TEXT').run();
  console.log('Added blocksJson to static_page_contents');
} catch (e) {
  if (!e.message.includes('duplicate column')) console.log('blocksJson column already exists in static_page_contents');
  else console.error(e.message);
}

try {
  db.prepare('ALTER TABLE static_page_contents ADD COLUMN status TEXT DEFAULT "published"').run();
  console.log('Added status to static_page_contents');
} catch (e) {
  if (!e.message.includes('duplicate column')) console.log('status column already exists in static_page_contents');
  else console.error(e.message);
}

// 3. Create page_registry
db.prepare(`
  CREATE TABLE IF NOT EXISTS page_registry (
    id TEXT PRIMARY KEY,
    routeKey TEXT UNIQUE NOT NULL,
    path TEXT NOT NULL,
    nameAr TEXT NOT NULL,
    nameEn TEXT NOT NULL,
    isVisible INTEGER DEFAULT 1,
    configJson TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  )
`).run();
console.log('Created page_registry table');

console.log('Migration complete.');
