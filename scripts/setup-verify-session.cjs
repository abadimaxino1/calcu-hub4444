const { db } = require('../server/db.cjs');
const { v4: uuidv4 } = require('uuid');

const userId = uuidv4();
const sessionId = uuidv4();
const now = new Date().toISOString();
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

console.log('Setting up test session...');

// Create a dummy user if not exists (email unique constraint)
try {
  const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get('admin@calcuhub.com');
  let targetUserId = userId;
  
  if (existingUser) {
      console.log('User admin@calcuhub.com already exists.');
      targetUserId = existingUser.id;
  } else {
      db.prepare(`
        INSERT INTO users (id, email, name, hashedPassword, role, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, 'admin@calcuhub.com', 'Test Admin', 'hash', 'SUPER_ADMIN', 1, now, now);
      console.log('Created test user');
  }

  // Create the session
  // Delete existing sessions for this user to be clean
  db.prepare("DELETE FROM sessions WHERE userId = ?").run(targetUserId);

  db.prepare(`
    INSERT INTO sessions (id, userId, token, expiresAt, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `).run(sessionId, targetUserId, 'test-token-verify', expiresAt, now);
  console.log('Created test session with token: test-token-verify');

} catch (e) {
  console.error('Error setting up session:', e);
}
