const fs   = require("fs");
const path = require("path");
const dataPath = path.join(process.cwd(), "modules/commands/data/ighlaq.json");

module.exports.config = {
  name: "فتح",
  version: "1.0.0",
  hasPermssion: 3,
  credits: "FANG",
  description: "فتح البوت بعد الإغلاق",
  commandCategory: "إدارة",
  usages: "فتح",
  cooldowns: 3
};

module.exports.run = async function({ api, event }) {
  const { threadID, messageID } = event;
  if (!global.ighlaqData) global.ighlaqData = new Map();

  if (!global.ighlaqData.has(threadID)) {
    return api.sendMessage("⚠️ البوت مفتوح بالفعل في هذا القروب", threadID, messageID);
  }

  global.ighlaqData.delete(threadID);
  try {
    let data = {};
    if (fs.existsSync(dataPath)) data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    delete data[threadID];
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  } catch(e) {}

  return api.sendMessage("✅ تم فتح البوت\nالجميع يقدر يستخدم البوت الآن 🔓", threadID, messageID);
};