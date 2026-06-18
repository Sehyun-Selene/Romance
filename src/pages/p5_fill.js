// P5 — 빈 시간을 낭만으로 채우기 (PRD §3 Page 5)
// 빈 블록 클릭 → 추천 4개 → 선택+추가 → 베이지(노랑)+산 할당
// 모두 채우면: 타임라인 중앙 이동 + 오른쪽에 "낭만 확정하기" 버튼
// 채운 낭만 블록 재클릭 → 되돌려서 다시 선택 가능

const P5 = {
  selectedBlock: null,
  candidates: [],
  chosen: null,
  hoverTip: null,
  candidateCache: {},
  editMode: false,
};

function p5Reset() {
  P5.selectedBlock = null;
  P5.candidates = [];
  P5.chosen = null;
  P5.hoverTip = null;
  P5.candidateCache = {};
  P5.editMode = false;
}

function p5BlockKey(block) {
  return block ? block.slotIndices.join('-') : '';
}

function p5SelectBlock(block) {
  if (!block) return;
  const key = p5BlockKey(block);
  if (P5.selectedBlock && p5BlockKey(P5.selectedBlock) === key) return;
  P5.selectedBlock = block;
  if (!P5.candidateCache[key]) {
    const startMin = appState.timetable[block.slotIndices[0]].minutes;
    P5.candidateCache[key] = recommendMissions(min(block.durationMin, 180), startMin);
  }
  P5.candidates = P5.candidateCache[key].slice();
  P5.chosen = null;
}

// 수동 줄바꿈 (카드 세로 중앙 정렬용)
function p5WrapLines(str, maxW) {
  const words = str.split(' ');
  const lines = []; let cur = '';
  for (const wd of words) {
    const test = cur ? cur + ' ' + wd : wd;
    if (textWidth(test) > maxW && cur) { lines.push(cur); cur = wd; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function p5EmptyBlocks() {
  const slots = appState.timetable;
  const blocks = [];
  let i = 0;
  while (i < slots.length) {
    if (slots[i].status === 'empty') {
      let j = i;
      while (j + 1 < slots.length && slots[j + 1].status === 'empty') j++;
      blocks.push({ slotIndices: Array.from({ length: j - i + 1 }, (_, k) => i + k), durationMin: (j - i + 1) * 30 });
      i = j + 1;
    } else i++;
  }
  return blocks;
}
function p5FindBlock(idx) {
  return p5EmptyBlocks().find(b => b.slotIndices.includes(idx)) || null;
}

// ── 메인 렌더 ──
function drawPage5() {
  image(bgPostcard, 0, 0, DW, DH);
  drawHeader();
  centerTitle('빈 시간을 눌러 낭만으로 채워보세요.', 95);

  const allFilled = p5EmptyBlocks().length === 0 && !P5.selectedBlock;

  // 타임라인 위치: 모두 채웠으면 중앙으로
  const tlx = allFilled ? 470 : 120;
  p5DrawTimetable(tlx);

  if (allFilled) {
    // 오른쪽 패널 박스 + 안내 + 확정 버튼
    push();
    noStroke(); fill('#f4f0e8'); rect(800, 280, 380, 260, 16);
    noFill(); stroke(COLORS.line); strokeWeight(1.2); rect(800, 280, 380, 260, 16);
    fill(COLORS.ink); textFont(fontHeading); textSize(22); textAlign(CENTER, CENTER);
    text('낭만으로 하루를\n가득 채웠어요', 990, 345);
    fill(COLORS.inkSoft); textFont(fontBody); textSize(14);
    text('수정하려는 낭만을 클릭해보세요.\n다시 고른 뒤 낭만 확정하기를 눌러주세요.', 990, 425);
    pop();
    drawButton('낭만 확정하기', 990, 495, 220, 52, () => goTo(6), -2);
  } else {
    p5DrawRightPanel();
    const emptyLeft = p5EmptyBlocks().length;
    if (emptyLeft > 0 && !P5.selectedBlock) {
      push(); textAlign(CENTER, CENTER);
      fill(COLORS.ink); textFont(fontHeading); textSize(16);
      text('', DW / 2 + 100, 748);
      fill(COLORS.inkSoft); textFont(fontBody); textSize(12);
      text(`(${emptyLeft}칸 남음)`, DW / 2 + 100, 768);
      pop();
    }
  }
  p5DrawTooltip();   // 최상단 호버 툴팁
}

// ── 타임테이블 ──
function p5DrawTimetable(tlx) {
  const x = tlx, y = 160, w = 290, bottom = 715;
  const slots = appState.timetable;
  if (!slots.length) return;
  const slotH = (bottom - y) / slots.length;

  push();
  fill(COLORS.ink); textFont(fontHeading); textSize(16); textAlign(CENTER, BOTTOM);
  text('타임라인', x + w / 2, y - 10);

  noStroke(); fill('#f4f0e8'); rect(x - 56, y - 6, w + 62, (bottom - y) + 14, 6);
  P5.hoverTip = null;   // 매 프레임 리셋 (F-3)

  const selIdxs = new Set(P5.selectedBlock ? P5.selectedBlock.slotIndices : []);

  textFont(fontBody);
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const sy = y + i * slotH;
    noStroke();
    if (selIdxs.has(i))                  fill(COLORS.slotYellow);
    else if (slot.status === 'romance')  fill(COLORS.slotYellow);
    else if (slot.status === 'schedule') fill(scheduleColor(slot.scheduleId));   // D-1 명도차
    else                                 fill(COLORS.slotEmpty);
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

  // 블록 라벨 + 클릭
  let i = 0;
  while (i < slots.length) {
    const s = slots[i];
    if (s.status !== 'empty') {
      let j = i;
      const sid = s.scheduleId || s.missionId;
      while (j + 1 < slots.length) {
        const ns = slots[j + 1];
        if (ns.status === s.status && (ns.scheduleId || ns.missionId) === sid) j++;
        else break;
      }
      const topY = y + i * slotH, botY = y + (j + 1) * slotH;
      const midY = (topY + botY) / 2;
      noStroke(); textAlign(CENTER, CENTER);
      if (s.status === 'romance') {
        const a = map(sin(frameCount * 0.12), -1, 1, 190, 255);
        fill(90, 72, 52, a);
        textFont(fontHeading); textSize(15);
        text('낭만', x + w / 2, midY);
        // 낭만 블록 재클릭 → 되돌려 재선택 (#8)
        const mid = s.missionId;
        _buttons.push({ x, y: topY, w, h: botY - topY, onClick: () => p5UndoRomance(mid) });
        // F-3: 호버 시 미션 텍스트 툴팁 (그리기는 drawPage5 끝에서 — 최상단)
        if (mouseInRect(x, topY, w, botY - topY)) P5.hoverTip = { mid, midY, rightX: x + w, topY: y, botY: bottom };
      } else {
        fill(COLORS.ink); textFont(fontBody); textSize(15);   // #6 라벨 크게
        text(s.label, x + w / 2, midY);
      }
      i = j + 1;
    } else {
      const block = p5FindBlock(i);
      if (block) {
        const j = block.slotIndices[block.slotIndices.length - 1];
        const topY = y + i * slotH, botY = y + (j + 1) * slotH;
        _buttons.push({
          x, y: topY, w, h: botY - topY,
          onClick: () => {
            p5SelectBlock(block);
          },
        });
        i = j + 1;
      } else i++;
    }
  }

  pop();
}

// F-3: 호버 툴팁 (최상단 — 패널 위에 그림)
function p5DrawTooltip() {
  if (!P5.hoverTip) return;
  const m = appState.chosenMissions.find(c => c.id === P5.hoverTip.mid);
  if (!m) return;
  push();
  const tw = 250, tx = P5.hoverTip.rightX + 10;
  textFont(fontBody); textSize(13);
  const lines = p5WrapLines(m.text, tw - 24);
  const th = 16 + lines.length * 19;
  const ty0 = constrain(P5.hoverTip.midY - th / 2, P5.hoverTip.topY, P5.hoverTip.botY - th);
  noStroke(); fill(74, 65, 56, 245); rect(tx, ty0, tw, th, 8);
  fill('#f4f0e8'); textAlign(LEFT, TOP);
  let ty = ty0 + 9;
  for (const ln of lines) { text(ln, tx + 12, ty); ty += 19; }
  pop();
}

// ── 낭만 블록 되돌리기 (#8) ──
function p5UndoRomance(mid) {
  const slots = appState.timetable;
  const idxs = [];
  for (let k = 0; k < slots.length; k++) if (slots[k].missionId === mid) idxs.push(k);
  if (!idxs.length) return;
  appState.chosenMissions = appState.chosenMissions.filter(c => c.id !== mid);
  for (const k of idxs) { slots[k].status = 'empty'; slots[k].label = ''; slots[k].missionId = null; }
  const block = { slotIndices: idxs, durationMin: idxs.length * 30 };
  delete P5.candidateCache[p5BlockKey(block)];
  p5SelectBlock(block);
}

// ── 오른쪽 추천 패널 ──
function p5DrawRightPanel() {
  const px = 450, py = 160, pw = 770, ph = 520;
  push();
  noStroke(); fill('#f4f0e8'); rect(px, py, pw, ph, 16);
  noFill(); stroke(COLORS.line); strokeWeight(1.2); rect(px, py, pw, ph, 16);

  if (!P5.selectedBlock) {
    fill(COLORS.inkSoft); textFont(fontBody); textSize(17); textAlign(CENTER, CENTER);
    text('왼쪽 타임라인에서\n빈 시간을 모두 눌러\n낭만으로 채워주세요.', px + pw / 2, py + ph / 2);
    pop(); return;
  }

  const dur = min(P5.selectedBlock.durationMin, 180);
  fill(COLORS.inkSoft); textFont(fontBody); textSize(14); textAlign(CENTER, TOP);
  text(`${dur}분짜리 빈 시간 — 어떤 낭만을 채울까요?`, px + pw / 2, py + 22);

  // F-1: 새로고침 버튼 (우상단)
  const rfx = px + pw - 36, rfy = py + 30;
  const rfOver = mouseInRect(rfx - 20, rfy - 20, 40, 40);
  push(); rectMode(CENTER); noStroke();
  fill(rfOver ? COLORS.slotBeige : COLORS.btn); ellipse(rfx, rfy, 40, 40);
  fill(rfOver ? '#fff' : COLORS.ink); textFont('serif'); textSize(22); textAlign(CENTER, CENTER);
  text('↻', rfx, rfy - 1);
  pop();
  _buttons.push({ x: rfx - 20, y: rfy - 20, w: 40, h: 40, onClick: p5Refresh });

  const cardW = pw - 60, baseCardH = 84, cardX = px + 30, lh = 22;
  let cy = py + 65;
  for (let k = 0; k < P5.candidates.length; k++) {
    const m = P5.candidates[k];
    textFont(fontHeading); textSize(15);
    const lines = p5WrapLines(m.text, cardW - 70);
    // 텍스트가 한 줄에 안 들어가면 칸 높이를 늘려 잘리지 않게 함
    const cardH = lines.length > 1 ? baseCardH + (lines.length - 1) * lh : baseCardH;
    const sel = P5.chosen === k;
    noStroke(); fill(sel ? COLORS.slotBeige : COLORS.slotEmpty);
    if (!sel && P5.chosen !== null) fill(220, 215, 205, 160);
    rect(cardX, cy, cardW, cardH, 10);

    noStroke();
    fill(sel ? COLORS.slotBeige : '#cdc4b4');
    ellipse(cardX + 24, cy + cardH / 2, 18, 18);
    if (sel) { fill('#fff'); ellipse(cardX + 24, cy + cardH / 2, 9, 9); }

    const fa = (!sel && P5.chosen !== null) ? 130 : 255;
    fill(red(color(COLORS.ink)), green(color(COLORS.ink)), blue(color(COLORS.ink)), fa);
    textFont(fontHeading); textSize(15); textAlign(LEFT, CENTER);
    let ty = cy + cardH / 2 - (lines.length - 1) * lh / 2;
    for (const ln of lines) { text(ln, cardX + 48, ty); ty += lh; }

    _buttons.push({ x: cardX, y: cy, w: cardW, h: cardH, onClick: () => { P5.chosen = k; } });
    cy += cardH + 10;
  }
  pop();

  drawButton('추가하기', px + pw / 2, py + ph - 34, 150, 46, p5AddMission, -2);
}

// ── F-1: 후보 새로고침 (직전 후보는 used에서 풀어 재추천 가능하게) ──
function p5Refresh() {
  if (!P5.selectedBlock) return;
  for (const c of P5.candidates) { if (!c.isRest) appState.usedMissionIds.delete(c.id); }
  const startMin = appState.timetable[P5.selectedBlock.slotIndices[0]].minutes;
  P5.candidates = recommendMissions(min(P5.selectedBlock.durationMin, 180), startMin);
  P5.candidateCache[p5BlockKey(P5.selectedBlock)] = P5.candidates.slice();
  P5.chosen = null;
}

// ── 낭만 추가 ──
function p5AddMission() {
  if (!P5.selectedBlock || P5.chosen === null) return;
  const mission = P5.candidates[P5.chosen];
  const slots = appState.timetable;
  const block = P5.selectedBlock;

  const entry = {
    id: mission.id,
    text: mission.text,
    category: mission.isRest ? '쉬기' : mission.category,
    difficulty: mission.difficulty,
    isRest: !!mission.isRest,
    slotMinutes: slots[block.slotIndices[0]].minutes,
    blockSlots: block.slotIndices,
    mountainKey: pickMountainKey(mission),
    drawRandom: { offsetX: random(-8, 8), offsetY: random(-6, 6), scale: random(0.94, 1.06), rotation: random(-2, 2) },
    checked: false,
  };
  appState.chosenMissions.push(entry);

  for (const idx of block.slotIndices) {
    slots[idx].status = 'romance';
    slots[idx].label = mission.text;
    slots[idx].missionId = mission.id;
  }

  P5.selectedBlock = null; P5.candidates = []; P5.chosen = null;
  P5.editMode = false;
}
