const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { prisma } = require('./db.cjs');

const DB_PATH = path.join(__dirname, '..', 'dev.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Perform a database backup
 * @param {Object} options 
 * @param {string} options.type - manual, scheduled, pre_deploy, pre_restore
 * @param {string} options.createdById - user id who triggered it
 */
async function performBackup(options = { type: 'manual' }) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${options.type}-${timestamp}.db`;
  const backupPath = path.join(BACKUP_DIR, filename);
  
  try {
    // 1. Copy file
    fs.copyFileSync(DB_PATH, backupPath);
    
    const stats = fs.statSync(backupPath);
    const durationMs = Date.now() - startTime;
    
    // 2. Calculate checksum
    const hash = crypto.createHash('sha256');
    const fileBuffer = fs.readFileSync(backupPath);
    hash.update(fileBuffer);
    const checksum = hash.digest('hex');

    // 3. Record in DB
    const backup = await prisma.backup.create({
      data: {
        type: options.type,
        storageProvider: 'local',
        filePath: filename,
        fileSizeBytes: stats.size,
        checksum,
        durationMs,
        status: 'success',
        createdById: options.createdById || null
      }
    });

    console.log(`[Backup] Created ${options.type} backup: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // 4. Cleanup old backups based on retention
    await cleanupOldBackups();

    return backup;
  } catch (err) {
    console.error('[Backup] Failed:', err);
    
    // Record failure if possible
    try {
      await prisma.backup.create({
        data: {
          type: options.type,
          storageProvider: 'local',
          filePath: filename,
          fileSizeBytes: 0,
          status: 'failed',
          errorJson: JSON.stringify({ message: err.message, stack: err.stack }),
          createdById: options.createdById || null
        }
      });
    } catch (dbErr) {
      console.error('[Backup] Failed to record failure in DB:', dbErr);
    }
    
    throw err;
  }
}

/**
 * Cleanup old backups based on retention settings
 */
async function cleanupOldBackups() {
  try {
    const schedule = await prisma.backupSchedule.findFirst();
    const retentionCount = schedule?.retentionCount || 7;

    const backups = await prisma.backup.findMany({
      where: { status: 'success' },
      orderBy: { createdAt: 'desc' }
    });

    if (backups.length > retentionCount) {
      const toDelete = backups.slice(retentionCount);
      for (const b of toDelete) {
        const fullPath = path.join(BACKUP_DIR, b.filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        await prisma.backup.delete({ where: { id: b.id } });
        console.log(`[Backup] Deleted old backup: ${b.filePath}`);
      }
    }
  } catch (err) {
    console.error('[Backup] Cleanup failed:', err);
  }
}

/**
 * Restore database from a backup
 * @param {string} backupId 
 * @param {Object} actor - user performing the restore
 */
async function restoreBackup(backupId, actor) {
  if (actor.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Only SUPER_ADMIN can restore backups');
  }

  const backup = await prisma.backup.findUnique({ where: { id: backupId } });
  if (!backup) throw new Error('Backup not found');

  const backupPath = path.join(BACKUP_DIR, backup.filePath);
  if (!fs.existsSync(backupPath)) throw new Error('Backup file missing on disk');

  console.log(`[Backup] Starting restore from ${backup.filePath}...`);

  // 1. Take a safety backup first
  await performBackup({ type: 'pre_restore', createdById: actor.id });

  // 2. Close DB connection
  try {
    if (prisma._db) {
      prisma._db.close();
    }

    fs.copyFileSync(backupPath, DB_PATH);
    console.log(`[Backup] Restore successful from ${backup.filePath}`);
    
    // Re-open DB
    const Database = require('better-sqlite3');
    prisma._db = new Database(DB_PATH);
    prisma._db.pragma('foreign_keys = ON');

    return { success: true, message: 'Database restored successfully' };
  } catch (err) {
    console.error('[Backup] Restore failed:', err);
    throw new Error(`Restore failed: ${err.message}`);
  }
}

module.exports = { performBackup, restoreBackup };
