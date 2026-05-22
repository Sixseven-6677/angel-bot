module.exports.config = {
  name: "طلبات",
  version: "4.0.0",
  hasPermssion: 3,
  credits: "FANG",
  description: "عرض القروبات الموجودة في قائمة الانتظار والسبام",
  commandCategory: "إدارة",
  usages: "طلبات",
  cooldowns: 10
};

module.exports.run = async function({ api, event }) {
  const { threadID, messageID } = event;

  // رسالة انتظار
  let loadingMsgID = null;
  await new Promise(res =>
    api.sendMessage('🔍 جاري البحث عن الطلبات...', threadID, (e, info) => {
      if (!e && info) loadingMsgID = info.messageID;
      res();
    })
  );

  // دالة مساعدة: تجلب قائمة مؤمنة ضد أي خطأ
  function safeGetList(tag) {
    return new Promise(resolve => {
      const done = setTimeout(() => resolve({ tag, list: [], err: 'timeout' }), 14000);
      try {
        api.getThreadList(50, null, [tag], (err, list) => {
          clearTimeout(done);
          resolve({ tag, list: Array.isArray(list) ? list : [], err: err || null });
        });
      } catch(e) {
        clearTimeout(done);
        resolve({ tag, list: [], err: e });
      }
    });
  }

  // جلب PENDING وSPAM وINBOX معاً بالتوازي
  const [pendRes, spamRes, inboxRes] = await Promise.all([
    safeGetList('PENDING'),
    safeGetList('SPAM'),
    safeGetList('INBOX')
  ]);

  // حذف رسالة الانتظار
  if (loadingMsgID) try { api.unsendMessage(loadingMsgID); } catch(e) {}

  // تجميع القروبات المعلقة من PENDING مباشرة + ما له folder=PENDING في INBOX
  const seen   = new Set();
  const addAll = (arr, folder) =>
    arr
      .filter(t => t.isGroup && t.threadID && (!folder || t.folder === folder))
      .forEach(t => { if (!seen.has(t.threadID)) { seen.add(t.threadID); } });

  // قائمة القروبات المعلقة (PENDING)
  const pendingGroups = [];
  const seenP = new Set();
  for (const t of [...pendRes.list, ...inboxRes.list]) {
    if (!t.isGroup || !t.threadID || seenP.has(t.threadID)) continue;
    if (t.folder === 'PENDING' || (pendRes.err == null && pendRes.list.includes(t))) {
      seenP.add(t.threadID);
      pendingGroups.push(t);
    }
  }
  // فلترة INBOX لـ folder=PENDING فقط إذا فشل طلب PENDING الأصلي
  if (pendRes.err && !pendRes.list.length) {
    for (const t of inboxRes.list) {
      if (t.isGroup && t.threadID && !seenP.has(t.threadID) && t.folder === 'PENDING') {
        seenP.add(t.threadID);
        pendingGroups.push(t);
      }
    }
  }

  // قائمة قروبات السبام
  const spamGroups = [];
  const seenS = new Set();
  for (const t of spamRes.list) {
    if (t.isGroup && t.threadID && !seenS.has(t.threadID)) {
      seenS.add(t.threadID);
      spamGroups.push(t);
    }
  }
  // بحث في INBOX عن folder=SPAM إذا فشل طلب SPAM
  if (spamRes.err && !spamRes.list.length) {
    for (const t of inboxRes.list) {
      if (t.isGroup && t.threadID && !seenS.has(t.threadID) && t.folder === 'SPAM') {
        seenS.add(t.threadID);
        spamGroups.push(t);
      }
    }
  }

  // لا يوجد شيء
  if (pendingGroups.length === 0 && spamGroups.length === 0) {
    let msg = '✅ لا توجد قروبات معلقة أو سبام';
    const errors = [pendRes.err, spamRes.err, inboxRes.err].filter(Boolean);
    if (errors.length === 3) {
      msg = '⚠️ تعذّر الوصول إلى قوائم Messenger\n\nقد يكون الـ API محدوداً مؤقتاً، حاول لاحقاً.';
    } else if (errors.length > 0) {
      msg += '\n\n⚠️ بعض قوائم الانتظار لم تُحمَّل بسبب خطأ في الاتصال.';
    }
    return api.sendMessage(msg, threadID, messageID);
  }

  // بناء الرسالة
  let text = '📋 ┌── الطلبات المعلقة ──┐\n\n';

  if (pendingGroups.length > 0) {
    text += `📥 الانتظار (${pendingGroups.length}):\n`;
    pendingGroups.forEach((t, i) => {
      const name = (t.name || t.threadName || 'بدون اسم').trim();
      text += `${i + 1}. ${name}\n   🔑 ${t.threadID}\n\n`;
    });
  }

  if (spamGroups.length > 0) {
    text += `⚠️ السبام (${spamGroups.length}):\n`;
    spamGroups.forEach((t, i) => {
      const name = (t.name || t.threadName || 'بدون اسم').trim();
      text += `${i + 1}. ${name}\n   🔑 ${t.threadID}\n\n`;
    });
  }

  text += '└────────────────────────┘';
  return api.sendMessage(text, threadID, messageID);
};
