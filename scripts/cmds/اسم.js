const fs   = require("fs");
const path = require("path");
const dataPath = path.join(process.cwd(), "modules/commands/data/protectedNames.json");

function loadNames() {
  try { return JSON.parse(fs.readFileSync(dataPath, "utf8")); } catch(e) { return {}; }
}
function saveNames(obj) {
  try {
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(obj, null, 2));
  } catch(e) {}
}

module.exports.config = {
  name: "اسم",
  version: "1.0.0",
  hasPermssion: 3,
  credits: "FANG",
  description: "تغيير اسم القروب مع حمايته من التغيير",
  commandCategory: "إدارة",
  usages: "اسم [الاسم الجديد]",
  cooldowns: 5
};

module.exports.onLoad = function() {
  if (!global.protectedNames) global.protectedNames = {};
  const data = loadNames();
  Object.assign(global.protectedNames, data);
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const newName = args.join(" ").trim();

  if (!newName)
    return api.sendMessage("❌ اكتب الاسم الجديد بعد الأمر\nمثال: اسم نادي الفرسان", threadID, messageID);

  api.setTitle(newName, threadID, err => {
    if (err) return api.sendMessage("❌ تعذر تغيير الاسم\nتأكد أن البوت يملك صلاحية التعديل", threadID, messageID);
    if (!global.protectedNames) global.protectedNames = {};
    global.protectedNames[threadID] = newName;
    const data = loadNames();
    data[threadID] = newName;
    saveNames(data);
    api.sendMessage(`✅ تم تغيير اسم القروب إلى:\n📝 "${newName}"\n\n🛡 الحماية مفعّلة — لن يتمكن أحد من تغييره`, threadID, messageID);
  });
};