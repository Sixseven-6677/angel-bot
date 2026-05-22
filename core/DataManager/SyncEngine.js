/**
 * SyncEngine — محرك المزامنة الرئيسي
 * يُنسّق بين Cache + DB + Queue + Validator
 * Event-Driven — كل تحديث يُعالَج فور وصوله
 * يتحقق من صحة البيانات كل دقيقة
 */

"use strict";

const EventBus     = require("./EventBus");
const CacheManager = require("./CacheManager");
const DBAdapter    = require("./DBAdapter");
const UpdateQueue  = require("./UpdateQueue");
const Validator    = require("./DataValidator");
const log          = require("../../logger/log.js");

const HEALTH_CHECK_EVERY = 60 * 1000; // كل دقيقة

class SyncEngine {
  constructor() {
    this._healthTimer = null;
    this._started     = false;
  }

  init() {
    if (this._started) return;
    this._started = true;

    // تسجيل معالج القائمة
    UpdateQueue.setHandler(async (table, id, data, extra) => {
      await this._persist(table, id, data, extra);
    });

    // استمع لأحداث التحديث الخارجية
    EventBus.on(EventBus.Events.UPDATE, ({ table, id, data, extra = {} }) => {
      UpdateQueue.push(table, id, data, extra);
    });

    EventBus.on(EventBus.Events.DELETE, ({ table, id }) => {
      this._delete(table, id);
    });

    // فحص صحة دوري
    this._healthTimer = setInterval(() => this._healthCheck(), HEALTH_CHECK_EVERY);
    this._healthTimer.unref?.();

    log.info("SYNC", "✅ SyncEngine جاهز — Event-Driven مفعّل");
  }

  stop() {
    if (this._healthTimer) { clearInterval(this._healthTimer); this._healthTimer = null; }
    this._started = false;
  }

  // ── الحفظ الموحد: Cache أولاً ثم DB ─────────────────
  async _persist(table, id, data, extra = {}) {
    const { valid, data: clean } = Validator.validate(table, id, data);
    if (!valid) {
      log.warn("SYNC", `⚠️ بيانات غير صالحة تجاهلت [${table}:${id}]`);
      return;
    }

    const cacheKey = `${table}:${id}`;

    // تحقق من التكرار (البيانات الجديدة يجب أن تكون أحدث)
    const cached = CacheManager.get(cacheKey);
    if (cached && Validator.isDuplicate(cached.updatedAt, clean.updatedAt)) {
      log.info("SYNC", `⏩ تخطي تحديث قديم [${cacheKey}]`);
      return;
    }

    // تحديث الكاش فوراً (لحظي)
    CacheManager.set(cacheKey, { ...clean, updatedAt: Date.now() });

    // حفظ في DB
    try {
      DBAdapter.upsert(table, id, clean, extra);
    } catch (err) {
      // إذا فشل DB، الكاش لا يزال محدّثاً
      log.error("SYNC", `❌ DB فشل [${table}:${id}]: ${err.message}`);
      throw err; // يرفع للـ Queue لإعادة المحاولة
    }
  }

  // ── الحذف الموحد ─────────────────────────────────────
  _delete(table, id) {
    CacheManager.delete(`${table}:${id}`);
    DBAdapter.delete(table, id);
    log.info("SYNC", `🗑️ حُذف [${table}:${id}]`);
  }

  // ── فحص الصحة الدوري ─────────────────────────────────
  _healthCheck() {
    try {
      const fixed = DBAdapter.repairCorrupt();
      const stats = {
        cache:   CacheManager.stats(),
        queue:   UpdateQueue.stats(),
        eventBus:EventBus.stats(),
      };

      if (fixed > 0)
        log.warn("SYNC", `🔧 فحص صحة: أُصلحت ${fixed} سجلات`);

      if (stats.queue.queueSize > 100)
        log.warn("SYNC", `⚠️ قائمة الانتظار كبيرة: ${stats.queue.queueSize}`);

      if (parseFloat(stats.cache.hitRate) < 20 && stats.cache.size > 50)
        log.warn("SYNC", `⚠️ معدل إصابة الكاش منخفض: ${stats.cache.hitRate}`);

    } catch (err) {
      log.error("SYNC", `❌ خطأ في فحص الصحة: ${err.message}`);
    }
  }
}

module.exports = new SyncEngine();
