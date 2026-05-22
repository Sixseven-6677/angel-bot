module.exports.config = {
  name: "ادمنز",
  version: "2.0.0",
  hasPermssion: 3,
  credits: "FANG",
  description: "عرض قائمة ادمن البوت",
  commandCategory: "إدارة",
  usages: "ادمنز",
  cooldowns: 5
};

const boldNum = n => String(n).split('').map(d => '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵'[+d] ?? d).join('');

module.exports.run = async function({ api, event }) {
  const { threadID, messageID } = event;
  const adminIDs = global.config?.ADMINBOT || [];

  if (adminIDs.length === 0)
    return api.sendMessage('⚠️ لا يوجد ادمن مسجل حالياً', threadID, messageID);

  // جلب أسماء الادمن
  const admins = [];
  for (const id of adminIDs) {
    let name = id;
    try {
      const info = await api.getUserInfo(id);
      name = info[id]?.name || id;
    } catch(e) {}
    admins.push({ id, name });
  }

  let text = '⃟─𝗙𝗮𝗻𝗴 𝗔𝗱𝗺𝗶𝗻 𝗹𝗶𝘀𝘁 〣──\n\n';

  admins.forEach((a, i) => {
    text += `𝗔𝗱𝗺𝗶𝗻:${boldNum(i + 1)}\n`;
    text += `${a.name}\n`;
    text += `🔑 ${a.id}\n\n`;
  });

  text += `𝗧𝗼𝘁𝗮𝗹 𝗔𝗱𝗺𝗶𝗻𝘀: ${boldNum(admins.length)}`;

  return api.sendMessage(text, threadID, messageID);
};
