// The TLC inputs of the S5 anchors' key runs (AUD-5.1 to AUD-5.4; content/audit/README.md section 5), written
// out as files under runs/<RUN-id>/inputs/ by record-s5s6.mjs before each run. Every module a case shows is
// here once; a scenario's module is the case's module with one edit, so the run checks exactly what the scenario
// text says. Tags are neutral: q1, q2, ... per case, and s1, s2, ... (or t1, ...) per scenario.

const HOLD51 = `---- MODULE HoldLive ----
EXTENDS Naturals
VARIABLES st, tries
vars == <<st, tries>>
Init == st = "held" /\\ tries = 0
Try     == st = "held"    /\\ st' = "pending"  /\\ tries' = (tries + 1) % 2
Busy    == st = "pending" /\\ st' = "held"     /\\ UNCHANGED tries
Capture == st = "pending" /\\ st' = "captured" /\\ UNCHANGED tries
Timeout == st \\in {"held", "pending"} /\\ st' = "released" /\\ UNCHANGED tries
Done    == st \\in {"captured", "released"} /\\ UNCHANGED vars
Next == Try \\/ Busy \\/ Capture \\/ Timeout \\/ Done
Fair == WF_vars(Timeout)
Spec == Init /\\ [][Next]_vars /\\ Fair
TypeOK == st \\in {"held", "pending", "captured", "released"} /\\ tries \\in {0, 1}
Resolved == st \\in {"captured", "released"}
EventuallyResolves == <>Resolved
====
`;

// RUN-tlc-eventually's HoldLive.tla, verbatim (also RUN-tlc-hold-fairness r6).
const HOLD52 = `---- MODULE HoldLive ----
EXTENDS Naturals
VARIABLES st, tries
vars == <<st, tries>>
Init == st = "held" /\\ tries = 0
Try     == st = "held"    /\\ st' = "pending"  /\\ tries' = (tries + 1) % 2
Busy    == st = "pending" /\\ st' = "held"     /\\ UNCHANGED tries
Capture == st = "pending" /\\ st' = "captured" /\\ UNCHANGED tries
Timeout == st \\in {"held", "pending"} /\\ st' = "released" /\\ UNCHANGED tries
Next == Try \\/ Busy \\/ Capture \\/ Timeout
Fair == WF_vars(Timeout)
Spec == Init /\\ [][Next]_vars /\\ Fair
Resolved == st \\in {"captured", "released"}
EventuallyResolves == <>Resolved
====
`;

const PAYOUT = `---- MODULE Payout ----
VARIABLES st
Init == st = "queued"
Send    == st = "queued" /\\ st' = "sent"
Bounce  == st = "sent"   /\\ st' = "queued"
Settle  == st = "sent"   /\\ st' = "settled"
Abandon == st \\in {"queued", "sent"} /\\ st' = "abandoned"
Done    == st \\in {"settled", "abandoned"} /\\ UNCHANGED st
Next == Send \\/ Bounce \\/ Settle \\/ Abandon \\/ Done
Fair == WF_st(Abandon)
Spec == Init /\\ [][Next]_st /\\ Fair
NeverLost == st \\in {"queued", "sent", "settled", "abandoned"}
Finished == st \\in {"settled", "abandoned"}
EventuallyFinished == <>Finished
====
`;

const WITHDRAW = `---- MODULE Withdraw ----
EXTENDS Naturals
CONSTANTS Init, Amount, Workers
VARIABLES bal, pc, seen, spent
vars == <<bal, pc, seen, spent>>
Init_ == /\\ bal = Init /\\ spent = 0
         /\\ pc = [w \\in Workers |-> "read"] /\\ seen = [w \\in Workers |-> 0]
Read(w)  == /\\ pc[w] = "read" /\\ seen' = [seen EXCEPT ![w] = bal]
            /\\ pc' = [pc EXCEPT ![w] = IF bal >= Amount THEN "write" ELSE "wait"]
            /\\ UNCHANGED <<bal, spent>>
Write(w) == /\\ pc[w] = "write" /\\ bal' = seen[w] - Amount /\\ spent' = spent + Amount
            /\\ pc' = [pc EXCEPT ![w] = "done"] /\\ UNCHANGED seen
Idle == (\\A w \\in Workers : pc[w] = "done") /\\ UNCHANGED vars
Next == (\\E w \\in Workers : Read(w) \\/ Write(w)) \\/ Idle
Spec == Init_ /\\ [][Next]_vars
NoOverspend == spent <= Init
====
`;
const withdrawCfg = (amount) => `CONSTANTS
  Init = 100
  Amount = ${amount}
  Workers = {w1, w2}
INIT Init_
NEXT Next
INVARIANT NoOverspend
`;

// RUN-tlc-sym-liveness's Sym.tla, verbatim; the two configurations differ in the SYMMETRY line alone.
const SYM = `---- MODULE Sym ----
EXTENDS Naturals, TLC
CONSTANTS Workers
VARIABLES pc
Init == pc = [w \\in Workers |-> "idle"]
Go(w) == pc[w] = "idle" /\\ pc' = [pc EXCEPT ![w] = "done"]
Next == \\E w \\in Workers : Go(w)
Spec == Init /\\ [][Next]_pc /\\ \\A w \\in Workers : WF_pc(Go(w))
AllDone == <>(\\A w \\in Workers : pc[w] = "done")
Perms == Permutations(Workers)
====
`;
const symCfg = (sym) => `CONSTANTS Workers = {w1, w2}
SPECIFICATION Spec
PROPERTY AllDone
${sym ? 'SYMMETRY Perms\n' : ''}CHECK_DEADLOCK FALSE
`;

const SPLIT = (write) => `---- MODULE Transfer ----
EXTENDS Naturals
CONSTANTS Init, Amt, Workers
VARIABLES bal, spent, pc, seen
vars == <<bal, spent, pc, seen>>
Initial == /\\ bal = Init /\\ spent = 0
           /\\ pc = [w \\in Workers |-> "read"] /\\ seen = [w \\in Workers |-> 0]
Read(w)  == /\\ pc[w] = "read" /\\ seen' = [seen EXCEPT ![w] = bal]
            /\\ pc' = [pc EXCEPT ![w] = IF bal >= Amt THEN "write" ELSE "done"]
            /\\ UNCHANGED <<bal, spent>>
${write}
Idle == (\\A w \\in Workers : pc[w] = "done") /\\ UNCHANGED vars
Next == (\\E w \\in Workers : Read(w) \\/ Write(w)) \\/ Idle
Spec == Initial /\\ [][Next]_vars
NoOverspend == spent <= Init
====
`;
const WRITE_GUARDED = `Write(w) == /\\ pc[w] = "write" /\\ pc' = [pc EXCEPT ![w] = "done"] /\\ UNCHANGED seen
            /\\ IF bal >= Amt THEN bal' = bal - Amt /\\ spent' = spent + Amt ELSE UNCHANGED <<bal, spent>>`;
const WRITE_BLIND = `Write(w) == /\\ pc[w] = "write" /\\ pc' = [pc EXCEPT ![w] = "done"] /\\ UNCHANGED seen
            /\\ bal' = seen[w] - Amt /\\ spent' = spent + Amt`;
const splitCfg = (amt, workers) => `CONSTANTS
  Init = 100
  Amt = ${amt}
  Workers = {${workers}}
INIT Initial
NEXT Next
INVARIANT NoOverspend
`;

/** Replace exactly one occurrence, or fail: a scenario edit that does not apply must never pass silently. */
function edit(text, from, to) {
  const at = text.indexOf(from);
  if (at < 0 || text.indexOf(from, at + 1) >= 0) throw new Error(`edit does not apply once: ${from}`);
  return text.slice(0, at) + to + text.slice(at + from.length);
}

const PROP = 'SPECIFICATION Spec\nPROPERTY EventuallyResolves\n';
const INV = 'SPECIFICATION Spec\nINVARIANT TypeOK\n';

/**
 * Each run: files (path -> text) and jobs (tag, dir, module, cfg, flags). The run's script runs TLC once per job
 * and prints every output line prefixed with "[tag] ".
 */
export function tlcRuns() {
  const runs = {};

  // AUD-5.1: the pair (q1 checks the property, q2 an invariant) and variant v1 on Payout (q3 property, q4 invariant).
  {
    const files = { 'main/HoldLive.tla': HOLD51, 'main/q1.cfg': PROP, 'main/q2.cfg': INV };
    const jobs = [['q1', 'main', 'HoldLive', 'q1.cfg', ''], ['q2', 'main', 'HoldLive', 'q2.cfg', '']];
    const scen = {
      s1: edit(HOLD51, 'Spec == Init /\\ [][Next]_vars /\\ Fair', 'Spec == Init /\\ [][Next]_vars'),
      s2: edit(HOLD51, 'Timeout == st \\in {"held", "pending"}', 'Timeout == st = "held"'),
      s3: edit(HOLD51, `st' = "captured"`, `st' = "capturd"`),
      s4: edit(HOLD51, 'Next == Try \\/ Busy \\/ Capture \\/ Timeout \\/ Done', 'Next == Try \\/ Capture \\/ Timeout \\/ Done'),
    };
    for (const [s, mod] of Object.entries(scen)) {
      Object.assign(files, { [`${s}/HoldLive.tla`]: mod, [`${s}/q1.cfg`]: PROP, [`${s}/q2.cfg`]: INV });
      jobs.push([`q1 ${s}`, s, 'HoldLive', 'q1.cfg', ''], [`q2 ${s}`, s, 'HoldLive', 'q2.cfg', '']);
    }
    const P3 = 'SPECIFICATION Spec\nPROPERTY EventuallyFinished\n';
    const P4 = 'SPECIFICATION Spec\nINVARIANT NeverLost\n';
    Object.assign(files, { 'payout/Payout.tla': PAYOUT, 'payout/q3.cfg': P3, 'payout/q4.cfg': P4 });
    jobs.push(['q3', 'payout', 'Payout', 'q3.cfg', ''], ['q4', 'payout', 'Payout', 'q4.cfg', '']);
    const pscen = {
      t1: edit(PAYOUT, 'Spec == Init /\\ [][Next]_st /\\ Fair', 'Spec == Init /\\ [][Next]_st'),
      t2: edit(PAYOUT, 'Next == Send \\/ Bounce \\/ Settle \\/ Abandon \\/ Done', 'Next == Send \\/ Bounce \\/ Abandon \\/ Done'),
      t3: edit(PAYOUT, `st' = "queued"`, `st' = "queud"`),
    };
    for (const [s, mod] of Object.entries(pscen)) {
      Object.assign(files, { [`payout-${s}/Payout.tla`]: mod, [`payout-${s}/q3.cfg`]: P3, [`payout-${s}/q4.cfg`]: P4 });
      jobs.push([`q3 ${s}`, `payout-${s}`, 'Payout', 'q3.cfg', ''], [`q4 ${s}`, `payout-${s}`, 'Payout', 'q4.cfg', '']);
    }
    runs['RUN-tlc-hold-kind'] = { files, jobs };
  }

  // AUD-5.2: the pair (q1 fairness on Timeout, q2 on Try and the provider's Capture), each scenario an environment
  // with actions removed from Next; x1 is q2 with the provider's fairness removed. Variant v1 on Payout (q3, q4).
  {
    const FAIR2 = 'Fair == WF_vars(Try) /\\ SF_vars(Capture)';
    const q1 = HOLD52;
    const q2 = edit(HOLD52, 'Fair == WF_vars(Timeout)', FAIR2);
    const files = { 'q1/HoldLive.tla': q1, 'q2/HoldLive.tla': q2, 'Hold.cfg': PROP };
    const jobs = [['q1', 'q1', 'HoldLive', '../Hold.cfg', '-deadlock'], ['q2', 'q2', 'HoldLive', '../Hold.cfg', '-deadlock']];
    // An environment is the spec with actions switched off: each removed action is defined as FALSE, so it is never
    // enabled and a fairness condition on it asks for nothing.
    const off = (mod, actions) => actions.reduce((m, a) => edit(m, defs[a], `${a.padEnd(7)} == FALSE`), mod);
    const defs = {
      Busy: 'Busy    == st = "pending" /\\ st\' = "held"     /\\ UNCHANGED tries',
      Capture: 'Capture == st = "pending" /\\ st\' = "captured" /\\ UNCHANGED tries',
      Timeout: 'Timeout == st \\in {"held", "pending"} /\\ st\' = "released" /\\ UNCHANGED tries',
    };
    const envs = { s1: ['Capture'], s2: ['Busy', 'Capture'], s3: ['Busy'], s4: ['Timeout'] };
    for (const [s, acts] of Object.entries(envs)) {
      for (const [q, mod] of [['q1', q1], ['q2', q2]]) {
        files[`${q}-${s}/HoldLive.tla`] = off(mod, acts);
        jobs.push([`${q} ${s}`, `${q}-${s}`, 'HoldLive', '../Hold.cfg', '-deadlock']);
      }
    }
    files['q2-x1/HoldLive.tla'] = edit(HOLD52, 'Fair == WF_vars(Timeout)', 'Fair == WF_vars(Try)');
    jobs.push(['q2 x1', 'q2-x1', 'HoldLive', '../Hold.cfg', '-deadlock']);
    const P = 'SPECIFICATION Spec\nPROPERTY EventuallyFinished\n';
    const p3 = PAYOUT;
    const p4 = edit(PAYOUT, 'Fair == WF_st(Abandon)', 'Fair == WF_st(Send) /\\ SF_st(Settle)');
    files['Payout.cfg'] = P;
    files['q3/Payout.tla'] = p3;
    files['q4/Payout.tla'] = p4;
    jobs.push(['q3', 'q3', 'Payout', '../Payout.cfg', ''], ['q4', 'q4', 'Payout', '../Payout.cfg', '']);
    const pdefs = {
      Bounce: 'Bounce  == st = "sent"   /\\ st\' = "queued"',
      Settle: 'Settle  == st = "sent"   /\\ st\' = "settled"',
      Abandon: 'Abandon == st \\in {"queued", "sent"} /\\ st\' = "abandoned"',
    };
    const poff = (mod, actions) => actions.reduce((m, a) => edit(m, pdefs[a], `${a.padEnd(7)} == FALSE`), mod);
    const penvs = { t1: ['Settle'], t2: ['Abandon'], t3: ['Bounce'] };
    for (const [s, acts] of Object.entries(penvs)) {
      for (const [q, mod] of [['q3', p3], ['q4', p4]]) {
        files[`${q}-${s}/Payout.tla`] = poff(mod, acts);
        jobs.push([`${q} ${s}`, `${q}-${s}`, 'Payout', '../Payout.cfg', '']);
      }
    }
    runs['RUN-tlc-hold-env'] = { files, jobs };
  }

  // AUD-5.3: the pair (q1 Amount 40, q2 Amount 80, TLC's default flags), q3 = q2 with -deadlock; variant v2 on Sym
  // (q4 with SYMMETRY, q5 without).
  {
    const files = { 'Withdraw.tla': WITHDRAW, 'q1.cfg': withdrawCfg(40), 'q2.cfg': withdrawCfg(80), 'Sym.tla': SYM, 'q4.cfg': symCfg(true), 'q5.cfg': symCfg(false) };
    const jobs = [
      ['q1', '.', 'Withdraw', 'q1.cfg', ''],
      ['q2', '.', 'Withdraw', 'q2.cfg', ''],
      ['q3', '.', 'Withdraw', 'q2.cfg', '-deadlock'],
      ['q4', '.', 'Sym', 'q4.cfg', ''],
      ['q5', '.', 'Sym', 'q5.cfg', ''],
    ];
    runs['RUN-tlc-deadlock-stop'] = { files, jobs };
  }

  // AUD-5.4 variant v1: the action split into Read and Write; q1 keeps the guard inside the write, q2 writes what it
  // read. Scenarios c1-c3 are constants.
  {
    const files = { 'q1/Transfer.tla': SPLIT(WRITE_GUARDED), 'q2/Transfer.tla': SPLIT(WRITE_BLIND) };
    const jobs = [];
    const consts = { c1: [80, 'w1, w2'], c2: [40, 'w1, w2'], c3: [40, 'w1, w2, w3'] };
    for (const [c, [amt, ws]] of Object.entries(consts)) files[`${c}.cfg`] = splitCfg(amt, ws);
    for (const q of ['q1', 'q2']) {
      jobs.push([q, q, 'Transfer', '../c1.cfg', '']);
      for (const c of Object.keys(consts)) jobs.push([`${q} ${c}`, q, 'Transfer', `../${c}.cfg`, '']);
    }
    runs['RUN-tlc-split-guard'] = { files, jobs };
  }
  return runs;
}

export const TLC_SCRIPT = `#!/bin/sh
# run.sh: runs TLC 1.8.0 once per line of jobs.txt (tag|dir|module|cfg|flags) and prints every line TLC writes,
# prefixed with "[tag] ". TLC's state queue goes under /tmp; the trace files it writes stay in the scratch copy.
n=0
while IFS='|' read -r tag dir mod cfg flags; do
  [ -z "$tag" ] && continue
  n=$((n + 1))
  ( cd "$dir" && java -XX:+UseParallelGC -cp /opt/tla2tools/tla2tools-1.8.0.jar tlc2.TLC -workers 1 $flags -metadir /tmp/tlc-states-$n -config "$cfg" "$mod" 2>&1; echo "exit=$?" ) | sed "s/^/[$tag] /"
done < jobs.txt
`;
