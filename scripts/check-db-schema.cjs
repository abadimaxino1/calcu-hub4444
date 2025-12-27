
const { db } = require('../server/db.cjs');

const info = db.prepare('PRAGMA table_info(faqs)').all();
console.log(info);
