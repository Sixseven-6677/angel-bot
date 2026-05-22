/**
 * AngelScheduler — محرك الجدولة الاحترافي
 * يستخدم setTimeout بدلاً من setInterval لضبط دقيق
 * يدعم Recovery كامل عند إعادة تشغيل البوت
 */

"use strict";

const db  = require("../models/AngelDB");
const { randomBetween, formatSeconds } = require("../utils/timeUtils");
const log = require("../../../../logger/log.js");

const MIN_INTERVAL_S = 10;   // حد أدنى 10 ثواني لمنع السبام
const JITTER_MAX_S   = 5;    // تأخير عشوائي إضافي لمظهر طبيعي
const RECOVERY_DELAY = 3000; // 3 ثواني تأخير أولي عند الاسترداد

class AngelScheduler {
  constructor() {
    /** @type {Map<string, NodeJS.Timeout>} */
    this.timers      = new Map();
    this.api         = null;
    this.initialized = false;
  }

  // ─────────────────────────────────────────────
  //  تهيئة واسترداد المهام من قاعدة البيانات
  // ─────────────────────────────────────────────
  async initialize(api) {
    this.api = api;
    if (this.initialized) return;
    this.initialized = true;

    const activeTasks = db.getAllActive();
    if (activeTasks.length === 0) {
      log.info("ANGEL", "📋 لا توجد مهام مسبقة للاسترداد");
      return;
    }

    log.info("ANGEL", `🔄 استرداد ${activeTasks.length} مهمة من قاعدة البيانات...`);

    for (const task of activeTasks) {
      try {
        await this._schedule(task, true);
        log.info("ANGEL", `✅ استُردت مهمة: ${task.threadID}`);
      } catch (err) {
        log.error("ANGEL", `❌ فشل استرداد ${task.threadID}: ${err.message}`);
      }
    }

    log.info("ANGEL", `🚀 النظام جاهز — ${activeTasks.length} مهمة نشطة`);
  }

  // ─────────────────────────────────────────────
  //  جدولة مهمة (داخلي)
  // ─────────────────────────────────────────────
  async _schedule(task, isRecovery = false) {
    this._clearTimer(task.threadID);

    const now   = Date.now();
    let delayMs;

    if (isRecovery) {
      if (task.nextSendTime > now) {
        // الوقت في المستقبل → انتظر المتبقي
        delayMs = task.nextSendTime - now;
      } else {
        // الوقت مضى → أرسل بعد تأخير قصير لتجنب الإرسال المتزامن
        delayMs = RECOVERY_DELAY + randomBetween(0, 5) * 1000;
      }
    } else {
      const interval = randomBetween(
        Math.max(MIN_INTERVAL_S, task.minTime),
        Math.max(MIN_INTERVAL_S + 1, task.maxTime)
      ) + randomBetween(0, JITTER_MAX_S);

      delayMs = interval * 1000;
      db.updateTask(task.threadID, { nextSendTime: now + delayMs });
    }

    const timer = setTimeout(() => this._send(task.threadID), delayMs);
    this.timers.set(task.threadID, timer);
  }

  // ─────────────────────────────────────────────
  //  إرسال الرسالة (القلب)
  // ─────────────────────────────────────────────
  async _send(threadID) {
    this._clearTimer(threadID);

    const task = db.getTask(threadID);
    if (!task || !task.isActive) return;

    // انتظار API إذا لم يكن جاهزاً
    if (!this.api) {
      log.warn("ANGEL", `⚠️ API غير جاهز، إعادة المحاولة بعد 5 ثواني (${threadID})`);
      const t = setTimeout(() => this._send(threadID), 5000);
      this.timers.set(threadID, t);
      return;
    }

    try {
      // التحقق من وجود البوت في القروب
      const threadInfo = await new Promise((resolve, reject) => {
        this.api.getThreadInfo(threadID, (err, info) => {
          if (err) reject(err);
          else resolve(info);
        });
      }).catch(() => null);

      if (!threadInfo) {
        log.warn("ANGEL", `🚫 البوت غير موجود في القروب ${threadID} — حذف المهمة`);
        this.deleteTask(threadID);
        return;
      }

      // إرسال الرسالة
      await new Promise((resolve, reject) => {
        this.api.sendMessage(task.message, threadID, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      db.incrementSent(threadID);
      const freshTask = db.getTask(threadID);
      log.info("ANGEL", `📨 [${threadID}] رسالة #${freshTask ? freshTask.sentCount : "?"} مرسلة`);

    } catch (err) {
      const errStr = String(err.error || err.message || err);
      const isPermErr = /1545|permission|not allowed|blocked/i.test(errStr);

      if (isPermErr) {
        log.warn("ANGEL", `🚫 لا صلاحية إرسال في ${threadID} — تعطيل المهمة`);
        db.updateTask(threadID, { isActive: 0 });
        this._clearTimer(threadID);
        return;
      }

      log.error("ANGEL", `❌ خطأ في ${threadID}: ${errStr}`);
    }

    // جدولة الإرسال القادم
    const refreshed = db.getTask(threadID);
    if (refreshed && refreshed.isActive) {
      await this._schedule(refreshed, false);
    }
  }

  // ─────────────────────────────────────────────
  //  عمليات عامة
  // ─────────────────────────────────────────────
  async startTask(threadID) {
    const task = db.updateTask(threadID, { isActive: 1 });
    if (!task) return false;
    await this._schedule(task, false);
    return true;
  }

  stopTask(threadID) {
    this._clearTimer(threadID);
    db.updateTask(threadID, { isActive: 0, nextSendTime: 0 });
  }

  deleteTask(threadID) {
    this._clearTimer(threadID);
    db.deleteTask(threadID);
  }

  isRunning(threadID) {
    return this.timers.has(threadID);
  }

  _clearTimer(threadID) {
    if (this.timers.has(threadID)) {
      clearTimeout(this.timers.get(threadID));
      this.timers.delete(threadID);
    }
  }
}

module.exports = new AngelScheduler();
