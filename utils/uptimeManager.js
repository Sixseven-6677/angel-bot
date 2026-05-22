/**
 * utils/uptimeManager.js
 * يُسجّل وقت بدء التشغيل الحقيقي مرة واحدة فقط
 * لا يتأثر بـ reconnect أو relogin — فقط restart حقيقي يُصفّره
 */

const logger = require('./log');

// ── وقت بدء التشغيل — يُحسب مرة واحدة عند أول require ──────────────────
if (!global.__BOT_START_TIME__) {
    global.__BOT_START_TIME__ = Date.now();
    logger('uptime initialized at: ' + new Date(global.__BOT_START_TIME__).toISOString(), '[ UPTIME ]');
}

const START_TIME = global.__BOT_START_TIME__;

/**
 * يُعيد مدة التشغيل بالميلي ثانية
 */
function getUptimeMs() {
    return Date.now() - START_TIME;
}

/**
 * يُنسّق مدة التشغيل — يعرض كل وحدة غير صفرية (أيام + ساعات + دقائق + ثواني)
 * @param {number} ms - المدة بالميلي ثانية (اختياري)
 * @returns {string} مثال: "2 Days 3 Hours 14 Minutes 7 Seconds"
 */
function formatUptime(ms) {
    if (ms === undefined) ms = getUptimeMs();

    const totalSec = Math.floor(ms / 1000);
    const days    = Math.floor(totalSec / 86400);
    const hours   = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    const parts = [];
    if (days    > 0) parts.push(`${days} Day${days !== 1 ? 's' : ''}`);
    if (hours   > 0) parts.push(`${hours} Hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} Minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} Second${seconds !== 1 ? 's' : ''}`);

    return parts.join(' ');
}

/**
 * يسجّل في logs أن reconnect حدث بدون إعادة تصفير العداد
 */
function logReconnect(reason) {
    logger(`reconnect detected without reset — uptime continues: ${formatUptime()} (reason: ${reason})`, '[ UPTIME ]');
}

module.exports = { getUptimeMs, formatUptime, logReconnect, START_TIME };
