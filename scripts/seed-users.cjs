#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const file = path.join(__dirname, '..', 'server', 'admin-users.json');
const now = Date.now();
const seed = {
  admin: { passwordHash: bcrypt.hashSync('ChangeMe!123', 10), createdAt: now, roles: ['Admin'] },
  supervisor: { passwordHash: bcrypt.hashSync('Supervisor1!', 10), createdAt: now, roles: ['Supervisor'] },
  analyst: { passwordHash: bcrypt.hashSync('Analyst1!', 10), createdAt: now, roles: ['Analyst'] },
  it: { passwordHash: bcrypt.hashSync('Infra1!', 10), createdAt: now, roles: ['IT'] },
  designer: { passwordHash: bcrypt.hashSync('Design1!', 10), createdAt: now, roles: ['Designer'] },
  staff: { passwordHash: bcrypt.hashSync('Staff1!', 10), createdAt: now, roles: ['Staff'] }
};

fs.writeFileSync(file, JSON.stringify(seed, null, 2), 'utf8');
console.log('Seeded admin-users.json with sample accounts. Change passwords and remove after first use.');
