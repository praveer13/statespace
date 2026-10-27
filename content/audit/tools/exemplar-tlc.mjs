// The TLC inputs of the exemplar runs (content/audit/tools/record-exemplars.mjs), written out under
// runs/<RUN-id>/inputs/ before each run, as content/audit/tools/s5s6-inputs.mjs does for the S5 anchors. Every module
// a case shows is here once; a scenario's module is the case's module with one edit (or one environment, an action
// defined as FALSE), so the run checks exactly what the scenario says. Tags are neutral: qN per case, and t1..,
// s1.., c1.. or g1.. per scenario.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Replace exactly one occurrence, or fail: a scenario edit that does not apply must never pass silently. */
export function edit(text, from, to) {
  const at = text.indexOf(from);
  if (at < 0 || text.indexOf(from, at + 1) >= 0) throw new Error(`edit does not apply once: ${from}`);
  return text.slice(0, at) + to + text.slice(at + from.length);
}

// ------------------------------------------------------------------ AUD-5.1 (G3): four property-kind pairs

export const APPROVAL = `---- MODULE Approval ----
VARIABLES st
Init == st = "requested"
Review  == st = "requested" /\\ st' = "reviewing"
Recheck == st = "reviewing" /\\ st' = "requested"
Approve == st = "reviewing" /\\ st' = "approved"
Deny    == st = "reviewing" /\\ st' = "denied"
Done    == st \\in {"approved", "denied"} /\\ UNCHANGED st
Next == Review \\/ Recheck \\/ Approve \\/ Deny \\/ Done
Fair == WF_st(Review) /\\ SF_st(Deny)
Spec == Init /\\ [][Next]_st /\\ Fair
TypeOK == st \\in {"requested", "reviewing", "approved", "denied"}
Decided == st \\in {"approved", "denied"}
EventuallyDecided == <>Decided
====
`;

export const BATCH = `---- MODULE Batch ----
EXTENDS Naturals
VARIABLES st, tries
vars == <<st, tries>>
Init == st = "open" /\\ tries = 0
Submit == st = "open"      /\\ st' = "submitted" /\\ UNCHANGED tries
Fail   == st = "submitted" /\\ tries < 2 /\\ st' = "open" /\\ tries' = tries + 1
Settle == st = "submitted" /\\ st' = "settled"   /\\ UNCHANGED tries
GiveUp == st = "submitted" /\\ tries = 2 /\\ st' = "failed" /\\ UNCHANGED tries
Done   == st \\in {"settled", "failed"} /\\ UNCHANGED vars
Next == Submit \\/ Fail \\/ Settle \\/ GiveUp \\/ Done
Spec == Init /\\ [][Next]_vars /\\ WF_vars(Submit) /\\ WF_vars(Settle \\/ GiveUp)
TriesBound == tries <= 2
SubmittedLeadsToEnd == (st = "submitted") ~> (st \\in {"settled", "failed"})
====
`;

export const WEBHOOKS = `---- MODULE Webhooks ----
CONSTANT Hooks
VARIABLES st
Init == st = [h \\in Hooks |-> "queued"]
Send(h)  == st[h] = "queued" /\\ st' = [st EXCEPT ![h] = "sent"]
Retry(h) == st[h] = "sent"   /\\ st' = [st EXCEPT ![h] = "queued"]
Ack(h)   == st[h] = "sent"   /\\ st' = [st EXCEPT ![h] = "delivered"]
Dead(h)  == st[h] \\in {"queued", "sent"} /\\ st' = [st EXCEPT ![h] = "dead"]
Idle == (\\A h \\in Hooks : st[h] \\in {"delivered", "dead"}) /\\ UNCHANGED st
Next == (\\E h \\in Hooks : Send(h) \\/ Retry(h) \\/ Ack(h) \\/ Dead(h)) \\/ Idle
Spec == Init /\\ [][Next]_st /\\ \\A h \\in Hooks : WF_st(Dead(h))
TypeOK == st \\in [Hooks -> {"queued", "sent", "delivered", "dead"}]
AllSettle == \\A h \\in Hooks : <>(st[h] \\in {"delivered", "dead"})
====
`;

export const ASK = `---- MODULE RefundAsk ----
EXTENDS Naturals
VARIABLES st, n
vars == <<st, n>>
Init == st = "open" /\\ n = 0
Ask    == st = "open"  /\\ st' = "asked" /\\ UNCHANGED n
Info   == st = "asked" /\\ n < 3 /\\ st' = "open" /\\ n' = n + 1
Grant  == st = "asked" /\\ st' = "granted" /\\ UNCHANGED n
Refuse == st = "asked" /\\ st' = "refused" /\\ UNCHANGED n
Done   == st \\in {"granted", "refused"} /\\ UNCHANGED vars
Next == Ask \\/ Info \\/ Grant \\/ Refuse \\/ Done
Spec == Init /\\ [][Next]_vars /\\ WF_vars(Ask) /\\ WF_vars(Grant \\/ Refuse)
Answered == <>(st \\in {"granted", "refused"})
====
`;

function kindRun() {
  const files = {};
  const jobs = [];
  const pairs = [
    { dir: 'approval', mod: 'Approval', text: APPROVAL, cfgs: { q5: 'SPECIFICATION Spec\nPROPERTY EventuallyDecided\n', q6: 'SPECIFICATION Spec\nINVARIANT TypeOK\n' },
      scen: {
        t1: ['Spec == Init /\\ [][Next]_st /\\ Fair', 'Spec == Init /\\ [][Next]_st'],
        t2: [`Approve == st = "reviewing" /\\ st' = "approved"`, `Approve == st = "reviewing" /\\ st' = "aproved"`],
        t3: ['Fair == WF_st(Review) /\\ SF_st(Deny)', 'Fair == WF_st(Review) /\\ WF_st(Deny)'],
      } },
    { dir: 'batch', mod: 'Batch', text: BATCH, cfgs: { q7: 'SPECIFICATION Spec\nPROPERTY SubmittedLeadsToEnd\n', q8: 'SPECIFICATION Spec\nINVARIANT TriesBound\n' },
      scen: {
        t1: ['Spec == Init /\\ [][Next]_vars /\\ WF_vars(Submit) /\\ WF_vars(Settle \\/ GiveUp)', 'Spec == Init /\\ [][Next]_vars'],
        t2: ["/\\ st' = \"open\" /\\ tries' = tries + 1", "/\\ st' = \"open\" /\\ tries' = tries"],
        t3: ['Fail   == st = "submitted" /\\ tries < 2', 'Fail   == st = "submitted" /\\ tries < 3'],
      } },
    { dir: 'webhooks', mod: 'Webhooks', text: WEBHOOKS, cfgs: { q9: 'CONSTANT Hooks = {h1, h2}\nSPECIFICATION Spec\nPROPERTY AllSettle\n', q10: 'CONSTANT Hooks = {h1, h2}\nSPECIFICATION Spec\nINVARIANT TypeOK\n' },
      scen: {
        t1: ['Spec == Init /\\ [][Next]_st /\\ \\A h \\in Hooks : WF_st(Dead(h))', 'Spec == Init /\\ [][Next]_st'],
        t2: ['Dead(h)  == st[h] \\in {"queued", "sent"}', 'Dead(h)  == st[h] = "queued"'],
        t3: [`st' = [st EXCEPT ![h] = "delivered"]`, `st' = [st EXCEPT ![h] = "delivred"]`],
      } },
    { dir: 'ask', mod: 'RefundAsk', text: ASK, cfgs: { q11: 'SPECIFICATION Spec\nPROPERTY Answered\n', q12: 'SPECIFICATION Spec\nCHECK_DEADLOCK TRUE\n' },
      scen: {
        t1: ['Spec == Init /\\ [][Next]_vars /\\ WF_vars(Ask) /\\ WF_vars(Grant \\/ Refuse)', 'Spec == Init /\\ [][Next]_vars'],
        t2: ['Next == Ask \\/ Info \\/ Grant \\/ Refuse \\/ Done', 'Next == Ask \\/ Info \\/ Grant \\/ Refuse'],
        t3: ["/\\ st' = \"open\" /\\ n' = n + 1", "/\\ st' = \"open\" /\\ n' = n"],
      } },
  ];
  for (const p of pairs) {
    files[`${p.dir}/${p.mod}.tla`] = p.text;
    for (const [q, cfg] of Object.entries(p.cfgs)) {
      files[`${p.dir}/${q}.cfg`] = cfg;
      jobs.push([q, p.dir, p.mod, `${q}.cfg`, '']);
    }
    for (const [t, [from, to]] of Object.entries(p.scen)) {
      const d = `${p.dir}-${t}`;
      files[`${d}/${p.mod}.tla`] = edit(p.text, from, to);
      for (const [q, cfg] of Object.entries(p.cfgs)) {
        files[`${d}/${q}.cfg`] = cfg;
        jobs.push([`${q} ${t}`, d, p.mod, `${q}.cfg`, '']);
      }
    }
  }
  return { files, jobs };
}

// ------------------------------------------------------------------ AUD-5.2 (G7): fairness with a busy budget

export const HOLD_BUDGET = (fair) => `---- MODULE HoldBudget ----
EXTENDS Naturals
VARIABLES st, busy
vars == <<st, busy>>
Init == st = "held" /\\ busy = 0
Try     == st = "held"    /\\ st' = "pending"  /\\ UNCHANGED busy
Busy    == st = "pending" /\\ busy < 2 /\\ st' = "held" /\\ busy' = busy + 1
Capture == st = "pending" /\\ st' = "captured" /\\ UNCHANGED busy
Timeout == st \\in {"held", "pending"} /\\ st' = "released" /\\ UNCHANGED busy
Next == Try \\/ Busy \\/ Capture \\/ Timeout
${fair}
Spec == Init /\\ [][Next]_vars /\\ Fair
Resolved == st \\in {"captured", "released"}
EventuallyResolves == <>Resolved
====
`;
export const FAIR_SOUND = 'Fair == WF_vars(Timeout)';
export const FAIR_FLAWED = 'Fair == WF_vars(Try) /\\ WF_vars(Capture)';

function budgetRun() {
  const files = { 'Hold.cfg': 'SPECIFICATION Spec\nPROPERTY EventuallyResolves\n' };
  const jobs = [];
  const mods = { q5: HOLD_BUDGET(FAIR_SOUND), q6: HOLD_BUDGET(FAIR_FLAWED) };
  const defs = {
    Busy: 'Busy    == st = "pending" /\\ busy < 2 /\\ st\' = "held" /\\ busy\' = busy + 1',
    Capture: 'Capture == st = "pending" /\\ st\' = "captured" /\\ UNCHANGED busy',
    Timeout: 'Timeout == st \\in {"held", "pending"} /\\ st\' = "released" /\\ UNCHANGED busy',
  };
  const off = (mod, actions) => actions.reduce((m, a) => edit(m, defs[a], `${a.padEnd(7)} == FALSE`), mod);
  const envs = { s1: ['Busy', 'Capture'], s2: ['Capture'], s3: ['Busy'], s4: ['Timeout'] };
  for (const [q, mod] of Object.entries(mods)) {
    files[`${q}/HoldBudget.tla`] = mod;
    jobs.push([q, q, 'HoldBudget', '../Hold.cfg', '-deadlock']);
  }
  for (const [s, acts] of Object.entries(envs)) {
    for (const [q, mod] of Object.entries(mods)) {
      files[`${q}-${s}/HoldBudget.tla`] = off(mod, acts);
      jobs.push([`${q} ${s}`, `${q}-${s}`, 'HoldBudget', '../Hold.cfg', '-deadlock']);
    }
  }
  return { files, jobs };
}

// ------------------------------------------------------------------ AUD-8.1 (G7): the outbox without timer re-sends

const OUTBOX_CFG = (head, consts) => `${head.map((l) => `\\* ${l}`).join('\n')}
CONSTANTS Cmds = {c1}  MaxCrashes = ${consts.crashes}  MaxAttempts = 2  CrashWindows = ${consts.windows}
          Dedup = ${consts.dedup}  FreshKey = FALSE  Forgets = "never"  Timeouts = ${consts.timeouts}
INIT Init
NEXT Next
INVARIANT NoDoubleCharge
`;
export const OUTBOX_Q5 = OUTBOX_CFG(['CL-8.2: each command the client commits is charged at most once.', '[M] TLC over Spec: one command, two attempts, one crash before the send.', '[A] no timer re-sends an unanswered request (Timeouts = FALSE).'], { crashes: 1, windows: '{"CW1"}', dedup: 'FALSE', timeouts: 'FALSE' });
export const OUTBOX_Q6 = OUTBOX_CFG(['CL-8.2: each command the client commits is charged at most once.', '[M] TLC over Spec: one command, two attempts, one crash before the send.', '[A] the database keeps every committed row across a worker crash.'], { crashes: 1, windows: '{"CW1"}', dedup: 'FALSE', timeouts: 'FALSE' });

function outboxRun(repo) {
  const src = join(repo, 'runs', 'RUN-tlc-env-assumption', 'inputs');
  const files = {
    'Outbox.tla': readFileSync(join(src, 'Outbox.tla'), 'utf8'),
    'OutboxIface.tla': readFileSync(join(src, 'OutboxIface.tla'), 'utf8'),
    'q5.cfg': OUTBOX_Q5,
    'q6.cfg': OUTBOX_Q6,
    'g1.cfg': OUTBOX_CFG(['scenario g1: the case\'s model, with the environment set to: one crash before the send, no timer re-sends'], { crashes: 1, windows: '{"CW1"}', dedup: 'FALSE', timeouts: 'FALSE' }),
    'g2.cfg': OUTBOX_CFG(['scenario g2: the case\'s model, with the environment set to: one crash before the send, and a timer re-sends an unanswered request'], { crashes: 1, windows: '{"CW1"}', dedup: 'FALSE', timeouts: 'TRUE' }),
    'g3.cfg': OUTBOX_CFG(['scenario g3: the case\'s model, with the environment set to: no crash, a timer re-sends, and the provider dedups a repeated key'], { crashes: 0, windows: '{}', dedup: 'TRUE', timeouts: 'TRUE' }),
    'g4.cfg': OUTBOX_CFG(['scenario g4: the case\'s model, with the environment set to: no crash and no timer re-sends'], { crashes: 0, windows: '{}', dedup: 'FALSE', timeouts: 'FALSE' }),
  };
  const jobs = ['q5', 'q6', 'g1', 'g2', 'g3', 'g4'].map((t) => [t, '.', 'Outbox', `${t}.cfg`, '-deadlock']);
  return { files, jobs };
}

// ------------------------------------------------------------------ AUD-5.4 (G9): two more split actions

export const HOLD_SPLIT = (place) => `---- MODULE Holds ----
EXTENDS Naturals
CONSTANTS Bal, Amt, Workers
VARIABLES held, pc
vars == <<held, pc>>
Initial == held = 0 /\\ pc = [w \\in Workers |-> "check"]
Check(w) == /\\ pc[w] = "check"
            /\\ pc' = [pc EXCEPT ![w] = IF Bal - held >= Amt THEN "place" ELSE "done"]
            /\\ UNCHANGED held
${place}
Idle == (\\A w \\in Workers : pc[w] = "done") /\\ UNCHANGED vars
Next == (\\E w \\in Workers : Check(w) \\/ Place(w)) \\/ Idle
Spec == Initial /\\ [][Next]_vars
NoOverHold == held <= Bal
====
`;
export const PLACE_GUARDED = `Place(w) == /\\ pc[w] = "place" /\\ pc' = [pc EXCEPT ![w] = "done"]
            /\\ IF Bal - held >= Amt THEN held' = held + Amt ELSE UNCHANGED held`;
export const PLACE_BLIND = `Place(w) == /\\ pc[w] = "place" /\\ pc' = [pc EXCEPT ![w] = "done"]
            /\\ held' = held + Amt`;

export const KEY_SPLIT = (charge) => `---- MODULE Charges ----
EXTENDS Naturals
CONSTANTS Workers
VARIABLES used, charges, pc
vars == <<used, charges, pc>>
Initial == used = FALSE /\\ charges = 0 /\\ pc = [w \\in Workers |-> "check"]
Check(w)  == /\\ pc[w] = "check"
             /\\ pc' = [pc EXCEPT ![w] = IF used THEN "done" ELSE "charge"]
             /\\ UNCHANGED <<used, charges>>
${charge}
Idle == (\\A w \\in Workers : pc[w] = "done") /\\ UNCHANGED vars
Next == (\\E w \\in Workers : Check(w) \\/ Charge(w)) \\/ Idle
Spec == Initial /\\ [][Next]_vars
AtMostOnce == charges <= 1
====
`;
export const CHARGE_GUARDED = `Charge(w) == /\\ pc[w] = "charge" /\\ pc' = [pc EXCEPT ![w] = "done"]
             /\\ IF used THEN UNCHANGED <<used, charges>> ELSE used' = TRUE /\\ charges' = charges + 1`;
export const CHARGE_BLIND = `Charge(w) == /\\ pc[w] = "charge" /\\ pc' = [pc EXCEPT ![w] = "done"]
             /\\ used' = TRUE /\\ charges' = charges + 1`;

/** The atomic actions the splits replace: what the agent's TLC run checked before the split (the cases' receipts). */
export const HOLD_ATOMIC = `---- MODULE Holds ----
EXTENDS Naturals
CONSTANTS Bal, Amt, Workers
VARIABLES held, pc
vars == <<held, pc>>
Initial == held = 0 /\\ pc = [w \\in Workers |-> "check"]
PlaceHold(w) == /\\ pc[w] = "check" /\\ pc' = [pc EXCEPT ![w] = "done"]
                /\\ IF Bal - held >= Amt THEN held' = held + Amt ELSE UNCHANGED held
Idle == (\\A w \\in Workers : pc[w] = "done") /\\ UNCHANGED vars
Next == (\\E w \\in Workers : PlaceHold(w)) \\/ Idle
Spec == Initial /\\ [][Next]_vars
NoOverHold == held <= Bal
====
`;
export const KEY_ATOMIC = `---- MODULE Charges ----
EXTENDS Naturals
CONSTANTS Workers
VARIABLES used, charges, pc
vars == <<used, charges, pc>>
Initial == used = FALSE /\\ charges = 0 /\\ pc = [w \\in Workers |-> "check"]
ChargeOnce(w) == /\\ pc[w] = "check" /\\ pc' = [pc EXCEPT ![w] = "done"]
                 /\\ IF used THEN UNCHANGED <<used, charges>> ELSE used' = TRUE /\\ charges' = charges + 1
Idle == (\\A w \\in Workers : pc[w] = "done") /\\ UNCHANGED vars
Next == (\\E w \\in Workers : ChargeOnce(w)) \\/ Idle
Spec == Initial /\\ [][Next]_vars
AtMostOnce == charges <= 1
====
`;

function splitRun() {
  const files = {
    'a5/Holds.tla': HOLD_ATOMIC,
    'a7/Charges.tla': KEY_ATOMIC,
    'q5/Holds.tla': HOLD_SPLIT(PLACE_GUARDED),
    'q6/Holds.tla': HOLD_SPLIT(PLACE_BLIND),
    'q7/Charges.tla': KEY_SPLIT(CHARGE_GUARDED),
    'q8/Charges.tla': KEY_SPLIT(CHARGE_BLIND),
  };
  const jobs = [];
  const holdCfg = (amt, ws) => `CONSTANTS\n  Bal = 100\n  Amt = ${amt}\n  Workers = {${ws}}\nINIT Initial\nNEXT Next\nINVARIANT NoOverHold\n`;
  const keyCfg = (ws) => `CONSTANTS\n  Workers = {${ws}}\nINIT Initial\nNEXT Next\nINVARIANT AtMostOnce\n`;
  const hold = { c1: [80, 'w1, w2'], c2: [40, 'w1, w2'], c3: [40, 'w1, w2, w3'] };
  const key = { c1: 'w1', c2: 'w1, w2', c3: 'w1, w2, w3' };
  for (const [c, [amt, ws]] of Object.entries(hold)) files[`hold-${c}.cfg`] = holdCfg(amt, ws);
  for (const [c, ws] of Object.entries(key)) files[`key-${c}.cfg`] = keyCfg(ws);
  jobs.push(['a5', 'a5', 'Holds', '../hold-c1.cfg', ''], ['a7', 'a7', 'Charges', '../key-c2.cfg', '']);
  for (const q of ['q5', 'q6']) for (const c of Object.keys(hold)) jobs.push([`${q} ${c}`, q, 'Holds', `../hold-${c}.cfg`, '']);
  for (const q of ['q7', 'q8']) for (const c of Object.keys(key)) jobs.push([`${q} ${c}`, q, 'Charges', `../key-${c}.cfg`, '']);
  return { files, jobs };
}

export function tlcExemplarRuns(repo) {
  return {
    'RUN-tlc-kind-exemplars': kindRun(),
    'RUN-tlc-budget-fairness': budgetRun(),
    'RUN-tlc-outbox-timers': outboxRun(repo),
    'RUN-tlc-split-exemplars': splitRun(),
  };
}
