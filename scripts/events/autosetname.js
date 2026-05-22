module.exports.config = {
  name: "autosetname",
  eventType: ["log:subscribe"],
  version: "1.0.4",
  credits: "D-Jukie",
  description: "Tự động set biệt danh thành viên mới"
};

module.exports.run = async function({ api, event }) {
  const { readFileSync, existsSync } = require("fs-extra");
  const { join } = require("path");
  const { threadID } = event;
  const memJoin = event.logMessageData.addedParticipants.map(info => info.userFbId);

  const pathData = join(process.cwd(), "modules", "commands", "data", "autosetname.json");
  if (!existsSync(pathData)) return;

  let dataJson;
  try { dataJson = JSON.parse(readFileSync(pathData, "utf-8")); } catch { return; }

  const thisThread = dataJson.find(item => item.threadID == threadID) || { threadID, nameUser: [] };
  if (!thisThread.nameUser || thisThread.nameUser.length === 0) return;

  const setName = thisThread.nameUser[0];

  for (const idUser of memJoin) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      api.changeNickname(`${setName}`, threadID, idUser);
    } catch(e) {}
  }

  return api.sendMessage({
    body: `𝐁𝐨𝐭 𝐯𝐮̛̀𝐚 𝐬𝐞𝐭 𝐛𝐢𝐞̣̂𝐭 𝐝𝐚𝐧𝐡 𝐭𝐚̣𝐦 𝐭𝐡𝐨̛̀𝐢 𝐜𝐡𝐨 𝐭𝐡𝐚̀𝐧𝐡 𝐯𝐢𝐞̂𝐧 𝐦𝐨̛́𝐢`
  }, threadID);
};
