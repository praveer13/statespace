// GEN-spot-the-gap's cases: each is a variant of an Audit Desk anchor (docs/AUDIT-DESK.md section 3), made from the
// anchor's sound member by one gap-class mutation operator, or left sound. A builder returns the case's artifact (what
// the checker reads), how the learner sees it, the class the operator is meant to produce, and the feedback notes.
// The checker (engine.ts) decides the class from the artifact; the intended class is only the generator's reference,
// which the checker must confirm.
//
// Pure: no DOM, storage or network.

import type { SeededDraw } from '@statespace/rng'
import type { MisconceptionKey } from '../core/types.ts'
import { AND, B, boxRun, IMP, K, M, NOT, P, R, showF, V } from './engine.ts'
import type { CtiCase, Dom, F, FairAction, FairCase, GapCase, GapClass, IdentsCase, LogCase, ObserverCase, QueryCase, ScenarioCase, WidthCase } from './engine.ts'

export interface Built {
  readonly anchor: string
  readonly case: GapCase
  readonly intended: GapClass
  /** What the learner reads: the claim, quoted as an agent wrote it. */
  readonly claim: string
  /** The artifact the claim rests on, as Markdown. */
  readonly artifact: string
  /** The key option's why: what the gap is in this case. */
  readonly why: string
  /** The tag a "none: sound" pick carries on a flawed case: the misconception that accepts it. */
  readonly noneTag?: MisconceptionKey
  /** The note on a "none: sound" pick, for a flawed case. */
  readonly noneWhy?: string
  /** Where the case sits on its template's band axis. */
  readonly level: number
  readonly operator: string
}

const code = (lines: readonly string[]): string => `\n\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n\n`
const numbered = (lines: readonly string[]): string[] => lines.map((l, i) => `${String(i + 1).padStart(2, ' ')}  ${l}`)

// ---------------------------------------------------------------- AUD-1.1: the guarded transfer query

const TRANSFER: Dom[] = [
  { v: 'a', lo: -2, hi: 6 },
  { v: 'x', lo: -2, hi: 6 },
]

function guardedQuery(draw: SeededDraw, contradict: boolean, harmless: boolean): Built {
  const a = V('a')
  const x = V('x')
  const base: F[] = [R(a, '>=', K(0)), R(x, '>', K(0)), R(x, '<=', a)]
  const conflict = draw.pick([R(a, '<', x), R(x, '>', a), R(P(a, K(1)), '<=', x)])
  let lines = [...base]
  let at = -1
  if (contradict) {
    at = draw.int(2, 3)
    lines = [...base.slice(0, at), conflict, ...base.slice(at)]
  } else if (harmless) {
    // A sound variant with a harmless change: the premises reordered, one stated twice.
    lines = draw.shuffle([...base, R(K(0), '<=', a)])
  }
  const violation = R(M(a, x), '<', K(0))
  const c: QueryCase = { kind: 'query', doms: TRANSFER, premises: lines.map((f, i) => ({ n: i + 1, x: f })), violation }
  const guardLine = lines.findIndex((f) => showF(f) === 'x ≤ a') + 1
  return {
    anchor: 'AUD-1.1',
    case: c,
    intended: contradict ? 'G2' : 'none',
    claim: contradict
      ? 'The guarded transfer never overdraws the sender: the query below, premises then violation, is unsat.'
      : 'The guarded transfer never overdraws the sender: the query below is unsat over every state in the box, and the premises hold together.',
    artifact: `Premises, one per line, then the violation the query asks for (a is the sender's balance, x the amount):${code([...numbered(lines.map(showF)), `    violation: ${showF(violation)}`])}`,
    why: contradict
      ? `Lines ${Math.min(guardLine, at + 1)} and ${Math.max(guardLine, at + 1)} cannot both hold, so no state satisfies the premises. Every query over them is unsat, whatever its violation says: the unsat is vacuous.`
      : 'The premises hold together (the checker shows a state), and no state of the box satisfies them and the violation: the claim says what the run shows.',
    ...(contradict ? { noneTag: 'dp:Z1' as const, noneWhy: 'This reads unsat as "safe" without checking that the premises can hold. Here they cannot, so the unsat says nothing about transfers.' } : {}),
    level: 1,
    operator: contradict ? 'add a contradictory hypothesis' : harmless ? 'reorder the premises and repeat one' : 'none',
  }
}

// ---------------------------------------------------------------- AUD-1.1 as a theorem: two hypotheses

function guardedTheorem(draw: SeededDraw): Built {
  const a = V('a')
  const x = V('x')
  const k = draw.int(0, 2)
  const h1 = R(P(x, K(k)), '<=', a)
  const h2 = draw.pick([R(a, '<', P(x, K(k))), R(P(a, K(1)), '<=', P(x, K(k)))])
  const goal = R(M(a, x), '>=', K(k))
  const c: QueryCase = { kind: 'query', doms: TRANSFER, premises: [{ n: 1, x: h1 }, { n: 2, x: h2 }], violation: NOT(goal) }
  const name = draw.pick(['transfer_safe', 'withdraw_ok', 'debit_nonneg'])
  return {
    anchor: 'AUD-1.1',
    case: c,
    intended: 'G2',
    claim: `The build accepted \`${name}\`, so a guarded transfer keeps at least ${k} in the sender's account.`,
    artifact: `The theorem, its hypotheses on lines 1 and 2:${code([`theorem ${name} (a x : Int)`, `    (h1 : ${showF(h1)})   -- line 1`, `    (h2 : ${showF(h2)})   -- line 2`, `    : ${showF(goal)}`])}`,
    why: 'Hypotheses h1 and h2 cannot hold together, so the theorem is about no transfer at all: it is true because nothing satisfies its premises.',
    noneTag: 'dp:L3',
    noneWhy: 'This takes the build accepting the theorem as the requirement being met. A theorem whose hypotheses cannot hold is accepted and says nothing.',
    level: 2,
    operator: 'add a contradictory hypothesis',
  }
}

// ---------------------------------------------------------------- AUD-2.1: the refund statement; AUD-7.2: the blanket claim

function refund(draw: SeededDraw, weakened: boolean): Built {
  const c = V('c')
  const m = V('m')
  const r = V('r')
  const doms: Dom[] = [
    { v: 'c', lo: 0, hi: 3 },
    { v: 'm', lo: 0, hi: 3 },
    { v: 'r', lo: 0, hi: 3 },
  ]
  // The system: refunds are non-negative; the sound member also checks the merchant can pay.
  const system = weakened ? R(r, '>=', K(0)) : AND(R(r, '>=', K(0)), R(r, '<=', m))
  const customer = R(P(c, r), '>=', K(0))
  const merchant = R(M(m, r), '>=', K(0))
  const statement = weakened ? customer : AND(customer, merchant)
  const requirement = AND(customer, merchant)
  const name = draw.pick(['refund_nonneg', 'refund_safe'])
  const sc: ScenarioCase = { kind: 'scenario', doms, system, statement, requirement }
  return {
    anchor: 'AUD-2.1',
    case: sc,
    intended: weakened ? 'G1' : 'none',
    claim: `\`${name}\` is proved, so a refund never leaves either party with a negative balance.`,
    artifact: `A refund of r moves r from the merchant's balance m to the customer's balance c. ${weakened ? 'The refund command checks only that r ≥ 0.' : 'The refund command checks that 0 ≤ r ≤ m.'} The theorem:${code([`theorem ${name} (c m r : Int) (hc : 0 ≤ c) (hr : 0 ≤ r)${weakened ? '' : ' (hm : r ≤ m)'}`, `    : ${showF(statement)}`])}Requirement: after a refund, neither the customer's nor the merchant's balance is negative.`,
    why: weakened
      ? "The theorem constrains only the customer's balance. A refund larger than the merchant's balance satisfies it and leaves the merchant negative, which the requirement forbids."
      : "The theorem states both parties' balances, under the command's own check, and the requirement asks no more.",
    ...(weakened ? { noneTag: 'dp:L3' as const, noneWhy: 'This takes a proved theorem as the requirement met. This one is true and accepted, and it says nothing about the merchant.' } : {}),
    level: 3,
    operator: weakened ? 'weaken a postcondition' : 'none',
  }
}

function blanket(draw: SeededDraw): Built {
  const doms: Dom[] = [
    { v: 'cross', flag: true },
    { v: 'shared', flag: true },
    { v: 'sees', flag: true },
  ]
  const sees = B('sees')
  const cross = B('cross')
  const shared = B('shared')
  const system = IMP(AND(sees, cross), shared)
  const statement = NOT(AND(sees, cross))
  const requirement = IMP(AND(sees, cross), shared)
  const who = draw.pick(['tenant', 'workspace'])
  return {
    anchor: 'AUD-7.2',
    case: { kind: 'scenario', doms, system, statement, requirement },
    intended: 'G12',
    claim: `No ${who} can ever see another ${who}'s document: the property below holds of every read.`,
    artifact: `Each read is described by three facts: \`cross\` (the document belongs to another ${who}), \`shared\` (its owner shared it with the reader), \`sees\` (the reader sees it). The product lets owners share documents across ${who}s. The property:${code([showF(statement)])}Requirement: a reader sees another ${who}'s document only when its owner shared it.`,
    why: `The property forbids every cross-${who} read, including a shared one, which the requirement allows: the statement is not the requirement. It is the blanket claim with the declassification dropped.`,
    noneTag: 'dp:X4',
    noneWhy: 'This accepts a statement that does not match the requirement. Checking it would only confirm the wrong statement: sharing, a legitimate feature, violates it.',
    level: 3,
    operator: 'drop a declassification',
  }
}

// ---------------------------------------------------------------- AUD-1.3: a verdict line

function verdictLine(draw: SeededDraw, mode: 'budget' | 'unbounded' | 'sound'): Built {
  const doms: Dom[] = [
    { v: 'a', lo: 0, hi: 4 },
    { v: 'x', lo: 0, hi: 4 },
  ]
  const wider: Dom[] = [
    { v: 'a', lo: 0, hi: 9 },
    { v: 'x', lo: 0, hi: 9 },
  ]
  const a = V('a')
  const x = V('x')
  const guarded = AND(R(a, '>=', K(0)), R(x, '>', K(0)), R(x, '<=', a), R(M(a, x), '<', K(0)))
  const deep = AND(R(a, '>=', K(0)), R(x, '>', K(0)), R(M(a, x), '<', K(-4)))
  const query = mode === 'unbounded' ? deep : guarded
  const budget = mode === 'budget' ? draw.int(10, 20) : 100
  const line = boxRun(doms, query, budget)
  const lc: LogCase = { kind: 'log', doms, query, budget, verdictLine: line, claimScope: mode === 'budget' ? 'no-counterexample' : mode === 'unbounded' ? 'all-integers' : 'the-box', wider }
  const claim =
    mode === 'budget'
      ? 'The checker found no counterexample, so the guarded transfer never overdraws.'
      : mode === 'unbounded'
        ? 'The checker returned unsat, so no transfer ever overdraws by more than 4, for all integers.'
        : 'The checker returned unsat over every state with a and x from 0 to 4: no guarded transfer in that box overdraws.'
  return {
    anchor: 'AUD-1.3',
    case: lc,
    intended: mode === 'sound' ? 'none' : 'G5',
    claim,
    artifact: `The run: this page's box checker over every state with a and x from 0 to 4, with a budget of ${budget} states, on the query${code([showF(query), '', `verdict: ${line}`])}`,
    why:
      mode === 'budget'
        ? 'The verdict line is unknown: the run stopped at its budget before it tried every state, so it found nothing because it did not finish. An inconclusive run is reported as a clean one.'
        : mode === 'unbounded'
          ? 'The run covers a and x from 0 to 4 only, and the claim speaks of every integer. A bounded result is presented as a proof; just outside the box the violation holds.'
          : 'The verdict is unsat over the box, and the claim is limited to the box, as the run is.',
    ...(mode === 'budget' ? { noneTag: 'dp:Z2' as const, noneWhy: 'This reads an unknown, a run stopped at its budget, as "no bug". Unknown is no verdict.' } : {}),
    ...(mode === 'unbounded' ? { noneTag: 'dp:T5' as const, noneWhy: 'This takes "no error found" in a box as a proof for every size. The box says nothing beyond its bounds.' } : {}),
    level: 1,
    operator: mode === 'budget' ? 'report an inconclusive result as a verdict' : mode === 'unbounded' ? 'stamp a bounded check as proof' : 'none',
  }
}

// ---------------------------------------------------------------- AUD-1.2: Int for fixed-width code

function width(draw: SeededDraw, sound: boolean): Built {
  const b = V('b')
  const x = V('x')
  const guard = sound ? AND(R(x, '>', K(0)), R(b, '<=', M(K(127), x))) : draw.pick([R(x, '>', K(0)), R(x, '>=', K(1)), AND(R(x, '>', K(0)), R(x, '<=', K(100)))])
  const wc: WidthCase = { kind: 'width', bits: 8, guard, model: sound ? 'bits' : 'int' }
  return {
    anchor: 'AUD-1.2',
    case: wc,
    intended: sound ? 'none' : 'G4',
    claim: sound ? 'A deposit never lowers the balance: checked over 8-bit arithmetic, with the guard against overflow.' : 'A deposit never lowers the balance: the model over Int shows no state where it does.',
    artifact: `The code (8-bit signed integers, addition wraps around):${code([`fn deposit(b: i8, x: i8) -> i8 {`, `    if ${showF(guard).replace(/∧/g, '&&').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/−/g, '-')} { b.wrapping_add(x) } else { b }`, '}'])}The model the claim rests on: ${sound ? '`b` and `x` as 8-bit values, with the guard as written' : '`b` and `x` as unbounded integers (Int)'}.`,
    why: sound ? 'The model uses the code\'s own 8-bit arithmetic, and the guard keeps b + x within range, so no input wraps.' : 'Over Int, b + x > b whenever x > 0, but the code adds in 8 bits: a large b plus a positive x wraps to a negative value. The encoding, not the logic, hides the bug.',
    ...(sound ? {} : { noneTag: 'dp:Z4' as const, noneWhy: 'This assumes Int covers 8-bit code. It does not: the code wraps where Int keeps counting.' }),
    level: 2,
    operator: sound ? 'none' : 'ℤ for a fixed-width type',
  }
}

// ---------------------------------------------------------------- AUD-5.2: fairness on the environment

const FAIR_NAMES = [
  { hold: 'hold', paid: 'payment', place: 'Hold', pay: 'Pay', release: 'Release', expire: 'Expire', who: 'the customer' },
  { hold: 'reservation', paid: 'confirmation', place: 'Reserve', pay: 'Confirm', release: 'Finish', expire: 'Lapse', who: 'the guest' },
] as const

function fairness(draw: SeededDraw, sound: boolean): Built {
  const nm = draw.pick(FAIR_NAMES)
  const actions: FairAction[] = [
    { name: nm.place, owner: 'system', from: { hold: false, paid: false }, to: { hold: true, paid: false } },
    { name: nm.pay, owner: 'environment', from: { hold: true, paid: false }, to: { hold: true, paid: true } },
    { name: nm.release, owner: 'system', from: { hold: true, paid: true }, to: { hold: false, paid: false } },
  ]
  if (sound) actions.push({ name: nm.expire, owner: 'system', from: { hold: true, paid: false }, to: { hold: false, paid: false } })
  const fair = sound ? [nm.release, nm.expire] : [nm.pay, nm.release]
  const fc: FairCase = { kind: 'fair', actions, fair, names: { hold: nm.hold, paid: nm.paid } }
  const row = (a: FairAction): string => `${a.name.padEnd(8)} (${a.owner === 'system' ? 'system' : `environment: ${nm.who}`})  ${a.from.hold ? `${nm.hold} held` : `${nm.hold} free`}, ${nm.paid} ${a.from.paid ? 'yes' : 'no'}  ->  ${a.to.hold ? `${nm.hold} held` : `${nm.hold} free`}, ${nm.paid} ${a.to.paid ? 'yes' : 'no'}`
  return {
    anchor: 'AUD-5.2',
    case: fc,
    intended: sound ? 'none' : 'G7',
    claim: `Every ${nm.hold} is eventually released: checked under ${fair.map((a) => `WF(${a})`).join(' ∧ ')}.`,
    artifact: `The actions, who performs each, and what each changes:${code(actions.map(row))}`,
    why: sound
      ? `Fairness is assumed only for the system's own actions, and ${nm.expire} lets the system release a ${nm.hold} that ${nm.who} never confirms.`
      : `WF(${nm.pay}) assumes ${nm.who} eventually acts: an action the system does not control. Drop it, and a ${nm.hold} waiting on ${nm.who} stays held forever, a fair run the claim's assumption hid.`,
    ...(sound ? {} : { noneTag: 'dp:T14' as const, noneWhy: `This trusts a fairness assumption on an action ${nm.who} controls. Nothing makes ${nm.who} act.` }),
    level: 3,
    operator: sound ? 'none' : 'fairness on an environment action',
  }
}

// ---------------------------------------------------------------- AUD-2.4: the pinned statement

function idents(draw: SeededDraw, sound: boolean): Built {
  const pinned = 'theorem transfer_conserves (s : Ledger) (a b : Acct) (n : Int) : total (transfer s a b n) = total s'
  const op = draw.pick(['rename', 'stricter', 'weaken'] as const)
  const proved = sound
    ? 'theorem transfer_conserves (s : Ledger) (a b : Acct) (n : Int) :\n    total (transfer s a b n) = total s'
    : op === 'rename'
      ? "theorem transfer_conserves (s : Ledger) (a b : Acct) (n : Int) : total (transfer' s a b n) = total s"
      : op === 'stricter'
        ? 'theorem transfer_conserves (s : Ledger) (a b : Acct) (n : Int) : total (transferChecked s a b n) = total s'
        : 'theorem transfer_conserves (s : Ledger) (a b : Acct) (n : Int) : total (transfer s a b n) ≤ total s'
  const ic: IdentsCase = { kind: 'idents', pinned, proved }
  return {
    anchor: 'AUD-2.4',
    case: ic,
    intended: sound ? 'none' : 'G8',
    claim: 'The build is green and `transfer_conserves` is proved, so transfer conserves money.',
    artifact: `The pinned statement:${code([pinned])}The statement the build proved:${code(proved.split('\n'))}`,
    why: sound
      ? 'The proved statement is the pinned one, token for token; only the line break differs.'
      : op === 'weaken'
        ? 'Under the same name, the proved statement is weaker: ≤ where the pin says =. The proof is about a different statement from the one pinned.'
        : `The proved statement is about \`${op === 'rename' ? "transfer'" : 'transferChecked'}\`, not the shipped \`transfer\`: a valid proof about a different function, under the pinned name.`,
    ...(sound ? {} : { noneTag: 'dp:L3' as const, noneWhy: 'This takes a green build as the requirement met. The build proved a statement, but not the pinned one.' }),
    level: 1,
    operator: sound ? 'a line break' : op === 'weaken' ? 'weaken a statement under the same name' : 'point the theorem at another definition',
  }
}

// ---------------------------------------------------------------- AUD-7.1: the observer

function observer(draw: SeededDraw, sound: boolean): Built {
  const header = draw.pick(['X-Total-Count', 'X-Result-Count'])
  const oc: ObserverCase = {
    kind: 'observer',
    fields: [
      { name: 'body', secret: false },
      { name: header, secret: !sound },
    ],
    observer: sound ? ['body', header] : ['body'],
    max: 2,
  }
  return {
    anchor: 'AUD-7.1',
    case: oc,
    intended: sound ? 'none' : 'G10',
    claim: `Tenant B's documents never change anything tenant A observes: checked with the observer ${sound ? `\`body\` and \`${header}\`` : '`body`'}.`,
    artifact: `A search by tenant A returns a response with two parts. Let a be the number of A's matching documents and s the number of B's.${code([`body           the a documents A may read`, `${header.padEnd(15)}${sound ? 'a, the number of documents in the body' : 'a + s, every match in the index'}`])}The claim's observer reads ${sound ? 'both parts' : 'the body only'}.`,
    why: sound
      ? 'The observer reads every part of the response, and no part depends on s: two states that differ only in B\'s documents look the same.'
      : `The \`${header}\` header counts B's documents too, and the observer ignores it: two states that differ only in s look the same to the observer and different to anyone who reads the header.`,
    ...(sound ? {} : { noneTag: 'dp:A16' as const, noneWhy: 'This takes "the observer sees only the response body" as fact. An attacker reads headers too.' }),
    level: 2,
    operator: sound ? 'none' : 'narrow the observer',
  }
}

// ---------------------------------------------------------------- AUD-4.3: a CTI answered by changing code

function cti(draw: SeededDraw, mode: 'code' | 'strengthen' | 'real-bug'): Built {
  const doms: Dom[] = [
    { v: 'x', lo: -2, hi: 6 },
    { v: 'y', lo: -2, hi: 2 },
  ]
  const k = draw.int(1, 2)
  const init = { x: 0, y: mode === 'real-bug' ? -1 : k }
  const property = R(V('x'), '>=', K(0))
  const cc: CtiCase = { kind: 'cti', doms, init, property, cti: { x: 0, y: -1 }, change: mode === 'strengthen' ? 'invariant' : 'code', strengthen: R(V('y'), '>=', K(0)) }
  const change = mode === 'strengthen' ? ['- invariant: x ≥ 0', '+ invariant: x ≥ 0 ∧ y ≥ 0', '  (the step is unchanged)'] : ['- step: x := x + y', '+ step: if y > 0 then x := x + y', '  (the invariant is unchanged)']
  return {
    anchor: 'AUD-4.3',
    case: cc,
    intended: mode === 'code' ? 'G13' : 'none',
    claim: mode === 'strengthen' ? 'x ≥ 0 was not inductive: the checker found the CTI x = 0, y = −1. Strengthened the invariant; now it is inductive.' : 'The checker found x = 0, y = −1 breaking x ≥ 0 after one step: a bug. Fixed the step.',
    artifact: `The system starts at x = ${init.x}, y = ${init.y}; each step sets x := x + y and leaves y alone. The property is x ≥ 0. The change:${code(change)}`,
    why:
      mode === 'code'
        ? `The pre-state x = 0, y = −1 is a counterexample to induction, not a reachable state: y starts at ${k} and never changes. The code was correct; strengthening the invariant with y ≥ 0 was the fix, and the change bent correct code to fit.`
        : mode === 'strengthen'
          ? 'The CTI is unreachable, and the change strengthens the invariant, which is then inductive and still excludes the CTI: the right response to a CTI.'
          : 'Here y starts at −1, so x goes negative on the first step: the state is reachable, the property really fails, and changing the code is the fix.',
    ...(mode === 'code' ? { noneTag: 'dp:O3' as const, noneWhy: 'This reads a counterexample to induction as a reachable bug. Nothing reaches x = 0, y = −1 from the start.' } : {}),
    level: 3,
    operator: mode === 'code' ? 'edit the code so that a proof goes through' : 'none',
  }
}

// ---------------------------------------------------------------- the templates' draws

export function buildT1(band: 1 | 2 | 3, draw: SeededDraw): Built {
  if (band === 1) return guardedQuery(draw, true, false)
  if (band === 2) return guardedTheorem(draw)
  return draw.bool() ? refund(draw, true) : blanket(draw)
}

export function buildT2(band: 1 | 2 | 3, draw: SeededDraw): Built {
  if (band === 1) return verdictLine(draw, draw.bool() ? 'budget' : 'unbounded')
  if (band === 2) return width(draw, false)
  return fairness(draw, false)
}

export function buildT3(band: 1 | 2 | 3, draw: SeededDraw): Built {
  if (band === 1) return idents(draw, false)
  if (band === 2) return observer(draw, false)
  return cti(draw, 'code')
}

/** Sound cases: the anchor's sound member (band 1), a harmless change (band 2), an earlier stage's sound case (band 3). */
export function buildT4(band: 1 | 2 | 3, draw: SeededDraw): Built {
  const pick = draw.below(4)
  if (band === 1) return { ...guardedQuery(draw, false, false), level: 0 }
  if (band === 2) {
    const b = pick === 0 ? guardedQuery(draw, false, true) : pick === 1 ? width(draw, true) : pick === 2 ? idents(draw, true) : observer(draw, true)
    return { ...b, level: 1 }
  }
  const b = pick === 0 ? refund(draw, false) : pick === 1 ? fairness(draw, true) : pick === 2 ? cti(draw, 'strengthen') : cti(draw, 'real-bug')
  return { ...b, level: 2 }
}
