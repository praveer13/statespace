// W0-S03: assemble runs/RUN-fixedpoint-equal.json and runs/RUN-fixedpoint-equal/ from a finished run.
//
//   node record.mjs --repo <repo> --work <work dir> --cache <cache dir> --image <image>
//
// Everything in the record is read from files the run produced; nothing is typed in here except the
// decision rule, which the plan fixes in advance: Fixedpoint if it equals Souffle on every fixture and
// never accepts a program Souffle rejects, otherwise the TypeScript evaluator. Field names follow the
// other W0 run records (snake_case; configs[] with one entry per tool execution).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const argv = process.argv.slice(2)
const opt = (name) => argv.flatMap((a, i) => (a === `--${name}` ? [argv[i + 1]] : []))[0]
const repo = path.resolve(opt('repo'))
const work = path.resolve(opt('work'))
const image = opt('image')
const spike = path.join(repo, 'scripts', 'spikes', 'W0-S03')
const outDir = path.join(repo, 'runs', 'RUN-fixedpoint-equal')

const read = (f) => fs.readFileSync(f, 'utf8')
const json = (f) => JSON.parse(read(f))
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const W = (...p) => path.join(work, ...p)
const rel = (p) => path.relative(repo, p).split(path.sep).join('/')
const round = (x) => Math.round(x * 100) / 100
const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim()

// ---------------------------------------------------------------- read the run
const steps = Object.fromEntries(read(W('steps.jsonl')).trim().split('\n').map((l) => JSON.parse(l)).map((s) => [s.name, s]))
const comparison = json(W('comparison', 'comparison.json'))
const planted = json(W('planted', 'comparison.json'))
const corpusManifest = json(W('corpus', 'manifest.json'))
const corpus = json(W('corpus', 'corpus.json'))
const cases = json(W('corpus', 'cases.json'))
const summary = json(W('souffle-out', 'souffle-summary.json'))
const deps = json(path.join(spike, 'deps.json'))
const lock = json(path.join(spike, 'package-lock.json'))
const containerEnv = Object.fromEntries(read(W('container-environment.txt')).trim().split('\n').map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 2)]))
const configs = {
  native: json(W('native.json')),
  'pyodide-node22': json(W('pyodide-node.json')),
  chromium: json(W('browsers', 'chromium.json')),
  firefox: json(W('browsers', 'firefox.json')),
  webkit: json(W('browsers', 'webkit.json')),
}
const probeFiles = {
  native: json(W('native-probes.json')),
  'pyodide-node22': json(W('pyodide-node-probes.json')).probes,
  chromium: json(W('browsers', 'chromium-probes.json')).probes,
  firefox: json(W('browsers', 'firefox-probes.json')).probes,
  webkit: json(W('browsers', 'webkit-probes.json')).probes,
}
const cfgNames = Object.keys(configs)
const outputsOf = (program) => [...corpus.programs[program].matchAll(/^\.output\s+(\w+)/gm)].map((m) => m[1])
const csv = (id, relation) => {
  const rows = read(W('souffle-out', 'cases', id, `${relation}.csv`)).split('\n')
  if (rows.at(-1) === '') rows.pop()
  return rows.sort()
}

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })
const outputs = []
const write = (name, value, kind) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 1) + '\n'
  fs.writeFileSync(path.join(outDir, name), text)
  outputs.push({ path: `runs/RUN-fixedpoint-equal/${name}`, sha256: sha256(text), bytes: Buffer.byteLength(text), kind })
}

// ---------------------------------------------------------------- the decision, by the pre-registered rule
const fixedpoint = (n) => comparison.configs[n].engines.fixedpoint
const reference = (n) => comparison.configs[n].engines.reference
const heightsOf = (n) => comparison.configs[n].heights
const boundary = {}
for (const [name, perConfig] of Object.entries(comparison.boundary)) {
  const rows = Object.values(perConfig)
  boundary[name] = { souffle: rows[0].souffle, adapter: rows[0].adapter, verdict: rows[0].verdict, same_in_every_runtime: rows.every((r) => r.verdict === rows[0].verdict && r.adapter === rows[0].adapter) }
}
const boundaryCounts = Object.values(boundary).reduce((acc, b) => ((acc[b.verdict] = (acc[b.verdict] ?? 0) + 1), acc), {})
const checks = [
  { id: 'relations-equal', claim: 'Fixedpoint (through the adapter) computes Souffle\'s relations, as the SHA-256 of the sorted tuples, on every case in every runtime', pass: cfgNames.every((n) => fixedpoint(n).equal === fixedpoint(n).relations && comparison.configs[n].errors.length === 0) },
  { id: 'reference-evaluator-equal', claim: 'the independent naive evaluator also equals Souffle on every case (a third semantics agrees)', pass: cfgNames.every((n) => reference(n).equal === reference(n).relations) },
  { id: 'heights-equal', claim: 'derivation heights rebuilt from Fixedpoint\'s relations equal the heights of Souffle\'s explain trees on every derived tuple, and every rebuilt step is an instance of its rule', pass: cfgNames.every((n) => heightsOf(n).equal === heightsOf(n).tuples && heightsOf(n).key_mismatches === 0 && heightsOf(n).failures === 0) },
  { id: 'runtimes-agree', claim: 'native Z3 and Pyodide in Node, Chromium, Firefox and WebKit give the same corpus digest', pass: cfgNames.every((n) => fixedpoint(n).digest === fixedpoint('native').digest) },
  { id: 'adapter-never-looser', claim: 'no program that Souffle rejects is accepted by the adapter, and every program both accept gives equal relations', pass: !('ADAPTER LOOSER' in boundaryCounts) && !('BOTH ACCEPT, RELATIONS DIFFER' in boundaryCounts) },
  { id: 'compiled-mode-equal', claim: 'Souffle\'s compiled mode gives the interpreter\'s relations on the cases tried', pass: Object.values(comparison.compiled).every((c) => c.relations_equal_to_interpreter && c.exit === 0) },
  { id: 'planted-fault-detected', claim: 'the comparison fails when the engines are given a deliberately wrong program', pass: steps['compare-planted'].exit_code === 1 && planted.configs.planted.engines.fixedpoint.equal < planted.configs.planted.engines.fixedpoint.relations },
]
const pass = checks.every((c) => c.pass)
const decision = checks.slice(0, 5).every((c) => c.pass) ? 'z3-fixedpoint' : 'typescript-evaluator'

// ---------------------------------------------------------------- the outputs
write('comparison.json', comparison, 'comparison of every runtime with Souffle')
write('corpus-manifest.json', corpusManifest, 'the generated corpus: counts, classes and digest')
write('souffle-version.txt', read(W('souffle-version.txt')), 'Souffle banner')
write('explain-read-ref-w0.txt', read(W('souffle-out', 'explain-read-ref-w0.txt')), 'one raw Souffle explain session (format json) on the reference world')
write('container-environment.txt', read(W('container-environment.txt')), 'container OS, architecture and Souffle binary hash')

// the reference fixtures: relations as tuples, each runtime's equality beside Souffle's hash
const referenceCases = ['toy@toy', 'read-ref@w0', 'read-ref@w0-revoked', 'read-ref@w0-nested', 'read-ref@w0-overlap', 'read-ref@w0-spaces', 'closure@graph-cycle6', 'boundary/wildcard-negation', 'boundary/blank-line-one-column']
const relations = {}
for (const id of referenceCases) {
  relations[id] = {}
  for (const relation of outputsOf(cases.find((c) => c.id === id).program)) {
    const tuples = csv(id, relation)
    const hash = sha256(tuples.map((l) => l + '\n').join(''))
    relations[id][relation] = { tuples: tuples.length, sha256: hash, rows: tuples.map((l) => l.split('\t')), equal_in: {} }
    for (const [name, cfg] of Object.entries(configs)) {
      const r = cfg.replies.find((x) => x.id === id)
      relations[id][relation].equal_in[name] = r.fixedpoint[relation].sha256 === hash && r.reference[relation].sha256 === hash
    }
  }
}
write('relations-reference.json', { note: 'sha256 is over the sorted tuples, each tuple one line with tab-separated columns and a final newline (the form LAB-7.c1 names); equal_in says whether Fixedpoint and the reference evaluator, in that runtime, produced Souffle\'s hash', cases: relations }, 'relations of the reference fixtures')

// derivation heights on the reference fixtures: Souffle's explain tree height beside the adapter's
const heights = {}
for (const id of ['toy@toy', 'read-ref@w0', 'read-ref@w0-nested', 'read-ref@w0-overlap', 'closure@graph-chain12']) {
  const souffle = json(W('souffle-out', 'explain', `${id}.json`))
  const adapter = configs.chromium.replies.find((r) => r.id === id).derive.fixedpoint.heights
  heights[id] = Object.fromEntries(Object.keys(souffle).sort().map((k) => [k.replace(/\t/g, ' '), { souffle: souffle[k], adapter: adapter[k] }]))
}
write('heights-reference.json', { note: 'height 1 = a rule applied to facts only; a negated atom or a comparison is a leaf; the adapter column is the height of the derivation rebuilt from Fixedpoint\'s relations (Chromium run)', cases: heights }, 'derivation heights of the reference fixtures')
write('boundary.json', boundary, 'where the adapter and Souffle accept or reject differently')

const probeTable = {}
for (const [name, entries] of Object.entries(probeFiles)) {
  probeTable[name] = Object.fromEntries(entries.map((e) => [e.scenario, e.outcome === 'returned' ? { outcome: 'returned', result: e.result } : { outcome: e.outcome, detail: e.detail ?? e.error }]))
}
write('probes.json', probeTable, 'Fixedpoint probes: explanations and budgets, per runtime')

const pl = planted.configs.planted
write('planted-fault.json', {
  fault: 'every program loses its negated premise !revoked(d, u) before it reaches the engines (native Z3)',
  fixedpoint: { equal: pl.engines.fixedpoint.equal, relations: pl.engines.fixedpoint.relations },
  reference: { equal: pl.engines.reference.equal, relations: pl.engines.reference.relations },
  heights: { equal: pl.heights.equal, tuples: pl.heights.tuples, key_mismatches: pl.heights.key_mismatches },
  comparison_exit_code: steps['compare-planted'].exit_code,
}, 'sensitivity control')
write('steps.json', Object.values(steps), 'every command of the run with argv, start, duration and exit code')

// ---------------------------------------------------------------- tools, hashes and environment
const pyodidePkg = lock.packages['node_modules/pyodide']
const playwrightPkg = lock.packages['node_modules/playwright-core']
const pyodideWasm = sha256(fs.readFileSync(path.join(spike, 'node_modules', 'pyodide', 'pyodide.asm.wasm')))
const dockerInspect = (fmt) => sh('docker', ['image', 'inspect', image, '--format', fmt])
const imageDigest = JSON.parse(dockerInspect('{{json .RepoDigests}}'))[0]?.split('@')[1] ?? dockerInspect('{{.Id}}')
const osRelease = Object.fromEntries(read('/etc/os-release').split('\n').filter(Boolean).map((l) => [l.split('=')[0], l.split('=').slice(1).join('=').replace(/^"|"$/g, '')]))
const python = configs.native.meta.runtime.match(/CPython ([\d.]+)/)[1]
const environment = {
  os: `Linux ${os.release()} ${os.arch() === 'x64' ? 'x86_64' : os.arch()}`,
  cpu_count: os.cpus().length,
  ram_gib: Math.round(os.totalmem() / 2 ** 30),
  container: {
    runtime: 'docker',
    server_version: sh('docker', ['version', '--format', '{{.Server.Version}}']),
    image,
    digest: imageDigest,
    architecture: dockerInspect('{{.Architecture}}'),
    run_flags: ['--rm', '--memory=6g', '--cpus=4', '-e HOST_UID=<uid>', '-e HOST_GID=<gid>', '-v <spike>:/spike:ro', '-v <work>:/work', '-v <cache>:/cache:ro'],
    network: 'bridge, for apt only (the Souffle package\'s dependencies)',
  },
  container_os: containerEnv.image_os,
  container_node: containerEnv.node,
  container_kernel: containerEnv.kernel,
  cpu_architecture: containerEnv.arch,
  host_os: osRelease.PRETTY_NAME,
  host_tools: { node: process.version, uv: sh('uv', ['--version']), python: `CPython ${python}` },
  emulated: false,
}
const hostRun = { where: 'host', os: environment.os, node: process.version, python: `CPython ${python}`, cpu_count: environment.cpu_count }
const containerRun = { where: 'container', image: `${image}@${imageDigest}`, os: containerEnv.image_os, node: containerEnv.node, limits: '--memory=6g --cpus=4' }

// ---------------------------------------------------------------- the verdict lines and named values
const timing = Object.fromEntries(cfgNames.map((n) => [n, { fixedpoint_ms: comparison.configs[n].timing.fixedpoint_ms, reference_ms: comparison.configs[n].timing.reference_ms }]))
const probe = (runtime, scenario) => probeTable[runtime][scenario]
const explainFixtures = Object.keys(probeTable.native).filter((s) => s.startsWith('explain-fixture:'))
const explanations = {}
for (const runtime of Object.keys(probeTable)) {
  const arity3 = probe(runtime, 'explain-arity3')
  const unused = probe(runtime, 'explain-unused-relation')
  const bad = (s) => probe(runtime, s).outcome !== 'returned' || probe(runtime, s).result.error || Object.values(probe(runtime, s).result.relations_equal_to_reference ?? {}).includes(false)
  explanations[runtime] = {
    three_column_copy_rule_answer: arity3.outcome === 'returned' ? arity3.result.got : arity3.outcome,
    three_column_copy_rule_expected: arity3.result?.expected ?? null,
    unused_relation_outcome: unused.outcome === 'returned' ? 'returned' : unused.outcome,
    unused_relation_detail: unused.outcome === 'returned' ? unused.result.got : unused.detail,
    fixtures_unanswered: explainFixtures.filter(bad).length,
    fixtures_tried: explainFixtures.length,
    fixture_outcomes: Object.fromEntries(explainFixtures.map((s) => [s.split(':')[1], probe(runtime, s).outcome === 'returned' ? (probe(runtime, s).result.error ? 'adapter error: proof returned in place of relation' : 'returned') : probe(runtime, s).outcome])),
  }
}
const budgetOf = (runtime, params) => probe(runtime, `budget:${JSON.stringify(params)}`).result
const budgetProbe = Object.fromEntries(Object.keys(probeTable).map((r) => [r, {
  unbounded: { seconds: budgetOf(r, {}).seconds, tuples: budgetOf(r, {}).tuples },
  rlimit_1000: { verdict: budgetOf(r, { rlimit: 1000 }).verdict, seconds: budgetOf(r, { rlimit: 1000 }).seconds, tuples: budgetOf(r, { rlimit: 1000 }).tuples ?? null },
  rlimit_1: { verdict: budgetOf(r, { rlimit: 1 }).verdict, seconds: budgetOf(r, { rlimit: 1 }).seconds, detail: budgetOf(r, { rlimit: 1 }).exception ?? null },
  timeout_1_ms: { verdict: budgetOf(r, { timeout: 1 }).verdict, seconds: budgetOf(r, { timeout: 1 }).seconds, detail: budgetOf(r, { timeout: 1 }).exception ?? null },
  datalog_timeout_1_ms: { verdict: budgetOf(r, { 'datalog.timeout': 1 }).verdict, seconds: budgetOf(r, { 'datalog.timeout': 1 }).seconds },
  timeout_50_ms: { verdict: budgetOf(r, { timeout: 50 }).verdict, seconds: budgetOf(r, { timeout: 50 }).seconds, tuples: budgetOf(r, { timeout: 50 }).tuples ?? null },
  datalog_timeout_50_ms: { verdict: budgetOf(r, { 'datalog.timeout': 50 }).verdict, seconds: budgetOf(r, { 'datalog.timeout': 50 }).seconds, tuples: budgetOf(r, { 'datalog.timeout': 50 }).tuples ?? null },
}]))
const staticProbe = Object.fromEntries(Object.keys(probeTable).map((r) => [r, {
  unsafe_head: probe(r, 'unsafe-head').result,
  wildcard_under_negation_read_with_a_fresh_variable: probe(r, 'naive-wildcard-negation').result.fixedpoint_read_with_a_fresh_variable,
  non_stratified_negation: probe(r, 'unstratified').result.message ?? probe(r, 'unstratified').result.fixedpoint,
}]))

const souffleLine = `souffle ${comparison.souffle.version.split(';')[0].replace('Version: ', '')} (${containerEnv.arch}): ${Object.keys(summary.cases).length} cases run, ${comparison.souffle.cases} accepted by its front end, ${Object.keys(summary.explain).length} explain sessions with ${comparison.souffle.explain_problems} problems, compiled mode equal to the interpreter on ${Object.keys(comparison.compiled).length} of ${Object.keys(comparison.compiled).length} cases tried: ${checks.find((c) => c.id === 'compiled-mode-equal').pass}`
const verdict_lines = [souffleLine]
for (const n of cfgNames) {
  const f = fixedpoint(n)
  const h = heightsOf(n)
  verdict_lines.push(`${comparison.configs[n].runtime}: Fixedpoint relations equal to Souffle in ${f.equal} of ${f.relations} comparisons over ${f.cases} cases; derivation heights equal on ${h.equal} of ${h.tuples} derived tuples (${h.key_mismatches} unmatched, ${h.failures} invalid steps)`)
}
verdict_lines.push(`Fixedpoint corpus digest ${fixedpoint('native').digest}, identical in all ${cfgNames.length} runtimes: ${checks.find((c) => c.id === 'runtimes-agree').pass}`)
verdict_lines.push(`planted fault (negated premise dropped): ${pl.engines.fixedpoint.equal} of ${pl.engines.fixedpoint.relations} comparisons equal, comparison exit code ${steps['compare-planted'].exit_code}`)
verdict_lines.push(`boundary programs (${Object.keys(boundary).length}): ${Object.entries(boundaryCounts).map(([k, v]) => `${v} ${k}`).join(', ')}`)
const sp = staticProbe.native
const bp = budgetProbe.chromium
verdict_lines.push(`Fixedpoint as it stands, without the adapter's checks: accepts p(x, y) :- q(x) and returns ${sp.unsafe_head.fixedpoint_tuples} tuples over a domain of ${sp.unsafe_head.domain_size} (Souffle rejects it); reads !r(x, _) with a fresh variable as {${sp.wildcard_under_negation_read_with_a_fresh_variable.join(', ')}} where Souffle gives {c}; raises ${sp.non_stratified_negation} on cyclic negation`)
verdict_lines.push(`budgets on one join of ${budgetOf('chromium', {}).tuples} tuples in Chromium: unbounded ${bp.unbounded.seconds} s; rlimit 1000 ${bp.rlimit_1000.verdict} in ${bp.rlimit_1000.seconds} s; timeout 50 ms ${bp.timeout_50_ms.verdict} in ${bp.timeout_50_ms.seconds} s; datalog.timeout 50 ms ${bp.datalog_timeout_50_ms.verdict} in ${bp.datalog_timeout_50_ms.seconds} s`)
verdict_lines.push(`decision by the pre-registered rule: ${decision}`)

const stepOf = (name) => ({ started_at: steps[name].started_at, duration_s: steps[name].duration_s, exit_code: steps[name].exit_code })
const wheel = (key) => ({ file: deps[key].file, url: deps[key].url, sha256: deps[key].sha256, kind: 'wheel from PyPI', committed: false })
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1)).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
const fixtureInputs = walk(path.join(spike, 'fixtures')).map((f) => ({ path: rel(f), sha256: sha256(fs.readFileSync(f)), bytes: fs.statSync(f).size }))
const harnessFiles = ['ss_datalog.py', 'probes.py', 'worldgen.mjs', 'engine.mjs', 'compare.mjs', 'souffle-run.mjs', 'browser-run.mjs', 'pyodide-node.mjs', 'native_run.py', 'step.mjs', 'fetch-deps.mjs', 'record.mjs', 'run-all.sh', 'container.sh', 'deps.json', 'package.json', 'package-lock.json', 'browser/index.html', 'browser/worker.mjs']
const harnessInputs = harnessFiles.map((f) => ({ path: `scripts/spikes/W0-S03/${f}`, sha256: sha256(fs.readFileSync(path.join(spike, f))), bytes: fs.statSync(path.join(spike, f)).size, kind: 'harness' }))
const committed = [...fixtureInputs, ...harnessInputs]
const inputs = [
  ...committed,
  { path: 'runs/RUN-fixedpoint-equal/corpus-manifest.json', sha256: outputs.find((o) => o.path.endsWith('corpus-manifest.json')).sha256, kind: 'generated corpus', note: `${corpusManifest.counts.cases} cases from the fixtures and the seeds in worldgen.mjs; corpus_sha256 ${corpusManifest.corpus_sha256} covers every generated file` },
  wheel('z3_wasm_wheel'),
  wheel('z3_native_wheel'),
  { file: deps.souffle_deb.file, url: deps.souffle_deb.url, sha256: deps.souffle_deb.sha256, sha512: deps.souffle_deb.sha512, kind: 'release asset', committed: false },
]
const inputManifest = [...committed].sort((a, b) => (a.path < b.path ? -1 : 1)).map((i) => `${i.sha256}  ${i.path}\n`).join('')

const record = {
  id: 'RUN-fixedpoint-equal',
  title: 'Z3 Fixedpoint under Pyodide against Souffle 2.5 on the S7 fixtures: equal relations and derivation heights, in five runtimes (W0-S03)',
  task: 'W0-S03',
  engine: 'z3 (Fixedpoint, engine=datalog)',
  version: configs.native.meta.z3,
  version_string: configs.native.meta.z3,
  binary: `${deps.z3_wasm_wheel.file} from PyPI, loaded by pyodide.loadPackage (the tab engine); the native wheel ${deps.z3_native_wheel.file} for the native pair`,
  binary_sha256: deps.z3_wasm_wheel.sha256,
  reference: { engine: 'souffle', version: '2.5', binary_sha256: containerEnv.souffle_binary_sha256, package_sha256: deps.souffle_deb.sha256, package: deps.souffle_deb.file, cpu_architecture: containerEnv.arch },
  runtime: {
    pyodide: { version: '314.0.7', npm_integrity: pyodidePkg.integrity, asm_wasm_sha256: pyodideWasm },
    playwright_core: '1.63.0',
    browsers: Object.fromEntries(['chromium', 'firefox', 'webkit'].map((n) => [n, { version: configs[n].meta.browser.version }])),
  },
  image: `${image}@${imageDigest}`,
  recorded_at: new Date().toISOString(),
  started_at: steps['fetch-deps'].started_at,
  duration_s: round((Date.parse(steps['compare-planted'].started_at) + steps['compare-planted'].duration_s * 1000 - Date.parse(steps['fetch-deps'].started_at)) / 1000),
  primary_config: 'z3-fixedpoint-chromium',
  argv: ['scripts/spikes/W0-S03/run-all.sh', '<work>'],
  inputs,
  input_sha256: sha256(inputManifest),
  input_sha256_method: 'SHA-256 of the sha256sum-style manifest of the committed entries of inputs[], one "<sha256>  <path>\\n" line per file, sorted by path',
  budget: {
    engine: 'none on the corpus cases: every case ran to completion; the probes show that neither rlimit nor timeout bounds one large join',
    souffle: 'interpreter with default jobs; explain shell at depth 100',
    container_memory: '6g',
    container_cpus: 4,
    browser_corpus_wait: '15 min',
    browser_probe_wait: '120 s',
  },
  exit_code: steps.compare.exit_code,
  exit_code_note: 'the exit status of the comparison of the five runtimes with Souffle: 0 when every relation and height is equal; the decision rule and the individual checks are in checks[]',
  verdict_lines,
  outputs,
  values: {
    decision,
    fallback: 'typescript-evaluator',
    cases: corpusManifest.counts.cases,
    relation_cases: fixedpoint('native').cases,
    relations_compared: fixedpoint('native').relations,
    relations_equal: Object.fromEntries(cfgNames.map((n) => [n, fixedpoint(n).equal])),
    reference_evaluator_relations_equal: Object.fromEntries(cfgNames.map((n) => [n, reference(n).equal])),
    heights_compared: heightsOf('native').tuples,
    heights_equal: Object.fromEntries(cfgNames.map((n) => [n, heightsOf(n).equal])),
    derivations_checked: heightsOf('native').checked,
    derivations_invalid: heightsOf('native').failures,
    tuples_with_competing_derivations: heightsOf('native').contested,
    max_height: heightsOf('native').max_height,
    height_histogram: heightsOf('native').histogram,
    generated_worlds: corpusManifest.counts.generated_s7_worlds,
    world_classes: corpusManifest.classes,
    rule_firing: comparison.generated_worlds,
    scale_worlds: comparison.scale,
    corpus_sha256: corpusManifest.corpus_sha256,
    fixedpoint_corpus_digest: fixedpoint('native').digest,
    souffle_binary_sha256: containerEnv.souffle_binary_sha256,
    boundary: boundaryCounts,
    timing_ms: { souffle_interpreter: comparison.souffle.interpreter_ms, souffle_explain_session: comparison.souffle.explain_session_ms, ...timing },
    planted_fault_relations_equal: `${pl.engines.fixedpoint.equal} of ${pl.engines.fixedpoint.relations}`,
    explanations,
    budget_probe: budgetProbe,
    static_check_probe: staticProbe,
    fixedpoint_parameters: probe('native', 'defaults').result.parameters,
  },
  checks,
  pass,
  environment,
  configs: [],
  notes: [
    'The S7 fixtures of this record are the ones the curriculum defines today: the toy of LAB-7.1, the reference world W0 and its variants, seeded worlds with the section 1 parameters (some break WF1 to WF3 on purpose), the policy mutants of LAB-7.c3 and the Prove-it table, S7.L2\'s English variant, a role-permission policy of fourteen rules that differ only in constants, and Souffle\'s transitive-closure example with negation over the recursive relation. W4-T07 runs the same comparison on the authored fixtures.',
    'Relations are compared as the SHA-256 of the sorted tuples (each tuple a line, columns tab-separated, a final newline), the form LAB-7.c1 names. The adapter is scripts/spikes/W0-S03/ss_datalog.py: a parser and checker for the Souffle subset S7 uses, a translation to Fixedpoint, and a reconstruction of derivations from the relations.',
    'Heights follow Souffle\'s explain trees: a leaf (a fact, a negated atom or a comparison) has height 0 and a rule node has 1 + the largest child height. Souffle prints proof trees of minimal height; the adapter computes minimal heights from Fixedpoint\'s relations. The explain shell prints a constraint with symbol ordinals (21 != 18) instead of the symbols (explain-read-ref-w0.txt), so the run reads heights from its JSON form, with setdepth 100 so that deep trees print in full, and not from the text.',
    'Z3\'s own derivation facility (datalog.generate_explanations) is not used: probes.json shows it answering wrongly or crashing on programs that the default setting answers correctly.',
    `This is not a phone run and not the custom-subdomain origin: the browser runs are headless desktop engines in a container, served from one local origin with no COOP or COEP headers (W0-S01 and W0-S02 own those). Timings are from a machine with ${environment.cpu_count} CPUs of which the container was allotted 4; Firefox and WebKit round performance.now to whole milliseconds. A relation's contents do not depend on the device, its speed does.`,
    `The installed Souffle binary hash ${containerEnv.souffle_binary_sha256} comes from the same upstream package that RUN-souffle-version pins.`,
    'Paths are normalised: <repo>, <work> and <cache> stand for directories on the machine that ran this.',
  ],
}

record.configs.push({
  id: 'souffle-2.5',
  purpose: 'the reference: Souffle\'s relations and explain trees on every case',
  engine: 'souffle',
  version: '2.5',
  binary_sha256: containerEnv.souffle_binary_sha256,
  ...containerRun,
  argv: [summary.argv.interpreter, summary.argv.explain, summary.argv.compiled],
  container_argv: steps.container.argv,
  budget: { jobs: 'default', explain_depth: 100, container_memory: '6g' },
  ...stepOf('souffle'),
  verdict_lines: [souffleLine],
  outputs: ['runs/RUN-fixedpoint-equal/souffle-version.txt', 'runs/RUN-fixedpoint-equal/container-environment.txt'],
  timing_ms: { interpreter: comparison.souffle.interpreter_ms, explain_session: comparison.souffle.explain_session_ms },
  notes: `Souffle's output relations are the oracle: the SHA-256 of each sorted relation is compared case by case. Banner: ${comparison.souffle.version}.`,
})
const runtimes = {
  native: { step: 'native', run: hostRun, wheel: 'z3_native_wheel', purpose: 'the same adapter and corpus with the Bench wheel: the pair Pyodide Z3 = native Z3' },
  'pyodide-node22': { step: 'pyodide-node', run: hostRun, wheel: 'z3_wasm_wheel', purpose: 'the continuation of the RUN-z3-fixedpoint harness: Pyodide under Node 22' },
  chromium: { step: 'browsers', run: containerRun, wheel: 'z3_wasm_wheel', purpose: 'Pyodide in a module worker, Chromium' },
  firefox: { step: 'browsers', run: containerRun, wheel: 'z3_wasm_wheel', purpose: 'Pyodide in a module worker, Firefox' },
  webkit: { step: 'browsers', run: containerRun, wheel: 'z3_wasm_wheel', purpose: 'Pyodide in a module worker, WebKit' },
}
for (const n of cfgNames) {
  const meta = configs[n].meta
  record.configs.push({
    id: `z3-fixedpoint-${n}`,
    purpose: runtimes[n].purpose,
    engine: 'z3 (Fixedpoint, engine=datalog) through the adapter',
    version: meta.z3,
    binary_sha256: deps[runtimes[n].wheel].sha256,
    runtime: meta.runtime,
    ...runtimes[n].run,
    argv: steps[runtimes[n].step].argv,
    budget: { rlimit: 'none', timeout: 'none' },
    started_at: meta.started_at ?? steps[runtimes[n].step].started_at,
    duration_s: round(meta.wall_s ?? meta.total_s),
    exit_code: steps[runtimes[n].step].exit_code,
    verdict_lines: [verdict_lines.find((l) => l.startsWith(comparison.configs[n].runtime))],
    timing_ms: timing[n],
    load_ms: meta.load_ms ?? null,
  })
}
record.configs.push({
  id: 'sensitivity-planted-fault',
  purpose: 'a control: the comparison must fail when the engines are given a deliberately wrong program',
  engine: 'z3 (Fixedpoint, engine=datalog) through the adapter',
  version: configs.native.meta.z3,
  binary_sha256: deps.z3_native_wheel.sha256,
  ...hostRun,
  argv: steps['native-planted'].argv,
  budget: { rlimit: 'none' },
  ...stepOf('native-planted'),
  verdict_lines: [verdict_lines.find((l) => l.startsWith('planted fault'))],
  outputs: ['runs/RUN-fixedpoint-equal/planted-fault.json'],
  notes: 'The negated premise !revoked(d, u) is deleted from every program before it reaches the engines; Souffle ran the original programs.',
})
for (const [n, step] of [['native', 'native-probes'], ['pyodide-node22', 'pyodide-node'], ['chromium', 'browsers'], ['firefox', 'browsers'], ['webkit', 'browsers']]) {
  record.configs.push({
    id: `probes-${n}`,
    purpose: 'Fixedpoint outside the adapter\'s normal path: datalog.generate_explanations, and rlimit and timeout on one large join',
    engine: 'z3 (Fixedpoint, engine=datalog)',
    version: configs.native.meta.z3,
    binary_sha256: deps[n === 'native' ? 'z3_native_wheel' : 'z3_wasm_wheel'].sha256,
    ...(n === 'native' || n === 'pyodide-node22' ? hostRun : containerRun),
    argv: steps[step].argv,
    ...stepOf(step),
    verdict_lines: [`datalog.generate_explanations: ${JSON.stringify(explanations[n])}`],
    outputs: ['runs/RUN-fixedpoint-equal/probes.json'],
  })
}

fs.writeFileSync(path.join(repo, 'runs', 'RUN-fixedpoint-equal.json'), JSON.stringify(record, null, 2) + '\n')
console.log(verdict_lines.join('\n'))
console.log(`checks: ${checks.map((c) => `${c.id}=${c.pass}`).join(' ')}`)
console.log(`recorded runs/RUN-fixedpoint-equal.json, ${outputs.length} output files`)
