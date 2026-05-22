module.exports.config = {
  name: "مغادرة",
  version: "1.0.0",
  hasPermssion: 3,
  credits: "FANG",
  description: "مغادرة القروب الحالي",
  commandCategory: "إدارة",
  usages: "مغادرة",
  cooldowns: 5
};

module.exports.run = async function({ api, event }) {
  const { threadID, messageID } = event;
  await api.sendMessage("👋 وداعاً! سأغادر القروب الآن...", threadID);
  return api.removeUserFromGroup(api.getCurrentUserID(), threadID, err => {
    if (err) api.sendMessage("❌ تعذرت المغادرة\nتأكد أن البوت ليس المدير الوحيد في القروب", threadID, messageID);
  });
};