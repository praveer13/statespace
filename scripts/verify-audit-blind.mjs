#!/usr/bin/env node
// GATE-audit-blind (spine sections 6 and 11.2; docs/AUDIT-DESK.md section 7; W1-T40): could a learner who never reads
// a case beat chance on any figure the Desk reports? The gate drives the session composer and the scorer over
// simulated streams on both published paths (Desk sessions, Today blocks, Defence Part C draws and, once W3-T14
// ships them, Clearinghouse incidents) and fails when a blind strategy beats chance by more than 2 SD.
//
//   node scripts/verify-audit-blind.mjs              the fast lane
//   node scripts/verify-audit-blind.mjs --strict     the advisory strategies (AUDIT-DESK 7.2's proposals) block too
//   node scripts/verify-audit-blind.mjs --verbose    every test, not only the ones that varied
//   node scripts/verify-audit-blind.mjs --json       the report as one object (the stage-only floor and the bound
//                                                    for SCR-assurance included)
//   node scripts/verify-audit-blind.mjs --self-check plant faults; the gate must fail on each
//   --root DIR                                       check another tree (the pool, the registry, the paths)
//   --replicates N, --seed N                         experiments only; the lanes use the configuration
//
// Chance (AUDIT-DESK 7.4): for decision figures (TPR, TNR, BA, the Part C pass rate) the strategy's picks are
// permuted across the stream; for class figures (recall, precision, recall averaged over classes) within each stage,
// because a case's own stage legitimately narrows its class. 1,000 permutations per strategy and figure.
//
// The verdict [D]: a stream is one surface on one path. The gate draws 8 independent replicates of each, and a
// strategy's advantage is the mean over them of (observed - chance), against 2 SD of one stream's permutation null.
// With one replicate this is section 7.4's rule exactly; but then each of the tests that can vary fails a valid pool
// about 2.3% of the time by chance, and on a valid W1-shaped fixture pool some blocking test fails in a large share of
// seed configurations, against none under 8 replicates (scripts/spikes/W1-T40/README.md section 7.4
// [X RUN-audit-blind-gate]). Averaging over replicates keeps the 2-SD margin and the permutation null and takes the
// simulation's own noise out of the verdict.
//
// The bound (AUDIT-DESK 7.7; I10), on the last line: what a pass establishes, that no blocking strategy's advantage
// averaged over the 8 replicate streams exceeded 2 SD of one stream; and what the gate catches with 95% probability,
// an expected advantage above 2 + 1.645 x 1.3 / sqrt(8) = 2.76 SD. The average has noise of its own: SD / sqrt(8)
// under the null, and more under a real cue, which the 1.3 allows for (a normal approximation calibrate.mjs checks
// under two planted cues; README section 7.5). Each comes with its widest value on BA, recall averaged over classes
// and the Part C pass rate.
//
// Base rates: a blind strategy knows those of the cases its stream serves from, the pool's on the paths and the
// world's incidents' on the Clearinghouse stream, so the incidents never move a path stream's verdicts or the floor.
// What the world returns is checked before it is read: the blocks asked for, each a non-empty list, or a finding, so a
// world that returns nothing is never read as no world at all.
// The figures: every figure AUDIT-DESK 7.3 lists, at the n the Desk's display uses, must be shown under its id, or the
// gate fails (README section 5).
//
// The pool is content/audit/ (scripts/spikes/W1-T40/README.md section 3). The composer and the scorer are the Desk's
// own (W1-T32's judgment module at packages/learner/judgment/index.ts, section 5) for every surface it implements;
// until it exists the gate runs its reference implementation of AUDIT-DESK 5.2-5.3 and 6.1-6.6 and says so, and a
// judgment folder without that module fails the gate. Which null a figure is tested against is the gate's, whatever
// kind the scorer gives it; a figure the gate can form no null for is a finding. The Desk's composer is held to its
// contract wherever the gate takes its word: each sitting it returns keeps the rules (eligible cases, the size asked,
// the sound share, pairs apart); a null, which says no sitting keeps them, is checked against the reference composer
// asked for the same sitting; and every family it is offered is served at some point on each surface. A sitting it
// declines, or a family it never serves, would go unchecked while the gate reports green, so each is a finding: a
// single declined sitting fails the gate.
//
// Exit status: 0 green, 1 findings, 2 the gate could not run.

import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (!process.features.typescript) {
  const { spawnSync } = await import('node:child_process');
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(again.status ?? 2);
}

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIB = join(REPO, 'scripts', 'spikes', 'W1-T40', 'lib');
const pool = await import(pathToFileURL(join(LIB, 'pool.mjs')).href);
const blind = await import(pathToFileURL(join(LIB, 'blind.mjs')).href);

/** The calibration the bound's detection threshold rests on (README section 7.5); the self-check reads its measured inflation. */
const CALIBRATION = 'runs/RUN-audit-blind-gate/calibration.json';

const USAGE = 'usage: verify-audit-blind.mjs [--strict] [--verbose] [--json] [--self-check] [--root DIR] [--replicates N] [--seed N]';

export function parseArgs(argv) {
  const o = { root: REPO, strict: false, verbose: false, json: false, selfCheck: false, replicates: null, seed: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--root') o.root = resolve(value());
    else if (a === '--strict') o.strict = true;
    else if (a === '--verbose') o.verbose = true;
    else if (a === '--json') o.json = true;
    else if (a === '--self-check') o.selfCheck = true;
    else if (a === '--replicates') {
      o.replicates = Number(value());
      if (!Number.isInteger(o.replicates) || o.replicates < 1) throw new Error('--replicates needs a positive integer');
    } else if (a === '--seed') {
      o.seed = Number(value());
      if (!Number.isInteger(o.seed) || o.seed < 0 || o.seed >= 2 ** 32) throw new Error('--seed needs a uint32');
    } else throw new Error(`unknown argument ${a}`);
  }
  return o;
}

// ------------------------------------------------------------------ the Clearinghouse's incidents as cases

/**
 * The shape problems one incident would have as a case of the pool (scripts/spikes/W1-T40/README.md section 3, the
 * `shape` level the simulation reads: a valid key, a statement, texts, evidence of its class's type with one to three
 * load-bearing lines of its own texts, at least four selectable lines for line-anchored evidence). The incident goes
 * through the pool's own normalizer as the one case of a stand-in anchor, so an incident is held to exactly the rules a
 * pool case is; the stand-in anchor's own problems are not the incident's and are left out.
 */
function incidentShape(inc, stage, registry) {
  const problems = [];
  const doc = { id: 'AUD-99.1', stage, cases: [{ ...inc, id: 'incident', pair: undefined }], variants: [] };
  const anchor = pool.normalizeAnchor(doc, { file: 'incident', name: 'AUD-99.1.yaml', registry, problems });
  if (anchor) problems.push(...pool.contentProblems({ anchors: [anchor] }, { root: REPO, registry, spineAnchors: null }));
  return problems.filter((p) => p.level === 'shape' && p.case === 'incident').map((p) => p.message.replace(/^AUD-99\.1\/incident: /, ''));
}

/** Incidents in the pool's case form (scripts/spikes/W1-T40/README.md section 6), as cases the simulation reads. */
export function incidentCases(blocks, registry) {
  const cases = [];
  const index = [];
  const problems = [];
  blocks.forEach((block, bi) => {
    const row = [];
    (Array.isArray(block) ? block : []).forEach((inc, j) => {
      const where = `incident ${bi + 1}.${j + 1}`;
      // What an incident adds to a pool case is its stage; its key, texts and evidence are a pool case's, checked by
      // the pool's own rules (a key that is not none, a gap class or {class, also}, a class that is not a gap class).
      const stage = typeof inc?.stage === 'string' && registry.kind(inc.stage) === 'stage' ? inc.stage : null;
      if (!stage) {
        problems.push(`${where}: an incident needs a stage (a stage ID, S1-S10), got ${JSON.stringify(inc?.stage ?? null)}`);
        return;
      }
      const shape = incidentShape(inc, stage, registry);
      if (shape.length > 0) {
        problems.push(`${where}: ${shape.join('; ')} (an incident is a case in the pool's form: scripts/spikes/W1-T40/README.md sections 3 and 6)`);
        return;
      }
      const key = pool.readKey(inc.key);
      const text = [inc.statement, inc.diff, inc.receipt].map(pool.linesOf);
      row.push(cases.length);
      cases.push({
        id: `clearinghouse/${typeof inc.id === 'string' ? inc.id : `${bi}.${j}`}`,
        anchor: `clearinghouse/${typeof inc.family === 'string' ? inc.family : 'world'}`,
        stage,
        pair: `clearinghouse/${typeof inc.pair === 'string' ? inc.pair : `${bi}.${j}`}`,
        truth: key.truth,
        top: key.truth === 'flawed' ? registry.top(key.primary) : null,
        acceptableTop: key.truth === 'flawed' ? [...new Set([key.primary, ...key.also].map((c) => registry.top(c)).filter(Boolean))] : [],
        evType: typeof inc.evidence?.type === 'string' ? inc.evidence.type : null,
        selectable: text.flat().filter((l) => l.trim() !== '').length,
        loadBearing: Array.isArray(inc.evidence?.load_bearing) ? inc.evidence.load_bearing.length : 0,
        diffLines: pool.diffSize(text[1]),
        medium: typeof inc.medium === 'string' ? inc.medium : 'clearinghouse',
        scheduledAfter: ['CLEARINGHOUSE'], // never eligible on a path: incidents arrive through the world's own stream
      });
    });
    index.push(row);
  });
  return { cases, index, problems };
}

// ------------------------------------------------------------------ the run

/**
 * Run the gate on a tree. `inject` replaces parts for the self-check and the tests: `cases` (blind cases instead of
 * the tree's pool), `poolProblems`, `composerFor`, `score`, `judgment`, `incidents` (block lists per replicate), `cfg`
 * (configuration fields over blind.CONFIG, for self-check cases whose fault shows whatever the null).
 */
export async function runGate(o, inject = {}) {
  let registry;
  try {
    registry = pool.loadRegistry(o.root);
  } catch (e) {
    return { exit: 2, error: `the ID registry could not be read: ${e instanceof Error ? e.message : String(e)}` };
  }
  const cfg = { ...blind.CONFIG, ...(inject.cfg ?? {}), ...(o.replicates ? { replicates: o.replicates } : {}), ...(o.seed !== null && o.seed !== undefined ? { seed: o.seed } : {}) };
  const findings = [];
  const notes = [];
  /** A module's path as findings print it: relative to the tree. */
  const shown = (f) => (!f ? '-' : isAbsolute(f) ? relative(o.root, f).split(sep).join('/') : f);

  // The pool and the shape checks the simulation depends on.
  let cases = inject.cases ?? null;
  let poolInfo = { present: true, files: [] };
  if (!cases) {
    const loaded = await pool.loadPool(o.root, registry);
    poolInfo = { present: loaded.present, files: loaded.files };
    const problems = [...loaded.problems, ...pool.contentProblems(loaded, { root: o.root, registry, spineAnchors: pool.loadSpineAnchors(o.root) })];
    for (const p of problems.filter((x) => x.level === 'shape')) findings.push({ check: 'pool', where: p.file ?? '-', message: p.message });
    cases = pool.blindCases(loaded, problems);
  }
  for (const p of inject.poolProblems ?? []) findings.push({ check: 'pool', where: '-', message: p });

  // The Desk's own composer and scorer, where they exist.
  const judgment = inject.judgment ?? (await blind.loadJudgment(o.root));
  for (const p of judgment.problems ?? []) findings.push({ check: 'composer', where: shown(judgment.file), message: p });
  const realSurfaces = new Set(judgment.module && typeof judgment.module.composeAuditSitting === 'function' ? (judgment.surfaces ?? []) : []);
  const composerFor =
    inject.composerFor ??
    ((surface) => (realSurfaces.has(surface) ? (args) => judgment.module.composeAuditSitting(args) : blind.referenceCompose));
  const layout = blind.figureLayout(registry.topClasses);
  const score = inject.score ?? (judgment.module && typeof judgment.module.auditFigures === 'function' ? blind.externalScorer(judgment.module.auditFigures, layout) : blind.referenceScore);
  const composerName = (s) => (inject.composerFor ? 'injected' : realSurfaces.has(s) ? 'the Desk (W1-T32)' : 'reference');
  const scorerName = inject.score ? 'injected' : judgment.module && typeof judgment.module.auditFigures === 'function' ? 'the Desk (W1-T32)' : 'reference';

  // The Clearinghouse's incidents (W3-T14), one block list per replicate.
  let incidentBlocks = inject.incidents ?? null;
  let incidentNote = 'none shipped yet (W3-T14)';
  if (!incidentBlocks) {
    const lists = [];
    for (let r = 0; r < cfg.replicates; r++) {
      const got = await blind.loadIncidents(o.root, blind.deriveSeed(cfg.seed, `clearinghouse|r${r + 1}`), cfg.clearinghouse.blocks);
      for (const p of got.problems) findings.push({ check: 'clearinghouse', where: shown(got.file), message: p });
      if (!got.blocks) break;
      lists.push(got.blocks);
    }
    if (lists.length > 0) {
      const all = [];
      incidentBlocks = [];
      for (const blocks of lists) {
        const { cases: inc, index, problems } = incidentCases(blocks, registry);
        for (const p of problems) findings.push({ check: 'clearinghouse', where: 'apps/instruments/src/engines/clearinghouse/audit.ts', message: p });
        const offset = cases.length + all.length;
        all.push(...inc);
        incidentBlocks.push(index.map((row) => row.map((i) => i + offset)));
      }
      cases = [...cases, ...all];
      incidentNote = `${lists.length} replicate stream${lists.length === 1 ? '' : 's'} of ${cfg.clearinghouse.blocks} blocks from the world`;
    }
  } else incidentNote = 'injected';

  const flawed = cases.filter((c) => c.truth === 'flawed').length;
  if (cases.length === 0 || flawed === 0 || flawed === cases.length) {
    const why = cases.length === 0 ? (poolInfo.present ? 'content/audit/ holds no case the simulation can read' : 'there is no audit pool yet (content/audit/ arrives with W1-T33 and W1-T34)') : 'the pool holds only one kind of case, sound or flawed';
    return { exit: findings.length > 0 ? 1 : 0, empty: why, findings, notes, cases, bound: null, groups: [], floor: [], composers: {}, scorer: scorerName, cfg };
  }

  let result;
  try {
    result = await blind.runBlind({ root: o.root, registry, cases, cfg, composerFor, score, layout, incidentBlocks });
  } catch (e) {
    return { exit: 2, error: `the simulation could not run: ${e instanceof Error ? e.stack : String(e)}` };
  }
  for (const p of result.problems) findings.push({ check: 'composer', where: '-', message: p });
  // A composer returns null only when no sitting keeps the rules, and serves every family it is offered (README section
  // 5): a sitting it declines, or a family it never serves, is never checked, and the gate would report green anyway.
  for (const d of result.declined) {
    findings.push({ check: 'composer', where: d.where, message: `the composer returned no sitting for ${d.declined} of the ${d.asked} ${d.surface} sittings asked for, where the reference composer fills each from the same eligible cases (the first after ${d.first}): composeAuditSitting returns null only when no sitting keeps the rules, and a sitting it declines is never checked${d.checked ? '' : '; nothing on this surface was checked'} (scripts/spikes/W1-T40/README.md section 5)` });
  }
  for (const u of result.neverServed) {
    findings.push({ check: 'composer', where: u.where, message: `the composer never served ${u.anchors.join(', ')}, though the sittings it filled offered ${u.anchors.length === 1 ? 'that family' : 'those families'}, so ${u.anchors.length === 1 ? 'its' : 'their'} cases go unchecked on this surface: a composer serves every family it is offered at some point (AUDIT-DESK 5.3; scripts/spikes/W1-T40/README.md section 5)` });
  }
  for (const u of result.unserved) findings.push({ check: 'pool', where: u.path, message: `never served on the ${u.path} path, so never checked: ${u.anchors.join(', ')} (their scheduled_after units never complete there)` });
  // Which null each figure is tested against is the gate's (AUDIT-DESK 7.4, decision 5); a scorer's own label is
  // only reported. A figure the scorer shows but the gate formed no null for would go untested: that is a finding.
  const moduleKinds = score.moduleKinds ?? new Map();
  const preset = blind.figureLayout(registry.topClasses);
  for (const [id, kind] of moduleKinds) {
    const j = preset.ids.indexOf(id);
    if (j >= 0 && kind !== preset.kinds[j]) notes.push(`the scorer files ${id} as a ${JSON.stringify(kind)} figure; the gate tests it against its own null for ${id}, the ${preset.kinds[j] === 'class' ? 'permutation within each stage' : 'permutation across the stream'} (scripts/spikes/W1-T40/README.md section 5)`);
  }
  for (const u of result.untested) {
    const kind = moduleKinds.get(u.figure) ?? u.kind;
    findings.push({ check: 'scorer', where: u.where.join(', '), message: `the scorer shows ${u.figure} (kind ${JSON.stringify(kind)}) but the gate formed no permutation null for it, so ${u.strategies.join(', ')} went untested on it: a figure's kind is "decision" or "class", and it is shown under the permuted picks as under the observed ones (scripts/spikes/W1-T40/README.md section 5)` });
  }
  // Every figure AUDIT-DESK 7.3 lists, at the n the Desk's display uses, is shown under its id: a scorer that drops or
  // renames one (v1's "balanced accuracy" under another name, say) would take it out of the tests unseen.
  for (const m of result.missing) {
    findings.push({ check: 'scorer', where: m.where.join(', '), message: `the scorer shows no ${m.figure}, which the Desk shows ${m.rule} (AUDIT-DESK 6.5 and 7.3), so ${m.strategies.join(', ')} went untested on it: auditFigures returns each required figure under its id (scripts/spikes/W1-T40/README.md section 5)` });
  }
  for (const s of result.skipped) notes.push(`could not compose ${s}: the reference composer finds no sitting there that keeps the rules (pairs apart, the sound share) among the eligible cases`);

  const strategy = new Map(blind.STRATEGIES.map((s) => [s.id, s]));
  for (const g of result.groups) {
    for (const v of g.verdicts) {
      // A constant strategy's balanced accuracy is 0.5 by definition (AUDIT-DESK 6.2): a scorer that gives another
      // value is scoring something else (v1's precision on rejections, for one).
      if ((v.strategy === 'always-reject' || v.strategy === 'always-accept') && v.figure === 'ba' && Math.abs(v.obs - 0.5) > 1e-9) {
        findings.push({ check: 'scorer', where: `${g.path}/${g.surface}`, message: `${v.strategy} scored balanced accuracy ${v.obs.toFixed(4)}; any strategy that ignores the case scores exactly 0.5 (AUDIT-DESK 6.2)` });
      }
      if (!v.fail) continue;
      const s = strategy.get(v.strategy);
      const text = `${v.strategy} beats chance on ${v.figure}: ${fmt(v.obs)} against chance ${fmt(v.chance)} (SD ${fmt(v.sd)}, limit ${fmt(v.limit)}, advantage ${v.advantage >= 0 ? '+' : ''}${fmt(v.advantage)} = ${Number.isFinite(v.z) ? v.z.toFixed(1) : 'inf'} SD over ${v.replicates} streams)`;
      if (s.blocking || o.strict) findings.push({ check: s.blocking ? 'blind' : 'advisory', where: `${g.path}/${g.surface}`, message: text });
      else notes.push(`advisory (AUDIT-DESK 7.2 proposal; blocks under --strict): ${g.path}/${g.surface}: ${text}`);
    }
  }
  const floor = await blind.stageOnlyFloor({ root: o.root, registry, cases, cfg, composerFor });
  const bound = blind.boundOf(result, cases, cfg.margin, { strict: o.strict });
  const composers = Object.fromEntries(['desk', 'today', 'part-c'].map((s) => [s, composerName(s)]));
  composers.clearinghouse = incidentNote;
  return { exit: findings.length > 0 ? 1 : 0, findings, notes, cases, result, groups: result.groups, floor, bound, composers, scorer: scorerName, cfg };
}

const fmt = (x) => (Number.isFinite(x) ? x.toFixed(3) : String(x));

/**
 * The bound as one line: the pool's size, the streams' length, what a pass establishes (no blocking strategy's
 * advantage, averaged over the replicate streams, exceeded the margin) and what the gate catches with 95% probability
 * (an expected advantage above margin + 1.645 x inflation / sqrt(replicates) SD), each with its widest value on BA,
 * class recall averaged over classes and the Part C pass rate.
 */
export function boundLine(bound) {
  if (!bound) return 'bound: none, the pool is empty';
  const { pool: p, streams: s, rule, widest } = bound;
  const shown = ['ba', 'recall-macro', 'part-c-pass'].map((id) => widest.find((w) => w.figure === id)).filter(Boolean);
  const list = (key) => (shown.length ? ` (at most ${shown.map((w) => `+${w[key].toFixed(3)} on ${w.figure}`).join(', ')})` : '');
  const sd = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(2));
  const over = rule.replicates === 1 ? 'in one stream' : `averaged over ${rule.replicates} replicate streams`;
  return `bound: ${p.cases} cases (${p.sound} sound, ${p.flawed} flawed) in ${p.anchors} anchors; ${s.groups} streams × ${s.replicates} replicates of ${s.minDecisions}-${s.maxDecisions} decisions, ${s.replicates * s.permutationsPerReplicate} permutations per strategy and figure; a pass means no blocking strategy's advantage over chance, ${over}, exceeded ${sd(rule.marginSd)} SD of one stream${list('margin')}; an expected advantage above ${sd(rule.detectSd)} SD is caught with 95% probability${list('detect')}`;
}

export function formatReport(r, verbose = false) {
  const lines = [];
  if (r.empty) {
    lines.push(`GATE-audit-blind: ${r.empty}; nothing to simulate`);
    for (const f of r.findings) lines.push(`FAIL  ${f.check}  ${f.where}  ${f.message}`);
    lines.push(r.findings.length === 0 ? `GATE-audit-blind: green (no pool yet); ${boundLine(null)}` : `GATE-audit-blind: FAIL (${r.findings.length} finding${r.findings.length === 1 ? '' : 's'}); ${boundLine(null)}`);
    return lines;
  }
  const b = r.bound;
  lines.push(`GATE-audit-blind: ${b.pool.cases} cases in ${b.pool.anchors} anchors (${b.pool.stages.join(', ')}); composer: desk ${r.composers.desk}, today ${r.composers.today}, part-c ${r.composers['part-c']}; Clearinghouse: ${r.composers.clearinghouse}; scorer: ${r.scorer}`);
  for (const g of r.groups) {
    const fails = g.verdicts.filter((v) => v.fail);
    const varied = g.verdicts.filter((v) => v.sd > 0);
    const worst = varied.reduce((m, v) => (m === null || v.z > m.z ? v : m), null);
    lines.push(`  ${fails.some((v) => blind.STRATEGIES.find((s) => s.id === v.strategy).blocking) ? 'FAIL' : 'ok  '}  ${`${g.path}/${g.surface}`.padEnd(22)} ${g.streams.length} × ${g.streams[0].decisions} decisions, ${g.verdicts.length} tests (${varied.length} could vary)${worst ? `; largest ${worst.strategy} ${worst.figure} ${worst.advantage >= 0 ? '+' : ''}${worst.advantage.toFixed(3)} (${worst.z.toFixed(2)} SD)` : ''}`);
    if (verbose) for (const v of g.verdicts) lines.push(`        ${v.fail ? 'FAIL' : '    '}  ${v.strategy.padEnd(22)} ${v.figure.padEnd(16)} observed ${fmt(v.obs)}  chance ${fmt(v.chance)}  SD ${fmt(v.sd)}  advantage ${v.advantage >= 0 ? '+' : ''}${fmt(v.advantage)}`);
  }
  for (const f of r.floor) lines.push(`  stage-only floor (report-only, AUDIT-DESK 7.6), ${f.path}: ${Object.entries(f.figures).filter(([k]) => k === 'recall-macro' || k.startsWith('recall:')).map(([k, v]) => `${k} ${v}`).join(', ') || 'no class shown at n >= 10'}`);
  for (const n of r.notes) lines.push(`  note: ${n}`);
  for (const f of r.findings) lines.push(`FAIL  ${f.check}  ${f.where}  ${f.message}`);
  const byCheck = {};
  for (const f of r.findings) byCheck[f.check] = (byCheck[f.check] ?? 0) + 1;
  lines.push(
    r.findings.length === 0
      ? `GATE-audit-blind: green; ${boundLine(b)}`
      : `GATE-audit-blind: FAIL (${r.findings.length} finding${r.findings.length === 1 ? '' : 's'}: ${Object.entries(byCheck).map(([k, v]) => `${k} ${v}`).join(', ')}); ${boundLine(b)}`,
  );
  return lines;
}

// ------------------------------------------------------------------ self-check

/**
 * Plant one fault at a time; the gate must fail on each, and the clean fixture must pass with its bound printed.
 * Runs on fixture pools built in memory (scripts/spikes/W1-T40/lib/fixtures.mjs) and on ones written as files. Every
 * rule of the gate has a case here, so that a weakened rule fails its case: scripts/spikes/W1-T40/mutants.mjs weakens
 * each in turn and runs this self-check.
 */
export async function selfCheck() {
  const fx = await import(pathToFileURL(join(LIB, 'fixtures.mjs')).href);
  const registry = pool.loadRegistry(REPO);
  const results = [];
  const buildCases = (docs) => {
    const problems = [];
    const anchors = docs.map((doc) => pool.normalizeAnchor(doc, { file: `content/audit/${doc.id}.yaml`, name: `${doc.id}.yaml`, registry, problems })).filter(Boolean);
    const loaded = { anchors, present: true };
    problems.push(...pool.contentProblems(loaded, { root: REPO, registry, spineAnchors: pool.loadSpineAnchors(REPO) }));
    return { cases: pool.blindCases(loaded, problems), shape: problems.filter((p) => p.level === 'shape').map((p) => p.message) };
  };
  const mutate = (fn) => {
    const docs = fx.w1Pool();
    fn(docs);
    return docs;
  };
  const clean = buildCases(fx.w1Pool());
  const noJudgment = { module: null, problems: [] };
  // A fault found while composing or scoring shows whatever the null, so those cases run one replicate of 50
  // permutations; the cases about cues and verdicts run the gate's own configuration.
  const quick = { replicates: 1, permutations: 50 };
  // Runs at the repository's root inject no incidents: the fixture's verdicts never depend on a Clearinghouse module the
  // tree may hold (W3-T14); the cases about incidents inject their own.
  const run = (inject, o = {}) => runGate({ root: REPO, strict: false, ...o }, { judgment: noJudgment, cases: clean.cases, poolProblems: clean.shape, incidents: [], ...inject });
  const expect = async (name, check, promise, extra = () => true) => {
    const r = await promise;
    const hit = (r.findings ?? []).filter((f) => f.check === check);
    const ok = hit.length > 0 && extra(r, hit);
    const shown = (extra.text !== undefined && hit.find((f) => f.message.includes(extra.text))) || hit[0];
    results.push({ name, check, pass: ok, detail: ok ? shown.message : `no such ${check} finding (${(r.findings ?? []).map((f) => f.check).join(', ') || 'none'})${r.error ? `: ${r.error}` : ''}` });
  };
  /** The finding of the check must say this (several rules share a check). */
  const says = (text) => Object.assign((_, hit) => hit.some((f) => f.message.includes(text)), { text });
  /** A case made of several checks: it holds when every one does, and its detail names those that did not. */
  const all = (name, checks, detail) => {
    const failed = checks.filter(([, ok]) => !ok).map(([what]) => what);
    results.push({ name, check: '-', pass: failed.length === 0, detail: failed.length === 0 ? detail : `did not hold: ${failed.join('; ')}` });
  };
  const trees = [];
  /** A scratch root holding `files`; `pool` adds the fixture written under content/audit/ with the paths a gate run needs. */
  const scratch = (files = {}, { withPool = false } = {}) => {
    const t = mkdtempSync(join(tmpdir(), 'audit-blind-'));
    trees.push(t);
    if (withPool) {
      writeFileSync(join(t, 'package.json'), '{ "type": "module" }\n');
      for (const d of ['packages', 'docs', 'tracker', 'runs', 'research']) symlinkSync(join(REPO, d), join(t, d));
      mkdirSync(join(t, 'content', 'audit'), { recursive: true });
      symlinkSync(join(REPO, 'content', 'stages'), join(t, 'content', 'stages'));
      for (const a of fx.w1Pool()) writeFileSync(join(t, 'content', 'audit', `${a.id}.json`), `${JSON.stringify(a, null, 2)}\n`);
    }
    for (const [rel, text] of Object.entries(files)) {
      mkdirSync(dirname(join(t, rel)), { recursive: true });
      writeFileSync(join(t, rel), text);
    }
    return t;
  };
  try {
    const base = await run({});
    const bl = boundLine(base.bound);
    results.push({ name: 'the clean W1-shaped fixture passes and prints its bound', check: '-', pass: base.exit === 0 && base.bound !== null && base.bound.widest.length > 0, detail: base.exit === 0 ? bl : base.findings.map((f) => f.message).join('; ') });

    // The bound (AUDIT-DESK 7.7): spine 6's 2 SD, 7.4's 1,000 permutations, the detection threshold's formula, and an
    // inflation allowance no smaller than the largest the calibration measured under its planted cues.
    const b = base.bound;
    let measured = null;
    try {
      measured = JSON.parse(readFileSync(join(REPO, CALIBRATION), 'utf8')).noiseInflation?.largest ?? null;
    } catch {
      measured = null;
    }
    all('the bound: 2 SD, 1,000 permutations, and a detection threshold the calibration supports', [
      ["the margin is spine section 6's 2 SD", b?.rule.marginSd === 2],
      ['1,000 permutations per strategy and figure (AUDIT-DESK 7.4)', b !== null && b.streams.replicates * b.streams.permutationsPerReplicate >= 1000],
      ['the detection threshold is margin + 1.645 × inflation / √replicates', b !== null && Math.abs(b.rule.detectSd - (b.rule.marginSd + (blind.Z95 * b.rule.inflation) / Math.sqrt(b.rule.replicates))) < 1e-12],
      [`the inflation it allows (${b?.rule.inflation}) covers the largest the calibration measured (${measured ?? `not on disk: ${CALIBRATION}`})`, b !== null && typeof measured === 'number' && b.rule.inflation >= measured],
      ["each figure's two values are those thresholds times its SD", b !== null && b.widest.every((w) => Math.abs(w.margin - b.rule.marginSd * w.sd) < 1e-12 && Math.abs(w.detect - b.rule.detectSd * w.sd) < 1e-12)],
      ['the last line prints both thresholds', b !== null && bl.includes(`exceeded ${b.rule.marginSd} SD of one stream`) && bl.includes(`above ${b.rule.detectSd.toFixed(2)} SD is caught with 95% probability`)],
    ], `margin ${b?.rule.marginSd} SD, ${b ? b.streams.replicates * b.streams.permutationsPerReplicate : '?'} permutations, detection above ${b?.rule.detectSd.toFixed(3)} SD with inflation ${b?.rule.inflation} (largest measured ${measured})`);

    // The bound prints, for each figure, its widest SD among the blocking tests that could vary, on every stream (README
    // section 7.5). On a constructed result the first test's SD, the narrowest, the default path's and an advisory
    // strategy's each differ from it; under --strict the advisory strategies block, so theirs counts.
    {
      const v = (strategy, figure, sd) => ({ strategy, figure, sd, obs: 0.5, chance: 0.5, advantage: 0, z: 0, fail: false });
      const constructed = {
        groups: [
          { path: 'default', surface: 'desk', streams: [{ decisions: 480 }], verdicts: [v('last-is-sound', 'ba', 0.02), v('always-reject', 'ba', 0), v('topic-is-class', 'recall-macro', 0.01), v('always-accept', 'tnr', 0)] },
          { path: 'builder', surface: 'today', streams: [{ decisions: 600 }], verdicts: [v('topic-is-class', 'ba', 0.05), v('last-is-sound', 'ba', 0.03), v('stage-majority', 'ba', 0.09), v('topic-is-class', 'recall-macro', 0.004)] },
        ],
        replicates: 8,
        perms: 125,
        margin: 2,
        inflation: 1.3,
      };
      const widestOf = (bound, figure) => bound.widest.find((w) => w.figure === figure) ?? null;
      const plain = blind.boundOf(constructed, clean.cases, 2);
      const strict = blind.boundOf(constructed, clean.cases, 2, { strict: true });
      all("the bound takes each figure's widest SD among the blocking tests on every stream", [
        ['ba at 0.05 (topic-is-class on builder/today), not the first test\'s 0.02, the narrowest or the default path\'s', widestOf(plain, 'ba')?.sd === 0.05 && widestOf(plain, 'ba')?.where === 'builder/today'],
        ['recall-macro at 0.01, the widest on the default path', widestOf(plain, 'recall-macro')?.sd === 0.01],
        ['an advisory strategy (stage-majority, 0.09) not counted by default, and counted under --strict', widestOf(strict, 'ba')?.sd === 0.09],
        ['a figure whose only test could not vary (tnr, SD 0) not printed', widestOf(plain, 'tnr') === null && plain.widest.every((w) => w.sd > 0)],
      ], `ba ${widestOf(plain, 'ba')?.sd} at ${widestOf(plain, 'ba')?.where}, recall-macro ${widestOf(plain, 'recall-macro')?.sd}; under --strict ba ${widestOf(strict, 'ba')?.sd}`);
    }

    // The stage-only floor (AUDIT-DESK 7.6, report-only) names each case's own stage's most frequent class: on the
    // fixture G2 at S1, G6 at S2 and G5 at S5, all line-anchored, so those recalls are above 0 on both paths, and the
    // classes that are no stage's most frequent (G1, G4, G8) are never named, so theirs are 0.
    const floorOf = (r) => r.floor ?? [];
    all("the stage-only floor names each stage's most frequent class", [
      ['a floor on both paths', floorOf(base).length === 2],
      ...['G2', 'G5', 'G6'].map((k) => [`recall:${k} above 0 on every path`, floorOf(base).length > 0 && floorOf(base).every((f) => f.figures[`recall:${k}`] > 0)]),
      ...['G1', 'G4', 'G8'].map((k) => [`recall:${k} 0 on every path`, floorOf(base).length > 0 && floorOf(base).every((f) => f.figures[`recall:${k}`] === 0)]),
    ], floorOf(base).map((f) => `${f.path}: ${['G1', 'G2', 'G4', 'G5', 'G6', 'G8'].map((k) => `recall:${k} ${f.figures[`recall:${k}`]}`).join(', ')}`).join('; '));

    // The reference scorer's definitions (AUDIT-DESK 6.2 and 6.6, ASSESSMENT 3.7; README section 7.2), on hand-built
    // streams whose figures are known: a finding is correct only when its class is acceptable, the line choice hits a
    // load-bearing line, and the evidence type the named class takes is line-anchored (an artifact type never
    // validates blind); a Part C draw passes with at least 3 hits of 4.
    {
      const P = blind.poolArrays(clean.cases, registry.topClasses);
      const lay = blind.figureLayout(registry.topClasses);
      const at = (id) => clean.cases.findIndex((c) => c.id === id);
      const K = (k) => registry.topClasses.indexOf(k);
      const G2 = at('AUD-1.1/flawed'); // G2, also G1; declaration
      const G4 = at('AUD-1.2/v1-flawed'); // G4, also G8; witness
      const OK = at('AUD-1.1/sound');
      /**
       * A stream of [case, hit, named class or null for an acceptance] slots, in sittings of `size`, scored by the
       * reference; `figure(id)` reads a figure (null when not shown), and `agrees` says whether the decision objects the
       * gate hands a Desk scorer (externalScorer), scored by the stand-in Desk scorer, give the same figures.
       */
      const streamOf = (surface, slots, size = slots.length) => {
        const n = slots.length;
        const sittings = [];
        for (let s = 0; s < n; s += size) sittings.push({ start: s, length: Math.min(size, n - s), topic: 'S1', stagesDone: ['S1'] });
        const S = { surface, n, caseIdx: Int32Array.from(slots, (x) => x[0]), sitting: Int32Array.from(slots, (_, i) => Math.floor(i / size)), pos: Int32Array.from(slots, (_, i) => i % size), last: new Uint8Array(n), hit: Uint8Array.from(slots, (x) => x[1]), aboveMedian: new Uint8Array(n), sittings, stageGroups: [Int32Array.from(slots.keys())] };
        const dec = Uint8Array.from(slots, (x) => (x[2] === null ? 0 : 1));
        const named = Int8Array.from(slots, (x) => (x[2] === null ? -1 : K(x[2])));
        const out = new Float64Array(lay.ids.length);
        const shown = new Uint8Array(lay.ids.length);
        blind.referenceScore(S, P, dec, named, out, shown, 'all');
        const extLayout = blind.figureLayout(registry.topClasses);
        const ext = blind.externalScorer(fx.fixtureAuditFigures(registry.topClasses), extLayout);
        const out2 = new Float64Array(extLayout.ids.length + 64);
        const shown2 = new Uint8Array(extLayout.ids.length + 64);
        ext(S, P, dec, named, out2, shown2, 'all');
        const agrees = lay.ids.every((id, j) => shown[j] === shown2[j] && (!shown[j] || Math.abs(out[j] - out2[j]) < 1e-12));
        return { figure: (id) => (shown[lay.ids.indexOf(id)] ? out[lay.ids.indexOf(id)] : null), agrees };
      };
      // Eight Desk slots, three times over: correct (G2 named, hit); no line hit; G4 named G4 (a witness); G4 named G2 (not
      // acceptable); G2 named G1 (acceptable, but G1 takes a scenario); a sound case accepted; a sound case flagged; G2
      // accepted.
      const eight = [[G2, 1, 'G2'], [G2, 0, 'G2'], [G4, 1, 'G4'], [G4, 1, 'G2'], [G2, 1, 'G1'], [OK, 1, null], [OK, 1, 'G2'], [G2, 1, null]];
      const deskStream = streamOf('desk', [...eight, ...eight, ...eight]);
      const desk = deskStream.figure;
      const close = (x, y) => x !== null && Math.abs(x - y) < 1e-12;
      // Four Part C draws: 3 hits (pass), 2 (a flagged G2 without a line hit), 3 (pass), 2 (G4 named G2, G2 named G1).
      const partCStream = streamOf('part-c', [
        [OK, 1, null], [G2, 1, 'G2'], [G2, 1, 'G2'], [G4, 1, 'G4'],
        [OK, 1, null], [G2, 0, 'G2'], [G2, 1, 'G2'], [OK, 1, 'G2'],
        [OK, 1, null], [OK, 1, null], [G2, 1, 'G2'], [G2, 1, null],
        [OK, 1, null], [G2, 1, 'G2'], [G4, 1, 'G2'], [G2, 1, 'G1'],
      ], 4);
      const partC = partCStream.figure;
      all("the reference scorer's figures on hand-built streams (AUDIT-DESK 6.2 and 6.6)", [
        ["the decision objects a Desk scorer receives give the stand-in Desk scorer the reference's figures, on the Desk and in Part C", deskStream.agrees && partCStream.agrees],
        ['tpr 5/6, tnr 1/2, ba 2/3', close(desk('tpr'), 5 / 6) && close(desk('tnr'), 1 / 2) && close(desk('ba'), 2 / 3)],
        ['tpr-correct 1/6: only the G2 finding with a line hit counts', close(desk('tpr-correct'), 1 / 6)],
        ['ba-correct 1/3', close(desk('ba-correct'), 1 / 3)],
        ['recall:G2 3/12 and precision:G2 3/12 (twelve G2 cases, G2 named twelve times)', close(desk('recall:G2'), 0.25) && close(desk('precision:G2'), 0.25)],
        ['recall-macro 1/4, the mean of the recalls shown', close(desk('recall-macro'), 0.25)],
        ['recall:G4 and precision:G4 not shown at n = 6 and 3', desk('recall:G4') === null && desk('precision:G4') === null],
        ['part-c-pass 2/4: a draw passes with 3 hits of 4, not 2', close(partC('part-c-pass'), 0.5)],
      ], `desk: tpr ${desk('tpr')?.toFixed(3)}, tnr ${desk('tnr')?.toFixed(3)}, ba ${desk('ba')?.toFixed(3)}, tpr-correct ${desk('tpr-correct')?.toFixed(3)}, ba-correct ${desk('ba-correct')?.toFixed(3)}, recall:G2 ${desk('recall:G2')}, precision:G2 ${desk('precision:G2')}; part-c-pass ${partC('part-c-pass')}`);
    }

    // The streams of README section 7.1, drawn by the reference composer on the default path: after each block, 8 Desk
    // sessions each of 5, 6 and 8 cases and 12 Today blocks of 10 serves; where the block holds its stage's Defence, 60
    // Part C draws of 4 cases from that stage's own cases. And a lab is done once its non-stretch stages are: on the
    // builder path S5-early completes LAB-5.1-LAB-5.6 and leaves the stretch stage LAB-5.7 to S5-late, so an anchor
    // scheduled after LAB-5 is served from S5-early. No sitting has more than half its slots above its median diff.
    {
      const P = blind.poolArrays(clean.cases, registry.topClasses);
      const pathsHere = await blind.loadPaths(REPO, registry);
      const def = pathsHere.find((p) => p.id === 'default');
      const positions = blind.positionsOf(def, clean.cases, registry);
      const draw = (surface) => blind.drawStream({ label: `self-check/${surface}`, surface, positions, cases: clean.cases, P, compose: blind.referenceCompose, cfg: blind.CONFIG, seed: 0x5717 });
      const desk = draw('desk');
      const today = draw('today');
      const partC = draw('part-c');
      const countBy = (xs) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
      const sizes = countBy(desk.sittings.map((s) => s.length));
      const perPosition = (S) => [...countBy(S.sittings.map((s) => s.position)).values()];
      const defenceBlocks = new Set(def.blocks.filter((b) => b.defence).map((b) => b.id));
      const ownStage = partC.sittings.every((st) => Array.from({ length: st.length }, (_, j) => clean.cases[partC.caseIdx[st.start + j]].stage).every((s) => s === st.topic));
      const overHalf = [desk, today, partC].flatMap((S) => S.sittings.filter((st) => Array.from({ length: st.length }, (_, j) => S.aboveMedian[st.start + j]).filter(Boolean).length > Math.floor(st.length / 2)));
      const builder = pathsHere.find((p) => p.id === 'builder');
      const lab5 = buildCases(mutate((d) => (d[7].scheduled_after = ['LAB-5']))).cases;
      const firstServed = blind.positionsOf(builder, lab5, registry).find((p) => p.eligible.some((i) => lab5[i].anchor === 'AUD-5.3'))?.block ?? null;
      all('the streams of README section 7.1', [
        [`Desk: 8 sessions each of 5, 6 and 8 cases after each of the ${positions.length} blocks`, sizes.size === 3 && [5, 6, 8].every((n) => sizes.get(n) === 8 * positions.length)],
        ['Today: 12 blocks of 10 serves after each block', today.sittings.length === 12 * positions.length && today.sittings.every((s) => s.length === 10)],
        ['Part C: 60 draws of 4 cases, only after a block that holds a Defence', partC.sittings.length > 0 && partC.sittings.every((s) => s.length === 4 && defenceBlocks.has(s.position)) && perPosition(partC).every((n) => n === 60)],
        ["Part C: every draw from the Defence stage's own cases", partC.sittings.length > 0 && ownStage],
        [`an anchor scheduled after LAB-5 is first served after S5-early on the builder path, not ${firstServed}`, firstServed === 'S5-early'],
        [`no sitting with more than half its slots above its median diff, which longest-diff-is-flawed flags (${overHalf.length})`, overHalf.length === 0],
      ], `Desk ${[...sizes].map(([n, c]) => `${c} of ${n}`).join(', ')}; Today ${today.sittings.length} blocks; Part C ${partC.sittings.length} draws at ${perPosition(partC).length} positions; LAB-5 served from ${firstServed}`);

      // The reference composer's draws (AUDIT-DESK 5.2-5.3), on the same streams: every k the share allows for each Desk
      // size, and 1 and 2 in Part C; the slots shuffled, so neither the first nor the last slot is sound in every sitting
      // or in none; and Today's serves sound at p = 0.30 + 0.30 u, so about 45% of them.
      const soundIn = (S, st) => Array.from({ length: st.length }, (_, j) => P.truth[S.caseIdx[st.start + j]] === 0);
      const ks = (S, n) => new Set(S.sittings.filter((st) => st.length === n).map((st) => soundIn(S, st).filter(Boolean).length));
      const share = (S, at) => S.sittings.filter((st) => soundIn(S, st)[at(st)]).length / S.sittings.length;
      const lastSound = share(desk, (st) => st.length - 1);
      const firstSound = share(desk, () => 0);
      const todaySound = today.sittings.reduce((a, st) => a + soundIn(today, st).filter(Boolean).length, 0) / (today.sittings.length * 10);
      all("the reference composer's draws (AUDIT-DESK 5.2-5.3)", [
        ...[5, 6, 8].map((n) => [`every k of ${blind.soundRange(n).join('-')} drawn in Desk sessions of ${n}`, JSON.stringify([...ks(desk, n)].sort()) === JSON.stringify(Array.from({ length: blind.soundRange(n)[1] - blind.soundRange(n)[0] + 1 }, (_, i) => blind.soundRange(n)[0] + i))]),
        ['1 and 2 sound cases drawn in Part C', JSON.stringify([...ks(partC, 4)].sort()) === '[1,2]'],
        [`the last slot sound in ${lastSound.toFixed(2)} of Desk sessions and the first in ${firstSound.toFixed(2)}, each between 0.25 and 0.65`, lastSound > 0.25 && lastSound < 0.65 && firstSound > 0.25 && firstSound < 0.65],
        [`Today's serves sound at ${todaySound.toFixed(3)}, between 0.38 and 0.52`, todaySound > 0.38 && todaySound < 0.52],
      ], `k drawn: ${[5, 6, 8].map((n) => `${n}: ${[...ks(desk, n)].sort().join('/')}`).join(', ')}, part-c: ${[...ks(partC, 4)].sort().join('/')}; last slot sound ${lastSound.toFixed(2)}, first ${firstSound.toFixed(2)}; Today ${todaySound.toFixed(3)} sound`);
    }

    // The reference Today composer prefers a case the block has not served (README decision 8): a case is served twice
    // in a block only once every case of its family and truth has been served there.
    {
      let blocks = 0;
      const early = [];
      for (const path of await blind.loadPaths(REPO, registry)) {
        for (const pos of blind.positionsOf(path, clean.cases, registry)) {
          const subset = pos.eligible.map((i) => clean.cases[i]);
          for (let s = 0; s < 12; s++) {
            const served = blind.referenceCompose({ surface: 'today', cases: subset, topic: pos.topic, stagesDone: pos.stagesDone, size: 10, seed: blind.deriveSeed(0x70da, `${path.id}|${pos.block}|${s}`) });
            if (!served) continue;
            blocks++;
            served.forEach((i, j) => {
              if (!served.slice(0, j).includes(i)) return;
              const c = subset[i];
              const unseen = subset.some((d, x) => d.anchor === c.anchor && d.truth === c.truth && !served.slice(0, j).includes(x));
              if (unseen) early.push(`${path.id} after ${pos.block}: ${c.id} again while its family had an unserved ${c.truth} case`);
            });
          }
        }
      }
      all('the reference Today composer serves unseen cases first (README decision 8)', [[`${blocks} Today blocks, ${early.length} repeats while an unserved case of the family and truth remained${early.length ? ` (${early.slice(0, 2).join('; ')})` : ''}`, blocks > 0 && early.length === 0]], `${blocks} Today blocks, no case repeated while its family had an unserved case of that truth`);
    }

    // The reference composer keeps AUDIT-DESK 5.3's cap (README decision 8): once two stages have cases, at most half of
    // a Desk session comes from the topic stage, so at least one case comes from an earlier one.
    {
      let sittings = 0;
      const over = [];
      for (const path of await blind.loadPaths(REPO, registry)) {
        for (const pos of blind.positionsOf(path, clean.cases, registry)) {
          const subset = pos.eligible.map((i) => clean.cases[i]);
          const stages = new Set(subset.map((c) => c.stage));
          if (stages.size < 2 || !stages.has(pos.topic)) continue;
          for (const size of blind.CONFIG.desk.sizes) {
            for (let s = 0; s < 8; s++) {
              const served = blind.referenceCompose({ surface: 'desk', cases: subset, topic: pos.topic, stagesDone: pos.stagesDone, size, seed: blind.deriveSeed(0x5e1f, `${path.id}|${pos.block}|${size}|${s}`) });
              if (!served) continue;
              sittings++;
              const own = served.filter((i) => subset[i].stage === pos.topic).length;
              if (own > Math.floor(size / 2)) over.push(`${path.id} after ${pos.block}: ${own} of ${size} from ${pos.topic}`);
            }
          }
        }
      }
      all('the reference composer caps the topic stage at half a Desk session (AUDIT-DESK 5.3)', [[`${sittings} sittings composed once two stages have cases, ${over.length} over the cap${over.length ? ` (${over.slice(0, 3).join('; ')})` : ''}`, sittings > 0 && over.length === 0]], `${sittings} Desk sittings composed once two stages have cases, none with more than half from the topic stage`);
    }

    // The strategies spine section 6 names block, and each is tested on every stream.
    const four = ['always-reject', 'always-accept', 'last-is-sound', 'topic-is-class'];
    const blocking = blind.STRATEGIES.filter((s) => s.blocking).map((s) => s.id);
    const paths = (base.groups ?? []).filter((g) => g.path !== 'world');
    all('the four strategies of spine section 6 block, and each is tested on every stream', [
      ...four.map((s) => [`${s} is blocking`, blocking.includes(s)]),
      ...four.map((s) => [`${s} is tested on every stream`, paths.length > 0 && paths.every((g) => g.verdicts.some((v) => v.strategy === s))]),
    ], `${four.join(', ')} on ${paths.length} streams`);

    // The verdict rule (AUDIT-DESK 7.4, README section 7.3), on replicates with known figures: the mean advantage over
    // the replicates fails when it exceeds CONFIG.margin times one stream's SD, just past 2 SD and not just below it; a
    // figure shown in at least half the replicates is tested, and one shown in fewer is not. One stream's SD is the root
    // mean of the replicates' permutation variances: over replicates whose SDs differ (0.04 and 0.02, a root mean of
    // sqrt(0.001) = 0.0316), the widest replicate's SD, the first's, the narrowest's or the mean of the SDs each moves a
    // verdict at 2.1 or 1.9 root-mean SDs. And the advantage is the mean over the replicates, not their median.
    {
      const lay = { ids: ['tnr'], kinds: ['decision'] };
      const rep = (obs, shown = 1, v = 0.0016) => new Map([['last-is-sound', { obs: Float64Array.of(obs), mean: Float64Array.of(0.5), var: Float64Array.of(v), shown: Uint8Array.of(shown), count: Int32Array.of(shown ? 125 : 0) }]]);
      const verdict = (reps) => blind.verdicts(reps, lay, ['last-is-sound'], blind.CONFIG.margin)[0] ?? null;
      const hidden = (n) => Array.from({ length: n }, () => rep(0, 0));
      const shownIn = (n) => [...Array.from({ length: n }, () => rep(0.6)), ...hidden(8 - n)];
      all('the verdict rule: the mean advantage over the replicates against 2 SD of one stream', [
        ['an advantage of 2.05 SD in one stream fails', verdict([rep(0.582)])?.fail === true],
        ['an advantage of 1.95 SD passes', verdict([rep(0.578)])?.fail === false],
        ['advantages of 3 and 2 SD average 2.5 SD and fail', verdict([rep(0.62), rep(0.58)])?.fail === true],
        ['advantages of 3 and 0 SD average 1.5 SD and pass', verdict([rep(0.62), rep(0.5)])?.fail === false],
        ['advantages of 0.2, 0.2 and 5.9 SD average 2.1 SD and fail (their median, 0.2 SD, would pass)', verdict([rep(0.508), rep(0.508), rep(0.736)])?.fail === true],
        ['a figure shown in 4 of 8 replicates is tested', verdict(shownIn(4))?.fail === true],
        ['a figure shown in 3 of 8 replicates is not', verdict(shownIn(3)) === null],
        ['over replicates with SDs 0.04 and 0.02, an advantage of 2.1 root-mean SDs fails', verdict([rep(0.5664, 1, 0.0016), rep(0.5664, 1, 0.0004)])?.fail === true],
        ['… and one of 1.9 root-mean SDs passes', verdict([rep(0.5601, 1, 0.0016), rep(0.5601, 1, 0.0004)])?.fail === false],
      ], 'SD 0.04 in each replicate: 2.05 SD fails, 1.95 SD passes, means of 2.5, 1.5 and 2.1 SD; a figure shown in 4 of 8 replicates is tested, in 3 of 8 not; over SDs 0.04 and 0.02, 2.1 root-mean SDs fail and 1.9 pass');
    }

    // The seeded sound share (AUDIT-DESK 5.2): k sound cases in [ceil(0.30 n), floor(0.60 n)], so 2-3 of 5, 2-3 of 6 and
    // 3-4 of 8, and 1-2 of a four-case Part C.
    all("the sound share's ranges are AUDIT-DESK 5.2's", [
      ['2-3 of 5', JSON.stringify(blind.soundRange(5)) === '[2,3]'],
      ['2-3 of 6', JSON.stringify(blind.soundRange(6)) === '[2,3]'],
      ['3-4 of 8', JSON.stringify(blind.soundRange(8)) === '[3,4]'],
      ['3-6 of 10', JSON.stringify(blind.soundRange(10)) === '[3,6]'],
    ], `5: ${blind.soundRange(5)}; 6: ${blind.soundRange(6)}; 8: ${blind.soundRange(8)}; 10: ${blind.soundRange(10)}`);

    // The blind line choice (AUDIT-DESK 7.2): a flag selects up to three of the case's selectable lines at random, so it
    // hits one of B load-bearing lines among L with probability 1 - C(L - B, k) / C(L, k), k = min(3, L). Over a Desk
    // stream of the clean fixture the hits must match that count within 4 SD.
    {
      const P = blind.poolArrays(clean.cases, registry.topClasses);
      const pathsHere = await blind.loadPaths(REPO, registry);
      const positions = blind.positionsOf(pathsHere[0], clean.cases, registry);
      const S = blind.drawStream({ label: 'self-check/hits', surface: 'desk', positions, cases: clean.cases, P, compose: blind.referenceCompose, cfg: blind.CONFIG, seed: 0x1717 });
      const choose = (n, k) => {
        if (k < 0 || k > n) return 0;
        let c = 1;
        for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
        return c;
      };
      let hits = 0;
      let expected = 0;
      let variance = 0;
      let flawedSlots = 0;
      for (let i = 0; i < S.n; i++) {
        const c = S.caseIdx[i];
        if (P.truth[c] === 0) continue;
        const L = P.selectable[c];
        const B = Math.min(P.loadBearing[c], L);
        if (L === 0 || B === 0) continue;
        const k = Math.min(3, L);
        const p = 1 - choose(L - B, k) / choose(L, k);
        flawedSlots++;
        hits += S.hit[i];
        expected += p;
        variance += p * (1 - p);
      }
      const z = (hits - expected) / Math.sqrt(variance);
      all('the blind line choice: up to three lines at random', [[`${hits} hits against ${expected.toFixed(1)} expected over ${flawedSlots} flawed slots (z ${z.toFixed(2)})`, flawedSlots > 100 && Math.abs(z) <= 4]], `${hits} hits against ${expected.toFixed(1)} expected over ${flawedSlots} flawed slots, z ${z.toFixed(2)}`);
    }

    // A position cue: whenever a Desk session holds a sound case, the composer serves one last.
    const lastSound = (args) => {
      const served = blind.referenceCompose(args);
      if (!served || args.surface !== 'desk') return served;
      const j = served.findIndex((i) => args.cases[i].truth === 'sound');
      if (j < 0) return served;
      const out = served.filter((_, k) => k !== j);
      out.push(served[j]);
      return out;
    };
    await expect('a composer that serves a sound case last', 'blind', run({ composerFor: () => lastSound }), (r) => r.findings.some((f) => f.message.startsWith('last-is-sound')));

    // A composer that favors the session's topic: flawed slots take the topic stage's cases of its most frequent class.
    const topicFavoring = (args) => {
      const served = blind.referenceCompose(args);
      if (!served || args.surface !== 'desk') return served;
      const counts = new Map();
      for (const c of args.cases) if (c.truth === 'flawed' && c.stage === args.topic) counts.set(c.top, (counts.get(c.top) ?? 0) + 1);
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
      if (!top) return served;
      const used = new Set(served.map((i) => args.cases[i].pair));
      return served.map((i) => {
        if (args.cases[i].truth !== 'flawed' || args.cases[i].top === top) return i;
        const swap = args.cases.findIndex((c) => c.truth === 'flawed' && c.stage === args.topic && c.top === top && !used.has(c.pair));
        if (swap < 0) return i;
        used.delete(args.cases[i].pair);
        used.add(args.cases[swap].pair);
        return swap;
      });
    };
    await expect('a composer that favors the session topic', 'blind', run({ composerFor: () => topicFavoring }), (r) => r.findings.some((f) => f.message.startsWith('topic-is-class')));

    // A stage whose sound share differs: a composer that draws cases, not families, from a pool where S1 holds many
    // more sound cases than flawed ones, so the stage predicts soundness. Advisory by default; blocks under --strict.
    const skewedCases = clean.cases.filter((c) => !(c.stage === 'S1' && c.truth === 'flawed' && /\/v[3-6]-flawed$/.test(c.id)));
    /** A Desk and Part C composer that draws cases, not families; `soundCount(draw, lo, hi)` sets each sitting's sound cases. */
    const caseFirstWith = (soundCount) => (args) => {
      if (args.surface === 'today') return blind.referenceCompose(args);
      const d = blind.createDraw(args.seed);
      const n = args.size;
      const [lo, hi] = args.surface === 'part-c' ? [1, 2] : blind.soundRange(n);
      const k = soundCount(d, lo, hi);
      const slots = d.shuffle([...Array(k).fill('sound'), ...Array(n - k).fill('flawed')]);
      const used = new Set();
      const out = [];
      for (const t of slots) {
        const options = args.cases.map((c, i) => [c, i]).filter(([c]) => c.truth === t && !used.has(c.pair));
        if (options.length === 0) return null;
        const [c, i] = d.pick(options);
        used.add(c.pair);
        out.push(i);
      }
      return out;
    };
    const caseFirst = caseFirstWith((d, lo, hi) => d.int(lo, hi));
    const skewRun = await run({ cases: skewedCases, poolProblems: [], composerFor: () => caseFirst });
    results.push({ name: 'a stage whose sound share differs is flagged (advisory)', check: 'advisory', pass: skewRun.notes.some((n) => n.includes('stage-majority')), detail: skewRun.notes.find((n) => n.includes('stage-majority')) ?? `no stage-majority note (${skewRun.notes.length} notes, ${skewRun.findings.length} findings)` });
    await expect('… and fails the gate under --strict', 'advisory', run({ cases: skewedCases, poolProblems: [], composerFor: () => caseFirst }, { strict: true }), (r) => r.findings.some((f) => f.message.startsWith('stage-majority')));

    // A diff-length cue: every flawed form's diff is longer than its sound form's. Advisory; blocks under --strict.
    const longer = fx.w1Pool();
    for (const a of longer) for (const c of [...a.cases, ...(Array.isArray(a.variants) ? a.variants : [])]) if (c.key !== 'none') c.diff = `${c.diff}\n+# the agent's change, continued\n+# and continued`;
    await expect('flawed forms with longer diffs fail under --strict', 'advisory', run({ cases: buildCases(longer).cases, poolProblems: [] }, { strict: true }), (r) => r.findings.some((f) => f.message.startsWith('longest-diff-is-flawed')));

    // Composers that break a rule every composer keeps (AUDIT-DESK 5.2-5.3): the share, the size, pairs apart, the
    // eligible cases; and one that throws.
    const allFlawed = (args) => {
      if (args.surface !== 'desk') return blind.referenceCompose(args);
      const flawed = args.cases.map((c, i) => [c, i]).filter(([c]) => c.truth === 'flawed');
      const used = new Set();
      const out = [];
      for (const [c, i] of flawed) {
        if (out.length === args.size) break;
        if (used.has(c.pair)) continue;
        used.add(c.pair);
        out.push(i);
      }
      return out.length === args.size ? out : null;
    };
    await expect('a composer that serves an all-flawed Desk session', 'composer', run({ composerFor: () => allFlawed, cfg: quick }), says('share rule'));
    // The share's edges, on the Desk (2-3 of 5, ...) and in Part C (1-2 of 4): one sound case more than it allows, then
    // one fewer.
    /** Some composer finding names a sitting of `surface` holding `k(lo, hi)` sound cases where the rule allows lo-hi. */
    const heldShare = (surface, k) => (r) => r.findings.some((f) => {
      const m = new RegExp(`a [0-9]+-case ${surface} sitting held ([0-9]+) sound cases; the share rule allows ([0-9]+)-([0-9]+)`).exec(f.message);
      return f.check === 'composer' && m !== null && Number(m[1]) === k(Number(m[2]), Number(m[3]));
    });
    await expect('a composer that serves one sound case more than the share allows, on the Desk and in Part C', 'composer', run({ composerFor: () => caseFirstWith((d, lo, hi) => hi + 1), cfg: quick }), (r) => heldShare('desk', (lo, hi) => hi + 1)(r) && heldShare('part-c', (lo, hi) => hi + 1)(r));
    await expect('a composer that serves one sound case fewer than the share allows, on the Desk and in Part C', 'composer', run({ composerFor: () => caseFirstWith((d, lo) => lo - 1), cfg: quick }), (r) => heldShare('desk', (lo) => lo - 1)(r) && heldShare('part-c', (lo) => lo - 1)(r));
    const twice = (args) => {
      const served = blind.referenceCompose(args);
      return served && args.surface === 'desk' ? [...served.slice(0, -1), served[0]] : served;
    };
    await expect('a composer that serves one case twice in a Desk session', 'composer', run({ composerFor: () => twice, cfg: quick }), says('served one case twice in one sitting'));
    const shortBlock = (args) => {
      const served = blind.referenceCompose(args);
      return served && args.surface === 'today' ? served.slice(0, -1) : served;
    };
    await expect('a composer that serves a Today block short of its size', 'composer', run({ composerFor: () => shortBlock, cfg: quick }), says('served 9 cases where 10 were asked'));
    const longBlock = (args) => {
      const served = blind.referenceCompose(args);
      return served && args.surface === 'today' ? [...served, served[0]] : served;
    };
    await expect('a composer that serves a Today block one serve over its size', 'composer', run({ composerFor: () => longBlock, cfg: quick }), says('served 11 cases where 10 were asked'));
    const pairTogether = (args) => {
      const served = blind.referenceCompose(args);
      if (!served || args.surface !== 'desk') return served;
      for (const i of served) {
        // Swap in the other member of i's pair for a served case of the same truth: the share holds, pairs apart does not.
        const p = args.cases.findIndex((c, j) => j !== i && c.pair === args.cases[i].pair);
        const q = p < 0 ? -1 : served.findIndex((j) => j !== i && args.cases[j].truth === args.cases[p].truth);
        if (q < 0) continue;
        const out = served.slice();
        out[q] = p;
        return out;
      }
      return served;
    };
    await expect('a composer that serves both members of a pair in one Desk session', 'composer', run({ composerFor: () => pairTogether, cfg: quick }), says('pairs apart'));
    const outside = (args) => {
      const served = blind.referenceCompose(args);
      return served && args.surface === 'desk' ? [args.cases.length, ...served.slice(1)] : served;
    };
    await expect('a composer that serves a case outside the eligible ones', 'composer', run({ composerFor: () => outside, cfg: quick }), says('not among the eligible'));
    const throwing = (args) => {
      if (args.surface === 'part-c') throw new Error('planted: no Part C draw');
      return blind.referenceCompose(args);
    };
    await expect('a composer that throws', 'composer', run({ composerFor: () => throwing, cfg: quick }), says('the composer threw'));

    // A composer that declines sittings the pool can fill, or never serves a family it is offered (README section 5):
    // each leaves part of the path unchecked while the rest passes. A null is checked against the reference composer
    // asked for the same sitting, on a whole surface, at one stage only, and on every surface.
    const declinedOn = (...wheres) => (r, h) => wheres.every((w) => h.some((f) => f.where === w && f.message.startsWith('the composer returned no sitting for ')));
    await expect('a composer that returns no Desk sitting, where the reference composer fills them', 'composer', run({ composerFor: (s) => (s === 'desk' ? () => null : blind.referenceCompose), cfg: quick }), (r, h) => declinedOn('default/desk', 'builder/desk')(r, h) && h.some((f) => f.message.endsWith('nothing on this surface was checked (scripts/spikes/W1-T40/README.md section 5)')));
    const s1Declined = (args) => (args.surface === 'desk' && args.topic === 'S1' ? null : blind.referenceCompose(args));
    await expect('a composer that returns no Desk sitting after S1 and fills the rest', 'composer', run({ composerFor: () => s1Declined, cfg: quick }), (r, h) => declinedOn('default/desk', 'builder/desk')(r, h) && (r.groups ?? []).some((g) => g.path === 'default' && g.surface === 'desk'));
    // The rule's edge: one declined sitting is a finding. The composer below declines the first Desk sitting it is asked
    // for, which the reference composer fills, and fills every other one.
    {
      let asked = 0;
      const declineFirst = (args) => (args.surface === 'desk' && asked++ === 0 ? null : blind.referenceCompose(args));
      await expect('a composer that returns no sitting for one Desk sitting the reference composer fills, and fills the rest', 'composer', run({ composerFor: () => declineFirst, cfg: quick }), (r, h) => {
        const declined = h.filter((f) => f.message.startsWith('the composer returned no sitting for '));
        return declined.length === 1 && /^the composer returned no sitting for 1 of the [0-9]+ desk sittings asked for, /.test(declined[0].message) && /\/desk$/.test(declined[0].where);
      });
    }
    await expect('a composer that returns no sitting at all', 'composer', run({ composerFor: () => () => null, cfg: quick }), (r, h) => declinedOn('default/desk', 'default/today', 'default/part-c', 'builder/desk', 'builder/today', 'builder/part-c')(r, h) && (r.groups ?? []).length === 0);
    const skipping = (anchor) => (args) => {
      const keep = args.cases.map((c, i) => [c, i]).filter(([c]) => c.anchor !== anchor);
      const served = blind.referenceCompose({ ...args, cases: keep.map(([c]) => c) });
      return served && served.map((j) => keep[j][1]);
    };
    // Coverage is per surface: a Desk composer that never serves AUD-1.2 fails even though Today and Part C, composed by
    // a module too, serve it on the same path.
    const neverOn = (r, where) => (r.findings ?? []).some((f) => f.check === 'composer' && f.where === where && f.message.startsWith('the composer never served AUD-1.2, '));
    await expect('a composer that never serves one family it is offered on the Desk, while Today and Part C serve it', 'composer', run({ composerFor: (s) => (s === 'desk' ? skipping('AUD-1.2') : (args) => blind.referenceCompose(args)), cfg: quick }), (r) => neverOn(r, 'default/desk') && neverOn(r, 'builder/desk') && !['today', 'part-c'].some((s) => neverOn(r, `default/${s}`) || neverOn(r, `builder/${s}`)));

    // Spine section 6's n >= 10: a class's recall and precision are shown, and required of the Desk's scorer, once ten
    // decisions of that class are counted (or the class is named ten times), and not at nine; so is precision on
    // acceptances once ten cases are accepted. Two hand-built Desk streams: n flawed G2 cases flagged as G2, n sound
    // cases accepted.
    {
      const P = blind.poolArrays(clean.cases, registry.topClasses);
      const lay = blind.figureLayout(registry.topClasses);
      const of = (pred) => clean.cases.map((c, i) => [c, i]).filter(([c]) => pred(c)).map(([, i]) => i);
      const g2 = of((c) => c.truth === 'flawed' && c.top === 'G2');
      const sound = of((c) => c.truth === 'sound');
      const k = registry.topClasses.indexOf('G2');
      const atN = (n) => {
        const idx = [...Array.from({ length: n }, (_, j) => g2[j % g2.length]), ...Array.from({ length: n }, (_, j) => sound[j % sound.length])];
        const len = idx.length;
        const S = { surface: 'desk', n: len, caseIdx: Int32Array.from(idx), sitting: new Int32Array(len), pos: Int32Array.from(idx.keys()), last: new Uint8Array(len), hit: new Uint8Array(len).fill(1), aboveMedian: new Uint8Array(len), sittings: [{ start: 0, length: len, topic: 'S1', stagesDone: ['S1'] }], stageGroups: [Int32Array.from(idx.keys())] };
        const dec = Uint8Array.from(idx, (_, j) => (j < n ? 1 : 0));
        const named = Int8Array.from(idx, (_, j) => (j < n ? k : -1));
        const out = new Float64Array(lay.ids.length);
        const shown = new Uint8Array(lay.ids.length);
        blind.referenceScore(S, P, dec, named, out, shown, 'all');
        const required = blind.requiredFigures(S, P, dec, named, shown, lay).map((f) => f.id);
        const isShown = (id) => shown[lay.ids.indexOf(id)] === 1;
        return { shown: ['recall:G2', 'precision:G2', 'precision:none', 'recall-macro'].filter(isShown), required: required.filter((id) => id.startsWith('recall') || id.startsWith('precision')) };
      };
      const ten = atN(10);
      const nine = atN(9);
      all('the n >= 10 rule: per-class figures shown and required from ten decisions, not nine (spine section 6)', [
        ['at ten, recall:G2, precision:G2, precision:none and recall-macro are shown', JSON.stringify(ten.shown) === JSON.stringify(['recall:G2', 'precision:G2', 'precision:none', 'recall-macro'])],
        ['at ten, recall:G2, precision:G2 and recall-macro are required', JSON.stringify([...ten.required].sort()) === JSON.stringify(['precision:G2', 'recall-macro', 'recall:G2'])],
        ['at nine, none of them is shown or required', nine.shown.length === 0 && nine.required.length === 0],
      ], `ten: shown ${ten.shown.join(', ') || 'none'}, required ${ten.required.join(', ') || 'none'}; nine: shown ${nine.shown.join(', ') || 'none'}, required ${nine.required.join(', ') || 'none'}`);
    }

    // Scorers that are not balanced accuracy: v1's mean of recall and precision on rejections, and ASSESSMENT 3.7's
    // figure (correct findings only) reported as ba. A constant strategy's ba is exactly 0.5 (AUDIT-DESK 6.2).
    const v1 = (S, P, dec, named, out, shown, which) => {
      blind.referenceScore(S, P, dec, named, out, shown, which);
      let flagged = 0;
      let flaggedFlawed = 0;
      for (let i = 0; i < S.n; i++) if (dec[i]) {
        flagged++;
        if (P.truth[S.caseIdx[i]]) flaggedFlawed++;
      }
      out[2] = (out[0] + (flagged > 0 ? flaggedFlawed / flagged : 0)) / 2;
    };
    await expect('a scorer whose "balanced accuracy" is v1\'s figure', 'scorer', run({ score: v1, cfg: quick }), says('scored balanced accuracy'));
    const baCorrect = (S, P, dec, named, out, shown) => {
      blind.referenceScore(S, P, dec, named, out, shown, 'all');
      out[2] = out[6];
    };
    await expect('a scorer whose ba counts only findings with the right class and valid evidence', 'scorer', run({ score: baCorrect, cfg: quick }), says('always-reject scored balanced accuracy'));
    const halfPoint = (S, P, dec, named, out, shown, which) => {
      blind.referenceScore(S, P, dec, named, out, shown, which);
      out[2] += 0.005;
    };
    await expect('a scorer whose ba is half a point off, a constant strategy scoring 0.505', 'scorer', run({ score: halfPoint, cfg: quick }), (r, h) => ['always-reject', 'always-accept'].every((s) => h.some((f) => f.message.startsWith(`${s} scored balanced accuracy 0.5050;`))));

    // The Clearinghouse: a world whose blocks always end on a sound incident; then fair incidents.
    const reps = [];
    for (let r = 0; r < blind.CONFIG.replicates; r++) reps.push(await fx.fixtureIncidentBlocks(clean.cases, { seed: 100 + r, blocks: 60, leak: true }));
    const idx = (blocks) => blocks.map((bl2) => bl2.map((c) => clean.cases.indexOf(c)));
    await expect('Clearinghouse incidents whose last incident is always sound', 'blind', run({ incidents: reps.map(idx) }), (r) => r.findings.some((f) => f.where === 'world/clearinghouse' && f.message.startsWith('last-is-sound')));
    const fair = [];
    for (let r = 0; r < blind.CONFIG.replicates; r++) fair.push(await fx.fixtureIncidentBlocks(clean.cases, { seed: 200 + r, blocks: 60 }));
    const fairRun = await run({ incidents: fair.map(idx) });
    results.push({ name: 'fair Clearinghouse incidents are included and pass', check: '-', pass: fairRun.exit === 0 && fairRun.groups.some((g) => g.surface === 'clearinghouse'), detail: fairRun.exit === 0 ? `${fairRun.groups.find((g) => g.surface === 'clearinghouse')?.streams.length ?? 0} incident streams tested` : fairRun.findings.map((f) => f.message).join('; ') });

    // Pools the simulation cannot read honestly.
    const thin = fx.w1Pool();
    thin[0].cases[1].statement = 's.add(amount <= a)\ns.add(a < amount)\ns.add(b >= 0)\n';
    thin[0].cases[1].diff = '';
    thin[0].cases[1].receipt = '';
    thin[0].cases[1].evidence = { type: 'declaration', load_bearing: ['statement:1', 'statement:2'] };
    const thinBuilt = buildCases(thin);
    await expect('declaration evidence on a three-line case', 'pool', run({ cases: thinBuilt.cases, poolProblems: thinBuilt.shape, cfg: quick }), says('the case has 3 selectable lines'));
    const offStage = buildCases(mutate((d) => (d[0].stage = 'S99')));
    await expect('an anchor whose stage is not a stage', 'pool', run({ cases: offStage.cases, poolProblems: offStage.shape, cfg: quick }), says('stage must be a stage ID'));
    // A unit that is no lesson (S2.L99) never completes, so AUD-2.1 is never served on either path: a finding on each.
    const unserved = buildCases(mutate((d) => (d[3].scheduled_after = ['LAB-2', 'S2.L99'])));
    await expect('an anchor whose scheduled units never complete, on each path', 'pool', run({ cases: unserved.cases, poolProblems: unserved.shape, cfg: quick }), (r, h) => ['default', 'builder'].every((p) => h.some((f) => f.where === p && f.message.startsWith(`never served on the ${p} path, so never checked: AUD-2.1`))));

    // W1-T32's judgment module read from files: the gate must say it cannot drive the Desk's own composer and scorer,
    // not fall back: a module without the contract, a judgment folder whose module is not where the contract puts it,
    // a module without its scorer or its AUDIT_SURFACES, one that names a surface the gate does not know, and a
    // ./judgment export that names a missing file.
    const judgmentOf = async (files) => blind.loadJudgment(scratch(files));
    await expect('a judgment module without composeAuditSitting', 'composer', run({ judgment: await judgmentOf({ 'packages/learner/judgment/index.ts': 'export const judgment = 1\n' }), cfg: quick }), says('exports no composeAuditSitting'));
    await expect(`a judgment folder whose module is not at ${blind.JUDGMENT_FILE}`, 'composer', run({ judgment: await judgmentOf({ 'packages/learner/judgment/src/index.ts': 'export const AUDIT_SURFACES = []\nexport function composeAuditSitting() { return null }\nexport function auditFigures() { return [] }\n' }), cfg: quick }), (r) => r.findings.some((f) => f.message.startsWith('packages/learner/judgment/ exists but has no index.ts')));
    await expect('a judgment module without auditFigures', 'composer', run({ judgment: await judgmentOf({ 'packages/learner/judgment/index.ts': 'export const AUDIT_SURFACES = []\nexport function composeAuditSitting() { return null }\n' }), cfg: quick }), says('exports no auditFigures'));
    await expect('a judgment module with its composer and scorer but no AUDIT_SURFACES', 'composer', run({ judgment: await judgmentOf({ 'packages/learner/judgment/index.ts': 'export function composeAuditSitting() { return null }\nexport function auditFigures() { return [] }\n' }), cfg: quick }), says('exports no composeAuditSitting and AUDIT_SURFACES'));
    await expect('a judgment module whose AUDIT_SURFACES names a surface the gate does not know', 'composer', run({ judgment: await judgmentOf({ 'packages/learner/judgment/index.ts': "export const AUDIT_SURFACES = ['Desk', 'today']\nexport function composeAuditSitting() { return null }\nexport function auditFigures() { return [] }\n" }), cfg: quick }), says('lists "Desk" in AUDIT_SURFACES, which the gate does not drive'));
    await expect('a ./judgment export that names a missing file', 'composer', run({ judgment: await judgmentOf({ 'packages/learner/package.json': '{ "exports": { "./judgment": "./judgment/index.ts" } }\n' }), cfg: quick }), says('which does not exist'));
    await expect('a judgment module whose composer is listed for none of the surfaces the gate composes', 'composer', run({ judgment: await judgmentOf({ 'packages/learner/judgment/index.ts': "export const AUDIT_SURFACES = ['clearinghouse']\nexport function composeAuditSitting() { return null }\nexport function auditFigures() { return [] }\n" }), cfg: quick }), says('lists none of desk, today and part-c in AUDIT_SURFACES'));
    // A module that lists every surface has its own composer and scorer driven on each: one that declines every Part C
    // draw, which the reference composer fills, fails on both paths' Part C streams, while the report names the Desk's
    // composer on every surface.
    const everySurface = await judgmentOf({
      'packages/learner/judgment/index.ts': [
        `import { referenceCompose } from ${JSON.stringify(join(LIB, 'blind.mjs'))}`,
        `import { fixtureAuditFigures } from ${JSON.stringify(join(LIB, 'fixtures.mjs'))}`,
        `import { loadRegistry } from ${JSON.stringify(join(LIB, 'pool.mjs'))}`,
        "export const AUDIT_SURFACES = ['desk', 'today', 'part-c']",
        "export function composeAuditSitting(args) { return args.surface === 'part-c' ? null : referenceCompose(args) }",
        `export const auditFigures = fixtureAuditFigures(loadRegistry(${JSON.stringify(REPO)}).topClasses)`,
      ].join('\n') + '\n',
    });
    await expect('a judgment module read from files that lists every surface and declines every Part C draw', 'composer', run({ judgment: everySurface, cfg: quick }), (r, h) => declinedOn('default/part-c', 'builder/part-c')(r, h) && ['desk', 'today', 'part-c'].every((s) => r.composers?.[s] === 'the Desk (W1-T32)') && r.scorer === 'the Desk (W1-T32)');

    // The Desk's own scorer (W1-T32's auditFigures; lib/fixtures.mjs computes the reference figures from the decision
    // objects). Filed with the decision figures, as AUDIT-DESK 7.4 lists it, the Part C pass rate is still tested
    // against the gate's within-stage null, last-is-sound included; a figure of a kind the gate has no null for is a
    // finding; and a planted position cue is caught through the Desk's scorer as through the reference.
    const desk = (opts = {}) => ({ module: { AUDIT_SURFACES: [], composeAuditSitting: blind.referenceCompose, auditFigures: fx.fixtureAuditFigures(registry.topClasses, opts) }, file: blind.JUDGMENT_FILE, problems: [], surfaces: [] });
    const filed = await run({ judgment: desk({ kinds: { 'part-c-pass': 'decision' } }) });
    const partC = (filed.groups ?? []).filter((g) => g.surface === 'part-c');
    const lastOnPartC = partC.map((g) => [g.path, g.verdicts.find((v) => v.strategy === 'last-is-sound' && v.figure === 'part-c-pass')]);
    results.push({
      name: 'a scorer that files part-c-pass with the decision figures: last-is-sound is still tested on it',
      check: '-',
      pass: filed.exit === 0 && filed.scorer === 'the Desk (W1-T32)' && partC.length > 0 && lastOnPartC.every(([, v]) => v && v.sd > 0) && filed.notes.some((n) => n.startsWith('the scorer files part-c-pass')),
      detail: filed.exit === 0 ? lastOnPartC.map(([p, v]) => `${p}/part-c last-is-sound part-c-pass ${v ? `SD ${fmt(v.sd)}` : 'untested'}`).join('; ') : (filed.error ?? filed.findings.map((f) => f.message).join('; ')),
    });
    await expect('a scorer figure of a kind the gate has no null for', 'scorer', run({ judgment: desk({ extra: [{ id: 'flag-rate', kind: 'rate', of: (ds) => ds.filter((d) => d.pick === 'gap').length / ds.length }] }), cfg: quick }), says('flag-rate'));
    await expect("a composer that serves a sound case last, scored by the Desk's scorer", 'blind', run({ judgment: desk(), composerFor: () => lastSound }), (r) => r.scorer === 'the Desk (W1-T32)' && r.findings.some((f) => f.message.startsWith('last-is-sound')));

    // The figures the Desk must show (AUDIT-DESK 6.5 and 7.3, README section 5): a Desk scorer that leaves one out fails,
    // whether it shows v1's figure under another name instead of ba, or drops tpr, tnr, the per-class figures, the
    // per-class precision alone or Part C's pass rate.
    // ba, tpr and tnr are due on every path stream (each holds flawed and sound decisions), so the finding names all six.
    const noFigure = (id, where = '') => (r) => r.findings.some((f) => f.check === 'scorer' && f.message.startsWith(`the scorer shows no ${id},`) && f.where.includes(where));
    const pathStreams = ['default/desk', 'default/today', 'default/part-c', 'builder/desk', 'builder/today', 'builder/part-c'];
    const noFigureOnEvery = (id) => (r) => r.findings.some((f) => f.check === 'scorer' && f.message.startsWith(`the scorer shows no ${id},`) && pathStreams.every((w) => f.where.split(', ').includes(w)));
    await expect("a Desk scorer that drops ba and shows v1's figure as balanced-accuracy", 'scorer', run({ judgment: desk({ drop: (id) => id === 'ba', extra: [{ id: 'balanced-accuracy', kind: 'decision', of: fx.v1BalancedAccuracy }] }), cfg: quick }), noFigureOnEvery('ba'));
    // A value that is not a finite number is no figure: a ba of NaN (0/0, say) would otherwise be shown, read as
    // agreement by the required-figures check and never fail a test.
    const nanBa = { module: { AUDIT_SURFACES: [], composeAuditSitting: blind.referenceCompose, auditFigures: (ds) => fx.fixtureAuditFigures(registry.topClasses)(ds).map((f) => (f.id === 'ba' ? { ...f, value: Number.NaN } : f)) }, file: blind.JUDGMENT_FILE, problems: [], surfaces: [] };
    await expect('a Desk scorer whose ba is not a number (NaN)', 'scorer', run({ judgment: nanBa, cfg: quick }), noFigureOnEvery('ba'));
    await expect('a Desk scorer that shows no tpr', 'scorer', run({ judgment: desk({ drop: (id) => id === 'tpr' }), cfg: quick }), noFigureOnEvery('tpr'));
    await expect('a Desk scorer that shows no tnr', 'scorer', run({ judgment: desk({ drop: (id) => id === 'tnr' }), cfg: quick }), noFigureOnEvery('tnr'));
    await expect('a Desk scorer that shows no per-class figure', 'scorer', run({ judgment: desk({ drop: (id) => id.startsWith('recall') || id.startsWith('precision:G') }), cfg: quick }), (r) => noFigure('recall-macro')(r) && r.findings.some((f) => f.check === 'scorer' && /^the scorer shows no recall:G[0-9]+,/.test(f.message)));
    await expect('a Desk scorer that shows no per-class precision', 'scorer', run({ judgment: desk({ drop: (id) => id.startsWith('precision:G') }), cfg: quick }), (r) => r.findings.some((f) => f.check === 'scorer' && /^the scorer shows no precision:G[0-9]+,/.test(f.message)));
    await expect('a Desk scorer that shows no Part C pass rate', 'scorer', run({ judgment: desk({ drop: (id) => id === 'part-c-pass' }), cfg: quick }), (r) => r.findings.some((f) => f.check === 'scorer' && f.message.startsWith('the scorer shows no part-c-pass,') && ['default/part-c', 'builder/part-c'].every((w) => f.where.split(', ').includes(w))));

    // The world's incidents (W3-T14) never move a path stream: the strategies on a path know the pool's base rates and
    // the floor is the pool's, so fair incidents of a class the pool lacks (G7 at S1) leave every path stream's verdicts
    // and the stage-only floor as they were, and a planted topic cue is caught exactly as it is without them.
    const world = { cases: [...clean.cases], incidents: [] };
    for (let r = 0; r < blind.CONFIG.replicates; r++) {
      const inc = incidentCases(fx.fixtureWorldIncidents(300 + r, blind.CONFIG.clearinghouse.blocks), registry);
      const offset = world.cases.length;
      world.cases.push(...inc.cases);
      world.incidents.push(inc.index.map((row) => row.map((i) => i + offset)));
    }
    const onPaths = (r) => JSON.stringify({ groups: (r.groups ?? []).filter((g) => g.path !== 'world'), floor: r.floor ?? [] });
    const withWorld = await run({ cases: world.cases, incidents: world.incidents });
    const worldGroup = (withWorld.groups ?? []).find((g) => g.surface === 'clearinghouse');
    results.push({
      name: 'fair incidents of a class the pool lacks (G7 at S1) leave every path stream and the floor as they were',
      check: '-',
      pass: withWorld.exit === 0 && Boolean(worldGroup) && onPaths(withWorld) === onPaths(base),
      detail: withWorld.exit === 0 ? `${worldGroup?.streams.length ?? 0} incident streams; the ${base.groups.length} path streams' verdicts and the floor ${onPaths(withWorld) === onPaths(base) ? 'unchanged' : 'CHANGED'}` : (withWorld.error ?? withWorld.findings.map((f) => f.message).join('; ')),
    });
    // And the other way: the Clearinghouse stream's strategies know the base rates of the incidents it serves (decision
    // 12). With fair incidents of one class whose evidence is line-anchored (G6, a declaration), a blind flag there names
    // that class, the incidents' most frequent, not the pool's (G5), so always-reject's findings are correct whenever its
    // line choice hits.
    const g6 = { cases: [...clean.cases], incidents: [] };
    {
      const inc = incidentCases(fx.fixtureWorldIncidents(400, blind.CONFIG.clearinghouse.blocks, { klass: 'G6', evidence: 'declaration' }), registry);
      g6.cases.push(...inc.cases);
      g6.incidents.push(inc.index.map((row) => row.map((i) => i + clean.cases.length)));
    }
    const g6Run = await run({ cases: g6.cases, incidents: g6.incidents, cfg: quick });
    const g6Reject = (g6Run.groups ?? []).find((g) => g.surface === 'clearinghouse')?.verdicts.find((v) => v.strategy === 'always-reject' && v.figure === 'tpr-correct');
    results.push({
      name: "the Clearinghouse stream's strategies name the incidents' most frequent class (G6), not the pool's",
      check: '-',
      pass: Boolean(g6Reject) && g6Reject.obs > 0,
      detail: g6Reject ? `always-reject's tpr-correct on the Clearinghouse stream: ${fmt(g6Reject.obs)} (0 if it named the pool's G5)` : (g6Run.error ?? 'no always-reject tpr-correct verdict on the Clearinghouse stream'),
    });
    const pathFindings = (r) => (r.findings ?? []).filter((f) => f.where !== 'world/clearinghouse');
    const topicAlone = await run({ composerFor: () => topicFavoring });
    const topicWithWorld = await run({ composerFor: () => topicFavoring, cases: world.cases, incidents: world.incidents });
    results.push({
      name: '… and a composer that favors the session topic is caught exactly as it is without them',
      check: 'blind',
      pass: topicAlone.exit === 1 && pathFindings(topicAlone).length > 0 && JSON.stringify(pathFindings(topicWithWorld)) === JSON.stringify(pathFindings(topicAlone)),
      detail: `${pathFindings(topicWithWorld).length} findings on the paths with the incidents, ${pathFindings(topicAlone).length} without`,
    });

    // The same fixture written as files and read through content/audit/: green, then red with one planted fault; and
    // the Clearinghouse module read from files, whose problems are findings too.
    const tree = scratch({}, { withPool: true });
    const green = await runGate({ root: tree, strict: false }, { judgment: noJudgment });
    results.push({ name: 'the fixture read from files passes', check: '-', pass: green.exit === 0 && !green.empty, detail: green.exit === 0 ? boundLine(green.bound) : (green.error ?? green.findings.map((f) => f.message).join('; ')) });
    const broken = fx.w1Pool()[0];
    delete broken.cases[1].key;
    writeFileSync(join(tree, 'content', 'audit', 'AUD-1.1.json'), `${JSON.stringify(broken, null, 2)}\n`);
    await expect('a case without a key, read from files', 'pool', runGate({ root: tree, strict: false }, { judgment: noJudgment, cfg: quick }), says('a case needs a key'));
    const clearinghouse = 'apps/instruments/src/engines/clearinghouse/audit.ts';
    const noStage = scratch({ [clearinghouse]: "export const auditFamilies = []\nexport function auditIncidentBlocks(seed: number, blocks: number) {\n  return Array.from({ length: blocks }, (_, b) => Array.from({ length: 10 }, (_, i) => ({ id: `i${seed}.${b}.${i}`, family: 'CH-planted', key: i % 2 ? 'none' : 'G2', evidence: { type: 'restatement' }, statement: 'a\\nb\\nc\\nd\\n' })))\n}\n" }, { withPool: true });
    await expect('Clearinghouse incidents without a stage', 'clearinghouse', runGate({ root: noStage, strict: false }, { judgment: noJudgment, cfg: quick }), says('an incident needs a stage (a stage ID, S1-S10), got null'));
    const noClass = scratch({ [clearinghouse]: "export const auditFamilies = []\nexport function auditIncidentBlocks(seed: number, blocks: number) {\n  return Array.from({ length: blocks }, (_, b) => Array.from({ length: 10 }, (_, i) => ({ id: `i${seed}.${b}.${i}`, family: 'CH-planted', stage: 'S1', key: i % 2 ? 'none' : { class: 'G99', also: [] }, evidence: { type: 'restatement' }, statement: 'a\\nb\\nc\\nd\\n' })))\n}\n" }, { withPool: true });
    await expect('Clearinghouse incidents keyed with a class that is not a gap class', 'clearinghouse', runGate({ root: noClass, strict: false }, { judgment: noJudgment, cfg: quick }), says('G99 is not a gap class'));
    const noBlocks = scratch({ [clearinghouse]: 'export const auditFamilies = []\n' }, { withPool: true });
    await expect('a Clearinghouse module without auditIncidentBlocks', 'clearinghouse', runGate({ root: noBlocks, strict: false }, { judgment: noJudgment, cfg: quick }), says('exports no auditIncidentBlocks'));
    // What auditIncidentBlocks returns is checked before it is read: nothing, one block fewer than asked for, or an empty
    // block would leave the incidents untested while the gate reported green.
    /** A Clearinghouse module serving the stand-in world's fair incidents, its blocks passed through `edit` (source text). */
    const worldModule = (edit) => scratch({ [clearinghouse]: `import { fixtureWorldIncidents } from ${JSON.stringify(join(LIB, 'fixtures.mjs'))}\nexport const auditFamilies = []\nexport function auditIncidentBlocks(seed: number, blocks: number) {\n  const got = fixtureWorldIncidents(seed, blocks)\n  return ${edit}\n}\n` }, { withPool: true });
    await expect('a Clearinghouse module whose auditIncidentBlocks returns nothing', 'clearinghouse', runGate({ root: worldModule('undefined'), strict: false }, { judgment: noJudgment, cfg: quick }), says(`auditIncidentBlocks(seed, ${blind.CONFIG.clearinghouse.blocks}) returned undefined, not a list of blocks`));
    await expect('a Clearinghouse module that returns one block fewer than asked for', 'clearinghouse', runGate({ root: worldModule('got.slice(1)'), strict: false }, { judgment: noJudgment, cfg: quick }), says(`returned ${blind.CONFIG.clearinghouse.blocks - 1} blocks where ${blind.CONFIG.clearinghouse.blocks} were asked for`));
    await expect('a Clearinghouse module that returns an empty block', 'clearinghouse', runGate({ root: worldModule('got.map((b, i) => (i === 0 ? [] : b))'), strict: false }, { judgment: noJudgment, cfg: quick }), says('returned a block that is not a non-empty list of incidents'));
    // An incident is a case in the pool's form: one the pool's rules would refuse (here a flawed incident without its
    // load-bearing lines, which no blind flag could then hit) is a finding, not a case the strategies read as given.
    await expect("Clearinghouse incidents that break a pool case's shape: flawed ones without load-bearing lines", 'clearinghouse', runGate({ root: worldModule("got.map((b) => b.map((i) => (i.key === 'none' ? i : { ...i, evidence: { ...i.evidence, load_bearing: [] } })))"), strict: false }, { judgment: noJudgment, cfg: quick }), says('load_bearing lists the one to three lines'));
    // An incident's stage is a stage ID: one tagged with its lesson would be read as a stage of its own.
    await expect('Clearinghouse incidents whose stage is a lesson, not a stage', 'clearinghouse', runGate({ root: worldModule("got.map((b) => b.map((i) => ({ ...i, stage: 'S1.L2' })))"), strict: false }, { judgment: noJudgment, cfg: quick }), says('an incident needs a stage (a stage ID, S1-S10), got "S1.L2"'));
    const fairWorld = await runGate({ root: worldModule('got'), strict: false }, { judgment: noJudgment, cfg: quick });
    const worldProblems = (fairWorld.findings ?? []).filter((f) => f.check === 'clearinghouse');
    results.push({ name: '… and one that returns the blocks asked for is read and tested in its own stream', check: '-', pass: !fairWorld.error && worldProblems.length === 0 && (fairWorld.groups ?? []).some((g) => g.surface === 'clearinghouse'), detail: !fairWorld.error && worldProblems.length === 0 ? `${fairWorld.composers?.clearinghouse}; ${(fairWorld.groups ?? []).find((g) => g.surface === 'clearinghouse')?.streams.length ?? 0} incident stream tested` : (fairWorld.error ?? worldProblems.map((f) => f.message).join('; ')) });
  } finally {
    for (const t of trees) rmSync(t, { recursive: true, force: true });
  }
  return results;
}

// ------------------------------------------------------------------ main

export async function main(argv, io = { out: (s) => process.stdout.write(`${s}\n`), err: (s) => process.stderr.write(`${s}\n`) }) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (e) {
    io.err(`verify-audit-blind: ${e.message}\n${USAGE}`);
    return 2;
  }
  if (o.selfCheck) {
    const results = await selfCheck();
    for (const r of results) io.out(`${r.pass ? 'held' : 'FAIL'}  ${r.check.padEnd(13)}  ${r.name}: ${r.detail}`);
    const failed = results.filter((r) => !r.pass).length;
    io.out(failed === 0 ? `GATE-audit-blind self-check: green (${results.length} cases held)` : `GATE-audit-blind self-check: FAIL (${failed} of ${results.length} cases did not hold)`);
    return failed === 0 ? 0 : 1;
  }
  const r = await runGate(o);
  if (r.error) {
    io.err(`verify-audit-blind: ${r.error}`);
    return r.exit;
  }
  if (o.json) {
    io.out(JSON.stringify({ exit: r.exit, empty: r.empty ?? null, composers: r.composers, scorer: r.scorer, config: r.cfg, bound: r.bound, floor: r.floor, groups: r.groups, findings: r.findings, notes: r.notes }, null, 2));
  } else for (const l of formatReport(r, o.verbose)) io.out(l);
  return r.exit;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
