import http from 'node:http';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const info = JSON.parse(await fs.readFile(path.join(out, 'build-info.json'), 'utf8').catch(() => {
  throw new Error('Build first: npm run build:demo or npm run build');
}));
const index = process.argv.indexOf('--port');
const port = index >= 0 ? Number(process.argv[index + 1]) : 8770;
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid preview port.');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end('Method not allowed'); }
  try {
    const pathname = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${port}`).pathname);
    if (pathname === '/' || pathname === info.basePath.slice(0, -1)) {
      res.writeHead(302, { Location: info.basePath }); return res.end();
    }
    if (!pathname.startsWith(info.basePath) || pathname.includes('\0') || pathname.includes('\\')) throw new Error('Not found');
    let target = path.resolve(out, pathname.slice(info.basePath.length));
    if (target !== out && !target.startsWith(out + path.sep)) throw new Error('Not found');
    let stat = await fs.stat(target);
    if (stat.isDirectory()) {
      if (!pathname.endsWith('/')) { res.writeHead(302, { Location: `${pathname}/` }); return res.end(); }
      target = path.join(target, 'index.html');
    }
    const real = await fs.realpath(target);
    if (!real.startsWith(out + path.sep)) throw new Error('Not found');
    const body = req.method === 'HEAD' ? undefined : await fs.readFile(target);
    res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    if (res.headersSent) { res.destroy(); return; }
    const body = req.method === 'HEAD' ? undefined : await fs.readFile(path.join(out, '404.html')).catch(() => 'Not found');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(body);
  }
});
server.listen(port, '127.0.0.1', () => console.log(`AASE showcase: http://127.0.0.1:${port}${info.basePath} (${info.mode})`));
