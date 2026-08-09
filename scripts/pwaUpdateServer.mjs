import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = 4176;
const buildRoots = {
  v1: path.resolve(ROOT, '../soombook.out/build/pwa-update-v1'),
  v2: path.resolve(ROOT, '../soombook.out/build/pwa-update-v2'),
};
let activeVersion = 'v1';

const mediaTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webmanifest', 'application/manifest+json'],
]);

function safeTarget(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  if (relative.split('/').some((segment) => segment === '..')) return null;
  const target = path.resolve(buildRoots[activeVersion], relative);
  const relation = path.relative(buildRoots[activeVersion], target);
  return relation.startsWith('..') || path.isAbsolute(relation) ? null : target;
}

const server = createServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/__soombook_switch__/v2') {
    activeVersion = 'v2';
    response.writeHead(204, { 'cache-control': 'no-store' });
    response.end();
    return;
  }
  if (request.method === 'GET' && request.url === '/__soombook_version__') {
    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
    });
    response.end(JSON.stringify({ activeVersion }));
    return;
  }
  const target = safeTarget(request.url ?? '/');
  if (!target) {
    response.writeHead(400);
    response.end('Bad request');
    return;
  }
  try {
    if (!(await stat(target)).isFile()) throw new Error('not a file');
    const extension = path.extname(target).toLowerCase();
    response.writeHead(200, {
      'cache-control':
        path.basename(target) === 'sw.js' || extension === '.html'
          ? 'no-cache'
          : 'public, max-age=31536000, immutable',
      'content-type': mediaTypes.get(extension) ?? 'application/octet-stream',
    });
    response.end(await readFile(target));
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`PWA update server ready: http://127.0.0.1:${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
