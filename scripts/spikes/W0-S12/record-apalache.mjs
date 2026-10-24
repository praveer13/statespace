// Records RUN-apalache-version: Apalache 0.62.4 (optional; S5.L9 and drawer D-18), run on the Bench's Java 21 base.
//   TMPDIR=<scratch> node scripts/spikes/W0-S12/record-apalache.mjs
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  REPO, containerEnv, environment, exec, fetchPinned, lines, must, scrub, scratch, sha256File, writeOutput, writeRun,
} from './lib.mjs'

const ID = 'RUN-apalache-version'
const BASE = 'https://github.com/apalache-mc/apalache/releases/download/v0.62.4'
const TGZ_SHA256 = 'b781b53bba32fac14ac2e02b0332e1dc2edc64cb7b850c0608d8142cc7aa2ef4' // also listed in the release's sha256sum.txt
const IMAGE = 'eclipse-temurin:21-jre'

const work = scratch('apalache')
const dl = path.join(work, 'dl')
mkdirSync(dl)
const tgz = path.join(dl, 'apalache-0.62.4.tgz')
const asset = fetchPinned(`${BASE}/apalache-0.62.4.tgz`, TGZ_SHA256, tgz)
fetchPinned(`${BASE}/sha256sum.txt`, null, path.join(dl, 'sha256sum.txt'))
const listed = readFileSync(path.join(dl, 'sha256sum.txt'), 'utf8').split('\n').find((l) => l.endsWith('  apalache-0.62.4.tgz'))
if (!listed || !listed.startsWith(TGZ_SHA256)) throw new Error(`the release's sha256sum.txt does not list ${TGZ_SHA256} for apalache-0.62.4.tgz: ${listed}`)

const dist = path.join(work, 'dist')
mkdirSync(dist)
must('tar', ['xzf', tgz, '-C', dist])
const root = path.join(dist, 'apalache-0.62.4')
const jarSha = sha256File(path.join(root, 'lib', 'apalache.jar'))
const licenseSha = sha256File(path.join(root, 'LICENSE'))

const smoke = writeOutput(ID, 'smoke/Counter.tla', [
  '---- MODULE Counter ----',
  'EXTENDS Integers',
  '',
  'VARIABLE',
  '  \\* @type: Int;',
  '  n',
  '',
  'Init == n = 0',
  'Next == n\' = IF n < 3 THEN n + 1 ELSE n',
  'Inv == n <= 3',
  '====',
  '',
].join('\n'), 'tla+ module', 'bytes')
const smokeDir = path.join(work, 'smoke')
mkdirSync(smokeDir)
copyFileSync(path.join(REPO, smoke.path), path.join(smokeDir, 'Counter.tla'))
const outDir = path.join(work, 'out')
mkdirSync(outDir)

const uid = `${process.getuid()}:${process.getgid()}`
const flags = (extra) => ['--rm', '--memory=6g', '--network', 'none', '--user', uid, '-e', 'HOME=/tmp', '-v', `${root}:/opt/apalache:ro`, ...extra, '-w', '/tmp']
const recordedFlags = ['--rm', '--memory=6g', '--network=none', '--user <uid>:<gid>', '-e HOME=/tmp', '-v <apalache>:/opt/apalache:ro', '-v <smoke>:/work:ro', '-v <out>:/out', '-w /tmp']
const javaLine = lines(must('docker', ['run', '--rm', IMAGE, 'java', '-version']).stderr).find((l) => l.startsWith('OpenJDK 64-Bit')) ?? 'unknown'

const versionRun = exec('docker', ['run', ...flags([]), IMAGE, '/opt/apalache/bin/apalache-mc', 'version'])
if (versionRun.status !== 0) throw new Error(versionRun.stderr)
const versionLines = lines(versionRun.stdout)

const smokeArgv = ['/opt/apalache/bin/apalache-mc', 'check', '--out-dir=/out', '--length=5', '--inv=Inv', '--init=Init', '--next=Next', '/work/Counter.tla']
const smokeRun = exec('docker', ['run', ...flags(['-v', `${smokeDir}:/work:ro`, '-v', `${outDir}:/out`]), IMAGE, ...smokeArgv])
const stdout = scrub(smokeRun.stdout)
const verdict = lines(stdout).filter((l) => /^(The outcome is|Checker reports|EXITCODE)/.test(l)).map((l) => l.replace(/\s+I@[\d:.]+$/, ''))
if (smokeRun.status !== 0) throw new Error(`the smoke check exited ${smokeRun.status}\n${smokeRun.stderr}`)
const build = /APALACHE version: \S+ \| build: (\S+)/.exec(stdout)?.[1] ?? null
const log = writeOutput(ID, 'smoke/apalache.stdout.txt', stdout, 'apalache stdout', 'informational: every line carries a clock time')

const container = containerEnv(IMAGE, recordedFlags, { java: javaLine })
const inputs = [{ url: `${BASE}/apalache-0.62.4.tgz`, sha256: asset.sha256, bytes: asset.bytes, kind: 'release asset', committed: false }]
const configs = [
  {
    id: 'version',
    purpose: 'the version string of the pinned release',
    engine: 'apalache',
    version: versionLines[0],
    binary_sha256: jarSha,
    argv: ['/opt/apalache/bin/apalache-mc', 'version'],
    inputs,
    budget: { container_memory: '6g', network: 'none', timeout_s: 120 },
    started_at: versionRun.started_at,
    duration_s: versionRun.duration_s,
    exit_code: versionRun.status,
    verdict_lines: versionLines,
    outputs: [],
  },
  {
    id: 'smoke',
    purpose: 'a bounded check of one invariant on a counter, to show the launcher, the bundled solver and the type checker run on the Bench base',
    engine: 'apalache',
    version: versionLines[0],
    binary_sha256: jarSha,
    argv: smokeArgv,
    inputs: [...inputs, { path: smoke.path, sha256: smoke.sha256, bytes: smoke.bytes }],
    budget: { container_memory: '6g', network: 'none', timeout_s: 120, length: 5 },
    started_at: smokeRun.started_at,
    duration_s: smokeRun.duration_s,
    exit_code: smokeRun.status,
    verdict_lines: verdict,
    outputs: [log],
  },
]
const primary = configs[0]
writeRun(ID, {
  id: ID,
  title: 'Apalache 0.62.4: its version and a bounded smoke check',
  engine: primary.engine,
  version: primary.version,
  binary: 'lib/apalache.jar from apalache-0.62.4.tgz',
  binary_sha256: primary.binary_sha256,
  image: `${IMAGE}@${container.digest}`,
  recorded_at: new Date().toISOString(),
  started_at: primary.started_at,
  primary_config: primary.id,
  argv: primary.argv,
  inputs: primary.inputs,
  budget: primary.budget,
  exit_code: primary.exit_code,
  duration_s: primary.duration_s,
  verdict_lines: primary.verdict_lines,
  outputs: primary.outputs,
  values: { version: versionLines[0], build, tgz_sha256: asset.sha256, jar_sha256: jarSha, license_sha256: licenseSha, java: javaLine, smoke_outcome: verdict[0] },
  environment: environment(container),
  notes: [
    'Apalache 0.62.4 is optional and used only by S5.L9 and drawer D-18 (spine section 9.2). Its inductive-invariant check is bounded by the constants and types it instantiates, so it earns [M], never [P] alone (D-18); the smoke check here is a bounded check of five steps and says nothing more.',
    'binary_sha256 is the SHA-256 of lib/apalache.jar inside the release archive; the archive itself is the input, pinned by the SHA-256 that the release lists in its sha256sum.txt.',
    'The archive unpacks to bin/apalache-mc (a bash launcher), lib/apalache.jar (one fat jar) and LICENSE; it runs unchanged on Eclipse Temurin 21 with the network off.',
    'The smoke log carries a clock time on every line, so a re-run is compared on verdict_lines only.',
  ],
  configs,
})
console.log(`apalache ${versionLines[0]}; smoke: ${verdict.join(' | ')}; jar ${jarSha.slice(0, 12)}`)
