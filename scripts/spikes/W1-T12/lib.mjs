// W1-T12: the pure part of the S1 recording script, so that tests and `record.mjs check` can run it on
// committed logs. Dependency-free. Nothing here starts a process or reads a clock.
//
// A Z3 script prints human lines and, for each query, one "@@ {json}" line (runs/inputs/S1/README.md). A
// configuration's log is the script's output as it was printed. This module parses logs into the facts
// a run record states, merges the configurations of a run into `values` and `checks`, and holds what each
// run was expected to say (the curriculum's keys), so that a surprise is a failed check and never a quiet one.

export const AT = '@@ ';
export const CVC5_CONFIG = 'cvc5-bench';

// ------------------------------------------------------------------------------------------ expectations
// What each run must show, from curriculum/S01-counterexample.md (the cell or item that cites the run) and
// docs/spine/SPINE.md section 5, and the plain queries that check the Optimize answers (PLAIN_CHECKS). A verdict
// here is the key the lesson will print; the run is what proves it.
export const EXPECT = {
  // S1.L0: Boot's Call It, key B; the corrected guard is the roadmap's starter; the whys of options A, B and C.
  'RUN-z3-boot-variant': {
    variant_violation: 'sat',
    corrected_guard: 'unsat',
    above_both_balances: 'unsat',
    violation_class: 'unsat',
    equal_balances: 'unsat',
  },
  // S1.L1 segment 1: the mis-negation is unsat (key B), the correct negation is sat, the identity holds.
  'RUN-z3-demorgan': {
    mis_negation: 'unsat',
    correct_negation: 'sat',
    negation_equivalence: 'unsat',
  },
  // S1.L3: CL-1.1's premise witness, and the MAX_TRANSFER = 0 config: the violation, the absurd property
  // and the premises alone are all unsat, with a two-constraint core; MAX_TRANSFER = 100 is the control.
  'RUN-z3-vacuous-unsat': {
    cl11_violation: 'unsat',
    cl11_premises: 'sat',
    max0_range_violation: 'unsat',
    max0_range_absurd: 'unsat',
    max0_range_premises: 'unsat',
    max0_range_core: 'unsat',
    max0_guarded_violation: 'unsat',
    max0_guarded_absurd: 'unsat',
    max0_guarded_premises: 'unsat',
    max0_guarded_core: 'unsat',
    max100_range_violation: 'sat',
    max100_range_absurd: 'sat',
    max100_range_premises: 'sat',
    max100_guarded_violation: 'unsat',
    max100_guarded_absurd: 'sat',
    max100_guarded_premises: 'sat',
  },
  // S1.L4 cell 2, queries (i)-(v), Optimize on the hold amount, and the prequestion's options A and C.
  'RUN-z3-double-capture': {
    conservation_buggy_twice: 'unsat',
    at_most_once_buggy: 'sat',
    at_most_once_patched_one_hold: 'unsat',
    at_most_once_patched_pooled: 'sat',
    at_most_once_fixed: 'unsat',
    fixed_one_capture: 'sat',
    minimize_hold: 'sat',
    minimize_pool_patched: 'sat',
    no_smaller_hold: 'unsat',
    no_smaller_pool_patched: 'unsat',
    held_nonneg_one_hold: 'sat',
    held_nonneg_pooled: 'unsat',
  },
  // S1.L4's refund variant, LAB-1.4, SP-1.3, CL-1.4.
  'RUN-z3-refund-mint': {
    clamp_mint: 'sat',
    clamp_merchant_nonneg: 'unsat',
    minimize_minted: 'sat',
    patch_empty_merchant_mint: 'sat',
    patch_exact_witness_mint: 'sat',
    minimize_minted_patch_exact: 'sat',
    no_smaller_mint: 'unsat',
    no_smaller_mint_patch_exact: 'unsat',
    fixed_mint: 'unsat',
    fixed_premises: 'sat',
    fixed_rejected_unchanged: 'unsat',
  },
  // S1.L5 segment 1 (key sat for the BitVec sender without amount > 0) and the Int twin.
  'RUN-z3-bv64-negamt': {
    bv64_sender_noguard: 'sat',
    bv64_sender_positive: 'unsat',
    int_sender_noguard: 'unsat',
    int_recipient_drain: 'sat',
    int_zero_noop: 'unsat',
  },
  // SP-1.9, buggy and fixed.
  'RUN-z3-btc2010': {
    buggy_creates_value: 'sat',
    buggy_output_exceeds_input: 'sat',
    fix_each_output: 'unsat',
    fix_2010: 'unsat',
    fix_2010_accepts_some: 'sat',
  },
  // SP-1.10, buggy and fixed.
  'RUN-z3-bloch06': {
    buggy_mid_outside: 'sat',
    buggy_mid_below_zero: 'sat',
    fix_low_plus_half: 'unsat',
    fix_logical_shift: 'unsat',
    premises_satisfiable: 'sat',
  },
};

/** The core every MAX_TRANSFER = 0 premise set must give (SP-1.6: the two-constraint core). */
export const EXPECT_CORE = ['amount_le_max_transfer', 'amount_positive'];

/**
 * The sat or unsat queries that have no SMT-LIB export, so that cvc5 cannot run them, and the plain query with
 * an export that it runs in each one's place, which must be unsat. An Optimize answer is checked by a query that
 * asks for anything below its minimum, and its minimum by the value here, worked out by hand from the encoding
 * (SP-1.2's and SP-1.3's "Minimal?" column leaves the value to these runs); an unsat core's premise set is the
 * premises query of the same scenario, built from the same formulas. A query without an export that is missing
 * here fails its check.
 */
export const PLAIN_CHECKS = {
  'RUN-z3-double-capture': {
    minimize_hold: { minimum: '1', checked_by: 'no_smaller_hold' },
    minimize_pool_patched: { minimum: '2', checked_by: 'no_smaller_pool_patched' },
  },
  'RUN-z3-refund-mint': {
    minimize_minted: { minimum: '1', checked_by: 'no_smaller_mint' },
    minimize_minted_patch_exact: { minimum: '2', checked_by: 'no_smaller_mint_patch_exact' },
  },
  'RUN-z3-vacuous-unsat': {
    max0_range_core: { checked_by: 'max0_range_premises' },
    max0_guarded_core: { checked_by: 'max0_guarded_premises' },
  },
};

/** D-13's examples, with what each must print. */
export const EXPECT_TOUR = {
  starter: { verdict: 'sat', model: true },
  starter_guarded: { verdict: 'unsat' },
  starter_guarded_get_model: { verdict: 'unsat', error: 'model is not available' },
  unknown_theory: { verdict: 'unknown', reason: 'smt tactic failed to show goal to be sat/unsat (incomplete (theory arithmetic))' },
  unknown_canceled: { verdict: 'unknown', reason: 'canceled' },
};
export const TOUR_FILES = Object.keys(EXPECT_TOUR);

// ------------------------------------------------------------------------------------------- log parsing
const lines = (text) => text.replaceAll('\r\n', '\n').split('\n');

/** The "@@ {json}" records of a script's log, in order. */
export function atRecords(log) {
  return lines(log)
    .filter((l) => l.startsWith(AT))
    .map((l) => JSON.parse(l.slice(AT.length)));
}

/** The lines a person reads: everything but the machine lines ("@@ ") and the driver's timing lines ("-- "). */
export function humanLines(log) {
  const out = lines(log).filter((l) => !l.startsWith(AT) && !l.startsWith('-- '));
  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  return out;
}

/** The tour's sections: [{file, lines}] split at "== name.smt2"; lines before the first header are the preamble. */
export function sections(log) {
  const out = [];
  let current = null;
  for (const l of humanLines(log)) {
    const m = /^== (\S+)\.smt2$/.exec(l);
    if (m) {
      current = { file: m[1], lines: [] };
      out.push(current);
    } else if (current) current.lines.push(l);
  }
  return out;
}

/** "-- exit <code> in <ms> ms" lines of the CLI driver, by section: {file: {exit_code, ms}}. */
export function cliExits(log) {
  const out = {};
  let file = null;
  for (const l of lines(log)) {
    const h = /^== (\S+)\.smt2$/.exec(l);
    if (h) file = h[1];
    const e = /^-- exit (\d+) in (\d+) ms$/.exec(l);
    if (e && file) out[file] = { exit_code: Number(e[1]), ms: Number(e[2]) };
  }
  return out;
}

/** The define-funs of a printed Int model, as {name: BigInt}: "(define-fun a () Int\n    0)" and "(- 1)" for -1. */
export function modelOf(text) {
  const out = {};
  for (const m of text.matchAll(/\(define-fun (\S+) \(\) Int\s+(\(- (\d+)\)|(\d+))\)/g)) out[m[1]] = m[3] !== undefined ? -BigInt(m[3]) : BigInt(m[4]);
  return out;
}

/** The facts of one tour section: the first line is the verdict; (:reason-unknown "...") and (error "...") are read. */
export function tourFacts(sectionLines) {
  const text = sectionLines.join('\n');
  const reason = /^\(:reason-unknown "(.*)"\)$/m.exec(text);
  const error = /^\(error "(.*)"\)$/m.exec(text);
  const model = modelOf(text);
  return {
    verdict: sectionLines[0] ?? null,
    ...(reason ? { reason_unknown: reason[1] } : {}),
    ...(error ? { error: error[1] } : {}),
    ...(Object.keys(model).length ? { model } : {}),
  };
}

/** Replays the starter's model on its own premises, in BigInt arithmetic: a, b >= 0, amount > 0, a - amount < 0. */
export function replayStarter(model) {
  const { a, b, amount } = model ?? {};
  if (a === undefined || b === undefined || amount === undefined) return { ok: false, text: 'the model names no a, b and amount' };
  const checks = [
    ['a >= 0', a >= 0n],
    ['b >= 0', b >= 0n],
    ['amount > 0', amount > 0n],
    [`a - amount = ${a - amount} < 0`, a - amount < 0n],
  ];
  return { ok: checks.every(([, ok]) => ok), text: `a=${a} b=${b} amount=${amount}: ${checks.map(([l, ok]) => `${l} ${ok ? 'ok' : 'FAILS'}`).join(', ')}` };
}

/** The cvc5 driver's log: "<file>: <verdict>" per export, after a version line. */
export function cvc5Log(log) {
  const verdicts = {};
  let version = null;
  for (const l of lines(log)) {
    const m = /^(\S+): (sat|unsat|unknown|)$/.exec(l);
    if (m) verdicts[m[1]] = m[2] === '' ? null : m[2];
    else if (/^cvc5 \d/.test(l) && version === null) version = l;
  }
  return { version, verdicts };
}

// -------------------------------------------------------------------------- merging a run's configurations
const sameSet = (a, b) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
export const sameModel = (a, b) => JSON.stringify(Object.entries(a ?? {}).sort()) === JSON.stringify(Object.entries(b ?? {}).sort());
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * Merge the "@@" records of every Z3 configuration of one run. `byConfig` is {configId: [records]}, the first
 * key the primary configuration; `cvc5` is the parsed cvc5 log or null. Returns {queries, summary}, which become
 * the record's values, and beside them two lists the checks read and values does not hold: `exportsDiffer`, the
 * queries whose export is not the same in every configuration, and `strays`, a query that one configuration
 * printed twice or that a configuration other than the primary printed and the primary did not (the merge walks
 * the primary's queries, so such a query would otherwise leave no trace).
 */
export function mergeQueries(byConfig, cvc5) {
  const ids = Object.keys(byConfig);
  const primary = ids[0];
  const maps = Object.fromEntries(ids.map((id) => [id, new Map(byConfig[id].map((r) => [r.q, r]))]));
  const queries = {};
  const exportsDiffer = [];
  const strays = [];
  for (const id of ids) {
    const printed = new Set();
    for (const r of byConfig[id]) {
      if (printed.has(r.q)) strays.push(`${id} printed ${r.q} twice`);
      else if (id !== primary && !maps[primary].has(r.q)) strays.push(`${id} printed ${r.q}, which ${primary} did not`);
      printed.add(r.q);
    }
  }
  let exportsIdentical = true;
  let rawExportsIdentical = true;
  let verdictsAgree = true;
  let witnessesReplay = true;
  let cvc5Checked = 0;
  let cvc5Agree = 0;
  for (const rec of byConfig[primary]) {
    const q = rec.q;
    const seen = ids.map((id) => [id, maps[id].get(q)]);
    const engines = Object.fromEntries(seen.map(([id, r]) => [id, r ? r.verdict : null]));
    const agree = seen.every(([, r]) => r && r.verdict === rec.verdict);
    verdictsAgree &&= agree;
    const sameExport = seen.every(([, r]) => r && r.smt2_sha256 === rec.smt2_sha256);
    exportsIdentical &&= sameExport;
    if (!sameExport) exportsDiffer.push(q);
    const sameRaw = seen.every(([, r]) => r && r.smt2_raw_sha256 === rec.smt2_raw_sha256);
    rawExportsIdentical &&= sameRaw;
    const out = { verdict: rec.verdict };
    if (rec.reason_unknown !== undefined) out.reason_unknown = rec.reason_unknown;
    if (rec.model !== undefined) {
      out.witness = rec.model;
      if (rec.model_signed !== undefined) out.witness_signed = rec.model_signed;
      out.witnesses_differ_across_engines = seen.some(([, r]) => r && r.model !== undefined && !sameModel(r.model, rec.model));
      if (out.witnesses_differ_across_engines) out.witnesses_by_engine = Object.fromEntries(seen.filter(([, r]) => r && r.model !== undefined).map(([id, r]) => [id, r.model]));
    }
    if (rec.replays !== undefined) {
      const all = seen.every(([, r]) => r && r.replays === true);
      witnessesReplay &&= all;
      out.witness_replays = all;
      out.replay = rec.replay;
    }
    if (rec.unsat_core !== undefined) {
      out.unsat_core = rec.unsat_core;
      out.core_constraints = rec.core_constraints;
      out.core_minimal = seen.every(([, r]) => r && r.core_minimal === true && r.core_alone_unsat === true);
      out.core_agrees_across_engines = seen.every(([, r]) => r && r.unsat_core && sameSet(r.unsat_core, rec.unsat_core));
    }
    if (rec.minimum !== undefined) {
      out.objective = rec.objective;
      out.minimum = rec.minimum;
      out.minimum_agrees_across_engines = seen.every(([, r]) => r && r.minimum === rec.minimum);
    }
    out.smt2_sha256 = rec.smt2_sha256 ?? null;
    if (!sameRaw) out.smt2_raw_sha256_by_engine = Object.fromEntries(seen.filter(([, r]) => r).map(([id, r]) => [id, r.smt2_raw_sha256]));
    out.rlimit = rec.rlimit;
    if (cvc5 && Object.hasOwn(cvc5.verdicts, q)) {
      engines[CVC5_CONFIG] = cvc5.verdicts[q];
      cvc5Checked += 1;
      if (cvc5.verdicts[q] === rec.verdict) cvc5Agree += 1;
    }
    out.engines = engines;
    out.engines_agree = agree && sameExport;
    queries[q] = out;
  }
  return {
    queries,
    summary: {
      engines: ids,
      verdicts_agree: verdictsAgree,
      witnesses_replay: witnessesReplay,
      exports_identical: exportsIdentical,
      raw_exports_identical: rawExportsIdentical,
      ...(cvc5 ? { cvc5: { configuration: CVC5_CONFIG, version: cvc5.version, queries_checked: cvc5Checked, agree: cvc5Agree } } : {}),
    },
    exportsDiffer,
    strays,
  };
}

/** The kinds of query that have no SMT-LIB export, for a sentence: "a, b: Optimize answers; c: an unsat core". */
function withoutExport(entries) {
  const kinds = [
    ['Optimize answers', 'an Optimize answer', ([, q]) => q.minimum !== undefined],
    ['unsat cores', 'an unsat core', ([, q]) => q.minimum === undefined && q.unsat_core !== undefined],
    ['queries of no other kind', 'a query of no other kind', ([, q]) => q.minimum === undefined && q.unsat_core === undefined],
  ];
  return kinds
    .map(([many, one, test]) => [many, one, entries.filter(test).map(([k]) => k)])
    .filter(([, , names]) => names.length)
    .map(([many, one, names]) => `${names.join(', ')}: ${names.length === 1 ? one : many}`)
    .join('; ');
}

/**
 * The detail of the exports-identical check, worked out from the merge: which configurations were compared, and
 * over which queries, so that it never speaks of an export a query does not have (an Optimize answer and an unsat
 * core have none) and never says "the same" of exports that differ.
 */
export function exportsDetail(merged) {
  const configs = merged.summary.engines;
  const who = `the ${plural(configs.length, 'Z3 configuration', 'Z3 configurations')} (${configs.join(', ')})`;
  const entries = Object.entries(merged.queries);
  const differ = merged.exportsDiffer ?? [];
  if (!merged.summary.exports_identical || differ.length) {
    return `${who} did not all export the same SMT-LIB text${differ.length ? ` for ${plural(differ.length, 'query', 'queries')}: ${differ.join(', ')}` : ''} (a different text, an export in some configurations and none in others, or the query missing from one)`;
  }
  const none = entries.filter(([, q]) => q.smt2_sha256 === null);
  if (!none.length) return `${who} exported the same SMT-LIB text for every query, all ${entries.length} of them`;
  const exported = entries.length - none.length;
  return `${who} exported the same SMT-LIB text for ${exported === 1 ? 'the 1 query that has' : `each of the ${exported} queries that have`} an export; the other ${none.length} (${withoutExport(none)}) ${none.length === 1 ? 'has' : 'have'} none in any configuration`;
}

/** One check per query, from the expectations, then the checks that hold for the whole run. */
export function buildChecks(runId, merged, { cvc5Expected = true } = {}) {
  const expect = EXPECT[runId] ?? {};
  const out = [];
  for (const [q, want] of Object.entries(expect)) {
    const got = merged.queries[q];
    if (!got) {
      out.push({ id: q, pass: false, expected: want, observed: null, detail: 'the script printed no such query' });
      continue;
    }
    const problems = [];
    if (got.verdict !== want) problems.push(`verdict ${got.verdict}, expected ${want}`);
    if (!got.engines_agree) problems.push('configurations disagree on the verdict or the SMT-LIB export');
    if (got.witness_replays === false) problems.push('a witness did not replay');
    if (got.unsat_core !== undefined) {
      if (!sameSet(got.unsat_core, EXPECT_CORE)) problems.push(`core ${JSON.stringify(got.unsat_core)}, expected ${JSON.stringify(EXPECT_CORE)}`);
      if (!got.core_minimal) problems.push('the core is not minimal in every configuration');
      if (!got.core_agrees_across_engines) problems.push('the core differs between configurations');
    }
    if (got.minimum !== undefined && !got.minimum_agrees_across_engines) problems.push('the minimum differs between configurations');
    const decided = got.verdict === 'sat' || got.verdict === 'unsat';
    if (cvc5Expected && got.smt2_sha256 !== null && decided) {
      if (got.engines[CVC5_CONFIG] !== got.verdict) problems.push(`cvc5 said ${got.engines[CVC5_CONFIG] ?? 'nothing'}`);
    }
    // a query without an export is checked through the plain query named for it
    const noExport = got.smt2_sha256 === null && decided;
    const plain = noExport ? PLAIN_CHECKS[runId]?.[q] : undefined;
    if (noExport) {
      if (!plain) problems.push('no SMT-LIB export, and no plain query is named to check it');
      else {
        if (plain.minimum !== undefined && got.minimum !== plain.minimum) problems.push(`minimum ${got.minimum ?? 'none'}, expected ${plain.minimum}`);
        const by = merged.queries[plain.checked_by];
        if (!by) problems.push(`its plain query ${plain.checked_by} is missing`);
        else if (by.verdict !== 'unsat' || by.smt2_sha256 === null || !by.engines_agree) problems.push(`its plain query ${plain.checked_by} is not unsat with one export in every configuration`);
        else if (cvc5Expected && by.engines[CVC5_CONFIG] !== 'unsat') problems.push(`cvc5 said ${by.engines[CVC5_CONFIG] ?? 'nothing'} on its plain query ${plain.checked_by}`);
      }
    }
    out.push({ id: q, pass: problems.length === 0, expected: want, observed: got.verdict, engines: got.engines, ...(got.witness_replays !== undefined ? { witness_replays: got.witness_replays } : {}), ...(plain ? { checked_by: plain.checked_by } : {}), ...(problems.length ? { detail: problems.join('; ') } : {}) });
  }
  const extra = Object.keys(merged.queries).filter((q) => !Object.hasOwn(expect, q));
  const unexpected = [...(extra.length ? [`queries without an expectation: ${extra.join(', ')}`] : []), ...(merged.strays ?? [])];
  out.push({ id: 'no-unexpected-queries', pass: unexpected.length === 0, ...(unexpected.length ? { detail: unexpected.join('; ') } : {}) });
  out.push({ id: 'exports-identical', pass: merged.summary.exports_identical, detail: exportsDetail(merged) });
  return out;
}

// --------------------------------------------------------------------------------------- the tour merge
/**
 * Merge the tour's configurations. `byConfig` is {configId: sections}, the first key the primary one
 * (the Z3 command line); each section is {file, lines}. `exits` holds the command line's exit codes.
 */
export function mergeTour(byConfig, exits, cvc5) {
  const ids = Object.keys(byConfig);
  const primary = ids[0];
  const files = {};
  let agree = true;
  let replays = true;
  for (const want of TOUR_FILES) {
    const facts = Object.fromEntries(ids.map((id) => [id, tourFacts(byConfig[id].find((s) => s.file === want)?.lines ?? [])]));
    const p = facts[primary];
    const same = ids.every((id) => facts[id].verdict === p.verdict && facts[id].reason_unknown === p.reason_unknown && facts[id].error === p.error);
    agree &&= same;
    const out = { verdict: p.verdict };
    if (p.reason_unknown !== undefined) out.reason_unknown = p.reason_unknown;
    if (p.error !== undefined) out.error = p.error;
    if (p.model !== undefined) {
      out.model = Object.fromEntries(Object.entries(p.model).map(([k, v]) => [k, String(v)]));
      const r = replayStarter(p.model);
      const all = ids.every((id) => facts[id].model !== undefined && replayStarter(facts[id].model).ok);
      replays &&= all;
      out.witness_replays = all;
      out.replay = r.text;
      const asStrings = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, String(v)]));
      out.witnesses_differ_across_engines = ids.some((id) => facts[id].model !== undefined && !sameModel(asStrings(facts[id].model), out.model));
      if (out.witnesses_differ_across_engines) out.witnesses_by_engine = Object.fromEntries(ids.filter((id) => facts[id].model !== undefined).map((id) => [id, asStrings(facts[id].model)]));
    }
    if (exits?.[want]) out.command_line_exit_code = exits[want].exit_code;
    const engines = Object.fromEntries(ids.map((id) => [id, facts[id].verdict]));
    if (cvc5 && Object.hasOwn(cvc5.verdicts, want)) engines[CVC5_CONFIG] = cvc5.verdicts[want];
    out.engines = engines;
    out.engines_agree = same;
    files[want] = out;
  }
  return {
    files,
    summary: { engines: ids, verdicts_agree: agree, witnesses_replay: replays, ...(cvc5 ? { cvc5: { configuration: CVC5_CONFIG, version: cvc5.version, files_checked: Object.keys(cvc5.verdicts).length } } : {}) },
  };
}

export function tourChecks(merged) {
  const out = [];
  for (const [file, want] of Object.entries(EXPECT_TOUR)) {
    const got = merged.files[file];
    const problems = [];
    if (got.verdict !== want.verdict) problems.push(`verdict ${got.verdict}, expected ${want.verdict}`);
    if (want.reason !== undefined && got.reason_unknown !== want.reason) problems.push(`reason ${JSON.stringify(got.reason_unknown)}, expected ${JSON.stringify(want.reason)}`);
    if (want.error !== undefined && !(got.error ?? '').includes(want.error)) problems.push(`error ${JSON.stringify(got.error)}, expected one that says ${JSON.stringify(want.error)}`);
    if (want.model && got.witness_replays !== true) problems.push('the model did not replay in every configuration');
    if (!got.engines_agree) problems.push('configurations disagree');
    if (merged.summary.cvc5 && Object.hasOwn(got.engines, CVC5_CONFIG) && got.engines[CVC5_CONFIG] !== got.verdict) problems.push(`cvc5 said ${got.engines[CVC5_CONFIG]}`);
    out.push({ id: file, pass: problems.length === 0, expected: want.verdict, observed: got.verdict, engines: got.engines, ...(problems.length ? { detail: problems.join('; ') } : {}) });
  }
  return out;
}

// ------------------------------------------------------------------------------------------ PostgreSQL
/**
 * The numeric-bound script's log: per case, the SQLSTATE and message of a failure, and the balance after.
 * `order_problems` lists the cases whose ERROR line came after the script's own `sqlstate` or `balance` echo.
 * psql writes an error where the failing statement is, before the echoes that follow it, so a log that says
 * otherwise has its two streams (psql's stdout and stderr) in the wrong order and is not psql's own.
 */
export function parsePg(log) {
  const ls = lines(log);
  const version = ls.find((l) => /^PostgreSQL \d/.test(l)) ?? null;
  const cases = {};
  const order_problems = [];
  let current = null;
  let currentId = null;
  let echoed = false;
  let expectBalance = false;
  for (let i = 0; i < ls.length; i += 1) {
    const l = ls[i];
    const c = /^case (\w+): (.*)$/.exec(l);
    if (c) {
      current = { statement: c[2], error: null, sqlstate: null, detail: null, balance_after: null };
      currentId = c[1];
      cases[currentId] = current;
      echoed = false;
      expectBalance = false;
      continue;
    }
    if (!current) continue;
    const e = /^psql:\S+:\d+: ERROR:  (.*)$/.exec(l);
    if (e) {
      current.error = e[1];
      const d = /^DETAIL:  (.*)$/.exec(ls[i + 1] ?? '');
      if (d) current.detail = d[1];
      if (echoed) order_problems.push(`${currentId}: the ERROR line (log line ${i + 1}) comes after the case's sqlstate or balance echo`);
      continue;
    }
    const s = /^sqlstate (\w{5})$/.exec(l);
    if (s) {
      current.sqlstate = s[1];
      echoed = true;
      continue;
    }
    if (l === 'balance') {
      expectBalance = true;
      echoed = true;
      continue;
    }
    if (expectBalance && /^\d+$/.test(l)) {
      current.balance_after = l;
      expectBalance = false;
    }
  }
  return { version, cases, order_problems };
}

/** The expectations of the numeric-bound run (S1.L5's table row, S6.L4's remedy 3). */
export const EXPECT_PG = {
  bigint_at_max: { error: 'bigint out of range', sqlstate: '22003', balance_after: '9223372036854775807' },
  numeric19_below_bound: { error: null, sqlstate: null, balance_after: '9223372036854775808' },
  numeric19_at_bound: { error: 'numeric field overflow', sqlstate: '22003', balance_after: '9999999999999999999' },
  numeric_unbounded: { error: null, sqlstate: null, balance_after: '10000000000000000000' },
};

export function pgChecks(parsed) {
  const out = [];
  for (const [id, want] of Object.entries(EXPECT_PG)) {
    const got = parsed.cases[id];
    const problems = [];
    if (!got) problems.push('the script printed no such case');
    else {
      for (const k of Object.keys(want)) if (got[k] !== want[k]) problems.push(`${k} ${JSON.stringify(got[k])}, expected ${JSON.stringify(want[k])}`);
    }
    out.push({ id, pass: problems.length === 0, ...(problems.length ? { detail: problems.join('; ') } : {}) });
  }
  out.push({ id: 'server-18.6', pass: /^PostgreSQL 18\.6 /.test(parsed.version ?? ''), observed: parsed.version });
  out.push({
    id: 'psql-order',
    pass: parsed.order_problems.length === 0,
    expected: 'in each case, an ERROR line comes before the sqlstate and balance echoes that follow the failing statement',
    ...(parsed.order_problems.length ? { detail: parsed.order_problems.join('; ') } : {}),
  });
  return out;
}

// ----------------------------------------------------------------------------------------------- Rust
/** The Rust driver's log, by "== " section. */
export function parseRust(log) {
  const secs = {};
  let name = null;
  for (const l of lines(log)) {
    const h = /^== (.*)$/.exec(l);
    if (h) {
      name = h[1];
      secs[name] = [];
    } else if (name) secs[name].push(l);
  }
  const get = (n) => (secs[n] ?? []).filter((l) => l !== '');
  const profile = (kind, dir) => {
    const stdout = get(`run: target/${dir}/ovf, stdout`);
    const stderr = get(`run: target/${dir}/ovf, stderr`);
    const exit = get(`run: target/${dir}/ovf, exit code`)[0];
    const build = Object.keys(secs).find((n) => n.startsWith('build:') && n.includes(`the ${kind} profile`));
    return { stdout, stderr, exit_code: exit === undefined ? null : Number(exit), build_lines: build ? get(build) : [] };
  };
  const toolchain = get('toolchain');
  return { rustc: toolchain[0] ?? null, cargo: toolchain[1] ?? null, debug: profile('dev', 'debug'), release: profile('release', 'release') };
}

export function rustFacts(parsed) {
  const wrapped = (parsed.release.stdout.join('\n').match(/^b \+ x = (-?\d+) \(wrapped/m) ?? [])[1] ?? null;
  const panic = parsed.debug.stderr.find((l) => /attempt to add with overflow/.test(l)) ?? null;
  const caught = parsed.debug.stdout.includes('b + x panicked (overflow check)');
  const checked = (p) => ((p.stdout.join('\n').match(/^checked_add = (.*)$/m) ?? [])[1]) ?? null;
  return {
    rustc: parsed.rustc,
    debug: { panicked: caught, panic_message: panic, exit_code: parsed.debug.exit_code, checked_add: checked(parsed.debug), stdout: parsed.debug.stdout },
    release: { wrapped: wrapped !== null, b_plus_x: wrapped, panicked: parsed.release.stdout.includes('b + x panicked (overflow check)'), exit_code: parsed.release.exit_code, checked_add: checked(parsed.release), stdout: parsed.release.stdout },
  };
}

export function rustChecks(facts) {
  return [
    { id: 'debug-build-panics', pass: facts.debug.panicked && facts.debug.panic_message === 'attempt to add with overflow', observed: facts.debug.panic_message },
    { id: 'release-build-wraps', pass: facts.release.wrapped && facts.release.b_plus_x === '-9223372036854775808' && !facts.release.panicked, observed: facts.release.b_plus_x },
    { id: 'checked_add-returns-None', pass: facts.debug.checked_add === 'None' && facts.release.checked_add === 'None', observed: [facts.debug.checked_add, facts.release.checked_add] },
    { id: 'rustc-1.96.0', pass: /^rustc 1\.96\.0 /.test(facts.rustc ?? ''), observed: facts.rustc },
  ];
}

// ------------------------------------------------------------------------- what a record derives from logs
/** The single line z3_negamt.py printed: "[query] verdict [model]". */
export function parseTwin(log) {
  const m = /^\[(.*?)\] (sat|unsat|unknown)(?: \[(.*)\])?$/m.exec(log);
  if (!m) return null;
  const witness = m[3] ? Object.fromEntries(m[3].split(', ').map((kv) => kv.split(' = '))) : null;
  return { query: m[1], verdict: m[2], witness };
}

/**
 * values and checks of a Z3 script run. `logs` is {configId: log text} with the primary configuration first;
 * the configuration "int-twin-original" holds the research script's own output and is read apart.
 */
export function deriveZ3(runId, logs, cvc5Text) {
  const ids = Object.keys(logs).filter((id) => id !== 'int-twin-original');
  const byConfig = Object.fromEntries(ids.map((id) => [id, atRecords(logs[id])]));
  const merged = mergeQueries(byConfig, cvc5Text ? cvc5Log(cvc5Text) : null);
  const checks = buildChecks(runId, merged, { cvc5Expected: Boolean(cvc5Text) });
  const values = { queries: merged.queries, ...merged.summary };
  if (logs['int-twin-original'] !== undefined) {
    const twin = parseTwin(logs['int-twin-original']);
    const big = (v) => (/^-?\d+$/.test(String(v).trim()) ? BigInt(String(v).trim()) : null);
    const w = twin?.witness ? Object.fromEntries(Object.entries(twin.witness).map(([k, v]) => [k, big(v)])) : null;
    const whole = w !== null && ['a', 'b', 'amount'].every((k) => typeof w[k] === 'bigint');
    const replays = whole ? w.a >= 0n && w.b >= 0n && w.amount <= w.a && w.b + w.amount < 0n : false;
    values.int_twin_original = { query: twin?.query ?? null, verdict: twin?.verdict ?? null, witness: twin?.witness ?? null, witness_replays: replays };
    const pass = twin?.verdict === 'sat' && replays;
    const said = twin === null ? 'printed no line of the form "[query] verdict [model]"' : `gave ${twin.verdict} ${twin.witness ? `with a witness that ${replays ? 'replays' : 'does not replay'}` : 'with no witness'}`;
    checks.push({
      id: 'int-twin-original',
      pass,
      expected: 'sat',
      observed: twin?.verdict ?? null,
      detail: pass ? 'z3_negamt.py as it is on disk: a negative amount passes the guard and drains the recipient' : `z3_negamt.py as it is on disk ${said}, where sat with a negative amount that passes the guard and drains the recipient was expected`,
    });
  }
  return { values, checks };
}

// ------------------------------------------------------------------------- facts the notes state, from logs
/**
 * How fine the "ms" figures of a log's "@@" lines are: kind 'whole' (whole milliseconds), 'tenths' (multiples of
 * 0.1 ms) or 'finer' (null when no line carries one), with how many lines carry a figure out of how many there are.
 * The scripts round each figure to hundredths of a millisecond; a browser's clock can make it coarser, and the
 * record's timing note says how coarse each browser's figures were from this, never from a fixed sentence.
 */
export function msGranularity(log) {
  const recs = atRecords(log);
  const ms = recs.map((r) => r.ms).filter((v) => typeof v === 'number' && Number.isFinite(v));
  const tenth = (v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-6;
  const kind = ms.length === 0 ? null : ms.every(Number.isInteger) ? 'whole' : ms.every(tenth) ? 'tenths' : 'finer';
  return { kind, with_ms: ms.length, lines: recs.length };
}

/**
 * The tour sections whose lines differ from the first configuration's (the Z3 command line's), as [{config, file}];
 * a file missing from a configuration counts as different. `logs` is {configId: log text}.
 */
export function tourTextDiffs(logs) {
  const ids = Object.keys(logs);
  const secs = Object.fromEntries(ids.map((id) => [id, sections(logs[id])]));
  const text = (id, file) => {
    const s = secs[id].find((x) => x.file === file);
    return s ? JSON.stringify(s.lines) : null;
  };
  const out = [];
  for (const id of ids.slice(1)) for (const file of TOUR_FILES) if (text(id, file) === null || text(id, file) !== text(ids[0], file)) out.push({ config: id, file });
  return out;
}

/** values and checks of the tour: `logs` is {configId: log text}, the Z3 command line first; `cliLog` is its log. */
export function deriveTour(logs, cvc5Text) {
  const ids = Object.keys(logs);
  const merged = mergeTour(Object.fromEntries(ids.map((id) => [id, sections(logs[id])])), cliExits(logs[ids[0]]), cvc5Text ? cvc5Log(cvc5Text) : null);
  return { values: { files: merged.files, ...merged.summary }, checks: tourChecks(merged) };
}

export function derivePg(log) {
  const parsed = parsePg(log);
  return { values: { server: parsed.version, cases: parsed.cases }, checks: pgChecks(parsed) };
}

export function deriveRust(log) {
  const facts = rustFacts(parseRust(log));
  return { values: facts, checks: rustChecks(facts) };
}

// -------------------------------------------------------------------------------------- source checks
const BLOCK_START = /^# ---- helper block:/m;
const BLOCK_END = /^# ---- end of the helper block -+$/m;

/** The helper block of a script (from its first marker line to its last), or null. */
export function helperBlock(source) {
  const a = BLOCK_START.exec(source);
  const b = BLOCK_END.exec(source);
  if (!a || !b || b.index < a.index) return null;
  return source.slice(a.index, b.index + b[0].length);
}
