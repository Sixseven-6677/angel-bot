/**
 * ╔══════════════════════════════════════════════╗
 * ║          🤖 نظام الملاك للإرسال            ║
 * ║    نظام إرسال تلقائي احترافي مع Scheduler   ║
 * ║    Recovery + SQLite + setTimeout            ║
 * ╚══════════════════════════════════════════════╝
 */

"use strict";

const scheduler = require("./الملاك/scheduler/AngelScheduler");
const handlers  = require("./الملاك/handlers/commandHandlers");

const HELP = [
  "╔══════════════════════════════════╗",
  "║    🤖 نظام الملاك للإرسال       ║",
  "╚══════════════════════════════════╝",
  "",
  "📝  الملاك رسالة <النص>",
  "     ← تعيين الرسالة التلقائية",
  "",
  "⏱️  الملاك وقت <min> <max>",
  "     ← تحديد وقت عشوائي بالثواني",
  "",
  "📊  الملاك حالة",
  "     ← عرض حالة النظام الكاملة",
  "",
  "📋  الملاك قائمة",
  "     ← جميع القروبات النشطة",
  "",
  "⏳  الملاك القادم",
  "     ← الوقت المتبقي للإرسال القادم",
  "",
  "🔴  الملاك إيقاف",
  "     ← إيقاف الإرسال",
  "",
  "🟢  الملاك تشغيل",
  "     ← استئناف الإرسال",
  "",
  "🗑️  الملاك حذف",
  "     ← حذف المهمة والبيانات",
].join("\n");

// ─── تعريف الأمر ────────────────────────────────
module.exports.config = {
  name            : "الملاك",
  version         : "1.0.0",
  hasPermssion    : 1,
  credits         : "Angel Bot",
  description     : "نظام إرسال تلقائي احترافي مع حفظ البيانات واسترداد تلقائي",
  commandCategory : "إدارة",
  usages          : "الملاك [رسالة|وقت|حالة|قائمة|القادم|إيقاف|تشغيل|حذف]",
  cooldowns       : 3,
};

// ─── تنفيذ الأمر ────────────────────────────────
module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  // تهيئة الجدولة وتحديث مرجع الـ API (آمن، لا يتكرر)
  await scheduler.initialize(api);

  const subCmd = (args[0] || "").trim();

  switch (subCmd) {
    case "رسالة":
      return handlers.handleMessage({ api, event, args });

    case "وقت":
      return handlers.handleTime({ api, event, args });

    case "حالة":
      return handlers.handleStatus({ api, event });

    case "قائمة":
      return handlers.handleList({ api, event });

    case "القادم":
      return handlers.handleNext({ api, event });

    case "إيقاف":
    case "ايقاف":
      return handlers.handleStop({ api, event });

    case "تشغيل":
      return handlers.handleStart({ api, event });

    case "حذف":
      return handlers.handleDelete({ api, event });

    default:
      return new Promise((resolve) => {
        api.sendMessage(HELP, threadID, resolve, messageID);
      });
  }
};
