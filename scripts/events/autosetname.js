module.exports.config = {
  name: "autosetname",
  eventType: ["log:subscribe"],
  version: "1.0.5",
  credits: "D-Jukie",
  description: "تعيين كنية تلقائية للأعضاء الجدد"
};

module.exports.onStart = async function({ api, event, threadsData }) {
  const { threadID, logMessageData } = event;
  if (!logMessageData?.addedParticipants) return;
  const memJoin = logMessageData.addedParticipants.map(info => info.userFbId);

  try {
    const threadData = await threadsData.get(threadID);
    const setName = threadData?.data?.autosetname;
    if (!setName) return;
    for (const idUser of memJoin) {
      await new Promise(resolve => setTimeout(resolve, 800));
      try { api.changeNickname(setName, threadID, idUser); } catch (e) {}
    }
  } catch (e) {}
};
