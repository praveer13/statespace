// The Outbox model of S8.L2 and S8.L3, cut down to the one command c1 the lesson plays, with the crash allowed in one
// window at a time. Pure and small: the page steps it by hand, and searches every reachable state for the shortest
// trace to a second charge.
//
//   Commit    the command and its pending intent commit together
//   Dispatch  the worker sends attempt a with Key(c1, a); the intent goes inflight
//   Timeout   a timer returns an unanswered intent to pending (only with timers on)
//   Accept    the provider takes one request off the network, performs the effect unless it honors keys and has seen
//             this one, and replies
//   Receive   the worker buffers a reply in memory
//   Persist   the worker stores the result
//   Ack       the worker marks the intent done; it needs a stored result
//   Crash     the worker stops and loses its memory, only while c1 is in an allowed window, at most once
//   Recover   the worker restarts and returns an inflight intent without a stored result to pending
//
// Constants as the lesson sets them: Cmds = {c1}, MaxCrashes = 1, MaxAttempts = 3, Forgets = "never".

export type Window = 'CW1' | 'CW2' | 'CW3' | 'CW4'
export const WINDOWS: readonly Window[] = ['CW1', 'CW2', 'CW3', 'CW4']

export type Status = 'none' | 'pending' | 'inflight' | 'acked'

export interface Config {
  /** The one window a crash may land in, or null for no crash at all. */
  readonly window: Window | null
  /** The provider honors keys (Dedup). */
  readonly dedup: boolean
  /** A new key for every attempt (FreshKey) instead of one key for the intent. */
  readonly freshKey: boolean
  /** The worker's timer may return an unanswered intent to pending (Timeouts). */
  readonly timeouts: boolean
}

export const MAX_ATTEMPTS = 3
export const MAX_CRASHES = 1

export interface State {
  // your database: kept across a crash
  readonly committed: boolean
  readonly status: Status
  readonly durable: boolean
  readonly attempts: number
  // the worker's memory: emptied by a crash
  readonly got: boolean
  // the network: requests in flight (by attempt number) and the replies the provider sent (by attempt number)
  readonly reqs: readonly number[]
  readonly replies: readonly number[]
  // the provider
  readonly charges: number
  readonly seen: readonly number[]
  // the environment
  readonly up: boolean
  readonly crashes: number
}

export const INIT: State = {
  committed: false,
  status: 'none',
  durable: false,
  attempts: 0,
  got: false,
  reqs: [],
  replies: [],
  charges: 0,
  seen: [],
  up: true,
  crashes: 0,
}

export type Action =
  | { readonly kind: 'Commit' }
  | { readonly kind: 'Dispatch' }
  | { readonly kind: 'Timeout' }
  | { readonly kind: 'Accept'; readonly att: number }
  | { readonly kind: 'Receive' }
  | { readonly kind: 'Persist' }
  | { readonly kind: 'Ack' }
  | { readonly kind: 'Crash' }
  | { readonly kind: 'Recover' }

/** The key an attempt carries: the attempt's own when keys are fresh, the intent's (0) otherwise. */
export const keyOf = (cfg: Config, att: number): number => (cfg.freshKey ? att : 0)

/** The window c1 is in now, by the lesson's InWindow, or null when it is in none. */
export function windowOf(s: State): Window | null {
  if (!s.committed) return null
  if (s.status === 'pending') return 'CW1'
  if (s.status === 'inflight' && s.reqs.length > 0 && s.replies.length === 0) return 'CW2'
  if (s.replies.length > 0 && !s.durable) return 'CW3'
  if (s.durable && s.status === 'inflight') return 'CW4'
  return null
}

/** The lesson's InWindow(w, c1): one predicate per window. Two can hold at once (after a timeout and a late reply, CW1
 *  and CW3 both do), so the crash guard asks this, not windowOf. */
export function inWindow(w: Window, s: State): boolean {
  if (!s.committed) return false
  switch (w) {
    case 'CW1':
      return s.status === 'pending'
    case 'CW2':
      return s.status === 'inflight' && s.reqs.length > 0 && s.replies.length === 0
    case 'CW3':
      return s.replies.length > 0 && !s.durable
    case 'CW4':
      return s.durable && s.status === 'inflight'
  }
}

const add = (xs: readonly number[], x: number): number[] => (xs.includes(x) ? [...xs] : [...xs, x].sort((p, q) => p - q))

/** The action applied to the state when its guard holds, or null when it does not. */
export function step(cfg: Config, s: State, a: Action): State | null {
  switch (a.kind) {
    case 'Commit':
      return s.committed ? null : { ...s, committed: true, status: 'pending' }
    case 'Dispatch': {
      if (!s.up || s.status !== 'pending' || s.attempts >= MAX_ATTEMPTS) return null
      const att = s.attempts + 1
      return { ...s, attempts: att, reqs: add(s.reqs, att), status: 'inflight' }
    }
    case 'Timeout':
      return cfg.timeouts && s.up && s.status === 'inflight' && !s.got && !s.durable ? { ...s, status: 'pending' } : null
    case 'Accept': {
      if (!s.reqs.includes(a.att)) return null
      const key = keyOf(cfg, a.att)
      const dup = cfg.dedup && s.seen.includes(key)
      return {
        ...s,
        reqs: s.reqs.filter((r) => r !== a.att),
        replies: add(s.replies, a.att),
        charges: dup ? s.charges : s.charges + 1,
        seen: cfg.dedup ? add(s.seen, key) : s.seen,
      }
    }
    case 'Receive':
      return s.up && s.status === 'inflight' && !s.got && !s.durable && s.replies.length > 0 ? { ...s, got: true } : null
    case 'Persist':
      return s.up && s.got ? { ...s, durable: true, got: false } : null
    case 'Ack':
      return s.up && s.durable && s.status === 'inflight' ? { ...s, status: 'acked' } : null
    case 'Crash': {
      return s.up && s.crashes < MAX_CRASHES && cfg.window !== null && inWindow(cfg.window, s)
        ? { ...s, up: false, got: false, crashes: s.crashes + 1 }
        : null
    }
    case 'Recover':
      return s.up ? null : { ...s, up: true, status: s.status === 'inflight' && !s.durable ? 'pending' : s.status }
  }
}

/** Every action the page can offer in a state, in the lesson's order, enabled or not. */
export function actionsIn(cfg: Config, s: State): Action[] {
  const out: Action[] = [{ kind: 'Commit' }, { kind: 'Dispatch' }]
  if (cfg.timeouts) out.push({ kind: 'Timeout' })
  // One Accept per request in flight; with none in flight, one Accept the page shows as not enabled.
  if (s.reqs.length === 0) out.push({ kind: 'Accept', att: 0 })
  for (const att of s.reqs) out.push({ kind: 'Accept', att })
  out.push({ kind: 'Receive' }, { kind: 'Persist' }, { kind: 'Ack' })
  if (cfg.window !== null) out.push({ kind: 'Crash' }, { kind: 'Recover' })
  return out
}

export const enabled = (cfg: Config, s: State): Action[] => actionsIn(cfg, s).filter((a) => step(cfg, s, a) !== null)

export const actionName = (a: Action): string => (a.kind === 'Accept' && a.att > 0 ? `Accept attempt ${a.att}` : a.kind)

/** The lesson's way of writing a trace: action names only. */
export const traceText = (t: readonly Action[]): string => t.map((a) => a.kind).join(', ')

/** NoDoubleCharge, the invariant the scene's monitor watches. */
export const doubleCharged = (s: State): boolean => s.charges > 1

const keyOfState = (s: State): string => JSON.stringify(s)

export interface Search {
  /** The shortest trace from Init to a second charge, or null when no reachable state has one. */
  readonly trace: Action[] | null
  /** How many distinct states the search reached (all of them when it found none). */
  readonly states: number
}

/** Breadth-first over every reachable state of this configuration. The model is finite: attempts and crashes are capped. */
export function shortestDoubleCharge(cfg: Config, from: State = INIT): Search {
  const seen = new Map<string, { prev: string | null; via: Action | null }>()
  const start = keyOfState(from)
  seen.set(start, { prev: null, via: null })
  const queue: State[] = [from]
  while (queue.length > 0) {
    const s = queue.shift() as State
    const k = keyOfState(s)
    if (doubleCharged(s)) {
      const trace: Action[] = []
      let cur: string | null = k
      while (cur !== null) {
        const e = seen.get(cur)
        if (e === undefined || e.via === null) break
        trace.unshift(e.via)
        cur = e.prev
      }
      return { trace, states: seen.size }
    }
    // The provider's steps go last, so that among traces of one length the search prefers the one where the worker
    // acts first and the old copy arrives late, as the lesson tells it.
    const acts = enabled(cfg, s).sort((p, q) => Number(p.kind === 'Accept') - Number(q.kind === 'Accept'))
    for (const a of acts) {
      const t = step(cfg, s, a) as State
      const tk = keyOfState(t)
      if (seen.has(tk)) continue
      seen.set(tk, { prev: k, via: a })
      queue.push(t)
    }
  }
  return { trace: null, states: seen.size }
}

/** Apply a trace from Init, or null at the first step whose guard fails. */
export function run(cfg: Config, trace: readonly Action[]): State | null {
  let s: State | null = INIT
  for (const a of trace) {
    if (s === null) return null
    s = step(cfg, s, a)
  }
  return s
}
