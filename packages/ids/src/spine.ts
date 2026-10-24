// Build the ID registry from docs/spine/SPINE.md. Pure: takes the spine's text, returns
// entries and a list of problems (a table whose shape no longer matches the extraction
// rules is a problem, never a silently shorter registry).

import { allIds, EXACT, idsOfKind, scanLine } from './grammar.ts'
import type { Kind } from './grammar.ts'
import { malformedRows, scanBlocks } from './markdown.ts'
import type { Block, TextBlock } from './markdown.ts'

export type Src = 'spine' | 'evidence'

/** One registry entry: the ID, its kind and section, and the fields its table gives it. */
export interface Entry {
  id: string
  kind: Kind
  /** The section of the defining document ("3.1", "13"). */
  section: string
  src: Src
  title?: string
  name?: string
  tagline?: string
  stage?: string
  tier?: string
  lab?: string
  parent?: string
  seam?: string
  lesson?: string
  wave?: string
  kcs?: string[]
  instruments?: string[]
  generators?: string[]
  specimens?: string[]
  claims?: string[]
  /** Capstone steps: the lab stages a step is built in. */
  builtIn?: string[]
  implements?: string[]
  minutes?: number
  templates?: number
  stretch?: boolean
  threshold?: boolean
  deferred?: boolean
  /** The declared "Used in" or "Stages" cell, verbatim. */
  usedIn?: string | null
  /** The stages that the lesson rows or stage specs give for the same fact (GATE-links compares). */
  stages?: string[]
  status?: 'executed' | 'to-record'
  family?: string
  proposed?: boolean
}

export interface Problem {
  line: number | null
  message: string
}

export const TIERS = ['boot', 'core', 'bridge', 'step']

/**
 * Instruments whose "Used in" also counts the labs a capstone step names under "Built
 * in": spine 9.1 says "for Lane A, the lab stages that name it" (S3's Lane A work is
 * LAB-3.8 to LAB-3.11, named by S10.L1 and S10.L2).
 */
export const LAB_BUILT_IN_INSTRUMENTS: ReadonlySet<string> = new Set(['INS-lane-a'])

/**
 * The paragraphs of a stage spec that reference drawers: "Drawers." lists them and
 * "Sibling bridges." names the prerequisite cards (D-11, D-12, D-21), which are drawers.
 */
export const STAGE_SPEC_DRAWER_LABELS: readonly string[] = ['Drawers', 'Sibling bridges']

/** The stage a lab belongs to: LAB-n is built in S-n, and LAB-10 is the assembly. */
export function stageOfLab(labId: string): string {
  return `S${labId.slice('LAB-'.length)}`
}

/** The stage in a lab, lab stage, lab check or lesson ID, or null. */
export function stageOfRef(id: string): string | null {
  const lab = /^LAB-([0-9]+)/.exec(id)
  if (lab) return `S${lab[1]}`
  const les = /^(S[0-9]+)\./.exec(id)
  return les ? (les[1] as string) : null
}

/** The text after a bold run-in label (`**Drawers.**`) up to the next label or the end. */
export function segmentAfter(text: string, label: string): string | null {
  const start = text.indexOf(`**${label}.**`)
  if (start < 0) return null
  const from = start + label.length + 5
  const next = /\*\*[A-Z][^*]*\.\*\*/.exec(text.slice(from))
  return text.slice(from, next === null ? undefined : from + next.index)
}

/** Drawer IDs in a string, with ranges such as `D-30–D-40` expanded. */
export function drawerIdsIn(text: string): string[] {
  const ids = new Set<string>()
  for (const r of text.matchAll(/D-([0-9]{2})–D-([0-9]{2})/g)) {
    for (let n = Number(r[1]); n <= Number(r[2]); n++) ids.add(`D-${String(n).padStart(2, '0')}`)
  }
  for (const t of scanLine(text)) if (t.kind === 'drawer') ids.add(t.id)
  return [...ids]
}

const sortStages = (set: Iterable<string>): string[] => [...set].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))

const isText = (b: Block): b is TextBlock => b.type === 'text'

/** @param text the spine */
export function buildSpineEntries(text: string): { entries: Entry[]; problems: Problem[] } {
  const blocks = scanBlocks(text)
  const entries: Entry[] = []
  const problems: Problem[] = []
  const problem = (line: number | null, message: string): void => {
    problems.push({ line, message })
  }
  const add = (kind: Kind, id: string, section: string, line: number, extra: Partial<Entry> = {}): void => {
    if (!EXACT[kind].test(id)) problem(line, `${kind} ID "${id}" does not match its format`)
    entries.push({ id, kind, section, src: 'spine', ...extra })
  }

  /** How many tables each extraction rule consumed. */
  const seen: Record<string, number> = {}
  const hit = (rule: string): void => {
    seen[rule] = (seen[rule] ?? 0) + 1
  }
  let currentLab: string | null = null

  for (const b of blocks) {
    if (b.type === 'heading') {
      let m = /^(\d+\.\d+) (S[0-9]+) (.+)$/.exec(b.text)
      if (m && /^3\.\d+$/.test(m[1] as string)) {
        const [title = '', tagline = ''] = (m[3] as string).split(/ — "?/)
        add('stage', m[2] as string, m[1] as string, b.line, { title: title.trim(), tagline: tagline.replace(/"$/, '') })
        continue
      }
      m = /^(W[0-6]) (.+)$/.exec(b.text)
      if (m && b.section === '13') add('wave', m[1] as string, '13', b.line, { title: m[2] as string })
      continue
    }
    if (isText(b)) {
      const lab = /^\*\*Lab (LAB-[0-9]+) — (.+?)\*\*/.exec(b.text)
      if (lab) {
        currentLab = lab[1] as string
        add('lab', currentLab, b.section, b.line, { title: (lab[2] as string).trim() })
      }
      continue
    }

    const t = b
    const [h0, h1, h2, h3] = t.header
    const sec = t.section
    for (const r of malformedRows(t)) {
      problem(r.line, `table row has ${r.cells.length} cells, the header has ${t.header.length}`)
    }

    if (sec === '1.1' && h0 === '#' && h1 === 'Invariant') {
      hit('invariants')
      for (const r of t.rows) add('invariant', r.cells[0] as string, sec, r.line, { name: r.cells[1] })
    } else if (sec === '1.2' && h0 === '#' && h1 === 'Decision adopted') {
      hit('owner-decisions')
      for (const r of t.rows) add('owner-decision', r.cells[0] as string, sec, r.line)
    } else if (/^3\.\d+$/.test(sec) && h0 === 'ID' && h1 === 'Tier') {
      hit('lessons')
      const stage = `S${sec.slice(2)}`
      const col = (name: string): number => t.header.indexOf(name)
      const cIns = col('Instruments')
      const cGen = col('Generators')
      const cKc = col('KCs')
      const cSpec = col('Specimens · claims')
      const cBuilt = col('Built in · gate')
      for (const [name, i] of Object.entries({ Instruments: cIns, Generators: cGen, KCs: cKc, 'Specimens · claims': cSpec })) {
        if (i < 0) problem(t.line, `lesson table in §${sec} has no "${name}" column`)
      }
      for (const r of t.rows) {
        const c = r.cells
        const id = c[0] as string
        const tier = c[1] as string
        if (!TIERS.includes(tier)) problem(r.line, `lesson ${id} has unknown tier "${tier}"`)
        if (stageOfRef(id) !== stage) problem(r.line, `lesson ${id} sits in the table of ${stage}`)
        const extra: Partial<Entry> = {
          stage,
          tier,
          title: c[2],
          kcs: idsOfKind(c[cKc] ?? '', 'kc'),
          instruments: idsOfKind(c[cIns] ?? '', 'instrument'),
          generators: idsOfKind(c[cGen] ?? '', 'generator'),
          specimens: idsOfKind(c[cSpec] ?? '', 'specimen'),
          claims: idsOfKind(c[cSpec] ?? '', 'claim-template'),
        }
        if (cBuilt >= 0) extra.builtIn = idsOfKind(c[cBuilt] ?? '', 'lab-stage')
        add('lesson', id, sec, r.line, extra)
      }
    } else if (/^3\.\d+$/.test(sec) && h0 === 'Stage' && h1 === 'Title' && h3 === 'Check') {
      hit('lab-stages')
      if (currentLab === null) problem(t.line, 'lab stage table with no preceding "**Lab LAB-n —" paragraph')
      for (const r of t.rows) {
        const [id = '', title = '', min = '', check = ''] = r.cells
        const lab = /^(LAB-[0-9]+)\./.exec(id)?.[1] ?? null
        if (lab !== currentLab) problem(r.line, `lab stage ${id} sits under ${currentLab}`)
        add('lab-stage', id, sec, r.line, {
          lab: lab ?? '',
          title,
          minutes: Number.parseInt(min, 10),
          stretch: title.startsWith('`[stretch]`'),
        })
        const ck = /^(LAB-[0-9]+\.c[0-9]+)\b/.exec(check)
        if (ck) {
          const checkId = ck[1] as string
          if (checkId.replace('.c', '.') !== id) problem(r.line, `check ${checkId} sits in the row of ${id}`)
          add('lab-check', checkId, sec, r.line, { lab: lab ?? '', stage: id })
        } else if (check !== '—') {
          problem(r.line, `the check cell of ${id} starts with neither a check ID nor "—"`)
        }
      }
    } else if (sec === '3.12' && h0 === 'ID' && h1 === 'Drawer') {
      hit('drawers')
      for (const r of t.rows) {
        const [id = '', title = '', usedIn = ''] = r.cells
        const deferred = /^deferred/.test(usedIn)
        if (deferred !== Number(id.slice(2)) >= 30) problem(r.line, `drawer ${id}: "deferred" and the D-30+ range disagree`)
        add('drawer', id, sec, r.line, { title, usedIn, deferred })
      }
    } else if (sec === '4' && h0 === 'ID' && h1 === 'Name') {
      hit('kcs')
      for (const r of t.rows) {
        const [id = '', name = '', stage = '', thr = ''] = r.cells
        if (`S${/^KC-([0-9]+)\./.exec(id)?.[1]}` !== stage) problem(r.line, `${id} is listed under ${stage}`)
        add('kc', id, sec, r.line, { name, stage, threshold: thr === 'threshold' })
      }
    } else if (sec === '5.1' && h0 === 'ID' && h1 === 'Specimen') {
      hit('specimens')
      for (const r of t.rows) add('specimen', r.cells[0] as string, sec, r.line, { lesson: r.cells[2] })
    } else if (sec === '5.2' && h0 === 'ID' && h1 === 'Proposition (short)') {
      hit('claim-templates')
      for (const r of t.rows) add('claim-template', r.cells[0] as string, sec, r.line)
    } else if (sec === '5.3' && h0 === 'ID' && h1 === 'Assumption') {
      hit('seams')
      for (const r of t.rows) add('seam', r.cells[0] as string, sec, r.line)
    } else if (sec === '5.4' && h0 === 'ID' && h1 === 'Seam') {
      hit('erosions')
      for (const r of t.rows) add('erosion', r.cells[0] as string, sec, r.line, { seam: r.cells[1] })
    } else if (sec === '6.1' && h0 === 'Class') {
      hit('gap-classes')
      for (const r of t.rows) {
        const [id = '', , name = '', subclasses = ''] = r.cells
        add('gap-class', id, sec, r.line, { name })
        for (const sub of idsOfKind(subclasses, 'gap-class')) {
          if (!sub.startsWith(id) || sub === id) problem(r.line, `subclass ${sub} under ${id}`)
          add('gap-class', sub, sec, r.line, { parent: id })
        }
      }
    } else if (sec === '6.2' && h0 === 'ID' && h1 === 'Stage') {
      hit('anchors')
      for (const r of t.rows) add('anchor', r.cells[0] as string, sec, r.line, { stage: r.cells[1] })
    } else if (sec === '7' && h0 === 'ID' && h1 === 'Purpose') {
      hit('mechanics')
      for (const r of t.rows) add('mechanic', r.cells[0] as string, sec, r.line)
    } else if (sec === '8.3' && h0 === 'ID' && h1 === 'Learner produces') {
      hit('generators')
      for (const r of t.rows) {
        add('generator', r.cells[0] as string, sec, r.line, { templates: Number.parseInt(r.cells[3] as string, 10), usedIn: r.cells[4] })
      }
    } else if (sec === '9.1' && h0 === 'ID' && h2 === 'Used in') {
      hit('tab-instruments')
      for (const r of t.rows) add('instrument', r.cells[0] as string, sec, r.line, { usedIn: r.cells[2] })
    } else if (sec === '9.2' && h0 === 'ID' && h1 === 'Engine and pin') {
      hit('bench-instruments')
      for (const r of t.rows) add('instrument', r.cells[0] as string, sec, r.line, { usedIn: null })
    } else if (sec === '9.5' && h0 === 'Run') {
      hit('executed-runs')
      for (const r of t.rows) add('run', r.cells[0] as string, sec, r.line, { status: 'executed' })
    } else if (sec === '10.1' && h0 === 'ID' && h1 === 'Purpose') {
      hit('screens')
      for (const r of t.rows) add('screen', r.cells[0] as string, sec, r.line)
    } else if (sec === '11.2' && h0 === 'ID' && h1 === 'Checks') {
      hit('gates')
      for (const r of t.rows) add('gate', r.cells[0] as string, sec, r.line)
    } else if (sec === '12.1' && h0 === 'Change') {
      hit('brief-changes')
      for (const r of t.rows) {
        const m = /^(V2-[0-9]{2}) (.*)$/.exec(r.cells[0] as string)
        if (m === null) problem(r.line, `brief change cell "${(r.cells[0] as string).slice(0, 30)}" does not start with a V2 ID`)
        else add('brief-change', m[1] as string, sec, r.line, { title: m[2] })
      }
    } else if (sec === '13' && h0 === 'Task') {
      hit('tasks')
      const cImpl = t.header.indexOf('Implements')
      for (const r of t.rows) {
        const id = r.cells[0] as string
        add('task', id, sec, r.line, { wave: id.slice(0, 2), title: r.cells[1], implements: allIds(r.cells[cImpl] ?? '') })
      }
    }
  }

  // "To record": every RUN ID named in the bullets under "**To record**" in §9.5.
  const runs = new Map(entries.filter((e) => e.kind === 'run').map((e) => [e.id, e]))
  let recording = false
  for (const b of blocks) {
    if (b.type === 'heading') recording = false
    if (!isText(b) || b.section !== '9.5') continue
    if (b.text.startsWith('**To record**')) recording = true
    if (!recording) continue
    for (const id of idsOfKind(b.text, 'run')) {
      if (runs.has(id)) {
        if (runs.get(id)?.status === 'executed') problem(b.line, `${id} is listed as executed and as to be recorded`)
        continue
      }
      add('run', id, '9.5', b.line, { status: 'to-record' })
      runs.set(id, entries[entries.length - 1] as Entry)
    }
  }

  // Derived "Used in": the stages whose lesson rows (or stage specs) use each instrument,
  // generator and drawer. GATE-links compares these with the declared cells of 9.1, 8.3 and 3.12.
  const lessons = entries.filter((e) => e.kind === 'lesson')
  for (const e of entries) {
    if (e.kind === 'instrument' && e.section === '9.1') {
      const st = new Set<string>()
      for (const l of lessons) {
        if (!l.instruments?.includes(e.id)) continue
        st.add(l.stage ?? '')
        if (LAB_BUILT_IN_INSTRUMENTS.has(e.id)) for (const b of l.builtIn ?? []) st.add(stageOfRef(b) ?? '')
      }
      e.stages = sortStages(st)
    }
    if (e.kind === 'generator') {
      e.stages = sortStages(new Set(lessons.filter((l) => l.generators?.includes(e.id)).map((l) => l.stage ?? '')))
    }
  }
  const drawerStages = new Map<string, Set<string>>()
  for (const b of blocks) {
    const num = isText(b) ? /^3\.([0-9]+)$/.exec(b.section) : null
    if (num === null || !isText(b) || Number(num[1]) < 1 || Number(num[1]) > 10) continue
    for (const label of STAGE_SPEC_DRAWER_LABELS) {
      const seg = segmentAfter(b.text, label)
      if (seg === null) continue
      for (const id of drawerIdsIn(seg)) {
        const stages = drawerStages.get(id) ?? new Set<string>()
        stages.add(`S${num[1]}`)
        drawerStages.set(id, stages)
      }
    }
  }
  for (const e of entries) if (e.kind === 'drawer') e.stages = sortStages(drawerStages.get(e.id) ?? [])

  // Each extraction rule must have found its tables.
  const expected: Record<string, number> = {
    invariants: 1, 'owner-decisions': 1, lessons: 10, 'lab-stages': 10, drawers: 1, kcs: 1, specimens: 1,
    'claim-templates': 1, seams: 1, erosions: 1, 'gap-classes': 1, anchors: 1, mechanics: 1, generators: 1,
    'tab-instruments': 1, 'bench-instruments': 1, 'executed-runs': 1, screens: 1, gates: 1, 'brief-changes': 1,
    tasks: 7,
  }
  for (const [rule, n] of Object.entries(expected)) {
    if ((seen[rule] ?? 0) !== n) problem(null, `expected ${n} table(s) for "${rule}", found ${seen[rule] ?? 0}`)
  }

  // Uniqueness, and the references between registry entries.
  const byId = new Map<string, Entry>()
  for (const e of entries) {
    const first = byId.get(e.id)
    if (first !== undefined) problem(null, `ID ${e.id} is defined twice (§${first.section} and §${e.section})`)
    else byId.set(e.id, e)
  }
  for (const e of entries) {
    const need = (field: 'stage' | 'lab' | 'seam', kind: Kind): void => {
      const ref = e[field] ?? ''
      if (byId.get(ref)?.kind !== kind) problem(null, `${e.id}: ${field} "${ref}" is not a ${kind}`)
    }
    if (e.kind === 'lesson' || e.kind === 'kc' || e.kind === 'anchor') need('stage', 'stage')
    if (e.kind === 'lab-stage') need('lab', 'lab')
    if (e.kind === 'erosion') need('seam', 'seam')
  }
  return { entries, problems }
}
