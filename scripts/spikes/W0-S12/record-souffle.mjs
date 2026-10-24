// Records RUN-souffle-version: Soufflé 2.5, the Datalog reference for S7, with the CPU architecture.
//   TMPDIR=<scratch> node scripts/spikes/W0-S12/record-souffle.mjs
// The release publishes a .deb for Ubuntu 24.04 on x86_64 (and no arm64 package). The container installs it
// with apt, so this one run needs the network for the package's dependencies; the record names the versions
// apt chose. Nothing the container writes goes to a mounted directory: it reports on standard output.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  REPO, containerEnv, environment, exec, fetchPinned, lines, must, scratch, writeOutput, writeRun,
} from './lib.mjs'

const ID = 'RUN-souffle-version'
const BASE = 'https://github.com/souffle-lang/souffle/releases/download/2.5'
const DEB = 'x86_64-ubuntu-2404-souffle-2.5-Linux.deb'
const DEB_SHA256 = 'c7e9dd1349506bbb23c4dcf89e87396198006235f79b1cc516c0a2b67ac067bc'
const IMAGE = 'ubuntu:24.04'

const work = scratch('souffle')
const dl = path.join(work, 'dl')
mkdirSync(dl)
const deb = path.join(dl, 'souffle.deb')
const asset = fetchPinned(`${BASE}/${DEB}`, DEB_SHA256, deb)
fetchPinned(`${BASE}/sha512sum.txt`, null, path.join(dl, 'sha512sum.txt'))
const sha512 = (await import('node:crypto')).createHash('sha512').update(readFileSync(deb)).digest('hex')
const listed = readFileSync(path.join(dl, 'sha512sum.txt'), 'utf8').split('\n').find((l) => l.endsWith(`  ${DEB}`))
if (!listed || !listed.startsWith(sha512)) throw new Error(`the release's sha512sum.txt does not list ${sha512} for ${DEB}: ${listed}`)

// the release's asset list, as the GitHub API gives it: the record of which platforms have a package
const release = JSON.parse(must('curl', ['-fsSL', '-H', 'Accept: application/vnd.github+json', 'https://api.github.com/repos/souffle-lang/souffle/releases/tags/2.5']).stdout)
const assetList = writeOutput(ID, 'release-assets.json', `${JSON.stringify({ tag: release.tag_name, published_at: release.published_at, assets: release.assets.map((a) => ({ name: a.name, size: a.size })) }, null, 2)}\n`, 'release asset list (GitHub API)', 'informational: the release page can gain assets')
const packageNames = release.assets.map((a) => a.name).filter((n) => /\.(deb|rpm)$/.test(n))

const smoke = writeOutput(ID, 'smoke/tc.dl', [
  '.decl edge(a: number, b: number)',
  '.decl path(a: number, b: number)',
  'edge(1, 2).',
  'edge(2, 3).',
  'edge(3, 4).',
  'path(a, b) :- edge(a, b).',
  'path(a, c) :- path(a, b), edge(b, c).',
  '.output path(IO=stdout)',
  '',
].join('\n'), 'datalog program', 'bytes')
const mount = path.join(work, 'mount')
mkdirSync(mount)
copyFileSync(deb, path.join(mount, 'souffle.deb'))
copyFileSync(path.join(REPO, smoke.path), path.join(mount, 'tc.dl'))

const script = `
set -eu
export DEBIAN_FRONTEND=noninteractive
echo "@@control"; dpkg -I /work/souffle.deb | sed -n '/Package:/p;/Version:/p;/Architecture:/p;/Depends:/p'
apt-get update -qq >/dev/null 2>&1
apt-get install -y -qq --no-install-recommends /work/souffle.deb >/dev/null 2>&1
echo "@@binary"; sha256sum /usr/bin/souffle
echo "@@arch"; uname -m; dpkg --print-architecture
echo "@@version"; t0=$(date +%s%N); souffle --version; echo "exit=$?"; t1=$(date +%s%N); echo "ns=$((t1-t0))"
echo "@@smoke"; t0=$(date +%s%N); souffle -D- /work/tc.dl; echo "exit=$?"; t1=$(date +%s%N); echo "ns=$((t1-t0))"
echo "@@packages"; dpkg-query -W -f='\${Package} \${Version}\\n' souffle g++ libffi8 libsqlite3-0 libgomp1 libncurses6 libstdc++6 zlib1g mcpp python3 libc6 | sort
`
const flags = ['--rm', '--memory=6g', '-v', `${mount}:/work:ro`]
const run = exec('docker', ['run', ...flags, IMAGE, 'sh', '-c', script])
if (run.status !== 0) throw new Error(`container run failed (${run.status})\n${run.stdout}\n${run.stderr}`)
const sections = Object.fromEntries(run.stdout.split('@@').slice(1).map((s) => { const [name, ...rest] = s.split('\n'); return [name, rest.join('\n')] }))
const take = (name) => lines(sections[name] ?? '')
const exitOf = (name) => Number(/^exit=(\d+)$/m.exec(sections[name])?.[1])
const secs = (name) => Math.round(Number(/^ns=(\d+)$/m.exec(sections[name])?.[1]) / 1e6) / 1000
const versionLines = take('version').filter((l) => !/^(exit|ns)=/.test(l))
const versionLine = versionLines.find((l) => l.startsWith('Version:'))
const smokeLines = take('smoke').filter((l) => !/^(exit|ns)=/.test(l))
const binarySha = take('binary')[0].split(/\s+/)[0]
const [cpu, dpkgArch] = take('arch')
const options = /Options enabled: (.*)/.exec(versionLines.join('\n'))?.[1] ?? null
const packages = writeOutput(ID, 'packages.txt', `${take('packages').join('\n')}\n`, 'dpkg versions', 'informational: apt picks the newest package of the Ubuntu 24.04 archive')
const controlLines = take('control')

const container = containerEnv(IMAGE, ['--rm', '--memory=6g', '-v <mount>:/work:ro'], { network: 'bridge, for apt only' })
const inputs = [{ url: `${BASE}/${DEB}`, sha256: asset.sha256, bytes: asset.bytes, kind: 'release asset', committed: false, sha512 }]
const configs = [
  {
    id: 'version',
    purpose: 'the version banner of the pinned release on the recorded CPU architecture',
    engine: 'souffle',
    version: versionLine,
    binary_sha256: binarySha,
    argv: ['souffle', '--version'],
    inputs,
    budget: { container_memory: '6g' },
    started_at: run.started_at,
    duration_s: secs('version'),
    exit_code: exitOf('version'),
    verdict_lines: versionLines,
    outputs: [packages, assetList],
    cpu_architecture: { uname_m: cpu, dpkg: dpkgArch },
  },
  {
    id: 'smoke',
    purpose: 'a transitive closure over three edges, evaluated by the interpreter',
    engine: 'souffle',
    version: versionLine,
    binary_sha256: binarySha,
    argv: ['souffle', '-D-', '/work/tc.dl'],
    inputs: [...inputs, { path: smoke.path, sha256: smoke.sha256, bytes: smoke.bytes }],
    budget: { container_memory: '6g' },
    started_at: run.started_at,
    duration_s: secs('smoke'),
    exit_code: exitOf('smoke'),
    verdict_lines: smokeLines,
    outputs: [],
  },
]
const primary = configs[0]
writeRun(ID, {
  id: ID,
  title: 'Soufflé 2.5: its version, the CPU architecture and a smoke program',
  engine: primary.engine,
  version: primary.version,
  binary: '/usr/bin/souffle from the 2.5 package for Ubuntu 24.04 on x86_64',
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
  values: {
    version: '2.5',
    cpu_architecture: cpu,
    dpkg_architecture: dpkgArch,
    word_size: 64,
    options_enabled: options,
    deb_sha256: asset.sha256,
    deb_sha512: sha512,
    control: controlLines.filter((l) => !/^Depends:/.test(l.trim())).map((l) => l.trim()),
    smoke_tuples: smokeLines.filter((l) => /^\d+\t\d+$/.test(l)).length,
  },
  environment: environment(container, { cpu_architecture: cpu }),
  notes: [
    `Soufflé 2.5 is the Datalog reference for S7 (spine section 9.2). The 2.5 release lists ${packageNames.length} packages (release-assets.json): ${packageNames.join(', ')}. Every one is x86_64; there is no arm64 package, so a learner on an arm64 devcontainer (Apple silicon under Docker) builds from source. Upstream issue #2476, sporadic crashes on ARM, was open when labs/TOOLS.md section 2.7 last read it [V], so a receipt records the CPU architecture (spine section 9.2).`,
    'binary_sha256 is the SHA-256 of /usr/bin/souffle after apt installed the package; the package is the input, pinned by its SHA-256 and checked against the SHA-512 in the release\'s sha512sum.txt.',
    'The package depends on g++, python3, libffi-dev, libsqlite3-dev and mcpp, because Soufflé\'s compile mode needs a C++ compiler; the interpreter used by the smoke run needs none of them. The Bench image should decide whether it ships them (W0-T05).',
    'This run needed the network once, for apt. The versions apt chose are in packages.txt; they come from the Ubuntu 24.04 archive of the day, so a re-run may differ there and must not differ in verdict_lines.',
    'The smoke program is transitive closure over edges 1-2, 2-3, 3-4: six tuples. The record shows the tool runs on this architecture; the equal-relations comparison with Z3 Fixedpoint is W0-S03\'s.',
  ],
  configs,
})
console.log(`souffle ${versionLine}; arch ${cpu}/${dpkgArch}; options ${options}; smoke tuples ${smokeLines.filter((l) => /^\d+\t\d+$/.test(l)).length}`)
