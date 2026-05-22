/**
 * angelInit — تهيئة نظام الملاك عند بدء التشغيل
 * يستعيد جميع المهام النشطة من قاعدة البيانات تلقائياً
 */

"use strict";

let initialized = false;

module.exports.config = {
  name        : "angelInit",
  description : "استرداد مهام الملاك تلقائياً عند تشغيل البوت",
};

module.exports.handleEvent = async function({ api, event }) {
  if (initialized) return;
  initialized = true;

  try {
    const scheduler = require("../cmds/الملاك/scheduler/AngelScheduler");
    await scheduler.initialize(api);
  } catch (err) {
    // الأمر غير موجود أو خطأ في التهيئة — تجاهل
  }
};
