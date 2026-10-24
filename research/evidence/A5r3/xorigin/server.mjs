// two origins: app on :8080, instruments on :8081 (stand-ins for two GitHub Pages sites)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const types = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.wasm':'application/wasm', '.json':'application/json', '.zip':'application/zip', '.whl':'application/octet-stream' };
function serve(root, port) { http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream', 'access-control-allow-origin': '*', 'cache-control': 'max-age=600' }); res.end(data); }); }).listen(port); }
serve(process.argv[2], 8080); serve(process.argv[3], 8081);
