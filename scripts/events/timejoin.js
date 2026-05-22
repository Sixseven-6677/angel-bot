module.exports.config = {
  name: "timejoin",
  eventType: ["log:unsubscribe"],
  version: "1.0.3",
  credits: "TatsuYTB",
  description: "حذف بيانات timejoin عند مغادرة العضو"
};

const fs   = require("fs-extra");
const path = require("path");
const dir  = path.join(process.cwd(), "data", "timejoin");

module.exports.onStart = async function({ event }) {
  const { threadID, logMessageData } = event;
  if (!logMessageData) return;

  let usersLeft = [];
  if (logMessageData.leftParticipantFbId) usersLeft.push(String(logMessageData.leftParticipantFbId));
  if (Array.isArray(logMessageData.leftParticipantFbIds))
    usersLeft = usersLeft.concat(logMessageData.leftParticipantFbIds.map(String));

  if (!usersLeft.length) return;

  const pathFile = path.join(dir, threadID + ".json");
  if (!fs.existsSync(pathFile)) return;

  try {
    let data = JSON.parse(fs.readFileSync(pathFile, "utf-8"));
    data = data.filter(u => !usersLeft.includes(String(u.senderID)));
    fs.writeFileSync(pathFile, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {}
};
