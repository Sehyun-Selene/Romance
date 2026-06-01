// P3 — 낭만 미션 태그 선택 (최소 3개)
const P3 = { warnAt: -99999 };

function drawPage3() {
  image(bgPostcard, 0, 0, DW, DH);
  drawHeader();

  push();
  fill(COLORS.ink); textFont(fontHeading); textSize(30); textAlign(CENTER, CENTER);
  text('어떤 활동에 관심이 있으신가요?', DW / 2, 120);
  fill(COLORS.inkSoft); textFont(fontBody); textSize(16);
  text('자투리 시간에 하고 싶은 활동 분야를 골라주세요.', DW / 2, 158);
  // 정적 안내 + 현재 선택 수
  const sel = appState.selectedTags.length;
  fill(sel >= 3 ? color(80,130,80) : color(150,60,50));
  textFont(fontBody); textSize(14);
  text(`최소 3개를 골라주세요 (${sel}/3 선택됨)`, DW / 2, 183);
  pop();

  // 6 태그 칩: 3열 2행
  const chips = TAG_DISPLAY;
  const cols = 3, rows = 2;
  const cw = 200, ch = 64, gx = 40, gy = 28;
  const totalW = cols * cw + (cols - 1) * gx;
  const startX = DW / 2 - totalW / 2;
  const startY = 300;

  for (let i = 0; i < chips.length; i++) {
    const col = i % cols, row = floor(i / cols);
    const cx = startX + col * (cw + gx) + cw / 2;
    const cy = startY + row * (ch + gy) + ch / 2;
    const key = tagKeyOf(chips[i]);
    const sel = appState.selectedTags.includes(key);
    push();
    rectMode(CENTER); noStroke();
    fill(sel ? COLORS.slotBeige : COLORS.btn);
    rect(cx, cy, cw, ch, 14);
    fill(sel ? '#fff' : COLORS.ink);
    textFont(fontHeading); textSize(20); textAlign(CENTER, CENTER);
    text(chips[i], cx, cy);
    pop();
    _buttons.push({
      x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch,
      onClick: () => {
        if (sel) appState.selectedTags = appState.selectedTags.filter(t => t !== key);
        else appState.selectedTags.push(key);
      },
    });
  }

  // 경고 문구 반짝임
  if (millis() - P3.warnAt < 2500) {
    const a = map(sin(frameCount * 0.15), -1, 1, 80, 255);
    push();
    fill(150, 60, 50, a); textFont(fontBody); textSize(16); textAlign(CENTER, CENTER);
    text('최소 세 개의 태그를 골라주세요', DW / 2, 600);
    pop();
  }

  // 3개 이상 선택 시에만 버튼 표시
  if (appState.selectedTags.length >= 3) {
    drawButton('다음으로', DW / 2, 650, 150, 46, () => goTo(4));
  }
}
