/**
 * commandHandlers — معالجات الأوامر الفرعية
 * كل أمر فرعي للملاك موجود هنا بشكل مستقل
 */

"use strict";

const db        = require("../models/AngelDB");
const scheduler = require("../scheduler/AngelScheduler");
const { formatSeconds, formatCountdown, formatDate } = require("../utils/timeUtils");

const MIN_TIME_LIMIT  = 10;     // 10 ثواني حد أدنى
const MAX_TIME_LIMIT  = 86400;  // 24 ساعة حد أقصى
const MAX_MSG_LENGTH  = 500;

function reply(api, threadID, body, messageID) {
  return new Promise((resolve) => {
    api.sendMessage(body, threadID, resolve, messageID);
  });
}

// ──────────────────────────────────────────────
//  الملاك رسالة <النص>
// ──────────────────────────────────────────────
async function handleMessage({ api, event, args }) {
  const { threadID, messageID } = event;
  const text = args.slice(1).join(" ").trim();

  if (!text)
    return reply(api, threadID,
      "❌ اكتب الرسالة بعد الأمر\nمثال: الملاك رسالة مرحبا بالجميع ❤️",
      messageID);

  if (text.length > MAX_MSG_LENGTH)
    return reply(api, threadID,
      `❌ الرسالة طويلة جداً (الحد الأقصى ${MAX_MSG_LENGTH} حرف)`,
      messageID);

  const existing = db.getTask(threadID);

  if (!existing) {
    db.createTask(threadID, text, 30, 120);
    await scheduler.startTask(threadID);
    return reply(api, threadID,
      [
        "╔══════════════════════════════╗",
        "║  ✅ تم إنشاء مهمة الإرسال   ║",
        "╚══════════════════════════════╝",
        "",
        `📝 الرسالة: ${text}`,
        `⏱️ كل 30–120 ثانية (عشوائي)`,
        `🟢 النظام يعمل الآن`,
      ].join("\n"),
      messageID);
  }

  db.updateTask(threadID, { message: text });
  return reply(api, threadID,
    `✅ تم تحديث الرسالة\n\n📝 الرسالة الجديدة:\n${text}\n\nسيُرسلها في الإرسال القادم.`,
    messageID);
}

// ──────────────────────────────────────────────
//  الملاك وقت <min> <max>
// ──────────────────────────────────────────────
async function handleTime({ api, event, args }) {
  const { threadID, messageID } = event;
  const min = parseInt(args[1]);
  const max = parseInt(args[2]);

  if (isNaN(min) || isNaN(max))
    return reply(api, threadID,
      "❌ صيغة خاطئة\nمثال: الملاك وقت 30 120",
      messageID);

  if (min < MIN_TIME_LIMIT)
    return reply(api, threadID,
      `❌ الحد الأدنى يجب أن يكون ${MIN_TIME_LIMIT} ثواني على الأقل لتجنب السبام`,
      messageID);

  if (min >= max)
    return reply(api, threadID,
      "❌ الحد الأدنى يجب أن يكون أصغر من الحد الأقصى",
      messageID);

  if (max > MAX_TIME_LIMIT)
    return reply(api, threadID,
      "❌ الحد الأقصى هو 86400 ثانية (24 ساعة)",
      messageID);

  if (!db.getTask(threadID))
    return reply(api, threadID,
      "⚠️ لا توجد مهمة في هذا القروب\nاستخدم أولاً: الملاك رسالة <النص>",
      messageID);

  db.updateTask(threadID, { minTime: min, maxTime: max });

  return reply(api, threadID,
    [
      "✅ تم تحديث وقت الإرسال",
      "",
      `⏱️ الحد الأدنى : ${formatSeconds(min)}`,
      `⏱️ الحد الأقصى : ${formatSeconds(max)}`,
      "",
      "⟳ سيُطبَّق التغيير في الإرسال القادم",
    ].join("\n"),
    messageID);
}

// ──────────────────────────────────────────────
//  الملاك حالة
// ──────────────────────────────────────────────
async function handleStatus({ api, event }) {
  const { threadID, messageID } = event;
  const task = db.getTask(threadID);

  if (!task)
    return reply(api, threadID,
      "📭 لا توجد مهمة إرسال في هذا القروب\nابدأ بـ: الملاك رسالة <النص>",
      messageID);

  const now       = Date.now();
  const remaining = task.nextSendTime > now ? task.nextSendTime - now : 0;
  const running   = scheduler.isRunning(threadID);
  const statusIcon = !task.isActive ? "🔴 متوقف" : running ? "🟢 يعمل" : "🟡 مجدوَل";

  return reply(api, threadID,
    [
      "╔══════════════════════════════╗",
      "║    📊 حالة نظام الملاك      ║",
      "╚══════════════════════════════╝",
      "",
      `📌 الحالة      : ${statusIcon}`,
      `📝 الرسالة     : ${task.message}`,
      "",
      `⏱️ الحد الأدنى : ${formatSeconds(task.minTime)}`,
      `⏱️ الحد الأقصى : ${formatSeconds(task.maxTime)}`,
      "",
      task.isActive
        ? `🕐 الإرسال القادم : خلال ${formatCountdown(remaining)}`
        : `🕐 الإرسال القادم : متوقف`,
      `📅 في تمام     : ${task.isActive ? formatDate(task.nextSendTime) : "—"}`,
      `📨 إجمالي المرسَل: ${task.sentCount} رسالة`,
    ].join("\n"),
    messageID);
}

// ──────────────────────────────────────────────
//  الملاك قائمة
// ──────────────────────────────────────────────
async function handleList({ api, event }) {
  const { threadID, messageID } = event;
  const tasks = db.getAll();

  if (!tasks.length)
    return reply(api, threadID,
      "📭 لا توجد مهام إرسال في أي قروب حتى الآن",
      messageID);

  const now   = Date.now();
  const lines = [
    `╔══════════════════════════════╗`,
    `║    📋 قائمة مهام الملاك     ║`,
    `╚══════════════════════════════╝`,
    `المجموع: ${tasks.length} قروب\n`,
  ];

  tasks.forEach((t, i) => {
    const icon      = t.isActive ? "🟢" : "🔴";
    const remaining = t.isActive && t.nextSendTime > now
      ? formatCountdown(t.nextSendTime - now)
      : "—";
    lines.push(
      `${i + 1}. ${icon} ${t.threadID}`,
      `   📨 ${t.sentCount} رسالة | ⏭️ القادم: ${remaining}`,
      `   📝 ${t.message.slice(0, 40)}${t.message.length > 40 ? "..." : ""}`,
      ``
    );
  });

  return reply(api, threadID, lines.join("\n"), messageID);
}

// ──────────────────────────────────────────────
//  الملاك القادم
// ──────────────────────────────────────────────
async function handleNext({ api, event }) {
  const { threadID, messageID } = event;
  const task = db.getTask(threadID);

  if (!task)
    return reply(api, threadID,
      "📭 لا توجد مهمة في هذا القروب",
      messageID);

  if (!task.isActive)
    return reply(api, threadID,
      "🔴 نظام الإرسال متوقف في هذا القروب\nاستخدم: الملاك تشغيل",
      messageID);

  const now       = Date.now();
  const remaining = task.nextSendTime > now ? task.nextSendTime - now : 0;

  return reply(api, threadID,
    [
      "⏳ الإرسال القادم",
      "",
      `🕐 خلال     : ${formatCountdown(remaining)}`,
      `📅 في تمام  : ${formatDate(task.nextSendTime)}`,
      `📨 المرسَل  : ${task.sentCount} رسالة حتى الآن`,
    ].join("\n"),
    messageID);
}

// ──────────────────────────────────────────────
//  الملاك إيقاف
// ──────────────────────────────────────────────
async function handleStop({ api, event }) {
  const { threadID, messageID } = event;
  const task = db.getTask(threadID);

  if (!task)
    return reply(api, threadID,
      "📭 لا توجد مهمة في هذا القروب",
      messageID);

  if (!task.isActive)
    return reply(api, threadID,
      "⚠️ نظام الإرسال متوقف بالفعل",
      messageID);

  scheduler.stopTask(threadID);
  return reply(api, threadID,
    "🔴 تم إيقاف الإرسال التلقائي في هذا القروب\n\nلاستئناف الإرسال: الملاك تشغيل",
    messageID);
}

// ──────────────────────────────────────────────
//  الملاك تشغيل
// ──────────────────────────────────────────────
async function handleStart({ api, event }) {
  const { threadID, messageID } = event;
  const task = db.getTask(threadID);

  if (!task)
    return reply(api, threadID,
      "📭 لا توجد مهمة في هذا القروب\nابدأ بـ: الملاك رسالة <النص>",
      messageID);

  if (task.isActive && scheduler.isRunning(threadID))
    return reply(api, threadID,
      "⚠️ نظام الإرسال يعمل بالفعل",
      messageID);

  await scheduler.startTask(threadID);
  return reply(api, threadID,
    [
      "🟢 تم تشغيل الإرسال التلقائي",
      "",
      `📝 الرسالة     : ${task.message}`,
      `⏱️ الحد الأدنى : ${formatSeconds(task.minTime)}`,
      `⏱️ الحد الأقصى : ${formatSeconds(task.maxTime)}`,
      "",
      `🕐 الإرسال القادم خلال ${formatSeconds(task.minTime)} على الأقل`,
    ].join("\n"),
    messageID);
}

// ──────────────────────────────────────────────
//  الملاك حذف
// ──────────────────────────────────────────────
async function handleDelete({ api, event }) {
  const { threadID, messageID } = event;
  const task = db.getTask(threadID);

  if (!task)
    return reply(api, threadID,
      "📭 لا توجد مهمة للحذف في هذا القروب",
      messageID);

  scheduler.deleteTask(threadID);
  return reply(api, threadID,
    "🗑️ تم حذف مهمة الإرسال ومحو جميع بياناتها بالكامل\n\nلإنشاء مهمة جديدة: الملاك رسالة <النص>",
    messageID);
}

module.exports = {
  handleMessage,
  handleTime,
  handleStatus,
  handleList,
  handleNext,
  handleStop,
  handleStart,
  handleDelete,
};
