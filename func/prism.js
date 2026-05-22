// تحميل اختياري لـ canvas — غير ضروري لتشغيل البوت الأساسي
let createCanvas;
try {
  ({ createCanvas } = require("@napi-rs/canvas"));
} catch (e) {
  try {
    ({ createCanvas } = require("canvas"));
  } catch (e2) {
    createCanvas = null;
  }
}

module.exports = {
  roundRect: function (ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    return ctx;
  },

  circle: function (ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, true);
    ctx.closePath();
    return ctx;
  }
};
