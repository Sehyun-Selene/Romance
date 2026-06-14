// P4 — 일정 추가
// phase 'time'     : 기상/취침 시간 입력 (커스텀 베이지 드롭다운) → "다음으로"
// phase 'schedule' : 타임테이블 드래그로 일정 추가 + 오른쪽 목록 → 일정 확정 → 난이도 모달
// 새벽 취침(취침<기상) 지원. 난이도 선택 즉시 다음 단계.

const CLOCK_SVG = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#6b6253" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

const P4 = {
  inited: false,
  phase: 'time',
  timeVals: { wake: '07:00', sleep: '23:00' },
  timeEls: {},          // {wake, sleep} display divs
  dd: null, active: null,
  inName: null,
  modal: null,          // {type:'delete',id} | {type:'difficulty'} | {type:'addSchedule'}
  msg: '', msgAt: -99999,
  drag: { active: false, startIdx: -1, endIdx: -1, pendingStart: -1, pendingEnd: -1 },
  editBackup: null,     // 수정 중 원본 백업 (취소 시 복원)
  tt: { x: 120, y: 160, w: 290, bottom: 715 },
};

// ── 시간 유틸 ──
function timeToMin(t) { if (!t) return null; const p = t.split(':'); return (+p[0]) * 60 + (+p[1]); }
function minToTime(m) { const mm = ((m % 1440) + 1440) % 1440; return nf(floor(mm / 60), 2) + ':' + nf(mm % 60, 2); }
function from24(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h < 12 ? '오전' : '오후';
  let h12 = h % 12; if (h12 === 0) h12 = 12;
  return { ampm, h12, m };
}
function to24(ampm, h12, m) { let h = h12 % 12; if (ampm === '오후') h += 12; return nf(h, 2) + ':' + nf(m, 2); }
function timeDisplay(hhmm) { const { ampm, h12, m } = from24(hhmm); return `${ampm} ${nf(h12, 2)}:${nf(m, 2)}`; }

function p4SetMsg(s) { P4.msg = s; P4.msgAt = millis(); }

function p4Reset() {
  if (!P4.inited) return;
  P4.phase = 'time';
  P4.timeVals = { wake: '07:00', sleep: '23:00' };
  P4.inName.value('');
  P4.modal = null; P4.msg = '';
  P4.drag = { active: false, startIdx: -1, endIdx: -1, pendingStart: -1, pendingEnd: -1 };
  P4.editBackup = null;
  p4CloseDropdown();
}

// ── 생성 ──
function p4Init() {
  if (P4.inited) return;
  const css = document.createElement('style');
  css.textContent = `
    .p4time { display:flex; align-items:center; justify-content:center; position:relative;
      cursor:pointer; color:#4a4138; font-family:'MapoFlowerIsland',sans-serif; user-select:none; }
    .p4time .p4clock { position:absolute; right:0.5em; top:50%; transform:translateY(-50%); display:flex; }
    .p4dd { position:absolute; background:#efe7d6; border:1px solid #cdbfa3; border-radius:0.7em;
      box-shadow:0 6px 18px rgba(0,0,0,0.18); padding:0.4em; display:flex; gap:0.2em; z-index:1000;
      font-family:'MapoFlowerIsland',sans-serif; }
    .p4dd-col { max-height:13em; overflow-y:auto; }
    .p4dd-item { padding:0.35em 0.9em; border-radius:0.4em; cursor:pointer; color:#4a4138; text-align:center; white-space:nowrap; }
    .p4dd-item:hover { background:#e0d5bf; }
    .p4dd-item.sel { background:#b8a98f; color:#fff; }
    .p4dd-col::-webkit-scrollbar { width:6px; }
    .p4dd-col::-webkit-scrollbar-thumb { background:#cdbfa3; border-radius:3px; }
  `;
  document.head.appendChild(css);

  for (const key of ['wake', 'sleep']) {
    const el = createDiv(`<span class="p4val"></span><span class="p4clock">${CLOCK_SVG}</span>`);
    el.addClass('p4time');
    el.elt.addEventListener('click', () => p4OpenDropdown(key));
    el.hide();
    P4.timeEls[key] = el;
  }

  P4.inName = createInput('', 'text');
  P4.inName.attribute('placeholder', '일정 이름을 입력하세요');
  P4.inName.elt.style.cssText = 'box-sizing:border-box;border:none;border-radius:10px;background:#f4f0e8;text-align:center;color:#4a4138;font-family:MapoFlowerIsland,sans-serif;outline:none;';
  P4.inName.hide();

  P4.dd = createDiv(''); P4.dd.addClass('p4dd'); P4.dd.hide();
  P4.dd.elt.addEventListener('click', e => {
    const it = e.target.closest('.p4dd-item'); if (!it || !P4.active) return;
    let { ampm, h12, m } = from24(P4.timeVals[P4.active]);
    if (it.dataset.col === 'ampm') ampm = it.dataset.val;
    else if (it.dataset.col === 'h') h12 = +it.dataset.val;
    else m = +it.dataset.val;
    P4.timeVals[P4.active] = to24(ampm, h12, m);
    p4RenderDropdown();
  });

  document.addEventListener('mousedown', e => {
    if (!P4.active) return;
    if (P4.dd.elt.contains(e.target)) return;
    const ael = P4.timeEls[P4.active];
    if (ael && ael.elt.contains(e.target)) return;
    p4CloseDropdown();
  });

  P4.inited = true;
}

// ── 커스텀 드롭다운 ──
function p4OpenDropdown(key) {
  if (appState.screen !== 4 || P4.phase !== 'time' || P4.modal) return;
  P4.active = key;
  p4RenderDropdown();
  P4.dd.elt.style.display = 'flex';
  p4PositionDropdown();
}
function p4CloseDropdown() { P4.active = null; if (P4.dd) P4.dd.hide(); }
function p4RenderDropdown() {
  if (!P4.active) return;
  const { ampm, h12, m } = from24(P4.timeVals[P4.active]);
  const col = (items, name, sel) => '<div class="p4dd-col">' +
    items.map(it => `<div class="p4dd-item${it.v === sel ? ' sel' : ''}" data-col="${name}" data-val="${it.v}">${it.t}</div>`).join('') + '</div>';
  const ampmItems = [{ v: '오전', t: '오전' }, { v: '오후', t: '오후' }];
  const hourItems = Array.from({ length: 12 }, (_, i) => ({ v: i + 1, t: nf(i + 1, 2) }));
  const minItems = [0, 10, 20, 30, 40, 50].map(x => ({ v: x, t: nf(x, 2) }));
  P4.dd.elt.innerHTML = col(ampmItems, 'ampm', ampm) + col(hourItems, 'h', h12) + col(minItems, 'm', m);
}
function p4PositionDropdown() {
  if (!P4.active) return;
  const el = P4.timeEls[P4.active];
  const r = el.elt.getBoundingClientRect();
  const sc = mainCanvas.elt.getBoundingClientRect().width / DW;
  P4.dd.elt.style.fontSize = (15 * sc) + 'px';
  const ddW = P4.dd.elt.offsetWidth;
  let left = r.right - ddW;
  if (left < 8) left = 8;
  P4.dd.position(left + window.scrollX, r.bottom + window.scrollY + 4);
}

// ── 타임테이블 재생성 ──
function rebuildTimetable() {
  const wake = timeToMin(appState.wakeTime);
  let sleep = timeToMin(appState.sleepTime);
  if (sleep === null || wake === null) { appState.timetable = []; return; }
  if (sleep <= wake) sleep += 1440;
  const slots = [];
  for (let m = wake, i = 0; m < sleep; m += 30, i++) {
    slots.push({ index: i, minutes: m, time: minToTime(m), status: 'empty', label: '', missionId: null, scheduleId: null });
  }
  for (const s of appState.schedules) {
    for (const slot of slots) {
      if (slot.minutes < s.endMin && slot.minutes + 30 > s.startMin) {
        slot.status = 'schedule'; slot.label = s.name; slot.scheduleId = s.id;
      }
    }
  }
  for (const cm of appState.chosenMissions) {
    const slot = slots.find(sl => sl.minutes === cm.slotMinutes);
    if (slot) { slot.status = 'romance'; slot.label = cm.text; slot.missionId = cm.id; }
  }
  appState.timetable = slots;
}

// ── 드래그 ──
function p4SlotAtMouse() {
  const { x, y, w, bottom } = P4.tt;
  if (mouseX < x || mouseX > x + w || mouseY < y || mouseY > bottom) return -1;
  const slots = appState.timetable;
  if (!slots.length) return -1;
  const slotH = (bottom - y) / slots.length;
  return constrain(floor((mouseY - y) / slotH), 0, slots.length - 1);
}
function p4OnPress() {
  if (appState.screen !== 4 || P4.phase !== 'schedule' || P4.modal) return;
  const idx = p4SlotAtMouse();
  if (idx >= 0 && appState.timetable[idx]?.status === 'empty') {
    P4.drag.active = true; P4.drag.startIdx = idx; P4.drag.endIdx = idx;
  }
}
function p4OnDrag() {
  if (!P4.drag.active) return;
  const idx = p4SlotAtMouse();
  if (idx >= 0) P4.drag.endIdx = idx;
}
function p4OnRelease() {
  if (!P4.drag.active) return;
  P4.drag.active = false;
  const s = min(P4.drag.startIdx, P4.drag.endIdx);
  const e = max(P4.drag.startIdx, P4.drag.endIdx);
  if (s < 0 || e < 0) return;
  const allEmpty = appState.timetable.slice(s, e + 1).every(sl => sl.status === 'empty');
  if (allEmpty) {
    P4.drag.pendingStart = s; P4.drag.pendingEnd = e;
    P4.modal = { type: 'addSchedule' }; P4.inName.value('');
  } else p4SetMsg('이미 채워진 시간을 포함하고 있어요');
  P4.drag.startIdx = -1; P4.drag.endIdx = -1;
}

// ── DOM 동기화 ──
function p4OnFrame() {
  if (!P4.inited) return;
  const hideAll = () => { P4.timeEls.wake.hide(); P4.timeEls.sleep.hide(); P4.inName.hide(); };
  if (appState.screen !== 4) { hideAll(); if (P4.active) p4CloseDropdown(); P4.drag.active = false; return; }

  const rect = mainCanvas.elt.getBoundingClientRect();
  const sc = rect.width / DW;
  const place = (el, dx, dy, dw, dh, disp) => {
    el.elt.style.display = disp || 'block';
    el.position(rect.left + window.scrollX + dx * sc, rect.top + window.scrollY + dy * sc);
    el.size(dw * sc, dh * sc);
    el.style('font-size', (16 * sc) + 'px');
  };

  if (P4.phase === 'time' && !P4.modal) {
    P4.inName.hide();
    appState.wakeTime = P4.timeVals.wake;
    appState.sleepTime = P4.timeVals.sleep;
    P4.timeEls.wake.elt.querySelector('.p4val').textContent = timeDisplay(P4.timeVals.wake);
    P4.timeEls.sleep.elt.querySelector('.p4val').textContent = timeDisplay(P4.timeVals.sleep);
    place(P4.timeEls.wake, 617, 330, 313, 34, 'flex');
    place(P4.timeEls.sleep, 617, 393, 313, 34, 'flex');
  } else if (P4.modal?.type === 'addSchedule') {
    P4.timeEls.wake.hide(); P4.timeEls.sleep.hide();
    const my = DH / 2 - 110;
    place(P4.inName, DW / 2 - 190, my + 88, 380, 40);
    P4.inName.style('font-size', (17 * sc) + 'px');
  } else {
    hideAll();
    if (P4.active) p4CloseDropdown();
  }

  if (P4.active) {
    if (P4.timeEls[P4.active].elt.style.display === 'none') p4CloseDropdown();
    else p4PositionDropdown();
  }
}

// ── 메인 ──
function drawPage4() {
  image(bgPostcard, 0, 0, DW, DH);
  drawHeader();
  centerTitle('오늘의 일정은 어떻게 되나요?', 95);
  if (P4.phase === 'time') p4DrawTimePhase();
  else p4DrawSchedulePhase();
  p4DrawMsg();
  if (P4.modal) p4DrawModal();
}

// ── phase 1 ──
function p4DrawTimePhase() {
  push();
  fill(COLORS.inkSoft); textFont(fontBody); textSize(18); textAlign(CENTER, CENTER);
  text('기상 시간과 취침 시간을 입력해주세요.', DW / 2, 155);
  pop();
  p4Panel(DW / 2 - 310, 300, 620, 165);
  p4Pill('오늘의 기상 시간', DW / 2 - 290, 330, 580);
  p4Pill('오늘의 취침 시간', DW / 2 - 290, 393, 580);
  drawButton('다음으로', DW / 2, 525, 150, 46, p4ConfirmTime);
}
function p4ConfirmTime() {
  const wake = timeToMin(P4.timeVals.wake);
  let sleep = timeToMin(P4.timeVals.sleep);
  if (sleep <= wake) sleep += 1440;
  if (sleep - wake > 1440) { p4SetMsg('하루는 최대 24시간입니다'); return; }
  if (sleep - wake < 30) { p4SetMsg('기상~취침이 너무 짧아요'); return; }
  appState.wakeTime = P4.timeVals.wake;
  appState.sleepTime = P4.timeVals.sleep;
  rebuildTimetable();
  p4CloseDropdown();
  P4.phase = 'schedule';
  p4SetMsg('');
}

// ── phase 2 ──
function p4DrawSchedulePhase() {
  if (P4.modal) { p4DrawTimetable(false); return; }
  p4DrawTimetable(true);

  const rx = 460, ry = 155, rw = 790;
  push();
  noStroke(); fill('#f4f0e8'); rect(rx, ry, rw, 90, 10);
  noFill(); stroke(COLORS.line); strokeWeight(1); rect(rx, ry, rw, 90, 10);
  fill(COLORS.ink); textFont(fontHeading); textSize(17); textAlign(CENTER, CENTER);
  if (P4.drag.active && P4.drag.startIdx >= 0) {
    const s = min(P4.drag.startIdx, P4.drag.endIdx), e = max(P4.drag.startIdx, P4.drag.endIdx);
    const slots = appState.timetable;
    const t1 = slots[s]?.time || '';
    const t2 = e + 1 < slots.length ? slots[e + 1].time : appState.sleepTime;
    text(`${t1}  →  ${t2}`, rx + rw / 2, ry + 45);
  } else {
    fill(COLORS.inkSoft); textFont(fontBody); textSize(15);
    text('타임라인을 드래그해서 일정을 추가하세요', rx + rw / 2, ry + 38);
    fill(150, 110, 70); textSize(13);
    text('과유불급 — 생산적인 하루도 좋지만, 쉬어갈 수 있는 틈도 필요해요.', rx + rw / 2, ry + 62);
  }
  pop();

  push();
  noStroke(); fill('#f4f0e8'); rect(rx, ry + 100, rw, 380, 10);
  noFill(); stroke(COLORS.line); strokeWeight(1); rect(rx, ry + 100, rw, 380, 10);
  fill(COLORS.ink); textFont(fontHeading); textSize(15); textAlign(LEFT, TOP); noStroke();
  text('추가된 일정', rx + 20, ry + 116);
  stroke(COLORS.line); strokeWeight(0.8); line(rx + 20, ry + 136, rx + rw - 20, ry + 136);
  if (appState.schedules.length === 0) {
    noStroke(); fill(COLORS.inkSoft); textFont(fontBody); textSize(14); textAlign(CENTER, CENTER);
    text('아직 추가된 일정이 없어요', rx + rw / 2, ry + 280);
  } else {
    const itemH = 48, startY = ry + 144;
    appState.schedules.forEach((s, k) => {
      const iy = startY + k * itemH;
      if (iy + itemH > ry + 470) return;
      noStroke(); fill(scheduleColor(s.id)); rect(rx + 16, iy + 4, rw - 70, itemH - 8, 8);   // D-1 명도차
      fill(COLORS.ink); textFont(fontBody); textSize(15); textAlign(LEFT, CENTER);
      text(`${minToTime(s.startMin)}  ~  ${minToTime(s.endMin)}   ${s.name}`, rx + 30, iy + itemH / 2);
      noStroke(); fill(COLORS.btn); rect(rx + rw - 52, iy + 8, 32, 32, 6);
      fill(COLORS.ink); textFont(fontBody); textSize(16); textAlign(CENTER, CENTER);
      text('×', rx + rw - 36, iy + itemH / 2);
      // 항목 본체 클릭 → 수정/삭제 모달 (D-4), × 는 바로 삭제
      _buttons.push({ x: rx + 16, y: iy + 4, w: rw - 70, h: itemH - 8, onClick: () => { P4.modal = { type: 'editSchedule', id: s.id }; } });
      _buttons.push({ x: rx + rw - 54, y: iy + 6, w: 36, h: 36, onClick: () => { P4.modal = { type: 'delete', id: s.id }; } });
    });
  }
  pop();

  drawButton('시간 다시 입력', 760, 715, 160, 44, () => { p4CloseDropdown(); P4.phase = 'time'; });
  drawButton('일정 확정하기', 980, 715, 180, 44, () => { P4.modal = { type: 'difficulty' }; });
}

// ── 타임테이블 ──
function p4DrawTimetable(interactive) {
  const { x, y, w, bottom } = P4.tt;
  push();
  fill(COLORS.ink); textFont(fontHeading); textSize(16); textAlign(CENTER, BOTTOM);
  text('타임라인', x + w / 2, y - 10);
  const slots = appState.timetable;
  if (!slots.length) { pop(); return; }
  const slotH = (bottom - y) / slots.length;
  noStroke(); fill('#f4f0e8'); rect(x - 56, y - 6, w + 62, (bottom - y) + 14, 6);

  // 드래그 선택 OR addSchedule 모달 대기 구간 → 노랑 유지 (D-3)
  const selIdxs = new Set();
  if (P4.drag.active && P4.drag.startIdx >= 0) {
    const ds = min(P4.drag.startIdx, P4.drag.endIdx), de = max(P4.drag.startIdx, P4.drag.endIdx);
    for (let i = ds; i <= de; i++) selIdxs.add(i);
  } else if (P4.modal?.type === 'addSchedule' && P4.drag.pendingStart >= 0) {
    for (let i = P4.drag.pendingStart; i <= P4.drag.pendingEnd; i++) selIdxs.add(i);
  }

  textFont(fontBody);
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const sy = y + i * slotH;
    noStroke();
    if (selIdxs.has(i)) fill(COLORS.slotYellow);
    else if (slot.status === 'romance') fill(COLORS.slotYellow);
    else if (slot.status === 'schedule') fill(scheduleColor(slot.scheduleId));   // D-1 명도차
    else fill(COLORS.slotEmpty);
    rect(x, sy, w, slotH);
    stroke(COLORS.line); strokeWeight(0.5); line(x, sy, x + w, sy);
    if (i % 2 === 0) {
      noStroke(); fill(COLORS.inkSoft); textSize(11); textAlign(RIGHT, CENTER);
      text(slot.time, x - 8, sy);
    }
  }
  stroke(COLORS.line); strokeWeight(0.5); line(x, bottom, x + w, bottom);
  noStroke(); fill(COLORS.inkSoft); textSize(11); textAlign(RIGHT, CENTER);
  text(appState.sleepTime, x - 8, bottom);

  let i = 0;
  while (i < slots.length) {
    const s = slots[i];
    if (s.status === 'schedule') {
      let j = i;
      while (j + 1 < slots.length && slots[j + 1].scheduleId === s.scheduleId) j++;
      const topY = y + i * slotH, botY = y + (j + 1) * slotH;
      noStroke(); fill(COLORS.ink); textFont(fontBody); textSize(16); textAlign(CENTER, CENTER);
      text(s.label, x + w / 2, (topY + botY) / 2);
      // D-4: 일정 블록 클릭 → 수정/삭제 모달
      if (interactive) {
        const sid = s.scheduleId;
        _buttons.push({ x, y: topY, w, h: botY - topY, onClick: () => { P4.modal = { type: 'editSchedule', id: sid }; } });
      }
      i = j + 1;
    } else i++;
  }
  pop();
}

// ── 헬퍼 ──
function p4Panel(x, y, w, h) {
  push(); noStroke(); fill('#f4f0e8'); rect(x, y, w, h, 14);
  noFill(); stroke(COLORS.line); strokeWeight(1.2); rect(x, y, w, h, 14); pop();
}
function p4Pill(label, x, y, w) {
  push();
  noStroke(); fill(COLORS.slotEmpty); rect(x, y, w, 34, 17);
  fill(COLORS.ink); textFont(fontBody); textSize(15); textAlign(CENTER, CENTER);
  text(label, x + w * 0.23, y + 17);
  stroke(COLORS.line); strokeWeight(1); line(x + w * 0.46, y + 8, x + w * 0.46, y + 26);
  pop();
}
function p4DrawMsg() {
  if (!P4.msg || millis() - P4.msgAt > 2600) return;
  const a = map(sin(frameCount * 0.18), -1, 1, 120, 255);
  push();
  fill(150, 60, 50, a); textFont(fontBody); textSize(16); textAlign(CENTER, CENTER);
  const my = P4.phase === 'time' ? 575 : 760;
  text(P4.msg, DW / 2, my);
  pop();
}

// ── 모달 ──
function p4DrawModal() {
  push();
  fill(0, 0, 0, 90); rect(0, 0, DW, DH);

  if (P4.modal.type === 'addSchedule') {
    const mw = 520, mh = 220, mx = DW / 2 - mw / 2, my = DH / 2 - mh / 2;
    noStroke(); fill('#f3efe7'); rect(mx, my, mw, mh, 16);
    const s = P4.drag.pendingStart, e = P4.drag.pendingEnd;
    const slots = appState.timetable;
    const t1 = slots[s]?.time || '';
    const t2 = e + 1 < slots.length ? slots[e + 1].time : appState.sleepTime;
    fill(COLORS.ink); textFont(fontHeading); textSize(18); textAlign(CENTER, CENTER);
    text(`${t1} ~ ${t2}`, DW / 2, my + 42);
    fill(COLORS.inkSoft); textFont(fontBody); textSize(14);
    text('일정 이름을 입력해주세요', DW / 2, my + 68);
    // inName DOM은 my+88 위치 (p4OnFrame), 버튼은 충분히 아래
    drawButton('취소', DW / 2 - 80, my + 170, 120, 42, () => {
      if (P4.editBackup) { appState.schedules.push(P4.editBackup); P4.editBackup = null; rebuildTimetable(); }
      P4.modal = null; P4.drag.pendingStart = -1; P4.drag.pendingEnd = -1; P4.inName.value('');
    });
    drawButton('추가하기', DW / 2 + 80, my + 170, 120, 42, p4AddSchedule);

  } else if (P4.modal.type === 'editSchedule') {
    const sch = appState.schedules.find(s => s.id === P4.modal.id);
    const mw = 460, mh = 210, mx = DW / 2 - mw / 2, my = DH / 2 - mh / 2;
    noStroke(); fill('#f3efe7'); rect(mx, my, mw, mh, 16);
    fill(COLORS.ink); textFont(fontHeading); textSize(19); textAlign(CENTER, CENTER);
    text(sch ? sch.name : '일정', DW / 2, my + 48);
    fill(COLORS.inkSoft); textFont(fontBody); textSize(13);
    text(sch ? `${minToTime(sch.startMin)} ~ ${minToTime(sch.endMin)}` : '', DW / 2, my + 76);
    drawButton('수정', DW / 2 - 130, my + 150, 110, 44, () => p4StartEditSchedule(P4.modal.id));
    drawButton('삭제', DW / 2, my + 150, 110, 44, () => {
      appState.schedules = appState.schedules.filter(s => s.id !== P4.modal.id);
      rebuildTimetable(); P4.modal = null;
    });
    drawButton('취소', DW / 2 + 130, my + 150, 110, 44, () => { P4.modal = null; });

  } else if (P4.modal.type === 'delete') {
    const mw = 460, mh = 200, mx = DW / 2 - mw / 2, my = DH / 2 - mh / 2;
    noStroke(); fill('#f3efe7'); rect(mx, my, mw, mh, 16);
    fill(COLORS.ink); textFont(fontHeading); textSize(20); textAlign(CENTER, CENTER);
    text('이 일정을 삭제하시겠습니까?', DW / 2, my + 70);
    drawButton('예', DW / 2 - 80, my + 145, 110, 44, () => {
      appState.schedules = appState.schedules.filter(s => s.id !== P4.modal.id);
      rebuildTimetable(); P4.modal = null;
    });
    drawButton('아니오', DW / 2 + 80, my + 145, 110, 44, () => { P4.modal = null; });

  } else if (P4.modal.type === 'difficulty') {
    const mw = 520, mh = 200, mx = DW / 2 - mw / 2, my = DH / 2 - mh / 2;
    noStroke(); fill('#f3efe7'); rect(mx, my, mw, mh, 16);
    fill(COLORS.ink); textFont(fontHeading); textSize(19); textAlign(CENTER, CENTER);
    text('오늘 하루 일정의 난이도는 어떤가요?', DW / 2, my + 55);
    fill(COLORS.inkSoft); textFont(fontBody); textSize(13);
    text('선택하면 바로 다음 단계로 넘어갑니다', DW / 2, my + 80);

    const opts = ['여유로워요', '보통이에요', '힘들어요'];
    opts.forEach((o, k) => {
      const ox = DW / 2 + (k - 1) * 155, oy = my + 145, ow = 138, oh = 50;
      const over = mouseInRect(ox - ow / 2, oy - oh / 2, ow, oh);   // #5 호버
      push(); rectMode(CENTER); noStroke();
      fill(over ? COLORS.slotBeige : COLORS.btn); rect(ox, oy, ow, oh, 10);
      fill(over ? '#fff' : COLORS.ink); textFont(fontHeading); textSize(16); textAlign(CENTER, CENTER);
      text(o, ox, oy); pop();
      _buttons.push({ x: ox - ow / 2, y: oy - oh / 2, w: ow, h: oh, onClick: () => {
        appState.dayDifficulty = o;
        P4.modal = null;
        if (typeof p5EmptyBlocks === 'function' && p5EmptyBlocks().length === 0 && appState.chosenMissions.length > 0) {
          P6.inited = false; goTo(6);
        } else goTo(5);
      }});
    });
    // #4: 뒤로가기 버튼 제거 (모달 밖 클릭으로 닫기)
    _buttons.push({ x: 0, y: 0, w: DW, h: my, onClick: () => { P4.modal = null; } });
    _buttons.push({ x: 0, y: my + mh, w: DW, h: DH - (my + mh), onClick: () => { P4.modal = null; } });
  }
  pop();
}

// ── 일정 수정: 삭제 후 그 구간을 pending으로 잡아 addSchedule 모달 재사용 (이름 prefill) ──
function p4StartEditSchedule(id) {
  const sch = appState.schedules.find(s => s.id === id);
  if (!sch) { P4.modal = null; return; }
  const name = sch.name, startMin = sch.startMin, endMin = sch.endMin;
  P4.editBackup = { id, startMin, endMin, name };   // 취소 시 복원용
  appState.schedules = appState.schedules.filter(s => s.id !== id);
  rebuildTimetable();
  const slots = appState.timetable;
  const sIdx = slots.findIndex(sl => sl.minutes === startMin);
  let eIdx = sIdx;
  for (let k = sIdx; k < slots.length; k++) { if (slots[k].minutes + 30 <= endMin) eIdx = k; else break; }
  if (sIdx < 0) { P4.modal = null; return; }
  P4.drag.pendingStart = sIdx; P4.drag.pendingEnd = eIdx;
  P4.inName.value(name);
  P4.modal = { type: 'addSchedule' };
}

// ── 일정 추가 ──
function p4AddSchedule() {
  const name = (P4.inName.value() || '').trim();
  if (!name) { p4SetMsg('일정 이름을 입력해주세요'); return; }
  const s = P4.drag.pendingStart, e = P4.drag.pendingEnd;
  if (s < 0 || e < 0) { P4.modal = null; return; }
  const slots = appState.timetable;
  const startMin = slots[s].minutes;
  let endMin;
  if (e + 1 < slots.length) endMin = slots[e + 1].minutes;
  else { let sl = timeToMin(appState.sleepTime); if (sl <= timeToMin(appState.wakeTime)) sl += 1440; endMin = sl; }
  const newId = P4.editBackup ? P4.editBackup.id : ++appState.scheduleSeq;   // 수정이면 원래 id 유지
  appState.schedules.push({ id: newId, startMin, endMin, name });
  rebuildTimetable();
  P4.editBackup = null;
  P4.modal = null;
  P4.drag.pendingStart = -1; P4.drag.pendingEnd = -1;
  p4SetMsg('');
}
