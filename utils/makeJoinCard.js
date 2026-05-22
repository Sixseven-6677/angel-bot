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

// Fonts: bold uses NotoArabicBold for Arabic support + Roboto fallback
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

async function makeJoinCard({ name, threadName, memberCount, author, uid }) {
  let createCanvas, GlobalFonts, loadImage;
  try { ({ createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas')); }
  catch(e) { throw new Error('@napi-rs/canvas: ' + e.message); }
  await ensureFonts(GlobalFonts);

  const W = 820, H = 420;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#080e1a';
  ctx.fillRect(0, 0, W, H);

  const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 480);
  g1.addColorStop(0, 'rgba(0,220,110,0.30)'); g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W, H, 0, W, H, 420);
  g2.addColorStop(0, 'rgba(0,140,255,0.22)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

  // Border
  rr(ctx, 10, 10, W-20, H-20, 30);
  const borderG = ctx.createLinearGradient(10, 10, W-10, H-10);
  borderG.addColorStop(0, 'rgba(0,230,120,0.75)');
  borderG.addColorStop(0.5, 'rgba(0,180,255,0.50)');
  borderG.addColorStop(1, 'rgba(0,230,120,0.75)');
  ctx.strokeStyle = borderG; ctx.lineWidth = 1.8; ctx.stroke();

  // Avatar
  const AX = 84, AY = H / 2, AR = 82;

  ctx.save();
  ctx.shadowBlur = 30; ctx.shadowColor = '#00e678';
  ctx.beginPath(); ctx.arc(AX, AY, AR + 4, 0, Math.PI * 2);
  const ringG = ctx.createLinearGradient(AX-AR, AY-AR, AX+AR, AY+AR);
  ringG.addColorStop(0, '#00e678'); ringG.addColorStop(1, '#0096ff');
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
      ctx.fillStyle = 'rgba(0,230,120,0.18)'; ctx.fill();
    }
  } else {
    ctx.fillStyle = 'rgba(0,230,120,0.18)'; ctx.fill();
  }
  ctx.restore();

  // First letter fallback overlay (only if no avatar rendered or avatar failed)
  if (!avatarBuf) {
    ctx.save();
    ctx.font = `bold 46px ${FB}`; ctx.fillStyle = '#00e678';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((name || '?')[0].toUpperCase(), AX, AY);
    ctx.restore();
  }

  const LX = 192;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // JOINED badge
  const badgeG = ctx.createLinearGradient(LX, 50, LX + 280, 80);
  badgeG.addColorStop(0, '#00e678'); badgeG.addColorStop(1, '#0096ff');
  ctx.font = `bold 12px ${FB}`; ctx.fillStyle = badgeG;
  ctx.fillText('● انضم إلى المجموعة', LX, 72);

  // Name
  const nameText = (name || '').length > 24 ? name.slice(0, 24) + '…' : (name || '—');
  const nameSize = nameText.length > 18 ? 26 : 32;
  const ng = ctx.createLinearGradient(LX, 90, LX + 580, 130);
  ng.addColorStop(0, '#ffffff'); ng.addColorStop(1, '#a0e0ff');
  ctx.font = `bold ${nameSize}px ${FB}`; ctx.fillStyle = ng;
  ctx.fillText(nameText, LX, 126);

  // Divider
  const divG = ctx.createLinearGradient(LX, 0, LX + 560, 0);
  divG.addColorStop(0, 'rgba(0,230,120,0.45)'); divG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.moveTo(LX, 144); ctx.lineTo(LX + 580, 144);
  ctx.strokeStyle = divG; ctx.lineWidth = 1; ctx.stroke();

  // Info rows (Arabic labels)
  const tn   = (threadName || '—').length > 28 ? threadName.slice(0, 28) + '…' : (threadName || '—');
  const auth = (author || 'رابط انضمام').length > 24 ? author.slice(0, 24) + '…' : (author || 'رابط انضمام');
  const rows = [
    { label: 'المجموعة',    val: tn,                         color: '#4dd2ff' },
    { label: 'عضو رقم',     val: `#${memberCount || '?'}`,   color: '#00e678' },
    { label: 'أضافه',        val: auth,                       color: '#d26cff' },
  ];

  rows.forEach((row, i) => {
    const y = 184 + i * 58;
    ctx.font = `bold 11px ${FB}`; ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.fillText(row.label, LX, y);
    ctx.font = `bold 20px ${FR}`; ctx.fillStyle = row.color;
    ctx.fillText(row.val, LX, y + 28);
  });

  // Footer
  ctx.font = `bold 12px ${FB}`; ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.textAlign = 'center';
  ctx.fillText(`أهلاً وسهلاً  •  ${global?.config?.BOTNAME || 'MOMO'}`, W / 2, H - 18);

  return canvas.toBuffer('image/png');
}

module.exports = { makeJoinCard };
