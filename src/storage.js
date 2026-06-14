// 엽서 localStorage 저장/조회 (PRD §4 — sugungdo_postcards)
// JPEG 400px 압축으로 용량 최소화 (이틀 전시 ~ 수백 장 대비)

const STORAGE_KEY = 'sugungdo_postcards';
const SAVE_W = 625;   // H-1: 저장 해상도 원본폭(선명도↑)

// share: encodeShareState() 결과(낭만목록+글귀 복원용). 없으면 ''.
function savePostcard(nickname, pgBuf, share, ownerSessionId) {
  const srcW = pgBuf.width, srcH = pgBuf.height;
  const dstH = Math.round(SAVE_W * srcH / srcW);
  const tmp  = document.createElement('canvas');
  tmp.width  = SAVE_W; tmp.height = dstH;
  tmp.getContext('2d').drawImage(pgBuf.elt, 0, 0, SAVE_W, dstH);
  const dataURL = tmp.toDataURL('image/jpeg', 0.8);   // H-1: 품질↑

  const list = loadPostcards();
  list.push({
    id: Date.now(),
    nickname,
    imageDataURL: dataURL,
    date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
    share: share || '',   // H-2: 낭만/글귀 복원용
    ownerSessionId: ownerSessionId || '',
  });

  // 5MB 초과 대비: 가장 오래된 항목부터 제거
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    if (list.length > 1) {
      list.shift();
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
    }
  }
}

function loadPostcards() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch (e) { return []; }
}
