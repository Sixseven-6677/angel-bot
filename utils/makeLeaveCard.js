const path = require('path');
const os   = require('os');
const fs   = require('fs');

let _FR = false;
async function ensureFonts(GF) {
  if (_FR) return;
  try { GF.loadSystemFonts(); } catch(e) {}
  const ax = require('axios');
  const defs = [
    ['NotoSansArabic-Regular.ttf','NotoArabic',   'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf'],
    ['NotoSansArabic-Bold.ttf',   'NotoArabicBold','https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Bold.ttf'],
    ['Roboto-Regular.ttf','Roboto',    'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Regular.ttf'],
    ['Roboto-Bold.ttf',   'RobotoBold','https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Bold.ttf'],
  ];
  for (const [file, name, url] of defs) {
    const p = path.join(os.tmpdir(), file);
    if (!fs.existsSync(p)) {
      try {
        const r = await ax.get(url, { responseType: 'arraybuffer', timeout: 15000 });
        if (r.data.byteLength > 5000) fs.writeFileSync(p, Buffer.from(r.data));
      } catch(e) {}
    }
    if (fs.existsSync(p)) try { GF.registerFromPath(p, name); } catch(e) {}
  }
  _FR = true;
}

const FB = '"NotoArabicBold","RobotoBold","Roboto","DejaVu Sans",Arial,sans-serif';
const FR = '"NotoArabic","Roboto","DejaVu Sans",Arial,sans-serif';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r);
  ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
  ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r);
  ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

async function fetchAvatar(uid) {
  try {
    const ax = require('axios');
    const url = `https://graph.facebook.com/${uid}/picture?width=300&height=300&type=large`;
    const res = await ax.get(url, { responseType: 'arraybuffer', timeout: 8000, maxRedirects: 10 });
    return Buffer.from(res.data);
  } catch(e) { return null; }
}

async function makeLeaveCard({ name, leaveType, time, uid }) {
  let createCanvas, GlobalFonts, loadImage;
  try { ({ createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas')); }
  catch(e) { throw new Error('@napi-rs/canvas: ' + e.message); }
  await ensureFonts(GlobalFonts);

  const W = 820, H = 380;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0e0808';
  ctx.fillRect(0, 0, W, H);

  const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 480);
  g1.addColorStop(0, 'rgba(255,60,60,0.28)'); g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W, H, 0, W, H, 380);
  g2.addColorStop(0, 'rgba(255,140,0,0.18)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

  // Border
  rr(ctx, 10, 10, W-20, H-20, 30);
  const borderG = ctx.createLinearGradient(10, 10, W-10, H-10);
  borderG.addColorStop(0, 'rgba(255,70,70,0.80)');
  borderG.addColorStop(0.5, 'rgba(255,160,30,0.50)');
  borderG.addColorStop(1, 'rgba(255,70,70,0.80)');
  ctx.strokeStyle = borderG; ctx.lineWidth = 1.8; ctx.stroke();

  // Avatar
  const AX = 84, AY = H / 2, AR = 76;

  ctx.save();
  ctx.shadowBlur = 28; ctx.shadowColor = '#ff4646';
  ctx.beginPath(); ctx.arc(AX, AY, AR + 4, 0, Math.PI * 2);
  const ringG = ctx.createLinearGradient(AX-AR, AY-AR, AX+AR, AY+AR);
  ringG.addColorStop(0, '#ff4646'); ringG.addColorStop(1, '#ff8c1a');
  ctx.strokeStyle = ringG; ctx.lineWidth = 3.5; ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath(); ctx.arc(AX, AY, AR, 0, Math.PI * 2); ctx.clip();
  const avatarBuf = uid ? await fetchAvatar(uid) : null;
  if (avatarBuf) {
    try {
      const img = await loadImage(avatarBuf);
      ctx.drawImage(img, AX - AR, AY - AR, AR * 2, AR * 2);
    } catch(e) {
      ctx.fillStyle = 'rgba(255,70,70,0.18)'; ctx.fill();
    }
  } else {
    ctx.fillStyle = 'rgba(255,70,70,0.18)'; ctx.fill();
  }
  ctx.restore();

  if (!avatarBuf) {
    ctx.save();
    ctx.font = `bold 42px ${FB}`; ctx.fillStyle = '#ff4646';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((name || '?')[0].toUpperCase(), AX, AY);
    ctx.restore();
  }

  const LX = 190;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Badge
  const kicked = leaveType === 'kicked';
  const badgeG = ctx.createLinearGradient(LX, 50, LX + 300, 70);
  badgeG.addColorStop(0, kicked ? '#ff4646' : '#ff8c1a');
  badgeG.addColorStop(1, kicked ? '#ff8c1a' : '#ffcc00');
  ctx.font = `bold 12px ${FB}`; ctx.fillStyle = badgeG;
  ctx.fillText(kicked ? '⚡ تم طرده من المجموعة' : '↩ غادر المجموعة', LX, 68);

  // Name
  const nameText = (name || '').length > 24 ? name.slice(0, 24) + '…' : (name || '—');
  const nameSize = nameText.length > 18 ? 26 : 32;
  const ng = ctx.createLinearGradient(LX, 80, LX + 500, 120);
  ng.addColorStop(0, '#ffffff'); ng.addColorStop(1, '#ffb0b0');
  ctx.font = `bold ${nameSize}px ${FB}`; ctx.fillStyle = ng;
  ctx.fillText(nameText, LX, 118);

  // Divider
  const divG = ctx.createLinearGradient(LX, 0, LX + 560, 0);
  divG.addColorStop(0, 'rgba(255,70,70,0.45)'); divG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.moveTo(LX, 136); ctx.lineTo(LX + 580, 136);
  ctx.strokeStyle = divG; ctx.lineWidth = 1; ctx.stroke();

  // Info rows (Arabic)
  const statusText = kicked ? 'طُرد بواسطة الأدمن' : 'غادر بإرادته';
  const rows = [
    { label: 'الحالة', val: statusText, color: kicked ? '#ff4646' : '#ff8c1a' },
    { label: 'الوقت', val: time || '—', color: '#ffcc80' },
  ];

  rows.forEach((row, i) => {
    const y = 172 + i * 62;
    ctx.font = `bold 11px ${FB}`; ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.fillText(row.label, LX, y);
    ctx.font = `bold 20px ${FR}`; ctx.fillStyle = row.color;
    ctx.fillText(row.val, LX, y + 28);
  });

  // Footer
  ctx.font = `bold 12px ${FB}`; ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.textAlign = 'center';
  ctx.fillText(`مع السلامة  •  ${global?.config?.BOTNAME || 'MOMO'}`, W / 2, H - 18);

  return canvas.toBuffer('image/png');
}

module.exports = { makeLeaveCard };
