/* ═══════════════════════════════════════════════════════
   Backup Scheduler — Daily SQLite snapshot with 7-day retention
   ═══════════════════════════════════════════════════════

   Why: Railway redeploys preserve the Volume but never the running container.
   If a deploy or migration corrupts the DB (or someone accidentally drops a
   table), having yesterday's snapshot on disk lets us roll back in minutes
   without losing more than a day of user-generated skills.

   Where backups live:
     /app/data/
     ├── database.sqlite3              ← live DB
     └── backups/
         ├── backup-2026-05-04.sqlite3 ← today
         ├── backup-2026-05-03.sqlite3
         └── ...                       ← up to 7 days back

   How to restore (manual):
     1. Stop the service (Railway → Settings → Pause)
     2. SSH into the container or use Railway CLI:
          railway run bash
          cd /app/data
          cp backups/backup-YYYY-MM-DD.sqlite3 database.sqlite3
     3. Resume the service.
*/

import { join, dirname } from 'path';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';

const BACKUP_RETENTION_DAYS = 7;
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;  // 24 hours
const FIRST_BACKUP_DELAY_MS = 30 * 1000;         // 30 seconds after server start
                                                  // (gives DB time to settle but
                                                  // still gives early sanity check)

export function startBackupScheduler(db, dbPath) {
  const dbDir = dirname(dbPath);
  const backupDir = join(dbDir, 'backups');

  // Ensure backup directory exists
  if (!existsSync(backupDir)) {
    try {
      mkdirSync(backupDir, { recursive: true });
      console.log(`[backup] Created backup directory: ${backupDir}`);
    } catch (err) {
      console.warn(`[backup] Cannot create backup dir at ${backupDir} — backups disabled:`, err.message);
      return;
    }
  }

  async function performBackup() {
    console.log('[backup] Starting snapshot...');
    try {
      const date = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
      const backupPath = join(backupDir, `backup-${date}.sqlite3`);

      // VACUUM INTO is SQLite's official safe-backup mechanism (3.27+).
      // Unlike fs.copyFile, it handles active connections, WAL files, and
      // produces a self-consistent snapshot even if writes happen mid-backup.
      // CRITICAL: must use db.exec() not db.query() — VACUUM INTO cannot be
      // a prepared statement, and the query() wrapper goes through .prepare().
      const escapedPath = backupPath.replace(/'/g, "''");
      if (typeof db.exec === 'function') {
        db.exec(`VACUUM INTO '${escapedPath}'`);
      } else {
        // Fallback for adapters without exec()
        await db.query(`VACUUM INTO '${escapedPath}'`);
      }

      if (!existsSync(backupPath)) {
        throw new Error(`VACUUM INTO completed but file not found at ${backupPath}`);
      }

      const sizeKB = Math.round(statSync(backupPath).size / 1024);
      console.log(`[backup] ✓ Snapshot saved: ${backupPath} (${sizeKB} KB)`);

      cleanOldBackups();
    } catch (err) {
      console.error('[backup] ✗ Snapshot failed:', err.message);
      console.error('[backup]   stack:', err.stack);
    }
  }

  function cleanOldBackups() {
    try {
      const cutoff = Date.now() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
      let removed = 0;
      readdirSync(backupDir).forEach(filename => {
        if (!filename.startsWith('backup-') || !filename.endsWith('.sqlite3')) return;
        const fullPath = join(backupDir, filename);
        if (statSync(fullPath).mtimeMs < cutoff) {
          unlinkSync(fullPath);
          removed++;
        }
      });
      if (removed > 0) {
        console.log(`[backup] Removed ${removed} old backup(s) (>${BACKUP_RETENTION_DAYS} days)`);
      }
    } catch (err) {
      console.warn('[backup] Cleanup failed:', err.message);
    }
  }

  // Run a backup 5 minutes after startup (lets seed/migration settle first),
  // then every 24 hours after that.
  setTimeout(performBackup, FIRST_BACKUP_DELAY_MS);
  setInterval(performBackup, BACKUP_INTERVAL_MS);

  console.log(`[backup] Scheduler started — daily snapshots, ${BACKUP_RETENTION_DAYS}-day retention`);
  console.log(`[backup] First snapshot in ${Math.round(FIRST_BACKUP_DELAY_MS / 1000)}s; thereafter every ${Math.round(BACKUP_INTERVAL_MS / 3600000)}h`);
  console.log(`[backup] Backup directory: ${backupDir}`);
}
