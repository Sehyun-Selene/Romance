// P7 — 오늘의 엽서 완성
// createGraphics 버퍼에 산수화+날짜+닉네임+글귀를 합성해 최종 엽서 생성.
// "엽서집에 저장하기" → JPEG 압축 → localStorage → P8
// "처음 화면으로"    → 세션 초기화 → P1

const PG_W = 625, PG_H = 420;   // 엽서 버퍼 크기 (산 352 + 날짜/글귀 68)

const P7 = {
  buf: null,       // p5.Graphics — 최종 엽서 버퍼
  inited: false,
  saved: false,    // 저장 완료 플래그
};

function p7Reset() {
  if (P7.buf) { P7.buf.remove(); P7.buf = null; }
  P7.inited = false;
  P7.saved  = false;
  appState.postcard = null;
}

// P7 진입 시 엽서 버퍼 생성 (1회)
function p7Enter() {
  if (P7.inited) return;
  P7.buf   = createGraphics(PG_W, PG_H);
  P7.saved = false;
  p7RenderBuffer(P7.buf);
  appState.postcard = P7.buf;
  P7.inited = true;
}

// ── 엽서 렌더 (Graphics 버퍼에 그림) ─────────────────────────────
function p7RenderBuffer(g) {
  // 배경 — 불투명 크림 (JPEG 저장 시 투명 채널 없도록)
  g.noStroke(); g.fill('#f4f0e8');
  g.rect(0, 0, PG_W, PG_H);
  g.tint(255, 65);
  g.image(bgPostcard, 0, 0, PG_W, PG_H);
  g.noTint();

  // 테두리
  g.noFill(); g.stroke('#bdb4a4'); g.strokeWeight(1.2);
  g.rect(0, 0, PG_W, PG_H);

  // 산 그리기 (checkedMissionOrder 순)
  const total = appState.chosenMissions.length;
  if (total > 0) {
    const colW    = PG_W / total;
    const mtnW    = min(max(colW * 1.15, 200), 560);  // 이슈3: 산 크게
    const mtnH    = min(mtnW / 1.5, 338);
    const baseline = 350;

    for (let ci = 0; ci < appState.checkedMissionOrder.length; ci++) {
      const midx = appState.checkedMissionOrder[ci];
      const m    = appState.chosenMissions[midx];
      const { offsetX, offsetY, scale: sc, rotation } = m.drawRandom;
      const cx = ci * colW + colW / 2 + offsetX;
      const cy = baseline - mtnH / 2 + offsetY;
      g.push();
      g.translate(cx, cy);
      g.rotate(g.radians(rotation));
      g.imageMode(g.CENTER);
      g.image(getMountain(m.mountainKey), 0, 0, mtnW * sc, mtnH * sc);
      g.imageMode(g.CORNER);
      g.pop();
    }

    // 토끼 (이슈8: 90×60)
    g.imageMode(g.CENTER);
    g.image(rabbits.still, P6.rabbitX, baseline - 25, 90, 60);
    g.imageMode(g.CORNER);
  }

  // 이슈9: 텍스트 영역에 불투명 배경 깔아 가시성 확보
  g.noStroke(); g.fill(244, 240, 232, 230);
  g.rect(0, 354, PG_W, 66);
  g.stroke('#bdb4a4'); g.strokeWeight(0.8);
  g.line(16, 357, PG_W - 16, 357);

  // 날짜 + 닉네임 + 글귀 (어두운 색으로)
  g.noStroke();
  const q    = P6.quote;
  const nick = appState.nickname || '';

  g.textFont(fontBody); g.textSize(12); g.fill('#4a4138');
  g.textAlign(g.LEFT, g.TOP);
  g.text(p6DateStr(), 18, 362);

  if (nick) {
    g.textAlign(g.RIGHT, g.TOP);
    g.fill('#4a4138'); g.textSize(12);
    g.text(`— ${nick}`, PG_W - 18, 362);
  }

  if (q) {
    const qText = q.type === '시조' && q.source ? `${q.text} (${q.source})` : q.text;
    g.textFont(fontBody); g.textSize(11); g.fill('#6b5c4a');
    g.textAlign(g.LEFT, g.TOP); g.textWrap(g.WORD);
    g.text(qText, 18, 378, PG_W - 36, 36);
    g.textWrap(g.CHAR);
  }
}

// ── 메인 렌더 ─────────────────────────────────────────────────────
function drawPage7() {
  if (!P7.inited) p7Enter();
  image(bgPostcard, 0, 0, DW, DH);
  drawHeader();

  centerTitle('오늘의 엽서', 90);

  // 엽서 이미지: 화면 중앙 (최대 900×574 표시, 여백 유지)
  const dispW = min(PG_W * 1.3, 850);
  const dispH = dispW * PG_H / PG_W;
  const ex    = DW / 2 - dispW / 2;
  const ey    = 120;
  if (P7.buf) image(P7.buf, ex, ey, dispW, dispH);

  // 하단 버튼
  const BY = ey + dispH + 36;
  drawButton('엽서집에 저장하기', DW / 2 - 140, BY, 220, 48, p7Save);
  drawButton('처음 화면으로',     DW / 2 + 130, BY, 180, 48, () => { resetSession(); goTo(1); });

  if (P7.saved) {
    push();
    fill(COLORS.ink); textFont(fontBody); textSize(14); textAlign(CENTER, CENTER);
    text('엽서집에 저장됐어요 ✓', DW / 2 - 140, BY + 40);
    pop();
  }
}

function p7Save() {
  if (!P7.buf || P7.saved) return;
  savePostcard(appState.nickname || '관람객', P7.buf);
  P7.saved = true;
  goTo(8);
}
