// The ledger phase's incident families (docs/WORLD.md sections 4.3–4.5), written as data first: each proposal family
// is a twin, a sound member and a flawed member with matched diffs, and the gap-class family names its event, its
// bar, its naive baseline and its reference. Keys are never written here. The reference pipeline (check.ts) computes
// each instance's key at grade time, and an instance whose key disagrees with its member is not admitted.

import { parseCommand } from '@statespace/interp'
import type { Cmd } from '@statespace/interp'
import type { RuleEdit } from './check.ts'

export interface Member {
  /** The proposed command, in the roadmap's toy syntax. */
  readonly command: string
  /** The diff against the world's command, in the toy syntax, and any pinned rule it touches. */
  readonly diff: readonly string[]
  readonly ruleEdit: RuleEdit | null
}

export interface ProposalFamily {
  readonly id: string
  /** The audit anchor whose class this family varies, for the event's ref (event@1: audit:AUD-n.k/<variant>). */
  readonly anchor: string
  readonly rev: string
  /** What the card names: a subject, never a class (WORLD.md section 6.2). */
  readonly subject: string
  readonly edits: string
  /** The agent's claim, the same for both members, so the claim alone does not cue the key. */
  readonly claim: string
  readonly sound: Member
  readonly flawed: Member
  /** The flawed member's kind of gap: the primary class and the acceptable set. */
  readonly primary: string
  readonly acceptable: readonly string[]
  /** The flawed member's load-bearing lines, as diff:N or claim:N. */
  readonly loadBearing: readonly string[]
  readonly why: string
  readonly kcs: readonly string[]
}

/** The agent's offered evidence, drawn independently of soundness from one phrase bank (WORLD.md section 4.2). */
export const OFFERED_EVIDENCE: readonly string[] = [
  'The checker admitted it: no rule fired on any run.',
  'Z3 says unsat on Inv ∧ Guard ∧ Step ∧ ¬Inv′.',
  'Every test in the suite is green.',
  'I ran it in the world on this week’s traffic; nothing broke.',
]

export const PROPOSALS: readonly ProposalFamily[] = [
  {
    id: 'refund-posting',
    anchor: 'AUD-4.2',
    rev: 'refund-posting@1',
    subject: 'a refund command',
    edits: 'Refund',
    claim: 'Refund keeps the invariant: the total over every account stays zero, and no account other than mint goes below zero.',
    sound: {
      command: 'command Refund(payee, payer, amount) requires balance(payee) >= amount do move amount from payee to payer.',
      diff: [
        'command Refund(payee, payer, amount)',
        '  requires balance(payee) >= amount',
        '- do move amount from payee to payer.',
        '+ do move amount from payee to payer. -- credits leave the payee',
      ],
      ruleEdit: null,
    },
    flawed: {
      command: 'command Refund(payee, payer, amount) requires balance(payee) >= amount do deposit amount to payer.',
      diff: [
        'command Refund(payee, payer, amount)',
        '  requires balance(payee) >= amount',
        '- do move amount from payee to payer.',
        '+ do deposit amount to payer.  -- one posting is simpler',
      ],
      ruleEdit: null,
    },
    primary: 'G1',
    acceptable: ['G1'],
    loadBearing: ['diff:4', 'claim:1'],
    why: 'A deposit debits mint, which may go negative, so the invariant still holds while credits enter after setup. The claim states the invariant, which is too weak for the world’s rules.',
    kcs: ['KC-4.vc-shape'],
  },
  {
    id: 'transfer-guard',
    anchor: 'AUD-1.1',
    rev: 'transfer-guard@1',
    subject: 'Transfer’s guard',
    edits: 'Transfer',
    claim: 'With the new guard, Transfer never overdraws an account: the checker found no run that leaves an account below zero.',
    sound: {
      command: 'command Transfer(from, to, amount) requires balance(from) >= amount && !frozen(from) do move amount from from to to.',
      diff: [
        'command Transfer(from, to, amount)',
        '- requires balance(from) >= amount',
        '+ requires balance(from) >= amount && !frozen(from)',
        '  do move amount from from to to.',
      ],
      ruleEdit: null,
    },
    flawed: {
      command: 'command Transfer(from, to, amount) requires balance(from) >= amount && amount >= balance(from) + 1 do move amount from from to to.',
      diff: [
        'command Transfer(from, to, amount)',
        '- requires balance(from) >= amount',
        '+ requires balance(from) >= amount && amount >= balance(from) + 1',
        '  do move amount from from to to.',
      ],
      ruleEdit: null,
    },
    primary: 'G2',
    acceptable: ['G2'],
    loadBearing: ['diff:3'],
    why: 'The two conjuncts of the new guard contradict each other, so no state passes it: Transfer never runs, and "never overdraws" holds vacuously.',
    kcs: ['KC-1.non-vacuity-check'],
  },
  {
    id: 'hold-rule',
    anchor: 'AUD-2.4',
    rev: 'hold-rule@1',
    subject: 'holds on frozen accounts',
    edits: 'PlaceHold',
    claim: 'PlaceHold now refuses frozen owners, and every world rule still holds: the checker found no rule that fires.',
    sound: {
      command: 'command PlaceHold(owner, amount) requires balance(owner) >= amount && !frozen(owner) do hold amount on owner.',
      diff: [
        '- requires balance(owner) >= amount',
        '+ requires balance(owner) >= amount && !frozen(owner)',
        '  rule NoOverdraft: balance(a) >= 0 for every account a other than mint',
      ],
      ruleEdit: { rule: 'nonneg', text: 'rule NoOverdraft: balance(a) >= 0 for every account a other than mint' },
    },
    flawed: {
      command: 'command PlaceHold(owner, amount) requires balance(owner) >= amount && !frozen(owner) do hold amount on owner.',
      diff: [
        '- requires balance(owner) >= amount',
        '+ requires balance(owner) >= amount && !frozen(owner)',
        '+ rule NoOverdraft: balance(a) >= 0 for every user account a',
      ],
      ruleEdit: { rule: 'nonneg', text: 'rule NoOverdraft: balance(a) >= 0 for every user account a' },
    },
    primary: 'G8',
    acceptable: ['G8'],
    loadBearing: ['diff:3'],
    why: 'The change also edits the rule its own check runs against: the pinned rule covers every account but mint, escrow included, and the edited one covers user accounts only. The check is about a different rule.',
    kcs: ['KC-2.statement-pinning'],
  },
]

/** The gap-class family of edition 1 that the tab can run: a batch of proposed commands through the checker. */
export interface GapFamily {
  readonly id: string
  readonly anchor: string
  readonly rev: string
  readonly subject: string
  readonly event: string
  readonly bar: string
  /** A course-authored claim about the component under the event: quoted, never stamped (I8). */
  readonly claim: string
  /** The component's diff against the reference: the reference rewritten without changing meaning, or the naive mutant. */
  readonly soundDiff: readonly string[]
  readonly flawedDiff: readonly string[]
  readonly primary: string
  readonly acceptable: readonly string[]
  readonly loadBearing: readonly string[]
  readonly why: string
  readonly kcs: readonly string[]
}

export const GATE_BATCH: GapFamily = {
  id: 'gate-batch',
  anchor: 'AUD-4.1',
  rev: 'gate-batch@1',
  subject: 'a batch of proposed commands at the checker',
  event: 'Three proposed commands arrive at the checker together.',
  bar: 'No command whose guard never holds is admitted, and every admitted command has a premise witness, over the runs printed.',
  claim: 'The checker admitted only commands that keep every world rule, and each command it admitted can actually run.',
  soundDiff: ['  if (fired) return refute(witness)', '- if (guardHeld === 0) return vacuous()', '+ if (!(guardHeld > 0)) return vacuous()', '  return admit()'],
  flawedDiff: ['  if (fired) return refute(witness)', '- if (guardHeld === 0) return vacuous()', '+ // a quiet run is enough to admit', '  return admit()'],
  primary: 'G2',
  acceptable: ['G2'],
  loadBearing: ['diff:3'],
  why: 'The checker shown never asks whether a command’s guard can hold, so a command that can never run stays quiet on every run and is admitted. A quiet run says nothing about whether the command can run at all.',
  kcs: ['KC-1.non-vacuity-check', 'KC-4.vc-shape'],
}

/** The batch the gate-batch event sends: the transfer-guard twins and the sound refund, in a seeded order. */
export const GATE_BATCH_COMMANDS: readonly string[] = [
  (PROPOSALS[1] as ProposalFamily).sound.command,
  (PROPOSALS[1] as ProposalFamily).flawed.command,
  (PROPOSALS[0] as ProposalFamily).sound.command,
]

export const parse = (text: string): Cmd => parseCommand(text)
