module.exports.config = {
  name: "antiout",
  eventType: ["log:unsubscribe"],
  version: "0.0.2",
  credits: "DungUwU",
  description: "إعادة إضافة العضو إذا كان antiout مفعّلاً"
};

module.exports.onStart = async function({ api, event, threadsData }) {
  if (!event.logMessageData) return;
  const leftID = event.logMessageData.leftParticipantFbId;
  if (!leftID || String(leftID) === String(api.getCurrentUserID())) return;

  try {
    const threadData = await threadsData.get(event.threadID);
    if (!threadData?.data?.antiout) return;
    const type = (event.author == leftID) ? "left" : "kicked";
    if (type === "left") {
      api.addUserToGroup(leftID, event.threadID, (err) => {
        if (err) api.sendMessage("⚠️ لا يمكن إعادة إضافة العضو", event.threadID);
        else api.sendMessage("🔄 تمت إعادة إضافة العضو تلقائياً", event.threadID);
      });
    }
  } catch (e) {}
};
