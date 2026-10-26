// The report (report@1, draft; W5-T06; curriculum/S10-assembly.md section 4), as a traversal of the learner's claim graph
// at read time: the claim cards their imported receipts mint, the claims their answers mint, the seams their record has
// planted, the lines they add themselves, and the erosions that have fired. Each stamp in it is one packages/stamps
// derived (from a receipt's verdict lines, from an assumption or from a line the learner wrote), never typed (I2). The
// sections follow the roadmap's categories extended with the course's stamps: proved, model-checked, tested, enforced,
// configured, assumed and not covered, then what the record holds that no stamp yet covers. Then the checker matrix, the
// statement hashes, the tools and versions, the erosion log, the defeater log as m of n (never summed), and the limits.
// Pure, apart from the hash.

import { canonicalJson, sha256Hex, utf8, type ErosionReading, type LedgerEvent } from '@statespace/ledger'
import { deriveStamp, LANE_BADGES, stampText, type Lane, type RawOutput, type Stamp, type StampCode } from '@statespace/stamps'
import type { ImportedReceipt } from '../bench/receipt-model.ts'
import { claimCards } from '../bench/receipt-model.ts'
import { EROSIONS, runTag, seamOf, SEAMS, SEGMENT_WORDS } from './data.ts'

export const REPORT_SCHEMA = 'statespace/report@1'

export type SectionKey = 'proved' | 'model-checked' | 'tested' | 'enforced' | 'configured' | 'assumed' | 'not-covered' | 'refuted-or-unknown'

export const SECTIONS: ReadonlyArray<{ readonly key: SectionKey; readonly title: string; readonly empty: string }> = [
  { key: 'proved', title: 'Proved', empty: 'Nothing proved yet. A PROVED line needs a receipt whose checker accepted the statement.' },
  { key: 'model-checked', title: 'Model-checked', empty: 'Nothing model-checked yet.' },
  { key: 'tested', title: 'Tested', empty: 'Nothing tested yet.' },
  { key: 'enforced', title: 'Enforced', empty: 'Nothing enforced yet.' },
  { key: 'configured', title: 'Configured', empty: 'No configured line yet. Add a setting you read back from the system below.' },
  { key: 'assumed', title: 'Assumed', empty: 'No assumption planted yet. Every seam your record plants is listed here.' },
  { key: 'not-covered', title: 'Not covered', empty: 'No not-covered line yet. Say what lies outside your models below.' },
  { key: 'refuted-or-unknown', title: 'Refuted or unknown', empty: '' },
]

const SECTION_OF: Readonly<Record<StampCode, SectionKey>> = {
  '[P]': 'proved',
  '[M]': 'model-checked',
  '[T]': 'tested',
  '[E]': 'enforced',
  '[C]': 'configured',
  '[A]': 'assumed',
  '[N]': 'not-covered',
  '[R]': 'refuted-or-unknown',
  '[?]': 'refuted-or-unknown',
}

/** One line of the report: a stamp and what it is about. */
export interface ReportLine {
  readonly claim: string
  readonly title: string
  /** The stamp, kept for the screen; the export writes its text. */
  readonly stamp: Stamp
  readonly text: string
  readonly lane: string
  /** The claim's primary stamp, or one that supports it. */
  readonly role: 'primary' | 'supporting' | 'seam' | 'yours' | 'erosion'
  /** Where it came from: a receipt path, a lesson, a line you wrote. */
  readonly source: string
  readonly seams: readonly string[]
  /** The erosion that cracked something this line rests on, if any. */
  readonly cracked: readonly string[]
}

export interface MintedClaim {
  readonly claim: string
  readonly lesson: string
}

/** A line the learner adds to the report: a setting read back, or what lies outside the model. */
export type YourLine =
  | { readonly report: 'configured'; readonly setting: string; readonly source: string; readonly at: string }
  | { readonly report: 'not-covered'; readonly what: string }

export interface ErosionEntry {
  readonly id: string
  readonly seam: string
  readonly claim: string | null
  readonly specimen: string
  readonly segment: string
  readonly status: 'fired' | 'cracked'
  readonly endpoints: readonly [string, string]
  readonly forecast: 'matched' | 'missed' | 'not answered'
  readonly remedies: readonly string[]
  readonly runs: readonly string[]
}

/** A claim the record holds that no stamp covers yet: minted by answers, or named by a receipt whose runs earn none. */
export interface Awaiting {
  readonly claim: string
  readonly title: string
  /** The lesson that minted it, or the receipt that names it. */
  readonly from: string
  readonly via: 'answers' | 'receipt'
  /** For a receipt: why its runs earn no stamp, as packages/stamps says it. */
  readonly why?: string
  readonly seams: readonly string[]
}

export interface Report {
  readonly schema: typeof REPORT_SCHEMA
  readonly draft: true
  readonly generatedAt: string
  readonly establishes: string
  readonly doesNotEstablish: readonly string[]
  readonly sections: Readonly<Record<SectionKey, readonly ReportLine[]>>
  /** Claims the learner's answers mint that no receipt stamps yet. */
  readonly awaiting: readonly Awaiting[]
  readonly checkers: readonly string[]
  readonly matrix: readonly { readonly claim: string; readonly by: readonly string[] }[]
  readonly statements: readonly { readonly claim: string; readonly path: string; readonly kind: string; readonly sha256: string }[]
  readonly tools: readonly { readonly name: string; readonly version: string; readonly pinned: boolean; readonly sha256: string | null }[]
  readonly trusted: readonly { readonly claim: string; readonly component: string; readonly status: string }[]
  readonly erosions: readonly ErosionEntry[]
  readonly defeaters: { readonly identified: number; readonly retired: number; readonly open: readonly { readonly claim: string; readonly text: string }[] }
  readonly limits: readonly string[]
}

/** The lines a learner added: note events whose data says which section they belong to. */
export function yourLines(events: readonly LedgerEvent[]): Array<{ readonly event: LedgerEvent; readonly line: YourLine }> {
  const out: Array<{ event: LedgerEvent; line: YourLine }> = []
  for (const e of events) {
    if (e.kind !== 'note') continue
    const d = (e.data ?? {}) as Record<string, unknown>
    if (d.report === 'configured' && typeof d.setting === 'string' && typeof d.source === 'string' && typeof d.at === 'string') {
      out.push({ event: e, line: { report: 'configured', setting: d.setting, source: d.source, at: d.at } })
    } else if (d.report === 'not-covered' && typeof d.what === 'string') {
      out.push({ event: e, line: { report: 'not-covered', what: d.what } })
    }
  }
  return out
}

const seamsUnder = (claim: string): string[] => SEAMS.filter((s) => s.claims.includes(claim)).map((s) => s.id)

function stampFrom(raw: RawOutput, lane: Lane, source: string): Stamp | null {
  const d = deriveStamp(raw, { lane, source })
  return d.kind === 'stamp' ? d.stamp : null
}

export interface ReportInput {
  readonly receipts: readonly ImportedReceipt[]
  readonly minted: readonly MintedClaim[]
  readonly erosions: ErosionReading
  readonly yours: ReadonlyArray<{ readonly line: YourLine }>
  readonly title: (claim: string) => string | undefined
  readonly now: Date
}

export function buildReport(input: ReportInput): Report {
  const { receipts, minted, erosions, yours, title, now } = input
  const sections: Record<SectionKey, ReportLine[]> = { proved: [], 'model-checked': [], tested: [], enforced: [], configured: [], assumed: [], 'not-covered': [], 'refuted-or-unknown': [] }
  const crackedSeams = new Map(erosions.seams.filter((s) => s.crackedBy !== undefined).map((s) => [s.id, s.crackedBy as string] as const))
  const crackedFor = (claim: string): string[] => seamsUnder(claim).flatMap((s) => (crackedSeams.has(s) ? [crackedSeams.get(s) as string] : []))
  const add = (line: Omit<ReportLine, 'text' | 'lane'>): void => {
    sections[SECTION_OF[line.stamp.code]].push({ ...line, text: stampText(line.stamp), lane: LANE_BADGES[line.stamp.lane] })
  }

  // ---- the receipts' claim cards: the primary stamp and each supporting stamp
  const cards = claimCards(receipts, title)
  const stamped = new Set<string>()
  const matrix: Array<{ claim: string; by: string[] }> = []
  const statements: Report['statements'][number][] = []
  const trusted: Report['trusted'][number][] = []
  const openDefeaters: Array<{ claim: string; text: string }> = []
  const unstamped: Awaiting[] = []
  for (const card of cards) {
    const name = card.template !== undefined ? (title(card.template) ?? card.key) : (card.localId ?? card.key)
    const cell = card.strip?.cells.proposition
    const base = { claim: card.key, title: name, source: card.from.path, seams: seamsUnder(card.key), cracked: crackedFor(card.key) }
    if (cell?.primary) {
      add({ ...base, stamp: cell.primary, role: 'primary' })
      stamped.add(card.key)
    } else {
      const why = card.derivations.map((d) => (d.derivation.kind === 'none' ? d.derivation.text : d.derivation.kind === 'modulo' ? d.derivation.text : '')).filter((t) => t !== '')
      unstamped.push({ claim: card.key, title: name, from: card.from.path, via: 'receipt', why: why.join('; ') || 'its runs earn no stamp', seams: seamsUnder(card.key) })
      stamped.add(card.key)
    }
    for (const s of cell?.supporting ?? []) add({ ...base, stamp: s, role: 'supporting' })
    for (const d of cell?.defeaters ?? []) openDefeaters.push({ claim: card.key, text: d.text })
    const r = card.from.receipt
    matrix.push({ claim: card.key, by: [...new Set(r.tools.map((t) => `${t.name} ${t.version}`))] })
    for (const s of r.statements) statements.push({ claim: card.key, path: s.path, kind: s.kind, sha256: s.sha256 })
    for (const t of r.tcb ?? []) trusted.push({ claim: card.key, component: t.component, status: t.status })
  }

  // ---- every seam the record has planted, as ASSUMED; a held seam says what tests it
  for (const s of erosions.seams) {
    if (s.plantedAt === undefined) continue
    const seam = seamOf(s.id)
    if (seam === undefined) continue
    const why = s.held ? `${plainText(seam.assumption)}; held, tested by ${seam.testedBy}` : plainText(seam.assumption)
    const stamp = stampFrom({ kind: 'assumption', why }, 'self-assessed', `${s.id}, planted in ${seam.plantedIn.join(', ')}`)
    if (stamp === null) continue
    add({ claim: s.id, title: plainText(seam.assumption), stamp, role: 'seam', source: `planted in ${seam.plantedIn.join(' and ')}`, seams: [s.id], cracked: s.crackedBy !== undefined ? [s.crackedBy] : [] })
  }

  // ---- an erosion that moves a requirement out of the model (ER-3) adds its NOT COVERED line
  for (const er of EROSIONS) {
    const st = erosions.erosions.find((e) => e.id === er.id)
    if (st?.status !== 'cracked' || er.segment !== 'requirement') continue
    const stamp = stampFrom({ kind: 'not-covered', what: `${plainText(er.reason)} (${er.id})` }, 'self-assessed', er.id)
    if (stamp !== null) add({ claim: er.claim ?? er.seam, title: er.claim !== null ? (title(er.claim) ?? er.claim) : er.seam, stamp, role: 'erosion', source: `${er.id}, ${er.specimen}`, seams: [er.seam], cracked: [er.id] })
  }

  // ---- the lines you add
  yours.forEach(({ line }, i) => {
    const raw: RawOutput = line.report === 'configured' ? { kind: 'setting-read-back', setting: line.setting, source: line.source, at: line.at } : { kind: 'not-covered', what: line.what }
    const stamp = stampFrom(raw, 'self-assessed', `your line ${i + 1}`)
    if (stamp !== null) add({ claim: `yours-${i + 1}`, title: line.report === 'configured' ? line.setting : line.what, stamp, role: 'yours', source: 'a line you added', seams: [], cracked: [] })
  })

  // ---- claims the answers mint that no receipt stamps
  const awaiting: Awaiting[] = [
    ...unstamped,
    ...minted.filter((m) => !stamped.has(m.claim)).map((m): Awaiting => ({ claim: m.claim, title: title(m.claim) ?? m.claim, from: m.lesson, via: 'answers', seams: seamsUnder(m.claim) })),
  ]

  // ---- the erosion log
  const erosionLog: ErosionEntry[] = []
  for (const st of erosions.erosions) {
    if (st.status === 'dormant') continue
    const er = EROSIONS.find((e) => e.id === st.id)
    if (er === undefined) continue
    const seam = seamOf(er.seam)
    erosionLog.push({
      id: er.id,
      seam: er.seam,
      claim: er.claim,
      specimen: er.specimen,
      segment: SEGMENT_WORDS[er.segment],
      status: st.status,
      endpoints: [`planted in ${seam?.plantedIn.join(' and ') ?? '?'}`, er.cashedIn !== null ? `cashed in ${er.cashedIn} by ${er.specimen}` : `a Clearinghouse week after ${er.clearinghouseAfter}`],
      forecast: st.forecast === undefined ? 'not answered' : st.forecast.matched === true ? 'matched' : 'missed',
      remedies: er.remedies,
      runs: er.runs,
    })
  }

  const checkers = [...new Set(matrix.flatMap((m) => m.by))].sort()
  const tools = new Map<string, Report['tools'][number]>()
  for (const imp of receipts) for (const t of imp.receipt.tools) tools.set(`${t.name} ${t.version}`, { name: t.name, version: t.version, pinned: t.pinned === true, sha256: t.sha256 ?? null })

  const cracked = erosionLog.filter((e) => e.status === 'cracked').length
  return {
    schema: REPORT_SCHEMA,
    draft: true,
    generatedAt: now.toISOString(),
    establishes:
      'Each line establishes only what its stamp and qualifier say, about the statement and model named on the receipt it cites. Lines marked "reported from your machine" were run on your Bench; "self-assessed" lines are your own statements.',
    doesNotEstablish: [
      'Who you are, or that the work is unassisted: provenance is self-declared (OD-8).',
      'That any proposition is the requirement: requirement fit is never PROVED.',
      'Anything about the running system beyond the correspondence each claim states.',
      'Anything a bound or an n leaves out: every MODEL-CHECKED and TESTED line prints its own.',
    ],
    sections,
    awaiting,
    checkers,
    matrix,
    statements,
    tools: [...tools.values()],
    trusted,
    erosions: erosionLog,
    // a fired erosion identifies a doubt; its forecast and remedy retire it only when a remedy re-mints the segment, which this build does not record yet
    defeaters: { identified: openDefeaters.length + erosionLog.length, retired: 0, open: [...openDefeaters, ...erosionLog.map((e) => ({ claim: e.claim ?? e.seam, text: `${e.id}: ${e.seam} cracked (${e.segment.toLowerCase()})` }))] },
    limits: [
      `${cracked} of ${erosionLog.length} fired erosions are cracked in your record; a claim keeps its stamp and shows its crack and remedy.`,
      'Statement hashes are as your receipts report them. The tab recomputes them once your lab bundle carries the statement texts.',
      'Lines are derived at read time from this browser’s record and the receipts it holds; another browser holds another record.',
    ],
  }
}

/** Markdown and inline code reduced to plain text, for a qualifier. */
export function plainText(md: string): string {
  return md.replace(/`([^`]*)`/g, '$1').replace(/\*\*([^*]*)\*\*/g, '$1').replace(/\*([^*]*)\*/g, '$1')
}

// ------------------------------------------------------------------------------------------ export

/** The JSON export: the report with every stamp as its text, and its own SHA-256 over the canonical form. */
export async function reportJson(r: Report): Promise<string> {
  const plain = {
    ...r,
    sections: Object.fromEntries(
      Object.entries(r.sections).map(([k, lines]) => [
        k,
        lines.map((l) => ({ claim: l.claim, title: l.title, stamp: l.text, code: l.stamp.code, lane: l.lane, role: l.role, source: l.source, seams: [...l.seams], cracked: [...l.cracked] })),
      ]),
    ),
  }
  const body = JSON.parse(JSON.stringify(plain)) as Record<string, unknown>
  const hash = sha256Hex(utf8(canonicalJson(body)))
  return `${JSON.stringify({ ...body, sha256: hash }, null, 2)}\n`
}

const mdEscape = (s: string): string => s.replace(/\|/g, '\\|')

export function reportMarkdown(r: Report): string {
  const out: string[] = []
  out.push('# Claim report', '')
  out.push(`${REPORT_SCHEMA} (draft) · generated ${r.generatedAt}`, '')
  out.push('## What this report establishes', '', r.establishes, '', 'It does not establish:', '')
  for (const d of r.doesNotEstablish) out.push(`- ${d}`)
  out.push('')
  for (const s of SECTIONS) {
    const lines = r.sections[s.key]
    if (s.key === 'refuted-or-unknown' && lines.length === 0) continue
    out.push(`## ${s.title}`, '')
    if (lines.length === 0) out.push(`_${s.empty}_`)
    for (const l of lines) {
      const crack = l.cracked.length > 0 ? ` Cracked by ${l.cracked.join(', ')}.` : ''
      const seams = l.seams.length > 0 && l.role !== 'seam' ? ` Rests on ${l.seams.join(', ')}.` : ''
      out.push(`- **${l.claim}** ${l.title}: \`${l.text}\` (${l.lane}; ${l.role === 'supporting' ? 'supporting, ' : ''}${l.source}).${seams}${crack}`)
    }
    out.push('')
  }
  out.push('## In your record, no stamp yet', '')
  if (r.awaiting.length === 0) out.push('_None._')
  for (const a of r.awaiting) {
    const where = a.via === 'answers' ? `minted in ${a.from}; no stamp until a receipt carries it` : `named by ${a.from}, whose runs earn no stamp: ${a.why ?? ''}`
    out.push(`- **${a.claim}** ${plainText(a.title)}: ${where}.${a.seams.length > 0 ? ` Rests on ${a.seams.join(', ')}.` : ''}`)
  }
  out.push('', '## Checker matrix', '')
  if (r.matrix.length === 0) out.push('_No receipt yet._')
  else {
    out.push(`| Claim | ${r.checkers.map(mdEscape).join(' | ')} |`, `|---|${r.checkers.map(() => '---').join('|')}|`)
    for (const m of r.matrix) out.push(`| ${m.claim} | ${r.checkers.map((c) => (m.by.includes(c) ? 'ran' : '—')).join(' | ')} |`)
  }
  out.push('', '## Statement hashes', '')
  if (r.statements.length === 0) out.push('_None._')
  for (const s of r.statements) out.push(`- ${s.claim} · \`${s.path}\` (${s.kind}) · sha256 \`${s.sha256}\``)
  out.push('', '## Tools and versions', '')
  if (r.tools.length === 0) out.push('_None._')
  for (const t of r.tools) out.push(`- ${t.name} ${t.version}${t.pinned ? ', pinned' : ''}${t.sha256 !== null ? `, sha256 \`${t.sha256}\`` : ''}`)
  out.push('', '## Trusted base', '')
  if (r.trusted.length === 0) out.push('_None stated._')
  for (const t of r.trusted) out.push(`- ${t.claim}: ${t.component} (${t.status})`)
  out.push('', '## Erosion log', '')
  if (r.erosions.length === 0) out.push('_No erosion has fired in your record._')
  for (const e of r.erosions) {
    out.push(`- **${e.id}** ${e.seam}${e.claim !== null ? ` under ${e.claim}` : ''}: ${e.segment.toLowerCase()} cracks, by ${e.specimen}. Endpoints: ${e.endpoints.join('; ')}. Forecast: ${e.forecast}. Status: ${e.status}. Remedies: ${e.remedies.map(plainText).join(' ')}${e.runs.length > 0 ? ` ${runTag(...e.runs)}` : ''}`)
  }
  out.push('', '## Defeater log', '', `${r.defeaters.retired} of ${r.defeaters.identified} retired.`, '')
  for (const d of r.defeaters.open) out.push(`- open · ${d.claim}: ${d.text}`)
  out.push('', '## Limits', '')
  for (const l of r.limits) out.push(`- ${l}`)
  out.push('')
  return out.join('\n')
}
