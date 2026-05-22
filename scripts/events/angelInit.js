/**
 * angelInit — استرداد مهام الملاك عند بدء التشغيل
 */
"use strict";

let initialized = false;

module.exports = {
  config: {
    name: "angelInit",
    version: "1.0.0",
    author: "Angel",
    category: "events",
    description: "استرداد مهام الملاك تلقائياً عند تشغيل البوت",
  },

  onStart: async function({ api, event }) {
    if (initialized) return;
    initialized = true;
    try {
      const scheduler = require("../cmds/الملاك/scheduler/AngelScheduler");
      await scheduler.initialize(api);
    } catch (err) {
      // غير موجود أو خطأ — تجاهل
    }
  }
};
