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

module.exports.onStart = async function({ api, event }) {
  const { threadID, messageID } = event;
  await api.sendMessage("👋 وداعاً! سأغادر القروب الآن...", threadID);
  api.removeUserFromGroup(api.getCurrentUserID(), threadID, err => {
    if (err) api.sendMessage("❌ تعذرت المغادرة", threadID, messageID);
  });
};