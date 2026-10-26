// Where YAML 1.2, which this build reads, and YAML 1.1, which PyYAML reads, give a plain scalar another value.
//
// GATE-schema reads every YAML file that declares a schema tag twice: in TypeScript, and in Python with PyYAML
// (schemas/codegen/gate_py.py), and it judges what PyYAML read. PyYAML is a YAML 1.1 reader: `no` is false, `0777`
// is octal, `1_000` and `12:30` are numbers, `2026-10-25` is a date (which JSON cannot hold, so the gate fails on
// it), and `1e3` is a string. The build reads YAML 1.2, where each of those is something else. A file that the
// build accepts and PyYAML reads differently would fail in the gate, far from the edit and with a message about
// the wrong thing, so the build reports the scalar where it is written, and the author quotes it.
//
// The patterns are PyYAML's own implicit resolvers (yaml/resolver.py, 6.0.3), tried in its order; the table in
// test/yaml11.test.ts was checked against PyYAML itself, and scripts/spikes/W1-T36/pyyaml-fuzz.mjs re-runs the
// comparison over every short scalar.

export type Reading = 'str' | 'null' | 'bool' | 'int' | 'float' | 'timestamp' | 'merge' | 'value'

const RESOLVERS: ReadonlyArray<readonly [Exclude<Reading, 'str'>, RegExp]> = [
  ['bool', /^(?:yes|Yes|YES|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF)$/],
  ['float', /^(?:[-+]?(?:[0-9][0-9_]*)\.[0-9_]*(?:[eE][-+][0-9]+)?|\.[0-9][0-9_]*(?:[eE][-+][0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/],
  ['int', /^(?:[-+]?0b[0-1_]+|[-+]?0[0-7_]+|[-+]?(?:0|[1-9][0-9_]*)|[-+]?0x[0-9a-fA-F_]+|[-+]?[1-9][0-9_]*(?::[0-5]?[0-9])+)$/],
  ['merge', /^<<$/],
  ['null', /^(?:~|null|Null|NULL|)$/],
  ['timestamp', /^(?:[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]|[0-9][0-9][0-9][0-9]-[0-9][0-9]?-[0-9][0-9]?(?:[Tt]|[ \t]+)[0-9][0-9]?:[0-9][0-9]:[0-9][0-9](?:\.[0-9]*)?(?:[ \t]*(?:Z|[-+][0-9][0-9]?(?::[0-9][0-9])?))?)$/],
  ['value', /^=$/],
]

/** What PyYAML makes of an unquoted scalar: the first resolver that matches, or a string. */
export function pyyamlReading(text: string): Reading {
  for (const [reading, pattern] of RESOLVERS) if (pattern.test(text)) return reading
  return 'str'
}

/** Numbers that both readers read to the same value: a decimal integer, an unsigned hexadecimal one, and a float written with a dot, without underscores. */
const SAME_NUMBER = /^(?:[-+]?(?:0|[1-9][0-9]*)|0x[0-9a-fA-F]+|[-+]?(?:[0-9]+\.[0-9]*|\.[0-9]+)(?:[eE][-+][0-9]+)?|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/
const SAME_BOOL = /^(?:true|True|TRUE|false|False|FALSE)$/

const NAMES: Record<Reading, string> = {
  str: 'a string',
  null: 'null',
  bool: 'a boolean',
  int: 'a number',
  float: 'a number',
  timestamp: 'a date',
  merge: 'a merge key',
  value: 'a YAML value tag, which PyYAML cannot construct',
}

/**
 * Why an unquoted scalar is read differently, or null when both readers agree. `text` is the scalar as written and
 * `value` is what the YAML 1.2 reader made of it.
 */
export function divergence(text: string, value: unknown): string | null {
  const py = pyyamlReading(text)
  const here = value === null ? 'null' : typeof value === 'boolean' ? 'a boolean' : typeof value === 'number' ? 'a number' : 'a string'
  const same =
    (py === 'str' && typeof value === 'string') ||
    (py === 'null' && value === null) ||
    (py === 'bool' && typeof value === 'boolean' && SAME_BOOL.test(text)) ||
    ((py === 'int' || py === 'float') && typeof value === 'number' && SAME_NUMBER.test(text))
  if (same) return null
  return `${JSON.stringify(text)} is read as ${NAMES[py]} by PyYAML (YAML 1.1), which GATE-schema reads this file with, and as ${here} here: put it in quotes`
}
