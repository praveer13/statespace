// The audit pool's reader (content/audit/README.md): one anchor per content/audit/AUD-n.k.yaml, read strictly,
// checked against the registry and the runs, and normalized into the shape the Audit Desk loads (audit-types.ts).
// The checks here are the ones the Desk cannot run without: a key it can score, texts and line references it can
// draw, scenarios with answers, and keys and answers that a recorded run states. GATE-audit
// (scripts/verify-audit.mjs, scripts/spikes/W1-T40/lib/pool.mjs) holds the rest of the pool contract: the spine's
// classes and key runs, operators, exemplars, the "based on" card's sources, the keying battery.

import type { RegistryIndex } from './registry.ts'
import { readYaml } from './records.ts'
import { fingerprint } from './hash.ts'
import type { PageProblem } from './types.ts'
import type { AuditAnchor, AuditCase, AuditKey, AuditPool, AuditScenario, LineRef, TextPart } from './audit-types.ts'
import { AUDIT_FORMAT } from './audit-types.ts'

export interface AuditContext {
  index: RegistryIndex
  /** The run records by ID. */
  runs: ReadonlyMap<string, unknown>
}

export interface AuditResult {
  anchor: AuditAnchor | null
  problems: PageProblem[]
}

const ANCHOR_ID = /^AUD-[1-9][0-9]*\.[1-9][0-9]*$/
const CASE_ID = /^[a-z0-9][a-z0-9-]*$/
const LINE_REF = /^(statement|diff|receipt):([1-9][0-9]*)$/
const KINDS: Record<string, 'rebutting' | 'undermining' | 'undercutting'> = {
  G1: 'rebutting', G2: 'rebutting', G3: 'rebutting', G12: 'rebutting',
  G4: 'undermining', G5: 'undermining', G6: 'undermining', G7: 'undermining', G11: 'undermining',
  G8: 'undercutting', G9: 'undercutting', G10: 'undercutting', G13: 'undercutting',
}

const isObj = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x)
const str = (x: unknown): string | null => (typeof x === 'string' && x.trim() !== '' ? x : null)
const strList = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : typeof x === 'string' ? [x] : [])

/** A text field as its lines: one trailing line end removed, so a block scalar's last newline adds no line. */
export function auditLines(text: unknown): string[] {
  if (typeof text !== 'string' || text === '') return []
  return text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n')
}

/** Every verdict line a run states: its own and those of each configuration, with the configuration's id. */
function verdictLines(run: unknown): Array<{ config: string | null; line: string }> {
  const out: Array<{ config: string | null; line: string }> = []
  if (!isObj(run)) return out
  for (const l of strList(run.verdict_lines)) out.push({ config: null, line: l })
  for (const c of Array.isArray(run.configs) ? run.configs : []) {
    if (!isObj(c)) continue
    for (const l of strList(c.verdict_lines)) out.push({ config: typeof c.id === 'string' ? c.id : null, line: l })
  }
  return out
}

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim()
const WORD = /[A-Za-z0-9_]/

/** Whether a key line is stated by a verdict line, as GATE-audit reads it: no word character touching either end. */
export function lineStates(verdictLine: string, keyLine: string): boolean {
  const hay = squash(verdictLine)
  const needle = squash(keyLine)
  if (needle === '') return false
  for (let from = 0; ; ) {
    const at = hay.indexOf(needle, from)
    if (at < 0) return false
    const before = at === 0 ? '' : hay.charAt(at - 1)
    const after = hay.charAt(at + needle.length)
    const ok = (ch: string, inner: string): boolean => ch === '' || !WORD.test(ch) || !WORD.test(inner)
    if (ok(before, needle.charAt(0)) && ok(after, needle.charAt(needle.length - 1))) return true
    from = at + 1
  }
}

/** The top-level class of a class or subclass (G6c to G6), from the registry; null for an unknown ID. */
function topOf(index: RegistryIndex, c: string): string | null {
  const e = index.entry(c)
  if (e?.kind !== 'gap-class') return null
  return (e as { parent?: string }).parent ?? e.id
}

/** Compile one anchor file. */
export function compileAudit(text: string, file: string, ctx: AuditContext): AuditResult {
  const problems: PageProblem[] = []
  const read = readYaml(text)
  problems.push(...read.problems)
  if (read.problems.some((p) => p.severity === 'error')) return { anchor: null, problems }
  const line = (pointer: string): number | null => read.lines.get(pointer) ?? null
  const error = (code: string, message: string, pointer = ''): void => void problems.push({ severity: 'error', code, message, line: line(pointer) })
  const warn = (code: string, message: string, pointer = ''): void => void problems.push({ severity: 'warning', code, message, line: line(pointer) })
  const doc = read.value
  if (!isObj(doc)) {
    error('audit-file', 'an anchor file holds one mapping: the anchor')
    return { anchor: null, problems }
  }
  const id = str(doc.id)
  const stem = /([^/]+)\.ya?ml$/.exec(file)?.[1]
  if (id === null || !ANCHOR_ID.test(id)) {
    error('audit-anchor', `id must be an anchor ID (AUD-n.k), got ${JSON.stringify(doc.id ?? null)}`, '/id')
    return { anchor: null, problems }
  }
  if (stem !== id) error('audit-anchor', `${id} lives in a file named after another ID; write it to content/audit/${id}.yaml`, '/id')
  if (!ctx.index.has('anchor', id)) error('audit-anchor', `${id} is not an audit anchor of the spine (section 6.2)`, '/id')
  const stage = str(doc.stage)
  if (stage === null || !ctx.index.has('stage', stage)) error('audit-anchor', `stage must be a stage ID (S1-S10), got ${JSON.stringify(doc.stage ?? null)}`, '/stage')
  const klass = str(doc.class)
  if (klass === null || (klass !== 'none' && topOf(ctx.index, klass) === null)) error('audit-anchor', `class must be a gap class of spine section 6.1 or none, got ${JSON.stringify(doc.class ?? null)}`, '/class')
  for (const f of ['medium', 'artifact', 'subject', 'claim', 'requirement', 'scenario_question'] as const) {
    if (str(doc[f]) === null) error('audit-fields', `${f} is missing`, `/${f}`)
  }
  const scheduledAfter = strList(doc.scheduled_after)
  if (scheduledAfter.length === 0) error('audit-fields', 'scheduled_after lists the labs, lab stages or lessons the anchor is served after (AUDIT-DESK 5.1)', '/scheduled_after')
  for (const u of scheduledAfter) if (!['lab', 'lab-stage', 'lesson'].some((k) => ctx.index.has(k as 'lab', u))) error('audit-fields', `scheduled_after names ${u}, which is not a lab, lab stage or lesson`, '/scheduled_after')
  const kcs = strList(doc.kcs)
  for (const k of kcs) if (!ctx.index.has('kc', k)) error('audit-fields', `${k} is not a KC of the registry`, '/kcs')
  const b = isObj(doc.based_on) ? doc.based_on : null
  if (b === null || str(b.incident) === null || str(b.date) === null || str(b.date_marks) === null || strList(b.source).length === 0) {
    error('audit-based-on', 'based_on needs incident, date (quoted), date_marks and source', '/based_on')
  }

  const anchor: AuditAnchor = {
    id,
    stage: stage ?? '',
    class: klass ?? '',
    medium: str(doc.medium) ?? '',
    artifact: str(doc.artifact) ?? '',
    subject: str(doc.subject) ?? '',
    claim: str(doc.claim) ?? '',
    requirement: (str(doc.requirement) ?? '').trim(),
    scenarioQuestion: str(doc.scenario_question) ?? '',
    scheduledAfter,
    kcs,
    basedOn: { incident: str(b?.incident) ?? '', date: str(b?.date) ?? '', dateMarks: str(b?.date_marks) ?? '', source: strList(b?.source) },
    cases: [],
    variantsPending: null,
  }

  const ids = new Set<string>()
  const caseOf = (raw: unknown, kind: 'member' | 'variant', pointer: string): void => {
    if (!isObj(raw)) return error('audit-case', `${pointer} is not a mapping`, pointer)
    const cid = str(raw.id)
    if (cid === null || !CASE_ID.test(cid)) return error('audit-case', `${pointer}: a case needs an id (lower case, digits, hyphens)`, `${pointer}/id`)
    if (ids.has(cid)) return error('audit-case', `the case id ${cid} is used twice`, `${pointer}/id`)
    ids.add(cid)
    const at = (p: string): string => `${pointer}/${p}`
    const ref = `${id}/${cid}`
    // the key
    let key: AuditKey | null = null
    const k = raw.key
    if (k === 'none' || k === 'none: sound' || (isObj(k) && k.class === 'none')) key = { truth: 'sound' }
    else {
      const c = typeof k === 'string' ? k : isObj(k) ? str(k.class) : null
      const also = isObj(k) ? strList(k.also) : []
      const top = c === null ? null : topOf(ctx.index, c)
      if (c === null || top === null) error('audit-key', `${ref}: key is none, a gap class, or {class, also}`, at('key'))
      else {
        const bad = also.filter((a) => topOf(ctx.index, a) === null)
        if (bad.length > 0) error('audit-key', `${ref}: ${bad.join(', ')} is not a gap class`, at('key'))
        const acceptableTop = [...new Set([c, ...also].map((x) => topOf(ctx.index, x)).filter((x): x is string => x !== null))]
        key = { truth: 'flawed', class: c, also: also.filter((a) => a !== c), top, acceptableTop }
      }
    }
    // the texts
    const statement = auditLines(raw.statement)
    const diff = auditLines(raw.diff)
    const receipt = auditLines(raw.receipt)
    if (statement.length === 0) error('audit-case', `${ref}: statement is missing; the Desk shows it first`, at('statement'))
    if (diff.length === 0) error('audit-case', `${ref}: diff is missing; the Desk reveals it at step 2`, at('diff'))
    if (str(raw.description) === null) error('audit-case', `${ref}: description (the agent's description of its change) is missing`, at('description'))
    if (str(raw.explain) === null) warn('audit-case', `${ref}: explain (what the key means, shown after filing) is missing`, at('explain'))
    const texts: Record<TextPart, string[]> = { statement, diff, receipt }
    // the evidence
    const ev = isObj(raw.evidence) ? raw.evidence : null
    const evType = str(ev?.type) ?? ''
    const loadBearing: LineRef[] = []
    for (const r of strList(ev?.load_bearing)) {
      const m = LINE_REF.exec(r)
      const l = m === null ? undefined : texts[m[1] as TextPart][Number(m[2]) - 1]
      if (m === null || l === undefined || l.trim() === '') error('audit-evidence', `${ref}: load_bearing ${r} is not a non-blank line of the case's statement, diff or receipt`, at('evidence'))
      else loadBearing.push(r as LineRef)
    }
    if (key?.truth === 'sound' && evType !== 'restatement') error('audit-evidence', `${ref}: a sound case's evidence is its restatement`, at('evidence'))
    if (key?.truth === 'flawed' && (loadBearing.length < 1 || loadBearing.length > 3)) error('audit-evidence', `${ref}: a flawed case lists 1 to 3 load-bearing lines`, at('evidence'))
    // the restatement: step 3's scenarios, every answer stated by the restatement's run
    const rs = isObj(raw.restatement) ? raw.restatement : null
    const rsRun = str(rs?.run) ?? ''
    const scenarios: AuditScenario[] = []
    const rsLines = verdictLines(ctx.runs.get(rsRun))
    if (rs === null) error('audit-restatement', `${ref}: restatement {run, scenarios} is missing; every case answers step 3`, at('restatement'))
    else if (!ctx.runs.has(rsRun)) error('audit-restatement', `${ref}: restatement.run ${JSON.stringify(rsRun)} is not a recorded run`, at('restatement'))
    ;(Array.isArray(rs?.scenarios) ? rs.scenarios : []).forEach((s: unknown, i: number) => {
      if (!isObj(s) || str(s.text) === null || typeof s.answer !== 'boolean' || str(s.key_line) === null) {
        return error('audit-restatement', `${ref}: scenario ${i + 1} needs text, answer (true or false), key_line and why`, at('restatement'))
      }
      const keyLine = s.key_line as string
      if (rsLines.length > 0 && !rsLines.some((l) => lineStates(l.line, keyLine))) error('audit-restatement', `${ref}: ${rsRun} states no line ${JSON.stringify(keyLine)}`, at('restatement'))
      scenarios.push({ id: str(s.id) ?? `s${i + 1}`, text: s.text as string, answer: s.answer, why: str(s.why) ?? '', keyLine })
    })
    if (rs !== null && scenarios.length < 3) error('audit-restatement', `${ref}: a restatement holds at least three scenarios`, at('restatement'))
    const receiptRun = str(raw.receipt_run) ?? rsRun
    if (receipt.length > 0 && ctx.runs.has(receiptRun)) {
      const rl = verdictLines(ctx.runs.get(receiptRun))
      const log = rl.map((l) => l.line)
      for (const [i, l] of receipt.entries()) if (!log.some((v) => squash(v) === squash(l))) warn('audit-receipt', `${ref}: receipt line ${i + 1} is not a verdict line of ${receiptRun}; a receipt is copied from its run, never typed`, at('receipt'))
    }
    // the key run
    const keyRun = str(raw.key_run) ?? ''
    const keyLines: Array<{ config: string | null; line: string }> = (Array.isArray(raw.key_lines) ? raw.key_lines : []).flatMap((x: unknown) =>
      typeof x === 'string' ? [{ config: null, line: x }] : isObj(x) && typeof x.line === 'string' ? [{ config: str(x.config), line: x.line }] : [],
    )
    if (!ctx.runs.has(keyRun)) error('audit-key-run', `${ref}: key_run ${JSON.stringify(keyRun)} is not a recorded run; every key is set by one`, at('key_run'))
    else {
      if (keyLines.length === 0) error('audit-key-run', `${ref}: key_lines quotes the verdict lines of ${keyRun} that set the key`, at('key_lines'))
      const lines = verdictLines(ctx.runs.get(keyRun))
      for (const kl of keyLines) {
        const pool = kl.config === null ? lines : lines.filter((l) => l.config === kl.config)
        if (!pool.some((l) => lineStates(l.line, kl.line))) error('audit-key-run', `${ref}: ${keyRun}${kl.config ? ` (${kl.config})` : ''} states no verdict line ${JSON.stringify(kl.line)}`, at('key_lines'))
      }
    }
    if (key === null) return
    const out: Omit<AuditCase, 'rev'> = {
      ref,
      id: cid,
      kind,
      pair: `${id}/${kind === 'member' ? (str(raw.pair) ?? 'pair') : (str(raw.pair) ?? cid)}`,
      operator: str(raw.operator) ?? (kind === 'member' ? 'anchor' : ''),
      medium: str(raw.medium) ?? anchor.medium,
      artifact: str(raw.artifact) ?? anchor.artifact,
      claim: str(raw.claim) ?? anchor.claim,
      description: str(raw.description) ?? '',
      statement,
      diff,
      receipt,
      receiptRun: str(raw.receipt_run) ?? rsRun,
      key,
      evidence: { type: evType, loadBearing },
      restatement: { run: rsRun, scenarios },
      keyRun,
      keyLines: keyLines.map((l) => l.line),
      explain: str(raw.explain) ?? '',
    }
    anchor.cases.push({ ...out, rev: fingerprint(out) })
  }
  const members = Array.isArray(doc.cases) ? doc.cases : []
  members.forEach((c: unknown, i: number) => caseOf(c, 'member', `/cases/${i}`))
  if (!anchor.cases.some((c) => c.kind === 'member' && c.key.truth === 'sound') || !anchor.cases.some((c) => c.kind === 'member' && c.key.truth === 'flawed')) {
    error('audit-pair', `${id}: cases holds the pair: one sound member and one flawed member at least`, '/cases')
  }
  if (Array.isArray(doc.variants)) doc.variants.forEach((c: unknown, i: number) => caseOf(c, 'variant', `/variants/${i}`))
  else if (isObj(doc.variants) && isObj(doc.variants.pending) && str(doc.variants.pending.lands) !== null) anchor.variantsPending = doc.variants.pending.lands as string
  else error('audit-fields', `${id}: variants lists the variant pairs, or says when they land: {pending: {lands: W2-T13}}`, '/variants')
  // one claim per pair: the wording comes from one phrase bank, so it cannot cue the key (AUDIT-DESK 5.3)
  const claims = new Map<string, Set<string>>()
  for (const c of anchor.cases) claims.set(c.pair, (claims.get(c.pair) ?? new Set()).add(c.claim))
  for (const [p, set] of claims) if (set.size > 1) error('audit-pair', `${p}: the members of a pair carry one claim`, '/cases')
  return { anchor, problems }
}

/** The pool file's contents: the class list from the registry, the anchors in ID order, and the runs they cite. */
export function auditPool(index: RegistryIndex, anchors: readonly AuditAnchor[], runs: ReadonlyMap<string, unknown>): AuditPool {
  const classes = index
    .byKind('gap-class')
    .filter((e) => (e as { parent?: string }).parent === undefined)
    .map((e) => ({ id: e.id, name: (e as { name?: string }).name ?? e.id, kind: KINDS[e.id] ?? 'rebutting' }))
    .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)))
  const cited: AuditPool['runs'] = {}
  for (const a of anchors) {
    for (const c of a.cases) {
      for (const r of [c.keyRun, c.restatement.run, c.receiptRun]) {
        const rec = runs.get(r)
        if (!isObj(rec)) continue
        cited[r] = { engine: str(rec.engine), version: str(rec.version), image: str(rec.image) }
      }
    }
  }
  return { format: AUDIT_FORMAT, classes, anchors: [...anchors], runs: cited }
}
