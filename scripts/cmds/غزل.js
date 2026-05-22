module.exports.config = {
  name: "غزل",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "FANG",
  description: "التغزل بشخص عن طريق الرد على رسالته",
  commandCategory: "ترفيه",
  usages: "رد على رسالة شخص + غزل",
  cooldowns: 5
};

const poems = [
  "ما شافت عيني مثلك يا جميل\nوجهك ضياء والثغرك نخيل",
  "عيونك بحر ما له شطوط\nقلبي عندك واثنين خطوط",
  "لو كان الجمال يُباع في السوق\nأنتَ ما تساوي بكل الأسواق",
  "رأيتك فاستوقف قلبي وقال\nهذا الجمال ما له مثال",
  "أنتَ الربيع الذي لا يغيب\nوانتَ القمر في دنيا الغريب",
  "ما خلقت مثلك عيناي ترى\nولا قلبي عشق مثلك مرا"
];

module.exports.onStart = async function({ api, event }) {
  const { threadID, messageID, messageReply } = event;
  if (!messageReply)
    return api.sendMessage("❌ الرجاء الرد على رسالة الشخص الذي تريد التغزل به", threadID, messageID);

  const targetID = messageReply.senderID;
  let name = targetID;
  try { const info = await api.getUserInfo(targetID); name = info[targetID]?.name || targetID; } catch(e) {}

  const poem = poems[Math.floor(Math.random() * poems.length)];
  return api.sendMessage(`💖 يا ${name}...\n\n${poem}`, threadID, messageID);
};