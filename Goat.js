/**
 * Angel Bot — مبني على GoatBot V2 + MOMO + Fang
 * الإصدار: 1.0.0
 */

process.on('unhandledRejection', error => console.log(error));
process.on('uncaughtException', error => console.log(error));

const axios = require("axios");
const fs = require("fs-extra");
const { execSync } = require('child_process');
const log = require('./logger/log.js');
const path = require("path");

process.env.BLUEBIRD_W_FORGOTTEN_RETURN = 0;

function validJSON(pathDir) {
  try {
    if (!fs.existsSync(pathDir)) throw new Error(`الملف غير موجود: "${pathDir}"`);
    JSON.parse(fs.readFileSync(pathDir, 'utf8'));
    return true;
  } catch (err) {
    throw new Error(err.message);
  }
}

const dirConfig = path.normalize(`${__dirname}/config.json`);
const dirConfigCommands = path.normalize(`${__dirname}/configCommands.json`);
const dirAccount = path.normalize(`${__dirname}/account.txt`);

for (const pathDir of [dirConfig, dirConfigCommands]) {
  try { validJSON(pathDir); }
  catch (err) {
    log.error("CONFIG", `ملف JSON غير صالح "${pathDir.replace(__dirname, "")}":\n${err.message}`);
    process.exit(0);
  }
}

const config = require(dirConfig);
if (config.whiteListMode?.whiteListIds && Array.isArray(config.whiteListMode.whiteListIds))
  config.whiteListMode.whiteListIds = config.whiteListMode.whiteListIds.map(id => id.toString());
const configCommands = require(dirConfigCommands);

global.GoatBot = {
  startTime: Date.now() - process.uptime() * 1000,
  commands: new Map(),
  eventCommands: new Map(),
  commandFilesPath: [],
  eventCommandsFilesPath: [],
  aliases: new Map(),
  onFirstChat: [],
  onChat: [],
  onEvent: [],
  onReply: new Map(),
  onReaction: new Map(),
  onAnyEvent: [],
  config,
  configCommands,
  envCommands: {},
  envEvents: {},
  envGlobal: {},
  reLoginBot: function () {},
  Listening: null,
  oldListening: [],
  callbackListenTime: {},
  storage5Message: [],
  fcaApi: null,
  botID: null
};

global.AngelBot = global.GoatBot;

global.db = {
  allThreadData: [], allUserData: [], allDashBoardData: [], allGlobalData: [],
  threadModel: null, userModel: null, dashboardModel: null, globalModel: null,
  threadsData: null, usersData: null, dashBoardData: null, globalData: null,
  receivedTheFirstMessage: {}
};

global.client = {
  dirConfig, dirConfigCommands, dirAccount,
  countDown: {}, cache: {},
  database: { creatingThreadData: [], creatingUserData: [], creatingDashBoardData: [], creatingGlobalData: [] },
  commandBanned: configCommands.commandBanned || {}
};

const utils = require("./utils.js");
global.utils = utils;
const { colors } = utils;

global.temp = {
  createThreadData: [], createUserData: [], createThreadDataError: [],
  contentScripts: { cmds: {}, events: {} }
};

const watchAndReloadConfig = (dir, type, prop, logName) => {
  if (!fs.existsSync(dir)) return;
  let lastModified = fs.statSync(dir).mtimeMs;
  let isFirstModified = true;
  fs.watch(dir, (eventType) => {
    if (eventType === type) {
      const oldConfig = global.GoatBot[prop];
      setTimeout(() => {
        try {
          if (isFirstModified) { isFirstModified = false; return; }
          if (lastModified === fs.statSync(dir).mtimeMs) return;
          global.GoatBot[prop] = JSON.parse(fs.readFileSync(dir, 'utf-8'));
          log.success(logName, `✅ إعادة تحميل ${dir.replace(process.cwd(), "")}`);
        } catch (err) {
          log.warn(logName, `⚠️ فشل إعادة التحميل`);
          global.GoatBot[prop] = oldConfig;
        } finally {
          lastModified = fs.statSync(dir).mtimeMs;
        }
      }, 200);
    }
  });
};

watchAndReloadConfig(dirConfigCommands, 'change', 'configCommands', 'CONFIG');
watchAndReloadConfig(dirConfig, 'change', 'config', 'CONFIG');

global.GoatBot.envGlobal = global.GoatBot.configCommands.envGlobal || {};
global.GoatBot.envCommands = global.GoatBot.configCommands.envCommands || {};
global.GoatBot.envEvents = global.GoatBot.configCommands.envEvents || {};

const getText = global.utils.getText;

if (config.autoRestart) {
  const time = config.autoRestart.time;
  if (!isNaN(time) && time > 0) {
    setTimeout(() => { log.info("AUTO RESTART", "🔄 إعادة التشغيل..."); process.exit(2); }, time);
  } else if (typeof time === "string" && time.match(/^((((\d+,)+\d+|(\d+(\/|-|#)\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5,7})$/gmi)) {
    const cron = require("node-cron");
    cron.schedule(time, () => { log.info("AUTO RESTART", "🔄 إعادة التشغيل..."); process.exit(2); });
  }
}

(async () => {
  try {
    const gradient = require("gradient-string");
    console.log("\n" + gradient.pastel.multiline([
      "  ╔══════════════════════════════════╗",
      "  ║   ✦  Angel Bot  v1.0.0  ✦       ║",
      "  ║   MOMO  +  GoatBot  +  Fang     ║",
      "  ╚══════════════════════════════════╝"
    ].join("\n")) + "\n");
  } catch (e) {
    console.log("\n  ✦ Angel Bot v1.0.0 — MOMO + GoatBot + Fang ✦\n");
  }

  // ── تهيئة DataManager ────────────────────────────────
  try {
    const DataManager = require("./core/DataManager");
    DataManager.init();
    global.DataManager = DataManager;

    // تسجيل وقت التشغيل
    DataManager.updateUptime({
      startTime: global.GoatBot.startTime,
      version:   "1.0.0",
      pid:       process.pid,
    });

    // إيقاف نظيف عند الخروج
    process.once("SIGTERM", () => DataManager.shutdown());
    process.once("SIGINT",  () => DataManager.shutdown());
  } catch (dmErr) {
    log.warn("DM", `⚠️ DataManager غير متاح: ${dmErr.message}`);
  }

  require('./bot/login/login.js');
})();
