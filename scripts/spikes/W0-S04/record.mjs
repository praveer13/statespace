#!/usr/bin/env node
// W0-S04: assemble runs/RUN-spectacle-s5s8.json from the committed outputs:
//   runs/RUN-spectacle-s5s8/tlc-summary.json        (tlc.mjs)
//   runs/RUN-spectacle-s5s8/spectacle/files.json    (fetch-spectacle.mjs)
//   runs/RUN-spectacle-s5s8/spectacle/node.json     (node-run.mjs)
//   runs/RUN-spectacle-s5s8/spectacle/<engine>.json (browsers.mjs)
// and apply the classification rule of docs/spikes/W0-S04.md to every
// configuration. Prints the per-configuration table used in the decision record.
//
//   node scripts/spikes/W0-S04/record.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseCfg } from './tlc.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const RUNDIR = path.join(REPO, 'runs/RUN-spectacle-s5s8');
const rel = (p) => path.relative(REPO, p).split(path.sep).join('/');
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const ENGINES = ['chromium', 'firefox', 'webkit'];
// [D] The interactive budget: a complete exploration at the lesson's constants
// must finish within this many milliseconds in a worker in every engine.
const INTERACTIVE_MS = 10000;
const round = (x, d = 0) => (x === null || x === undefined ? null : Math.round(x * 10 ** d) / 10 ** d);

function listFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out.sort();
}

function tlcKind(r) {
  if (!r) return null;
  if (r.result === 'no error') return 'ok';
  if (r.result === 'invariant violated') return 'violated:' + r.invariant;
  if (r.result === 'deadlock') return 'deadlock';
  return r.result;
}
function specKind(first) {
  if (!first) return 'ok';
  return first.kind === 'violated' ? 'violated:' + first.invariant : first.kind;
}

// Two explorations of one job agree when their counts and first events agree.
function sameRun(a, b) {
  const fa = a.first, fb = b.first;
  return a.distinct === b.distinct && a.depth === b.depth && specKind(fa) === specKind(fb) && (!fa || (fa.distinct === fb.distinct && fa.depth === fb.depth && fa.traceStates === fb.traceStates));
}

function main() {
  const manifest = read(path.join(HERE, 'configs.json'));
  const tlc = read(path.join(RUNDIR, 'tlc-summary.json'));
  const files = read(path.join(RUNDIR, 'spectacle/files.json'));
  const node = read(path.join(RUNDIR, 'spectacle/node.json'));
  const browsers = {};
  for (const e of ENGINES) {
    const p = path.join(RUNDIR, `spectacle/${e}.json`);
    if (fs.existsSync(p)) browsers[e] = read(p);
  }
  const byRun = Object.fromEntries(tlc.runs.map((r) => [r.runId, r]));
  const nodeRes = Object.fromEntries(node.results.map((r) => [r.id, r]));
  const bRes = (e, step) => {
    const b = browsers[e];
    if (!b || !b.steps[step] || !b.steps[step].results) return {};
    return Object.fromEntries(b.steps[step].results.map((r) => [r.id, r]));
  };
  const workerRes = Object.fromEntries(ENGINES.map((e) => [e, bRes(e, 'worker-fetch')]));
  const mainRes = Object.fromEntries(ENGINES.map((e) => [e, bRes(e, 'main-fetch')]));
  const shimRes = Object.fromEntries(ENGINES.map((e) => [e, bRes(e, 'worker-shim')]));
  const ovRes = Object.fromEntries(ENGINES.map((e) => [e, bRes(e, 'worker-overrides')]));
  const fetchedModules = (e, step, id) => {
    // Module files the server saw while job id ran: the step's request log lists
    // every /specs/ request in order; attribute by module name.
    const b = browsers[e];
    if (!b || !b.steps[step]) return null;
    return b.steps[step].requests.filter((q) => q.path.startsWith('/specs/')).map((q) => `${q.path} ${q.status}`);
  };

  const rows = [];
  const configs = [];
  for (const c of manifest.configs) {
    const cfg = parseCfg(fs.readFileSync(path.join(HERE, 'specs', c.dir, c.cfg), 'utf8'));
    const v = byRun[`${c.id}--verdict`];
    const g = byRun[`${c.id}--graph`];
    const deadlockCheck = c.tlcArgs.includes('-deadlock') ? false : (cfg.checkDeadlock === null ? true : cfg.checkDeadlock);
    const n = nodeRes[c.id];
    const engines = { node: n };
    for (const e of ENGINES) engines[e] = workerRes[e][c.id];
    const ran = Object.entries(engines).filter(([, r]) => r);
    const parsedEverywhere = ran.length > 0 && ran.every(([, r]) => r.parse && r.parse.ok);
    const okEverywhere = ran.length > 0 && ran.every(([, r]) => r.ok);
    // First line of each engine's message, keyed by engine (V8, SpiderMonkey and
    // JavaScriptCore word the same failure differently).
    const errorsByEngine = Object.fromEntries(ran.map(([e, r]) => [e, ((r.errors || []).map((x) => x.split('\n')[0]).concat(r.parse && !r.parse.ok ? ['parse: ' + r.parse.error] : []))[0] || null]).filter(([, m]) => m));
    const errors = Array.from(new Set(Object.values(errorsByEngine)));
    const nodeError = errorsByEngine.node || errors[0] || '';

    // Verdict and counts against TLC.
    let verdict = null;
    const comparable = ['safety', 'speed', 'probe', 'scale'].includes(c.kind);
    if (n && n.explore) {
      const ex = n.explore;
      const sk = specKind(deadlockCheck ? ex.first : (ex.first && ex.first.kind === 'deadlock' ? null : ex.first));
      verdict = {
        spectacle: sk,
        tlc: tlcKind(v),
        comparable,
        kindAgrees: comparable ? sk === tlcKind(v) : null,
        distinctAtVerdict: { spectacle: ex.first ? ex.first.distinct : ex.distinct, tlc: v ? v.distinct : null },
        depthAtVerdict: { spectacle: ex.first ? ex.first.depth : ex.depth, tlc: v ? v.depth : null },
        traceActions: { spectacle: ex.first ? ex.first.traceStates - 1 : null, tlc: v && v.traceLength !== undefined ? v.traceLength : null }
      };
      if (comparable) {
        verdict.countsAgree = verdict.distinctAtVerdict.spectacle === verdict.distinctAtVerdict.tlc && verdict.depthAtVerdict.spectacle === verdict.depthAtVerdict.tlc && (verdict.traceActions.tlc === null || verdict.traceActions.spectacle === verdict.traceActions.tlc);
      }
    }
    // Complete counts: Spectacle's from Node always; TLC's from the graph run, or
    // from a verdict run that reported no error (it explored everything too).
    let complete = null;
    if (n && n.explore && n.explore.complete) {
      const tc = g ? { distinct: g.distinct, depth: g.depth, generated: g.generated } : (v && v.result === 'no error' && comparable ? { distinct: v.distinct, depth: v.depth, generated: v.generated } : null);
      complete = {
        spectacle: { distinct: n.explore.distinct, distinctExact: n.explore.distinctExact, depth: n.explore.depth, generated: n.explore.generated, deadlockStates: n.explore.deadlockStates },
        tlc: tc,
        agrees: tc ? n.explore.distinct === tc.distinct && n.explore.depth === tc.depth : null
      };
    }

    // State pairs, per engine.
    const pairs = {};
    for (const [e, r] of ran) {
      if (r.pairs) {
        pairs[e] = {
          graphEqual: r.pairs.graphEqual, tlcStates: r.pairs.tlcStates, tlcEdges: r.pairs.tlcEdges, accepted: r.pairs.accepted,
          extraEdges: r.pairs.extraEdges, missingStates: r.pairs.missingInSpectacle, extraStates: r.pairs.extraInSpectacle, initEqual: r.pairs.initEqual,
          nonEdgesTested: r.pairs.negTested, nonEdgesRejected: r.pairs.negRejected,
          stutterSelfLoops: { tlc: r.pairs.selfLoopsTlc, spectacle: r.pairs.selfLoopsSpectacle },
          actionLabels: { comparable: r.pairs.labelComparable, agree: r.pairs.labelAgree },
          meanPairCheckMs: round(r.pairs.meanPairCheckMs, 2)
        };
      }
    }
    const traces = n && n.traces ? n.traces.map((t) => ({ name: t.name, states: t.states, firstIsInit: t.firstIsInit, everyStepAccepted: t.allAccepted, lassoBackEdgeAccepted: t.lasso ? t.lasso.step : null, endsInStuttering: !!t.stutterEnd, actionLabels: { comparable: t.labelComparable, agree: t.labelAgree }, mutantRemovedState: t.mutant ? t.mutant.removedState : null, mutantVerdictAgreesWithTlc: t.mutant ? t.mutant.agree : null })) : [];
    const explicitPairs = n && n.explicitPairs ? n.explicitPairs : [];

    // Speed.
    const speed = {};
    if (n && n.explore) speed.node = { completeMs: round(n.explore.ms), statesPerSec: round(n.explore.statesPerSec), initMs: round(n.explore.initMs, 1) };
    for (const e of ENGINES) {
      const w = workerRes[e][c.id], m = mainRes[e][c.id];
      if (w || m) {
        speed[e] = {
          worker: w && w.explore ? { completeMs: round(w.explore.ms), initMs: round(w.explore.initMs), statesPerSec: round(w.explore.statesPerSec), parseMs: round(w.parse.ms, 1), mainThreadMaxGapMs: round(w.mainThreadMaxGapMs), firstEventMs: w.explore.first ? round(w.explore.first.ms) : null } : null,
          main: m && m.explore ? { completeMs: round(m.explore.ms), statesPerSec: round(m.explore.statesPerSec), mainThreadMaxGapMs: round(m.mainThreadMaxGapMs), sameAsWorker: w && w.explore ? sameRun(m.explore, w.explore) : null } : null
        };
      }
    }
    const explored = Object.entries(engines).filter(([, r]) => r && r.explore);
    const enginesAgree = explored.length > 1 ? explored.every(([, r]) => sameRun(r.explore, explored[0][1].explore)) : null;
    const worstWorkerMs = Math.max(...ENGINES.map((e) => (workerRes[e][c.id] && workerRes[e][c.id].explore ? workerRes[e][c.id].explore.ms : -1)));
    const browsersRan = ENGINES.filter((e) => workerRes[e][c.id]);

    // Local EXTENDS.
    const inv = n ? n.inventory : null;
    const local = inv && inv.localExtends ? inv.localExtends : [];
    const extendsInfo = {
      extends: inv ? inv.extends : null,
      local,
      unresolved: inv ? inv.unresolvedExtends : null,
      resolvedBySpectacle: n && n.parse && n.parse.ok ? n.parse.modulesResolved : null,
      shimRequests: n ? n.shimRequests : null,
      modes: {}
    };
    for (const e of ENGINES) {
      const s = shimRes[e][c.id], o = ovRes[e][c.id];
      if (s || o) extendsInfo.modes[e] = { fetch: workerRes[e][c.id] ? workerRes[e][c.id].parse.ok : null, shim: s ? s.parse.ok : null, overrides: o ? o.parse.ok : null, overridesError: o && !o.parse.ok ? o.parse.error : undefined };
    }

    // Classification.
    let cls = null, reason = null;
    const tlcOnlyKinds = { liveness: 'a liveness property under fairness, which Spectacle does not check (INS-lasso and TLC)', 'action-property': 'an action property [][A]_v, which Spectacle does not check', symmetry: 'TLC SYMMETRY with a liveness property; Spectacle has no symmetry reduction', trace: 'trace validation through TLC\'s Json module; Spectacle cannot load Json' };
    if (c.stage === 'probe') { cls = 'probe'; reason = 'coverage probe, not a curriculum spec'; }
    else if (tlcOnlyKinds[c.kind]) { cls = 'Theater-only'; reason = tlcOnlyKinds[c.kind]; }
    else if (ran.length === 0) { cls = 'Theater-only'; reason = 'not run in Spectacle'; }
    else if (!parsedEverywhere) { cls = 'Theater-only'; reason = 'Spectacle cannot load the spec (Node: ' + nodeError + ')'; }
    else if (!okEverywhere) { cls = 'Theater-only'; reason = 'Spectacle cannot evaluate the spec (Node: ' + nodeError + ')'; }
    else {
      const allGraphEqual = c.graph ? ran.every(([, r]) => r.pairs && r.pairs.graphEqual && r.pairs.negRejected === r.pairs.negTested) : true;
      const tracesOk = ran.every(([, r]) => (r.traces || []).every((t) => t.allAccepted && (!t.lasso || t.lasso.step)));
      const agrees = verdict && verdict.kindAgrees && verdict.countsAgree && (!complete || complete.agrees !== false);
      const fast = browsersRan.length === ENGINES.length && worstWorkerMs <= INTERACTIVE_MS;
      if (!allGraphEqual || !agrees || !tracesOk) { cls = 'Theater-only'; reason = 'disagrees with TLC'; }
      else if (!fast) {
        cls = 'Theater-only';
        const where = browsersRan.length < ENGINES.length ? ` (run in ${browsersRan.join(', ')} only)` : '';
        reason = worstWorkerMs > INTERACTIVE_MS
          ? `complete exploration takes up to ${Math.round(worstWorkerMs / 1000)} s in a worker${where}, above the ${INTERACTIVE_MS / 1000} s interactive budget [D]`
          : `not run in every browser engine${where}`;
      }
      else { cls = 'Spectacle'; reason = 'graph, verdict and counts equal TLC in Node and three browser engines; within budget'; }
    }

    // Typed run@1 configuration fields: TLC's verdict run is this configuration's
    // command; its verdict lines are copied verbatim from TLC's log.
    const modFiles = [c.module, ...(c.localExtends || [])].map((m) => (c.pcal && m === c.module)
      ? path.join(RUNDIR, 'pcal', `${m}.tla`) : path.join(HERE, 'specs', c.dir, `${m}.tla`)).filter((p) => fs.existsSync(p));
    const ndjson = path.join(HERE, 'specs', c.dir, `${c.module}.ndjson`);
    const cfgInputs = [...modFiles.map((p) => ({ path: rel(p), sha256: sha(p), role: 'spec' })),
      ...(fs.existsSync(ndjson) ? [{ path: rel(ndjson), sha256: sha(ndjson), role: 'trace log' }] : []),
      { path: rel(path.join(HERE, 'specs', c.dir, c.cfg)), sha256: sha(path.join(HERE, 'specs', c.dir, c.cfg)), role: 'config' }];
    const tlcLines = (r) => (r ? fs.readFileSync(path.join(REPO, r.log), 'utf8').split('\n')
      .filter((l) => /^(Error: (?!The (behavior|following))|Model checking completed|Warning:|[\d,]+ states generated|The depth of the complete|Encountered )/.test(l)) : []);
    const entry = {
      id: c.id, purpose: `${c.spec}: ${c.lessons.join(', ') || 'coverage probe'}`,
      startedAt: v ? v.startedAt : null, durationS: v ? v.durationS : null,
      argv: v ? v.argv : null, inputs: cfgInputs, exitCode: v ? v.exitCode : null,
      verdictLines: tlcLines(v), outputs: [v, g].filter(Boolean).map((r) => r.log),
      stage: c.stage, spec: c.spec, source: c.source, lessons: c.lessons, instruments: c.instruments, kind: c.kind,
      module: `scripts/spikes/W0-S04/specs/${c.dir}/${c.module}.tla`, cfg: `scripts/spikes/W0-S04/specs/${c.dir}/${c.cfg}`,
      constants: cfg.constants,
      tlc: v ? { argv: v.argv, deadlockCheck, result: v.result, invariant: v.invariant, initStates: v.initStates, distinct: v.distinct, generated: v.generated, depth: v.depth, traceActions: v.traceLength === undefined ? null : v.traceLength, warnings: v.warnings, exitCode: v.exitCode, durationS: v.durationS, log: v.log, complete: g ? { argv: g.argv, distinct: g.distinct, generated: g.generated, depth: g.depth, dot: g.dot, log: g.log } : null } : null,
      operatorCoverage: inv ? { evaluated: inv.evaluated, parsedOnly: inv.parsedOnly, libraryOperators: inv.libraryOperators, outcome: okEverywhere ? 'every evaluated construct ran' : 'failed', errorsByEngine } : null,
      localExtends: extendsInfo,
      verdict, complete, enginesAgree, enginesCompared: explored.map(([e]) => e), statePairs: { perEngine: pairs, traces, explicitPairs }, speed,
      temporalProbes: n ? n.temporalProbes : undefined,
      native: n ? n.native : undefined,
      nativeComplete: n ? n.nativeFull : undefined,
      classification: cls, reason
    };
    configs.push(entry);
    rows.push(entry);
  }

  // Probes.
  const probes = {
    fingerprint: { node: node.fingerprintProbe },
    watchdog: Object.fromEntries(ENGINES.filter((e) => browsers[e]).map((e) => [e, browsers[e].steps.watchdog])),
    numberSets: ['probe-nat', 'probe-int', 'probe-string'].map((id) => ({ id, tlc: tlcKind(byRun[`${id}--verdict`]), spectacle: nodeRes[id] ? (nodeRes[id].errors[0] || '').split('\n')[0] : null })),
    community: { requests: nodeRes['probe-community'] ? nodeRes['probe-community'].shimRequests : null, perEngine: Object.fromEntries(ENGINES.filter((e) => browsers[e]).map((e) => [e, { error: workerRes[e]['probe-community'] ? workerRes[e]['probe-community'].parse.error : null, consoleErrors: browsers[e].consoleErrors.filter((x) => /raw\.githubusercontent/.test(x)).slice(0, 2) }])) },
    missingModule: { requests: nodeRes['probe-missing'] ? nodeRes['probe-missing'].shimRequests : null, error: nodeRes['probe-missing'] && nodeRes['probe-missing'].parse ? nodeRes['probe-missing'].parse.error : null },
    payload: { firstLoad: files.firstLoad, compression: files.compression, files: files.files.filter((f) => f.path !== 'LICENSE' && f.path !== 'js/worker.js').map((f) => ({ path: f.path, bytes: f.bytes, gzip9Bytes: f.gzip9Bytes, brotli11Bytes: f.brotli11Bytes })) },
    workerStartup: Object.fromEntries(ENGINES.filter((e) => browsers[e]).map((e) => [e, { workerStartupMs: round(browsers[e].steps['worker-fetch'].workerStartupMs), parserInitMs: round(browsers[e].steps['worker-fetch'].parserInitMs) }]))
  };

  const inputs = [...listFiles(path.join(HERE, 'specs')), path.join(HERE, 'configs.json'), path.join(RUNDIR, 'pcal/DoubleSpendPcal.tla')].map((p) => ({ path: rel(p), sha256: sha(p) }));
  const scripts = [...listFiles(path.join(HERE, 'harness')), ...['fetch-spectacle.mjs', 'tlc.mjs', 'node-run.mjs', 'browsers.mjs', 'record.mjs', 'run-all.sh'].map((f) => path.join(HERE, f))].filter((p) => fs.existsSync(p)).map((p) => ({ path: rel(p), sha256: sha(p) }));
  const outputs = listFiles(RUNDIR).filter((p) => !p.endsWith('RUN-spectacle-s5s8.json')).map((p) => ({ path: rel(p), sha256: sha(p) }));

  const firstTlc = tlc.runs.find((r) => r.version);
  const javaLine = (() => {
    const log = fs.readFileSync(path.join(REPO, firstTlc.log), 'utf8');
    const m = /\(Linux [^,]+, ([^,]+),/.exec(log);
    return m ? m[1] : null;
  })();
  const pcalLine = (() => {
    const log = fs.readFileSync(path.join(RUNDIR, 'tlc/pcal-trans.log'), 'utf8');
    return (log.split('\n').find((l) => /^pcal\.trans Version/.test(l)) || '').trim();
  })();
  const stamps = [tlc.runs.map((r) => r.startedAt).sort()[0]];
  const count = (f) => configs.filter(f).length;
  const curriculum = configs.filter((x) => x.classification !== 'probe');

  const pwDigest = process.env.W0S04_PW_DIGEST || null;
  const evaluated = curriculum.filter((x) => x.operatorCoverage && x.operatorCoverage.outcome === 'every evaluated construct ran');
  const withGraph = evaluated.filter((x) => Object.keys(x.statePairs.perEngine).length);
  const graphEqual = withGraph.filter((x) => Object.values(x.statePairs.perEngine).every((pp) => pp.graphEqual));
  const comparableEval = evaluated.filter((x) => x.verdict && x.verdict.comparable);
  const verdictEqual = comparableEval.filter((x) => x.verdict.kindAgrees && x.verdict.countsAgree && (!x.complete || x.complete.agrees !== false));
  const traceRuns = evaluated.flatMap((x) => x.statePairs.traces);
  // The driver checks a trace's first state against Spectacle's initial states
  // only when it kept that set, which it does for a job with a TLC graph; the
  // other traces carry firstIsInit null (not checked), counted apart here.
  const firstChecked = traceRuns.filter((t) => t.firstIsInit !== null);
  const firstNotChecked = evaluated.filter((x) => x.statePairs.traces.some((t) => t.firstIsInit === null)).map((x) => x.id);
  const evaluatedIds = new Set(evaluated.map((x) => x.id));
  const traceSummary = (res) => {
    const list = Object.values(res).filter((r) => evaluatedIds.has(r.id)).flatMap((r) => r.traces || []);
    return {
      traces: list.length,
      everyStepAccepted: list.filter((t) => t.allAccepted).length,
      firstStateChecked: list.filter((t) => t.firstIsInit !== null).length,
      firstStateInitial: list.filter((t) => t.firstIsInit === true).length,
      lassoBackEdges: list.filter((t) => t.lasso).length,
      lassoBackEdgesAccepted: list.filter((t) => t.lasso && t.lasso.step).length
    };
  };
  const traceReplays = {
    source: 'Node: configs[].state_pairs.traces; browsers: the worker pass in runs/RUN-spectacle-s5s8/spectacle/<engine>.json',
    perEngine: Object.assign({ node: traceSummary(nodeRes) }, Object.fromEntries(ENGINES.filter((e) => browsers[e]).map((e) => [e, traceSummary(workerRes[e])]))),
    firstStateNotChecked: firstNotChecked,
    mutantCompared: traceRuns.filter((t) => t.mutantVerdictAgreesWithTlc !== null).length,
    mutantAgrees: traceRuns.filter((t) => t.mutantVerdictAgreesWithTlc === true).length
  };
  // Mean cost of one state-pair check per source state, in the graph check:
  // min and max per engine over the configurations of each group with a TLC graph.
  const pairGroups = {
    s5: (x) => x.stage === 'S5',
    outboxSafety: (x) => x.stage === 'S8' && x.module.endsWith('/Outbox.tla') && x.kind === 'safety',
    outboxLiveness: (x) => x.stage === 'S8' && x.module.endsWith('/OutboxLive.tla'),
    s8Other: (x) => x.stage === 'S8' && !x.module.endsWith('/Outbox.tla') && !x.module.endsWith('/OutboxLive.tla')
  };
  const meanPairCheckMs = { unit: 'ms per source state', source: 'configs[].state_pairs.per_engine.<engine>.mean_pair_check_ms' };
  for (const [g, pred] of Object.entries(pairGroups)) {
    const set = withGraph.filter(pred);
    meanPairCheckMs[g] = { configurations: set.map((x) => x.id) };
    for (const e of ['node', ...ENGINES]) {
      const xs = set.map((x) => (x.statePairs.perEngine[e] ? x.statePairs.perEngine[e].meanPairCheckMs : null)).filter((v) => typeof v === 'number');
      meanPairCheckMs[g][e] = xs.length ? { configurations: xs.length, min: Math.min(...xs), max: Math.max(...xs) } : null;
    }
  }
  const recordedAspects = curriculum.filter((x) => x.operatorCoverage && x.localExtends && x.speed && (x.speed.node || x.operatorCoverage.outcome === 'failed') && x.statePairs);
  const docPath = path.join(REPO, 'docs/spikes/W0-S04.md');
  const doc = fs.existsSync(docPath) ? fs.readFileSync(docPath, 'utf8') : '';
  const missingInDoc = curriculum.filter((x) => !doc.includes('`' + x.id + '`')).map((x) => x.id);
  const checks = [
    { id: 'Spectacle commit and files verified', pass: files.commit === '5827c22043216ea422b9dada64fdec19d6d8e5c4', detail: `${files.commit}; manifest ${files.manifestSha256}` },
    { id: 'tla2tools.jar equals the pin', pass: tlc.jarSha256 === '5bd7b64db99ae4c6c35f290de5e809c0ee41af43f8699cf696099ffb6452b1e2', detail: tlc.jarSha256 },
    { id: 'every curriculum configuration records operator coverage, local EXTENDS, speed and the state-pair check', pass: recordedAspects.length === curriculum.length, detail: `${recordedAspects.length} of ${curriculum.length}` },
    { id: 'graph equal to TLC in every engine, where Spectacle evaluates the spec', pass: graphEqual.length === withGraph.length, detail: `${graphEqual.length} of ${withGraph.length} configurations with a TLC graph` },
    { id: 'verdict kind, counts at the verdict and complete counts equal TLC, where comparable', pass: verdictEqual.length === comparableEval.length, detail: `${verdictEqual.length} of ${comparableEval.length}` },
    { id: 'every TLC counterexample replays step by step with the state-pair check', pass: traceRuns.every((t) => t.everyStepAccepted), detail: `${traceRuns.filter((t) => t.everyStepAccepted).length} of ${traceRuns.length} traces` },
    { id: 'the first state of a replayed trace is among Spectacle\'s initial states, where the driver kept them (configurations with a TLC graph)', pass: firstChecked.length > 0 && firstChecked.every((t) => t.firstIsInit === true), detail: `${firstChecked.filter((t) => t.firstIsInit === true).length} of ${firstChecked.length} traces checked, in Node; not checked: the ${traceRuns.length - firstChecked.length} traces of configurations without a TLC graph (${firstNotChecked.join(', ')})` },
    { id: 'every browser engine ran both passes', pass: ENGINES.every((e) => browsers[e] && browsers[e].steps['main-fetch'] && browsers[e].steps['worker-fetch']), detail: ENGINES.filter((e) => browsers[e]).join(', ') },
    { id: 'docs/spikes/W0-S04.md lists every curriculum configuration', pass: missingInDoc.length === 0, detail: missingInDoc.length ? 'missing: ' + missingInDoc.join(', ') : `${curriculum.length} of ${curriculum.length}` }
  ];

  const snake = (k) => k.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  const toSnake = (v, keepKeys) => {
    if (Array.isArray(v)) return v.map((x) => toSnake(x));
    if (v && typeof v === 'object') {
      const out = {};
      for (const [k, x] of Object.entries(v)) out[keepKeys ? k : snake(k)] = toSnake(x, k === 'constants');
      return out;
    }
    return v;
  };

  const record = {
    id: 'RUN-spectacle-s5s8',
    title: 'Spectacle at 5827c22 on the Stage 5 and Stage 8 specs: operator coverage, local EXTENDS, speed and the state-pair check, against TLC 1.8.0 (W0-S04)',
    task: 'W0-S04',
    engine: 'spectacle',
    version: files.commit,
    versionString: `Spectacle at commit ${files.commit} (${files.commitDate}), ${files.license}`,
    binary: 'the six files the harness loads (lodash, hash-sum, tree-sitter.js, eval.js, tree-sitter.wasm, tree-sitter-tlaplus.wasm); binary_sha256 is the SHA-256 of their sorted manifest, runs/RUN-spectacle-s5s8/spectacle/files.json',
    binarySha256: files.manifestSha256,
    researchCopy: files.researchCopy,
    upstreamHeadAtFetch: files.upstreamHeadAtFetch,
    reference: {
      engine: 'tlc', version: '1.8.0', versionString: firstTlc.version, binarySha256: tlc.jarSha256,
      image: `${tlc.image}@${tlc.imageDigest.split('@')[1]}`, java: javaLine, pcal: pcalLine,
      argvShape: 'java -XX:+UseParallelGC -cp tla2tools.jar tlc2.TLC -workers 1 [-deadlock] -noGenerateSpecTE -metadir <tmp> -config <cfg> <module>.tla; complete graphs: -deadlock -dump dot,actionlabels <file>'
    },
    image: pwDigest ? `mcr.microsoft.com/playwright:v1.63.0-noble@${pwDigest.split('@')[1]}` : 'mcr.microsoft.com/playwright:v1.63.0-noble',
    recordedAt: new Date().toISOString(),
    startedAt: stamps[0],
    // From the first TLC run to the last browser result file written.
    durationS: (() => {
      const last = Math.max(...ENGINES.map((e) => path.join(RUNDIR, `spectacle/${e}.json`)).filter((p) => fs.existsSync(p)).map((p) => fs.statSync(p).mtimeMs));
      return Number.isFinite(last) ? Math.round((last - Date.parse(stamps[0])) / 1000) : null;
    })(),
    argv: [
      ['node', 'scripts/spikes/W0-S04/fetch-spectacle.mjs'],
      ['node', 'scripts/spikes/W0-S04/tlc.mjs'],
      ['node', 'scripts/spikes/W0-S04/node-run.mjs'],
      ['docker', 'run', '--rm', '--memory=6g', '--shm-size=2g', '--name', 'w0s04-pw', '-e', 'HOST_UID=<uid>', '-e', 'HOST_GID=<gid>', '-v', '<repo>:/repo', '-v', '<cache>:/cache', 'mcr.microsoft.com/playwright:v1.63.0-noble', 'node', '/repo/scripts/spikes/W0-S04/browsers.mjs'],
      ['node', 'scripts/spikes/W0-S04/record.mjs']
    ],
    argvNote: 'the five commands of scripts/spikes/W0-S04/run-all.sh, in order; tlc.mjs runs each configuration\'s TLC commands (configs[].argv, configs[].tlc.complete.argv) in one eclipse-temurin:21-jre container',
    steps: [
      'node scripts/spikes/W0-S04/fetch-spectacle.mjs',
      'node scripts/spikes/W0-S04/tlc.mjs',
      'node scripts/spikes/W0-S04/node-run.mjs',
      'docker run --rm --memory=6g --shm-size=2g -v <repo>:/repo -v <cache>:/cache mcr.microsoft.com/playwright:v1.63.0-noble node /repo/scripts/spikes/W0-S04/browsers.mjs',
      'node scripts/spikes/W0-S04/record.mjs'
    ],
    inputs: [...inputs.map((x) => Object.assign(x, { role: /\.cfg$/.test(x.path) ? 'config' : /\.tla$/.test(x.path) ? 'spec' : /\.ndjson$/.test(x.path) ? 'trace log' : 'manifest' })),
      ...scripts.map((x) => Object.assign(x, { role: /\/harness\//.test(x.path) ? 'harness' : 'script' }))],
    budget: {
      tlc: { workers: 1, deadlock: 'explicit per configuration (configs[].tlc.argv)', timeoutS: 600, containerMemory: '6g' },
      spectacle: { wallMsPerJob: 300000, maxStates: 'none: complete exploration', nonEdgeSample: 400, interactiveBudgetMs: INTERACTIVE_MS, interactiveBudgetTag: '[D]', containerMemory: '6g', shmSize: '2g' }
    },
    exitCode: 0,
    // The recorder's own output lines, as it prints them (stderr).
    verdictLines: checks.map((c) => `${c.pass ? 'PASS' : 'FAIL'} ${c.id}: ${c.detail}`).concat([
      `${count((x) => x.classification === 'Spectacle')} of ${curriculum.length} curriculum configurations: Spectacle; ${count((x) => x.classification === 'Theater-only')}: Theater-only.`,
      `Graph equal to TLC (states, initial states, every edge, no extra edge) in Node, Chromium, Firefox and WebKit: ${graphEqual.length} of ${withGraph.length} configurations that Spectacle evaluates and TLC graphed.`,
      `Verdict kind, distinct states and depth at the verdict, trace length and complete counts equal to TLC: ${verdictEqual.length} of ${comparableEval.length} comparable configurations that Spectacle evaluates.`,
      `Spectacle fails on: ${Array.from(new Set(curriculum.filter((x) => x.operatorCoverage && x.operatorCoverage.outcome === 'failed').map((x) => x.id))).join(', ')}.`
    ]),
    values: {
      curriculumConfigurations: curriculum.length,
      spectacleConfigurations: count((x) => x.classification === 'Spectacle'),
      theaterOnlyConfigurations: count((x) => x.classification === 'Theater-only'),
      graphEqualConfigurations: graphEqual.length,
      graphConfigurations: withGraph.length,
      verdictEqualConfigurations: verdictEqual.length,
      verdictComparableConfigurations: comparableEval.length,
      tracesReplayed: traceRuns.length,
      traceReplays,
      meanPairCheckMs,
      interactiveBudgetMs: INTERACTIVE_MS
    },
    outputs: outputs.map((x) => Object.assign(x, { bytes: fs.statSync(path.join(REPO, x.path)).size })),
    environment: {
      os: `${os.type()} ${os.release()}`, cpuArchitecture: os.arch() === 'x64' ? 'x86_64' : os.arch(), cpuCount: os.cpus().length, ramGib: Math.round(os.totalmem() / 2 ** 30),
      node: node.userAgent,
      browsers: Object.fromEntries(ENGINES.filter((e) => browsers[e]).map((e) => [e, { version: browsers[e].browserVersion, userAgent: browsers[e].userAgent, crossOriginIsolated: browsers[e].crossOriginIsolated }])),
      containers: {
        browsers: { image: 'mcr.microsoft.com/playwright:v1.63.0-noble', digest: pwDigest ? pwDigest.split('@')[1] : null, runFlags: ['--rm', '--memory=6g', '--shm-size=2g', '-v <repo>:/repo', '-v <cache>:/cache'], playwrightCore: '1.63.0', headless: true },
        tlc: { image: tlc.image, digest: tlc.imageDigest.split('@')[1], runFlags: ['--rm', '--memory=6g', '--user <uid>:<gid>', '-v <cache>/work:/work', '-v <jar>:/tools/tla2tools.jar:ro'] }
      },
      csp: browsers.chromium ? browsers.chromium.csp : null,
      emulated: 'desktop engines, headless, in a container on one shared Linux host while other tasks ran; not phones. Timings are single runs and indicative.'
    },
    configs,
    probes,
    checks,
    pass: checks.every((c) => c.pass),
    notes: [
      'Specs marked "authored" are W0-S04 representatives of curriculum models that W3 and W5 have not authored yet; their verdicts are spike results, not the course runs the curriculum names (for example RUN-tlc-double-charge).',
      'Distinct states "at the verdict" follow TLC: the number of distinct states found when the first violation or deadlock is reported, breadth first with one worker.',
      'Verdicts come from the course-side driver (scripts/spikes/W0-S04/harness/driver.js) over Spectacle\'s successor and initial-state functions; Spectacle\'s own checker, TlaInterpreter.computeReachableStates, is reported under "native" where it applies.',
      'Speed: complete exploration in a classic dedicated worker, module mode "fetch", from the second pass of each engine; the main-thread pass is under speed.<engine>.main.'
    ]
  };
  fs.writeFileSync(path.join(REPO, 'runs/RUN-spectacle-s5s8.json'), JSON.stringify(toSnake(record), null, 1) + '\n');
  for (const l of record.verdictLines) console.error(l);

  // Table for the decision record.
  for (const x of rows) {
    const sp = x.speed;
    const ws = ENGINES.map((e) => (sp[e] && sp[e].worker ? `${(sp[e].worker.completeMs / 1000).toFixed(2)}` : '-')).join('/');
    const p = x.statePairs.perEngine.node;
    console.log([x.id, x.classification, x.tlc ? tlcKind({ result: x.tlc.result, invariant: x.tlc.invariant }) : '-', x.verdict ? x.verdict.spectacle : '-', x.complete ? `${x.complete.spectacle.distinct}/${x.complete.tlc ? x.complete.tlc.distinct : '-'}` : '-', p ? `${p.accepted}/${p.tlcEdges} ${p.nonEdgesRejected}/${p.nonEdgesTested}` : '-', ws, x.reason].join(' | '));
  }
}

main();
