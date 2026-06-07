// P7 — 오늘의 엽서 완성
// createGraphics 버퍼에 산수화+날짜+닉네임+글귀를 합성해 최종 엽서 생성.
// "엽서집에 저장하기" → JPEG 압축 → localStorage → P8
// "처음 화면으로"    → 세션 초기화 → P1

const PG_W = 625, PG_H = 420;   // 엽서 버퍼 크기 (산 352 + 날짜/글귀 68)

const P7 = {
  buf: null,       // p5.Graphics — 최종 엽서 버퍼
  inited: false,
  saved: false,    // 저장 완료 플래그
  shareEl: null,   // 공유 오버레이 DOM
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

  // 하단 버튼 3개
  const BY = ey + dispH + 36;
  drawButton('엽서집에 저장하기', DW / 2 - 330, BY, 210, 48, p7Save);
  drawButton('링크 가져가기',     DW / 2,       BY, 200, 48, p7ShowShare);
  drawButton('처음 화면으로',     DW / 2 + 320, BY, 190, 48, () => { p7HideShare(); resetSession(); goTo(1); });

  if (P7.saved) {
    push();
    fill(COLORS.ink); textFont(fontBody); textSize(14); textAlign(CENTER, CENTER);
    text('엽서집에 저장됐어요 ✓', DW / 2 - 330, BY + 40);
    pop();
  }
}

// ── 공유 오버레이 (QR + 링크) ─────────────────────────────────────
function p7ShowShare() {
  const url = buildShareURL();
  if (!P7.shareEl) {
    const wrap = createDiv('');
    wrap.elt.style.cssText = 'position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;background:rgba(40,36,30,0.6);font-family:MapoFlowerIsland,sans-serif;';
    wrap.elt.innerHTML = `
      <div id="p7share-card" style="background:#f4f0e8;border-radius:18px;padding:28px 32px;max-width:420px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.3);">
        <div style="font-size:20px;color:#4a4138;margin-bottom:6px;">나의 엽서 가져가기</div>
        <div style="font-size:13px;color:#8b8073;margin-bottom:16px;">QR을 스캔하거나 링크를 복사하세요</div>
        <div id="p7share-qr" style="display:flex;justify-content:center;margin-bottom:16px;"></div>
        <input id="p7share-link" readonly style="width:100%;box-sizing:border-box;border:1px solid #cdbfa3;border-radius:8px;padding:8px;font-size:11px;color:#4a4138;background:#fff;text-align:center;margin-bottom:12px;">
        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="p7share-copy" style="flex:1;border:none;border-radius:8px;padding:10px;background:#b8a98f;color:#fff;font-size:15px;font-family:inherit;cursor:pointer;">링크 복사</button>
          <button id="p7share-close" style="flex:1;border:none;border-radius:8px;padding:10px;background:#cdc4b4;color:#4a4138;font-size:15px;font-family:inherit;cursor:pointer;">닫기</button>
        </div>
      </div>`;
    P7.shareEl = wrap;
    // 핸들러
    wrap.elt.addEventListener('mousedown', e => { if (e.target === wrap.elt) p7HideShare(); });
    wrap.elt.querySelector('#p7share-close').addEventListener('click', p7HideShare);
    wrap.elt.querySelector('#p7share-copy').addEventListener('click', () => {
      const inp = wrap.elt.querySelector('#p7share-link');
      navigator.clipboard?.writeText(inp.value).catch(() => {});
      inp.select();
      wrap.elt.querySelector('#p7share-copy').textContent = '복사됨 ✓';
    });
  }
  P7.shareEl.elt.style.display = 'flex';
  P7.shareEl.elt.querySelector('#p7share-link').value = url;
  P7.shareEl.elt.querySelector('#p7share-copy').textContent = '링크 복사';
  const qrDiv = P7.shareEl.elt.querySelector('#p7share-qr');
  qrDiv.innerHTML = '';
  new QRCode(qrDiv, { text: url, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.L });
}

function p7HideShare() {
  if (P7.shareEl) P7.shareEl.elt.style.display = 'none';
}

function p7Save() {
  if (!P7.buf || P7.saved) return;
  savePostcard(appState.nickname || '관람객', P7.buf);
  P7.saved = true;
  p7HideShare();
  goTo(8);
}
