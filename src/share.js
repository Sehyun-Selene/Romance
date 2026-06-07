// 공유 상태 코덱 — appState ↔ URL 파라미터 (DB 불필요, self-contained)
// 미션은 id만 저장하고 텍스트/카테고리는 MISSIONS에서 복원 → URL 짧게 유지.
// 포맷 v1:
//   { v, n:nickname, w:wake, s:sleep, q:quoteIdx, d:dateStr,
//     sc:[[startMin,endMin,name],...],
//     cm:[[id,mtn,ox,oy,scaleX100,rot,slotMin],...] }

function _b64urlEncode(str) {
  // UTF-8 안전 base64url
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function _b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return decodeURIComponent(escape(atob(s)));
}

// appState + P6.quote → 인코딩 문자열
function encodeShareState() {
  const quoteIdx = (typeof P6 !== 'undefined' && P6.quote) ? QUOTES.indexOf(P6.quote) : -1;
  const dateStr = (typeof p6DateStr === 'function') ? p6DateStr() : '';
  const obj = {
    v: 1,
    n: appState.nickname || '',
    w: appState.wakeTime,
    s: appState.sleepTime,
    q: quoteIdx,
    d: dateStr,
    sc: appState.schedules.map(s => [s.startMin, s.endMin, s.name]),
    cm: appState.chosenMissions.map(m => {
      const dr = m.drawRandom || { offsetX: 0, offsetY: 0, scale: 1, rotation: 0 };
      return [m.id, m.mountainKey, Math.round(dr.offsetX), Math.round(dr.offsetY),
              Math.round(dr.scale * 100), Math.round(dr.rotation), m.slotMinutes];
    }),
  };
  return _b64urlEncode(JSON.stringify(obj));
}

// 인코딩 문자열 → 복원 객체 (view 페이지에서 사용)
function decodeShareState(str) {
  const obj = JSON.parse(_b64urlDecode(str));
  const byId = {};
  if (typeof MISSIONS !== 'undefined') for (const m of MISSIONS) byId[m.id] = m;

  const chosen = (obj.cm || []).map(a => {
    const [id, mtn, ox, oy, scX100, rot, sm] = a;
    const src = byId[id];
    const isRest = !src;   // MISSIONS에 없으면 쉬기
    return {
      id,
      text: src ? src.text : '쉬기',
      category: src ? src.category : '쉬기',
      difficulty: src ? src.difficulty : '쉬기',
      isRest,
      slotMinutes: sm,
      mountainKey: mtn,
      drawRandom: { offsetX: ox, offsetY: oy, scale: scX100 / 100, rotation: rot },
    };
  });

  return {
    nickname: obj.n || '',
    wakeTime: obj.w, sleepTime: obj.s,
    quote: (obj.q >= 0 && typeof QUOTES !== 'undefined') ? QUOTES[obj.q] : null,
    date: obj.d || '',
    schedules: (obj.sc || []).map((s, i) => ({ id: i + 1, startMin: s[0], endMin: s[1], name: s[2] })),
    chosenMissions: chosen,
  };
}

// 공유 URL 생성 (view.html)
function buildShareURL() {
  const base = location.origin + location.pathname.replace(/[^/]*$/, '');
  return base + 'view.html?s=' + encodeShareState();
}
