const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
const db = new Database(dbPath);

console.log('Migrating database (Step 3)...');

// Add pagePath to calculation_events
try {
  db.prepare('ALTER TABLE calculation_events ADD COLUMN pagePath TEXT').run();
  console.log('Added pagePath to calculation_events');
} catch (e) {
  if (e.message.includes('duplicate column')) console.log('pagePath column already exists in calculation_events');
  else console.error('Error adding pagePath:', e.message);
}

// Add index for ad_events (adSlotId, eventType)
try {
  db.prepare('CREATE INDEX IF NOT EXISTS idx_ad_events_slot_type ON ad_events(adSlotId, eventType)').run();
  console.log('Added index idx_ad_events_slot_type');
} catch (e) {
  console.error('Error adding index:', e.message);
}

console.log('Migration complete.');
