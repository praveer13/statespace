// @statespace/content: the content pipeline's pure half (ARCHITECTURE.md section 3.3). This entry is what the site and
// the gates share: the block types and the draft label, the titles-only rail, the learner's copy of a page, the
// revisions, the per-lesson Markdown and the types of the records. It reads no file and parses no source; the
// reader, the checks and the build are in @statespace/content/build, which the site does not import.

export { BLOCK_TYPES, CARD_VARIANTS, ITEM_ROLES, MAX_BLOCK_TYPES, TIERS, blocksOf, countBlockTypes, tierFormat, unknownBlockTypes } from './blocks.ts'
export type { BlockType, CardVariant, ItemRole, Tier } from './blocks.ts'
export { DRAFT_BANNER, DRAFT_LABEL, RUN_PENDING } from './draft.ts'
export { canonicalJson, fingerprint, sha256Hex, utf8 } from './hash.ts'
export { normalize, railLeaks, railOf } from './rail.ts'
export type { RailLeak } from './rail.ts'
export { copyOf, mapBlock, mapCard, mapCopy } from './copy.ts'
export type { CopyKind, CopyMapper, CopyString } from './copy.ts'
export { REV_VERSION, authoredFields, itemRev, runRecordHash } from './rev.ts'
export type { RevContext } from './rev.ts'
export { plainRefs, renderMarkdown } from './markdown.ts'
export { indexRegistry, pageTitle, stageOfLesson } from './registry.ts'
export type { RegistryIndex } from './registry.ts'
export { factSnapshot, runSnapshot } from './snapshot.ts'
export { lineOf } from './lines.ts'
export { LABS_FORMAT, MANIFEST_FORMAT, MARKDOWN_INDEX_FORMAT, SEARCH_FORMAT, STAGES_FORMAT } from './output.ts'
export type { LabPage, Manifest, ManifestPage, MarkdownIndex, SearchEntry, SearchIndex, SearchKind, StagePage } from './output.ts'
export { expectedPath, markdownProblems } from './check.ts'
export { AUDIT_FORMAT } from './audit-types.ts'
export type { AuditAnchor, AuditCase, AuditKey, AuditPool, AuditScenario, GapClass, LineRef, TextPart } from './audit-types.ts'
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
  OutputFile,
  Page,
  PageProblem,
  Problem,
  Severity,
  SourceFile,
} from './types.ts'
