// 수궁도 — 개발용 정적 파일 서버 (Node 내장 모듈만 사용, 네트워크 의존 없음)
// 실행:  node tools/serve.mjs   →  http://localhost:5173
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));  // 프로젝트 루트
const PORT = 5173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.otf':  'font/otf',
  '.ttf':  'font/ttf',
  '.pdf':  'application/pdf',
  '.csv':  'text/csv; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = normalize(join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
    const s = await stat(filePath);
    if (s.isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}).listen(PORT, () => {
  console.log(`수궁도 dev server → http://localhost:${PORT}`);
});
