// 수궁도 — 자산 로딩 + 산↔카테고리 매핑
//
// ⚠️ PRD §1 정정: PRD는 "산/토끼가 검은 배경 불투명 PNG라 blendMode(SCREEN)로
//    검은 배경을 제거하라"고 했으나, 실제 첨부 파일은 *이미 알파 투명 PNG*(32bppArgb,
//    모서리 alpha=0, 산/토끼는 어두운 먹선)다. 따라서 blendMode를 쓰면 안 되고
//    (오히려 톤이 망가짐), image()로 직접 그린 뒤 페이드인은 tint(255, alpha)로 한다.

const IMG_DIR = '이미지 모음';
const FONT_DIR = '글꼴 모음';

// 폰트 (역할별)
let fontTitle;     // 솔뫼 김대건 — 메인 타이틀(최대)
let fontHeading;   // MapoGoldenPier — 페이지 타이틀/버튼
let fontBody;      // MapoFlowerIsland — 본문 작은 글씨

// 배경
let bgMain;        // 메인페이지 배경
let bgPostcard;    // 엽서 기본배경 (2~8p 공통 + 엽서 바탕)

// 산 13개 (키 = 파일명 stem), 토끼 3개
const mountains = {};                 // { "산2-1": p5.Image, ... }
const rabbits = {};                   // { still, jump, land }

const MOUNTAIN_KEYS = ['산1','산1-2','산1-3','산1-4','산2','산2-1','산2-2','산3','산3-1','산3-2','산4','산5','산6'];

// 카테고리 → 봉우리 산 (PRD §2.5). "쉬기"는 언덕 4개 전용.
const categoryToMountains = {
  '아웃도어': ['산2-1', '산6'],
  '문화예술': ['산3-1', '산2'],
  '휴식힐링': ['산5'],
  '생산성':   ['산3'],
  '사회교제': ['산2-2'],
  '개인유지': ['산3-2', '산4'],
};
const restHills = ['산1', '산1-2', '산1-3', '산1-4'];   // "쉬기" 전용 언덕

function preloadAssets() {
  fontTitle   = loadFont(`${FONT_DIR}/솔뫼 김대건OTF Medium.otf`);
  fontHeading = loadFont(`${FONT_DIR}/MapoGoldenPier.otf`);
  fontBody    = loadFont(`${FONT_DIR}/MapoFlowerIsland.otf`);

  bgMain     = loadImage(`${IMG_DIR}/메인페이지배경.png`);
  bgPostcard = loadImage(`${IMG_DIR}/엽서 기본배경.png`);

  for (const k of MOUNTAIN_KEYS) mountains[k] = loadImage(`${IMG_DIR}/${k}.png`);
  rabbits.still = loadImage(`${IMG_DIR}/토끼1.png`);  // 정지
  rabbits.jump  = loadImage(`${IMG_DIR}/토끼2.png`);  // 점프
  rabbits.land  = loadImage(`${IMG_DIR}/토끼3.png`);  // 착지
}

// 미션 객체 → 산 키 1개 확정 (투두에서 매번 같은 산이 나오도록 호출부에서 저장)
function pickMountainKey(mission) {
  if (mission.isRest) return random(restHills);
  const pool = categoryToMountains[mission.category];
  return random(pool && pool.length ? pool : restHills);
}

function getMountain(key) { return mountains[key]; }
