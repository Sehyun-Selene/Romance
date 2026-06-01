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

// target: 빈 시간 블록 길이(분, ≤180으로 클램프된 값)
function recommendMissions(target) {
  const base = difficultyMap[appState.dayDifficulty] || '중';
  const tags = appState.selectedTags;
  const used = appState.usedMissionIds;
  const adj = _adjacent(base);

  const filters = [
    m => m.difficulty === base && m.duration === target,                          // 0차: 정확 일치
    m => adj.includes(m.difficulty) && m.duration === target,                     // 1차: 난이도 인접
    m => adj.includes(m.difficulty) && Math.abs(m.duration - target) <= 30,       // 2차: ±30분
  ];

  let pool = [];
  for (const f of filters) {
    pool = MISSIONS.filter(m => tags.includes(m.category) && f(m) && !used.has(m.id));
    if (pool.length >= 3) break;
  }
  if (pool.length < 3) {   // 3차: 중복제외 해제
    pool = MISSIONS.filter(m => tags.includes(m.category) && adj.includes(m.difficulty) && Math.abs(m.duration - target) <= 30);
  }

  const picks = shuffle(pool).slice(0, 3);     // shuffle: 원본 보존 복사본 반환
  picks.forEach(p => used.add(p.id));
  while (picks.length < 3) picks.push(makeRest(target));   // 그래도 모자라면 쉬기로 채움
  return [...picks, makeRest(target)];          // "쉬기" 항상 마지막 고정
}
