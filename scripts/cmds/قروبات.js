module.exports.config = {
  name: "قروبات",
  version: "7.0.0",
  hasPermssion: 3,
  credits: "FANG",
  description: "عرض القروبات الحالية للبوت",
  commandCategory: "إدارة",
  usages: "قروبات",
  cooldowns: 15
};

// أرقام عريضة
const boldNum = n => String(n).split('').map(d => '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵'[+d] || d).join('');

module.exports.run = async function({ api, event }) {
  const { threadID, messageID } = event;

  const wait = await new Promise(r => api.sendMessage('⏳ جاري جلب القروبات...', threadID, (e,i) => r(i)));

  try {
    const threads = await new Promise((res, rej) =>
      api.getThreadList(100, null, ['INBOX'], (err, list) => err ? rej(err) : res(list))
    );

    const groups = threads.filter(t => t.isGroup && t.threadID && t.name);

    if (wait) api.unsendMessage(wait.messageID);

    if (groups.length === 0)
      return api.sendMessage('⚠️ لا توجد قروبات حالياً', threadID, messageID);

    let text = '⃟─𝗙𝗮𝗻𝗴 𝗚𝗿𝗼𝘂𝗽𝘀 〣──\n\n';

    groups.forEach((g, i) => {
      const num  = boldNum(i + 1);
      const name = (g.name || 'بدون اسم').trim();
      const id   = g.threadID;
      const members = g.participants ? g.participants.length : '—';
      text += `𝗚𝗿𝗼𝘂𝗽 ${num}: ${name}\n`;
      text += `🔑 ${id}\n`;
      text += `👥 ${members} عضو\n\n`;
    });

    text += `𝗧𝗼𝘁𝗮𝗹 𝗴𝗿𝗼𝘂𝗽𝘀 : ${boldNum(groups.length)}`;

    return api.sendMessage(text, threadID, messageID);

  } catch (err) {
    if (wait) api.unsendMessage(wait.messageID);
    return api.sendMessage('❌ فشل جلب القروبات\n' + err.message, threadID, messageID);
  }
};
