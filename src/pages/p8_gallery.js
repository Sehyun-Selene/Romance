// P8 — 엽서집 (localStorage 그리드 + 페이지네이션 + 확대 모달)

const P8 = {
  page: 0,
  imgCache: {},
  perPage: 8,
  modal: null,    // {item} — 확대 모달
};

function p8Reset() { P8.page = 0; P8.modal = null; }

// ── 메인 렌더 ─────────────────────────────────────────────────────
function drawPage8() {
  image(bgPostcard, 0, 0, DW, DH);
  drawHeader();
  centerTitle('엽서집', 70);

  const all   = loadPostcards().reverse();
  const total = all.length;
  const pages = max(1, ceil(total / P8.perPage));
  P8.page     = constrain(P8.page, 0, pages - 1);
  const items = all.slice(P8.page * P8.perPage, (P8.page + 1) * P8.perPage);

  const COLS = 4, CARD_H = 180, LABEL = 38, GAP_Y = 20;
  const startY = 110;
  let gridBottom = startY + 200;

  if (total === 0) {
    push();
    fill(COLORS.inkSoft); textFont(fontBody); textSize(18); textAlign(CENTER, CENTER);
    text('아직 저장된 엽서가 없어요.', DW / 2, DH / 2 - 30);
    pop();
    gridBottom = DH / 2;
  } else {
    p8DrawGrid(items);
    const rows = ceil(items.length / COLS);
    gridBottom = startY + rows * (CARD_H + LABEL + GAP_Y);
  }

  const py = gridBottom + 28;
  if (pages > 1) {
    push();
    fill(COLORS.ink); textFont(fontBody); textSize(14); textAlign(CENTER, CENTER);
    text(`${P8.page + 1} / ${pages} 페이지`, DW / 2, py);
    pop();
    drawButton('◀', DW / 2 - 100, py, 60, 36, () => { if (P8.page > 0) P8.page--; });
    drawButton('▶', DW / 2 + 100, py, 60, 36, () => { if (P8.page < pages - 1) P8.page++; });
  }

  drawButton('처음 화면으로', DW / 2, 740, 180, 44, () => { resetSession(); goTo(1); });

  // 확대 모달 (그리드 위에 그림)
  if (P8.modal) p8DrawModal();
}

// ── 그리드 ────────────────────────────────────────────────────────
function p8DrawGrid(items) {
  const COLS = 4, CARD_W = 270, CARD_H = 180;
  const LABEL = 38, GAP_X = 24, GAP_Y = 20;
  const totalW = COLS * CARD_W + (COLS - 1) * GAP_X;
  const startX = DW / 2 - totalW / 2;
  const startY = 110;

  for (let k = 0; k < items.length; k++) {
    const row = floor(k / COLS), col = k % COLS;
    const cx  = startX + col * (CARD_W + GAP_X);
    const cy  = startY + row * (CARD_H + LABEL + GAP_Y);
    const item = items[k];

    if (!P8.imgCache[item.id] && item.imageDataURL) {
      P8.imgCache[item.id] = loadImage(item.imageDataURL);
    }

    push();
    noStroke(); fill('#f4f0e8'); rect(cx, cy, CARD_W, CARD_H, 6);
    if (P8.imgCache[item.id]) {
      image(P8.imgCache[item.id], cx, cy, CARD_W, CARD_H);
    } else {
      fill(COLORS.inkSoft); textFont(fontBody); textSize(12); textAlign(CENTER, CENTER);
      text('로딩 중...', cx + CARD_W / 2, cy + CARD_H / 2);
    }
    noFill(); stroke(COLORS.line); strokeWeight(1); rect(cx, cy, CARD_W, CARD_H, 6);
    noStroke(); fill(COLORS.ink);
    textFont(fontBody); textSize(12); textAlign(LEFT, TOP);
    text(item.date || '', cx + 4, cy + CARD_H + 6);
    textFont(fontHeading); textSize(14); textAlign(LEFT, TOP);
    text(item.nickname || '', cx + 4, cy + CARD_H + 22);
    pop();

    // 카드 클릭 → 확대 모달
    _buttons.push({ x: cx, y: cy, w: CARD_W, h: CARD_H,
      onClick: () => { P8.modal = { item }; } });
  }
}

// ── 확대 모달 ────────────────────────────────────────────────────
function p8DrawModal() {
  const item = P8.modal.item;
  // 배경 딤
  push();
  fill(0, 0, 0, 170); rect(0, 0, DW, DH);

  // 엽서 비율: 625×420
  const dw = 810, dh = round(dw * 420 / 625);   // 810×544
  const dx = DW / 2 - dw / 2, dy = DH / 2 - dh / 2 - 10;

  noStroke(); fill('#f4f0e8'); rect(dx, dy, dw, dh, 8);
  if (P8.imgCache[item.id]) {
    image(P8.imgCache[item.id], dx, dy, dw, dh);
  }
  noFill(); stroke(COLORS.line); strokeWeight(1.5); rect(dx, dy, dw, dh, 8);

  // 닫기 버튼 X (우상단)
  const bx = dx + dw - 20, by = dy + 20;
  noStroke(); fill(COLORS.btn); rectMode(CENTER); rect(bx, by, 36, 36, 8);
  fill(COLORS.ink); textFont(fontHeading); textSize(22); textAlign(CENTER, CENTER);
  text('×', bx, by);
  pop();

  // 배경 클릭 / X 클릭 모두 닫기
  _buttons.push({ x: dx + dw - 38, y: dy + 2, w: 36, h: 36, onClick: () => { P8.modal = null; } });
  _buttons.push({ x: 0, y: 0, w: DW, h: DH, onClick: () => { P8.modal = null; } });
}
