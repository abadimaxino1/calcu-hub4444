const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
console.log('Opening DB at:', dbPath);
const db = new Database(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));

const pageViewsExists = tables.some(t => t.name === 'page_views');
if (pageViewsExists) {
  const count = db.prepare('SELECT COUNT(*) as count FROM page_views').get();
  console.log('PageViews count:', count.count);
} else {
  console.log('page_views table MISSING');
}

const revenueSnapshotExists = tables.some(t => t.name === 'revenue_snapshots');
if (revenueSnapshotExists) {
    const count = db.prepare('SELECT COUNT(*) as count FROM revenue_snapshots').get();
    console.log('RevenueSnapshots count:', count.count);
} else {
    console.log('revenue_snapshots table MISSING');
}
