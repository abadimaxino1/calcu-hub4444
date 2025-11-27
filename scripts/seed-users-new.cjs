#!/usr/bin/env node
// scripts/seed-users-new.cjs
// Safe seeding of example admin users. Writes server/admin-users.json if writable.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const ADMIN_USERS_FILE = path.join(__dirname, '..', 'server', 'admin-users.json');

const now = Date.now();
const users = {
  abdullah: { passwordHash: bcrypt.hashSync(process.env.SEED_ADMIN_PW || 'ChangeMe2025!', 10), createdAt: now, roles: ['Admin'] },
  supervisor: { passwordHash: bcrypt.hashSync(process.env.SEED_SUPERVISOR_PW || 'Supervisor123!', 10), createdAt: now, roles: ['Supervisor'] },
  analyst: { passwordHash: bcrypt.hashSync(process.env.SEED_ANALYST_PW || 'Analyst123!', 10), createdAt: now, roles: ['Analyst'] },
  it: { passwordHash: bcrypt.hashSync(process.env.SEED_IT_PW || 'IT12345!', 10), createdAt: now, roles: ['IT'] },
  designer: { passwordHash: bcrypt.hashSync(process.env.SEED_DESIGNER_PW || 'Design123!', 10), createdAt: now, roles: ['Designer'] },
  staff: { passwordHash: bcrypt.hashSync(process.env.SEED_STAFF_PW || 'Staff123!', 10), createdAt: now, roles: ['Staff'] },
};

try {
  fs.writeFileSync(ADMIN_USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  console.log('Seeded admin users to', ADMIN_USERS_FILE);
  console.log('Users created: ', Object.keys(users).join(', '));
  console.log('Use SEED_ADMIN_PW env to set Abdullah password when seeding.');
} catch (e) {
  console.error('Failed to write admin users file', e && e.message);
  process.exit(1);
}
