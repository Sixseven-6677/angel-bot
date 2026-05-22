/**
 * BackupManager — نظام Backup تلقائي وRecovery
 * - نسخة احتياطية كل 5 دقائق
 * - يحتفظ بآخر 3 نسخ فقط
 * - يستعيد آخر نسخة سليمة عند الكشف عن تلف
 */

"use strict";

const fs       = require("fs");
const path     = require("path");
const EventBus = require("./EventBus");
const log      = require("../../logger/log.js");

const DB_PATH      = path.join(__dirname, "../../data/angel_data.db");
const BACKUP_DIR   = path.join(__dirname, "../../data/backups");
const BACKUP_EVERY = 5 * 60 * 1000;  // كل 5 دقائق
const MAX_BACKUPS  = 3;

class BackupManager {
  constructor() {
    this._timer = null;
  }

  start() {
    if (!fs.existsSync(BACKUP_DIR))
      fs.mkdirSync(BACKUP_DIR, { recursive: true });

    // نسخة فورية عند البدء
    setImmediate(() => this.createBackup());

    this._timer = setInterval(() => this.createBackup(), BACKUP_EVERY);
    this._timer.unref?.();
    log.info("BACKUP", `✅ نظام Backup نشط — كل ${BACKUP_EVERY / 60000} دقائق`);
  }

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  // ── إنشاء نسخة احتياطية ──────────────────────────────
  createBackup() {
    if (!fs.existsSync(DB_PATH)) return;

    try {
      const ts      = Date.now();
      const name    = `angel_data_${ts}.db`;
      const dest    = path.join(BACKUP_DIR, name);

      fs.copyFileSync(DB_PATH, dest);
      log.info("BACKUP", `💾 نسخة احتياطية: ${name}`);
      EventBus.emit(EventBus.Events.BACKUP, { path: dest, ts });

      this._pruneOld();
    } catch (err) {
      log.error("BACKUP", `❌ فشل إنشاء النسخة: ${err.message}`);
    }
  }

  // ── الاسترداد من آخر نسخة سليمة ─────────────────────
  recover() {
    const backups = this._listBackups();
    if (!backups.length) {
      log.warn("BACKUP", "⚠️ لا توجد نسخ احتياطية متاحة");
      return false;
    }

    const latest = backups[backups.length - 1]; // الأحدث
    try {
      fs.copyFileSync(latest, DB_PATH);
      log.info("BACKUP", `✅ تم الاسترداد من: ${path.basename(latest)}`);
      EventBus.emit(EventBus.Events.RECOVER, { from: latest });
      return true;
    } catch (err) {
      log.error("BACKUP", `❌ فشل الاسترداد: ${err.message}`);
      return false;
    }
  }

  // ── حذف النسخ القديمة ────────────────────────────────
  _pruneOld() {
    const backups = this._listBackups();
    if (backups.length <= MAX_BACKUPS) return;

    const toDelete = backups.slice(0, backups.length - MAX_BACKUPS);
    for (const f of toDelete) {
      try {
        fs.unlinkSync(f);
        log.info("BACKUP", `🗑️ حُذفت نسخة قديمة: ${path.basename(f)}`);
      } catch { /* تجاهل أخطاء الحذف */ }
    }
  }

  // ── قائمة النسخ مرتبة بالتاريخ ──────────────────────
  _listBackups() {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    return fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith("angel_data_") && f.endsWith(".db"))
      .map(f => path.join(BACKUP_DIR, f))
      .sort(); // ترتيب زمني (الاسم يحتوي timestamp)
  }

  listAll() { return this._listBackups().map(f => path.basename(f)); }
}

module.exports = new BackupManager();
