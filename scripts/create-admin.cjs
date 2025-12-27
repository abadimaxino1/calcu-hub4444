const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const { prisma } = require('./_prisma.cjs');

const file = path.join(__dirname, '..', 'server', 'admin-users.json');
const username = process.argv[2];

async function getPassword() {
  if (process.env.CALCU_ADMIN_PASSWORD) return process.env.CALCU_ADMIN_PASSWORD;
  if (process.argv[3]) return process.argv[3];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  return new Promise(resolve => {
    rl.question(`Enter password for ${username}: `, (answer) => {
      rl.close();
      resolve(answer);
    });
    // Hide input if possible (simple version)
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (stringToWrite.includes(`Enter password for ${username}: `)) {
        rl.output.write(stringToWrite);
      } else {
        rl.output.write("*");
      }
    };
  });
}

async function run() {
  if (!username) {
    console.error('Usage: CALCU_ADMIN_PASSWORD=... node scripts/create-admin.cjs <username>');
    process.exit(2);
  }

  const password = await getPassword();
  if (!password) {
    console.error('Error: Password is required');
    process.exit(2);
  }

  const hashedPassword = bcrypt.hashSync(password, 12);
  const now = new Date();

  try {
    // 1. Update Database (Primary Source of Truth)
    await prisma.user.upsert({
      where: { email: username.toLowerCase() },
      update: { hashedPassword, role: 'SUPER_ADMIN', isActive: true },
      create: {
        email: username.toLowerCase(),
        name: username.split('@')[0],
        hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });
    console.log('\n✅ Updated admin in database:', username);

    // 2. Update JSON (Legacy/Dev Fallback - Ignored by Git)
    let users = {};
    if (fs.existsSync(file)) {
      try { users = JSON.parse(fs.readFileSync(file, 'utf8') || '{}'); } catch (e) { users = {}; }
    }
    // Use same cost factor (12) for consistency
    users[username] = { passwordHash: hashedPassword, createdAt: Date.now(), roles: ['Admin'] };
    fs.writeFileSync(file, JSON.stringify(users, null, 2), 'utf8');
    console.log('✅ Updated admin in admin-users.json:', username);

  } catch (error) {
    console.error('\n❌ Error updating admin:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
