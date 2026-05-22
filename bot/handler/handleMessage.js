/**
 * Angel Bot — Message Handler
 * مبني على GoatBot handler مع دعم اللغة العربية
 */

const log = require("../../logger/log.js");

module.exports = async function handleMessage({ api, event, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData }) {
  if (!event || !event.type) return;

  const config = global.GoatBot.config;
  const senderID = String(event.senderID);
  const threadID = String(event.threadID);

  // ── تصفية البوتات ──
  if (!senderID || senderID === "0" || senderID === global.GoatBot.botID) return;

  // ── تصفية المحظورين ──
  const bannedUserData = await usersData?.get(senderID).catch(() => null);
  if (bannedUserData?.data?.banned?.status === true) return;

  // ── الأحداث ──
  if (event.type === "event") {
    try {
      await require("./handlerEvents.js")({ api, event, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData });
    } catch (e) {
      log.error("HANDLER EVENT", e);
    }
    return;
  }

  // ── الرسائل ──
  if (event.type !== "message" && event.type !== "message_reply") return;

  const body = (event.body || "").trim();
  if (!body) return;

  // ── الردود (onReply) ──
  if (event.messageReply && global.GoatBot.onReply.has(event.messageReply.messageID)) {
    try {
      await require("./handleReply.js")({ api, event, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData });
    } catch (e) {
      log.error("HANDLE REPLY", e);
    }
  }

  // ── التفاعلات (onReaction) ──
  if (event.type === "message_reaction") {
    try {
      await require("./handleReaction.js")({ api, event, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData });
    } catch (e) {
      log.error("HANDLE REACTION", e);
    }
    return;
  }

  // ── التحقق من البادئة ──
  const prefix = config.prefix || "!";
  let command, args;

  if (body.startsWith(prefix)) {
    const bodyNoPrefix = body.slice(prefix.length).trim();
    args = bodyNoPrefix.split(/\s+/);
    const commandName = args.shift().toLowerCase();
    command = global.GoatBot.commands.get(commandName) || 
              global.GoatBot.aliases.get(commandName);
  } else {
    // onChat — للأوامر التي تعمل بدون بادئة
    for (const handler of global.GoatBot.onChat) {
      try {
        const cmd = global.GoatBot.commands.get(handler.commandName);
        if (cmd?.onChat) {
          await cmd.onChat({ api, event, args: body.split(/\s+/), threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData });
        }
      } catch (e) {}
    }
    return;
  }

  if (!command) return;

  const cmdConfig = command.config;

  // ── التحقق من الصلاحيات ──
  const isAdmin = (config.adminBot || []).map(String).includes(senderID);
  const isDev = (config.devUsers || []).map(String).includes(senderID);

  if (cmdConfig.role >= 1 && !isAdmin && !isDev) {
    return api.sendMessage("🔒 هذا الأمر للأدمن فقط!", threadID, event.messageID);
  }
  if (cmdConfig.role >= 2 && !isDev) {
    return api.sendMessage("🔒 هذا الأمر للمطورين فقط!", threadID, event.messageID);
  }

  // ── Cooldown ──
  const cdKey = `${senderID}_${cmdConfig.name}`;
  const countDown = global.client.countDown;
  const now = Date.now();
  if (!isAdmin && countDown[cdKey] && now - countDown[cdKey] < (cmdConfig.countDown || 3) * 1000) {
    const remaining = Math.ceil(((cmdConfig.countDown || 3) * 1000 - (now - countDown[cdKey])) / 1000);
    return api.sendMessage(`⏳ انتظر ${remaining} ثانية!`, threadID, event.messageID);
  }
  countDown[cdKey] = now;

  // ── تنفيذ الأمر ──
  try {
    await command.onStart({ api, event, args, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, prefix });
  } catch (e) {
    log.error(`CMD:${cmdConfig.name}`, e);
    try {
      api.sendMessage(`❌ حدث خطأ: ${e.message}`, threadID, event.messageID);
    } catch {}
  }
};
