// The types of the pipeline. The record shapes come from schemas/lesson.schema.json through @statespace/schema's
// generated types (ARCHITECTURE.md section 17.3: "generated schema types replace the hand-written shapes"); the
// shapes the schema does not describe, the problems a check reports and the files a build writes, are here.

export type {
  Lesson,
  LessonBlock,
  LessonCardBlock,
  LessonChoice,
  LessonClaimBlock,
  LessonFactSnapshot,
  LessonInstrumentBlock,
  LessonItemBlock,
  LessonLab,
  LessonOption,
  LessonProseBlock,
  LessonRailEntry,
  LessonRunSnapshot,
  LessonSegment,
  LessonSpecimenBlock,
  LessonStage,
} from '@statespace/schema'
export type { Lesson as Page } from '@statespace/schema'

export type Severity = 'error' | 'warning'

/** A finding of the build, tied to a source file and, where the source says, a line. */
export interface Problem {
  severity: Severity
  /** A short stable name for the rule, such as unknown-kc or run-unresolved. */
  code: string
  message: string
  /** The repository path of the source file, or null for a finding about the build as a whole. */
  file: string | null
  line: number | null
}

/** A finding before it knows its file: what the parser and the checks of one page report. */
export type PageProblem = Omit<Problem, 'file'>

/** A file the build writes, by path relative to the site's public directory. */
export interface OutputFile {
  path: string
  text: string
}

/** A file the build reads, by repository-relative path. */
export interface SourceFile {
  path: string
  text: string
}
