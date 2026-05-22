const fs   = require("fs");
const path = require("path");
const dataPath = path.join(process.cwd(), "modules/commands/data/ighlaq.json");

function loadData() {
  try { return JSON.parse(fs.readFileSync(dataPath, "utf8")); } catch(e) { return {}; }
}
function saveData(obj) {
  try {
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(obj, null, 2));
  } catch(e) {}
}

module.exports.config = {
  name: "اغلاق",
  version: "1.0.0",
  hasPermssion: 3,
  credits: "FANG",
  description: "إغلاق البوت — يرد على الادمن فقط ويتجاهل الباقين",
  commandCategory: "إدارة",
  usages: "اغلاق",
  cooldowns: 3
};

module.exports.onLoad = function() {
  if (!global.ighlaqData) global.ighlaqData = new Map();
  const data = loadData();
  for (const [tid, val] of Object.entries(data)) global.ighlaqData.set(String(tid), val);
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  if (!global.ighlaqData) global.ighlaqData = new Map();

  const sub = args[0];
  if (sub === "تعطيل" || sub === "توقف") {
    global.ighlaqData.delete(threadID);
    const data = loadData();
    delete data[threadID];
    saveData(data);
    return api.sendMessage("✅ تم فتح البوت\nالجميع يقدر يستخدم البوت الآن", threadID, messageID);
  }

  global.ighlaqData.set(threadID, "full");
  const data = loadData();
  data[threadID] = "full";
  saveData(data);
  return api.sendMessage("🔒 تم إغلاق البوت\nالبوت الآن يرد على الادمن فقط\n\nللفتح اكتب: فتح", threadID, messageID);
};