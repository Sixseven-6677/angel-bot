module.exports = {
  config: {
    name: "ping",
    aliases: ["p"],
    version: "1.0",
    author: "Angel",
    countDown: 3,
    role: 0,
    shortDescription: "قياس استجابة البوت",
    longDescription: "يقيس سرعة استجابة البوت",
    category: "عام",
    guide: "{prefix}ping"
  },
  onStart: async function ({ api, event }) {
    const start = Date.now();
    const msg = await api.sendMessage("🏓 جارٍ القياس...", event.threadID);
    const ping = Date.now() - start;
    api.unsendMessage(msg.messageID);
    api.sendMessage(`🏓 بونغ!\n⚡ الاستجابة: ${ping}ms`, event.threadID, event.messageID);
  }
};
