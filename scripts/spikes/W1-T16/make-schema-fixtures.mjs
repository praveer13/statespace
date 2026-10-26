#!/usr/bin/env node
// Writes the valid and invalid fixtures of schemas/specimen.schema.json (schemas/fixtures/specimen/), the way
// schemas/README.md section 5 asks: each invalid file with the keyword and the instance path its fault should fail
// on, in an index. Run it again after a change to the schema:
//   node scripts/spikes/W1-T16/make-schema-fixtures.mjs             write schemas/fixtures/specimen/
//   node scripts/spikes/W1-T16/make-schema-fixtures.mjs --check     write nothing; exit 1 when the committed files differ
//   node scripts/spikes/W1-T16/make-schema-fixtures.mjs --out DIR   write under DIR instead (the tests do)
//
// A specimen record holds pointers and words and nothing a run can say, so the invalid fixtures that matter most are
// the ones that type a label by hand: a stamp, a tool version, a witness, a date or a status written into a record
// is an unknown field. The valid ones are a course specimen with every optional part, a verdict, a dated incident,
// and a learner's own specimen as the lab repository would hold it (JSON and YAML).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const COMMITTED = path.join(ROOT, 'schemas', 'fixtures', 'specimen');
const args = process.argv.slice(2);
const checkMode = args.includes('--check');
const outIndex = args.indexOf('--out');
for (const [i, a] of args.entries()) {
  if (a === '--check' || a === '--out' || (outIndex >= 0 && i === outIndex + 1)) continue;
  console.error(`make-schema-fixtures: unknown argument ${a}`);
  process.exit(2);
}
if (outIndex >= 0 && (args[outIndex + 1] === undefined || checkMode)) {
  console.error('make-schema-fixtures: --out takes a directory and does not go with --check');
  process.exit(2);
}
const OUT = checkMode ? fs.mkdtempSync(path.join(os.tmpdir(), 'specimen-fixtures-')) : outIndex >= 0 ? path.resolve(args[outIndex + 1]) : COMMITTED;
const clone = (v) => JSON.parse(JSON.stringify(v));

const overdraft = {
  schema: 'statespace/specimen@1',
  id: 'SP-1.1',
  title: 'The overdraft',
  draft: true,
  kcs: ['KC-1.violation-as-sat', 'KC-1.witness-class'],
  found_in: { lesson: 'S1.L1' },
  mount: { lessons: ['S1.L0', 'S1.L1'] },
  violates: "The sender's balance stays at zero or above after a transfer.",
  because: "The transfer puts no condition on the sender's balance, so an amount above it can be sent.",
  class: 'an overdraft by an unguarded debit',
  cured_by: { text: 'Guard the debit with amount <= a: the same query is then unsat, and a premise query shows the guard still lets some transfer through.', claim: 'CL-1.1' },
  evidence: {
    main: { run: 'RUN-z3-starter', query: '1.2 starter: overdraft search', direction: 'violation', replay: { run: 'RUN-specimens-replay', query: 'sp_1_1_starter' } },
    also: [{ run: 'RUN-z3-boot-variant', query: 'variant_violation', caption: "Boot's variant, where the guard read the recipient's balance" }],
    minimal: { kind: 'optimize', run: 'RUN-z3-optimize-min', query: 'S1.2 minimal amount via Optimize', objective: 'amount', confirm: 'no_smaller_amount' },
  },
};

const verdict = {
  schema: 'statespace/specimen@1',
  id: 'SP-1.7',
  title: 'A reason-stable unknown',
  kcs: ['KC-1.three-answers', 'KC-1.unknown-fails-closed'],
  found_in: { lesson: 'S1.L2' },
  mount: { lessons: ['S1.L2'] },
  violates: 'Nothing is violated: this specimen is about reading a verdict.',
  because: 'A power with an unknown exponent lies outside what the solver decides, though one solution exists.',
  class: 'an unknown that says why',
  cured_by: { text: 'Read the reason, never treat unknown as a pass, and fail closed where the answer enforces something.' },
  evidence: {
    main: { run: 'RUN-z3-unknown-pow', query: 'Int x**y == 8, y>1', direction: 'violation' },
    minimal: { kind: 'not-applicable', why: 'a verdict, not a witness' },
  },
};

const incident = {
  schema: 'statespace/specimen@1',
  id: 'SP-1.9',
  title: 'Bitcoin CVE-2010-5139, values that overflowed when summed',
  kcs: ['KC-1.encoding-is-the-claim'],
  found_in: { lesson: 'S1.L5' },
  mount: { lessons: ['S1.L5'] },
  violates: 'No transaction creates value.',
  because: 'The outputs were summed in 64-bit arithmetic without a range check, so the sum wrapped.',
  class: 'a wrap in an unchecked sum',
  cured_by: { text: 'Check each output against a range before summing.' },
  evidence: {
    main: { run: 'RUN-z3-btc2010', query: 'buggy_creates_value', direction: 'violation' },
    minimal: { kind: 'none' },
  },
  incident: { date: '2010-08-15', source: { title: 'Bitcoin wiki, CVE-2010-5139', url: 'https://en.bitcoin.it/wiki/CVE-2010-5139' }, toy_model: true },
};

const vacuous = {
  schema: 'statespace/specimen@1',
  id: 'SP-1.6',
  title: 'An unsat over contradictory premises',
  kcs: ['KC-1.implication-vacuity', 'KC-1.non-vacuity-check'],
  found_in: { lesson: 'S1.L3' },
  mount: { lessons: ['S1.L3'] },
  violates: 'Non-vacuity: the premises can hold together.',
  because: 'Contradictory premises make every violation query unsat, whatever the property says.',
  class: 'a proof over premises that cannot hold',
  cured_by: { text: 'Ask the premise query beside every unsat, and fix the configuration that makes it unsat.', claim: 'CL-1.1' },
  evidence: {
    main: { run: 'RUN-z3-vacuous-unsat', query: 'max0_range_premises', direction: 'premise' },
    also: [{ run: 'RUN-z3-vacuous-unsat', query: 'max0_range_violation', caption: 'The violation query, on the same premises' }],
    minimal: { kind: 'core', run: 'RUN-z3-vacuous-unsat', query: 'max0_range_core' },
  },
};

const learner = {
  schema: 'statespace/specimen@1',
  id: 'refund-clamp-3f9a',
  title: 'The clamp that mints money',
  kcs: ['KC-1.two-state-property'],
  found_in: { lab_stage: 'LAB-1.4' },
  violates: 'A refund never creates money.',
  because: "The rule clamps the merchant's balance at zero instead of rejecting a refund above it.",
  class: 'a clamp that hides a refund above the balance',
  cured_by: { text: 'Reject a refund above the merchant balance.', fixed: 'labs/LAB-1/fixed/refund.py' },
  evidence: {
    main: { run: 'RUN-z3-refund-mint', query: 'clamp_mint', direction: 'violation' },
    minimal: { kind: 'none' },
  },
};

const recipient = {
  schema: 'statespace/specimen@1',
  id: 'SP-1.4',
  title: 'The guard protects the sender, not the recipient',
  draft: true,
  kcs: ['KC-1.encoding-is-the-claim'],
  found_in: { lesson: 'S1.L5' },
  mount: { lessons: ['S1.L5'] },
  violates: "The recipient's balance stays at zero or above, in signed 64-bit arithmetic.",
  because: 'The guard bounds the debit and not the credit, so the recipient balance plus the amount can wrap.',
  class: 'an overflow on the credit that the guard on the debit does not see',
  cured_by: { text: 'Check the credit as well as the debit, use checked arithmetic, or an unbounded type.', claim: 'CL-1.5' },
  evidence: {
    main: { run: 'RUN-z3-bv64', query: '1.5 BitVec64 signed: guarded DESTINATION wrap', direction: 'violation', replay: { run: 'RUN-specimens-replay', query: 'sp_1_4_recipient_wrap' } },
    also: [
      {
        run: 'RUN-z3-bv64-pyodide',
        query: 'recipient-wrap',
        caption: 'Pyodide, for a related query, found another wrap: a witness is not canonical, so the label checks the property',
        replay: { run: 'RUN-specimens-replay', query: 'sp_1_4_pyodide_related_query' },
      },
    ],
    minimal: { kind: 'none' },
  },
};

const valid = {
  'with-a-replayed-second-witness.json': recipient,
  'course-overdraft.json': overdraft,
  'course-verdict.json': verdict,
  'dated-incident.json': incident,
  'premise-with-core.json': vacuous,
  'learner-lab-specimen.json': learner,
};

const invalid = [];
const bad = (file, value, instancePath, keyword) => {
  invalid.push({ file, value, instancePath, keyword });
};
const edit = (fn) => {
  const v = clone(overdraft);
  fn(v);
  return v;
};

// ------------------------------------------------------------------ the record itself
bad('missing-title.json', edit((v) => delete v.title), '', 'required');
bad('missing-evidence.json', edit((v) => delete v.evidence), '', 'required');
bad('missing-kcs.json', edit((v) => delete v.kcs), '', 'required');
bad('wrong-schema-tag.json', edit((v) => (v.schema = 'statespace/specimen@2')), '/schema', 'const');
bad('id-with-space.json', edit((v) => (v.id = 'SP 1.1')), '/id', 'pattern');
bad('id-trailing-newline.json', edit((v) => (v.id = 'SP-1.1\n')), '/id', 'pattern');
bad('id-too-long.json', edit((v) => (v.id = `a${'b'.repeat(64)}`)), '/id', 'maxLength');
bad('title-with-a-line-break.json', edit((v) => (v.title = 'The\noverdraft')), '/title', 'pattern');
bad('title-too-long.json', edit((v) => (v.title = 'x'.repeat(121))), '/title', 'maxLength');
bad('draft-as-string.json', edit((v) => (v.draft = 'yes')), '/draft', 'type');
bad('empty-kcs.json', edit((v) => (v.kcs = [])), '/kcs', 'minItems');
bad('kcs-not-kc-ids.json', edit((v) => (v.kcs = ['violation-as-sat'])), '/kcs/0', 'pattern');
bad('kcs-repeat.json', edit((v) => (v.kcs = ['KC-1.violation-as-sat', 'KC-1.violation-as-sat'])), '/kcs', 'uniqueItems');
bad('found-in-empty.json', edit((v) => (v.found_in = {})), '/found_in', 'minProperties');
bad('found-in-not-a-lesson.json', edit((v) => (v.found_in = { lesson: 'D-03' })), '/found_in/lesson', 'pattern');
bad('found-in-not-a-lab-stage.json', edit((v) => (v.found_in = { lab_stage: 'LAB-1' })), '/found_in/lab_stage', 'pattern');
bad('mount-without-lessons.json', edit((v) => (v.mount = {})), '/mount', 'required');
bad('mount-lessons-empty.json', edit((v) => (v.mount = { lessons: [] })), '/mount/lessons', 'minItems');
bad('violates-with-a-line-break.json', edit((v) => (v.violates = 'one\ntwo')), '/violates', 'pattern');
bad('because-empty.json', edit((v) => (v.because = '')), '/because', 'minLength');
bad('because-too-long.json', edit((v) => (v.because = 'x'.repeat(301))), '/because', 'maxLength');
bad('class-number.json', edit((v) => (v.class = 7)), '/class', 'type');
bad('cured-by-without-text.json', edit((v) => (v.cured_by = { claim: 'CL-1.1' })), '/cured_by', 'required');
bad('cured-by-not-a-claim.json', edit((v) => (v.cured_by.claim = 'CL1.1')), '/cured_by/claim', 'pattern');
bad('cured-by-absolute-path.json', edit((v) => (v.cured_by.fixed = '/labs/LAB-1/fixed/refund.py')), '/cured_by/fixed', 'pattern');

// ------------------------------------------------------------------ what a label is made of: never typed
bad('stamp-typed-into-record.json', edit((v) => (v.stamp = 'REFUTED [R] · 1 step')), '', 'additionalProperties');
bad('tool-version-typed-into-record.json', edit((v) => (v.tool_version = 'z3@5.3.1')), '', 'additionalProperties');
bad('witness-typed-into-record.json', edit((v) => (v.witness = 'b = 0, amount = 1, a = 0')), '', 'additionalProperties');
bad('date-typed-into-record.json', edit((v) => (v.mounted_on = '2026-11-02')), '', 'additionalProperties');
bad('status-stored-in-record.json', edit((v) => (v.status = 'kept')), '', 'additionalProperties');
bad('model-typed-into-main.json', edit((v) => (v.evidence.main.model = '[b = 0]')), '/evidence/main', 'additionalProperties');
bad('engine-typed-into-main.json', edit((v) => (v.evidence.main.engine = 'z3')), '/evidence/main', 'additionalProperties');

// ------------------------------------------------------------------ evidence
bad('evidence-without-minimal.json', edit((v) => delete v.evidence.minimal), '/evidence', 'required');
bad('main-without-direction.json', edit((v) => delete v.evidence.main.direction), '/evidence/main', 'required');
bad('main-run-not-a-run.json', edit((v) => (v.evidence.main.run = 'z3-starter')), '/evidence/main/run', 'pattern');
bad('main-query-empty.json', edit((v) => (v.evidence.main.query = '')), '/evidence/main/query', 'minLength');
bad('main-direction-unknown.json', edit((v) => (v.evidence.main.direction = 'both')), '/evidence/main/direction', 'enum');
bad('main-steps-zero.json', edit((v) => (v.evidence.main.steps = 0)), '/evidence/main/steps', 'minimum');
bad('main-steps-fractional.json', edit((v) => (v.evidence.main.steps = 1.5)), '/evidence/main/steps', 'type');
bad('main-replay-without-query.json', edit((v) => (v.evidence.main.replay = { run: 'RUN-specimens-replay' })), '/evidence/main/replay', 'required');
bad('main-premise-not-a-query-ref.json', edit((v) => (v.evidence.main.premise = 'max0_range_premises')), '/evidence/main/premise', 'type');
bad('also-empty.json', edit((v) => (v.evidence.also = [])), '/evidence/also', 'minItems');
bad('also-without-caption.json', edit((v) => delete v.evidence.also[0].caption), '/evidence/also/0', 'required');
bad('also-replay-without-run.json', edit((v) => (v.evidence.also[0].replay = { query: 'sp_1_4_pyodide_related_query' })), '/evidence/also/0/replay', 'required');
bad('also-too-many.json', edit((v) => (v.evidence.also = Array.from({ length: 5 }, () => clone(overdraft.evidence.also[0])))), '/evidence/also', 'maxItems');
bad('minimal-kind-unknown.json', edit((v) => (v.evidence.minimal = { kind: 'yes' })), '/evidence/minimal/kind', 'enum');
bad('minimal-optimize-without-objective.json', edit((v) => delete v.evidence.minimal.objective), '/evidence/minimal', 'required');
bad('minimal-optimize-without-run.json', edit((v) => delete v.evidence.minimal.run), '/evidence/minimal', 'required');
bad('minimal-objective-not-a-name.json', edit((v) => (v.evidence.minimal.objective = 'the amount')), '/evidence/minimal/objective', 'pattern');
bad('minimal-core-without-query.json', edit((v) => (v.evidence.minimal = { kind: 'core', run: 'RUN-z3-vacuous-unsat' })), '/evidence/minimal', 'required');
bad('minimal-not-applicable-without-why.json', edit((v) => (v.evidence.minimal = { kind: 'not-applicable' })), '/evidence/minimal', 'required');
bad('minimal-none-with-a-run.json', edit((v) => (v.evidence.minimal = { kind: 'none', run: 'RUN-z3-optimize-min' })), '/evidence/minimal', 'not');

// ------------------------------------------------------------------ dated incidents
const withIncident = (fn) => {
  const v = clone(incident);
  fn(v);
  return v;
};
bad('incident-without-source.json', withIncident((v) => delete v.incident.source), '/incident', 'required');
bad('incident-date-not-a-date.json', withIncident((v) => (v.incident.date = '15 August 2010')), '/incident/date', 'pattern');
bad('incident-source-not-https.json', withIncident((v) => (v.incident.source.url = 'http://en.bitcoin.it/wiki/CVE-2010-5139')), '/incident/source/url', 'pattern');
bad('incident-source-url-with-a-space.json', withIncident((v) => (v.incident.source.url = 'https://en.bitcoin.it/wiki/CVE 2010-5139')), '/incident/source/url', 'pattern');
bad('incident-toy-model-as-string.json', withIncident((v) => (v.incident.toy_model = 'yes')), '/incident/toy_model', 'type');
bad('incident-with-exploit-field.json', withIncident((v) => (v.incident.exploit = 'a transaction')), '/incident', 'additionalProperties');

// ------------------------------------------------------------------ write
const write = (dir, file, value) => fs.writeFileSync(path.join(dir, file), `${JSON.stringify(value, null, 2)}\n`);
const validDir = path.join(OUT, 'valid');
const invalidDir = path.join(OUT, 'invalid');
for (const dir of [validDir, invalidDir]) {
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f));
}
for (const [file, value] of Object.entries(valid)) write(validDir, file, value);
for (const { file, value } of invalid) write(invalidDir, file, value);
fs.writeFileSync(path.join(invalidDir, 'index.json'), `[\n${invalid.map(({ file, instancePath, keyword }) => `  ${JSON.stringify({ file, instancePath, keyword })}`).join(',\n')}\n]\n`);

// The lab repository holds specimens as YAML (ARCHITECTURE.md section 8.2). GATE-schema reads a YAML file in both
// languages and requires the same verdict, so the scalars that YAML 1.1 and 1.2 read differently are quoted.
const yamlString = (s) => JSON.stringify(s);
const toYaml = (value, indent = 0) => {
  const pad = ' '.repeat(indent);
  const lines = [];
  for (const [k, v] of Object.entries(value)) {
    if (Array.isArray(v)) {
      lines.push(`${pad}${k}:`);
      for (const item of v) {
        if (item !== null && typeof item === 'object') {
          const [first, ...rest] = toYaml(item, indent + 4).split('\n').filter(Boolean);
          lines.push(`${pad}  - ${(first ?? '').trimStart()}`, ...rest);
        } else lines.push(`${pad}  - ${typeof item === 'string' ? yamlString(item) : String(item)}`);
      }
    } else if (v !== null && typeof v === 'object') {
      lines.push(`${pad}${k}:`, toYaml(v, indent + 2).trimEnd());
    } else lines.push(`${pad}${k}: ${typeof v === 'string' ? yamlString(v) : String(v)}`);
  }
  return `${lines.join('\n')}\n`;
};
fs.writeFileSync(path.join(validDir, 'learner-lab-specimen.yaml'), toYaml(learner));

if (checkMode) {
  const listing = (dir) =>
    ['valid', 'invalid'].flatMap((sub) => (fs.existsSync(path.join(dir, sub)) ? fs.readdirSync(path.join(dir, sub)).map((f) => `${sub}/${f}`) : [])).sort();
  const want = listing(OUT);
  const have = listing(COMMITTED);
  const differs = [
    ...want.filter((f) => !have.includes(f)).map((f) => `${f} is missing`),
    ...have.filter((f) => !want.includes(f)).map((f) => `${f} is not written by this script`),
    ...want.filter((f) => have.includes(f) && fs.readFileSync(path.join(OUT, f), 'utf8') !== fs.readFileSync(path.join(COMMITTED, f), 'utf8')).map((f) => `${f} differs`),
  ];
  fs.rmSync(OUT, { recursive: true, force: true });
  if (differs.length > 0) {
    console.error(`make-schema-fixtures: schemas/fixtures/specimen/ is not what this script writes (${differs.slice(0, 5).join('; ')}${differs.length > 5 ? `; and ${differs.length - 5} more` : ''}); run it without --check and review the diff`);
    process.exit(1);
  }
  console.log(`make-schema-fixtures: schemas/fixtures/specimen/ is what this script writes (${want.length} files)`);
} else console.log(`specimen fixtures: ${Object.keys(valid).length + 1} valid, ${invalid.length} invalid`);
