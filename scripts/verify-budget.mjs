#!/usr/bin/env node
// GATE-budget (spine 11.2; W0-T06). Dependency-free; the stage plans are content/stages/budget.yaml.
//
//   node scripts/verify-budget.mjs              run the gate on this repository
//   node scripts/verify-budget.mjs --verbose    also print the stage table and each path's tables
//   node scripts/verify-budget.mjs --json       print the findings and the figures as JSON
//   node scripts/verify-budget.mjs --strict     warnings fail too
//   node scripts/verify-budget.mjs --root DIR   read the files under DIR (tests)
//
// Exit status: 0 green (warnings allowed), 1 findings, 2 a required file could not be read or parsed.
//
// What it checks (spine 11.2, GATE-budget); a finding names its check:
//   table      every cell of the section 3.11 table equals budget.yaml, and the sentences that budget.yaml quotes still stand
//   rows       every figure recomputed from the rows and from the lesson and lab tables: lessons, build and write per stage,
//              stage totals, column totals, the cross-foot of the totals row (PLAN.md spine issue 2), the weeks columns
//   upper      a stage's high estimate within the roadmap's upper bound, weeks x 4.75 h (fail)
//   lower      a warning when the high estimate is below half of the lower bound, cleared only by a section 12 justification
//   keep       each stage's implied Keep load within the planned Keep block, for each block of each published path
//   cadence    the claim cadence of spine 4.1 on each published path at 6 h/week; a warning on a path whose cadence holds
//              only by counting planned records that no claim template covers (the spine says the gate cannot count them)
//   tools     at most one new tool per stage, and what the spine's stage paragraphs say
//   cutlist    the section 14 cut list against its eligibility rule (1) to (5), what cutting does to the lower bound, and
//              whether a fold puts a KC ahead of a hard prerequisite on a published path (a warning)
//   additions  every addition names its displacement (V2-09)
//   paths      the published paths take every unit of every stage once, and their lessons are the path the spine prints
//
// Hours are whole units of six seconds, so every comparison is exact; a printed figure is compared at its own precision.
//
// The model (parameters and the sentence that states each are in content/stages/budget.yaml):
//   rows      a lesson takes its tier's minutes (core 40-60, bridge 15-25, Boot 8); a lab stage its nominal minutes, up to
//             2x (3x for a Lean proof stage); a write stage counts under Write; [stretch] stages count nowhere. The table's
//             Lessons, Build and Write cells must equal that at their printed precision; a stage total may differ from the
//             exact sum by less than a printed tenth (the table rounds its totals two ways); the totals row is the rounded
//             sum of the printed rows, and its five column totals must add to its total.
//   bounds    the stage's rows, reading included, against the Roadmap cell: weeks x 4.75 h, or sessions x 2.5 h for S1.
//   Keep      per block of a path: the larger of the block's review minutes (KCs first taught in it x 10 reviews x 2 min over
//             60 days) and the planned Today sessions, plus the weekly review, the retro, the incidents once the Clearinghouse
//             has opened and the keep-alive while Lean is idle, at its high figures, against the planned block.
//   cadence   the units of each path in order at the high estimate; an event is a claim minted at its last lab stage (or its
//             lesson), a specimen mounted at its lesson, or a planned record; no gap past two weeks of 4.75 h, and a second
//             claim by week 4. Reading is not on the timeline (the table gives it per stage); a note shows what it would add.
//             A planned record is counted because the stage spec schedules it, though no claim template covers it and the
//             spine says the gate plans the cadence from templates; where the cadence passes only with the records, the path
//             prints a warning with the gap that it has without them (a failure under --strict).

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The shared readers are W0-T03's TypeScript, which Node runs as it is from 22.18; before that it needs a flag.
if (!process.features.typescript) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(again.status ?? 1);
}
const { parseYaml } = await import('../packages/ids/src/yaml-subset.ts');
const { scanBlocks } = await import('../packages/ids/src/markdown.ts');
const { buildSpineEntries } = await import('../packages/ids/src/spine.ts');

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const SPINE_PATH = 'docs/spine/SPINE.md';
export const BUDGET_PATH = 'content/stages/budget.yaml';
const STAGES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'];
const COLUMNS = ['read', 'lessons', 'build', 'write', 'defence'];
const CELLS = [...COLUMNS, 'total', 'weeks_6', 'weeks_10'];
const HEADER_OF = {
  read: 'Read', lessons: 'Lessons', build: 'Build', write: 'Write', defence: 'Defence', total: 'Total (h)',
  weeks_6: 'Weeks at 6 h/wk', weeks_10: 'Weeks at 10 h/wk', roadmap: 'Roadmap', gate: 'GATE-budget',
};

// ---------------------------------------------------------------- exact arithmetic

/** Units per hour: one unit is six seconds, so 0.01 h and one minute are both whole units. */
const UH = 600;
const hu = (hours) => Math.round(Number(hours) * UH);
const mu = (minutes) => Math.round(Number(minutes) * 10);
/** a/b rounded half up, for a >= 0 and b > 0. */
const roundDiv = (a, b) => Math.floor((2 * a + b) / (2 * b));
/** Units as hours with d decimals, rounded half up (the way the spine's table rounds). */
function fmtUnits(u, d) {
  const q = roundDiv(u * 10 ** d, UH);
  const s = String(q).padStart(d + 1, '0');
  return d === 0 ? s : `${s.slice(0, -d)}.${s.slice(-d)}`;
}
const h1 = (u) => (u / UH).toFixed(1);
const h2 = (u) => (u / UH).toFixed(2);
const weeksOf = (u, perWeek) => (u / perWeek).toFixed(1);

/** A printed decimal ("0.75") as units, its decimals and its text; null when it is not a decimal of up to two places. */
function parseDecimal(s) {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const d = m[2] === undefined ? 0 : m[2].length;
  return { u: Number(m[1] + (m[2] ?? '')) * (UH / 10 ** d), d, s };
}
/** A printed range ("1.4–2.2 (step briefings)") as two parsed decimals, or null. */
function parseRange(cell) {
  const m = /^(\d+(?:\.\d+)?)–(\d+(?:\.\d+)?)(?:\s*\(.*\))?$/.exec(String(cell).trim());
  if (!m) return null;
  const lo = parseDecimal(m[1]);
  const hi = parseDecimal(m[2]);
  return lo && hi ? [lo, hi] : null;
}

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const stripBold = (s) => String(s).replace(/\*\*/g, '').trim();
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const LESSON_ID = /\bS[1-9][0-9]*\.L[0-9]+\b/g;
const LAB_STAGE_ID = /\bLAB-[1-9][0-9]*\.[1-9][0-9]*\b/g;
const KC_ID = /\bKC-[0-9]+\.[a-z0-9]+(?:-[a-z0-9]+)*/g;
const ids = (text, re) => [...String(text).matchAll(re)].map((m) => m[0]);
const stageOfLesson = (id) => /^(S[0-9]+)\./.exec(id)?.[1] ?? null;
const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "S5.L1–S5.L8" or "LAB-5.1–LAB-5.6" as the IDs between; else the one ID; null for a range of anything else. */
function expandSelector(sel) {
  let m = /^(S[0-9]+\.L)([0-9]+)–(S[0-9]+\.L)([0-9]+)$/.exec(sel);
  if (m && m[1] === m[3]) return range(Number(m[2]), Number(m[4])).map((n) => `${m[1]}${n}`);
  m = /^(LAB-[0-9]+\.)([0-9]+)–(LAB-[0-9]+\.)([0-9]+)$/.exec(sel);
  if (m && m[1] === m[3]) return range(Number(m[2]), Number(m[4])).map((n) => `${m[1]}${n}`);
  return /–/.test(sel) ? null : [sel];
}
/** Every lab stage in a text, with "LAB-6.2–LAB-6.4" read as the stages between. */
function labStagesIn(text) {
  const out = new Set();
  for (const m of String(text).matchAll(/\b(LAB-[0-9]+\.)([0-9]+)–(LAB-[0-9]+\.)([0-9]+)\b/g)) {
    if (m[1] === m[3]) for (const n of range(Number(m[2]), Number(m[4]))) out.add(`${m[1]}${n}`);
  }
  for (const id of ids(text, LAB_STAGE_ID)) out.add(id);
  return out;
}

// ---------------------------------------------------------------- the spine, as the gate reads it

/** W0-T03's extraction of the spine (lessons, lab stages, KCs, specimens), its markdown blocks, and lookups into them. */
function readSpine(text) {
  const { entries, problems } = buildSpineEntries(text);
  const blocks = scanBlocks(text);
  const of = (kind) => entries.filter((e) => e.kind === kind);
  return {
    problems,
    blocks,
    text,
    normText: norm(text),
    lessons: new Map(of('lesson').map((e) => [e.id, e])),
    labStages: new Map(of('lab-stage').map((e) => [e.id, e])),
    kcs: new Map(of('kc').map((e) => [e.id, e])),
    drawers: new Map(of('drawer').map((e) => [e.id, e])),
    specimens: of('specimen'),
    table: (section, pred) => blocks.find((b) => b.type === 'table' && b.section === section && pred(b.header)),
    textLines: (section) => blocks.filter((b) => b.type === 'text' && b.section === section && b.text.trim() !== ''),
    paragraphs: stageParagraphs(blocks),
    decisions: decisionItems(blocks),
  };
}

/** The first paragraph of each stage's section 3.k: "New tool: ..." or "No new tool ...". */
function stageParagraphs(blocks) {
  const out = new Map();
  let cur = null;
  for (const b of blocks) {
    if (b.type === 'heading') {
      const m = /^3\.([0-9]+) (S[0-9]+) /.exec(b.text);
      cur = m && Number(m[1]) <= 10 ? m[2] : null;
    } else if (cur !== null && b.type === 'text' && b.text.trim() !== '' && !out.has(cur)) out.set(cur, { line: b.line, text: b.text });
  }
  return out;
}

/** Section 12's numbered decisions, by number. */
function decisionItems(blocks) {
  const items = new Map();
  for (const b of blocks) {
    if (b.type !== 'text' || b.section !== '12') continue;
    const m = /^([0-9]+)\.\s+(.*)$/.exec(b.text);
    if (m) items.set(Number(m[1]), { line: b.line, text: m[2] });
  }
  return items;
}

// ---------------------------------------------------------------- the budget file

/** Every `quote` and `quotes` in the budget file, with the file each quotes (the spine unless its node names one). */
function collectQuotes(node, path, out) {
  if (Array.isArray(node)) node.forEach((x, i) => collectQuotes(x, `${path}[${i}]`, out));
  else if (isObj(node)) {
    const file = typeof node.file === 'string' ? node.file : SPINE_PATH;
    if (typeof node.quote === 'string') out.push({ path, file, quote: node.quote });
    if (Array.isArray(node.quotes)) for (const q of node.quotes) if (typeof q === 'string') out.push({ path, file, quote: q });
    for (const [k, v] of Object.entries(node)) collectQuotes(v, `${path}.${k}`, out);
  }
  return out;
}

/** The files that a budget file's quotes cite (the spine included). */
export function citedFiles(budget) {
  return [...new Set(collectQuotes(budget, 'budget', []).map((q) => q.file))];
}

/** Structural problems of the budget file, as messages: the checks need every one of these fields. */
function shapeProblems(b) {
  const bad = [];
  const need = (ok, msg) => {
    if (!ok) bad.push(msg);
  };
  const num = (x) => typeof x === 'number' && Number.isFinite(x);
  const pair = (x) => Array.isArray(x) && x.length === 2 && x.every(num) && x[0] <= x[1];
  if (!isObj(b)) return ['the file is not a mapping'];
  need(b.schema === 'statespace/budget@1', 'schema must be "statespace/budget@1"');
  const P = b.parameters;
  if (!isObj(P)) bad.push('parameters is missing');
  else {
    need(isObj(P.stage_work_h) && num(P.stage_work_h.h6) && num(P.stage_work_h.h10), 'parameters.stage_work_h needs h6 and h10');
    need(isObj(P.keep_block_min) && pair(P.keep_block_min.h6) && pair(P.keep_block_min.h10), 'parameters.keep_block_min needs h6 and h10 as [low, high]');
    const a = P.keep_assumed;
    need(isObj(a) && isObj(a.today_sessions) && num(a.today_sessions.h6) && num(a.today_sessions.h10) && isObj(a.incidents) && num(a.incidents.h6) && num(a.incidents.h10) && pair(a.today_session_min) && pair(a.incident_min), 'parameters.keep_assumed needs today_sessions and incidents (h6, h10), today_session_min and incident_min');
    const k = P.keep_items;
    need(isObj(k) && num(k.weekly_review_min) && num(k.retro_min_per_month) && pair(k.keep_alive_min) && pair(k.keep_alive_every_weeks), 'parameters.keep_items needs weekly_review_min, retro_min_per_month, keep_alive_min and keep_alive_every_weeks');
    const r = P.review_load;
    need(isObj(r) && num(r.window_days) && r.window_days > 0 && num(r.reviews_per_kc) && num(r.seconds_per_review), 'parameters.review_load needs window_days, reviews_per_kc and seconds_per_review');
    const c = P.cadence;
    need(isObj(c) && num(c.max_gap_weeks) && num(c.claims_by_week) && num(c.min_claims) && c.min_claims >= 1, 'parameters.cadence needs max_gap_weeks, claims_by_week and min_claims');
    const l = P.lessons;
    need(isObj(l) && num(l.boot_min) && pair(l.core_min) && pair(l.bridge_min), 'parameters.lessons needs boot_min, core_min and bridge_min');
    const lb = P.labs;
    need(isObj(lb) && num(lb.proof_multiplier) && num(lb.other_multiplier), 'parameters.labs needs proof_multiplier and other_multiplier');
    const rm = P.roadmap;
    need(isObj(rm) && num(rm.session_h) && num(rm.lower_bound_factor), 'parameters.roadmap needs session_h and lower_bound_factor');
    const ar = P.arc;
    need(isObj(ar) && num(ar.planning_factor) && num(ar.reserve_weeks) && num(ar.per_weeks) && ar.per_weeks > ar.reserve_weeks, 'parameters.arc needs planning_factor, reserve_weeks and per_weeks');
  }
  need(isObj(b.stages), 'stages is missing');
  for (const sid of STAGES) {
    const s = b.stages?.[sid];
    if (!isObj(s)) {
      bad.push(`stages.${sid} is missing`);
      continue;
    }
    need(isObj(s.rows) && [...CELLS, 'roadmap', 'gate'].every((k) => typeof s.rows[k] === 'string'), `stages.${sid}.rows needs read, lessons, build, write, defence, total, weeks_6, weeks_10, roadmap and gate as printed`);
    need(Array.isArray(s.new_tools) && s.new_tools.every((t) => typeof t === 'string'), `stages.${sid}.new_tools must be a list of names`);
    need(typeof s.sequence === 'string' && s.sequence.trim() !== '', `stages.${sid}.sequence must list the units in order`);
    for (const [name, x] of Object.entries(s.extras ?? {})) {
      need(isObj(x) && ['lessons', 'build', 'write'].includes(x.column) && pair(x.minutes), `stages.${sid}.extras.${name} needs a column (lessons, build or write) and minutes as [low, high]`);
    }
    for (const [id, m] of Object.entries(s.lesson_minutes ?? {})) need(pair(m), `stages.${sid}.lesson_minutes.${id} must be [low, high] minutes`);
    for (const [id, m] of Object.entries(s.passes ?? {})) need(Array.isArray(m) && m.length > 0 && m.every(num), `stages.${sid}.passes.${id} must be a list of minutes`);
  }
  need(isObj(b.totals) && [...CELLS].every((k) => typeof b.totals[k] === 'string'), 'totals needs read, lessons, build, write, defence, total, weeks_6 and weeks_10 as printed');
  need(isObj(b.paths) && isObj(b.paths.default) && isObj(b.paths.builder), 'paths needs default and builder');
  for (const [pid, p] of Object.entries(b.paths ?? {})) {
    need(isObj(p) && Array.isArray(p.blocks) && p.blocks.length > 0 && Array.isArray(p.lean_idle) && typeof p.clearinghouse_after === 'string', `paths.${pid} needs blocks, lean_idle and clearinghouse_after`);
  }
  need(b.claim_mints === undefined || isObj(b.claim_mints), 'claim_mints must be a mapping');
  need(Array.isArray(b.planned_records ?? []), 'planned_records must be a list');
  for (const r of b.planned_records ?? []) need(isObj(r) && typeof r.id === 'string' && typeof r.unit === 'string' && Number.isInteger(r.after_pass), 'a planned record needs an id, a unit and an after_pass number');
  const ruling = b.planned_records_ruling;
  need(ruling === undefined || (isObj(ruling) && typeof ruling.item === 'string' && typeof ruling.quote === 'string'), 'planned_records_ruling needs an item (where the spine rules) and a quote (its sentence)');
  need((b.planned_records ?? []).length === 0 || isObj(ruling), 'planned_records needs planned_records_ruling: the spine sentence that says GATE-budget cannot count claims without a template, which the cadence warning cites');
  need(isObj(b.cut_list) && isObj(b.cut_list.sole_lessons), 'cut_list.sole_lessons is missing');
  need(Array.isArray(b.additions), 'additions must be a list');
  need(Array.isArray(b.justifications), 'justifications must be a list');
  return bad;
}

// ---------------------------------------------------------------- one stage's plan, from the lesson and lab tables

/**
 * The units of one stage in the order of its sequence, each with its hours (low and high, in units) and its column,
 * and the stage's columns summed. Problems go to `add`.
 */
function planStage(sid, sp, rows, sm, P, add) {
  const where = `${BUDGET_PATH} stages.${sid}`;
  const fail = (message) => add('fail', 'rows', message, { stage: sid, where });
  const tokens = String(sp.sequence).trim().split(/\s+/);
  const units = [];
  const seen = new Set();
  const labId = `LAB-${sid.slice(1)}`;
  const briefings = new Set(sp.briefings ?? []);
  const extras = sp.extras ?? {};
  const writeStages = new Set(sp.write_stages ?? []);
  const isDefence = (t) => /^DEFENCE(:[A-Z0-9]+)?$/.test(t);
  const defenceTokens = tokens.filter(isDefence);
  const L = P.lessons;
  const core = [mu(L.core_min[0]), mu(L.core_min[1])];
  const bridge = [mu(L.bridge_min[0]), mu(L.bridge_min[1])];

  for (const tok of tokens) {
    if (seen.has(tok)) {
      fail(`${tok} appears twice in the sequence of ${sid}`);
      continue;
    }
    seen.add(tok);
    if (sm.lessons.has(tok)) {
      const l = sm.lessons.get(tok);
      if (l.stage !== sid) {
        fail(`${tok} is a lesson of ${l.stage}, not of ${sid}`);
        continue;
      }
      let r;
      if (sp.lesson_minutes?.[tok]) r = [mu(sp.lesson_minutes[tok][0]), mu(sp.lesson_minutes[tok][1])];
      else if (l.tier === 'boot') r = [mu(L.boot_min), mu(L.boot_min)];
      else if (l.tier === 'core') r = core;
      else if (l.tier === 'bridge') r = bridge;
      else if (l.tier === 'step' && briefings.has(tok)) r = core;
      else {
        fail(`${tok} has tier [${l.tier}], which is planned time only when it is listed under briefings`);
        continue;
      }
      units.push({ token: tok, id: tok, stage: sid, kind: 'lesson', column: 'lessons', lo: r[0], hi: r[1], lesson: l });
    } else if (sm.labStages.has(tok)) {
      const e = sm.labStages.get(tok);
      if (e.lab !== labId) {
        fail(`${tok} is a stage of ${e.lab}, not of ${labId}`);
        continue;
      }
      if (e.stretch) {
        fail(`${tok} is a [stretch] stage, which the budget excludes`);
        continue;
      }
      const write = /write stage/.test(e.title) || writeStages.has(tok);
      const proof = !write && /\(proof stage\b/.test(e.title);
      const lo = mu(e.minutes);
      units.push({ token: tok, id: tok, stage: sid, kind: 'lab', column: write ? 'write' : 'build', lo, hi: lo * (proof ? P.labs.proof_multiplier : P.labs.other_multiplier), minutes: e.minutes, lab: e, proof });
    } else if (isDefence(tok)) {
      const n = defenceTokens.length;
      const k = defenceTokens.indexOf(tok);
      const part = (total) => (k === n - 1 ? total - Math.floor(total / n) * (n - 1) : Math.floor(total / n));
      units.push({ token: tok, id: tok, stage: sid, kind: 'defence', column: 'defence', lo: part(rows.defence[0].u), hi: part(rows.defence[1].u) });
    } else if (Object.hasOwn(extras, tok)) {
      const x = extras[tok];
      units.push({ token: tok, id: tok, stage: sid, kind: 'extra', column: x.column, lo: mu(x.minutes[0]), hi: mu(x.minutes[1]), what: x.what });
    } else {
      fail(`"${tok}" in the sequence of ${sid} is no lesson, lab stage, DEFENCE or extra`);
    }
  }
  // completeness: every planned unit once, and nothing the budget excludes
  for (const l of [...sm.lessons.values()].filter((x) => x.stage === sid)) {
    const planned = ['boot', 'core', 'bridge'].includes(l.tier) || briefings.has(l.id);
    if (planned && !seen.has(l.id)) fail(`${l.id} is in no place of the sequence of ${sid}`);
    if (l.tier === 'step' && seen.has(l.id) && !briefings.has(l.id)) fail(`${l.id} is a capstone step; list it under briefings or take it out of the sequence`);
  }
  for (const e of [...sm.labStages.values()].filter((x) => x.lab === labId)) if (!e.stretch && !seen.has(e.id)) fail(`${e.id} is in no place of the sequence of ${sid}`);
  for (const name of Object.keys(extras)) if (!seen.has(name)) fail(`extra ${name} of ${sid} is in no place of the sequence`);
  for (const id of briefings) if (sm.lessons.get(id)?.tier !== 'step') fail(`${id} under briefings is not a capstone step`);
  for (const id of writeStages) if (!sm.labStages.has(id)) fail(`${id} under write_stages is not a lab stage`);
  if (defenceTokens.length === 0) fail(`the sequence of ${sid} has no DEFENCE`);
  if (defenceTokens.length > 1 && defenceTokens.some((t) => !t.includes(':'))) fail(`a stage with several Defences writes them DEFENCE:A, DEFENCE:B, ... (${sid})`);
  for (const [id, passes] of Object.entries(sp.passes ?? {})) {
    const u = units.find((x) => x.id === id);
    const sum = passes.reduce((a, b) => a + b, 0);
    if (!u) fail(`${id} under passes is no unit of ${sid}`);
    else if (sum !== u.minutes) fail(`the passes of ${id} sum to ${sum} minutes, the lab table says ${u.minutes}`);
    else u.passes = passes;
  }
  const columns = { read: [rows.read[0].u, rows.read[1].u], lessons: [0, 0], build: [0, 0], write: [0, 0], defence: [0, 0] };
  for (const u of units) {
    columns[u.column][0] += u.lo;
    columns[u.column][1] += u.hi;
  }
  const total = [0, 1].map((i) => COLUMNS.reduce((a, c) => a + columns[c][i], 0));
  return { stage: sid, units, columns, total };
}

// ---------------------------------------------------------------- the published paths

/** The units of one published path in order, with cumulative hours, and the flags that the Keep check reads. */
function resolvePath(pid, def, plans, add) {
  const where = `${BUDGET_PATH} paths.${pid}`;
  const fail = (message) => add('fail', 'paths', message, { scope: pid, where });
  const taken = new Map(STAGES.map((s) => [s, new Set()]));
  const blocks = [];
  const blockIds = new Set();
  for (const raw of def.blocks) {
    const b = typeof raw === 'string' ? { id: raw, stage: raw } : raw;
    if (!isObj(b) || typeof b.id !== 'string' || !plans[b.stage]) {
      fail(`a block of ${pid} needs an id and a stage of S1 to S10: ${JSON.stringify(raw)}`);
      continue;
    }
    if (blockIds.has(b.id)) fail(`the block id ${b.id} appears twice on ${pid}`);
    blockIds.add(b.id);
    const plan = plans[b.stage];
    const mine = taken.get(b.stage);
    let want;
    if (b.take === undefined) want = new Set(plan.units.map((u) => u.token));
    else if (b.take === 'rest') want = new Set(plan.units.map((u) => u.token).filter((t) => !mine.has(t)));
    else if (Array.isArray(b.take)) {
      want = new Set();
      for (const sel of b.take) {
        const list = typeof sel === 'string' ? expandSelector(sel) : null;
        if (!list) fail(`block ${b.id}: "${sel}" is no unit and no range of units`);
        else for (const t of list) want.add(t);
      }
    } else {
      fail(`block ${b.id}: take must be a list or "rest"`);
      want = new Set();
    }
    const units = [];
    for (const u of plan.units) {
      if (!want.has(u.token)) continue;
      if (mine.has(u.token)) fail(`${u.token} of ${b.stage} is taken twice on ${pid} (block ${b.id})`);
      mine.add(u.token);
      units.push({ ...u, block: b.id });
    }
    for (const t of want) if (!plan.units.some((u) => u.token === t)) fail(`block ${b.id} takes ${t}, which is no unit of ${b.stage}`);
    blocks.push({ id: b.id, stage: b.stage, units });
  }
  for (const sid of STAGES) for (const u of plans[sid].units) if (!taken.get(sid).has(u.token)) fail(`${u.token} of ${sid} is on no block of ${pid}`);
  let lo = 0;
  let hi = 0;
  const flat = [];
  for (const b of blocks) {
    for (const u of b.units) {
      u.startLo = lo;
      u.startHi = hi;
      lo += u.lo;
      hi += u.hi;
      u.endLo = lo;
      u.endHi = hi;
      flat.push(u);
    }
  }
  for (const id of def.lean_idle) if (!blockIds.has(id)) fail(`lean_idle names ${id}, which is no block of ${pid}`);
  const cAt = blocks.findIndex((b) => b.id === def.clearinghouse_after);
  if (cAt < 0) fail(`clearinghouse_after names ${def.clearinghouse_after}, which is no block of ${pid}`);
  for (const [i, b] of blocks.entries()) {
    b.leanIdle = def.lean_idle.includes(b.id);
    b.clearinghouse = cAt >= 0 && i > cAt;
  }
  return { id: pid, label: def.label ?? pid, blocks, units: flat, totalLo: lo, totalHi: hi };
}

/** The lessons of each path against spine 3.0, and the lab stages of the split stages against the spine's table. */
function checkPathsAgainstSpine(budget, paths, sm, add) {
  const lessonsOfStage = (sid) => [...sm.lessons.values()].filter((l) => l.stage === sid && ['boot', 'core', 'bridge'].includes(l.tier)).map((l) => l.id);
  const lessonPath = (p) => p.units.filter((u) => u.kind === 'lesson' && u.lesson.tier !== 'step').map((u) => u.id);
  const dflt = paths.find((p) => p.id === 'default');
  if (dflt && lessonPath(dflt).join(' ') !== STAGES.flatMap(lessonsOfStage).join(' ')) add('fail', 'paths', 'the lessons of the default path are not those of S1 to S10, in order', { scope: 'default', where: BUDGET_PATH });
  const builder = paths.find((p) => p.id === 'builder');
  const line = sm.textLines('3.0').find((b) => b.text.startsWith('S1 → '));
  if (!line) add('fail', 'paths', 'spine section 3.0 prints no builder path ("S1 → ...")', { where: SPINE_PATH });
  else if (builder) {
    const spinePath = [];
    for (const tok of line.text.replace(/\.\s*$/, '').split(' → ')) {
      if (/^S[0-9]+$/.test(tok)) spinePath.push(...lessonsOfStage(tok));
      else for (const part of tok.split(',')) spinePath.push(...(expandSelector(part.trim()) ?? [`?${part.trim()}`]));
    }
    const mine = lessonPath(builder);
    if (mine.join(' ') !== spinePath.join(' ')) {
      const at = mine.findIndex((id, i) => id !== spinePath[i]);
      add('fail', 'paths', `the lessons of the builder path differ from spine section 3.0 at lesson ${Math.max(at, 0) + 1}: the spine has ${spinePath[at] ?? 'none'}, ${BUDGET_PATH} has ${mine[at] ?? 'none'}`, { scope: 'builder', where: `${SPINE_PATH}:${line.line}` });
    }
  }
  const jump = sm.table('3.0', (h) => h[0].startsWith("Jump on the builder's path"));
  if (jump && builder) {
    const labsOf = (id) => new Set(builder.blocks.find((b) => b.id === id)?.units.filter((u) => u.kind === 'lab').map((u) => u.id) ?? []);
    const nonStretch = (set) => new Set([...set].filter((id) => sm.labStages.get(id) && !sm.labStages.get(id).stretch));
    const same = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
    for (const [stage, rowStart] of [['S6', 'LAB-6 before'], ['S8', 'S8.L1–S8.L4 before']]) {
      const row = jump.rows.find((r) => r.cells[0].startsWith(rowStart));
      if (!row) {
        add('fail', 'paths', `the builder-path table of spine section 3.0 has no row "${rowStart}..."`, { where: SPINE_PATH });
        continue;
      }
      const early = row.cells[1].slice(0, row.cells[1].indexOf(' only'));
      const later = row.cells[2].slice(row.cells[2].lastIndexOf(';') + 1, row.cells[2].indexOf('run in the later'));
      const spineEarly = nonStretch(labStagesIn(early.slice(early.indexOf('LAB-'))));
      const spineLater = nonStretch(labStagesIn(later));
      for (const [which, set, block] of [['early', spineEarly, `${stage}-early`], ['later', spineLater, `${stage}-late`]]) {
        if (!same(set, labsOf(block))) add('fail', 'paths', `the spine's ${which} ${stage} block runs ${[...set].join(', ') || 'no lab stage'}, ${BUDGET_PATH} block ${block} has ${[...labsOf(block)].join(', ') || 'none'}`, { scope: 'builder', where: `${SPINE_PATH}:${row.line}` });
      }
    }
  }
  const m = /\(S([0-9]+)–S([0-9]+) on the default path/.exec(sm.text);
  if (m && dflt) {
    const want = range(Number(m[1]), Number(m[2])).map((n) => `S${n}`);
    if (want.join(' ') !== budget.paths.default.lean_idle.join(' ')) add('fail', 'paths', `the spine runs the Lean keep-alive in ${want.join(', ')} on the default path, ${BUDGET_PATH} has ${budget.paths.default.lean_idle.join(', ')}`, { scope: 'default', where: BUDGET_PATH });
  }
}

// ---------------------------------------------------------------- the sentences of section 3.11 that summarize the table

/** The prose of section 3.11 against the figures it summarizes: which stages plan below the roadmap, and the arc projection. */
function checkProse(sm, plans, printedTotals, bounds, P, perWeek, add) {
  const where = `${SPINE_PATH} section 3.11`;
  const fail = (message) => add('fail', 'rows', message, { where });
  const lowerOf = (sid) => bounds[sid]?.lower ?? null;
  const wholly = STAGES.filter((sid) => lowerOf(sid) !== null && plans[sid].total[1] < lowerOf(sid));
  const lowBelow = STAGES.filter((sid) => lowerOf(sid) !== null && plans[sid].total[0] < lowerOf(sid));
  const a = /(S[0-9]+(?:, S[0-9]+)* and S[0-9]+) plan wholly below its lower bound/.exec(sm.text);
  if (a && ids(a[1], /S[0-9]+/g).join(' ') !== wholly.join(' ')) fail(`the spine says ${ids(a[1], /S[0-9]+/g).join(', ')} plan wholly below the roadmap's lower bound, the totals say ${wholly.join(', ') || 'no stage'}`);
  const b = /as do the low estimates of (S[0-9]+)–(S[0-9]+)/.exec(sm.text);
  if (b && range(Number(b[1].slice(1)), Number(b[2].slice(1))).map((n) => `S${n}`).join(' ') !== lowBelow.join(' ')) fail(`the spine says the low estimates of ${b[1]}–${b[2]} are below the roadmap's lower bound, the totals say ${lowBelow.join(', ') || 'no stage'}`);
  // the arc: the totals row at the planning factor, with reserve weeks
  const A = P.arc;
  const factor = A.planning_factor * (A.per_weeks / (A.per_weeks - A.reserve_weeks));
  const arc = /the arc projects to about ([0-9]+)–([0-9]+) weeks at 6 h\/week \(about ([0-9.]+)–([0-9.]+) months[^)]*\) and about ([0-9]+)–([0-9]+) weeks at 10 h\/week/.exec(sm.text);
  if (arc) {
    const weeks = (i, n) => (printedTotals.total[i].u / perWeek[n]) * factor;
    const months = (i) => (weeks(i, 6) * 12) / 52;
    const want = [Math.round(weeks(0, 6)), Math.round(weeks(1, 6)), Math.round(weeks(0, 10)), Math.round(weeks(1, 10))];
    const said = [arc[1], arc[2], arc[5], arc[6]].map(Number);
    const decimals = (t) => (t.split('.')[1] ?? '').length;
    if (want.join(' ') !== said.join(' ')) fail(`the spine projects the arc to ${said[0]}–${said[1]} weeks at 6 h/week and ${said[2]}–${said[3]} at 10 h/week, the totals row at ${A.planning_factor}x with ${A.reserve_weeks} reserve weeks in ${A.per_weeks} gives ${want[0]}–${want[1]} and ${want[2]}–${want[3]}`);
    const m = [months(0).toFixed(decimals(arc[3])), months(1).toFixed(decimals(arc[4]))];
    if (m[0] !== arc[3] || m[1] !== arc[4]) fail(`the spine puts the arc at ${arc[3]}–${arc[4]} months, the totals row gives ${m[0]}–${m[1]}`);
  }
}

// ---------------------------------------------------------------- bounds: upper, lower, justifications

/** The roadmap bound of each stage in units, from its printed Roadmap cell. */
function parseBounds(budget, P, perWeek, add) {
  const out = {};
  for (const sid of STAGES) {
    const cell = norm(budget.stages[sid].rows.roadmap);
    let m;
    let b = null;
    if ((m = /^(\d+)–(\d+) wk$/.exec(cell))) b = { kind: 'weeks', lower: Number(m[1]) * perWeek[6], upper: Number(m[2]) * perWeek[6], cell };
    else if ((m = /^(\d+)–(\d+) sessions \(≤ (\d+) h\)$/.exec(cell))) {
      b = { kind: 'sessions', lower: Number(m[1]) * hu(P.roadmap.session_h), upper: Number(m[2]) * hu(P.roadmap.session_h), cell };
      if (b.upper !== Number(m[3]) * UH) add('fail', 'upper', `${sid}: ${m[2]} sessions of ${P.roadmap.session_h} h are ${h1(b.upper)} h, not the ${m[3]} h that its roadmap cell caps them at`, { stage: sid, where: BUDGET_PATH });
    } else if ((m = /^open; final ≤(\d+) wk$/.exec(cell))) b = { kind: 'open', lower: null, upper: Number(m[1]) * perWeek[6], cell };
    else add('fail', 'upper', `${sid}: the roadmap cell "${cell}" is none of "a–b wk", "a–b sessions (≤ n h)" and "open; final ≤n wk"`, { stage: sid, where: BUDGET_PATH });
    out[sid] = b;
  }
  return out;
}

/** The justifications of lower-bound warnings: each must cite a section 12 item that names the stage and its lower bound. */
function readJustifications(budget, sm, add) {
  const byStage = new Map();
  for (const j of budget.justifications) {
    if (!isObj(j) || !STAGES.includes(j.stage) || !Number.isInteger(j.item)) {
      add('fail', 'lower', `a justification needs a stage of S1 to S10 and a section 12 item number: ${JSON.stringify(j)}`, { where: BUDGET_PATH });
      continue;
    }
    const it = sm.decisions.get(j.item);
    if (!it) add('fail', 'lower', `the justification of ${j.stage} cites section 12 item ${j.item}, which does not exist`, { stage: j.stage, where: BUDGET_PATH });
    else if (!new RegExp(`\\b${j.stage}\\b`).test(it.text) || !/lower[- ]bound/i.test(it.text)) add('fail', 'lower', `section 12 item ${j.item} names no ${j.stage} and no lower bound, so it justifies nothing for ${j.stage}`, { stage: j.stage, where: `${SPINE_PATH}:${it.line}` });
    else byStage.set(j.stage, j);
  }
  return { byStage, used: new Set() };
}

/** The upper bound (fail) and the lower-bound warning, on the stage hours that a path's blocks add up to. */
function checkBounds(p, plans, bounds, P, just, add) {
  const rows = [];
  let upperOk = 0;
  let warned = 0;
  for (const sid of STAGES) {
    let lo = plans[sid].columns.read[0];
    let hi = plans[sid].columns.read[1];
    for (const b of p.blocks) if (b.stage === sid) for (const u of b.units) { lo += u.lo; hi += u.hi; }
    const bd = bounds[sid];
    const row = { stage: sid, lo, hi, upper: bd?.upper ?? null, lower: bd?.lower ?? null, line: null };
    rows.push(row);
    if (!bd) continue;
    if (hi > bd.upper) add('fail', 'upper', `${sid}: the high estimate ${h2(hi)} h exceeds the roadmap's upper bound ${h2(bd.upper)} h (${bd.cell})`, { stage: sid, scope: p.id, where: BUDGET_PATH });
    else upperOk++;
    if (bd.lower !== null) {
      row.line = Math.round(bd.lower * P.roadmap.lower_bound_factor);
      if (hi < row.line) {
        const j = just.byStage.get(sid);
        if (j) {
          just.used.add(sid);
          add('note', 'lower', `${sid}: the high estimate ${h2(hi)} h is below half of the roadmap's lower bound (${h2(row.line)} h); section 12 item ${j.item} justifies it`, { stage: sid, scope: p.id });
        } else {
          warned++;
          add('warn', 'lower', `${sid}: the high estimate ${h2(hi)} h is below half of the roadmap's lower bound (${h2(row.line)} h of ${h2(bd.lower)} h, ${bd.cell}); a section 12 justification clears it`, { stage: sid, scope: p.id, where: BUDGET_PATH });
        }
      }
    }
  }
  const withUpper = rows.filter((r) => r.upper !== null);
  const tight = withUpper.reduce((a, r) => (r.upper - r.hi < a.upper - a.hi ? r : a));
  const withLine = rows.filter((r) => r.line !== null);
  const tightLow = withLine.reduce((a, r) => (r.hi - r.line < a.hi - a.line ? r : a));
  const belowLower = rows.filter((r) => r.lower !== null && r.hi < r.lower).map((r) => r.stage);
  return {
    rows,
    upper: `${upperOk} of ${withUpper.length} stages within the roadmap's upper bound; tightest ${tight.stage}, high ${h2(tight.hi)} h of ${h2(tight.upper)} h`,
    lower: `${plural(withLine.length, 'stage')} against half of the roadmap's lower bound, ${warned === 0 ? 'none below it' : `${warned} below it`}; tightest ${tightLow.stage}, ${h2(tightLow.hi)} h against ${h2(tightLow.line)} h (the plan sits wholly below the lower bound in ${belowLower.join(', ') || 'no stage'})`,
  };
}

// ---------------------------------------------------------------- Keep load

/** The implied Keep load of each block of a path, at 6 and at 10 h/week, against the planned Keep block. */
function checkKeep(p, sm, P, add) {
  const R = P.review_load;
  const A = P.keep_assumed;
  const I = P.keep_items;
  const first = new Map();
  for (const b of p.blocks) for (const u of b.units) if (u.kind === 'lesson') for (const kc of u.lesson.kcs ?? []) if (!first.has(kc)) first.set(kc, b.id);
  for (const id of sm.kcs.keys()) if (!first.has(id)) add('fail', 'keep', `${id} is taught by no lesson on the ${p.id} path, so its reviews are in no block's load`, { scope: p.id, where: SPINE_PATH });
  const perKc = (R.reviews_per_kc * (R.seconds_per_review / 60) * 7) / R.window_days;
  const retro = (I.retro_min_per_month * 12) / 52;
  const keepAlive = [I.keep_alive_min[0] / I.keep_alive_every_weeks[1], I.keep_alive_min[1] / I.keep_alive_every_weeks[0]];
  const rows = [];
  let worst = null;
  for (const b of p.blocks) {
    const kcs = [...first.values()].filter((x) => x === b.id).length;
    const demand = kcs * perKc;
    const row = { block: b.id, stage: b.stage, kcs, demand, leanIdle: b.leanIdle, clearinghouse: b.clearinghouse, at: {} };
    for (const w of [6, 10]) {
      const sessions = A.today_sessions[`h${w}`];
      const incidents = A.incidents[`h${w}`];
      const planned = P.keep_block_min[`h${w}`];
      const fixLo = I.weekly_review_min + retro + (b.clearinghouse ? incidents * A.incident_min[0] : 0) + (b.leanIdle ? keepAlive[0] : 0);
      const fixHi = I.weekly_review_min + retro + (b.clearinghouse ? incidents * A.incident_min[1] : 0) + (b.leanIdle ? keepAlive[1] : 0);
      // reviews are done inside Today sessions: the block holds at least the planned sessions, and more when the reviews need them
      const lo = Math.max(demand, sessions * A.today_session_min[0]) + fixLo;
      const hi = Math.max(demand, sessions * A.today_session_min[1]) + fixHi;
      row.at[w] = { lo, hi, planned, margin: planned[1] - hi };
      if (hi > planned[1] + 1e-9) add('fail', 'keep', `${b.id} (${plural(kcs, 'new KC')}): the implied Keep load is up to ${hi.toFixed(1)} min/week at ${w} h/week, above the planned ${planned[1]} (reviews ${demand.toFixed(1)}, fixed items ${fixHi.toFixed(1)})`, { stage: b.stage, scope: p.id, where: BUDGET_PATH });
      if (!worst || row.at[w].margin < worst.margin) worst = { block: b.id, w, margin: row.at[w].margin, hi, planned: planned[1] };
    }
    rows.push(row);
  }
  const counted = [...first.keys()].length;
  return {
    rows,
    summary: `${rows.length} blocks, ${plural(counted, 'KC')}: each block's reviews (${perKc.toFixed(2)} min/week per KC over ${R.window_days} days) plus the Keep items stay within the planned block at 6 and 10 h/week; tightest ${worst.block} at ${worst.w} h/week, ${worst.hi.toFixed(1)} of ${worst.planned} min/week`,
  };
}

// ---------------------------------------------------------------- claim cadence

/** Claim templates with the cell that says where each is minted. */
function claimMintCells(sm) {
  const t = sm.table('5.2', (h) => h[0] === 'ID' && h[2] === 'Minted in');
  return t ? t.rows.map((r) => ({ id: r.cells[0], cell: r.cells[2], line: r.line })) : null;
}

/** The longest gaps, and the second claim, between the claims, specimens and planned records of a path at 6 h/week. */
function checkCadence(p, budget, sm, plans, P, perWeek, add) {
  const C = P.cadence;
  const limit = C.max_gap_weeks * perWeek[6];
  const where = `${SPINE_PATH} section 4.1`;
  const fail = (message) => add('fail', 'cadence', message, { scope: p.id, where });
  const byId = new Map(p.units.filter((u) => u.kind === 'lesson' || u.kind === 'lab').map((u) => [u.id, u]));
  const order = (id) => byId.get(id)?.endHi ?? -1;
  const events = [];
  const at = (id, kind, unitId, lo, hi, extra = {}) => events.push({ id, kind, unit: unitId, lo, hi, ...extra });
  for (const s of sm.specimens) {
    const lesson = ids(s.lesson ?? '', LESSON_ID)[0];
    const u = byId.get(lesson);
    if (!u) fail(`${s.id} is mounted in ${lesson ?? s.lesson}, which is no unit of the ${p.id} path`);
    else at(s.id, 'specimen', lesson, u.endLo, u.endHi);
  }
  const cells = claimMintCells(sm);
  if (!cells) fail('spine section 5.2 has no table headed ID, Proposition, Minted in');
  else {
    for (const c of cells) {
      const override = budget.claim_mints?.[c.id];
      let unit;
      if (override) unit = override.unit;
      else {
        const labs = ids(c.cell, LAB_STAGE_ID);
        if (labs.some((id) => sm.labStages.get(id)?.stretch)) continue; // minted in a [stretch] stage: not a planned event
        const pool = labs.length > 0 ? labs : ids(c.cell, LESSON_ID);
        unit = pool.filter((id) => byId.has(id)).sort((a, b) => order(a) - order(b)).at(-1);
      }
      const u = unit ? byId.get(unit) : undefined;
      if (!u) fail(`${c.id} is minted in "${c.cell}", which names no unit of the ${p.id} path`);
      else at(c.id, 'claim', unit, u.endLo, u.endHi);
    }
    for (const id of Object.keys(budget.claim_mints ?? {})) if (!cells.some((c) => c.id === id)) fail(`claim_mints names ${id}, which is no claim template`);
  }
  for (const r of budget.planned_records ?? []) {
    const u = byId.get(r.unit);
    if (!u?.passes || r.after_pass < 1 || r.after_pass > u.passes.length) {
      fail(`planned record ${r.id} is after pass ${r.after_pass} of ${r.unit}, which has ${u?.passes ? plural(u.passes.length, 'pass', 'passes') : 'no passes'} on the ${p.id} path`);
      continue;
    }
    const done = u.passes.slice(0, r.after_pass).reduce((a, b) => a + b, 0);
    const frac = done / u.minutes;
    at(r.id, 'record', r.unit, u.startLo + Math.round(frac * (u.endLo - u.startLo)), u.startHi + Math.round(frac * (u.endHi - u.startHi)));
  }
  events.sort((a, b) => a.hi - b.hi || a.lo - b.lo || (a.id < b.id ? -1 : 1));
  /** The gaps between consecutive events of a list, and from the start of the path to its first, longest first. */
  const gapsOf = (list, key) => {
    const out = [];
    let prev = { id: 'the start of the path', unit: null, [key]: 0 };
    for (const e of list) {
      out.push({ from: prev, to: e, gap: e[key] - prev[key] });
      prev = e;
    }
    return out.sort((a, b) => b.gap - a.gap);
  };
  const hiGaps = gapsOf(events, 'hi');
  const loGaps = gapsOf(events, 'lo');
  const name = (e) => (e.unit ? `${e.id} (${e.unit})` : e.id);
  const worst = hiGaps[0];
  const claims = events.filter((e) => e.kind === 'claim');
  const second = claims[C.min_claims - 1];
  const weeks = (u) => weeksOf(u, perWeek[6]);
  if (worst && worst.gap > limit) fail(`${name(worst.from)} to ${name(worst.to)}: ${h2(worst.gap)} h of stage work = ${weeks(worst.gap)} weeks at 6 h/week, above the ${C.max_gap_weeks}-week limit (${h2(limit)} h)`);
  if (!second) fail(`the ${p.id} path mints fewer than ${C.min_claims} claims`);
  else if (second.hi > C.claims_by_week * perWeek[6]) fail(`claim number ${C.min_claims}, ${name(second)}, comes at ${h2(second.hi)} h = ${weeks(second.hi)} weeks, after week ${C.claims_by_week}`);
  // The spine plans the cadence from claim templates and specimens (its "Left unchanged" paragraph, S10 issue 9, its cadence
  // clause), and a planned record is neither. When the cadence passes only because of the records, the path says so.
  const records = events.filter((e) => e.kind === 'record');
  const bare = records.length > 0 ? (gapsOf(events.filter((e) => e.kind !== 'record'), 'hi')[0] ?? null) : null;
  const dependent = bare !== null && bare.gap > limit && worst.gap <= limit;
  if (dependent) {
    const R = budget.planned_records_ruling;
    const ruled = sm.blocks.find((b) => b.type === 'text' && norm(b.text).includes(norm(R.quote)));
    const them = records.length === 1 ? 'it' : 'them';
    // when the sentence is gone from the spine the table check fails; the warning then says so instead of citing it
    const rule = ruled ? `the spine rules out counting ${them} (${R.item}: "${R.quote}")` : `the spine no longer says what planned_records_ruling quotes (${R.item}), so the ruling needs revisiting`;
    add('warn', 'cadence', `the cadence holds only by counting ${plural(records.length, 'planned record')} of ${[...new Set(records.map((r) => r.unit))].join(', ')} that no claim template covers; without ${them}, ${name(bare.from)} to ${name(bare.to)} is ${h2(bare.gap)} h of stage work = ${weeks(bare.gap)} weeks at 6 h/week, above the ${C.max_gap_weeks}-week limit (${h2(limit)} h; ${h2(bare.to.lo - bare.from.lo)} h at the low estimate); ${rule}; owner decision pending (${BUDGET_PATH}, planned_records)`, { scope: p.id, where: ruled ? `${SPINE_PATH}:${ruled.line}` : SPINE_PATH });
  }
  // sensitivity: reading is a column of the table that is placed on no unit; spread over each stage's lessons it lengthens gaps
  const share = {};
  for (const sid of STAGES) {
    const ls = plans[sid].units.filter((u) => u.kind === 'lesson' && u.lesson.tier !== 'boot');
    share[sid] = ls.length === 0 ? 0 : plans[sid].columns.read[1] / ls.length;
  }
  const cum = new Map();
  let acc = 0;
  for (const u of p.units) {
    if (u.kind === 'lesson' && u.lesson.tier !== 'boot') acc += share[u.stage];
    cum.set(u.id, acc);
  }
  let prevT = 0;
  let prevE = { id: 'the start of the path', unit: null };
  const withReading = [];
  for (const e of events) {
    const t = e.hi + (cum.get(e.unit) ?? 0);
    withReading.push({ from: prevE, to: e, gap: t - prevT });
    prevT = t;
    prevE = e;
  }
  const over = withReading.filter((g) => g.gap > limit).sort((a, b) => b.gap - a.gap);
  if (over.length > 0) {
    const reading = STAGES.reduce((a, s) => a + plans[s].columns.read[1], 0);
    add('note', 'cadence', `reading (up to ${h1(reading)} h over the ten stages) is placed on no unit; spread evenly over each stage's lessons it would put ${plural(over.length, 'gap')} past ${C.max_gap_weeks} weeks, the longest ${h2(over[0].gap)} h between ${name(over[0].from)} and ${name(over[0].to)}`, { scope: p.id });
  }
  return {
    events,
    top: hiGaps.slice(0, 5),
    second,
    // what the records do to the cadence: how many there are, and the longest gap without them
    records: { count: records.length, needed: dependent, without: bare && { gap: bare.gap, gapLo: bare.to.lo - bare.from.lo, from: bare.from, to: bare.to } },
    summary: `${events.length} events (${events.filter((e) => e.kind === 'specimen').length} specimens, ${claims.length} claims, ${records.length} planned records${records.length > 0 ? ' that no claim template covers' : ''}); claim number ${C.min_claims} at ${second ? `${h2(second.hi)} h = ${weeks(second.hi)} weeks` : 'none'} (limit week ${C.claims_by_week}); longest gap ${h2(worst.gap)} h = ${weeks(worst.gap)} weeks, ${name(worst.from)} to ${name(worst.to)} (limit ${C.max_gap_weeks} weeks = ${h2(limit)} h, margin ${h2(limit - worst.gap)} h; at the low estimate ${h2(loGaps[0].gap)} h)${dependent ? '; the cadence holds only with the planned records, see the warning below' : ''}`,
  };
}

// ---------------------------------------------------------------- the cut list (spine 14)

/** Each KC's hard requirements, from the KC table of spine section 4 (an edge marked "(soft)" needs no order). */
function hardRequires(sm) {
  const t = sm.table('4', (h) => h[0] === 'ID' && h.includes('Requires'));
  const out = new Map();
  if (!t) return out;
  const c = t.header.indexOf('Requires');
  for (const r of t.rows) out.set(r.cells[0], [...String(r.cells[c] ?? '').matchAll(/(KC-[0-9]+\.[a-z0-9]+(?:-[a-z0-9]+)*)( \(soft\))?/g)].filter((m) => !m[2]).map((m) => m[1]));
  return out;
}

const NUMBER_WORDS = { twenty: 20, 'twenty-one': 21, 'twenty-two': 22, nineteen: 19, thirty: 30 };

/** The section 14 cut list against its eligibility rule (1)-(5), and what cutting does to the lower bound. */
function checkCutList(budget, sm, plans, bounds, P, just, paths, add) {
  const where = `${SPINE_PATH} section 14`;
  const fail = (message, extra = {}) => add('fail', 'cutlist', message, { where, ...extra });
  const table = sm.table('14', (h) => h[0] === '#' && h[1] === 'Bridge');
  if (!table) {
    fail('spine section 14 has no cut list table headed #, Bridge, ...');
    return null;
  }
  const rows = table.rows.map((r) => ({ n: Number(r.cells[0]), bridge: r.cells[1], cell: r.cells[2], line: r.line }));
  const listed = rows.map((r) => r.bridge);
  const bridges = [...sm.lessons.values()].filter((l) => l.tier === 'bridge');
  const text14 = sm.textLines('14').map((b) => b.text).join(' ');
  // rule data from the spine's own tables
  const seamT = sm.table('5.3', (h) => h[0] === 'ID' && h[1] === 'Assumption');
  const eroT = sm.table('5.4', (h) => h[0] === 'ID' && h[1] === 'Seam');
  const outT = sm.table('2.2', (h) => h[0].startsWith('Outcome'));
  const col = (t, pred) => (t ? t.header.findIndex(pred) : -1);
  const planting = new Map();
  const cashing = new Map();
  if (!seamT || col(seamT, (h) => h.startsWith('Planted')) < 0) fail('spine section 5.3 has no "Planted" column');
  else for (const r of seamT.rows) for (const id of ids(r.cells[col(seamT, (h) => h.startsWith('Planted'))], LESSON_ID)) planting.set(id, r.cells[0]);
  if (!eroT || col(eroT, (h) => h.startsWith('Endpoint 2')) < 0) fail('spine section 5.4 has no "Endpoint 2" column');
  else for (const r of eroT.rows) for (const id of ids(r.cells[col(eroT, (h) => h.startsWith('Endpoint 2'))], LESSON_ID)) cashing.set(id, r.cells[0]);
  const core = new Set();
  if (!outT || col(outT, (h) => h === 'Core KCs') < 0) fail('spine section 2.2 has no "Core KCs" column');
  else for (const r of outT.rows) for (const id of ids(r.cells[col(outT, (h) => h === 'Core KCs')], KC_ID)) core.add(id);
  const sole = budget.cut_list.sole_lessons;
  const reasons = (l) => {
    const why = [];
    const thr = (l.kcs ?? []).filter((k) => sm.kcs.get(k)?.threshold);
    if (thr.length) why.push(`(1) it carries the threshold KC ${thr[0]}`);
    if (planting.has(l.id)) why.push(`(2) it plants ${planting.get(l.id)}`);
    if (cashing.has(l.id)) why.push(`(2) it cashes ${cashing.get(l.id)}`);
    const oc = (l.kcs ?? []).filter((k) => core.has(k));
    if (oc.length) why.push(`(3) it carries the outcome-core KC ${oc[0]}`);
    if (Object.hasOwn(sole, l.id)) why.push(`(4) ${sole[l.id]}`);
    return why;
  };
  const eligible = bridges.filter((l) => reasons(l).length === 0).map((l) => l.id);
  for (const id of Object.keys(sole)) {
    if (sm.lessons.get(id)?.tier !== 'bridge') fail(`cut_list.sole_lessons names ${id}, which is no bridge`);
    else if (!text14.includes(id)) fail(`cut_list.sole_lessons names ${id}, which spine section 14 no longer mentions`);
  }
  // the list itself
  rows.forEach((r, i) => {
    if (r.n !== i + 1) fail(`cut list row ${i + 1} is numbered ${r.n}`, { where: `${SPINE_PATH}:${r.line}` });
    const l = sm.lessons.get(r.bridge);
    if (!l || l.tier !== 'bridge') fail(`cut list row ${r.n}: ${r.bridge} is not a bridge lesson`, { where: `${SPINE_PATH}:${r.line}` });
    else for (const why of reasons(l)) fail(`cut list row ${r.n}: ${r.bridge} is not cut-eligible: ${why}`, { where: `${SPINE_PATH}:${r.line}` });
    if (listed.indexOf(r.bridge) !== i) fail(`cut list row ${r.n}: ${r.bridge} is listed twice`, { where: `${SPINE_PATH}:${r.line}` });
  });
  const spare = /(S[0-9]+\.L[0-9]+) \(its KC to (S[0-9]+\.L[0-9]+)\) is the one spare/.exec(text14);
  const qualify = /([A-Za-z]+(?:-[a-z]+)?) bridges qualify/.exec(text14);
  const fold = /fold exactly ([a-z]+(?:-[a-z]+)?) into reading cards/.exec(text14);
  const beyond = [...text14.matchAll(/bridge lessons beyond ([0-9]+)/g)];
  const word = (m) => (m ? NUMBER_WORDS[m[1].toLowerCase()] : undefined);
  if (word(qualify) === undefined) fail('spine section 14 no longer says how many bridges qualify');
  else if (word(qualify) !== eligible.length) fail(`spine section 14 says ${word(qualify)} bridges qualify, the rule gives ${eligible.length}: ${eligible.join(', ')}`);
  if (word(fold) === undefined) fail('spine section 14 no longer says how many bridges the list folds');
  else if (word(fold) !== listed.length) fail(`spine section 14 says the list folds ${word(fold)} bridges, it lists ${listed.length}`);
  if (!spare) fail('spine section 14 no longer names the one spare bridge');
  else {
    if (!eligible.includes(spare[1])) fail(`the spare bridge ${spare[1]} is not cut-eligible`);
    const extra = eligible.filter((id) => !listed.includes(id));
    if (extra.length !== 1 || extra[0] !== spare[1]) fail(`the eligible bridges that the list leaves out are ${extra.join(', ') || 'none'}, not only the spare ${spare[1]}`);
  }
  if (beyond.length === 0) fail('spine section 14 no longer says how many bridges stay');
  for (const m of beyond) if (bridges.length - listed.length !== Number(m[1])) fail(`cutting the ${listed.length} listed bridges leaves ${bridges.length - listed.length} of ${bridges.length}, not the ${m[1]} the spine says`);
  // (5): every receiving lesson exists, is in the same stage and is not itself cut (or its fallback is not)
  const cut = new Set(listed);
  for (const r of rows) {
    const rec = ids(r.cell, LESSON_ID)[0];
    const fb = /\((S[0-9]+\.L[0-9]+) once (S[0-9]+\.L[0-9]+) is cut\)/.exec(r.cell);
    const at = { where: `${SPINE_PATH}:${r.line}` };
    const rl = sm.lessons.get(rec);
    if (!rl) {
      fail(`cut list row ${r.n}: the receiving lesson ${rec ?? '(none named)'} is no lesson`, at);
      continue;
    }
    if (rl.stage !== stageOfLesson(r.bridge)) fail(`cut list row ${r.n}: ${rec} is in ${rl.stage}, not in the stage of ${r.bridge}`, at);
    if (rl.tier === 'step' || rl.tier === 'boot') fail(`cut list row ${r.n}: ${rec} is a [${rl.tier}] unit, not a lesson that can take a KC`, at);
    if (cut.has(rec)) {
      const to = fb && fb[2] === rec ? fb[1] : null;
      if (!to) fail(`cut list row ${r.n}: its receiving lesson ${rec} is itself cut (row ${rows.find((x) => x.bridge === rec).n}) and no fallback is named`, at);
      else if (cut.has(to) || !sm.lessons.has(to)) fail(`cut list row ${r.n}: its fallback ${to} is cut or is no lesson`, at);
    }
    for (const kc of ids(r.cell, KC_ID)) if (!(rl.kcs ?? []).includes(kc)) fail(`cut list row ${r.n}: ${rec} is said to teach ${kc}, which its lesson row does not list`, at);
  }
  // (6) on each published path, a KC that folds into its receiving lesson must not come before a hard prerequisite
  const reqs = hardRequires(sm);
  const recvOf = new Map();
  for (const r of rows) {
    const rec = ids(r.cell, LESSON_ID)[0];
    const fb = /\((S[0-9]+\.L[0-9]+) once (S[0-9]+\.L[0-9]+) is cut\)/.exec(r.cell);
    recvOf.set(r.bridge, cut.has(rec) && fb && fb[2] === rec ? fb[1] : rec);
  }
  const accepted = new Map();
  for (const a of budget.cut_list.accepted ?? []) {
    const it = sm.decisions.get(a?.item);
    if (!isObj(a) || !recvOf.has(a.bridge) || typeof a.path !== 'string') fail(`cut_list.accepted needs a listed bridge, a path and a section 12 item: ${JSON.stringify(a)}`);
    else if (!it || !new RegExp(`\\b${a.bridge.replace('.', '\\.')}\\b`).test(it.text) || !new RegExp(a.path, 'i').test(it.text)) fail(`section 12 item ${a.item} names no ${a.bridge} and no ${a.path} path, so it accepts nothing for ${a.bridge}`, { where: it ? `${SPINE_PATH}:${it.line}` : where });
    else accepted.set(`${a.bridge}|${a.path}`, a.item);
  }
  let orderWarnings = 0;
  for (const p of paths) {
    const pos = new Map(p.units.filter((u) => u.kind === 'lesson').map((u, i) => [u.id, i]));
    const before = new Map();
    const after = new Map();
    const firstBy = new Map();
    for (const [id, i] of pos) {
      for (const kc of sm.lessons.get(id).kcs ?? []) {
        const j = pos.get(recvOf.get(id) ?? id) ?? i;
        if (!before.has(kc) || i < before.get(kc)) before.set(kc, i);
        if (!after.has(kc) || j < after.get(kc)) {
          after.set(kc, j);
          firstBy.set(kc, id);
        }
      }
    }
    const at = (kc) => [...pos].find(([, i]) => i === after.get(kc))?.[0];
    for (const [kc, qs] of reqs) {
      for (const q of qs) {
        if (!after.has(kc) || !after.has(q) || after.get(q) <= after.get(kc) || before.get(q) > before.get(kc)) continue;
        const moved = [kc, q].map((k) => firstBy.get(k)).find((id) => recvOf.has(id));
        const row = rows.find((x) => x.bridge === moved);
        const text = `cut list row ${row?.n ?? '?'}: folding ${moved} into ${recvOf.get(moved) ?? moved} puts ${kc} at ${at(kc)} before its hard prerequisite ${q} is taught (at ${at(q)}) on the ${p.id} path`;
        const item = accepted.get(`${moved}|${p.id}`);
        if (item !== undefined) add('note', 'cutlist', `${text}; section 12 item ${item} accepts it`, { scope: p.id, where: `${SPINE_PATH}:${row?.line}` });
        else {
          orderWarnings++;
          add('warn', 'cutlist', text, { scope: p.id, where: `${SPINE_PATH}:${row?.line}` });
        }
      }
    }
  }
  // what cutting does to each stage's bounds, one row after another
  const lessonUnit = (id) => plans[stageOfLesson(id)]?.units.find((u) => u.id === id);
  const cumulative = new Map(STAGES.map((s) => [s, { lo: 0, hi: 0 }]));
  const lowCross = new Map();
  let highTrips = 0;
  const tripped = new Set();
  const lineOf = (sid) => (bounds[sid] && bounds[sid].lower !== null ? Math.round(bounds[sid].lower * P.roadmap.lower_bound_factor) : null);
  const lowToday = STAGES.filter((sid) => lineOf(sid) !== null && plans[sid].total[0] < lineOf(sid));
  for (const r of rows) {
    const u = lessonUnit(r.bridge);
    if (!u) continue;
    const c = cumulative.get(u.stage);
    c.lo += u.lo;
    c.hi += u.hi;
    const line = lineOf(u.stage);
    if (line === null) continue;
    const hi = plans[u.stage].total[1] - c.hi;
    const lo = plans[u.stage].total[0] - c.lo;
    // a stage that is already under its line warns under `lower`; a cut warns once, where it first takes a stage under
    if (hi < line && plans[u.stage].total[1] >= line && !tripped.has(u.stage)) {
      tripped.add(u.stage);
      highTrips++;
      if (just.byStage.has(u.stage)) just.used.add(u.stage);
      else add('warn', 'cutlist', `cutting rows 1 to ${r.n} (${r.bridge}) takes ${u.stage}'s high estimate to ${h2(hi)} h, below half of its roadmap lower bound (${h2(line)} h); a section 12 justification must come first`, { stage: u.stage, where: `${SPINE_PATH}:${r.line}` });
    }
    if (lo < line && !lowCross.has(u.stage) && !lowToday.includes(u.stage)) lowCross.set(u.stage, r.n);
  }
  const lowNote = [];
  if (lowToday.length) lowNote.push(`${lowToday.join(', ')} already ${lowToday.length === 1 ? 'has' : 'have'} a low estimate below that line`);
  if (lowCross.size) lowNote.push(`cutting the list would take the low estimate of ${[...lowCross.keys()].join(', ')} below it`);
  if (lowNote.length) add('note', 'cutlist', `lower bound: the rule is on the high estimate (spine 3.0 and 11.2), which no cut moves below its line. Read on the low estimate, ${lowNote.join(', and ')}`, { where: SPINE_PATH });
  return { eligible, listed, spare: spare?.[1] ?? null, highTrips, orderWarnings, summary: `${listed.length} listed bridges, all cut-eligible under criteria (1) to (4); the rule gives ${eligible.length} eligible bridges, the ${listed.length} listed and the spare ${spare?.[1] ?? '?'}; ${bridges.length - listed.length} bridges stay; every receiving lesson stays in its stage and is not cut; no cut takes a high estimate below its lower-bound line${orderWarnings ? `; ${plural(orderWarnings, 'KC')} would fold ahead of a hard prerequisite on a path` : '; no KC folds ahead of a hard prerequisite on either path'}` };
}

// ---------------------------------------------------------------- additions (V2-09)

/** Each addition names what it displaces, and the displacement is real. */
function checkAdditions(budget, sm, plans, bounds, paths, add) {
  const p = paths[0];
  const stageHi = (sid) => {
    let hi = plans[sid].columns.read[1];
    for (const b of p.blocks) if (b.stage === sid) for (const u of b.units) hi += u.hi;
    return hi;
  };
  let adopted = 0;
  let waiting = 0;
  for (const a of budget.additions) {
    const where = `${BUDGET_PATH} additions ${a?.id ?? '?'}`;
    const fail = (message) => add('fail', 'additions', message, { stage: a?.stage, where });
    if (!isObj(a) || typeof a.id !== 'string' || !STAGES.includes(a.stage) || !['adopted', 'waiting'].includes(a.status)) {
      fail(`an addition needs an id, a stage of S1 to S10 and a status of adopted or waiting: ${JSON.stringify(a)}`);
      continue;
    }
    if (a.status === 'adopted') {
      adopted++;
      const e = sm.lessons.get(a.id) ?? sm.labStages.get(a.id);
      const home = e ? (e.stage ?? `S${/^LAB-([0-9]+)/.exec(e.id)?.[1]}`) : null;
      if (!e) fail(`${a.id} is no lesson and no lab stage`);
      else if (home !== a.stage) fail(`${a.id} is an addition to ${a.stage}, and it belongs to ${home}`);
      else if (e.stretch) fail(`${a.id} is a [stretch] stage, which the rows do not hold, so it is not an adopted addition`);
      if (a.displaces === null || a.displaces === undefined || a.displaces === '') {
        fail(`the addition ${a.id} names no displacement: say what it displaces, or "headroom" when ${a.stage} still fits its roadmap bound`);
        continue;
      }
      if (a.displaces === 'headroom') {
        const bd = bounds[a.stage];
        if (bd && stageHi(a.stage) > bd.upper) fail(`${a.id} is paid from ${a.stage}'s headroom, and ${a.stage} is over its roadmap bound (${h2(stageHi(a.stage))} h of ${h2(bd.upper)} h)`);
      } else if (typeof a.displaces !== 'string') fail(`displaces of ${a.id} must be a sentence or "headroom"`);
      for (const id of a.displaces_ids ?? []) {
        const lab = sm.labStages.get(id);
        const drawer = sm.drawers.get(id);
        if (!lab && !drawer) fail(`${a.id} says it displaces ${id}, which is no lab stage and no drawer`);
        else if (lab && !lab.stretch) fail(`${a.id} says it displaces ${id}, which is still a planned stage (not [stretch]), so nothing moved out of the rows`);
      }
    } else {
      waiting++;
      if (!(Array.isArray(a.adds_h) && a.adds_h.length === 2 && a.adds_h.every(Number.isFinite))) {
        fail(`the waiting addition ${a.id} needs adds_h as [low, high] hours`);
        continue;
      }
      const bd = bounds[a.stage];
      const room = bd ? bd.upper - stageHi(a.stage) : null;
      if (room !== null) {
        const need = hu(a.adds_h[1]);
        if (need > room) add('note', 'additions', `${a.id} would add ${a.adds_h[0]}–${a.adds_h[1]} h to ${a.stage}, which has ${h2(room)} h of room under its roadmap bound: it needs a named displacement before it enters the rows`, { stage: a.stage, where });
        else add('note', 'additions', `${a.id} would add ${a.adds_h[0]}–${a.adds_h[1]} h to ${a.stage}, which has ${h2(room)} h of room; V2-09 still asks it to name a displacement`, { stage: a.stage, where });
      }
      if (a.displaces) fail(`${a.id} is marked waiting but names a displacement; mark it adopted once it enters the rows`);
    }
  }
  return { adopted, waiting };
}

// ---------------------------------------------------------------- the check

/**
 * @param {{ spine: string, budgetText: string, files?: Record<string, string> }} input
 * @returns {{ findings: object[], summaries: Record<string, string>, stages: object[], paths: object[], stats: object }}
 */
export function checkBudget(input) {
  let budget;
  try {
    budget = parseYaml(input.budgetText);
  } catch (e) {
    const result = { findings: [], summaries: {}, stages: [], paths: [], stats: {} };
    result.findings.push({ severity: 'fail', check: 'budget', message: `${BUDGET_PATH} does not parse: ${e.message}`, where: BUDGET_PATH });
    return result;
  }
  return checkParsed(input.spine, budget, input.files ?? {});
}

/** The check on a parsed budget file (tests change the parsed value; the gate parses the file). */
export function checkParsed(spine, budget, files = {}) {
  const findings = [];
  const add = (severity, check, message, extra = {}) => findings.push({ severity, check, message, ...extra });
  const result = { findings, summaries: {}, stages: [], paths: [], stats: {}, perWeek6: 0 };
  const summaries = result.summaries;

  /** An exception inside one check is a finding of the gate (a table of the spine may have changed shape), not a crash. */
  const safely = (what, fn) => {
    try {
      return fn();
    } catch (e) {
      add('fail', 'internal', `${what} could not run: ${e.message}; a table of the spine or the budget file has an unexpected shape`, { where: SPINE_PATH });
      return undefined;
    }
  };
  const sm = readSpine(spine);
  for (const p of sm.problems) add('fail', 'spine', `a table of the spine no longer matches W0-T03's extraction rules${p.line === null ? '' : ` (line ${p.line})`}: ${p.message}; run scripts/verify-links.mjs`, { where: SPINE_PATH });
  const shape = shapeProblems(budget);
  for (const m of shape) add('fail', 'budget', m, { where: BUDGET_PATH });
  if (shape.length > 0) return result;
  const P = budget.parameters;
  const perWeek = { 6: hu(P.stage_work_h.h6), 10: hu(P.stage_work_h.h10) };
  result.perWeek6 = perWeek[6];
  result.stats = { lessons: sm.lessons.size, labStages: sm.labStages.size, kcs: sm.kcs.size, specimens: sm.specimens.length };

  // the sentences that the budget file quotes still stand
  const docs = { [SPINE_PATH]: sm.normText };
  for (const [path, text] of Object.entries(files)) docs[path] = norm(text);
  let quoted = 0;
  for (const q of collectQuotes(budget, 'budget', [])) {
    const doc = docs[q.file];
    const shown = `"${norm(q.quote).slice(0, 80)}${norm(q.quote).length > 80 ? '...' : ''}"`;
    if (doc === undefined) add('fail', 'table', `${q.path} quotes ${q.file}, which could not be read`, { where: BUDGET_PATH });
    else if (!doc.includes(norm(q.quote))) add('fail', 'table', `${q.path} quotes ${shown}, which ${q.file} no longer says`, { where: BUDGET_PATH });
    else quoted++;
  }

  // the section 3.11 table equals the budget file, cell by cell
  const tbl = sm.table('3.11', (h) => h[0] === 'Stage' && h[1] === 'Read');
  const spineRows = new Map();
  if (!tbl) add('fail', 'table', 'spine section 3.11 has no table headed Stage, Read, ...', { where: SPINE_PATH });
  else {
    for (const r of tbl.rows) spineRows.set(stripBold(r.cells[0]), r);
    const colOf = (k) => tbl.header.indexOf(HEADER_OF[k]);
    for (const k of Object.keys(HEADER_OF)) if (colOf(k) < 0) add('fail', 'table', `the section 3.11 table has no "${HEADER_OF[k]}" column`, { where: SPINE_PATH });
    const cell = (r, k) => stripBold(r.cells[colOf(k)] ?? '');
    for (const sid of STAGES) {
      const r = spineRows.get(sid);
      if (!r) {
        add('fail', 'table', `the section 3.11 table has no row for ${sid}`, { stage: sid, where: SPINE_PATH });
        continue;
      }
      for (const k of Object.keys(HEADER_OF)) {
        if (colOf(k) >= 0 && cell(r, k) !== norm(budget.stages[sid].rows[k])) add('fail', 'table', `${sid} ${k}: the spine prints "${cell(r, k)}", ${BUDGET_PATH} has "${budget.stages[sid].rows[k]}"`, { stage: sid, where: `${SPINE_PATH}:${r.line}` });
      }
    }
    const tr = spineRows.get('Total');
    if (!tr) add('fail', 'table', 'the section 3.11 table has no Total row', { where: SPINE_PATH });
    else for (const k of CELLS) if (colOf(k) >= 0 && cell(tr, k) !== norm(budget.totals[k])) add('fail', 'table', `Total ${k}: the spine prints "${cell(tr, k)}", ${BUDGET_PATH} has "${budget.totals[k]}"`, { where: `${SPINE_PATH}:${tr.line}` });
  }
  summaries.table = `every cell of the section 3.11 table equals ${BUDGET_PATH}; ${plural(quoted, 'quoted sentence')} of the budget file still stand`;

  // printed cells, parsed
  const printed = {};
  const printedTotals = {};
  let parsed = true;
  for (const sid of STAGES) {
    printed[sid] = {};
    for (const k of CELLS) {
      const rg = parseRange(budget.stages[sid].rows[k]);
      if (rg) printed[sid][k] = rg;
      else {
        add('fail', 'rows', `${sid} ${k}: "${budget.stages[sid].rows[k]}" is not a range of decimals`, { stage: sid, where: BUDGET_PATH });
        parsed = false;
      }
    }
  }
  for (const k of CELLS) {
    const rg = parseRange(budget.totals[k]);
    if (rg) printedTotals[k] = rg;
    else {
      add('fail', 'rows', `Total ${k}: "${budget.totals[k]}" is not a range of decimals`, { where: BUDGET_PATH });
      parsed = false;
    }
  }
  if (!parsed) return result;

  // every stage recomputed from the lesson and lab tables
  const plans = {};
  for (const sid of STAGES) plans[sid] = planStage(sid, budget.stages[sid], printed[sid], sm, P, add);
  let figures = 0;
  const at = (sid) => ({ stage: sid, where: `${SPINE_PATH} section 3.11` });
  for (const sid of STAGES) {
    const pl = plans[sid];
    for (const c of ['lessons', 'build', 'write']) {
      for (const [i, end] of ['low', 'high'].entries()) {
        const pc = printed[sid][c][i];
        const got = fmtUnits(pl.columns[c][i], pc.d);
        figures++;
        if (got !== pc.s) add('fail', 'rows', `${sid} ${c}, ${end}: the table prints ${pc.s} h, the lesson and lab tables give ${got} h (${h2(pl.columns[c][i])} h exactly)`, at(sid));
      }
    }
    for (const [i, end] of ['low', 'high'].entries()) {
      const pc = printed[sid].total[i];
      figures++;
      if (Math.abs(pc.u - pl.total[i]) >= UH / 10) add('fail', 'rows', `${sid} total, ${end}: the table prints ${pc.s} h, the rows give ${h2(pl.total[i])} h (more than a printed tenth apart)`, at(sid));
      for (const n of [6, 10]) {
        const wc = printed[sid][`weeks_${n}`][i];
        const want = roundDiv(pc.u * 10, perWeek[n]);
        figures++;
        if (Number(wc.s.replace('.', '')) !== want) add('fail', 'rows', `${sid} weeks at ${n} h/week, ${end}: the table prints ${wc.s}, the printed total ${pc.s} h over ${P.stage_work_h[`h${n}`]} h a week gives ${(want / 10).toFixed(1)}`, at(sid));
      }
    }
  }
  // the totals row: each hours column is the rounded sum of the printed rows, and the columns cross-foot (PLAN.md spine issue 2)
  const atTotal = { where: `${SPINE_PATH} section 3.11` };
  for (const c of [...COLUMNS, 'total']) {
    for (const [i, end] of ['low', 'high'].entries()) {
      const sum = STAGES.reduce((a, s) => a + printed[s][c][i].u, 0);
      const pc = printedTotals[c][i];
      figures++;
      if (fmtUnits(sum, pc.d) !== pc.s) add('fail', 'rows', `Total ${c}, ${end}: the table prints ${pc.s} h, but its ten rows add to ${h2(sum)} h (${fmtUnits(sum, pc.d)} h)`, atTotal);
    }
  }
  for (const [i, end] of ['low', 'high'].entries()) {
    const across = COLUMNS.reduce((a, c) => a + printedTotals[c][i].u, 0);
    const pc = printedTotals.total[i];
    figures++;
    if (across !== pc.u) add('fail', 'rows', `Total, ${end}: its five column totals add to ${h1(across)} h, but the table prints ${pc.s} h for the total (the table's rounding issue, PLAN.md spine issue 2)`, atTotal);
    for (const n of [6, 10]) {
      const wc = printedTotals[`weeks_${n}`][i];
      const want = roundDiv(pc.u * 10, perWeek[n]);
      figures++;
      if (Number(wc.s.replace('.', '')) !== want) add('fail', 'rows', `Total weeks at ${n} h/week, ${end}: the table prints ${wc.s}, the printed total ${pc.s} h gives ${(want / 10).toFixed(1)}`, atTotal);
    }
  }
  // the sentences of section 3.11 that summarize the table
  const bounds = parseBounds(budget, P, perWeek, add);
  safely('the check of the section 3.11 sentences', () => checkProse(sm, plans, printedTotals, bounds, P, perWeek, add));
  summaries.rows = `${figures} figures recomputed: lessons, build and write from the lesson and lab tables (each at its printed precision), stage totals within a printed tenth, the ten rows summed per column, the five column totals against the total, and the weeks`;
  result.stages = STAGES.map((sid) => ({ stage: sid, title: budget.stages[sid].title ?? '', plan: plans[sid], printed: printed[sid] }));

  // at most one new tool per stage, as the spine's stage paragraphs say
  let withTool = 0;
  for (const sid of STAGES) {
    const tools = budget.stages[sid].new_tools;
    const para = sm.paragraphs.get(sid);
    const where = `${SPINE_PATH}${para ? `:${para.line}` : ''}`;
    if (tools.length > 1) add('fail', 'tools', `${sid} introduces ${tools.length} new tools (${tools.join(', ')}); the plan allows one per stage`, { stage: sid, where: BUDGET_PATH });
    if (para && /^New tool\b/.test(para.text)) {
      withTool++;
      if (tools.length !== 1) add('fail', 'tools', `the spine gives ${sid} a new tool, ${BUDGET_PATH} lists ${tools.length}`, { stage: sid, where });
      else if (!norm(para.text).toLowerCase().includes(tools[0].toLowerCase())) add('fail', 'tools', `${sid}'s new tool is ${tools[0]} in ${BUDGET_PATH}, and the spine's paragraph does not name it`, { stage: sid, where });
    } else if (tools.length > 0) add('fail', 'tools', `the spine gives ${sid} no new tool, ${BUDGET_PATH} lists ${tools.join(', ')}`, { stage: sid, where });
  }
  summaries.tools = `at most one new tool per stage, and the spine's stage paragraphs agree: ${plural(withTool, 'stage')} introduce one`;

  // the published paths
  const paths = Object.entries(budget.paths).map(([pid, def]) => resolvePath(pid, def, plans, add));
  result.paths = paths;
  safely('the check of the paths against the spine', () => checkPathsAgainstSpine(budget, paths, sm, add));
  summaries.paths = `${plural(paths.length, 'published path')}: each takes every unit of every stage once, and their lessons are the paths that spine section 3.0 prints`;

  // bounds, Keep load and cadence on each path
  const just = readJustifications(budget, sm, add);
  for (const p of paths) {
    p.bounds = safely(`the bounds check on ${p.id}`, () => checkBounds(p, plans, bounds, P, just, add));
    p.keep = safely(`the Keep-load check on ${p.id}`, () => checkKeep(p, sm, P, add));
    p.cadence = safely(`the claim-cadence check on ${p.id}`, () => checkCadence(p, budget, sm, plans, P, perWeek, add));
  }
  result.cutList = safely('the cut-list check', () => checkCutList(budget, sm, plans, bounds, P, just, paths, add));
  for (const [sid, j] of just.byStage) if (!just.used.has(sid)) add('note', 'lower', `section 12 item ${j.item} justifies a lower-bound warning for ${sid}, which no longer warns`, { stage: sid, where: BUDGET_PATH });
  result.additions = safely('the additions check', () => checkAdditions(budget, sm, plans, bounds, paths, add)) ?? { adopted: 0, waiting: 0 };
  summaries.cutlist = result.cutList?.summary ?? '';
  summaries.additions = `${plural(result.additions.adopted, 'adopted addition')} name what they displace (stretch stages, drawers or headroom); ${result.additions.waiting} waiting for a named displacement`;

  // the verdict that the spine prints for each stage
  for (const sid of STAGES) {
    const mine = findings.filter((x) => x.stage === sid && x.check !== 'table');
    const verdict = mine.some((x) => x.severity === 'fail') ? 'fail' : mine.some((x) => x.severity === 'warn') ? 'warn' : 'pass';
    plans[sid].verdict = verdict;
    const r = spineRows.get(sid);
    const said = r && tbl ? stripBold(r.cells[tbl.header.indexOf(HEADER_OF.gate)] ?? '') : null;
    // a warning is not a failure: the table's "pass" stands for a stage that only warns
    if (said !== null && said !== verdict && !(said === 'pass' && verdict === 'warn')) add('fail', 'table', `the spine's section 3.11 says ${sid} is "${said}" under GATE-budget, and the gate says "${verdict}"`, { stage: sid, where: `${SPINE_PATH}:${r.line}` });
  }
  return result;
}

// ---------------------------------------------------------------- the report

/** The lines of the report; `verbose` adds the stage table and each path's tables. */
export function formatReport(result, { verbose = false } = {}) {
  const lines = [];
  const S = result.stats;
  const bad = (check, scope) => result.findings.filter((f) => f.check === check && (scope === '*' || (f.scope ?? null) === (scope ?? null)) && f.severity !== 'note');
  const stagePrefix = (f) => (f.stage && !f.message.startsWith(f.stage) ? `${f.stage}: ` : '');
  const line = (f) => `${f.severity === 'fail' ? 'FAIL' : 'WARN'}  ${f.check}  ${stagePrefix(f)}${f.message}${f.where ? `  [${f.where}]` : ''}`;
  lines.push(`GATE-budget: ${S.lessons ?? 0} lessons, ${S.labStages ?? 0} lab stages, ${S.kcs ?? 0} KCs and ${S.specimens ?? 0} specimens read from the spine, against ${BUDGET_PATH}`);
  const shown = new Set();
  const emit = (check, scope, summary, pad = '') => {
    const fs = bad(check, scope);
    shown.add(`${check}|${scope === '*' ? '' : (scope ?? '')}`);
    if (scope === '*') for (const f of result.findings) shown.add(`${f.check}|${f.scope ?? ''}`);
    // a warning is not a failure: the check keeps its summary line and the warnings follow it
    if (!fs.some((f) => f.severity === 'fail')) lines.push(`${pad}OK    ${check.padEnd(9)} ${summary}`);
    for (const f of fs) lines.push(pad + line(f));
    for (const n of result.findings.filter((x) => x.severity === 'note' && x.check === check && (scope === '*' || (x.scope ?? null) === (scope ?? null)))) lines.push(`${pad}NOTE  ${n.check.padEnd(9)} ${stagePrefix(n)}${n.message}`);
  };
  const global = ['spine', 'budget', 'internal'];
  for (const c of global) for (const f of bad(c, null)) lines.push(line(f));
  for (const c of ['table', 'rows', 'tools']) if (result.summaries[c] !== undefined) emit(c, null, result.summaries[c]);
  if (result.summaries.paths !== undefined) emit('paths', '*', result.summaries.paths);
  if (result.stages.length > 0 && result.stages.every((x) => x.plan.verdict !== undefined)) {
    const ok = result.stages.filter((x) => x.plan.verdict !== 'fail');
    lines.push(`${ok.length === result.stages.length ? 'OK  ' : 'FAIL'}  stages    ${ok.length} of ${result.stages.length} stages pass: ${result.stages.map((x) => `${x.stage} ${x.plan.verdict}`).join(', ')}`);
  }
  for (const p of result.paths) {
    const reading = result.stages.reduce((a, s) => a + s.plan.columns.read[1], 0);
    lines.push(`PATH  ${p.id} (${p.label}): ${plural(p.blocks.length, 'block')}, ${h1(p.totalLo)}–${h1(p.totalHi)} h of sequenced work (reading, up to ${h1(reading)} h, is placed on no unit)`);
    emit('upper', p.id, p.bounds?.upper ?? 'not run', '  ');
    emit('lower', p.id, p.bounds?.lower ?? 'not run', '  ');
    emit('keep', p.id, p.keep?.summary ?? 'not run', '  ');
    emit('cadence', p.id, p.cadence?.summary ?? 'not run', '  ');
  }
  if (result.summaries.cutlist !== undefined) emit('cutlist', '*', result.summaries.cutlist);
  if (result.summaries.additions !== undefined) emit('additions', null, result.summaries.additions);
  // anything not shown above (a finding of a check or scope that has no line of its own)
  for (const f of result.findings) {
    if (f.severity === 'note') continue;
    if (!shown.has(`${f.check}|${f.scope ?? ''}`) && !global.includes(f.check)) lines.push(line(f));
  }
  for (const f of result.findings) {
    if (f.severity !== 'note' || shown.has(`${f.check}|${f.scope ?? ''}`)) continue;
    lines.push(`NOTE  ${f.check.padEnd(9)} ${stagePrefix(f)}${f.message}`);
  }
  if (verbose) lines.push(...verboseLines(result));
  const fails = result.findings.filter((f) => f.severity === 'fail').length;
  const warns = result.findings.filter((f) => f.severity === 'warn').length;
  const notes = result.findings.filter((f) => f.severity === 'note').length;
  lines.push(fails === 0 ? `GATE-budget: green${warns ? ` (${plural(warns, 'warning')})` : ''}${notes ? `, ${plural(notes, 'note')}` : ''}` : `GATE-budget: FAIL (${plural(fails, 'finding')}${warns ? `, ${plural(warns, 'warning')}` : ''})`);
  return lines;
}

function verboseLines(result) {
  const out = [''];
  const rg = (x) => `${h2(x[0])}–${h2(x[1])}`;
  const table = (header, rows) => {
    const width = header.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
    const fmt = (r) => r.map((c, i) => String(c).padEnd(width[i])).join('  ').trimEnd();
    return [fmt(header), ...rows.map(fmt)];
  };
  out.push(...table(['stage', 'read', 'lessons', 'build', 'write', 'defence', 'total (exact)', 'printed', 'verdict'], result.stages.map((s) => {
    const c = s.plan.columns;
    return [`${s.stage} ${s.title}`.trim(), rg(c.read), rg(c.lessons), rg(c.build), rg(c.write), rg(c.defence), rg(s.plan.total), `${s.printed.total[0].s}–${s.printed.total[1].s}`, s.plan.verdict ?? ''];
  })));
  for (const p of result.paths) {
    if (p.keep) {
      out.push('', `${p.id}: Keep load by block, min/week (reviews of the KCs first taught in the block; the Keep items that run in it)`);
      const f = (r, w) => `${r.at[w].lo.toFixed(1)}–${r.at[w].hi.toFixed(1)} of ${r.at[w].planned[0]}–${r.at[w].planned[1]}`;
      out.push(...table(['block', 'KCs', 'reviews', 'Lean idle', 'Clearinghouse', '6 h/week', '10 h/week'], p.keep.rows.map((r) => [r.block, r.kcs, r.demand.toFixed(1), r.leanIdle, r.clearinghouse, f(r, 6), f(r, 10)])));
    }
    if (p.cadence) {
      out.push('', `${p.id}: the five longest gaps between claims and specimens, at the high estimate`);
      out.push(...table(['hours', 'weeks', 'between'], p.cadence.top.map((g) => [h2(g.gap), weeksOf(g.gap, result.perWeek6), `${g.from.id}${g.from.unit ? ` (${g.from.unit})` : ''} and ${g.to.id} (${g.to.unit})`])));
      const rec = p.cadence.records;
      if (rec.count > 0 && rec.without) {
        const w = rec.without;
        out.push(`without the ${plural(rec.count, 'planned record')}, the longest gap is ${h2(w.gap)} h (${h2(w.gapLo)} h at the low estimate), ${w.from.id}${w.from.unit ? ` (${w.from.unit})` : ''} and ${w.to.id} (${w.to.unit})${rec.needed ? ': past the limit, so the cadence holds only with the records' : ''}`);
      }
    }
  }
  return out;
}

/** The figures as JSON-ready data (hours, not units). */
function jsonOf(result) {
  const hours = (u) => Number((u / UH).toFixed(4));
  return {
    ok: result.findings.every((f) => f.severity !== 'fail'),
    findings: result.findings,
    stats: result.stats,
    stages: result.stages.map((s) => ({
      stage: s.stage,
      verdict: s.plan.verdict,
      columns: Object.fromEntries(Object.entries(s.plan.columns).map(([k, v]) => [k, v.map(hours)])),
      total: s.plan.total.map(hours),
      printedTotal: s.printed.total.map((x) => x.s),
    })),
    paths: result.paths.map((p) => ({
      id: p.id,
      label: p.label,
      blocks: p.blocks.map((b) => ({ id: b.id, stage: b.stage, units: b.units.length })),
      totalHours: [hours(p.totalLo), hours(p.totalHi)],
      bounds: p.bounds?.rows.map((r) => ({ stage: r.stage, hours: [hours(r.lo), hours(r.hi)], upper: r.upper === null ? null : hours(r.upper), lowerLine: r.line === null ? null : hours(r.line) })),
      keep: p.keep?.rows,
      cadence: p.cadence && {
        events: p.cadence.events.length,
        secondClaimHours: p.cadence.second ? hours(p.cadence.second.hi) : null,
        longestGaps: p.cadence.top.map((g) => ({ hours: hours(g.gap), from: g.from.id, to: g.to.id })),
        // the planned records that no claim template covers, and the longest gap when they are not counted
        plannedRecords: {
          count: p.cadence.records.count,
          holdsOnlyWithThem: p.cadence.records.needed,
          longestGapWithoutThem: p.cadence.records.without && { hours: hours(p.cadence.records.without.gap), lowEstimateHours: hours(p.cadence.records.without.gapLo), from: p.cadence.records.without.from.id, to: p.cadence.records.without.to.id },
        },
      },
    })),
    cutList: result.cutList && { eligible: result.cutList.eligible, listed: result.cutList.listed, spare: result.cutList.spare },
    additions: result.additions,
  };
}

// ---------------------------------------------------------------- the command line

function readOrNull(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

/** Read the spine, the budget file and the files that its quotes cite, under a root. */
export function loadInputs(root) {
  const spine = readOrNull(join(root, SPINE_PATH));
  if (spine === null) return { missing: SPINE_PATH };
  const budgetText = readOrNull(join(root, BUDGET_PATH));
  if (budgetText === null) return { missing: BUDGET_PATH };
  const files = {};
  try {
    for (const path of citedFiles(parseYaml(budgetText))) {
      if (path === SPINE_PATH) continue;
      const text = readOrNull(join(root, path));
      if (text !== null) files[path] = text;
    }
  } catch {
    // an unparseable budget file is reported by the check
  }
  return { spine, budgetText, files };
}

/**
 * @param {string[]} argv
 * @param {{ out?: (s: string) => void, err?: (s: string) => void }} [io]
 * @returns {number} the exit code
 */
export function main(argv, io = {}) {
  const out = io.out ?? ((s) => process.stdout.write(`${s}\n`));
  const err = io.err ?? ((s) => process.stderr.write(`${s}\n`));
  const usage = 'usage: node scripts/verify-budget.mjs [--verbose] [--json] [--strict] [--root dir]';
  let root = defaultRoot;
  let json = false;
  let verbose = false;
  let strict = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      out(usage);
      return 0;
    } else if (a === '--json') json = true;
    else if (a === '--verbose' || a === '-v') verbose = true;
    else if (a === '--strict') strict = true;
    else if (a === '--root') root = resolve(argv[++i] ?? '');
    else {
      err(`${usage}\nunknown argument: ${a}`);
      return 2;
    }
  }
  const inputs = loadInputs(root);
  if ('missing' in inputs) {
    err(`GATE-budget: cannot read ${inputs.missing} under ${root}`);
    return 2;
  }
  const result = checkBudget(inputs);
  const unreadable = result.findings.some((f) => f.check === 'budget' && /does not parse/.test(f.message));
  if (json) out(JSON.stringify(jsonOf(result), null, 2));
  else for (const l of formatReport(result, { verbose })) out(l);
  if (unreadable) return 2;
  const failed = result.findings.some((f) => f.severity === 'fail' || (strict && f.severity === 'warn'));
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // a reader that closes the pipe early (`| head`) is not an error
  process.stdout.on('error', (e) => {
    if (e.code !== 'EPIPE') throw e;
  });
  process.exitCode = main(process.argv.slice(2));
}
