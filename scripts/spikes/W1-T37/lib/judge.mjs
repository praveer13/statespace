// What GATE-calls and its conformance pair conclude from what the engines printed (W1-T37). Pure: cells, the two
// engines' replies and cvc5's answers go in; rows and findings come out. The planted fixtures and the tests hand it
// replies and answers that lie, so the gate can be seen to trip on every check.
//
// The checks, each a finding's `check`:
//   page         a page that cannot be read in full: a file that cannot be read or has no front matter, so its cells
//                cannot be seen, or two cells with one number, which GATE-calls cannot tell apart
//   cell-code    a call whose cell has no code GATE-calls can run (no code, or a language Z3 does not run), or a free
//                run on INS-z3 whose code is in a language Z3 does not run, so it would never be reproduced
//   instrument   a call on an instrument with no engine here yet, or a Lean call in the nightly lane (Lean calls are
//                deferred to the nightly lane, spine section 11.2)
//   run          the cell did not run to its end on an engine: it raised, the watchdog stopped it, or the engine died
//                or answered with no checks; or the gate could not record one of the checks it made
//   no-check     a call whose cell makes no solver check, so there is no result to compare with the key
//   divergence   native and Pyodide disagree on the number of checks, a verdict, the reason of an `unknown`, or an
//                optimum (witness values are never compared: they are not canonical [X RUN-z3-bv64-pyodide])
//   key          the called check's result on an engine is not what the key claims
//   key-read     the key option names no verdict GATE-calls reads and is no number
//   value-query  a value key on a query with no single optimum (a plain solver check, several objectives, soft ones)
//   witness      a `sat` check's model does not satisfy its query, by Z3's own evaluation on either engine, or cvc5
//                finds the query with the model's values asserted unsatisfiable (an SMT-LIB check, which shows no
//                model: cvc5 finds its query unsatisfiable); or Z3 could not settle an assertion under the model (a
//                quantifier it could not decide) and cvc5 does not settle it either
//   cvc5         an `unsat` check that cvc5 does not confirm: cvc5 says sat or unknown, or could not read or finish it
// cvc5 answers each query by itself, and only a single verdict with no error line counts: a query cvc5 answered with an
// error line is not the query Z3 checked.
//   optimum      cvc5 does not confirm a value key's optimum: something beyond it is satisfiable, or it is not attained
//   pin          an engine that is not at its pin
// In the conformance pair's mode only the checks between the two Z3 engines apply (no cvc5, no other instrument).

import { canonicalNumber, ENGINES_BUILT } from './cells.mjs';
import { PINS } from './engines.mjs';

export const CHECKS = Object.freeze({
  page: 'a page GATE-calls cannot read in full, so its cells cannot be seen or told apart',
  'cell-code': 'a call, or a free run on INS-z3, whose cell has no code GATE-calls can run',
  instrument: 'a call on an instrument with no engine here yet, or a Lean call in the nightly lane',
  run: 'the cell did not run to its end on an engine, or a check it made could not be recorded',
  'no-check': 'a call whose cell makes no solver check',
  divergence: 'native and Pyodide disagree on the checks, a verdict, the reason of an unknown or an optimum',
  key: "the called check's result is not the key's",
  'key-read': 'the key names no verdict GATE-calls reads and is no number',
  'value-query': 'a value key on a query with no single optimum',
  witness: "a sat check's model does not satisfy its query, or nothing settles whether it does",
  cvc5: 'an unsat check that cvc5 does not confirm',
  optimum: "cvc5 does not confirm a value key's optimum",
  pin: 'an engine that is not at its pin',
});

const ENGINES = ['native', 'pyodide'];
const RUNNABLE_LANGS = new Set(['python', 'smt2']);

/** A cell GATE-calls runs on the Z3 engines. */
export const runsOnZ3 = (cell) => cell.instrument?.engine === 'z3' && cell.code !== null && RUNNABLE_LANGS.has(cell.lang);

/**
 * A reply that holds the checks a cell made: the cell ran to its end, or raised after making them (the exception is
 * a finding of its own, and the checks it made are judged all the same).
 */
const holdsChecks = (reply) => Boolean(reply && reply.ok === true && !reply.terminated && !reply.crashed && Array.isArray(reply.checks));

/**
 * The queries cvc5 settles for the gate, one verdict each: every `unsat` both engines agree on (its query: a Python
 * check's export, or the query the harness cut for an SMT-LIB check), every `sat` witness (a Python check: the query
 * with that engine's model asserted; an SMT-LIB check, which shows no model: its query), and a value key's optimum
 * (nothing beyond it, and it attained). A task with `text: null` is a query with no export, which the judge reports as
 * not cross-checked.
 */
export function planCvc5(cells, replies) {
  const tasks = [];
  for (const cell of cells) {
    if (!runsOnZ3(cell)) continue;
    const n = replies.native.get(cell.ref);
    const p = replies.pyodide.get(cell.ref);
    if (!holdsChecks(n) || !holdsChecks(p)) continue;
    const ref = cell.ref;
    const count = Math.min(n.checks.length, p.checks.length);
    for (let i = 0; i < count; i++) {
      const cn = n.checks[i];
      const cp = p.checks[i];
      if (cn.verdict !== cp.verdict) continue;
      if (cn.verdict === 'unsat') tasks.push({ key: `${ref}#${i + 1}:unsat`, ref, check: i + 1, kind: 'unsat', text: cn.smt2 ?? null, missing: cn.smt2_error ?? null });
      if (cn.verdict === 'sat' && cell.lang === 'smt2') tasks.push({ key: `${ref}#${i + 1}:query`, ref, check: i + 1, kind: 'query', text: cn.smt2 ?? null, missing: cn.smt2_error ?? null });
      else if (cn.verdict === 'sat') {
        for (const [engine, c] of [['native', cn], ['pyodide', cp]]) {
          // a model Z3's own evaluation refutes has failed already: cvc5 has nothing to add
          if (c.witness?.holds === false) continue;
          tasks.push({ key: `${ref}#${i + 1}:witness:${engine}`, ref, check: i + 1, kind: 'witness', engine, text: c.witness_smt2 ?? null, missing: c.witness_smt2_error ?? null });
        }
      }
    }
    if (cell.call?.expect?.kind === 'value' && count >= 1 && n.checks[0].optimum_smt2) {
      tasks.push({ key: `${ref}#1:beyond`, ref, check: 1, kind: 'beyond', text: n.checks[0].optimum_smt2.beyond });
      tasks.push({ key: `${ref}#1:at`, ref, check: 1, kind: 'at', text: n.checks[0].optimum_smt2.at });
    }
  }
  return tasks;
}

/**
 * The verdict of cvc5's answer to a one-query task, or null with the reason. Only a single verdict with no error line
 * counts: cvc5 stops at a parse error and goes on past a command that fails, so a query it answered with an error line
 * is not the query Z3 checked, and several verdicts do not answer one query.
 */
function soleVerdict(answer) {
  if (!answer) return { verdict: null, why: 'cvc5 was not run on it' };
  const verdicts = answer.verdicts ?? [];
  const errors = answer.errors ?? [];
  if (errors.length) return { verdict: null, why: `cvc5 reported ${errors[0]}${verdicts.length ? ` and printed ${verdicts.join(', ')}` : ''}` };
  if (verdicts.length === 1) return { verdict: verdicts[0], why: null };
  if (verdicts.length > 1) return { verdict: null, why: `cvc5 printed ${verdicts.length} verdicts (${verdicts.join(', ')}) for one query` };
  return { verdict: null, why: answer.detail ?? 'cvc5 printed no verdict' };
}

/** "sat on both engines", or "sat on native and unsat on pyodide", from [engine, what] pairs. */
const onEngines = (pairs) => (pairs.length === 2 && pairs[0][1] === pairs[1][1] ? `${pairs[0][1]} on both engines` : pairs.map(([e, w]) => `${w} on ${e}`).join(' and '));

const describeChecks = (reply) =>
  holdsChecks(reply) ? (reply.checks.map((c) => c.verdict + (c.verdict === 'unknown' && c.reason ? ` (${c.reason})` : '')).join(', ') || 'no check') + (reply.error != null ? ', then raised' : '') : 'did not run';

function runProblem(reply) {
  if (!reply) return 'no reply came back';
  if (reply.terminated) return reply.detail ?? 'the watchdog stopped it';
  if (reply.crashed) return reply.detail ?? 'the engine died';
  if (reply.ok !== true) return `the engine refused it (${reply.code ?? 'error'}): ${reply.detail ?? ''}`.trim();
  if (reply.error != null) return `the cell raised ${reply.error}`;
  if (!Array.isArray(reply.checks)) return 'the reply holds no checks';
  return null;
}

/**
 * Judge every cell. `lane` is fast or nightly; `mode` is gate (every check) or pair (the two Z3 engines only).
 * @returns {{rows: object[], findings: {check: string, ref: string, file: string|null, detail: string}[], counts: object}}
 */
export function judgeCells({ cells, replies, cvc5 = new Map(), lane = 'fast', mode = 'gate' }) {
  const findings = [];
  const rows = [];
  const counts = { cells: 0, calls: 0, ran: 0, unsatChecked: 0, unsatConfirmed: 0, witnessesConfirmed: 0, optimaConfirmed: 0, deferred: 0, notRun: 0 };
  const gate = mode === 'gate';
  for (const cell of cells) {
    if (!gate && cell.instrument?.engine !== 'z3') continue;
    counts.cells += 1;
    if (cell.call) counts.calls += 1;
    const local = [];
    const fail = (check, detail) => local.push({ check, ref: cell.ref, file: cell.file, detail });
    const row = { ref: cell.ref, file: cell.file, ins: cell.ins, lang: cell.lang, call: cell.call ? { key: cell.call.key, expect: cell.call.expect } : null, native: null, pyodide: null, cvc5: [], status: 'ok', notes: [] };

    const engine = cell.instrument?.engine ?? null;
    if (engine !== 'z3') {
      if (cell.call) {
        if (!cell.instrument) fail('instrument', `GATE-calls has no engine for ${cell.ins || 'a cell with no instrument'}, so this call cannot be reproduced`);
        else if (cell.instrument.lane === 'nightly' && lane !== 'nightly') {
          row.status = 'deferred';
          row.notes.push(`a call on ${cell.ins} is reproduced in the nightly lane (${cell.instrument.label})`);
          counts.deferred += 1;
        } else if (!ENGINES_BUILT.has(engine)) fail('instrument', `GATE-calls cannot reproduce a call on ${cell.ins} yet: its engine (${cell.instrument.label}) lands with ${cell.instrument.lands}`);
      } else {
        row.status = 'not-run';
        row.notes.push(`a free run on ${cell.ins || 'no instrument'}: nothing to reproduce`);
        counts.notRun += 1;
      }
      finish(row, local, findings, rows);
      continue;
    }

    if (!runsOnZ3(cell)) {
      if (cell.call) fail('cell-code', cell.code === null ? 'the cell asks for a call but has no code to run' : `the cell's code is ${cell.lang}, which Z3 does not run (python or smt2)`);
      else if (cell.code !== null) fail('cell-code', `a free run on ${cell.ins} in ${cell.lang}, which Z3 does not run (python or smt2), so its results would never be reproduced or cross-checked`);
      else {
        row.status = 'not-run';
        row.notes.push('a cell with no code: nothing to run');
        counts.notRun += 1;
      }
      finish(row, local, findings, rows);
      continue;
    }

    const got = { native: replies.native.get(cell.ref), pyodide: replies.pyodide.get(cell.ref) };
    row.native = describeChecks(got.native);
    row.pyodide = describeChecks(got.pyodide);
    for (const e of ENGINES) {
      const why = runProblem(got[e]);
      if (why) fail('run', `${e}: ${why}`);
    }
    if (!ENGINES.every((e) => holdsChecks(got[e]))) {
      finish(row, local, findings, rows);
      continue;
    }
    const raised = ENGINES.some((e) => got[e].error != null);
    if (!raised) counts.ran += 1;
    const n = got.native.checks;
    const p = got.pyodide.checks;

    // native = Pyodide on the same cell
    if (n.length !== p.length) fail('divergence', `native made ${n.length} check(s) and Pyodide ${p.length}`);
    for (let i = 0; i < Math.min(n.length, p.length); i++) {
      const a = n[i];
      const b = p[i];
      if (a.verdict !== b.verdict) fail('divergence', `check ${i + 1}: native says ${a.verdict}, Pyodide says ${b.verdict}`);
      else if (a.verdict === 'unknown' && (a.reason ?? null) !== (b.reason ?? null)) fail('divergence', `check ${i + 1}: the reasons for unknown differ: native "${a.reason}", Pyodide "${b.reason}"`);
      else if (a.verdict === 'sat' && Array.isArray(a.objectives) && Array.isArray(b.objectives)) {
        const va = a.objectives.map((o) => o.value).join(', ');
        const vb = b.objectives.map((o) => o.value).join(', ');
        if (va !== vb) fail('divergence', `check ${i + 1}: the optimum differs: native ${va}, Pyodide ${vb}`);
      }
    }

    // the call: the first check against the key
    if (cell.call) {
      const expect = cell.call.expect;
      if (n.length === 0 || p.length === 0) {
        if (!raised) fail('no-check', "the cell's code makes no solver check, so no result can be compared with the key");
      }
      else if (expect.kind === 'unreadable') fail('key-read', expect.why);
      else if (expect.kind === 'verdict') {
        const off = ENGINES.filter((e) => got[e].checks[0].verdict !== expect.verdict);
        if (off.length) fail('key', `the called check is ${onEngines(off.map((e) => [e, got[e].checks[0].verdict]))}; key ${cell.call.key} ("${expect.keyText}") claims ${expect.verdict}`);
      } else if (expect.kind === 'value') {
        const c = n[0];
        if (c.kind !== 'optimize') fail('value-query', `key ${cell.call.key} claims the value ${expect.value}, but the called check is a plain solver query, whose model values are not canonical (spine section 8.4): key the call by its verdict, or ask for one Optimize objective`);
        else if ((c.objectives ?? []).length !== 1 || (c.soft ?? 0) > 0) fail('value-query', `key ${cell.call.key} claims the value ${expect.value}, but the called Optimize has ${(c.objectives ?? []).length} objective(s)${c.soft ? ` and ${c.soft} soft constraint(s)` : ''}; a value key needs exactly one minimize or maximize`);
        else {
          const off = [];
          for (const e of ENGINES) {
            const ce = got[e].checks[0];
            const v = ce.verdict === 'sat' ? canonicalNumber(ce.objectives?.[0]?.value) : null;
            if (v !== expect.value) off.push([e, ce.verdict === 'sat' ? String(ce.objectives?.[0]?.value) : `${ce.verdict} (no optimum)`]);
          }
          if (off.length) fail('key', `the optimum is ${onEngines(off)}; key ${cell.call.key} ("${expect.keyText}") claims ${expect.value}`);
        }
      }
    }

    // witnesses by property, on each engine: Z3's own evaluation of every assertion under the model (an assertion it
    // leaves unsettled is cvc5's to settle, in judgeCvc5); and a check the gate could not record, whose witness, export
    // or optimum is missing for that reason
    for (const e of ENGINES) {
      got[e].checks.forEach((c, i) => {
        if (c.record_error) fail('run', `${e}: the gate could not record check ${i + 1} (${c.verdict}): ${c.record_error}`);
        if (c.verdict === 'sat' && c.witness && c.witness.holds === false) fail('witness', `check ${i + 1} on ${e}: the model does not satisfy ${c.witness.failed?.[0] ?? 'an assertion'}`);
        else if (!gate && c.verdict === 'sat' && c.witness?.unsettled?.length) row.notes.push(`check ${i + 1} on ${e}: Z3's evaluation leaves ${c.witness.unsettled[0]} unsettled (GATE-calls asks cvc5)`);
      });
    }

    if (gate) judgeCvc5(cell, got, cvc5, fail, row, counts);
    finish(row, local, findings, rows);
  }
  return { rows, findings, counts };
}

function judgeCvc5(cell, got, cvc5, fail, row, counts) {
  const ref = cell.ref;
  const n = got.native.checks;
  const p = got.pyodide.checks;
  const count = Math.min(n.length, p.length);
  for (let i = 0; i < count; i++) {
    if (n[i].verdict !== p[i].verdict) continue;
    if (n[i].verdict === 'unsat') {
      counts.unsatChecked += 1;
      const { verdict, why } = soleVerdict(cvc5.get(`${ref}#${i + 1}:unsat`));
      if (n[i].smt2 == null) fail('cvc5', `check ${i + 1} is unsat and has no SMT-LIB export for cvc5: ${n[i].smt2_error ?? 'the export failed'}`);
      else if (verdict === 'unsat') {
        counts.unsatConfirmed += 1;
        row.cvc5.push(`check ${i + 1} unsat: confirmed`);
      } else if (verdict === null) fail('cvc5', `check ${i + 1} is unsat and was not cross-checked: ${why}`);
      else fail('cvc5', `check ${i + 1} is unsat on Z3, and cvc5 says ${verdict}`);
    }
    if (n[i].verdict === 'sat' && cell.lang === 'smt2') {
      const { verdict, why } = soleVerdict(cvc5.get(`${ref}#${i + 1}:query`));
      if (verdict === 'unsat') fail('witness', `check ${i + 1} is sat on Z3, and cvc5 finds its query unsatisfiable`);
      else if (verdict === 'sat') {
        counts.witnessesConfirmed += 1;
        row.cvc5.push(`check ${i + 1} sat: confirmed`);
      } else row.notes.push(`check ${i + 1} sat: cvc5 did not settle it (${verdict ?? why}); both Z3 engines agree`);
    } else if (n[i].verdict === 'sat') {
      for (const e of ENGINES) {
        const w = got[e].checks[i].witness;
        const open = w?.unsettled ?? [];
        if (w?.holds === false) continue; // failed by Z3's own evaluation, in judgeCells
        const { verdict, why } = soleVerdict(cvc5.get(`${ref}#${i + 1}:witness:${e}`));
        if (verdict === 'unsat') fail('witness', `check ${i + 1}: cvc5 finds the query with ${e}'s model asserted unsatisfiable, so that model does not satisfy it`);
        else if (open.length && !(verdict === 'sat' && w.unsettled_pinned === true)) {
          const said = verdict === 'sat' ? 'sat, but the assertion mentions a symbol the model does not pin' : (verdict ?? why);
          fail('witness', `check ${i + 1} on ${e}: neither Z3's evaluation nor cvc5 settles whether the model satisfies ${open[0]} (cvc5: ${said})`);
        } else if (verdict === 'sat') {
          counts.witnessesConfirmed += 1;
          row.cvc5.push(`check ${i + 1} ${e} witness: confirmed${open.length ? ` (Z3's evaluation left ${open[0]} unsettled)` : ''}`);
        } else row.notes.push(`check ${i + 1}: cvc5 did not settle ${e}'s witness (${verdict ?? why}); Z3's evaluation on ${e} holds it`);
      }
    }
  }
  if (cell.call?.expect?.kind === 'value' && n[0]?.kind === 'optimize' && n[0].verdict === 'sat' && p[0]?.verdict === 'sat' && (n[0].objectives ?? []).length === 1 && !(n[0].soft > 0)) {
    if (!n[0].optimum_smt2) {
      fail('optimum', n[0].optimum_smt2_error ? `the queries that settle the optimum ${n[0].objectives[0].value} could not be written for cvc5: ${n[0].optimum_smt2_error}` : `the optimum ${n[0].objectives[0].value} is not a number cvc5 can be asked about`);
      return;
    }
    const dir = n[0].objectives[0].dir === 'max' ? 'above' : 'below';
    const beyond = soleVerdict(cvc5.get(`${ref}#1:beyond`));
    const at = soleVerdict(cvc5.get(`${ref}#1:at`));
    if (beyond.verdict === 'unsat') row.cvc5.push(`nothing ${dir} the optimum: confirmed`);
    else if (beyond.verdict === null) fail('optimum', `that nothing lies ${dir} the optimum ${n[0].objectives[0].value} was not cross-checked: ${beyond.why}`);
    else fail('optimum', `cvc5 says ${beyond.verdict} on the query for a value ${dir} the optimum ${n[0].objectives[0].value}`);
    if (at.verdict === 'sat') row.cvc5.push('the optimum attained: confirmed');
    else if (at.verdict === 'unsat') fail('optimum', `cvc5 finds the optimum ${n[0].objectives[0].value} unattainable`);
    else row.notes.push(`cvc5 did not settle that the optimum is attained (${at.verdict ?? at.why}); both Z3 engines attain it`);
    if (beyond.verdict === 'unsat' && at.verdict === 'sat') counts.optimaConfirmed += 1;
  }
}

function finish(row, local, findings, rows) {
  if (local.length && row.status === 'ok') row.status = 'failed';
  row.findings = local;
  findings.push(...local);
  rows.push(row);
}

/** The engines against their pins: what a fake or a moved pin would report. */
export function judgeEngines(probes) {
  const findings = [];
  for (const [id, probe] of Object.entries(probes)) {
    if (!probe) continue;
    if (probe.z3 !== PINS.z3.versionString) findings.push({ check: 'pin', ref: id, file: null, detail: `${id} runs z3 ${probe.z3}; the pin is ${PINS.z3.versionString}` });
    if (id === 'pyodide' && probe.pyodide !== PINS.pyodide.version) findings.push({ check: 'pin', ref: id, file: null, detail: `Pyodide reports ${probe.pyodide}; the pin is ${PINS.pyodide.version}` });
  }
  return findings;
}

export const pageFindings = (problems) => problems.map((p) => ({ check: 'page', ref: p.file, file: p.file, detail: p.detail }));
