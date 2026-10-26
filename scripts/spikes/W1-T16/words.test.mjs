// The internal-name guard of the specimen cabinet (lib/learner-words.mjs): it reads the glossary and holds a record's words,
// and the screen's, to its `internal` names and `internalIds` kinds. The tests plant every name and form the glossary lists, and
// every ID kind it lists, so that a name the glossary gains is covered the day it lands, and a guard weakened to a hand-written
// list (the round-0 test left out Boot, KC and the tier names) fails here.
//
//   node --test scripts/spikes/W1-T16/words.test.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import { KINDS } from '../../../packages/ids/src/grammar.ts';
import { REPO } from '../../runs/registry.mjs';
import { RECORDS_DIR } from './lib/cabinet.mjs';
import { GLOSSARY, compileGlossary, internalFindings, learnerWords, readGlossary } from './lib/learner-words.mjs';

const doc = parse(fs.readFileSync(path.join(REPO, GLOSSARY), 'utf8'));
const { glossary, problem } = readGlossary(REPO);

test('the glossary is read from content/glossary.yaml, with every internal name and ID kind it lists', () => {
  assert.equal(problem, undefined);
  assert.deepEqual(glossary.internal.map((x) => x.name), doc.internal.map((x) => x.name));
  assert.deepEqual([...glossary.internalIds], doc.internalIds);
  // the names the spine's section 0 lists as internal are in it, whatever else the glossary adds
  for (const name of ['lane', 'Shelf', 'docket', 'pocket checker', 'telescope', 'Hall of Records', 'proof debt', 'Judgment', 'Boot', 'tier', 'KC']) assert.ok(glossary.internal.some((x) => x.name === name), name);
});

test('every form of every internal name is found in a sentence, with the name and what learners see instead', () => {
  let forms = 0;
  for (const x of doc.internal) {
    for (const form of x.forms ?? [x.name]) {
      forms += 1;
      const found = internalFindings(`The ${form} stays out of the label.`, glossary);
      assert.ok(found.some((f) => f.rule === `internal/${x.name}`), `${form} (${x.name}) is not found`);
      assert.ok(found.some((f) => f.detail.includes(`learners see ${x.say}`)), `${form}: the finding says what learners see`);
    }
  }
  assert.ok(forms >= 20, `${forms} forms were planted`);
  // the finding says what GATE-lessons says
  assert.deepEqual(internalFindings("Boot's variant", glossary).map((f) => f.detail), ['"Boot" is an internal name (Boot); learners see Start here']);
});

test('matching is the glossary\'s: whole words, case ignored unless the entry says otherwise, a space also a hyphen or a line wrap', () => {
  for (const x of doc.internal) {
    for (const form of x.forms ?? [x.name]) {
      const lower = internalFindings(`a ${form.toLowerCase()} here`, glossary).some((f) => f.rule === `internal/${x.name}`);
      const upper = internalFindings(`a ${form.toUpperCase()} here`, glossary).some((f) => f.rule === `internal/${x.name}`);
      if (x.caseSensitive === true) assert.ok(form === form.toLowerCase() || !lower, `${form}: a case-sensitive form is not found in lower case`);
      else assert.ok(lower && upper, `${form}: found in any case`);
    }
  }
  assert.equal(internalFindings('the Hall-of-Records filter', glossary).length, 1);
  assert.equal(internalFindings('the Hall of\n  Records filter', glossary).length, 1);
  assert.equal(internalFindings('a plain bootstrap, a kcal, the laneway and shelfware', glossary).length, 0);
  assert.equal(internalFindings('boot', glossary).length, 0, 'Boot is a case-sensitive name: the verb is not it');
});

test('an ID of a kind the glossary lists is found, and a run, lesson, claim or specimen ID, which a label shows, is not', () => {
  for (const kind of doc.internalIds) {
    const example = KINDS.find((k) => k.kind === kind)?.example;
    assert.ok(example, `${kind} is a kind of the ID grammar`);
    assert.ok(internalFindings(`See ${example} for it.`, glossary).some((f) => f.rule === `internal/id-${kind}`), `${example} (${kind}) is not found`);
  }
  assert.equal(internalFindings('Guard the debit, as KC-1.violation-as-sat asks.', glossary).some((f) => f.rule === 'internal/id-kc'), true);
  for (const shown of ['RUN-z3-starter', '{{run:RUN-z3-starter}}', 'S1.L1', 'CL-1.1', 'SP-1.1', 'LAB-1.3', 'D-03']) assert.deepEqual(internalFindings(`See ${shown}.`, glossary), [], shown);
});

test('the words learners are given pass: Start here, idea, full lesson, and a sentence of a record', () => {
  for (const ok of ['Start here', 'The same idea, again.', 'A full lesson and a short lesson with reading.', 'The variant from Start here, where the guard reads the recipient\'s balance, has a witness too, and it replays.']) assert.deepEqual(internalFindings(ok, glossary), [], ok);
});

test('a glossary with no internal list is refused, and a missing file or one that does not parse is a problem and never a pass', () => {
  assert.throws(() => compileGlossary({ terms: [] }), /has no `internal` list/);
  assert.throws(() => compileGlossary({ internal: [] }), /has no `internal` list/);
  assert.throws(() => compileGlossary({ internal: [{ forms: ['x'] }] }), /internal\[0\] has no name/);
  const nowhere = path.join(REPO, 'no', 'such', 'root');
  assert.match(readGlossary(nowhere, nowhere).problem, /is not there/);
  assert.equal(readGlossary(nowhere).problem, undefined, 'a tree with none reads this repository\'s');
  // a name with no forms is its own form, and an entry without caseSensitive is case-folded
  const g = compileGlossary({ internal: [{ name: 'Gizmo', say: 'the tool' }], internalIds: [] });
  assert.equal(internalFindings('a gizmo', g).length, 1);
});

test('the words of a record that a label shows are listed with where they stand, and only the strings among them', () => {
  const record = JSON.parse(fs.readFileSync(path.join(REPO, RECORDS_DIR, 'SP-1.9.json'), 'utf8'));
  const words = learnerWords(record);
  assert.deepEqual(words.map(([where]) => where), ['title', 'violates', 'because', 'class', 'cured_by.text', 'evidence.also[0].caption', 'evidence.minimal.why', 'incident.source.title']);
  const withAlso = learnerWords(JSON.parse(fs.readFileSync(path.join(REPO, RECORDS_DIR, 'SP-1.1.json'), 'utf8')));
  assert.deepEqual(withAlso.filter(([where]) => where.startsWith('evidence.also')).map(([where]) => where), ['evidence.also[0].caption', 'evidence.also[1].caption']);
  assert.deepEqual(learnerWords({ title: 'x', cured_by: {}, evidence: { minimal: {} } }), [['title', 'x']]);
});

test('the ten records of the cabinet, and every record in content/specimens/, hold no internal name', () => {
  const files = fs.readdirSync(path.join(REPO, RECORDS_DIR)).filter((f) => f.endsWith('.json'));
  assert.ok(files.length >= 10);
  for (const f of files) {
    const record = JSON.parse(fs.readFileSync(path.join(REPO, RECORDS_DIR, f), 'utf8'));
    for (const [where, text] of learnerWords(record)) assert.deepEqual(internalFindings(text, glossary).map((x) => x.detail), [], `${f} ${where}`);
  }
});
