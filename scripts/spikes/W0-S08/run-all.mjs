#!/usr/bin/env node
// W0-S08: run every measurement and write runs/RUN-pglite-rls/, runs/RUN-pglite-0511/ and the two run records.
//
//   node scripts/spikes/W0-S08/run-all.mjs [--worlds 200] [--repeat 3] [--only rls|0511]
//
// Run it from the repository root, after `npm ci --prefix scripts/spikes/W0-S08 --ignore-scripts`. It needs Docker, the
// images postgres:18 and mcr.microsoft.com/playwright:v1.63.0-noble, and network access (the probes, the registry).
// It starts one PostgreSQL 18 container (memory capped at 6 GiB, removed at the end) and runs one browser container at
// a time. Every command is logged with its argv, start time, duration and exit code to <run>/commands.jsonl, and
// record-run.mjs turns the outputs into the run records.

import { spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { record } from './record-run.mjs'

const { values: a } = parseArgs({ options: { worlds: { type: 'string', default: '200' }, repeat: { type: 'string', default: '3' }, only: { type: 'string' } } })
const ROOT = process.cwd()
const H = 'scripts/spikes/W0-S08'
const HARNESS = path.join(ROOT, H)
const IMAGE = 'mcr.microsoft.com/playwright:v1.63.0-noble'
const PG_IMAGE = 'postgres:18'
const PG_NAME = 'w0s08-pg18'
const TMP = mkdtempSync(path.join(os.tmpdir(), 'w0s08-'))
const RLS = 'runs/RUN-pglite-rls'
const R0511 = 'runs/RUN-pglite-0511'
const doRls = !a.only || a.only === 'rls'
const do0511 = !a.only || a.only === '0511'
const ENGINES = ['chromium', 'firefox', 'webkit']
let pgPort = null

const norm = (s) => String(s).split(ROOT).join('.').split(TMP).join('<tmp>').replace(pgPort ? new RegExp(`127\\.0\\.0\\.1:${pgPort}`, 'g') : /^$/, '127.0.0.1:<port>')
const abs = (p) => path.join(ROOT, p)

function sh(dir, id, purpose, argv, { stdout } = {}) {
  const started_at = new Date().toISOString()
  const t0 = process.hrtime.bigint()
  console.error(`\n$ [${id}] ${norm(argv.join(' '))}`)
  const r = spawnSync(argv[0], argv.slice(1), { cwd: ROOT, stdio: ['ignore', stdout ? 'pipe' : 'inherit', 'inherit'], maxBuffer: 1 << 30 })
  const duration_s = Number(process.hrtime.bigint() - t0) / 1e9
  if (stdout) writeFileSync(abs(stdout), r.stdout)
  const entry = { id, purpose, argv: argv.map(norm), started_at, duration_s: Math.round(duration_s * 100) / 100, exit_code: r.status, stdout: stdout ?? null }
  for (const d of [].concat(dir)) appendFileSync(abs(path.join(d, 'commands.jsonl')), JSON.stringify(entry) + '\n')
  if (r.status !== 0) console.error(`!! [${id}] exit code ${r.status}`)
  return { ...entry, out: r.stdout ? r.stdout.toString() : '' }
}

const capture = (argv) => { const r = spawnSync(argv[0], argv.slice(1), { cwd: ROOT, encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null }

function browser(dir, id, purpose, engine, task, { extra = [], cpus, pglite = '@electric-sql/pglite', gz = '/gz/pglite', out }) {
  return sh(dir, id, purpose, [
    'docker', 'run', '--rm', '--init', '--ipc=host', '--memory=6g', ...(cpus ? [`--cpus=${cpus}`] : []),
    '-v', `${HARNESS}:/work:ro`, '-v', `${path.join(TMP, 'gz')}:/gz:ro`, '-w', '/work', IMAGE,
    'node', '/work/browser-run.mjs', '--engine', engine, '--task', task, '--pglite', pglite, '--gz-dir', gz, ...extra,
  ], { stdout: out })
}

const startedAt = new Date()
const loadStart = os.loadavg()
for (const d of [doRls && RLS, do0511 && R0511].filter(Boolean)) { rmSync(abs(d), { recursive: true, force: true }); mkdirSync(abs(d), { recursive: true }) }
mkdirSync(abs(RLS), { recursive: true })
const both = [doRls && RLS, do0511 && R0511].filter(Boolean)
let failures = 0
const check = (e) => { if (e.exit_code !== 0) failures++ ; return e }

try {
  check(sh(both, 'npm-ci', 'install the pinned dependencies of the harness from its lockfile', ['npm', 'ci', '--prefix', H, '--ignore-scripts', '--no-audit', '--no-fund']))
  // the browser harness serves gzip copies made on the host with stock zlib at level 5 (see precompress.mjs)
  check(sh(both, 'precompress-0.5.11', 'gzip copies of the 0.5.11 files at level 5, for the browser server', ['node', `${H}/precompress.mjs`, '--dist', `${H}/node_modules/@electric-sql/pglite/dist`, '--out', path.join(TMP, 'gz/pglite'), '--level', '5']))
  check(sh(both, 'precompress-0.5.10', 'gzip copies of the 0.5.10 files at level 5, for the browser server', ['node', `${H}/precompress.mjs`, '--dist', `${H}/node_modules/pglite-0510/dist`, '--out', path.join(TMP, 'gz/pglite0510'), '--level', '5']))

  let pgInfo = null
  if (doRls) {
    // the reference: a fresh PostgreSQL 18 container
    spawnSync('docker', ['rm', '-f', PG_NAME], { stdio: 'ignore' })
    check(sh(RLS, 'start-postgresql', 'a fresh PostgreSQL 18 container for the reference runs', ['docker', 'run', '-d', '--name', PG_NAME, '--memory=6g', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-p', '127.0.0.1::5432', PG_IMAGE]))
    for (let i = 0; i < 90; i++) {
      if (spawnSync('docker', ['exec', PG_NAME, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-Atc', 'select 1'], { stdio: 'ignore' }).status === 0) break
      spawnSync('sleep', ['1'])
    }
    pgPort = capture(['docker', 'port', PG_NAME, '5432/tcp']).split('\n')[0].split(':').pop()
    pgInfo = {
      version_string: capture(['docker', 'exec', PG_NAME, 'psql', '-U', 'postgres', '-Atc', 'select version()']),
      binary_path: '/usr/lib/postgresql/18/bin/postgres',
      binary_sha256: (capture(['docker', 'exec', PG_NAME, 'sha256sum', '/usr/lib/postgresql/18/bin/postgres']) || '').split(' ')[0],
    }
    check(sh(RLS, 'postgresql-18.6', 'the reference: the specimens on PostgreSQL 18.6 over one node-postgres connection', ['node', `${H}/run-node.mjs`, '--engine', 'pg', '--dsn', `127.0.0.1:${pgPort}`, '--label', 'pg-18.6', '--worlds', a.worlds, '--out', `${RLS}/pg-18.6.json`]))
    spawnSync('docker', ['rm', '-f', PG_NAME], { stdio: 'ignore' })
    check(sh(RLS, 'pglite-0.5.11-node', 'the specimens on PGlite 0.5.11 under Node 22', ['node', `${H}/run-node.mjs`, '--engine', 'pglite', '--pglite', '@electric-sql/pglite', '--label', 'pglite-0.5.11-node', '--worlds', a.worlds, '--out', `${RLS}/pglite-0.5.11-node.json`]))
    for (const e of ENGINES) check(browser(RLS, `pglite-0.5.11-${e}`, `the specimens on PGlite 0.5.11 in a module worker in ${e}`, e, 'rls', { extra: ['--worlds', a.worlds], out: `${RLS}/${e}.json` }))
    const c = sh(RLS, 'compare-with-postgresql', 'compare every PGlite configuration with PostgreSQL 18.6, statement by statement and world by world', ['node', `${H}/compare.mjs`, '--ref', `${RLS}/pg-18.6.json`, '--out', `${RLS}/summary.json`, `${RLS}/pglite-0.5.11-node.json`, ...ENGINES.map((e) => `${RLS}/${e}.json`)])
    check(c)
  }

  if (do0511) {
    check(sh(R0511, 'npm-meta', 'the registry record and tarball hashes of 0.5.11 and 0.5.10', ['node', `${H}/npm-meta.mjs`, '--out', `${R0511}/npm-meta.json`, '--version', '0.5.11', '--version', '0.5.10']))
    // the patch release rule: the earlier version, run through the same specimens, against the new one
    check(sh(R0511, 'pglite-0.5.10-node', 'the same specimens on the earlier build, 0.5.10, under Node 22', ['node', `${H}/run-node.mjs`, '--engine', 'pglite', '--pglite', 'pglite-0510', '--label', 'pglite-0.5.10-node', '--worlds', a.worlds, '--out', `${R0511}/pglite-0.5.10-node.json`]))
    if (!doRls) check(sh(R0511, 'pglite-0.5.11-node', 'the specimens on PGlite 0.5.11 under Node 22', ['node', `${H}/run-node.mjs`, '--engine', 'pglite', '--pglite', '@electric-sql/pglite', '--label', 'pglite-0.5.11-node', '--worlds', a.worlds, '--out', `${RLS}/pglite-0.5.11-node.json`]))
    sh(R0511, 'compare-0.5.10-vs-0.5.11', 'compare 0.5.11 with 0.5.10 on every statement and world', ['node', `${H}/compare.mjs`, '--ref', `${R0511}/pglite-0.5.10-node.json`, '--out', `${R0511}/compare-0.5.10-vs-0.5.11.json`, `${RLS}/pglite-0.5.11-node.json`])
    // RUN-pglite's own scripts, unchanged, on both builds
    for (const [v, dir] of [['0.5.11', `${H}/node_modules/@electric-sql/pglite`], ['0.5.10', `${H}/node_modules/pglite-0510`]]) {
      check(sh(R0511, `script-pglite-${v}`, `RUN-pglite's pglite.mjs, unchanged, on ${v}`, ['node', 'research/evidence/A5r3/scripts/pglite.mjs', dir], { stdout: `${R0511}/script-pglite-${v}.txt` }))
      check(sh(R0511, `script-pglite-tx-${v}`, `RUN-pglite's pglite-tx.mjs (two interleaved workers), unchanged, on ${v}`, ['node', 'research/evidence/A5r3/scripts/pglite-tx.mjs', dir], { stdout: `${R0511}/script-pglite-tx-${v}.txt` }))
    }
    check(sh(R0511, 'script-pglite-check-0.5.11', "RUN-pglite's pglite_check.mjs (a second transaction issued while the first is open), unchanged, on 0.5.11", ['node', 'research/evidence/a2r3/scripts/pglite_check.mjs', path.join(HARNESS, 'node_modules')] /* the script wants an absolute path */, { stdout: `${R0511}/script-pglite-check-0.5.11.txt` }))
    check(sh(R0511, 'gh-pages-probe', 'what a static host on GitHub Pages sends for wasm, an unknown binary type and a script', ['node', `${H}/gh-pages-probe.mjs`, '--out', `${R0511}/gh-pages-probe.json`]))
    for (const e of ENGINES) check(browser(R0511, `first-load-${e}`, `cold and warm first loads of PGlite 0.5.11 in ${e}, with and without gzip`, e, 'first-load', { extra: ['--repeat', a.repeat, '--instances', '5'], out: `${R0511}/first-load-${e}.json` }))
    check(browser(R0511, 'first-load-chromium-0.5.10', 'the file list and cold load of the earlier build, 0.5.10, in chromium', 'chromium', 'first-load', { extra: ['--repeat', '1', '--instances', '2'], pglite: 'pglite-0510', gz: '/gz/pglite0510', out: `${R0511}/first-load-chromium-0.5.10.json` }))
    for (const e of ENGINES) check(browser(R0511, `specimens-${e}`, `the single-session specimens of RUN-pglite on PGlite 0.5.11 in ${e}`, e, 'specimens', { out: `${R0511}/specimens-${e}.json` }))
    for (const e of ENGINES) check(browser(R0511, `memory-${e}`, `resident memory around one live PGlite instance and four close-and-recreate cycles in ${e}`, e, 'memory', { extra: ['--repeat', '4'], out: `${R0511}/memory-${e}.json` }))
    check(browser(R0511, 'cdp-throttle-chromium', 'does the DevTools protocol CPU throttle reach the worker?', 'chromium', 'throttle', { out: `${R0511}/throttle-chromium.json` }))
    for (const cpus of ['20', '1', '0.5', '0.25']) check(browser(R0511, `slow-cpu-${cpus}-chromium`, `PGlite 0.5.11 cold first load in chromium with the container limited to ${cpus} CPU (an emulation, not a phone)`, 'chromium', 'slow', { cpus, extra: ['--repeat', a.repeat, '--label', `cpus=${cpus}`], out: `${R0511}/slow-chromium-cpus${cpus}.json` }))
    check(sh(R0511, 'size-manifest', 'the first-load file list, hashes and sizes of 0.5.11 and 0.5.10', ['node', `${H}/size-report.mjs`, '--out', `${R0511}/size-manifest.json`,
      '--version', `0.5.11=${H}/node_modules/@electric-sql/pglite/dist=${R0511}/first-load-chromium.json`,
      '--version', `0.5.10=${H}/node_modules/pglite-0510/dist=${R0511}/first-load-chromium-0.5.10.json`]))
    check(sh(R0511, 'summarize-first-load', 'medians, memory and the specimen comparison across engines', ['node', `${H}/summarize-first-load.mjs`, '--out', `${R0511}/first-load-summary.json`,
      ...ENGINES.flatMap((e) => ['--first-load', `${R0511}/first-load-${e}.json`]), ...ENGINES.flatMap((e) => ['--specimens', `${R0511}/specimens-${e}.json`]), ...ENGINES.flatMap((e) => ['--memory', `${R0511}/memory-${e}.json`]),
      '--throttle', `${R0511}/throttle-chromium.json`, ...['20', '1', '0.5', '0.25'].flatMap((c) => ['--slow', `${R0511}/slow-chromium-cpus${c}.json`])]))
  }

  // the environment, written beside the outputs so that record-run.mjs can be re-run without the measurements
  const environment = {
    os: `${os.type()} ${os.release()}`, arch: os.arch(), cpu_count: os.cpus().length, memory_gib: Math.round(os.totalmem() / 2 ** 30),
    node: process.version, node_zlib: process.versions.zlib, npm: capture(['npm', '--version']),
    docker_server: capture(['docker', 'version', '--format', '{{.Server.Version}}']),
    images: {
      playwright: { ref: IMAGE, id: capture(['docker', 'image', 'inspect', IMAGE, '--format', '{{.Id}}']) },
      postgres: { ref: PG_IMAGE, id: capture(['docker', 'image', 'inspect', PG_IMAGE, '--format', '{{.Id}}']) },
    },
    postgres: pgInfo, container_memory: '6g', playwright_core: '1.63.0', pg_driver: 'pg 8.23.1',
    loadavg_start: loadStart.map((x) => Math.round(x * 100) / 100), loadavg_end: os.loadavg().map((x) => Math.round(x * 100) / 100),
    started_at: startedAt.toISOString(), finished_at: new Date().toISOString(),
  }
  for (const d of [doRls && RLS, do0511 && R0511].filter(Boolean)) writeFileSync(abs(`${d}/environment.json`), JSON.stringify(environment, null, 2) + '\n')
} finally {
  spawnSync('docker', ['rm', '-f', PG_NAME], { stdio: 'ignore' })
  rmSync(TMP, { recursive: true, force: true })
}
record(ROOT, { only: a.only })
console.error(`\ndone; ${failures} command(s) exited non-zero`)
process.exit(failures ? 1 : 0)
