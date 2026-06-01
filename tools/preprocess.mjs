// 수궁도 — 미션 CSV 전처리 스크립트 (1회 실행용)
// 규칙: 시간대=열 위치(진실), 난이도=괄호값 우선·누락/오류 시 행 위치로 보정,
//       텍스트는 머리말 "- "·말미 괄호 제거·HTML 엔티티 정리.
// 출력: 분포 검증표(콘솔) + ../src/data.js 생성(MISSIONS + QUOTES 인라인)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CSV_PATH = join(ROOT, '미션 정리.xlsx - 시간, 난이도 통합.csv');
const OUT_PATH = join(ROOT, 'src', 'data.js');

// ── 1. 최소 CSV 파서 (따옴표 안의 콤마/줄바꿈 처리) ──────────────────
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ── 2. 상수/매핑 ──────────────────────────────────────────────────
const DURATION_BY_COL = [null, 30, 60, 90, 120, 150, 180]; // 열 인덱스 → 분
const DUR_LABEL = { 30: '30분', 60: '1시간', 90: '1시간30분', 120: '2시간', 150: '2시간30분', 180: '3시간' };
const ROW_DIFF = ['상', '중', '하'];          // 카테고리 블록 내 행 순서
const CATS = ['아웃도어', '문화예술', '휴식힐링', '생산성', '사회교제', '개인유지'];
const CAT_CODE = { 아웃도어: 'out', 문화예술: 'art', 휴식힐링: 'heal', 생산성: 'prod', 사회교제: 'soc', 개인유지: 'self' };
const DIFF_CODE = { 상: 'up', 중: 'mid', 하: 'low' };

// 괄호 블롭에서 난이도 추출 (하_, 하) 등 노이즈 허용)
function parseDifficulty(blob) {
  const m = blob.match(/[상중하]/);
  return m ? m[0] : null;
}
// 괄호 블롭에서 시간 추출(괄호/열 충돌 리포트용). 긴 패턴 먼저.
function parseDurationFromBlob(blob) {
  const pats = [['2시간 30분', 150], ['1시간 30분', 90], ['2시간', 120], ['3시간', 180], ['1시간', 60], ['30분', 30]];
  for (const [p, v] of pats) if (blob.includes(p)) return v;
  return null;
}

function cleanText(raw) {
  let t = raw.trim();
  t = t.replace(/&lsquo;|&rsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, '&');
  t = t.replace(/^[-‐–—]\s*/, '');           // 머리말 "- " 제거
  const lp = t.lastIndexOf('(');             // 말미 괄호(메타) = 마지막 여는 괄호
  let blob = '';
  if (lp !== -1) {
    blob = t.slice(lp);                      // 닫는 괄호 없어도(하_) OK
    t = t.slice(0, lp).trim();
  }
  return { text: t.trim(), blob };
}

// ── 3. 파싱 ───────────────────────────────────────────────────────
const raw = readFileSync(CSV_PATH, 'utf8');
const rows = parseCSV(raw);

const missions = [];
const anomalies = [];           // {kind, ...} 리포트용
let curCat = null, rowInBlock = -1;

for (let r = 1; r < rows.length; r++) {       // 0행은 헤더
  const cells = rows[r];
  const head = (cells[0] || '').trim();
  const hasContent = cells.slice(1).some(c => (c || '').trim().length > 0);

  if (CATS.includes(head)) { curCat = head; rowInBlock = 0; }
  else if (head === '' && hasContent) { rowInBlock++; }
  else { continue; }                          // 완전 빈 줄 = 블록 구분자

  if (!curCat) continue;

  for (let col = 1; col <= 6; col++) {
    const rawCell = (cells[col] || '').trim();
    if (!rawCell) continue;
    const duration = DURATION_BY_COL[col];
    const { text, blob } = cleanText(rawCell);
    if (!text) continue;

    // 난이도: 괄호 우선, 없으면 행 위치 보정
    let diff = parseDifficulty(blob);
    const rowDiff = ROW_DIFF[Math.min(rowInBlock, 2)];
    if (!diff) { diff = rowDiff; anomalies.push({ kind: 'diff-filled-by-row', cat: curCat, duration, used: diff, text }); }
    else if (diff !== rowDiff) { anomalies.push({ kind: 'diff-vs-row', cat: curCat, duration, paren: diff, row: rowDiff, text }); }

    // 시간 충돌 리포트(열 위치를 진실로 채택)
    const blobDur = parseDurationFromBlob(blob);
    if (blobDur && blobDur !== duration) anomalies.push({ kind: 'dur-vs-col', cat: curCat, col: duration, paren: blobDur, text });

    missions.push({ category: curCat, duration, difficulty: diff, text });
  }
}

// ── 4. id 부여(카테고리-시간-난이도-순번) + 중복 텍스트 탐지 ────────
const seqMap = {};
for (const m of missions) {
  const key = `${CAT_CODE[m.category]}-${m.duration}-${DIFF_CODE[m.difficulty]}`;
  seqMap[key] = (seqMap[key] || 0) + 1;
  m.id = `${key}-${seqMap[key]}`;
}
const textCount = {};
for (const m of missions) textCount[m.text] = (textCount[m.text] || 0) + 1;
const dupTexts = Object.entries(textCount).filter(([, n]) => n > 1);

// ── 5. 분포 검증표 출력 ───────────────────────────────────────────
const durs = [30, 60, 90, 120, 150, 180];
console.log(`\n총 미션 수: ${missions.length}  (이상적 6×6×3 = 108)\n`);
console.log('카테고리별 × 시간대별  [상/중/하 개수]');
const pad = s => String(s).padEnd(12, ' ');
process.stdout.write(pad('') );
for (const d of durs) process.stdout.write(pad(DUR_LABEL[d]));
console.log();
for (const cat of CATS) {
  process.stdout.write(pad(cat));
  for (const d of durs) {
    const up = missions.filter(m => m.category === cat && m.duration === d && m.difficulty === '상').length;
    const mid = missions.filter(m => m.category === cat && m.duration === d && m.difficulty === '중').length;
    const low = missions.filter(m => m.category === cat && m.duration === d && m.difficulty === '하').length;
    const cell = `${up}/${mid}/${low}`;
    process.stdout.write(pad(cell === '1/1/1' ? cell : `*${cell}`)); // 1/1/1 아닌 칸은 * 표시
  }
  console.log();
}
console.log('\n( * = 이상적 1/1/1 에서 벗어난 칸 — 채우기 알고리즘의 단계적 완화 폴백이 메움 )');

console.log(`\n■ 난이도 누락 → 행위치로 보정: ${anomalies.filter(a => a.kind === 'diff-filled-by-row').length}건`);
anomalies.filter(a => a.kind === 'diff-filled-by-row').forEach(a => console.log(`   - [${a.cat} ${DUR_LABEL[a.duration]}] "${a.text.slice(0, 30)}" → ${a.used}`));
console.log(`\n■ 난이도 괄호값 ≠ 행위치(괄호값 채택): ${anomalies.filter(a => a.kind === 'diff-vs-row').length}건`);
anomalies.filter(a => a.kind === 'diff-vs-row').forEach(a => console.log(`   - [${a.cat} ${DUR_LABEL[a.duration]}] 괄호=${a.paren} 행=${a.row} "${a.text.slice(0, 30)}"`));
console.log(`\n■ 괄호 시간 ≠ 열 위치(열 채택): ${anomalies.filter(a => a.kind === 'dur-vs-col').length}건`);
anomalies.filter(a => a.kind === 'dur-vs-col').forEach(a => console.log(`   - [${a.cat}] 열=${DUR_LABEL[a.col]} 괄호=${DUR_LABEL[a.paren]} "${a.text.slice(0, 30)}"`));
console.log(`\n■ 중복 텍스트: ${dupTexts.length}건`);
dupTexts.forEach(([t, n]) => console.log(`   - (${n}회) "${t.slice(0, 30)}"`));

// ── 6. 옛 글귀 22→실제 25개 (시조14 + 속담11), 혀세해→형세해 교정 ──
const QUOTES = [
  { type: '시조', text: '물이 흐르면 자연히 도랑이 생긴다', source: '수도거성' },
  { type: '시조', text: '바다는 어떠한 물도 마다하지 않기에 그토록 거대해질 수 있다.', source: '관자, 형세해' },
  { type: '시조', text: '시냇물이 모여 강이 되고, 강물이 모여 바다가 된다', source: '관자, 형세해' },
  { type: '시조', text: '군자는 자기에게서 구하고, 소인은 남에게서 구한다', source: '논어, 위령공' },
  { type: '시조', text: '천하의 어려운 일은 반드시 쉬운 일에서 시작되고, 큰일은 반드시 작은 일에서 시작된다', source: '노자, 덕경' },
  { type: '시조', text: '태산이 높다 하되 하늘 아래 뫼이로다. 오르고 또 오르면 못 오를 리 없건마는', source: '양사언, 태산이 높다 하되' },
  { type: '시조', text: '뿌리 깊은 나무는 바람에 아니 흔들릴새, 꽃이 좋고 열매가 많나니', source: '용비어천가' },
  { type: '시조', text: '물이 깊지 않으면 큰 배를 띄울 힘이 없다', source: '장자' },
  { type: '시조', text: '아름드리 나무도 털끝 같은 싹에서 시작되고, 9층 누대도 한 줌의 흙에서부터 세워지며, 천 리 길도 한 걸음부터 시작된다', source: '노자, 덕경' },
  { type: '시조', text: '매화는 추위의 고통을 겪은 뒤에야 맑은 향기를 뿜는다', source: '명심보감' },
  { type: '시조', text: '국화야 너는 어이 삼월 동풍 다 지내고, 낙목한천에 네 홀로 피었나니', source: '이정보, 국화야 너는 어이' },
  { type: '시조', text: '길이 멀어야 말의 힘을 알고, 날이 오래되어야 사람의 마음을 안다', source: '명심보감' },
  { type: '시조', text: '잘 가노라 닫지 말며 못 가노라 쉬지 마라. 부디 그치지 말고 촌음(寸陰)을 아껴스라. 가다가 중지하면 아니 감만 못하니라', source: '김천택, 잘 가노라 닫지 말며' },
  { type: '시조', text: '꽃이 진다 하고 새들아 슬퍼 마라. 바람에 흩날리니 꽃의 탓 아니로다', source: '송순, 하여가' },
  { type: '속담', text: '티끌 모아 태산이 되리니', source: '' },
  { type: '속담', text: '천 리 길도 한 걸음에서 비롯되리라', source: '' },
  { type: '속담', text: '우물을 파되 한 우물만을 깊이 파라', source: '' },
  { type: '속담', text: '시작이 곧 반이니라', source: '' },
  { type: '속담', text: '낙숫물이 바위를 뚫을지어다', source: '' },
  { type: '속담', text: '고생 끝에 낙이 깃든다', source: '' },
  { type: '속담', text: '꾸준함이 재능을 이기느니라', source: '' },
  { type: '속담', text: '가랑비에 옷 젖듯 서서히 스미느니라', source: '' },
  { type: '속담', text: '한 술 밥으로 어찌 배부르랴', source: '' },
  { type: '속담', text: '노력은 끝내 배신하지 아니하리로다', source: '' },
  { type: '속담', text: '공든 탑이 무너지랴', source: '' },
];

// ── 7. data.js 생성 ───────────────────────────────────────────────
const banner = `// === 자동 생성 파일 — tools/preprocess.mjs 가 생성함. 직접 수정 금지 ===
// 미션: 시간대=열 위치(진실), 난이도=괄호 우선·누락 시 행 위치 보정.
// 총 ${missions.length}개. 글귀: 시조 ${QUOTES.filter(q => q.type === '시조').length} + 속담 ${QUOTES.filter(q => q.type === '속담').length} = ${QUOTES.length}개.\n`;

const missionsJS = 'const MISSIONS = [\n' +
  missions.map(m => `  { id: ${JSON.stringify(m.id)}, category: ${JSON.stringify(m.category)}, duration: ${m.duration}, difficulty: ${JSON.stringify(m.difficulty)}, text: ${JSON.stringify(m.text)} },`).join('\n') +
  '\n];\n';

const quotesJS = 'const QUOTES = [\n' +
  QUOTES.map(q => `  { type: ${JSON.stringify(q.type)}, text: ${JSON.stringify(q.text)}, source: ${JSON.stringify(q.source)} },`).join('\n') +
  '\n];\n';

writeFileSync(OUT_PATH, banner + '\n' + missionsJS + '\n' + quotesJS, 'utf8');
console.log(`\n✓ ${OUT_PATH} 생성 완료 (MISSIONS ${missions.length} + QUOTES ${QUOTES.length})`);
