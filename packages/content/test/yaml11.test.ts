import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseDocument } from 'yaml'
import { divergence, pyyamlReading } from '../src/yaml11.ts'
import type { Reading } from '../src/yaml11.ts'

/** What the YAML 1.2 reader of this build makes of an unquoted scalar. */
const here = (text: string): unknown => (parseDocument(`x: ${text}\n`, { strict: true }).toJS() as { x: unknown }).x

// [text, what PyYAML 6.0.3 makes of it, whether the two readers disagree]. Checked against PyYAML itself: every row
// is what yaml.safe_load gives for `x: <text>` (for `<<` and `=` it raises, because it has no constructor for those
// tags). scripts/spikes/W1-T36/pyyaml-fuzz.mjs runs the same rule over every unquoted scalar of up to four characters
// over digits, signs, dots, underscores, colons and the letters that start numbers and words, and fails on any
// disagreement the rule misses; it needs uv, which is why this table is what the unit tests run.
const TABLE: Array<[string, Reading, boolean]> = [
  // words PyYAML reads as booleans
  ['yes', 'bool', true],
  ['Yes', 'bool', true],
  ['no', 'bool', true],
  ['NO', 'bool', true],
  ['on', 'bool', true],
  ['Off', 'bool', true],
  // the booleans both readers know
  ['true', 'bool', false],
  ['True', 'bool', false],
  ['FALSE', 'bool', false],
  ['tRue', 'str', false],
  // numbers the two read differently
  ['0777', 'int', true],
  ['07', 'int', true],
  ['0o17', 'str', true],
  ['0b11', 'int', true],
  ['1_000', 'int', true],
  ['12:30', 'int', true],
  ['1:30:15.5', 'float', true],
  ['1e3', 'str', true],
  ['1E3', 'str', true],
  ['1e+3', 'str', true],
  ['-0x10', 'int', true],
  // numbers they read alike
  ['0', 'int', false],
  ['12', 'int', false],
  ['-1', 'int', false],
  ['+1', 'int', false],
  ['0x1F', 'int', false],
  ['1.5', 'float', false],
  ['.5', 'float', false],
  ['5.', 'float', false],
  ['1.0e+3', 'float', false],
  ['.inf', 'float', false],
  ['-.inf', 'float', false],
  ['.nan', 'float', false],
  // dates, which JSON cannot hold
  ['2026-10-25', 'timestamp', true],
  ['2026-10-25 10:30:00', 'timestamp', true],
  ['2026-10-25T10:30:00Z', 'timestamp', true],
  // keys and tags of YAML 1.1
  ['<<', 'merge', true],
  ['=', 'value', true],
  // null
  ['~', 'null', false],
  ['null', 'null', false],
  ['Null', 'null', false],
  ['NULL', 'null', false],
  // the IDs and words a content file holds
  ['S1', 'str', false],
  ['AUD-1.1', 'str', false],
  ['D-01', 'str', false],
  ['LAB-1.2', 'str', false],
  ['SEAM-7', 'str', false],
  ['R0', 'str', false],
  ['1.2.3', 'str', false],
  ['Z3Py, met first in this tab', 'str', false],
  ['text with no and yes in it', 'str', false],
]

test('the readings of PyYAML and the places the two readers disagree, row by row', () => {
  for (const [text, reading, differ] of TABLE) {
    assert.equal(pyyamlReading(text), reading, `PyYAML reads ${JSON.stringify(text)}`)
    assert.equal(divergence(text, here(text)) !== null, differ, `the readers ${differ ? 'disagree' : 'agree'} on ${JSON.stringify(text)}`)
  }
})

test('the message says what each reader makes of the scalar and what to do', () => {
  assert.equal(divergence('no', 'no'), '"no" is read as a boolean by PyYAML (YAML 1.1), which GATE-schema reads this file with, and as a string here: put it in quotes')
  assert.equal(divergence('1e3', 1000), '"1e3" is read as a string by PyYAML (YAML 1.1), which GATE-schema reads this file with, and as a number here: put it in quotes')
  assert.equal(divergence('2026-10-25', '2026-10-25'), '"2026-10-25" is read as a date by PyYAML (YAML 1.1), which GATE-schema reads this file with, and as a string here: put it in quotes')
  assert.equal(divergence('ok', 'ok'), null)
})
