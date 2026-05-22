module.exports.config = {
  name: "قروبات",
  version: "2.0.0",
  hasPermssion: 3,
  credits: "FANG",
  description: "عرض قائمة جميع القروبات التي فيها البوت",
  commandCategory: "إدارة",
  usages: "قروبات",
  cooldowns: 10
};

module.exports.onStart = async function({ api, event }) {
  const { threadID, messageID } = event;
  const allThreads = global.db?.allThreadData || [];
  const groups = allThreads.filter(t => t.threadID?.toString().length > 15);

  if (!groups.length)
    return api.sendMessage("⚠️ لا توجد قروبات مسجلة", threadID, messageID);

  let text = `⃟─𝗔𝗻𝗴𝗲𝗹 𝗕𝗼𝘁 𝗚𝗿𝗼𝘂𝗽𝘀 〣\n\n`;
  groups.slice(0, 30).forEach((t, i) => {
    text += `${i+1}. ${t.threadName || 'بدون اسم'}\n   🔑 ${t.threadID}\n\n`;
  });
  if (groups.length > 30) text += `... و${groups.length - 30} قروب آخر\n`;
  text += `\n📊 الإجمالي: ${groups.length} قروب`;

  return api.sendMessage(text, threadID, messageID);
};