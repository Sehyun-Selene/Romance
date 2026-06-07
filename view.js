// 나의 일일산수 — 공유 링크 뷰 (읽기전용, 폰 세로)
// 엽서(산수화)는 p5 캔버스, 나머지(날짜·글귀·목록)는 HTML DOM.

let VS = null;        // 디코드된 공유 상태
let vCnv = null;

function minToTimeV(m) { const mm = ((m % 1440) + 1440) % 1440; return nf(floor(mm / 60), 2) + ':' + nf(mm % 60, 2); }

function preload() { preloadAssets(); }

function setup() {
  const s = new URLSearchParams(location.search).get('s');
  let data = null;
  try { if (s) data = decodeShareState(s); } catch (e) { data = null; }
  if (!data || !data.chosenMissions) {
    document.getElementById('verror').textContent = '엽서 링크를 불러올 수 없어요.';
    document.getElementById('postcard-container').style.display = 'none';
    noCanvas(); noLoop(); return;
  }
  VS = data;
  fillDOM();
  const cont = document.getElementById('postcard-container');
  const cw = cont.offsetWidth, ch = round(cw * 0.66);
  vCnv = createCanvas(cw, ch); vCnv.parent(cont);
  noLoop();
}

function windowResized() {
  if (!VS) return;
  const cont = document.getElementById('postcard-container');
  const cw = cont.offsetWidth, ch = round(cw * 0.66);
  resizeCanvas(cw, ch);   // 자동 redraw
}

function draw() {
  if (!VS) return;
  drawPostcard(width, height);
}

// ── 엽서(산수화) ──
function drawPostcard(cw, ch) {
  background('#f4f0e8');
  push(); tint(255, 65); image(bgPostcard, 0, 0, cw, ch); noTint(); pop();

  const ms = VS.chosenMissions;
  const total = ms.length || 1;
  const colW = cw / total;
  const baseline = ch * 0.86;
  const mtnW = constrain(colW * 1.15, cw * 0.28, cw * 0.95);
  const mtnH = min(mtnW / 1.5, ch * 0.92);
  const sx = cw / 625;   // 디자인 공간 → 캔버스 스케일

  for (let ci = 0; ci < ms.length; ci++) {
    const m = ms[ci], dr = m.drawRandom;
    const img = getMountain(m.mountainKey);
    if (!img) continue;
    const cx = ci * colW + colW / 2 + dr.offsetX * sx;
    const cy = baseline - mtnH / 2 + dr.offsetY * sx;
    push(); translate(cx, cy); rotate(radians(dr.rotation)); imageMode(CENTER);
    image(img, 0, 0, mtnW * dr.scale, mtnH * dr.scale); imageMode(CORNER); pop();
  }

  // 토끼 — 마지막 산 위 정지
  if (ms.length) {
    const rw = cw * 0.13, rh = rw * 0.66;
    const rx = (ms.length - 0.5) * colW;
    push(); imageMode(CENTER); image(rabbits.still, rx, baseline - rh * 0.4, rw, rh); imageMode(CORNER); pop();
  }

  noFill(); stroke('#bdb4a4'); strokeWeight(1.2); rect(0, 0, cw, ch, 4);
}

// ── DOM 채우기 ──
function fillDOM() {
  document.getElementById('vdate').textContent = VS.date || '';
  document.getElementById('vnick').textContent = VS.nickname || '관람객';

  const q = VS.quote;
  document.getElementById('vquote').textContent =
    q ? (q.type === '시조' && q.source ? `${q.text} (${q.source})` : q.text) : '';

  // 오늘을 채운 낭만
  const rom = document.getElementById('vromance');
  rom.innerHTML = '';
  if (!VS.chosenMissions.length) {
    rom.innerHTML = '<li>채운 낭만이 없어요</li>';
  } else {
    for (const m of VS.chosenMissions) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${escapeHTML(m.text)}</span><span class="badge">낭만</span>`;
      rom.appendChild(li);
    }
  }

  // 오늘의 할 일 (일정 + 낭만, 시간순)
  const items = [];
  for (const s of VS.schedules) items.push({ t: s.startMin, name: s.name, rom: false });
  for (const m of VS.chosenMissions) items.push({ t: m.slotMinutes, name: m.text, rom: true });
  items.sort((a, b) => a.t - b.t);

  const todo = document.getElementById('vtodo');
  todo.innerHTML = '';
  if (!items.length) { todo.innerHTML = '<li>일정이 없어요</li>'; }
  for (const it of items) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="chk">✓</span><span class="time">${minToTimeV(it.t)}</span>` +
      `<span>${escapeHTML(it.name)}</span>` + (it.rom ? '<span class="badge">낭만</span>' : '');
    todo.appendChild(li);
  }
}

function escapeHTML(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
