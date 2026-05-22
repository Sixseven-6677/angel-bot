const fs = require("fs");
const path = require("path");
const configPath = path.join(process.cwd(), "config.json");

module.exports.config = {
  name: "ادمن",
  version: "1.0.0",
  hasPermssion: 3,
  credits: "FANG",
  description: "إدارة ادمن البوت: تحديث وازالة",
  commandCategory: "إدارة",
  usages: "ادمن تحديث [ID] | ادمن ازالة [رقم]",
  cooldowns: 2
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const adminIDs = config.ADMINBOT || [];
  const subCmd = args[0];

  if (subCmd === "تحديث") {
    const newID = String(args[1] || "").trim();
    if (!newID || isNaN(newID))
      return api.sendMessage("❌ الصيغة:\nادمن تحديث [ID]\n\nمثال: ادمن تحديث 100123456789", threadID, messageID);
    if (adminIDs.includes(newID))
      return api.sendMessage("⚠️ هذا الـ ID موجود بالفعل في قائمة الادمن", threadID, messageID);
    config.ADMINBOT.push(newID);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    global.config.ADMINBOT = config.ADMINBOT;
    let name = newID;
    try { const info = await api.getUserInfo(newID); name = info[newID]?.name || newID; } catch(e) {}
    return api.sendMessage(`✅ تم إضافة الادمن الجديد\n\n👤 الاسم: ${name}\n🔑 ID: ${newID}\n📊 الإجمالي: ${config.ADMINBOT.length} ادمن`, threadID, messageID);
  }

  if (subCmd === "ازالة") {
    const input = String(args[1] || "").trim();
    if (!input || isNaN(input))
      return api.sendMessage("❌ الصيغة:\nادمن ازالة [رقم من القائمة]\n\nاكتب ادمنز لعرض القائمة", threadID, messageID);
    const index = parseInt(input) - 1;
    if (index < 0 || index >= adminIDs.length)
      return api.sendMessage(`❌ الرقم غير صحيح\nالقائمة تحتوي على ${adminIDs.length} ادمن`, threadID, messageID);
    const removeID = adminIDs[index];
    if (removeID === String(senderID))
      return api.sendMessage("❌ لا تقدر تزيل نفسك من الادمن", threadID, messageID);
    config.ADMINBOT = config.ADMINBOT.filter(id => id !== removeID);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    global.config.ADMINBOT = config.ADMINBOT;
    let name = removeID;
    try { const info = await api.getUserInfo(removeID); name = info[removeID]?.name || removeID; } catch(e) {}
    return api.sendMessage(`✅ تم إزالة الادمن\n\n👤 الاسم: ${name}\n🔑 ID: ${removeID}\n📊 الإجمالي: ${config.ADMINBOT.length} ادمن`, threadID, messageID);
  }

  return api.sendMessage("📋 أوامر إدارة الادمن:\n\n• ادمن تحديث [ID] — إضافة ادمن جديد\n• ادمن ازالة [رقم] — إزالة ادمن\n• ادمنز — عرض القائمة الكاملة", threadID, messageID);
};