// The comparison of GATE-conformance's built-in pair, Pyodide Z3 = native Z3 on the same queries (W1-T42).
// Pure: it takes what two engines printed and returns rows and findings, so a test or a self-check can hand it
// engines that lie, and the gate can be seen to trip.
//
// Equality (ARCHITECTURE.md section 13.3): verdicts exact; the reason of an `unknown` exact; a witness never compared by
// value, but each engine's witness must satisfy the query's property (z3-corpus.mjs). Two witnesses that happen to be
// equal are reported, never required.

import { PINS } from './engines.mjs';
import { parseResults } from './z3-corpus.mjs';

/**
 * @typedef {object} EngineOutcome
 * @property {'native'|'pyodide'} id
 * @property {string} describe
 * @property {{z3: string}} probe
 * @property {{exitCode: number|null, timedOut: boolean, spawnError?: string|null, stderr: string, stdout: string, durationMs: number}} run
 */

/**
 * @param {{queries: import('./z3-corpus.mjs').Query[], native: EngineOutcome, pyodide: EngineOutcome}} input
 * @returns {{compared: number, equal: number, rows: object[], findings: {check: string, where: string, detail: string}[], witnessesEqual: number}}
 */
export function compareZ3Pair({ queries, native, pyodide }) {
  const findings = [];
  const fail = (check, where, detail) => findings.push({ check, where, detail });
  const outcomes = { native, pyodide };
  const parsed = {};
  for (const [id, o] of Object.entries(outcomes)) {
    if (o.probe.z3 !== PINS.z3.versionString) fail('pin', id, `runs z3 ${o.probe.z3}; the pin is ${PINS.z3.versionString}`);
    if (o.run.timedOut) fail('engine', id, `the program did not finish within its time limit (${Math.round(o.run.durationMs / 1000)} s)`);
    else if (o.run.exitCode !== 0) fail('engine', id, `the program exited with ${o.run.exitCode ?? o.run.spawnError}: ${(o.run.stderr || '').trim().split('\n').at(-1) || 'no message'}`);
    parsed[id] = parseResults(o.run.stdout);
    for (const p of parsed[id].problems) fail('engine', id, p);
  }

  const rows = [];
  let witnessesEqual = 0;
  for (const q of queries) {
    const n = parsed.native.results.get(q.id);
    const p = parsed.pyodide.results.get(q.id);
    const before = findings.length;
    let witnessBad = false;
    const row = { id: q.id, specimen: q.specimen, native: n?.verdict ?? null, pyodide: p?.verdict ?? null, reason: null, witness: null, ok: false };
    for (const [id, r] of [['native', n], ['pyodide', p]]) {
      if (!r) fail('missing', q.id, `${id} printed no RESULT for this query`);
      else if (r.error) fail('error', q.id, `${id}: ${r.error}`);
    }
    if (n && p && !n.error && !p.error) {
      if (n.verdict !== p.verdict) fail('verdict', q.id, `native says ${n.verdict}, Pyodide says ${p.verdict}`);
      if (n.verdict === 'unknown' && p.verdict === 'unknown') {
        row.reason = n.reason;
        if (n.reason !== p.reason) fail('reason', q.id, `the reasons for unknown differ: native "${n.reason}", Pyodide "${p.reason}"`);
      }
    }
    for (const [id, r] of [['native', n], ['pyodide', p]]) {
      if (!r || r.error) continue;
      if (r.verdict !== q.expect.verdict) fail('expectation', q.id, `${id} says ${r.verdict}; the authored answer is ${q.expect.verdict}`);
      else if (q.expect.reasonIncludes && !String(r.reason ?? '').includes(q.expect.reasonIncludes)) fail('expectation', q.id, `${id}'s reason "${r.reason ?? ''}" does not include "${q.expect.reasonIncludes}"`);
      if (r.verdict === 'sat' && q.witness) {
        let why;
        try {
          why = q.witness(r.model ?? {});
        } catch (e) {
          why = e instanceof Error ? e.message : String(e);
        }
        if (why) {
          witnessBad = true;
          fail('witness', q.id, `${id}'s witness fails the property: ${why}`);
        }
      }
    }
    if (n?.verdict === 'sat' && p?.verdict === 'sat' && q.witness && !witnessBad) {
      const same = JSON.stringify(n.model) === JSON.stringify(p.model);
      if (same) witnessesEqual += 1;
      row.witness = same ? 'valid on both; the values are equal here (never required)' : 'valid on both; the values differ (never compared)';
    }
    row.ok = findings.length === before;
    rows.push(row);
  }
  return { compared: rows.length, equal: rows.filter((r) => r.ok).length, rows, findings, witnessesEqual };
}
