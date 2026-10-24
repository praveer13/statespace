// Writes fixtures/negative/*.json: the recorded Hold trace with exactly one thing broken in each.
// Run it only to regenerate the fixtures; the checks read the committed files.
//
//   node make-negatives.mjs
//
// The first group breaks the structure, so the schema must reject it. The second group keeps the
// structure and breaks a rule JSON Schema cannot express, so the schema accepts it and the
// reading rules (lasso-read.mjs) must reject it.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../..');
const hold = JSON.parse(readFileSync(join(root, 'research/evidence/a2r3/tla/live/Hold.trace.json'), 'utf8'));

const mutants = {
  // structure: the schema rejects these
  'no-vars': (t) => delete t.vars,
  'extra-top-level-key': (t) => (t.loop = 1),
  'state-index-zero': (t) => (t.counterexample.state[0][0] = 0),
  'state-index-string': (t) => (t.counterexample.state[0][0] = '1'),
  'state-values-array': (t) => (t.counterexample.state[0][1] = [0, 'held']),
  'step-missing-target': (t) => t.counterexample.action[0].pop(),
  'action-missing-location': (t) => delete t.counterexample.action[0][1].location,
  'location-missing-module': (t) => delete t.counterexample.action[0][1].location.module,
  'empty-action-list': (t) => (t.counterexample.action = []),
  // rules: the schema accepts these, the reading rules reject them
  'closing-target-out-of-range': (t) => (t.counterexample.action[3][2][0] = 9),
  'closing-target-values-differ': (t) => (t.counterexample.action[3][2][1] = structuredClone(t.counterexample.state[1][1])),
  'step-chain-broken': (t) => (t.counterexample.action[1][0][1].st = 'captured'),
  'too-many-steps': (t) => t.counterexample.action.push(structuredClone(t.counterexample.action[3])),
};

mkdirSync(join(here, 'negative'), { recursive: true });
for (const [id, mutate] of Object.entries(mutants)) {
  const t = structuredClone(hold);
  mutate(t);
  writeFileSync(join(here, 'negative', `${id}.json`), JSON.stringify(t) + '\n');
}
console.log(`wrote ${Object.keys(mutants).length} fixtures`);
