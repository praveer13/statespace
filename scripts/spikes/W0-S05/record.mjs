// Records RUN-tlc-lasso-json (W0-S05, docs/spikes/W0-S05.md).
//
// Runs TLC on the Hold spec and on probe specs for the other lasso shapes, each in a fresh
// container of the pinned image with no network. Copies the outputs to runs/RUN-tlc-lasso-json/,
// runs the schema and reading-rule checks on them (check.mjs with Ajv, check_schema.py with
// Python jsonschema), and writes runs/RUN-tlc-lasso-json.json.
//
//   TLA2TOOLS_180=<tla2tools 1.8.0 jar> TLA2TOOLS_174=<tla2tools 1.7.4 jar> node record.mjs
//
// Needs: Docker and the image eclipse-temurin:21-jre; Node 22 with `npm ci` run in this folder;
// uv. Each jar is checked against the SHA-256 pinned in labs/TOOLS.md before it runs. Exits 1
// when any check fails.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const RUN_ID = 'RUN-tlc-lasso-json';
const OUT = join(repo, 'runs', RUN_ID);
const IMAGE = 'eclipse-temurin:21-jre';
const PROBES = 'scripts/spikes/W0-S05/probes';

const JARS = {
  '1.8.0': {
    env: 'TLA2TOOLS_180',
    sha256: '5bd7b64db99ae4c6c35f290de5e809c0ee41af43f8699cf696099ffb6452b1e2',
    banner: 'TLC2 Version 2026.10.20.183001 (rev: d2e1472)',
  },
  '1.7.4': {
    env: 'TLA2TOOLS_174',
    sha256: '936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88',
    banner: 'TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)',
  },
};

const HOLD = { spec: 'research/evidence/a2r3/tla/live/Hold.tla', cfg: 'research/evidence/a2r3/tla/live/Hold.cfg' };
const STEM = `${PROBES}/HoldStem.tla`;
const RECORDED_TRACE = 'research/evidence/a2r3/tla/live/Hold.trace.json';

// One entry per TLC execution. `trace` is the -dumpTrace file; `keepTrace` copies it to the outputs.
const CONFIGS = [
  { id: 'hold-180', jar: '1.8.0', ...HOLD, trace: 'Hold.trace.json', keepTrace: true,
    purpose: 'the Hold spec of RUN-tlc-hold-lasso on the pinned 1.8.0 jar, one worker, JSON trace on' },
  { id: 'hold-nofair-180', jar: '1.8.0', spec: HOLD.spec, cfg: `${PROBES}/HoldNoFair.cfg`, trace: 'HoldNoFair.trace.json', keepTrace: true,
    purpose: 'Hold without a fairness conjunct: the lasso is a stutter at state 1' },
  { id: 'stem-cycle-180', jar: '1.8.0', spec: STEM, cfg: `${PROBES}/HoldStemCycle.cfg`, trace: 'HoldStemCycle.trace.json', keepTrace: true,
    purpose: 'a stem of one state, then a cycle that closes on state 2; the stem action is parameterized and the fairness conjunct names an operator the step label does not' },
  { id: 'stem-stutter-180', jar: '1.8.0', spec: STEM, cfg: `${PROBES}/HoldStemStutter.cfg`, trace: 'HoldStemStutter.trace.json', keepTrace: true,
    purpose: 'a stem of two states, then a stutter at state 3' },
  { id: 'hold-w4-180', jar: '1.8.0', ...HOLD, trace: 'Hold.trace.json', workers: 4, repeats: 3,
    purpose: 'Hold with four workers, three times: does the worker count change the JSON trace?' },
  { id: 'stem-branches-sweep-180', jar: '1.8.0', spec: STEM, cfg: `${PROBES}/HoldStemBranches.cfg`, trace: 'HoldStemBranches.trace.json', sweepFp: 16,
    purpose: 'the stem probe with two equally valid lassos (Open(0) and Open(1) first), run with -fp 0 to -fp 15: does the fingerprint function decide which one TLC reports?' },
  { id: 'stem-branches-fp-180', jar: '1.8.0', spec: STEM, cfg: `${PROBES}/HoldStemBranches.cfg`, trace: 'HoldStemBranches.trace.json', extraArgs: ['-fp', '7'], repeats: 6,
    purpose: 'the same probe with -fp 7, six runs: does a fixed fingerprint function repeat the trace?' },
  { id: 'init-violation-180', jar: '1.8.0', spec: `${PROBES}/InitBad.tla`, cfg: `${PROBES}/InitBad.cfg`, trace: 'InitBad.trace.json', keepTrace: true,
    expectExit: 12, expectText: 'Error: Invariant Small is violated by the initial state:',
    purpose: 'a finite counterexample of one state, from an invariant the initial state violates: what does the JSON hold when there are no steps?' },
  { id: 'hold-174', jar: '1.7.4', ...HOLD, trace: null,
    purpose: 'the fallback: the older jar prints the lasso as text' },
  { id: 'hold-nofair-174', jar: '1.7.4', spec: HOLD.spec, cfg: `${PROBES}/HoldNoFair.cfg`, trace: null,
    purpose: 'the fallback on the stutter at state 1' },
  { id: 'stem-cycle-174', jar: '1.7.4', spec: STEM, cfg: `${PROBES}/HoldStemCycle.cfg`, trace: null,
    purpose: 'the fallback on a stem and a cycle' },
  { id: 'stem-stutter-174', jar: '1.7.4', spec: STEM, cfg: `${PROBES}/HoldStemStutter.cfg`, trace: null,
    purpose: 'the fallback on a stem and a stutter' },
  { id: 'hold-tool-174', jar: '1.7.4', ...HOLD, trace: null, extraArgs: ['-tool'], loopCodes: [2217, 2122],
    purpose: 'the fallback in -tool mode: message codes frame each state and the back edge' },
  { id: 'hold-nofair-tool-174', jar: '1.7.4', spec: HOLD.spec, cfg: `${PROBES}/HoldNoFair.cfg`, trace: null, extraArgs: ['-tool'], loopCodes: [2217, 2218],
    purpose: 'the same for the stutter at state 1' },
  { id: 'hold-dumptrace-174', jar: '1.7.4', ...HOLD, trace: 'Hold.trace.json', expectRejected: true,
    purpose: 'the older jar is asked for a JSON trace on the Hold spec' },
];

// A private path or the current user's name must not reach a published file.
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PRIVATE = new RegExp(['/home/', '/Users/', '/tmp/claude', os.userInfo().username].filter((t) => t.length > 2).map(escapeRe).join('|'));

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fileSha = (rel) => sha256(readFileSync(join(repo, rel)));
const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', cwd: repo, ...opts });
const die = (msg) => {
  console.error(msg);
  process.exit(2);
};

// Verdict lines are copied verbatim from the tool's output (spine 9.4).
const VERDICT = [/^TLC2 Version /, /^Error: /, /^State \d+: /, /^Back to state \d+: /, /^\d+ states generated, /,
  /^The depth of the complete state graph search is /, /^"CounterExample written: /,
  // -tool mode: the same facts without the "Error: " and "State " prefixes
  /^Temporal propert(y \S+ was|ies were) violated\./, /^\d+: (<.*>|Stuttering|Back to state: .*)$/];
const verdictLines = (stdout) => stdout.split('\n').filter((l) => VERDICT.some((re) => re.test(l)));

function runTlc(c, jarPath, rank) {
  const work = mkdtempSync(join(os.tmpdir(), `w0s05-${c.id}-`));
  try {
    copyFileSync(join(repo, c.spec), join(work, basename(c.spec)));
    copyFileSync(join(repo, c.cfg), join(work, basename(c.cfg)));
    const tlc = ['-workers', String(c.workers ?? 1), ...(c.extraArgs ?? []), ...(c.sweepFp ? ['-fp', String(rank)] : []), '-config', basename(c.cfg), ...(c.trace ? ['-dumpTrace', 'json', c.trace] : []), basename(c.spec)];
    const argv = ['java', '-XX:+UseParallelGC', '-jar', '/opt/tla2tools.jar', ...tlc];
    const docker = ['run', '--rm', '--memory=6g', '--network=none', '--user', `${process.getuid()}:${process.getgid()}`,
      '-v', `${work}:/work`, '-v', `${jarPath}:/opt/tla2tools.jar:ro`, '-w', '/work', IMAGE, ...argv];
    const startedAt = new Date().toISOString();
    const t0 = process.hrtime.bigint();
    const r = sh('docker', docker, { timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
    const durationS = Math.round(Number(process.hrtime.bigint() - t0) / 1e6) / 1000;
    const traceFile = c.trace && existsSync(join(work, c.trace)) ? readFileSync(join(work, c.trace)) : null;
    // TLC also writes a trace-exploration spec for a back-edge lasso; its config names the loop.
    const te = readdirSync(work).find((f) => /_TTrace_\d+\.tla$/.test(f));
    const teText = te ? readFileSync(join(work, te), 'utf8') : '';
    const constant = (name) => {
      const v = teText.match(new RegExp(`^${name} = (\\d+)$`, 'm'))?.[1];
      return v === undefined ? null : Number(v);
    };
    const stdout = r.stdout ?? '';
    return {
      argv, startedAt, durationS, exitCode: r.status, stdout, stderr: r.stderr ?? '', traceFile,
      fp: stdout.match(/Model-Checking with fp (\d+) /)?.[1] ?? null,
      teSpec: te ? { lassoStart: constant('_TTraceLassoStart'), lassoEnd: constant('_TTraceLassoEnd') } : null,
    };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// ---- preflight
const jarPaths = {};
for (const [version, j] of Object.entries(JARS)) {
  const p = process.env[j.env];
  if (!p || !existsSync(p)) die(`set ${j.env} to the tla2tools ${version} jar`);
  const got = sha256(readFileSync(p));
  if (got !== j.sha256) die(`${j.env}: SHA-256 ${got} is not the pin ${j.sha256}`);
  jarPaths[version] = resolve(p);
}
const inspect = sh('docker', ['image', 'inspect', IMAGE, '--format', '{{index .RepoDigests 0}}']);
if (inspect.status !== 0) die(`image ${IMAGE} is not available locally`);
const imageDigest = inspect.stdout.trim().split('@')[1];
const javaVersion = sh('docker', ['run', '--rm', '--memory=1g', '--network=none', IMAGE, 'java', '-version']).stderr.split('\n').find((l) => l.startsWith('OpenJDK 64-Bit'));
const dockerVersion = sh('docker', ['version', '--format', '{{.Server.Version}}']).stdout.trim();
const recordedBytes = readFileSync(join(repo, RECORDED_TRACE));

// ---- run TLC
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const checks = [];
const check = (id, pass, detail) => {
  checks.push({ id, pass: Boolean(pass), detail });
  if (!pass) console.error(`CHECK FAILED ${id}: ${detail}`);
};
const configs = [];
for (const c of CONFIGS) {
  const jar = JARS[c.jar];
  const runs = Array.from({ length: c.sweepFp ?? c.repeats ?? 1 }, (_, i) => runTlc(c, jarPaths[c.jar], i));
  const first = runs[0];
  const dir = join(OUT, c.id);
  mkdirSync(dir, { recursive: true });
  const outputs = [];
  const put = (name, bytes, kind, compare) => {
    writeFileSync(join(dir, name), bytes);
    outputs.push({ path: `runs/${RUN_ID}/${c.id}/${name}`, sha256: sha256(bytes), bytes: bytes.length, kind, compare });
  };
  put('tlc.stdout.txt', first.stdout, 'tlc stdout', 'informational: the banner carries a random seed and the run prints timestamps');
  if (first.stderr) put('tlc.stderr.txt', first.stderr, 'tlc stderr', 'informational');
  if (c.keepTrace && first.traceFile) put(c.trace, first.traceFile, 'json counterexample', 'bytes');

  check(`${c.id}: jar banner`, first.stdout.split('\n').includes(jar.banner), first.stdout.split('\n')[0]);
  const wantExit = c.expectExit ?? (c.expectRejected ? 1 : 13);
  check(`${c.id}: exit code`, runs.every((r) => r.exitCode === wantExit), runs.map((r) => r.exitCode).join(','));
  if (c.expectRejected) {
    check(`${c.id}: -dumpTrace rejected`, first.stdout.includes('Error: unrecognized option: -dumpTrace') && !first.traceFile, 'no trace file written');
  } else if (c.expectText) {
    check(`${c.id}: expected verdict line`, first.stdout.includes(c.expectText), c.expectText);
  } else {
    check(`${c.id}: liveness violation reported`, /^(Error: )?Temporal propert(y \S+ was|ies were) violated\.$/m.test(first.stdout), 'headline present');
  }
  if (c.loopCodes) check(`${c.id}: message codes frame the loop`, c.loopCodes.every((code) => first.stdout.includes(`@!@!@STARTMSG ${code}:`)), c.loopCodes.join(', '));
  if (c.jar === '1.8.0' && c.trace) check(`${c.id}: trace written`, runs.every((r) => r.traceFile), 'file present');

  configs.push({
    id: c.id,
    purpose: c.purpose,
    engine: 'tlc',
    version: c.jar,
    version_string: jar.banner,
    binary_sha256: jar.sha256,
    argv: first.argv,
    cwd: '/work',
    inputs: [[c.spec, 'spec'], [c.cfg, 'config']].map(([p, role]) => ({ path: p, sha256: fileSha(p), role })),
    budget: { workers: c.workers ?? 1, container_memory: '6g', network: 'none', timeout_s: 120 },
    started_at: first.startedAt,
    duration_s: first.durationS,
    exit_code: first.exitCode,
    verdict_lines: verdictLines(first.stdout),
    outputs,
    ...(first.teSpec && { trace_exploration_spec: { lasso_start: first.teSpec.lassoStart, lasso_end: first.teSpec.lassoEnd } }),
    ...(c.sweepFp && { argv_note: 'repeat i runs with -fp i, for i from 0 to 15; the rest of argv is as shown' }),
    ...((c.repeats || c.sweepFp) && {
      repeats: runs.map((r) => ({
        started_at: r.startedAt,
        duration_s: r.durationS,
        exit_code: r.exitCode,
        fp: r.fp,
        trace_sha256: r.traceFile && sha256(r.traceFile),
        first_step_context: r.traceFile ? (JSON.parse(r.traceFile).counterexample.action[0][1].context ?? null) : null,
      })),
      distinct_traces: new Set(runs.map((r) => r.traceFile && sha256(r.traceFile))).size,
    }),
    _traceFile: first.traceFile,
  });
}

// ---- observations that need two configs
const byId = Object.fromEntries(configs.map((c) => [c.id, c]));
const hold = byId['hold-180'];
check('hold-180: byte-identical to the recorded Hold.trace.json', hold._traceFile && Buffer.compare(hold._traceFile, recordedBytes) === 0, `${sha256(recordedBytes)}`);
const w4 = byId['hold-w4-180'];
const sweep = byId['stem-branches-sweep-180'];
const branchesFp = byId['stem-branches-fp-180'];
const sweepZero = sweep.repeats.filter((r) => r.first_step_context?.t === 0).map((r) => r.fp);
const sweepOne = sweep.repeats.filter((r) => r.first_step_context?.t === 1).map((r) => r.fp);
check('sweep: -fp i was the fingerprint function of run i', sweep.repeats.every((r, i) => r.fp === String(i)), sweep.repeats.map((r) => r.fp).join(','));
check('sweep: both lassos appear', sweepZero.length > 0 && sweepOne.length > 0, `Open(0) ${sweepZero.length}, Open(1) ${sweepOne.length}`);
check('fixed -fp repeats the trace', branchesFp.distinct_traces === 1, `${branchesFp.distinct_traces} distinct`);
w4.identical_to_hold_180 = w4.repeats.every((r) => r.trace_sha256 === sha256(hold._traceFile));
for (const c of configs) delete c._traceFile;

// ---- schema and reading-rule checks on what was just written
const ajv = sh('node', ['scripts/spikes/W0-S05/check.mjs', '--json']);
const py = sh('uv', ['run', '--no-project', '--with', 'jsonschema==4.26.0', 'python', '-I', 'scripts/spikes/W0-S05/check_schema.py', '--json']);
mkdirSync(join(OUT, 'validation'), { recursive: true });
const validators = [];
for (const [name, r, argv] of [
  ['ajv', ajv, ['node', 'scripts/spikes/W0-S05/check.mjs', '--json']],
  ['jsonschema', py, ['uv', 'run', '--no-project', '--with', 'jsonschema==4.26.0', 'python', '-I', 'scripts/spikes/W0-S05/check_schema.py', '--json']],
]) {
  let summary = null;
  try {
    summary = JSON.parse(r.stdout);
  } catch {
    check(`${name}: produced a summary`, false, r.stderr.slice(0, 200));
    continue;
  }
  const bytes = JSON.stringify(summary, null, 2) + '\n';
  writeFileSync(join(OUT, 'validation', `${name}.json`), bytes);
  check(`${name}: every fixture behaves as the manifest says`, r.status === 0 && summary.pass, `exit ${r.status}`);
  validators.push({
    engine: summary.tool.engine,
    version: summary.tool.version,
    dialect: summary.tool.dialect,
    ...(summary.tool.node && { node: summary.tool.node }),
    ...(summary.tool.python && { python: summary.tool.python }),
    argv,
    exit_code: r.status,
    counts: summary.counts,
    recorded_hold_trace: summary.fixtures.find((f) => f.id === 'hold-recorded').schemaValid ? 'valid' : 'invalid',
    output: { path: `runs/${RUN_ID}/validation/${name}.json`, sha256: sha256(bytes), compare: 'bytes' },
    schema_sha256: summary.schema.sha256,
  });
}

// The trace-exploration spec TLC writes names the loop too; it must say what the JSON says.
const ajvSummary = JSON.parse(ajv.stdout);
for (const [cid, fid] of [['hold-180', 'hold-180'], ['stem-cycle-180', 'stem-cycle-180'], ['hold-nofair-180', 'hold-nofair-180'], ['stem-stutter-180', 'stem-stutter-180']]) {
  const r = ajvSummary.fixtures.find((f) => f.id === fid).reading;
  const te = byId[cid].trace_exploration_spec;
  if (r.stutter) check(`${cid}: no loop constants in the trace-exploration spec for a stutter`, !te || te.lasso_start === null, JSON.stringify(te ?? null));
  else check(`${cid}: trace-exploration spec agrees with the JSON loop`, te?.lasso_start === r.loopStart && te?.lasso_end === r.n, `start ${te?.lasso_start}, end ${te?.lasso_end}; JSON k=${r.loopStart}, n=${r.n}`);
}

// ---- W0-T02's keyword subset and id pattern, read only, when its modules are present
const draft = JSON.parse(readFileSync(join(repo, ajvSummary.schema.path), 'utf8'));
let subsetCheck = { available: false };
if (existsSync(join(repo, 'schemas/codegen/subset.mjs')) && existsSync(join(repo, 'schemas/codegen/model.mjs'))) {
  const { checkKeywords } = await import(pathToFileURL(join(repo, 'schemas/codegen/subset.mjs')).href);
  const { ID_RE } = await import(pathToFileURL(join(repo, 'schemas/codegen/model.mjs')).href);
  subsetCheck = {
    available: true,
    module: 'schemas/codegen/subset.mjs',
    module_sha256: fileSha('schemas/codegen/subset.mjs'),
    problems: checkKeywords(draft),
    id: draft.$id,
    id_matches_published_pattern: ID_RE.test(draft.$id),
  };
}

// ---- privacy sweep over everything written
const stack = [OUT];
const leaks = [];
while (stack.length) {
  const d = stack.pop();
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) stack.push(p);
    else if (PRIVATE.test(readFileSync(p, 'utf8'))) leaks.push(p.slice(repo.length + 1));
  }
}
check('outputs hold no private path or identifier', leaks.length === 0, leaks.join(', ') || 'clean');

// ---- the record
const record = {
  id: RUN_ID,
  title: "How TLC's JSON trace writes a liveness lasso, on the Hold spec and three more lasso shapes (W0-S05)",
  engine: 'tlc',
  version: '1.8.0',
  version_string: JARS['1.8.0'].banner,
  binary: 'tla2tools.jar of the 1.8.0 pre-release, run with java -jar in the container',
  binary_sha256: JARS['1.8.0'].sha256,
  image: `${IMAGE}@${imageDigest}`,
  recorded_at: new Date().toISOString(),
  started_at: configs[0].started_at,
  primary_config: 'hold-180',
  argv: hold.argv,
  inputs: hold.inputs,
  budget: hold.budget,
  exit_code: hold.exit_code,
  duration_s: hold.duration_s,
  verdict_lines: hold.verdict_lines,
  outputs: hold.outputs,
  environment: {
    os: `Linux ${os.release().split('-')[0]} ${os.arch() === 'x64' ? 'x86_64' : os.arch()}`,
    cpu_count: os.cpus().length,
    ram_gib: Math.round(os.totalmem() / 2 ** 30),
    container: {
      runtime: 'docker',
      server_version: dockerVersion,
      image: IMAGE,
      digest: imageDigest,
      java: javaVersion,
      run_flags: ['--rm', '--memory=6g', '--network=none', '--user <uid>:<gid>', '-v <sandbox>:/work', '-v <jar>:/opt/tla2tools.jar:ro', '-w /work'],
    },
    host_tools: { node: process.version, uv: sh('uv', ['--version']).stdout.trim() },
    emulated: false,
  },
  notes: [
    'Question: how does the pinned 1.8.0 jar write a liveness lasso with -dumpTrace json? Answer on the Hold spec (config hold-180, byte-identical to the recorded Hold.trace.json): the file lists 4 states and 4 steps, and the last step goes from state 4 back to state 1. The file has no loop marker, property name or spec name. docs/spikes/W0-S05.md gives the reading rules.',
    `hold-w4-180 (four workers, ${w4.repeats.length} runs): ${w4.identical_to_hold_180 ? 'the same bytes as hold-180' : 'NOT the same bytes as hold-180'}. The 1.7.4 configs cover the fallback text trace; the HoldStem and HoldNoFair configs are format probes for other lasso shapes, not course material.`,
    `Two equally valid lassos (stem-branches-sweep-180, -fp 0 to -fp 15): the first step was Open(0) for fp ${sweepZero.join(', ')} and Open(1) for fp ${sweepOne.join(', ')}. With -fp 7 (stem-branches-fp-180): ${branchesFp.distinct_traces} distinct trace(s) in ${branchesFp.repeats.length} runs. Without -fp, TLC picks the fingerprint function at random and prints it in the banner; the ${w4.repeats.length} runs of hold-w4-180 printed ${[...new Set(w4.repeats.map((r) => r.fp))].length} different values.`,
    'Every run was in a container with no network on a Linux host. Nothing is emulated. A run takes about half a second, mostly container start-up, so duration_s says little.',
    'Outputs marked informational hold a random seed, timestamps or a generated file name, so a re-run is compared on the JSON traces and verdict_lines only.',
  ],
  configs,
  validation: {
    schema: { path: ajvSummary.schema.path, sha256: ajvSummary.schema.sha256 },
    manifest: { path: 'scripts/spikes/W0-S05/fixtures/manifest.json', sha256: ajvSummary.manifestSha256 },
    recorded_trace: { path: RECORDED_TRACE, sha256: sha256(recordedBytes) },
    tools: validators,
    scripts: ['record.mjs', 'check.mjs', 'lasso-read.mjs', 'check_schema.py', 'package-lock.json'].map((f) => ({
      path: `scripts/spikes/W0-S05/${f}`,
      sha256: fileSha(`scripts/spikes/W0-S05/${f}`),
    })),
    subset_check: subsetCheck,
  },
  checks,
  pass: checks.every((c) => c.pass),
};

const recordText = JSON.stringify(record, null, 2) + '\n';
if (PRIVATE.test(recordText)) die('the run record holds a private path or identifier; not written');
writeFileSync(join(repo, 'runs', `${RUN_ID}.json`), recordText);
console.log(`${record.pass ? 'recorded' : 'recorded with failures'}: runs/${RUN_ID}.json (${configs.length} configs, ${checks.length} checks, ${checks.filter((c) => !c.pass).length} failed)`);
process.exit(record.pass ? 0 : 1);
