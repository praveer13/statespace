// Records RUN-scaffold: the stack the scaffold is pinned on (ARCHITECTURE.md section 3.1, spine sections 9.2
// and 11.1, labs/TOOLS.md section 7), executed rather than quoted.
//   TMPDIR=<scratch> node scripts/spikes/W0-S12/record-scaffold.mjs
//
// One record, many configurations (spine section 9.5): the site stack (Node, npm, React, Vite, TypeScript,
// React Router, Playwright, axe) with its typecheck, purity lint, tests and build; the browser smoke tests in
// the Playwright container; the Bench's Python side (uv, psycopg) and PostgreSQL service image; the Bench's
// Rust side (toolchain, the four crates, the wasm target) with a round trip through the vendored ABI; and the
// cvc5 Bench binary. It needs network (npm, PyPI, crates.io, apt, rustup, a release asset), Docker, and the
// repository's node_modules (npm install first). Set TMPDIR to a scratch directory.
import { copyFileSync, cpSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import {
  REPO, containerEnv, dockerImage, environment, exec, fetchPinned, lines, must, round, scratch, scrub, sha256File, writeOutput, writeRun,
} from './lib.mjs'

const ID = 'RUN-scaffold'
const HELPERS = 'scripts/spikes/W0-S12'
const work = scratch('scaffold')
const configs = []
const values = {}
const uid = `${process.getuid()}:${process.getgid()}`
const out = (rel, content, kind, compare) => writeOutput(ID, rel, content, kind, compare)
const rel = (p) => path.relative(REPO, p).split(path.sep).join('/')
const tail = (text, n) => lines(scrub(text)).filter((l) => !l.startsWith('>')).slice(-n)

function add(cfg) {
  const { result, ...rest } = cfg
  configs.push({
    ...rest,
    started_at: result.started_at,
    duration_s: result.duration_s,
    exit_code: result.status,
  })
  console.log(`${result.status === (cfg.expected_exit_code ?? 0) ? 'ok  ' : 'FAIL'} ${cfg.id} (${result.duration_s} s)`)
}

const repoInput = (p) => ({ path: p, sha256: sha256File(path.join(REPO, p)), bytes: statSync(path.join(REPO, p)).size })
const nodeSha = sha256File(process.execPath)
const hostBudget = (timeout_s) => ({ network: 'npm registry for installs only', timeout_s })

// ------------------------------------------------------------------------------------------------ site stack
const nodeV = process.version
const npmV = must('npm', ['--version']).stdout.trim()
values.node = nodeV
values.npm = npmV

const lock = JSON.parse(readFileSync(path.join(REPO, 'package-lock.json'), 'utf8'))
const pinNames = ['react', 'react-dom', 'react-router', 'vite', '@vitejs/plugin-react', 'typescript', '@playwright/test', 'playwright', 'playwright-core', '@axe-core/playwright', 'axe-core', '@types/react', '@types/react-dom', '@types/node', 'esbuild', 'rollup']
const pins = Object.fromEntries(
  pinNames.map((n) => {
    const p = lock.packages[`node_modules/${n}`]
    return [n, { version: p.version, integrity: p.integrity, resolved: p.resolved }]
  }),
)
const pinsOut = out('site-stack/pins.json', `${JSON.stringify(pins, null, 2)}\n`, 'npm pins from package-lock.json')
Object.assign(values, {
  react: pins.react.version,
  react_dom: pins['react-dom'].version,
  react_router: pins['react-router'].version,
  vite: pins.vite.version,
  vitejs_plugin_react: pins['@vitejs/plugin-react'].version,
  typescript: pins.typescript.version,
  playwright_test: pins['@playwright/test'].version,
  playwright_core: pins['playwright-core'].version,
  axe_core: pins['axe-core'].version,
  axe_core_playwright: pins['@axe-core/playwright'].version,
  lockfile_packages: Object.keys(lock.packages).length - 1,
})

// every workspace manifest present: the lock covers all of them, whoever added them
const workspaceManifests = ['apps', 'packages'].flatMap((area) =>
  readdirSync(path.join(REPO, area), { withFileTypes: true })
    .filter((e) => e.isDirectory() && statSync(path.join(REPO, area, e.name, 'package.json'), { throwIfNoEntry: false })?.isFile())
    .map((e) => `${area}/${e.name}/package.json`),
)
const lockCheck = exec('npm', ['ci', '--dry-run', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: REPO })
add({
  id: 'npm-lock',
  purpose: 'package-lock.json is in sync with every workspace manifest, and the pinned stack is what it resolves',
  engine: 'npm',
  version: `npm ${npmV} on node ${nodeV}`,
  binary_sha256: nodeSha,
  argv: ['npm', 'ci', '--dry-run', '--ignore-scripts', '--no-audit', '--no-fund'],
  inputs: ['package.json', 'package-lock.json', ...workspaceManifests].map(repoInput),
  budget: hostBudget(120),
  result: lockCheck,
  verdict_lines: [...tail(lockCheck.stdout, 3), ...Object.entries({ react: values.react, 'react-dom': values.react_dom, 'react-router': values.react_router, vite: values.vite, typescript: values.typescript, '@playwright/test': values.playwright_test, 'axe-core': values.axe_core }).map(([n, v]) => `${n} ${v}`)],
  outputs: [pinsOut],
})

const MINE = ['@statespace/site', '@statespace/instruments', '@statespace/rng', '@statespace/learner']
const npmRun = (id, purpose, argv, nLines) => {
  const result = exec('npm', argv, { cwd: REPO })
  add({
    id,
    purpose,
    engine: 'npm',
    version: `npm ${npmV} on node ${nodeV}`,
    binary_sha256: nodeSha,
    argv: ['npm', ...argv],
    inputs: [repoInput('package.json')],
    budget: hostBudget(300),
    result,
    verdict_lines: tail(result.stdout + result.stderr, nLines).length > 0 ? tail(result.stdout + result.stderr, nLines) : [`${argv.join(' ')}: exit ${result.status}, no diagnostics`],
    outputs: [],
  })
  return result
}
npmRun('typecheck', 'tsc over this task\'s workspaces: package sources with no DOM or Node types, the vendored files compiled through their wrappers, tests, both apps and the tool configs', ['run', 'typecheck', ...MINE.flatMap((w) => ['-w', w])], 6)
npmRun('purity-lint', 'packages/* are pure and vendored code is imported only through a wrapper home (ARCHITECTURE.md section 17.2)', ['run', 'lint:purity'], 2)

const tapOf = (text) => lines(text).filter((l) => /^# (tests|pass|fail|skipped) \d+$/.test(l))
const total = (tap, key) => tap.filter((l) => l.startsWith(`# ${key} `)).reduce((n, l) => n + Number(l.split(' ')[2]), 0)
const unit = (id, purpose, argv, inputs) => {
  const result = exec('npm', argv, { cwd: REPO })
  const tap = tapOf(result.stdout)
  const totals = { total: total(tap, 'tests'), pass: total(tap, 'pass'), fail: total(tap, 'fail'), skipped: total(tap, 'skipped') }
  add({
    id,
    purpose,
    engine: 'node:test',
    version: `node ${nodeV}`,
    binary_sha256: nodeSha,
    argv: ['npm', ...argv],
    inputs: [repoInput('package.json'), ...inputs.map(repoInput)],
    budget: hostBudget(300),
    result,
    verdict_lines: [...tap, `total: tests ${totals.total}, pass ${totals.pass}, fail ${totals.fail}, skipped ${totals.skipped}`],
    outputs: [],
  })
  return totals
}
values.unit_tests = unit(
  'unit-tests-packages',
  'Node test runner over this task\'s packages: the FSRS reference vectors (2000 replays to 1e-8), the RNG against an independent BigInt oracle and the FNV-1a test vectors, and the purity lint against planted fixtures',
  ['test', '-w', '@statespace/rng', '-w', '@statespace/learner', '-w', '@statespace/purity-lint'],
  ['packages/learner/test/schedule.test.ts', 'packages/rng/test/rng.test.ts', 'packages/purity-lint/test/purity.test.mjs', 'vendor/kernelspace/tests/fixtures/fsrs/reference-vectors.json'],
)
values.vendor_drift_tests = unit(
  'unit-tests-vendor-drift',
  'the vendor-drift tool against a throwaway upstream repository: vendoring with a redaction and a mode, no drift on a redacted file, a tampered file, an unlisted file, a file named AGENTS.md, a changed mode, a new commit, a deleted file, a redaction that stopped matching, usage errors',
  ['run', 'test:vendor'],
  ['scripts/vendor-drift.mjs', 'scripts/spikes/W0-S12/vendor-drift.test.mjs'],
)

const build = npmRun('build', 'vite build of both apps behind tsc, with the meta CSP written into every page', ['run', 'build'], 14)
const dist = []
for (const app of ['site', 'instruments']) {
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
  for (const f of walk(path.join(REPO, 'apps', app, 'dist')).sort()) dist.push({ path: rel(f), bytes: statSync(f).size, sha256: sha256File(f) })
}
const distOut = out('build/dist-manifest.json', `${JSON.stringify(dist, null, 2)}\n`, 'build output manifest', 'bytes')
configs[configs.length - 1].outputs = [distOut]
values.build = { files: dist.length, total_bytes: dist.reduce((n, f) => n + f.bytes, 0), exit_code: build.status }

const vendor = exec('npm', ['run', 'vendor:verify'], { cwd: REPO })
add({
  id: 'vendor-verify',
  purpose: 'every vendored file matches its SHA-256 in VENDOR.md, none is unlisted, none is named AGENTS.md or CLAUDE.md, and the import table is current',
  engine: 'vendor-drift',
  version: 'scripts/vendor-drift.mjs',
  binary_sha256: sha256File(path.join(REPO, 'scripts/vendor-drift.mjs')),
  argv: ['npm', 'run', 'vendor:verify'],
  inputs: [repoInput('vendor/kernelspace/VENDOR.md')],
  budget: { timeout_s: 60 },
  result: vendor,
  verdict_lines: tail(vendor.stdout, 1),
  outputs: [],
})

// ------------------------------------------------------------------------------------------------ browsers
const PW_IMAGE = 'mcr.microsoft.com/playwright:v1.63.0-noble'
const pwInfo = dockerImage(PW_IMAGE)
const outDir = path.join(work, 'pw')
mkdirSync(outDir)
const pwFlags = (extra) => ['--rm', '--memory=6g', '--network', 'none', '--shm-size=1g', '--init', '--user', uid, '-e', 'HOME=/tmp/home', '-e', 'CI=1', '--tmpfs', '/tmp:exec,mode=1777', '-v', `${REPO}:/work`, '-v', `${outDir}:/out`, ...extra]
const pwRecorded = ['--rm', '--memory=6g', '--network=none', '--shm-size=1g', '--init', '--user <uid>:<gid>', '-e HOME=/tmp/home', '-e CI=1', '--tmpfs /tmp:exec,mode=1777', '-v <repo>:/work', '-v <out>:/out']
const containerNode = must('docker', ['run', '--rm', PW_IMAGE, 'node', '--version']).stdout.trim()
values.playwright_image = PW_IMAGE
values.playwright_image_digest = pwInfo.digest
values.container_node = containerNode

const probe = exec('docker', ['run', ...pwFlags(['-w', '/work']), PW_IMAGE, 'sh', '-c', `mkdir -p $HOME && node -e "const pw=require('playwright-core');(async()=>{for(const n of ['chromium','firefox','webkit']){const b=await pw[n].launch();console.log(n,b.version());await b.close()}})()"`])
const engines = Object.fromEntries(lines(probe.stdout).map((l) => l.split(' ')))
Object.assign(values, { chromium: engines.chromium, firefox: engines.firefox, webkit: engines.webkit })
add({
  id: 'browser-versions',
  purpose: 'the three engines of the pinned Playwright image',
  engine: 'playwright-core',
  version: values.playwright_core,
  binary_sha256: null,
  argv: ['node', '-e', '<launch chromium, firefox and webkit and print browser.version()>'],
  inputs: [],
  budget: { container_memory: '6g', network: 'none', timeout_s: 120 },
  result: probe,
  verdict_lines: lines(probe.stdout),
  outputs: [],
  where: 'container',
  container: containerEnv(PW_IMAGE, pwRecorded, { node: containerNode }),
})

for (const app of ['site', 'instruments']) {
  const run = exec('docker', ['run', ...pwFlags(['-e', `PW_JSON=/out/${app}.json`, '-w', `/work/apps/${app}`]), PW_IMAGE, 'sh', '-c', 'mkdir -p $HOME && npx playwright test -c e2e/playwright.config.ts'], { timeout: 600_000 })
  const report = JSON.parse(readFileSync(path.join(outDir, `${app}.json`), 'utf8'))
  const rows = []
  const visit = (suite) => {
    for (const spec of suite.specs ?? []) for (const t of spec.tests) rows.push({ project: t.projectName, title: spec.title, status: t.results.at(-1)?.status ?? 'none', ms: t.results.at(-1)?.duration ?? 0 })
    for (const s of suite.suites ?? []) visit(s)
  }
  for (const s of report.suites) visit(s)
  const byProject = {}
  for (const r of rows) (byProject[r.project] ??= { passed: 0, failed: 0 })[r.status === 'passed' ? 'passed' : 'failed']++
  const summary = out(`browser-smoke/${app}.summary.json`, `${JSON.stringify({ stats: report.stats, byProject, tests: rows }, null, 2)}\n`, 'playwright result summary', 'informational: durations vary')
  values[`browser_smoke_${app}`] = { passed: rows.filter((r) => r.status === 'passed').length, failed: rows.filter((r) => r.status !== 'passed').length, byProject }
  add({
    id: `browser-smoke-${app}`,
    purpose: `the built ${app} app loads under its meta CSP, requests nothing from another origin, raises no console error and passes axe (WCAG 2.0 to 2.2 A and AA) with no sideways scroll at 360, 320 and 1280 px, in three engines`,
    engine: 'playwright',
    version: values.playwright_test,
    binary_sha256: null,
    argv: ['npx', 'playwright', 'test', '-c', 'e2e/playwright.config.ts'],
    cwd: `/work/apps/${app}`,
    // dist/ is not committed: the build it served is named by the manifest of the build configuration
    inputs: [...[`apps/${app}/e2e/smoke.spec.ts`, `apps/${app}/e2e/playwright.config.ts`].map(repoInput), { path: distOut.path, sha256: distOut.sha256, bytes: distOut.bytes, kind: 'manifest of the build the tests served' }],
    budget: { container_memory: '6g', network: 'none', workers: 'default', timeout_s: 600 },
    result: run,
    verdict_lines: [`${app}: ${values[`browser_smoke_${app}`].passed} passed, ${values[`browser_smoke_${app}`].failed} failed`, ...Object.entries(byProject).map(([p, c]) => `  ${p}: ${c.passed} passed, ${c.failed} failed`)],
    outputs: [summary],
    where: 'container',
    container: containerEnv(PW_IMAGE, pwRecorded, { node: containerNode }),
  })
}

// ------------------------------------------------------------------------------------------------ Bench: Python
const pyDir = path.join(work, 'py')
mkdirSync(pyDir)
const requirementsIn = out('bench-python/requirements.in', 'psycopg[binary]==3.3.6\n', 'requirements input')
writeFileSync(path.join(pyDir, 'requirements.in'), 'psycopg[binary]==3.3.6\n')
const uvPath = realpathSync(must('which', ['uv']).stdout.trim())
const uvV = must('uv', ['--version']).stdout.trim()
const compile = exec('uv', ['pip', 'compile', 'requirements.in', '--universal', '--generate-hashes', '--python-version', '3.13', '-o', 'requirements.lock.txt'], { cwd: pyDir })
const lockText = readFileSync(path.join(pyDir, 'requirements.lock.txt'), 'utf8').replace(/^#    uv pip compile.*$/m, '#    uv pip compile requirements.in --universal --generate-hashes --python-version 3.13')
const lockOut = out('bench-python/requirements.lock.txt', lockText, 'pip lock with hashes')
const pinned = (n) => new RegExp(`^${n}==([\\d.]+)`, 'm').exec(lockText)?.[1]
values.uv = uvV.replace(/^uv /, '').split(' ')[0]
values.psycopg = pinned('psycopg')
values.psycopg_binary = pinned('psycopg-binary')
add({
  id: 'bench-python-lock',
  purpose: 'psycopg 3 with its binary package, resolved for every platform with hashes: the pin of the Bench\'s PostgreSQL driver (`statespace isorun`, spine section 9.6)',
  engine: 'uv',
  version: uvV,
  binary_sha256: sha256File(uvPath),
  argv: ['uv', 'pip', 'compile', 'requirements.in', '--universal', '--generate-hashes', '--python-version', '3.13', '-o', 'requirements.lock.txt'],
  inputs: [{ path: requirementsIn.path, sha256: requirementsIn.sha256, bytes: requirementsIn.bytes }],
  budget: { network: 'PyPI', timeout_s: 120 },
  result: compile,
  verdict_lines: [`psycopg ${values.psycopg}`, `psycopg-binary ${values.psycopg_binary}`, `lock: ${lines(lockText).filter((l) => l.includes('--hash=sha256:')).length} hashes`],
  outputs: [lockOut],
})

const pyArgs = ['run', '--no-project', '--with', `psycopg[binary]==${values.psycopg}`, 'python', '-I', '-c', 'import sys, psycopg; print("python", sys.version.split()[0]); print("psycopg", psycopg.__version__); print("impl", psycopg.pq.__impl__); print("libpq", psycopg.pq.version())']
const py = exec('uv', pyArgs)
const pyLines = lines(py.stdout)
values.python = pyLines.find((l) => l.startsWith('python '))?.split(' ')[1]
values.libpq = Number(pyLines.find((l) => l.startsWith('libpq '))?.split(' ')[1])
add({
  id: 'bench-python-run',
  purpose: 'the pinned driver imports on the Bench\'s Python, with its bundled libpq',
  engine: 'uv',
  version: uvV,
  binary_sha256: sha256File(uvPath),
  argv: ['uv', ...pyArgs.slice(0, 4), 'python', '-I', '-c', '<print the versions>'],
  inputs: [],
  budget: { network: 'PyPI', timeout_s: 120 },
  result: py,
  verdict_lines: pyLines,
  outputs: [],
})

// ------------------------------------------------------------------------------------------------ Bench: PostgreSQL service image
const PG_IMAGE = 'postgres:18'
const pgInfo = dockerImage(PG_IMAGE)
const pgBinary = exec('docker', ['run', '--rm', '--memory=1g', '--network', 'none', PG_IMAGE, 'postgres', '--version'])
values.postgres_image = PG_IMAGE
values.postgres_digest = pgInfo.digest
values.postgres_binary_version = lines(pgBinary.stdout)[0]
const freePort = await new Promise((resolve, reject) => {
  const s = createServer()
  s.once('error', reject)
  s.listen(0, '127.0.0.1', () => {
    const { port } = s.address()
    s.close(() => resolve(port))
  })
})
const pgName = `w0s12-pg-${process.pid}`
let pgRun
try {
  must('docker', ['run', '-d', '--rm', '--name', pgName, '--memory=1g', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-p', `127.0.0.1:${freePort}:5432`, PG_IMAGE])
  for (let i = 0; i < 60; i++) {
    if (exec('docker', ['exec', pgName, 'pg_isready', '-U', 'postgres', '-h', '127.0.0.1']).status === 0) break
    await new Promise((r) => setTimeout(r, 500))
  }
  const sql = ['import psycopg', `c = psycopg.connect("postgresql://postgres@127.0.0.1:${freePort}/postgres", connect_timeout=10)`, 'cur = c.cursor()', 'for q in ("select version()", "show server_version", "show default_transaction_isolation"):', '    cur.execute(q)', '    print(cur.fetchone()[0])'].join('\n')
  pgRun = exec('uv', ['run', '--no-project', '--with', `psycopg[binary]==${values.psycopg}`, 'python', '-I', '-c', sql])
} finally {
  exec('docker', ['rm', '-f', pgName])
}
const pgLines = lines(pgRun.stdout)
values.postgres_version = pgLines[0]?.split(' on ')[0]
values.postgres_server_version = pgLines[1]
add({
  id: 'bench-postgres',
  purpose: 'the PostgreSQL 18 service image, by digest, answers the pinned driver with the version the isolation catalog was recorded on',
  engine: 'postgres',
  version: lines(pgBinary.stdout)[0],
  binary_sha256: null,
  argv: ['python', '-I', '-c', '<connect with psycopg to the container on a loopback port: select version(); show server_version; show default_transaction_isolation>'],
  inputs: [],
  budget: { container_memory: '1g', network: 'loopback port only', timeout_s: 120 },
  result: pgRun,
  verdict_lines: pgLines,
  outputs: [],
  where: 'container',
  container: containerEnv(PG_IMAGE, ['-d', '--rm', '--memory=1g', '-e POSTGRES_HOST_AUTH_METHOD=trust', '-p 127.0.0.1:<port>:5432']),
})

// ------------------------------------------------------------------------------------------------ Bench: Rust
const rustDir = path.join(work, 'rust')
const pinsDir = path.join(rustDir, 'bench-pins')
mkdirSync(path.join(pinsDir, 'src'), { recursive: true })
const manifest = 'runs/RUN-scaffold/bench-rust/Cargo.toml'
copyFileSync(path.join(REPO, manifest), path.join(pinsDir, 'Cargo.toml'))
copyFileSync(path.join(REPO, 'runs/RUN-scaffold/bench-rust/src/main.rs'), path.join(pinsDir, 'src/main.rs'))
const rustcV = must('rustc', ['-vV']).stdout
const sysroot = must('rustc', ['--print', 'sysroot']).stdout.trim()
const cargoV = must('cargo', ['--version']).stdout.trim()
const targets = lines(must('rustup', ['target', 'list', '--installed']).stdout)
const lockGen = exec('cargo', ['generate-lockfile'], { cwd: pinsDir })
const cargoLock = readFileSync(path.join(pinsDir, 'Cargo.lock'), 'utf8')
const lockOut2 = out('bench-rust/Cargo.lock', cargoLock, 'cargo lock (crates.io checksums)')
const crate = (n) => new RegExp(`name = "${n}"\\nversion = "([^"]+)"`).exec(cargoLock)?.[1]
Object.assign(values, {
  rustc: lines(rustcV)[0].replace(/^rustc /, ''),
  rust_host: /^host: (.*)$/m.exec(rustcV)?.[1],
  rust_llvm: /^LLVM version: (.*)$/m.exec(rustcV)?.[1],
  cargo: cargoV.replace(/^cargo /, ''),
  rust_targets: targets,
  rust_wasm_target: targets.includes('wasm32-unknown-unknown') ? 'wasm32-unknown-unknown' : null,
  tokio_postgres: crate('tokio-postgres'),
  testcontainers: crate('testcontainers'),
  pg_query: crate('pg_query'),
  proptest: crate('proptest'),
  cargo_lock_dependencies: (cargoLock.match(/^\[\[package\]\]$/gm) ?? []).length - 1, // the root crate is the other entry
})
add({
  id: 'bench-rust-host',
  purpose: 'the toolchain with the wasm target, and the four crates pinned with `=` and resolved into one lock',
  engine: 'cargo',
  version: cargoV,
  binary_sha256: sha256File(path.join(sysroot, 'bin', 'cargo')),
  argv: ['cargo', 'generate-lockfile'],
  inputs: [{ path: manifest, sha256: sha256File(path.join(REPO, manifest)), bytes: statSync(path.join(REPO, manifest)).size }],
  budget: { network: 'crates.io index', timeout_s: 120 },
  result: lockGen,
  verdict_lines: [lines(rustcV)[0], cargoV, `host ${values.rust_host}`, `targets ${targets.join(', ')}`, ...['tokio-postgres', 'testcontainers', 'pg_query', 'proptest'].map((n) => `${n} ${crate(n)}`), `${values.cargo_lock_dependencies} dependencies in Cargo.lock, besides the root crate`],
  outputs: [lockOut2],
  rustc_sha256: sha256File(path.join(sysroot, 'bin', 'rustc')),
})

// the same check on this host, which has no libclang: pg_query's bindgen stops it. Recorded as an expected failure.
const hostCheck = exec('cargo', ['check', '--locked'], { cwd: pinsDir, env: { ...process.env, CARGO_TARGET_DIR: path.join(rustDir, 'target-host') }, timeout: 600_000 })
const hostErr = lines(scrub(hostCheck.stderr))
add({
  id: 'bench-rust-host-without-libclang',
  purpose: 'the same `cargo check --locked` on a host with no libclang stops in the build script of pg_query (bindgen): the evidence that the Bench image must carry libclang. Host-dependent: on a machine that has libclang this configuration passes',
  engine: 'cargo',
  version: cargoV,
  binary_sha256: sha256File(path.join(sysroot, 'bin', 'cargo')),
  argv: ['cargo', 'check', '--locked'],
  inputs: [{ path: manifest, sha256: sha256File(path.join(REPO, manifest)) }, { path: lockOut2.path, sha256: lockOut2.sha256 }],
  budget: { network: 'crates.io', timeout_s: 600 },
  result: hostCheck,
  expected_exit_code: 101,
  verdict_lines: hostErr.filter((l) => /failed to run custom build command for `pg_query|Unable to find libclang/.test(l)).map((l) => l.trim().slice(0, 400)),
  outputs: [],
})

// the container: what the crates need, the toolchain by rustup, the crate check and a wasm build against the vendored kit
const kitDir = path.join(rustDir, 'kit')
cpSync(path.join(REPO, 'vendor/kernelspace/labs/kit'), kitDir, { recursive: true })
cpSync(path.join(REPO, 'runs/RUN-scaffold/bench-rust/kit-roundtrip'), path.join(rustDir, 'smoke-lab'), { recursive: true })
const ctr = exec('docker', ['run', '--rm', '--memory=6g', '-v', `${rustDir}:/work:ro`, '-v', '/target', '-v', '/target-lab', '-v', `${path.join(REPO, HELPERS, 'bench-rust-container.sh')}:/ctr.sh:ro`, 'ubuntu:24.04', 'sh', '/ctr.sh'], { timeout: 1_200_000 })
if (ctr.status !== 0) console.error(scrub(ctr.stderr))
const sec = Object.fromEntries(ctr.stdout.split('@@').slice(1).map((s) => { const [name, ...r] = s.split('\n'); return [name, r.join('\n')] }))
const kv = (name, key) => new RegExp(`^${key}=(.*)$`, 'm').exec(sec[name] ?? '')?.[1]
const ns = (name) => round(Number(kv(name, 'ns')) / 1e9)
const aptPackages = lines(sec.apt ?? '').filter((l) => !l.startsWith('ns='))
const rustupLines = lines(sec.rustup ?? '').filter((l) => !l.startsWith('ns='))
const ubuntu = dockerImage('ubuntu:24.04')
const ctrEnv = containerEnv('ubuntu:24.04', ['--rm', '--memory=6g', '-v <rust>:/work:ro', '-v /target', '-v /target-lab', '-v <script>:/ctr.sh:ro'], { network: 'bridge: apt, static.rust-lang.org and crates.io' })
Object.assign(values, {
  bench_apt: Object.fromEntries(aptPackages.map((l) => l.split(' '))),
  rustup_in_container: rustupLines.find((l) => l.startsWith('rustup ')),
  rustup_init_sha256: rustupLines.find((l) => l.startsWith('rustup-init sha256'))?.split(' ')[2],
  crates_check: { exit: Number(kv('check', 'exit')), seconds: ns('check'), crates_checked: Number(kv('check', 'crates_checked')), crates_compiled: Number(kv('check', 'crates_compiled')) },
})
const rustInContainer = rustupLines.find((l) => l.startsWith('rustc '))
add({
  id: 'bench-rust-container',
  purpose: 'on Ubuntu 24.04 the pinned toolchain compiles the four pinned crates from the lock (`cargo check --locked`) with only build-essential and libclang-dev installed: pg_query builds libpg_query with a C compiler and generates its bindings with libclang, which the Bench image must carry',
  engine: 'cargo',
  version: rustupLines.find((l) => l.startsWith('cargo ')),
  binary_sha256: null,
  argv: ['cargo', 'check', '--locked'],
  cwd: '/build-pins',
  inputs: [{ path: manifest, sha256: sha256File(path.join(REPO, manifest)) }, { path: lockOut2.path, sha256: lockOut2.sha256 }],
  budget: { container_memory: '6g', network: 'bridge', timeout_s: 900 },
  result: { ...ctr, status: Number(kv('check', 'exit')), duration_s: ns('check') },
  verdict_lines: [rustInContainer, ...aptPackages, ...rustupLines.filter((l) => l.startsWith('rustup')), ...lines(sec.check ?? '').filter((l) => !/^(exit|ns|crates_checked|crates_compiled)=/.test(l)), `crates checked ${values.crates_check.crates_checked}, compiled ${values.crates_check.crates_compiled}`],
  outputs: [],
  where: 'container',
  container: ctrEnv,
})

// round trip of the vendored ABI under the pinned toolchain
const wasmB64 = (ctr.stdout.split('@@wasm-base64\n')[1] ?? '').trim()
const wasm = Buffer.from(wasmB64, 'base64')
const wasmOut = out('kit-roundtrip/smoke_lab.wasm', wasm, 'wasm module', 'bytes')
const wasmFile = path.join(work, 'smoke_lab.wasm')
writeFileSync(wasmFile, wasm)
const roundtrip = exec(process.execPath, [path.join(REPO, HELPERS, 'kit-roundtrip.ts'), wasmFile], { cwd: REPO })
const roundLines = lines(roundtrip.stdout).filter((l) => /^(ok|FAIL) /.test(l))
values.kit_roundtrip = { ok: roundLines.filter((l) => l.startsWith('ok ')).length, fail: roundLines.filter((l) => l.startsWith('FAIL ')).length, wasm_bytes: wasm.length, wasm_sha256: wasmOut.sha256 }
add({
  id: 'kit-wasm-build',
  purpose: 'the vendored kit (labs/kit) and a two-seed, three-check lab crate build to wasm32-unknown-unknown with the pinned toolchain',
  engine: 'cargo',
  version: rustupLines.find((l) => l.startsWith('cargo ')),
  binary_sha256: null,
  argv: ['cargo', 'build', '--release', '--target', 'wasm32-unknown-unknown'],
  cwd: '/build-lab/smoke-lab',
  inputs: [
    { path: 'runs/RUN-scaffold/bench-rust/kit-roundtrip/Cargo.toml', sha256: sha256File(path.join(REPO, 'runs/RUN-scaffold/bench-rust/kit-roundtrip/Cargo.toml')) },
    { path: 'runs/RUN-scaffold/bench-rust/kit-roundtrip/src/lib.rs', sha256: sha256File(path.join(REPO, 'runs/RUN-scaffold/bench-rust/kit-roundtrip/src/lib.rs')) },
    { path: 'vendor/kernelspace/labs/kit/src/lib.rs', sha256: sha256File(path.join(REPO, 'vendor/kernelspace/labs/kit/src/lib.rs')), kind: 'vendored kit crate' },
  ],
  budget: { container_memory: '6g', timeout_s: 300 },
  result: { ...ctr, status: Number(kv('wasm', 'exit')), duration_s: ns('wasm') },
  verdict_lines: lines(sec.wasm ?? '').filter((l) => !/^(exit|ns)=/.test(l)),
  outputs: [wasmOut],
  where: 'container',
  container: ctrEnv,
})
add({
  id: 'kit-wasm-roundtrip',
  purpose: 'the vendored host code (abi.ts and wasm-lab.ts, unedited) drives that module: zero imports, the ABI exports, ks_abi_version 2, list and only replies, seeds, a trap with its panic text, and the whole-module v1 trap',
  engine: 'node',
  version: nodeV,
  binary_sha256: nodeSha,
  argv: ['node', `${HELPERS}/kit-roundtrip.ts`, '<smoke_lab.wasm>'],
  inputs: [{ path: wasmOut.path, sha256: wasmOut.sha256, bytes: wasmOut.bytes }, repoInput('vendor/kernelspace/src/lib/forge/abi.ts'), repoInput('vendor/kernelspace/src/lib/wasm-lab.ts')],
  budget: { timeout_s: 60 },
  result: roundtrip,
  verdict_lines: roundLines,
  outputs: [],
})

// ------------------------------------------------------------------------------------------------ Bench: cvc5
const CVC5 = 'https://github.com/cvc5/cvc5/releases/download/cvc5-1.4.2'
const cvcDir = path.join(work, 'cvc5')
const cvcDl = path.join(cvcDir, 'dl')
mkdirSync(cvcDl, { recursive: true })
const X86 = { name: 'cvc5-Linux-x86_64-static.zip', sha256: '7eb18f8c814c36a46c5a7d003983e9cfbc4b0a9828d6dd596239291bd4cc61d8' }
const ARM = { name: 'cvc5-Linux-arm64-static.zip', sha256: '765ebee59d9e5efccb60a445fa66fbddfb07a8de9fe7a5b6d128e5c2aafec974' }
const x86 = fetchPinned(`${CVC5}/${X86.name}`, X86.sha256, path.join(cvcDl, X86.name))
const arm = fetchPinned(`${CVC5}/${ARM.name}`, ARM.sha256, path.join(cvcDl, ARM.name))
const cvcRoot = path.join(cvcDir, 'x86_64')
mkdirSync(cvcRoot)
must('python3', ['-I', path.join(REPO, HELPERS, 'extract-zip.py'), path.join(cvcDl, X86.name), cvcRoot])
const cvcBin = path.join(cvcRoot, 'cvc5-Linux-x86_64-static', 'bin', 'cvc5')
const smt = out('bench-cvc5/guard.smt2', ['(set-logic QF_LIA)', '(declare-const x Int)', '(assert (> x 0))', '(assert (< x 0))', '(check-sat)', ''].join('\n'), 'smt-lib query', 'bytes')
mkdirSync(path.join(cvcRoot, 'q'))
copyFileSync(path.join(REPO, smt.path), path.join(cvcRoot, 'q', 'guard.smt2'))
const cvcFlags = ['--rm', '--memory=6g', '--network', 'none', '-v', `${path.join(cvcRoot, 'cvc5-Linux-x86_64-static')}:/opt/cvc5:ro`, '-v', `${path.join(cvcRoot, 'q')}:/q:ro`]
const cvcVersion = exec('docker', ['run', ...cvcFlags, 'ubuntu:24.04', '/opt/cvc5/bin/cvc5', '--version'])
const cvcSmoke = exec('docker', ['run', ...cvcFlags, 'ubuntu:24.04', '/opt/cvc5/bin/cvc5', '--lang', 'smt2', '/q/guard.smt2'])
const cvcVLines = lines(cvcVersion.stdout)
const cvcBinSha = sha256File(cvcBin)
Object.assign(values, {
  cvc5_version_line: cvcVLines[0],
  cvc5: /^cvc5 (\S+)/.exec(cvcVLines[0])?.[1],
  cvc5_git: /\[git (\w+)/.exec(cvcVLines[0])?.[1],
  cvc5_build: cvcVLines[1],
  cvc5_asset: X86.name,
  cvc5_asset_sha256: x86.sha256,
  cvc5_binary_sha256: cvcBinSha,
  cvc5_arm64_asset: ARM.name,
  cvc5_arm64_asset_sha256: arm.sha256,
  cvc5_cpu_architecture: 'x86_64',
  cvc5_smoke: lines(cvcSmoke.stdout)[0],
})
const cvcContainer = containerEnv('ubuntu:24.04', ['--rm', '--memory=6g', '--network=none', '-v <cvc5>:/opt/cvc5:ro', '-v <q>:/q:ro'])
const cvcInputs = [{ url: `${CVC5}/${X86.name}`, sha256: x86.sha256, bytes: x86.bytes, kind: 'release asset', committed: false }]
add({
  id: 'bench-cvc5-version',
  purpose: 'the Bench binary of cvc5 (the non-GPL static Linux x86_64 build), by its own version string; the executed run RUN-cvc5-alethe used the pip wheel, whose version string reads 1.4.2-modified',
  engine: 'cvc5',
  version: cvcVLines[0],
  binary_sha256: cvcBinSha,
  argv: ['/opt/cvc5/bin/cvc5', '--version'],
  inputs: cvcInputs,
  budget: { container_memory: '6g', network: 'none', timeout_s: 60 },
  result: cvcVersion,
  verdict_lines: cvcVLines,
  outputs: [],
  where: 'container',
  container: cvcContainer,
})
add({
  id: 'bench-cvc5-smoke',
  purpose: 'the guard query without a model, as a refutation: x greater than 0 and less than 0',
  engine: 'cvc5',
  version: cvcVLines[0],
  binary_sha256: cvcBinSha,
  argv: ['/opt/cvc5/bin/cvc5', '--lang', 'smt2', '/q/guard.smt2'],
  inputs: [...cvcInputs, { path: smt.path, sha256: smt.sha256, bytes: smt.bytes }],
  budget: { container_memory: '6g', network: 'none', timeout_s: 60 },
  result: cvcSmoke,
  verdict_lines: lines(cvcSmoke.stdout),
  outputs: [],
  where: 'container',
  container: cvcContainer,
})
configs.push({
  id: 'bench-cvc5-arm64-asset',
  purpose: 'the arm64 build of the same release, hashed and not executed: this host is x86_64 and no arm64 emulation is installed',
  engine: 'cvc5',
  version: 'cvc5 1.4.2 (release asset; the version string was not read)',
  binary_sha256: null,
  argv: [],
  inputs: [{ url: `${CVC5}/${ARM.name}`, sha256: arm.sha256, bytes: arm.bytes, kind: 'release asset', committed: false }],
  budget: {},
  started_at: new Date().toISOString(),
  duration_s: 0,
  exit_code: null,
  verdict_lines: [`${ARM.name} ${arm.sha256} (${arm.bytes} bytes), matches the digest the release lists`],
  outputs: [],
  emulated: 'not executed',
})

// ------------------------------------------------------------------------------------------------ the record
const failed = configs.filter((c) => c.exit_code !== null && c.exit_code !== (c.expected_exit_code ?? 0))
const stack = `react ${values.react}, react-router ${values.react_router}, vite ${values.vite}, typescript ${values.typescript}, playwright ${values.playwright_test}, axe-core ${values.axe_core}`
writeRun(ID, {
  id: ID,
  title: 'The scaffold\'s pinned stack: the site, the Bench\'s Python and Rust sides, and the cvc5 Bench binary',
  engine: 'scaffold',
  version: stack,
  binary: null,
  binary_sha256: null,
  image: null,
  recorded_at: new Date().toISOString(),
  started_at: configs[0].started_at,
  // the command that re-executes the whole record, and the committed files its configurations start from
  argv: ['node', `${HELPERS}/record-scaffold.mjs`],
  inputs: ['package.json', 'package-lock.json', 'runs/RUN-scaffold/bench-python/requirements.in', 'runs/RUN-scaffold/bench-rust/Cargo.toml', 'runs/RUN-scaffold/bench-rust/src/main.rs', 'runs/RUN-scaffold/bench-rust/kit-roundtrip/Cargo.toml', 'runs/RUN-scaffold/bench-rust/kit-roundtrip/src/lib.rs'].map(repoInput),
  budget: { container_memory: '6g', network: 'downloads from npm, PyPI, crates.io, apt, rustup and GitHub releases; the browser and cvc5 containers run with the network off', timeout_s: 1800 },
  exit_code: failed.length === 0 ? 0 : 1,
  duration_s: round(configs.reduce((n, c) => n + (c.duration_s ?? 0), 0)),
  outputs: configs.flatMap((c) => c.outputs ?? []),
  verdict_lines: configs.map((c) => `${c.id}: ${c.exit_code === null ? 'not executed' : c.exit_code === (c.expected_exit_code ?? 0) ? (c.expected_exit_code ? `ok (expected failure, exit ${c.exit_code})` : 'ok') : `exit ${c.exit_code}`}`),
  values,
  environment: environment(null, { python: values.python, rust: values.rustc }),
  notes: [
    'RUN-scaffold pins several tools at once, so the top-level engine names the record and the top-level version is the site stack; each configuration carries its own engine, version, binary_sha256 (where a binary ran), argv, inputs, budget, exit code and verdict lines. Named values (values.*) are what copy cites with {{run:RUN-scaffold#values.<name>}}.',
    'Where a configuration ran: npm, node, uv and cargo ran on the host (Linux x86_64, Node 22). The browser configurations ran in the Playwright image of the same version as @playwright/test, which carries Node 24, so the site and instruments suites ran on Node 24 there; the unit tests and the build ran on Node 22 on the host. The Rust crate check, the wasm build and cvc5 ran in ubuntu:24.04; PostgreSQL ran in postgres:18, reached on a loopback port.',
    'Not executed here: the arm64 build of cvc5 (hashed only; no arm64 emulation on this host) and everything on macOS, Windows or Apple silicon. Soufflé ships no arm64 package at all (RUN-souffle-version).',
    'The PostgreSQL entry pins the service image by digest: postgres:18 is a moving tag, and the digest is what the devcontainer compose file must use. It reports PostgreSQL 18.6, the pin of labs/TOOLS.md.',
    'The Rust crates are the candidates labs/TOOLS.md read from the crates.io API on 2026-10-23, pinned with `=` and resolved into the committed Cargo.lock. On Ubuntu 24.04 `cargo check --locked` passes with build-essential and libclang-dev installed (plus curl and ca-certificates, which only rustup needs): pg_query compiles libpg_query with the C compiler and generates its bindings with libclang. bench-rust-host-without-libclang records the same check stopping at pg_query on a host with no libclang, so the Bench image must carry libclang-dev (W0-T05). The recorded run installs nothing else: no clang binary, no protoc, no pkg-config.',
    'The cvc5 Bench binary is the non-GPL static build, so its version string reads 1.4.2 and carries no -modified suffix, unlike the pip wheel of RUN-cvc5-alethe. The two are different builds of the same release: a receipt records the string verbatim.',
    'kit-wasm-roundtrip is the one check that the vendored ABI pair (the host code and the kit crate) still agrees: a module built by the pinned toolchain against the vendored kit, driven by the vendored host code, unedited.',
    'The browser smoke tests are the scaffold\'s own: a meta CSP present and nothing blocked, no request to another origin, no console error, axe with no violation at 360, 320 and 1280 px, no sideways scroll. GATE-bundle and GATE-a11y proper are built on the shell (W1).',
    'Re-record this run after any change to package.json, a workspace manifest or package-lock.json: the npm-lock configuration lists their SHA-256 values as inputs, and GATE-runs compares them.',
    'duration_s on the record is the sum of the configurations; informational outputs (summaries with durations) are compared on verdict_lines when the run is re-recorded.',
  ],
  configs,
})
if (failed.length > 0) {
  console.error(`FAILED configurations: ${failed.map((c) => c.id).join(', ')}`)
  process.exitCode = 1
}
