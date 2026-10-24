#!/usr/bin/env node
// W0-S04: fetch Spectacle at the pinned commit into the cache (outside the
// repository), verify the commit and the SHA-256 of every file the harness
// loads, and write the file manifest to runs/RUN-spectacle-s5s8/spectacle/.
//
//   node scripts/spikes/W0-S04/fetch-spectacle.mjs
//
// Environment: W0S04_CACHE (default <os tmpdir>/statespace-w0s04).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const CACHE = process.env.W0S04_CACHE || path.join(os.tmpdir(), 'statespace-w0s04');
const DIR = path.join(CACHE, 'spectacle');
const URL = 'https://github.com/will62794/spectacle.git';
export const COMMIT = '5827c22043216ea422b9dada64fdec19d6d8e5c4';
// Files the harness loads, in load order, plus the license and Spectacle's own worker.
export const FILES = [
  'js/lib/lodash.min.js',
  'js/hash-sum/hash-sum.js',
  'js/tree-sitter.js',
  'js/eval.js',
  'js/tree-sitter.wasm',
  'js/tree-sitter-tlaplus.wasm',
  'js/worker.js',
  'LICENSE'
];

const git = (...args) => execFileSync('git', args, { cwd: DIR, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();

function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  if (!fs.existsSync(path.join(DIR, '.git'))) {
    execFileSync('git', ['clone', '--quiet', URL, DIR], { stdio: 'inherit' });
  }
  git('fetch', '--quiet', 'origin');
  git('checkout', '--quiet', '--detach', COMMIT);
  const head = git('rev-parse', 'HEAD');
  if (head !== COMMIT) throw new Error('HEAD ' + head + ' is not the pinned commit');
  const date = git('show', '-s', '--format=%cI', COMMIT);
  const upstreamHead = git('rev-parse', 'origin/HEAD');
  // Transfer sizes as a static host would send them: gzip level 9 and brotli
  // quality 11 (OD-6 counts an engine's compressed first load).
  const files = FILES.map((f) => {
    const buf = fs.readFileSync(path.join(DIR, f));
    return {
      path: f, bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex'),
      gzip9Bytes: zlib.gzipSync(buf, { level: 9 }).length,
      brotli11Bytes: zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length
    };
  });
  const engineFiles = files.filter((f) => f.path !== 'LICENSE' && f.path !== 'js/worker.js');
  const firstLoad = {
    files: engineFiles.map((f) => f.path),
    bytes: engineFiles.reduce((a, f) => a + f.bytes, 0),
    gzip9Bytes: engineFiles.reduce((a, f) => a + f.gzip9Bytes, 0),
    brotli11Bytes: engineFiles.reduce((a, f) => a + f.brotli11Bytes, 0)
  };
  // One digest over the manifest lines ("<sha256>  <path>"), sorted by path.
  const manifestText = files.slice().sort((a, b) => (a.path < b.path ? -1 : 1)).map((f) => `${f.sha256}  ${f.path}`).join('\n') + '\n';
  // The copy behind RUN-spectacle (research/evidence/A5v2/spectacle-run, kept
  // out of the published tree by .gitignore), when it is present locally.
  const researchDir = path.join(REPO, 'research/evidence/A5v2/spectacle-run/site/spectacle');
  let researchCopy = { path: 'research/evidence/A5v2/spectacle-run/site/spectacle', present: false };
  if (fs.existsSync(researchDir)) {
    const compared = files.filter((f) => fs.existsSync(path.join(researchDir, f.path))).map((f) => ({
      path: f.path, equal: crypto.createHash('sha256').update(fs.readFileSync(path.join(researchDir, f.path))).digest('hex') === f.sha256
    }));
    researchCopy = { path: researchCopy.path, present: true, compared, allEqual: compared.length > 0 && compared.every((c) => c.equal) };
  }
  const out = {
    repository: 'github.com/will62794/spectacle',
    commit: COMMIT,
    commitDate: date,
    upstreamHeadAtFetch: upstreamHead,
    license: fs.readFileSync(path.join(DIR, 'LICENSE'), 'utf8').split('\n')[0].trim(),
    files,
    firstLoad,
    researchCopy,
    compression: `Node ${process.version} zlib: gzip level 9, brotli quality 11`,
    manifestSha256: crypto.createHash('sha256').update(manifestText).digest('hex')
  };
  const dest = path.join(REPO, 'runs/RUN-spectacle-s5s8/spectacle');
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, 'files.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(`Spectacle ${COMMIT} (${date}) verified; manifest ${out.manifestSha256}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
