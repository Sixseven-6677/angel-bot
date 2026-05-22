/**
 * Angel Bot — Dashboard Server
 * لوحة تحكم بسيطة على Express
 */

const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const cookieParser = require("cookie-parser");

let dashboardStarted = false;

module.exports = async function startDashboard(api) {
  if (dashboardStarted) return;
  dashboardStarted = true;

  const app = express();
  const PORT = process.env.DASHBOARD_PORT || process.env.PORT || 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname)));

  // ── نقاط API ──
  app.get("/api/status", (req, res) => {
    const uptime = Math.floor(process.uptime());
    const cmdsCount = global.GoatBot?.commands?.size || 0;
    const eventsCount = global.GoatBot?.eventCommands?.size || 0;
    res.json({
      status: "running",
      pid: process.pid,
      uptime,
      botID: global.GoatBot?.botID || null,
      cmds: cmdsCount,
      events: eventsCount,
      prefix: global.GoatBot?.config?.prefix || "!",
      language: global.GoatBot?.config?.language || "ar",
      version: require("../package.json").version
    });
  });

  app.get("/api/commands", (req, res) => {
    const cmds = [];
    (global.GoatBot?.commands || new Map()).forEach((cmd, name) => {
      cmds.push({
        name,
        category: cmd.config?.category || "عام",
        description: cmd.config?.shortDescription || "",
        role: cmd.config?.role || 0
      });
    });
    res.json(cmds);
  });

  app.get("/api/config", (req, res) => {
    const cfg = global.GoatBot?.config || {};
    res.json({
      prefix: cfg.prefix,
      language: cfg.language,
      nickName: cfg.nickNameBot,
      adminCount: (cfg.adminBot || []).length
    });
  });

  // ── الصفحة الرئيسية ──
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });

  app.get("*", (req, res) => {
    res.redirect("/");
  });

  app.listen(PORT, () => {
    const log = require("../logger/log.js");
    log.success("DASHBOARD", `🌐 لوحة التحكم تعمل على المنفذ ${PORT}`);
  });
};
