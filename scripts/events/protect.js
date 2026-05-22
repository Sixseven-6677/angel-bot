const fs   = require("fs");
const path = require("path");
const namesPath = path.join(process.cwd(), "modules/commands/data/protectedNames.json");
const nicksPath = path.join(process.cwd(), "modules/commands/data/protectedNicks.json");

module.exports.config = {
  name: "protect",
  version: "1.0.1",
  credits: "FANG",
  description: "حماية اسم القروب والكنيات من التغيير",
  eventType: ["log:thread-name", "log:user-nickname"]
};

module.exports.onLoad = function({ api }) {
  if (!global.protectedNames) {
    global.protectedNames = {};
    try { Object.assign(global.protectedNames, JSON.parse(fs.readFileSync(namesPath, "utf8"))); } catch(e) {}
  }
  if (!global.protectedNicks) {
    global.protectedNicks = {};
    try { Object.assign(global.protectedNicks, JSON.parse(fs.readFileSync(nicksPath, "utf8"))); } catch(e) {}
  }
};

module.exports.run = async function({ api, event }) {
  try {
    const { threadID, logMessageType, logMessageData, author } = event;
    if (!threadID) return;
    if (String(author) === String(api.getCurrentUserID())) return;

    // حماية اسم القروب
    if (logMessageType === "log:thread-name") {
      const protectedName = global.protectedNames?.[threadID];
      if (protectedName) {
        setTimeout(() => {
          api.setTitle(protectedName, threadID, err => {
            if (!err) api.sendMessage(`🛡 تم استعادة اسم القروب المحمي:\n"${protectedName}"`, threadID);
          });
        }, 1000);
      }
    }

    // حماية الكنيات
    if (logMessageType === "log:user-nickname") {
      const protectedNick = global.protectedNicks?.[threadID];
      if (protectedNick) {
        const changedUserID = logMessageData?.participant_id;
        if (changedUserID) {
          setTimeout(() => {
            api.changeNickname(protectedNick, threadID, changedUserID, () => {});
          }, 1000);
        }
      }
    }
  } catch(e) {}
};
