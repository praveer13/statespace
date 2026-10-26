// SCR-search's ranking over the content build's index (packages/content SearchEntry). Fuse-style, and small enough to
// read: each query word must match an entry's ID, title or text, by exact ID, prefix, word start, substring or an
// in-order fuzzy match whose gaps cost score; an entry's score is the mean of its words' scores, lower is better. An
// exact ID ("SP-5.1") always ranks first. Pure: no DOM, no network (the index is static).

import type { SearchEntry, SearchKind } from '@statespace/content'

export interface Hit {
  readonly entry: SearchEntry
  /** The title to show: specimens and claims carry their spine names where the registry has them. */
  readonly title: string
  readonly score: number
}

export interface Group {
  readonly kind: SearchKind
  readonly label: string
  readonly hits: readonly Hit[]
}

/** The kinds in the order DESIGN.md lists them (lessons, KCs, specimens, claims, drawers, IDs), with their labels. */
export const KINDS: readonly { kind: SearchKind; label: string }[] = [
  { kind: 'lesson', label: 'Lessons' },
  { kind: 'kc', label: 'Knowledge components' },
  { kind: 'specimen', label: 'Specimens' },
  { kind: 'claim', label: 'Claims' },
  { kind: 'drawer', label: 'Drawers' },
  { kind: 'stage', label: 'Stages' },
  { kind: 'lab', label: 'Labs' },
  { kind: 'lab-stage', label: 'Lab stages' },
  { kind: 'anchor', label: 'Audit anchors' },
]

const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ`]/g, '')
    .trim()

/** An in-order fuzzy match of q in s: 0 for a tight run, approaching 1 as the gaps grow; null when q is not a subsequence. */
function fuzzy(q: string, s: string): number | null {
  if (q.length < 3) return null
  let i = 0
  let first = -1
  let gaps = 0
  let last = -1
  for (let j = 0; j < s.length && i < q.length; j += 1) {
    if (s[j] === q[i]) {
      if (first < 0) first = j
      else gaps += j - last - 1
      last = j
      i += 1
    }
  }
  if (i < q.length) return null
  const spread = gaps / Math.max(q.length, 1)
  return spread > 2.5 ? null : Math.min(spread / 2.5, 1)
}

/** One query word against one entry: a score in [0, 1], lower is better, or null when it does not match. */
function wordScore(w: string, id: string, title: string, text: string): number | null {
  if (id === w) return 0
  if (id.startsWith(w)) return 0.05
  const t = title.indexOf(w)
  if (t === 0) return 0.1
  if (t > 0) return /[\s\-(·.,:"']/.test(title[t - 1] ?? '') ? 0.15 : 0.25
  if (id.includes(w)) return 0.3
  const x = text.indexOf(w)
  if (x >= 0) return 0.4
  const ft = fuzzy(w, title)
  if (ft !== null) return 0.55 + ft * 0.2
  const fx = fuzzy(w, text)
  if (fx !== null) return 0.8 + fx * 0.15
  return null
}

export interface Indexed {
  readonly entry: SearchEntry
  readonly title: string
  readonly id: string
  readonly nTitle: string
  readonly nText: string
}

export function prepare(entries: readonly SearchEntry[], titleOf: (e: SearchEntry) => string): Indexed[] {
  return entries.map((entry) => {
    const title = titleOf(entry)
    return { entry, title, id: norm(entry.id), nTitle: norm(title), nText: norm(`${entry.text} ${entry.stage ?? ''}`) }
  })
}

/** The hits for a query, best first. */
export function rank(index: readonly Indexed[], query: string): Hit[] {
  const q = norm(query)
  if (q === '') return []
  const words = q.split(/\s+/).filter(Boolean)
  const hits: Hit[] = []
  for (const it of index) {
    const exact = it.id === q
    let total = 0
    let ok = true
    for (const w of words) {
      const s = wordScore(w, it.id, it.nTitle, it.nText)
      if (s === null) {
        ok = false
        break
      }
      total += s
    }
    if (!ok && !exact) continue
    // a whole-query match in the title beats the same words scattered
    let score = exact ? -1 : total / words.length
    if (!exact && words.length > 1 && it.nTitle.includes(q)) score -= 0.05
    hits.push({ entry: it.entry, title: it.title, score })
  }
  return hits.sort((a, b) => a.score - b.score || a.entry.id.localeCompare(b.entry.id, 'en', { numeric: true }))
}

/** Hits grouped by kind; groups ordered by their best hit, ties in the fixed order of KINDS. */
export function group(hits: readonly Hit[]): Group[] {
  const groups = KINDS.map(({ kind, label }) => ({ kind, label, hits: hits.filter((h) => h.entry.kind === kind) })).filter((g) => g.hits.length > 0)
  const order = new Map(KINDS.map((k, i) => [k.kind, i]))
  return groups.sort((a, b) => a.hits[0]!.score - b.hits[0]!.score || order.get(a.kind)! - order.get(b.kind)!)
}
