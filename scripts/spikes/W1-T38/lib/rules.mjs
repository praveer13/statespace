// The rules of GATE-lessons, by ID. Every finding names the rule that raised it, `<check>/<name>`, the check being the part
// before the slash, and every planted fault (lib/plants.mjs) names the rules it must raise. `--self-check` counts a plant as
// caught only when each of its rules fired, so a rule that is deleted, or weakened until its plant passes, fails the
// self-check; rules.test.mjs requires a plant for every rule below and a rule below for every plant.
//
// FIXED holds the rules written out in code (lib/page.mjs, lib/glossary.mjs and scripts/verify-lessons.mjs). The copy rules'
// IDs come from their lists (copyRules): each lock, pressure and reward phrase of lib/copy.mjs, the padlock and the lock
// label, each internal name and each internal kind of ID of content/glossary.yaml, the labeled cross-reference, and the
// first-use rule at each place copy sits.

import { LOCK_PHRASES, PLACES, PRESSURE_PHRASES, REWARD_PHRASES } from './copy.mjs'

/** The rules written out in code: ID, then what it fails on. A warning (it fails under --strict) says so. */
export const FIXED = {
  // what the gate could not read
  'read/utf8': 'a file that is not valid UTF-8',
  'read/page': 'a lesson or drawer page the content build cannot read',
  'read/record': 'a stage, lab or placement record the YAML reader cannot read',
  'read/built-json': 'a built lesson that is not JSON',
  'read/built-shape': 'a built lesson with no segments or no rail',
  'read/crash': 'a rule that threw on a file',
  'read/empty': 'no lesson and no drawer to lint (--strict)',
  // a page's own facts
  'front/id': 'a page whose ID is not a lesson or drawer of the registry',
  'front/title': 'a page with no title',
  'front/tier': 'a lesson page whose tier is not the one the spine gives its ID',
  'front/objective': 'a lesson with no objective',
  'front/kcs': 'a lesson that lists no knowledge component',
  'front/record-id': 'a stage or lab record whose ID is not a stage or a lab',
  // the six block types
  'block-type/type': 'a block of a type outside the six',
  'block-type/role': 'an item role outside prequestion, segment and exit',
  'block-type/variant': "a card variant outside the five",
  'block-type/stray': 'a line that reads as a block and is not one',
  'block-type/count': 'more than six block types in use over all content',
  'block-type/drift': "the content pipeline's own lists of types, roles or variants differ from the spine's",
  'block-type/record-type': "a stage record's card that is not a card",
  'block-type/record-variant': "a stage record's card variant outside the five",
  'block-type/built': 'a built lesson with a block of a type outside the six',
  // generator families
  'family/missing': 'a graded item that names no generator family',
  'family/unregistered': 'a generator family the spine does not register',
  'family/no-template': 'a graded item that names no template',
  'family/not-template': 'a template that is not t1 to t9',
  'family/template-count': "a template past the family's count",
  // the rail
  'rail/markup': 'a segment title that is not plain text',
  'rail/option': 'a segment title that holds an option of a question on its page',
  'rail/repeat': 'two segment titles that are the same',
  'rail/untitled': 'a segment with no title',
  'rail/generated': 'a segment title that holds an option a generated item on its page may show',
  'rail/title-in-option': 'a segment title of four words or more that stands inside an option',
  'rail/spelled-number': 'a number word that ends a title when an option of its page is that number',
  'rail/verdict': "a segment title that names a solver's verdict (sat, unsat, unknown)",
  'rail/stamp': 'a segment title that names a stamp word in capitals',
  'rail/built-count': 'a built rail with a number of entries other than its segments',
  'rail/built-keys': 'a built rail entry that holds more than an id and a title',
  'rail/built-title': 'a built rail entry that is not the title of its segment',
  'rail/built-markup': 'a built rail title that is not plain text',
  'rail/built-option': 'a built rail title that holds an option of a question on its page',
  'rail/built-repeat': 'two built rail titles that are the same',
  'rail/built-title-in-option': 'a built rail title of four words or more that stands inside an option',
  'rail/built-spelled-number': 'a number word that ends a built rail title when an option is that number',
  'rail/built-verdict': "a built rail title that names a solver's verdict",
  'rail/built-stamp': 'a built rail title that names a stamp word in capitals',
  // lesson anatomy by tier
  'anatomy/graded': 'a lesson with no graded item (I1)',
  'anatomy/call-carried': 'a cell that asks for a call on its first run and carries none',
  'anatomy/one-tool': "a segment whose cells run two instruments",
  'anatomy/boot-minutes': 'Boot over 8 minutes',
  'anatomy/boot-call': 'Boot without a call before the first run',
  'anatomy/boot-feels-harder': 'Boot without the "this will feel harder" card',
  'anatomy/prequestions': 'a core lesson with other than one or two prequestions, a bridge with other than one',
  'anatomy/core-opener': 'a core lesson whose first block is not prose or a prequestion',
  'anatomy/core-segments': 'a core lesson with other than 2 to 4 teaching segments',
  'anatomy/core-segment-minutes': 'a core segment of other than 12 to 15 minutes',
  'anatomy/core-cell': 'a core segment with no instrument cell',
  'anatomy/core-cells': 'a core segment with more than one instrument cell (a warning)',
  'anatomy/core-call': 'a core segment that asks for no call on its first run',
  'anatomy/core-exit': 'a core lesson with no exit items',
  'anatomy/core-build-this': 'a core lesson with no "Build this" card that names its lab stage',
  'anatomy/build-this-lab': 'a "Build this" card whose lab is not a lab stage of the registry',
  'anatomy/core-planned': 'a core lesson planned at other than 40 to 60 minutes (a warning)',
  'anatomy/bridge-words': 'a bridge over 1,000 words',
  'anatomy/bridge-kcs': "a bridge whose one prequestion leaves out a knowledge component the bridge introduces",
  'anatomy/bridge-cell': 'a bridge with no cell that asks for a call (a warning)',
  'anatomy/bridge-segment-item': 'a bridge with no graded item of role segment',
  'anatomy/bridge-exit': 'a bridge with no exit item',
  'anatomy/bridge-reading': 'a bridge with no reading pointer',
  'anatomy/bridge-reading-date': 'a bridge whose reading pointer carries no date',
  'anatomy/bridge-planned': 'a bridge planned at other than 15 to 25 minutes (a warning)',
  'anatomy/segment-ends-graded': 'a teaching segment that does not end in a graded item',
  'anatomy/exit-last': 'exit items in a segment that is not the last (a warning)',
  // a deferred drawer
  'drawer/card': 'a deferred drawer without its card',
  'drawer/card-field': "a deferred drawer's card without its topic, why or trigger",
  'drawer/segments': 'a deferred drawer with segments',
  // the generators the rail reads
  'generators/load': "a generator family's module that does not load",
  'generators/missing': 'a generator family a page names that has no module yet (--strict)',
  // the glossary, which is data the spine decides (lib/glossary.mjs)
  'glossary/yaml': 'a glossary the YAML reader cannot read',
  'glossary/root': 'a glossary that is not a mapping',
  'glossary/format': 'a glossary whose format is not glossary/1',
  'glossary/terms': 'a glossary whose terms are not a list',
  'glossary/term': 'a term that is not a mapping',
  'glossary/term-n': "a term without the spine's row number",
  'glossary/term-text': 'a term without its term, meaning or introduced text',
  'glossary/term-from': 'a term whose from is not a lesson ID',
  'glossary/term-forms': 'a term without forms',
  'glossary/term-case': "a term whose caseSensitive is not true or false",
  'glossary/term-until': 'a term whose until is not text',
  'glossary/term-unmatched': 'a term whose unmatched is not a list of words and reasons',
  'glossary/internal': 'a glossary whose internal names are not a list',
  'glossary/internal-entry': 'an internal name that is not a mapping',
  'glossary/internal-text': 'an internal name without its name, what learners see, or its source',
  'glossary/internal-forms': 'an internal name without forms',
  'glossary/internal-case': "an internal name whose caseSensitive is not true or false",
  'glossary/internal-ids': 'a glossary whose internalIds are not a list of kinds',
  'glossary/count': 'a glossary with other than 25 terms',
  'glossary/numbering': "terms out of the spine's order",
  'glossary/from-registered': 'a term whose from is not a lesson of the registry',
  'glossary/from-lesson': 'a term introduced at a lesson whose copy starts elsewhere',
  'glossary/from-stage': 'a term introduced in a stage whose copy starts in another',
  'glossary/from-boot': 'a term introduced in Boot whose copy starts after Boot',
  'glossary/duplicate': 'a term listed twice',
  'glossary/boot-count': 'Boot introducing more than five terms',
  'glossary/boot-number': 'a term past the fifth that starts in Boot',
  'glossary/boot-terms': 'one of terms 1 to 5 that starts after Boot',
  'glossary/spine-table': "a spine without its glossary table",
  'glossary/spine-count': "a glossary with other than the spine's number of terms",
  'glossary/spine-row': "a term of the spine's table the glossary leaves out",
  'glossary/spine-term': "a term whose text is not the spine's",
  'glossary/spine-introduced': "a term introduced somewhere other than the spine says",
  'glossary/form-collision': 'a word that is a form of two terms, or of a term and an internal name',
  'glossary/id-kind': 'an internal kind of ID that the registry does not have',
}

/**
 * The rules that no plant can reach, each with what holds it instead. Every other rule has a plant (rules.test.mjs).
 */
export const NOT_PLANTED = {
  'block-type/drift': "the gate runs the repository's content pipeline (packages/content), never a tree's, so a plant cannot change its lists; page.test.mjs runs pipelineDrift over a stand-in pipeline",
  'read/crash': 'only a defect in a rule throws, and a fault of the content never does; gate.test.mjs runs the gate over a file a stand-in rule throws on',
}

/** The check of a rule ID: the part before the slash. */
export const ruleCheck = (id) => id.slice(0, id.indexOf('/'))

/** The copy rules' IDs, from their lists and from a compiled glossary (its internal names and internal kinds of ID). */
export function copyRules(glossary) {
  return [
    'lock/padlock',
    'lock/label',
    ...LOCK_PHRASES.map((p) => `lock/${p.name}`),
    ...PRESSURE_PHRASES.map((p) => `pressure/${p.name}`),
    ...REWARD_PHRASES.map((p) => `reward/${p.name}`),
    ...glossary.internal.map((x) => `internal/${x.name}`),
    ...[...glossary.internalIds].map((k) => `internal/id-${k}`),
    'internal/cross-reference',
    ...PLACES.map((p) => `term/${p}`),
  ]
}

/** Every rule of the gate, given the compiled glossary. */
export const allRules = (glossary) => [...Object.keys(FIXED), ...copyRules(glossary)]

/** Whether an ID names a fixed rule, or has the shape of a copy rule's (the copy rules' IDs are made from their lists). */
export const knownRule = (id) => Object.hasOwn(FIXED, id) || /^(?:lock|pressure|reward|internal|term)\/./.test(id)
