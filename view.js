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
    const sb = document.getElementById('vsave'); if (sb) sb.style.display = 'none';
    noCanvas(); noLoop(); return;
  }
  VS = data;
  fillDOM();
  const cont = document.getElementById('postcard-container');
  const cw = cont.offsetWidth, ch = round(cw * 0.66);
  vCnv = createCanvas(cw, ch); vCnv.parent(cont);
  noLoop();
  // H-4: 엽서 PNG 저장 (고해상 버퍼 새로 그려 저장)
  const sb = document.getElementById('vsave');
  if (sb) sb.addEventListener('click', vSavePostcard);
}

// 고해상도(1250×825) 버퍼에 엽서만 그려 PNG 다운로드
function vSavePostcard() {
  const W = 1250, H = round(W * 0.66);
  const g = createGraphics(W, H);
  drawPostcardTo(g, W, H);
  saveCanvas(g, '일일산수_엽서_' + (VS.nickname || ''), 'png');
  g.remove();
}

function windowResized() {
  if (!VS) return;
  const cont = document.getElementById('postcard-container');
  const cw = cont.offsetWidth, ch = round(cw * 0.66);
  resizeCanvas(cw, ch);   // 자동 redraw
}

function draw() {
  if (!VS) return;
  drawPostcardTo(window, width, height);
}

// ── 엽서(산수화) — g: 메인은 window, 저장은 p5.Graphics ──
function drawPostcardTo(g, cw, ch) {
  g.background('#f4f0e8');
  g.push(); g.tint(255, 65); g.image(bgPostcard, 0, 0, cw, ch); g.noTint(); g.pop();

  const ms = VS.chosenMissions;
  const total = ms.length || 1;

  let lastLayout = null;
  for (let ci = 0; ci < ms.length; ci++) {
    const m = ms[ci], dr = m.drawRandom;
    const img = getMountain(m.mountainKey);
    if (!img) continue;
    const layout = mountainLayout(ci, total, cw, ch, dr);
    lastLayout = layout;
    g.push();
    g.translate(layout.cx, layout.cy);
    g.rotate(radians(dr.rotation));
    g.imageMode(CENTER);
    g.image(img, 0, 0, layout.w, layout.h);
    g.imageMode(CORNER);
    g.pop();
  }

  if (ms.length && lastLayout) {
    const rw = cw * 0.13, rh = rw * 0.66;
    g.push(); g.imageMode(CENTER); g.image(rabbits.still, lastLayout.cx, ch - rh * 0.55, rw, rh); g.imageMode(CORNER); g.pop();
  }

  g.noFill(); g.stroke('#bdb4a4'); g.strokeWeight(1.2); g.rect(0, 0, cw, ch, 4);
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
