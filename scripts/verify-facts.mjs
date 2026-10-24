#!/usr/bin/env node
// GATE-facts (spine section 11.2; ARCHITECTURE.md sections 9.2, 9.3 and 18, items 14, 15 and 22; W0-T08).
//
// Sentences tagged as tool behavior match their runs, and the facts registry's TTLs are watched.
//
//   node scripts/verify-facts.mjs                 the fast lane
//   node scripts/verify-facts.mjs --today DATE    judge TTLs on DATE (YYYY-MM-DD) instead of today's UTC date
//   node scripts/verify-facts.mjs --json          print the report as JSON
//   node scripts/verify-facts.mjs --root DIR      check the tree under DIR (the fixtures use this)
//   node scripts/verify-facts.mjs --self-check    run the fixtures, then plant faults in a scratch copy of the
//                                                 tree; the gate must fail on each fault and only warn on a TTL
//
// A sentence is tagged as tool behavior when it names a value inside a run record (packages/runs/src/check.ts):
//   [X RUN-id#path]       a value tag: the sentence states the value at path (values.distinct_states.w2)
//   {{run:RUN-id#path}}   a value reference: copy prints the value, so the value is generated, not typed
// A citation, [X RUN-id] or {{run:RUN-id}}, names no value: GATE-numbers requires it, GATE-runs resolves it.
//
// The fast lane fails on:
//   values    a value tag whose sentence does not state the value its path names, or whose run is not on disk;
//             a value tag or value reference whose path names nothing, names a list or an object rather than
//             one value, or uses ARCHITECTURE.md's spelling outputs.values (run@1 keeps values at the top level)
//   copy      learner copy (content/stages/, labs/LAB-*/) that types a run's output (a count, a measure, a model
//             value, an exit code, a SQLSTATE, a verdict or a version) in a sentence about a run, where it must
//             print the value with a value reference (ARCHITECTURE.md section 18, item 14)
//   facts     a fact reference {{fact:id}} that names no fact in content/registry/facts.json
//   registry  content/registry/facts.json or errata.json that does not parse or breaks the format
//             (packages/runs/src/facts.ts and content/registry/README.md)
// It warns, and never fails, in every lane (ARCHITECTURE.md section 18, item 22):
//   ttl       a tool fact past checked_at + ttl_days; a twin fact or a run record with ttl_days (RUN-twin-pins,
//             RUN-lean-asset) past its run date + ttl_days. Each reads "stale since <date>" until it is re-checked.
//
// It reads the documents GATE-numbers reads (README.md, docs/, curriculum/, tracker/, labs/, design/,
// runs/README.md) plus all of content/, schemas/README.md and the READMEs of packages/, apps/, bench/ and
// scripts/; docs/history/ and design/canvas/ are exempt as history, and fixtures/ directories are skipped.
// Units (sentences, list items, table rows, headings) are cut by GATE-numbers' rules (scripts/runs/numbers-rules.mjs),
// so the two gates read the same sentences, and run records are loaded as GATE-runs loads them.
//
// Exit status: 0 green (warnings allowed), 1 findings, 2 the gate could not run.

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// packages/runs is TypeScript, which Node 22 runs with type stripping (on by default from 22.18).
if (!process.features.typescript && !process.env.FACTS_GATE_STRIP) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, FACTS_GATE_STRIP: '1' },
  });
  process.exit(again.status ?? 1);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const SCRIPT = fileURLToPath(import.meta.url);
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

if (flag('--help') || flag('-h')) {
  const lines = fs.readFileSync(SCRIPT, 'utf8').split('\n').slice(1);
  const head = lines.slice(0, lines.findIndex((l) => !l.startsWith('//')));
  console.log(head.map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}

let reg;
let rules;
let facts;
try {
  reg = await import(pathToFileURL(path.join(HERE, 'runs', 'registry.mjs')).href);
  rules = await import(pathToFileURL(path.join(HERE, 'runs', 'numbers-rules.mjs')).href);
  facts = await import(pathToFileURL(path.join(REPO, 'packages', 'runs', 'src', 'index.ts')).href);
} catch (e) {
  console.error(`GATE-facts: could not load its modules (scripts/runs/, packages/runs/): ${e instanceof Error ? e.message : e}`);
  process.exit(2);
}

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const todayUtc = () => new Date().toISOString().slice(0, 10);

// ------------------------------------------------------------------ the gate
/** Where the gate reads. */
const SCAN = ['README.md', 'docs', 'curriculum', 'tracker', 'labs', 'content', 'design', 'runs/README.md', 'schemas/README.md'];
/** In code directories only READMEs are read. */
const CODE_ROOTS = ['packages', 'apps', 'bench', 'scripts'];
const EXTENSIONS = new Set(['.md', '.mdx', '.yaml', '.yml', '.txt']);
const SKIP_DIRS = new Set(['node_modules', '.git', '.lake', 'target', '_solutions', '__pycache__', '.venv', 'fixtures', 'dist', 'generated']);
const REGISTRY_DIR = 'content/registry';
const FACTS_FILE = `${REGISTRY_DIR}/facts.json`;
const ERRATA_FILE = `${REGISTRY_DIR}/errata.json`;

/** The repository-relative files the gate reads under root. */
function listFiles(root) {
  const out = [];
  const exempt = (p) => rules.EXEMPT.some((e) => `${p}/`.startsWith(e));
  const walk = (rel, readmesOnly) => {
    const abs = path.join(root, rel);
    let st;
    try {
      st = fs.lstatSync(abs);
    } catch {
      return;
    }
    const p = rel.split(path.sep).join('/');
    if (exempt(p) || st.isSymbolicLink()) return;
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(path.basename(abs))) return;
      for (const e of fs.readdirSync(abs).sort()) walk(path.join(rel, e), readmesOnly);
    } else if (st.isFile()) {
      if (readmesOnly ? path.basename(p) === 'README.md' : EXTENSIONS.has(path.extname(p))) out.push(p);
    }
  };
  for (const s of SCAN) walk(s, false);
  for (const c of CODE_ROOTS) walk(c, true);
  return [...new Set(out)];
}

/** A unit for packages/runs' checkUnit, from one of GATE-numbers' units or a heading block. */
function unitOf(file, copy, text, line, lineOf, covered) {
  return { file, line, lineOf, text, copy, covered, tokens: rules.tokensOf(text) };
}

/** Run every check on the tree under root; returns the report. */
function runGate(root, today) {
  const started = Date.now();
  const findings = [];
  const warnings = [];
  const notes = [];
  const counts = { files: 0, units: 0, copyFiles: 0, ...facts.emptyCounts(), runs: 0, runsWithTtl: 0, facts: 0, factsWithTtl: 0, errata: 0 };
  const fail = (check, where, detail) => findings.push({ check, where, detail });
  const warn = (check, where, detail) => warnings.push({ check, where, detail });

  // Runs, as GATE-runs loads them. A record that does not parse is GATE-runs' finding; it is skipped here.
  const runs = new Map();
  for (const r of reg.loadRegistry(root)) {
    if (r.doc !== null) runs.set(r.id, r.doc);
  }
  counts.runs = runs.size;
  counts.runsWithTtl = [...runs.values()].filter((d) => typeof d?.ttl_days === 'number').length;

  // The facts registry.
  const file = (p) => {
    const abs = path.join(root, p);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
    const bytes = fs.readFileSync(abs);
    return { text: bytes.toString('utf8'), sha256: sha256(bytes) };
  };
  const readJson = (p) => {
    const f = file(p);
    if (f === null) return { missing: true };
    try {
      return { doc: JSON.parse(f.text) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  };
  let factList = [];
  let errata = [];
  const factMap = new Map();
  if (fs.existsSync(path.join(root, REGISTRY_DIR))) {
    const ctx = { today, runs, file };
    const f = readJson(FACTS_FILE);
    if (f.missing) fail('registry', FACTS_FILE, 'missing: the facts registry holds its facts here (content/registry/README.md)');
    else if (f.error) fail('registry', FACTS_FILE, `does not parse: ${f.error}`);
    else {
      const r = facts.checkFacts(f.doc, ctx);
      factList = r.facts;
      for (const i of r.issues) fail('registry', `${FACTS_FILE}${i.id ? ` ${i.id}` : ''}`, i.detail);
    }
    for (const x of factList) factMap.set(x.id, x);
    const e = readJson(ERRATA_FILE);
    if (e.missing) fail('registry', ERRATA_FILE, 'missing: errata live here, even when there are none yet (content/registry/README.md)');
    else if (e.error) fail('registry', ERRATA_FILE, `does not parse: ${e.error}`);
    else {
      const r = facts.checkErrata(e.doc, { ...ctx, facts: factMap });
      errata = r.errata;
      for (const i of r.issues) fail('registry', `${ERRATA_FILE}${i.id ? ` ${i.id}` : ''}`, i.detail);
    }
  } else {
    notes.push(`no facts registry under this root (${REGISTRY_DIR}/): only sentences and run TTLs are checked`);
  }
  counts.facts = factList.length;
  counts.factsWithTtl = factList.filter((x) => x.kind === 'tool' || x.kind === 'twin').length;
  counts.errata = errata.length;

  // Sentences.
  const ctx = { runs, facts: factMap };
  const factRefs = new Map();
  const add = (unit) => {
    const r = facts.checkUnit(unit, ctx);
    counts.units += 1;
    for (const k of Object.keys(r.counts)) counts[k] += r.counts[k];
    for (const f of r.findings) fail(f.check, `${f.file}:${f.line}`, f.detail);
    for (const id of r.factIds) factRefs.set(id, [...(factRefs.get(id) ?? []), `${unit.file}:${unit.line}`]);
  };
  for (const rel of listFiles(root)) {
    counts.files += 1;
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    const copy = rules.isCopy(rel);
    if (copy) counts.copyFiles += 1;
    for (const u of rules.unitsOf(text, rel, new Set())) add(unitOf(rel, copy, u.text, u.line, u.lineOf, u.tags.has('reference')));
    // Headings and YAML titles are not GATE-numbers units, but a value tag or reference in one is still read.
    for (const b of rules.blocksOf(text, rel)) {
      if ((b.kind === 'heading' || b.kind === 'title') && /\[X\s|\{\{(?:run|fact):/.test(b.text)) add(unitOf(rel, copy, b.text, b.line, b.lineOf, false));
    }
  }

  // TTLs: warn, never fail.
  for (const x of facts.expiredTtls(factList, runs, today)) {
    const s = x.staleness;
    if (x.kind === 'fact') {
      const fact = factMap.get(x.id);
      const refs = factRefs.get(x.id) ?? [];
      const clock = fact?.kind === 'twin' ? `pinned in ${x.via} on ${s.anchor}` : `checked ${s.anchor}`;
      warn('ttl', `${FACTS_FILE} ${x.id}`, `${clock}, TTL ${s.ttl_days} days: stale since ${s.expires} (${s.age_days} days old)${refs.length > 0 ? `; ${refs.length} fact reference${refs.length === 1 ? ' shows' : 's show'} the badge` : ''}. Re-check it against its source and move ${fact?.kind === 'twin' ? `the pin in ${x.via}` : 'checked_at'}`);
    } else {
      warn('ttl', `runs/${x.id}.json`, `ran ${s.anchor}, TTL ${s.ttl_days} days: stale since ${s.expires} (${s.age_days} days old). Re-run it (spine section 9.5) to refresh what it describes`);
    }
  }
  return { root: displayRoot(root), today, counts, findings, warnings, notes, seconds: (Date.now() - started) / 1000 };
}

/** The root as the report prints it: repository-relative, never a private path. */
function displayRoot(root) {
  const rel = path.relative(REPO, root);
  if (rel === '') return '.';
  return rel.startsWith('..') || path.isAbsolute(rel) ? '<root>' : rel.split(path.sep).join('/');
}

function printReport(r) {
  if (flag('--json')) {
    process.stdout.write(`${JSON.stringify(r, null, 2)}\n`);
    return;
  }
  const c = r.counts;
  const n = (k, one, many = `${one}s`) => `${c[k]} ${c[k] === 1 ? one : many}`;
  console.log(`GATE-facts${r.root === '.' ? '' : ` (root ${r.root})`}`);
  console.log(`  read  ${n('files', 'file')} (${c.copyFiles} of learner copy), ${n('units', 'unit')}; ${n('runs', 'run record')} (${c.runsWithTtl} with a TTL); content/registry/: ${n('facts', 'fact')} (${c.factsWithTtl} with a TTL) and ${n('errata', 'erratum', 'errata')}`);
  console.log(`  pass  ${n('valueTags', 'value tag')} stated by ${c.valueTags === 1 ? 'its sentence' : 'their sentences'}; ${n('valueRefs', 'value reference')} naming one value (${c.forwardValueRefs} waiting for ${c.forwardValueRefs === 1 ? 'its run' : 'their runs'}); ${n('factRefs', 'fact reference')}; ${n('copyTokens', 'run output')} in learner copy checked; ${c.citations} citations and ${c.placeholders} format placeholders (nothing to compare)`);
  console.log(`  date  TTLs judged on ${r.today}`);
  for (const note of r.notes) console.log(`  note  ${note}`);
  for (const w of r.warnings) console.log(`  warn  ${w.check}  ${w.where}: ${w.detail}`);
  for (const f of r.findings) console.log(`  FAIL  ${f.check}  ${f.where}: ${f.detail}`);
  const summary = `${n('valueTags', 'value tag')} stated, ${n('valueRefs', 'value reference')}, ${n('facts', 'fact')}, ${r.warnings.length} TTL warning${r.warnings.length === 1 ? '' : 's'}; ${r.seconds.toFixed(1)} s`;
  console.log(r.findings.length === 0 ? `GATE-facts: PASS (${summary})` : `GATE-facts: FAIL (${r.findings.length} finding${r.findings.length === 1 ? '' : 's'}; ${summary})`);
}

// ------------------------------------------------------------------ self-check
const FIXTURES = path.join(REPO, 'packages', 'runs', 'test', 'fixtures', 'facts');

/** Run this script on root; returns {status, report}. */
function runScript(root, extra = []) {
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root, '--json', ...extra], { encoding: 'utf8', maxBuffer: 1 << 28 });
  let report = null;
  try {
    report = JSON.parse(r.stdout);
  } catch {
    report = { parseError: (r.stdout || r.stderr).slice(0, 400), findings: [], warnings: [] };
  }
  return { status: r.status, report };
}

/**
 * The gate's own tests. 1. Every fixture under packages/runs/test/fixtures/facts/ is run with the date its
 * expected.json gives, and must exit as expected with exactly the expected findings and warnings. 2. Faults
 * are planted one at a time in a scratch copy of the tree; each must add the expected finding (or, for a TTL,
 * only a warning) to what the untouched copy reports.
 */
async function selfCheck() {
  const results = [];
  const record = (r) => {
    results.push(r);
    console.log(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.name}${r.detail ? `: ${r.detail}` : ''}`);
  };
  const check = (name, fn) => {
    try {
      const { ok, detail } = fn();
      record({ name, ok, detail });
    } catch (e) {
      record({ name, ok: false, detail: `threw ${e instanceof Error ? e.message : e}` });
    }
  };
  const where = (x) => `${x.check} ${x.where}`;
  /** Pair each expected entry with one actual entry of the same check and place whose detail matches its pattern. */
  const pair = (actual, expected) => {
    const left = [...actual];
    const missing = [];
    for (const e of expected) {
      const re = e.detail ? new RegExp(e.detail) : null;
      const i = left.findIndex((a) => a.check === e.check && a.where === e.where && (re === null || re.test(a.detail)));
      if (i < 0) missing.push(`${where(e)}${e.detail ? ` /${e.detail}/` : ''}`);
      else left.splice(i, 1);
    }
    return { missing, extra: left.map((a) => `${where(a)}: ${a.detail.slice(0, 120)}`) };
  };

  console.log('GATE-facts self-check');
  console.log('  1. fixtures: each must exit as expected, with exactly the expected findings and warnings');
  const dirs = fs.existsSync(FIXTURES) ? fs.readdirSync(FIXTURES).filter((d) => fs.existsSync(path.join(FIXTURES, d, 'expected.json'))).sort() : [];
  if (dirs.length === 0) record({ name: 'fixtures', ok: false, detail: `no fixtures under ${path.relative(REPO, FIXTURES)}` });
  for (const d of dirs) {
    const expected = JSON.parse(fs.readFileSync(path.join(FIXTURES, d, 'expected.json'), 'utf8'));
    for (const run of expected.runs) {
      check(`fixture ${d} --today ${run.today}: ${run.what}`, () => {
        const r = runScript(path.join(FIXTURES, d), ['--today', run.today]);
        if (r.report.parseError) return { ok: false, detail: `the gate did not run: ${r.report.parseError}` };
        const f = pair(r.report.findings, run.findings);
        const w = pair(r.report.warnings, run.warnings);
        const ok = r.status === run.exit && f.missing.length + f.extra.length + w.missing.length + w.extra.length === 0;
        const first = r.report.findings[0] ?? r.report.warnings[0];
        const n = (k, one) => `${r.report[k].length} ${one}${r.report[k].length === 1 ? '' : 's'}`;
        return {
          ok,
          detail: ok
            ? `exit ${r.status}, ${n('findings', 'finding')}, ${n('warnings', 'warning')}, as expected${first ? `; first: ${first.check} ${first.where}: ${first.detail.slice(0, 150)}` : ''}`
            : `exit ${r.status} (want ${run.exit}); findings missing ${JSON.stringify(f.missing)}, extra ${JSON.stringify(f.extra)}; warnings missing ${JSON.stringify(w.missing)}, extra ${JSON.stringify(w.extra)}`,
        };
      });
    }
  }

  console.log('  2. planted faults in a scratch copy of the tree: each must add its finding, or only a warning');
  const scratch = fs.mkdtempSync(path.join(process.env.FACTS_SCRATCH ?? os.tmpdir(), 'facts-self-check-'));
  try {
    const copy = (rel) => {
      const from = path.join(REPO, rel);
      if (fs.existsSync(from)) fs.cpSync(from, path.join(scratch, rel), { recursive: true, filter: (src) => !/[/\\](?:node_modules|\.git)(?:[/\\]|$)/.test(src) });
    };
    for (const rel of [...SCAN, 'runs']) copy(rel);
    for (const c of CODE_ROOTS) for (const f of listFiles(REPO).filter((p) => p.startsWith(`${c}/`))) copy(f);
    // The saved sources the registry's evidence names.
    const registry = JSON.parse(fs.readFileSync(path.join(REPO, FACTS_FILE), 'utf8'));
    for (const x of registry.facts ?? []) if (x.evidence?.path) copy(x.evidence.path);

    const today = todayUtc();
    const base = runScript(scratch, ['--today', today]);
    const key = (x) => `${x.check}|${x.where}|${x.detail}`;
    const before = new Set((base.report.findings ?? []).map(key));
    const beforeWarn = new Set((base.report.warnings ?? []).map(key));
    record({ name: 'the untouched copy', ok: !base.report.parseError, detail: base.report.parseError ? `the gate did not run: ${base.report.parseError}` : `exit ${base.status}, ${before.size} findings and ${beforeWarn.size} warnings of its own; the plants below are judged by what each adds` });
    const added = (r) => (r.report.findings ?? []).filter((f) => !before.has(key(f)));
    const addedWarn = (r) => (r.report.warnings ?? []).filter((w) => !beforeWarn.has(key(w)));
    const withFile = (rel, change, fn) => {
      const abs = path.join(scratch, rel);
      const existed = fs.existsSync(abs);
      const old = existed ? fs.readFileSync(abs) : null;
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, change(old === null ? '' : old.toString('utf8')));
      try {
        return fn();
      } finally {
        if (existed) fs.writeFileSync(abs, old);
        else fs.rmSync(abs);
      }
    };
    const append = (line) => (old) => `${old.replace(/\n*$/, '\n')}\n${line}\n`;
    const failsOn = (r, pred, what) => {
      const hit = added(r).find(pred);
      return { ok: r.status === 1 && Boolean(hit), detail: hit ? `fails as it should: ${hit.check} ${hit.where}: ${hit.detail.slice(0, 170)}` : `exit ${r.status}; no new finding for ${what}` };
    };
    const passes = (r, what) => {
      const extra = added(r);
      return { ok: extra.length === 0 && r.status === base.status, detail: extra.length === 0 ? `adds no finding, as it should: ${what}` : `adds ${extra.length}: ${extra.slice(0, 2).map((f) => `${f.where} ${f.detail.slice(0, 100)}`).join('; ')}` };
    };
    const editFacts = (fn) => (old) => {
      const doc = JSON.parse(old);
      fn(doc);
      return `${JSON.stringify(doc, null, 2)}\n`;
    };
    const run = (date = today) => runScript(scratch, ['--today', date]);

    check('planted: a value tag whose sentence states 12 where the run records 11, in README.md', () =>
      withFile('README.md', append('With two workers, TLC 1.8.0 finds 12 distinct states on the double-spend spec [X RUN-tlc-full#values.distinct_states.w2].'), () =>
        failsOn(run(), (f) => f.check === 'values' && f.where.startsWith('README.md:') && /which is 11/.test(f.detail), 'the disagreeing value')));
    check('control: the same sentence stating 11 passes', () =>
      withFile('README.md', append('With two workers, TLC 1.8.0 finds 11 distinct states on the double-spend spec [X RUN-tlc-full#values.distinct_states.w2].'), () => passes(run(), 'the sentence states the value')));
    check('planted: a value tag stating 1.4.2 where the run records 1.4.2-modified, in docs/PLAN.md', () =>
      withFile('docs/PLAN.md', append('The cvc5 wheel prints its version as 1.4.2 [X RUN-cvc5-alethe#values.version_printed].'), () =>
        failsOn(run(), (f) => f.check === 'values' && f.where.startsWith('docs/PLAN.md:') && /1\.4\.2-modified/.test(f.detail), 'the shortened version')));
    check('planted: a value reference to an object, in docs/PLAN.md', () =>
      withFile('docs/PLAN.md', append('TLC finds {{run:RUN-tlc-full#values.distinct_states}} distinct states.'), () =>
        failsOn(run(), (f) => f.check === 'values' && /an object with keys w2/.test(f.detail), 'the object')));
    check("planted: a value reference in ARCHITECTURE.md's spelling outputs.values, in docs/PLAN.md", () =>
      withFile('docs/PLAN.md', append('TLC finds {{run:RUN-tlc-full#outputs.values.distinct_states.w2}} distinct states.'), () =>
        failsOn(run(), (f) => f.check === 'values' && /run@1 keeps named values at the top level/.test(f.detail), 'the outputs.values spelling')));
    check('planted: a value tag citing a run that is not on disk', () =>
      withFile('docs/PLAN.md', append('The phone loads Z3 in 3 s [X RUN-does-not-exist#values.ready_s].'), () =>
        failsOn(run(), (f) => f.check === 'values' && /RUN-does-not-exist/.test(f.detail), 'the missing run')));
    check('planted: learner copy that types a TLC count beside its run reference', () =>
      withFile('content/stages/S5/L1.md', () => 'With two workers, TLC finds 11 distinct states {{run:RUN-tlc-full}}.\n', () =>
        failsOn(run(), (f) => f.check === 'copy' && f.where.startsWith('content/stages/S5/L1.md:1'), 'the typed count')));
    check('control: the same copy printing the count with a value reference passes', () =>
      withFile('content/stages/S5/L1.md', () => 'With two workers, TLC finds {{run:RUN-tlc-full#values.distinct_states.w2}} distinct states.\n', () => passes(run(), 'the value is generated')));
    check('planted: a fact reference to a fact the registry does not hold', () =>
      withFile('docs/PLAN.md', append('Pyodide {{fact:tool.no-such.fact}} is the version the tab loads.'), () =>
        failsOn(run(), (f) => f.check === 'facts' && /tool\.no-such\.fact/.test(f.detail), 'the unknown fact')));
    check('planted: a registry fact without a source', () =>
      withFile(FACTS_FILE, editFacts((doc) => delete doc.facts[0].source), () =>
        failsOn(run(), (f) => f.check === 'registry' && /source must be an object/.test(f.detail), 'the missing source')));
    check('planted: a tool fact with a 30-day TTL', () =>
      withFile(FACTS_FILE, editFacts((doc) => (doc.facts.find((x) => x.kind === 'tool').ttl_days = 30)), () =>
        failsOn(run(), (f) => f.check === 'registry' && /from 60 to 90/.test(f.detail), 'the short TTL')));
    check('TTL: a tool fact checked 61 days ago warns, and the exit and findings stay as they were', () =>
      withFile(FACTS_FILE, editFacts((doc) => (doc.facts.find((x) => x.kind === 'tool').checked_at = facts.addDays(today, -61))), () => {
        const r = run();
        const w = addedWarn(r).find((x) => x.check === 'ttl' && /stale since/.test(x.detail));
        const extra = added(r);
        return { ok: Boolean(w) && extra.length === 0 && r.status === base.status, detail: w ? `warns, exit ${r.status} as before, ${extra.length} new findings: ${w.where}: ${w.detail.slice(0, 140)}` : `no TTL warning (exit ${r.status})` };
      }));
    check('TTL: every run with ttl_days warns once its TTL has passed (judged 400 days ahead), and nothing fails', () => {
      const ahead = facts.addDays(today, 400);
      const r = run(ahead);
      const withTtl = (r.report.counts?.runsWithTtl ?? 0);
      const runWarnings = (r.report.warnings ?? []).filter((w) => w.check === 'ttl' && w.where.startsWith('runs/'));
      const ok = r.status === base.status && added(r).length === 0 && runWarnings.length === withTtl && withTtl > 0;
      return { ok, detail: `${runWarnings.length} of ${withTtl} runs with a TTL warn on ${ahead}; exit ${r.status} as before${runWarnings[0] ? `; first: ${runWarnings[0].where}: ${runWarnings[0].detail.slice(0, 110)}` : ''}` };
    });
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  const bad = results.filter((r) => !r.ok).length;
  console.log(`GATE-facts self-check: ${bad === 0 ? 'PASS' : 'FAIL'} (${results.length - bad} of ${results.length} held)`);
  return bad === 0 ? 0 : 1;
}

// ------------------------------------------------------------------ main
if (flag('--self-check')) {
  process.exitCode = await selfCheck();
} else {
  const ROOT = path.resolve(option('--root') ?? REPO);
  const TODAY = option('--today') ?? todayUtc();
  if (!facts.isRealDate(TODAY)) {
    console.error(`GATE-facts: --today needs a real date, YYYY-MM-DD; got ${JSON.stringify(TODAY)}`);
    process.exit(2);
  }
  if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
    console.error(`GATE-facts: --root ${JSON.stringify(option('--root'))} is not a directory`);
    process.exit(2);
  }
  const report = runGate(ROOT, TODAY);
  printReport(report);
  // process.exitCode, not process.exit: a large JSON report written to a pipe must be flushed first.
  process.exitCode = report.findings.length === 0 ? 0 : 1;
}
