// Tests of the specimen cabinet's builder (W1-T16): that the committed cabinet is what content/specimens/ and runs/
// build, that the ten records of SP-1.1 to SP-1.10 are in it with the lines of the runs they were drawn from, and that each
// kind of fault a record can have is a finding. The faults are planted in a copy of the tree under a scratch directory; the
// repository is never written.
//
//   node --test scripts/spikes/W1-T16/cabinet.test.mjs

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { REPO } from '../../runs/registry.mjs';
import { CABINET_PATH, RECORDS_DIR, buildCabinet, cabinetText, spineSpecimens } from './lib/cabinet.mjs';

const BUILD = path.join(REPO, 'scripts', 'spikes', 'W1-T16', 'build-cabinet.mjs');
const SCRATCH = process.env.W1T16_SCRATCH ?? os.tmpdir();

/** A copy of what the builder reads, under a scratch directory that is removed when the test ends. */
function scratchTree(t) {
  const root = fs.mkdtempSync(path.join(SCRATCH, 'w1t16-cabinet-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const file of ['packages/ids/src/registry.json', 'docs/spine/SPINE.md', 'content/glossary.yaml', CABINET_PATH]) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(path.join(REPO, file), path.join(root, file));
  }
  fs.mkdirSync(path.join(root, 'runs'));
  for (const f of fs.readdirSync(path.join(REPO, 'runs'))) if (/^RUN-.*\.json$/.test(f)) fs.copyFileSync(path.join(REPO, 'runs', f), path.join(root, 'runs', f));
  fs.cpSync(path.join(REPO, RECORDS_DIR), path.join(root, RECORDS_DIR), { recursive: true });
  return root;
}

const read = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const write = (root, rel, value) => fs.writeFileSync(path.join(root, rel), `${JSON.stringify(value, null, 2)}\n`);

/** Plant a fault in one record of a scratch tree and build: the findings. */
function planted(t, id, mutate) {
  const root = scratchTree(t);
  const rel = `${RECORDS_DIR}/${id}.json`;
  const record = read(root, rel);
  mutate(record);
  write(root, rel, record);
  return buildCabinet(root);
}

/** The findings, each of which must be about the one record the fault is in: a fault in one record is not a finding about another. */
function findings(result, id) {
  assert.ok(result.problems.length > 0, 'the fault is a finding');
  for (const p of result.problems) assert.ok(p.startsWith(`${RECORDS_DIR}/${id}.json: `), `a finding of another record: ${p}`);
  return result.problems.join('\n');
}

// ------------------------------------------------------------------ the committed cabinet

test('the committed cabinet is what content/specimens/ and runs/ build, and the build has no finding', () => {
  const { cabinet, problems } = buildCabinet(REPO);
  assert.deepEqual(problems, []);
  assert.equal(fs.readFileSync(path.join(REPO, CABINET_PATH), 'utf8'), cabinetText(cabinet), `${CABINET_PATH} is stale: run node scripts/spikes/W1-T16/build-cabinet.mjs and review the diff`);
});

test('SP-1.1 to SP-1.10 are in the cabinet, in order, one record each, with a run behind every one', () => {
  const { cabinet } = buildCabinet(REPO);
  assert.deepEqual(cabinet.specimens.map((e) => e.record.id), Array.from({ length: 10 }, (_, i) => `SP-1.${i + 1}`));
  assert.deepEqual(cabinet.stages.map((s) => s.id), ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']);
  for (const e of cabinet.specimens) {
    assert.match(e.rev, /^[0-9a-f]{64}$/, `${e.record.id} has the hash of its record`);
    assert.ok(Object.keys(e.evidence.runs).length >= 1, `${e.record.id} names a run`);
    assert.ok(e.record.kcs.every((kc) => typeof e.kcNames[kc] === 'string' && e.kcNames[kc] !== ''), `${e.record.id}: every KC has its name`);
  }
});

test('every line a label is drawn from is a line of the run record it names, verbatim', () => {
  const { cabinet } = buildCabinet(REPO);
  const runLines = (id) => JSON.parse(fs.readFileSync(path.join(REPO, 'runs', `${id}.json`), 'utf8')).verdict_lines;
  for (const e of cabinet.specimens) {
    const ev = e.evidence;
    const blocks = [ev.main, ev.main.premise, ev.main.replay, ...ev.also, ...ev.also.map((a) => a.replay), ev.minimal.block, ev.minimal.confirm].filter((b) => b !== undefined && b !== null);
    assert.ok(blocks.length >= 1);
    for (const b of blocks) for (const line of b.lines) assert.ok(runLines(b.run).includes(line), `${e.record.id}: ${JSON.stringify(line)} is not a line of ${b.run}`);
  }
});

test('the spine names each course specimen with its lesson, and a dated incident is marked in both places', () => {
  const rows = spineSpecimens(REPO);
  const { cabinet } = buildCabinet(REPO);
  for (const e of cabinet.specimens) {
    const row = rows.get(e.record.id);
    assert.ok(row, `${e.record.id} is a row of the spine's table`);
    assert.equal(e.record.found_in.lesson, row.lesson);
    assert.equal(e.record.incident !== undefined, row.dated, `${e.record.id}: the dated-incident mark`);
  }
  assert.deepEqual(cabinet.specimens.filter((e) => e.record.incident !== undefined).map((e) => e.record.id), ['SP-1.9', 'SP-1.10']);
});

// ------------------------------------------------------------------ what the builder refuses

test('a query that no verdict line of the run begins with is a finding', (t) => {
  const text = findings(planted(t, 'SP-1.1', (r) => (r.evidence.main.query = 'no such query')), 'SP-1.1');
  assert.match(text, /evidence\.main: RUN-z3-starter: no verdict line of the run begins with the query "no such query"/);
});

test('a label is never typed: a stamp, a tool version or a status written into a record is not specimen@1', (t) => {
  for (const [key, value] of [['stamp', 'REFUTED [R]'], ['tool_version', 'z3@5.3.1'], ['status', 'kept'], ['mounted_on', '2026-11-02']]) {
    const text = findings(planted(t, 'SP-1.1', (r) => (r[key] = value)), 'SP-1.1');
    assert.match(text, /not specimen@1: \/ additionalProperties/, key);
  }
});

test('a title that is not the spine\'s words for the specimen is a finding', (t) => {
  const text = findings(planted(t, 'SP-1.3', (r) => (r.title = 'A refund rule that is fine')), 'SP-1.3');
  assert.match(text, /the title "A refund rule that is fine" is not in the spine's words for the specimen/);
});

test('a dated-incident mark that the spine and the record do not share is a finding, in either direction', (t) => {
  assert.match(findings(planted(t, 'SP-1.9', (r) => delete r.incident), 'SP-1.9'), /the spine marks it a dated incident and the record has no incident/);
  const incident = { date: '2010-08-15', source: { title: 'A source', url: 'https://example.org/a' }, toy_model: true };
  assert.match(findings(planted(t, 'SP-1.1', (r) => (r.incident = incident)), 'SP-1.1'), /the record has an incident and the spine does not mark the specimen a dated incident/);
});

test('a run the spine names behind the specimen, which the record never cites, is a finding', (t) => {
  const text = findings(planted(t, 'SP-1.4', (r) => delete r.evidence.also), 'SP-1.4');
  assert.match(text, /the spine names RUN-z3-bv64-pyodide behind the specimen and the record does not cite it/);
});

test('a lesson other than the spine\'s, a mount rule on something that is not a lesson, and a KC that is not in the graph are findings', (t) => {
  assert.match(findings(planted(t, 'SP-1.1', (r) => (r.found_in.lesson = 'S1.L2')), 'SP-1.1'), /found_in\.lesson is S1\.L2, and the spine's table gives S1\.L1/);
  assert.match(findings(planted(t, 'SP-1.1', (r) => (r.mount.lessons = ['S1.L0', 'S1.L99'])), 'SP-1.1'), /mount\.lessons names S1\.L99, which is not a lesson/);
  assert.match(findings(planted(t, 'SP-1.1', (r) => (r.kcs = ['KC-1.no-such-idea'])), 'SP-1.1'), /KC-1\.no-such-idea is not a KC of the graph/);
});

test('a file named for another record, a course id the spine does not have, and the same id twice are findings', (t) => {
  const root = scratchTree(t);
  const record = read(root, `${RECORDS_DIR}/SP-1.1.json`);
  write(root, `${RECORDS_DIR}/SP-1.11.json`, record);
  const text = buildCabinet(root).problems.join('\n');
  assert.match(text, /SP-1\.11\.json: the file is named for SP-1\.11, and the record's id is SP-1\.1/);
  assert.match(text, /SP-1\.1 is mounted twice/);

  const root2 = scratchTree(t);
  write(root2, `${RECORDS_DIR}/SP-1.11.json`, { ...record, id: 'SP-1.11' });
  assert.match(buildCabinet(root2).problems.join('\n'), /SP-1\.11 is not a specimen of the spine's table 5\.1/);
});

test('a record that is not JSON is a finding, and the others are still built', (t) => {
  const root = scratchTree(t);
  fs.writeFileSync(path.join(root, RECORDS_DIR, 'SP-1.5.json'), '{ "schema": ');
  const { problems, cabinet } = buildCabinet(root);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^content\/specimens\/SP-1\.5\.json: not JSON: /);
  assert.equal(cabinet.specimens.length, 9);
});

test('a specimen that is not a course specimen has no mount rule: its own lab check mounts it', (t) => {
  const root = scratchTree(t);
  const lab = read(REPO, 'schemas/fixtures/specimen/valid/learner-lab-specimen.json');
  write(root, `${RECORDS_DIR}/${lab.id}.json`, { ...lab, mount: { lessons: ['S1.L1'] } });
  assert.match(buildCabinet(root).problems.join('\n'), /a specimen that is not a course specimen has no mount rule/);
  write(root, `${RECORDS_DIR}/${lab.id}.json`, lab);
  assert.deepEqual(buildCabinet(root).problems, []);
  // the lab stage that found it is a stage of the registry
  write(root, `${RECORDS_DIR}/${lab.id}.json`, { ...lab, found_in: { lab_stage: 'LAB-99.9' } });
  assert.match(buildCabinet(root).problems.join('\n'), /found_in\.lab_stage LAB-99\.9 is not a lab stage/);
});

test('a run that is not recorded, a witness that does not replay and a replay of another witness are findings', (t) => {
  const missing = scratchTree(t);
  fs.rmSync(path.join(missing, 'runs', 'RUN-z3-starter.json'));
  assert.match(buildCabinet(missing).problems.join('\n'), /RUN-z3-starter is not recorded \(runs\/RUN-z3-starter\.json is not there\)/);

  const failed = scratchTree(t);
  const replay = read(failed, 'runs/RUN-specimens-replay.json');
  replay.verdict_lines = replay.verdict_lines.map((l) => l.replace('replay ok:', 'replay FAILED:'));
  write(failed, 'runs/RUN-specimens-replay.json', replay);
  assert.match(buildCabinet(failed).problems.join('\n'), /RUN-specimens-replay "sp_1_1_starter" does not say "replay ok"/);

  const other = scratchTree(t);
  const starter = read(other, 'runs/RUN-z3-starter.json');
  starter.verdict_lines = starter.verdict_lines.map((l) => l.replace('amount = 1', 'amount = 2'));
  write(other, 'runs/RUN-z3-starter.json', starter);
  assert.match(buildCabinet(other).problems.join('\n'), /the replay of RUN-specimens-replay "sp_1_1_starter" checks amount = 1, and the witness has amount = 2/);
});

test('a minimal claim on a query that did not run under Optimize, or one that is not a sat, is a finding', (t) => {
  // the run's line loses its mention of Optimize: Z3's witness is minimal only under an Optimize objective
  const plain = scratchTree(t);
  const optimize = read(plain, 'runs/RUN-z3-optimize-min.json');
  optimize.verdict_lines = optimize.verdict_lines.map((l) => l.replace('[S1.2 minimal amount via Optimize]', '[S1.2 smallest amount]'));
  write(plain, 'runs/RUN-z3-optimize-min.json', optimize);
  const record = read(plain, `${RECORDS_DIR}/SP-1.1.json`);
  record.evidence.minimal.query = 'S1.2 smallest amount';
  write(plain, `${RECORDS_DIR}/SP-1.1.json`, record);
  assert.match(buildCabinet(plain).problems.join('\n'), /evidence\.minimal: RUN-z3-optimize-min "S1\.2 smallest amount" does not say it ran under an Optimize objective/);

  // the main query of SP-1.1 is a sat, and its confirming query is the unsat: a minimum cannot rest on the unsat
  const unsat = planted(t, 'SP-1.2', (r) => {
    r.evidence.minimal.query = r.evidence.minimal.confirm;
    delete r.evidence.minimal.confirm;
  });
  assert.match(findings(unsat, 'SP-1.2'), /evidence\.minimal: RUN-z3-double-capture "[^"]+" is not a sat, so it holds no minimum/);
});

test('a value reference in a record\'s words is a finding: the label reads values from the lines it shows', (t) => {
  const text = findings(planted(t, 'SP-1.1', (r) => (r.because = 'The balance is {{run:RUN-z3-starter#values.amount}}.')), 'SP-1.1');
  assert.match(text, /a value reference \(\{\{run:RUN-id#values\.name\}\}\) is not used in a specimen record/);
});

test('a lesson that mounts a specimen the record does not name is a note, never a finding', (t) => {
  const root = scratchTree(t);
  fs.mkdirSync(path.join(root, 'content', 'stages', 'S1'), { recursive: true });
  fs.writeFileSync(path.join(root, 'content', 'stages', 'S1', 'S1.L1.md'), '# A lesson\n\n::specimen id=SP-1.4\n');
  const { problems, warnings } = buildCabinet(root);
  assert.deepEqual(problems, []);
  assert.ok(warnings.some((w) => /S1\.L1 mounts SP-1\.4 \(::specimen\), and the record's mount\.lessons are S1\.L5/.test(w)), warnings.join('\n'));
  assert.ok(warnings.some((w) => /the record mounts SP-1\.1 in S1\.L1, and S1\.L1\.md has no ::specimen id=SP-1\.1 block/.test(w)), warnings.join('\n'));
});

test('an internal name in a record\'s words is a finding: the glossary\'s own list is the rule, in every line a label shows', (t) => {
  // Boot is the tier name learners see as "Start here" (the caption that shipped with it in round 0)
  const caption = findings(planted(t, 'SP-1.1', (r) => (r.evidence.also[0].caption = "Boot's variant, where the guard reads the recipient's balance, has a witness too.")), 'SP-1.1');
  assert.match(caption, /evidence\.also\[0\]\.caption: "Boot" is an internal name \(Boot\); learners see Start here/);
  // each line of the record that the label shows is read, and a tier name, KC, lane and a knowledge component's ID are all internal
  const lines = [
    ['title', 'The overdraft, a core lesson'],
    ['violates', 'The balance stays non-negative for every KC.'],
    ['because', 'The transfer runs in the other lane.'],
    ['class', 'a witness the pocket checker accepts'],
    ['cured_by.text', 'Guard the debit, as KC-1.violation-as-sat asks.'],
  ];
  for (const [field, text] of lines) {
    const out = findings(planted(t, 'SP-1.1', (r) => (field === 'cured_by.text' ? (r.cured_by.text = text) : (r[field] = text))), 'SP-1.1');
    assert.match(out, new RegExp(`${field.replace('.', '\\.')}: .*(internal name|ID of the course's machinery)`), field);
  }
  // the dated incident's source title and a minimal claim's reason are shown too
  assert.match(findings(planted(t, 'SP-1.9', (r) => (r.incident.source.title = 'The Boot docket')), 'SP-1.9'), /incident\.source\.title: "Boot" is an internal name/);
  assert.match(findings(planted(t, 'SP-1.7', (r) => (r.evidence.minimal.why = 'a verdict is not a KC')), 'SP-1.7'), /evidence\.minimal\.why: "KC" is an internal name \(KC\)/);
  // a word that holds one is not one, and the words learners are given pass
  assert.deepEqual(planted(t, 'SP-1.1', (r) => (r.class = 'a bootstrap overdraft, from Start here')).problems, []);
  // a tree with no glossary of its own reads this repository's (as GATE-lessons' --root does), so the words are held to it all the same
  const root = scratchTree(t);
  fs.rmSync(path.join(root, 'content', 'glossary.yaml'));
  assert.deepEqual(buildCabinet(root).problems, []);
  const record = read(root, `${RECORDS_DIR}/SP-1.1.json`);
  record.evidence.also[0].caption = "Boot's variant, where the guard reads the recipient's balance.";
  write(root, `${RECORDS_DIR}/SP-1.1.json`, record);
  assert.match(buildCabinet(root).problems.join('\n'), /"Boot" is an internal name \(Boot\); learners see Start here/);
  // a glossary of its own that lists no internal name is refused, never read as "nothing is internal"
  fs.writeFileSync(path.join(root, 'content', 'glossary.yaml'), 'format: glossary/1\nterms: []\n');
  assert.match(buildCabinet(root).problems.join('\n'), /content\/glossary\.yaml: content\/glossary\.yaml has no `internal` list/);
});

test('a witness length that the record states wrongly, or leaves out over a witness of several steps, is a finding', (t) => {
  assert.match(findings(planted(t, 'SP-1.2', (r) => (r.evidence.main.steps = 5)), 'SP-1.2'), /evidence\.main\.steps: the record states a witness of 5 steps, and the witness of RUN-z3-double-capture "at_most_once_buggy" has 2 steps/);
  assert.match(findings(planted(t, 'SP-1.2', (r) => delete r.evidence.main.steps), 'SP-1.2'), /evidence\.main\.steps: the witness of RUN-z3-double-capture "at_most_once_buggy" has 2 steps .* the record states no length: state steps: 2/);
  assert.match(findings(planted(t, 'SP-1.1', (r) => (r.evidence.main.steps = 2)), 'SP-1.1'), /states a witness of 2 steps, and the witness of RUN-z3-starter .* has 1 step /);
  // the controls: the length the witness has, stated for one transfer too
  assert.deepEqual(planted(t, 'SP-1.1', (r) => (r.evidence.main.steps = 1)).problems, []);
  // and no label of the cabinet takes its length from the record: the cabinet holds none
  const { cabinet } = buildCabinet(REPO);
  assert.ok(cabinet.specimens.every((e) => !('steps' in e.evidence.main)));
});

test('a minimal claim names the objective that was minimized: another one would show a value that no Optimize query reached', (t) => {
  assert.match(findings(planted(t, 'SP-1.2', (r) => (r.evidence.minimal.objective = 'held')), 'SP-1.2'), /evidence\.minimal: RUN-z3-double-capture "minimize_hold" prints the minimum of h, and the record names the objective held/);
  assert.match(findings(planted(t, 'SP-1.3', (r) => (r.evidence.minimal.objective = 'r')), 'SP-1.3'), /prints the minimum of minted, and the record names the objective r/);
  // SP-1.1's query is the W0 harness's, which prints the model alone: its name, "S1.2 minimal amount via Optimize", is what says what it minimized
  assert.match(findings(planted(t, 'SP-1.1', (r) => (r.evidence.minimal.objective = 'a')), 'SP-1.1'), /prints no minimum, the run records no objective for it and the query's name does not mention a: nothing in the run says it minimized a/);
  assert.deepEqual(planted(t, 'SP-1.1', (r) => (r.evidence.minimal.objective = 'amount')).problems, []);
});

test('a record names where it is mounted and what mints from its fix: a mount rule that leaves out the lesson that finds it, none at all, a dated incident that is not a toy, and a claim the registry lacks are findings', (t) => {
  assert.match(findings(planted(t, 'SP-1.3', (r) => (r.mount.lessons = ['S2.L1'])), 'SP-1.3'), /mount\.lessons are S2\.L1 and leave out S1\.L4, the lesson of the spine's table/);
  assert.match(findings(planted(t, 'SP-1.3', (r) => delete r.mount), 'SP-1.3'), /a course specimen has a mount rule: without one no learner is ever shown it/);
  assert.match(findings(planted(t, 'SP-1.3', (r) => (r.cured_by.claim = 'CL-9.9')), 'SP-1.3'), /cured_by\.claim CL-9\.9 is not a claim template of the registry/);
  assert.match(findings(planted(t, 'SP-1.9', (r) => (r.incident.toy_model = false)), 'SP-1.9'), /incident\.toy_model is not true: a dated incident is kept as a toy model/);
  // the controls: SP-1.1 is found in S1.L1 and mounted by Boot's first call too
  assert.deepEqual(planted(t, 'SP-1.1', (r) => (r.mount.lessons = ['S1.L1'])).problems, []);
});

test('a file in content/specimens/ that is not a JSON record is a finding: GATE-specimens would count it as mounted and the cabinet would never show it', (t) => {
  const root = scratchTree(t);
  fs.writeFileSync(path.join(root, RECORDS_DIR, 'SP-1.11.yaml'), 'schema: statespace/specimen@1\nid: SP-1.11\n');
  fs.writeFileSync(path.join(root, RECORDS_DIR, 'notes.txt'), 'a note');
  fs.mkdirSync(path.join(root, RECORDS_DIR, 'old'));
  fs.writeFileSync(path.join(root, RECORDS_DIR, '.DS_Store'), 'a file of the machine');
  const out = buildCabinet(root).problems.join('\n');
  assert.match(out, /content\/specimens\/SP-1\.11\.yaml: a record is a JSON file named for its id/);
  assert.match(out, /content\/specimens\/notes\.txt: a record is a JSON file/);
  assert.match(out, /content\/specimens\/old: a record is a JSON file/);
  assert.ok(!/README\.md/.test(out), 'the README is the one file that is not a record');
  assert.ok(!/DS_Store/.test(out), 'a file of the machine is not a finding');
});

// ------------------------------------------------------------------ the command

const run = (...argv) => spawnSync(process.execPath, [BUILD, ...argv], { cwd: REPO, encoding: 'utf8' });

test('build-cabinet --check passes on the repository, --json prints exactly the committed file, and an unknown flag is refused', () => {
  const check = run('--check');
  assert.equal(check.status, 0, check.stderr);
  assert.match(check.stdout, /is what 10 records and their runs build/);
  const json = run('--json');
  assert.equal(json.status, 0, json.stderr);
  assert.equal(json.stdout, fs.readFileSync(path.join(REPO, CABINET_PATH), 'utf8'));
  const bad = run('--frobnicate');
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /unknown argument --frobnicate/);
});

test('a build that cannot run exits 2, with a reason, and writes nothing: no registry under the root, and a --root with no directory', (t) => {
  const empty = fs.mkdtempSync(path.join(SCRATCH, 'w1t16-empty-'));
  t.after(() => fs.rmSync(empty, { recursive: true, force: true }));
  const none = run('--root', empty);
  assert.equal(none.status, 2);
  assert.match(none.stderr, /build-cabinet: could not run under the given root: /);
  assert.deepEqual(fs.readdirSync(empty), [], 'nothing is written under a root that cannot be read');
  const bare = run('--root');
  assert.equal(bare.status, 2);
  assert.match(bare.stderr, /--root needs a directory/);
  assert.equal(run('--root', '--check').status, 2);
});

test('build-cabinet --check fails on a stale file; a build with a finding writes nothing; a clean build writes the file', (t) => {
  const root = scratchTree(t);
  const file = path.join(root, CABINET_PATH);
  const committed = fs.readFileSync(file, 'utf8');

  fs.writeFileSync(file, committed.replace('"The overdraft"', '"The overdraft, edited by hand"'));
  const stale = run('--check', '--root', root);
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /differs from what content\/specimens\/ and runs\/ build/);

  const record = read(root, `${RECORDS_DIR}/SP-1.1.json`);
  record.evidence.main.query = 'no such query';
  write(root, `${RECORDS_DIR}/SP-1.1.json`, record);
  const before = fs.readFileSync(file, 'utf8');
  const faulty = run('--root', root);
  assert.equal(faulty.status, 1);
  assert.match(faulty.stderr, /1 finding; nothing written/);
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'a build with a finding writes nothing');

  record.evidence.main.query = '1.2 starter: overdraft search';
  write(root, `${RECORDS_DIR}/SP-1.1.json`, record);
  const clean = run('--root', root);
  assert.equal(clean.status, 0, clean.stderr);
  assert.equal(fs.readFileSync(file, 'utf8'), committed, 'the clean build writes the committed file back');
});
