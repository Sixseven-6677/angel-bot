module.exports = {
  config: {
    name: "معلومات",
    aliases: ["info", "about"],
    version: "1.0",
    author: "Angel",
    countDown: 5,
    role: 0,
    shortDescription: "معلومات عن البوت",
    longDescription: "عرض معلومات البوت Angel",
    category: "عام",
    guide: "{prefix}معلومات"
  },
  onStart: async function ({ api, event }) {
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);
    const msg = `╭────[ ✦ Angel Bot ]────╮
│
│  🤖 الاسم: Angel Bot
│  📦 الإصدار: 1.0.0
│  ⚡ المكتبات: MOMO + GoatBot + Fang
│
│  🕐 وقت التشغيل:
│      ${h}س ${m}د ${s}ث
│
│  💾 قاعدة البيانات: SQLite
│  🌐 FCA: fca-neokex
│  🌍 اللغة: العربية
│
╰───────────────────╯`;
    api.sendMessage(msg, event.threadID, event.messageID);
  }
};
