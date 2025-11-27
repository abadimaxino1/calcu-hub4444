const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const file = path.join(__dirname, '..', 'server', 'admin-users.json');
const username = process.argv[2];
const password = process.argv[3];
// optional comma-separated roles as third arg or fourth
const rolesArg = process.argv[4] || process.argv[3 + 1];
let roles = ['Admin'];
if (rolesArg) {
  roles = rolesArg.split(',').map(s => s.trim()).filter(Boolean);
}

if (!username || !password) {
  console.error('Usage: node scripts/create-admin.cjs <username> <password>');
  process.exit(2);
}

let users = {};
if (fs.existsSync(file)) {
  try { users = JSON.parse(fs.readFileSync(file, 'utf8') || '{}'); } catch (e) { users = {}; }
}
users[username] = { passwordHash: bcrypt.hashSync(password, 10), createdAt: Date.now(), roles };
fs.writeFileSync(file, JSON.stringify(users, null, 2), 'utf8');
console.log('Created admin', username);
