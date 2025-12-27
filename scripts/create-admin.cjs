const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const { prisma } = require('./_prisma.cjs');

const username = process.argv[2];

async function getPassword() {
  if (process.env.CALCU_ADMIN_PASSWORD) return process.env.CALCU_ADMIN_PASSWORD;
  if (process.argv[3]) return process.argv[3];

  const isRaw = process.stdin.isTTY;
  if (!isRaw) {
    console.error('Error: Password must be provided via CALCU_ADMIN_PASSWORD env var in non-interactive environments.');
    process.exit(2);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  return new Promise(resolve => {
    // Use a more robust way to hide password input
    process.stdout.write(`Enter password for ${username}: `);
    
    // Set raw mode to capture characters without echoing
    process.stdin.setRawMode(true);
    
    let password = '';
    const onData = (char) => {
      char = char.toString();
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl-D
          process.stdin.removeListener('data', onData);
          if (isRaw) process.stdin.setRawMode(false);
          process.stdout.write('\n');
          rl.close();
          resolve(password);
          break;
        case '\u0003': // Ctrl-C
          process.stdin.removeListener('data', onData);
          if (isRaw) process.stdin.setRawMode(false);
          process.stdout.write('\n');
          process.exit(130);
          break;
        case '\u0008':
        case '\x7f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            // On some terminals we might want to echo a backspace/space/backspace to clear the asterisk
            // but since we are silent, we do nothing.
          }
          break;
        default:
          password += char;
          // Silent input - no echo
          break;
      }
    };

    process.stdin.on('data', onData);
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

  // Use cost factor 12 to match server/routes/auth.cjs
  const hashedPassword = bcrypt.hashSync(password, 12);

  try {
    // Update Database (Primary Source of Truth)
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
    console.log('✅ Updated admin in database:', username);

    // Note: JSON fallback removed as it is no longer used by the server.
    // server/admin-users.json is ignored by git.

  } catch (error) {
    console.error('\n❌ Error updating admin:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
