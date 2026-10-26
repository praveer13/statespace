// Planted-fault tests of `record.mjs check`: a scratch copy of the eleven records, their logs and exports,
// the inputs and the three research files it compares, with one fault planted at a time. The check must pass
// on the untouched copy and fail on each fault. Run with: node --test "scripts/spikes/W1-T12/*.test.mjs"
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import * as lib from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const IDS = [
  'RUN-z3-boot-variant', 'RUN-z3-demorgan', 'RUN-z3-vacuous-unsat', 'RUN-z3-double-capture', 'RUN-z3-refund-mint',
  'RUN-z3-bv64-negamt', 'RUN-z3-btc2010', 'RUN-z3-bloch06', 'RUN-z3-smtlib-tour', 'RUN-pg-numeric-bound', 'RUN-rust-i64',
];
const RESEARCH = ['research/evidence/a2r3/scripts/z3_negamt.py', 'research/evidence/a2r3/rust/Cargo.toml', 'research/evidence/a2r3/rust/src/main.rs'];

function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w1t12-check-'));
  for (const id of IDS) {
    fs.mkdirSync(path.join(dir, 'runs'), { recursive: true });
    fs.copyFileSync(path.join(REPO, 'runs', `${id}.json`), path.join(dir, 'runs', `${id}.json`));
    fs.cpSync(path.join(REPO, 'runs', id), path.join(dir, 'runs', id), { recursive: true });
  }
  fs.cpSync(path.join(REPO, 'runs', 'inputs', 'S1'), path.join(dir, 'runs', 'inputs', 'S1'), { recursive: true });
  for (const f of RESEARCH) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.copyFileSync(path.join(REPO, f), path.join(dir, f));
  }
  return dir;
}
const check = (dir) => spawnSync(process.execPath, [path.join(HERE, 'record.mjs'), 'check', '--root', dir], { encoding: 'utf8' });
const edit = (dir, rel, fn) => {
  const file = path.join(dir, rel);
  const before = fs.readFileSync(file, 'utf8');
  const after = fn(before);
  assert.notEqual(after, before, `the fault changed nothing in ${rel}`);
  fs.writeFileSync(file, after);
};

/** Plants one fault in a fresh scratch copy; the check must fail and say why. */
function planted(name, fault, expected) {
  test(`a planted fault is caught: ${name}`, () => {
    const dir = scratch();
    try {
      fault(dir);
      const r = check(dir);
      assert.equal(r.status, 1, `the check should fail:\n${r.stdout}`);
      assert.match(r.stdout, expected);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('the check passes on an untouched copy of the records', () => {
  const dir = scratch();
  try {
    const r = check(dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /W1-T12 check: PASS/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

planted('a verdict flipped in a log', (d) => edit(d, 'runs/RUN-z3-demorgan/native.log', (t) => t.split('\n').map((l) => (l.includes('"q": "mis_negation"') ? l.replace('"verdict": "unsat"', '"verdict": "sat"') : l)).join('\n')), /RUN-z3-demorgan: (values|checks) are not what its logs say/);
planted('an SMT-LIB export removed', (d) => fs.rmSync(path.join(d, 'runs/RUN-z3-boot-variant/smt2/corrected_guard.smt2')), /RUN-z3-boot-variant: runs\/RUN-z3-boot-variant\/smt2 holds \d+ exports, the queries name \d+/);
planted('an SMT-LIB export changed', (d) => edit(d, 'runs/RUN-z3-boot-variant/smt2/corrected_guard.smt2', (t) => `${t}; edited\n`), /smt2\/corrected_guard.smt2 is not the text its log hashes/);
planted('a helper block that drifts in one script', (d) => edit(d, 'runs/inputs/S1/RUN-z3-bloch06/bloch06.py', (t) => t.replace('RLIMIT = 5000000', 'RLIMIT = 6000000')), /the helper blocks differ/);
planted('a record whose values were edited', (d) => edit(d, 'runs/RUN-z3-refund-mint.json', (t) => t.replace('"verdicts_agree": true', '"verdicts_agree": false')), /RUN-z3-refund-mint: values are not what its logs say/);
planted('a record whose pass does not follow its checks', (d) => edit(d, 'runs/RUN-rust-i64.json', (t) => t.replace('"pass": true,\n  "environment"', '"pass": false,\n  "environment"')), /RUN-rust-i64: pass does not follow the checks/);
planted('a verdict line edited in a configuration', (d) => edit(d, 'runs/RUN-z3-btc2010.json', (t) => t.replaceAll('[fix_2010] unsat', '[fix_2010] sat')), /verdict_lines are not the log's lines/);
planted('a copy that is not the research source', (d) => edit(d, 'runs/inputs/S1/RUN-rust-i64/ovf/src/main.rs', (t) => `${t}// edited\n`), /is not byte-identical to research\/evidence\/a2r3\/rust\/src\/main.rs/);
planted('a cvc5 verdict that disagrees', (d) => edit(d, 'runs/RUN-z3-double-capture/cvc5-bench.log', (t) => t.replace('at_most_once_fixed: unsat', 'at_most_once_fixed: sat')), /RUN-z3-double-capture: (values|checks) are not what its logs say/);
planted('a PostgreSQL log whose ERROR line sits after the echoes (the two streams captured apart)', (d) => edit(d, 'runs/RUN-pg-numeric-bound/postgres-18.log', (t) => {
  const err = 'psql:/q/numeric_bound.sql:17: ERROR:  bigint out of range\n';
  return t.replace(err, '').replace('9223372036854775807\ncase numeric19_below_bound', `9223372036854775807\n${err}case numeric19_below_bound`);
}), /RUN-pg-numeric-bound: checks are not what its logs say/);
// A note is built from the record's own data, so an edited note is caught like an edited value: here the timing
// note gives the session's name to the docker run's span, the mislabelling a verifier found in round 3.
planted('a timing note that calls the docker run the session', (d) => edit(d, 'runs/RUN-z3-refund-mint.json', (t) => t.replace('session_wall_ms, from started_at to when the last script had finished', 'session_wall_ms, the whole docker run')), /RUN-z3-refund-mint: notes\[\d+\] is not what its configurations, values and logs say/);
planted('a note that says every query has an export', (d) => edit(d, 'runs/RUN-z3-double-capture.json', (t) => t.replace(/ \(null for minimize_hold and minimize_pool_patched, which have no export\)/, '')), /RUN-z3-double-capture: notes\[\d+\] is not what its configurations, values and logs say/);
// the fixed detail of round 3, put back where two queries have no export
planted('the old fixed exports-identical detail', (d) => edit(d, 'runs/RUN-z3-vacuous-unsat.json', (t) => t.replace(/("id": "exports-identical",\n\s*"pass": true,\n\s*"detail": )"[^"]*"/, '$1"every configuration exported the same SMT-LIB text for every query"')), /RUN-z3-vacuous-unsat: checks are not what its logs say/);
planted('a browser configuration without the session\'s span', (d) => edit(d, 'runs/RUN-z3-btc2010.json', (t) => t.replace(/\n\s*"session_wall_ms": \d+,/, '')), /RUN-z3-btc2010\/pyodide-\w+: the environment lacks the session's or the docker run's span/);
planted('a session that does not lie inside its docker run', (d) => edit(d, 'runs/RUN-z3-bloch06.json', (t) => {
  const rec = JSON.parse(t);
  const c = rec.configs.find((x) => x.id === 'pyodide-webkit');
  c.environment.docker_run_started_at = new Date(Date.parse(c.started_at) + 1000).toISOString();
  return `${JSON.stringify(rec, null, 2)}\n`;
}), /RUN-z3-bloch06\/pyodide-webkit: the session's span does not lie inside the docker run's/);
planted('a record that is missing',(d) => fs.rmSync(path.join(d, 'runs/RUN-pg-numeric-bound.json')), /runs\/RUN-pg-numeric-bound.json is missing/);
// The record, its logs and its exports agree with each other, and an Optimize answer has lost the plain query that
// cvc5 runs in its place: the record fails on its own checks, not by drift.
planted('an Optimize answer whose plain query is gone from the logs, the exports and the record alike', (d) => {
  const id = 'RUN-z3-refund-mint';
  const recFile = path.join(d, 'runs', `${id}.json`);
  const rec = JSON.parse(fs.readFileSync(recFile, 'utf8'));
  const drop = (t) => t.split('\n').filter((l) => !l.includes('"q": "no_smaller_mint"') && !l.startsWith('[no_smaller_mint]') && l !== 'no_smaller_mint: unsat').join('\n');
  for (const c of rec.configs) edit(d, c.outputs.find((o) => o.endsWith('.log')), drop);
  fs.rmSync(path.join(d, 'runs', id, 'smt2', 'no_smaller_mint.smt2'));
  const read = (c) => fs.readFileSync(path.join(d, c.outputs.find((o) => o.endsWith('.log'))), 'utf8');
  const logs = Object.fromEntries(rec.configs.filter((c) => c.id !== lib.CVC5_CONFIG).map((c) => [c.id, read(c)]));
  const derived = lib.deriveZ3(id, logs, read(rec.configs.find((c) => c.id === lib.CVC5_CONFIG)));
  // the Optimize answer's own check fails, beside the missing query's
  assert.match(derived.checks.find((c) => c.id === 'minimize_minted').detail ?? '', /its plain query no_smaller_mint is missing/);
  Object.assign(rec, { values: derived.values, checks: derived.checks, pass: derived.checks.every((c) => c.pass) });
  for (const c of rec.configs) c.verdict_lines = lib.humanLines(read(c));
  fs.writeFileSync(recFile, `${JSON.stringify(rec, null, 2)}\n`);
}, /FAIL  RUN-z3-refund-mint: \d+ of \d+ checks/);
