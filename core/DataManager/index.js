/**
 * ╔══════════════════════════════════════════════════════╗
 * ║             DataManager — Angel Bot                  ║
 * ║   نظام إدارة البيانات الذكي والمتكامل               ║
 * ║                                                      ║
 * ║  ✦ Event-Driven  ✦ Smart Cache  ✦ SQLite Persist     ║
 * ║  ✦ Auto Backup   ✦ Recovery     ✦ No Memory Leak     ║
 * ║  ✦ Priority Queue ✦ Auto Repair ✦ 24/7 Optimized    ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * الاستخدام:
 *   const DM = require("./core/DataManager");
 *   DM.init();
 *
 *   // كتابة
 *   DM.update("users", userId, { name: "أحمد", level: 5 });
 *
 *   // قراءة (من كاش أو DB)
 *   const user = DM.get("users", userId);
 *
 *   // حذف
 *   DM.delete("users", userId);
 *
 *   // الاستماع للأحداث
 *   DM.on("data:update", ({ table, id }) => { ... });
 */

"use strict";

const EventBus     = require("./EventBus");
const CacheManager = require("./CacheManager");
const DBAdapter    = require("./DBAdapter");
const UpdateQueue  = require("./UpdateQueue");
const SyncEngine   = require("./SyncEngine");
const BackupManager= require("./BackupManager");
const Validator    = require("./DataValidator");
const log          = require("../../logger/log.js");

class DataManager {
  constructor() {
    this._ready = false;
  }

  // ═══════════════════════════════════════════════════════
  //  تهيئة النظام (استدعِه مرة واحدة عند بدء البوت)
  // ═══════════════════════════════════════════════════════
  init() {
    if (this._ready) return this;

    log.info("DM", "🚀 تهيئة DataManager...");

    try {
      // 1. قاعدة البيانات أولاً
      DBAdapter.init();

      // 2. الكاش
      CacheManager.start();

      // 3. محرك المزامنة (يربط Queue + Cache + DB)
      SyncEngine.init();

      // 4. نظام Backup
      BackupManager.start();

      this._ready = true;
      log.info("DM", "✅ DataManager جاهز تماماً");

    } catch (err) {
      log.error("DM", `❌ فشل التهيئة: ${err.message}`);
      log.info("DM", "🔄 محاولة الاسترداد من آخر نسخة احتياطية...");

      if (BackupManager.recover()) {
        DBAdapter.init();
        CacheManager.start();
        SyncEngine.init();
        BackupManager.start();
        this._ready = true;
        log.info("DM", "✅ تم الاسترداد والتشغيل بنجاح");
      } else {
        log.error("DM", "💀 فشل الاسترداد — البوت سيعمل بدون استمرارية البيانات");
      }
    }

    return this;
  }

  // ═══════════════════════════════════════════════════════
  //  API الرئيسي
  // ═══════════════════════════════════════════════════════

  /**
   * تحديث أو إنشاء بيانات (لحظي في الكاش، async في DB)
   * @param {string} table - نوع البيانات (users/threads/events/command_states/uptime/messages/أي اسم)
   * @param {string} id    - المعرف الفريد
   * @param {object} data  - البيانات
   * @param {object} extra - بيانات إضافية للجدول (threadID, type, إلخ)
   */
  update(table, id, data, extra = {}) {
    EventBus.emit(EventBus.Events.UPDATE, { table, id: String(id), data, extra });
    return this;
  }

  /**
   * قراءة البيانات — من الكاش أولاً، ثم DB
   * @returns {any|null}
   */
  get(table, id) {
    if (!this._ready) return null;

    const cacheKey = `${table}:${id}`;
    const cached   = CacheManager.get(cacheKey);
    if (cached !== null) return cached;

    // Fallback للـ DB وإعادة التخزين في الكاش
    const fromDB = DBAdapter.get(table, String(id));
    if (fromDB) CacheManager.set(cacheKey, fromDB);
    return fromDB;
  }

  /**
   * حذف البيانات من الكاش والـ DB
   */
  delete(table, id) {
    EventBus.emit(EventBus.Events.DELETE, { table, id: String(id) });
    return this;
  }

  /**
   * تحديث جزئي (patch) — يدمج مع الموجود بدل الاستبدال
   */
  patch(table, id, updates, extra = {}) {
    const existing = this.get(table, id) || {};
    const merged   = { ...existing, ...updates, updatedAt: Date.now() };
    this.update(table, id, merged, extra);
    return merged;
  }

  /**
   * جلب الكل من جدول معين
   */
  getAll(table) {
    if (!this._ready) return [];
    return DBAdapter.getAll(table);
  }

  /**
   * التحقق من وجود بيانات
   */
  has(table, id) {
    return this.get(table, id) !== null;
  }

  // ═══════════════════════════════════════════════════════
  //  أوامر مساعدة مباشرة (shortcuts)
  // ═══════════════════════════════════════════════════════

  updateUser(userID, data) {
    return this.update("users", userID, data);
  }

  getUser(userID) {
    return this.get("users", userID);
  }

  updateThread(threadID, data) {
    return this.update("threads", threadID, data);
  }

  getThread(threadID) {
    return this.get("threads", threadID);
  }

  updateCommandState(command, threadID, state) {
    return this.update("command_states", `${command}:${threadID}`, state, { command });
  }

  getCommandState(command, threadID) {
    return this.get("command_states", `${command}:${threadID}`);
  }

  logEvent(type, data) {
    const id = `${type}_${Date.now()}`;
    return this.update("events", id, data, { type, createdAt: Date.now() });
  }

  updateUptime(data) {
    return this.update("uptime", "bot", data, { startTime: data.startTime || Date.now() });
  }

  saveMessage(msgID, threadID, data) {
    return this.update("messages", msgID, data, { threadID, createdAt: Date.now() });
  }

  // ═══════════════════════════════════════════════════════
  //  الأحداث
  // ═══════════════════════════════════════════════════════
  on(event, listener)  { EventBus.on(event, listener); return this; }
  off(event, listener) { EventBus.off(event, listener); return this; }

  // ═══════════════════════════════════════════════════════
  //  إحصاءات النظام
  // ═══════════════════════════════════════════════════════
  stats() {
    return {
      ready:    this._ready,
      cache:    CacheManager.stats(),
      queue:    UpdateQueue.stats(),
      eventBus: EventBus.stats(),
      backups:  BackupManager.listAll(),
    };
  }

  // ═══════════════════════════════════════════════════════
  //  إيقاف نظيف
  // ═══════════════════════════════════════════════════════
  shutdown() {
    log.info("DM", "🔌 إيقاف DataManager...");
    BackupManager.createBackup(); // نسخة احتياطية أخيرة
    BackupManager.stop();
    SyncEngine.stop();
    CacheManager.stop();
    DBAdapter.close();
    log.info("DM", "✅ DataManager أُوقف بشكل نظيف");
  }
}

const instance = new DataManager();

// تصدير المكونات الفردية أيضاً للاستخدام المباشر
instance.EventBus      = EventBus;
instance.CacheManager  = CacheManager;
instance.DBAdapter     = DBAdapter;
instance.UpdateQueue   = UpdateQueue;
instance.BackupManager = BackupManager;
instance.Validator     = Validator;
instance.Events        = EventBus.Events;

module.exports = instance;
