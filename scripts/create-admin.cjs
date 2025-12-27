const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { prisma } = require('./_prisma.cjs');

const username = process.argv[2];

async function getPassword() {
  if (process.env.CALCU_ADMIN_PASSWORD) return process.env.CALCU_ADMIN_PASSWORD;

  const isTTY =
    !!process.stdin.isTTY &&
    !!process.stdout.isTTY &&
    typeof process.stdin.setRawMode === 'function';

  if (!isTTY) {
    console.error(
      'Error: Non-interactive environment. Provide password via CALCU_ADMIN_PASSWORD.'
    );
    process.exit(2);
  }

  process.stdout.write(`Enter password for ${username}: `);

  return await new Promise((resolve) => {
    let password = '';
    let rawEnabled = false;

    const cleanup = () => {
      try {
        process.stdin.removeListener('data', onData);
      } catch {}
      try {
        if (rawEnabled) process.stdin.setRawMode(false);
      } catch {}
      try {
        process.stdin.pause();
      } catch {}
    };

    const finish = (value) => {
      cleanup();
      process.stdout.write('\n');
      resolve(value);
    };

    const onData = (buf) => {
      const char = buf.toString('utf8');

      // Handle paste: could be multiple chars at once
      for (const c of char) {
        if (c === '\r' || c === '\n') return finish(password);

        if (c === '\u0003') { // Ctrl-C
          cleanup();
          process.stdout.write('\n');
          process.exit(130);
        }

        if (c === '\u0004') { // Ctrl-D
          // Treat as cancel (safer than accepting partial silently)
          return finish('');
        }

        if (c === '\u0008' || c === '\x7f') { // backspace
          if (password.length > 0) password = password.slice(0, -1);
          continue;
        }

        // Ignore escape sequences (arrow keys, etc.)
        if (c === '\u001b') continue;

        password += c;
      }
    };

    try {
      process.stdin.setRawMode(true);
      rawEnabled = true;
      process.stdin.resume();
      process.stdin.on('data', onData);
    } catch (e) {
      cleanup();
      console.error('\nError: Failed to read password securely:', e?.message || e);
      process.exit(2);
    }
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
