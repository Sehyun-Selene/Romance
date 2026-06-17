// 수궁도 — 메인 스케치 (8페이지 상태머신 뼈대)
// 좌표계: 내부 1280×800 고정. CSS로 창에 맞춰 종횡비 유지 스케일/레터박스(fitCanvas).
// p5의 mouseX/mouseY는 CSS 스케일을 보정해 항상 1280×800 좌표로 들어온다.

const DW = 1280, DH = 800;               // 디자인 기준 해상도
let mainCanvas;

// ── 색 토큰 (시안에서 추출) ──
const COLORS = {
  bg:        '#e7e3da',   // 페이지 배경 베이지
  ink:       '#4a4138',   // 본문 텍스트(짙은 갈색)
  inkSoft:   '#8b8073',   // 보조 텍스트
  btn:       '#cdc4b4',   // 버튼/칩 베이지
  btnText:   '#4a4138',
  slotEmpty: '#efe9dc',   // 빈 슬롯
  slotYellow:'#f1d27a',   // 클릭 후 미선택(밝은 노랑)
  slotBeige: '#b8a98f',   // 낭만 확정(진한 베이지/갈색)
  line:      '#bdb4a4',
};

const PAGE_NAMES = ['', '메인', '닉네임', '태그 선택', '일정 추가', '낭만 채우기', '투두리스트', '엽서', '엽서집'];

// idle 자동 리셋 (전시 안정성, PRD §7)
let lastInputAt = 0;
const IDLE_MS = 100000;                  // 100초 무입력 → 메인 복귀

let DEV = true;                          // 개발용 네비/패널 표시
let showAssetPanel = false;              // 'a' 키로 자산 점검 패널 토글

function preload() {
  preloadAssets();
}

function setup() {
  mainCanvas = createCanvas(DW, DH);
  fitCanvas();
  textFont(fontBody);
  imageMode(CORNER);
  lastInputAt = millis();
  if (typeof p2Init === 'function') p2Init();
  if (typeof p4Init === 'function') p4Init();

  // 음악 초기 볼륨 설정 (바로 재생하진 않고 대기)
  if (bgMusic) {
    bgMusic.setVolume(1.0); // 0.0(묵음) ~ 1.0(최대) 사이로 조절 가능
  }

  // 텍스트 입력 칸에 포커스가 있는 상태에서 캔버스(버튼 등)를 클릭하면,
  // 포커스 이동(blur)이 클릭과 같은 프레임에 겹쳐 그 클릭이 버튼 동작으로
  // 이어지지 않는 경우가 있다. mousedown 캡처 단계에서 입력 필드를 먼저
  // blur 시켜 두면 캔버스로 가는 클릭이 정상적으로 처리된다.
  document.addEventListener('pointerdown', (e) => {
    const ae = document.activeElement;
    if (ae && ae !== e.target && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') && !ae.contains(e.target)) {
      ae.blur();
    }
  }, true);
}

function windowResized() { fitCanvas(); }

// 캔버스를 창 크기에 맞춰 종횡비 유지로 스케일 (CSS만 변경, 내부 해상도는 1280×800 유지)
function fitCanvas() {
  const s = Math.min(windowWidth / DW, windowHeight / DH);
  mainCanvas.elt.style.width = (DW * s) + 'px';
  mainCanvas.elt.style.height = (DH * s) + 'px';
}

function draw() {
  background(COLORS.bg);
  textWrap(CHAR);          // textWrap(WORD) 상태 전파 방지 — 매 프레임 리셋
  _buttons = [];
  _devNav = [];

  if (typeof p2OnFrame === 'function') p2OnFrame();
  if (typeof p4OnFrame === 'function') p4OnFrame();

  try {
    switch (appState.screen) {
      case 1: drawPage1(); break;
      case 2: drawPage2(); break;
      case 3: drawPage3(); break;
      case 4: drawPage4(); break;
      case 5: drawPage5(); break;
      case 6: drawPage6(); break;
      case 7: drawPage7(); break;
      case 8: drawPage8(); break;
    }
  } catch (e) {
    // 예외 시 흰 화면 대신 메인으로 (전시 안전장치)
    console.error(e);
    resetSession();
  }

  if (showAssetPanel) drawAssetPanel();
  if (DEV) drawDevNav();
  drawIdleCountdown();   // idle 20초 전 카운트다운 표시
  checkIdle();
}

// ── 공통 UI ──
function drawHeader() {
  // 좌상단 로고 이미지 + '일일산수' 텍스트. 클릭 시 처음 화면으로.
  const labelX = 78, headerY = 42, labelH = 20;
  if (imgHeaderLogo) {
    const lh = 52;
    const lw = imgHeaderLogo.width * (lh / imgHeaderLogo.height);
    imageMode(CENTER);
    image(imgHeaderLogo, labelX - lw / 2 + 20, headerY + 5, lw, lh);
    imageMode(CORNER);
  }
  push();
  fill(COLORS.ink);
  textFont(fontHeading);
  textSize(labelH);
  textAlign(LEFT, CENTER);
  text('일일산수', labelX, headerY);
  pop();
  // 로고 + 텍스트 영역 전체 클릭 → 처음 화면으로
  _buttons.push({ x: 36, y: 22, w: 200, h: 40, onClick: () => { resetSession(); goTo(1); } });
}

function centerTitle(str, y, size = 34) {
  push();
  fill(COLORS.ink);
  textFont(fontHeading);
  textSize(size);
  textAlign(CENTER, CENTER);
  text(str, DW / 2, y);
  pop();
}

// ── 한자/한글 혼합 텍스트 (한자 글리프 없는 본문폰트 깨짐 방지) ──
// ctx: 메인은 window, 버퍼는 p5.Graphics. 한자는 시스템 'serif' 폴백.
function _isHan(cp) {
  return (cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF) || (cp >= 0xF900 && cp <= 0xFAFF);
}
function drawMixedText(ctx, str, x, y, boxW, size, korFont, lineH) {
  ctx.push();
  ctx.textSize(size); ctx.textAlign(LEFT, TOP);
  const fontFor = ch => (_isHan(ch.codePointAt(0)) ? 'serif' : korFont);
  const words = String(str).split(' ');
  let cx = x, cy = y;
  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    // 토큰 폭 계산
    let ww = 0;
    for (const ch of word) { ctx.textFont(fontFor(ch)); ww += ctx.textWidth(ch); }
    if (cx > x && (cx - x) + ww > boxW) { cx = x; cy += lineH; }   // 줄바꿈
    for (const ch of word) { ctx.textFont(fontFor(ch)); ctx.text(ch, cx, cy); cx += ctx.textWidth(ch); }
    if (wi < words.length - 1) { ctx.textFont(korFont); ctx.text(' ', cx, cy); cx += ctx.textWidth(' '); }
  }
  ctx.pop();
  return cy + lineH;
}

// ── 일정 색: 베이스 베이지(#b8a98f) 톤 유지, 명도만 일정별로 차등 (D-1) ──
function scheduleColor(id) {
  const base = [184, 169, 143];
  const steps = [0.80, 0.88, 0.96, 1.05, 1.13];
  const f = steps[Math.abs((id || 0) * 7) % steps.length];
  return color(min(base[0] * f, 255), min(base[1] * f, 255), min(base[2] * f, 255));
}

// 임시 페이지 본문(뼈대): 이후 단계에서 각 페이지 파일로 대체
function pagePlaceholder(label) {
  push();
  fill(COLORS.inkSoft);
  textFont(fontBody);
  textSize(16);
  textAlign(CENTER, CENTER);
  text(`[${label}] — 이후 단계에서 구현`, DW / 2, DH / 2);
  pop();
}

// ── 페이지별 (뼈대) ──
function drawPage1() {
  image(bgMain, 0, 0, DW, DH);
  push();
  textAlign(CENTER, CENTER);
  fill(COLORS.ink);
  const yOff = 30; // 전체 콘텐츠를 살짝 위로 이동
  const ty = DH / 2 - 60 - yOff;
  // 한자 이미지 ('일일산수' 텍스트 위)
  if (imgHanjaTitle) {
    const ih = 28;
    const iw = imgHanjaTitle.width * (ih / imgHanjaTitle.height);
    imageMode(CENTER);
    image(imgHanjaTitle, DW / 2, ty - 54, iw, ih);
    imageMode(CORNER);
  }
  // 한글 제목
  textAlign(CENTER, CENTER);
  fill(COLORS.ink);
  textFont(fontTitle); textSize(64); text('일일산수', DW / 2, ty);

  textAlign(CENTER, CENTER);
  textFont(fontHeading); textSize(26); fill(COLORS.inkSoft);
  text('하루의 빈 시간을 낭만으로 채워보세요', DW / 2, DH / 2 + 8 - yOff);
  pop();
  drawButton('시작하기', DW / 2, DH / 2 + 92 - yOff, 150, 54, () => goTo(2), -2);
  // B-1: 엽서집 바로가기
  drawButton('엽서집 보기', DW / 2, DH / 2 + 158 - yOff, 150, 54, () => goTo(8), -2);
}

// drawPage2/3 → src/pages/p2_nickname.js, p3_tags.js
// drawPage4 는 src/pages/p4_schedule.js 에 정의
// drawPage5 → src/pages/p5_fill.js
// drawPage6 → src/pages/p6_todo.js
// drawPage7/8 → src/pages/p7_postcard.js, p8_gallery.js

// ── 버튼 헬퍼 (그리기 + 이번 프레임 클릭 영역 등록) ──
let _buttons = [];
function drawButton(label, cx, cy, w, h, onClick, textYOffset = 0) {
  const over = mouseInRect(cx - w / 2, cy - h / 2, w, h);
  push();
  noStroke();
  fill(over ? COLORS.slotBeige : COLORS.btn);
  rectMode(CENTER);
  rect(cx, cy, w, h, 8);
  fill(COLORS.btnText);
  textFont(fontHeading);
  textSize(18);
  textAlign(CENTER, CENTER);
  text(label, cx, cy + textYOffset);
  pop();
  _buttons.push({ x: cx - w / 2, y: cy - h / 2, w, h, onClick });
}

function mouseInRect(x, y, w, h) {
  return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
}

// ── 개발용 네비 바 (DEV=false면 사라짐) ──
function drawDevNav() {
  const cy = DH - 17;
  const lx = DW / 2 - 200, rx = DW / 2 + 200;   // 이전/다음 화살표 중심
  push();
  noStroke();
  fill(0, 0, 0, 30);
  rect(0, DH - 34, DW, 34);
  fill(COLORS.ink);
  textFont(fontBody);
  textSize(13);
  // 중앙 라벨
  textAlign(CENTER, CENTER);
  text(`[ ${appState.screen} / 8 · ${PAGE_NAMES[appState.screen]} ]      (a: 자산점검)`, DW / 2, cy);
  // 이전(왼쪽 삼각형) — 글리프 대신 직접 그려 폰트 무관하게 대칭
  triangle(lx - 8, cy, lx + 6, cy - 7, lx + 6, cy + 7);
  textAlign(LEFT, CENTER);
  text('이전', lx + 14, cy);
  // 다음(오른쪽 삼각형)
  textAlign(RIGHT, CENTER);
  text('다음', rx - 14, cy);
  triangle(rx + 8, cy, rx - 6, cy - 7, rx - 6, cy + 7);
  pop();
  // 클릭 영역
  _devNav = [
    { x: lx - 20, y: DH - 34, w: 80, h: 34, fn: () => goTo(max(1, appState.screen - 1)) },
    { x: rx - 60, y: DH - 34, w: 80, h: 34, fn: () => goTo(min(8, appState.screen + 1)) },
  ];
}
let _devNav = [];

// ── 자산 점검 패널 ('a' 토글): 모든 산/토끼/배경이 투명하게 로드되는지 확인 ──
function drawAssetPanel() {
  push();
  fill(0, 0, 0, 180);
  rect(0, 0, DW, DH);
  fill(255); textFont(fontBody); textSize(16); textAlign(LEFT, TOP);
  text('자산 점검 — 산 13 · 토끼 3 · 배경 2 (검은 사각형 위에 투명 합성)', 30, 24);
  let x = 30, y = 60; const w = 150, h = 100, gap = 12;
  for (const k of MOUNTAIN_KEYS) {
    fill(20); rect(x, y, w, h);
    image(mountains[k], x, y, w, h);
    fill(255); textSize(11); text(k, x + 4, y + h + 2);
    x += w + gap;
    if (x + w > DW - 30) { x = 30; y += h + 26; }
  }
  for (const [k, img] of Object.entries(rabbits)) {
    fill(20); rect(x, y, w, h);
    image(img, x, y, w, h);
    fill(255); textSize(11); text('토끼:' + k, x + 4, y + h + 2);
    x += w + gap;
    if (x + w > DW - 30) { x = 30; y += h + 26; }
  }
  pop();
}

// ── 입력/Idle ──
function registerInput() { lastInputAt = millis(); }

function checkIdle() {
  if (appState.screen !== 1 && millis() - lastInputAt > IDLE_MS) {
    resetSession();
    goTo(1);
  }
}

// idle 카운트다운 — 마지막 20초 남으면 우상단에 표시
function drawIdleCountdown() {
  if (appState.screen === 1) return;
  const elapsed = millis() - lastInputAt;
  const remaining = IDLE_MS - elapsed;
  if (remaining > 20000) return;
  const secs = ceil(remaining / 1000);
  push();
  const a = map(sin(frameCount * 0.2), -1, 1, 160, 255);
  fill(150, 60, 50, a);
  textFont(fontBody); textSize(13); textAlign(RIGHT, TOP);
  text(`${secs}초 후 처음으로 돌아갑니다`, DW - 20, 20);
  pop();
}

function mousePressed(e) {
  registerInput();
  // 텍스트 입력 후 곧바로 클릭하면 mouseX/Y 갱신이 한 입력만큼 지연되어
  // 첫 클릭이 무시되는 경우가 있어, 이벤트의 실제 좌표로 보정한다.
  if (e && mainCanvas) {
    const rect = mainCanvas.elt.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (DW / rect.width);
    mouseY = (e.clientY - rect.top) * (DH / rect.height);
  }
  for (const b of _devNav) if (mouseInRect(b.x, b.y, b.w, b.h)) { b.fn(); return; }
  for (let i = _buttons.length - 1; i >= 0; i--) {
    const b = _buttons[i];
    if (mouseInRect(b.x, b.y, b.w, b.h)) { b.onClick(); return; }
  }
  // 드래그 시작 (버튼 영역 아닐 때)
  if (typeof p4OnPress === 'function') p4OnPress();
}

function mouseDragged() {
  registerInput();
  if (typeof p4OnDrag === 'function') p4OnDrag();
}

function mouseReleased() {
  registerInput();
  if (typeof p4OnRelease === 'function') p4OnRelease();
}

function keyPressed() {
  registerInput();
  if (appState.screen === 8 && keyIsDown(SHIFT) && keyCode === DELETE) {
    if (typeof clearPostcards === 'function') clearPostcards();
    if (typeof P8 !== 'undefined') {
      P8.previewCache = {};
      P8.infoCache = {};
      P8.modal = null;
      P8.page = 0;
    }
    return false;
  }
  if (appState.screen === 4 && P4.modal?.type === 'addSchedule' && keyCode === ENTER) {
    p4AddSchedule();
    return false;
  }
  if (key === 'a' || key === 'A') showAssetPanel = !showAssetPanel;
  if (key === 'd' || key === 'D') { DEV = !DEV; console.log('DEV mode:', DEV); }  // 'd' → 전시/개발 토글
  if (DEV) {
    if (keyCode === LEFT_ARROW)  goTo(max(1, appState.screen - 1));
    if (keyCode === RIGHT_ARROW) goTo(min(8, appState.screen + 1));
  }
}
