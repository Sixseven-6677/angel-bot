/**
 * EventBus — ناقل الأحداث المركزي
 * كل مكونات النظام تتواصل عبره
 */

"use strict";

const { EventEmitter } = require("events");

// أحداث النظام كـ object مستقل (يُستورَد بأمان من أي ملف)
const Events = {
  UPDATE:    "data:update",
  DELETE:    "data:delete",
  CACHE_HIT: "cache:hit",
  CACHE_MISS:"cache:miss",
  DB_WRITE:  "db:write",
  DB_ERROR:  "db:error",
  BACKUP:    "backup:created",
  RECOVER:   "backup:recovered",
  VALIDATE:  "data:validated",
  CORRUPT:   "data:corrupt",
  QUEUE_ADD: "queue:add",
  QUEUE_DONE:"queue:done",
};

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    this.Events = Events;   // متاح على الـ instance أيضاً
    this._stats = { emitted: 0, errors: 0 };
  }

  emit(event, ...args) {
    this._stats.emitted++;
    return super.emit(event, ...args);
  }

  stats() { return { ...this._stats }; }
}

const bus     = new EventBus();
bus.Events    = Events; // ضمان الوصول في كل الحالات
module.exports = bus;
module.exports.Events = Events; // named export للاستيراد المباشر
