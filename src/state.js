// 수궁도 — 전역 상태 (한 세션 동안 메모리에 유지, "처음 화면으로" 시 초기화)

// 하루 난이도 → 미션 난이도 매핑 (PRD §2)
const difficultyMap = {
  '여유로워요': '상',
  '보통이에요': '중',
  '힘들어요': '하',
};

// 화면 표시 라벨 ↔ 내부 키(data.js category). C-1: 개인유지→자기관리 (라벨만)
const TAG_LABELS = { '사회교제': '사회/교제', '개인유지': '자기관리' };
const TAG_KEYS = { '사회/교제': '사회교제', '자기관리': '개인유지' };
const TAG_DISPLAY = ['휴식힐링', '자기관리', '문화예술', '사회/교제', '아웃도어', '생산성'];
const tagKeyOf = label => (TAG_KEYS[label] || label);    // 표시 라벨 → 내부 키
const tagLabelOf = key => (TAG_LABELS[key] || key);      // 내부 키 → 표시 라벨

function makeSessionId() {
  return 'sess-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function makeInitialState() {
  return {
    sessionId: makeSessionId(), // 현재 관람객 세션. 엽서집 링크 권한 판별용
    screen: 1,                  // 1~8
    nickname: '',
    selectedTags: [],           // 내부 키 배열, 최소 3개
    wakeTime: '07:00',
    sleepTime: '23:00',
    schedules: [],              // 사용자 추가 일정 [{id,startMin,endMin,name}] (타임테이블의 source)
    scheduleSeq: 0,             // 일정 id 시퀀스
    timetable: [],              // 30분 슬롯 배열 (wake~sleep에서 파생)
    dayDifficulty: null,        // '여유로워요' | '보통이에요' | '힘들어요'
    chosenMissions: [],         // 채운 낭만(+ mountainKey, draw 랜덤값)
    usedMissionIds: new Set(),  // 추천에 쓴 미션 id (중복 방지)
    checkedMissionOrder: [],    // 투두에서 체크한 낭만 순서(산 그리는 순서)
    postcard: null,             // 최종 엽서 데이터
  };
}

let appState = makeInitialState();

// 세션 초기화 (localStorage 엽서집은 건드리지 않음)
function resetSession() {
  appState = makeInitialState();
  registerInput();            // idle 타이머 리셋 (sketch.js 정의)
  if (typeof p2Reset === 'function') p2Reset();
  if (typeof p4Reset === 'function') p4Reset();
  if (typeof p5Reset === 'function') p5Reset();
  if (typeof p6Reset === 'function') p6Reset();
  if (typeof p7Reset === 'function') p7Reset();
  if (typeof p8Reset === 'function') p8Reset();
}

// 페이지 이동 헬퍼 — 드롭다운 닫기 등 side effects 포함
function goTo(screen) {
  appState.screen = screen;
  if (typeof p4CloseDropdown === 'function') p4CloseDropdown();  // P4 드롭다운 열린 채 이탈 방지
  
  if (bgMusic && !bgMusic.isPlaying()) {
    bgMusic.loop();
  }; //어떤 버튼이든 눌러서 페이지가 이동할 때 음악이 재생 중이 아니라면 반복 재생 시작
}
