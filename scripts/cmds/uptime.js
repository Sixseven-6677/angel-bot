module.exports.config = {
  name: "uptime",
  version: "11.0.0",
  hasPermssion: 0,
  credits: "FANG",
  description: "داشبورد معلومات البوت",
  commandCategory: "معلومات",
  usages: "uptime",
  cooldowns: 10
};

module.exports.run = async function({ api, event, Threads }) {
  const { threadID, messageID } = event;
  const os  = require('os');
  const moment = require('moment-timezone');
  const path   = require('path');
  const fs     = require('fs');
  const fsp    = require('fs').promises;

  // ── uptime الحقيقي — من وقت بدء main.js لا من وقت استدعاء الأمر ──────
  const { getUptimeMs, formatUptime } = require('../../utils/uptimeManager');
  const uptimeStr = formatUptime(getUptimeMs());
  // ──────────────────────────────────────────────────────────────────────

  const pingStart = Date.now();

  // ── CPU ──
  const cpus     = os.cpus();
  const cpu      = (cpus[0]?.model || 'Unknown').replace(/\(.*?\)/g, '').trim().slice(0, 30);
  const platform = os.platform();
  const arch     = os.arch();
  const cores    = cpus.length;
  const speed    = cpus[0]?.speed || 0;

  // ── الذاكرة ──
  const mem       = process.memoryUsage();
  const heapUsed  = (mem.heapUsed  / 1024 / 1024).toFixed(1);
  const heapTotal = (mem.heapTotal / 1024 / 1024).toFixed(1);
  const heapPct   = mem.heapUsed / mem.heapTotal;
  const freeMemGB  = (os.freemem()  / 1024 / 1024 / 1024).toFixed(2);
  const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
  const usedMemGB  = ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2);
  const ramPct     = (os.totalmem() - os.freemem()) / (os.totalmem() || 1);

  // ── القرص ──
  let diskFree = 'N/A', diskFreePct = 0;
  try {
    const { execSync } = require('child_process');
    const df = execSync('df -k / 2>/dev/null', { encoding: 'utf8', timeout: 3000 });
    const parts = df.trim().split('\n').pop().split(/\s+/);
    if (parts.length >= 4) {
      const total = parseInt(parts[1]) || 1;
      const avail = parseInt(parts[3]) || 0;
      diskFreePct = avail / total;
      diskFree    = (avail / 1024 / 1024).toFixed(1) + ' GB';
    }
  } catch(e) {}

  // ── IP السيرفر ──
  let serverIP = 'N/A';
  try {
    const nwif  = os.networkInterfaces();
    const iface = nwif['eth0'] || Object.values(nwif).find(i => i);
    serverIP    = (iface || []).find(a => a.family === 'IPv4' && !a.internal)?.address || 'N/A';
  } catch(e) {}

  // ── عدد الحزم ──
  let depCount = 0, devDepCount = 0;
  try {
    const pkg   = JSON.parse(await fsp.readFile('package.json', 'utf8'));
    depCount    = Object.keys(pkg.dependencies    || {}).length;
    devDepCount = Object.keys(pkg.devDependencies || {}).length;
  } catch(e) {}

  // ── البيانات العامة ──
  const cmds    = global.client?.commands?.size    || 0;
  const groups  = global.data?.allThreadID?.length || 0;
  const users   = global.data?.allUserID?.length   || 0;
  const botName = global.config?.BOTNAME || 'FANG';
  let prefix = global.config?.PREFIX || '!';
  try {
    const td = (await Threads.getData(String(threadID))).data;
    if (td?.PREFIX != null) prefix = td.PREFIX;
  } catch(e) {}

  const ping       = Date.now() - pingStart;
  const pingStatus = ping < 100 ? 'ممتاز' : ping < 300 ? 'جيد' : 'بطيء';

  // ── الأوقات العربية ──
  const zones = [
    { flag: 'SA', city: 'الرياض',  tz: 'Asia/Riyadh'      },
    { flag: 'EG', city: 'القاهرة', tz: 'Africa/Cairo'      },
    { flag: 'AE', city: 'دبي',     tz: 'Asia/Dubai'        },
    { flag: 'DZ', city: 'الجزائر', tz: 'Africa/Algiers'    },
    { flag: 'MA', city: 'الرباط',  tz: 'Africa/Casablanca' },
  ];
  const times = zones.map(z => ({
    flag: z.flag, city: z.city,
    time: moment().tz(z.tz).format('hh:mm A')
  }));

  let imgPath;
  try {
    const { makeCard } = require('../../utils/makeCard');
    const buf = await makeCard({
      botName,
      version:  global.config?.version || '1.0.0',
      uptime:   uptimeStr,
      ping:     ping + 'ms',
      pingStatus,
      cmds, groups, users, prefix,
      heapUsed, heapTotal, heapPct,
      freeMemGB, totalMemGB, usedMemGB, ramPct,
      cpu, platform, arch, cores, speed,
      diskFree, diskFreePct,
      depCount, devDepCount,
      serverIP,
      times
    });

    imgPath = path.join(os.tmpdir(), 'uptime_' + Date.now() + '.png');
    fs.writeFileSync(imgPath, buf);

    await new Promise((resolve, reject) => {
      api.sendMessage(
        { attachment: fs.createReadStream(imgPath) },
        threadID,
        (err) => {
          if (imgPath) try { fs.unlinkSync(imgPath); } catch(e) {}
          if (err) reject(err); else resolve();
        },
        messageID
      );
    });
  } catch (err) {
    if (imgPath) try { fs.unlinkSync(imgPath); } catch(e) {}
    const arabicTimes = times.map(t => t.flag + ' ' + t.city + ': ' + t.time).join('\n');
    const text = [
      '╔══ ' + botName + ' DASHBOARD ══╗',
      '⏱ Uptime: ' + uptimeStr,
      '⚡ Ping: ' + ping + 'ms (' + pingStatus + ')',
      '💬 أوامر: ' + cmds + '  📦 مجموعات: ' + groups + '  👥 مستخدمين: ' + users,
      '💾 Heap: ' + heapUsed + '/' + heapTotal + ' MB',
      '🖥 RAM: ' + usedMemGB + '/' + totalMemGB + ' GB  (متاح ' + freeMemGB + ' GB)',
      '💿 Disk: ' + diskFree,
      '🌐 IP: ' + serverIP,
      '📦 Packages: ' + depCount + '  Dev: ' + devDepCount,
      '',
      '🕐 أوقات عربية:\n' + arabicTimes,
      '╚' + '═'.repeat(22) + '╝',
    ].join('\n');
    return api.sendMessage(text, threadID, messageID);
  }
};
