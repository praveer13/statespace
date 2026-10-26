// What a stage row and a stage page say about a stage's size, from the stage pages the content build wrote. Pure.

import type { StagePage } from '@statespace/content'

export interface StageSummary {
  readonly lessons: number
  readonly written: number
  /** The written lessons' minutes. */
  readonly lessonMinutes: number
  /** The lab's planned minutes, stretch stages left out. */
  readonly labMinutes: number
}

export function summarize(stage: StagePage): StageSummary {
  const written = stage.lessons.filter((l) => l.built)
  return {
    lessons: stage.lessons.length,
    written: written.length,
    lessonMinutes: written.reduce((n, l) => n + (l.minutes ?? 0), 0),
    labMinutes: stage.labStages.filter((s) => !s.stretch).reduce((n, s) => n + s.minutes, 0),
  }
}

/** "Find a bug mathematically": the roadmap's question for the stage, as a sentence. */
export const question = (stage: StagePage): string => (stage.tagline === '' ? '' : `${stage.tagline.charAt(0).toUpperCase()}${stage.tagline.slice(1)}.`)

export function sizeLine(s: StageSummary): string {
  const lessons = `${s.lessons} ${s.lessons === 1 ? 'lesson' : 'lessons'}`
  const written = s.written === 0 ? 'none written yet' : `${s.written} written, about ${s.lessonMinutes} min`
  const lab = s.labMinutes > 0 ? ` · lab about ${s.labMinutes} min` : ''
  return `${lessons} (${written})${lab}`
}
