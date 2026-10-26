// The checks of a page that a schema cannot make: its IDs against the registry generated from the spine, the rules
// that need two fields at once, the rail, and the safety of its Markdown. The build runs them on a page the schema
// has already accepted (check order: read, schema, these, then the references).
//
// An unregistered ID, a tier the spine does not give, a key that is not an option and a block that cannot render
// are errors. A page that differs from the spine's row for it (it uses a generator the row does not list) is a
// warning: the spine and the page should agree, but the stage specs themselves differ from the spine in places,
// and the owner decides which one changes.

import type { Lesson, LessonBlock, LessonChoice } from '@statespace/schema'
import { tierFormat } from './blocks.ts'
import { stageOfLesson } from './registry.ts'
import type { RegistryIndex } from './registry.ts'
import { copyOf } from './copy.ts'
import { railLeaks } from './rail.ts'
import { lineOf } from './lines.ts'
import type { PageProblem } from './types.ts'

export interface CheckContext {
  /** The repository path of the source file. */
  file: string
  index: RegistryIndex
}

/** The path a page's source file must have: the file name is the ID. */
export function expectedPath(id: string): string | null {
  if (/^D-[0-9]{2}$/.test(id)) return `content/drawers/${id}.md`
  const stage = stageOfLesson(id)
  return stage === undefined ? null : `content/stages/${stage}/${id}.md`
}

/** The spine's title for an ID, or that title without a trailing note in parentheses ("... (continued in D-04)"). */
const sameTitle = (spine: string, page: string): boolean => spine === page || spine.replace(/\s*\([^()]*\)\s*$/, '') === page

const list = (ids: readonly string[]): string => ids.join(', ')

/** Markdown the site cannot render safely: raw HTML, images, and links to anything but https or the site. */
export function markdownProblems(text: string): Array<{ code: string; message: string }> {
  const out: Array<{ code: string; message: string }> = []
  const bare = text.replace(/(`{3,}|~{3,})[\s\S]*?(?:\1|$)/g, ' ').replace(/(`+)[\s\S]*?\1/g, ' ')
  if (/<!--/.test(bare)) out.push({ code: 'html', message: 'an HTML comment in a string field: comments are removed from the Markdown source only, so write the note outside the field' })
  const tag = /<\/?[A-Za-z][^<>\n]*>/.exec(bare)
  if (tag !== null) out.push({ code: 'html', message: `raw HTML (${JSON.stringify(tag[0].slice(0, 30))}) is not allowed: use Markdown, and put spaces around < and > in a formula` })
  if (/!\[[^\]]*\]\(/.test(bare)) out.push({ code: 'image', message: 'an image: the content build ships no images, so a figure is a table or a recorded run' })
  for (const m of bare.matchAll(/\]\(\s*<?([^)\s>]*)/g)) {
    const url = m[1] as string
    if (/^https:\/\/[^\s/]/.test(url) || /^\/(?!\/)/.test(url) || url.startsWith('#')) continue
    out.push({ code: 'link', message: `the link ${JSON.stringify(url.slice(0, 60))} is not https, a path on this site or an anchor` })
  }
  return out
}

function choicesOf(block: LessonBlock): Array<{ choice: LessonChoice; at: string }> {
  if (block.type === 'instrument' && block.call !== undefined) return [{ choice: block.call, at: 'call' }]
  if (block.type === 'item' && block.choice !== undefined) return [{ choice: block.choice, at: 'choice' }]
  return []
}

/** The checks of one page that the schema does not make. */
export function checkPage(page: Lesson, lines: ReadonlyMap<string, number>, ctx: CheckContext): PageProblem[] {
  const out: PageProblem[] = []
  const error = (code: string, message: string, pointer: string): void => void out.push({ severity: 'error', code, message, line: lineOf(lines, pointer) })
  const warn = (code: string, message: string, pointer: string): void => void out.push({ severity: 'warning', code, message, line: lineOf(lines, pointer) })
  const { index } = ctx
  const drawer = page.id.startsWith('D-')

  // identity
  const expected = expectedPath(page.id)
  if (expected === null) error('file-name', `${page.id} is not a lesson or drawer ID`, '/id')
  else if (ctx.file !== expected) error('file-name', `${page.id} is the file ${expected}, not ${ctx.file}`, '/id')
  const entry = index.entry(page.id)
  if (entry === undefined || entry.kind !== (drawer ? 'drawer' : 'lesson')) {
    error('id-unregistered', `${page.id} is not a ${drawer ? 'drawer' : 'lesson'} of the spine's registry`, '/id')
  } else {
    // the spine titles Boot with its internal name, and learners see "Start here" (spine section 0): that title is not a difference
    const learnerBoot = entry.tier === 'boot' && page.title === tierFormat('boot')
    if (entry.title !== undefined && !learnerBoot && !sameTitle(entry.title, page.title)) warn('title-differs', `the spine titles ${page.id} ${JSON.stringify(entry.title)}; this page says ${JSON.stringify(page.title)}`, '/title')
    if (!drawer && entry.tier !== page.tier) error('tier-mismatch', `the spine gives ${page.id} the tier ${entry.tier}; this page says ${page.tier}`, '/tier')
    if (drawer && entry.deferred === true && page.deferred === undefined) error('deferred-card', `${page.id} is a deferred drawer: it carries the deferred card (topic, why, trigger) and no segments`, '/id')
    if (drawer && entry.deferred !== true && page.deferred !== undefined) error('deferred-card', `${page.id} is not a deferred drawer in the spine, so it has no deferred card`, '/deferred')
  }

  // knowledge components and drawers
  const kc = (id: string, pointer: string): void => {
    if (!index.has('kc', id)) error('unknown-kc', `${id} is not a knowledge component of the spine's registry`, pointer)
  }
  page.kcs.forEach((id, i) => kc(id, `/kcs/${i}`))
  page.previews?.forEach((id, i) => kc(id, `/previews/${i}`))
  page.drawers?.forEach((id, i) => {
    if (!index.has('drawer', id)) error('unknown-drawer', `${id} is not a drawer of the spine's registry`, `/drawers/${i}`)
    else if (id === page.id) error('drawer-self', `a drawer does not link itself`, `/drawers/${i}`)
  })

  // segments
  page.segments.forEach((segment, i) => {
    segment.kcs?.forEach((id, k) => {
      kc(id, `/segments/${i}/kcs/${k}`)
      if (!page.kcs.includes(id) && !(page.previews ?? []).includes(id)) warn('segment-kc', `the segment teaches ${id}, which the page's kcs do not list`, `/segments/${i}/kcs/${k}`)
    })
  })
  const rail = railLeaks(page)
  for (const leak of rail) error('rail', leak.message, `/segments/${leak.segment}`)

  // blocks
  const used = { instruments: new Set<string>(), generators: new Set<string>(), specimens: new Set<string>(), claims: new Set<string>() }
  const cells = new Map<number, string>()
  page.segments.forEach((segment, i) => {
    segment.blocks.forEach((block, j) => {
      const at = `/segments/${i}/blocks/${j}`
      switch (block.type) {
        case 'instrument': {
          used.instruments.add(block.ins)
          if (!index.has('instrument', block.ins)) error('unknown-instrument', `${block.ins} is not an instrument of the spine's registry`, at)
          const first = cells.get(block.cell)
          if (first !== undefined) error('cell-duplicate', `cell ${block.cell} is already used at ${first}: a cell's number is its identity in an event's ref`, at)
          else cells.set(block.cell, `line ${lineOf(lines, at) ?? '?'}`)
          if (block.callOnFirstRun && block.call === undefined) {
            const message = 'the cell asks for a call on its first run but carries none: write its @call, or call=false for a free run'
            if (page.draft) warn('call-missing', message, at)
            else error('call-missing', message, at)
          }
          if (drawer && block.call !== undefined) error('drawer-call', 'a drawer adds no Call It beyond its items: its cells show recorded results as free runs', `${at}/call`)
          if (drawer && block.callOnFirstRun) error('drawer-call', 'a drawer\'s cell is a free run: call=false', at)
          break
        }
        case 'item': {
          used.generators.add(block.family)
          if (!index.has('generator', block.family)) error('unknown-generator', `${block.family} is not a generator family of the spine's registry`, at)
          else {
            const templates = index.templatesOf(block.family)
            const n = Number(block.template.slice(1))
            if (templates !== undefined && n > templates) error('template-range', `${block.family} has ${templates} templates in the spine, so ${block.template} does not exist`, at)
          }
          block.kcs.forEach((id, k) => {
            kc(id, `${at}/kcs/${k}`)
            if (!page.kcs.includes(id)) warn('item-kc', `the item is tagged ${id}, which the page's kcs do not list`, at)
          })
          break
        }
        case 'claim': {
          used.claims.add(block.template)
          if (!index.has('claim-template', block.template)) error('unknown-claim', `${block.template} is not a claim template of the spine's registry`, at)
          break
        }
        case 'specimen': {
          used.specimens.add(block.id)
          if (!index.has('specimen', block.id)) error('unknown-specimen', `${block.id} is not a specimen of the spine's registry`, at)
          break
        }
        case 'card': {
          if (block.variant === 'build-this' && block.lab === undefined) error('card-lab', 'a Build this card names its lab stage: lab=LAB-1.2', at)
          if (block.variant !== 'build-this' && block.lab !== undefined) error('card-lab', `only a Build this card names a lab stage, not a ${block.variant} card`, at)
          if (block.lab !== undefined && !index.has('lab-stage', block.lab)) error('unknown-lab-stage', `${block.lab} is not a lab stage of the spine's registry`, at)
          break
        }
        case 'prose':
          break
      }
      for (const { choice, at: field } of choicesOf(block)) checkChoice(choice, `${at}/${field}`, index, error)
    })
  })

  // the spine's row for a lesson
  if (entry?.kind === 'lesson') {
    const pairs: Array<[string, readonly string[] | undefined, Set<string> | readonly string[], string]> = [
      ['knowledge components', entry.kcs, page.kcs, 'kc'],
      ['instruments', entry.instruments, used.instruments, 'ins'],
      ['generator families', entry.generators, used.generators, 'gen'],
      ['specimens', entry.specimens, used.specimens, 'sp'],
      ['claim templates', entry.claims, used.claims, 'cl'],
    ]
    for (const [what, row, mine] of pairs) {
      if (row === undefined) continue
      const have = [...mine]
      const extra = have.filter((x) => !row.includes(x))
      // Boot's row lists GEN-call-it for its scheduled follow-up, which is a Today card the scheduler creates and no block
      const missing = row.filter((x) => !have.includes(x) && !(page.tier === 'boot' && what === 'generator families'))
      if (extra.length > 0 || missing.length > 0) {
        const parts = [extra.length > 0 ? `uses ${list(extra)}, which the row does not list` : '', missing.length > 0 ? `leaves out ${list(missing)}, which the row lists` : ''].filter((p) => p !== '')
        warn('row-differs', `the page ${parts.join(' and ')} (the spine's ${what} for ${page.id})`, '')
      }
    }
  }

  // Markdown
  for (const s of copyOf(page)) {
    for (const p of markdownProblems(s.text)) error(p.code, `${s.path}: ${p.message}`, s.path)
  }
  return out
}

function checkChoice(choice: LessonChoice, at: string, index: RegistryIndex, error: (code: string, message: string, pointer: string) => void): void {
  const letters = choice.options.map((o) => o.id)
  if (letters.some((id, i) => id !== String.fromCharCode(65 + i))) error('choice-order', `the options are lettered A, B, C ... in order, not ${letters.join(', ')}`, at)
  if (!letters.includes(choice.key)) error('choice-key', `the key ${choice.key} is not one of the options (${letters.join(', ')})`, at)
  choice.options.forEach((o, i) => {
    const here = `${at}/options/${i}`
    if (o.id === choice.key) {
      if (o.mis !== undefined) error('choice-mis', `option ${o.id} is the key, so it names no misconception`, here)
    } else if (o.mis === undefined) {
      error('choice-mis', `option ${o.id} is not the key, so it names the misconception it stands for: "- mis: dp:G4"`, here)
    }
    if (o.mis !== undefined && !index.has('misconception', o.mis)) error('unknown-misconception', `${o.mis} is not a misconception of the registry (docs/EVIDENCE.md section 6)`, here)
  })
  const texts = choice.options.map((o) => o.text.trim().toLowerCase())
  if (new Set(texts).size !== texts.length) error('choice-distinct', 'two options say the same thing', at)
}
