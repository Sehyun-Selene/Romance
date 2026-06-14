// 미션 추천 (PRD §2) — 빈 시간 길이·하루 난이도·태그로 후보 4개(랜덤 3 + "쉬기") 생성.
// 후보가 3개 미만이면 A안 단계적 완화: 난이도 인접 확장 → ±30분 → 중복제외 해제 → 쉬기로 패딩.

let _restSeq = 0;
function makeRest(target) {
  return { id: 'rest-' + (++_restSeq), isRest: true, category: '쉬기', duration: target, difficulty: '쉬기', text: '쉬기' };
}

function _adjacent(base) {
  const order = ['상', '중', '하'];
  const i = order.indexOf(base);
  const r = [base];
  if (i > 0) r.push(order[i - 1]);
  if (i < 2) r.push(order[i + 1]);
  return r;
}

// ── F-2: 시간대 제약 (19개 미션만, 나머지는 any) ──
// data.js는 자동생성 파일이라 건드리지 않고 여기 별도 맵으로 둠.
const MISSION_TIME = {
  'out-90-mid-1': ['점심'], 'out-150-mid-1': ['아침', '점심'], 'out-180-mid-1': ['점심'], 'out-150-low-1': ['점심'],
  'art-120-up-1': ['점심'], 'art-90-mid-1': ['점심'], 'art-150-mid-1': ['점심'],
  'heal-150-mid-1': ['점심'], 'heal-120-low-1': ['점심'],
  'prod-60-mid-1': ['점심'], 'prod-90-mid-1': ['점심'], 'prod-120-mid-1': ['점심'], 'prod-120-low-1': ['점심'],
  'soc-90-up-1': ['점심', '저녁'], 'soc-120-low-1': ['점심'], 'soc-180-low-1': ['저녁'],
  'self-90-mid-1': ['저녁'], 'self-120-mid-1': ['점심'], 'self-30-low-1': ['저녁'],
};
// 분 단위 시각 → 시간대. 아침05~11 / 점심11~18 / 저녁18~익일03
function timeBandOf(startMin) {
  const m = ((startMin % 1440) + 1440) % 1440;
  if (m >= 300 && m < 660) return '아침';
  if (m >= 660 && m < 1080) return '점심';
  return '저녁';   // 1080~1440, 0~300(새벽)
}
function _okTime(m, band) {
  const t = MISSION_TIME[m.id];
  return !t || t.includes(band);
}

// target: 빈 시간 블록 길이(분, ≤180). startMin: 블록 시작 시각(분) — 시간대 제약용
function recommendMissions(target, startMin) {
  const base = difficultyMap[appState.dayDifficulty] || '중';
  const tags = appState.selectedTags;
  const used = appState.usedMissionIds;
  const adj = _adjacent(base);
  const band = (startMin == null) ? null : timeBandOf(startMin);
  const timeOK = m => (band == null) || _okTime(m, band);   // 시간대는 절대 완화 안 함

  const filters = [
    m => m.difficulty === base && m.duration === target,
    m => adj.includes(m.difficulty) && m.duration === target,
    m => adj.includes(m.difficulty) && Math.abs(m.duration - target) <= 30,
  ];

  let pool = [];
  for (const f of filters) {
    pool = MISSIONS.filter(m => tags.includes(m.category) && timeOK(m) && f(m) && !used.has(m.id));
    if (pool.length >= 3) break;
  }
  if (pool.length < 3) {   // 3차: 중복제외 해제 (시간대는 유지)
    pool = MISSIONS.filter(m => tags.includes(m.category) && timeOK(m) && adj.includes(m.difficulty) && Math.abs(m.duration - target) <= 30);
  }

  const picks = shuffle(pool).slice(0, 3);
  picks.forEach(p => used.add(p.id));
  while (picks.length < 3) picks.push(makeRest(target));
  return [...picks, makeRest(target)];
}
