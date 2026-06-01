// 엽서 localStorage 저장/조회 (PRD §4 — sugungdo_postcards)
// JPEG 400px 압축으로 용량 최소화 (이틀 전시 ~ 수백 장 대비)

const STORAGE_KEY = 'sugungdo_postcards';
const SAVE_W = 400;   // 저장 해상도 가로 (PRD: 800px 이하 권장, 여유있게 400)

function savePostcard(nickname, pgBuf) {
  // pgBuf: p5.Graphics — 625×420 postcard buffer
  // 1) 400px로 축소 후 JPEG 직렬화
  const srcW = pgBuf.width, srcH = pgBuf.height;
  const dstH = Math.round(SAVE_W * srcH / srcW);
  const tmp  = document.createElement('canvas');
  tmp.width  = SAVE_W; tmp.height = dstH;
  tmp.getContext('2d').drawImage(pgBuf.elt, 0, 0, SAVE_W, dstH);
  const dataURL = tmp.toDataURL('image/jpeg', 0.75);

  const list = loadPostcards();
  list.push({
    id: Date.now(),
    nickname,
    imageDataURL: dataURL,
    date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
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
