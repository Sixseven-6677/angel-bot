/**
 * DataValidator — التحقق من صحة البيانات وإصلاحها
 * - يتحقق قبل كل عملية حفظ
 * - يكتشف البيانات المكررة والتالفة
 * - يُصلح تلقائياً ما يمكن إصلاحه
 */

"use strict";

const EventBus = require("./EventBus");
const log      = require("../../logger/log.js");

// مخططات التحقق لكل نوع بيانات
const SCHEMAS = {
  users: {
    required: [],
    sanitize: (d) => ({
      id:        d.id        || d.userID || null,
      name:      d.name      || d.username || "مستخدم",
      data:      d.data      || {},
      updatedAt: d.updatedAt || Date.now(),
    }),
  },
  threads: {
    required: [],
    sanitize: (d) => ({
      id:          d.id         || d.threadID || null,
      name:        d.name       || d.threadName || "قروب",
      memberCount: d.memberCount || 0,
      data:        d.data       || {},
      updatedAt:   d.updatedAt  || Date.now(),
    }),
  },
  events: {
    required: ["type"],
    sanitize: (d) => ({
      type:      d.type      || "unknown",
      data:      d.data      || {},
      createdAt: d.createdAt || Date.now(),
    }),
  },
  command_states: {
    required: [],
    sanitize: (d) => ({
      enabled:   d.enabled   !== undefined ? Boolean(d.enabled) : true,
      cooldown:  d.cooldown  || 0,
      data:      d.data      || {},
      updatedAt: d.updatedAt || Date.now(),
    }),
  },
  uptime: {
    required: [],
    sanitize: (d) => ({
      startTime: d.startTime || Date.now(),
      version:   d.version   || "1.0.0",
      data:      d.data      || {},
    }),
  },
  messages: {
    required: [],
    sanitize: (d) => ({
      body:      d.body      || d.message || "",
      authorID:  d.authorID  || d.senderID || null,
      threadID:  d.threadID  || null,
      createdAt: d.createdAt || Date.now(),
    }),
  },
};

class DataValidator {
  // ── التحقق وتعقيم البيانات ────────────────────────────
  validate(table, id, data) {
    if (data === null || data === undefined) {
      log.warn("VALIDATOR", `⚠️ بيانات null لـ [${table}:${id}]`);
      EventBus.emit(EventBus.Events.CORRUPT, { table, id, reason: "null_data" });
      return { valid: false, data: null };
    }

    // تحويل JSON string إذا لزم
    if (typeof data === "string") {
      try { data = JSON.parse(data); }
      catch {
        EventBus.emit(EventBus.Events.CORRUPT, { table, id, reason: "invalid_json" });
        return { valid: false, data: null };
      }
    }

    const schema = SCHEMAS[table];
    if (!schema) {
      // جدول مخصص — قبول مباشر بعد التحقق من الحجم
      return this._checkSize(table, id, data);
    }

    // التحقق من الحقول المطلوبة
    for (const field of (schema.required || [])) {
      if (!(field in data)) {
        log.warn("VALIDATOR", `⚠️ حقل مطلوب مفقود "${field}" في [${table}:${id}]`);
        return { valid: false, data: null };
      }
    }

    // تعقيم + إضافة القيم الافتراضية
    const sanitized = schema.sanitize ? schema.sanitize(data) : data;
    EventBus.emit(EventBus.Events.VALIDATE, { table, id });
    return { valid: true, data: sanitized };
  }

  // ── التحقق من حجم البيانات ───────────────────────────
  _checkSize(table, id, data) {
    try {
      const str = JSON.stringify(data);
      if (str.length > 500_000) { // 500KB حد أقصى لكل سجل
        log.warn("VALIDATOR", `⚠️ بيانات كبيرة جداً [${table}:${id}]: ${str.length} bytes`);
        return { valid: false, data: null };
      }
      return { valid: true, data };
    } catch {
      return { valid: false, data: null };
    }
  }

  // ── كشف التكرار ──────────────────────────────────────
  isDuplicate(existingUpdatedAt, newUpdatedAt) {
    // إذا كانت البيانات الجديدة أقدم من المحفوظة → تجاهل
    return newUpdatedAt && existingUpdatedAt && newUpdatedAt < existingUpdatedAt;
  }

  isCorrupt(data) {
    if (data === null || data === undefined) return true;
    if (typeof data === "string") {
      try { JSON.parse(data); return false; }
      catch { return true; }
    }
    return false;
  }
}

module.exports = new DataValidator();
