// Shared helpers for the W0-S12 recorders (record-*.mjs). Each recorder re-executes one run of the runs
// registry and rewrites runs/<RUN-id>.json and the runs/<RUN-id>/ folder. They need network (pinned release
// assets are downloaded and checked against recorded SHA-256 values) and Docker (the tools run in containers).
// Set TMPDIR to a scratch directory before running them: downloads and extractions live there.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
export const RUNS = path.join(REPO, 'runs')

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
export const sha256File = (file) => sha256(readFileSync(file))
export const round = (n, digits = 3) => Math.round(n * 10 ** digits) / 10 ** digits

/** A new, empty scratch directory under TMPDIR. Downloaded and extracted files are untrusted data. */
export function scratch(label) {
  return mkdtempSync(path.join(os.tmpdir(), `w0s12-${label}-`))
}

/** Replace host paths in captured text, so no record names a private or temporary location. */
export function scrub(text, extra = []) {
  const pairs = [...extra, [os.tmpdir(), '<sandbox>'], [REPO, '<repo>'], [os.homedir(), '<home>']]
    .filter(([from]) => from && from.length > 1)
    .sort((a, b) => b[0].length - a[0].length)
  let out = text
  for (const [from, to] of pairs) out = out.split(from).join(to)
  return out
}

/** Run a command, timed. Never throws on a non-zero exit. */
export function exec(cmd, args, opts = {}) {
  const t0 = Date.now()
  const res = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...opts })
  return {
    status: res.status,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
    started_at: new Date(t0).toISOString(),
    duration_s: round((Date.now() - t0) / 1000),
  }
}

export function must(cmd, args, opts) {
  const r = exec(cmd, args, opts)
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited ${r.status}\n${r.stderr}`)
  return r
}

/** Download `url` to `dest` and require its SHA-256. Returns {bytes, sha256}. */
export function fetchPinned(url, expected, dest) {
  must('curl', ['-fsSL', '--retry', '3', '--connect-timeout', '20', '-o', dest, url])
  const buf = readFileSync(dest)
  const actual = sha256(buf)
  if (expected && actual !== expected) throw new Error(`${url}: SHA-256 is ${actual}, expected ${expected}`)
  return { bytes: buf.length, sha256: actual }
}

export function dockerImage(ref) {
  const info = JSON.parse(must('docker', ['image', 'inspect', ref]).stdout)[0]
  const digest = (info.RepoDigests?.[0] ?? '').split('@')[1] ?? null
  return { ref, digest, architecture: info.Architecture, created: info.Created }
}

export const dockerServerVersion = () => must('docker', ['version', '--format', '{{.Server.Version}}']).stdout.trim()

export function environment(container, extra = {}) {
  return {
    os: `Linux ${os.release().split('-')[0]} ${os.arch() === 'x64' ? 'x86_64' : os.arch()}`,
    cpu_count: os.cpus().length,
    ram_gib: Math.round(os.totalmem() / 2 ** 30),
    container,
    host_tools: { node: process.version, uv: must('uv', ['--version']).stdout.trim() },
    emulated: false,
    ...extra,
  }
}

export function containerEnv(image, runFlags, extra = {}) {
  const info = dockerImage(image)
  return { runtime: 'docker', server_version: dockerServerVersion(), image, digest: info.digest, architecture: info.architecture, run_flags: runFlags, ...extra }
}

/** The lines of text that carry a verdict: non-empty, trailing space trimmed. */
export const lines = (text) =>
  text
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)

/** What a terminal shows for a line: a backspace moves the cursor left and the next characters overwrite. */
export function renderBackspaces(line) {
  const cells = []
  let at = 0
  for (const ch of line) {
    if (ch === '\b') at = Math.max(0, at - 1)
    else cells[at++] = ch
  }
  return Array.from(cells, (c) => c ?? ' ').join('').trimEnd()
}

/** Write runs/<id>/<rel>; returns the output entry for the record. */
export function writeOutput(id, rel, content, kind, compare = 'bytes') {
  const file = path.join(RUNS, id, rel)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, content)
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content)
  return { path: `runs/${id}/${rel}`, sha256: sha256(buf), bytes: buf.length, kind, compare }
}

export function inputEntry(repoRelPath) {
  const file = path.join(REPO, repoRelPath)
  return { path: repoRelPath, sha256: sha256File(file), bytes: statSync(file).size }
}

export function writeRun(id, record) {
  mkdirSync(RUNS, { recursive: true })
  writeFileSync(path.join(RUNS, `${id}.json`), `${JSON.stringify(record, null, 2)}\n`)
  console.log(`wrote runs/${id}.json`)
}

export const gitHead = () => must('git', ['-C', REPO, 'rev-parse', 'HEAD']).stdout.trim()
export const exists = existsSync
