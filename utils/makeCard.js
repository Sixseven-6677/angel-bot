const path = require('path');
const os   = require('os');
const fs   = require('fs');

const W = 920, H = 810;
const MX = 14, MY = 14, MW = 892, MH = 782;

let _FR = false;
async function ensureFonts(GF) {
  if (_FR) return;
  try { GF.loadSystemFonts(); } catch(e) {}
  const ax = require('axios');
  const defs = [
    ['Roboto-Regular.ttf','Roboto','https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Regular.ttf'],
    ['Roboto-Bold.ttf','RobotoBold','https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Bold.ttf'],
  ];
  for (const [file, name, url] of defs) {
    const p = path.join(os.tmpdir(), file);
    if (!fs.existsSync(p)) {
      try {
        const r = await ax.get(url, { responseType: 'arraybuffer', timeout: 10000 });
        if (r.data.byteLength > 5000) fs.writeFileSync(p, Buffer.from(r.data));
      } catch(e) {}
    }
    if (fs.existsSync(p)) try { GF.registerFromPath(p, name); } catch(e) {}
  }
  _FR = true;
}

const FB = '"RobotoBold","Roboto","DejaVu Sans",Arial,sans-serif';
const FR = '"Roboto","DejaVu Sans",Arial,sans-serif';
const sv = v => (v == null) ? '—' : String(v);

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r);
  ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
  ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r);
  ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

function glass(ctx, x, y, w, h, r, fa, fb) {
  rr(ctx,x,y,w,h,r); ctx.fillStyle=fa; ctx.fill();
  rr(ctx,x,y,w,h,r); ctx.strokeStyle=fb; ctx.lineWidth=1; ctx.stroke();
}

function pbar(ctx, x, y, w, h, pct, c0, c1) {
  rr(ctx,x,y,w,h,5); ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.fill();
  const fw = Math.max(w * Math.min(Number(pct)||0, 1), h);
  const g = ctx.createLinearGradient(x,0,x+fw,0);
  g.addColorStop(0,c0); g.addColorStop(1,c1);
  rr(ctx,x,y,fw,h,5); ctx.fillStyle=g; ctx.fill();
}

async function makeCard(data) {
  let createCanvas, GlobalFonts;
  try { ({ createCanvas, GlobalFonts } = require('@napi-rs/canvas')); }
  catch(e) { throw new Error('@napi-rs/canvas: '+e.message); }
  await ensureFonts(GlobalFonts);

  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  ctx.fillStyle = '#050816';
  ctx.fillRect(0, 0, W, H);

  const g1 = ctx.createRadialGradient(W*0.12,0,0,W*0.12,0,W*0.72);
  g1.addColorStop(0,'rgba(31,79,255,0.35)'); g1.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g1; ctx.fillRect(0,0,W,H);

  const g2 = ctx.createRadialGradient(W,H,0,W,H,W*0.68);
  g2.addColorStop(0,'rgba(255,0,255,0.22)'); g2.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g2; ctx.fillRect(0,0,W,H);

  rr(ctx,MX,MY,MW,MH,32); ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fill();
  const bg = ctx.createLinearGradient(MX,MY,MX+MW,MY+MH);
  bg.addColorStop(0,'rgba(77,163,255,0.65)');
  bg.addColorStop(0.5,'rgba(184,77,255,0.55)');
  bg.addColorStop(1,'rgba(77,163,255,0.65)');
  rr(ctx,MX,MY,MW,MH,32); ctx.strokeStyle=bg; ctx.lineWidth=1.5; ctx.stroke();
  ctx.save();
  ctx.shadowBlur=50; ctx.shadowColor='rgba(77,163,255,0.28)';
  rr(ctx,MX,MY,MW,MH,32); ctx.strokeStyle='rgba(77,163,255,0.10)'; ctx.lineWidth=4; ctx.stroke();
  ctx.restore();

  const IX = MX+30, IW = MW-60;

  const botTitle = sv(data.botName||'FANG').toUpperCase() + ' DASHBOARD';
  const tg = ctx.createLinearGradient(IX,0,IX+520,0);
  tg.addColorStop(0,'#4da3ff'); tg.addColorStop(1,'#d84dff');
  ctx.font=`bold 34px ${FB}`; ctx.fillStyle=tg; ctx.textAlign='left';
  ctx.fillText(botTitle, IX, MY+76);

  ctx.save();
  ctx.shadowBlur=18; ctx.shadowColor='#48ffd5';
  ctx.beginPath(); ctx.arc(MX+MW-116,MY+62,8,0,Math.PI*2);
  ctx.fillStyle='#48ffd5'; ctx.fill();
  ctx.restore();
  ctx.font=`bold 20px ${FB}`; ctx.fillStyle='#48ffd5';
  ctx.fillText('ONLINE', MX+MW-100, MY+68);

  const lineG = ctx.createLinearGradient(IX,0,IX+IW,0);
  lineG.addColorStop(0,'rgba(77,163,255,0.28)');
  lineG.addColorStop(0.5,'rgba(184,77,255,0.22)');
  lineG.addColorStop(1,'rgba(77,163,255,0.28)');
  ctx.beginPath(); ctx.moveTo(IX,MY+90); ctx.lineTo(IX+IW,MY+90);
  ctx.strokeStyle=lineG; ctx.lineWidth=1; ctx.stroke();

  const sY = MY+100, sH = 64;
  const sCfg = [
    {lbl:'UPTIME', val:data.uptime,  vc:'rgba(72,255,213,.90)', fa:'rgba(0,198,184,.07)', fb:'rgba(0,198,184,.20)'},
    {lbl:'PING',   val:data.ping,    vc:'rgba(77,163,255,.90)', fa:'rgba(77,163,255,.07)', fb:'rgba(77,163,255,.20)'},
    {lbl:'CMDS',   val:data.cmds,    vc:'rgba(210,108,255,.90)',fa:'rgba(145,61,255,.07)', fb:'rgba(145,61,255,.20)'},
    {lbl:'GROUPS', val:data.groups,  vc:'rgba(255,190,92,.90)', fa:'rgba(176,106,0,.07)',  fb:'rgba(176,106,0,.20)'},
    {lbl:'USERS',  val:data.users,   vc:'rgba(255,112,112,.90)',fa:'rgba(180,30,30,.07)',  fb:'rgba(180,30,30,.20)'},
  ];
  const sW = (IW - 4*10) / 5;
  sCfg.forEach((sc,i) => {
    const x = IX + i*(sW+10);
    glass(ctx,x,sY,sW,sH,16,sc.fa,sc.fb);
    ctx.font=`bold 10px ${FB}`; ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.textAlign='left';
    ctx.fillText(sc.lbl, x+12, sY+21);
    ctx.font=`bold 22px ${FR}`; ctx.fillStyle=sc.vc;
    ctx.fillText(sv(sc.val), x+12, sY+51);
  });

  let cy = sY + sH + 13;
  const cH=85, ISZ=62, GAP=9;

  const cpuStr = sv(data.cpu);
  const cpuSz  = cpuStr.length > 22 ? 13 : cpuStr.length > 16 ? 15 : 17;
  const cpuSub = [data.platform, data.arch, data.cores+'c', data.speed+'MHz'].filter(Boolean).join(' | ');

  const cards = [
    { fa:'rgba(77,83,255,.07)', fb:'rgba(77,83,255,.18)', ig:['#4d5fff','#6b8cff'], it:'CPU',
      lbl:'CPU MODEL', val:cpuStr, vc:'rgba(200,210,255,.88)', vs:cpuSz, sub2:cpuSub, bar:null },
    { fa:'rgba(145,61,255,.07)',fb:'rgba(145,61,255,.18)',ig:['#913dff','#cf63ff'], it:'MEM',
      lbl:'HEAP MEMORY',
      val:sv(data.heapUsed)+' / '+sv(data.heapTotal)+' MB',
      vc:'#d26cff', vs:17,
      bar:{pct:data.heapPct,c0:'#d26cff',c1:'#b84dff',sub:(Math.min(Number(data.heapPct)||0,1)*100).toFixed(0)+'%'} },
    { fa:'rgba(0,140,255,.07)', fb:'rgba(0,140,255,.18)', ig:['#007aff','#00c6ff'], it:'RAM',
      lbl:'SYSTEM RAM',
      val:sv(data.usedMemGB)+' / '+sv(data.totalMemGB)+' GB',
      vc:'#4dd2ff', vs:17,
      bar:{pct:data.ramPct,c0:'#4dd2ff',c1:'#007aff',sub:'متاح '+sv(data.freeMemGB)+' GB'} },
    { fa:'rgba(27,124,255,.07)',fb:'rgba(27,124,255,.18)',ig:['#1b7cff','#4dd2ff'], it:'DSK',
      lbl:'DISK FREE',
      val:sv(data.diskFree||'N/A'),
      vc:'#48ffd5', vs:20,
      bar:data.diskFreePct!=null?{pct:data.diskFreePct,c0:'#48ffd5',c1:'#1b7cff',sub:(Math.min(Number(data.diskFreePct)||0,1)*100).toFixed(0)+'%'}:null },
  ];

  for (const c of cards) {
    glass(ctx,IX,cy,IW,cH,22,c.fa,c.fb);

    const ig = ctx.createLinearGradient(IX+16,cy+(cH-ISZ)/2,IX+16+ISZ,cy+(cH+ISZ)/2);
    ig.addColorStop(0,c.ig[0]); ig.addColorStop(1,c.ig[1]);
    rr(ctx,IX+16,cy+(cH-ISZ)/2,ISZ,ISZ,18); ctx.fillStyle=ig; ctx.fill();

    ctx.font=`bold 13px ${FB}`; ctx.fillStyle='rgba(255,255,255,0.95)';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(c.it, IX+16+ISZ/2, cy+cH/2);
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';

    const lx = IX+16+ISZ+18;
    ctx.font=`bold 11px ${FB}`; ctx.fillStyle='rgba(255,255,255,0.32)';
    ctx.fillText(c.lbl, lx, cy+20);

    if (c.bar) {
      const bW = IW - ISZ - 50 - 155;
      ctx.font=`bold ${c.vs}px ${FR}`; ctx.fillStyle=c.vc;
      ctx.fillText(c.val, lx, cy+48);
      pbar(ctx, lx, cy+56, bW, 8, c.bar.pct, c.bar.c0, c.bar.c1);
      ctx.font=`normal 12px ${FR}`; ctx.fillStyle='rgba(255,255,255,0.40)';
      ctx.fillText(c.bar.sub, lx+bW+10, cy+65);
    } else {
      ctx.font=`bold ${c.vs}px ${FR}`; ctx.fillStyle=c.vc;
      ctx.fillText(c.val, lx, cy+50);
      if (c.sub2) {
        ctx.font=`normal 12px ${FR}`; ctx.fillStyle='rgba(255,255,255,0.30)';
        ctx.textAlign='right';
        ctx.fillText(c.sub2, IX+IW-16, cy+cH/2+6);
        ctx.textAlign='left';
      }
    }
    cy += cH + GAP;
  }

  const tY = cy, tH = 64;
  const tW = (IW - 4*9) / 5;
  (data.times||[]).forEach((t, i) => {
    const tx = IX + i*(tW+9);
    glass(ctx, tx, tY, tW, tH, 16, 'rgba(77,163,255,.06)', 'rgba(77,163,255,.22)');
    ctx.font=`bold 11px ${FB}`; ctx.fillStyle='rgba(255,255,255,0.28)';
    ctx.textAlign='center';
    ctx.fillText(t.flag, tx+tW/2, tY+18);
    ctx.font=`bold 13px ${FB}`; ctx.fillStyle='rgba(180,220,255,.80)';
    ctx.fillText(t.city, tx+tW/2, tY+35);
    ctx.font=`bold 15px ${FR}`; ctx.fillStyle='#48ffd5';
    ctx.fillText(t.time, tx+tW/2, tY+55);
    ctx.textAlign='left';
  });

  // ── شريط المعلومات (IP + Packages فقط — بدون أسماء) ──
  const iY = tY + tH + 9;
  glass(ctx, IX, iY, IW, 56, 18, 'rgba(255,255,255,.04)', 'rgba(255,255,255,.11)');

  const col1 = IX+16, col2 = IX + IW/2 + 10;
  ctx.font=`bold 12px ${FB}`; ctx.fillStyle='rgba(255,255,255,0.28)'; ctx.textAlign='left';
  ctx.fillText('IP SERVER', col1, iY+18);
  ctx.font=`normal 14px ${FR}`; ctx.fillStyle='rgba(130,210,255,.88)';
  ctx.fillText(sv(data.serverIP), col1, iY+38);

  ctx.font=`bold 12px ${FB}`; ctx.fillStyle='rgba(255,255,255,0.28)';
  ctx.fillText('PACKAGES', col2, iY+18);
  ctx.font=`normal 14px ${FR}`; ctx.fillStyle='rgba(210,160,255,.88)';
  ctx.fillText(sv(data.depCount) + ' deps  ·  ' + sv(data.devDepCount) + ' dev', col2, iY+38);

  // ── الفوتر ──
  ctx.font=`bold 13px ${FB}`; ctx.fillStyle='rgba(255,255,255,0.22)';
  ctx.textAlign='center';
  ctx.fillText('PREFIX: ' + sv(data.prefix) + '  •  ' + sv(data.botName) + '  •  Node.js ' + process.version, W/2, MY+MH-14);
  ctx.textAlign='left';

  return canvas.toBuffer('image/png');
}

module.exports = { makeCard };
