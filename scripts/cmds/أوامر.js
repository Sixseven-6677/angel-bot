module.exports.config = {
  name: "اوامر",
  version: "3.0.0",
  hasPermssion: 0,
  credits: "FANG",
  description: "عرض قائمة جميع الأوامر",
  commandCategory: "معلومات",
  usages: "اوامر | اوامر [اسم]",
  cooldowns: 5
};

// خريطة الأسماء الإنجليزية لكل أمر
const EN = {
  'ادمن':   'Admin',
  'ادمنز':  'Admins',
  'اسم':    'Name',
  'اضافة':  'Add',
  'اغلاق':  'Lock',
  'اغاني':  'Music',
  'طرد':    'Kick',
  'طلبات':  'Requests',
  'فتح':    'Unlock',
  'فانغ':   'Fang',
  'قروبات': 'Groups',
  'كنية':   'Nickname',
  'مدح':    'Praise',
  'مغادرة': 'Out',
  'توسيع':  'Domain',
  'تيك':    'TikTok',
  'وقت':    'Time',
  'uptime': 'Uptime',
  'اوامر':  'Commands',
  'غزل':    'Flirt',
};

// تحويل نص إلى بولد مشطوب
function bs(text) {
  const BU = {
    'a':'𝗮','b':'𝗯','c':'𝗰','d':'𝗱','e':'𝗲','f':'𝗳','g':'𝗴','h':'𝗵',
    'i':'𝗶','j':'𝗷','k':'𝗸','l':'𝗹','m':'𝗺','n':'𝗻','o':'𝗼','p':'𝗽',
    'q':'𝗾','r':'𝗿','s':'𝘀','t':'𝘁','u':'𝘂','v':'𝘃','w':'𝘄','x':'𝘅',
    'y':'𝘆','z':'𝘇','A':'𝗔','B':'𝗕','C':'𝗖','D':'𝗗','E':'𝗘','F':'𝗙',
    'G':'𝗚','H':'𝗛','I':'𝗜','J':'𝗝','K':'𝗞','L':'𝗟','M':'𝗠','N':'𝗡',
    'O':'𝗢','P':'𝗣','Q':'𝗤','R':'𝗥','S':'𝗦','T':'𝗧','U':'𝗨','V':'𝗩',
    'W':'𝗪','X':'𝗫','Y':'𝗬','Z':'𝗭'
  };
  return text.split('').map(c => (BU[c] || c) + '\u0336').join('');
}

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const { commands } = global.client;

  // ── تفاصيل أمر واحد ─────────────────────────────────────────────────────
  if (args[0]) {
    const target = args.join(' ').trim().toLowerCase();
    const cmd = commands.get(target);
    if (!cmd) {
      return api.sendMessage(
        `❌ الأمر "${target}" غير موجود\n\nاكتب: اوامر — للقائمة الكاملة`,
        threadID, messageID
      );
    }
    const c = cmd.config;
    const PERM = ['الجميع', '🔒 أدمن غروب', '🔐 مطوّر', '👑 أدمن البوت'];
    return api.sendMessage(
      `⃟─⌯ 𝗙̸𝗮𝗻𝗴 𖥻 〣\n\n` +
      `𝗡𝗮𝗺𝗲: ${c.name}\n` +
      `𝗗𝗲𝘀𝗰: ${c.description || '—'}\n` +
      `𝗨𝘀𝗮𝗴𝗲: ${c.usages || c.name}\n` +
      `𝗣𝗲𝗿𝗺: ${PERM[c.hasPermssion] || '—'}\n` +
      `𝗖𝗱: ${c.cooldowns || 1}s`,
      threadID, messageID
    );
  }

  // ── قائمة كل الأوامر ────────────────────────────────────────────────────
  let text = '⃟─⌯ 𝗙̸𝅥͎̳͡͠𝗮̸̱𝗻̀𝗴˟̲ 𝄋 𝗖̶𝗼̶𝗺̶𝗺̶𝗮̶𝗻̶𝗱̶𝘀 𖥻 〣\n\n';

  for (const [, cmd] of commands) {
    const name = cmd.config.name;
    const en   = EN[name] || name;
    text += `─⃟𖥻${bs(en)}\n`;
  }

  text += '\n━━━━━━━━━━━━━━\n';
  text += '𝗖𝗼𝗺𝗺𝗮𝗻𝗱 [𝗡𝗮𝗺𝗲] = 𝗵𝗲𝗹𝗽𝗶𝗻𝗴';

  return api.sendMessage(text, threadID, messageID);
};
