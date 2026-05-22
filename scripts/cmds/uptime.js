const os = require('os');

module.exports = {
  config: {
    name: "uptime",
    aliases: ["runtime", "status", "upt"],
    version: "2.0.0",
    author: "Angel",
    countDown: 5,
    role: 0,
    shortDescription: "معلومات تشغيل البوت",
    longDescription: "يعرض وقت التشغيل ومعلومات السيرفر",
    category: "system",
    guide: "{prefix}uptime"
  },

  onStart: async function({ api, event, message }) {
    const { threadID, messageID } = event;

    const processUptimeSeconds = process.uptime();
    const d = Math.floor(processUptimeSeconds / (3600 * 24));
    const h = Math.floor(processUptimeSeconds % (3600 * 24) / 3600);
    const m = Math.floor(processUptimeSeconds % 3600 / 60);
    const s = Math.floor(processUptimeSeconds % 60);
    const upStr = (d > 0 ? d + 'd ' : '') + [h, m, s].map(t => t.toString().padStart(2, '0')).join(':');

    const pingStart = Date.now();
    const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const usedMemGB  = ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2);
    const nodeMemMB  = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const cpu        = (os.cpus()[0]?.model || 'Unknown').trim().slice(0, 35);
    const ping       = Date.now() - pingStart;
    const cmds       = global.GoatBot?.commands?.size || 0;

    const text =
      '╔══ Angel Bot — DASHBOARD ══╗\n' +
      `│ ⏱ Uptime: ${upStr}\n` +
      `│ ⚡ Ping: ${ping}ms\n` +
      `│ 💬 أوامر: ${cmds}\n` +
      `│ 💾 RAM (Bot): ${nodeMemMB}MB\n` +
      `│ 🖥 RAM: ${usedMemGB}GB / ${totalMemGB}GB\n` +
      `│ 🔧 CPU: ${cpu}\n` +
      '╚═══════════════════════════╝';

    return api.sendMessage(text, threadID, messageID);
  }
};
