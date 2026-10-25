// Records RUN-tlc-tracemodule (W0-S13, docs/spikes/W0-S13.md).
//
// Validates NDJSON traces of a toy outbox against its TLA+ spec by the trace-module method (Cirstea,
// Kuppe, Loillier and Merz, section 4.2; CCF, section 6) with the pinned TLC, each run in a fresh
// container of the pinned image with no network: the three traces the task names (accepted, rejected,
// partial), cross-checks of the verdict, probes for the questions the decision record answers, what the
// tool prints when TLC stops without a verdict, and -loadTrace round trips. Writes
// runs/RUN-tlc-tracemodule.json and runs/RUN-tlc-tracemodule/.
//
//   node scripts/spikes/W0-S13/record.mjs
//
// Needs Docker with the image eclipse-temurin:21-jre, python3 (to list the jars), and the jars committed
// under bench/image/tla2tools/ (TLA2TOOLS_180 and TLA2TOOLS_174 override the paths). Each jar is checked
// against its pin before it runs. Scratch copies go to W0S13_SCRATCH, else the system temp directory.
// Exits 1 when a check fails.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cfgText, lintTrace, parseTlc, tlcProblem, toolLine } from './tv.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const RUN_ID = 'RUN-tlc-tracemodule';
const OUT = join(repo, 'runs', RUN_ID);
const IMAGE = 'eclipse-temurin:21-jre';
const SPIKE = 'scripts/spikes/W0-S13';
const SPECS = `${SPIKE}/specs`;
const SCRATCH = process.env.W0S13_SCRATCH ?? os.tmpdir();

const JARS = {
  '1.8.0': {
    env: 'TLA2TOOLS_180',
    path: 'bench/image/tla2tools/tla2tools-1.8.0.jar',
    sha256: '5bd7b64db99ae4c6c35f290de5e809c0ee41af43f8699cf696099ffb6452b1e2',
    banner: 'TLC2 Version 2026.10.20.183001 (rev: d2e1472)',
  },
  '1.7.4': {
    env: 'TLA2TOOLS_174',
    path: 'bench/image/tla2tools/tla2tools-1.7.4.jar',
    sha256: '936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88',
    banner: 'TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)',
  },
};

// The modules each root module reads; TLC gets all of specs/ in its working directory.
const DEPS = {
  ToyOutboxTrace: ['ToyOutboxTrace', 'ToyOutbox', 'TraceValidation'],
  ToyOutboxTraceComposed: ['ToyOutboxTraceComposed', 'ToyOutbox', 'TraceValidation'],
  PaperIOEnv: ['PaperIOEnv', 'ToyOutbox'],
  ToyOutboxReplay: ['ToyOutboxReplay', 'ToyOutbox'],
  ToyOutbox: ['ToyOutbox'],
  ProbeRegister: ['ProbeRegister'],
};
const HOLD = 'research/evidence/a2r3/tla/live';
const CONSTANTS = 'Cmds = {"c1", "c2"}  MaxAttempts = 2';
const T = (name) => `${SPIKE}/traces/${name}`;
const P = (name) => `${SPIKE}/traces/probes/${name}`;
const CDOT = '-Dtlc2.tool.impl.Tool.cdot=true';
const DFS = '-Dtlc2.tool.queue.IStateQueue=StateDeque';

// The traces the task names, in the order of the decision record.
const PRIMARY = ['accepted', 'rejected', 'partial'];
// The logged steps a witness of the accepted trace must take, in order (one per line).
const ACCEPTED_STEPS = ['IsCommit', 'IsCommit', 'IsDispatch', 'IsTimer', 'IsDispatch', 'IsDispatch', 'IsPersist', 'IsPersist', 'IsAck', 'IsAck', 'IsEnd'];

const v = (verdict, lines, matched, firstUnmatched, endRecord, extra = {}) => ({ verdict, lines, matched, first_unmatched: firstUnmatched, end_record: endRecord, ...extra });

// One entry per TLC execution. kind: trace (a trace module with a trace), paper, replay, hold, spec.
const CONFIGS = [
  // ---- the three traces
  { id: 'accepted', kind: 'trace', module: 'ToyOutboxTrace', trace: T('accepted.ndjson'), repeats: 3, exit: 0,
    expect: v('accepted', 11, 11, 0, true, { paper_accepted: false }),
    purpose: 'the accepted trace: two commands, a re-send of c1 with the same key, an implementation-only timer line and the end record; the provider steps are unlogged' },
  { id: 'rejected', kind: 'trace', module: 'ToyOutboxTrace', trace: T('rejected.ndjson'), repeats: 3, exit: 10,
    expect: v('rejected', 11, 7, 8, true, { paper_accepted: false }), text: ['Error: Postcondition TraceVerdict at '],
    purpose: 'the rejected trace: the ack-before-store mutant (SP-8.4 shape) acknowledges c1 at line 8 before it stores c1\'s result' },
  { id: 'partial', kind: 'trace', module: 'ToyOutboxTrace', trace: T('partial.ndjson'), repeats: 3, exit: 10,
    expect: v('partial', 8, 8, 0, false, { paper_accepted: false }),
    purpose: 'the partial trace: the accepted log cut after its eighth line, with no acknowledgement and no end record' },
  // ---- cross-checks of the verdict
  { id: 'accepted-dump', kind: 'trace', module: 'ToyOutboxTrace', trace: T('accepted.ndjson'), extraArgs: ['-dump', 'states'], collect: [/^states\.dump$/], dumpOf: 'accepted',
    purpose: 'the accepted trace with -dump: the highest line counter among all states TLC found, read from the state list, must equal the verdict\'s' },
  { id: 'rejected-dump', kind: 'trace', module: 'ToyOutboxTrace', trace: T('rejected.ndjson'), extraArgs: ['-dump', 'states'], collect: [/^states\.dump$/], dumpOf: 'rejected',
    purpose: 'the same for the rejected trace' },
  { id: 'partial-dump', kind: 'trace', module: 'ToyOutboxTrace', trace: T('partial.ndjson'), extraArgs: ['-dump', 'states'], collect: [/^states\.dump$/], dumpOf: 'partial',
    purpose: 'the same for the partial trace' },
  { id: 'rejected-w4', kind: 'trace', module: 'ToyOutboxTrace', trace: T('rejected.ndjson'), workers: 4, sameAs: 'rejected',
    purpose: 'the rejected trace with four workers: the postcondition folds the per-worker registers' },
  { id: 'accepted-dfs', kind: 'trace', module: 'ToyOutboxTrace', trace: T('accepted.ndjson'), jvm: [DFS], sameAs: 'accepted', queue: 'StateDeque',
    purpose: 'the accepted trace with TLC\'s last-in-first-out state queue (depth-first order), which CCF reports as much faster on long traces' },
  { id: 'rejected-dfs', kind: 'trace', module: 'ToyOutboxTrace', trace: T('rejected.ndjson'), jvm: [DFS], sameAs: 'rejected', queue: 'StateDeque',
    purpose: 'the same for the rejected trace' },
  // ---- two other ways to ask whether some behavior consumes every line
  { id: 'accepted-witness', kind: 'trace', module: 'ToyOutboxTrace', trace: T('accepted.ndjson'), mode: 'witness', exit: 12,
    extraArgs: ['-dumpTrace', 'json', 'witness.json'], collect: [/^witness\.json$/], text: ['Error: Invariant TraceUnconsumed is violated.'],
    purpose: 'the accepted trace with the invariant l <= Len(TraceLog): its violation is a behavior that consumes every line, written as JSON' },
  { id: 'accepted-possible', kind: 'trace', module: 'ToyOutboxTrace', trace: T('accepted.ndjson'), mode: 'possible', exit: 0,
    text: ['Model checking completed. No error has been found.'],
    purpose: 'the accepted trace under TLC\'s provisional _POSSIBLE check of l = Len(TraceLog) + 1' },
  { id: 'rejected-possible', kind: 'trace', module: 'ToyOutboxTrace', trace: T('rejected.ndjson'), mode: 'possible', exit: 10,
    text: ['Error: The _POSSIBLE predicate TraceConsumed at ', 'was never witnessed.'],
    purpose: 'the rejected trace under the same check' },
  // ---- search depth against the line counter
  { id: 'rejected-noend', kind: 'trace', module: 'ToyOutboxTrace', trace: P('rejected-noend.ndjson'), exit: 10,
    expect: v('rejected', 10, 7, 8, false, { paper_accepted: true }),
    purpose: 'the rejected trace without its end record, as the paper\'s logs are: does the paper\'s postcondition, diameter - 1 = Len(Trace), accept it?' },
  { id: 'composed-accepted', kind: 'trace', module: 'ToyOutboxTraceComposed', trace: T('accepted.ndjson'), jvm: [CDOT], exit: 0, composedOf: 'accepted',
    expect: v('accepted', 11, 11, 0, true, { paper_accepted: true }),
    purpose: 'the accepted trace against the composition variant, where every step consumes a line (Java property tlc2.tool.impl.Tool.cdot=true)' },
  { id: 'composed-rejected', kind: 'trace', module: 'ToyOutboxTraceComposed', trace: T('rejected.ndjson'), jvm: [CDOT], exit: 10, composedOf: 'rejected',
    expect: v('rejected', 11, 7, 8, true, { paper_accepted: false }), purpose: 'the rejected trace against the composition variant' },
  { id: 'composed-partial', kind: 'trace', module: 'ToyOutboxTraceComposed', trace: T('partial.ndjson'), jvm: [CDOT], exit: 10, composedOf: 'partial',
    expect: v('partial', 8, 8, 0, false, { paper_accepted: true }), purpose: 'the partial trace against the composition variant' },
  { id: 'composed-rejected-noend', kind: 'trace', module: 'ToyOutboxTraceComposed', trace: P('rejected-noend.ndjson'), jvm: [CDOT], exit: 10, composedOf: 'rejected-noend',
    expect: v('rejected', 10, 7, 8, false, { paper_accepted: false }), purpose: 'the rejected trace without its end record against the composition variant' },
  { id: 'composed-no-flag', kind: 'trace', module: 'ToyOutboxTraceComposed', trace: T('accepted.ndjson'), exit: 75,
    text: ['Error: TLC threw an unexpected exception.', 'The current version of TLC does not support action composition.'],
    toolLine: 'trace traces/accepted.ndjson: error: The current version of TLC does not support action composition.  An incomplete implementation can be enabled via the tlc2.tool.impl.Tool.cdot=true java property.',
    purpose: 'the composition variant without the Java property' },
  // ---- what the log carries
  { id: 'missing-event', kind: 'trace', module: 'ToyOutboxTrace', trace: P('missing-event.ndjson'), exit: 10,
    expect: v('rejected', 8, 5, 6, true), purpose: 'a log that omits c2\'s Dispatch, between its lines 2 and 3' },
  { id: 'fresh-key', kind: 'trace', module: 'ToyOutboxTrace', trace: P('fresh-key.ndjson'), exit: 10,
    expect: v('rejected', 7, 3, 4, true), purpose: 'the fresh-key mutant (SP-8.3 shape): the re-send at line 4 carries a new key, and the log records keys' },
  { id: 'fresh-key-unlogged', kind: 'trace', module: 'ToyOutboxTrace', trace: P('fresh-key-unlogged.ndjson'), exit: 0,
    expect: v('accepted', 7, 7, 0, true), purpose: 'the same mutant\'s log with the key fields dropped' },
  { id: 'cut-line', kind: 'trace', module: 'ToyOutboxTrace', trace: P('cut-line.ndjson'), exit: 75, lintLine: 8,
    text: ['MalformedJsonException'], purpose: 'a log cut in the middle of its eighth line' },
  // ---- TLC's deadlock check
  { id: 'accepted-deadlock', kind: 'trace', module: 'ToyOutboxTrace', trace: T('accepted.ndjson'), deadlock: true, exit: 11,
    text: ['Error: Deadlock reached.'], purpose: 'the accepted trace with TLC\'s deadlock check left on' },
  { id: 'rejected-deadlock', kind: 'trace', module: 'ToyOutboxTrace', trace: T('rejected.ndjson'), deadlock: true, exit: 11,
    text: ['Error: Deadlock reached.'], purpose: 'the rejected trace with TLC\'s deadlock check left on' },
  // ---- what the jars bundle
  { id: 'paper-ioenv', kind: 'paper', module: 'PaperIOEnv', trace: T('accepted.ndjson'), env: { TRACE_PATH: 'accepted.ndjson' }, exit: 150,
    text: ['Cannot find source file for module IOUtils imported in module PaperIOEnv.'],
    purpose: 'the paper\'s and CCF\'s IOEnv.TRACE_PATH idiom on the pinned 1.8.0 jar' },
  { id: 'accepted-174', kind: 'trace', module: 'ToyOutboxTrace', trace: T('accepted.ndjson'), jar: '1.7.4', exit: 150,
    text: ['Cannot find source file for module Json imported in module TraceValidation.', 'Error: Parsing or semantic analysis failed.'],
    toolLine: 'trace traces/accepted.ndjson: error: Cannot find source file for module Json imported in module TraceValidation.',
    purpose: 'the accepted trace on the 1.7.4 fallback jar' },
  // ---- what the tool prints when TLC stops without a verdict: a learner's slip in the trace module
  { id: 'typo-syntax', kind: 'trace', module: 'ToyOutboxTrace', trace: T('accepted.ndjson'), exit: 150,
    edit: ['IsAck      == IsEvent("Ack")', 'IsAck      = IsEvent("Ack")'],
    text: ['***Parse Error***', 'Error: Parsing or semantic analysis failed.'],
    toolLine: 'trace traces/accepted.ndjson: error: Encountered "IsAck" at line 23, column 1 and token ")" (module ToyOutboxTrace)',
    purpose: 'the trace module with a syntax error: IsAck defined with = instead of ==' },
  { id: 'typo-operator', kind: 'trace', module: 'ToyOutboxTrace', trace: T('accepted.ndjson'), exit: 150,
    edit: ['IsAck      == IsEvent("Ack")', 'IsAck      == IsEvnt("Ack")'],
    text: ['Unknown operator: `IsEvnt\'.', 'Error: Parsing or semantic analysis failed.'],
    toolLine: 'trace traces/accepted.ndjson: error: Unknown operator: `IsEvnt\'. (line 23, col 15 to line 23, col 20 of module ToyOutboxTrace)',
    purpose: 'the trace module with a semantic error: IsEvent misspelt in IsAck' },
  { id: 'typo-field', kind: 'trace', module: 'ToyOutboxTrace', trace: T('accepted.ndjson'), exit: 75,
    edit: ['IsAck      == IsEvent("Ack") /\\ Line.cmd \\in Cmds', 'IsAck      == IsEvent("Ack") /\\ Line.cmmd \\in Cmds'],
    text: ['Error: TLC threw an unexpected exception.', 'Attempted to select nonexistent field "cmmd" from the record'],
    toolLine: 'trace traces/accepted.ndjson: error: Attempted to select nonexistent field "cmmd" from the record [cmd |-> "c2", event |-> "Ack"] (line 23, col 33 to line 23, col 41 of module ToyOutboxTrace)',
    purpose: 'the trace module with an evaluation error: IsAck reads a field the log\'s lines do not have (cmmd for cmd)' },
  // ---- the named registers the verdict uses
  { id: 'register-plain', kind: 'register', module: 'ProbeRegister', registerName: 'reach', exit: 75,
    text: ['Error: The first argument of TLCSet should be a nonnegative integer, but instead it is:'],
    purpose: 'a named register without the "s:" prefix' },
  { id: 'register-prefixed', kind: 'register', module: 'ProbeRegister', registerName: 's:reach', exit: 0,
    text: ['<<"registers", ("s:reach" :> <<3>>)>>'],
    purpose: 'the same register named "s:reach", read back with TLCGet("all:named") in a postcondition, one worker' },
  { id: 'register-prefixed-w4', kind: 'register', module: 'ProbeRegister', registerName: 's:reach', workers: 4, exit: 0, perWorker: 4,
    purpose: 'the same with four workers: TLCGet("all:named") holds one value per worker' },
  // ---- -loadTrace round trips
  { id: 'replay-dump', kind: 'replay', module: 'ToyOutboxReplay', exit: 12, extraArgs: ['-dumpTrace', 'json', 'replay.json'],
    collect: [/^replay\.json$/, /^ToyOutboxReplay_TTrace_\d+\.bin$/], text: ['Error: Invariant NothingAcked is violated.'],
    purpose: 'a counterexample to dump: the outbox with one command, NothingAcked as the invariant; TLC writes the JSON trace and, beside its trace-exploration spec, a binary trace' },
  { id: 'replay-json', kind: 'replay', module: 'ToyOutboxReplay', exit: 75, extraArgs: ['-loadTrace', 'json', 'replay.json'],
    from: { 'replay.json': ['replay-dump', /^replay\.json$/] }, text: ['Attempted to check equality of the set {} with the value:'],
    purpose: 'the JSON counterexample loaded back with -loadTrace json' },
  { id: 'replay-bin', kind: 'replay', module: 'ToyOutboxReplay', exit: 12, extraArgs: ['-loadTrace', 'tlc', 'replay.bin'],
    from: { 'replay.bin': ['replay-dump', /^ToyOutboxReplay_TTrace_\d+\.bin$/] }, text: ['Error: Invariant NothingAcked is violated.'],
    purpose: 'the binary trace of the same counterexample loaded back with -loadTrace tlc' },
  { id: 'hold-json', kind: 'hold', exit: 13, extraArgs: ['-loadTrace', 'json', 'Hold.trace.json'],
    text: ['Error: Temporal property EventuallyResolves was violated.', 'Back to state 1: '],
    purpose: 'the recorded Hold lasso (integers and strings only) loaded back with -loadTrace json' },
  { id: 'hold-json-tampered', kind: 'hold', exit: 0, extraArgs: ['-loadTrace', 'json', 'Hold.tampered.json'], tamper: true,
    text: ['Model checking completed. No error has been found.'],
    purpose: 'the same lasso with one value changed in state 3 (tries 1 to 2, in every copy)' },
  // ---- the spec alone
  { id: 'toy-spec', kind: 'spec', module: 'ToyOutbox', exit: 0, text: ['Model checking completed. No error has been found.'],
    purpose: 'the toy spec itself at the traces\' constants: TypeOK, AckedIsDurable and NoDoubleCharge, deadlock check off' },
];

// ---------------------------------------------------------------------------------------- helpers
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PRIVATE = new RegExp(['/home/', '/Users/', '/tmp/claude', os.userInfo().username].filter((t) => t.length > 2).map(escapeRe).join('|'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fileSha = (rel) => sha256(readFileSync(join(repo, rel)));
const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', cwd: repo, maxBuffer: 64 * 1024 * 1024, ...opts });
const die = (msg) => {
  console.error(msg);
  process.exit(2);
};
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
// TLC unpacks its standard modules to a fresh /tmp/tlc-<n> directory inside the container.
const normalize = (text) => text.replace(/\/tmp\/tlc-\d+/g, '<tlc-temp>');

// Verdict lines are copied verbatim from the tool's output (spine 9.4).
const VERDICT = [/^TLC2 Version /, /^<<"trace-validation", /, /^<<"registers", /, /^Error: /, /^Model checking completed\./, /^\d+ states? generated, /,
  /^The depth of the complete state graph search is /, /^"CounterExample written: /, /^State \d+: </, /^Back to state \d+: /,
  /^: The current version of TLC does not support action composition\./, /MalformedJsonException/,
  /^Cannot find source file for module /, /^Attempted to check equality of the set /,
  /^\*\*\*Parse Error\*\*\*$/, /^Encountered "/, /^Unknown operator: /, /^: Attempted to select nonexistent field /,
  /^line \d+, col \d+ to line \d+, col \d+ of module /];
const verdictLines = (stdout) => stdout.split('\n').filter((l) => VERDICT.some((re) => re.test(l)));

const files = {}; // config id -> { name: bytes } collected from its work directory

function cfgFor(c, traceName) {
  if (c.kind === 'trace') return cfgText({ constants: CONSTANTS, traceFile: traceName, mode: c.mode ?? 'verdict', deadlock: c.deadlock ?? false });
  if (c.kind === 'paper') return `CONSTANTS ${CONSTANTS}\nSPECIFICATION TraceSpec\nCHECK_DEADLOCK FALSE\n`;
  if (c.kind === 'replay') return 'CONSTANTS Cmds = {"c1"}  MaxAttempts = 2\nINIT Init\nNEXT Next\nINVARIANT NothingAcked\n';
  if (c.kind === 'spec') return `CONSTANTS ${CONSTANTS}\nINIT Init\nNEXT Next\nINVARIANT TypeOK\nINVARIANT AckedIsDurable\nINVARIANT NoDoubleCharge\nCHECK_DEADLOCK FALSE\n`;
  if (c.kind === 'register') return `CONSTANTS Name = ${JSON.stringify(c.registerName)}\nINIT Init\nNEXT Next\nPOSTCONDITION Registers\nCHECK_DEADLOCK FALSE\n`;
  return null; // hold: the recorded config
}

// The recorded Hold lasso with state 3's `tries` changed from 1 to 2 wherever state 3 is written.
function tamperHold(bytes) {
  const doc = JSON.parse(bytes.toString('utf8'));
  const walk = (o) => {
    if (Array.isArray(o)) {
      if (o.length === 2 && o[0] === 3 && o[1] && typeof o[1] === 'object' && !Array.isArray(o[1]) && 'tries' in o[1]) o[1].tries = 2;
      o.forEach(walk);
    } else if (o && typeof o === 'object') Object.values(o).forEach(walk);
  };
  walk(doc);
  return Buffer.from(JSON.stringify(doc));
}

function runTlc(c, jarPath) {
  const work = mkdtempSync(join(SCRATCH, `w0s13-${c.id}-`));
  try {
    const inputs = [];
    let module = c.module;
    let cfgName = `${c.id}.cfg`;
    let traceName = null;
    if (c.kind === 'hold') {
      for (const f of ['Hold.tla', 'Hold.cfg', 'Hold.trace.json']) {
        copyFileSync(join(repo, HOLD, f), join(work, f));
        inputs.push({ path: `${HOLD}/${f}`, sha256: fileSha(`${HOLD}/${f}`), role: f.endsWith('.tla') ? 'spec' : f.endsWith('.cfg') ? 'config' : 'trace to load' });
      }
      module = 'Hold';
      cfgName = 'Hold.cfg';
      if (c.tamper) writeFileSync(join(work, 'Hold.tampered.json'), tamperHold(readFileSync(join(work, 'Hold.trace.json'))));
    } else {
      for (const f of readdirSync(join(repo, SPECS))) if (f.endsWith('.tla')) copyFileSync(join(repo, SPECS, f), join(work, f));
      const rootRole = c.edit ? 'spec (root module before the edit; the edited copy is saved with the outputs)' : 'spec (root module)';
      for (const m of DEPS[c.module]) inputs.push({ path: `${SPECS}/${m}.tla`, sha256: fileSha(`${SPECS}/${m}.tla`), role: m === c.module ? rootRole : 'spec' });
      if (c.edit) {
        // A learner's slip: one exact text replaced, in the work copy of the root module only.
        const [from, to] = c.edit;
        const file = join(work, `${c.module}.tla`);
        const text = readFileSync(file, 'utf8');
        if (text.split(from).length !== 2) throw new Error(`${c.id}: the edit's text must occur exactly once in ${c.module}.tla`);
        writeFileSync(file, text.replace(from, () => to));
      }
      if (c.trace) {
        traceName = basename(c.trace);
        copyFileSync(join(repo, c.trace), join(work, traceName));
        inputs.push({ path: c.trace, sha256: fileSha(c.trace), role: 'trace' });
      }
      writeFileSync(join(work, cfgName), cfgFor(c, traceName));
    }
    for (const [name, [fromId, re]] of Object.entries(c.from ?? {})) {
      const src = Object.entries(files[fromId] ?? {}).find(([n]) => re.test(n));
      if (!src) throw new Error(`${c.id}: ${fromId} wrote no file matching ${re}`);
      writeFileSync(join(work, name), src[1]);
    }
    const tlc = ['-workers', String(c.workers ?? 1), ...(c.extraArgs ?? []), '-config', cfgName, `${module}.tla`];
    const argv = ['java', '-XX:+UseParallelGC', ...(c.jvm ?? []), '-jar', '/opt/tla2tools.jar', ...tlc];
    const envArgs = Object.entries(c.env ?? {}).flatMap(([k, val]) => ['-e', `${k}=${val}`]);
    const docker = ['run', '--rm', '--memory=6g', '--network=none', '--user', `${process.getuid()}:${process.getgid()}`, ...envArgs,
      '-v', `${work}:/work`, '-v', `${jarPath}:/opt/tla2tools.jar:ro`, '-w', '/work', IMAGE, ...argv];
    const startedAt = new Date().toISOString();
    const t0 = process.hrtime.bigint();
    const r = sh('docker', docker, { timeout: 120_000 });
    const durationS = Math.round(Number(process.hrtime.bigint() - t0) / 1e6) / 1000;
    const collected = {};
    for (const f of readdirSync(work)) if ((c.collect ?? []).some((re) => re.test(f))) collected[f] = readFileSync(join(work, f));
    const cfgBytes = readFileSync(join(work, cfgName));
    // Inputs record.mjs derived for this run, saved with the outputs: { name: { bytes, kind, role } }.
    const extraInputs = {};
    const toLoad = (name) => ({ bytes: readFileSync(join(work, name)), kind: 'file given to -loadTrace, saved with the outputs', role: 'trace to load' });
    if (c.tamper) extraInputs['Hold.tampered.json'] = toLoad('Hold.tampered.json');
    for (const name of Object.keys(c.from ?? {})) extraInputs[name] = toLoad(name);
    if (c.edit) {
      extraInputs[`${c.module}.tla`] = { bytes: readFileSync(join(work, `${c.module}.tla`)), kind: 'the root module as record.mjs edited it, saved with the outputs', role: 'spec (root module as run)' };
    }
    return { argv, envArgs, startedAt, durationS, exitCode: r.status, stdout: normalize(r.stdout ?? ''), stderr: normalize(r.stderr ?? ''),
      collected, cfgName, cfgBytes, inputs, extraInputs, traceName };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------- preflight
const jarPaths = {};
for (const [version, j] of Object.entries(JARS)) {
  const p = resolve(process.env[j.env] ?? join(repo, j.path));
  if (!existsSync(p)) die(`no tla2tools ${version} jar at ${j.path}; set ${j.env}`);
  const got = sha256(readFileSync(p));
  if (got !== j.sha256) die(`tla2tools ${version}: SHA-256 ${got} is not the pin ${j.sha256}`);
  jarPaths[version] = p;
}
const inspect = sh('docker', ['image', 'inspect', IMAGE, '--format', '{{index .RepoDigests 0}}']);
if (inspect.status !== 0) die(`image ${IMAGE} is not available locally`);
const imageDigest = inspect.stdout.trim().split('@')[1];
const javaVersion = sh('docker', ['run', '--rm', '--memory=1g', '--network=none', IMAGE, 'java', '-version']).stderr.split('\n').find((l) => l.startsWith('OpenJDK 64-Bit'));
const dockerVersion = sh('docker', ['version', '--format', '{{.Server.Version}}']).stdout.trim();

// What each jar bundles: the standard modules and the Java overrides behind them.
const LIST_JAR = `
import hashlib, json, sys, zipfile
out = {}
for path in sys.argv[1:]:
    z = zipfile.ZipFile(path)
    names = z.namelist()
    mods = sorted(n.rsplit('/', 1)[1] for n in names if n.startswith('tla2sany/StandardModules/') and n.endswith('.tla'))
    over = sorted(n.rsplit('/', 1)[1] for n in names if n.startswith('tlc2/module/') and n.endswith('.class') and '$' not in n)
    sha = {m: hashlib.sha256(z.read('tla2sany/StandardModules/' + m)).hexdigest() for m in ('Json.tla', 'TLCExt.tla') if m in mods}
    json_text = z.read('tla2sany/StandardModules/Json.tla').decode() if 'Json.tla' in mods else ''
    out[path] = {'standard_modules': mods, 'java_overrides': over, 'sha256': sha, 'json_declares_ndJsonDeserialize': 'ndJsonDeserialize(absoluteFilename) ==' in json_text}
print(json.dumps(out))
`;
const listed = sh('python3', ['-I', '-c', LIST_JAR, jarPaths['1.8.0'], jarPaths['1.7.4']]);
if (listed.status !== 0) die(`could not list the jars: ${listed.stderr}`);
const jarListing = JSON.parse(listed.stdout);
const pythonVersion = sh('python3', ['--version']).stdout.trim();
const bundled = Object.fromEntries(Object.entries(JARS).map(([version, j]) => {
  const l = jarListing[jarPaths[version]];
  return [version, {
    jar: j.path,
    jar_sha256: j.sha256,
    standard_modules: l.standard_modules,
    java_overrides: l.java_overrides,
    json_tla_sha256: l.sha256['Json.tla'] ?? null,
    tlcext_tla_sha256: l.sha256['TLCExt.tla'] ?? null,
    json_declares_ndJsonDeserialize: l.json_declares_ndJsonDeserialize,
    has_ioutils: l.standard_modules.includes('IOUtils.tla'),
  }];
}));

// ---------------------------------------------------------------------------------------- run TLC
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const checks = [];
const check = (id, pass, detail) => {
  checks.push({ id, pass: Boolean(pass), detail: String(detail) });
  if (!pass) console.error(`CHECK FAILED ${id}: ${detail}`);
};
const configs = [];
const byId = {};
for (const c of CONFIGS) {
  const jarVersion = c.jar ?? '1.8.0';
  const jar = JARS[jarVersion];
  const runs = Array.from({ length: c.repeats ?? 1 }, () => runTlc(c, jarPaths[jarVersion]));
  const first = runs[0];
  files[c.id] = first.collected;
  const parsed = runs.map((r) => parseTlc(r.stdout));
  const p0 = parsed[0];
  const dir = join(OUT, c.id);
  mkdirSync(dir, { recursive: true });
  const outputs = [];
  const put = (name, bytes, kind, compare) => {
    writeFileSync(join(dir, name), bytes);
    outputs.push({ path: `runs/${RUN_ID}/${c.id}/${name}`, sha256: sha256(bytes), bytes: bytes.length, kind, compare });
  };
  put('tlc.stdout.txt', first.stdout, 'tlc stdout', 'informational: the banner carries a random seed and the run prints timestamps');
  if (first.stderr) put('tlc.stderr.txt', first.stderr, 'tlc stderr', 'informational');
  const inputs = [...first.inputs];
  if (c.kind !== 'hold') {
    put(first.cfgName, first.cfgBytes, 'tlc config, written by record.mjs', 'bytes');
    inputs.push({ path: `runs/${RUN_ID}/${c.id}/${first.cfgName}`, sha256: sha256(first.cfgBytes), role: 'config (written by record.mjs, saved with the outputs)' });
  }
  for (const [name, { bytes, kind, role }] of Object.entries(first.extraInputs)) {
    put(name, bytes, kind, 'bytes');
    inputs.push({ path: `runs/${RUN_ID}/${c.id}/${name}`, sha256: sha256(bytes), role });
  }
  for (const [name, bytes] of Object.entries(first.collected)) {
    const kind = name.endsWith('.dump') ? 'tlc state list (-dump)' : name.endsWith('.bin') ? 'tlc binary trace (written beside the trace-exploration spec)' : 'tlc json trace';
    const compare = name.endsWith('.json') || name.endsWith('.dump') ? 'bytes' : 'informational: gzip header';
    put(name, bytes, kind, compare);
  }

  // ---- per-config checks
  check(`${c.id}: jar banner`, p0.banner === jar.banner, p0.banner);
  if (c.exit !== undefined) check(`${c.id}: exit code`, runs.every((r) => r.exitCode === c.exit), runs.map((r) => r.exitCode).join(','));
  for (const t of c.text ?? []) check(`${c.id}: output says "${t}"`, first.stdout.includes(t), t);
  if (c.expect) {
    const got = p0.verdict;
    check(`${c.id}: verdict line printed`, got !== null, got ? 'present' : 'absent');
    for (const [k, want] of Object.entries(c.expect)) check(`${c.id}: ${k}`, got?.[k] === want, `${got?.[k]} (expected ${want})`);
  }
  if (c.queue) check(`${c.id}: state queue`, p0.queue === c.queue, p0.queue);
  if (runs.length > 1) {
    const rows = parsed.map((p) => JSON.stringify([p.verdict, p.distinct, p.generated, p.depth]));
    check(`${c.id}: ${runs.length} repeats agree on verdict and counts`, new Set(rows).size === 1, rows[0]);
  }
  let lint = null;
  let rawLines = null;
  if (c.trace) {
    const bytes = readFileSync(join(repo, c.trace));
    lint = lintTrace(bytes);
    rawLines = bytes.toString('utf8').split('\n');
    if (c.lintLine) check(`${c.id}: the lint names line ${c.lintLine}`, lint.problems[0]?.line === c.lintLine, JSON.stringify(lint.problems));
    else check(`${c.id}: the lint finds no problem`, lint.problems.length === 0, JSON.stringify(lint.problems));
    if (p0.verdict) check(`${c.id}: lint and TLC agree on the line count and the end record`, lint.lines === p0.verdict.lines && lint.endRecord === p0.verdict.end_record, `${lint.lines}/${lint.endRecord}`);
  }

  const entry = {
    id: c.id,
    purpose: c.purpose,
    engine: 'tlc',
    version: jarVersion,
    version_string: jar.banner,
    binary_sha256: jar.sha256,
    argv: first.argv,
    ...(first.envArgs.length > 0 && { container_env: first.envArgs.filter((a) => a !== '-e') }),
    cwd: '/work',
    inputs,
    budget: { workers: c.workers ?? 1, container_memory: '6g', network: 'none', timeout_s: 120 },
    started_at: first.startedAt,
    duration_s: first.durationS,
    exit_code: first.exitCode,
    verdict_lines: verdictLines(first.stdout),
    outputs,
    tlc: { states_generated: p0.generated, distinct_states: p0.distinct, left_on_queue: p0.leftOnQueue, depth: p0.depth, state_queue: p0.queue, finished_in: p0.finished },
    ...(p0.verdict && { trace_validation: p0.verdict }),
    ...(lint && { lint: { lines: lint.lines, end_record: lint.endRecord, problems: lint.problems } }),
    ...(c.kind === 'trace' && (c.mode ?? 'verdict') === 'verdict' && !c.deadlock && { tool_line: toolLine(c.trace.replace(`${SPIKE}/`, ''), lint, p0, rawLines) }),
    ...(runs.length > 1 && {
      repeats: runs.map((r, i) => ({ started_at: r.startedAt, duration_s: r.durationS, exit_code: r.exitCode, distinct_states: parsed[i].distinct })),
      median_duration_s: median(runs.map((r) => r.durationS)),
    }),
  };
  if (c.toolLine) check(`${c.id}: the tool prints the expected line`, entry.tool_line === c.toolLine, entry.tool_line);
  configs.push(entry);
  byId[c.id] = { c, entry, p0, first };
}

// ---------------------------------------------------------------------------------------- cross-config checks
const V = (id) => byId[id].p0.verdict;
for (const c of CONFIGS) {
  const { entry, p0, first } = byId[c.id];
  if (c.dumpOf) {
    const text = first.collected['states.dump'].toString('utf8');
    const states = (text.match(/^State \d+:$/gm) ?? []).length;
    const maxL = Math.max(...[...text.matchAll(/^\/\\ l = (\d+)$/gm)].map((m) => Number(m[1])));
    entry.dump = { states, highest_l: maxL };
    check(`${c.id}: the state list holds TLC's distinct states`, states === p0.distinct, `${states} listed, ${p0.distinct} distinct`);
    check(`${c.id}: the highest l in the state list is the verdict's matched + 1`, maxL === V(c.dumpOf).matched + 1, `highest l ${maxL}; ${c.dumpOf} matched ${V(c.dumpOf).matched}`);
  }
  if (c.sameAs) {
    const a = byId[c.sameAs].p0;
    check(`${c.id}: same verdict as ${c.sameAs}`, JSON.stringify(p0.verdict) === JSON.stringify(a.verdict), JSON.stringify(p0.verdict));
    check(`${c.id}: same distinct states as ${c.sameAs}`, p0.distinct === a.distinct, `${p0.distinct} and ${a.distinct}`);
  }
  if (c.composedOf) {
    const a = V(c.composedOf);
    const b = p0.verdict;
    check(`${c.id}: same verdict and lines as the unlogged-step module`, b.verdict === a.verdict && b.matched === a.matched && b.first_unmatched === a.first_unmatched, `${b.verdict} ${b.matched} ${b.first_unmatched}`);
    check(`${c.id}: every step consumes a line (diameter = matched + 1)`, b.diameter === b.matched + 1, `diameter ${b.diameter}, matched ${b.matched}`);
    entry.unlogged_module_diameter = a.diameter;
  }
  if (c.kind === 'trace' && p0.verdict && !c.composedOf && c.module === 'ToyOutboxTrace') {
    entry.unlogged_steps_on_deepest_path = p0.verdict.diameter - 1 - p0.verdict.matched;
  }
  if (c.perWorker) {
    const row = first.stdout.match(/^<<"registers", \("s:reach" :> <<([\d, ]*)>>\)>>$/m);
    const perWorker = row ? row[1].split(',').map((s) => Number(s.trim())) : [];
    entry.register_values = perWorker;
    check(`${c.id}: one register value per worker`, perWorker.length === c.perWorker, row ? row[0] : 'no registers line');
  }
}
// the paper's postcondition on the unlogged-step module: wrong both ways
check('accepted: the paper\'s postcondition rejects an accepted trace when steps are unlogged', V('accepted').verdict === 'accepted' && V('accepted').paper_accepted === false, `diameter ${V('accepted').diameter}, lines ${V('accepted').lines}`);
check('rejected-noend: the paper\'s postcondition accepts a rejected trace when steps are unlogged', V('rejected-noend').verdict === 'rejected' && V('rejected-noend').paper_accepted === true, `diameter ${V('rejected-noend').diameter}, lines ${V('rejected-noend').lines}`);
// the witness of the accepted trace
{
  const w = JSON.parse(byId['accepted-witness'].first.collected['witness.json'].toString('utf8'));
  const names = w.counterexample.action.map((a) => a[1].name);
  const logged = names.filter((n) => n !== 'ProviderStep');
  byId['accepted-witness'].entry.witness = { states: w.counterexample.state.length, steps: names.length, provider_steps: names.length - logged.length, step_names: names };
  check('accepted-witness: the witness takes one logged step per line, in order', JSON.stringify(logged) === JSON.stringify(ACCEPTED_STEPS), logged.join(','));
  check('accepted-witness: the witness fills in provider steps', names.length > logged.length, `${names.length - logged.length} provider steps`);
}
// -loadTrace
{
  const dumped = JSON.parse(byId['replay-dump'].first.collected['replay.json'].toString('utf8'));
  const n = dumped.counterexample.state.length;
  byId['replay-dump'].entry.dumped_states = n;
  check('replay-dump: a binary trace is written beside the trace-exploration spec', Object.keys(byId['replay-dump'].first.collected).some((f) => f.endsWith('.bin')), Object.keys(byId['replay-dump'].first.collected).join(','));
  check('replay-json: no state survives the constraint', byId['replay-json'].p0.distinct === 0, `${byId['replay-json'].p0.distinct} distinct`);
  check('replay-bin: the search is held to the dumped states', byId['replay-bin'].p0.distinct === n, `${byId['replay-bin'].p0.distinct} distinct, ${n} dumped`);
}
// what the tool would quote for two stops it does not print here: paper-ioenv is not a trace config, and
// for cut-line the lint names the line before TLC runs
{
  const paper = tlcProblem(byId['paper-ioenv'].first.stdout);
  check('paper-ioenv: the tool would quote SANY\'s message, not TLC\'s first Error: line', paper === 'Cannot find source file for module IOUtils imported in module PaperIOEnv.', paper);
  const cut = tlcProblem(byId['cut-line'].first.stdout);
  check('cut-line: without the lint, the tool would quote the JSON reader, whose position counts within the bad line', cut.startsWith('com.google.gson.stream.MalformedJsonException: Unterminated string at line 1 column 23 '), cut);
}
// the bundled modules
check('1.8.0 bundles Json.tla, which declares ndJsonDeserialize', bundled['1.8.0'].standard_modules.includes('Json.tla') && bundled['1.8.0'].json_declares_ndJsonDeserialize, bundled['1.8.0'].json_tla_sha256);
check('1.8.0 bundles TLCExt.tla', bundled['1.8.0'].standard_modules.includes('TLCExt.tla'), bundled['1.8.0'].tlcext_tla_sha256);
check('1.8.0 does not bundle IOUtils.tla', !bundled['1.8.0'].has_ioutils, 'absent');
check('1.7.4 bundles neither Json.tla nor TLCExt.tla nor IOUtils.tla', !['Json.tla', 'TLCExt.tla', 'IOUtils.tla'].some((m) => bundled['1.7.4'].standard_modules.includes(m)), bundled['1.7.4'].standard_modules.join(','));

// ---------------------------------------------------------------------------------------- privacy sweep
const stack = [OUT];
const leaks = [];
while (stack.length) {
  const d = stack.pop();
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) stack.push(p);
    else if (PRIVATE.test(readFileSync(p).toString('latin1'))) leaks.push(p.slice(repo.length + 1));
  }
}
check('outputs hold no private path or identifier', leaks.length === 0, leaks.join(', ') || 'clean');

// ---------------------------------------------------------------------------------------- the record
const primary = byId.accepted.entry;
const traceValues = (id) => {
  const { entry } = byId[id];
  const tv = entry.trace_validation;
  return {
    verdict: tv.verdict,
    lines: tv.lines,
    matched: tv.matched,
    first_non_conforming_line: tv.first_unmatched === 0 ? null : tv.first_unmatched,
    end_record: tv.end_record,
    distinct_states: entry.tlc.distinct_states,
    states_generated: entry.tlc.states_generated,
    depth: entry.tlc.depth,
    paper_accepted: tv.paper_accepted,
    exit_code: entry.exit_code,
    ...(entry.median_duration_s !== undefined && { wall_s_median: entry.median_duration_s }),
    tool_line: entry.tool_line,
  };
};
const values = Object.fromEntries([
  ...PRIMARY.map((id) => [id, traceValues(id)]),
  ...['rejected-noend', 'missing-event', 'fresh-key', 'fresh-key-unlogged', 'composed-accepted', 'composed-rejected', 'composed-partial', 'composed-rejected-noend']
    .map((id) => [id.replaceAll('-', '_'), traceValues(id)]),
  ['toy_spec_distinct_states', byId['toy-spec'].entry.tlc.distinct_states],
  ['witness_provider_steps', byId['accepted-witness'].entry.witness.provider_steps],
  ['replay_json_distinct_states', byId['replay-json'].entry.tlc.distinct_states],
  ['replay_bin_distinct_states', byId['replay-bin'].entry.tlc.distinct_states],
  ['hold_json_distinct_states', byId['hold-json'].entry.tlc.distinct_states],
  ['hold_json_tampered_distinct_states', byId['hold-json-tampered'].entry.tlc.distinct_states],
  ['register_values_four_workers', byId['register-prefixed-w4'].entry.register_values],
  ['error_tool_lines', Object.fromEntries(['cut-line', 'accepted-174', 'composed-no-flag', 'typo-syntax', 'typo-operator', 'typo-field']
    .map((id) => [id.replaceAll('-', '_'), byId[id].entry.tool_line]))],
]);

const record = {
  id: RUN_ID,
  title: "Trace validation by TLC's trace-module method on a toy outbox: an accepted, a rejected and a partial NDJSON trace, with probes (W0-S13)",
  task: 'W0-S13',
  engine: 'tlc',
  version: '1.8.0',
  version_string: JARS['1.8.0'].banner,
  binary: 'tla2tools.jar of the 1.8.0 pre-release, run with java -jar in the container',
  binary_sha256: JARS['1.8.0'].sha256,
  image: `${IMAGE}@${imageDigest}`,
  recorded_at: new Date().toISOString(),
  started_at: configs[0].started_at,
  duration_s: primary.duration_s,
  primary_config: 'accepted',
  argv: primary.argv,
  inputs: primary.inputs,
  budget: primary.budget,
  exit_code: primary.exit_code,
  verdict_lines: primary.verdict_lines,
  outputs: primary.outputs,
  values,
  environment: {
    os: `Linux ${os.release().split('-')[0]} ${os.arch() === 'x64' ? 'x86_64' : os.arch()}`,
    cpu_count: os.cpus().length,
    ram_gib: Math.round(os.totalmem() / 2 ** 30),
    cpu_architecture: os.arch() === 'x64' ? 'x86_64' : os.arch(),
    container: {
      runtime: 'docker',
      server_version: dockerVersion,
      image: IMAGE,
      digest: imageDigest,
      java: javaVersion,
      run_flags: ['--rm', '--memory=6g', '--network=none', '--user <uid>:<gid>', '-v <sandbox>:/work', '-v <jar>:/opt/tla2tools.jar:ro', '-w /work'],
    },
    host_tools: { node: process.version, python: pythonVersion },
    emulated: false,
  },
  bundled_modules: bundled,
  method: {
    trace_module: `${SPECS}/ToyOutboxTrace.tla`,
    generic_part: `${SPECS}/TraceValidation.tla`,
    config_lines: ['CONSTANTS <the spec\'s constants>  TraceFile = "<trace>"', 'SPECIFICATION TraceSpec', 'CONSTRAINT TraceReach', 'POSTCONDITION TraceVerdict', 'CHECK_DEADLOCK FALSE'],
    verdict: 'the highest line counter of any state TLC generated, kept in a named register by the constraint TraceReach and read by the postcondition: rejected when it is at most the line count, else accepted with an end record and partial without one',
  },
  notes: [
    'Question: does the trace-module method of Cirstea, Kuppe, Loillier and Merz (section 4.2), as CCF applies it, validate NDJSON traces on the pinned 1.8.0 jar with only its bundled modules, and what does it report for an accepted, a rejected and a partial trace? docs/spikes/W0-S13.md answers it from the configurations below.',
    'The spec is a toy outbox written for this spike (scripts/spikes/W0-S13/specs/ToyOutbox.tla), not the course\'s reference model, which W5-T02 authors. Its traces are written by hand in the shape a simulator would emit; no simulator exists yet (W5-T15).',
    'Every TLC run was in a fresh container with no network, on one Linux x86_64 host. Nothing is emulated. A run takes well under two seconds, most of it container and JVM start-up, so duration_s says little about TLC itself; TLC printed "Finished in 00s" for every trace run.',
    'TLC unpacks its standard modules to a fresh /tmp/tlc-<n> directory inside the container; the committed stdout writes that directory as <tlc-temp>. The binary trace of replay-dump has a generated name (ToyOutboxReplay_TTrace_<n>.bin) and is loaded by replay-bin as replay.bin.',
    'Outputs marked informational hold a random seed, timestamps or a generated file name, so a re-run is compared on the configs, traces, state lists and verdict_lines only.',
    'The typo-* configs replace one text in a copy of ToyOutboxTrace.tla before TLC runs, as a learner\'s slip would; the edited copy is saved with their outputs. They and accepted-174 and composed-no-flag show what the tool prints when TLC stops without a verdict line: SANY\'s message or the exception\'s, not TLC\'s first Error: line, which for these stops is generic.',
  ],
  configs,
  scripts: ['record.mjs', 'tv.mjs'].map((f) => ({ path: `${SPIKE}/${f}`, sha256: fileSha(`${SPIKE}/${f}`) })),
  checks,
  pass: checks.every((c) => c.pass),
};

const recordText = JSON.stringify(record, null, 2) + '\n';
if (PRIVATE.test(recordText)) die('the run record holds a private path or identifier; not written');
writeFileSync(join(repo, 'runs', `${RUN_ID}.json`), recordText);
console.log(`${record.pass ? 'recorded' : 'recorded with failures'}: runs/${RUN_ID}.json (${configs.length} configs, ${checks.length} checks, ${checks.filter((c) => !c.pass).length} failed)`);
for (const id of PRIMARY) console.log(`  ${values[id].tool_line}`);
process.exit(record.pass ? 0 : 1);
