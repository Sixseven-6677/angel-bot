module.exports.config = {
  name: "طرد",
  version: "1.0.0",
  hasPermssion: 3,
  credits: "FANG",
  description: "طرد شخص عن طريق الرد على رسالته (يتطلب أن يكون البوت ادمن القروب)",
  commandCategory: "إدارة",
  usages: "رد على رسالة شخص + طرد",
  cooldowns: 5
};

module.exports.run = async function({ api, event }) {
  const { threadID, messageID, messageReply, senderID } = event;

  if (!messageReply)
    return api.sendMessage("❌ الرجاء الرد على رسالة الشخص الذي تريد طرده", threadID, messageID);

  const targetID = messageReply.senderID;
  if (!targetID)
    return api.sendMessage("❌ لم أتمكن من تحديد الشخص", threadID, messageID);

  if (String(targetID) === String(api.getCurrentUserID()))
    return api.sendMessage("😅 لا أستطيع طرد نفسي!", threadID, messageID);

  if (global.config.ADMINBOT.includes(String(targetID)))
    return api.sendMessage("🛡 لا يمكن طرد أدمن البوت", threadID, messageID);

  let name = targetID;
  try { const info = await api.getUserInfo(targetID); name = info[targetID]?.name || targetID; } catch(e) {}

  api.removeUserFromGroup(targetID, threadID, err => {
    if (err) return api.sendMessage(`❌ تعذر طرد ${name}\nتأكد أن البوت ادمن في القروب`, threadID, messageID);
    return api.sendMessage(`✅ تم طرد ${name} من القروب 🚫`, threadID, messageID);
  });
};