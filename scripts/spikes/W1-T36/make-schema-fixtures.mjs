#!/usr/bin/env node
// Writes the valid and invalid fixtures of schemas/lesson.schema.json (schemas/fixtures/lesson/), the way
// schemas/README.md section 5 asks: each invalid file with the keyword and the instance path its fault
// should fail on, in an index. Run it again after a change to the schema:
//   node scripts/spikes/W1-T36/make-schema-fixtures.mjs
//
// The schema's records are told apart by their id (a page, S1.L1 or D-03; a stage, S1; a lab, LAB-1), so
// the fixtures hold all three. The pages are as the content build emits them (authored fields and derived
// ones), so GATE-schema's mutants (a key removed, a type changed, a trailing newline added) press on every
// field. The stage and lab fixtures are what content/stages/S{n}/stage.yaml and lab.yaml hold, which
// GATE-schema reads once a file declares the tag.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'schemas', 'fixtures', 'lesson');
const clone = (v) => JSON.parse(JSON.stringify(v));

const HASH = 'a'.repeat(64);
const REV = '0123456789abcdef';

const choice = {
  prompt: 'This query asks for a transfer that leaves both balances negative. What will Z3 return?',
  options: [
    { id: 'A', text: '`sat`', why: 'The recipient only gains, so no transfer leaves both balances negative.', mis: 'dp:Z5' },
    { id: 'B', text: '`unsat`', why: 'No input meets both constraints, so Z3 has nothing to return but `unsat`.' },
    { id: 'C', text: '`unknown`', why: 'Three linear integer constraints are decided outright.', mis: 'dp:Z6' },
  ],
  key: 'B',
  keyRun: 'RUN-z3-starter',
  surprise: 'yes',
};

const runSnapshot = {
  id: 'RUN-z3-starter',
  title: "The roadmap's starter on Z3: an overdraft witness, then unsat once the guard is added",
  engine: 'z3',
  version: '5.3.1',
  binary_sha256: null,
  image: null,
  argv: null,
  inputs: [{ path: 'research/evidence/a2r3/scripts/z3_claims.py', sha256: HASH }],
  budget: {},
  started_at: null,
  recorded_at: '2026-10-24T14:32:22.348Z',
  exit_code: null,
  verdict_lines: ['z3 version: 5.3.1', '[1.3 guard added] unsat (0.00s) '],
  values: { guarded: 'unsat' },
  origin: 'imported',
  notes: ['Imported from the research logs.'],
};

const full = {
  schema: 'statespace/lesson@1',
  id: 'S1.L1',
  tier: 'core',
  title: 'Negate, then search',
  draft: true,
  kcs: ['KC-1.violation-as-sat', 'KC-1.quantifier-negation'],
  objective: 'Turn an English property into a violation query by asserting its negation, and read the witness.',
  drawers: ['D-01', 'D-03'],
  segments: [
    {
      id: 's1',
      title: 'Negating English',
      minutes: 14,
      kcs: ['KC-1.quantifier-negation', 'KC-1.only-if-direction'],
      blocks: [
        {
          type: 'item',
          role: 'prequestion',
          family: 'GEN-negate-it',
          template: 't1',
          kcs: ['KC-1.violation-as-sat', 'KC-1.quantifier-negation'],
          mode: 'pick',
          band: 2,
          choice,
          itemRev: REV,
        },
        { type: 'prose', md: 'A worked example first: "every allowed transfer leaves the sender non-negative" negates to a search for one that does not.[^1]\n\n[^1]: The negation of "for every" is "for some".' },
        {
          type: 'instrument',
          ins: 'INS-z3',
          cell: 1,
          callOnFirstRun: true,
          recorded: 'RUN-z3-starter',
          md: 'The starter, unguarded.',
          direction: 'Query asserts: a transfer that leaves the sender negative. `sat` means such a transfer exists.',
          code: { lang: 'python', text: "from z3 import *\na, b, amount = Ints('a b amount')\ns = Solver()\ns.add(a >= 0, b >= 0, amount > 0, a - amount < 0)\nprint(s.check())", editable: false },
          tap: { property: 'the sender never ends below zero' },
          call: choice,
          after: 'The solver searched every input at once.',
          itemRev: REV,
        },
        { type: 'item', role: 'segment', family: 'GEN-find-the-witness', template: 't1', kcs: ['KC-1.violation-as-sat'], itemRev: REV },
        { type: 'specimen', id: 'SP-1.1', mount: true },
        { type: 'claim', template: 'CL-1.1' },
      ],
    },
    {
      id: 's2',
      title: 'Exit',
      minutes: 5,
      blocks: [
        { type: 'item', role: 'exit', family: 'GEN-call-it', template: 't1', kcs: ['KC-1.violation-as-sat'], itemRev: REV },
        { type: 'card', variant: 'build-this', title: 'Build this', md: 'Next, find a transfer that makes the source balance negative.', lab: 'LAB-1.2', minutes: 20 },
        { type: 'card', variant: 'twin', md: 'A production system that met the same problem {{run:RUN-z3-starter}}.', runs: ['RUN-z3-starter'] },
      ],
    },
  ],
  minutes: 19,
  rail: [
    { id: 's1', title: 'Negating English' },
    { id: 's2', title: 'Exit' },
  ],
  establishes: { claims: ['CL-1.1'], specimens: ['SP-1.1'] },
  runs: { 'RUN-z3-starter': runSnapshot },
  facts: {
    'tool.z3.pypi-latest': {
      id: 'tool.z3.pypi-latest',
      kind: 'tool',
      statement: 'z3-solver 5.3.1.0 is the latest Z3 release on PyPI.',
      value: '5.3.1.0',
      source: { url: 'https://pypi.org/pypi/z3-solver/json', title: 'z3-solver on PyPI' },
      checked_at: '2026-10-23',
      ttl_days: 60,
    },
  },
  checkedBy: [{ run: 'RUN-z3-starter', engine: 'z3', version: '5.3.1' }],
  unresolved: [],
  rev: HASH,
};

const minimal = {
  schema: 'statespace/lesson@1',
  id: 'S1.L2',
  tier: 'bridge',
  title: 'Three answers: sat, unsat, unknown',
  draft: true,
  kcs: ['KC-1.three-answers'],
  segments: [{ id: 's1', title: 'What each answer asserts', minutes: 15, blocks: [{ type: 'prose', md: 'Three answers, one query.' }] }],
};

const boot = {
  schema: 'statespace/lesson@1',
  id: 'S1.L0',
  tier: 'boot',
  title: 'Boot: "safe, 200 tests green"',
  draft: true,
  kcs: ['KC-1.violation-as-sat'],
  segments: [
    {
      id: 's1',
      title: 'The pull request',
      minutes: 2,
      blocks: [
        { type: 'prose', md: 'An agent opened a pull request. It says: "Transfer is now guarded. Safe: 200 tests green."' },
        {
          type: 'instrument',
          ins: 'INS-z3',
          cell: 1,
          callOnFirstRun: true,
          recorded: 'RUN-z3-starter',
          call: choice,
        },
      ],
    },
    {
      id: 's2',
      title: 'The reveal',
      minutes: 3,
      blocks: [
        { type: 'specimen', id: 'SP-1.4', mount: false },
        { type: 'card', variant: 'feels-harder', md: 'Effortful practice often feels slower than rereading, and it tends to stick better. Expect that here.' },
      ],
    },
  ],
};

const drawer = {
  schema: 'statespace/lesson@1',
  id: 'D-03',
  title: 'Quantifiers and negation',
  draft: true,
  kcs: ['KC-1.quantifier-negation', 'KC-1.only-if-direction'],
  previews: ['KC-1.violation-as-sat'],
  objective: 'Negate a "for every" and a "for some" claim correctly.',
  segments: [
    {
      id: 's1',
      title: 'Try first',
      minutes: 2,
      blocks: [{ type: 'item', role: 'prequestion', family: 'GEN-negate-it', template: 't1', kcs: ['KC-1.quantifier-negation'] }],
    },
    {
      id: 's2',
      title: 'Negating a claim',
      minutes: 4,
      blocks: [
        { type: 'prose', md: '"Every balance stays non-negative" negates to "some balance goes negative".' },
        { type: 'instrument', ins: 'INS-z3', cell: 1, callOnFirstRun: false, recorded: 'RUN-z3-starter' },
      ],
    },
  ],
};

const deferred = {
  schema: 'statespace/lesson@1',
  id: 'D-33',
  title: 'Category theory',
  draft: true,
  kcs: [],
  deferred: {
    topic: 'The mathematics of structure and structure-preserving maps.',
    why: 'The roadmap defers it until a concrete obligation demands it.',
    trigger: 'A claim or a parked goal carries the topic category-theory.',
  },
  segments: [],
};

const stageMinimal = { schema: 'statespace/lesson@1', id: 'S1', draft: true };

const stageFull = {
  schema: 'statespace/lesson@1',
  id: 'S2',
  draft: false,
  summary: 'Say what a program must never do, and have Z3 hunt for a violation.',
  newTool: 'Z3Py, met first in this tab',
  roadmapTime: '2\u20134 focused sessions',
  seams: ['SEAM-1', 'SEAM-7'],
  anchors: ['AUD-2.1', 'AUD-2.2'],
  drawers: ['D-01', 'D-13'],
  cards: [
    { type: 'card', variant: 'twin', title: 'Two-phase transfers', md: 'A pending transfer is posted or voided once {{run:RUN-z3-starter}}.', runs: ['RUN-z3-starter'] },
    { type: 'card', variant: 'reading', md: 'A dated reading pointer, section level.' },
  ],
  defence: 'Two parts: probe a lock against its claims, then prove the mutants die.',
  extra: { hints: [{ rung: 'R0', note: 'A teach-back.' }] },
};

const labMinimal = { schema: 'statespace/lesson@1', id: 'LAB-1', draft: true };

const labFull = {
  schema: 'statespace/lesson@1',
  id: 'LAB-2',
  draft: false,
  summary: 'Project 01, the lab of the second stage.',
  stages: [
    {
      id: 'LAB-2.1',
      what: 'Run the starter and read what it prints {{run:RUN-z3-starter}}.',
      weekend: false,
      checks: [{ id: 'LAB-2.c1', label: 'The verdict pair reproduces.', passes: 'sat on the violation query, then unsat once the guard is added' }],
    },
    { id: 'LAB-2.2', weekend: true },
  ],
  extra: { mutants: [] },
};

const valid = { 'full-core-lesson': full, 'minimal-bridge-lesson': minimal, 'boot-lesson': boot, 'drawer-with-recorded-cell': drawer, 'deferred-drawer': deferred, 'stage-minimal': stageMinimal, 'stage-full': stageFull, 'lab-minimal': labMinimal, 'lab-full': labFull };

const withEdit = (base, edit) => {
  const v = clone(base);
  edit(v);
  return v;
};
const block = (v, i = 0, j = 0) => v.segments[i].blocks[j];

// [file, record, instancePath, keyword]
const invalid = [
  ['missing-title', withEdit(minimal, (v) => delete v.title), '', 'required'],
  ['missing-draft', withEdit(minimal, (v) => delete v.draft), '', 'required'],
  ['unknown-top-level-field', withEdit(minimal, (v) => (v.status = 'reviewed')), '', 'additionalProperties'],
  ['wrong-schema-tag', withEdit(minimal, (v) => (v.schema = 'statespace/lesson@2')), '/schema', 'const'],
  ['id-not-a-page', withEdit(minimal, (v) => (v.id = 'S1.L')), '/id', 'pattern'],
  ['id-trailing-newline', withEdit(minimal, (v) => (v.id = 'S1.L2\n')), '/id', 'pattern'],
  ['draft-as-string', withEdit(minimal, (v) => (v.draft = 'yes')), '/draft', 'type'],
  ['title-with-a-line-break', withEdit(minimal, (v) => (v.title = 'Three answers\nsat, unsat, unknown')), '/title', 'pattern'],
  ['title-too-long', withEdit(minimal, (v) => (v.title = 'x'.repeat(121))), '/title', 'maxLength'],
  ['lesson-without-tier', withEdit(minimal, (v) => delete v.tier), '', 'required'],
  ['tier-not-a-tier', withEdit(minimal, (v) => (v.tier = 'advanced')), '/tier', 'enum'],
  ['drawer-with-tier', withEdit(drawer, (v) => (v.tier = 'core')), '', 'not'],
  ['lesson-with-deferred-card', withEdit(minimal, (v) => (v.deferred = { topic: 't', why: 'w', trigger: 'g' })), '', 'not'],
  ['lesson-with-previews', withEdit(minimal, (v) => (v.previews = ['KC-1.violation-as-sat'])), '', 'not'],
  ['lesson-without-segments', withEdit(minimal, (v) => (v.segments = [])), '/segments', 'minItems'],
  ['deferred-drawer-with-segments', withEdit(deferred, (v) => (v.segments = minimal.segments)), '/segments', 'maxItems'],
  ['deferred-card-missing-trigger', withEdit(deferred, (v) => delete v.deferred.trigger), '/deferred', 'required'],
  ['kc-not-a-kc', withEdit(minimal, (v) => (v.kcs = ['KC-1']))  , '/kcs/0', 'pattern'],
  ['kcs-repeat', withEdit(minimal, (v) => (v.kcs = ['KC-1.three-answers', 'KC-1.three-answers'])), '/kcs', 'uniqueItems'],
  ['drawers-link-a-lesson', withEdit(full, (v) => (v.drawers = ['S1.L1'])), '/drawers/0', 'pattern'],
  ['segment-without-blocks', withEdit(minimal, (v) => (v.segments[0].blocks = [])), '/segments/0/blocks', 'minItems'],
  ['segment-minutes-zero', withEdit(minimal, (v) => (v.segments[0].minutes = 0)), '/segments/0/minutes', 'minimum'],
  ['segment-minutes-over-an-hour', withEdit(minimal, (v) => (v.segments[0].minutes = 61)), '/segments/0/minutes', 'maximum'],
  ['segment-minutes-fraction', withEdit(minimal, (v) => (v.segments[0].minutes = 12.5)), '/segments/0/minutes', 'type'],
  ['segment-id-not-an-anchor', withEdit(minimal, (v) => (v.segments[0].id = 'seg-1')), '/segments/0/id', 'pattern'],
  ['segment-unknown-field', withEdit(minimal, (v) => (v.segments[0].tags = [])), '/segments/0', 'additionalProperties'],
  ['segment-kc-not-a-kc', withEdit(full, (v) => (v.segments[0].kcs = ['KC-1'])), '/segments/0/kcs/0', 'pattern'],
  ['segment-kcs-repeat', withEdit(full, (v) => (v.segments[0].kcs = ['KC-1.violation-as-sat', 'KC-1.violation-as-sat'])), '/segments/0/kcs', 'uniqueItems'],
  ['seventh-block-type', withEdit(minimal, (v) => (v.segments[0].blocks[0] = { type: 'figure', md: 'A drawing.' })), '/segments/0/blocks/0', 'oneOf'],
  ['prose-without-md', withEdit(minimal, (v) => (v.segments[0].blocks[0] = { type: 'prose' })), '/segments/0/blocks/0', 'oneOf'],
  ['prose-with-empty-md', withEdit(minimal, (v) => (v.segments[0].blocks[0].md = '')), '/segments/0/blocks/0', 'oneOf'],
  ['item-without-family', withEdit(full, (v) => delete block(v, 0, 3).family), '/segments/0/blocks/3', 'oneOf'],
  ['item-template-not-a-template', withEdit(full, (v) => (block(v, 0, 3).template = 'template-1')), '/segments/0/blocks/3', 'oneOf'],
  ['item-without-kcs', withEdit(full, (v) => (block(v, 0, 3).kcs = [])), '/segments/0/blocks/3', 'oneOf'],
  ['item-with-four-kcs', withEdit(full, (v) => (block(v, 0, 3).kcs = ['KC-1.a', 'KC-1.b', 'KC-1.c', 'KC-1.d'])), '/segments/0/blocks/3', 'oneOf'],
  ['item-role-not-a-role', withEdit(full, (v) => (block(v, 0, 3).role = 'warm-up')), '/segments/0/blocks/3', 'oneOf'],
  ['item-band-four', withEdit(full, (v) => (block(v, 0, 0).band = 4)), '/segments/0/blocks/0', 'oneOf'],
  ['choice-with-one-option', withEdit(full, (v) => (block(v, 0, 0).choice.options = [block(v, 0, 0).choice.options[0]])), '/segments/0/blocks/0', 'oneOf'],
  ['choice-option-without-why', withEdit(full, (v) => delete block(v, 0, 0).choice.options[0].why), '/segments/0/blocks/0', 'oneOf'],
  ['choice-option-not-a-letter', withEdit(full, (v) => (block(v, 0, 0).choice.options[0].id = '1')), '/segments/0/blocks/0', 'oneOf'],
  ['choice-misconception-not-a-key', withEdit(full, (v) => (block(v, 0, 0).choice.options[0].mis = 'Z5')), '/segments/0/blocks/0', 'oneOf'],
  ['instrument-cell-zero', withEdit(full, (v) => (block(v, 0, 2).cell = 0)), '/segments/0/blocks/2', 'oneOf'],
  ['instrument-without-recorded-run', withEdit(full, (v) => delete block(v, 0, 2).recorded), '/segments/0/blocks/2', 'oneOf'],
  ['instrument-recorded-not-a-run', withEdit(full, (v) => (block(v, 0, 2).recorded = 'z3-starter')), '/segments/0/blocks/2', 'oneOf'],
  ['instrument-call-without-the-commit', withEdit(full, (v) => (block(v, 0, 2).callOnFirstRun = false)), '/segments/0/blocks/2', 'oneOf'],
  ['instrument-code-without-text', withEdit(full, (v) => delete block(v, 0, 2).code.text), '/segments/0/blocks/2', 'oneOf'],
  ['instrument-code-editable-as-string', withEdit(full, (v) => (block(v, 0, 2).code.editable = 'yes')), '/segments/0/blocks/2', 'oneOf'],
  ['instrument-tap-without-property', withEdit(full, (v) => (block(v, 0, 2).tap = {})), '/segments/0/blocks/2', 'oneOf'],
  ['claim-template-not-a-template', withEdit(full, (v) => (block(v, 0, 5).template = 'CL-1')), '/segments/0/blocks/5', 'oneOf'],
  ['specimen-without-mount', withEdit(full, (v) => delete block(v, 0, 4).mount), '/segments/0/blocks/4', 'oneOf'],
  ['specimen-not-a-specimen', withEdit(full, (v) => (block(v, 0, 4).id = 'SP-1')), '/segments/0/blocks/4', 'oneOf'],
  ['card-variant-not-a-variant', withEdit(full, (v) => (block(v, 1, 1).variant = 'tip')), '/segments/1/blocks/1', 'oneOf'],
  ['card-lab-not-a-lab-stage', withEdit(full, (v) => (block(v, 1, 1).lab = 'LAB-1')), '/segments/1/blocks/1', 'oneOf'],
  ['rail-entry-with-minutes', withEdit(full, (v) => (v.rail[0].minutes = 14)), '/rail/0', 'additionalProperties'],
  ['rail-title-not-a-line', withEdit(full, (v) => (v.rail[0].title = '')), '/rail/0/title', 'minLength'],
  ['establishes-without-specimens', withEdit(full, (v) => delete v.establishes.specimens), '/establishes', 'required'],
  ['run-snapshot-wrong-id', withEdit(full, (v) => (v.runs['RUN-z3-starter'].id = 'z3-starter')), '/runs/RUN-z3-starter/id', 'pattern'],
  ['run-snapshot-unknown-field', withEdit(full, (v) => (v.runs['RUN-z3-starter'].outputs = [])), '/runs/RUN-z3-starter', 'additionalProperties'],
  ['fact-snapshot-wrong-kind', withEdit(full, (v) => (v.facts['tool.z3.pypi-latest'].kind = 'rumor')), '/facts/tool.z3.pypi-latest/kind', 'enum'],
  ['checked-by-without-version', withEdit(full, (v) => delete v.checkedBy[0].version), '/checkedBy/0', 'required'],
  ['unresolved-not-a-run', withEdit(full, (v) => (v.unresolved = ['z3-bv64'])), '/unresolved/0', 'pattern'],
  ['rev-not-a-hash', withEdit(full, (v) => (v.rev = 'abc123')), '/rev', 'pattern'],
  ['item-rev-wrong-length', withEdit(full, (v) => (block(v, 0, 0).itemRev = '0123')), '/segments/0/blocks/0', 'oneOf'],
  // a stage record
  ['stage-without-draft', withEdit(stageFull, (v) => delete v.draft), '', 'required'],
  ['stage-without-schema-tag', withEdit(stageFull, (v) => delete v.schema), '', 'required'],
  ['stage-wrong-schema-tag', withEdit(stageFull, (v) => (v.schema = 'statespace/stage@1')), '/schema', 'const'],
  ['stage-unknown-field', withEdit(stageFull, (v) => (v.status = 'reviewed')), '', 'additionalProperties'],
  ['stage-with-page-fields', withEdit(stageFull, (v) => (v.segments = minimal.segments)), '', 'additionalProperties'],
  ['stage-id-zero', withEdit(stageFull, (v) => (v.id = 'S0')), '/id', 'pattern'],
  ['stage-draft-as-string', withEdit(stageFull, (v) => (v.draft = 'no')), '/draft', 'type'],
  ['stage-summary-empty', withEdit(stageFull, (v) => (v.summary = '')), '/summary', 'minLength'],
  ['stage-new-tool-with-a-line-break', withEdit(stageFull, (v) => (v.newTool = 'Z3Py\nand more')), '/newTool', 'pattern'],
  ['stage-new-tool-too-long', withEdit(stageFull, (v) => (v.newTool = 'x'.repeat(121))), '/newTool', 'maxLength'],
  ['stage-seams-not-a-list', withEdit(stageFull, (v) => (v.seams = 'SEAM-1')), '/seams', 'type'],
  ['stage-seam-not-a-seam', withEdit(stageFull, (v) => (v.seams = ['SEAM-one'])), '/seams/0', 'pattern'],
  ['stage-seams-repeat', withEdit(stageFull, (v) => (v.seams = ['SEAM-1', 'SEAM-1'])), '/seams', 'uniqueItems'],
  ['stage-anchor-not-an-anchor', withEdit(stageFull, (v) => (v.anchors = ['AUD-2'])), '/anchors/0', 'pattern'],
  ['stage-drawer-not-a-drawer', withEdit(stageFull, (v) => (v.drawers = ['D-1'])), '/drawers/0', 'pattern'],
  ['stage-card-unknown-variant', withEdit(stageFull, (v) => (v.cards[0].variant = 'tip')), '/cards/0/variant', 'enum'],
  ['stage-card-without-md', withEdit(stageFull, (v) => delete v.cards[0].md), '/cards/0', 'required'],
  ['stage-extra-not-an-object', withEdit(stageFull, (v) => (v.extra = [])), '/extra', 'type'],
  // a lab record
  ['lab-without-draft', withEdit(labFull, (v) => delete v.draft), '', 'required'],
  ['lab-without-schema-tag', withEdit(labFull, (v) => delete v.schema), '', 'required'],
  ['lab-unknown-field', withEdit(labFull, (v) => (v.status = 'reviewed')), '', 'additionalProperties'],
  ['lab-id-is-a-lab-stage', withEdit(labFull, (v) => (v.id = 'LAB-2.1')), '/id', 'pattern'],
  ['lab-summary-empty', withEdit(labFull, (v) => (v.summary = '')), '/summary', 'minLength'],
  ['lab-stage-without-id', withEdit(labFull, (v) => delete v.stages[0].id), '/stages/0', 'required'],
  ['lab-stage-id-is-a-lab', withEdit(labFull, (v) => (v.stages[0].id = 'LAB-2')), '/stages/0/id', 'pattern'],
  ['lab-stage-weekend-as-string', withEdit(labFull, (v) => (v.stages[0].weekend = 'yes')), '/stages/0/weekend', 'type'],
  ['lab-stage-unknown-field', withEdit(labFull, (v) => (v.stages[0].minutes = 20)), '/stages/0', 'additionalProperties'],
  ['lab-check-id-not-a-check', withEdit(labFull, (v) => (v.stages[0].checks[0].id = 'LAB-2.1')), '/stages/0/checks/0/id', 'pattern'],
  ['lab-check-without-label', withEdit(labFull, (v) => delete v.stages[0].checks[0].label), '/stages/0/checks/0', 'required'],
  ['lab-extra-not-an-object', withEdit(labFull, (v) => (v.extra = 'hints')), '/extra', 'type'],
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'valid'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'invalid'), { recursive: true });
const write = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
for (const [name, record] of Object.entries(valid)) write(path.join(OUT, 'valid', `${name}.json`), record);
const index = [];
for (const [name, record, instancePath, keyword] of invalid) {
  write(path.join(OUT, 'invalid', `${name}.json`), record);
  index.push({ file: `${name}.json`, instancePath, keyword });
}
fs.writeFileSync(path.join(OUT, 'invalid', 'index.json'), `[\n${index.map((e) => `  ${JSON.stringify(e)}`).join(',\n')}\n]\n`);
console.log(`wrote ${Object.keys(valid).length} valid and ${invalid.length} invalid fixtures under schemas/fixtures/lesson/`);
