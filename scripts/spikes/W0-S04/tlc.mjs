#!/usr/bin/env node
// W0-S04: run TLC 1.8.0 on every configuration in configs.json and turn its
// outputs into harness jobs.
//
//   node scripts/spikes/W0-S04/tlc.mjs
//
// Environment: W0S04_CACHE (default: <os tmpdir>/statespace-w0s04) holds the
// work tree, DOT graphs and jobs, outside the repository. W0S04_TLA_JAR points
// at tla2tools.jar 1.8.0; its SHA-256 must equal the pin in labs/TOOLS.md.
// Writes runs/RUN-spectacle-s5s8/tlc/*.log and tlc-summary.json (repo-relative
// paths only). Uses Docker image eclipse-temurin:21-jre, --memory=6g.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../..');
const CACHE = process.env.W0S04_CACHE || path.join(os.tmpdir(), 'statespace-w0s04');
const JAR = process.env.W0S04_TLA_JAR || path.join(CACHE, 'tla2tools-1.8.0.jar');
const JAR_PIN = '5bd7b64db99ae4c6c35f290de5e809c0ee41af43f8699cf696099ffb6452b1e2';
const IMAGE = 'eclipse-temurin:21-jre';
const OUT = path.join(REPO, 'runs/RUN-spectacle-s5s8/tlc');
const WORK = path.join(CACHE, 'work');
const JOBS = path.join(CACHE, 'jobs');

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const rel = (p) => path.relative(REPO, p).split(path.sep).join('/');

// ---------------------------------------------------------------- cfg parsing
export function parseCfg(text) {
  const src = text.replace(/\\\*.*$/gm, '');
  const toks = [];
  const re = /\s*("(?:[^"\\]|\\.)*"|<-|[{}(),=]|[A-Za-z0-9_\-.]+)/y;
  let m;
  re.lastIndex = 0;
  while (re.lastIndex < src.length && (m = re.exec(src))) toks.push(m[1]);
  const kw = new Set(['CONSTANT', 'CONSTANTS', 'INIT', 'NEXT', 'SPECIFICATION', 'INVARIANT', 'INVARIANTS', 'PROPERTY', 'PROPERTIES', 'CHECK_DEADLOCK', 'SYMMETRY', 'CONSTRAINT', 'CONSTRAINTS', 'VIEW']);
  const cfg = { constants: {}, invariants: [], properties: [], init: null, next: null, specification: null, checkDeadlock: null, symmetry: null };
  let i = 0;
  const readValue = () => {
    let depth = 0, out = [];
    do {
      const t = toks[i++];
      if (t === '{' || t === '(') depth++;
      if (t === '}' || t === ')') depth--;
      out.push(t);
    } while (depth > 0 && i < toks.length);
    return out.join(' ').replace(/ ,/g, ',').replace(/\{ /g, '{').replace(/ \}/g, '}');
  };
  while (i < toks.length) {
    const t = toks[i++];
    if (t === 'CONSTANT' || t === 'CONSTANTS') {
      while (i < toks.length && !kw.has(toks[i])) {
        const name = toks[i++];
        const op = toks[i++];
        if (op !== '=') throw new Error('unsupported cfg constant form near ' + name + ' ' + op);
        cfg.constants[name] = readValue();
      }
    } else if (t === 'INIT') cfg.init = toks[i++];
    else if (t === 'NEXT') cfg.next = toks[i++];
    else if (t === 'SPECIFICATION') cfg.specification = toks[i++];
    else if (t === 'INVARIANT' || t === 'INVARIANTS') { while (i < toks.length && !kw.has(toks[i])) cfg.invariants.push(toks[i++]); }
    else if (t === 'PROPERTY' || t === 'PROPERTIES') { while (i < toks.length && !kw.has(toks[i])) cfg.properties.push(toks[i++]); }
    else if (t === 'CHECK_DEADLOCK') cfg.checkDeadlock = toks[i++] === 'TRUE';
    else if (t === 'SYMMETRY') cfg.symmetry = toks[i++];
    else throw new Error('unsupported cfg token ' + t);
  }
  return cfg;
}

// Model values named in cfg constant values (identifiers that are not numbers,
// strings or Booleans).
export function modelValues(constants) {
  const out = new Set();
  for (const v of Object.values(constants)) {
    const stripped = v.replace(/"(?:[^"\\]|\\.)*"/g, ' ');
    for (const m of stripped.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) {
      if (!['TRUE', 'FALSE'].includes(m[0])) out.add(m[0]);
    }
  }
  return Array.from(out).sort();
}

// ---------------------------------------------------------------- TLC output
export function parseTlcLog(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const r = { version: null, result: null, invariant: null, warnings: [], initStates: null, generated: null, distinct: null, queue: null, depth: null, fpEstimate: null, trace: null, errorLines: [] };
  for (const l of lines) {
    let m;
    if ((m = /^TLC2 Version (.*)$/.exec(l))) r.version = 'TLC2 Version ' + m[1];
    if (/^Model checking completed\. No error has been found\./.test(l)) r.result = 'no error';
    if ((m = /^Error: Invariant (\S+) is violated( by the initial state)?/.exec(l))) { r.result = 'invariant violated'; r.invariant = m[1]; if (m[2]) r.violatedInitially = true; }
    if (/^Error: Deadlock reached\./.test(l)) r.result = 'deadlock';
    if (/^Error: Temporal propert(y|ies) .* (was|were) violated\./.test(l)) r.result = 'temporal property violated';
    if (/^Error: Action property .* is violated\./.test(l)) r.result = 'action property violated';
    if (/^Error: Parsing or semantic analysis failed\./.test(l)) r.result = 'parse error';
    if (/^Error:/.test(l)) r.errorLines.push(l);
    if (/^Warning:/.test(l)) r.warnings.push(l);
    if ((m = /^Finished computing initial states: ([\d,]+) distinct states? generated/.exec(l))) r.initStates = +m[1].replace(/,/g, '');
    if ((m = /^([\d,]+) states generated, ([\d,]+) distinct states found, ([\d,]+) states left on queue\./.exec(l))) {
      r.generated = +m[1].replace(/,/g, ''); r.distinct = +m[2].replace(/,/g, ''); r.queue = +m[3].replace(/,/g, '');
    }
    if ((m = /^The depth of the complete state graph search is (\d+)\./.exec(l))) r.depth = +m[1];
    if ((m = /calculated \(optimistic\):\s+val = (\S+)/.exec(l))) r.fpEstimate = m[1];
  }
  // Counterexample trace.
  let start = lines.findIndex((l) => /^Error: The (behavior up to this point is|following behavior constitutes a counter-example):/.test(l));
  // A violation in an initial state prints the state right after the error line.
  if (start < 0 && r.violatedInitially) {
    const k = lines.findIndex((l) => /^Error: Invariant \S+ is violated by the initial state/.test(l));
    const st = [];
    for (let j = k + 1; j < lines.length && /^\/\\ |^  /.test(lines[j]); j++) st.push(lines[j]);
    r.trace = { states: [st.join('\n')], labels: ['Init'], backTo: null, stutterEnd: false };
  }
  if (start >= 0) {
    const tr = { states: [], labels: [], backTo: null, stutterEnd: false };
    let cur = null;
    for (let k = start + 1; k < lines.length; k++) {
      const l = lines[k];
      let m;
      if ((m = /^State (\d+): (.*)$/.exec(l))) {
        if (cur) tr.states.push(cur.join('\n'));
        if (/^Stuttering/.test(m[2])) { tr.stutterEnd = true; cur = null; continue; }
        tr.labels.push(labelOf(m[2]));
        cur = [];
      } else if ((m = /^Back to state (\d+): (.*)$/.exec(l))) {
        if (cur) tr.states.push(cur.join('\n'));
        cur = null;
        tr.backTo = +m[1];
        tr.backLabel = labelOf(m[2]);
      } else if (cur && l.trim() !== '') {
        if (/^\d+ states generated|^The depth|^Finished|^Progress|^Checking|^Error:|^Model checking/.test(l)) { tr.states.push(cur.join('\n')); cur = null; break; }
        cur.push(l);
      } else if (cur && l.trim() === '') {
        tr.states.push(cur.join('\n'));
        cur = null;
      } else if (!cur && /^\d+ states generated/.test(l)) break;
    }
    if (cur && cur.length) tr.states.push(cur.join('\n'));
    r.trace = tr;
  }
  return r;
}
function labelOf(s) {
  if (/^<Initial predicate>/.test(s)) return 'Init';
  const m = /^<([A-Za-z_][A-Za-z0-9_]*)/.exec(s);
  return m ? m[1] : s;
}

// ---------------------------------------------------------------- DOT graphs
function unescapeDot(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && i + 1 < s.length) {
      const d = s[++i];
      out += d === 'n' ? '\n' : d;
    } else out += c;
  }
  return out;
}
export function parseDot(text) {
  const ids = new Map();
  const nodes = [];
  const init = [];
  const edges = [];
  const idx = (id) => {
    if (!ids.has(id)) { ids.set(id, nodes.length); nodes.push(null); }
    return ids.get(id);
  };
  for (const line of text.split('\n')) {
    let m;
    if ((m = /^(-?\d+) -> (-?\d+) \[label="((?:[^"\\]|\\.)*)"/.exec(line))) {
      edges.push([idx(m[1]), idx(m[2]), unescapeDot(m[3]).replace(/\(.*$/, '')]);
    } else if ((m = /^(-?\d+) \[label="((?:[^"\\]|\\.)*)"(.*)$/.exec(line))) {
      const i = idx(m[1]);
      nodes[i] = unescapeDot(m[2]);
      if (/style = filled/.test(m[3])) init.push(i);
    }
  }
  if (nodes.some((n) => n === null)) throw new Error('DOT graph has an edge to an undeclared node');
  return { nodes, init, edges };
}

// Repository-relative paths only: the container's mount points and temporary
// directories are replaced by placeholders in every recorded log and argv.
function normalize(text) {
  return text.split('/work/out/').join('<cache>/').split('/work/').join('scripts/spikes/W0-S04/specs/')
    .split('/tmp/meta/').join('<tmp>/meta/').replace(/\/tmp\/tlc-\d+\//g, '<tmp>/');
}

// ---------------------------------------------------------------- main
function main() {
  if (!fs.existsSync(JAR)) throw new Error('tla2tools.jar not found; set W0S04_TLA_JAR');
  const jarSha = sha256(fs.readFileSync(JAR));
  if (jarSha !== JAR_PIN) throw new Error('tla2tools.jar SHA-256 ' + jarSha + ' differs from the pin');
  const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'configs.json'), 'utf8'));
  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(path.join(WORK, 'out'), { recursive: true });
  for (const d of ['s5', 's8', 'probes']) fs.cpSync(path.join(HERE, 'specs', d), path.join(WORK, d), { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(JOBS, { recursive: true });

  const runs = [];
  const sh = ['#!/bin/bash', 'set -u', 'cd /work', 'J="java -XX:+UseParallelGC -cp /tools/tla2tools.jar"',
    'rec() { id=$1; dir=$2; shift 2; s=$EPOCHREALTIME; (cd /work/$dir && timeout 600 "$@") > /work/out/$id.log 2>&1; ec=$?; e=$EPOCHREALTIME; echo "$s $e $ec" > /work/out/$id.meta; echo "$id exit=$ec"; }'];
  // PlusCal translation at build time.
  sh.push('rec pcal-trans s5 $J pcal.trans -nocfg DoubleSpendPcal.tla');
  runs.push({ runId: 'pcal-trans', configId: 's5-pcal', role: 'translate', dir: 's5', argv: ['java', '-XX:+UseParallelGC', '-cp', 'tla2tools.jar', 'pcal.trans', '-nocfg', 'DoubleSpendPcal.tla'] });

  for (const c of manifest.configs) {
    if (c.noTlc) continue;
    const cfgText = fs.readFileSync(path.join(HERE, 'specs', c.dir, c.cfg), 'utf8');
    const cfg = parseCfg(cfgText);
    const base = ['java', '-XX:+UseParallelGC', '-cp', 'tla2tools.jar', 'tlc2.TLC', '-workers', '1'];
    const vArgs = [...c.tlcArgs, '-noGenerateSpecTE', '-metadir', `/tmp/meta/${c.id}-v`, '-config', c.cfg, `${c.module}.tla`];
    sh.push(`rec ${c.id}--verdict ${c.dir} $J tlc2.TLC -workers 1 ${vArgs.join(' ')}`);
    runs.push({ runId: `${c.id}--verdict`, configId: c.id, role: 'verdict', dir: c.dir, cfg: c.cfg, argv: [...base, ...vArgs] });
    if (c.graph) {
      const gcfg = `${c.id}__graph.cfg`;
      const consts = Object.entries(cfg.constants).map(([k, v]) => `${k} = ${v}`).join('\n          ');
      const gtext = (consts ? `CONSTANTS ${consts}\n` : '') + `INIT ${c.init || cfg.init}\nNEXT ${c.next || cfg.next}\n`;
      fs.writeFileSync(path.join(WORK, c.dir, gcfg), gtext);
      const gArgs = ['-deadlock', '-noGenerateSpecTE', '-metadir', `/tmp/meta/${c.id}-g`, '-dump', 'dot,actionlabels', `/work/out/${c.id}.dot`, '-config', gcfg, `${c.module}.tla`];
      sh.push(`rec ${c.id}--graph ${c.dir} $J tlc2.TLC -workers 1 ${gArgs.join(' ')}`);
      runs.push({ runId: `${c.id}--graph`, configId: c.id, role: 'graph', dir: c.dir, cfg: gcfg, cfgText: gtext, argv: [...base, ...gArgs] });
    }
    (c.pairs || []).forEach((p, k) => {
      // As in TLC's own trace-explorer specs: the model values that the state
      // formula names are declared as constants and bound to themselves.
      const mod = `PairCheck_${c.id.replace(/-/g, '_')}_${k}`;
      const body = p.from.split('\n').map((l) => '  ' + l).join('\n');
      const mvs = modelValues(cfg.constants);
      fs.writeFileSync(path.join(WORK, c.dir, `${mod}.tla`), `---- MODULE ${mod} ----\nEXTENDS ${c.module}, TLC\n` + (mvs.length ? `CONSTANTS ${mvs.join(', ')}\n` : '') + `PairInit ==\n${body}\n====\n`);
      const consts = [...Object.entries(cfg.constants).map(([kk, v]) => `${kk} = ${v}`), ...mvs.map((mv) => `${mv} = ${mv}`)].join('\n          ');
      const ptext = (consts ? `CONSTANTS ${consts}\n` : '') + `INIT PairInit\nNEXT ${c.next || cfg.next}\n`;
      fs.writeFileSync(path.join(WORK, c.dir, `${mod}.cfg`), ptext);
      const pArgs = ['-deadlock', '-noGenerateSpecTE', '-metadir', `/tmp/meta/${mod}`, '-dump', 'dot,actionlabels', `/work/out/${mod}.dot`, '-config', `${mod}.cfg`, `${mod}.tla`];
      sh.push(`rec ${c.id}--pair${k} ${c.dir} $J tlc2.TLC -workers 1 ${pArgs.join(' ')}`);
      runs.push({ runId: `${c.id}--pair${k}`, configId: c.id, role: 'pair', pairIndex: k, dir: c.dir, cfg: `${mod}.cfg`, argv: [...base, ...pArgs], dot: `${mod}.dot` });
    });
  }
  // The pcal translation must precede the runs on DoubleSpendPcal: it is first in the script.
  fs.writeFileSync(path.join(WORK, 'run-tlc.sh'), sh.join('\n') + '\n');
  const uid = os.userInfo().uid, gid = os.userInfo().gid;
  const dockerArgv = ['run', '--rm', '--memory=6g', '--name', 'w0s04-tlc', '--user', `${uid}:${gid}`, '-e', 'HOME=/tmp',
    '-v', `${WORK}:/work`, '-v', `${JAR}:/tools/tla2tools.jar:ro`, IMAGE, 'bash', '/work/run-tlc.sh'];
  const t0 = Date.now();
  execFileSync('docker', dockerArgv, { stdio: 'inherit' });
  const wallS = (Date.now() - t0) / 1000;
  const imageDigest = execFileSync('docker', ['image', 'inspect', IMAGE, '--format', '{{index .RepoDigests 0}}']).toString().trim();

  // Collect.
  const summary = { image: IMAGE, imageDigest, jarSha256: jarSha, wallS, runs: [] };
  const byConfig = {};
  for (const r of runs) {
    const log = fs.readFileSync(path.join(WORK, 'out', `${r.runId}.log`), 'utf8');
    // EPOCHREALTIME: seconds with a fractional part, from bash in the container.
    const [s, e, ec] = fs.readFileSync(path.join(WORK, 'out', `${r.runId}.meta`), 'utf8').trim().split(' ').map(Number);
    const norm = normalize(log);
    fs.writeFileSync(path.join(OUT, `${r.runId}.log`), norm);
    const parsed = r.role === 'translate' ? {} : parseTlcLog(log);
    const entry = Object.assign({}, r, { argv: r.argv.map(normalize), startedAt: new Date(s * 1000).toISOString(), durationS: Math.round((e - s) * 1000) / 1000, exitCode: ec, log: rel(path.join(OUT, `${r.runId}.log`)), logSha256: sha256(norm) }, parsed);
    if (entry.trace) entry.traceLength = entry.trace.states.length - 1;
    delete entry.trace;
    if (r.role === 'graph' || r.role === 'pair') {
      const dotFile = path.join(WORK, 'out', r.dot || `${r.configId}.dot`);
      const dot = fs.readFileSync(dotFile, 'utf8');
      const g = parseDot(dot);
      entry.dot = { sha256: sha256(dot), bytes: Buffer.byteLength(dot), nodes: g.nodes.length, edges: g.edges.length, initial: g.init.length };
      r.graphData = g;
    }
    r.parsed = parsed;
    summary.runs.push(entry);
    (byConfig[r.configId] = byConfig[r.configId] || []).push(r);
  }
  // Translated PlusCal module is a build-time input to both engines.
  const pcalDir = path.join(REPO, 'runs/RUN-spectacle-s5s8/pcal');
  fs.mkdirSync(pcalDir, { recursive: true });
  fs.copyFileSync(path.join(WORK, 's5', 'DoubleSpendPcal.tla'), path.join(pcalDir, 'DoubleSpendPcal.tla'));

  // Jobs for the harness.
  const index = [];
  for (const c of manifest.configs) {
    const cfg = parseCfg(fs.readFileSync(path.join(HERE, 'specs', c.dir, c.cfg), 'utf8'));
    const modules = {};
    const dirFiles = fs.readdirSync(path.join(WORK, c.dir)).filter((f) => f.endsWith('.tla') && !f.startsWith('PairCheck_'));
    // Only the root and the modules it reaches by EXTENDS (local ones).
    const want = new Set([c.module, ...(c.localExtends || [])]);
    for (const f of dirFiles) {
      const name = f.replace(/\.tla$/, '');
      if (want.has(name)) modules[name] = fs.readFileSync(path.join(WORK, c.dir, f), 'utf8');
    }
    const rs = byConfig[c.id] || [];
    const verdict = rs.find((r) => r.role === 'verdict');
    const graph = rs.find((r) => r.role === 'graph');
    const deadlockCheck = c.tlcArgs.includes('-deadlock') ? false : (cfg.checkDeadlock === null ? true : cfg.checkDeadlock);
    const job = {
      id: c.id, stage: c.stage, kind: c.kind, root: c.module, servedPath: `/specs/${c.dir}/${c.module}.tla`, modules,
      moduleSha256: Object.fromEntries(Object.entries(modules).map(([k, v]) => [k, sha256(v)])),
      constants: cfg.constants, init: c.init || cfg.init, next: c.next || cfg.next,
      invariants: c.kind === 'liveness' || c.kind === 'action-property' || c.kind === 'symmetry' ? [] : cfg.invariants,
      deadlockCheck, parseOnly: !!c.parseOnly, temporalProbes: c.temporalProbes || [], engines: c.engines || null,
      tlc: verdict ? { result: verdict.parsed.result, invariant: verdict.parsed.invariant, distinct: verdict.parsed.distinct, depth: verdict.parsed.depth, traceStates: verdict.parsed.trace ? verdict.parsed.trace.states.length : null } : null,
      tlcFull: graph ? { distinct: graph.parsed.distinct, generated: graph.parsed.generated, depth: graph.parsed.depth } : null,
      graph: graph ? graph.graphData : null,
      traces: verdict && verdict.parsed.trace ? [Object.assign({ name: 'tlc-counterexample' }, verdict.parsed.trace)] : [],
      pairs: (c.pairs || []).map((p, k) => {
        const pr = rs.find((r) => r.role === 'pair' && r.pairIndex === k);
        return { name: p.name, from: p.from, to: p.to, tlcGraph: pr ? pr.graphData : null };
      })
    };
    fs.writeFileSync(path.join(JOBS, `${c.id}.json`), JSON.stringify(job));
    index.push({ id: c.id, engines: job.engines, bytes: Buffer.byteLength(JSON.stringify(job)) });
  }
  fs.writeFileSync(path.join(JOBS, 'index.json'), JSON.stringify(index, null, 1));
  fs.writeFileSync(path.join(path.dirname(OUT), 'tlc-summary.json'), JSON.stringify(summary, null, 1) + '\n');
  console.log(`TLC: ${runs.length} runs in ${wallS.toFixed(1)} s; jobs in ${JOBS}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
