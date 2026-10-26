// The audit pool the content build writes and the Audit Desk loads (content/audit/README.md; docs/AUDIT-DESK.md
// sections 3, 5 and 6). Types and the format name only, so the site imports them without the reader or the checks.

export const AUDIT_FORMAT = 'statespace audit pool, revision 1'

/** The thirteen gap classes, G1 to G13 (spine section 6.1). A subclass (G6c) rolls up to its class for scoring. */
export type GapClass = `G${number}`

/** A text the Desk shows with numbered lines: the statement, the diff or the receipt. */
export type TextPart = 'statement' | 'diff' | 'receipt'

/** A line reference, 1-based: `statement:6`, `diff:13`, `receipt:2`. */
export type LineRef = `${TextPart}:${number}`

/** One step-3 scenario: does the statement, as written, ...? `answer` is the engine's, from `keyLine` of the run. */
export interface AuditScenario {
  id: string
  text: string
  answer: boolean
  why: string
  /** The verdict line of the restatement's run that sets the answer, copied from the run. */
  keyLine: string
}

/** The key a checker computed: sound, or a primary class and the classes a finding may also name (AUDIT-DESK 2.4). */
export type AuditKey = { truth: 'sound' } | { truth: 'flawed'; class: string; also: string[]; top: string; acceptableTop: string[] }

export interface AuditCase {
  /** `AUD-1.1/sound`: what an audit event's ref names after `audit:`. */
  ref: string
  id: string
  kind: 'member' | 'variant'
  /** `AUD-1.1/pair` or `AUD-1.1/v1`: the two members of a pair never share a scored session (AUDIT-DESK 5.3). */
  pair: string
  operator: string
  medium: string
  artifact: string
  /** The agent's claim, quoted and never stamped (I8). One claim per pair. */
  claim: string
  /** The agent's description of its change, shown with the diff (AUDIT-DESK 5.4, step 2). */
  description: string
  statement: string[]
  diff: string[]
  receipt: string[]
  /** The run the receipt's lines are copied from: `receipt_run`, else the restatement's run. */
  receiptRun: string
  key: AuditKey
  /** The evidence a finding carries (AUDIT-DESK 6.3); a sound case's is its restatement. */
  evidence: { type: string; loadBearing: LineRef[] }
  restatement: { run: string; scenarios: AuditScenario[] }
  keyRun: string
  keyLines: string[]
  /** The explanation shown after filing, beside the key. */
  explain: string
  /** A fingerprint of the case as graded: an audit event's itemRev. */
  rev: string
}

export interface AuditAnchor {
  id: string
  stage: string
  class: string
  medium: string
  artifact: string
  /** What a list may say about the anchor: a subject, never its gap (AUDIT-DESK 5.3, item 7). */
  subject: string
  claim: string
  /** The requirement the claim is measured against. */
  requirement: string
  /** The step-3 question every case of the anchor asks of its scenarios. */
  scenarioQuestion: string
  scheduledAfter: string[]
  kcs: string[]
  basedOn: { incident: string; date: string; dateMarks: string; source: string[] }
  cases: AuditCase[]
  /** The tracker task its variants land with, when spine section 6 ships the anchor without them. */
  variantsPending: string | null
}

/** content/audit.<hash>.json */
export interface AuditPool {
  format: string
  /** G1 to G13 with the spine's names, in order: the Desk's class radios. */
  classes: Array<{ id: string; name: string; kind: 'rebutting' | 'undermining' | 'undercutting' }>
  anchors: AuditAnchor[]
  /** Every run a case or a scenario cites, with its engine and version, for the receipts' lane badges. */
  runs: Record<string, { engine: string | null; version: string | null; image: string | null }>
}
