module.exports.config = {
  name: "antibd",
  eventType: ["log:user-nickname"],
  version: "0.0.3",
  credits: "ProCoderCyrus",
  description: "حماية كنية البوت من التغيير"
};

module.exports.onStart = async function({ api, event }) {
  const { logMessageData, threadID, author } = event;
  if (!logMessageData) return;
  const botID = String(api.getCurrentUserID());
  const config = global.GoatBot?.config || {};
  const prefix = config.prefix || "!";
  const botName = config.nickNameBot || "Angel";
  const nickname = `[ ${prefix} ] • ${botName}`;
  if (String(logMessageData.participant_id) === botID && String(author) !== botID) {
    try {
      api.changeNickname(nickname, threadID, botID);
    } catch (e) {}
  }
};
