/**
 * timeUtils — أدوات الوقت بالعربية
 */

"use strict";

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatSeconds(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h} ساعة`);
  if (m > 0) parts.push(`${m} دقيقة`);
  if (s > 0 || parts.length === 0) parts.push(`${s} ثانية`);
  return parts.join(" و ");
}

function formatCountdown(ms) {
  if (ms <= 0) return "الآن";
  return formatSeconds(Math.ceil(ms / 1000));
}

function formatDate(timestamp) {
  if (!timestamp || timestamp <= 0) return "—";
  const d = new Date(timestamp);
  return d.toLocaleString("ar-EG", {
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

module.exports = { randomBetween, formatSeconds, formatCountdown, formatDate };
