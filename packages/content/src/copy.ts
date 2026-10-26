// The learner's copy of a page: every string a learner reads, with the JSON path it sits at. GATE-lessons,
// GATE-numbers' content checks and the build's own checks walk the page through this one list, so a field added
// to a block is read in one place. Code is not copy: a cell's code is skipped unless asked for.

import type { Lesson, LessonBlock, LessonCardBlock, LessonChoice } from '@statespace/schema'

export type CopyKind = 'title' | 'objective' | 'prose' | 'card' | 'cell' | 'prompt' | 'option' | 'why' | 'tap' | 'deferred' | 'code'

export interface CopyString {
  /** A JSON Pointer into the page, such as /segments/0/blocks/2/call/options/1/why. */
  path: string
  kind: CopyKind
  text: string
}

/** Maps one copy string to another; a mapper that returns its input leaves the string as it is. */
export type CopyMapper = (text: string, path: string, kind: CopyKind) => string

function mapChoice(choice: LessonChoice, path: string, fn: CopyMapper): LessonChoice {
  return {
    ...choice,
    prompt: fn(choice.prompt, `${path}/prompt`, 'prompt'),
    options: choice.options.map((o, i) => ({
      ...o,
      text: fn(o.text, `${path}/options/${i}/text`, 'option'),
      why: fn(o.why, `${path}/options/${i}/why`, 'why'),
    })),
  }
}

/** A card with its strings mapped. */
export function mapCard(card: LessonCardBlock, path: string, fn: CopyMapper): LessonCardBlock {
  return {
    ...card,
    ...(card.title === undefined ? {} : { title: fn(card.title, `${path}/title`, 'title') }),
    md: fn(card.md, `${path}/md`, 'card'),
  }
}

/** A block with its strings mapped. A block of a type outside the six is returned as it is. */
export function mapBlock(block: LessonBlock, path: string, fn: CopyMapper, includeCode = false): LessonBlock {
  switch (block.type) {
    case 'prose':
      return { ...block, md: fn(block.md, `${path}/md`, 'prose') }
    case 'card':
      return mapCard(block, path, fn)
    case 'item':
      return block.choice === undefined ? block : { ...block, choice: mapChoice(block.choice, `${path}/choice`, fn) }
    case 'instrument':
      return {
        ...block,
        ...(block.md === undefined ? {} : { md: fn(block.md, `${path}/md`, 'cell') }),
        ...(block.direction === undefined ? {} : { direction: fn(block.direction, `${path}/direction`, 'cell') }),
        ...(block.code === undefined || !includeCode ? {} : { code: { ...block.code, text: fn(block.code.text, `${path}/code/text`, 'code') } }),
        ...(block.tap === undefined ? {} : { tap: { ...block.tap, property: fn(block.tap.property, `${path}/tap/property`, 'tap') } }),
        ...(block.call === undefined ? {} : { call: mapChoice(block.call, `${path}/call`, fn) }),
        ...(block.after === undefined ? {} : { after: fn(block.after, `${path}/after`, 'cell') }),
      }
    default:
      return block
  }
}

/** A page with every copy string mapped; the page itself is not changed. */
export function mapCopy(page: Lesson, fn: CopyMapper, includeCode = false): Lesson {
  return {
    ...page,
    title: fn(page.title, '/title', 'title'),
    ...(page.objective === undefined ? {} : { objective: fn(page.objective, '/objective', 'objective') }),
    ...(page.deferred === undefined
      ? {}
      : {
          deferred: {
            topic: fn(page.deferred.topic, '/deferred/topic', 'deferred'),
            why: fn(page.deferred.why, '/deferred/why', 'deferred'),
            trigger: fn(page.deferred.trigger, '/deferred/trigger', 'deferred'),
          },
        }),
    segments: page.segments.map((s, i) => ({
      ...s,
      title: fn(s.title, `/segments/${i}/title`, 'title'),
      blocks: s.blocks.map((b, j) => mapBlock(b, `/segments/${i}/blocks/${j}`, fn, includeCode)),
    })),
  }
}

/** Every copy string of a page, in reading order. */
export function copyOf(page: Lesson, options: { code?: boolean } = {}): CopyString[] {
  const out: CopyString[] = []
  mapCopy(
    page,
    (text, path, kind) => {
      out.push({ path, kind, text })
      return text
    },
    options.code === true,
  )
  return out
}
