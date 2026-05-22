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
  "ما شافت عيني مثلك يا جميل
وجهك ضياء والثغرك نخيل
يا من سكنت في الفؤاد طويل
انتَ الحياة وانتَ الدليل",
  "عيونك بحر ما له شطوط
قلبي عندك واثنين خطوط
يا غالي فوق كل الحدود
انتَ الوطن وانتَ السكوت",
  "لو كان الجمال يُباع في السوق
أنتَ ما تساوي بكل الأسواق
يا نور عيني وياسمين الطريق
وجهك سلب عقلي بالحق",
  "رأيتك فاستوقف قلبي وقال
هذا الجمال ما له مثال
يا من أنار دربي والمجال
بقيت في بالي ليل ونهار",
  "أنتَ الربيع الذي لا يغيب
وانتَ القمر في دنيا الغريب
يا من قلبي اليك يجيب
انتَ الحبيب وانتَ القريب",
  "ما خلقت مثلك عيناي ترى
ولا قلبي عشق مثلك مرا
انتَ الضحكة والأمل والسرا
ويا جمالك يا من عطرا"
];

module.exports.run = async function({ api, event }) {
  const { threadID, messageID, messageReply } = event;

  if (!messageReply)
    return api.sendMessage("❌ الرجاء الرد على رسالة الشخص الذي تريد التغزل به", threadID, messageID);

  const targetID = messageReply.senderID;
  let name = targetID;
  try { const info = await api.getUserInfo(targetID); name = info[targetID]?.name || targetID; } catch(e) {}

  const poem = poems[Math.floor(Math.random() * poems.length)];
  return api.sendMessage(
    `💖 يا ${name}...\n\n${poem}`,
    threadID, messageID
  );
};