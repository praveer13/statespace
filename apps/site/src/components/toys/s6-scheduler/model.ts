// "You are the scheduler" for S6.L6: two sessions run one of the lesson's four compilations of a debit at one of the
// three isolation levels, and the learner chooses which session takes its next step. Pure and small: a toy model of
// the PostgreSQL rules the lesson names, not PostgreSQL.
//
//   - Snapshots. READ COMMITTED takes a fresh snapshot for every statement; REPEATABLE READ and SERIALIZABLE take one
//     at the transaction's first statement and keep it.
//   - Row locks. An UPDATE locks the row it changes; a second UPDATE of that row waits until the first transaction
//     ends. Two sessions each waiting on the other is a deadlock, and the one that started waiting first is aborted
//     (its deadlock check runs first; in the lesson's recorded run that was txn A).
//   - The READ COMMITTED re-check. When the wait ends in a commit, the waiting statement re-evaluates its WHERE clause
//     on the row version the other transaction left.
//   - First updater wins. Under REPEATABLE READ and SERIALIZABLE, an UPDATE that meets a row changed by a transaction
//     that committed after its snapshot fails with a serialization failure.
//   - The read-write cycle. Under SERIALIZABLE, a transaction that read something the other wrote (and could not see)
//     while the other read something it wrote is half of a cycle; when the other has committed, the database aborts
//     this one, at its write or at its COMMIT.
//
// The four compilations, each from S6.L6, each session debiting (or holding, or moving) the lesson's amounts:
//   rmw       SELECT bal; the application checks bal >= 80 and writes the constant bal - 80; COMMIT
//   cond      UPDATE acct SET bal = bal - 80 WHERE id = 1 AND bal >= 80; COMMIT
//   holds     read bal - sum(holds); the application checks it is >= 80 and inserts a hold of 80; COMMIT
//   opposite  txn A moves 10 from account 1 to 2, txn B from 2 to 1, each debiting its own account first

export type Level = 'rc' | 'rr' | 'ser'
export type Pattern = 'rmw' | 'cond' | 'holds' | 'opposite'
export type Sid = 'A' | 'B'

export const SIDS: readonly Sid[] = ['A', 'B']
export const other = (s: Sid): Sid => (s === 'A' ? 'B' : 'A')

export const LEVEL_NAME: Record<Level, string> = {
  rc: 'READ COMMITTED',
  rr: 'REPEATABLE READ',
  ser: 'SERIALIZABLE',
}

export const PATTERN_NAME: Record<Pattern, string> = {
  rmw: 'read-modify-write',
  cond: 'conditional UPDATE',
  holds: 'predicate read, then insert (holds)',
  opposite: 'opposite-order moves',
}

/** What each account holds before either session starts. */
export const START_BALANCE = 100

export type Step =
  /** rmw: SELECT bal FROM acct WHERE id = row */
  | { readonly k: 'read'; readonly row: number }
  /** rmw: the application checks its read against amt and writes the constant read - amt */
  | { readonly k: 'set'; readonly row: number; readonly amt: number }
  /** UPDATE acct SET bal = bal - amt WHERE id = row AND bal >= amt */
  | { readonly k: 'debit'; readonly row: number; readonly amt: number }
  /** UPDATE acct SET bal = bal + amt WHERE id = row */
  | { readonly k: 'credit'; readonly row: number; readonly amt: number }
  /** holds: SELECT bal - coalesce(sum(amt), 0) for account 1 */
  | { readonly k: 'avail' }
  /** holds: the application checks its read against amt and inserts a hold of amt */
  | { readonly k: 'hold'; readonly amt: number }
  | { readonly k: 'commit' }

export function program(p: Pattern, s: Sid): readonly Step[] {
  switch (p) {
    case 'rmw':
      return [{ k: 'read', row: 1 }, { k: 'set', row: 1, amt: 80 }, { k: 'commit' }]
    case 'cond':
      return [{ k: 'debit', row: 1, amt: 80 }, { k: 'commit' }]
    case 'holds':
      return [{ k: 'avail' }, { k: 'hold', amt: 80 }, { k: 'commit' }]
    case 'opposite': {
      const [from, to] = s === 'A' ? [1, 2] : [2, 1]
      return [{ k: 'debit', row: from, amt: 10 }, { k: 'credit', row: to, amt: 10 }, { k: 'commit' }]
    }
  }
}

/** The step as SQL, given what the session has read so far (the rmw write and the hold depend on it). */
export function sql(st: Step, read: number | null): string {
  switch (st.k) {
    case 'read':
      return `SELECT bal FROM acct WHERE id = ${st.row}`
    case 'set':
      return read === null
        ? `UPDATE acct SET bal = (its read − ${st.amt}) WHERE id = ${st.row}`
        : read >= st.amt
          ? `UPDATE acct SET bal = ${read - st.amt} WHERE id = ${st.row}`
          : `check ${read} >= ${st.amt}, then UPDATE`
    case 'debit':
      return `UPDATE acct SET bal = bal - ${st.amt} WHERE id = ${st.row} AND bal >= ${st.amt}`
    case 'credit':
      return `UPDATE acct SET bal = bal + ${st.amt} WHERE id = ${st.row}`
    case 'avail':
      return 'SELECT bal - sum(holds.amt) for account 1'
    case 'hold':
      return read === null || read >= st.amt ? `INSERT INTO holds VALUES (1, ${st.amt})` : `check ${read} >= ${st.amt}, then INSERT`
    case 'commit':
      return 'COMMIT'
  }
}

export type End =
  | { readonly kind: 'commit' }
  /** The guard refused: the application's check failed, or the conditional UPDATE matched 0 rows. */
  | { readonly kind: 'refused' }
  | { readonly kind: 'serialization'; readonly at: 'write' | 'commit'; readonly why: 'row' | 'cycle' }
  | { readonly kind: 'deadlock' }

export type Status = 'ready' | 'waiting' | 'done'

export interface Sess {
  readonly pc: number
  readonly status: Status
  readonly end: End | null
  /** The commit sequence number the session's snapshot sees up to; null before its first statement. */
  readonly snap: number | null
  /** Uncommitted row writes, row → value. */
  readonly writes: Readonly<Record<number, number>>
  /** Uncommitted holds. */
  readonly holds: readonly number[]
  readonly locks: readonly number[]
  /** The last value the session read (rmw's balance, the holds' available amount). */
  readonly read: number | null
  /** What the session read and wrote, for the read-write cycle: 'r1', 'r2', 'holds'. */
  readonly reads: readonly string[]
  readonly wrote: readonly string[]
  readonly waitOn: Sid | null
  readonly waitSince: number
  readonly commitSeq: number | null
  /** The conditional UPDATE matched no row. */
  readonly zero: boolean
  /** What a commit made take effect: the amount debited or held (0 when nothing). */
  readonly effect: number
}

export interface Version {
  readonly val: number
  readonly seq: number
}

export type EventKind = 'stmt' | 'zero' | 'wait' | 'refuse' | 'commit' | 'abort'

export interface Event {
  readonly t: number
  readonly sid: Sid
  readonly kind: EventKind
  /** The step, as SQL. */
  readonly what: string
  /** What happened, in words. */
  readonly text: string
}

export interface World {
  readonly pattern: Pattern
  readonly level: Level
  readonly seq: number
  readonly tick: number
  readonly rows: Readonly<Record<number, readonly Version[]>>
  readonly holds: readonly { readonly amt: number; readonly seq: number }[]
  readonly s: Readonly<Record<Sid, Sess>>
  readonly log: readonly Event[]
  /** The sessions the learner chose, in order. */
  readonly schedule: readonly Sid[]
}

const fresh = (): Sess => ({
  pc: 0,
  status: 'ready',
  end: null,
  snap: null,
  writes: {},
  holds: [],
  locks: [],
  read: null,
  reads: [],
  wrote: [],
  waitOn: null,
  waitSince: 0,
  commitSeq: null,
  zero: false,
  effect: 0,
})

export function start(pattern: Pattern, level: Level): World {
  const rows: Record<number, Version[]> = { 1: [{ val: START_BALANCE, seq: 0 }] }
  if (pattern === 'opposite') rows[2] = [{ val: START_BALANCE, seq: 0 }]
  return { pattern, level, seq: 0, tick: 0, rows, holds: [], s: { A: fresh(), B: fresh() }, log: [], schedule: [] }
}

// ------------------------------------------------------------------ a mutable working copy, so the rules read plainly

interface MSess {
  pc: number
  status: Status
  end: End | null
  snap: number | null
  writes: Record<number, number>
  holds: number[]
  locks: number[]
  read: number | null
  reads: string[]
  wrote: string[]
  waitOn: Sid | null
  waitSince: number
  commitSeq: number | null
  zero: boolean
  effect: number
}

interface M {
  pattern: Pattern
  level: Level
  seq: number
  tick: number
  rows: Record<number, Version[]>
  holds: { amt: number; seq: number }[]
  s: Record<Sid, MSess>
  log: Event[]
  schedule: Sid[]
}

const thaw = (w: World): M => JSON.parse(JSON.stringify(w)) as M

const latest = (m: M, row: number): Version => {
  const vs = m.rows[row] ?? []
  return vs[vs.length - 1] as Version
}

/** The row's value as the session sees it: its own write, else the newest version its snapshot includes. */
function visible(m: M, sid: Sid, row: number): number {
  const me = m.s[sid]
  const own = me.writes[row]
  if (own !== undefined) return own
  const snap = me.snap ?? m.seq
  const vs = (m.rows[row] ?? []).filter((v) => v.seq <= snap)
  return (vs[vs.length - 1] as Version).val
}

function visibleHolds(m: M, sid: Sid): number {
  const me = m.s[sid]
  const snap = me.snap ?? m.seq
  return m.holds.filter((h) => h.seq <= snap).reduce((n, h) => n + h.amt, 0) + me.holds.reduce((n, h) => n + h, 0)
}

const add = <T,>(xs: T[], x: T): void => {
  if (!xs.includes(x)) xs.push(x)
}

/** t read something u wrote, and u's write was not visible to t: half of a read-write cycle. */
function rw(m: M, t: Sid, u: Sid): boolean {
  const T = m.s[t]
  const U = m.s[u]
  if (U.end?.kind === 'serialization' || U.end?.kind === 'deadlock') return false
  const hidden = U.commitSeq === null || T.snap === null || U.commitSeq > T.snap
  return hidden && T.reads.some((x) => U.wrote.includes(x))
}

const cycleWithCommitted = (m: M, sid: Sid): boolean => {
  const o = other(sid)
  return m.level === 'ser' && m.s[o].end?.kind === 'commit' && rw(m, sid, o) && rw(m, o, sid)
}

function log(m: M, sid: Sid, kind: EventKind, what: string, text: string): void {
  m.log.push({ t: m.tick, sid, kind, what, text })
}

function end(m: M, sid: Sid, e: End, what: string, text: string): void {
  const me = m.s[sid]
  me.status = 'done'
  me.end = e
  me.writes = {}
  me.holds = []
  me.locks = []
  me.waitOn = null
  log(m, sid, e.kind === 'refused' ? 'refuse' : 'abort', what, text)
  wake(m, sid)
}

/** The other session was waiting on sid's row lock, and sid has ended: its statement runs now. */
function wake(m: M, ended: Sid): void {
  const o = other(ended)
  const O = m.s[o]
  if (O.status !== 'waiting' || O.waitOn !== ended) return
  O.status = 'ready'
  O.waitOn = null
  attempt(m, o, true)
}

const fmt = (n: number): string => (n < 0 ? `−${-n}` : String(n))

/** Run an UPDATE that holds no conflicting lock (or whose wait just ended). */
function attempt(m: M, sid: Sid, woke: boolean): void {
  const me = m.s[sid]
  const st = program(m.pattern, sid)[me.pc] as Step
  if (st.k !== 'set' && st.k !== 'debit' && st.k !== 'credit') return
  const what = sql(st, me.read)
  if (m.level === 'rc') me.snap = m.seq
  const L = latest(m, st.row)
  const after = woke ? `${other(sid) === 'A' ? 'Txn A' : 'Txn B'} has ended, so the wait is over. ` : ''
  if (m.level !== 'rc' && me.writes[st.row] === undefined && me.snap !== null && L.seq > me.snap) {
    end(
      m,
      sid,
      { kind: 'serialization', at: 'write', why: 'row' },
      what,
      `${after}The row was changed by a transaction that committed after this one's snapshot, so the database aborts it with a serialization failure. Nothing it did takes effect.`,
    )
    return
  }
  const base = me.writes[st.row] ?? L.val
  add(me.reads, `r${st.row}`)
  const matches = st.k === 'debit' ? base >= st.amt : true
  if (!matches) {
    me.zero = true
    me.pc += 1
    const recheck = woke && m.level === 'rc' ? 're-checks its guard on the row version txn ' + other(sid) + ' left: ' : 'finds '
    log(m, sid, 'zero', what, `${after}It ${recheck}${fmt(base)} is not >= ${st.amt}, so it updates 0 rows. The compile maps that zero to Insufficient.`)
    return
  }
  const val = st.k === 'set' ? (me.read as number) - st.amt : st.k === 'debit' ? base - st.amt : base + st.amt
  me.writes[st.row] = val
  add(me.locks, st.row)
  add(me.wrote, `r${st.row}`)
  me.pc += 1
  const how =
    woke && m.level === 'rc'
      ? st.k === 'set'
        ? `re-checks only id = ${st.row}, which still matches, and writes its constant: `
        : `re-checks its WHERE on the row txn ${other(sid)} left and updates it: `
      : 'updates 1 row and locks it: '
  log(m, sid, 'stmt', what, `${after}It ${how}${fmt(base)} becomes ${fmt(val)}.`)
  if (cycleWithCommitted(m, sid)) {
    end(m, sid, { kind: 'serialization', at: 'write', why: 'cycle' }, what, 'Its write closes a read-write cycle with a committed transaction, so the database aborts it with a serialization failure.')
  }
}

function commit(m: M, sid: Sid): void {
  const me = m.s[sid]
  if (cycleWithCommitted(m, sid)) {
    end(
      m,
      sid,
      { kind: 'serialization', at: 'commit', why: 'cycle' },
      'COMMIT',
      `Each transaction read something the other wrote, and txn ${other(sid)} has committed, so the database aborts this one at COMMIT with a serialization failure (read-write dependencies among transactions).`,
    )
    return
  }
  m.seq += 1
  let effect = 0
  for (const [row, val] of Object.entries(me.writes)) {
    const r = Number(row)
    ;(m.rows[r] as Version[]).push({ val, seq: m.seq })
  }
  for (const h of me.holds) {
    m.holds.push({ amt: h, seq: m.seq })
    effect += h
  }
  const prog = program(m.pattern, sid)
  for (const st of prog) if ((st.k === 'set' || st.k === 'debit') && me.writes[st.row] !== undefined) effect += st.amt
  me.effect = effect
  me.commitSeq = m.seq
  me.pc += 1
  me.status = 'done'
  me.end = { kind: 'commit' }
  me.writes = {}
  me.holds = []
  me.locks = []
  const did =
    m.pattern === 'holds'
      ? effect > 0
        ? `its hold of ${effect} takes effect.`
        : 'nothing was held.'
      : m.pattern === 'opposite'
        ? 'its transfer takes effect.'
        : effect > 0
          ? `its debit of ${effect} takes effect.`
          : 'it changed nothing.'
  log(m, sid, 'commit', 'COMMIT', `Commits: ${did}`)
  wake(m, sid)
}

/** An UPDATE: wait if the other session holds the row's lock (a deadlock if it is waiting on this one), else run it. */
function update(m: M, sid: Sid, st: Step & { readonly row: number }): void {
  const me = m.s[sid]
  const holder = other(sid)
  const H = m.s[holder]
  if (H.status !== 'done' && H.locks.includes(st.row)) {
    me.status = 'waiting'
    me.waitOn = holder
    me.waitSince = m.tick
    log(m, sid, 'wait', sql(st, me.read), `Waits: txn ${holder} holds account ${st.row}'s row lock.`)
    if (H.status === 'waiting' && H.waitOn === sid) {
      const victim = H.waitSince <= me.waitSince ? holder : sid
      end(
        m,
        victim,
        { kind: 'deadlock' },
        sql(program(m.pattern, victim)[m.s[victim].pc] as Step, m.s[victim].read),
        `Deadlock detected: each transaction waits for a lock the other holds. Txn ${victim} waited first, so its check runs first and the database aborts it. Nothing it did takes effect.`,
      )
    }
    return
  }
  attempt(m, sid, false)
}

/** Can the learner give this session its next step? */
export function runnable(w: World, sid: Sid): boolean {
  const me = w.s[sid]
  return me.status === 'ready' && me.pc < program(w.pattern, sid).length
}

export const finished = (w: World): boolean => !runnable(w, 'A') && !runnable(w, 'B')

/** Give one session its next step. */
export function advance(w: World, sid: Sid): World {
  if (!runnable(w, sid)) return w
  const m = thaw(w)
  m.tick += 1
  m.schedule.push(sid)
  const me = m.s[sid]
  const st = program(m.pattern, sid)[me.pc] as Step
  if (st.k !== 'commit') {
    if (m.level === 'rc' || me.snap === null) me.snap = m.seq
  }
  switch (st.k) {
    case 'read': {
      const v = visible(m, sid, st.row)
      me.read = v
      add(me.reads, `r${st.row}`)
      me.pc += 1
      log(m, sid, 'stmt', sql(st, null), `Reads ${fmt(v)}.`)
      break
    }
    case 'avail': {
      const v = visible(m, sid, 1) - visibleHolds(m, sid)
      me.read = v
      add(me.reads, 'r1')
      add(me.reads, 'holds')
      me.pc += 1
      log(m, sid, 'stmt', sql(st, null), `Reads ${fmt(v)} available. Holds that are not committed, or not in its snapshot, are not counted.`)
      break
    }
    case 'hold': {
      const r = me.read as number
      if (r < st.amt) {
        end(m, sid, { kind: 'refused' }, sql(st, r), `The application checks ${fmt(r)} >= ${st.amt}, which fails, so it places no hold and rolls back: Insufficient.`)
        break
      }
      me.holds.push(st.amt)
      add(me.wrote, 'holds')
      me.pc += 1
      log(m, sid, 'stmt', sql(st, r), `Inserts a new row, a hold of ${st.amt}. No other session wrote this row, so there is nothing to lock against.`)
      if (cycleWithCommitted(m, sid)) {
        end(m, sid, { kind: 'serialization', at: 'write', why: 'cycle' }, sql(st, r), 'The insert closes a read-write cycle with a committed transaction, so the database aborts it with a serialization failure.')
      }
      break
    }
    case 'set': {
      const r = me.read as number
      if (r < st.amt) {
        end(m, sid, { kind: 'refused' }, sql(st, r), `The application checks ${fmt(r)} >= ${st.amt}, which fails, so it writes nothing and rolls back: Insufficient.`)
        break
      }
      update(m, sid, st)
      break
    }
    case 'debit':
    case 'credit':
      update(m, sid, st)
      break
    case 'commit':
      commit(m, sid)
      break
  }
  return m as World
}

// ------------------------------------------------------------------ what the history comes to

export type Verdict = 'lost-update' | 'write-skew' | 'deadlock' | 'serialization' | 'refused' | 'fine'

export interface Summary {
  readonly verdict: Verdict
  readonly ends: Readonly<Record<Sid, End | null>>
  readonly balances: Readonly<Record<number, number>>
  /** Debited (rmw, cond) or held (holds) by committed transactions. */
  readonly taken: number
  /** One sentence. */
  readonly text: string
}

export function balances(w: World): Record<number, number> {
  const out: Record<number, number> = {}
  for (const [row, vs] of Object.entries(w.rows)) out[Number(row)] = (vs[vs.length - 1] as Version).val
  return out
}

const endWords = (e: End | null): string => {
  if (e === null) return 'is unfinished'
  switch (e.kind) {
    case 'commit':
      return 'commits'
    case 'refused':
      return 'is refused by its guard'
    case 'deadlock':
      return 'is aborted with a deadlock error'
    case 'serialization':
      return e.at === 'commit' ? 'fails at COMMIT with a serialization failure' : 'fails with a serialization failure'
  }
}

export function summary(w: World): Summary {
  const A = w.s.A
  const B = w.s.B
  const ends = { A: A.end, B: B.end }
  const bal = balances(w)
  const taken = A.effect + B.effect
  const kinds = [A.end?.kind, B.end?.kind]
  const committedZero = (s: Sess): boolean => s.end?.kind === 'commit' && s.zero
  let verdict: Verdict
  if (w.pattern !== 'opposite' && taken > START_BALANCE) verdict = w.pattern === 'holds' ? 'write-skew' : 'lost-update'
  else if (kinds.includes('deadlock')) verdict = 'deadlock'
  else if (kinds.includes('serialization')) verdict = 'serialization'
  else if (kinds.includes('refused') || committedZero(A) || committedZero(B)) verdict = 'refused'
  else verdict = 'fine'
  const who = `Txn A ${endWords(A.end)}; txn B ${endWords(B.end)}${committedZero(A) ? ' (txn A updated 0 rows)' : ''}${committedZero(B) ? ' (txn B updated 0 rows)' : ''}.`
  let tail: string
  switch (verdict) {
    case 'lost-update':
      tail = `Both debits took effect: ${taken} spent from a balance of ${START_BALANCE}, and the account shows ${fmt(bal[1] as number)}. A lost update.`
      break
    case 'write-skew':
      tail = `Both holds took effect: ${taken} held against a balance of ${START_BALANCE}. Write skew: each read a total the other then changed, and they wrote different rows.`
      break
    case 'deadlock':
      tail = 'A deadlock costs availability, not money: the aborted transaction did not happen, and nothing was lost or created.'
      break
    case 'serialization':
      tail = `No money was lost: ${w.pattern === 'opposite' ? `the total is still ${(bal[1] as number) + (bal[2] as number)}` : `${taken} ${w.pattern === 'holds' ? 'held' : 'spent'}`}. The aborted transaction has to run the whole command again (S6.L7).`
      break
    case 'refused':
      tail = `The guard refused the second ${w.pattern === 'holds' ? 'hold' : 'debit'}: ${taken} ${w.pattern === 'holds' ? 'held' : 'spent'}, and nothing was lost.`
      break
    case 'fine':
      tail = w.pattern === 'opposite' ? `Both transfers took effect, and the total is still ${(bal[1] as number) + (bal[2] as number)}.` : `Nothing was lost: ${taken} ${w.pattern === 'holds' ? 'held' : 'spent'}.`
      break
  }
  return { verdict, ends, balances: bal, taken, text: `${who} ${tail}` }
}

// ------------------------------------------------------------------ the lesson's permutations, and every order

/** The interleaving the lesson's cell replays for each compilation (both read, or both debit, before either commits). */
export const LESSON_ORDER: Record<Pattern, readonly Sid[]> = {
  rmw: ['A', 'B', 'A', 'B', 'A', 'B'],
  cond: ['A', 'B', 'A', 'B'],
  holds: ['A', 'B', 'A', 'B', 'A', 'B'],
  opposite: ['A', 'B', 'A', 'B', 'B', 'A'],
}

/** Play a list of choices, skipping any session that cannot move at that point. */
export function play(pattern: Pattern, level: Level, order: readonly Sid[]): World {
  let w = start(pattern, level)
  for (const s of order) if (runnable(w, s)) w = advance(w, s)
  return w
}

/** One session ran every step before the other started. */
export function isSerial(order: readonly Sid[]): boolean {
  let switches = 0
  for (let i = 1; i < order.length; i++) if (order[i] !== order[i - 1]) switches++
  return switches <= 1
}

export interface Outcome {
  readonly order: readonly Sid[]
  readonly serial: boolean
  readonly summary: Summary
}

/** Every complete schedule of the two sessions: every choice of who moves next, while someone can. */
export function everyOrder(pattern: Pattern, level: Level): Outcome[] {
  const out: Outcome[] = []
  const go = (w: World): void => {
    if (finished(w)) {
      out.push({ order: w.schedule, serial: isSerial(w.schedule), summary: summary(w) })
      return
    }
    for (const s of SIDS) if (runnable(w, s)) go(advance(w, s))
  }
  go(start(pattern, level))
  return out
}

export const VERDICT_NAME: Record<Verdict, string> = {
  'lost-update': 'lost update: more spent than the account held',
  'write-skew': 'write skew: more held than the account held',
  deadlock: 'one aborted with a deadlock error',
  serialization: 'one aborted with a serialization failure',
  refused: 'the guard refused the second, nothing lost',
  fine: 'both took effect, nothing lost',
}
