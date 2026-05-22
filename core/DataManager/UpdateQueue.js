/**
 * UpdateQueue — قائمة انتظار ذكية للتحديثات
 * - الأحدث له أولوية أعلى دائماً
 * - يمنع تكرار نفس المفتاح (يحل الجديد محل القديم)
 * - Concurrency محدود لمنع تجميد الـ event loop
 * - إعادة محاولة تلقائية عند الفشل
 */

"use strict";

const EventBus = require("./EventBus");
const log      = require("../../logger/log.js");

const MAX_QUEUE_SIZE  = 500;
const MAX_RETRIES     = 3;
const RETRY_DELAY_MS  = 500;
const CONCURRENCY     = 3;  // عدد العمليات المتزامنة

class UpdateQueue {
  constructor() {
    /** @type {Map<string, {table:string, id:string, data:any, priority:number, retries:number}>} */
    this._queue    = new Map();   // key = `table:id`
    this._running  = 0;
    this._handler  = null;        // async fn(table, id, data, extra)
    this._stats    = { processed: 0, failed: 0, deduped: 0 };
    this._draining = false;
  }

  // ── تسجيل المعالج ─────────────────────────────────────
  setHandler(fn) { this._handler = fn; }

  // ── إضافة تحديث للقائمة ──────────────────────────────
  push(table, id, data, extra = {}) {
    const key      = `${table}:${id}`;
    const priority = Date.now(); // الأحدث = أعلى أولوية

    // إذا كان موجوداً، الجديد يحل محل القديم
    if (this._queue.has(key)) {
      this._stats.deduped++;
      EventBus.emit(EventBus.Events.QUEUE_ADD, { key, action: "replaced" });
    } else if (this._queue.size >= MAX_QUEUE_SIZE) {
      // احذف الأقدم لتوفير مكان
      const oldest = this._queue.keys().next().value;
      this._queue.delete(oldest);
      log.warn("QUEUE", `⚠️ القائمة ممتلئة — حُذف ${oldest}`);
    }

    this._queue.set(key, { table, id, data, extra, priority, retries: 0 });
    EventBus.emit(EventBus.Events.QUEUE_ADD, { key, size: this._queue.size });

    // ابدأ المعالجة إذا لم تكن جارية
    setImmediate(() => this._drain());
  }

  // ── معالجة القائمة ────────────────────────────────────
  async _drain() {
    if (this._draining || this._running >= CONCURRENCY) return;
    if (!this._handler || this._queue.size === 0) return;

    this._draining = true;

    while (this._queue.size > 0 && this._running < CONCURRENCY) {
      // خذ العنصر ذا الأولوية الأعلى (الأحدث)
      let   topKey  = null;
      let   topPrio = -1;

      for (const [k, item] of this._queue) {
        if (item.priority > topPrio) { topPrio = item.priority; topKey = k; }
      }

      if (!topKey) break;

      const item = this._queue.get(topKey);
      this._queue.delete(topKey);
      this._running++;

      this._process(item).finally(() => {
        this._running--;
        // استمر في المعالجة إذا بقي عناصر
        if (this._queue.size > 0) setImmediate(() => this._drain());
      });
    }

    this._draining = false;
  }

  async _process(item) {
    try {
      await this._handler(item.table, item.id, item.data, item.extra);
      this._stats.processed++;
      EventBus.emit(EventBus.Events.QUEUE_DONE, { table: item.table, id: item.id });

    } catch (err) {
      log.error("QUEUE", `❌ فشل معالجة [${item.table}:${item.id}]: ${err.message}`);

      if (item.retries < MAX_RETRIES) {
        item.retries++;
        const delay = RETRY_DELAY_MS * Math.pow(2, item.retries); // exponential backoff
        log.info("QUEUE", `🔄 إعادة المحاولة ${item.retries}/${MAX_RETRIES} بعد ${delay}ms`);
        setTimeout(() => {
          this._queue.set(`${item.table}:${item.id}`, { ...item, priority: Date.now() });
          this._drain();
        }, delay);
      } else {
        this._stats.failed++;
        log.error("QUEUE", `💀 فشل نهائي بعد ${MAX_RETRIES} محاولات: [${item.table}:${item.id}]`);
      }
    }
  }

  get size()  { return this._queue.size; }
  stats()     { return { ...this._stats, queueSize: this._queue.size, running: this._running }; }
}

module.exports = new UpdateQueue();
