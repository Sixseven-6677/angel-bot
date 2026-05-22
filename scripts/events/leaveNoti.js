module.exports.config = {
  name: "leaveNoti",
  eventType: ["log:unsubscribe"],
  version: "2.2.0",
  credits: "HĐGN / updated by MOMO",
  description: "إشعار خروج عضو من المجموعة"
};

module.exports.onStart = async function({ api, event, usersData }) {
  if (!event.logMessageData) return;
  const leftID = event.logMessageData.leftParticipantFbId;
  if (!leftID || String(leftID) === String(api.getCurrentUserID())) return;

  const os     = require('os');
  const path   = require('path');
  const fs     = require('fs');
  const moment = require('moment-timezone');

  const threadID  = event.threadID;
  const kicked    = event.author != leftID;
  const leaveType = kicked ? 'kicked' : 'left';
  const time      = moment().tz("Africa/Cairo").format("DD/MM/YYYY HH:mm");

  let name = String(leftID);
  try { name = await usersData.getName(leftID) || name; } catch (e) {}

  let imgPath;
  try {
    const { makeLeaveCard } = require('../../utils/makeLeaveCard');
    const buf = await makeLeaveCard({ name, leaveType, time, uid: leftID });
    imgPath = path.join(os.tmpdir(), `leave_${Date.now()}.png`);
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
    const statusText = kicked ? 'تم طرده' : 'غادر المجموعة';
    api.sendMessage(`👋 ${name} ${statusText}\n🕐 ${time}`, threadID);
  }
};
