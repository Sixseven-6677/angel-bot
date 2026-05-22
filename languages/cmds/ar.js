module.exports = {
  help: {
    title: "📋 قائمة الأوامر - Angel Bot",
    description: "اكتب {prefix}مساعدة [اسم الأمر] للمزيد من التفاصيل",
    category: "الفئة",
    noCommand: "❌ الأمر غير موجود"
  },
  rank: {
    title: "📊 رانك {name}",
    level: "المستوى",
    xp: "XP",
    messages: "الرسائل",
    levelUp: "🎉 تهانينا {name}! وصلت للمستوى {level}!"
  },
  daily: {
    alreadyClaimed: "⏳ أخذت مكافأتك اليومية!\nعد بعد: {time}",
    claimed: "✅ حصلت على {amount} عملة 🪙\n💰 رصيدك الآن: {balance}"
  },
  balance: {
    title: "💰 رصيد {name}",
    balance: "الرصيد",
    bank: "البنك",
    total: "الإجمالي"
  },
  ban: {
    banned: "🚫 تم حظر {name}",
    unbanned: "✅ رُفع الحظر عن {name}",
    alreadyBanned: "❌ هذا المستخدم محظور بالفعل",
    notBanned: "❌ هذا المستخدم غير محظور"
  },
  kick: {
    success: "👢 تم طرد {name}",
    failed: "❌ فشل طرد {name}",
    cantKickAdmin: "❌ لا يمكن طرد الأدمن"
  },
  admin: {
    added: "✅ تم ترقية {name} لأدمن",
    removed: "✅ تم إزالة {name} من الأدمن",
    list: "👑 قائمة الأدمن:"
  },
  prefix: {
    current: "🔹 البادئة الحالية: {prefix}",
    changed: "✅ تم تغيير البادئة إلى: {prefix}"
  },
  thread: {
    info: "📌 معلومات القروب",
    name: "الاسم",
    id: "المعرّف",
    members: "الأعضاء",
    admins: "الأدمن"
  },
  user: {
    info: "👤 معلومات المستخدم",
    name: "الاسم",
    id: "المعرّف",
    exp: "الخبرة",
    money: "العملات"
  },
  ping: {
    result: "🏓 بونغ! {ping}ms"
  },
  errors: {
    adminOnly: "🔒 هذا الأمر للأدمن فقط!",
    devOnly: "🔒 هذا الأمر للمطورين فقط!",
    cooldown: "⏳ انتظر {time} ثانية!",
    userBanned: "🚫 أنت محظور من استخدام البوت!",
    threadBanned: "🚫 هذا القروب محظور!",
    missingPermission: "❌ ليس لديك صلاحية!"
  }
};
