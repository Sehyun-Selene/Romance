// P5 — 빈 시간을 낭만으로 채우기 (PRD §3 Page 5)
// 빈 블록 클릭 → 추천 4개 → 선택+추가 → 베이지(노랑)+산 할당
// 모두 채우면: 타임라인 중앙 이동 + 오른쪽에 "낭만 확정하기" 버튼
// 채운 낭만 블록 재클릭 → 되돌려서 다시 선택 가능

const P5 = {
  selectedBlock: null,
  candidates: [],
  chosen: null,
};

function p5Reset() { P5.selectedBlock = null; P5.candidates = []; P5.chosen = null; }

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
    text('낭만 일정을 바꾸고 싶다면\n낭만 일정을 클릭해보세요!', 990, 425);
    pop();
    drawButton('낭만 확정하기', 990, 495, 220, 52, () => goTo(6));
  } else {
    p5DrawRightPanel();
    const emptyLeft = p5EmptyBlocks().length;
    if (emptyLeft > 0 && !P5.selectedBlock) {
      push();
      fill(COLORS.inkSoft); textFont(fontBody); textSize(13); textAlign(CENTER, CENTER);
      text(`빈 시간 ${emptyLeft}칸 남음`, DW / 2 + 100, 755);
      pop();
    }
  }
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

  const selIdxs = new Set(P5.selectedBlock ? P5.selectedBlock.slotIndices : []);

  textFont(fontBody);
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const sy = y + i * slotH;
    noStroke();
    if (selIdxs.has(i))                  fill(COLORS.slotYellow);
    else if (slot.status === 'romance')  fill(COLORS.slotYellow);
    else if (slot.status === 'schedule') fill(COLORS.slotBeige);
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
        const mid = s.missionId, ii = i, jj = j;
        _buttons.push({ x, y: topY, w, h: botY - topY, onClick: () => p5UndoRomance(mid) });
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
            if (P5.selectedBlock && P5.selectedBlock.slotIndices[0] === i) {
              P5.selectedBlock = null; P5.candidates = []; P5.chosen = null; return;
            }
            P5.selectedBlock = block;
            P5.candidates = recommendMissions(min(block.durationMin, 180));
            P5.chosen = null;
          },
        });
        i = j + 1;
      } else i++;
    }
  }
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
  P5.selectedBlock = block;
  P5.candidates = recommendMissions(min(block.durationMin, 180));
  P5.chosen = null;
}

// ── 오른쪽 추천 패널 ──
function p5DrawRightPanel() {
  const px = 450, py = 160, pw = 770, ph = 520;
  push();
  noStroke(); fill('#f4f0e8'); rect(px, py, pw, ph, 16);
  noFill(); stroke(COLORS.line); strokeWeight(1.2); rect(px, py, pw, ph, 16);

  if (!P5.selectedBlock) {
    fill(COLORS.inkSoft); textFont(fontBody); textSize(17); textAlign(CENTER, CENTER);
    text('왼쪽 타임라인에서\n빈 시간을 눌러보세요.', px + pw / 2, py + ph / 2);
    pop(); return;
  }

  const dur = min(P5.selectedBlock.durationMin, 180);
  fill(COLORS.inkSoft); textFont(fontBody); textSize(14); textAlign(CENTER, TOP);
  text(`${dur}분짜리 빈 시간 — 어떤 낭만을 채울까요?`, px + pw / 2, py + 22);

  const cardW = pw - 60, cardH = 84, cardX = px + 30;
  for (let k = 0; k < P5.candidates.length; k++) {
    const m = P5.candidates[k];
    const cy = py + 65 + k * (cardH + 10);
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
    const lines = p5WrapLines(m.text, cardW - 70);
    const lh = 22;
    let ty = cy + cardH / 2 - (lines.length - 1) * lh / 2;
    for (const ln of lines) { text(ln, cardX + 48, ty); ty += lh; }

    _buttons.push({ x: cardX, y: cy, w: cardW, h: cardH, onClick: () => { P5.chosen = k; } });
  }
  pop();

  drawButton('추가하기', px + pw / 2, py + ph - 34, 150, 46, p5AddMission);
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
}
