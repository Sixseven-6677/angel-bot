/**
 * Angel Bot — Message Handler (Fixed)
 */
const log = require("../../logger/log.js");

module.exports = async function handleMessage({ api, event, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData }) {
  if (!event || !event.type) return;

  const config = global.GoatBot.config;
  const senderID = String(event.senderID || event.author || "");
  const threadID = String(event.threadID || "");

  if (!senderID || senderID === "0" || senderID === String(global.GoatBot.botID)) return;

  // ── حظر المستخدمين ──
  try {
    const bannedUserData = global.db.allUserData.find(u => u.userID == senderID);
    if (bannedUserData?.data?.banned?.status === true) return;
  } catch (e) {}

  // ── الأحداث ──
  if (event.type === "event") {
    try {
      await require("./handlerEvents.js")({ api, event, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData });
    } catch (e) { log.error("HANDLER EVENT", e); }
    return;
  }

  // ── تفاعلات (message_reaction) ──
  if (event.type === "message_reaction") {
    try {
      await require("./handleReaction.js")({ api, event, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData });
    } catch (e) { log.error("HANDLE REACTION", e); }
    return;
  }

  if (event.type !== "message" && event.type !== "message_reply") return;

  const body = (event.body || "").trim();

  // ── onReply ──
  if (event.messageReply && global.GoatBot.onReply?.has(event.messageReply.messageID)) {
    try {
      await require("./handleReply.js")({ api, event, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData });
    } catch (e) { log.error("HANDLE REPLY", e); }
  }

  if (!body) return;

  const prefix = config.prefix || "!";

  // ── onChat — أوامر بدون بادئة ──
  if (!body.startsWith(prefix)) {
    for (const handlerName of (global.GoatBot.onChat || [])) {
      try {
        const cmd = global.GoatBot.commands.get(handlerName);
        if (cmd?.onChat) {
          await cmd.onChat({ api, event, args: body.split(/\s+/), threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData });
        }
      } catch (e) {}
    }
    return;
  }

  // ── تحليل الأمر ──
  const args = body.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  let command = global.GoatBot.commands.get(commandName)
    || global.GoatBot.commands.get(global.GoatBot.aliases.get(commandName));

  // aliases مخصصة للغروب
  try {
    const threadData = global.db.allThreadData.find(t => t.threadID == threadID);
    const aliasesData = threadData?.data?.aliases || {};
    for (const cmdName in aliasesData) {
      if (aliasesData[cmdName].includes(commandName)) {
        command = global.GoatBot.commands.get(cmdName);
        break;
      }
    }
  } catch (e) {}

  if (!command) {
    if (!config.hideNotiMessage?.commandNotFound) {
      if (!commandName) {
        return api.sendMessage(`اكتب ${prefix}help لعرض الأوامر`, threadID, event.messageID);
      }
    }
    return;
  }

  const cmdConfig = command.config;

  // ── صلاحيات ──
  const adminBot = (config.adminBot || []).map(String);
  const devUsers = (config.devUsers || []).map(String);
  const isAdmin = adminBot.includes(senderID);
  const isDev = devUsers.includes(senderID);

  const role = cmdConfig.role ?? cmdConfig.hasPermssion ?? 0;
  if (role >= 1 && !isAdmin && !isDev) {
    return api.sendMessage("🔒 هذا الأمر للأدمن فقط!", threadID, event.messageID);
  }
  if (role >= 2 && !isDev) {
    return api.sendMessage("🔒 هذا الأمر للمطورين فقط!", threadID, event.messageID);
  }

  // ── cooldown ──
  const cdKey = `${senderID}_${cmdConfig.name}`;
  const countDown = global.client.countDown;
  const now = Date.now();
  const cd = cmdConfig.countDown ?? cmdConfig.cooldowns ?? 3;
  if (!isAdmin && countDown[cdKey] && now - countDown[cdKey] < cd * 1000) {
    const remaining = Math.ceil((cd * 1000 - (now - countDown[cdKey])) / 1000);
    return api.sendMessage(`⏳ انتظر ${remaining} ثانية!`, threadID, event.messageID);
  }
  countDown[cdKey] = now;

  // ── إنشاء message helper ──
  const message = {
    reply: (form) => api.sendMessage(form, threadID, event.messageID),
    send:  (form) => api.sendMessage(form, threadID),
    unsend: (msgID) => api.unsendMessage(msgID),
    reaction: (emoji, msgID) => api.setMessageReaction(emoji, msgID, () => {}, true)
  };

  // ── تنفيذ (onStart أو run) ──
  const runner = command.onStart || command.run;
  if (typeof runner !== "function") return;

  try {
    await runner({ api, event, args, message, prefix,
      threadModel, userModel, dashBoardModel, globalModel,
      threadsData, usersData, dashBoardData, globalData });
  } catch (e) {
    log.error(`CMD:${cmdConfig.name}`, e);
    try { api.sendMessage(`❌ خطأ: ${e.message}`, threadID, event.messageID); } catch {}
  }
};
