// Receipt import, the happy path's version (labs/README.md section 8; ARCHITECTURE.md sections 10.3 and 10.4). A
// receipt arrives as text, pasted or from a file. This module reads it in the order section 10.3 gives: caps, the
// receipt@1 schema, every verdict line read again by packages/stamps, then consistency with the course's content. It
// then works out, at read time, what the receipt carries: each check with who ran it, and each claim card it mints or
// updates, with its strip built from stamps that packages/stamps derived (I2). Nothing here stores anything: the
// screens write one receipt-import event and a read-only copy of the file (app/ledger.ts), and derive the rest again
// from those on every read.
//
// Happy path: the parse and the schema run on the main origin with @statespace/schema. Moving them to the instrument
// origin (I6) and the lab bundle's statement texts, which would let the tab recompute statement hashes, come later.

import { parseJsonSafely, sha256Hex, utf8, type LedgerEvent } from '@statespace/ledger'
import { validate, type Receipt } from '@statespace/schema'
import { buildStrip, deriveReceipt, type Derivation, type Lane, type ReceiptStamps, type Stamp, type Strip } from '@statespace/stamps'

/** The largest receipt the tab reads, before parsing [D]. A CLI receipt is a few kilobytes. */
export const RECEIPT_MAX_BYTES = 1_048_576

/** A receipt the tab accepted, with what it derives from it. */
export interface ImportedReceipt {
  /** SHA-256 of the file's text as UTF-8, the receipt-import event's ref. */
  readonly sha256: string
  /** Where statespace check wrote it: receipts/LAB-1.3/20261025T185932Z.json. */
  readonly path: string
  readonly receipt: Receipt
  readonly stamps: ReceiptStamps
}

export type ReadResult = { readonly ok: true; readonly imported: ImportedReceipt } | { readonly ok: false; readonly problems: readonly string[] }

/** `receipts/<stage>/<createdAt in the CLI's compact form>.json`, the path statespace check writes. */
export function receiptPath(r: Pick<Receipt, 'stage' | 'createdAt'>): string {
  const compact = r.createdAt.replace(/\.\d+/, '').replace(/[-:]/g, '').replace(/\+0000$/, 'Z')
  return `receipts/${r.stage}/${compact}.json`
}

/** LAB-1.c3 and LAB-1.3 belong to LAB-1. */
const labOf = (id: string): string => id.replace(/\.(c?\d+)$/, '')

/** A run whose verdict the CLI wrote differently from what its own lines say rejects the receipt (section 10.3, step 3). */
const DISAGREES = /the run says \S+ but its verdict lines say/

/**
 * Read a receipt's text. `claimExists` says whether a claim template is one the course has (section 10.3, step 5).
 * Statement hashes are shown as reported: the tab holds no statement text until the lab bundle import (step 6).
 */
export function readReceipt(text: string, claimExists: (template: string) => boolean): ReadResult {
  const bytes = utf8(text)
  if (bytes.length > RECEIPT_MAX_BYTES) return { ok: false, problems: [`The file is ${bytes.length.toLocaleString('en')} bytes; a receipt is read up to ${RECEIPT_MAX_BYTES.toLocaleString('en')}.`] }
  let value: unknown
  try {
    value = parseJsonSafely(text)
  } catch (e) {
    return { ok: false, problems: [`It is not a receipt: ${e instanceof Error ? e.message : String(e)}.`] }
  }
  const v = validate('receipt', value)
  if (!v.ok) return { ok: false, problems: v.issues.slice(0, 12).map((i) => `${i.instancePath || '(the receipt)'}: ${i.message}`) }
  const receipt = value as Receipt
  const problems: string[] = []
  if (labOf(receipt.stage) !== receipt.lab) problems.push(`stage: ${receipt.stage} is not a stage of ${receipt.lab}.`)
  for (const c of receipt.checks) if (labOf(c.id) !== receipt.lab) problems.push(`checks: ${c.id} is not a check of ${receipt.lab}.`)
  for (const c of receipt.claims ?? []) if (c.template !== undefined && !claimExists(c.template)) problems.push(`claims: the course has no claim template ${c.template}.`)
  const path = receiptPath(receipt)
  const stamps = deriveReceipt(receipt, { source: path })
  for (const p of stamps.problems) if (DISAGREES.test(p)) problems.push(`${p} (the tab read the verdict lines again and they disagree with the receipt).`)
  if (problems.length > 0) return { ok: false, problems }
  return { ok: true, imported: { sha256: sha256Hex(bytes), path, receipt, stamps } }
}

// ------------------------------------------------------------------------------------------ the import event

/** Provenance as the learner declared it on the receipt, in the event's words (OD-8): it sets the event's weight only. */
export function provenanceOf(r: Receipt): LedgerEvent['provenance'] {
  if (r.provenance.agent) return 'agent'
  return r.provenance.assisted === 'none' ? 'own' : 'assisted'
}

/** What a receipt-import event keeps: enough to show each check's latest result without the file. */
export interface ImportData {
  readonly path: string
  readonly lab: string
  readonly stage: string
  readonly lane: Receipt['lane']
  readonly createdAt: string
  readonly checks: ReadonlyArray<{ readonly id: string; readonly pass: boolean }>
  readonly claims: readonly string[]
}

export function importData(imp: ImportedReceipt): ImportData {
  const r = imp.receipt
  return {
    path: imp.path,
    lab: r.lab,
    stage: r.stage,
    lane: r.lane,
    createdAt: r.createdAt,
    checks: r.checks.map((c) => ({ id: c.id, pass: c.pass })),
    claims: (r.claims ?? []).map(claimKey),
  }
}

const isImportData = (d: unknown): d is ImportData => {
  if (d === null || typeof d !== 'object') return false
  const x = d as Record<string, unknown>
  return typeof x.path === 'string' && typeof x.stage === 'string' && typeof x.createdAt === 'string' && Array.isArray(x.checks)
}

/** The receipt-import events of a log, newest receipt first. */
export function importsOf(events: readonly LedgerEvent[]): Array<{ readonly event: LedgerEvent; readonly data: ImportData }> {
  const out: Array<{ event: LedgerEvent; data: ImportData }> = []
  for (const e of events) if (e.kind === 'receipt-import' && isImportData(e.data)) out.push({ event: e, data: e.data })
  return out.sort((a, b) => Date.parse(b.data.createdAt) - Date.parse(a.data.createdAt))
}

/** A check's latest imported result: from the newest receipt that reports it (a newer receipt supersedes an older one). */
export interface CheckResult {
  readonly id: string
  readonly pass: boolean
  readonly lane: Lane
  readonly createdAt: string
  readonly path: string
}

export function latestChecks(events: readonly LedgerEvent[]): ReadonlyMap<string, CheckResult> {
  const out = new Map<string, CheckResult>()
  for (const { data } of importsOf(events)) {
    for (const c of data.checks) {
      if (out.has(c.id)) continue
      out.set(c.id, { id: c.id, pass: c.pass, lane: data.lane === 'self-assessed' ? 'self-assessed' : 'reported', createdAt: data.createdAt, path: data.path })
    }
  }
  return out
}

// ------------------------------------------------------------------------------------------ claim cards

/** A claim the receipt names, by template or by the learner's id. */
export const claimKey = (c: NonNullable<Receipt['claims']>[number]): string => c.template ?? c.id ?? '(unnamed)'

export interface ClaimCard {
  /** The template, such as CL-1.1, or the learner's id when the receipt names no template. */
  readonly key: string
  readonly template?: string
  readonly localId?: string
  /** The receipt that carries the card now: the newest that names it. */
  readonly from: ImportedReceipt
  /** Older receipts that named it, superseded. */
  readonly earlier: readonly ImportedReceipt[]
  /** The strip, or why it could not be built. */
  readonly strip: Strip | null
  readonly stripProblems: readonly string[]
  /** What the receipt's runs earned, stamp or not, for the card's method row. */
  readonly derivations: ReadonlyArray<{ readonly section: string; readonly derivation: Derivation }>
}

/** The primary stamp of the proposition segment: the first item that earned a stamp, else a "modulo" reading. */
function propositionOf(stamps: ReceiptStamps): { primary: Derivation | null; supporting: Stamp[] } {
  const earned = stamps.items.filter((i) => i.derivation.kind === 'stamp' || i.derivation.kind === 'modulo')
  const first = earned[0]?.derivation ?? null
  const supporting = earned.slice(1).flatMap((i) => (i.derivation.kind === 'stamp' ? [i.derivation.stamp] : []))
  return { primary: first, supporting }
}

/** Every claim card the imported receipts mint or update, the newest receipt naming a card carrying it. */
export function claimCards(receipts: readonly ImportedReceipt[], title: (template: string) => string | undefined): ClaimCard[] {
  const newestFirst = [...receipts].sort((a, b) => Date.parse(b.receipt.createdAt) - Date.parse(a.receipt.createdAt))
  const cards = new Map<string, { from: ImportedReceipt; earlier: ImportedReceipt[]; claim: NonNullable<Receipt['claims']>[number] }>()
  for (const imp of newestFirst) {
    for (const c of imp.receipt.claims ?? []) {
      const key = claimKey(c)
      const held = cards.get(key)
      if (held === undefined) cards.set(key, { from: imp, earlier: [], claim: c })
      else if (held.from.sha256 !== imp.sha256) held.earlier.push(imp)
    }
  }
  return [...cards.entries()].map(([key, { from, earlier, claim }]) => {
    const { primary, supporting } = propositionOf(from.stamps)
    const built = buildStrip({
      claim: key,
      title: (claim.template !== undefined ? title(claim.template) : undefined) ?? claim.id ?? key,
      proposition: { primary, supporting },
      correspondence: {},
      requirement: {},
    })
    return {
      key,
      ...(claim.template !== undefined ? { template: claim.template } : {}),
      ...(claim.id !== undefined ? { localId: claim.id } : {}),
      from,
      earlier,
      strip: built.ok ? built.strip : null,
      stripProblems: built.ok ? [] : built.problems,
      derivations: from.stamps.items.map((i) => ({ section: i.section, derivation: i.derivation })),
    }
  })
}

/** The receipts in a list of mirror entries, read again as the main origin re-validates them (section 10.3). */
export function receiptsInMirror(entries: ReadonlyArray<{ readonly path: string; readonly [k: string]: unknown }>, claimExists: (t: string) => boolean): ImportedReceipt[] {
  const out: ImportedReceipt[] = []
  for (const e of entries) {
    if (!e.path.startsWith('receipts/') || typeof e.text !== 'string') continue
    const r = readReceipt(e.text, claimExists)
    if (r.ok) out.push(r.imported)
  }
  return out
}

/** "Z3 5.3.1, cvc5 1.4.2": the tools a receipt names, as the check rows say who ran them. */
export const toolsOf = (r: Receipt): string => [...new Set(r.tools.map((t) => `${t.name} ${t.version}`))].join(', ')

/** 2026-10-25 18:59 UTC. */
export function whenOf(instant: string): string {
  const d = new Date(instant)
  if (Number.isNaN(d.getTime())) return instant
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`
}
