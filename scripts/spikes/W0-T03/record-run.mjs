#!/usr/bin/env node
/**
 * Records RUN-links-gate (W0-T03): GATE-links, the ID registry generator and their tests, in the
 * configurations that the acceptance criteria name.
 *
 *   gate                      scripts/verify-links.mjs on the real tree, as the fast lane runs it
 *   gate-strict               the same with --strict: every pending proposal fails
 *   gate-tracker-fixed        a scratch copy in which tracker/tasks.yaml gives SCR-instrument to a task
 *                             (the one-line fix that the real tree still needs). Substitute: an edit in a
 *                             scratch copy, not a change to tracker/tasks.yaml.
 *   planted-unowned           the fixed copy plus an unowned mechanic in spine section 7
 *   planted-used-in           the fixed copy with a wrong 9.1 "Used in" cell for INS-derivation
 *   planted-tracker-status    the fixed copy with docs/TRACKER.md showing W0-T03 as in progress
 *   planted-step-count        the fixed copy whose spine counts the seven [step] IDs among its lessons
 *   planted-unresolved        the fixed copy plus a mention of S4.L66 in docs/
 *   build-check               scripts/build-ids.mjs --check: the committed registry is what the spine generates
 *   tests                     node --test over packages/ids/test (the planted-fixture tests included)
 *   pyyaml                    the YAML subset parser against PyYAML on tracker/tasks.yaml (needs uv)
 *   typecheck                 tsc over packages/ids and packages/ids/test
 *   purity-lint               packages/purity-lint over packages/
 *
 * Usage: node scripts/spikes/W0-T03/record-run.mjs --scratch <empty-dir-outside-the-repo>
 * Every configuration runs before anything is written, so the scans see the tree without this run's
 * own files. Paths outside the repository are written as <scratch>; the recorder refuses to write a
 * file that holds the local account name or a private path.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const RUN_ID = 'RUN-links-gate'
const OUT = join(REPO, 'runs', RUN_ID)
const RECORDER = 'scripts/spikes/W0-T03/record-run.mjs'
const TIMEOUT_S = 300

const sha256 = (b) => createHash('sha256').update(b).digest('hex')
const fileSha = (p) => sha256(readFileSync(p))

const at = process.argv.indexOf('--scratch')
if (at < 0 || !process.argv[at + 1]) {
  console.error('usage: record-run.mjs --scratch <empty-dir-outside-the-repo>')
  process.exit(2)
}
const SCRATCH = resolve(process.argv[at + 1])
if (!relative(REPO, SCRATCH).startsWith('..')) {
  console.error('the scratch directory must be outside the repository')
  process.exit(2)
}
mkdirSync(SCRATCH, { recursive: true })
const SCRATCH_REAL = realpathSync(SCRATCH)
const COPY = join(SCRATCH, 'tree')

/** Everything that names the scratch directory is written as <scratch>. */
const scrub = (s) => s.split(SCRATCH_REAL).join('<scratch>').split(SCRATCH).join('<scratch>').split(REPO).join('<repo>')

/** The paths that verify-links reads, plus the registry it checks. */
const READ = ['README.md', 'docs', 'curriculum', 'labs', 'content', 'tracker', 'design', 'packages/ids/src', 'packages/ids/proposals.json']

function freshCopy() {
  rmSync(COPY, { recursive: true, force: true })
  for (const p of READ) {
    if (!existsSync(join(REPO, p))) continue
    mkdirSync(dirname(join(COPY, p)), { recursive: true })
    cpSync(join(REPO, p), join(COPY, p), { recursive: true })
  }
}
const edit = (path, fn) => writeFileSync(join(COPY, path), fn(readFileSync(join(COPY, path), 'utf8')))
const fixTracker = () => edit('tracker/tasks.yaml', (t) => t.replace('implements: ["', 'implements: ["SCR-instrument", "'))

function run(cmd, args, { cwd = REPO, env = {} } = {}) {
  const t0 = performance.now()
  const started = new Date().toISOString()
  const r = spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, encoding: 'utf8', timeout: TIMEOUT_S * 1000, maxBuffer: 1 << 28 })
  return { started_at: started, duration_s: Number(((performance.now() - t0) / 1000).toFixed(3)), exit_code: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
}

const configs = []
const outputs = new Map() // relative path under runs/RUN-links-gate -> text

function record(id, purpose, argv, result, extra = {}) {
  const file = `${id}.txt`
  outputs.set(file, scrub(result.stdout + (result.stderr ? `\n[stderr]\n${result.stderr}` : '')))
  configs.push({ id, purpose, argv: argv.map(scrub), started_at: result.started_at, duration_s: result.duration_s, exit_code: result.exit_code, ...extra, outputs: [{ path: `runs/${RUN_ID}/${file}` }] })
  return scrub(result.stdout).split('\n').filter(Boolean)
}

const gateArgs = (extra = []) => ['scripts/verify-links.mjs', ...extra]
const summary = (lines) => lines.filter((l) => /^(GATE-links:|FAIL |PENDING )/.test(l))
const failLines = (lines) => lines.filter((l) => l.startsWith('FAIL '))

// ------------------------------------------------------------------ the real tree
const gate = run('node', gateArgs())
record('gate', 'GATE-links over the real tree, as the fast lane runs it', ['node', ...gateArgs()], gate, {
  verdict_lines: summary(gate.stdout.split('\n')),
})
const strict = run('node', gateArgs(['--strict']))
record('gate-strict', 'the same with --strict, which also fails on every pending proposal', ['node', ...gateArgs(['--strict'])], strict, {
  verdict_lines: [summary(strict.stdout.split('\n')).at(-1)],
})

// ------------------------------------------------------------------ the fixed copy, and the planted defects
freshCopy()
fixTracker()
const root = ['--root', COPY]
const fixed = run('node', gateArgs(root))
const fixedLines = record('gate-tracker-fixed', 'a scratch copy in which a task implements SCR-instrument. Substitute: an edit in a scratch copy, not a change to tracker/tasks.yaml', ['node', ...gateArgs(root)], fixed, {
  verdict_lines: summary(fixed.stdout.split('\n')),
})

const planted = [
  [
    'planted-unowned',
    'an unowned mechanic in spine section 7',
    'owner',
    'M-planted-unowned',
    () =>
      edit('docs/spine/SPINE.md', (t) => {
        const lines = t.split('\n')
        const h = lines.findIndex((l) => l.startsWith('| ID | Purpose | Evidence |'))
        let e = h + 2
        while (lines[e].startsWith('|')) e++
        lines.splice(e, 0, '| M-planted-unowned | purpose | A | ux | events |')
        return lines.join('\n')
      }),
  ],
  [
    'planted-used-in',
    'INS-derivation said to be used in S4 and S9, where only S4 has a lesson row that uses it',
    'used-in',
    'INS-derivation',
    () => edit('docs/spine/SPINE.md', (t) => t.replace(/^(\| INS-derivation \|.*\| )S4( \|)/m, '$1S4, S9$2')),
  ],
  [
    'planted-tracker-status',
    'docs/TRACKER.md shows W0-T03 as in progress while tracker/tasks.yaml says todo',
    'tracker',
    'W0-T03',
    () => edit('docs/TRACKER.md', (t) => t.replace(/^- \[ \] W0-T03 /m, '- [~] W0-T03 ')),
  ],
  [
    'planted-step-count',
    'the spine counts the seven [step] IDs among its lessons (76 becomes 83)',
    'counts',
    'lessons',
    () => edit('docs/spine/SPINE.md', (t) => t.replace(/\b76 lessons \(/g, '83 lessons (')),
  ],
  ['planted-unresolved', 'a mention of S4.L66 in docs/, a lesson that does not exist', 'unresolved', 'S4.L66', () => writeFileSync(join(COPY, 'docs/planted.md'), 'See S4.L66.\n')],
]
for (const [id, purpose, check, needle, plant] of planted) {
  freshCopy()
  fixTracker()
  plant()
  const r = run('node', gateArgs(root))
  const lines = r.stdout.split('\n')
  const found = failLines(lines).filter((l) => l.startsWith(`FAIL  ${check}  `) && l.includes(needle))
  const clean = !fixedLines.some((l) => l.startsWith(`FAIL  ${check}  `) && l.includes(needle))
  const verdict = found.length > 0 && clean && r.exit_code === 1 ? 'PASS' : 'FAIL'
  record(id, `${purpose} (planted in the scratch copy)`, ['node', ...gateArgs(root)], r, {
    verdict_lines: [`${verdict}: the gate exits ${r.exit_code} and reports ${found.length} "${check}" finding(s) naming ${needle}; the copy without the defect reports none`, ...found.map(scrub)],
    planted_check: check,
  })
}

// ------------------------------------------------------------------ generator, tests, typecheck, lint
const build = run('node', ['scripts/build-ids.mjs', '--check'])
record('build-check', 'the committed registry and types are what the spine and EVIDENCE.md generate', ['node', 'scripts/build-ids.mjs', '--check'], build, {
  verdict_lines: build.stdout.split('\n').filter(Boolean),
})

const tests = run('node', ['--test', 'packages/ids/test/*.test.ts'])
const tap = tests.stdout.split('\n')
const total = (k) => Number(tap.find((l) => l.startsWith(`# ${k} `))?.split(' ')[2])
const testLines = tap.filter((l) => /^(not )?ok \d+ - /.test(l))
record('tests', 'the unit and planted-fixture tests of packages/ids', ['node', '--test', 'packages/ids/test/*.test.ts'], { ...tests, stdout: `${testLines.join('\n')}\n${tap.filter((l) => /^# (tests|suites|pass|fail|cancelled|skipped|todo) /.test(l)).join('\n')}\n` }, {
  verdict_lines: [`tests ${total('tests')}, pass ${total('pass')}, fail ${total('fail')}, skipped ${total('skipped')}`],
  counts: { tests: total('tests'), pass: total('pass'), fail: total('fail'), skipped: total('skipped') },
})

const pyVersion = run('uv', ['run', '--quiet', '--with', 'pyyaml', 'python', '-I', '-c', 'import yaml; print(yaml.__version__)'])
const py = run('node', ['--test', 'packages/ids/test/yaml-subset.test.ts'], { env: { IDS_TEST_PYYAML: '1' } })
const pyTap = py.stdout.split('\n')
record('pyyaml', 'the YAML subset parser against PyYAML (safe_load) on tracker/tasks.yaml: deepEqual over all tasks and waves', ['node', '--test', 'packages/ids/test/yaml-subset.test.ts'], { ...py, stdout: `${pyTap.filter((l) => /^(not )?ok \d+ - /.test(l)).join('\n')}\n${pyTap.filter((l) => /^# (tests|pass|fail|skipped) /.test(l)).join('\n')}\n` }, {
  env: { IDS_TEST_PYYAML: '1' },
  verdict_lines: [`PyYAML ${pyVersion.stdout.trim()}: ${pyTap.find((l) => /^ok \d+ - agrees with PyYAML/.test(l))?.replace(/^ok \d+ - /, 'ok: ') ?? 'not found'}`],
  tool_versions: { pyyaml: pyVersion.stdout.trim() },
})

const tsVersion = run('npx', ['tsc', '--version'])
const ts1 = run('npx', ['tsc', '-p', 'packages/ids'])
const ts2 = run('npx', ['tsc', '-p', 'packages/ids/test'])
record('typecheck', 'tsc over packages/ids (sources) and packages/ids/test, with the repository base options (strict, erasable syntax, no Node types in src)', ['npx', 'tsc', '-p', 'packages/ids', '&&', 'npx', 'tsc', '-p', 'packages/ids/test'], { ...ts1, exit_code: ts1.exit_code || ts2.exit_code, stdout: `${ts1.stdout}${ts2.stdout}` }, {
  verdict_lines: [`${tsVersion.stdout.trim()}: exit ${ts1.exit_code || ts2.exit_code}, ${(ts1.stdout + ts2.stdout).split('\n').filter(Boolean).length} diagnostic line(s)`],
  tool_versions: { typescript: tsVersion.stdout.trim().replace(/^Version /, '') },
})

const lint = run('node', ['packages/purity-lint/check.mjs'])
record('purity-lint', 'packages/purity-lint over packages/*/src (no platform global, no Node import)', ['node', 'packages/purity-lint/check.mjs'], lint, { verdict_lines: lint.stdout.split('\n').filter(Boolean) })

// ------------------------------------------------------------------ write the record
const inputFiles = [
  'scripts/verify-links.mjs',
  'scripts/build-ids.mjs',
  RECORDER,
  ...readdirSync(join(REPO, 'packages/ids/src')).map((f) => `packages/ids/src/${f}`),
  'packages/ids/proposals.json',
  ...readdirSync(join(REPO, 'packages/ids/test')).map((f) => `packages/ids/test/${f}`),
  'docs/spine/SPINE.md',
  'docs/EVIDENCE.md',
  'tracker/tasks.yaml',
  'docs/TRACKER.md',
].filter((p) => existsSync(join(REPO, p)) && statSync(join(REPO, p)).isFile())
const inputs = inputFiles.map((path) => ({ path, sha256: fileSha(join(REPO, path)) }))

// the digest of everything the gate scanned, as the gate collected it
const { collectFiles } = await import(pathToFileUrl(join(REPO, 'scripts/verify-links.mjs')))
const scanned = collectFiles(REPO)
const digest = sha256(scanned.map((f) => `${sha256(f.text)}  ${f.path}\n`).join(''))
inputs.push({ path: '.', role: 'every file that GATE-links scans (README.md, docs/, curriculum/, labs/, content/, tracker/, design/), other tasks\' work in progress included', files: scanned.length, bytes: scanned.reduce((n, f) => n + Buffer.byteLength(f.text), 0), sha256: digest, sha256_method: 'SHA-256 over the lines "<sha256 of file>  <path>\\n" in the order the gate collects them' })

function pathToFileUrl(p) {
  return new URL(`file://${p}`).href
}

const failed = configs.filter((c) => c.verdict_lines?.some((l) => String(l).startsWith('FAIL:')))
const record_ = {
  id: RUN_ID,
  title: 'GATE-links over the real tree, with planted defects, the registry generator, the YAML subset against PyYAML and the tests of packages/ids (W0-T03)',
  primary_config: 'gate',
  engine: 'node',
  version: process.versions.node,
  binary: 'node (the host binary; no container)',
  binary_sha256: fileSha(process.execPath),
  image: null,
  argv: ['node', 'scripts/verify-links.mjs'],
  env: {},
  inputs,
  budget: { timeout_s: TIMEOUT_S, timeout_scope: 'each configuration', network: 'only uv, to fetch PyYAML once (pyyaml configuration)' },
  environment: {
    os: `${os.type()} ${os.release()} ${os.arch()}`,
    cpu_count: os.cpus().length,
    cpu_model: os.cpus()[0]?.model ?? null,
    ram_gib: Math.round(os.totalmem() / 2 ** 30),
    node: process.version,
    container: null,
    image_digest: null,
  },
  started_at: configs[0].started_at,
  duration_s: Number(configs.reduce((n, c) => n + c.duration_s, 0).toFixed(3)),
  exit_code: configs[0].exit_code,
  verdict_lines: configs.flatMap((c) => (c.verdict_lines ?? []).map((l) => `${c.id}: ${l}`)),
  outputs: [...outputs.keys()].map((f) => ({ path: `runs/${RUN_ID}/${f}` })),
  configs,
  owner_actions: [],
  recorded_at: new Date().toISOString(),
  notes: [
    'The gate is the course\'s own script, so engine and version name the Node runtime that ran it.',
    'GATE-links is red on the real tree for one reason: tracker/tasks.yaml gives no task SCR-instrument (spine section 13 gives it to W1-T14). gate-tracker-fixed shows that this is the only finding left besides the pending proposals; it is not evidence that the tracker is fixed.',
    'The pending proposals are IDs that curriculum/ specs propose and the spine does not register (packages/ids/proposals.json) and one run ID in a task\'s proposed_ids; W0-T10 registers or declines them. gate-strict fails on each of them.',
    'The tests configuration skips one test, the comparison with PyYAML, which needs uv and a network on first use; the pyyaml configuration runs it (IDS_TEST_PYYAML=1).',
    'The planted configurations plant one defect each in a scratch copy of the files the gate reads; each PASS says the gate exits 1 with the expected finding and that the copy without the defect has none.',
    'RUN-links-gate is not among the run ids of spine section 9.5, which lists no run for W0-T03; it records this task\'s acceptance evidence.',
    'schemas/run.schema.json did not exist when this run was recorded, so the record is not validated against it.',
    'The scans cover other tasks\' files as they stood at the run time; the fast lane re-runs the gate on every change, so a later tree needs a later run.',
    ...(failed.length ? [`A planted configuration did not pass: ${failed.map((c) => c.id).join(', ')}.`] : []),
  ],
}

// ------------------------------------------------------------------ refuse to write private paths or names
const account = os.userInfo().username
const bodies = [JSON.stringify(record_), ...outputs.values()]
for (const b of bodies) {
  if (/\/home\/|\/Users\/|\/tmp\/|\/var\/folders\//.test(b) || (account.length > 2 && b.includes(account))) {
    console.error('refusing to write: a record holds a private path or the local account name')
    process.exit(1)
  }
}
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
for (const [f, text] of outputs) writeFileSync(join(OUT, f), text.endsWith('\n') ? text : `${text}\n`)
// the hash of each output goes into the record
record_.outputs = [...outputs.keys()].map((f) => ({ path: `runs/${RUN_ID}/${f}`, sha256: fileSha(join(OUT, f)), bytes: statSync(join(OUT, f)).size }))
for (const c of record_.configs) c.outputs = c.outputs.map((o) => record_.outputs.find((x) => x.path === o.path) ?? o)
writeFileSync(join(REPO, 'runs', `${RUN_ID}.json`), `${JSON.stringify(record_, null, 2)}\n`)
rmSync(COPY, { recursive: true, force: true })
console.log(`recorded ${RUN_ID}: ${configs.length} configurations${failed.length ? `, ${failed.length} planted configuration(s) did not pass` : ''}`)
