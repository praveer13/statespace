// Reading rules for lasso@1, and a reader for TLC's text trace (the fallback input).
// The rules are written out in docs/spikes/W0-S05.md, "Reading rules". No dependencies.
//
//   node lasso-read.mjs <trace.json>      print how the rules read one JSON trace
//
// readCounterexample() expects input that already passed schemas/drafts/lasso.schema.json.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** JSON deep equality: array order matters, object key order does not. */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => Object.hasOwn(b, k) && deepEqual(a[k], b[k]));
}

const range = (from, to) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
const sameState = (a, b) => a[0] === b[0] && deepEqual(a[1], b[1]);

/**
 * Apply rules 1 to 6 to a parsed TLC JSON counterexample.
 * Returns { kind: 'lasso' | 'finite' | 'invalid', ok, errors, n, ... }; for a lasso that reads
 * cleanly, also the loop start k, the stem and cycle as state indexes, whether the cycle is a
 * stutter, and the cycle's steps with whether each one changes the state.
 */
export function readCounterexample(trace) {
  const { state: states, action: steps } = trace.counterexample;
  const n = states.length;
  const errors = [];

  // Rule 1: the states are listed as 1..n in order.
  states.forEach(([index], p) => {
    if (index !== p + 1) errors.push(`rule 1: the state at position ${p + 1} has index ${index}`);
  });

  // Rule 2: n steps is a lasso, n - 1 a finite counterexample, anything else is not TLC's shape.
  let kind;
  if (steps.length === n) kind = 'lasso';
  else if (steps.length === n - 1) kind = 'finite';
  else {
    errors.push(`rule 2: ${steps.length} steps for ${n} states; a lasso has ${n}, a finite trace ${n - 1}`);
    return { kind: 'invalid', ok: false, errors, n };
  }

  // Rule 3: step p starts at state p and, except for a lasso's closing step, ends at state p + 1.
  steps.forEach(([source, , target], p) => {
    if (!sameState(source, states[p])) errors.push(`rule 3: step ${p + 1} does not start at state ${p + 1}`);
    const closing = kind === 'lasso' && p === n - 1;
    if (!closing && !sameState(target, states[p + 1])) {
      errors.push(`rule 3: step ${p + 1} does not end at state ${p + 2}`);
    }
  });
  if (kind === 'finite') return { kind, ok: errors.length === 0, errors, n };

  // Rule 4: the closing step starts at state n and ends at a listed state k; the loop starts at k.
  const [, closingAction, [k, targetValues]] = steps[n - 1];
  const inRange = k >= 1 && k <= n;
  if (!inRange) errors.push(`rule 4: the closing step ends at state ${k}, outside 1..${n}`);
  else if (!deepEqual(targetValues, states[k - 1][1])) {
    errors.push(`rule 4: the closing step ends at state ${k} with values that differ from the listed state ${k}`);
  }

  // Rule 5: the stem is states 1..k-1; the cycle is states k..n, entered again by the closing step.
  // Rule 6: k = n is a stutter; a step takes an action only if it changes the state.
  return {
    kind,
    ok: errors.length === 0,
    errors,
    n,
    loopStart: inRange ? k : null,
    stem: inRange ? range(1, k - 1) : null,
    cycle: inRange ? range(k, n) : null,
    stutter: inRange ? k === n : null,
    closing: { from: n, to: k, label: closingAction.name },
    cycleSteps: inRange
      ? steps.slice(k - 1).map(([s, a, t]) => ({ from: s[0], to: t[0], label: a.name, changes: !deepEqual(s[1], t[1]) }))
      : null,
  };
}

const LABEL = /^(\w+)(?:\((.*?)\))? line (\d+), col (\d+) to line (\d+), col (\d+) of module (\w+)$/;

/**
 * Read TLC's text counterexample (jars 1.7.4 and 1.8.0): states with raw TLA+ values, how the
 * trace ends ("Back to state k" or "State n+1: Stuttering"), and the violated property when the
 * jar names it.
 */
export function readTextTrace(text) {
  const states = [];
  let current = null;
  let closing = null;
  let property = null;
  let propertyNamed = null;
  const parseLabel = (s) => {
    const m = LABEL.exec(s);
    if (!m) return { raw: s };
    return { name: m[1], args: m[2] ?? null, loc: m.slice(3, 7).map(Number), module: m[7] };
  };
  for (const line of text.split(/\r?\n/)) {
    let m;
    if ((m = /^Error: Temporal property (\S+) was violated\.$/.exec(line))) {
      property = m[1];
      propertyNamed = true;
    } else if (/^Error: Temporal properties were violated\.$/.test(line)) {
      propertyNamed = false;
    } else if ((m = /^State (\d+): Stuttering$/.exec(line))) {
      closing = { kind: 'stutter', index: Number(m[1]) };
      current = null;
    } else if ((m = /^State (\d+): <(.+)>$/.exec(line))) {
      current = { index: Number(m[1]), label: parseLabel(m[2]), values: {} };
      states.push(current);
    } else if ((m = /^Back to state (\d+): <(.+)>$/.exec(line))) {
      closing = { kind: 'back', to: Number(m[1]), label: parseLabel(m[2]) };
      current = null;
    } else if (current && (m = /^\/\\ (\w+) = (.*)$/.exec(line))) {
      current.values[m[1]] = m[2];
    }
  }
  return { states, closing, property, propertyNamed };
}

const scalar = (raw) => (/^-?\d+$/.test(raw) ? Number(raw) : /^"[^"\\]*"$/.test(raw) ? JSON.parse(raw) : undefined);

/** Differences between a text trace and a JSON trace of the same run, as a list of strings. */
export function compareTextToJson(text, trace, read) {
  const diffs = [];
  const steps = trace.counterexample.action;
  const states = trace.counterexample.state;
  if (text.states.length !== read.n) diffs.push(`state count: text ${text.states.length}, JSON ${read.n}`);
  if (read.stutter) {
    if (text.closing?.kind !== 'stutter' || text.closing.index !== read.n + 1) {
      diffs.push(`ending: JSON stutters at state ${read.n}, text ends ${JSON.stringify(text.closing)}`);
    }
  } else if (text.closing?.kind !== 'back' || text.closing.to !== read.loopStart) {
    diffs.push(`ending: JSON loops back to state ${read.loopStart}, text ends ${JSON.stringify(text.closing)}`);
  }
  text.states.forEach((s, p) => {
    for (const [name, raw] of Object.entries(s.values)) {
      const v = scalar(raw);
      if (v !== undefined && v !== states[p]?.[1][name]) diffs.push(`state ${p + 1} ${name}: text ${raw}, JSON ${JSON.stringify(states[p]?.[1][name])}`);
    }
  });
  const sameLabel = (t, a) =>
    t.name === a.name && t.loc?.join() === [a.location.beginLine, a.location.beginColumn, a.location.endLine, a.location.endColumn].join();
  text.states.slice(1).forEach((s, p) => {
    if (!sameLabel(s.label, steps[p][1])) diffs.push(`step ${p + 1} label: text ${JSON.stringify(s.label)}, JSON ${steps[p][1].name}`);
  });
  if (text.closing?.kind === 'back' && !read.stutter && !sameLabel(text.closing.label, steps[read.n - 1][1])) {
    diffs.push(`closing label: text ${JSON.stringify(text.closing.label)}, JSON ${steps[read.n - 1][1].name}`);
  }
  return diffs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node lasso-read.mjs <trace.json>');
    process.exit(2);
  }
  console.log(JSON.stringify(readCounterexample(JSON.parse(readFileSync(file, 'utf8'))), null, 2));
}
