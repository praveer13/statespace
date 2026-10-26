// The course's checker in the tab: a bounded search, not a solver. For one proposed command it runs every argument
// combination drawn from a fixed grid over a sample of the week's canonical states through INS-interp, and reports
// the first step at which a world rule fires (a witness that replays), or that no rule fired over n runs. Before it
// admits a command whose rules stayed quiet, it asks for a premise witness: a run whose guard held. A command whose
// guard never holds is reported as vacuous, never admitted (KC-1.non-vacuity-check). A proposal that edits a pinned
// rule is caught by the rule's statement hash before anything runs (I7).
//
// The naive baseline is a seeded mutant of this module: the premise check dropped (vacuity-blind, SP-4.4's class).
// The gate-batch family is proven against the pair: the naive version misses its bar and the reference meets it.
//
// Its results are [T] at most: n runs over a sample, never a proof (spine section 8.8).

import { sha256Hex } from '@statespace/ledger'
import type { Cmd, Program, State, Val } from '@statespace/interp'
import { RULES } from './edition.ts'
import type { RuleId } from './edition.ts'
import { acctVal, callText, holdVal, intVal, runCall, user, withCommands } from './world.ts'
import type { Standing, WeekRun } from './world.ts'

export const AMOUNT_GRID: readonly bigint[] = [1n, 5n, 25n, 100n, 250n]

export interface Witness {
  readonly state: string
  readonly call: string
  readonly rule: RuleId
  /** The step's postings, as balances before and after for the accounts it changed. */
  readonly changes: readonly { readonly acct: string; readonly before: string; readonly after: string }[]
}

export type Verdict = 'admit' | 'refute' | 'vacuous' | 'statement-changed'

export interface CheckResult {
  readonly command: string
  readonly verdict: Verdict
  /** Runs tried: argument combinations × sampled states. */
  readonly runs: number
  readonly states: number
  /** Runs whose guard held (a premise witness exists when this is above 0). The naive version never reports it. */
  readonly guardHeld: number | null
  readonly witness: Witness | null
  /** For a statement change: the pinned rule's hash and the edited one's, first 8 hex digits. */
  readonly hashes?: { readonly pinned: string; readonly edited: string }
}

export interface RuleEdit {
  readonly rule: RuleId
  readonly text: string
}

/** The states the check samples: the week's start, every sixth step's state, and its end. */
export function sampleStates(week: WeekRun): { label: string; state: State }[] {
  const out: { label: string; state: State }[] = [{ label: 'the week’s start', state: week.start }]
  for (const s of week.steps) if (s.i % 6 === 0 && s.i < week.steps.length) out.push({ label: `after step ${s.i}`, state: s.after })
  out.push({ label: 'the week’s end', state: week.end })
  return out
}

function argGrid(cmd: Cmd, w: Standing, s: State): Val[][] {
  const users = w.tenants.flatMap((t) => t.users)
  const holds = s.holds.map((h) => h.id)
  const per = cmd.params.map((p): Val[] => {
    if (p.ty === 'account') return users.map((u) => acctVal(user(u)))
    if (p.ty === 'amount' || p.ty === 'int') return AMOUNT_GRID.map(intVal)
    if (p.ty === 'hold') return holds.length > 0 ? holds.map(holdVal) : [holdVal(0)]
    return [{ tag: 'bool', value: true }]
  })
  let combos: Val[][] = [[]]
  for (const vals of per) combos = combos.flatMap((c) => vals.map((v) => [...c, v]))
  return combos
}

const short = (text: string): string => sha256Hex(text).slice(0, 8)

/**
 * Check one proposed command against the world's rules over the week's sample. `premise` false is the naive mutant:
 * it admits whatever stays quiet, guard or no guard.
 */
export function checkCommand(w: Standing, week: WeekRun, cmd: Cmd, edit: RuleEdit | null, opts: { readonly premise: boolean } = { premise: true }): CheckResult {
  if (edit !== null) {
    const pinned = RULES.find((r) => r.id === edit.rule)?.pinned ?? ''
    if (pinned !== edit.text) {
      return { command: cmd.name, verdict: 'statement-changed', runs: 0, states: 0, guardHeld: null, witness: null, hashes: { pinned: short(pinned), edited: short(edit.text) } }
    }
  }
  const program: Program = withCommands(week.program, [cmd])
  const states = sampleStates(week)
  let runs = 0
  let held = 0
  for (const { label, state } of states) {
    for (const args of argGrid(cmd, w, state)) {
      runs++
      const call = { name: cmd.name, args }
      const r = runCall(program, state, call)
      const refused = !('ok' in r.outcome) && r.outcome.error.tag === 'guardFailed'
      if (!refused) held++
      if (r.fired.length > 0) {
        const changes = r.after.bals
          .map((b) => {
            const was = state.bals.find((x) => JSON.stringify(x.acct) === JSON.stringify(b.acct))?.bal ?? '0'
            return { acct: b.acct.tag === 'user' ? b.acct.name : b.acct.tag === 'escrow' ? `escrow ${b.acct.hold}` : b.acct.tag, before: was, after: b.bal }
          })
          .filter((c) => c.before !== c.after)
        return { command: cmd.name, verdict: 'refute', runs, states: states.length, guardHeld: opts.premise ? held : null, witness: { state: label, call: callText(call), rule: r.fired[0] as RuleId, changes } }
      }
    }
  }
  if (opts.premise && held === 0) return { command: cmd.name, verdict: 'vacuous', runs, states: states.length, guardHeld: 0, witness: null }
  return { command: cmd.name, verdict: 'admit', runs, states: states.length, guardHeld: opts.premise ? held : null, witness: null }
}
