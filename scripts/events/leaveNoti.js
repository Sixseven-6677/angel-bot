module.exports.config = {
  name: "leaveNoti",
  eventType: ["log:unsubscribe"],
  version: "2.1.0",
  credits: "HĐGN / updated by MOMO",
  description: "إشعار خروج عضو من المجموعة بصورة"
};

module.exports.run = async function ({ api, event, Users }) {
  if (event.logMessageData.leftParticipantFbId == api.getCurrentUserID()) return;

  const os     = require('os');
  const path   = require('path');
  const fs     = require('fs');
  const moment = require('moment-timezone');

  const threadID  = event.threadID;
  const iduser    = event.logMessageData.leftParticipantFbId;
  const name      = global.data.userName.get(iduser) || String(iduser);
  const kicked    = event.author != iduser;
  const leaveType = kicked ? 'kicked' : 'left';
  const time      = moment().tz("Asia/Riyadh").format("DD/MM/YYYY HH:mm");

  let imgPath;
  try {
    const { makeLeaveCard } = require('../../utils/makeLeaveCard');
    const buf = await makeLeaveCard({ name, leaveType, time, uid: iduser });
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
