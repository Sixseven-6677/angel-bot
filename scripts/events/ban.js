module.exports.config = {
  name: "ban",
  eventType: ["log:subscribe"],
  version: "1.0.1",
  credits: "TatsuYTB",
  description: "طرد تلقائي للمستخدمين المحظورين عند دخولهم"
};

module.exports.onStart = async function({ api, event, threadsData }) {
  const { threadID, logMessageData } = event;
  if (!logMessageData?.addedParticipants) return;
  const memJoin = logMessageData.addedParticipants.map(info => info.userFbId);

  try {
    const threadData = await threadsData.get(threadID);
    const bannedList = threadData?.data?.bannedUsers || [];
    for (const idUser of memJoin) {
      if (bannedList.includes(String(idUser))) {
        try {
          await api.removeUserFromGroup(idUser, threadID);
          api.sendMessage(`🚫 تم طرد المستخدم ${idUser} لأنه محظور`, threadID);
        } catch (e) {}
      }
    }
  } catch (e) {}
};
