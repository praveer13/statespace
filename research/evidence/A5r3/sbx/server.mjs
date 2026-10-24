// static server mimicking GitHub Pages headers: ACAO *, gzip not needed for the test
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const roots = { '/app/': process.argv[2], '/assets/': process.argv[3] };
const types = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.wasm':'application/wasm', '.json':'application/json', '.zip':'application/zip', '.whl':'application/octet-stream' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); const pre = Object.keys(roots).find(p => u.pathname.startsWith(p));
  if (!pre) { res.writeHead(404); return res.end(); }
  const p = path.join(roots[pre], decodeURIComponent(u.pathname.slice(pre.length)));
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream', 'access-control-allow-origin': '*', 'cache-control': 'max-age=600' }); res.end(data); });
}).listen(8080);
