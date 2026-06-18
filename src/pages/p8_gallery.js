// P8 — 엽서집 (localStorage 그리드 + 페이지네이션 + 확대 모달)

const P8 = {
  page: 0,
  imgCache: {},
  perPage: 8,
  modal: null,    // {item} — 확대 모달
};

function p8Reset() { P8.page = 0; P8.modal = null; }

// 페이지 이전/다음 버튼 — 폰트에 ◀/▶ 글리프가 없어 깨져 보이는 문제를 피하려고
// 텍스트 대신 삼각형을 직접 그린다 (drawDevNav의 화살표와 동일한 방식).
function p8ArrowButton(cx, cy, w, h, dir, onClick) {
  const over = mouseInRect(cx - w / 2, cy - h / 2, w, h);
  push();
  noStroke(); fill(over ? COLORS.slotBeige : COLORS.btn);
  rectMode(CENTER); rect(cx, cy, w, h, 8);
  fill(over ? '#fff' : COLORS.ink);
  const tw = 7, th = 9;
  if (dir < 0) triangle(cx + tw / 2, cy - th, cx + tw / 2, cy + th, cx - tw / 2, cy);
  else triangle(cx - tw / 2, cy - th, cx - tw / 2, cy + th, cx + tw / 2, cy);
  rectMode(CORNER);
  pop();
  _buttons.push({ x: cx - w / 2, y: cy - h / 2, w, h, onClick });
}

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
    p8ArrowButton(DW / 2 - 100, py, 60, 36, -1, () => { if (P8.page > 0) P8.page--; });
    p8ArrowButton(DW / 2 + 100, py, 60, 36, 1, () => { if (P8.page < pages - 1) P8.page++; });
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
      P8.imgCache[item.id] = loadImage(item.imageDataURL, () => {}, () => { P8.imgCache[item.id] = null; });   // H-1: 에러핸들
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
  push();
  fill(0, 0, 0, 170); rect(0, 0, DW, DH);
  // 배경(카드 밖) 클릭 → 닫기 (맨 먼저 등록 = 맨 아래)
  _buttons.push({ x: 0, y: 0, w: DW, h: DH, onClick: () => { P8.modal = null; } });

  // share 디코드 (낭만목록 + 글귀)
  let info = null;
  if (item.share) { try { info = decodeShareState(item.share); } catch (e) { info = null; } }

  const cw = 1080, ch = 600, cx0 = DW / 2 - cw / 2, cy0 = DH / 2 - ch / 2;
  noStroke(); fill('#efe9dc'); rect(cx0, cy0, cw, ch, 16);
  noFill(); stroke(COLORS.line); strokeWeight(1.2); rect(cx0, cy0, cw, ch, 16);

  // 왼쪽 엽서 이미지
  const ew = 560, eh = round(ew * 420 / 625), ex = cx0 + 36, ey = cy0 + 48;
  noStroke(); fill('#f4f0e8'); rect(ex, ey, ew, eh, 8);
  if (P8.imgCache[item.id]) image(P8.imgCache[item.id], ex, ey, ew, eh);
  noFill(); stroke(COLORS.line); strokeWeight(1.2); rect(ex, ey, ew, eh, 8);

  // 오른쪽 텍스트
  const tx = ex + ew + 40, tw = cx0 + cw - tx - 36;
  noStroke();
  fill(COLORS.ink); textFont(fontHeading); textSize(22); textAlign(LEFT, TOP);
  text(`${item.nickname || ''}님의 하루`, tx, cy0 + 50);
  fill(COLORS.inkSoft); textFont(fontBody); textSize(13);
  text(item.date || '', tx, cy0 + 84);

  if (info) {
    fill(COLORS.ink); textFont(fontHeading); textSize(15);
    text('오늘을 채운 낭만', tx, cy0 + 120);
    fill(COLORS.ink); textFont(fontBody); textSize(13); textAlign(LEFT, TOP);
    let ly = cy0 + 148;
    for (const m of info.chosenMissions) {
      const lines = (typeof p5WrapLines === 'function') ? p5WrapLines('• ' + m.text, tw) : ['• ' + m.text];
      for (const ln of lines) { text(ln, tx, ly); ly += 19; }
      ly += 4;
      if (ly > cy0 + ch - 130) break;
    }
    if (info.quote) {
      const q = info.quote;
      const qt = q.type === '시조' && q.source ? `${q.text} (${q.source})` : q.text;
      const qy = min(ly + 14, cy0 + ch - 140);
      fill(COLORS.ink); textFont(fontHeading); textSize(14); textAlign(LEFT, TOP);
      text('오늘의 글귀', tx, qy);
      fill('#4a4138');
      drawMixedText(window, qt, tx, qy + 24, tw, 14, fontBody, 19);
    }
  } else {
    fill(COLORS.inkSoft); textFont(fontBody); textSize(13); textAlign(LEFT, TOP);
    text('(낭만 정보가 없는 엽서예요)', tx, cy0 + 120);
  }

  // 닫기 X (우상단)
  const bx = cx0 + cw - 26, by = cy0 + 26;
  noStroke(); fill(COLORS.btn); rectMode(CENTER); rect(bx, by, 36, 36, 8);
  fill(COLORS.ink); textFont(fontHeading); textSize(22); textAlign(CENTER, CENTER);
  text('×', bx, by);
  rectMode(CORNER);
  pop();

  // 링크 가져가기 버튼: 현재 세션에서 방금 만든 엽서에만 표시
  const canShare = !!item.share && !!item.ownerSessionId && item.ownerSessionId === appState.sessionId;
  if (canShare) {
    drawButton('이 엽서 링크 가져가기', tx + tw / 2, cy0 + ch - 46, 240, 46, () => {
      p7ShowShare(buildShareURLFrom(item.share));
    });
  }
  // X 클릭 (맨 위)
  _buttons.push({ x: bx - 18, y: by - 18, w: 36, h: 36, onClick: () => { P8.modal = null; } });
}
