module.exports.config = {
  name: "اضافة",
  version: "1.0.0",
  hasPermssion: 3,
  credits: "FANG",
  description: "إضافة شخص للقروب عبر الـ ID",
  commandCategory: "إدارة",
  usages: "اضافة [ID]",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const userID = String(args[0] || "").trim();
  if (!userID || isNaN(userID))
    return api.sendMessage("❌ الصيغة الصحيحة:\nadd [ID]\n\nمثال: اضافة 100123456789", threadID, messageID);

  api.addUserToGroup(userID, threadID, async err => {
    if (err) return api.sendMessage(`❌ تعذرت الإضافة\nتأكد من صحة الـ ID وأن البوت يملك صلاحية الإضافة\n\nID: ${userID}`, threadID, messageID);
    let name = userID;
    try { const info = await api.getUserInfo(userID); name = info[userID]?.name || userID; } catch(e) {}
    return api.sendMessage(`✅ تم إضافة ${name} للقروب بنجاح 🎉`, threadID, messageID);
  });
};