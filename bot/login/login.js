/**
 * Angel Bot — Login Module
 * يدمج نظام appstate من MOMO مع بنية GoatBot
 */

process.stdout.write("\x1b]2;Angel Bot\x1b\x5c");

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const log = require("../../logger/log.js");

const { login } = require("neokex-fca");

const dirAccount = global.client.dirAccount;
const colors = global.utils.colors;

// ── تحميل الـ appstate من البيئة (MOMO System) أو من الملف ──
async function loadAppState() {
  // 1. من متغير APPSTATE_JSON (يحوي JSON مباشرة)
  if (process.env.APPSTATE_JSON) {
    log.info("ANGEL LOGIN", "📦 تحميل appstate من APPSTATE_JSON...");
    try {
      const raw = JSON.parse(process.env.APPSTATE_JSON);
      const appState = normalizeAppState(raw);
      log.success("ANGEL LOGIN", `✅ تم تحميل ${appState.length} كوكيز من APPSTATE_JSON`);
      return appState;
    } catch (e) {
      log.error("ANGEL LOGIN", `❌ APPSTATE_JSON غير صالح: ${e.message}`);
    }
  }

  // 2. من متغير FB_COOKIES (cookie string)
  if (process.env.FB_COOKIES) {
    log.info("ANGEL LOGIN", "🍪 تحميل appstate من FB_COOKIES...");
    try {
      const appState = parseCookieString(process.env.FB_COOKIES);
      log.success("ANGEL LOGIN", `✅ تم تحميل ${appState.length} كوكيز من FB_COOKIES`);
      return appState;
    } catch (e) {
      log.error("ANGEL LOGIN", `❌ FB_COOKIES غير صالحة: ${e.message}`);
    }
  }

  // 3. من ملف appstate.json
  const appstateFile = path.join(__dirname, "../../appstate.json");
  if (fs.existsSync(appstateFile)) {
    log.info("ANGEL LOGIN", "📁 تحميل appstate من appstate.json...");
    try {
      const raw = JSON.parse(fs.readFileSync(appstateFile, "utf8"));
      const appState = normalizeAppState(raw);
      log.success("ANGEL LOGIN", `✅ تم تحميل ${appState.length} كوكيز من appstate.json`);
      return appState;
    } catch (e) {
      log.error("ANGEL LOGIN", `❌ appstate.json غير صالح: ${e.message}`);
    }
  }

  // 4. من account.txt
  if (fs.existsSync(dirAccount)) {
    const content = fs.readFileSync(dirAccount, "utf8").trim();
    if (content && content !== "AppState: appstate.json") {
      log.info("ANGEL LOGIN", "📄 تحميل appstate من account.txt...");
      try {
        if (content.startsWith("[")) {
          const appState = normalizeAppState(JSON.parse(content));
          log.success("ANGEL LOGIN", `✅ تم تحميل ${appState.length} كوكيز من account.txt`);
          return appState;
        } else {
          // cookie string
          const appState = parseCookieString(content);
          log.success("ANGEL LOGIN", `✅ تم تحميل ${appState.length} كوكيز (string) من account.txt`);
          return appState;
        }
      } catch (e) {
        log.error("ANGEL LOGIN", `❌ account.txt غير صالح: ${e.message}`);
      }
    }
  }

  log.error("ANGEL LOGIN", `❌ لم يتم العثور على appstate!`);
  log.info("ANGEL LOGIN", "📋 الحلول:");
  log.info("ANGEL LOGIN", "   1. أضف متغير APPSTATE_JSON (JSON array)");
  log.info("ANGEL LOGIN", "   2. أضف متغير FB_COOKIES (cookie string)");
  log.info("ANGEL LOGIN", "   3. ضع ملف appstate.json في مجلد البوت");
  log.info("ANGEL LOGIN", "   4. ضع cookies في account.txt");
  throw new Error("لا يوجد appstate للتسجيل");
}

function normalizeAppState(raw) {
  if (!Array.isArray(raw)) throw new Error("AppState يجب أن يكون مصفوفة");
  return raw.map(item => ({
    key: item.key || item.name,
    value: item.value,
    domain: item.domain || "facebook.com",
    path: item.path || "/",
    hostOnly: typeof item.hostOnly === "boolean" ? item.hostOnly : false,
    creation: item.creation || new Date().toISOString(),
    lastAccessed: item.lastAccessed || new Date().toISOString()
  })).filter(i => i.key && i.value && i.key !== "x-referer");
}

function parseCookieString(str) {
  return str.split(";").map(part => {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) return null;
    return {
      key: part.slice(0, eqIdx).trim(),
      value: part.slice(eqIdx + 1).trim(),
      domain: "facebook.com",
      path: "/",
      hostOnly: true,
      creation: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };
  }).filter(i => i && i.key && i.value);
}

async function getName(userID) {
  try {
    const res = await axios.post(`https://www.facebook.com/api/graphql/?q=node(${userID}){name}`);
    return res.data?.[userID]?.name || null;
  } catch { return null; }
}

// ── مسح جميع الخرائط قبل كل بدء (ضروري عند إعادة الاتصال) ──
function clearGoatBotMaps() {
  global.GoatBot.commands         = new Map();
  global.GoatBot.eventCommands    = new Map();
  global.GoatBot.aliases          = new Map();
  global.GoatBot.onFirstChat      = [];
  global.GoatBot.onChat           = [];
  global.GoatBot.onEvent          = [];
  global.GoatBot.onReply          = new Map();
  global.GoatBot.onReaction       = new Map();
  global.GoatBot.onAnyEvent       = [];
  global.GoatBot.commandFilesPath          = [];
  global.GoatBot.eventCommandsFilesPath    = [];
  global.client.countDown                  = {};
}

// ── بدء البوت ──
async function startBot() {
  try {
    // مسح الحالة القديمة دائماً (آمن حتى في أول تشغيل)
    clearGoatBotMaps();

    log.info("ANGEL", "🤖 بدء تسجيل الدخول لـ Angel Bot...");

    const appState = await loadAppState();

    log.info("ANGEL", "🔌 الاتصال بـ Facebook...");
    login({ appState }, global.GoatBot.config.optionsFca || {}, async function (err, api) {
      if (err) {
        log.error("LOGIN", `❌ فشل تسجيل الدخول: ${err.message || err}`);
        log.info("LOGIN", "🔄 إعادة المحاولة بعد 10 ثوانٍ...");
        setTimeout(startBot, 10000);
        return;
      }

      global.GoatBot.fcaApi = api;
      global.GoatBot.botID = api.getCurrentUserID();
      global.botID = api.getCurrentUserID();

      const botName = await getName(global.botID) || "Angel Bot";
      
      log.success("ANGEL", `✅ تم تسجيل الدخول بنجاح!`);
      log.info("BOT ID", `${global.botID} — ${botName}`);
      log.info("PREFIX", global.GoatBot.config.prefix);
      log.info("LANGUAGE", global.GoatBot.config.language);

      // ── حفظ appstate المحدّث ──
      try {
        const fresh = api.getAppState();
        fs.writeFileSync(
          path.join(__dirname, "../../appstate.json"),
          JSON.stringify(fresh, null, 2)
        );
      } catch (e) {}

      // ── تحميل قاعدة البيانات ──
      log.info("ANGEL", "💾 تحميل قاعدة البيانات...");
      const dbModule = await require("./loadData.js")(api, (text, center) => {
        const pad = "─".repeat(Math.max(0, Math.floor((60 - text.length) / 2)));
        return center ? `${pad} ${text} ${pad}` : text;
      });
      const { threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData } = dbModule;

      // ── تحميل الأوامر والأحداث ──
      log.info("ANGEL", "📦 تحميل الأوامر والأحداث...");
      await require("./loadScripts.js")(api, threadModel, userModel, dashBoardModel, globalModel, threadsData, usersData, dashBoardData, globalData, (text, center) => {
        const pad = "─".repeat(Math.max(0, Math.floor((60 - text.length) / 2)));
        return center ? `${pad} ${text} ${pad}` : text;
      });

      // ── تشغيل لوحة التحكم ──
      if (global.GoatBot.config.dashBoard?.enable === true) {
        try {
          await require("../../dashboard/app.js")(api);
          log.info("DASHBOARD", "🌐 لوحة التحكم تعمل");
        } catch (e) {
          log.error("DASHBOARD", `❌ ${e.message}`);
        }
      }

      log.success("ANGEL", "🚀 Angel Bot يعمل الآن! استمتع 🎉");
      log.info("ANGEL", `⏱️ وقت التحميل: ${Date.now() - global.GoatBot.startTime}ms`);

      // ── معالج إعادة التسجيل ──
      global.GoatBot.reLoginBot = async () => {
        log.info("ANGEL", "🔄 إعادة تسجيل الدخول...");
        try { api.stopListening?.(() => {}); } catch {}
        setTimeout(startBot, 1000);
      };

      // ── كولباك الاستماع (معرّف بشكل منفصل لإعادة استخدامه في restart) ──
      const listenCallback = async (error, event) => {
        if (error) {
          const msg = error?.error || error?.message || String(error);

          if (msg.includes("Not logged in") || msg.includes("Connection refused")) {
            log.error("LISTEN", `❌ انقطع الاتصال: ${msg}`);
            log.info("LISTEN", "🔄 إعادة الاتصال...");
            try { api.stopListening?.(() => {}); } catch {}
            setTimeout(startBot, 5000);
          } else {
            log.error("LISTEN", `⚠️ خطأ في الاستماع: ${msg}`);
            // ── استدعاء معالج الخطأ (Telegram/Discord إلخ) ──
            try {
              await require("./handlerWhenListenHasError.js")({
                api, error,
                threadModel, userModel, dashBoardModel, globalModel,
                threadsData, usersData, dashBoardData, globalData
              });
            } catch (e) {}
          }
          return;
        }

        if (!event) return;

        try {
          await require("../handler/handleMessage.js")({
            api, event,
            threadModel, userModel, dashBoardModel, globalModel,
            threadsData, usersData, dashBoardData, globalData
          });
        } catch (e) {
          log.error("HANDLER", e);
        }
      };

      // ── بدء الاستماع ──
      global.GoatBot.Listening = api.listenMqtt(listenCallback);
      log.info("ANGEL", "👂 يستمع للرسائل...");

      // ── إعادة تشغيل الاستماع دورياً (restartListenMqtt) ──
      const restartCfg = global.GoatBot.config.restartListenMqtt;
      if (restartCfg?.enable === true && restartCfg.timeRestart > 0) {
        const scheduleRestart = () => {
          setTimeout(async () => {
            // تأكد أن البوت لا يزال في حالة تشغيل طبيعية
            if (global.GoatBot.fcaApi !== api) return;

            if (restartCfg.logNoti !== false)
              log.info("LISTEN", "🔄 إعادة تشغيل الاستماع MQTT دورياً...");

            try { api.stopListening?.(() => {}); } catch {}

            const delay = restartCfg.delayAfterStopListening || 2000;
            await new Promise(r => setTimeout(r, delay));

            global.GoatBot.Listening = api.listenMqtt(listenCallback);

            if (restartCfg.logNoti !== false)
              log.info("LISTEN", "✅ تم إعادة تشغيل الاستماع بنجاح");

            scheduleRestart();
          }, restartCfg.timeRestart);
        };
        scheduleRestart();
      }
    });
  } catch (err) {
    log.error("ANGEL", `❌ خطأ: ${err.message}`);
    log.info("ANGEL", "🔄 إعادة المحاولة بعد 15 ثانية...");
    setTimeout(startBot, 15000);
  }
}

startBot();
