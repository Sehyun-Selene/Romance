const STORAGE_KEY = 'sugungdo_postcards';
const SAVE_W = 625;

function savePostcard(nickname, pgBuf, share, ownerSessionId) {
  const srcW = pgBuf.width;
  const srcH = pgBuf.height;
  const dstH = Math.round(SAVE_W * srcH / srcW);
  const tmp = document.createElement('canvas');
  tmp.width = SAVE_W;
  tmp.height = dstH;
  tmp.getContext('2d').drawImage(pgBuf.elt, 0, 0, SAVE_W, dstH);
  const dataURL = tmp.toDataURL('image/jpeg', 0.8);

  const list = loadPostcards();
  list.push({
    id: Date.now(),
    nickname,
    imageDataURL: dataURL,
    date: new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    share: share || '',
    ownerSessionId: ownerSessionId || '',
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    if (list.length > 1) {
      list.shift();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch (_) {}
    }
  }
}

function loadPostcards() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function clearPostcards() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}
