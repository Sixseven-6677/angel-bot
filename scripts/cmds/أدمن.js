const fs = require("fs");
const path = require("path");
const configPath = path.join(process.cwd(), "config.json");

module.exports.config = {
  name: "أدمن",
  version: "1.0.0",
  hasPermssion: 3,
  credits: "FANG",
  description: "إدارة ادمن البوت: تحديث وازالة",
  commandCategory: "إدارة",
  usages: "ادمن تحديث [ID] | ادمن ازالة [رقم]",
  cooldowns: 2
};

module.exports.onStart = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const adminIDs = (global.GoatBot?.config?.adminBot || []).map(String);
  const subCmd = args[0];

  if (subCmd === "تحديث") {
    const newID = String(args[1] || "").trim();
    if (!newID || isNaN(newID))
      return api.sendMessage("❌ الصيغة:\nادمن تحديث [ID]", threadID, messageID);
    if (adminIDs.includes(newID))
      return api.sendMessage("⚠️ هذا الـ ID موجود بالفعل في قائمة الادمن", threadID, messageID);
    if (global.GoatBot?.config) global.GoatBot.config.adminBot = [...adminIDs, newID];
    let name = newID;
    try { const info = await api.getUserInfo(newID); name = info[newID]?.name || newID; } catch(e) {}
    return api.sendMessage(`✅ تم إضافة الادمن الجديد\n👤 ${name} | 🔑 ${newID}`, threadID, messageID);
  }

  if (subCmd === "ازالة") {
    const index = parseInt(args[1]) - 1;
    if (isNaN(index) || index < 0 || index >= adminIDs.length)
      return api.sendMessage(`❌ رقم غير صحيح. القائمة تحتوي على ${adminIDs.length} ادمن`, threadID, messageID);
    const removeID = adminIDs[index];
    if (removeID === String(senderID))
      return api.sendMessage("❌ لا تقدر تزيل نفسك من الادمن", threadID, messageID);
    if (global.GoatBot?.config) global.GoatBot.config.adminBot = adminIDs.filter(id => id !== removeID);
    let name = removeID;
    try { const info = await api.getUserInfo(removeID); name = info[removeID]?.name || removeID; } catch(e) {}
    return api.sendMessage(`✅ تم إزالة الادمن: ${name} | 🔑 ${removeID}`, threadID, messageID);
  }

  return api.sendMessage("📋 أوامر إدارة الادمن:\n• ادمن تحديث [ID]\n• ادمن ازالة [رقم]\n• ادمنز — عرض القائمة", threadID, messageID);
};