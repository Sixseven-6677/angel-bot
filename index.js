/**
 * Angel Bot — مشغّل البوت الرئيسي
 * يجمع بين نظام appstate من MOMO وهيكل GoatBot
 */

const { spawn } = require("child_process");
const { existsSync, writeFileSync, readFileSync } = require("fs-extra");
const path = require("path");
const express = require("express");
const log = require("./logger/log.js");

// ── حقن appstate من متغيرات البيئة (نظام MOMO) ──────────────────────
(function injectAppstate() {
  try {
    const flag = path.join(__dirname, "appstate.manual");
    if (existsSync(flag)) return;

    if (process.env.APPSTATE_JSON) {
      writeFileSync(
        path.join(__dirname, "appstate.json"),
        process.env.APPSTATE_JSON,
        "utf8"
      );
      log.info("ANGEL", "✅ تم تحميل appstate من APPSTATE_JSON");
    } else if (process.env.FB_COOKIES) {
      const { rawCookiesToAppstate } = require("./utils/cookieConverter");
      const appstate = rawCookiesToAppstate(process.env.FB_COOKIES);
      writeFileSync(
        path.join(__dirname, "appstate.json"),
        JSON.stringify(appstate, null, 2),
        "utf8"
      );
      log.info("ANGEL", "✅ تم تحليل الكوكيز من FB_COOKIES");
    }
  } catch (e) {
    log.error("ANGEL", `❌ فشل تحميل appstate: ${e.message}`);
  }
})();

// ── خادم ويب بسيط للـ dashboard والـ uptime ──────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "dashboard")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard", "index.html"));
});

app.get("/api/status", (req, res) => {
  res.json({
    name: "Angel Bot",
    version: "1.0.0",
    uptime: Math.floor(process.uptime()),
    status: botProcess ? "running" : "stopped",
    pid: botProcess ? botProcess.pid : null,
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  log.info("ANGEL", `🌐 Dashboard يعمل على المنفذ ${PORT}`);
});

// ── إدارة عملية البوت ──────────────────────────────────────────────
let botProcess = null;
let restartCount = 0;
const MAX_RESTARTS = 10;

function startBot() {
  if (botProcess) {
    try { botProcess.kill("SIGTERM"); } catch (e) {}
    botProcess = null;
  }

  log.info("ANGEL", `🚀 بدء تشغيل Angel Bot... (محاولة ${restartCount + 1})`);

  botProcess = spawn("node", ["Goat.js"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
    env: process.env
  });

  botProcess.on("close", (code) => {
    botProcess = null;
    if (code === 2) {
      log.info("ANGEL", "🔄 إعادة التشغيل بسبب طلب restart...");
      restartCount = 0;
      setTimeout(startBot, 2000);
    } else if (code !== 0) {
      restartCount++;
      if (restartCount <= MAX_RESTARTS) {
        const delay = Math.min(5000 * restartCount, 60000);
        log.warn("ANGEL", `⚠️ توقف البوت (code=${code}) — إعادة تشغيل بعد ${delay / 1000}s`);
        setTimeout(startBot, delay);
      } else {
        log.error("ANGEL", `❌ تجاوز الحد الأقصى للإعادة (${MAX_RESTARTS}). توقف.`);
      }
    } else {
      log.info("ANGEL", "✅ توقف البوت بشكل طبيعي.");
    }
  });

  botProcess.on("error", (err) => {
    log.error("ANGEL", `❌ خطأ في العملية: ${err.message}`);
  });
}

startBot();
