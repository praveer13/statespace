// The Desk's composer and scorer (docs/AUDIT-DESK.md sections 5.2, 5.3 and 6). Pure: no DOM, storage or clock. The
// exports follow the contract GATE-audit-blind drives (scripts/spikes/W1-T40/README.md section 5), so this file can
// move to packages/learner/judgment/ unchanged when that folder is built. Judgment is derived from audit events at
// read time and never stored (I2).

/** Wilson's score interval for x of n at z (the same formula as @statespace/ledger/keepkill's, kept here so the Desk
 * does not load the keep/kill module). */
export function wilson(x: number, n: number, z: number): [number, number] {
  if (n <= 0) return [0, 1]
  const z2 = z * z
  const c = (x + z2 / 2) / (n + z2)
  const h = (z / (n + z2)) * Math.sqrt((x * (n - x)) / n + z2 / 4)
  return [Math.max(0, c - h), Math.min(1, c + h)]
}

// ------------------------------------------------------------------ the seeded stream

/** splitmix32: one seed gives one sequence of uint32 draws, the same in every engine. */
export function stream(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x9e3779b9) >>> 0
    let z = s
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0
    return (z ^ (z >>> 16)) >>> 0
  }
}

/** An integer in [0, n), exactly uniform (rejection sampling). */
function below(next: () => number, n: number): number {
  const limit = 4294967296 - (4294967296 % n)
  for (;;) {
    const u = next()
    if (u < limit) return u % n
  }
}

function shuffle<T>(xs: readonly T[], next: () => number): T[] {
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) {
    const j = below(next, i + 1)
    ;[out[i], out[j]] = [out[j] as T, out[i] as T]
  }
  return out
}

// ------------------------------------------------------------------ the composer

export const AUDIT_SURFACES = ['desk'] as const

/** A case as the composer sees it (the gate's SimCase, the fields this composer reads). */
export interface SimCase {
  id: string
  anchor: string
  stage: string
  pair: string
  truth: 'sound' | 'flawed'
}

/** The sound count of a sitting of n cases: the integers in [ceil(0.30 n), floor(0.60 n)] (AUDIT-DESK 5.2). */
export function soundRange(n: number): [number, number] {
  return [Math.ceil(0.3 * n - 1e-9), Math.floor(0.6 * n + 1e-9)]
}

/** The most cases a sitting can hold while its pairs stay apart: one case per pair. */
export const maxSitting = (cases: readonly SimCase[]): number => new Set(cases.map((c) => c.pair)).size

/**
 * A Desk sitting: exactly k sound cases, k drawn by the seed uniformly from soundRange(size), no two cases of one pair,
 * then shuffled so no position carries information (AUDIT-DESK 5.2 and 5.3). Indices into `cases` in the order
 * served, or null when the pool cannot fill a sitting of that size under these rules.
 */
export function composeAuditSitting(args: { surface: 'desk' | 'today' | 'part-c'; cases: readonly SimCase[]; topic?: string; stagesDone?: readonly string[]; size: number; seed: number }): number[] | null {
  const { cases, size } = args
  if (args.surface !== 'desk' || size < 1) return null
  const next = stream(args.seed)
  const [lo, hi] = soundRange(size)
  if (lo > hi) return null
  const k = lo + below(next, hi - lo + 1)
  // Up to 16 tries with fresh draws: a greedy fill can corner itself when the pool is small.
  for (let attempt = 0; attempt < 16; attempt++) {
    const order = shuffle(
      cases.map((_, i) => i),
      next,
    )
    const pairs = new Set<string>()
    const sound: number[] = []
    const flawed: number[] = []
    for (const i of order) {
      const c = cases[i] as SimCase
      if (pairs.has(c.pair)) continue
      if (c.truth === 'sound' && sound.length < k) sound.push(i)
      else if (c.truth === 'flawed' && flawed.length < size - k) flawed.push(i)
      else continue
      pairs.add(c.pair)
    }
    if (sound.length === k && flawed.length === size - k) return shuffle([...sound, ...flawed], next)
  }
  return null
}

// ------------------------------------------------------------------ the scorer

/** One counted decision (the gate's Decision): a finding filed on a case. Classes are top-level, G1 to G13. */
export interface Decision {
  case: string
  truth: 'sound' | 'flawed'
  /** The case's primary class, for a flawed case. */
  primary: string | null
  /** The acceptable classes, rolled up to G1-G13. */
  acceptable: readonly string[]
  pick: 'gap' | 'sound'
  /** The class the finding named, or null for "none: sound". */
  named: string | null
  evidenceValid: boolean
  restatementAnswered: boolean
  surface: string
  sitting: string
  position: number
}

export interface Figure {
  id: string
  kind: 'decision' | 'class'
  value: number | null
  n: number
  /** The count behind the rate: hits of n. */
  hits: number
}

/** n at which a per-class figure shows a rate (spine section 6; AUDIT-DESK 6.5). */
export const CLASS_N = 10

export const found = (d: Decision): boolean => d.truth === 'flawed' && d.pick === 'gap'
export const correct = (d: Decision): boolean => found(d) && d.named !== null && d.acceptable.includes(d.named) && d.evidenceValid

/**
 * Every figure the Desk shows (AUDIT-DESK 6.2), under the gate's ids: tpr, tnr and ba; precision:none; recall:Gk once
 * ten cases of primary class Gk are counted; precision:Gk once Gk has been named ten times; recall-macro once any
 * recall:Gk is shown. A figure whose rule does not apply yet is left out.
 */
export function auditFigures(decisions: readonly Decision[]): Figure[] {
  const out: Figure[] = []
  const rate = (id: string, kind: Figure['kind'], hits: number, n: number): void => void out.push({ id, kind, value: n > 0 ? hits / n : null, n, hits })
  const flawed = decisions.filter((d) => d.truth === 'flawed')
  const sound = decisions.filter((d) => d.truth === 'sound')
  const tp = flawed.filter(found).length
  const tn = sound.filter((d) => d.pick === 'sound').length
  if (flawed.length > 0) rate('tpr', 'decision', tp, flawed.length)
  if (sound.length > 0) rate('tnr', 'decision', tn, sound.length)
  if (flawed.length > 0 && sound.length > 0) out.push({ id: 'ba', kind: 'decision', value: (tp / flawed.length + tn / sound.length) / 2, n: decisions.length, hits: tp + tn })
  const accepted = decisions.filter((d) => d.pick === 'sound')
  if (accepted.length > 0) rate('precision:none', 'decision', accepted.filter((d) => d.truth === 'sound').length, accepted.length)
  const classes = new Set<string>()
  for (const d of decisions) {
    if (d.primary !== null) classes.add(d.primary)
    if (d.named !== null) classes.add(d.named)
  }
  const recalls: number[] = []
  for (const k of [...classes].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))) {
    const ofK = flawed.filter((d) => d.primary === k)
    if (ofK.length >= CLASS_N) {
      const hits = ofK.filter(correct).length
      rate(`recall:${k}`, 'class', hits, ofK.length)
      recalls.push(hits / ofK.length)
    }
    const named = decisions.filter((d) => d.pick === 'gap' && d.named === k)
    if (named.length >= CLASS_N) rate(`precision:${k}`, 'class', named.filter(correct).length, named.length)
  }
  if (recalls.length > 0) out.push({ id: 'recall-macro', kind: 'class', value: recalls.reduce((a, b) => a + b, 0) / recalls.length, n: recalls.length, hits: 0 })
  return out
}

/** A 95% Wilson interval for one proportion. */
export const wilson95 = (hits: number, n: number): [number, number] => wilson(hits, n, 1.959963984540054)

/**
 * Balanced accuracy's interval, assembled from the 97.5% Wilson intervals of TPR and TNR: [(L1 + L2) / 2,
 * (U1 + U2) / 2], which holds at least 95% of the time by Bonferroni (AUDIT-DESK 6.5).
 */
export function baInterval(tp: number, flawed: number, tn: number, sound: number): [number, number] {
  const z = 2.241402727604947
  const [l1, u1] = wilson(tp, flawed, z)
  const [l2, u2] = wilson(tn, sound, z)
  return [(l1 + l2) / 2, (u1 + u2) / 2]
}

// ------------------------------------------------------------------ grading one finding

/**
 * Whether a finding's anchored lines validate (AUDIT-DESK 6.3, the declaration type and its stand-in for the others
 * until the instruments replay witnesses): one to three lines, at least one of them a line the key names as
 * load-bearing. The three-line cap means selecting every line never validates.
 */
export function linesValidate(selected: readonly string[], loadBearing: readonly string[]): boolean {
  return selected.length >= 1 && selected.length <= 3 && selected.some((l) => loadBearing.includes(l))
}
