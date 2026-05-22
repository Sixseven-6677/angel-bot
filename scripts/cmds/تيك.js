const fs   = require("fs");
const path = require("path");
const axios = require("axios");
const os   = require("os");

module.exports.config = {
  name: "تيك",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "Angel",
  description: "ابحث عن فيديو في تيك توك وحمّله",
  commandCategory: "ترفيه",
  usages: "تيك [كلمة البحث]",
  cooldowns: 15
};

module.exports.onStart = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const query = args.join(" ").trim();
  if (!query)
    return api.sendMessage("🔍 اكتب كلمة البحث بعد الأمر\nمثال: تيك اغاني عربية", threadID, messageID);

  const waitMsg = await new Promise(r =>
    api.sendMessage(`🔍 جاري البحث عن "${query}" في تيك توك...`, threadID, (e, i) => r(i))
  );

  try {
    const searchRes = await axios.get("https://www.tikwm.com/api/feed/search", {
      params: { keywords: query, count: 10, cursor: 0, HD: 1 }, timeout: 15000
    });
    const videos = searchRes.data?.data?.videos;
    if (!videos?.length) throw new Error("لم أجد نتائج لهذا البحث");

    const video = videos[Math.floor(Math.random() * Math.min(5, videos.length))];
    if (!video?.play) throw new Error("تعذر جلب الفيديو");

    const tmpPath = path.join(os.tmpdir(), `tiktok_${Date.now()}.mp4`);
    const download = await axios.get(video.play, { responseType: "arraybuffer", timeout: 30000 });
    fs.writeFileSync(tmpPath, Buffer.from(download.data));

    const author = video.author?.nickname || "مجهول";
    const desc   = (video.title || "").slice(0, 100) || "بدون وصف";
    const likes  = Number(video.digg_count || 0).toLocaleString("ar");

    if (waitMsg) api.unsendMessage(waitMsg.messageID);
    api.sendMessage({
      body: `🎬 ${desc}\n👤 ${author}\n❤️ ${likes} إعجاب\n🔍 بحث: ${query}`,
      attachment: fs.createReadStream(tmpPath)
    }, threadID, () => { try { fs.unlinkSync(tmpPath); } catch(e) {} }, messageID);
  } catch(err) {
    if (waitMsg) api.unsendMessage(waitMsg.messageID);
    api.sendMessage(`❌ ${err.message}`, threadID, messageID);
  }
};