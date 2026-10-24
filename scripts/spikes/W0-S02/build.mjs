// W0-S02: assemble the two static sites of the phone measurement: the main origin and the instrument origin.
//
// Usage: node build.mjs <engines-dir> <out-dir> [--main <origin>|auto] [--inst <origin>|auto] [--main-port 8097] [--inst-port 8098]
//
// Layout follows ARCHITECTURE.md section 5.2 and W0-S01: the instrument origin serves b/<buildId>/host.html, its
// worker, the engine files and the asset manifest, and a service worker at its root.
//
// Origins. "auto" (the default) makes both pages derive the other origin from their own host name and a fixed
// port, so one build serves localhost in the Playwright container and a laptop on the local network. A real
// deployment passes the two origins: --main https://<main> --inst https://instruments.<course-domain>. The real
// names then appear only in <out-dir>, never in a committed file (OD-5).
//
// Output:
//   <out>/main/          index.html, phone.js, phone.css
//   <out>/instruments/   sw.js, b/<buildId>/{host.html, host.js, worker.mjs, cases.mjs, manifest.json, engines/...}
//   <out>/gz/{main,instruments}/<path>.gz   gzip level 5 copies, for the stand-in server only (never published)
//   <out>/build.json     build id, origins, per-file raw and gzip sizes, the zlib that wrote them
//
// Wire sizes. A static host on GitHub Pages sent gzip, never Brotli, and its gzip bytes equalled stock zlib at
// level 5 (RUN-pglite-0511, W0-S08). The manifest therefore lists each engine file's raw size and its size as
// zlib level 5 gzip, written here on the host with the Node in use; the consent figure of ARCHITECTURE.md
// section 5.9 is the sum of the second.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(HERE, 'site');
const PYODIDE_FILES = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
const Z3_WHEEL = 'z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl';
const TYPES = {
  '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.zip': 'application/zip',
  '.json': 'application/json', '.whl': 'application/octet-stream', '.html': 'text/html', '.css': 'text/css',
};
const GZIP_LEVEL = 5;

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const gz = (buf) => zlib.gzipSync(buf, { level: GZIP_LEVEL });
// Brotli 11 sizes are informational (GitHub Pages sent gzip, never Brotli); BROTLI=0 skips them for a quick development build.
const brotli = (buf) => (process.env.BROTLI === '0' ? null : zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }).length);

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? listFiles(p, base) : [path.relative(base, p)];
  }).sort();
}
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
const fill = (text, vars) => text.replace(/__([A-Z_]+)__/g, (m, k) => (k in vars ? vars[k] : m));

export function build(enginesDir, outDir, opts) {
  const engineSources = [
    ...PYODIDE_FILES.map((f) => ({ src: path.join(enginesDir, 'pyodide', f), rel: `engines/pyodide/314.0.7/${f}` })),
    { src: path.join(enginesDir, Z3_WHEEL), rel: `engines/z3/5.3.1.0/${Z3_WHEEL}` },
  ].map((e) => ({ ...e, buf: fs.readFileSync(e.src) }));

  const origins = { main: opts.main, inst: opts.inst };
  const idInput = [
    ...listFiles(SITE).map((f) => [f, sha256(fs.readFileSync(path.join(SITE, f)))]),
    ...engineSources.map((e) => [e.rel, sha256(e.buf)]),
    ['origins', JSON.stringify([origins, opts.mainPort, opts.instPort])],
  ];
  const buildId = sha256(Buffer.from(JSON.stringify(idInput))).slice(0, 12);
  const auto = (v) => v === 'auto';
  const vars = {
    BUILD: buildId,
    ALLOWED_PARENTS: auto(opts.main) ? '"auto"' : JSON.stringify([opts.main]),
    MAIN_PORT: String(opts.mainPort),
    INST_PORT: String(opts.instPort),
    INSTRUMENT_ORIGIN: opts.inst,
    FRAME_SRC: auto(opts.inst) ? `http://*:${opts.instPort} https://*:${opts.instPort}` : opts.inst,
  };

  fs.rmSync(outDir, { recursive: true, force: true });
  const files = []; // every file written, with its site and relative path, for the gzip copies

  for (const f of listFiles(path.join(SITE, 'instruments'))) {
    const rel = f.replace(/^b\/BUILD\//, `b/${buildId}/`);
    write(path.join(outDir, 'instruments', rel), fill(fs.readFileSync(path.join(SITE, 'instruments', f), 'utf8'), vars));
    files.push({ site: 'instruments', rel });
  }
  const assets = engineSources.map((e) => {
    write(path.join(outDir, 'instruments', 'b', buildId, e.rel), e.buf);
    files.push({ site: 'instruments', rel: `b/${buildId}/${e.rel}` });
    const wire = gz(e.buf);
    return {
      path: `/b/${buildId}/${e.rel}`, sha256: sha256(e.buf), bytes: e.buf.length, wire: wire.length, brotli11: brotli(e.buf),
      type: TYPES[path.extname(e.rel)] || 'application/octet-stream',
    };
  });
  const sum = (k) => assets.reduce((n, a) => n + a[k], 0);
  const manifest = {
    build: buildId,
    wire_encoding: `gzip, zlib level ${GZIP_LEVEL} (zlib ${process.versions.zlib}), as W0-S08 found GitHub Pages sending it`,
    engines: {
      z3: {
        version: '5.3.1', wheel: '5.3.1.0', pyodide: '314.0.7',
        bytes: sum('bytes'), wireBytes: sum('wire'), brotli11Bytes: process.env.BROTLI === '0' ? null : sum('brotli11'), assets,
      },
    },
  };
  write(path.join(outDir, 'instruments', 'b', buildId, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  files.push({ site: 'instruments', rel: `b/${buildId}/manifest.json` });

  for (const f of ['index.html', 'phone.js', 'phone.css']) {
    write(path.join(outDir, 'main', f), fill(fs.readFileSync(path.join(SITE, 'main', f), 'utf8'), vars));
    files.push({ site: 'main', rel: f });
  }

  // gzip copies for the stand-in server (never published)
  for (const { site, rel } of files) {
    write(path.join(outDir, 'gz', site, `${rel}.gz`), gz(fs.readFileSync(path.join(outDir, site, rel))));
  }

  const info = {
    buildId, origins, ports: { main: opts.mainPort, inst: opts.instPort },
    gzip: { level: GZIP_LEVEL, zlib: process.versions.zlib, node: process.version },
    shell: files.filter((f) => !f.rel.includes('/engines/')).map((f) => {
      const buf = fs.readFileSync(path.join(outDir, f.site, f.rel));
      return { site: f.site, path: f.rel.replace(buildId, '<build>'), bytes: buf.length, wire: gz(buf).length };
    }),
    manifest: { bytes: manifest.engines.z3.bytes, wireBytes: manifest.engines.z3.wireBytes, brotli11Bytes: manifest.engines.z3.brotli11Bytes, assets: assets.map(({ path: p, sha256: h, bytes, wire, brotli11 }) => ({ path: p.replace(buildId, '<build>'), sha256: h, bytes, wire, brotli11 })) },
  };
  write(path.join(outDir, 'build.json'), JSON.stringify(info, null, 2) + '\n');
  return info;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [enginesDir, outDir, ...rest] = process.argv.slice(2);
  if (!enginesDir || !outDir) {
    console.error('usage: node build.mjs <engines-dir> <out-dir> [--main <origin>|auto] [--inst <origin>|auto] [--main-port 8097] [--inst-port 8098]');
    process.exit(2);
  }
  const opts = { main: 'auto', inst: 'auto', mainPort: 8097, instPort: 8098 };
  for (let i = 0; i < rest.length; i += 2) {
    const k = rest[i].replace(/^--/, '');
    const v = rest[i + 1];
    if (k === 'main' || k === 'inst') opts[k] = v === 'auto' ? v : v.replace(/\/$/, '');
    else if (k === 'main-port') opts.mainPort = Number(v);
    else if (k === 'inst-port') opts.instPort = Number(v);
    else { console.error(`unknown option ${rest[i]}`); process.exit(2); }
  }
  const info = build(path.resolve(enginesDir), path.resolve(outDir), opts);
  console.log(JSON.stringify({ buildId: info.buildId, rawBytes: info.manifest.bytes, wireBytes: info.manifest.wireBytes }));
}
