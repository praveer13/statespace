// Tests of GATE-budget (scripts/verify-budget.mjs; W0-T06). Run: node --test scripts/spikes/W0-T06/verify-budget.test.mjs
//
// The first group runs the gate on the real files. Every other test plants one defect in a copy of the spine or of
// content/stages/budget.yaml and shows that the gate fails (or warns) with the finding that names it. A planted defect
// pins the spine text it changes, so a change to that text fails the test loudly; the numbers that a message prints are
// matched by shape or computed from the real files, so that new logged times do not break the tests.
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const gate = await import('../../verify-budget.mjs');
const { parseYaml } = await import('../../../packages/ids/src/yaml-subset.ts');
const { checkBudget, checkParsed, formatReport, loadInputs, main, citedFiles, SPINE_PATH, BUDGET_PATH } = gate;

const real = loadInputs(REPO);
assert.ok(!('missing' in real), 'the spine and the budget file are in the repository');
const spine0 = real.spine;
const budget0 = parseYaml(real.budgetText);
const files0 = real.files;

/** The gate on the real files, with a change to the spine text and/or the parsed budget file. */
function run({ spine = spine0, edit, files = files0 } = {}) {
  const b = structuredClone(budget0);
  if (edit) edit(b);
  return checkParsed(spine, b, files);
}
/** A copy of the spine with one exact replacement (the test fails if the text is not there). */
function spineWith(from, to) {
  assert.ok(spine0.includes(from), `the spine has no "${from.slice(0, 60)}"`);
  return spine0.replace(from, to);
}
/** The spine with one lab stage's minutes changed. */
function minutesOf(labStage, minutes, text = spine0) {
  const re = new RegExp(`^(\\| ${labStage.replace('.', '\\.')} \\|.*\\| )[0-9]+( \\| LAB-)`, 'm');
  assert.ok(re.test(text), `no lab row for ${labStage}`);
  return text.replace(re, `$1${minutes}$2`);
}
/** The spine and the budget file with one stage's Roadmap cell replaced. */
function roadmapOf(stage, cell) {
  const re = new RegExp(`^(\\| ${stage} \\|.*\\| )[^|]+( \\| pass \\|)$`, 'm');
  assert.ok(re.test(spine0), `no table row for ${stage}`);
  return { spine: spine0.replace(re, (_, a, b) => `${a}${cell}${b}`), edit: (b) => (b.stages[stage].rows.roadmap = cell) };
}
/** The spine with numbered decisions appended to section 12 (after its last), and the number of the first. */
function withDecisions(...texts) {
  const nums = [...spine0.matchAll(/^([0-9]+)\. \*\*/gm)].map((m) => Number(m[1]));
  const last = Math.max(...nums.filter((n) => n < 200));
  const lastLine = spine0.split('\n').find((l) => l.startsWith(`${last}. **`));
  const items = texts.map((t, i) => `${last + 1 + i}. **${t.title}** ${t.body}`).join('\n');
  return { spine: spine0.replace(lastLine, `${lastLine}\n${items}`), first: last + 1 };
}
const cell = (stage, col) => budget0.stages[stage].rows[col];
const lowOf = (c) => c.split('–')[0];
const highOf = (c) => c.split('–')[1];
const fails = (r, check) => r.findings.filter((f) => f.severity === 'fail' && (check === undefined || f.check === check));
const warns = (r, check) => r.findings.filter((f) => f.severity === 'warn' && (check === undefined || f.check === check));
const notes = (r, check) => r.findings.filter((f) => f.severity === 'note' && (check === undefined || f.check === check));
const has = (list, text) => list.some((f) => f.message.includes(text));
const messages = (list) => list.map((f) => f.message).join('\n');
const H = '[0-9]+\\.[0-9]+'; // an hours figure in a message

// ---------------------------------------------------------------- the real files

test('the real plan is green: no failure, all ten stages pass, and every warning is one that the plan names', () => {
  const r = run();
  assert.deepEqual(fails(r), [], messages(fails(r)));
  assert.equal(r.stages.length, 10);
  assert.ok(r.stages.every((s) => s.plan.verdict === 'pass'));
  // two kinds of warning, and nothing else: the cut-list folds of the builder path (see the order test below), and the
  // S10 cadence of each path, which holds only with the planned records (see the cadence tests below)
  const other = warns(r).filter((f) => !(f.check === 'cutlist' && f.scope === 'builder') && !(f.check === 'cadence' && f.message.startsWith('the cadence holds only by counting')));
  assert.deepEqual(other, [], messages(other));
});

test('the lower-bound, Keep-load and claim-cadence checks run on both published paths', () => {
  const r = run();
  assert.deepEqual(r.paths.map((p) => p.id), ['default', 'builder']);
  for (const p of r.paths) {
    assert.equal(p.bounds.rows.length, 10, `${p.id}: bounds`);
    assert.ok(p.bounds.rows.every((row) => row.line === null || row.hi >= row.line), `${p.id}: no stage below its lower-bound line`);
    assert.ok(p.keep.rows.length >= 10, `${p.id}: Keep load per block`);
    assert.ok(p.keep.rows.every((row) => row.at[6].margin >= 0 && row.at[10].margin >= 0));
    assert.ok(p.cadence.events.length > 100, `${p.id}: cadence events`);
    assert.ok(p.cadence.top[0].gap <= 2 * 2850, `${p.id}: no gap past two weeks`);
  }
  const builder = r.paths.find((p) => p.id === 'builder');
  assert.deepEqual(builder.blocks.map((b) => b.id), ['S1', 'S5-early', 'S6-early', 'S8-early', 'S2', 'S3', 'S4', 'S5-late', 'S7', 'S6-late', 'S8-late', 'S9', 'S10']);
  // both paths hold the same units, so the same hours
  const [d, b] = r.paths;
  assert.equal(d.totalHi, b.totalHi);
  assert.equal(d.totalLo, b.totalLo);
});

test('the report names each check once per path and ends green', () => {
  const lines = formatReport(run());
  const text = lines.join('\n');
  for (const check of ['table', 'rows', 'tools', 'paths', 'stages', 'cutlist', 'additions']) assert.match(text, new RegExp(`OK +${check}`));
  for (const path of ['default', 'builder']) assert.match(text, new RegExp(`PATH  ${path}`));
  assert.equal(lines.filter((l) => /^ {2}OK {4}(upper|lower|keep|cadence) /.test(l)).length, 8);
  assert.match(lines.find((l) => /^OK +stages/.test(l)), /10 of 10 stages pass/);
  assert.match(lines.at(-1), /^GATE-budget: green/);
  const verbose = formatReport(run(), { verbose: true }).join('\n');
  assert.match(verbose, /Keep load by block/);
  assert.match(verbose, /the five longest gaps between claims and specimens/);
});

test('main: exit 0 on the real tree, JSON on request, no private path in the output', () => {
  const out = [];
  assert.equal(main([], { out: (s) => out.push(s), err: (s) => out.push(s) }), 0);
  assert.match(out.at(-1), /^GATE-budget: green/);
  const json = [];
  assert.equal(main(['--json'], { out: (s) => json.push(s) }), 0);
  const parsed = JSON.parse(json.join('\n'));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.stages.length, 10);
  assert.equal(parsed.paths.length, 2);
  assert.doesNotMatch(out.join('\n') + json.join('\n'), /\/home\/|\/Users\/|\/tmp\//);
});

// ---------------------------------------------------------------- table: the budget file and the spine agree

test('table: a cell of the budget file that differs from the section 3.11 table fails', () => {
  const r = run({ edit: (b) => (b.stages.S4.rows.read = '9.9–9.9') });
  assert.ok(has(fails(r, 'table'), `S4 read: the spine prints "${cell('S4', 'read')}"`), messages(fails(r)));
});

test('table: a quoted sentence that the spine no longer says fails', () => {
  const r = run({ spine: spineWith('about 2 minutes per review', 'about 3 minutes per review') });
  assert.ok(has(fails(r, 'table'), 'no longer says'), messages(fails(r)));
});

test('table: a cited file that cannot be read fails', () => {
  const files = { ...files0 };
  delete files['curriculum/S10-assembly.md'];
  const r = run({ files });
  assert.ok(has(fails(r, 'table'), 'curriculum/S10-assembly.md, which could not be read'), messages(fails(r)));
});

test('table: the spine says pass for a stage that the gate fails', () => {
  const r = run({ spine: minutesOf('LAB-2.5', 4000) });
  assert.ok(has(fails(r, 'table'), 'S2 is "pass" under GATE-budget, and the gate says "fail"'), messages(fails(r)));
});

// ---------------------------------------------------------------- rows: the recomputation (PLAN.md spine issue 2)

test('rows: a column total that is not the sum of its rows, and totals that do not cross-foot, are caught', () => {
  // the shape of PLAN.md spine issue 2: a column total one hour above what its rows add to
  const low = Number(lowOf(budget0.totals.write)) + 1;
  const planted = `${low.toFixed(1)}–${highOf(budget0.totals.write)}`;
  const r = run({ spine: spineWith(`**${budget0.totals.write}**`, `**${planted}**`), edit: (b) => (b.totals.write = planted) });
  const f = messages(fails(r, 'rows'));
  assert.match(f, new RegExp(`Total write, low: the table prints ${low.toFixed(1)} h, but its ten rows add to ${H} h`));
  assert.match(f, new RegExp(`Total, low: its five column totals add to ${H} h, but the table prints ${lowOf(budget0.totals.total)} h for the total`));
  assert.match(f, /rounding issue, PLAN\.md spine issue 2/);
});

test('rows: a grand total that the weeks columns do not follow is caught', () => {
  const planted = `${lowOf(budget0.totals.weeks_6)}–${(Number(highOf(budget0.totals.weeks_6)) + 0.4).toFixed(1)}`;
  const r = run({ spine: spineWith(`**${budget0.totals.weeks_6}**`, `**${planted}**`), edit: (b) => (b.totals.weeks_6 = planted) });
  assert.match(messages(fails(r, 'rows')), new RegExp(`Total weeks at 6 h/week, high: the table prints ${highOf(planted)}, the printed total ${highOf(budget0.totals.total)} h gives ${highOf(budget0.totals.weeks_6)}`));
});

test('rows: a lab stage that changes without its row changing is caught from the lab table', () => {
  const r = run({ spine: minutesOf('LAB-3.2', 90) });
  const f = messages(fails(r, 'rows'));
  assert.match(f, new RegExp(`S3 build, low: the table prints ${lowOf(cell('S3', 'build'))} h, the lesson and lab tables give ${H} h`));
  assert.match(f, new RegExp(`S3 build, high: the table prints ${highOf(cell('S3', 'build'))} h, the lesson and lab tables give ${H} h`));
  assert.equal(fails(r, 'upper').length, 0, 'S3 still fits its roadmap bound');
});

test('rows: a printed stage cell that the lesson tables do not give is caught', () => {
  const planted = `${(Number(lowOf(cell('S2', 'lessons'))) + 0.1).toFixed(1)}–${highOf(cell('S2', 'lessons'))}`;
  const r = run({ spine: spineWith(`| ${cell('S2', 'lessons')} |`, `| ${planted} |`), edit: (b) => (b.stages.S2.rows.lessons = planted) });
  assert.match(messages(fails(r, 'rows')), new RegExp(`S2 lessons, low: the table prints ${lowOf(planted)} h, the lesson and lab tables give ${lowOf(cell('S2', 'lessons'))} h \\(${H} h exactly\\)`));
});

test('rows: a stage total more than a printed tenth from its rows is caught, and a rounding difference is not', () => {
  const planted = `${(Number(lowOf(cell('S2', 'total'))) + 0.3).toFixed(1)}–${highOf(cell('S2', 'total'))}`;
  const r = run({ spine: spineWith(`| ${cell('S2', 'total')} |`, `| ${planted} |`), edit: (b) => (b.stages.S2.rows.total = planted) });
  assert.match(messages(fails(r, 'rows')), new RegExp(`S2 total, low: the table prints ${lowOf(planted)} h, the rows give ${H} h`));
  // a printed total may be a hundredth or two off its exact rows (the table rounds its totals two ways): that is no finding
  assert.deepEqual(fails(run(), 'rows'), []);
});

test('rows: a weeks cell that the printed total does not give is caught', () => {
  const planted = `${lowOf(cell('S3', 'weeks_6'))}–${(Number(highOf(cell('S3', 'weeks_6'))) + 0.1).toFixed(1)}`;
  const r = run({ spine: spineWith(`| ${cell('S3', 'total')} | ${cell('S3', 'weeks_6')} |`, `| ${cell('S3', 'total')} | ${planted} |`), edit: (b) => (b.stages.S3.rows.weeks_6 = planted) });
  assert.match(messages(fails(r, 'rows')), new RegExp(`S3 weeks at 6 h/week, high: the table prints ${highOf(planted)}, the printed total ${highOf(cell('S3', 'total'))} h over 4\\.75 h a week gives ${highOf(cell('S3', 'weeks_6'))}`));
});

test('rows: a sequence that drops a lab stage, repeats a lesson or names nothing is caught', () => {
  const dropped = run({ edit: (b) => (b.stages.S4.sequence = b.stages.S4.sequence.replace(' LAB-4.3', '')) });
  assert.ok(has(fails(dropped, 'rows'), 'LAB-4.3 is in no place of the sequence of S4'), messages(fails(dropped)));
  const twice = run({ edit: (b) => (b.stages.S4.sequence += ' S4.L1') });
  assert.ok(has(fails(twice, 'rows'), 'S4.L1 appears twice'), messages(fails(twice)));
  const unknown = run({ edit: (b) => (b.stages.S4.sequence += ' LAB-4.99') });
  assert.ok(has(fails(unknown, 'rows'), '"LAB-4.99" in the sequence of S4 is no lesson'), messages(fails(unknown)));
  const stretch = run({ edit: (b) => (b.stages.S4.sequence += ' LAB-4.9') });
  assert.ok(has(fails(stretch, 'rows'), 'LAB-4.9 is a [stretch] stage'), messages(fails(stretch)));
  const elsewhere = run({ edit: (b) => (b.stages.S4.sequence += ' S5.L1') });
  assert.ok(has(fails(elsewhere, 'rows'), 'S5.L1 is a lesson of S5, not of S4'), messages(fails(elsewhere)));
});

test('rows: passes that do not sum to the lab table, and a briefing that is no step, are caught', () => {
  const passes = run({ edit: (b) => (b.stages.S10.passes['LAB-10.8'] = [25, 45, 45]) });
  assert.ok(has(fails(passes, 'rows'), 'the passes of LAB-10.8 sum to 115 minutes, the lab table says'), messages(fails(passes)));
  const briefing = run({ edit: (b) => (b.stages.S10.briefings = ['S10.L6', 'S10.L1']) });
  assert.ok(fails(briefing, 'rows').length > 0, messages(fails(briefing)));
});

test('rows: the sentences of section 3.11 that summarize the table must follow it', () => {
  const wholly = run({ spine: spineWith('S6, S7 and S8 plan wholly below its lower bound', 'S6 and S7 plan wholly below its lower bound') });
  assert.match(messages(fails(wholly, 'rows')), /the spine says S6, S7 plan wholly below the roadmap's lower bound, the totals say S6, S7, S8/);
  const low = run({ spine: spineWith('as do the low estimates of S3–S9', 'as do the low estimates of S3–S8') });
  assert.match(messages(fails(low, 'rows')), /the spine says the low estimates of S3–S8 are below the roadmap's lower bound, the totals say S3, S4, S5, S6, S7, S8, S9/);
  const arc = run({ spine: spineWith('about 43–80 weeks at 6 h/week', 'about 43–81 weeks at 6 h/week') });
  assert.match(messages(fails(arc, 'rows')), /the spine projects the arc to 43–81 weeks at 6 h\/week and 25–46 at 10 h\/week, the totals row at 1\.6x with 2 reserve weeks in 12 gives 43–80 and 25–46/);
  const months = run({ spine: spineWith('(about 10–18.4 months', '(about 10–18.9 months') });
  assert.match(messages(fails(months, 'rows')), /the spine puts the arc at 10–18\.9 months, the totals row gives 10–18\.4/);
});

// ---------------------------------------------------------------- upper and lower bounds

test('upper: a stage whose high estimate passes the roadmap bound fails on both paths', () => {
  const r = run({ spine: minutesOf('LAB-2.4', 400) });
  const u = fails(r, 'upper');
  assert.equal(u.length, 2, messages(u));
  assert.deepEqual(u.map((f) => f.scope).sort(), ['builder', 'default']);
  assert.match(u[0].message, new RegExp(`S2: the high estimate ${H} h exceeds the roadmap's upper bound ${H} h \\(${cell('S2', 'roadmap')}\\)`));
});

test('upper: S1 is bounded by its sessions, and a cap that contradicts them fails', () => {
  const capped = roadmapOf('S1', cell('S1', 'roadmap').replace(/≤ [0-9]+ h/, '≤ 12 h'));
  assert.ok(has(fails(run(capped), 'upper'), 'not the 12 h that its roadmap cell caps them at'), messages(fails(run(capped))));
  const long = run({ spine: minutesOf('LAB-1.2', 1200) });
  assert.ok(has(fails(long, 'upper'), 'S1: the high estimate'), messages(fails(long)));
});

test('lower: a stage far below half of the roadmap lower bound warns, on both paths', () => {
  const r = run(roadmapOf('S8', '30–60 wk'));
  const w = warns(r, 'lower');
  assert.deepEqual(w.map((f) => f.scope).sort(), ['builder', 'default'], messages(w));
  assert.match(w[0].message, new RegExp(`S8: the high estimate ${H} h is below half of the roadmap's lower bound \\(71\\.25 h of 142\\.50 h, 30–60 wk\\); a section 12 justification clears it`));
  assert.deepEqual(fails(r), [], 'a warning is not a failure');
  assert.equal(r.stages.find((s) => s.stage === 'S8').plan.verdict, 'warn');
});

test('lower: a section 12 justification that names the stage and its lower bound clears the warning', () => {
  const d = withDecisions({ title: 'S8 plans below its lower bound.', body: "S8 stays under half of the roadmap's lower bound because the roadmap's weeks assume another scope." });
  const planted = roadmapOf('S8', '30–60 wk');
  const spine = d.spine.replace(/^(\| S8 \|.*\| )[^|]+( \| pass \|)$/m, (_, a, b) => `${a}30–60 wk${b}`);
  const r = run({ spine, edit: (b) => { planted.edit(b); b.justifications = [{ stage: 'S8', item: d.first }]; } });
  assert.deepEqual(warns(r, 'lower'), [], messages(warns(r)));
  assert.deepEqual(fails(r), [], messages(fails(r)));
  assert.ok(notes(r, 'lower').some((f) => new RegExp(`section 12 item ${d.first} justifies it`).test(f.message)));
});

test('lower: a justification that names no such item, or the wrong stage, fails', () => {
  const edit = (item, stage = 'S8') => (b) => { b.justifications = [{ stage, item }]; };
  assert.ok(has(fails(run({ edit: edit(999) }), 'lower'), 'section 12 item 999, which does not exist'));
  assert.ok(has(fails(run({ edit: edit(1) }), 'lower'), 'section 12 item 1 names no S8 and no lower bound'));
  const d = withDecisions({ title: 'S8 and its lower bound.', body: 'A justification for a stage that no longer warns.' });
  const unused = run({ spine: d.spine, edit: edit(d.first) });
  assert.ok(notes(unused, 'lower').some((f) => /justifies a lower-bound warning for S8, which no longer warns/.test(f.message)), messages(unused.findings));
});

// ---------------------------------------------------------------- Keep load

test('keep: more reviews per KC than the planned block holds fails, per block and on both paths', () => {
  const r = run({ edit: (b) => (b.parameters.review_load.reviews_per_kc = 40) });
  const k = fails(r, 'keep');
  assert.ok(k.length > 20, `${k.length} findings`);
  assert.deepEqual([...new Set(k.map((f) => f.scope))].sort(), ['builder', 'default']);
  assert.match(k[0].message, /\(\d+ new KCs?\): the implied Keep load is up to \d+\.\d min\/week at 6 h\/week, above the planned 75/);
});

test('keep: the Keep items that run in a block are the ones its path says', () => {
  const hi = (r, path, block, w = 6) => r.paths.find((p) => p.id === path).keep.rows.find((x) => x.block === block).at[w].hi;
  const base = run();
  // the Lean keep-alive takes 15 min/week at the high end, the Clearinghouse one incident of 15 min at 6 h/week
  const noLean = run({ edit: (b) => (b.paths.builder.lean_idle = []) });
  assert.ok(Math.abs(hi(base, 'builder', 'S7') - hi(noLean, 'builder', 'S7') - 15) < 1e-9);
  assert.equal(hi(base, 'default', 'S5'), hi(noLean, 'default', 'S5'), 'the default path is unchanged');
  const lateHouse = run({ edit: (b) => (b.paths.default.clearinghouse_after = 'S9') });
  assert.ok(Math.abs(hi(base, 'default', 'S4') - hi(lateHouse, 'default', 'S4') - 15) < 1e-9);
  assert.ok(Math.abs(hi(base, 'default', 'S4', 10) - hi(lateHouse, 'default', 'S4', 10) - 30) < 1e-9, 'two incidents at 10 h/week');
  // the keep-alive rule is the spine's: S5 to S8 on the default path
  assert.ok(has(fails(run({ edit: (b) => (b.paths.default.lean_idle = ['S4']) }), 'paths'), 'keep-alive in S5, S6, S7, S8 on the default path'));
  // a KC taught by no lesson is in no block's load
  const noKc = run({ spine: spine0.replace(/^(\| S8\.L1 \|.*\| )KC-8\.commit-not-send( \|)/m, '$1KC-8.at-least-once$2') });
  assert.ok(has(fails(noKc, 'keep'), 'KC-8.commit-not-send is taught by no lesson on the default path'), messages(fails(noKc, 'keep')));
});

// ---------------------------------------------------------------- claim cadence

const name = (e) => (e.unit ? `${e.id} (${e.unit})` : e.id);

test('cadence: a gap past the limit fails, with the two events that bound it', () => {
  const worst = run().paths[0].cadence.top[0];
  const r = run({ edit: (b) => (b.parameters.cadence.max_gap_weeks = 1) });
  const c = fails(r, 'cadence');
  assert.deepEqual(c.map((f) => f.scope).sort(), ['builder', 'default']);
  const first = c.find((f) => f.scope === 'default');
  assert.ok(first.message.startsWith(`${name(worst.from)} to ${name(worst.to)}: `), first.message);
  assert.match(first.message, new RegExp(`h of stage work = ${H} weeks at 6 h/week, above the 1-week limit \\(4\\.75 h\\)`));
});

test('cadence: dropping the specimen that closes a gap makes the gap fail', () => {
  // SP-2.2 is S2's first event; without it S1's last claim waits for CL-2.1, past the limit at the high estimate
  const spine = spine0.replace(/^\| SP-2\.2 \|.*\n/m, '');
  assert.notEqual(spine, spine0);
  const r = run({ spine });
  assert.ok(has(fails(r, 'cadence'), 'CL-1.3 (LAB-1.5) to CL-2.1 (LAB-2.2)'), messages(fails(r)));
});

test('cadence: the scheduled records of LAB-10.8 are what keep S10 under two weeks', () => {
  const r = run({ edit: (b) => (b.planned_records = []) });
  assert.ok(has(fails(r, 'cadence'), 'CL-10.1 (LAB-10.7) to CL-10.2 (LAB-10.8)'), messages(fails(r)));
  assert.deepEqual(warns(r, 'cadence'), [], 'a plan with no records has nothing to warn about: it fails instead');
});

// The conditional green. The spine says GATE-budget plans the cadence from claim templates ("Left unchanged", S10 issue 9, its
// cadence clause), and the plan holds S10's cadence only by counting two records that no template covers. The gate says so
// on each path, where its result is read.
const hours2 = (units) => (units / 600).toFixed(2);
/** The longest gap of a path's events when the planned records are left out, from the gate's own event list. */
function longestWithoutRecords(p) {
  let prev = { id: 'the start of the path', unit: null, hi: 0, lo: 0 };
  let best = null;
  for (const e of p.cadence.events.filter((x) => x.kind !== 'record')) {
    if (!best || e.hi - prev.hi > best.gap) best = { gap: e.hi - prev.hi, gapLo: e.lo - prev.lo, from: prev, to: e };
    prev = e;
  }
  return best;
}

test('cadence: the plan holds only with the two scheduled records of LAB-10.8, and each path says so', () => {
  const r = run();
  const w = warns(r, 'cadence');
  assert.deepEqual(w.map((f) => f.scope).sort(), ['builder', 'default'], messages(w));
  const ruling = budget0.planned_records_ruling;
  const line = spine0.split('\n').findIndex((l) => l.includes(ruling.quote)) + 1;
  assert.ok(line > 0, 'the spine holds the ruling that the budget file quotes');
  for (const p of r.paths) {
    const limit = 2 * 2850;
    const bare = longestWithoutRecords(p);
    assert.ok(p.cadence.top[0].gap <= limit, `${p.id}: with the records no gap passes two weeks`);
    assert.ok(bare.gap > limit, `${p.id}: without them a gap does`);
    assert.equal(`${name(bare.from)} to ${name(bare.to)}`, 'CL-10.1 (LAB-10.7) to CL-10.2 (LAB-10.8)');
    assert.deepEqual({ ...p.cadence.records, without: undefined }, { count: 2, needed: true, without: undefined });
    const f = w.find((x) => x.scope === p.id);
    // the figures are the gate's own events with the records left out: the gap, the two events that bound it, the low estimate
    assert.match(f.message, /^the cadence holds only by counting 2 planned records of LAB-10\.8 that no claim template covers; without them, /);
    assert.ok(f.message.includes(`${name(bare.from)} to ${name(bare.to)} is ${hours2(bare.gap)} h of stage work = ${(bare.gap / 2850).toFixed(1)} weeks at 6 h/week`), f.message);
    assert.ok(f.message.includes(`above the 2-week limit (9.50 h; ${hours2(bare.gapLo)} h at the low estimate)`), f.message);
    // it cites the spine's ruling and the line that holds it, and says that the decision is the owner's
    assert.ok(f.message.includes(`the spine rules out counting them (${ruling.item}: "${ruling.quote}")`), f.message);
    assert.match(f.message, /; owner decision pending \(content\/stages\/budget\.yaml, planned_records\)$/);
    assert.equal(f.where, `${SPINE_PATH}:${line}`);
    assert.equal(f.stage, undefined, 'a finding of the path, not of a stage: the ten stages still pass');
  }
  assert.ok(r.stages.every((s) => s.plan.verdict === 'pass'));
});

test('cadence: the report puts the warning under each path\'s cadence line, and the verbose report shows the gap without the records', () => {
  const r = run();
  const lines = formatReport(r);
  const at = lines.map((l, i) => (/^ {2}OK {4}cadence /.test(l) ? i : -1)).filter((i) => i >= 0);
  assert.equal(at.length, 2, 'one cadence line per path');
  for (const i of at) {
    assert.match(lines[i], /2 planned records that no claim template covers\); /);
    assert.match(lines[i], /; the cadence holds only with the planned records, see the warning below$/);
    assert.match(lines[i + 1], /^ {2}WARN {2}cadence {2}the cadence holds only by counting 2 planned records of LAB-10\.8 .*owner decision pending .*\[docs\/spine\/SPINE\.md:[0-9]+\]$/);
  }
  assert.match(lines.at(-1), new RegExp(`^GATE-budget: green \\(${warns(r).length} warnings\\)`), 'the summary counts the warnings');
  const verbose = formatReport(r, { verbose: true }).filter((l) => l.startsWith('without the 2 planned records'));
  assert.equal(verbose.length, 2);
  assert.ok(verbose.every((l) => new RegExp(`longest gap is ${H} h \\(${H} h at the low estimate\\), CL-10\\.1 \\(LAB-10\\.7\\) and CL-10\\.2 \\(LAB-10\\.8\\): past the limit, so the cadence holds only with the records$`).test(l)), verbose.join('\n'));
});

test('cadence: --json says which paths hold only with the records, and by how much', () => {
  const json = [];
  assert.equal(main(['--json'], { out: (s) => json.push(s) }), 0);
  const parsed = JSON.parse(json.join('\n'));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.findings.filter((f) => f.severity === 'warn' && f.check === 'cadence').map((f) => f.scope).sort(), ['builder', 'default']);
  for (const p of parsed.paths) {
    const rec = p.cadence.plannedRecords;
    assert.equal(rec.count, 2);
    assert.equal(rec.holdsOnlyWithThem, true);
    assert.deepEqual([rec.longestGapWithoutThem.from, rec.longestGapWithoutThem.to], ['CL-10.1', 'CL-10.2']);
    assert.ok(rec.longestGapWithoutThem.hours > 9.5 && rec.longestGapWithoutThem.lowEstimateHours < 9.5, JSON.stringify(rec));
    assert.ok(p.cadence.longestGaps[0].hours <= 9.5, 'the longest gap with the records is within two weeks');
  }
});

test('cadence: the warning is for a cadence that the records save, and for no other', () => {
  // records after the last pass sit where CL-10.2 is minted, so they split no gap: the cadence fails, and no warning is added
  const late = run({ edit: (b) => b.planned_records.forEach((x) => (x.after_pass = 9)) });
  assert.ok(has(fails(late, 'cadence'), 'CL-10.1 (LAB-10.7) to CL-10.2 (LAB-10.8)'), messages(fails(late)));
  assert.deepEqual(warns(late, 'cadence'), []);
  // a limit of three weeks holds without the records: nothing to say about them
  const roomy = run({ edit: (b) => (b.parameters.cadence.max_gap_weeks = 3) });
  assert.deepEqual(fails(roomy, 'cadence'), []);
  assert.deepEqual(warns(roomy, 'cadence'), []);
  assert.ok(roomy.paths.every((p) => p.cadence.records.count === 2 && p.cadence.records.needed === false));
  // one record after pass 4 splits the gap in two parts that fit: the warning then counts one record and says "it"
  const one = run({ edit: (b) => b.planned_records.pop() });
  assert.deepEqual(fails(one, 'cadence'), [], messages(fails(one, 'cadence')));
  assert.equal(warns(one, 'cadence').length, 2);
  assert.ok(warns(one, 'cadence').every((f) => f.message.startsWith('the cadence holds only by counting 1 planned record of LAB-10.8 that no claim template covers; without it, ') && f.message.includes('the spine rules out counting it (')), messages(warns(one, 'cadence')));
});

test('cadence: the spine sentence that the warning cites must still stand, and the records must come with it', () => {
  // the ruling is a quote that the gate re-checks like every other quote of the budget file
  const gone = run({ spine: spineWith('so it cannot count claims without a template', 'so it counts the records that a stage spec schedules') });
  assert.ok(has(fails(gone, 'table'), 'no longer says'), messages(fails(gone)));
  assert.ok(has(fails(gone, 'table'), 'GATE-budget plans the cadence from templates'), messages(fails(gone)));
  // and the warning does not cite a sentence that the spine no longer holds
  assert.equal(warns(gone, 'cadence').length, 2);
  assert.ok(warns(gone, 'cadence').every((f) => f.message.includes(`the spine no longer says what planned_records_ruling quotes (${budget0.planned_records_ruling.item}), so the ruling needs revisiting`) && !f.message.includes('rules out counting') && f.where === SPINE_PATH), messages(warns(gone, 'cadence')));
  // the S10 spec's request that the ruling answers is re-checked as well
  const spec = 'curriculum/S10-assembly.md';
  const reworded = run({ files: { ...files0, [spec]: files0[spec].replace("GATE-budget's cadence check must count them", "GATE-budget's cadence check may count them") } });
  assert.ok(has(fails(reworded, 'table'), 'budget.planned_records_ruling.asked_by quotes'), messages(fails(reworded)));
  // records without the ruling, or a ruling that is no item and quote, are not a plan the gate can describe
  assert.ok(has(fails(run({ edit: (b) => delete b.planned_records_ruling }), 'budget'), 'planned_records needs planned_records_ruling'));
  assert.ok(has(fails(run({ edit: (b) => (b.planned_records_ruling = { item: 'S10 issue 9' }) }), 'budget'), 'planned_records_ruling needs an item'));
  // no records, no ruling: nothing to cite (the cadence then fails on its own, as the test above shows)
  const none = run({ edit: (b) => { b.planned_records = []; delete b.planned_records_ruling; } });
  assert.deepEqual(fails(none, 'budget'), []);
  assert.deepEqual(warns(none, 'cadence'), []);
});

test('cadence: a second claim after week 4 fails, and a record after a pass that does not exist fails', () => {
  const late = run({ edit: (b) => (b.parameters.cadence.claims_by_week = 0.5) });
  assert.match(messages(fails(late, 'cadence')), new RegExp(`claim number 2, CL-1\\.4 \\(LAB-1\\.4\\), comes at ${H} h = ${H} weeks, after week 0\\.5`));
  const nopass = run({ edit: (b) => (b.planned_records[0].after_pass = 12) });
  assert.ok(has(fails(nopass, 'cadence'), 'planned record records-configured is after pass 12 of LAB-10.8, which has 9 passes'), messages(fails(nopass)));
});

test('cadence: a claim minted at a unit that is on no path fails; an override must name a claim', () => {
  const stray = run({ edit: (b) => (b.claim_mints['CL-9.2'].unit = 'LAB-9.99') });
  assert.ok(has(fails(stray, 'cadence'), 'CL-9.2 is minted in'), messages(fails(stray)));
  const unknown = run({ edit: (b) => (b.claim_mints['CL-99.9'] = { unit: 'S1.L1' }) });
  assert.ok(has(fails(unknown, 'cadence'), 'claim_mints names CL-99.9, which is no claim template'), messages(fails(unknown)));
  // the spine's own text says CL-9.2 is minted after LAB-9.6; at the last lab stage that its cell lists the gap is far longer
  const late = run({ edit: (b) => (b.claim_mints['CL-9.2'].unit = 'LAB-9.10') });
  assert.ok(has(fails(late, 'cadence'), 'SP-9.3 (S9.L4) to CL-9.2 (LAB-9.10)'), messages(fails(late)));
});

// ---------------------------------------------------------------- tools

test('tools: two new tools in a stage fail; so does a list that the spine does not give', () => {
  assert.ok(has(fails(run({ edit: (b) => (b.stages.S1.new_tools = ['Z3Py', 'Lean 4']) }), 'tools'), 'S1 introduces 2 new tools'));
  assert.ok(has(fails(run({ edit: (b) => (b.stages.S3.new_tools = ['Rust']) }), 'tools'), 'the spine gives S3 no new tool, content/stages/budget.yaml lists Rust'));
  assert.ok(has(fails(run({ edit: (b) => (b.stages.S6.new_tools = ['MySQL']) }), 'tools'), "S6's new tool is MySQL"));
  assert.ok(has(fails(run({ edit: (b) => (b.stages.S5.new_tools = []) }), 'tools'), 'the spine gives S5 a new tool'));
  const spine = spineWith("No new tool: Rust is the learner's existing language", "New tool: Rust is the learner's existing language");
  assert.ok(has(fails(run({ spine }), 'tools'), 'the spine gives S3 a new tool'));
});

// ---------------------------------------------------------------- paths

test('paths: a unit that no block takes, a unit taken twice and a reordered path fail', () => {
  const dropped = run({ edit: (b) => { b.paths.builder.blocks[2].take = b.paths.builder.blocks[2].take.filter((t) => t !== 'S6.L7'); } });
  assert.ok(fails(dropped, 'paths').length > 0, messages(fails(dropped)));
  assert.ok(fails(dropped, 'paths').every((f) => f.scope === 'builder'), 'the failure is scoped to the builder path');
  const twice = run({ edit: (b) => { b.paths.builder.blocks[7].take = ['S5.L9', 'S5.L8']; } });
  assert.ok(has(fails(twice, 'paths'), 'S5.L8 of S5 is taken twice on builder (block S5-late)'), messages(fails(twice)));
  const swapped = run({ edit: (b) => { const x = b.paths.builder.blocks; [x[4], x[5]] = [x[5], x[4]]; } });
  assert.ok(has(fails(swapped, 'paths'), 'the lessons of the builder path differ from spine section 3.0'), messages(fails(swapped)));
  const badRange = run({ edit: (b) => { b.paths.builder.blocks[1].take = ['S5.L1–S5.L99']; } });
  assert.ok(has(fails(badRange, 'paths'), 'S5.L99'), messages(fails(badRange)));
});

test('paths: the lab stages of the early S6 block must be the ones the spine assigns', () => {
  const r = run({ edit: (b) => { b.paths.builder.blocks[2].take.push('LAB-6.2'); } });
  assert.ok(has(fails(r, 'paths'), "the spine's early S6 block runs LAB-6.1, LAB-6.5, LAB-6.6"), messages(fails(r)));
});

test('paths: a keep-alive block, a Clearinghouse block that is no block, and a duplicate id fail', () => {
  assert.ok(has(fails(run({ edit: (b) => (b.paths.builder.lean_idle = ['S7', 'S6-lat']) }), 'paths'), 'lean_idle names S6-lat'));
  assert.ok(has(fails(run({ edit: (b) => (b.paths.builder.clearinghouse_after = 'S33') }), 'paths'), 'clearinghouse_after names S33'));
  assert.ok(has(fails(run({ edit: (b) => (b.paths.builder.blocks[4].id = 'S1') }), 'paths'), 'the block id S1 appears twice'));
});

// ---------------------------------------------------------------- the cut list

test('cutlist: every listed bridge is eligible, and the one eligible bridge left out is the spine\'s spare', () => {
  const r = run();
  assert.deepEqual(fails(r, 'cutlist'), []);
  const left = r.cutList.eligible.filter((id) => !r.cutList.listed.includes(id));
  assert.deepEqual(left, [r.cutList.spare]);
  assert.ok(r.cutList.listed.every((id) => r.cutList.eligible.includes(id)));
});

test('cutlist: a bridge that plants a seam, carries a threshold KC or is a sole lesson fails (1) to (4)', () => {
  const row = (n, bridge) => spine0.replace(new RegExp(`^\\| ${n} \\| S[0-9]+\\.L[0-9]+ \\|`, 'm'), `| ${n} | ${bridge} |`);
  const check = (spine, text) => assert.ok(has(fails(run({ spine }), 'cutlist'), text), messages(fails(run({ spine }), 'cutlist')));
  check(row(1, 'S3.L1'), 'S3.L1 is not cut-eligible: (2) it plants SEAM-6'); // S3.L1 plants SEAM-6
  check(row(9, 'S8.L1'), 'S8.L1 is not cut-eligible: (1) it carries the threshold KC KC-8.commit-not-send');
  check(row(3, 'S9.L9'), '(2) it cashes ER-10'); // S9.L9 cashes ER-10
  check(row(12, 'S7.L3'), '(3) it carries the outcome-core KC KC-7.policy-checking');
  check(row(8, 'S4.L3'), "(4) the only lesson for conditionals in S4's completion test");
});

test('cutlist: the counts that the spine states must follow the rule', () => {
  assert.ok(has(fails(run({ spine: spineWith('Twenty-one bridges qualify', 'Twenty bridges qualify') }), 'cutlist'), 'says 20 bridges qualify, the rule gives 21'));
  assert.ok(has(fails(run({ spine: spineWith('can fold exactly twenty into', 'can fold exactly nineteen into') }), 'cutlist'), 'the list folds 19 bridges, it lists 20'));
  assert.ok(has(fails(run({ spine: spineWith('S7.L1 (its KC to S7.L3) is the one spare.', 'S7.L2 (its KC to S7.L3) is the one spare.') }), 'cutlist'), 'the eligible bridges that the list leaves out are S7.L1, not only the spare S7.L2'));
  assert.ok(has(fails(run({ spine: spineWith('"bridge lessons beyond 30"', '"bridge lessons beyond 31"') }), 'cutlist'), 'leaves 30 of 50, not the 31 the spine says'));
});

test('cutlist: a receiving lesson that is itself cut, outside the stage or a step fails (5)', () => {
  const rowOf = (n, rest) => spine0.replace(new RegExp(`^(\\| ${n} \\| S[0-9]+\\.L[0-9]+ \\| ).*$`, 'm'), `$1${rest} |`);
  const cut = run({ spine: rowOf(1, 'S4.L1') });
  assert.ok(has(fails(cut, 'cutlist'), 'its receiving lesson S4.L1 is itself cut (row 8) and no fallback is named'), messages(fails(cut, 'cutlist')));
  const stage = run({ spine: rowOf(1, 'S5.L3') });
  assert.ok(has(fails(stage, 'cutlist'), 'S5.L3 is in S5, not in the stage of S4.L5'), messages(fails(stage, 'cutlist')));
  const kc = run({ spine: rowOf(1, 'S4.L8, which already teaches KC-4.cti-or-bug') });
  assert.ok(has(fails(kc, 'cutlist'), 'S4.L8 is said to teach KC-4.cti-or-bug'), messages(fails(kc, 'cutlist')));
  const fallback = run({ spine: spineWith('(S2.L7 once S2.L4 is cut)', '(S2.L1 once S2.L4 is cut)') });
  assert.ok(has(fails(fallback, 'cutlist'), 'its fallback S2.L1 is cut or is no lesson'), messages(fails(fallback, 'cutlist')));
});

test('cutlist: a cut that takes a stage below half of its lower bound warns until section 12 justifies it', () => {
  // S5 at 7 to 12 weeks has its line at 16.63 h, under its high estimate; cutting S5's bridges takes it below the line
  const planted = roadmapOf('S5', '7–12 wk');
  const wholly = (t) => t.replace('S6, S7 and S8 plan wholly below', 'S5, S6, S7 and S8 plan wholly below'); // the spine's sentence follows
  const r = run({ spine: wholly(planted.spine), edit: planted.edit });
  assert.deepEqual(warns(r, 'lower'), [], 'S5 itself is above the line');
  const w = warns(r, 'cutlist').filter((f) => /^cutting rows/.test(f.message));
  assert.equal(w.length, 1, messages(w));
  assert.match(w[0].message, new RegExp(`^cutting rows 1 to [0-9]+ \\(S5\\.L[0-9]+\\) takes S5's high estimate to ${H} h, below half of its roadmap lower bound \\(16\\.63 h\\); a section 12 justification must come first`));
  const d = withDecisions({ title: 'S5 and its lower bound.', body: 'Cutting S5 bridges takes S5 below half of the roadmap lower bound on purpose.' });
  const cleared = run({ spine: wholly(d.spine.replace(/^(\| S5 \|.*\| )[^|]+( \| pass \|)$/m, (_, a, b) => `${a}7–12 wk${b}`)), edit: (b) => { planted.edit(b); b.justifications = [{ stage: 'S5', item: d.first }]; } });
  assert.deepEqual(warns(cleared, 'cutlist').filter((f) => /^cutting rows/.test(f.message)), [], messages(warns(cleared)));
  assert.deepEqual(fails(cleared), [], messages(fails(cleared)));
});

test('cutlist: a KC that a cut folds ahead of its prerequisite on a path warns, until a section 12 item accepts it', () => {
  // plant the two folds that put a KC ahead of its hard prerequisite on the builder path, whatever the spine's rows say now:
  // S5.L9 (KC-5.inductive-invariant-tla, which needs S4's KC) into S5.L8, and S6.L5 (KC-6.enforce-at-commit) into S6.L2
  const row = (t, n, bridge, to) => t.replace(new RegExp(`^\\| ${n} \\| ${bridge.replace('.', '\\.')} \\| .*$`, 'm'), `| ${n} | ${bridge} | ${to} |`);
  const plant = (t) => row(row(t, 3, 'S5.L9', 'S5.L8'), 17, 'S6.L5', 'S6.L2');
  const spine = plant(spine0);
  const r = run({ spine });
  const w = warns(r, 'cutlist').filter((f) => /^cut list row/.test(f.message));
  assert.equal(w.length, 2, messages(w));
  assert.ok(w.every((f) => f.scope === 'builder'), 'the default path reaches S5.L8 and S6.L2 after S4');
  assert.match(w[0].message, /^cut list row 3: folding S5\.L9 into S5\.L8 puts KC-5\.inductive-invariant-tla at S5\.L8 before its hard prerequisite KC-4\.invariant-vs-inductive is taught \(at S4\.L4\) on the builder path/);
  assert.match(w[1].message, /^cut list row 17: folding S6\.L5 into S6\.L2 puts KC-6\.enforce-at-commit at S6\.L2 before its hard prerequisite KC-4\.prove-or-enforce is taught \(at S4\.L7\) on the builder path/);
  // a section 12 item that names the bridge and the path accepts the fold
  const d = withDecisions(
    { title: "Row 3 on the builder's path.", body: "S5.L9 stays a lesson on the builder's path." },
    { title: "Row 17 on the builder's path.", body: "S6.L5 stays a lesson on the builder's path." },
  );
  const accepted = [{ bridge: 'S5.L9', path: 'builder', item: d.first }, { bridge: 'S6.L5', path: 'builder', item: d.first + 1 }];
  const cleared = run({ spine: plant(d.spine), edit: (b) => (b.cut_list.accepted = accepted) });
  assert.deepEqual(warns(cleared, 'cutlist'), [], messages(warns(cleared)));
  assert.equal(notes(cleared, 'cutlist').filter((f) => /accepts it/.test(f.message)).length, 2);
  // an item that names neither the bridge nor the path accepts nothing
  const wrong = run({ spine: plant(d.spine), edit: (b) => (b.cut_list.accepted = [{ bridge: 'S5.L9', path: 'builder', item: d.first + 1 }]) });
  assert.ok(has(fails(wrong, 'cutlist'), `section 12 item ${d.first + 1} names no S5.L9 and no builder path`), messages(fails(wrong)));
  const stranger = run({ spine: plant(d.spine), edit: (b) => (b.cut_list.accepted = [{ bridge: 'S1.L1', path: 'builder', item: d.first }]) });
  assert.ok(has(fails(stranger, 'cutlist'), 'cut_list.accepted needs a listed bridge'), messages(fails(stranger)));
});

test('an unexpected table shape is a finding of the gate, never a crash', () => {
  const r = run({ spine: spine0.replace(/^(\| KC-4\.prove-or-enforce \|).*$/m, '$1 only one cell') });
  assert.ok(fails(r).length > 0);
  assert.ok(fails(r).every((f) => typeof f.message === 'string'));
  const noColumn = run({ spine: spine0.replace('| ID | Name | Stage | Threshold | Requires | Confusable with |', '| ID | Name | Stage | Threshold | Needs | Confusable with |') });
  assert.ok(Array.isArray(noColumn.findings));
});

// ---------------------------------------------------------------- additions

test('additions: an adopted addition names its displacement', () => {
  const i = budget0.additions.findIndex((a) => a.id === 'S2.L0');
  const none = run({ edit: (b) => (b.additions[i].displaces = null) });
  assert.ok(has(fails(none, 'additions'), 'the addition S2.L0 names no displacement'), messages(fails(none)));
  const empty = run({ edit: (b) => (b.additions[i].displaces = '') });
  assert.ok(has(fails(empty, 'additions'), 'the addition S2.L0 names no displacement'));
});

test('additions: what an addition says it displaces must have left the rows', () => {
  const i = budget0.additions.findIndex((a) => a.id === 'S2.L0');
  const planned = run({ edit: (b) => (b.additions[i].displaces_ids = ['LAB-3.1']) });
  assert.ok(has(fails(planned, 'additions'), 'S2.L0 says it displaces LAB-3.1, which is still a planned stage'), messages(fails(planned)));
  const nothing = run({ edit: (b) => (b.additions[i].displaces_ids = ['LAB-99.9']) });
  assert.ok(has(fails(nothing, 'additions'), 'LAB-99.9, which is no lab stage and no drawer'), messages(fails(nothing)));
  const stretchAdded = run({ edit: (b) => (b.additions[i].id = 'LAB-3.12') });
  assert.ok(fails(stretchAdded, 'additions').length > 0);
});

test('additions: headroom is no displacement for a stage over its bound; a waiting addition shows the room it needs', () => {
  const over = run({ spine: minutesOf('LAB-3.6', 20000) });
  assert.ok(has(fails(over, 'additions'), "LAB-3.6 is paid from S3's headroom, and S3 is over its roadmap bound"), messages(fails(over)));
  const waiting = notes(run(), 'additions').find((f) => /LAB-2\.9 would add/.test(f.message));
  assert.match(waiting.message, new RegExp(`LAB-2\\.9 would add 0\\.75–2\\.25 h to S2, which has ${H} h of room under its roadmap bound: it needs a named displacement`));
  const named = run({ edit: (b) => (b.additions.at(-1).displaces = 'a bridge') });
  assert.ok(has(fails(named, 'additions'), 'is marked waiting but names a displacement'));
  const bad = run({ edit: (b) => (b.additions.at(-1).status = 'maybe') });
  assert.ok(has(fails(bad, 'additions'), 'a status of adopted or waiting'));
});

// ---------------------------------------------------------------- the budget file and the spine themselves

test('budget: a missing stage, a missing parameter and an unreadable file fail loudly', () => {
  assert.ok(has(fails(run({ edit: (b) => delete b.stages.S3 }), 'budget'), 'stages.S3 is missing'));
  assert.ok(has(fails(run({ edit: (b) => delete b.parameters.keep_block_min }), 'budget'), 'parameters.keep_block_min'));
  assert.ok(has(fails(run({ edit: (b) => (b.stages.S2.rows.read = 3) }), 'budget'), 'stages.S2.rows needs'));
  const broken = checkBudget({ spine: spine0, budgetText: 'schema: [unclosed' });
  assert.ok(has(fails(broken, 'budget'), 'does not parse'));
  assert.ok(has(fails(run({ edit: (b) => (b.stages.S2.rows.total = 'about 20') }), 'rows'), 'is not a range of decimals'));
});

test('the spine: a table that no longer matches the extraction rules is a finding, not a silent gap', () => {
  const r = run({ spine: spine0.replace(/^\| KC-1\.claim-anatomy \|.*$/m, '| KC-1.claim-anatomy | only two cells |') });
  assert.ok(fails(r, 'spine').length > 0, messages(fails(r)));
});

// ---------------------------------------------------------------- the command line, on copies of the files

const cleanups = [];
process.on('exit', () => cleanups.forEach((fn) => fn()));
function withRoot(edit) {
  const root = mkdtempSync(join(tmpdir(), 'verify-budget-'));
  cleanups.push(() => rmSync(root, { recursive: true, force: true }));
  for (const path of [SPINE_PATH, BUDGET_PATH, ...citedFiles(budget0).filter((p) => p !== SPINE_PATH)]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    cpSync(join(REPO, path), join(root, path));
  }
  edit?.(root);
  const out = [];
  const err = [];
  const code = (args) => main(['--root', root, ...args], { out: (s) => out.push(s), err: (s) => err.push(s) });
  return { root, out, err, code };
}

test('main: --root reads a copy, and a warning fails only under --strict', () => {
  const t = withRoot((root) => {
    const planted = roadmapOf('S8', '30–60 wk');
    writeFileSync(join(root, SPINE_PATH), planted.spine);
    const text = readFileSync(join(root, BUDGET_PATH), 'utf8');
    const edited = text.replace(/(\n {2}S8:\n[\s\S]*?roadmap: ")[^"]*(")/, (_, a, b) => `${a}30–60 wk${b}`);
    assert.notEqual(edited, text);
    writeFileSync(join(root, BUDGET_PATH), edited);
  });
  assert.equal(t.code([]), 0);
  assert.ok(t.out.some((l) => new RegExp(`^ {2}WARN {2}lower {2}S8: the high estimate ${H} h is below half`).test(l)), t.out.join('\n'));
  assert.match(t.out.at(-1), /^GATE-budget: green \([0-9]+ warnings\)/);
  assert.equal(t.code(['--strict']), 1);
});

test('main: the cadence warning keeps the gate green, and under --strict it fails the gate when it is the only warning left', () => {
  // accept the two cut-list folds of the builder path with section 12 items, so that the cadence warnings are all that is left
  const d = withDecisions(
    { title: "Row 3 on the builder's path.", body: "S5.L9 stays a lesson on the builder's path." },
    { title: "Row 17 on the builder's path.", body: "S6.L5 stays a lesson on the builder's path." },
  );
  const t = withRoot((root) => {
    writeFileSync(join(root, SPINE_PATH), d.spine);
    const text = readFileSync(join(root, BUDGET_PATH), 'utf8');
    const edited = text.replace('  accepted: []', `  accepted:\n    - {bridge: S5.L9, path: builder, item: ${d.first}}\n    - {bridge: S6.L5, path: builder, item: ${d.first + 1}}`);
    assert.notEqual(edited, text);
    writeFileSync(join(root, BUDGET_PATH), edited);
  });
  assert.equal(t.code([]), 0);
  const warned = t.out.filter((l) => /^\s*WARN /.test(l));
  assert.equal(warned.length, 2, t.out.join('\n'));
  assert.ok(warned.every((l) => /^ {2}WARN {2}cadence {2}the cadence holds only by counting 2 planned records of LAB-10\.8 /.test(l)), warned.join('\n'));
  assert.match(t.out.at(-1), /^GATE-budget: green \(2 warnings\)/);
  assert.equal(t.code(['--strict']), 1, 'a warning that the owner has not decided fails the strict lane');
});

test('main: a missing file is exit 2, an unparseable one is exit 2, a failing plan is exit 1', () => {
  const missing = withRoot((root) => rmSync(join(root, BUDGET_PATH)));
  assert.equal(missing.code([]), 2);
  assert.match(missing.err.join('\n'), /cannot read content\/stages\/budget\.yaml/);
  const broken = withRoot((root) => writeFileSync(join(root, BUDGET_PATH), 'schema: [unclosed\n'));
  assert.equal(broken.code([]), 2);
  const failing = withRoot((root) => writeFileSync(join(root, SPINE_PATH), readFileSync(join(root, SPINE_PATH), 'utf8').replace('about 2 minutes per review', 'about 3 minutes per review')));
  assert.equal(failing.code([]), 1);
  assert.match(failing.out.join('\n'), /FAIL {2}table/);
  assert.equal(failing.code(['--bogus']), 2);
});
