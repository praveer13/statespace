// The edition's public content (docs/WORLD.md sections 2.1, 2.3 and 5): the edition seed, the fixed neutral names the
// standing world draws from, the world's commands in the roadmap's toy syntax, and the world's rules in plain English.
// Everything here is data; review reads it before any code (WORLD.md section 9.2).

/** Edition 1's public seed. It generates the standing world and never changes within an edition. [D] */
export const EDITION = 1
export const EDITION_SEED = 0x20261024

/**
 * Tenants and the names their user accounts may take. Acme and Birch are S07's reference tenants, so lesson examples
 * recur in the world; Cobalt is the third tenant [D]. No real companies or people (GATE-privacy).
 */
export const TENANT_NAMES: readonly { readonly tenant: string; readonly users: readonly string[] }[] = [
  { tenant: 'Acme', users: ['dana', 'frank', 'eli'] },
  { tenant: 'Birch', users: ['gia', 'hal', 'ivo'] },
  { tenant: 'Cobalt', users: ['jo', 'kai', 'lin'] },
]

/** The world's base commands (WORLD.md section 2.3). Each stays inside v0: one statement, a guard covering every debit. */
export const BASE_COMMANDS_TEXT = `command Transfer(from, to, amount) requires balance(from) >= amount do move amount from from to to.
command PlaceHold(owner, amount) requires balance(owner) >= amount do hold amount on owner.
command Capture(h: hold, to: account) do capture h to to.
command Release(h: hold) do release h.
command Refund(payee, payer, amount) requires balance(payee) >= amount do move amount from payee to payer.
`

/** Setup's one command: the grants from mint that give the opening balances, the only grants the world ever makes. */
export const SETUP_COMMAND_TEXT = 'command Grant(to: account, amount: amount) do deposit amount to to.'

export type RuleId = 'conserved' | 'nonneg' | 'hold-once' | 'setup-only'

export interface Rule {
  readonly id: RuleId
  readonly text: string
  /** The rule as the world pins it: a proposal that edits this text is caught by its statement hash (I7). */
  readonly pinned: string
}

/** The ledger phase's rules (WORLD.md section 2.1), checked at every step. */
export const RULES: readonly Rule[] = [
  { id: 'conserved', text: 'Credits are conserved: the total over all accounts, mint and sink included, is zero', pinned: 'rule Conserved: sum(balance(a) for every account a) = 0' },
  { id: 'nonneg', text: 'No account other than mint goes below zero', pinned: 'rule NoOverdraft: balance(a) >= 0 for every account a other than mint' },
  { id: 'hold-once', text: 'A hold resolves at most once', pinned: 'rule HoldOnce: a captured or released hold never changes again' },
  { id: 'setup-only', text: 'Credits enter only at setup: once the world is set up, no posting debits mint', pinned: 'rule SetupOnly: after setup, balance(mint) never falls' },
]

export const ruleById = (id: RuleId): Rule => RULES.find((r) => r.id === id) as Rule

/** Calls in a week's traffic [D], and the number of incidents in a week by default (spine section 3.0). */
export const CALLS_PER_WEEK = 24
export const DEFAULT_INCIDENTS = 2

/** The engines a week names, as engine@version (WORLD.md section 5). */
export const ENGINES = { interp: 'INS-interp', checker: 'the course checker (bounded search, in this tab)' } as const
