const fs   = require("fs");
const path = require("path");
const dataPath = path.join(process.cwd(), "data", "protectedNicks.json");

function loadNicks() {
  try { return JSON.parse(fs.readFileSync(dataPath, "utf8")); } catch(e) { return {}; }
}
function saveNicks(obj) {
  try {
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(obj, null, 2));
  } catch(e) {}
}
function setProtected(threadID, nick) {
  if (!global.protectedNicks) global.protectedNicks = {};
  if (nick) { global.protectedNicks[threadID] = nick; const d = loadNicks(); d[threadID] = nick; saveNicks(d); }
  else { delete global.protectedNicks[threadID]; const d = loadNicks(); delete d[threadID]; saveNicks(d); }
}
function getProtected(threadID) {
  return global.protectedNicks?.[threadID] || null;
}

module.exports.config = {
  name: "كنية",
  version: "2.0.0",
  hasPermssion: 3,
  credits: "FANG",
  description: "تعيين كنية لكل أعضاء القروب مع الحماية",
  commandCategory: "إدارة",
  usages: "كنية [النص]",
  cooldowns: 10
};

module.exports.onLoad = function() {
  if (!global.protectedNicks) global.protectedNicks = {};
  Object.assign(global.protectedNicks, loadNicks());
};

module.exports.onStart = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const nick = args.join(" ").trim();
  if (!nick)
    return api.sendMessage("❌ اكتب الكنية بعد الأمر\nمثال: كنية ملك القلوب", threadID, messageID);

  const info = await api.getThreadInfo(threadID).catch(() => null);
  const members = info?.participantIDs || [];
  if (!members.length)
    return api.sendMessage("❌ تعذر جلب أعضاء القروب", threadID, messageID);

  let done = 0;
  for (const uid of members) {
    try { await api.changeNickname(nick, threadID, String(uid)); done++; } catch(e) {}
    await new Promise(r => setTimeout(r, 600));
  }
  setProtected(threadID, nick);
  return api.sendMessage(`✅ تم تطبيق الكنية على ${done} شخص\n📝 الكنية: "${nick}"\n🛡 الحماية مفعّلة`, threadID, messageID);
};