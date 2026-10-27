// Choosing an item's distractors so the key does not stand out to a blind learner (ASSESSMENT.md section 7.3) [D].
// The family offers more misconception mutants than an item shows, single mistakes and two at once; this picks the
// set it shows. The rank of the key by length is drawn uniformly among the ranks the candidates allow, so it is the
// longest, the shortest or in between about equally often; the key is at most 1.3 times the distractors' mean
// length; and, where a set allows it, no count of digits, numbers, brackets, punctuation or capitals is at its most
// or fewest on the key alone, and the key is not the option sharing the most words and symbols with the others (a
// mistake made twice sits between the single ones, so one of those is). The key itself is untouched: the checker
// still confirms it at grade time.
//
// Each family that uses it carries its own copy [D], so the content build's fingerprint of the family folder covers it.
//
// Pure: no DOM, storage or network. Deterministic in the draw.

import type { SeededDraw } from '@statespace/rng'
import type { Mutant } from '../core/distractors.ts'

/** What a learner reads: code spans and emphasis reduced to their text, whitespace collapsed. */
const plain = (s: string): string =>
  s
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

/** An option's words and symbols, as the convergence strategy reads them. */
const tokensOf = (s: string): Set<string> => new Set(plain(s).toLowerCase().match(/[\p{L}\p{N}_′']+|[^\s\p{L}\p{N}]/gu) ?? [])

/** Counts a blind learner can compare across options besides length. */
const FEATURES: readonly ((s: string) => number)[] = [
  (s) => (s.match(/\d/g) ?? []).length,
  (s) => (s.match(/\d+/g) ?? []).length,
  (s) => (s.match(/[()]/g) ?? []).length,
  (s) => (s.match(/,/g) ?? []).length,
  (s) => (s.match(/[,;:()]/g) ?? []).length,
  (s) => (s.match(/(?<![A-Za-z0-9])[A-Z]/g) ?? []).length,
]

/** Words, for a family whose options differ in how many words they spend on the same length. */
export const WORDS = (s: string): number => s.split(/\s+/).filter(Boolean).length

/** Whether some feature is at its most or its fewest on the key (the first text) alone. */
function singledOut(texts: readonly string[], extra: readonly ((s: string) => number)[]): boolean {
  return [...FEATURES, ...extra].some((f) => {
    const c = texts.map((t) => f(plain(t)))
    const k = c[0] as number
    const rest = c.slice(1)
    return rest.every((x) => x < k) || rest.every((x) => x > k)
  })
}

function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  let inter = 0
  for (const t of a) if (b.has(t)) inter += 1
  const union = a.size + b.size - inter
  return union === 0 ? 1 : inter / union
}

export interface ChooseArgs<R> {
  readonly reference: R
  readonly candidates: readonly Mutant<R>[]
  /** How many distractors the item shows. */
  readonly n: number
  readonly draw: SeededDraw
  readonly render: (value: R) => string
  /**
   * What the value means, so a candidate the checker would find equivalent to the key is left out and no set shows two
   * that mean the same; the text when absent. Two wordings of one mistake share a meaning, and a set shows one of them.
   */
  readonly meaning?: (value: R) => string
  /** Further counts to keep off the key alone, besides the digits, brackets, punctuation and capitals always checked. */
  readonly features?: readonly ((s: string) => number)[]
}

/** The n distractors to show, among the candidates that apply and differ from the key and from each other. */
export function chooseDistractors<R>(args: ChooseArgs<R>): Mutant<R>[] {
  const { reference, candidates, n, draw, render } = args
  const meaningOf = args.meaning ?? render
  const refText = render(reference)
  const texts = new Set([refText])
  const refMeaning = meaningOf(reference)
  const pool: { m: Mutant<R>; text: string; meaning: string }[] = []
  for (const m of candidates) {
    const value = m.apply(reference, draw)
    if (value === null) continue
    const text = render(value)
    const meaning = meaningOf(value)
    if (texts.has(text) || meaning === refMeaning) continue
    texts.add(text)
    pool.push({ m, text, meaning })
  }
  const subsets: number[][] = []
  const grow = (from: number, acc: number[]): void => {
    if (acc.length === n) {
      subsets.push(acc)
      return
    }
    for (let i = from; i < pool.length; i++) if (acc.every((j) => (pool[j] as { meaning: string }).meaning !== (pool[i] as { meaning: string }).meaning)) grow(i + 1, [...acc, i])
  }
  grow(0, [])
  if (subsets.length === 0) {
    // Fewer distinct mistakes than the item shows: one wording of each, and the caller's check fails the seed.
    const seen = new Set<string>()
    return pool.filter((c) => !seen.has(c.meaning) && seen.add(c.meaning)).map((c) => c.m)
  }
  const rows = subsets.map((ix) => {
    const shown = [refText, ...ix.map((i) => (pool[i] as { text: string }).text)]
    const sets = shown.map(tokensOf)
    const score = sets.map((a, i) => sets.reduce((acc, b, j) => (j === i ? acc : acc + jaccard(a, b)), 0))
    const lens = shown.map((t) => plain(t).length)
    const key = lens[0] as number
    const others = lens.slice(1)
    const ratio = key / (others.reduce((a, b) => a + b, 0) / others.length)
    const longer = others.filter((l) => l > key).length
    const tied = others.filter((l) => l === key).length
    return { ix, central: (score[0] as number) >= Math.max(...score.slice(1)) - 1e-12, free: !singledOut(shown, args.features ?? []), ratio: ratio <= 1.3, longer, tied }
  })
  // The key's rank by length, drawn among the ranks some set allows within the length ratio.
  const ranks = Array.from({ length: n + 1 }, (_, r) => r).filter((r) => rows.some((x) => x.ratio && x.longer <= r && r <= x.longer + x.tied))
  const target = ranks.length > 0 ? draw.pick(ranks) : draw.int(0, n)
  const scored = rows.map((x) => ({
    ...x,
    onTarget: x.longer <= target && target <= x.longer + x.tied,
    near: Math.min(Math.abs(x.longer - target), Math.abs(x.longer + x.tied - target)) <= 1,
  }))
  type Scored = (typeof scored)[number]
  const tiers: ((x: Scored) => boolean)[] = [
    (x) => !x.central && x.free && x.ratio && x.onTarget,
    (x) => x.free && x.ratio && x.onTarget,
    (x) => !x.central && x.ratio && x.onTarget,
    (x) => x.ratio && x.onTarget,
    (x) => !x.central && x.ratio && x.near,
    (x) => !x.central && x.ratio,
    (x) => x.ratio,
    () => true,
  ]
  for (const tier of tiers) {
    const ok = scored.filter(tier)
    if (ok.length > 0) return draw.pick(ok).ix.map((i) => (pool[i] as { m: Mutant<R> }).m)
  }
  return pool.slice(0, n).map((c) => c.m)
}
