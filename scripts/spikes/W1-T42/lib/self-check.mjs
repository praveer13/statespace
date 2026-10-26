// The planted-fault self-checks behind `verify-specimens.mjs --self-check` and `verify-conformance.mjs --self-check` (W1-T42).
//
// Each check plants one fault in a scratch tree, or hands the gate an engine that lies, and requires the gate to fail on
// it; each control is the same tree without the fault and must pass. A gate that cannot be seen to trip proves nothing:
// these are the evidence that the nightly lane would go red, and a claim turn "unverified", when a specimen stops
// reproducing or a second semantics stops agreeing with its reference. No network and no Python: the engines are
// stand-ins (fixtures.mjs).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EngineUnavailable } from './engines.mjs';
import { QUERIES } from './z3-corpus.mjs';
import { REAL_CLAIMS, conformanceTree, echoEngine, resultsText, scratchDir, specimenTree, standInEngine, stubPair, writeTree } from './fixtures.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = path.resolve(HERE, '..', '..', '..');
const load = (name) => import(pathToFileURL(path.join(SCRIPTS, name)).href);

/** Run a gate's main in this process on a planted tree; returns { code, text }. */
async function runGate(main, args, deps) {
  const lines = [];
  const code = await main(args, { ...deps, out: (s) => lines.push(s) });
  return { code, text: lines.join('\n') };
}

function report(title, results, say) {
  say(title);
  for (const r of results) say(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.name}${r.detail ? `: ${r.detail}` : ''}`);
  const bad = results.filter((r) => !r.ok).length;
  say(`${title.split(' self-check')[0]} self-check: ${bad === 0 ? 'PASS' : 'FAIL'} (${results.length - bad} of ${results.length} held)`);
  return bad === 0 ? 0 : 1;
}

/** A check: `expect` is 'pass' (exit 0), 'fail' (exit 1) or 'error' (exit 2); `match` must occur in the output. */
function checker(results) {
  return (name, { code, text }, expect, match) => {
    const want = { pass: 0, fail: 1, error: 2 }[expect];
    const okCode = code === want;
    const okText = match === undefined || (match instanceof RegExp ? match.test(text) : text.includes(match));
    results.push({ name, ok: okCode && okText, detail: okCode && okText ? undefined : `exit ${code}, wanted ${want}${okText ? '' : `; the output lacks ${match}`}` });
  };
}

// ------------------------------------------------------------------ GATE-specimens
export async function selfCheckSpecimens({ say = console.log } = {}) {
  const { main } = await load('verify-specimens.mjs');
  const results = [];
  const check = checker(results);
  const scratch = scratchDir('specimens-self-check-');
  const engines = (over = {}) => ({ cacheDir: scratch, native: async () => echoEngine('native', over), pyodide: async () => echoEngine('pyodide', over) });
  const run = async (name, tree, expect, match, { args = [], eng = engines() } = {}) => {
    const root = path.join(scratch, name.replace(/\W+/g, '-').slice(0, 40));
    writeTree(root, tree);
    check(name, await runGate(main, ['--root', root, ...args], { engines: eng }), expect, match);
  };
  const full = (stage) => (stage === 'S1' ? { 'SP-1.1.json': { id: 'SP-1.1', runs: ['RUN-fx-a', 'RUN-fx-b', 'RUN-fx-later'] }, 'SP-1.2.json': { id: 'SP-1.2', runs: ['RUN-fx-c'] } } : {});
  try {
    await run('control: the runs reproduce, one is still to record', specimenTree(), 'pass', /SP-1\.1 +reproduced/);
    await run('planted: a recorded verdict line is not what the run prints', specimenTree({ tamper: true }), 'fail', /diverged/);
    await run('planted: the spine cites [X RUN-ghost] and there is no record', specimenTree({ ghost: true }), 'fail', /is not on disk/);
    await run('planted: the record was made on another z3 than the pin', specimenTree({ version: '5.2.0' }), 'fail', /re-record the run on the new pin/);
    await run('planted: the recorded script is gone from the repository', specimenTree({ missingScript: true }), 'fail', /is not in the repository/);
    await run('planted: a tool bump, the engine prints another verdict', specimenTree(), 'fail', /did not come back/, { eng: { cacheDir: scratch, native: async () => ({ ...echoEngine('native'), run: async () => ({ stdout: '[q1] unsat (0.00s) [x = 1]\n[q2] unsat\n[q3] unknown\n[q4] unsat\n', stderr: '', exitCode: 0, timedOut: false, durationMs: 5 }) }), pyodide: async () => echoEngine('pyodide') } });
    await run('control: a script that changed but prints the same lines is a note, not a failure', specimenTree({ scriptChanged: true }), 'pass', /changed since the run/);
    await run('control: a run no recipe re-executes is recorded only, and the gate passes', specimenTree({ noRecipe: true }), 'pass', /SP-1\.2 +recorded-only/);
    await run('planted: --strict fails the same run that no recipe re-executes', specimenTree({ noRecipe: true }), 'fail', /strict/, { args: ['--strict'] });
    await run('planted: --strict fails a run that is not recorded yet', specimenTree(), 'fail', /RUN-fx-later: pending/, { args: ['--strict'] });
    await run('control: a cabinet that mounts S1 whole', specimenTree({ cabinet: full('S1') }), 'pass', /the cabinet holds 2 records/);
    await run('planted: S1 is mounted in part (SP-1.2 is not)', specimenTree({ cabinet: { 'SP-1.1.json': full('S1')['SP-1.1.json'] } }), 'fail', /SP-1\.2 is not mounted/);
    await run('planted: a record leaves out a run the spine names', specimenTree({ cabinet: { ...full('S1'), 'SP-1.1.json': { id: 'SP-1.1', runs: ['RUN-fx-a', 'RUN-fx-later'] } } }), 'fail', /does not cite RUN-fx-b/);
    await run('planted: a record mounts a specimen the spine does not list', specimenTree({ cabinet: { ...full('S1'), 'SP-1.9.json': { id: 'SP-1.9', runs: [] } } }), 'fail', /SP-1\.9 is not a specimen/);
    await run('planted: a record that names no specimen', specimenTree({ cabinet: { ...full('S1'), 'notes.json': { runs: [] } } }), 'fail', /cannot tell which specimen/);
    await run('planted: a record cites a run that is neither on disk nor registered', specimenTree({ cabinet: { ...full('S1'), 'SP-1.2.json': { id: 'SP-1.2', runs: ['RUN-fx-c', 'RUN-fx-nowhere'] } } }), 'fail', /RUN-fx-nowhere/);
    await run('planted: the claims file does not back GATE-specimens', specimenTree({ claims: { 'GATE-interp': ['SEAM-13'], 'GATE-conformance': ['SEAM-13'] } }), 'fail', /must back SEAM-14/);
    await run('planted: the claims file names a claim the spine does not register', specimenTree({ claims: { ...REAL_CLAIMS, 'GATE-specimens': ['SEAM-14', 'SEAM-99'] } }), 'fail', /SEAM-99/);
    await run('planted: no claims file at all', specimenTree({ claims: null }), 'fail', /does not exist/);
    await run('planted: an engine cannot be set up (the gate exits 2, never 0)', specimenTree(), 'error', /cannot run/, {
      eng: { cacheDir: scratch, native: async () => { throw new EngineUnavailable('no uv and no python with z3 on PATH'); }, pyodide: async () => echoEngine('pyodide') },
    });
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  return report('GATE-specimens self-check: plant one fault at a time; the gate must fail on each and pass the controls', results, say);
}

// ------------------------------------------------------------------ GATE-conformance
export async function selfCheckConformance({ say = console.log } = {}) {
  const { main } = await load('verify-conformance.mjs');
  const results = [];
  const check = checker(results);
  const scratch = scratchDir('conformance-self-check-');
  const both = (native, pyodide) => ({ cacheDir: scratch, native: async () => native, pyodide: async () => pyodide });
  const pair = async (name, { native = standInEngine('native'), pyodide = standInEngine('pyodide'), queries, expect, match, args = [] }) => {
    const root = path.join(scratch, name.replace(/\W+/g, '-').slice(0, 40));
    writeTree(root, conformanceTree());
    check(name, await runGate(main, ['--root', root, '--only', 'z3-same-query', ...args], { engines: both(native, pyodide), queries }), expect, match);
  };
  const edited = (edit, z3) => standInEngine('pyodide', { text: resultsText(edit), z3 });
  try {
    await pair('control: two engines that agree on every query', { expect: 'pass', match: /11 of 11 queries equal/ });
    await pair('planted: Pyodide answers unsat where native says sat (the recipient wrap)', { pyodide: edited((id, r) => (id === 'bv64-recipient-wrap' ? { verdict: 'unsat' } : r)), expect: 'fail', match: /native says sat, Pyodide says unsat/ });
    await pair('planted: both engines return a witness that breaks the wrap property', { native: standInEngine('native', { text: resultsText((id, r) => (id === 'bv64-recipient-wrap' ? { verdict: 'sat', model: { A: '5', B: '5', X: '1' } } : r)) }), expect: 'fail', match: /native's witness fails the property/ });
    await pair('control: two different valid witnesses are not a difference (witnesses are never compared by value)', { pyodide: edited((id, r) => (id === 'starter-overdraft' ? { verdict: 'sat', model: { a: '3', b: '9', amount: '7' } } : r)), expect: 'pass', match: /the values differ \(never compared\)/ });
    await pair('planted: the reasons for an unknown differ', { pyodide: edited((id, r) => (id === 'unknown-pow' ? { verdict: 'unknown', reason: 'timeout' } : r)), expect: 'fail', match: /the reasons for unknown differ/ });
    await pair('planted: an engine does not answer a query', { native: standInEngine('native', { text: resultsText((id, r) => (id === 'vacuous-premises' ? null : r)) }), expect: 'fail', match: /native printed no RESULT/ });
    await pair('planted: a query raises inside an engine', { pyodide: edited((id, r) => (id === 'optimize-min' ? { error: 'Z3Exception: boom' } : r)), expect: 'fail', match: /pyodide: Z3Exception: boom/ });
    await pair('planted: the program exits non-zero on one engine', { pyodide: standInEngine('pyodide', { exitCode: 1, stderr: 'Traceback\nValueError: x' }), expect: 'fail', match: /exited with 1/ });
    await pair('planted: the program does not finish on one engine', { native: standInEngine('native', { timedOut: true }), expect: 'fail', match: /did not finish within its time limit/ });
    await pair('planted: an engine at another version than its pin', { native: standInEngine('native', { z3: '5.4.0' }), expect: 'fail', match: /the pin is 5\.3\.1/ });
    await pair('planted: both engines agree on an answer that is not the authored one', { queries: QUERIES.map((q) => (q.id === 'unknown-pow' ? { ...q, expect: { verdict: 'sat' } } : q)), expect: 'fail', match: /the authored answer is sat/ });
    await pair('planted: an unreadable RESULT line', { native: standInEngine('native', { text: `${resultsText()}RESULT {not json\n` }), expect: 'fail', match: /unreadable RESULT/ });

    const rootOf = (name, tree) => writeTree(path.join(scratch, name.replace(/\W+/g, '-').slice(0, 40)), tree);
    const runner = async (name, tree, args, expect, match) => {
      const root = rootOf(name, tree);
      check(name, await runGate(main, ['--root', root, ...args], { engines: both(standInEngine('native'), standInEngine('pyodide')) }), expect, match);
    };
    const held = { pair: 'pocket-z3', ok: true, compared: 40, equal: 40, differences: [] };
    const differs = { pair: 'pocket-z3', ok: false, compared: 40, equal: 39, differences: [{ fixture: 'p17', expected: 'sat', got: 'unsat' }] };
    await runner('control: a pair script that reports and exits as the protocol says', conformanceTree({ pairs: { 'pocket-z3': stubPair(held) } }), ['--only', 'pocket-z3'], 'pass', /40 of 40 equal/);
    await runner('planted: a pair script that reports a difference and exits 1', conformanceTree({ pairs: { 'pocket-z3': stubPair(differs, 1) } }), ['--only', 'pocket-z3'], 'fail', /1 difference/);
    await runner('planted: a pair script whose report says ok but whose exit status says 1', conformanceTree({ pairs: { 'pocket-z3': stubPair(held, 1) } }), ['--only', 'pocket-z3'], 'fail', /cannot agree with itself/);
    await runner('planted: a pair script that exits 1 and prints text only', conformanceTree({ pairs: { 'pocket-z3': stubPair('2 of 40 differ', 1, { text: true }) } }), ['--only', 'pocket-z3'], 'fail', /2 of 40 differ/);
    await runner('planted: a pair script that could not run (exit 2): the gate does not pass', conformanceTree({ pairs: { 'pocket-z3': stubPair('no tlc jar', 2, { text: true }) } }), ['--only', 'pocket-z3'], 'error', /it exited 2: no tlc jar/);
    await runner('control: an absent pair is reported with its builder and is not a pass or a failure', conformanceTree(), ['--only', 'pocket-z3'], 'pass', /pocket-z3 \(W1-T19\)/);
    await runner('planted: the same absent pair, required', conformanceTree(), ['--only', 'pocket-z3', '--require', 'pocket-z3'], 'fail', /this run requires the pair/);
    await runner('planted: the claims file does not back GATE-conformance', conformanceTree({ claims: { 'GATE-interp': ['SEAM-13'], 'GATE-specimens': ['SEAM-14'] } }), ['--only', 'pocket-z3'], 'fail', /must back SEAM-13/);
    await runner('planted: the claims file names a gate the spine does not register', conformanceTree({ claims: { ...REAL_CLAIMS, 'GATE-conformence': ['SEAM-13'] } }), ['--only', 'pocket-z3'], 'fail', /not a registered gate ID/);
    const unavailable = { cacheDir: scratch, native: async () => { throw new EngineUnavailable('uv is not installed'); }, pyodide: async () => standInEngine('pyodide') };
    const root = rootOf('planted-engine-missing', conformanceTree());
    check('planted: an engine cannot be set up (the gate exits 2, never 0)', await runGate(main, ['--root', root, '--only', 'z3-same-query'], { engines: unavailable }), 'error', /uv is not installed/);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  return report('GATE-conformance self-check: plant one fault at a time; the gate must fail on each and pass the controls', results, say);
}
