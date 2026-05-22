module.exports.config = {
  name: "log",
  eventType: ["log:unsubscribe", "log:subscribe", "log:thread-name"],
  version: "1.1.0",
  credits: "Mirai Team / Angel",
  description: "تسجيل أحداث البوت وإرسالها للأدمن"
};

module.exports.onStart = async function({ api, event, threadsData }) {
  const botID = String(api.getCurrentUserID());
  const config = global.GoatBot?.config || {};
  const adminBot = (config.adminBot || []).map(String);
  if (!adminBot.length) return;

  const moment = require('moment-timezone');
  const time = moment().tz(config.timeZone || "Africa/Cairo").format("DD/MM/YYYY HH:mm:ss");

  let task = "";
  let nameThread = event.threadID;
  try {
    const info = await api.getThreadInfo(event.threadID);
    nameThread = info.threadName || nameThread;
  } catch(e) {}

  switch (event.logMessageType) {
    case "log:thread-name": {
      const newName = event.logMessageData?.name;
      if (newName) {
        try { await threadsData.set(event.threadID, { threadName: newName }); } catch(e) {}
      }
      return;
    }
    case "log:subscribe": {
      const added = (event.logMessageData?.addedParticipants || []).some(p => String(p.userFbId) === botID);
      if (added) task = "✅ تمت إضافة البوت لمجموعة جديدة";
      break;
    }
    case "log:unsubscribe": {
      if (String(event.logMessageData?.leftParticipantFbId) === botID && event.author !== botID) {
        task = "⚠️ تم طرد البوت من المجموعة";
      }
      break;
    }
  }

  if (!task) return;

  const report = `🔔 إشعار Bot\n\n📌 المجموعة: ${nameThread}\n🆔 ID: ${event.threadID}\n📋 الحدث: ${task}\n🕐 الوقت: ${time}`;
  try { api.sendMessage(report, adminBot[0]); } catch(e) {}
};
