#!/usr/bin/env node
// Calibrate GATE-audit-blind's verdict rule on the W1-shaped fixture pool (W1-T40): how often a valid pool fails some
// blocking test under AUDIT-DESK 7.4's single-stream rule (1 replicate) and under the gate's rule (8 replicates), and
// how often each rule catches a planted position cue of a given strength. Every configuration differs only in the
// gate's seed, so each is one commit's verdict on the same pool. It also checks the normal approximation behind the
// detection threshold the gate prints (lib/blind.mjs boundOf): the spread of the replicate-mean z on the valid pool,
// and, under a planted position cue and a planted topic cue, how much more widely the test each cue moves most spreads
// than the null predicts (the inflation the threshold allows for), with its observed failures against the predicted.
//
//   node scripts/spikes/W1-T40/calibrate.mjs [--configs N] [--power-configs N] [--out FILE]
//
// Prints one JSON object (and writes it to --out). scripts/spikes/W1-T40/record.mjs runs it for RUN-audit-blind-gate.

import { writeFileSync } from 'node:fs';
import * as pool from './lib/pool.mjs';
import * as blind from './lib/blind.mjs';
import * as fx from './lib/fixtures.mjs';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
};
const CONFIGS = Number(arg('--configs', 100));
const POWER = Number(arg('--power-configs', 40));
const OUT = arg('--out', null);

const registry = pool.loadRegistry(pool.REPO);
const problems = [];
const anchors = fx.w1Pool().map((doc) => pool.normalizeAnchor(doc, { file: `content/audit/${doc.id}.yaml`, name: `${doc.id}.yaml`, registry, problems }));
const loaded = { anchors, present: true };
problems.push(...pool.contentProblems(loaded, { root: pool.REPO, registry, spineAnchors: pool.loadSpineAnchors(pool.REPO) }));
if (problems.length > 0) throw new Error(`the fixture pool has problems: ${problems.map((p) => p.message).join('; ')}`);
const cases = pool.blindCases(loaded, problems);
const blocking = new Set(blind.STRATEGIES.filter((s) => s.blocking).map((s) => s.id));
const seedOf = (k) => (0x0c0ffee0 + k * 7919) >>> 0;

/** A composer that, in a Desk session, moves a sound case to the last slot with probability q (a planted position cue). */
const lastSoundWith = (q) => (args) => {
  const served = blind.referenceCompose(args);
  if (!served || args.surface !== 'desk') return served;
  const d = blind.createDraw(blind.deriveSeed(args.seed, 'planted-cue'));
  if (d.below(1000) >= Math.round(q * 1000)) return served;
  const j = served.findIndex((i) => args.cases[i].truth === 'sound');
  if (j < 0) return served;
  const out = served.filter((_, k) => k !== j);
  out.push(served[j]);
  return out;
};

/** The standard normal distribution function (Abramowitz and Stegun 7.1.26; absolute error below 1e-7). */
function Phi(x) {
  const t = 1 / (1 + (0.3275911 * Math.abs(x)) / Math.SQRT2);
  const tail = (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-(x * x) / 2);
  return x >= 0 ? 1 - tail / 2 : tail / 2;
}
const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const meanOf = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sdOf = (xs) => Math.sqrt(xs.reduce((a, b) => a + (b - meanOf(xs)) ** 2, 0) / (xs.length - 1));

/**
 * One rule over `configs` seed configurations. `z` summarizes advantage / SD over every blocking test that could
 * vary; its `sd` is what the bound's normal approximation predicts as 1 / sqrt(replicates) under the null. With
 * `dominant`, also the test the planted cue moves most (the largest mean z): its z's spread across configurations,
 * and how often it failed against how often a normal replicate mean predicts, with the null's spread
 * (Phi((mean z - margin) * sqrt(replicates))) and with its own.
 */
/**
 * A composer that, in a Desk session, serves the topic stage's most frequent class in every flawed slot it can with
 * probability q (a planted topic cue, which topic-is-class exploits on class figures, under the within-stage null).
 */
const topicWith = (q) => (args) => {
  const served = blind.referenceCompose(args);
  if (!served || args.surface !== 'desk') return served;
  const d = blind.createDraw(blind.deriveSeed(args.seed, 'planted-topic-cue'));
  if (d.below(1000) >= Math.round(q * 1000)) return served;
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

async function sweep({ replicates, configs, composer = null, onlySurfaces = null, dominant = false }) {
  let anyFail = 0;
  const zs = [];
  let tests = 0;
  const byTest = new Map();
  const t0 = performance.now();
  for (let k = 0; k < configs; k++) {
    const cfg = { ...blind.CONFIG, seed: seedOf(k), replicates };
    const res = await blind.runBlind({ root: pool.REPO, registry, cases, cfg, ...(composer ? { composerFor: () => composer } : {}), onlySurfaces });
    let failed = false;
    for (const g of res.groups) {
      for (const v of g.verdicts) {
        if (!blocking.has(v.strategy) || !(v.sd > 0)) continue;
        tests++;
        zs.push(v.z);
        const key = `${g.path}/${g.surface} ${v.strategy} ${v.figure}`;
        if (!byTest.has(key)) byTest.set(key, []);
        byTest.get(key).push({ z: v.z, fail: v.fail });
        if (v.fail) failed = true;
      }
    }
    if (failed) anyFail++;
  }
  const sd = sdOf(zs);
  zs.sort((a, b) => a - b);
  const q = (f) => round(zs[Math.floor(f * (zs.length - 1))]);
  const out = { replicates, configs, failingConfigs: anyFail, testsThatCouldVaryPerConfig: Math.round(tests / configs), z: { median: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1), sd: round(sd, 3), sdUnderTheApproximation: round(1 / Math.sqrt(replicates), 3) } };
  if (dominant) {
    let top = null;
    for (const [test, rows] of byTest) {
      if (rows.length !== configs) continue;
      const m = meanOf(rows.map((r) => r.z));
      if (!top || m > top.meanZ) top = { test, rows, meanZ: m };
    }
    if (top) {
      const margin = blind.CONFIG.margin;
      out.dominantTest = {
        test: top.test,
        meanZ: round(top.meanZ),
        sdZ: round(sdOf(top.rows.map((r) => r.z)), 3),
        sdUnderTheApproximation: round(1 / Math.sqrt(replicates), 3),
        failed: top.rows.filter((r) => r.fail).length,
        predictedFailures: round(configs * Phi((top.meanZ - margin) * Math.sqrt(replicates)), 1),
        predictedWithItsSpread: round(configs * Phi((top.meanZ - margin) / sdOf(top.rows.map((r) => r.z))), 1),
      };
    }
  }
  out.seconds = Math.round(performance.now() - t0) / 1000;
  return out;
}

const out = {
  pool: { anchors: new Set(cases.map((c) => c.anchor)).size, cases: cases.length, sound: cases.filter((c) => c.truth === 'sound').length },
  config: { permutations: blind.CONFIG.permutations, margin: blind.CONFIG.margin, replicates: blind.CONFIG.replicates, detectInflation: blind.CONFIG.detectInflation, desk: blind.CONFIG.desk, today: blind.CONFIG.today, partC: blind.CONFIG.partC },
  validPool: {
    singleStream: await sweep({ replicates: 1, configs: CONFIGS }),
    gateRule: await sweep({ replicates: blind.CONFIG.replicates, configs: CONFIGS }),
  },
  plantedPositionCue: [],
  plantedTopicCue: [],
};
// Decision 5: the Part C pass rate under the full permutation that AUDIT-DESK 7.4 assigns it, against the
// within-stage null the gate uses. topic-is-class names the Defence stage's own class in a Part C draw, so under the
// full permutation it gains from the stage alone.
{
  const zs = { full: [], withinStage: [] };
  for (let k = 0; k < Math.min(CONFIGS, 40); k++) {
    const cfg = { ...blind.CONFIG, seed: seedOf(k) };
    for (const [name, kind] of [['full', 'decision'], ['withinStage', 'class']]) {
      const layout = blind.figureLayout(registry.topClasses);
      layout.kinds[layout.ids.indexOf('part-c-pass')] = kind;
      const res = await blind.runBlind({ root: pool.REPO, registry, cases, cfg, layout, onlySurfaces: ['part-c'] });
      for (const g of res.groups) for (const v of g.verdicts) if (v.strategy === 'topic-is-class' && v.figure === 'part-c-pass') zs[name].push(v.z);
    }
  }
  const mean = (xs) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100;
  out.partCPassTopicIsClass = { configs: Math.min(CONFIGS, 40), streams: zs.full.length, meanZUnderFullPermutation: mean(zs.full), maxZUnderFullPermutation: Math.round(Math.max(...zs.full) * 100) / 100, meanZWithinStage: mean(zs.withinStage) };
}
for (const q of [0.05, 0.1, 0.2]) {
  out.plantedPositionCue.push({
    cue: `a sound case moved to the last slot of a Desk session with probability ${q}`,
    singleStream: await sweep({ replicates: 1, configs: POWER, composer: lastSoundWith(q), onlySurfaces: ['desk'], dominant: true }),
    gateRule: await sweep({ replicates: blind.CONFIG.replicates, configs: POWER, composer: lastSoundWith(q), onlySurfaces: ['desk'], dominant: true }),
  });
}
for (const q of [0.25, 0.5]) {
  out.plantedTopicCue.push({
    cue: `the topic stage's most frequent class served in every flawed slot it can fill, in a Desk session with probability ${q}`,
    gateRule: await sweep({ replicates: blind.CONFIG.replicates, configs: POWER, composer: topicWith(q), onlySurfaces: ['desk'], dominant: true }),
  });
}
// The noise inflation behind the bound's detection threshold (lib/blind.mjs boundOf): how much more widely the test
// each planted cue moves most spread across configurations than the null's 1 / sqrt(replicates), under the gate's rule.
{
  const rows = [...out.plantedPositionCue, ...out.plantedTopicCue].map((p) => ({ cue: p.cue, test: p.gateRule.dominantTest.test, ratio: round(p.gateRule.dominantTest.sdZ / p.gateRule.dominantTest.sdUnderTheApproximation) }));
  const largest = Math.max(...rows.map((r) => r.ratio));
  out.noiseInflation = { measured: rows, largest, allowed: blind.CONFIG.detectInflation, holds: largest <= blind.CONFIG.detectInflation, nullSpreadRatio: round(out.validPool.gateRule.z.sd / out.validPool.gateRule.z.sdUnderTheApproximation) };
}
const text = `${JSON.stringify(out, null, 2)}\n`;
if (OUT) writeFileSync(OUT, text);
process.stdout.write(text);
