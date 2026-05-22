module.exports.config = {
  name: "joinNoti",
  eventType: ["log:subscribe"],
  version: "2.2.0",
  credits: "TatsuYTB / updated by MOMO",
  description: "إشعار دخول عضو للمجموعة"
};

module.exports.onStart = async function({ api, event, usersData, threadsData }) {
  const { threadID, logMessageData } = event;
  if (!logMessageData?.addedParticipants) return;

  const botID = String(api.getCurrentUserID());
  const os   = require('os');
  const path = require('path');
  const fs   = require('fs');

  const botAdded = logMessageData.addedParticipants.some(p => String(p.userFbId) === botID);
  if (botAdded) {
    const config = global.GoatBot?.config || {};
    try {
      api.changeNickname(
        `[ ${config.prefix || "!"} ] • ${config.nickNameBot || "Angel"}`,
        threadID, botID
      );
    } catch (e) {}
    return api.sendMessage("✅ تم الانضمام للمجموعة!", threadID);
  }

  try {
    const threadInfo = await api.getThreadInfo(threadID);
    const authorName = await usersData.getName(event.author).catch(() => "رابط انضمام");
    const memberCount = threadInfo.participantIDs.length;
    const threadName  = threadInfo.threadName || "—";

    for (const p of logMessageData.addedParticipants) {
      if (String(p.userFbId) === botID) continue;
      const name = p.fullName || String(p.userFbId);
      const uid  = p.userFbId;
      let imgPath;
      try {
        const { makeJoinCard } = require('../../utils/makeJoinCard');
        const buf = await makeJoinCard({ name, threadName, memberCount, author: authorName, uid });
        imgPath = path.join(os.tmpdir(), `join_${Date.now()}.png`);
        fs.writeFileSync(imgPath, buf);
        await new Promise((resolve, reject) => {
          api.sendMessage(
            { attachment: fs.createReadStream(imgPath) },
            threadID,
            (err) => {
              if (imgPath) try { fs.unlinkSync(imgPath); } catch(e) {}
              if (err) reject(err); else resolve();
            }
          );
        });
      } catch (err) {
        if (imgPath) try { fs.unlinkSync(imgPath); } catch(e) {}
        api.sendMessage(
          `✅ مرحباً ${name}!\n📌 ${threadName}\n👥 عضو رقم: ${memberCount}\n➕ أضافه: ${authorName}`,
          threadID
        );
      }
    }
  } catch (e) {}
};
