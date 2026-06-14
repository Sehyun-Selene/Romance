// P6 — 투두리스트 (왼쪽) + 엽서 제작 (오른쪽)
// 낭만 체크 → 애니메이션 큐 → 토끼 포물선 점프 → 산 lerp 등장
// 모든 항목 체크 완료 시 "오늘의 엽서 만들기" 활성화 → P7

// ── 상수 ──────────────────────────────────────────────────────────
// 오른쪽: 상단부(엽서 — 배경+테두리+산) + 하단부(낭만 텍스트 섹션, 엽서 밖)
// 왼쪽 checklist bottom = 282+360=642  →  오른쪽도 같은 642에서 끝냄
const PC     = { x: 615, y: 130, w: 625, h: 352 };  // 엽서(산 영역) bottom=482
const PC_TXT = { x: 615, y: 488, w: 625, h: 154 };  // 낭만 텍스트 섹션 bottom=642
const TODO   = { x: 40,  y: 130, w: 550 };           // 왼쪽 투두

const JUMP_PROFILES = {
  '상':   { arc: 220, dur: 1100 },
  '중':   { arc: 140, dur: 850  },
  '하':   { arc: 80,  dur: 600  },
  '쉬기': { arc: 40,  dur: 700  },
};
// MTN_BASELINE_OFFSET 는 PC_MTN_H 기반으로 계산 — 아래에서 사용

// ── 상태 ──────────────────────────────────────────────────────────
const P6 = {
  items: [],        // [{id, type:'schedule'|'romance', timeMin, label, checked, missionIdx?}]
  quote: null,      // 랜덤 선택한 옛 글귀
  animQueue: [],    // [{missionIdx, checkOrder}] 대기 큐
  anim: null,       // 현재 진행중 애니메이션
  mtnAlpha: [],     // chosenMissions 인덱스별 alpha (0~255)
  rabbitX: 0,       // 토끼 X 위치 (PC 내부 좌표)
  inited: false,
  scrollY: 0,       // 체크리스트 스크롤 (향후 확장용)
};

// ── P6 진입 시 초기화 ─────────────────────────────────────────────
function p6Enter() {
  const items = [];
  for (const s of appState.schedules) {
    items.push({ id: 's' + s.id, type: 'schedule', timeMin: s.startMin, label: s.name, checked: false });
  }
  for (let i = 0; i < appState.chosenMissions.length; i++) {
    const m = appState.chosenMissions[i];
    items.push({ id: 'm' + i, type: 'romance', timeMin: m.slotMinutes, label: m.text, checked: false, missionIdx: i });
  }
  items.sort((a, b) => a.timeMin - b.timeMin);
  P6.items = items;
  P6.quote = random(QUOTES);
  P6.animQueue = [];
  P6.anim = null;
  P6.mtnAlpha = appState.chosenMissions.map(() => 0);
  P6.rabbitX = 0;
  P6.inited = true;
  appState.checkedMissionOrder = [];
}

function p6Reset() {
  P6.inited = false;
  P6.items = []; P6.animQueue = []; P6.anim = null; P6.mtnAlpha = []; P6.rabbitX = 0;
}

// ── 날짜 문자열 ───────────────────────────────────────────────────
function p6DateStr() {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

// ── 메인 렌더 ─────────────────────────────────────────────────────
function drawPage6() {
  if (!P6.inited) p6Enter();
  image(bgPostcard, 0, 0, DW, DH);
  drawHeader();

  p6UpdateAnim();    // 애니메이션 상태 갱신
  p6DrawTodo();      // 왼쪽 투두
  p6DrawPostcard();  // 오른쪽 엽서

  // 하단 버튼 — 체크리스트 박스(bottom y=648) 아래, 엽서와 같은 높이(bottom y=660) 사이
  const BTN_Y = 676;
  // G-3: 게이트 = 낭만 미션 전부 체크 (일반 일정 무관). 낭만 0개면 바로 활성.
  const romItems = P6.items.filter(it => it.type === 'romance');
  const romanceAllChecked = romItems.every(it => it.checked) && !P6.anim;
  push();
  if (!romanceAllChecked) {
    fill(150, 110, 70); textFont(fontBody); textSize(13); textAlign(LEFT, CENTER);
    text('낭만을 모두 체크하면 엽서가 완성돼요. 체크박스를 눌러보세요!', TODO.x + 4, BTN_Y);
  }
  pop();

  // 이슈1: P4.modal 초기화 포함 (잔존 모달 방지)
  // E-1: 일정 수정하기 = 타임테이블+할일 전체 리셋 후 P4 시간입력부터
  drawButton('일정 수정하기', 200, BTN_Y, 150, 40, () => {
    appState.schedules = [];
    appState.scheduleSeq = 0;
    appState.chosenMissions = [];
    appState.usedMissionIds = new Set();
    appState.checkedMissionOrder = [];
    appState.timetable = [];
    if (typeof p4Reset === 'function') p4Reset();
    if (typeof p5Reset === 'function') p5Reset();
    P6.inited = false;
    goTo(4);
  });
  // 낭만 수정: 기존 낭만은 유지하고 P5에서 수정할 항목만 클릭하게 함
  drawButton('낭만 수정하기', 370, BTN_Y, 150, 40, () => {
    if (typeof P5 !== 'undefined') {
      P5.selectedBlock = null;
      P5.candidates = [];
      P5.chosen = null;
      P5.hoverTip = null;
      P5.editMode = true;
    }
    P6.inited = false;
    goTo(5);
  });

  if (romanceAllChecked) drawButton('오늘의 엽서 만들기', DW - 185, BTN_Y, 210, 40, () => goTo(7));
  else {
    push();
    noStroke(); fill(COLORS.btn); rectMode(CENTER); rect(DW - 185, BTN_Y, 210, 40, 8);
    fill(COLORS.inkSoft); textFont(fontHeading); textSize(16); textAlign(CENTER, CENTER);
    text('오늘의 엽서 만들기', DW - 185, BTN_Y);
    pop();
  }
}

// ── 왼쪽: 투두리스트 ─────────────────────────────────────────────
function p6DrawTodo() {
  const x = TODO.x, w = TODO.w;
  push();

  // 헤더 카드 (y=130, h=145 → bottom=275)
  noStroke(); fill('#f4f0e8'); rect(x, 130, w, 145, 12);
  noFill(); stroke(COLORS.line); strokeWeight(1); rect(x, 130, w, 145, 12);

  // 헤더 텍스트: 박스(y=130, h=145, center=202.5) 수직 중앙 정렬
  // 내용 총 높이 ≈ 100px → 시작 y ≈ 202-50 = 152
  fill(COLORS.inkSoft); textFont(fontBody); textSize(13); textAlign(LEFT, TOP);
  text(p6DateStr(), x + 18, 155);

  fill(COLORS.ink); textFont(fontHeading); textSize(16); textAlign(LEFT, TOP);
  text('안녕하세요,', x + 18, 176);
  text('오늘도 당신의 하루를 응원해요.', x + 18, 197);

  if (P6.quote) {
    const qText = P6.quote.type === '시조' && P6.quote.source
      ? `${P6.quote.text} (${P6.quote.source})`
      : P6.quote.text;
    fill(COLORS.inkSoft);
    drawMixedText(window, qText, x + 18, 222, w - 36, 12, fontBody, 17);   // 한자 깨짐 방지
  }

  // 체크리스트 섹션 (y=282, h=360 → bottom=642)
  noStroke(); fill('#f4f0e8'); rect(x, 282, w, 360, 12);
  noFill(); stroke(COLORS.line); strokeWeight(1); rect(x, 282, w, 360, 12);

  fill(COLORS.ink); textFont(fontHeading); textSize(15); textAlign(LEFT, TOP); noStroke();
  text('오늘의 할 일', x + 18, 294);
  // G-1: 안내 멘트
  fill(COLORS.inkSoft); textFont(fontBody); textSize(11.5);
  text('체크박스를 눌러 하나씩 완료해보세요. 낭만을 체크하면 토끼가 산을 그려요.', x + 18, 316);
  stroke(COLORS.line); strokeWeight(0.8); line(x + 18, 336, x + w - 18, 336);

  // 항목 수에 맞춰 itemH 동적 축소 (모든 항목이 박스 안에 들어와 클릭 가능)
  const startY = 342, listBottom = 636;
  const itemH = min(40, (listBottom - startY) / max(P6.items.length, 1));
  for (let k = 0; k < P6.items.length; k++) {
    const it = P6.items[k];
    const iy = startY + k * itemH;

    const isRom = it.type === 'romance';
    const locked = P6.anim !== null && !it.checked;   // 애니 중엔 새 체크 잠금

    // 체크박스 (itemH=40 기준 수직 중앙)
    const cbY = iy + itemH / 2 - 11;
    noStroke(); fill(it.checked ? COLORS.slotBeige : COLORS.slotEmpty);
    rect(x + 18, cbY, 20, 20, 4);
    if (it.checked) {
      stroke('#fff'); strokeWeight(2.2); noFill();
      line(x + 21, cbY + 11, x + 25, cbY + 15); line(x + 25, cbY + 15, x + 34, cbY + 6);
    }

    // 라벨
    noStroke();
    fill(locked ? color(COLORS.inkSoft) : (it.checked ? color(COLORS.inkSoft) : color(COLORS.ink)));
    textFont(isRom && !it.checked ? fontHeading : fontBody);
    textSize(13); textAlign(LEFT, CENTER);
    // 박스 wrap 제거 → 단일 라인 세로 중앙(체크박스와 같은 높이). 길면 말줄임.
    let lbl = it.label;
    const maxLblW = w - 110;
    while (textWidth(lbl) > maxLblW && lbl.length > 4) lbl = lbl.slice(0, -1);
    if (lbl !== it.label) lbl = lbl.slice(0, -1) + '…';
    text(lbl, x + 48, cbY + 10);

    // 낭만 배지
    if (isRom) {
      noStroke(); fill(COLORS.slotYellow);
      rect(x + w - 54, iy + itemH / 2 - 9, 38, 18, 9);
      fill(COLORS.ink); textFont(fontBody); textSize(11); textAlign(CENTER, CENTER);
      text('낭만', x + w - 35, iy + itemH / 2);
    }

    // 클릭 영역 (모든 항목 등록 — 클립돼도 클릭 가능)
    if (!locked) {
      _buttons.push({ x: x + 10, y: iy + 2, w: w - 20, h: itemH - 4, onClick: () => p6CheckItem(k) });
    }
  }
  pop();
}

// ── 항목 체크 처리 ────────────────────────────────────────────────
function p6CheckItem(k) {
  const it = P6.items[k];
  if (P6.anim && !it.checked) return;   // 애니 중 새 체크 잠금
  it.checked = !it.checked;
  if (it.type === 'romance' && it.checked) {
    const checkOrder = appState.checkedMissionOrder.length;
    appState.checkedMissionOrder.push(it.missionIdx);
    P6.animQueue.push({ missionIdx: it.missionIdx, checkOrder });
  } else if (it.type === 'romance' && !it.checked) {
    // 체크 취소: 순서 목록 + alpha 리셋
    appState.checkedMissionOrder = appState.checkedMissionOrder.filter(i => i !== it.missionIdx);
    P6.mtnAlpha[it.missionIdx] = 0;
    // 순서 재정렬 (취소된 항목 이후 모두 순서 재조정)
    // 간단 처리: 순서 재빌드
    const newOrder = [];
    for (const it2 of P6.items) {
      if (it2.type === 'romance' && it2.checked) {
        newOrder.push(it2.missionIdx);
      }
    }
    appState.checkedMissionOrder = newOrder;
  }
}

// ── 애니메이션 업데이트 (매 프레임) ──────────────────────────────
function p6UpdateAnim() {
  if (!P6.anim && P6.animQueue.length > 0) {
    const next = P6.animQueue.shift();
    const m = appState.chosenMissions[next.missionIdx];
    const total = appState.chosenMissions.length;
    const layout = mountainLayout(next.checkOrder, total, PC.w, PC.h, m.drawRandom);
    P6.anim = {
      missionIdx: next.missionIdx,
      checkOrder: next.checkOrder,
      startX: P6.rabbitX,
      endX: layout.cx,
      startMs: millis(),
      difficulty: m.difficulty,
      progress: 0,
    };
    P6.mtnAlpha[next.missionIdx] = 0;
  }

  if (P6.anim) {
    const jp = JUMP_PROFILES[P6.anim.difficulty] || JUMP_PROFILES['중'];
    const elapsed = millis() - P6.anim.startMs;
    const t = min(elapsed / jp.dur, 1);
    P6.anim.progress = t;
    P6.rabbitX = lerp(P6.anim.startX, P6.anim.endX, t);
    P6.mtnAlpha[P6.anim.missionIdx] = floor(t * 255);
    if (t >= 1) {
      P6.mtnAlpha[P6.anim.missionIdx] = 255;
      P6.rabbitX = P6.anim.endX;
      P6.anim = null;
    }
  }
}

// ── 오른쪽: 엽서 ─────────────────────────────────────────────────
function p6DrawPostcard() {
  // ──── 상단부: 엽서 (배경+테두리+산+토끼) ────
  push();
  noStroke(); fill('#f4f0e8'); rect(PC.x, PC.y, PC.w, PC.h, 8);
  tint(255, 65); image(bgPostcard, PC.x, PC.y, PC.w, PC.h); noTint();
  noFill(); stroke(COLORS.line); strokeWeight(1.5); rect(PC.x, PC.y, PC.w, PC.h, 8);

  const total = appState.chosenMissions.length;

  // 엽서 클리핑
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.roundRect(PC.x + 1, PC.y + 1, PC.w - 2, PC.h - 2, 8);
  drawingContext.clip();

  if (!total) {
    fill(COLORS.inkSoft); textFont(fontBody); textSize(15); textAlign(CENTER, CENTER);
    text('토끼 뛰는 곳', PC.x + PC.w / 2, PC.y + PC.h / 2);
  }

  for (let ci = 0; ci < appState.checkedMissionOrder.length; ci++) {
    const midx = appState.checkedMissionOrder[ci];
    const alpha = P6.mtnAlpha[midx];
    if (alpha <= 0) continue;
    const m = appState.chosenMissions[midx];
    const { rotation } = m.drawRandom;
    const layout = mountainLayout(ci, total, PC.w, PC.h, m.drawRandom);
    const cx = PC.x + layout.cx;
    const cy = PC.y + layout.cy;
    push();
    translate(cx, cy); rotate(radians(rotation));
    tint(255, alpha); imageMode(CENTER);
    image(getMountain(m.mountainKey), 0, 0, layout.w, layout.h);
    noTint(); imageMode(CORNER);
    pop();
  }

  // 토끼
  if (P6.anim || P6.rabbitX > 0) {
    const jp  = P6.anim ? (JUMP_PROFILES[P6.anim.difficulty] || JUMP_PROFILES['중']) : { arc: 0 };
    const t   = P6.anim ? P6.anim.progress : 1;
    const rx  = PC.x + P6.rabbitX;
    const ry  = PC.y + PC.h - 24 - jp.arc * sin(PI * t);
    const frm = !P6.anim ? rabbits.still : (t < 0.15 ? rabbits.still : (t > 0.85 ? rabbits.land : rabbits.jump));
    push(); imageMode(CENTER); image(frm, rx, ry, 90, 60); imageMode(CORNER); pop();  // 이슈8
  } else {
    push(); imageMode(CENTER);
    image(rabbits.still, PC.x + 50, PC.y + PC.h - 32, 90, 60);
    imageMode(CORNER); pop();
  }

  drawingContext.restore();
  pop();

  // ──── 하단부: 낭만 텍스트 섹션 (엽서 밖, 별도 박스) ────
  push();
  noStroke(); fill('#f4f0e8'); rect(PC_TXT.x, PC_TXT.y, PC_TXT.w, PC_TXT.h, 8);
  noFill(); stroke(COLORS.line); strokeWeight(1); rect(PC_TXT.x, PC_TXT.y, PC_TXT.w, PC_TXT.h, 8);

  noStroke();
  fill(COLORS.inkSoft); textFont(fontBody); textSize(12); textAlign(LEFT, TOP);
  text('오늘을 채운 낭만', PC_TXT.x + 18, PC_TXT.y + 10);

  for (let ci = 0; ci < appState.checkedMissionOrder.length; ci++) {
    const midx  = appState.checkedMissionOrder[ci];
    const alpha = P6.mtnAlpha[midx];
    if (alpha < 40) continue;
    const m  = appState.chosenMissions[midx];
    const ty = PC_TXT.y + 36 + ci * 21;   // 이슈4: 제목과 간격 확보
    if (ty + 16 > PC_TXT.y + PC_TXT.h - 6) break;
    fill(74, 65, 56, min(alpha, 210));
    textFont(fontBody); textSize(12); textAlign(LEFT, TOP); textWrap(WORD);
    text(`• ${m.text}`, PC_TXT.x + 18, ty, PC_TXT.w - 36, 19);
    textWrap(CHAR);
  }
  pop();
}
