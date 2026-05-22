/**
 * utils/persistence.js
 * حفظ دائم لبيانات اللاعبين والـ appstate عبر GitHub
 * + مزامنة ملفات الأوامر والأحداث عند كل تشغيل
 */

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const TOKEN    = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN || '';
const REPO     = process.env.GITHUB_REPO   || 'Sixseven-6677/MOMO';
const DATA_DIR = path.join(process.cwd(), 'Horizon_Database');
const TRACKED  = ['qetal_players.json', 'qetal_guilds.json', 'admins.json'];
const APPSTATE_FILES = ['appstate.json'];

const shaCache = {};

// ── حماية: لا ترفع نفس الملف أكثر من مرة كل 30 دقيقة ──────────────────
const _lastPushMs = {};
const PUSH_MIN_INTERVAL = 30 * 60 * 1000; // 30 دقيقة

// ── حماية: pushAppstateNow لا تُشغَّل إلا مرة واحدة كل 60 دقيقة لكل اسم ملف ──
const _lastLoginPushMs = {};
const LOGIN_PUSH_MIN_INTERVAL = 60 * 60 * 1000; // ساعة

function log(msg) { console.log('[Persistence] ' + msg); }

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function fetchSha(apiPath) {
  try {
    const { data } = await axios.get(
      `https://api.github.com/repos/${REPO}/contents/${apiPath}`,
      { headers: { Authorization: `token ${TOKEN}`, 'User-Agent': 'MOMO-Bot' }, timeout: 8000 }
    );
    return data.sha || null;
  } catch (e) {
    if (e.response && e.response.status === 404) return null;
    throw e;
  }
}

async function pushToGitHub(apiPath, localPath, commitMsg) {
  if (!TOKEN) return false;
  if (!fs.existsSync(localPath)) return false;

  // ── لا ترفع نفس الملف أكثر من مرة كل 30 دقيقة ──────────────────────
  const now = Date.now();
  if (_lastPushMs[apiPath] && now - _lastPushMs[apiPath] < PUSH_MIN_INTERVAL) {
    const remaining = Math.round((PUSH_MIN_INTERVAL - (now - _lastPushMs[apiPath])) / 60000);
    log(`skipping push for ${path.basename(apiPath)} — next push in ${remaining} min`);
    return false;
  }
  _lastPushMs[apiPath] = now;

  try {
    const content  = fs.readFileSync(localPath);
    const b64      = content.toString('base64');
    const cacheKey = apiPath;
    if (!shaCache[cacheKey]) shaCache[cacheKey] = await fetchSha(apiPath);
    const body = { message: commitMsg || `data: backup ${path.basename(localPath)}`, content: b64 };
    if (shaCache[cacheKey]) body.sha = shaCache[cacheKey];
    const { data } = await axios.put(
      `https://api.github.com/repos/${REPO}/contents/${apiPath}`,
      body,
      { headers: { Authorization: `token ${TOKEN}`, 'User-Agent': 'MOMO-Bot' }, timeout: 15000 }
    );
    if (data.content && data.content.sha) shaCache[cacheKey] = data.content.sha;
    log(`pushed → ${apiPath}`);
    return true;
  } catch (e) {
    if (e.response && e.response.status === 409) {
      // تعارض — امسح الـ throttle حتى نُعيد المحاولة مرة واحدة فقط
      delete _lastPushMs[apiPath];
      try { shaCache[apiPath] = await fetchSha(apiPath); return pushToGitHub(apiPath, localPath, commitMsg); } catch {}
    }
    log(`push error [${apiPath}]: ` + (e.response ? e.response.status : e.message));
    return false;
  }
}

async function pullFromGitHub(apiPath, localPath) {
  if (!TOKEN) return false;
  try {
    const { data } = await axios.get(
      `https://api.github.com/repos/${REPO}/contents/${apiPath}`,
      { headers: { Authorization: `token ${TOKEN}`, 'User-Agent': 'MOMO-Bot' }, timeout: 10000 }
    );
    shaCache[apiPath] = data.sha;
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(localPath, Buffer.from(data.content, 'base64'), 'utf8');
    log(`pulled ← ${apiPath} (${data.size} bytes)`);
    return true;
  } catch (e) {
    if (e.response && e.response.status === 404) return false;
    log(`pull error [${apiPath}]: ` + (e.response ? e.response.status : e.message));
    return false;
  }
}

async function pushFile(fileName) {
  const localPath = path.join(DATA_DIR, fileName);
  return pushToGitHub(`Horizon_Database/${fileName}`, localPath, `data: backup ${fileName}`);
}

async function pullFile(fileName) {
  ensureDir();
  const localPath = path.join(DATA_DIR, fileName);
  return pullFromGitHub(`Horizon_Database/${fileName}`, localPath);
}

async function pushAppstateNow(fileName) {
  fileName = fileName || 'appstate.json';

  // ── لا نُشغّل هذه الوظيفة أكثر من مرة في الساعة لنفس الملف ──────────
  const now = Date.now();
  if (_lastLoginPushMs[fileName] && now - _lastLoginPushMs[fileName] < LOGIN_PUSH_MIN_INTERVAL) {
    const remaining = Math.round((LOGIN_PUSH_MIN_INTERVAL - (now - _lastLoginPushMs[fileName])) / 60000);
    log(`pushAppstateNow skipped for ${fileName} — next allowed in ${remaining} min`);
    return false;
  }
  _lastLoginPushMs[fileName] = now;
  // أعدّل الـ throttle العام أيضاً لمنع pushAppstate من الرفع مباشرة بعدها
  const apiPath = encodeURIComponent(fileName);
  _lastPushMs[apiPath] = now;

  log(`saving fresh appstate after login: ${fileName}`);
  const localPath = path.join(process.cwd(), fileName);
  const result = await pushToGitHub(apiPath, localPath, `appstate: auto-save after login`);
  if (result) log('appstate saved to GitHub successfully ✓');
  else log('appstate save skipped (no TOKEN or file not found)');
  return result;
}

async function pullAppstate(fileName) {
  const localPath = path.join(process.cwd(), fileName);
  return pullFromGitHub(encodeURIComponent(fileName), localPath);
}

async function pushAppstate(fileName) {
  const localPath = path.join(process.cwd(), fileName);
  return pushToGitHub(encodeURIComponent(fileName), localPath, `appstate: periodic backup`);
}

// ── جلب جميع ملفات مجلد من GitHub وحفظها محلياً ─────────────────────────
async function syncDirFromGitHub(ghDir, localDir) {
  if (!TOKEN) return;
  try {
    const { data: entries } = await axios.get(
      `https://api.github.com/repos/${REPO}/contents/${ghDir}`,
      { headers: { Authorization: `token ${TOKEN}`, 'User-Agent': 'MOMO-Bot' }, timeout: 10000 }
    );
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      if (entry.type === 'file') {
        const localPath = path.join(localDir, entry.name);
        await pullFromGitHub(entry.path, localPath).catch(() => {});
      }
    }
    log(`synced ${entries.filter(e=>e.type==='file').length} files from ${ghDir}`);
  } catch (e) {
    log(`syncDir error [${ghDir}]: ` + e.message);
  }
}

// ── مزامنة كاملة من GitHub عند الإطلاق ──────────────────────────────────
async function syncFromGitHub() {
  if (!TOKEN) {
    log('GITHUB_PERSONAL_ACCESS_TOKEN not set — skipping GitHub sync');
    return;
  }
  log('syncing from GitHub on startup...');

  // بيانات اللاعبين
  for (const f of TRACKED)        await pullFile(f).catch(() => {});
  // appstate
  for (const f of APPSTATE_FILES) await pullAppstate(f).catch(() => {});

  // ── جلب أحدث ملفات الأوامر والأحداث من GitHub ──────────────────────
  const cmdDir    = path.join(process.cwd(), 'modules', 'commands');
  const eventDir  = path.join(process.cwd(), 'modules', 'events');
  await syncDirFromGitHub('modules/commands', cmdDir);
  await syncDirFromGitHub('modules/events',   eventDir);

  log('startup sync done ✓ (commands + events updated from GitHub)');
}

async function syncToGitHub() {
  if (!TOKEN) return;
  for (const f of TRACKED) {
    if (fs.existsSync(path.join(DATA_DIR, f))) await pushFile(f).catch(() => {});
  }
}

function startAutoBackup(intervalMs) {
  const ms = intervalMs || 5 * 60 * 1000;
  if (!TOKEN) {
    log('GITHUB_PERSONAL_ACCESS_TOKEN not set — auto-backup disabled');
    return;
  }
  log(`auto-backup started: every ${ms / 60000} minutes`);
  let cycle = 0;
  setInterval(async () => {
    try {
      cycle++;
      await syncToGitHub();
      if (cycle % 6 === 0) {
        for (const f of APPSTATE_FILES) {
          const localPath = path.join(process.cwd(), f);
          if (fs.existsSync(localPath)) await pushAppstate(f).catch(() => {});
        }
        log('periodic appstate backup done');
      }
    } catch (e) {
      log('auto-backup error: ' + e.message);
    }
  }, ms);
}

module.exports = {
  syncFromGitHub,
  syncToGitHub,
  startAutoBackup,
  pullFile,
  pushFile,
  pushAppstateNow,
  pushAppstate,
  pullAppstate
};
