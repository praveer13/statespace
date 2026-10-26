// The standing world and its weeks (docs/WORLD.md sections 2.1–2.3 and 5). INS-interp computes the canonical history:
// setup grants from mint give the opening balances, then each week's traffic runs call by call, whole, one after
// another, and week k starts from week k−1's canonical end state. The world's rules are evaluated at every step; a rule
// reports an observation, never a stamp. Nothing here reads a clock or the entropy pool: every draw comes from a seed
// passed in (I3), keyed by purpose so that adding a stream never shifts another (WORLD.md section 5, rule 2).

import { canonical, execTraced, parseCommand, parseProgram, REFERENCE_POLICY } from '@statespace/interp'
import type { Acct, Call, Cmd, Outcome, Program, State, Val } from '@statespace/interp'
import { sha256Hex } from '@statespace/ledger'
import { createDraw, deriveSeed } from '@statespace/rng'
import type { SeededDraw } from '@statespace/rng'
import { BASE_COMMANDS_TEXT, CALLS_PER_WEEK, EDITION_SEED, SETUP_COMMAND_TEXT, TENANT_NAMES } from './edition.ts'
import type { RuleId } from './edition.ts'

export interface Tenant {
  readonly name: string
  readonly users: readonly string[]
}

export interface Standing {
  readonly tenants: readonly Tenant[]
  /** The setup grants, in order: the only grants the world ever makes. */
  readonly grants: readonly { readonly user: string; readonly amount: bigint }[]
  /** The canonical state once setup is done: week 1 starts here. */
  readonly state: State
  readonly hash: string
}

// ------------------------------------------------------------------------------------------------ small helpers

export const user = (name: string): Acct => ({ tag: 'user', name })
export const acctVal = (a: Acct): Val => ({ tag: 'acct', acct: a })
export const intVal = (n: bigint): Val => ({ tag: 'int', value: n.toString() })
export const holdVal = (h: number): Val => ({ tag: 'hold', hold: h })

export const acctName = (a: Acct): string => (a.tag === 'user' ? a.name : a.tag === 'escrow' ? `escrow ${a.hold}` : a.tag)

export function balanceOf(s: State, a: Acct): bigint {
  const key = canonical(a)
  const b = s.bals.find((x) => canonical(x.acct) === key)
  return b === undefined ? 0n : BigInt(b.bal)
}

export const stateHash = (s: State): string => sha256Hex(canonical(s))

export function valText(v: Val): string {
  switch (v.tag) {
    case 'acct':
      return acctName(v.acct)
    case 'int':
      return v.value
    case 'bool':
      return String(v.value)
    case 'hold':
      return `hold ${v.hold}`
  }
}

export const callText = (c: Call): string => `${c.name}(${c.args.map(valText).join(', ')})`

export function outcomeText(o: Outcome): string {
  if ('ok' in o) return 'ok'
  const e = o.error
  switch (e.tag) {
    case 'guardFailed':
      return 'refused by the guard'
    case 'badArgument':
      return `bad argument: ${e.param}`
    case 'unknownAccount':
      return `unknown account ${acctName(e.acct)}`
    case 'unknownHold':
      return `unknown hold ${e.hold}`
    case 'holdNotOpen':
      return `hold ${e.hold} is not open`
    case 'overflow':
      return `overflow at ${acctName(e.acct)}`
    default:
      return e.tag
  }
}

// ------------------------------------------------------------------------------------------------ the programs

export const BASE_PROGRAM: Program = { id: 'clearinghouse-base', ...parseProgram(BASE_COMMANDS_TEXT) }
const SETUP_PROGRAM: Program = { id: 'clearinghouse-setup', commands: [parseCommand(SETUP_COMMAND_TEXT)] }

/** The base program with each replacement standing in for the command of its name (or added, if new). */
export function withCommands(base: Program, replacements: readonly Cmd[]): Program {
  let commands = [...base.commands]
  for (const r of replacements) {
    const i = commands.findIndex((c) => c.name === r.name)
    if (i < 0) commands = [...commands, r]
    else commands = commands.map((c, j) => (j === i ? r : c))
  }
  return { id: base.id, commands }
}

// ------------------------------------------------------------------------------------------------ the rules

/** The rules a step breaks, from the state before it and the state after it (WORLD.md section 2.1). */
export function rulesFired(before: State, after: State): RuleId[] {
  const out: RuleId[] = []
  const total = after.bals.reduce((t, b) => t + BigInt(b.bal), 0n)
  if (total !== 0n) out.push('conserved')
  if (after.bals.some((b) => b.acct.tag !== 'mint' && BigInt(b.bal) < 0n)) out.push('nonneg')
  const was = new Map(before.holds.map((h) => [h.id, h.status]))
  if (after.holds.some((h) => (was.get(h.id) ?? 'held') !== 'held' && was.get(h.id) !== h.status)) out.push('hold-once')
  if (balanceOf(after, { tag: 'mint' }) < balanceOf(before, { tag: 'mint' })) out.push('setup-only')
  return out
}

// ------------------------------------------------------------------------------------------------ the standing world

/** The standing world from the edition seed: tenants, their user accounts, and the setup grants. */
export function standingWorld(editionSeed: number = EDITION_SEED): Standing {
  const d = createDraw(deriveSeed(editionSeed, 'standing'))
  const tenants: Tenant[] = TENANT_NAMES.map((t) => ({ name: t.tenant, users: t.users.slice(0, 2 + d.below(2)) }))
  const users = tenants.flatMap((t) => t.users)
  let state: State = { bals: [{ acct: { tag: 'mint' }, bal: '0' }, { acct: { tag: 'sink' }, bal: '0' }, ...users.map((u) => ({ acct: user(u), bal: '0' }))], holds: [], nextHold: 0, frozen: [] }
  const grants: { user: string; amount: bigint }[] = []
  for (const u of users) {
    const amount = BigInt(40 + 10 * d.below(17))
    const r = execTraced(REFERENCE_POLICY, SETUP_PROGRAM, { name: 'Grant', args: [acctVal(user(u)), intVal(amount)] }, state)
    if (!('ok' in r.outcome)) throw new Error(`setup grant to ${u} failed: ${outcomeText(r.outcome)}`)
    state = r.outcome.ok.state
    grants.push({ user: u, amount })
  }
  return { tenants, grants, state, hash: stateHash(state) }
}

export const tenantOf = (w: Standing, name: string): string | undefined => w.tenants.find((t) => t.users.includes(name))?.name

// ------------------------------------------------------------------------------------------------ a week's traffic

export interface Step {
  readonly i: number
  readonly tenant: string
  readonly call: Call
  readonly text: string
  /** Edge cases S3.L7 turned into decisions, mixed in on purpose (WORLD.md section 2.3). */
  readonly edge?: 'zero' | 'self' | 'overdraw' | 'unknown account'
  readonly outcome: string
  readonly ok: boolean
  readonly effects: readonly string[]
  readonly fired: readonly RuleId[]
  readonly before: State
  readonly after: State
}

type Kind = 'transfer' | 'hold' | 'capture' | 'release' | 'refund' | 'edge'

const amountUpTo = (d: SeededDraw, bal: bigint): bigint => {
  const steps = bal >= 10n ? Number(bal / 5n) : 1
  return 5n * BigInt(1 + d.below(Math.max(1, Math.min(steps, 40))))
}

/** One call drawn against the current state (the draw depends on the state, deterministically). */
function drawCall(d: SeededDraw, w: Standing, s: State): { tenant: string; call: Call; edge?: Step['edge'] } {
  const kind = d.weighted<Kind>([
    ['transfer', 9],
    ['hold', 3],
    ['capture', 2],
    ['release', 2],
    ['refund', 2],
    ['edge', 4],
  ])
  const t = d.pick(w.tenants)
  const [a, b] = d.sample(t.users, 2) as [string, string]
  const other = d.chance(1, 10) ? d.pick(w.tenants.flatMap((x) => x.users).filter((u) => u !== a)) : b
  const open = s.holds.filter((h) => h.status === 'held')
  switch (kind) {
    case 'transfer':
      return { tenant: t.name, call: { name: 'Transfer', args: [acctVal(user(a)), acctVal(user(other)), intVal(amountUpTo(d, balanceOf(s, user(a))))] } }
    case 'hold':
      return { tenant: t.name, call: { name: 'PlaceHold', args: [acctVal(user(a)), intVal(amountUpTo(d, balanceOf(s, user(a))) )] } }
    case 'capture':
    case 'release': {
      if (open.length === 0) return { tenant: t.name, call: { name: 'PlaceHold', args: [acctVal(user(a)), intVal(amountUpTo(d, balanceOf(s, user(a))))] } }
      const h = d.pick(open)
      const owner = acctName(h.owner)
      const tenant = tenantOf(w, owner) ?? t.name
      const payee = d.pick((w.tenants.find((x) => x.name === tenant)?.users ?? [owner]).filter((u) => u !== owner).concat(kind === 'capture' ? ['sink'] : []))
      return kind === 'capture'
        ? { tenant, call: { name: 'Capture', args: [holdVal(h.id), acctVal(payee === 'sink' ? { tag: 'sink' } : user(payee))] } }
        : { tenant, call: { name: 'Release', args: [holdVal(h.id)] } }
    }
    case 'refund':
      return { tenant: t.name, call: { name: 'Refund', args: [acctVal(user(a)), acctVal(user(b)), intVal(amountUpTo(d, balanceOf(s, user(a))))] } }
    case 'edge': {
      const e = d.pick(['zero', 'self', 'overdraw', 'unknown account'] as const)
      const bal = balanceOf(s, user(a))
      if (e === 'zero') return { tenant: t.name, edge: e, call: { name: 'Transfer', args: [acctVal(user(a)), acctVal(user(b)), intVal(0n)] } }
      if (e === 'self') return { tenant: t.name, edge: e, call: { name: 'Transfer', args: [acctVal(user(a)), acctVal(user(a)), intVal(5n)] } }
      if (e === 'overdraw') return { tenant: t.name, edge: e, call: { name: 'Transfer', args: [acctVal(user(a)), acctVal(user(b)), intVal(bal + 10n)] } }
      return { tenant: t.name, edge: e, call: { name: 'Transfer', args: [acctVal(user(a)), acctVal(user('zed')), intVal(5n)] } }
    }
  }
}

function effectsOf(o: Outcome): string[] {
  if (!('ok' in o)) return []
  return [...o.ok.output.map((h) => `opened hold ${h}`), ...o.ok.effects.map((e) => `notify ${acctName(e.acct)}`)]
}

/** Run one call on the canon: the step's outcome, its effects and the rules it fires. */
export function runCall(program: Program, s: State, call: Call): { outcome: Outcome; after: State; fired: RuleId[] } {
  const r = execTraced(REFERENCE_POLICY, program, call, s)
  const after = 'ok' in r.outcome ? r.outcome.ok.state : s
  return { outcome: r.outcome, after, fired: rulesFired(s, after) }
}

export interface WeekRun {
  readonly k: number
  readonly seed: number
  readonly program: Program
  readonly start: State
  readonly startHash: string
  readonly steps: readonly Step[]
  readonly end: State
  readonly endHash: string
}

/** Week k's traffic on its program from its canonical start state (WORLD.md section 2.3, "Traffic"). */
export function runWeekTraffic(w: Standing, k: number, seed: number, program: Program, start: State, calls: number = CALLS_PER_WEEK): WeekRun {
  const d = createDraw(deriveSeed(seed, 'traffic'))
  let s = start
  const steps: Step[] = []
  for (let i = 1; i <= calls; i++) {
    const { tenant, call, edge } = drawCall(d, w, s)
    const r = runCall(program, s, call)
    steps.push({ i, tenant, call, text: callText(call), ...(edge === undefined ? {} : { edge }), outcome: outcomeText(r.outcome), ok: 'ok' in r.outcome, effects: effectsOf(r.outcome), fired: r.fired, before: s, after: r.after })
    s = r.after
  }
  return { k, seed, program, start, startHash: stateHash(start), steps, end: s, endHash: stateHash(s) }
}
