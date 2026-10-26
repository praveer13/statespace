// Fetch the instrument origin's third-party engine payloads, check each against its pinned SHA-256, and lay
// them out under apps/instruments/public/engines/ with the asset manifest the host and the workers read
// (ARCHITECTURE.md sections 5.9, 6.1 and 6.2).
//
// Usage: node scripts/instruments/fetch-engines.mjs [--out <dir>] [--cache <dir>]
//
// Nothing fetched here is committed: apps/instruments/public/engines/ is gitignored, and the payloads ship only
// on the instrument origin's own Pages site (research/evidence/THIRD-PARTY.md). Downloads are kept in a cache
// directory under node_modules/.cache so a rebuild does not fetch again; every byte is re-hashed either way.
//
// Plugging in another engine: add an entry to ENGINES with its pinned sources (url + sha256) and the files its
// first load needs. The manifest then lists them, and the host's `caps` reports the engine's firstLoadBytes.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

/** zlib level 5 gzip: what GitHub Pages sent (W0-S08, RUN-pglite-0511), so the manifest's wire bytes match OD-6's figure. */
const GZIP_LEVEL = 5

/**
 * Pinned sources. `sha256` is checked on the downloaded bytes before anything is unpacked.
 * A source is either a single file (`kind: 'file'`) or an npm tarball (`kind: 'tgz'`) from which `pick` names
 * the files to keep (paths inside the tarball's `package/`).
 */
export const ENGINES = {
  z3: {
    // The engine version the bus pins and every reply names (Z3 5.3.1); the runtime pins are below.
    version: '5.3.1',
    label: 'Z3 5.3.1 on Pyodide 314.0.7',
    sources: [
      {
        id: 'pyodide',
        version: '314.0.7',
        kind: 'tgz',
        url: 'https://registry.npmjs.org/pyodide/-/pyodide-314.0.7.tgz',
        sha256: '66b7949e5a0cba2250b586d7e368bf12fb482800748d182c4618254b685ffaa0',
        license: 'MPL-2.0',
        dest: 'engines/pyodide/314.0.7',
        // The five Pyodide files of the first load (docs/spikes/W0-S02.md section 4.1), plus package.json, which names the license.
        pick: ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'],
        extra: ['package.json'], // the tarball carries no LICENSE file; package.json names MPL-2.0
      },
      {
        id: 'z3-solver',
        version: '5.3.1.0',
        kind: 'file',
        url: 'https://files.pythonhosted.org/packages/7b/05/574cc7c432cbd8dd2f29fce6dbe0dffc3dc34d48ec73723de44dc3905489/z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl',
        sha256: '62143abf1f1f94e9b1c173db60b2f6b747f4b0780da81f4b05342bdef006bf90',
        license: 'MIT',
        dest: 'engines/z3/5.3.1.0',
        file: 'z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl',
      },
    ],
  },
  datalog: {
    // INS-datalog is Z3's Fixedpoint (engine='datalog') in Pyodide, behind the W0-S03 adapter (DECISIONS.md Log
    // item 55). Its payload is Z3's: the same pinned files at the same paths, so the engine cache holds one copy
    // for both. The adapter is the course's own code and ships inside the worker bundle, not here.
    version: '5.3.1',
    label: 'Z3 5.3.1 Fixedpoint on Pyodide 314.0.7',
    sources: [
      {
        id: 'pyodide',
        version: '314.0.7',
        kind: 'tgz',
        url: 'https://registry.npmjs.org/pyodide/-/pyodide-314.0.7.tgz',
        sha256: '66b7949e5a0cba2250b586d7e368bf12fb482800748d182c4618254b685ffaa0',
        license: 'MPL-2.0',
        dest: 'engines/pyodide/314.0.7',
        pick: ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'],
        extra: ['package.json'],
      },
      {
        id: 'z3-solver',
        version: '5.3.1.0',
        kind: 'file',
        url: 'https://files.pythonhosted.org/packages/7b/05/574cc7c432cbd8dd2f29fce6dbe0dffc3dc34d48ec73723de44dc3905489/z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl',
        sha256: '62143abf1f1f94e9b1c173db60b2f6b747f4b0780da81f4b05342bdef006bf90',
        license: 'MIT',
        dest: 'engines/z3/5.3.1.0',
        file: 'z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl',
      },
    ],
  },
  pglite: {
    // INS-pglite: the PGlite pin, which reports PostgreSQL 18.6 (W0-S08 section 4.1 [X RUN-pglite-0511]), on one
    // connection. The engine id and version are PGlite's; the reply's `printed` carries the PostgreSQL version too.
    version: '0.5.11',
    label: 'PGlite 0.5.11 (PostgreSQL 18.6)',
    sources: [
      {
        id: 'pglite',
        version: '0.5.11',
        kind: 'tgz',
        url: 'https://registry.npmjs.org/@electric-sql/pglite/-/pglite-0.5.11.tgz',
        sha256: '8d0d60091cd0630df4247c0e84d496fe6adb93f4b272a1ee395e9b78dc253e95',
        license: 'Apache-2.0',
        dest: 'engines/pglite/0.5.11',
        // The eleven files a cold load requests in all three browser engines (W0-S08 section 4.8 [X RUN-pglite-0511]).
        pick: [
          'dist/index.js',
          'dist/chunk-3OMHRXTA.js',
          'dist/chunk-7NIVBDG7.js',
          'dist/chunk-F4GETNPB.js',
          'dist/chunk-NNS5RQRF.js',
          'dist/chunk-O56QGQDD.js',
          'dist/chunk-QY3QWFKW.js',
          'dist/chunk-R5JPZYG3.js',
          'dist/pglite.wasm',
          'dist/pglite.data',
          'dist/initdb.wasm',
        ],
        extra: ['LICENSE', 'package.json'],
      },
    ],
  },
  spectacle: {
    // INS-spectacle (and live runs in INS-theater cells): Spectacle at commit 5827c22, unmodified (ARCHITECTURE.md
    // section 6.3, DECISIONS.md Log item 56). Each file is fetched from that commit and pinned by the SHA-256 that
    // W0-S04 recorded (runs/RUN-spectacle-s5s8/spectacle/files.json). Each file gets its own directory because a
    // source's `dest` is emptied before it is written. The search, the invariant and deadlock checks and TLC's
    // counts are the course's adapter, inside the worker bundle (apps/instruments/src/engines/tla/).
    version: '5827c22',
    label: 'Spectacle 5827c22 (TLA+ in the browser)',
    sources: [
      ['lodash', 'js/lib/lodash.min.js', 'a9705dfc47c0763380d851ab1801be6f76019f6b67e40e9b873f8b4a0603f7a9', 'MIT (lodash)'],
      ['hash-sum', 'js/hash-sum/hash-sum.js', '1173797d0ed0c3a8c5976c0e65c2dd09fd2331d3447a1f4911b0dc7536299015', 'MIT (hash-sum)'],
      ['tree-sitter', 'js/tree-sitter.js', 'faaefedb1c182eb51cad866a0a82cce6787f0e5a90110e3ca9ec048842a84423', 'MIT (web-tree-sitter)'],
      ['eval', 'js/eval.js', '40bc82440fe7e398662faeda767aaec6be68d8b1ba17da862aa24ef5990b609b', 'MIT'],
      ['tree-sitter-wasm', 'js/tree-sitter.wasm', '17382e1a69bd628107e8dfe37d31d57f7ba948e5f2da77e56a8aa010488dc5ae', 'MIT (web-tree-sitter)'],
      ['tlaplus-wasm', 'js/tree-sitter-tlaplus.wasm', '729b5b9ada1f2d49613b4436d2f345f1bbf239edf1cb2d0a616c89fca82a0cac', 'MIT (tree-sitter-tlaplus)'],
      ['license', 'LICENSE', 'a81201d3d32e4fc9f2a16f7ab887d1a9e009ae64da40b2dd2c96bf0eb9bac431', 'MIT'],
    ].map(([id, file, sha256, license]) => ({
      id: `spectacle-${id}`,
      version: '5827c22043216ea422b9dada64fdec19d6d8e5c4',
      kind: 'file',
      url: `https://raw.githubusercontent.com/will62794/spectacle/5827c22043216ea422b9dada64fdec19d6d8e5c4/${file}`,
      sha256,
      license,
      dest: `engines/spectacle/5827c22/${id}`,
      file: file.slice(file.lastIndexOf('/') + 1),
    })),
  },
  'goal-replay': {
    // INS-goal-replay: no Lean runs in the tab. The payload is the course's own goal strips, read from real Lean
    // 4.35.0 elaboration in the bench image by scripts/build-goal-replay.mjs and committed as RUN-goal-replay. A
    // `repo:` url names a file in this repository; it is pinned and re-hashed like any download.
    version: '4.35.0',
    label: 'Goal Replay: goal strips from Lean 4.35.0 elaboration (RUN-goal-replay)',
    sources: [
      {
        id: 'goal-strips',
        version: '4.35.0',
        kind: 'file',
        url: 'repo:runs/RUN-goal-replay/goal-strips.json',
        sha256: '93c6d479602b3562d739b15ebd55e53b6a5ec98bc90bccf92a3c6d518bf2dca5',
        license: 'CC-BY-4.0',
        dest: 'engines/goal-replay/4.35.0',
        file: 'goal-strips.json',
      },
    ],
  },
  derivation: {
    // INS-derivation (the Derivation Board): one Z3 validity query per step. Its payload is Z3's: the same pinned
    // files at the same paths, so the engine cache holds one copy. The board's checker (derivation.py) is the
    // course's own code and ships inside the worker bundle (apps/instruments/src/engines/derivation/).
    version: '5.3.1',
    label: 'Z3 5.3.1 on Pyodide 314.0.7, the Derivation Board',
    sources: [
      {
        id: 'pyodide',
        version: '314.0.7',
        kind: 'tgz',
        url: 'https://registry.npmjs.org/pyodide/-/pyodide-314.0.7.tgz',
        sha256: '66b7949e5a0cba2250b586d7e368bf12fb482800748d182c4618254b685ffaa0',
        license: 'MPL-2.0',
        dest: 'engines/pyodide/314.0.7',
        pick: ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'],
        extra: ['package.json'],
      },
      {
        id: 'z3-solver',
        version: '5.3.1.0',
        kind: 'file',
        url: 'https://files.pythonhosted.org/packages/7b/05/574cc7c432cbd8dd2f29fce6dbe0dffc3dc34d48ec73723de44dc3905489/z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl',
        sha256: '62143abf1f1f94e9b1c173db60b2f6b747f4b0780da81f4b05342bdef006bf90',
        license: 'MIT',
        dest: 'engines/z3/5.3.1.0',
        file: 'z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl',
      },
    ],
  },
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

async function download(url) {
  if (url.startsWith('repo:')) return fs.readFileSync(path.join(ROOT, url.slice('repo:'.length))) // a committed course file
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url}: HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

/** The pinned bytes of a source, from the cache when they are there and still hash right. */
async function pinned(src, cacheDir) {
  const name = path.basename(new URL(src.url).pathname)
  const cached = path.join(cacheDir, name)
  if (fs.existsSync(cached)) {
    const buf = fs.readFileSync(cached)
    if (sha256(buf) === src.sha256) return buf
    fs.rmSync(cached)
  }
  const buf = await download(src.url)
  const got = sha256(buf)
  if (got !== src.sha256) throw new Error(`${src.id}: sha256 mismatch for ${src.url}: got ${got}, pinned ${src.sha256}`)
  fs.mkdirSync(cacheDir, { recursive: true })
  fs.writeFileSync(cached, buf)
  return buf
}

function asset(outDir, rel) {
  const buf = fs.readFileSync(path.join(outDir, rel))
  return { path: rel, sha256: sha256(buf), bytes: buf.length, wire: zlib.gzipSync(buf, { level: GZIP_LEVEL }).length }
}

export async function fetchEngines({ out, cache }) {
  const manifest = { manifest: 1, wire_encoding: `gzip, zlib level ${GZIP_LEVEL}`, engines: {} }
  for (const [engine, spec] of Object.entries(ENGINES)) {
    const assets = []
    const sources = []
    for (const src of spec.sources) {
      const buf = await pinned(src, cache)
      const destDir = path.join(out, src.dest)
      fs.rmSync(destDir, { recursive: true, force: true })
      fs.mkdirSync(destDir, { recursive: true })
      if (src.kind === 'tgz') {
        const tmp = fs.mkdtempSync(path.join(cache, 'x-'))
        try {
          const tgz = path.join(tmp, 'src.tgz')
          fs.writeFileSync(tgz, buf)
          const members = [...src.pick, ...(src.extra ?? [])].map((f) => `package/${f}`)
          execFileSync('tar', ['-xzf', tgz, '-C', tmp, '--no-same-owner', ...members])
          for (const f of [...src.pick, ...(src.extra ?? [])]) {
            fs.mkdirSync(path.dirname(path.join(destDir, f)), { recursive: true }) // a pick may sit under the package's dist/
            fs.copyFileSync(path.join(tmp, 'package', f), path.join(destDir, f))
          }
        } finally {
          fs.rmSync(tmp, { recursive: true, force: true })
        }
        for (const f of src.pick) assets.push(asset(out, `${src.dest}/${f}`))
      } else {
        fs.writeFileSync(path.join(destDir, src.file), buf)
        assets.push(asset(out, `${src.dest}/${src.file}`))
      }
      sources.push({ id: src.id, version: src.version, url: src.url, sha256: src.sha256, license: src.license })
    }
    manifest.engines[engine] = {
      version: spec.version,
      label: spec.label,
      sources,
      assets,
      rawBytes: assets.reduce((n, a) => n + a.bytes, 0),
      // OD-6's figure: the engine's first load as compressed bytes on the wire (ARCHITECTURE.md section 5.9)
      firstLoadBytes: assets.reduce((n, a) => n + a.wire, 0),
    }
  }
  fs.mkdirSync(path.join(out, 'engines'), { recursive: true })
  fs.writeFileSync(path.join(out, 'engines', 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  return manifest
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (flag, dflt) => {
    const i = process.argv.indexOf(flag)
    return i >= 0 && process.argv[i + 1] !== undefined ? path.resolve(process.argv[i + 1]) : dflt
  }
  const out = arg('--out', path.join(ROOT, 'apps/instruments/public'))
  const cache = arg('--cache', path.join(ROOT, 'node_modules/.cache/statespace-engines'))
  const m = await fetchEngines({ out, cache })
  for (const [e, x] of Object.entries(m.engines)) console.log(`${e} ${x.version}: ${x.assets.length} files, ${x.rawBytes} B raw, ${x.firstLoadBytes} B first load`)
}
