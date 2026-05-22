/**
 * utils/reconnectManager.js
 * إعادة اتصال الحساب فقط — بدون إعادة تشغيل العملية
 */

const fs     = require('fs');
const path   = require('path');
const login  = require('../lib/fca-auto');
const logger = require('./log');

const BASE_DELAY   = 10_000;   // 10 ثوان
const MAX_DELAY    = 300_000;  // 5 دقائق
const TAG          = '[ RECONNECT ]';

// حماية من الجلسات المكررة
const _state = {
  reconnecting : false,
  attempt      : 0,
  timer        : null,
  locked       : false,   // lock لمنع طلبين متزامنين
};

function _clearTimer() {
  if (_state.timer) { clearTimeout(_state.timer); _state.timer = null; }
}

/**
 * يُعيد تسجيل دخول الحساب في نفس العملية بدون process.exit
 * @param {string}   appstateFile  اسم ملف الـ appstate
 * @param {Function} onSuccess     callback يستقبل api الجديد
 */
function reconnectAccount(appstateFile, onSuccess) {
  // منع طلبين متزامنين
  if (_state.locked) {
    logger('reconnect already in progress — skipping duplicate request', TAG);
    return;
  }
  _state.locked = true;
  _state.attempt++;

  const delay = Math.min(BASE_DELAY * _state.attempt, MAX_DELAY);
  logger(`reconnecting account... attempt #${_state.attempt} in ${(delay/1000).toFixed(0)}s`, TAG);

  _clearTimer();
  _state.timer = setTimeout(async () => {
    _state.timer = null;
    try {
      const appstatePath = path.join(process.cwd(), appstateFile);
      if (!fs.existsSync(appstatePath)) {
        logger(`appstate file not found: ${appstateFile}`, TAG);
        _state.locked = false;
        return reconnectAccount(appstateFile, onSuccess);
      }

      const appState = JSON.parse(fs.readFileSync(appstatePath, 'utf8'));
      logger('reconnecting account...', TAG);

      login({ appState }, (err, api) => {
        _state.locked = false;

        if (err) {
          logger(`reconnect failed: ${JSON.stringify(err)}`, TAG);
          return reconnectAccount(appstateFile, onSuccess);
        }

        // نجح الاتصال
        _state.attempt = 0;
        _state.reconnecting = false;
        logger('account connected ✓', TAG);

        // حفظ الـ appstate المحدّث
        try {
          const fresh = api.getAppState();
          fs.writeFileSync(appstatePath, JSON.stringify(fresh, null, 2), 'utf8');
          logger('cookies updated ✓', TAG);
        } catch(e) {
          logger('warning: could not save appstate: ' + e.message, TAG);
        }

        onSuccess(api);
      });

    } catch(e) {
      _state.locked = false;
      logger('reconnect error: ' + e.message, TAG);
      reconnectAccount(appstateFile, onSuccess);
    }
  }, delay);
}

/** إلغاء أي إعادة اتصال معلّقة */
function cancelReconnect() {
  _clearTimer();
  _state.locked       = false;
  _state.reconnecting = false;
  logger('reconnect cancelled', TAG);
}

/** إعادة ضبط العداد عند نجاح الاتصال العادي */
function resetCounter() {
  _state.attempt = 0;
}

module.exports = { reconnectAccount, cancelReconnect, resetCounter };
