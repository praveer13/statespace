// Records RUN-alloy-version: Alloy 6.2.0 (optional; drawer D-16), run on the Bench's Java 21 base.
//   TMPDIR=<scratch> node scripts/spikes/W0-S12/record-alloy.mjs
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  REPO, containerEnv, environment, exec, fetchPinned, inputEntry, lines, must, renderBackspaces, round, scratch, sha256File, writeOutput, writeRun,
} from './lib.mjs'

const ID = 'RUN-alloy-version'
const JAR_URL = 'https://github.com/AlloyTools/org.alloytools.alloy/releases/download/v6.2.0/org.alloytools.alloy.dist.jar'
// The release publishes no checksum for this asset, so it is pinned by the SHA-256 measured on 2026-10-24.
const JAR_SHA256 = '6b8c1cb5bc93bedfc7c61435c4e1ab6e688a242dc702a394628d9a9801edb78d'
const IMAGE = 'eclipse-temurin:21-jre'

const work = scratch('alloy')
const dl = path.join(work, 'dl')
mkdirSync(dl)
const jar = path.join(dl, 'org.alloytools.alloy.dist.jar')
const asset = fetchPinned(JAR_URL, JAR_SHA256, jar)

// the smoke model is part of the record
const smoke = writeOutput(ID, 'smoke/smoke.als', [
  'sig Node { succ: lone Node }',
  'fact acyclic { no n: Node | n in n.^succ }',
  'run showSome { some succ } for 3',
  'check selfLoopFree { no n: Node | n.succ = n } for 4',
  '',
].join('\n'), 'alloy model', 'bytes')
const smokeDir = path.join(work, 'smoke')
mkdirSync(smokeDir)
copyFileSync(path.join(REPO, smoke.path), path.join(smokeDir, 'smoke.als'))
const outDir = path.join(work, 'out')
mkdirSync(outDir)

const uid = `${process.getuid()}:${process.getgid()}`
const flags = (extraMounts) => ['--rm', '--memory=6g', '--network', 'none', '--user', uid, '-e', 'HOME=/tmp', '-v', `${jar}:/opt/alloy.jar:ro`, ...extraMounts, '-w', '/tmp']
const recordedFlags = ['--rm', '--memory=6g', '--network=none', '--user <uid>:<gid>', '-e HOME=/tmp', '-v <jar>:/opt/alloy.jar:ro', '-v <smoke>:/work:ro', '-v <out>:/out', '-w /tmp']
const java = must('docker', ['run', '--rm', IMAGE, 'java', '-version']).stderr
const javaLine = lines(java).find((l) => l.startsWith('OpenJDK 64-Bit')) ?? lines(java)[1]

const versionRun = exec('docker', ['run', ...flags([]), IMAGE, 'java', '-jar', '/opt/alloy.jar', 'version'])
if (versionRun.status !== 0) throw new Error(versionRun.stderr)
const versionLines = lines(versionRun.stdout)

const smokeRun = exec('docker', ['run', ...flags(['-v', `${smokeDir}:/work:ro`, '-v', `${outDir}:/out`]), IMAGE, 'sh', '-c', 'cd /out && java -jar /opt/alloy.jar exec -f -o /out/res /work/smoke.als'])
// exec prints its verdict lines on standard error
const smokeLines = [...lines(smokeRun.stderr), ...lines(smokeRun.stdout)].map(renderBackspaces)
const receipt = readFileSync(path.join(outDir, 'res', 'receipt.json'), 'utf8')
const solver = JSON.parse(receipt).solver
const outputs = [
  writeOutput(ID, 'smoke/receipt.json', receipt, 'alloy receipt', 'informational: carries timestamps and durations'),
  writeOutput(ID, 'smoke/showSome-solution-0.md', readFileSync(path.join(outDir, 'res', 'showSome-solution-0.md')), 'alloy solution', 'informational'),
]

const container = containerEnv(IMAGE, recordedFlags, { java: javaLine })
const inputs = [{ url: JAR_URL, sha256: asset.sha256, bytes: asset.bytes, kind: 'release asset', committed: false }]
const configs = [
  {
    id: 'version',
    purpose: 'the version string of the pinned release',
    engine: 'alloy',
    version: versionLines[0],
    binary_sha256: asset.sha256,
    argv: ['java', '-jar', '/opt/alloy.jar', 'version'],
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
    purpose: 'a headless exec of a two-command model: the default SAT4J solver finds an instance and proves the assertion',
    engine: 'alloy',
    version: versionLines[0],
    binary_sha256: asset.sha256,
    argv: ['java', '-jar', '/opt/alloy.jar', 'exec', '-f', '-o', '/out/res', '/work/smoke.als'],
    inputs: [...inputs, { path: smoke.path, sha256: smoke.sha256, bytes: smoke.bytes }],
    budget: { container_memory: '6g', network: 'none', timeout_s: 120, solver },
    started_at: smokeRun.started_at,
    duration_s: smokeRun.duration_s,
    exit_code: smokeRun.status,
    verdict_lines: smokeLines,
    outputs,
  },
]
const primary = configs[0]
writeRun(ID, {
  id: ID,
  title: 'Alloy 6.2.0: its version and a headless smoke run',
  engine: primary.engine,
  version: primary.version,
  binary: 'org.alloytools.alloy.dist.jar, the release asset',
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
  values: { version: versionLines[0], jar_sha256: asset.sha256, java: javaLine, default_solver: solver, smoke_verdicts: smokeLines },
  environment: environment(container),
  notes: [
    'Alloy 6.2.0 is optional and used only by drawer D-16 (spine section 9.2). It needs Java 17 or later; this run uses the Bench base image, Eclipse Temurin 21.',
    'The release asset org.alloytools.alloy.dist.jar publishes no checksum, so it is pinned by the SHA-256 measured here. A later download that differs is unpinned, whatever its name says.',
    'The smoke model is two commands: the run finds an instance (SAT) and the check of the assertion has none (UNSAT). Both are bounded by their scopes (3 and 4 atoms), so the check is bounded evidence, never a proof.',
    'exec prints its verdict lines on standard error and overwrites a progress counter with backspaces; verdict_lines holds standard error first, then standard output (which is empty), with each line as a terminal shows it.',
    'receipt.json and the solution file hold timestamps and durations, so a re-run is compared on verdict_lines only.',
    `The run used ${IMAGE} with the network off; the jar was mounted read-only.`,
  ],
  configs,
})
console.log(`alloy ${versionLines[0]}; smoke: ${smokeLines.join(' | ')}; ${round(versionRun.duration_s + smokeRun.duration_s)} s`)
console.log(`jar sha256 ${sha256File(jar)}; inputs: ${inputEntry(smoke.path).path}`)
