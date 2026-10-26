#!/usr/bin/env node
// Record RUN-pairs-reference, RUN-interp-revocation and RUN-interp-new-enemy: INS-pairs and INS-interp's S7 extension
// (apps/instruments/src/engines/pairs/) on the S7 cells, run by Node in the pinned Playwright image with no network.
// It writes runs/<id>/output*.txt and runs/<id>.json; then run `node scripts/runs/build-index.mjs`.
//
//   node scripts/spikes/W4-T27/record-s7-runs.mjs

import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { cpus, release, totalmem, type as osType } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const IMAGE = 'mcr.microsoft.com/playwright:v1.63.0-noble@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27'
const RUNNER = 'scripts/spikes/W4-T27/run-cells.ts'
const ENGINE_FILES = ['apps/instruments/src/engines/pairs/s7.ts', 'apps/instruments/src/engines/pairs/pairs.ts', 'apps/instruments/src/engines/pairs/notation.ts', RUNNER]
const sha = (buf) => createHash('sha256').update(buf).digest('hex')
const file = (path, role, source) => ({ path, sha256: sha(readFileSync(join(REPO, path))), bytes: readFileSync(join(REPO, path)).length, role, ...(source ? { source } : {}) })

const docker = (args) => ['docker', 'run', '--rm', '--memory=6g', '--network', 'none', '-v', '<sandbox>/repo:/repo:ro', '-w', '/repo', IMAGE, ...args]

function execute(args) {
  const started = new Date()
  const t0 = process.hrtime.bigint()
  const done = spawnSync('docker', ['run', '--rm', '--memory=6g', '--network', 'none', '-v', `${REPO}:/repo:ro`, '-w', '/repo', IMAGE, ...args], { encoding: 'utf8' })
  const duration = Number(process.hrtime.bigint() - t0) / 1e9
  if (done.status !== 0) throw new Error(`${args.join(' ')} exited ${done.status}: ${done.stderr}`)
  return { started: started.toISOString(), duration: Math.round(duration * 1000) / 1000, stdout: done.stdout, exit: done.status }
}

const nodeVersion = execFileSync('docker', ['run', '--rm', '--network', 'none', IMAGE, 'node', '--version'], { encoding: 'utf8' }).trim()
const nodeSha = execFileSync('docker', ['run', '--rm', '--network', 'none', IMAGE, 'sh', '-c', 'sha256sum "$(readlink -f "$(command -v node)")"'], { encoding: 'utf8' }).trim().split(/\s+/)[0]
const nodePath = execFileSync('docker', ['run', '--rm', '--network', 'none', IMAGE, 'sh', '-c', 'readlink -f "$(command -v node)"'], { encoding: 'utf8' }).trim()
const environment = { os: `${osType()} ${release()}`, cpu_count: cpus().length, ram_gib: Math.round((totalmem() / 2 ** 30) * 10) / 10, cpu_architecture: process.arch === 'x64' ? 'x86_64' : process.arch, node: nodeVersion, container: 'mcr.microsoft.com/playwright:v1.63.0-noble, --network none, --memory=6g, the repository mounted read-only' }
const engineInputs = ENGINE_FILES.map((p) => file(p, p === RUNNER ? 'runner' : 'engine'))
const now = () => new Date().toISOString()

function writeOut(id, name, text) {
  const path = `runs/${id}/${name}`
  writeFileSync(join(REPO, path), text)
  return { path, sha256: sha(Buffer.from(text)), bytes: Buffer.byteLength(text), kind: 'stdout' }
}

function record(r) {
  writeFileSync(join(REPO, 'runs', `${r.id}.json`), JSON.stringify(r, null, 2) + '\n')
  console.log(`wrote runs/${r.id}.json`)
}

const common = {
  task: 'W4-T27',
  origin: 'recorded',
  version: '1',
  binary: `the course's TypeScript (${ENGINE_FILES.slice(0, 3).join(', ')}), run by ${nodePath} (Node ${nodeVersion}) in the Playwright image, with type stripping`,
  binary_sha256: nodeSha,
  image: IMAGE,
  budget: { container_memory: '6g', network: 'none' },
  environment,
}

// ------------------------------------------------------------------------------------------ RUN-pairs-reference
{
  const id = 'RUN-pairs-reference'
  const cells = readdirSync(join(REPO, 'runs', id, 'cells')).filter((f) => f.endsWith('.pair')).sort().map((f) => `runs/${id}/cells/${f}`)
  const args = ['node', RUNNER, 'pairs', ...cells]
  const run = execute(args)
  const out = writeOut(id, 'output.txt', run.stdout)
  const lines = run.stdout.trimEnd().split('\n')
  const values = {}
  let cur = null
  for (const l of lines) {
    const m = /^pair (\S+): (related|not related)/.exec(l)
    if (m) {
      cur = m[1]
      values[cur] = { related: m[2] === 'related' }
    } else if (cur && /^ {2}verdict: /.test(l)) values[cur].verdict = l.replace(/^ {2}verdict: /, '')
    else if (cur && /^ {2}execution 1: /.test(l)) values[cur].execution1 = l.replace(/^ {2}execution 1: /, '')
    else if (cur && /^ {2}execution 2: /.test(l)) values[cur].execution2 = l.replace(/^ {2}execution 2: /, '')
  }
  record({
    id,
    title: "INS-pairs on S7.L5 to S7.L7's pair cells: Open v0's refusals tell frank's pair apart and v1's do not; the slug pair; the three single changes under ~acme; the leaky shared page; share-then-edit under the blanket relation and under the record; the count channel and its cure",
    ...common,
    records: 'curriculum/S07-secrecy.md SI-3: the INS-pairs cells of S7.L5 (segments 1 to 3), S7.L6 (segment 1) and S7.L7 (cells 1 to 3), and AUD-7.2',
    engine: 'ins-pairs',
    version_string: 'INS-pairs 1',
    recorded_at: now(),
    started_at: run.started,
    duration_s: run.duration,
    argv: docker(args),
    inputs: [...cells.map((p) => file(p, 'cell', 'curriculum/S07-secrecy.md section 3, the cell the file names')), ...engineInputs],
    exit_code: run.exit,
    verdict_lines: lines,
    outputs: [out],
    values,
    notes: [
      'Each cell is a pair in the pair notation of apps/instruments/src/engines/pairs/notation.ts, over the reference world W0.',
      'The observer is the response, error codes included (SEAM-10). The per-response monitor ("every page returned passes canread") runs on each execution alone.',
      "The S7 interpreter has no Lean reference: SEAM-13's course claim covers the goldens' fragment only (tracker W4-T27).",
    ],
  })
}

// ------------------------------------------------------------------------------------------ the two interp runs
function interpRun(id, title, records, configs, primary, notes) {
  const ran = configs.map((c) => {
    const args = ['node', RUNNER, 'interp', `runs/${id}/commands.txt`, ...(c.lag ? ['--lag', String(c.lag)] : [])]
    const run = execute(args)
    const out = writeOut(id, `output-${c.id}.txt`, run.stdout)
    return { ...c, args, run, out, lines: run.stdout.trimEnd().split('\n') }
  })
  const top = ran.find((c) => c.id === primary)
  const verdictOf = (lines, label) => (lines.find((l) => l.startsWith(label)) ?? '').replace(/^[^:]+: /, '')
  record({
    id,
    title,
    ...common,
    records,
    engine: 'ins-interp',
    version_string: "INS-interp 1, S7 extension",
    recorded_at: now(),
    started_at: top.run.started,
    duration_s: top.run.duration,
    argv: docker(top.args),
    inputs: [file(`runs/${id}/commands.txt`, 'commands', 'curriculum/S07-secrecy.md section 3, S7.L8'), ...engineInputs],
    exit_code: top.run.exit,
    verdict_lines: top.lines,
    outputs: ran.map((c) => c.out),
    values: Object.fromEntries(ran.map((c) => [c.id, { s_new: verdictOf(c.lines, 'S-new'), s_past: verdictOf(c.lines, 'S-past') }])),
    configs: ran.map((c) => ({ id: c.id, purpose: c.purpose, origin: 'recorded', argv: docker(c.args), exit_code: c.run.exit, verdict_lines: c.lines, outputs: [c.out], started_at: c.run.started, duration_s: c.run.duration })),
    primary_config: primary,
    notes,
  })
}

interpRun(
  'RUN-interp-revocation',
  'INS-interp on S7.L8 cell 1, single copy: Share, Open, Revoke, Open on contract for dana; S-new holds, and S-past is refuted at the Revoke step because the page delivered before it stays in dana\'s log',
  'S7.L8 cell 1, SP-7.3 and LAB-7.c6',
  [{ id: 'single-copy', purpose: 'the trace as S7.L8 cell 1 writes it, on one copy of the state' }],
  'single-copy',
  ['A trace step records the state right after its command; delivered is the subject\'s log of pages, which only grows.', "The S7 interpreter has no Lean reference (tracker W4-T27)."],
)
interpRun(
  'RUN-interp-new-enemy',
  'INS-interp on S7.L8 cell 2: gia revokes dana, edits contract\'s body, and dana opens contract; on one copy the open is refused, and with the ACL check on a replica 2 steps behind the primary dana receives the new body, refuting S-new',
  'S7.L8 cell 2 and SP-7.6 (ER-9)',
  [
    { id: 'replicated', lag: 2, purpose: "the replicated model: Open checks the ACL on a replica 2 steps behind the primary and reads the content from the primary (Zanzibar's Example B)" },
    { id: 'single-copy', purpose: 'the same commands on one copy of the state, for contrast' },
  ],
  'replicated',
  ['The replica lag is a model parameter [D]: the new enemy needs the ACL check to read a copy older than the revocation.', "The S7 interpreter has no Lean reference (tracker W4-T27)."],
)
