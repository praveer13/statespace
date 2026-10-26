// The per-lesson Markdown for the learner's own agent (ARCHITECTURE.md sections 3.3 and 12.4): the page as reading
// text at a stable URL, so the learner's agent can read it. It carries what the learner reads before committing a
// call, and never what the call is for: no key, no "why", no misconception, no text that follows the first run.
// A static site cannot hide its oracles (ASSESSMENT.md section 7.5), and the Markdown is not where the course
// hands them out. Reference forms become plain words, and a value is already printed. A run is named by its ID and
// its engine and version, as the page's title block names it, and never by its title, its verdict lines or its
// values: a run's title says what the run found, which is the answer to a call the page asks for.
//
// Boot says "result" where every other page says "run": the spine introduces the word with S1.L1 (spine section 0).

import type { Lesson, LessonBlock, LessonCardBlock, LessonChoice } from '@statespace/schema'
import { tierFormat } from './blocks.ts'
import { DRAFT_BANNER } from './draft.ts'
import type { RegistryIndex } from './registry.ts'

const CARD_LABELS: Record<LessonCardBlock['variant'], string> = {
  'build-this': 'Build this',
  twin: 'Production twin',
  'dated-incident': 'Dated incident',
  'feels-harder': 'This will feel harder',
  reading: 'Reading',
}

const ROLE_LABELS = { prequestion: 'before the segment', segment: 'ends the segment', exit: 'exit question' } as const

/** Footnote labels are unique inside one Markdown document: prefix each block's with where it sits. */
function footnotes(md: string, prefix: string): string {
  return md.replace(/\[\^([^\]\s]+)\]/g, (_m, label: string) => `[^${prefix}${label}]`)
}

/** The words that name a run: "result" in Boot, which comes before the course introduces "run", and "run" everywhere else. */
interface Words {
  recorded: string
  cited: string
  ref: string
  callHead: string
  afterFirst: string
  tap: string
}

function wordsOf(page: { tier?: string }): Words {
  return page.tier === 'boot'
    ? { recorded: 'Recorded result', cited: 'Results cited', ref: 'result', callHead: 'Your call before you see the result', afterFirst: 'Text that follows the first result is left out here.', tap: 'After the result' }
    : { recorded: 'Recorded run', cited: 'Runs cited', ref: 'run', callHead: 'Your call before the first run', afterFirst: 'Text that follows the first run is left out here.', tap: 'After a run' }
}

/** Reference forms in prose, as words: a run as "(run RUN-id)", or "(result RUN-id)" in Boot, and a fact as its value. */
export function plainRefs(md: string, page: Lesson): string {
  const word = wordsOf(page).ref
  return md
    .replace(/\s*\{\{run:(RUN-[a-z0-9-]+)#[^}]*\}\}/g, (_m, id: string) => ` (a value from ${id}, which is not recorded yet)`)
    .replace(/\s*\{\{run:(RUN-[a-z0-9-]+)\}\}/g, (_m, id: string) => ` (${word} ${id})`)
    .replace(/\{\{fact:([^}]+)\}\}/g, (_m, id: string) => {
      const fact = page.facts?.[id.trim()]
      return fact?.value === undefined ? id.trim() : String(fact.value)
    })
}

function choice(c: LessonChoice, page: Lesson): string[] {
  return [plainRefs(c.prompt, page), '', ...c.options.map((o) => `- ${o.id}. ${plainRefs(o.text, page)}`)]
}

function block(b: LessonBlock, page: Lesson, prefix: string): string[] {
  const words = wordsOf(page)
  switch (b.type) {
    case 'prose':
      return [plainRefs(footnotes(b.md, prefix), page)]
    case 'item': {
      const head = `**Question** (${ROLE_LABELS[b.role]})`
      if (b.choice === undefined) return [`${head}: a fresh practice question, made and checked by a tool each time you meet it, so no fixed answer is printed here.`]
      return [`${head}:`, '', ...choice(b.choice, page)]
    }
    case 'instrument': {
      const out = [`**Cell ${b.cell}** (${b.ins})`]
      if (b.md !== undefined) out.push('', plainRefs(footnotes(b.md, prefix), page))
      if (b.direction !== undefined) out.push('', plainRefs(b.direction, page))
      if (b.code !== undefined) out.push('', `\`\`\`${b.code.lang}`, b.code.text, '```')
      if (b.call !== undefined) out.push('', `**${words.callHead}:**`, '', ...choice(b.call, page))
      if (b.tap !== undefined) out.push('', `${words.tap}, you tap one of "so ${b.tap.property} holds", "so it is violated" and "can't tell".`)
      out.push('', `${words.recorded}: ${runLine(b.recorded, page)}.`)
      if (b.after !== undefined) out.push('', words.afterFirst)
      return out
    }
    case 'claim':
      return [`**Claim card ${b.template}** is minted here, prefilled from the results above.`]
    case 'specimen':
      return [b.mount ? `**Specimen ${b.id}** is mounted in your cabinet here.` : `**Specimen ${b.id}** is shown here and not mounted yet.`]
    case 'card': {
      const label = CARD_LABELS[b.variant]
      const title = b.title === undefined ? label : b.title.toLowerCase().includes(label.toLowerCase()) ? b.title : `${b.title} (${label})`
      const lab = b.lab === undefined ? '' : ` · ${b.lab}${b.minutes === undefined ? '' : `, about ${b.minutes} minutes`}`
      const lines = plainRefs(footnotes(b.md, prefix), page).split('\n')
      return [`> **${title}**${lab}`, '>', ...lines.map((l) => (l === '' ? '>' : `> ${l}`))]
    }
  }
}

/** A cited run as the page's title block names it: its ID, then its engine and version. Never its title, its verdict lines or its values. */
function runLine(id: string, page: Lesson): string {
  const run = page.runs?.[id]
  return `${id}${run?.engine !== undefined && run.version !== undefined ? ` (${run.engine} ${run.version})` : ' (not recorded yet)'}`
}

/** The page as Markdown. */
export function renderMarkdown(page: Lesson, index: RegistryIndex): string {
  const out: string[] = [`# ${page.id} · ${page.title}`, '']
  if (page.draft) out.push(`> ${DRAFT_BANNER}.`, '')
  const drawer = page.id.startsWith('D-')
  const format = drawer ? (page.deferred === undefined ? 'Drawer: side material, always open' : 'Deferred drawer: always open, and it unlocks nothing') : page.tier === undefined ? 'Lesson' : tierFormat(page.tier)
  out.push(`**Format.** ${format}${page.minutes === undefined || page.minutes === 0 ? '' : `, about ${page.minutes} minutes`}.`, '')
  if (page.objective !== undefined) out.push(`**Objective.** ${plainRefs(page.objective, page)}`, '')
  const names = page.kcs.map((id) => index.entry(id)?.name).filter((n): n is string => n !== undefined)
  if (names.length > 0) out.push('**Ideas taught.**', '', ...names.map((n) => `- ${n}`), '')
  if (page.deferred !== undefined) {
    out.push('**What it is.**', '', plainRefs(page.deferred.topic, page), '', '**Why the roadmap defers it.**', '', plainRefs(page.deferred.why, page), '', '**What surfaces it.**', '', plainRefs(page.deferred.trigger, page), '')
  }
  if (page.rail !== undefined && page.rail.length > 0) out.push('**Segments.**', '', ...page.rail.map((r, i) => `${i + 1}. ${r.title}`), '')
  page.segments.forEach((s, i) => {
    out.push(`## ${s.title} (${s.minutes} min)`, '')
    s.blocks.forEach((b, j) => out.push(...block(b, page, `s${i + 1}b${j + 1}-`), ''))
  })
  const runs = Object.values(page.runs ?? {})
  if (runs.length > 0 || (page.unresolved ?? []).length > 0) {
    out.push(`## ${wordsOf(page).cited}`, '')
    for (const r of runs) out.push(`- ${runLine(r.id, page)}`)
    for (const id of page.unresolved ?? []) out.push(`- ${id} (not recorded yet)`)
    out.push('')
  }
  if (page.rev !== undefined) out.push(`Revision ${page.rev.slice(0, 12)}.`, '')
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}
