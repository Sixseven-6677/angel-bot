module.exports.config = {
  name: "طلبات",
  version: "4.0.0",
  hasPermssion: 3,
  credits: "FANG",
  description: "عرض القروبات في قائمة الانتظار والسبام",
  commandCategory: "إدارة",
  usages: "طلبات",
  cooldowns: 10
};

module.exports.onStart = async function({ api, event }) {
  const { threadID, messageID } = event;

  let loadingMsgID = null;
  await new Promise(res =>
    api.sendMessage('🔍 جاري البحث عن الطلبات...', threadID, (e, info) => {
      if (!e && info) loadingMsgID = info.messageID; res();
    })
  );

  function safeGetList(tag) {
    return new Promise(resolve => {
      const done = setTimeout(() => resolve({ tag, list: [], err: 'timeout' }), 14000);
      try {
        api.getThreadList(50, null, [tag], (err, list) => {
          clearTimeout(done);
          resolve({ tag, list: Array.isArray(list) ? list : [], err: err || null });
        });
      } catch(e) { clearTimeout(done); resolve({ tag, list: [], err: e }); }
    });
  }

  const [pendRes, spamRes, inboxRes] = await Promise.all([
    safeGetList('PENDING'), safeGetList('SPAM'), safeGetList('INBOX')
  ]);
  if (loadingMsgID) try { api.unsendMessage(loadingMsgID); } catch(e) {}

  const pendingGroups = [];
  const seenP = new Set();
  for (const t of [...pendRes.list, ...inboxRes.list]) {
    if (!t.isGroup || !t.threadID || seenP.has(t.threadID)) continue;
    if (t.folder === 'PENDING') { seenP.add(t.threadID); pendingGroups.push(t); }
  }
  const spamGroups = [];
  const seenS = new Set();
  for (const t of spamRes.list) {
    if (t.isGroup && t.threadID && !seenS.has(t.threadID)) { seenS.add(t.threadID); spamGroups.push(t); }
  }

  if (!pendingGroups.length && !spamGroups.length)
    return api.sendMessage('✅ لا توجد قروبات معلقة أو سبام', threadID, messageID);

  let text = '📋 ┌── الطلبات المعلقة ──┐\n\n';
  if (pendingGroups.length) {
    text += `📥 الانتظار (${pendingGroups.length}):\n`;
    pendingGroups.forEach((t, i) => { text += `${i+1}. ${t.threadName || 'بدون اسم'}\n   🔑 ${t.threadID}\n\n`; });
  }
  if (spamGroups.length) {
    text += `⚠️ السبام (${spamGroups.length}):\n`;
    spamGroups.forEach((t, i) => { text += `${i+1}. ${t.threadName || 'بدون اسم'}\n   🔑 ${t.threadID}\n\n`; });
  }
  text += '└────────────────────────┘';
  return api.sendMessage(text, threadID, messageID);
};