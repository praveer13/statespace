// GATE-audit-blind's machinery (W1-T40): the two published paths, which anchors are served where on them, the
// reference session composer and scorer, the blind strategies, the permutation nulls, the verdicts and the bound.
//
// Sources: spine sections 3.0 (the paths), 6 (Pool and Scoring) and 11.2 (GATE-audit-blind); docs/AUDIT-DESK.md
// sections 5.1-5.3 (surfaces, the seeded sound share, drawing cases), 6.1-6.6 (scoring, Part C) and 7 (the gate);
// docs/ASSESSMENT.md sections 3.7 and 7.3. Decisions this file takes are marked [D] and listed in ../README.md.
//
// Everything here is deterministic: every draw comes from @statespace/rng with a seed derived from the gate's fixed
// configuration seed and a label, so one commit gets one verdict (AUDIT-DESK 7.1).

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_EVIDENCE, LINE_ANCHORED, REPO, readRecordText } from './pool.mjs';

const rng = await import(pathToFileURL(join(REPO, 'packages', 'rng', 'src', 'index.ts')).href);
export const { createDraw, deriveSeed } = rng;

/**
 * The gate's configuration [D]. Seeds are fixed here, so each commit gets one deterministic verdict (AUDIT-DESK 7.1).
 * A stream is one surface on one path; the gate draws `replicates` independent streams of each and estimates a
 * strategy's advantage as the mean over them, which takes the simulation's own noise out of the verdict, and it
 * splits the 1,000 permutations per strategy and figure (AUDIT-DESK 7.4) evenly across the replicates.
 */
export const CONFIG = Object.freeze({
  seed: 0x5ea7b11d,
  permutations: 1000,
  replicates: 8,
  margin: 2, // fail when the advantage exceeds chance + 2 SD (spine section 6)
  // How much noisier than the null the replicate mean may be under a real cue, for the detection threshold the bound
  // prints [D]: the largest inflation calibrate.mjs measured under a planted position cue and a planted topic cue,
  // rounded up for the estimate's own noise (../README.md section 7.5 [X RUN-audit-blind-gate], whose check
  // bound-approximation-holds fails if a measured inflation exceeds this).
  detectInflation: 1.3,
  desk: { sizes: [5, 6, 8], sessionsPerSize: 8 },
  today: { blocksPerPosition: 12, serves: 10 },
  partC: { drawsPerPosition: 60, size: 4 },
  clearinghouse: { blocks: 60, serves: 10 },
});

export const SURFACES = ['desk', 'today', 'part-c', 'clearinghouse'];

// ------------------------------------------------------------------ the published paths

const RANGE = /^(S[0-9]+\.L|LAB-[0-9]+\.)([0-9]+)\s*[–-]\s*(S[0-9]+\.L|LAB-[0-9]+\.)([0-9]+)$/;

/** The units of one stage: its lessons, its lab's stages and its Defence. */
function stageUnits(stage, registry) {
  const n = stage.slice(1);
  const out = [];
  for (const e of registry.byId.values()) if (e.kind === 'lesson' && e.stage === stage) out.push(e.id);
  for (const e of registry.labStages.get(`LAB-${n}`) ?? []) out.push(e.id);
  out.push(`DEFENCE:${stage}`);
  return out;
}

/** Expand a block's `take` list: ranges (S5.L1–S5.L8, LAB-5.1–LAB-5.6), single IDs, DEFENCE and NOTE. */
function expandTake(stage, take, registry) {
  const out = [];
  for (const item of take) {
    if (item === 'DEFENCE') out.push(`DEFENCE:${stage}`);
    else if (item === 'NOTE') continue;
    else {
      const m = RANGE.exec(item);
      if (m && m[1] === m[3]) for (let i = Number(m[2]); i <= Number(m[4]); i++) out.push(`${m[1]}${i}`);
      else out.push(item);
    }
  }
  return out.filter((u) => u.startsWith('DEFENCE:') || registry.byId.has(u));
}

/**
 * The two published paths of spine section 3.0, read from content/stages/budget.yaml (GATE-budget keeps that file
 * equal to the spine): each block with the stage it belongs to, the units it completes and whether it holds a
 * stage's Defence. Returns [{ id, label, blocks: [{ id, stage, units: string[], defence: boolean }] }].
 */
export async function loadPaths(root, registry) {
  const text = readFileSync(join(root, 'content', 'stages', 'budget.yaml'), 'utf8');
  const read = await readRecordText(text, 'budget.yaml');
  if (read.error) throw new Error(`content/stages/budget.yaml: ${read.error}`);
  const paths = read.value?.paths;
  if (!paths || typeof paths !== 'object') throw new Error('content/stages/budget.yaml has no paths');
  const out = [];
  for (const [id, p] of Object.entries(paths)) {
    const taken = new Set();
    const blocks = [];
    for (const b of p.blocks ?? []) {
      const stage = typeof b === 'string' ? b : b.stage;
      const bid = typeof b === 'string' ? b : b.id;
      const all = stageUnits(stage, registry);
      let units;
      if (typeof b === 'string' || b.take === undefined) units = all;
      else if (b.take === 'rest') units = all.filter((u) => !taken.has(u));
      else units = expandTake(stage, b.take, registry);
      for (const u of units) taken.add(u);
      blocks.push({ id: bid, stage, units, defence: units.includes(`DEFENCE:${stage}`) });
    }
    out.push({ id, label: p.label ?? id, blocks });
  }
  return out;
}

/** Whether a scheduled-after unit is complete: a lesson or lab stage done, or every non-stretch stage of a lab done. */
function unitDone(u, done, registry) {
  if (registry.kind(u) === 'lab') return (registry.labStages.get(u) ?? []).filter((s) => !s.stretch).every((s) => done.has(s.id));
  return done.has(u);
}

/**
 * The positions of a path at which the Desk serves cases: after each block, the cases whose anchors' scheduled-after
 * units are all done (AUDIT-DESK 5.1: a case is scheduled after the lab that teaches its class), the topic stage
 * (the stage of the block just completed, AUDIT-DESK 7.2) and the stages completed so far, in order.
 */
export function positionsOf(path, cases, registry) {
  const done = new Set();
  const stagesDone = [];
  const out = [];
  path.blocks.forEach((b, bi) => {
    for (const u of b.units) done.add(u);
    if (!stagesDone.includes(b.stage)) stagesDone.push(b.stage);
    const eligible = [];
    cases.forEach((c, i) => {
      if (c.scheduledAfter.every((u) => unitDone(u, done, registry))) eligible.push(i);
    });
    if (eligible.length === 0) return;
    out.push({ block: b.id, index: bi, topic: b.stage, stagesDone: [...stagesDone], eligible, defenceStage: b.defence ? b.stage : null });
  });
  return out;
}

// ------------------------------------------------------------------ the reference composer (AUDIT-DESK 5.2-5.3)

/** The integers in [ceil(0.30 n), floor(0.60 n)] (AUDIT-DESK 5.2), in integer arithmetic. */
export const soundRange = (n) => [Math.floor((3 * n + 9) / 10), Math.floor((6 * n) / 10)];

/**
 * Compose one sitting from the eligible cases. Returns the served cases' indices in order, or null when the pool
 * cannot fill it under the rules.
 *
 *   desk     n cases; k sound, drawn uniformly from soundRange(n); the slots shuffled; then a family (anchor) per
 *            slot, uniformly among those that can supply the slot's truth, and a case of that truth within it [D:
 *            uniform, as the simulation has no review schedule]. Once two stages with cases are done, at most half
 *            the session comes from the topic stage and at least one case from an earlier one. The two members of
 *            a pair never share a sitting.
 *   part-c   the same with n = 4 and k drawn from {1, 2} (the declared exception); the caller passes the cases of
 *            the Defence's stage only.
 *   today, clearinghouse
 *            one block of serves: p = 0.30 + 0.30 u for the block, each serve sound with probability p, drawn
 *            independently [D: p in thousandths]; a family uniformly among those with a case of that truth.
 */
export function referenceCompose({ surface, cases, topic, size, seed }) {
  const draw = createDraw(seed);
  const families = new Map();
  cases.forEach((c, i) => {
    if (!families.has(c.anchor)) families.set(c.anchor, { stage: c.stage, members: [] });
    families.get(c.anchor).members.push(i);
  });
  const fams = [...families.values()];
  if (surface === 'today' || surface === 'clearinghouse') {
    const permille = draw.int(300, 599); // p = 0.30 + 0.30 u with u in [0, 1), in thousandths
    const out = [];
    const served = new Set();
    for (let s = 0; s < size; s++) {
      const truth = draw.below(1000) < permille ? 'sound' : 'flawed';
      const options = fams.filter((f) => f.members.some((i) => cases[i].truth === truth));
      if (options.length === 0) return null;
      const f = draw.pick(options);
      // Prefer a case this block has not served yet (AUDIT-DESK 5.3, item 4: unseen first).
      const all = f.members.filter((i) => cases[i].truth === truth);
      const fresh = all.filter((i) => !served.has(i));
      const i = draw.pick(fresh.length > 0 ? fresh : all);
      served.add(i);
      out.push(i);
    }
    return out;
  }
  const n = size;
  const [lo, hi] = surface === 'part-c' ? [1, 2] : soundRange(n);
  const k = draw.int(lo, hi);
  const slots = draw.shuffle([...Array(k).fill('sound'), ...Array(n - k).fill('flawed')]);
  const stagesWithCases = new Set(cases.map((c) => c.stage));
  const capped = surface === 'desk' && stagesWithCases.size >= 2 && stagesWithCases.has(topic);
  const cap = Math.floor(n / 2);
  const usedPairs = new Set();
  let current = 0;
  let earlier = 0;
  const out = [];
  for (let j = 0; j < n; j++) {
    const truth = slots[j];
    const usable = (f) => f.members.filter((i) => cases[i].truth === truth && !usedPairs.has(cases[i].pair));
    let options = fams.filter((f) => usable(f).length > 0);
    if (capped) {
      options = options.filter((f) => f.stage !== topic || current < cap);
      if (j === n - 1 && earlier === 0) options = options.filter((f) => f.stage !== topic);
    }
    if (options.length === 0) return null;
    const f = draw.pick(options);
    const i = draw.pick(usable(f));
    usedPairs.add(cases[i].pair);
    if (cases[i].stage === topic) current++;
    else earlier++;
    out.push(i);
  }
  return out;
}

/**
 * Check a composer's sitting against the rules every composer keeps, so that a composer the gate did not write
 * cannot pass by breaking them: the served cases exist and are eligible, none twice, the size asked, the seeded
 * sound share (AUDIT-DESK 5.2) and pairs apart (5.3). Returns problem strings.
 */
export function sittingProblems({ surface, cases, size }, served) {
  const out = [];
  if (!Array.isArray(served) || served.some((i) => !Number.isInteger(i) || i < 0 || i >= cases.length)) return ['served a case that is not among the eligible ones'];
  if (served.length !== size) out.push(`served ${served.length} cases where ${size} were asked`);
  if (surface === 'desk' || surface === 'part-c') {
    if (new Set(served).size !== served.length) out.push('served one case twice in one sitting');
    const k = served.filter((i) => cases[i].truth === 'sound').length;
    const [lo, hi] = surface === 'part-c' ? [1, 2] : soundRange(size);
    if (k < lo || k > hi) out.push(`a ${size}-case ${surface} sitting held ${k} sound cases; the share rule allows ${lo}-${hi} (AUDIT-DESK 5.2)`);
    if (new Set(served.map((i) => cases[i].pair)).size !== served.length) out.push('the two members of a pair shared a sitting (AUDIT-DESK 5.3, pairs apart)');
  }
  return out;
}

// ------------------------------------------------------------------ the pool, as arrays

/**
 * The cases as typed arrays for the scorer, plus the base rates a blind strategy may know: the most frequent class,
 * each stage's most frequent class and whether each stage is majority-sound. Classes are the registry's top-level
 * classes G1-G13 (scoring counts classes, AUDIT-DESK 2.3).
 *
 * A strategy knows the base rates of the cases its stream serves from, and no others (spine section 6: chance is
 * what a strategy that knows only those base rates scores) [D]: `base.path`, over the pool's cases (those not
 * scheduled after CLEARINGHOUSE), for the Desk, Today and Part C streams; `base.clearinghouse`, over the cases the
 * incident blocks serve (`incidents`, case indices), for the Clearinghouse stream. So the world's incidents, however
 * many replicates bring them, never move a path stream's verdicts, and the pool never moves the world's.
 */
export function poolArrays(cases, classes, { incidents = null } = {}) {
  const n = cases.length;
  const ci = new Map(classes.map((c, i) => [c, i]));
  const stages = [...new Set(cases.map((c) => c.stage))].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  const si = new Map(stages.map((s, i) => [s, i]));
  const truth = new Uint8Array(n);
  const top = new Int8Array(n).fill(-1);
  const acc = new Int32Array(n);
  const stage = new Int16Array(n);
  const ownLineAnchored = new Uint8Array(n);
  const selectable = new Int32Array(n);
  const loadBearing = new Int32Array(n);
  const diffLines = new Int32Array(n);
  cases.forEach((c, i) => {
    truth[i] = c.truth === 'flawed' ? 1 : 0;
    if (c.truth === 'flawed') {
      top[i] = ci.get(c.top) ?? -1;
      for (const a of c.acceptableTop) if (ci.has(a)) acc[i] |= 1 << ci.get(a);
      ownLineAnchored[i] = LINE_ANCHORED.has(c.evType) ? 1 : 0;
    }
    stage[i] = si.get(c.stage);
    selectable[i] = c.selectable;
    loadBearing[i] = c.loadBearing;
    diffLines[i] = c.diffLines;
  });
  /** The base rates over the cases at `idx`: the most frequent class (ties to the lower class), per stage too. */
  const ratesOver = (idx) => {
    const most = (pred) => {
      const m = new Map();
      for (const i of idx) if (pred(i)) m.set(top[i], (m.get(top[i]) ?? 0) + 1);
      let best = -1;
      let bestN = 0;
      for (const [k, v] of [...m.entries()].sort((a, b) => a[0] - b[0])) if (v > bestN) [best, bestN] = [k, v];
      return best;
    };
    return {
      cases: idx.length,
      poolTop: most((i) => truth[i] === 1),
      stageTop: stages.map((_, s) => most((i) => truth[i] === 1 && stage[i] === s)),
      stageMajoritySound: stages.map((_, s) => {
        let inStage = 0;
        let sound = 0;
        for (const i of idx) {
          if (stage[i] !== s) continue;
          inStage++;
          if (truth[i] === 0) sound++;
        }
        return sound * 2 > inStage;
      }),
    };
  };
  const poolIdx = [];
  cases.forEach((c, i) => {
    if (!c.scheduledAfter.includes('CLEARINGHOUSE')) poolIdx.push(i);
  });
  const servedIdx = incidents ? [...new Set(incidents)].filter((i) => Number.isInteger(i) && i >= 0 && i < n).sort((a, b) => a - b) : [];
  const base = { path: ratesOver(poolIdx) };
  base.clearinghouse = servedIdx.length > 0 ? ratesOver(servedIdx) : base.path;
  const defaultLineAnchored = new Uint8Array(classes.length);
  classes.forEach((c, i) => {
    defaultLineAnchored[i] = LINE_ANCHORED.has(DEFAULT_EVIDENCE[c]) ? 1 : 0;
  });
  return { n, cases, classes, stages, stageIndex: si, truth, top, acc, stage, ownLineAnchored, selectable, loadBearing, diffLines, base, defaultLineAnchored };
}

/** The base rates a strategy knows on a stream: the world's incidents on the Clearinghouse's, the pool's elsewhere. */
export const baseRatesFor = (P, surface) => (surface === 'clearinghouse' ? P.base.clearinghouse : P.base.path);

// ------------------------------------------------------------------ streams

/**
 * Draw one stream: every sitting of one surface on one path, composed at each position. Each slot records the case
 * served, its sitting (with the sitting's topic) and position, whether the blind line choice hits a load-bearing line
 * and whether its diff is longer than the sitting's median.
 *
 * The blind line choice [D]: a strategy that flags a case selects up to three of its selectable lines at random
 * (AUDIT-DESK 7.2). That draw is made once per served slot, seeded by the slot, so it stays with the case when the
 * permutation moves the picks: what a permutation moves is the strategy's decision and named class.
 *
 * A composer the gate did not write is held to its contract (../README.md section 5), so that no part of the path goes
 * unchecked while the gate reports green. It returns null only when no sitting keeps the rules: for each null the
 * reference composer is asked for the same sitting (the same eligible cases, size, topic and seed), and a sitting it
 * composes, keeping every rule sittingProblems checks, shows the sitting could be filled, so the null is `declined`
 * and only a sitting the reference cannot fill either is `skipped`. And the stream records the anchor families
 * offered in the sittings the composer filled (`offered`) and those it served (`servedFamilies`): a family it was
 * offered and never served goes unchecked on that surface.
 */
export function drawStream({ label, surface, positions, cases, P, compose, cfg, seed }) {
  const caseIdx = [];
  const sittingOf = [];
  const posOf = [];
  const sittings = [];
  const problems = [];
  const skipped = [];
  const checked = compose !== referenceCompose;
  const declined = [];
  let asked = 0;
  const offered = new Set();
  const servedFamilies = new Set();
  const add = (served, pos, sitting) => {
    const start = caseIdx.length;
    served.forEach((ci, j) => {
      caseIdx.push(ci);
      sittingOf.push(sittings.length);
      posOf.push(j);
    });
    sittings.push({ start, length: served.length, topic: pos.topic, stagesDone: pos.stagesDone, position: pos.block, sitting });
  };
  const run = (pos, eligible, size, tag) => {
    asked++;
    const s = deriveSeed(seed, `${label}|${tag}`);
    const argsOf = () => ({ surface, cases: eligible.map((i) => cases[i]), topic: pos.topic, stagesDone: [...pos.stagesDone], size, seed: s });
    const args = argsOf();
    let served;
    try {
      served = compose(args);
    } catch (e) {
      problems.push(`${label} after ${pos.block}: the composer threw: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    if (served === null || served === undefined) {
      if (checked) {
        const ref = argsOf();
        const filled = referenceCompose(ref);
        if (filled && sittingProblems(ref, filled).length === 0) {
          declined.push(`${pos.block} (size ${size})`);
          return;
        }
      }
      skipped.push(`${surface} after ${pos.block} (size ${size})`);
      return;
    }
    const bad = sittingProblems({ surface, cases: args.cases, size }, served);
    if (bad.length > 0) {
      problems.push(...bad.map((b) => `${label} after ${pos.block}: ${b}`));
      return;
    }
    for (const i of eligible) offered.add(cases[i].anchor);
    for (const j of served) servedFamilies.add(cases[eligible[j]].anchor);
    add(served.map((j) => eligible[j]), pos, tag);
  };
  positions.forEach((pos, pi) => {
    if (surface === 'desk') {
      for (const size of cfg.desk.sizes) for (let s = 0; s < cfg.desk.sessionsPerSize; s++) run(pos, pos.eligible, size, `p${pi}|n${size}|${s}`);
    } else if (surface === 'today') {
      for (let s = 0; s < cfg.today.blocksPerPosition; s++) run(pos, pos.eligible, cfg.today.serves, `p${pi}|b${s}`);
    } else if (surface === 'part-c') {
      if (!pos.defenceStage) return;
      const own = pos.eligible.filter((i) => cases[i].stage === pos.defenceStage);
      if (own.length === 0) return;
      for (let s = 0; s < cfg.partC.drawsPerPosition; s++) run(pos, own, cfg.partC.size, `p${pi}|c${s}`);
    }
  });
  return Object.assign(finishStream({ label, surface, caseIdx, sittingOf, posOf, sittings, P, seed, problems, skipped }), { checked, asked, declined, offered, servedFamilies });
}

/** A stream of pre-composed blocks (the Clearinghouse's incidents, whose world composes them). */
export function streamOfBlocks({ label, blocks, P, seed }) {
  const caseIdx = [];
  const sittingOf = [];
  const posOf = [];
  const sittings = [];
  blocks.forEach((b, bi) => {
    const start = caseIdx.length;
    b.forEach((ci, j) => {
      caseIdx.push(ci);
      sittingOf.push(bi);
      posOf.push(j);
    });
    sittings.push({ start, length: b.length, topic: null, stagesDone: [], position: `block ${bi}`, sitting: bi });
  });
  return finishStream({ label, surface: 'clearinghouse', caseIdx, sittingOf, posOf, sittings, P, seed, problems: [], skipped: [] });
}

function finishStream({ label, surface, caseIdx, sittingOf, posOf, sittings, P, seed, problems, skipped }) {
  const n = caseIdx.length;
  const s = {
    label,
    surface,
    n,
    caseIdx: Int32Array.from(caseIdx),
    sitting: Int32Array.from(sittingOf),
    pos: Int32Array.from(posOf),
    last: new Uint8Array(n),
    hit: new Uint8Array(n),
    aboveMedian: new Uint8Array(n),
    sittings,
    problems,
    skipped,
  };
  for (const st of sittings) {
    s.last[st.start + st.length - 1] = 1;
    const sizes = [];
    for (let i = st.start; i < st.start + st.length; i++) sizes.push(P.diffLines[s.caseIdx[i]]);
    const sorted = sizes.slice().sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    for (let i = st.start; i < st.start + st.length; i++) s.aboveMedian[i] = P.diffLines[s.caseIdx[i]] > median ? 1 : 0;
  }
  for (let i = 0; i < n; i++) {
    const c = s.caseIdx[i];
    if (P.truth[c] === 0) continue;
    const L = P.selectable[c];
    const B = Math.min(P.loadBearing[c], L);
    if (L === 0 || B === 0) continue;
    const d = createDraw(deriveSeed(seed, `hit|${label}|${i}`));
    const picked = d.sample([...Array(L).keys()], Math.min(3, L));
    s.hit[i] = picked.some((x) => x < B) ? 1 : 0;
  }
  // Stage groups, for the within-stage permutation of class figures.
  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const g = P.stage[s.caseIdx[i]];
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(i);
  }
  s.stageGroups = [...groups.values()].map((g) => Int32Array.from(g));
  return s;
}

// ------------------------------------------------------------------ strategies (AUDIT-DESK 7.2)

/**
 * The blind strategies. Each sees only what a learner who never reads a case could know: the surface, the slot's
 * position in its sitting, the sitting's topic, the case's stage and diff size, and the pool's base rates. A pick
 * is a decision (flag or accept) and, for a flag, the class named. A flag names the pool's most frequent class
 * unless the strategy's rule names another [D: AUDIT-DESK 7.2 gives that rule for always-reject only].
 *
 *   blocking (spine section 6): always-reject, always-accept, last-is-sound, topic-is-class
 *   advisory (proposed [D] in AUDIT-DESK 7.2; blocking under --strict): fill-the-floor (Part C only),
 *   stage-majority, longest-diff-is-flawed. Their rules decide flag or accept, and the class they name is only the
 *   default, so they are tested on decision figures only [D]: on class figures a diff size that tells one anchor
 *   family from another would read as a cue their rule does not claim.
 */
export const STRATEGIES = [
  { id: 'always-reject', blocking: true },
  { id: 'always-accept', blocking: true },
  { id: 'last-is-sound', blocking: true },
  { id: 'topic-is-class', blocking: true },
  { id: 'fill-the-floor', blocking: false, surfaces: ['part-c'], figures: 'decision' },
  { id: 'stage-majority', blocking: false, figures: 'decision' },
  { id: 'longest-diff-is-flawed', blocking: false, figures: 'decision' },
];

/**
 * The class a topic-is-class strategy names for a sitting, by the base rates `B` its stream knows: the topic stage's
 * most frequent class, else the latest completed stage's that has one, else the most frequent class overall.
 */
function topicClass(P, B, sitting) {
  const own = sitting.topic === null ? -1 : P.stageIndex.has(sitting.topic) ? B.stageTop[P.stageIndex.get(sitting.topic)] : -1;
  if (own >= 0) return own;
  for (let j = sitting.stagesDone.length - 1; j >= 0; j--) {
    const s = sitting.stagesDone[j];
    if (P.stageIndex.has(s) && B.stageTop[P.stageIndex.get(s)] >= 0) return B.stageTop[P.stageIndex.get(s)];
  }
  return B.poolTop;
}

/**
 * The picks of one strategy over one stream: dec[i] = 1 for a flag, named[i] the class index named (or -1). The
 * strategy knows the base rates of the cases its stream serves from (baseRatesFor).
 */
export function picksOf(strategy, S, P) {
  const B = baseRatesFor(P, S.surface);
  const dec = new Uint8Array(S.n);
  const named = new Int8Array(S.n).fill(-1);
  const flag = (i, k) => {
    dec[i] = 1;
    named[i] = k;
  };
  for (let i = 0; i < S.n; i++) {
    const c = S.caseIdx[i];
    switch (strategy) {
      case 'always-reject':
        flag(i, B.poolTop);
        break;
      case 'always-accept':
        break;
      case 'last-is-sound':
      case 'fill-the-floor':
        if (!S.last[i]) flag(i, B.poolTop);
        break;
      case 'topic-is-class':
        flag(i, topicClass(P, B, S.sittings[S.sitting[i]]));
        break;
      case 'stage-majority':
        if (!B.stageMajoritySound[P.stage[c]]) flag(i, B.poolTop);
        break;
      case 'longest-diff-is-flawed':
        if (S.aboveMedian[i]) flag(i, B.poolTop);
        break;
      case 'stage-only':
        flag(i, B.stageTop[P.stage[c]]);
        break;
      default:
        throw new Error(`unknown strategy ${strategy}`);
    }
  }
  return { dec, named };
}

// ------------------------------------------------------------------ the reference scorer (AUDIT-DESK 6.1-6.6; ASSESSMENT 3.7)

/**
 * The figures the Desk shows, by id, with the null each is tested against (AUDIT-DESK 7.3-7.4): decision figures
 * against a permutation of the picks across the stream, class figures against a permutation within each stage.
 *
 *   tpr             flawed cases found (any class named) / flawed cases     AUDIT-DESK 6.2, decision only
 *   tnr             sound cases accepted / sound cases
 *   ba              (tpr + tnr) / 2                                          AUDIT-DESK 6.2
 *   precision:none  sound cases among accepted / accepted (shown at n >= 10)
 *   part-c-pass     Part C draws with at least 3 hits of 4 / draws          AUDIT-DESK 6.6 (within-stage null [D])
 *   tpr-correct     flawed cases with an acceptable class and valid evidence / flawed cases ("found, with the
 *                   right class and evidence", 5.5; ASSESSMENT 3.7's TP)
 *   ba-correct      (tpr-correct + tnr) / 2                                 ASSESSMENT 3.7's balanced accuracy
 *   recall:Gk       correct findings on cases of primary class k / those cases (shown at n >= 10)
 *   precision:Gk    correct findings naming k / findings naming k (shown at n >= 10)
 *   recall-macro    the mean of the recalls shown
 */
export function figureLayout(classes) {
  const ids = ['tpr', 'tnr', 'ba', 'precision:none', 'part-c-pass', 'tpr-correct', 'ba-correct', 'recall-macro'];
  // The Part C pass rate is tested against the within-stage null [D]: a Part C hit needs the right class and valid
  // evidence (AUDIT-DESK 6.6), every draw comes from one stage, and under the full permutation that 7.4 assigns it
  // topic-is-class, which in a Part C draw names the Defence stage's own class, gains from the stage alone, the effect
  // 7.4 keeps out of class figures; calibrate.mjs measures that gain on the valid fixture pool, and it grows with the
  // streams' length (scripts/spikes/W1-T40/README.md section 10, item 5 [X RUN-audit-blind-gate]).
  const kinds = ['decision', 'decision', 'decision', 'decision', 'class', 'class', 'class', 'class'];
  for (const c of classes) {
    ids.push(`recall:${c}`);
    kinds.push('class');
  }
  for (const c of classes) {
    ids.push(`precision:${c}`);
    kinds.push('class');
  }
  return { ids, kinds, recall0: 8, precision0: 8 + classes.length };
}

const DISPLAY_N = 10; // per-class figures appear only once n >= 10 (spine section 6)

/**
 * Score one set of picks on a stream: fills `out` (figure values) and `shown` (1 where the Desk would show the
 * figure). `which` limits the work to 'decision' or 'class' figures, or 'all'. Counts are integers until the final
 * division, so identical picks always give identical values.
 */
export function referenceScore(S, P, dec, named, out, shown, which = 'all') {
  const K = P.classes.length;
  let F = 0;
  let Sd = 0;
  let found = 0;
  let accepted = 0;
  let acceptedAll = 0;
  let correct = 0;
  const nK = new Int32Array(K);
  const correctK = new Int32Array(K);
  const namedK = new Int32Array(K);
  const correctNamedK = new Int32Array(K);
  const doClass = which !== 'decision';
  for (let i = 0; i < S.n; i++) {
    const c = S.caseIdx[i];
    const d = dec[i];
    if (P.truth[c] === 1) {
      F++;
      if (d) found++;
      if (doClass) nK[P.top[c]]++;
    } else {
      Sd++;
      if (!d) accepted++;
    }
    if (!d) acceptedAll++;
    if (doClass && d) {
      const k = named[i];
      if (k >= 0) {
        namedK[k]++;
        if (P.truth[c] === 1 && (P.acc[c] >> k) & 1 && S.hit[i] && (k === P.top[c] ? P.ownLineAnchored[c] : P.defaultLineAnchored[k])) {
          correct++;
          correctK[P.top[c]]++;
          correctNamedK[k]++;
        }
      }
    }
  }
  const tpr = F > 0 ? found / F : 0;
  const tnr = Sd > 0 ? accepted / Sd : 0;
  out[0] = tpr;
  shown[0] = F > 0 ? 1 : 0;
  out[1] = tnr;
  shown[1] = Sd > 0 ? 1 : 0;
  out[2] = (tpr + tnr) / 2;
  shown[2] = F > 0 && Sd > 0 ? 1 : 0;
  out[3] = acceptedAll > 0 ? accepted / acceptedAll : 0;
  shown[3] = acceptedAll >= DISPLAY_N ? 1 : 0;
  if (S.surface === 'part-c') {
    let passed = 0;
    for (const st of S.sittings) {
      let hits = 0;
      for (let i = st.start; i < st.start + st.length; i++) {
        const c = S.caseIdx[i];
        if (P.truth[c] === 0) {
          if (!dec[i]) hits++;
        } else if (dec[i]) {
          const k = named[i];
          if (k >= 0 && (P.acc[c] >> k) & 1 && S.hit[i] && (k === P.top[c] ? P.ownLineAnchored[c] : P.defaultLineAnchored[k])) hits++;
        }
      }
      if (hits >= 3) passed++;
    }
    out[4] = S.sittings.length > 0 ? passed / S.sittings.length : 0;
    shown[4] = S.sittings.length > 0 ? 1 : 0;
  } else {
    out[4] = 0;
    shown[4] = 0;
  }
  if (!doClass) return;
  const tprc = F > 0 ? correct / F : 0;
  out[5] = tprc;
  shown[5] = F > 0 ? 1 : 0;
  out[6] = (tprc + tnr) / 2;
  shown[6] = F > 0 && Sd > 0 ? 1 : 0;
  let macro = 0;
  let macroN = 0;
  for (let k = 0; k < K; k++) {
    const r = 8 + k;
    const p = 8 + K + k;
    out[r] = nK[k] > 0 ? correctK[k] / nK[k] : 0;
    shown[r] = nK[k] >= DISPLAY_N ? 1 : 0;
    if (shown[r]) {
      macro += out[r];
      macroN++;
    }
    out[p] = namedK[k] > 0 ? correctNamedK[k] / namedK[k] : 0;
    shown[p] = namedK[k] >= DISPLAY_N ? 1 : 0;
  }
  out[7] = macroN > 0 ? macro / macroN : 0;
  shown[7] = macroN > 0 ? 1 : 0;
}

/**
 * The figures the Desk must show for one set of picks on a stream, by the Desk's own display rules (AUDIT-DESK 6.2,
 * 6.5 and 7.3): `tpr`, `tnr` and `ba` once the stream holds flawed and sound decisions; `part-c-pass` on a Part C
 * stream; `recall:Gk` once ten decisions of primary class Gk are counted and `precision:Gk` once Gk has been named ten
 * times (spine section 6's n >= 10); `recall-macro` once any class's recall is due or shown. The reference scorer
 * shows exactly these and more; a scorer that leaves one out would take it out of the gate's tests unseen, so the gate
 * fails on it. Returns [{ id, j, rule }], j the index in `layout` (figureLayout's ids, which every layout begins with).
 */
export function requiredFigures(S, P, dec, named, shown, layout) {
  const K = P.classes.length;
  let F = 0;
  let Sd = 0;
  const nK = new Int32Array(K);
  const namedK = new Int32Array(K);
  for (let i = 0; i < S.n; i++) {
    const c = S.caseIdx[i];
    if (P.truth[c] === 1) {
      F++;
      if (P.top[c] >= 0) nK[P.top[c]]++;
    } else Sd++;
    if (dec[i] && named[i] >= 0) namedK[named[i]]++;
  }
  const at = (id) => layout.ids.indexOf(id);
  const out = [];
  const need = (id, rule) => out.push({ id, j: at(id), rule });
  if (F > 0) need('tpr', 'on every stream with flawed decisions');
  if (Sd > 0) need('tnr', 'on every stream with sound decisions');
  if (F > 0 && Sd > 0) need('ba', 'on every stream with flawed and sound decisions');
  if (S.surface === 'part-c' && S.sittings.length > 0) need('part-c-pass', 'on every Part C stream');
  let recallShown = false;
  P.classes.forEach((k, ki) => {
    if (nK[ki] >= DISPLAY_N) need(`recall:${k}`, `once ${DISPLAY_N} decisions of primary class ${k} are counted`);
    if (nK[ki] >= DISPLAY_N || shown[at(`recall:${k}`)]) recallShown = true;
    if (namedK[ki] >= DISPLAY_N) need(`precision:${k}`, `once ${k} has been named ${DISPLAY_N} times`);
  });
  if (recallShown) need('recall-macro', "once any class's recall is shown");
  return out;
}

/**
 * A scorer the gate did not write (W1-T32's `auditFigures`), wrapped to fill the same arrays: the decisions go in as
 * plain objects, one per served slot, and the figures come back by id with their kind. The gate tests whatever
 * figures it returns; `layout` grows to hold ids the reference does not have.
 *
 * Which null a figure is tested against is the gate's call, not the module's: an id the gate's layout already has
 * keeps the layout's kind whatever kind the module gives it (so the Part C pass rate stays under the within-stage
 * null, decision 5, even when the module files it with the decision figures as AUDIT-DESK 7.4 lists it), and a new id
 * takes the module's kind. The wrapper records the kinds the module gave (`moduleKinds`), so the gate can say where
 * they differ from its own and report a figure it could form no null for.
 */
export function externalScorer(auditFigures, layout) {
  const index = new Map(layout.ids.map((id, j) => [id, j]));
  const moduleKinds = new Map();
  const score = (S, P, dec, named, out, shown, which) => {
    const decisions = new Array(S.n);
    for (let i = 0; i < S.n; i++) {
      const c = S.caseIdx[i];
      const k = named[i];
      decisions[i] = {
        case: P.cases[c].id,
        truth: P.truth[c] === 1 ? 'flawed' : 'sound',
        primary: P.truth[c] === 1 ? P.classes[P.top[c]] : null,
        acceptable: P.cases[c].acceptableTop,
        pick: dec[i] ? 'gap' : 'sound',
        named: dec[i] && k >= 0 ? P.classes[k] : null,
        evidenceValid: Boolean(dec[i] && k >= 0 && S.hit[i] && (k === P.top[c] ? P.ownLineAnchored[c] : P.defaultLineAnchored[k])),
        restatementAnswered: true,
        surface: S.surface,
        sitting: S.sitting[i],
        position: S.pos[i],
      };
    }
    const figs = auditFigures(decisions);
    if (!Array.isArray(figs)) throw new Error('auditFigures returned no list of figures');
    shown.fill(0);
    for (const f of figs) {
      if (f === null || typeof f !== 'object' || typeof f.id !== 'string') throw new Error(`auditFigures returned ${JSON.stringify(f)}, not a figure {id, kind, value, n}`);
      if (!moduleKinds.has(f.id)) moduleKinds.set(f.id, f.kind);
      let j = index.get(f.id);
      if (j === undefined) {
        layout.ids.push(f.id);
        layout.kinds.push(f.kind);
        j = layout.ids.length - 1;
        index.set(f.id, j);
      }
      // The gate's layout decides the pass a figure belongs to; see above.
      if (which !== 'all' && layout.kinds[j] !== which) continue;
      if (j >= out.length) throw new Error(`auditFigures returned ${f.id}, beyond the ${out.length} figures the gate has room for in one stream (64 more than it knows)`);
      if (f.value !== null && f.value !== undefined && Number.isFinite(f.value)) {
        out[j] = f.value;
        shown[j] = 1;
      }
    }
  };
  score.moduleKinds = moduleKinds;
  return score;
}

// ------------------------------------------------------------------ the permutation nulls and the verdicts

/** A permutation of 0..n-1 (Fisher-Yates), in place. */
function shuffleAll(idx, draw) {
  for (let i = idx.length - 1; i > 0; i--) {
    const j = draw.below(i + 1);
    const t = idx[i];
    idx[i] = idx[j];
    idx[j] = t;
  }
}

/** A permutation that moves each slot only within its stage group. */
function shuffleWithin(idx, groups, draw) {
  for (const g of groups) {
    for (let a = g.length - 1; a > 0; a--) {
      const b = draw.below(a + 1);
      const ia = g[a];
      const ib = g[b];
      const t = idx[ia];
      idx[ia] = idx[ib];
      idx[ib] = t;
    }
  }
}

/**
 * Test every strategy on one stream: its observed figures, and for each figure the mean (chance) and the variance
 * of `perms` permutations, decision figures under a permutation of the picks across the stream and class figures
 * under a permutation within each stage (AUDIT-DESK 7.4). Each pass reads only the figures of its own kind, by
 * `layout.kinds`. Returns, per strategy, Float64Arrays obs, mean, var and a Uint8Array shown, indexed like
 * `layout.ids` (which an external scorer may extend while the stream is scored).
 */
export function testStream(S, P, strategies, score, layout, perms, seed) {
  const W = layout.ids.length + 64; // room for figure ids an external scorer adds
  const res = new Map();
  const picks = new Map();
  /** Whether a strategy's picks are the same on every slot of each group: then every permutation within the groups leaves them unchanged. */
  const constantOver = (p, groups) => groups.every((g) => g.every((i) => p.dec[i] === p.dec[g[0]] && p.named[i] === p.named[g[0]]));
  const all = [Int32Array.from({ length: S.n }, (_, i) => i)];
  for (const st of strategies) {
    const p = picksOf(st, S, P);
    picks.set(st, p);
    const obs = new Float64Array(W);
    const shown = new Uint8Array(W);
    score(S, P, p.dec, p.named, obs, shown, 'all');
    // Every figure the Desk must show for these picks is shown: one left out would leave the tests unseen.
    const missing = requiredFigures(S, P, p.dec, p.named, shown, layout).filter((f) => f.j < 0 || !shown[f.j]);
    // A strategy tested on decision figures only needs no class permutations (its class figures are not read).
    const decisionOnly = STRATEGIES.find((s) => s.id === st)?.figures === 'decision';
    res.set(st, { obs, shown, missing, mean: new Float64Array(W), m2: new Float64Array(W), count: new Int32Array(W), constant: { decision: constantOver(p, all), class: decisionOnly || constantOver(p, S.stageGroups) } });
  }
  const idx = new Int32Array(S.n);
  const dec = new Uint8Array(S.n);
  const named = new Int8Array(S.n);
  const out = new Float64Array(W);
  const shown = new Uint8Array(W);
  const ofKind = (which) => {
    const js = [];
    for (let j = 0; j < Math.min(W, layout.kinds.length); j++) if (layout.kinds[j] === which) js.push(j);
    return js;
  };
  for (const [which, mix] of [
    ['decision', (d) => shuffleAll(idx, d)],
    ['class', (d) => shuffleWithin(idx, S.stageGroups, d)],
  ]) {
    // A strategy whose picks a permutation cannot change scores its observed figures under every permutation:
    // chance equals the observed figure and the SD is 0 ("constant strategies pass by construction", AUDIT-DESK 7.4).
    const js = ofKind(which);
    const moving = [];
    for (const st of strategies) {
      const r = res.get(st);
      if (!r.constant[which]) {
        moving.push(st);
        continue;
      }
      for (const j of js) {
        if (!r.shown[j]) continue;
        r.count[j] = perms;
        r.mean[j] = r.obs[j];
        r.m2[j] = 0;
      }
    }
    if (moving.length === 0) continue;
    const draw = createDraw(deriveSeed(seed, `perm|${S.label}|${which}`));
    for (let p = 0; p < perms; p++) {
      for (let i = 0; i < S.n; i++) idx[i] = i;
      mix(draw);
      for (const st of moving) {
        const pk = picks.get(st);
        for (let i = 0; i < S.n; i++) {
          dec[i] = pk.dec[idx[i]];
          named[i] = pk.named[idx[i]];
        }
        shown.fill(0);
        score(S, P, dec, named, out, shown, which);
        const r = res.get(st);
        // Welford's running mean and sum of squares, for the figures of this pass's kind only.
        for (const j of js) {
          if (!shown[j]) continue;
          r.count[j]++;
          const delta = out[j] - r.mean[j];
          r.mean[j] += delta / r.count[j];
          r.m2[j] += delta * (out[j] - r.mean[j]);
        }
      }
    }
  }
  for (const r of res.values()) {
    r.var = new Float64Array(W);
    for (let j = 0; j < W; j++) r.var[j] = r.count[j] > 1 ? r.m2[j] / (r.count[j] - 1) : 0;
  }
  return res;
}

/**
 * Run the whole simulation: on each path, each surface's replicate streams, every strategy tested on each; then the
 * Clearinghouse's incident blocks when they are given. `composerFor(surface)` returns the composer to use and
 * `score` the scorer. Returns { P, groups: [{ path, surface, streams: [summary], verdicts }], problems, skipped,
 * declined, neverServed, ... }: `declined` lists, per path and surface, the sittings a composer other than the
 * reference returned null for although the reference composer fills them, and `neverServed` the anchor families such a
 * composer was offered in the sittings it filled and never served (drawStream).
 */
export async function runBlind({ root, registry, cases, cfg = CONFIG, composerFor = () => referenceCompose, score = referenceScore, layout = null, incidentBlocks = null, onlySurfaces = null }) {
  // The Clearinghouse stream's strategies know the base rates of the incidents it serves; the paths', the pool's.
  const P = poolArrays(cases, registry.topClasses, { incidents: incidentBlocks ? incidentBlocks.flat(2) : null });
  const lay = layout ?? figureLayout(registry.topClasses);
  const paths = await loadPaths(root, registry);
  const R = Math.max(1, cfg.replicates);
  const perms = Math.max(2, Math.round(cfg.permutations / R));
  const groups = [];
  const problems = [];
  const skipped = new Set();
  const strategiesFor = (surface) => STRATEGIES.filter((s) => !s.surfaces || s.surfaces.includes(surface)).map((s) => s.id);
  const unserved = [];
  // A figure the scorer shows but no permutation pass gathered (a kind the gate has no null for, or a figure shown
  // only for the observed picks) would drop out of the verdicts unseen; the caller reports each one instead.
  const untested = new Map();
  // A figure the Desk must show (requiredFigures) that the scorer left out: reported the same way.
  const missing = new Map();
  const collectUntested = (rep, where, strategies) => {
    for (const st of strategies) {
      const r = rep.get(st);
      for (let j = 0; j < Math.min(lay.ids.length, r.shown.length); j++) {
        if (!r.shown[j] || r.count[j] > 0) continue;
        const u = untested.get(lay.ids[j]) ?? { figure: lay.ids[j], kind: lay.kinds[j], where: new Set(), strategies: new Set() };
        u.where.add(where);
        u.strategies.add(st);
        untested.set(lay.ids[j], u);
      }
      for (const f of r.missing ?? []) {
        const m = missing.get(f.id) ?? { figure: f.id, rule: f.rule, where: new Set(), strategies: new Set() };
        m.where.add(where);
        m.strategies.add(st);
        missing.set(f.id, m);
      }
    }
  };
  // A composer the gate did not write (drawStream): sittings it declined that the reference composer fills, and anchor
  // families it was offered and never served, per path and surface. Either leaves part of the path unchecked.
  const declined = [];
  const neverServed = [];
  for (const path of paths) {
    const positions = positionsOf(path, cases, registry);
    // A case that no position serves cannot be checked for cues: its scheduled-after units never complete here.
    const served = new Set(positions.flatMap((p) => p.eligible));
    const never = [...new Set(cases.filter((c, i) => !served.has(i) && !c.scheduledAfter.includes('CLEARINGHOUSE')).map((c) => c.anchor))];
    if (never.length > 0) unserved.push({ path: path.id, anchors: never });
    if (positions.length === 0) continue;
    for (const surface of ['desk', 'today', 'part-c']) {
      if (onlySurfaces && !onlySurfaces.includes(surface)) continue;
      const reps = [];
      const streams = [];
      const where = `${path.id}/${surface}`;
      const refused = [];
      let asked = 0;
      let checked = false;
      const offered = new Set();
      const servedFamilies = new Set();
      for (let r = 0; r < R; r++) {
        const label = `${path.id}/${surface}/r${r + 1}`;
        const seed = deriveSeed(cfg.seed, label);
        const S = drawStream({ label, surface, positions, cases, P, compose: composerFor(surface), cfg, seed });
        problems.push(...S.problems);
        for (const s of S.skipped) skipped.add(`${path.id}: ${s}`);
        refused.push(...S.declined);
        asked += S.asked;
        checked = S.checked;
        for (const a of S.offered) offered.add(a);
        for (const a of S.servedFamilies) servedFamilies.add(a);
        if (S.n === 0) break;
        const rep = testStream(S, P, strategiesFor(surface), score, lay, perms, seed);
        collectUntested(rep, where, strategiesFor(surface));
        reps.push(rep);
        streams.push({ label, sittings: S.sittings.length, decisions: S.n });
      }
      if (refused.length > 0) declined.push({ where, surface, declined: refused.length, asked, first: refused[0], checked: reps.length > 0 });
      if (checked) {
        const missed = [...offered].filter((a) => !servedFamilies.has(a)).sort();
        if (missed.length > 0) neverServed.push({ where, surface, anchors: missed });
      }
      if (reps.length === 0) continue;
      groups.push({ path: path.id, surface, streams, verdicts: verdicts(reps, lay, strategiesFor(surface), cfg.margin) });
    }
  }
  if (incidentBlocks) {
    const reps = [];
    const streams = [];
    for (let r = 0; r < R && r < incidentBlocks.length; r++) {
      const label = `clearinghouse/r${r + 1}`;
      const seed = deriveSeed(cfg.seed, label);
      const S = streamOfBlocks({ label, blocks: incidentBlocks[r], P, seed });
      if (S.n === 0) continue;
      const rep = testStream(S, P, strategiesFor('clearinghouse'), score, lay, perms, seed);
      collectUntested(rep, 'world/clearinghouse', strategiesFor('clearinghouse'));
      reps.push(rep);
      streams.push({ label, sittings: S.sittings.length, decisions: S.n });
    }
    if (reps.length > 0) groups.push({ path: 'world', surface: 'clearinghouse', streams, verdicts: verdicts(reps, lay, strategiesFor('clearinghouse'), cfg.margin) });
  }
  const untestedList = [...untested.values()].map((u) => ({ figure: u.figure, kind: u.kind, where: [...u.where], strategies: [...u.strategies] }));
  const missingList = [...missing.values()].map((m) => ({ figure: m.figure, rule: m.rule, where: [...m.where], strategies: [...m.strategies] }));
  return { P, layout: lay, groups, problems, skipped: [...skipped], unserved, declined, neverServed, untested: untestedList, missing: missingList, perms, replicates: R, margin: cfg.margin, inflation: cfg.detectInflation ?? CONFIG.detectInflation };
}

/**
 * The stage-only floor (AUDIT-DESK 7.6, report-only): the class recall a strategy reaches by naming, for every case,
 * the most frequent class of the case's own stage. Computed on each path's Desk stream, over the pool's cases only
 * (the world's incidents are never served on a path, and their classes are not the pool's base rates); never fails
 * the gate.
 */
export async function stageOnlyFloor({ root, registry, cases: allCases, cfg = CONFIG, composerFor = () => referenceCompose }) {
  const cases = allCases.filter((c) => !c.scheduledAfter.includes('CLEARINGHOUSE'));
  const P = poolArrays(cases, registry.topClasses);
  const lay = figureLayout(registry.topClasses);
  const paths = await loadPaths(root, registry);
  const out = [];
  for (const path of paths) {
    const positions = positionsOf(path, cases, registry);
    if (positions.length === 0) continue;
    const label = `${path.id}/desk/floor`;
    const S = drawStream({ label, surface: 'desk', positions, cases, P, compose: composerFor('desk'), cfg, seed: deriveSeed(cfg.seed, label) });
    if (S.n === 0) continue;
    const { dec, named } = picksOf('stage-only', S, P);
    const v = new Float64Array(lay.ids.length);
    const shown = new Uint8Array(lay.ids.length);
    referenceScore(S, P, dec, named, v, shown, 'all');
    const figures = {};
    lay.ids.forEach((id, j) => {
      if (shown[j] && lay.kinds[j] === 'class') figures[id] = Math.round(v[j] * 1000) / 1000;
    });
    out.push({ path: path.id, decisions: S.n, figures });
  }
  return out;
}

/** The one-sided 95% point of the standard normal distribution. */
export const Z95 = 1.6448536269514722;

/**
 * The bound the gate prints (AUDIT-DESK 7.7; I10): the pool's size, the streams' length, and two thresholds per
 * figure, each at the widest SD among the blocking tests that could vary (the four spine strategies; all seven under
 * --strict).
 *
 *   margin   what a pass establishes: no blocking strategy's advantage, averaged over the R replicate streams,
 *            exceeded `margin` SD of one stream.
 *   detect   what the gate catches with 95% probability: the replicate mean has noise of its own, so a strategy
 *            whose expected advantage is exactly `margin` SD passes about half the time. Under the null that noise is
 *            SD / sqrt(R), which calibrate.mjs checks on a valid pool; under a real cue it is wider, because the cue's
 *            own realization varies from stream to stream, and calibrate.mjs measures by how much under its planted
 *            cues (../README.md section 7.5 [X RUN-audit-blind-gate]). The threshold
 *            allows `inflation` times the null's noise: an expected advantage above
 *            margin + 1.645 x inflation / sqrt(R) SD fails with probability 95% or more, under the normal
 *            approximation of the replicate mean.
 */
export function boundOf(result, allCases, margin = result.margin ?? CONFIG.margin, { strict = false, inflation = result.inflation ?? CONFIG.detectInflation } = {}) {
  const cases = allCases.filter((c) => !c.scheduledAfter.includes('CLEARINGHOUSE')); // the pool, the world's incidents aside
  const sound = cases.filter((c) => c.truth === 'sound').length;
  const anchors = new Set(cases.map((c) => c.anchor)).size;
  const stages = [...new Set(cases.map((c) => c.stage))];
  const blocking = new Set(STRATEGIES.filter((s) => s.blocking || strict).map((s) => s.id)); // under --strict every strategy blocks
  const R = result.replicates;
  const detectSd = margin + (Z95 * inflation) / Math.sqrt(R);
  const widest = new Map();
  for (const g of result.groups) {
    for (const v of g.verdicts) {
      if (!blocking.has(v.strategy) || !(v.sd > 0)) continue;
      const cur = widest.get(v.figure);
      if (!cur || v.sd > cur.sd) widest.set(v.figure, { figure: v.figure, sd: v.sd, margin: margin * v.sd, detect: detectSd * v.sd, where: `${g.path}/${g.surface}`, strategy: v.strategy });
    }
  }
  const lengths = result.groups.flatMap((g) => g.streams.map((s) => s.decisions));
  return {
    pool: { anchors, cases: cases.length, sound, flawed: cases.length - sound, stages },
    streams: { groups: result.groups.length, replicates: R, permutationsPerReplicate: result.perms, minDecisions: lengths.length ? Math.min(...lengths) : 0, maxDecisions: lengths.length ? Math.max(...lengths) : 0 },
    rule: { marginSd: margin, replicates: R, detectSd, detectPower: 0.95, inflation, approximation: 'the replicate mean of a strategy\'s advantage is normal, with an SD of at most inflation × one stream\'s permutation SD / sqrt(replicates)' },
    widest: [...widest.values()].sort((a, b) => a.figure.localeCompare(b.figure)),
  };
}

const EPS = 1e-9;

/**
 * Combine the replicates of one (path, surface): for each strategy and figure, the advantage is the mean over
 * replicates of (observed - chance), the SD is the root mean permutation variance of one stream, and the figure
 * fails when the advantage exceeds `margin` SD. With one replicate this is AUDIT-DESK 7.4's rule exactly. A figure
 * is tested only where the Desk would show it in at least half the replicates.
 */
export function verdicts(reps, layout, strategies, margin) {
  const out = [];
  for (const st of strategies) {
    const only = STRATEGIES.find((s) => s.id === st)?.figures ?? null;
    for (let j = 0; j < layout.ids.length; j++) {
      if (only && layout.kinds[j] !== only) continue;
      const rows = reps.map((r) => r.get(st)).filter((r) => r && r.shown[j] && r.count[j] > 0);
      if (rows.length === 0 || rows.length * 2 < reps.length) continue;
      const adv = rows.reduce((a, r) => a + (r.obs[j] - r.mean[j]), 0) / rows.length;
      const obs = rows.reduce((a, r) => a + r.obs[j], 0) / rows.length;
      const chance = rows.reduce((a, r) => a + r.mean[j], 0) / rows.length;
      const sd = Math.sqrt(rows.reduce((a, r) => a + r.var[j], 0) / rows.length);
      out.push({ strategy: st, figure: layout.ids[j], kind: layout.kinds[j], obs, chance, sd, advantage: adv, limit: chance + margin * sd, z: sd > 0 ? adv / sd : adv > EPS ? Infinity : 0, fail: adv > margin * sd + EPS, replicates: rows.length });
    }
  }
  return out;
}

// ------------------------------------------------------------------ binding the composer and scorer of W1-T32

/** Where W1-T32's judgment module lives (its deliverable is packages/learner/judgment/), and the folders it may use. */
export const JUDGMENT_FILE = 'packages/learner/judgment/index.ts';
const JUDGMENT_DIRS = ['packages/learner/judgment', 'packages/learner/src/judgment'];
const CONTRACT = 'AUDIT_SURFACES, composeAuditSitting and auditFigures';

/**
 * The Desk's own composer and scorer, when packages/learner exports them (W1-T32's judgment module). The contract
 * (../README.md section 5): `AUDIT_SURFACES`, the surfaces its composer implements; `composeAuditSitting({surface,
 * cases, topic, stagesDone, size, seed})`, returning the served cases' indices into `cases`, in order, or null; and
 * `auditFigures(decisions)`, returning [{id, kind: 'decision' | 'class', value, n}].
 *
 * The module is the one packages/learner/package.json exports as `./judgment` (what the site imports), else
 * packages/learner/judgment/index.ts, else packages/learner/src/judgment/index.ts. Returns { module, file, problems }:
 * module null and no problem when no judgment code exists at all; a problem, so that the gate fails closed instead of
 * falling back to its reference composer and scorer without a word, when the export names a missing file, when a
 * judgment folder exists without an index.ts, or when the module lacks the contract.
 */
export async function loadJudgment(root) {
  const problems = [];
  const candidates = [];
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'packages', 'learner', 'package.json'), 'utf8'));
    const e = pkg?.exports?.['./judgment'];
    const target = typeof e === 'string' ? e : e && typeof e === 'object' ? (e.import ?? e.default ?? e.node ?? null) : null;
    if (typeof target === 'string') {
      const f = join(root, 'packages', 'learner', target);
      if (existsSync(f)) candidates.push(f);
      else problems.push(`packages/learner/package.json exports ./judgment as ${target}, which does not exist`);
    }
  } catch {
    // no package.json, or not JSON: the folder rules below still apply
  }
  candidates.push(join(root, JUDGMENT_FILE), join(root, 'packages', 'learner', 'src', 'judgment', 'index.ts'));
  const file = candidates.find((f) => existsSync(f));
  if (!file) {
    const isDir = (d) => {
      try {
        return statSync(join(root, d)).isDirectory();
      } catch {
        return false;
      }
    };
    for (const d of JUDGMENT_DIRS.filter(isDir)) problems.push(`${d}/ exists but has no index.ts exporting ${CONTRACT}: GATE-audit-blind drives the Desk's own composer and scorer (AUDIT-DESK 7.1), at ${JUDGMENT_FILE} (scripts/spikes/W1-T40/README.md section 5)`);
    return { module: null, file: null, problems };
  }
  let mod;
  try {
    mod = await import(pathToFileURL(file).href);
  } catch (e) {
    return { module: null, file, problems: [...problems, `${file.slice(root.length + 1)} did not load: ${e instanceof Error ? e.message : String(e)}`] };
  }
  const listed = Array.isArray(mod.AUDIT_SURFACES) ? mod.AUDIT_SURFACES : null;
  const surfaces = listed ? listed.filter((s) => SURFACES.includes(s)) : null;
  if (typeof mod.composeAuditSitting !== 'function' || surfaces === null) problems.push(`${file.slice(root.length + 1)} exports no composeAuditSitting and AUDIT_SURFACES: GATE-audit-blind drives the Desk's own composer (AUDIT-DESK 7.1; scripts/spikes/W1-T40/README.md section 5)`);
  // A surface named in a way the gate does not know ('Desk', 'partC') would leave that surface to the reference composer
  // without a word, as if the module had not listed it.
  // A composer listed for none of the surfaces the gate composes (the Clearinghouse's sittings come from its world) would
  // never be driven, and the gate would check its reference composer in its place while reporting green.
  if (typeof mod.composeAuditSitting === 'function' && surfaces !== null && !surfaces.some((s) => s !== 'clearinghouse')) problems.push(`${file.slice(root.length + 1)} exports composeAuditSitting but lists none of desk, today and part-c in AUDIT_SURFACES, so the gate would never drive it and would check its reference composer in its place (scripts/spikes/W1-T40/README.md section 5)`);
  const unknown = (listed ?? []).filter((s) => !SURFACES.includes(s));
  if (unknown.length > 0) problems.push(`${file.slice(root.length + 1)} lists ${unknown.map((s) => JSON.stringify(s)).join(', ')} in AUDIT_SURFACES, which the gate does not drive (its surfaces are ${SURFACES.join(', ')}): the Desk's composer would never be asked for ${unknown.length === 1 ? 'that surface' : 'those surfaces'} (scripts/spikes/W1-T40/README.md section 5)`);
  if (typeof mod.auditFigures !== 'function') problems.push(`${file.slice(root.length + 1)} exports no auditFigures: GATE-audit-blind scores with the Desk's own scorer (AUDIT-DESK 7.1)`);
  return { module: mod, file, problems, surfaces: surfaces ?? [] };
}

// ------------------------------------------------------------------ the Clearinghouse (W3-T14)

/**
 * The Clearinghouse world's incidents, when it ships them (W3-T14): apps/instruments/src/engines/clearinghouse/audit.ts
 * exporting `auditIncidentBlocks(seed, blocks)`, which returns that many blocks of served incidents, each incident
 * a case in the pool's form (../README.md section 6). Returns { blocks: case[][] | null, file, problems }.
 *
 * What it returns is checked before it is read: the blocks asked for, each a non-empty list. A world that returns
 * nothing, fewer blocks or an empty block would otherwise leave its incidents untested while the gate reports green, as
 * if no Clearinghouse had shipped.
 */
export async function loadIncidents(root, seed, blocks) {
  const file = join(root, 'apps', 'instruments', 'src', 'engines', 'clearinghouse', 'audit.ts');
  if (!existsSync(file)) return { blocks: null, file: null, problems: [] };
  try {
    const mod = await import(pathToFileURL(file).href);
    if (typeof mod.auditIncidentBlocks !== 'function') return { blocks: null, file, problems: ['apps/instruments/src/engines/clearinghouse/audit.ts exports no auditIncidentBlocks(seed, blocks)'] };
    const got = await mod.auditIncidentBlocks(seed, blocks);
    const shape = !Array.isArray(got) ? `returned ${got === null ? 'null' : typeof got}, not a list of blocks` : got.length !== blocks ? `returned ${got.length} blocks where ${blocks} were asked for` : got.some((b) => !Array.isArray(b) || b.length === 0) ? 'returned a block that is not a non-empty list of incidents' : null;
    if (shape !== null) return { blocks: null, file, problems: [`auditIncidentBlocks(seed, ${blocks}) ${shape}, so the world's incidents would go untested (scripts/spikes/W1-T40/README.md section 6)`] };
    return { blocks: got, file, problems: [] };
  } catch (e) {
    return { blocks: null, file, problems: [`apps/instruments/src/engines/clearinghouse/audit.ts did not run: ${e instanceof Error ? e.message : String(e)}`] };
  }
}
