const fs   = require("fs");
const path = require("path");
const dataPath = path.join(process.cwd(), "modules/commands/data/protectedNicks.json");

function loadNicks() {
  try { return JSON.parse(fs.readFileSync(dataPath, "utf8")); } catch(e) { return {}; }
}
function saveNicks(obj) {
  try {
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(obj, null, 2));
  } catch(e) {}
}
function getProtected(threadID) {
  return loadNicks()[threadID] || null;
}
function setProtected(threadID, nick) {
  const data = loadNicks();
  data[threadID] = nick;
  saveNicks(data);
}
function clearProtected(threadID) {
  const data = loadNicks();
  delete data[threadID];
  saveNicks(data);
}

module.exports.config = {
  name: "كنية",
  version: "2.0.0",
  hasPermssion: 3,
  credits: "FANG",
  description: "يغيّر كنيات القروب كلها ويحميها من التغيير",
  commandCategory: "إدارة",
  usages: "كنية [الكنية] | كنية كسر",
  cooldowns: 10
};

module.exports.onLoad = function() {};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;

  // ── إيقاف الحماية ─────────────────────────────────────────────────────────
  if ((args[0] || "").trim() === "كسر") {
    const current = getProtected(threadID);
    if (!current)
      return api.sendMessage("⚠️ لا توجد كنية محمية في هذا القروب", threadID, messageID);
    clearProtected(threadID);
    return api.sendMessage("✅ تم إلغاء حماية الكنية", threadID, messageID);
  }

  // ── تطبيق كنية جديدة ──────────────────────────────────────────────────────
  const nick = args.join(" ").trim();
  if (!nick)
    return api.sendMessage("❌ اكتب الكنية بعد الأمر\nمثال: كنية ⚔️ فارس\n\nلإلغاء الحماية: كنية كسر", threadID, messageID);

  let threadInfo;
  try { threadInfo = await api.getThreadInfo(threadID); }
  catch(e) { return api.sendMessage("❌ تعذر جلب معلومات القروب", threadID, messageID); }

  let botID;
  try { botID = String(api.getCurrentUserID()); } catch(e) { botID = ""; }

  const participants = (threadInfo.participantIDs || []).filter(id => String(id) !== botID);
  await api.sendMessage(`🔄 جاري تطبيق الكنية على ${participants.length} شخص...`, threadID);

  let done = 0;
  for (const uid of participants) {
    try {
      await new Promise((res, rej) => api.changeNickname(nick, threadID, String(uid), e => e ? rej(e) : res()));
      done++;
    } catch(e) {}
    await new Promise(r => setTimeout(r, 600));
  }

  setProtected(threadID, nick);

  return api.sendMessage(
    `✅ تم تطبيق الكنية على ${done} شخص\n📝 الكنية: "${nick}"\n🛡 الحماية مفعّلة`,
    threadID, messageID
  );
};

// ── حماية الكنيات: يُعيد الكنية تلقائياً لو غيّرها أحد ──────────────────────
module.exports.handleEvent = async function({ api, event }) {
  try {
    if (event.type !== "event") return;
    if (event.logMessageType !== "log:user-nickname") return;

    const { threadID } = event;
    const protectedNick = getProtected(threadID);
    if (!protectedNick) return;

    // تجاهل التغييرات التي يجريها البوت نفسه
    let botID;
    try { botID = String(api.getCurrentUserID()); } catch(e) { return; }
    if (String(event.author) === botID) return;

    // معرف الشخص الذي تغيّرت كنيته
    const participantID = event.logMessageData?.participant_id || event.logMessageData?.participantID;
    if (!participantID) return;

    // أعد الكنية المحمية
    await new Promise((res, rej) =>
      api.changeNickname(protectedNick, threadID, String(participantID), e => e ? rej(e) : res())
    ).catch(() => {});
  } catch(e) {}
};
