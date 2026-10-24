#!/usr/bin/env node
/**
 * Records RUN-privacy-gate (W0-T01): scripts/verify-privacy.mjs in eight configurations.
 *
 *   gate                    every published path, as the fast lane runs it: CI=true, no term list
 *   account-term            the same, with a one-line term list holding only `account: <local user>`,
 *                           kept in <scratch> outside the repository and deleted after use, and CI=1 so
 *                           a match prints only as a hash prefix: a local substitute for the owner's CI list
 *   local-identity          the same, as a developer runs it: CI unset and no list, so the gate adds the
 *                           local identity (account name, git user.name, git email local part) by itself
 *   self-test               the in-memory fixtures for every check and allowance
 *   planted                 a scratch clone with violations planted in its tree and history, CI=true
 *   planted-account-term    the planted clone under the one-line term list
 *   planted-local-identity  the planted clone as a developer runs it
 *   license-placeholder-substitute
 *                           a copy of every published path in <scratch>/sim plus a placeholder
 *                           vendor/kernelspace/LICENSE, CI=true. Substitute: placeholder license standing
 *                           in for the owner's OD-16 choice; not a real license.
 *
 * Usage: node scripts/spikes/W0-T01/record-run.mjs --scratch <empty-dir-outside-the-repo>
 * Every configuration runs before anything is written, so the repository scans see the tree without
 * this run's own files. Paths outside the repository are written as <scratch>. The local account name
 * goes only into the scratch term list and the scratch clone, and the recorder refuses to write a file
 * that holds it, git's user.name or user.email, or a private path.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { identityTerms } from '../../verify-privacy.mjs'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const RUN_ID = 'RUN-privacy-gate'
const OUT = join(REPO, 'runs', RUN_ID)
const GATE = 'scripts/verify-privacy.mjs'
const RECORDER = 'scripts/spikes/W0-T01/record-run.mjs'
const TIMEOUT_S = 120
const SUBSTITUTE = "substitute: placeholder license standing in for the owner's OD-16 choice; not a real license"
const OWNER_LICENSE =
  'OD-16: the owner chooses the code license and adds its LICENSE file to kernelspace; W0-S12 then vendors that file beside vendor/kernelspace/VENDOR.md, and GATE-privacy turns green on the real tree'
const sha256 = (b) => createHash('sha256').update(b).digest('hex')
const fileSha = (p) => sha256(readFileSync(p))

const i = process.argv.indexOf('--scratch')
if (i < 0 || !process.argv[i + 1]) {
  console.error('usage: record-run.mjs --scratch <empty-dir-outside-the-repo>')
  process.exit(2)
}
const SCRATCH = resolve(process.argv[i + 1])
if (!relative(REPO, SCRATCH).startsWith('..')) {
  console.error('the scratch directory must be outside the repository')
  process.exit(2)
}
mkdirSync(SCRATCH, { recursive: true })
const SCRATCH_REAL = realpathSync(SCRATCH)
const SIM = join(SCRATCH, 'sim')
const CLONE = join(SCRATCH, 'clone')
const TERMS_DIR = join(SCRATCH, 'terms')
const TERM_FILE = join(TERMS_DIR, 'privacy-terms.txt')
const TERM_FILE_LABEL = '<scratch>/terms/privacy-terms.txt'
// The term list and the copies never outlive the recorder, even when it fails part-way
process.on('exit', () => {
  for (const p of [TERMS_DIR, CLONE, SIM]) rmSync(p, { recursive: true, force: true })
})

// Identity values: used only under <scratch>, and looked for in every file before it is written
const gitConfig = (k) => {
  const r = spawnSync('git', ['-C', REPO, 'config', '--get', k], { encoding: 'utf8' })
  return r.status === 0 ? r.stdout.trim() || null : null
}
let USER = null
try {
  USER = os.userInfo().username
} catch {}
const GIT_NAME = gitConfig('user.name')
const GIT_EMAIL = gitConfig('user.email')
const ACCOUNT_USABLE = identityTerms({ username: USER }).length === 1
const identityValues = [
  ACCOUNT_USABLE ? USER : null,
  identityTerms({ gitName: GIT_NAME }).length ? GIT_NAME : null,
  GIT_EMAIL,
  identityTerms({ gitEmail: GIT_EMAIL }).length ? GIT_EMAIL.slice(0, GIT_EMAIL.lastIndexOf('@')) : null,
].filter(Boolean)
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const FORBIDDEN = [
  ...[REPO, SCRATCH, SCRATCH_REAL, os.homedir(), ['', 'tmp', 'claude'].join('/')].map((p) => new RegExp(escapeRe(p), 'i')),
  ...identityValues.map((v) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(v)}(?![\\p{L}\\p{N}])`, 'iu')),
]
/** Refuse to write a private path or an identity value; the message never repeats the value. */
function guarded(name, text) {
  if (FORBIDDEN.some((re) => re.test(text))) throw new Error(`refusing to write ${name}: it holds a private path or an identity value`)
  return text
}
const norm = (s) => s.split(SCRATCH_REAL).join('<scratch>').split(SCRATCH).join('<scratch>').split(REPO).join('<repo>')

/** A stored report keeps where each finding is and what kind it is, never the matched text. */
function stored(report) {
  const r = structuredClone(report)
  for (const f of r.findings) delete f.excerpt
  return `${norm(JSON.stringify(r, null, 2))}\n`
}

const PRIVACY_ENV = ['STATESPACE_PRIVACY_TERMS', 'STATESPACE_PRIVACY_KEY', 'STATESPACE_PRIVACY_TERMS_FILE', 'STATESPACE_COURSE_DOMAIN', 'STATESPACE_PRIVACY_LOCAL_IDENTITY', 'CI']

/** Run the gate with only the given privacy variables set. */
function run(argv, extra = {}) {
  const env = { ...process.env }
  for (const k of PRIVACY_ENV) delete env[k]
  Object.assign(env, extra)
  const started = new Date()
  const t0 = process.hrtime.bigint()
  const r = spawnSync(process.execPath, argv, { cwd: REPO, env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: TIMEOUT_S * 1000 })
  const duration_s = Number(process.hrtime.bigint() - t0) / 1e9
  return {
    started_at: started.toISOString(),
    duration_s: Math.round(duration_s * 1000) / 1000,
    exit_code: r.status,
    signal: r.signal,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  }
}

function parse(name, r) {
  try {
    return JSON.parse(r.stdout)
  } catch {
    throw new Error(`${name}: the gate printed no JSON (exit ${r.exit_code}, signal ${r.signal}): ${norm(r.stderr).slice(0, 400)}`)
  }
}

const git = (cwd, ...args) => {
  const r = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', maxBuffer: 1 << 30 })
  if (r.status !== 0) throw new Error(`git ${args[0]} failed: ${norm(r.stderr)}`)
  return r.stdout
}

const counts = (report) => {
  const c = {}
  for (const f of report.findings) c[f.check] = (c[f.check] ?? 0) + 1
  return c
}
const located = (report, check) =>
  report.findings.filter((f) => !check || f.check === check).map((f) => ({ check: f.check, path: f.path, ...(f.line ? { line: f.line } : {}), message: f.message }))
const verdict = (r, report) =>
  report.ok ? `exit ${r.exit_code}: ok, no problem found` : `exit ${r.exit_code}: ${report.findings.length} problem(s): ${report.findings.map((f) => `${f.check} ${f.path}${f.line ? `:${f.line}` : ''}`).join('; ')}`
const sameMap = (a, b) => Object.keys({ ...a, ...b }).every((k) => (a[k] ?? 0) === (b[k] ?? 0))

/** Published paths, as the gate lists them. */
function published() {
  const out = git(REPO, 'ls-files', '-z', '--cached', '--others', '--exclude-standard')
  return [...new Set(out.split('\0').filter(Boolean))].sort().map((p) => p.replace(/\/$/, ''))
}

/** Copy the published paths into <scratch>/sim and digest them the way the gate does. */
function copyPublished(paths) {
  rmSync(SIM, { recursive: true, force: true })
  mkdirSync(SIM, { recursive: true })
  const lines = []
  const embedded = []
  for (const p of paths) {
    const src = join(REPO, p)
    const dst = join(SIM, p)
    let st
    try {
      st = lstatSync(src)
    } catch {
      continue // listed but gone; the gate skips it too
    }
    mkdirSync(dirname(dst), { recursive: true })
    if (st.isSymbolicLink()) {
      const target = readlinkSync(src)
      symlinkSync(target, dst)
      lines.push(`${sha256(Buffer.from(target))}  ${p}\n`)
    } else if (st.isDirectory()) {
      cpSync(src, dst, { recursive: true, verbatimSymlinks: true, filter: (s) => !/(?:^|\/)(?:\.git|node_modules)(?:\/|$)/.test(s.slice(src.length)) })
      embedded.push(p)
    } else {
      const buf = readFileSync(src)
      writeFileSync(dst, buf)
      lines.push(`${sha256(buf)}  ${p}\n`)
    }
  }
  return { files: lines.length, digest: sha256(lines.join('')), embedded }
}

// A fresh recording: the gate must not scan this run's own stale outputs
rmSync(OUT, { recursive: true, force: true })
rmSync(join(REPO, 'runs', `${RUN_ID}.json`), { force: true })
const recordingStarted = new Date().toISOString()

// 1. gate, with a copy of exactly the tree it scanned (retried while other tasks change the tree)
let gate
let gateReport
let copy
let attempts = 0
for (;;) {
  attempts++
  copy = copyPublished(published())
  gate = run([GATE, '--json'], { CI: 'true' })
  gateReport = parse('gate', gate)
  if ((gateReport.scanned.digest === copy.digest && !copy.embedded.length) || attempts >= 5) break
}
const copyMatchesGate = gateReport.scanned.digest === copy.digest && !copy.embedded.length

// 2. account-term on the real tree: the one-line list lives in <scratch> and is deleted after the planted runs
let account = null
if (ACCOUNT_USABLE) {
  rmSync(TERMS_DIR, { recursive: true, force: true })
  mkdirSync(TERMS_DIR, { recursive: true })
  writeFileSync(TERM_FILE, `account: ${USER}\n`, { mode: 0o600 })
  account = run([GATE, '--json'], { CI: '1', STATESPACE_PRIVACY_TERMS_FILE: TERM_FILE })
}
const accountReport = account && parse('account-term', account)

// 3. local-identity on the real tree: CI unset, no list
const local = run([GATE, '--json'])
const localReport = parse('local-identity', local)

// 4. self-test, with CI unset so a fixture that read the local identity would show
const self = run([GATE, '--self-test'])

// 5-7. planted: a clone of the committed tree, this task's .gitignore, and violations
rmSync(CLONE, { recursive: true, force: true })
git(SCRATCH, 'clone', '-q', REPO, CLONE)
writeFileSync(join(CLONE, '.gitignore'), readFileSync(join(REPO, '.gitignore')))
const ident = ['-c', 'user.name=planted', '-c', `user.email=${['planted', 'example.com'].join('@')}`]
writeFileSync(join(CLONE, 'research', 'review-merged-1.json'), '{"findings": []}\n')
git(CLONE, 'add', '-f', 'research/review-merged-1.json')
git(CLONE, ...ident, 'commit', '-q', '-m', 'planted: a review JSON enters history')
git(CLONE, 'rm', '-q', 'research/review-merged-1.json')
git(CLONE, ...ident, 'commit', '-q', '-m', 'planted: and leaves the tree')
const product = 'Mini-Plinth'.slice(5)
const plants = {
  'docs/planted.md': `Ask ${['grace.h', 'analytical-engine.org'].join('@')}; notes in ${['', 'home', 'grace', 'notes'].join('/')}.\n`,
  'labs/planted.md': `Wire the checker into your ${product} platform.\n`,
  'apps/site/planted.ts': `export const ORIGIN = 'https://instruments.${'grace-h'}.dev/'\n`,
  'vendor/planted/lib.js': 'export const x = 1\n',
}
const LEAK_PLANT = 'scripts/planted-leak.mjs'
if (ACCOUNT_USABLE) plants[LEAK_PLANT] = `if (/${USER}/.test(text)) throw new Error('leak')\n`
for (const [p, text] of Object.entries(plants)) {
  mkdirSync(dirname(join(CLONE, p)), { recursive: true })
  writeFileSync(join(CLONE, p), text)
}
const base = { 'review-json': 1, email: 1, 'private-path': 1, 'your-system': 1, 'course-domain': 1, 'vendor-license': 1 }
const withLeak = ACCOUNT_USABLE ? { ...base, 'private-term': 1 } : base
const plantedRun = (id, env, want) => {
  const r = run([GATE, '--json', '--root', CLONE], env)
  const report = parse(id, r)
  const got = counts(report)
  const leakAt = located(report, 'private-term').map((f) => f.path)
  const pass = sameMap(got, want) && leakAt.every((p) => p === LEAK_PLANT)
  return { id, r, report, got, want, pass }
}
const planted = plantedRun('planted', { CI: 'true' }, base)
const plantedAccount = ACCOUNT_USABLE ? plantedRun('planted-account-term', { CI: '1', STATESPACE_PRIVACY_TERMS_FILE: TERM_FILE }, withLeak) : null
const plantedLocal = plantedRun('planted-local-identity', {}, withLeak)
rmSync(TERMS_DIR, { recursive: true, force: true })
const termListDeleted = ACCOUNT_USABLE ? !existsSync(TERM_FILE) : null
rmSync(CLONE, { recursive: true, force: true })

// 8. license-placeholder-substitute: the copied tree plus a placeholder license
const PLACEHOLDER_PATH = 'vendor/kernelspace/LICENSE'
const placeholder = `PLACEHOLDER, NOT A LICENSE. ${SUBSTITUTE}. Written by ${RECORDER} into a scratch copy outside the repository, only to show which GATE-privacy finding the real file clears.\n`
mkdirSync(dirname(join(SIM, PLACEHOLDER_PATH)), { recursive: true })
writeFileSync(join(SIM, PLACEHOLDER_PATH), placeholder)
const sub = run([GATE, '--json', '--root', SIM], { CI: 'true' })
const subReport = parse('license-placeholder-substitute', sub)
rmSync(SIM, { recursive: true, force: true })

// Outputs, written only now
mkdirSync(OUT, { recursive: true })
const files = {
  'gate.json': stored(gateReport),
  ...(accountReport ? { 'account-term.json': stored(accountReport) } : {}),
  'local-identity.json': stored(localReport),
  'self-test.txt': norm(self.stdout),
  'planted.json': stored(planted.report),
  ...(plantedAccount ? { 'planted-account-term.json': stored(plantedAccount.report) } : {}),
  'planted-local-identity.json': stored(plantedLocal.report),
  'substitute.json': stored(subReport),
}
const outputs = {}
for (const [name, text] of Object.entries(files)) {
  writeFileSync(join(OUT, name), guarded(name, text))
  outputs[name] = { path: `runs/${RUN_ID}/${name}`, sha256: fileSha(join(OUT, name)), bytes: Buffer.byteLength(text) }
}

// The record
const scanOf = (report) => ({ via: report.scanned.via, files: report.scanned.files, bytes: report.scanned.bytes, sha256: report.scanned.digest })
const termsOf = (report) => ({ listed: report.terms.listed, identity: report.terms.identity, sources: report.terms.sources })
const realTree = (id, purpose, r, report, env, output) => ({
  id,
  purpose,
  argv: ['node', GATE, '--json'],
  env,
  started_at: r.started_at,
  duration_s: r.duration_s,
  exit_code: r.exit_code,
  verdict_lines: [verdict(r, report)],
  findings_by_check: counts(report),
  private_term_findings: located(report, 'private-term'),
  warnings: report.warnings.map((w) => w.check),
  terms: termsOf(report),
  scanned: scanOf(report),
  same_tree_as_gate: report.scanned.digest === gateReport.scanned.digest,
  outputs: [outputs[output]],
})
const plantedConfig = (p, purpose, env, output) => ({
  id: p.id,
  purpose,
  argv: ['node', GATE, '--json', '--root', '<scratch>/clone'],
  env,
  started_at: p.r.started_at,
  duration_s: p.r.duration_s,
  exit_code: p.r.exit_code,
  verdict_lines: [`${p.pass ? 'PASS' : 'FAIL'}: findings by check ${JSON.stringify(p.got)}, expected ${JSON.stringify(p.want)}`],
  findings_by_check: p.got,
  expected: p.want,
  private_term_findings: located(p.report, 'private-term'),
  terms: termsOf(p.report),
  pass: p.pass,
  outputs: [outputs[output]],
})

const accountMatches = accountReport ? located(accountReport, 'private-term') : null
const localMatches = located(localReport, 'private-term')
const accountSummary = !accountReport
  ? 'not run: the local account name is generic, so a term list naming it would test nothing'
  : accountMatches.length
    ? `${accountMatches.length} match(es) of the local account name in the published tree: ${accountMatches.map((f) => `${f.path}:${f.line}`).join(', ')}. GATE-privacy cannot be green until the task that owns each file removes the name.`
    : 'no match of the local account name in the published tree.'
const gateOnlyLicense =
  sameMap(counts(gateReport), { 'vendor-license': 1 }) && gateReport.findings[0].path === 'vendor/kernelspace/' && !accountMatches?.length && !localMatches.length
const subGreen = subReport.ok && sub.exit_code === 0
const plantedAllPass = [planted, plantedAccount, plantedLocal].filter(Boolean).every((p) => p.pass)

const configs = [
  {
    id: 'gate',
    purpose: 'every published path, as the fast lane runs it: CI=true and no term list in the environment, since the owner has not set the CI secrets yet',
    argv: ['node', GATE, '--json'],
    env: { CI: 'true' },
    started_at: gate.started_at,
    duration_s: gate.duration_s,
    exit_code: gate.exit_code,
    verdict_lines: [verdict(gate, gateReport)],
    findings_by_check: counts(gateReport),
    findings: located(gateReport),
    warnings: gateReport.warnings.map((w) => w.check),
    scanned: scanOf(gateReport),
    history: gateReport.history,
    vendored: gateReport.vendored,
    allowed: gateReport.allowed,
    attempts,
    outputs: [outputs['gate.json']],
  },
  ...(accountReport
    ? [
        {
          ...realTree(
            'account-term',
            "local substitute for the owner's CI term list: the same scan with a one-line plaintext list holding only `account: <local user>`, kept in <scratch> outside the repository and read through STATESPACE_PRIVACY_TERMS_FILE, with CI=1 so a match prints only as a hash prefix",
            account,
            accountReport,
            { CI: '1', STATESPACE_PRIVACY_TERMS_FILE: TERM_FILE_LABEL },
            'account-term.json',
          ),
          term_list: {
            location: TERM_FILE_LABEL,
            entries: 1,
            kinds: ['account'],
            sha256: null,
            sha256_note: 'not recorded: a hash of a one-line list would confirm a guessed account name',
            deleted_after_use: termListDeleted,
          },
        },
      ]
    : []),
  realTree(
    'local-identity',
    'the same scan as a developer runs it: CI unset and no term list, so the gate adds the local identity by itself (the operating-system account name, git user.name and the local part of git user.email; the values are not recorded)',
    local,
    localReport,
    {},
    'local-identity.json',
  ),
  {
    id: 'self-test',
    purpose: 'in-memory fixtures: every check fires on its plant, and every allowance passes its case; run with CI unset, so a fixture that read the local identity would show',
    argv: ['node', GATE, '--self-test'],
    env: {},
    started_at: self.started_at,
    duration_s: self.duration_s,
    exit_code: self.exit_code,
    verdict_lines: [self.stdout.trim().split('\n').pop()],
    outputs: [outputs['self-test.txt']],
  },
  plantedConfig(
    planted,
    `a clone of the committed tree in <scratch>, with this task's .gitignore, a review JSON committed and then deleted, and untracked files planting an email, a home path, learner copy naming the product, a real instrument host and an unlicensed vendored directory${ACCOUNT_USABLE ? `, plus ${LEAK_PLANT} holding the local account name in a regular expression; CI=true and no term list, as the fast lane runs today, so the account name is expected to pass unseen` : ''}`,
    { CI: 'true' },
    'planted.json',
  ),
  ...(plantedAccount
    ? [plantedConfig(plantedAccount, 'the planted clone under the one-line term list (CI=1): the account name is caught as well', { CI: '1', STATESPACE_PRIVACY_TERMS_FILE: TERM_FILE_LABEL }, 'planted-account-term.json')]
    : []),
  plantedConfig(plantedLocal, 'the planted clone as a developer runs it (CI unset, no term list): the local identity catches the account name', {}, 'planted-local-identity.json'),
  {
    id: 'license-placeholder-substitute',
    purpose: `${SUBSTITUTE}. Every published path at the time of the gate configuration, copied into <scratch>/sim, plus a placeholder ${PLACEHOLDER_PATH}; CI=true and no term list, as in the gate configuration`,
    argv: ['node', GATE, '--json', '--root', '<scratch>/sim'],
    env: { CI: 'true' },
    inputs: [
      {
        path: '<scratch>/sim',
        role: 'the copy: every published path, listed by git ls-files -z --cached --others --exclude-standard',
        files: copy.files,
        sha256: copy.digest,
        same_as_gate_tree: copyMatchesGate,
      },
      { path: `<scratch>/sim/${PLACEHOLDER_PATH}`, role: 'the placeholder; not a real license', sha256: sha256(placeholder), bytes: Buffer.byteLength(placeholder) },
    ],
    started_at: sub.started_at,
    duration_s: sub.duration_s,
    exit_code: sub.exit_code,
    verdict_lines: [verdict(sub, subReport)],
    findings_by_check: counts(subReport),
    findings: located(subReport),
    warnings: subReport.warnings.map((w) => w.check),
    gate_notes: subReport.notes,
    scanned: scanOf(subReport),
    vendored: subReport.vendored,
    owner_action: OWNER_LICENSE,
    outputs: [outputs['substitute.json']],
  },
]

const nodeBin = realpathSync(process.execPath)
const record = {
  id: RUN_ID,
  title: 'GATE-privacy over every published path, with a one-line account term list, as a developer runs it, its fixtures, planted violations, and a placeholder license (W0-T01)',
  primary_config: 'gate',
  engine: 'node',
  version: process.version.slice(1),
  binary: 'node (the host binary; no container)',
  binary_sha256: fileSha(nodeBin),
  image: null,
  argv: ['node', GATE, '--json'],
  env: { CI: 'true' },
  inputs: [
    { path: GATE, sha256: fileSha(join(REPO, GATE)), role: 'the gate' },
    { path: RECORDER, sha256: fileSha(join(REPO, RECORDER)), role: 'this recorder' },
    { path: '.gitignore', sha256: fileSha(join(REPO, '.gitignore')), role: 'what is published' },
    {
      path: '.',
      role: "every published path at the time of the gate configuration (tracked, plus untracked and not ignored), other tasks' work in progress included",
      head: git(REPO, 'rev-parse', 'HEAD').trim(),
      files: gateReport.scanned.files,
      bytes: gateReport.scanned.bytes,
      sha256: gateReport.scanned.digest,
      sha256_method: 'SHA-256 over the lines "<sha256 of file>  <path>\\n" in path order, as the gate computes it',
    },
  ],
  budget: {
    timeout_s: TIMEOUT_S,
    timeout_scope: 'each gate invocation',
    max_file_bytes: 64 * 1024 * 1024,
    network: 'not used',
    term_list: 'none for gate, planted and the substitute; one account entry for account-term and planted-account-term; the local identity for local-identity and planted-local-identity',
  },
  environment: {
    os: `${os.type()} ${os.release()} ${os.arch()}`,
    cpu_count: os.cpus().length,
    cpu_model: os.cpus()[0]?.model ?? null,
    ram_gib: Math.round(os.totalmem() / 2 ** 30),
    node: process.version,
    git: spawnSync('git', ['--version'], { encoding: 'utf8' }).stdout.trim(),
    container: null,
    image_digest: null,
  },
  started_at: gate.started_at,
  duration_s: gate.duration_s,
  exit_code: gate.exit_code,
  verdict_lines: configs.map((c) => `${c.id}: ${c.verdict_lines[0]}`),
  outputs: Object.values(outputs),
  configs,
  owner_actions: [
    OWNER_LICENSE,
    'OD-16: add the course\'s two LICENSE files (content and code) at the repository root; until then the gate warns, and --strict fails',
    'Write the private term list outside the repository, hash it with `node scripts/verify-privacy.mjs --hash-terms <file>`, and store the result and its key as the CI secrets STATESPACE_PRIVACY_TERMS and STATESPACE_PRIVACY_KEY, and the course domain as the CI variable STATESPACE_COURSE_DOMAIN; account-term stands in for that list with a single entry until then',
  ],
  recorded_at: new Date().toISOString(),
  recording_started_at: recordingStarted,
  notes: [
    "The gate is the course's own script, so engine and version name the Node runtime that ran it.",
    gateOnlyLicense
      ? 'GATE-privacy is red on the real tree for one reason, in all three repository scans (gate, account-term, local-identity): vendor/kernelspace/ has no license file of its own. Kernelspace has none upstream; choosing it is OD-16, open for the owner, and W0-S12 vendors the file once it exists.'
      : 'GATE-privacy is red on the real tree for more than the missing kernelspace license; see the findings of gate, account-term and local-identity.',
    subGreen && gateOnlyLicense
      ? `license-placeholder-substitute exits 0: ${SUBSTITUTE}. It shows that the license is the only finding left on this tree; it is not evidence that GATE-privacy is green.`
      : `license-placeholder-substitute exits ${sub.exit_code}: ${SUBSTITUTE}. See its findings.`,
    copyMatchesGate
      ? `The substitute's copy has the same digest as the tree the gate configuration scanned (attempt ${attempts}), so the placeholder is the only difference.`
      : 'The substitute\'s copy differs from the tree the gate configuration scanned: other tasks changed files between the two, so compare the findings, not the digests.',
    "<scratch>/sim is not a git checkout, so the gate scans every file under it and skips the git history and .gitignore checks; the gate configuration covers both on the real tree.",
    `account-term: ${accountSummary}`,
    `local-identity: ${localReport.terms.identity} local identity term(s), ${localMatches.length ? `${localMatches.length} match(es): ${localMatches.map((f) => `${f.path}:${f.line}`).join(', ')}` : 'no match in the published tree'}.`,
    !plantedAllPass
      ? "The planted configurations did not all meet their expectations; see each one's pass field."
      : ACCOUNT_USABLE
        ? 'A hardcoded account name passes the fast lane as it runs today, without a term list (planted); the one-line list catches it (planted-account-term), and so does a local run (planted-local-identity).'
        : 'The local account name is generic, so no account name was planted; the planted configurations cover the other checks.',
    'Recorded outputs keep each finding\'s check, path, line and message, never the matched text. The term list\'s SHA-256 is not recorded either.',
    "The repository scans cover other tasks' files as they stood at the run time; the fast lane re-runs the gate on every change, so a later tree needs a later run.",
    'RUN-privacy-gate is not among the run ids of spine section 9.5, which lists no run for W0-T01; it records this task\'s acceptance evidence.',
    existsSync(join(REPO, 'schemas', 'run.schema.json'))
      ? 'schemas/run.schema.json existed when this run was recorded.'
      : 'schemas/run.schema.json did not exist when this run was recorded, so the record is not validated against it.',
  ],
}
const recordText = `${JSON.stringify(record, null, 2)}\n`
writeFileSync(join(REPO, 'runs', `${RUN_ID}.json`), guarded(`${RUN_ID}.json`, norm(recordText)))
console.log(
  `wrote runs/${RUN_ID}.json: gate exit ${gate.exit_code}; account-term ${accountReport ? `exit ${account.exit_code}, ${accountMatches.length} match(es)` : 'not run'}; local-identity exit ${local.exit_code}, ${localMatches.length} match(es); self-test exit ${self.exit_code}; planted ${plantedAllPass ? 'PASS' : 'FAIL'}; substitute exit ${sub.exit_code}; copy matches gate tree: ${copyMatchesGate} (attempt ${attempts}); term list deleted: ${termListDeleted}`,
)
