const fs   = require("fs");
const path = require("path");

module.exports.config = {
  name: "اغاني",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "FANG",
  description: "تحميل اغنية من يوتيوب",
  commandCategory: "ترفيه",
  usages: "اغاني [اسم الاغنية]",
  cooldowns: 15
};

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const query = args.join(" ").trim();

  if (!query)
    return api.sendMessage("❌ اكتب اسم الاغنية بعد الأمر\nمثال: اغاني صوت الحرية", threadID, messageID);

  const waitMsg = await new Promise(r => api.sendMessage(`🔍 جاري البحث عن: "${query}"...`, threadID, (e, i) => r(i)));

  try {
    const ytSearch = require("youtube-search-api");
    const results  = await ytSearch.GetListByKeyword(query, false, 5);
    const items    = (results.items || []).filter(v => v.type === "video");

    if (!items.length) {
      if (waitMsg) api.unsendMessage(waitMsg.messageID);
      return api.sendMessage(`❌ لم أجد نتائج لـ "${query}"`, threadID, messageID);
    }

    const video   = items[0];
    const videoID = video.id;
    const title   = video.title;
    const url     = `https://www.youtube.com/watch?v=${videoID}`;

    if (waitMsg) api.unsendMessage(waitMsg.messageID);
    api.sendMessage(`🎵 وجدت: ${title}\n🔄 جاري التحميل...`, threadID, async (e, loadInfo) => {
      try {
        const ytdl   = require("@distube/ytdl-core");
        const ffmpeg = require("fluent-ffmpeg");
        const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
        ffmpeg.setFfmpegPath(ffmpegPath);

        const tmpMp4 = path.join(require("os").tmpdir(), `fang_${Date.now()}.mp4`);
        const tmpMp3 = path.join(require("os").tmpdir(), `fang_${Date.now()}.mp3`);

        await new Promise((res, rej) => {
          const stream = ytdl(url, { quality: "highestaudio", filter: "audioonly" });
          ffmpeg(stream).setFfmpegPath(ffmpegPath).toFormat("mp3").on("end", res).on("error", rej).save(tmpMp3);
        });

        if (loadInfo) api.unsendMessage(loadInfo.messageID);
        api.sendMessage({
          body: `🎵 ${title}`,
          attachment: fs.createReadStream(tmpMp3)
        }, threadID, () => {
          try { fs.unlinkSync(tmpMp3); } catch(e) {}
        }, messageID);
      } catch(err) {
        if (loadInfo) api.unsendMessage(loadInfo.messageID);
        api.sendMessage(`❌ تعذر تحميل الاغنية\n${err.message}`, threadID, messageID);
      }
    });
  } catch(err) {
    if (waitMsg) api.unsendMessage(waitMsg.messageID);
    return api.sendMessage(`❌ حدث خطأ: ${err.message}`, threadID, messageID);
  }
};