/**
 * utils/fileWatcher.js
 * يراقب config.json فقط للـ restart التلقائي
 * appstate.json لا تُراقَب هنا — تتحكم فيها /update-cookies مباشرة
 */

const fs     = require('fs');
const path   = require('path');
const logger = require('./log');

const TAG         = '[ FILE WATCHER ]';
const DEBOUNCE_MS = 4000;   // 4 ثوان debounce
const MIN_RESTART = 60_000; // دقيقة واحدة حد أدنى بين كل restart

// الملفات التي تستحق restart عند تغييرها — appstate مستثنى عمداً
const WATCH_FILES = [
  'config.json',
];

const _timers      = {};
const _hashes      = {};
const _lastRestart = {};

function _getHash(filePath) {
  try {
    const s = fs.statSync(filePath);
    return `${s.size}|${s.mtimeMs}`;
  } catch { return null; }
}

/**
 * يبدأ مراقبة ملفات الإعدادات فقط
 * @param {string}   rootDir       مجلد المشروع
 * @param {Function} onSessionFile callback لـ appstate (غير مستخدم حالياً)
 * @param {Function} onConfigFile  callback عند تغيير config.json
 */
function startWatcher(rootDir, onSessionFile, onConfigFile) {
  for (const fileName of WATCH_FILES) {
    const filePath = path.join(rootDir, fileName);

    _hashes[fileName] = _getHash(filePath);

    if (!fs.existsSync(filePath)) continue;

    try {
      fs.watch(filePath, { persistent: false }, () => {
        if (_timers[fileName]) clearTimeout(_timers[fileName]);

        _timers[fileName] = setTimeout(() => {
          delete _timers[fileName];

          const newHash = _getHash(filePath);
          if (!newHash || newHash === _hashes[fileName]) return;
          _hashes[fileName] = newHash;

          // حماية من restart spam
          const now = Date.now();
          if (_lastRestart[fileName] && now - _lastRestart[fileName] < MIN_RESTART) {
            logger(`ignoring rapid change for ${fileName} (anti-spam)`, TAG);
            return;
          }
          _lastRestart[fileName] = now;

          logger(`restarting due to file changes: ${fileName}`, TAG);
          onConfigFile(fileName, filePath);
        }, DEBOUNCE_MS);
      });

      logger(`watching: ${fileName}`, TAG);
    } catch(e) {
      logger(`could not watch ${fileName}: ${e.message}`, TAG);
    }
  }
}

/** تحديث hash ملف بعد كتابة البوت فيه — لمنع trigger غير مقصود */
function refreshHash(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  _hashes[fileName] = _getHash(filePath);
}

module.exports = { startWatcher, refreshHash };
