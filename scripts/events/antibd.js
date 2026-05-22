module.exports.config = {
  name: "antibd",
  eventType: ["log:user-nickname"],
  version: "0.0.2",
  credits: "ProCoderCyrus",
  description: "Chống đổi biệt danh của Bot"
};

module.exports.run = async function({ api, event, Users, Threads }) {
    var { logMessageData, threadID, author } = event;
    var botID = api.getCurrentUserID();
    var { BOTNAME, ADMINBOT } = global.config;

    // BUG FIX: single clean declaration — Threads.getData returns thread data object
    var threadData = await Threads.getData(threadID);
    var nickname = (threadData && threadData.nickname)
      ? threadData.nickname
      : `『 ${global.config.PREFIX} 』 ⪼ ${global.config.BOTNAME}`;

    if (logMessageData.participant_id == botID && author != botID && !ADMINBOT.includes(author) && logMessageData.nickname != nickname) {
        api.changeNickname(nickname, threadID, botID);
        var info = await Users.getData(author);
        return api.sendMessage({ body: `${info.name} - 𝐁𝐚̣𝐧 𝐊𝐡𝐨̂𝐧𝐠 𝐂𝐨́ 𝐐𝐮𝐲𝐞̂̀𝐧!!!` }, threadID);
    }
};
