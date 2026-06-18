// P2 — 닉네임 입력 (시안: 중앙 패널 + pill 입력란)
const P2 = { inited: false, inEl: null, warn: false, warnAt: -9999 };

const P2_BOX = { x: 340, y: 310, w: 600, h: 120 };  // 1280/2-300=340 (DW는 이 파일 평가 시점에 미정의)

function p2Init() {
  if (P2.inited) return;
  P2.inEl = createInput('', 'text');
  P2.inEl.attribute('placeholder', '이름을 입력해주세요');
  P2.inEl.elt.style.cssText = [
    'box-sizing:border-box', 'border:none', 'background:transparent',
    'text-align:center', 'color:#4a4138',
    'font-family:MapoFlowerIsland,sans-serif', 'outline:none',
  ].join(';');
  P2.inEl.hide();
  P2.inited = true;
}

function p2Reset() {
  if (!P2.inited) return;
  P2.inEl.value('');
  appState.nickname = '';
  P2.warn = false;
}

function p2OnFrame() {
  if (!P2.inited) return;
  if (appState.screen !== 2) { P2.inEl.hide(); return; }
  const rect = mainCanvas.elt.getBoundingClientRect();
  const sc   = rect.width / DW;
  // pill 오른쪽 절반(구분선 우측) 위에 input 배치
  const pillX = P2_BOX.x + 20, pillY = P2_BOX.y + 42, pillW = P2_BOX.w - 40;
  const splitX = pillX + pillW * 0.32;  // "이름:" 라벨 끝
  P2.inEl.show();
  P2.inEl.position(rect.left + window.scrollX + splitX * sc, rect.top + window.scrollY + pillY * sc);
  P2.inEl.size((pillX + pillW - splitX) * sc - 6, 34 * sc);
  P2.inEl.style('font-size', (17 * sc) + 'px');
}

function drawPage2() {
  image(bgPostcard, 0, 0, DW, DH);
  drawHeader();

  // 타이틀
  push();
  fill(COLORS.ink); textFont(fontHeading); textSize(26); textAlign(CENTER, CENTER);
  text('사용하실 이름을 입력해주세요.', DW / 2, 240);
  pop();

  // 패널 + pill
  push();
  noStroke(); fill('#f4f0e8'); rect(P2_BOX.x, P2_BOX.y, P2_BOX.w, P2_BOX.h, 14);
  noFill(); stroke(COLORS.line); strokeWeight(1.2); rect(P2_BOX.x, P2_BOX.y, P2_BOX.w, P2_BOX.h, 14);

  const px = P2_BOX.x + 20, py = P2_BOX.y + 42, pw = P2_BOX.w - 40;
  noStroke(); fill(COLORS.slotEmpty); rect(px, py, pw, 34, 17);
  // 라벨
  fill(COLORS.ink); textFont(fontBody); textSize(16); textAlign(CENTER, CENTER);
  text('이름', px + pw * 0.16, py + 17);
  // 구분선
  stroke(COLORS.line); strokeWeight(1); line(px + pw * 0.32, py + 8, px + pw * 0.32, py + 26);
  pop();

  // 경고 반짝임
  if (P2.warn && millis() - P2.warnAt < 2400) {
    const a = map(sin(frameCount * 0.18), -1, 1, 80, 255);
    push();
    fill(150, 60, 50, a); textFont(fontBody); textSize(15); textAlign(CENTER, CENTER);
    text('이름을 입력해주세요', DW / 2, P2_BOX.y + P2_BOX.h + 28);
    pop();
  }

  drawButton('다음으로', DW / 2, 510, 150, 46, p2Confirm, -2);
}

function p2Confirm() {
  const v = (P2.inEl ? P2.inEl.value() : '').trim();
  if (!v) { P2.warn = true; P2.warnAt = millis(); return; }
  appState.nickname = v;
  goTo(3);
}
