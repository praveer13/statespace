// The planted faults of GATE-lessons: each is a small edit of the fixture tree (scripts/spikes/W1-T38/fixtures/tree),
// which passes every rule, and each names the rules (lib/rules.mjs) that must fire on it. A plant is caught when the gate
// fails and every rule it names is among the failing findings' rules, so a plant pins its rules: a rule that is deleted,
// or weakened until its plant passes, fails the self-check. rules.test.mjs requires a plant for every rule of the gate
// but the two that no plant can reach (NOT_PLANTED in lib/rules.mjs), which tests hold instead. A rule with a limit has
// a plant one step past each end of it, a rule with a list of words a plant for each word, and a rule whose condition
// has parts a plant for each part, so a rule narrowed at one end, by one word or by one part fails the self-check too
// (rules.test.mjs loosens each limit by one and takes out each word, and requires a plant to be missed). The plants
// write their numbers and words out, rather than read them from the rules, so that a rule edited does not move them.
// The tests run the plants in process and `node scripts/verify-lessons.mjs --self-check` runs each through the command
// line. The first five are the acceptance's: a graded item without a family, an answer in the rail, a seventh block
// type, lock copy and an internal name.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ruleCheck } from './rules.mjs'

export const TREE = 'scripts/spikes/W1-T38/fixtures/tree'

/** Copy a directory tree. */
export function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true })
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, e.name)
    const dst = path.join(to, e.name)
    if (e.isDirectory()) copyTree(src, dst)
    else if (e.isFile()) fs.copyFileSync(src, dst)
  }
}

/** A scratch copy of the fixture tree, which the caller removes. */
export function scratchTree(repo) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-lessons-'))
  copyTree(path.join(repo, TREE), dir)
  return dir
}

/** Edit a file of the tree; the edit must change it. */
export function edit(dir, rel, change) {
  const file = path.join(dir, rel)
  const before = fs.readFileSync(file, 'utf8')
  const after = change(before)
  if (after === before) throw new Error(`the plant did not change ${rel}`)
  fs.writeFileSync(file, after)
}

/** Replace the first occurrence of a text, which must be there. */
export const replace = (dir, rel, from, to) =>
  edit(dir, rel, (t) => {
    if (!t.includes(from)) throw new Error(`${rel} has no ${JSON.stringify(from)} to replace`)
    return t.replace(from, to)
  })

/** Write a file of the tree, making its folder. */
export function write(dir, rel, text) {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
  fs.writeFileSync(path.join(dir, rel), text)
}

const L0 = 'content/stages/S1/S1.L0.md'
const L1 = 'content/stages/S1/S1.L1.md'
const L2 = 'content/stages/S1/S1.L2.md'
const D03 = 'content/drawers/D-03.md'
const D33 = 'content/drawers/D-33.md'
const README = 'labs/README.md'
const STAGE = 'content/stages/S1/stage.yaml'
const LAB = 'content/stages/S1/lab.yaml'
const PLACEMENT = 'content/stages/S1/placement.yaml'
const BUILT = 'apps/site/public/content/S1.L1.0123456789ab.json'
/** A sentence of the core lesson's card that the copy plants replace. */
const CARD_LINE = 'Next, find a transfer that makes the source balance negative.'
/** The end of the drawer's cell, after which the drawer plants add a block. */
const D03_CELL_END = 'A recorded result, opened as a free run.\n:::'
const OFFER = 'Know some logic already? An optional 15-minute check lets the course skip what you show.'
const MINIMAL = '"Minimal" means minimal for the objective you asked for, and nothing else.'

/** Words to fill a page: no glossary term, no lock, no internal name. */
const filler = (n) => Array.from({ length: n }, (_, i) => `word${i % 7}`).join(' ')
/** The words a learner reads in the fixture's bridge (page.test.mjs holds the number), so a plant can sit one word over the limit. */
export const BRIDGE_FIXTURE_WORDS = 190
/** A drawer the fixture tree does not hold, which the registry uses in S1, S2 and S4: its copy sits at the end of S1. */
const D02 = 'content/drawers/D-02.md'
const D02_TEXT = '---\nid: D-02\ntitle: Cases and witnesses\ndraft: true\nkcs: [KC-1.witness-class]\nobjective: Read a witness as one member of a class.\n---\n\n## One member {minutes=3}\n\nA witness is one member of a class of inputs.\n'

/**
 * A plant: a name, the rules that must fire on it (one or a list), and the edit of the scratch tree (given the repository's
 * root). `strict` runs the gate with --strict, for a rule whose findings are warnings or that only --strict reports.
 * `check` is the first rule's check, which the self-check prints.
 */
const plant = (name, rules, apply, extra = {}) => {
  const list = [rules].flat()
  return { name, rules: list, check: ruleCheck(list[0]), apply, ...extra }
}
/** A sentence of learner copy put in place of the core lesson's card line, or of `from` in `file`. */
const say = (name, rules, sentence, { file = L1, from = CARD_LINE } = {}) => plant(name, rules, (d) => replace(d, file, from, sentence))
/** A built lesson page (what the content build writes), whose rail is its segments' titles unless `rail` says otherwise. */
const built = (name, rules, segments, rail = segments.map((s) => ({ id: s.id, title: s.title }))) =>
  plant(name, rules, (d) => write(d, BUILT, JSON.stringify({ schema: 'statespace/lesson@1', id: 'S1.L1', segments, rail })))
const prose = (id, title) => ({ id, title, minutes: 13, blocks: [{ type: 'prose', md: 'Text.' }] })
/** A graded item a built page carries, whose options a rail title may give away. */
const BUILT_ITEM = { type: 'item', role: 'segment', family: 'GEN-call-it', template: 't1', kcs: [], choice: { prompt: 'What comes back?', options: [{ id: 'A', text: 'unsat', why: '' }, { id: 'B', text: '1', why: '' }, { id: 'C', text: 'Yes: some inputs get past the guard.', why: '' }], key: 'A' } }
const withItem = (id, title) => ({ id, title, minutes: 13, blocks: [BUILT_ITEM] })
/** A graded item whose options are the numbers 0 to 10, which a title may spell out. */
const NUMBERS_ITEM = { ...BUILT_ITEM, choice: { prompt: 'How many?', options: Array.from({ length: 11 }, (_, n) => ({ id: String.fromCharCode(65 + n), text: String(n), why: '' })), key: 'A' } }
const withNumbers = (id, title) => ({ id, title, minutes: 13, blocks: [NUMBERS_ITEM] })
/** An edit of the glossary, in a copy the tree holds (the gate reads the tree's glossary before the repository's). */
const gloss = (name, rules, change) => plant(name, rules, (d, repo) => glossaryEdit(d, repo, change))
/** Replace a text of the glossary, which must be there. */
const swap = (from, to) => (t) => {
  if (!t.includes(from)) throw new Error(`the glossary has no ${JSON.stringify(from)}`)
  return t.replace(from, to)
}

/** A fixed question for Boot, asked as a graded item. */
const BOOT_QUESTION = ':::item role=segment family=GEN-call-it template=t1 kcs=KC-1.violation-as-sat\n@choice key=B\nCould the sender\'s balance go below zero?\n\n- A. No.\n  - why: The guard reads the wrong account.\n  - mis: dp:G8\n- B. Yes.\n  - why: The solver found such a transfer.\n:::\n'
/** A teaching segment of 12 minutes for the core lesson: a free run and a generated Call It last. */
const extraSegment = (title, cell) => `## ${title} {minutes=12 kcs=KC-1.witness-class}\n\n:::instrument ins=INS-z3 cell=${cell} recorded=RUN-z3-starter call=false\nAnother run.\n:::\n\n::item role=segment family=GEN-call-it template=t1 kcs=KC-1.witness-class\n\n`
/** The core lesson's third cell as a free run, its @call gone. */
function freeRunCell3(d) {
  replace(d, L1, ':::instrument ins=INS-z3 cell=3 recorded=RUN-z3-optimize-min', ':::instrument ins=INS-z3 cell=3 recorded=RUN-z3-optimize-min call=false')
  edit(d, L1, (t) => t.replace(/\n@call key=A run=RUN-z3-optimize-min surprise=no[\s\S]*?(?=\n:::)/, ''))
}

export const PLANTS = [
  // the acceptance's five
  plant('a graded item without a family', 'family/missing', (d) => replace(d, L1, '::item role=segment family=GEN-find-the-witness template=t1 kcs=KC-1.violation-as-sat', '::item role=segment template=t1 kcs=KC-1.violation-as-sat')),
  plant('an answer in the rail', 'rail/option', (d) => replace(d, L1, '## The violation query {', '## Why unsat is the answer {')),
  plant('a seventh block type', 'block-type/type', (d) => replace(d, L1, '"Minimal" means minimal for the objective', ':::figure caption="A plot"\nA figure.\n:::\n\n"Minimal" means minimal for the objective')),
  say('lock copy', ['lock/unlock', 'lock/unlock-content', 'lock/do-to-open'], 'Finish the Defence to unlock the next lesson.'),
  say('an internal name', 'internal/lane', 'Your result carries a lane badge.', { from: MINIMAL }),

  // the rail
  plant('an option of a generated item in the rail', 'rail/generated', (d) => {
    replace(d, L2, '## Exit {minutes=4}', '## A witness that replays {minutes=4}')
    replace(d, 'packages/generators/src/which-stamp/index.ts', "option('C', 'REFUTED [R] · the witness replays')", "option('C', 'A witness that replays')")
  }),
  plant('a rail title that is not plain text', 'rail/markup', (d) => replace(d, L1, '## One witness, one class {', '## One `witness`, one class {')),
  // emphasis in underscores, which the pipeline's own check of markup does not read
  plant('a rail title in underscore emphasis', 'rail/markup', (d) => replace(d, L0, '## What it showed {minutes=3}', '## What _it_ showed {minutes=3}')),
  plant('two segments with one title', 'rail/repeat', (d) => replace(d, L1, '## One witness, one class {', '## The violation query {')),
  plant('a segment with no title', 'rail/untitled', (d) => replace(d, L1, '## One witness, one class {', '## {')),
  // a verdict that no question on the page offers: Boot's options are prose
  plant('a verdict in the rail of Boot', 'rail/verdict', (d) => replace(d, L0, '## What it showed {minutes=3}', '## Z3 says sat {minutes=3}')),
  plant('a stamp word in the rail', 'rail/stamp', (d) => replace(d, L0, '## The pull request {minutes=4}', '## REFUTED, then PROVED {minutes=4}')),
  // each verdict word alone in a title, in a case other than its own (the solver's words are read in any case), and each
  // stamp word alone: a word taken out of a list leaves its plant missed (rules.test.mjs takes each out)
  plant('the verdict unsat, capitalized, in the rail', 'rail/verdict', (d) => replace(d, L0, '## What it showed {minutes=3}', '## Unsat, and what it means {minutes=3}')),
  plant('the verdict unknown, in capitals, in the rail', 'rail/verdict', (d) => replace(d, L0, '## What it showed {minutes=3}', '## Z3 says UNKNOWN {minutes=3}')),
  plant('the verdict satisfiable in the rail', 'rail/verdict', (d) => replace(d, L0, '## What it showed {minutes=3}', '## Satisfiable after all {minutes=3}')),
  plant('the verdict unsatisfiable in the rail', 'rail/verdict', (d) => replace(d, L0, '## What it showed {minutes=3}', '## Unsatisfiable, so no bug {minutes=3}')),
  ...['PROVED', 'REFUTED', 'MODEL-CHECKED', 'TESTED', 'ENFORCED', 'CONFIGURED', 'ASSUMED', 'NOT COVERED'].map((word) =>
    plant(`the stamp word ${word} alone in the rail`, 'rail/stamp', (d) => replace(d, L0, '## The pull request {minutes=4}', `## ${word} by now {minutes=4}`)),
  ),
  // option text that railLeaks would miss: the option without its "Yes:", and a number spelled out
  plant('a title that repeats an option without its "Yes:"', 'rail/title-in-option', (d) => replace(d, L0, '## What it showed {minutes=3}', '## Some inputs get past the guard {minutes=3}')),
  plant('a title of four words inside an option', 'rail/title-in-option', (d) => replace(d, L1, '## One witness, one class {', '## In the first witness {')),
  plant('a number an option gives, spelled out in the rail', 'rail/spelled-number', (d) => replace(d, L1, '## One witness, one class {', '## The amount comes back as one {')),
  // a built lesson, which the site loads: its rail is its segments' titles and nothing else
  built('an answer in the rail of a built lesson', 'rail/built-keys', [prose('s1', 'Negating English')], [{ id: 's1', title: 'Negating English', verdict: 'unsat' }]),
  built('a built rail with fewer entries than segments', 'rail/built-count', [prose('s1', 'Negating English'), prose('s2', 'The violation query')], [{ id: 's1', title: 'Negating English' }]),
  built('a built rail entry that is not its segment\'s title', 'rail/built-title', [prose('s1', 'Negating English')], [{ id: 's1', title: 'Negating, then searching' }]),
  built('a built rail title that is not plain text', 'rail/built-markup', [prose('s1', 'One `witness`')]),
  built('a built rail title in underscore emphasis', 'rail/built-markup', [prose('s1', 'Negating _English_')]),
  built('an option in the rail of a built lesson', 'rail/built-option', [withItem('s1', 'Why unsat is the answer')]),
  built('two built rail titles that are the same', 'rail/built-repeat', [prose('s1', 'Negating English'), prose('s2', 'Negating English')]),
  built('a built rail title inside an option', 'rail/built-title-in-option', [withItem('s1', 'Some inputs get past the guard')]),
  built('a number an option gives, spelled out in a built rail', 'rail/built-spelled-number', [withItem('s1', 'The amount comes back as one')]),
  // each number word, beside an option that is its number
  ...['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'].map((word) =>
    built(`the number ${word}, spelled out in a built rail`, 'rail/built-spelled-number', [withNumbers('s1', `The count comes back as ${word}`)]),
  ),
  built('a verdict in the rail of a built lesson', 'rail/built-verdict', [prose('s1', 'Z3 says unsat')]),
  built('a stamp word in the rail of a built lesson', 'rail/built-stamp', [prose('s1', 'REFUTED, then PROVED')]),

  // block types and families
  plant('a block fence in capitals, which shows as text', 'block-type/stray', (d) => replace(d, L1, '"Minimal" means minimal for the objective', ':::Figure\nA plot.\n:::\n\n"Minimal" means minimal for the objective')),
  plant('an item written in capitals, which is lost', 'block-type/stray', (d) => replace(d, L1, '::item role=exit family=GEN-call-it template=t1 kcs=KC-1.violation-as-sat', '::Item role=exit family=GEN-call-it template=t1 kcs=KC-1.violation-as-sat')),
  plant('a block fence with a space after its colons, which shows as text', 'block-type/stray', (d) => replace(d, L1, MINIMAL, `::: card variant=twin\nA note.\n:::\n\n${MINIMAL}`)),
  plant('an indented block fence, which shows as text', 'block-type/stray', (d) => replace(d, L1, MINIMAL, `  :::card variant=twin\n  A note.\n  :::\n\n${MINIMAL}`)),
  plant('a block fence of four colons, which shows as text', 'block-type/stray', (d) => replace(d, L1, MINIMAL, `::::card variant=twin\nA note.\n::::\n\n${MINIMAL}`)),
  plant('an item role that would be another kind of block', 'block-type/role', (d) => replace(d, L1, '::item role=exit family=GEN-call-it template=t1 kcs=KC-1.violation-as-sat', '::item role=bonus family=GEN-call-it template=t1 kcs=KC-1.violation-as-sat')),
  plant('a card variant that would be a seventh type', 'block-type/variant', (d) => replace(d, L1, ':::card variant=build-this title="Build this" lab=LAB-1.2', ':::card variant=quiz title="Build this" lab=LAB-1.2')),
  plant('seven block types in use', ['block-type/count', 'block-type/type'], (d) => replace(d, L1, '"Minimal" means minimal for the objective', ':::figure caption="A plot"\nA figure.\n:::\n\n:::video\nA clip.\n:::\n\n"Minimal" means minimal for the objective')),
  plant('a stage record\'s card that is not a card', 'block-type/record-type', (d) => replace(d, STAGE, '  - type: card', '  - type: quiz')),
  plant('a stage record\'s card variant that would be a seventh type', 'block-type/record-variant', (d) => replace(d, STAGE, '    variant: twin', '    variant: quiz')),
  built('a built lesson with a seventh block type', 'block-type/built', [{ id: 's1', title: 'Negating English', minutes: 13, blocks: [{ type: 'figure', md: 'A plot.' }] }]),
  // a drawer has the block-type and family rules too (and no anatomy and no rail)
  plant('a seventh block type in a drawer', 'block-type/type', (d) => replace(d, D03, D03_CELL_END, `${D03_CELL_END}\n\n:::figure\nA plot.\n:::`)),
  plant('an item role in a drawer that would be another kind of block', 'block-type/role', (d) => replace(d, D03, '::item role=prequestion family=GEN-negate-it', '::item role=bonus family=GEN-negate-it')),
  plant('a card variant in a drawer that would be a seventh type', 'block-type/variant', (d) => replace(d, D03, D03_CELL_END, `${D03_CELL_END}\n\n:::card variant=quiz\nA card.\n:::`)),
  plant('a block fence in capitals in a drawer, which shows as text', 'block-type/stray', (d) => replace(d, D03, D03_CELL_END, `${D03_CELL_END}\n\n:::Figure\nA plot.\n:::`)),
  plant('a drawer item without a family', 'family/missing', (d) => replace(d, D03, 'family=GEN-negate-it template=t1 kcs=KC-1.quantifier-negation', 'template=t1 kcs=KC-1.quantifier-negation')),
  plant('a drawer item of a family the spine does not register', 'family/unregistered', (d) => replace(d, D03, 'family=GEN-negate-it template=t1 kcs=KC-1.quantifier-negation', 'family=GEN-guess-it template=t1 kcs=KC-1.quantifier-negation')),
  plant('a drawer item without a template', 'family/no-template', (d) => replace(d, D03, 'family=GEN-negate-it template=t1 kcs=KC-1.quantifier-negation', 'family=GEN-negate-it kcs=KC-1.quantifier-negation')),
  plant('a generator family the spine does not register', 'family/unregistered', (d) => replace(d, L1, 'family=GEN-find-the-witness template=t1 kcs=KC-1.witness-class', 'family=GEN-guess-it template=t1 kcs=KC-1.witness-class')),
  plant('a template past the family\'s count', 'family/template-count', (d) => replace(d, L2, 'family=GEN-which-stamp template=t1', 'family=GEN-which-stamp template=t4')),
  plant('a graded item without a template', 'family/no-template', (d) => replace(d, L2, 'family=GEN-call-it template=t4 kcs=KC-1.three-answers', 'family=GEN-call-it kcs=KC-1.three-answers')),
  plant('a template that is not one', 'family/not-template', (d) => replace(d, L1, 'family=GEN-find-the-witness template=t1 kcs=KC-1.witness-class', 'family=GEN-find-the-witness template=tt kcs=KC-1.witness-class')),
  plant('a template numbered zero', 'family/not-template', (d) => replace(d, L1, 'family=GEN-find-the-witness template=t1 kcs=KC-1.witness-class', 'family=GEN-find-the-witness template=t0 kcs=KC-1.witness-class')),
  // the generators the rail reads
  plant('a generator module that does not load', 'generators/load', (d) => write(d, 'packages/generators/src/call-it/index.ts', "throw new Error('broken on purpose')\n")),
  plant('a family with no generator module, under --strict', ['generators/missing', 'family/unregistered'], (d) => replace(d, L1, 'family=GEN-find-the-witness template=t1 kcs=KC-1.witness-class', 'family=GEN-guess-it template=t1 kcs=KC-1.witness-class'), { strict: true }),

  // lock copy (section 3.4 of the README): every phrase of lib/copy.mjs has a plant that it catches
  // a technical sense, a domain noun or a purpose clause that could hide a lock from a weaker rule
  say('lock copy in a sentence about a transfer', ['lock/unlock-content', 'lock/do-to-open'], 'Fix the transfer to unlock LAB-1.3.'),
  say('a lesson that stays locked behind a query', ['lock/content-locked', 'lock/not-until'], 'This lesson stays locked until your balance query returns unsat.'),
  say('a purpose clause that opens the next stage', 'lock/do-to-open', 'Pass the Defence to open the next stage.'),
  say('a purpose clause with the access first', 'lock/to-open-do', 'To open the next stage, pass the Defence.'),
  say('a lab record that is unlocked after a lesson', 'lock/locked-until-content', 'summary: Project 00, the counterexample lab of transfers, unlocked after S1.L3.', { file: LAB, from: 'summary: Project 00, the counterexample lab.' }),
  // round 2: a purpose clause with any task, a condition on "your" work, a condition then the content opens, a permission or closure
  say('a purpose clause that asks for answers', 'lock/do-to-open', 'Answer three items to open the next lesson.'),
  say('a purpose clause with the access first and "see"', 'lock/to-open-do', 'To see S1.L3, finish this lesson.'),
  say('a stage that opens when your query is unsat', ['lock/opens-on-progress', 'lock/opens-after'], 'The next stage opens when your transfer query is unsat.'),
  say('a condition, then the content opens', ['lock/once-done-opens', 'lock/once-done-granted'], 'Once you finish LAB-1.2, LAB-1.3 opens.'),
  say('the Defence, then the next stage opens', ['lock/once-done-opens', 'lock/once-done-granted'], 'After the Defence, S2 opens.'),
  say('a permission that waits on the Defence', 'lock/only-can-open', 'Only learners who pass the Defence can open S2.'),
  say('a lesson closed until the Defence', ['lock/closed-until-content', 'lock/content-closed', 'lock/not-until'], 'S1.L3 is closed to you until the Defence.'),
  say('a stage that requires a passed Defence', 'lock/requires-done', 'S2 requires a passed Defence.'),
  // round 3: a schedule, "not yet", a condition, progress with no object, DESIGN.md's words beside the course, a padlock
  say('a lesson that opens tomorrow', 'lock/content-on-a-schedule', 'S1.L3 opens tomorrow.'),
  say('a lesson you cannot open yet', 'lock/not-yet', "You can't open S1.L3 yet."),
  say('a stage that will not open until a sign-off', 'lock/not-until', "S2 won't open until you've signed off S1."),
  say('progress with no object', 'lock/do-to-move-on', 'Pass the Defence to progress.'),
  say('unlock the rest of the course', ['lock/unlock', 'lock/unlock-content'], 'Unlock the rest of the course.'),
  say('a padlock in a stage record', 'lock/padlock', 'summary: 🔒 Find a bug mathematically', { file: STAGE, from: 'summary: Find a bug mathematically' }),
  say('a drawer that opens on a schedule', 'lock/content-on-a-schedule', 'A recorded result, opened as a free run. This drawer opens tomorrow.', { file: D03, from: 'A recorded result, opened as a free run.' }),
  say('a stage record whose next stage starts after the Defence', 'lock/content-starts-after', 'summary: Find a bug mathematically. S2 starts after you pass the Defence', { file: STAGE, from: 'summary: Find a bug mathematically' }),
  say('the condition first, then the lesson is yours', ['lock/once-done-opens', 'lock/once-done-granted'], 'As soon as you finish, S1.L3 is yours.'),
  say('a score as the price of a stage', 'lock/opens-at-score', 'S2 opens at 80% mastery.'),
  say('a status label', 'lock/label', 'Not started · Locked'),
  say('a drawer with lock copy', ['lock/opens-on-progress', 'lock/do-then-granted', 'lock/complete-first', 'lock/opens-after'], 'Finish S1 first: this drawer opens after the Defence.', { file: D03, from: 'A recorded result, opened as a free run.' }),
  say('lock copy in the placement walk', ['lock/unlock', 'lock/unlock-content', 'lock/do-to-open'], 'Finish it to unlock S1.L3.', { file: PLACEMENT, from: OFFER }),
  // the markup around a thing is not a word: emphasis and a link to a drawer (round 1 of the repair run)
  say('a bold lesson that opens tomorrow', 'lock/content-on-a-schedule', '**S1.L3** opens tomorrow.'),
  say('an italic lesson you cannot open yet', 'lock/not-yet', "You *can't* open _S1.L3_ yet."),
  say('a drawer link you cannot open yet', 'lock/not-yet', "You can't open [D-03](/drawers/D-03) yet."),
  // a schedule in the plainest words: a weekday, a date in words, every day, from tomorrow
  say('a lesson that opens on a date in words', 'lock/content-on-a-schedule', 'S1.L3 opens on November 3.'),
  say('a new lesson every day', 'lock/content-on-a-schedule', 'A new lesson opens every day.'),
  say('a lesson that is yours tomorrow', 'lock/content-on-a-schedule', 'S1.L3 will be yours tomorrow.'),
  say('a schedule label', 'lock/content-on-a-schedule', 'Next lesson: tomorrow.'),
  say('the next one, unlocked by a check', ['lock/unlock-content', 'lock/do-to-open'], 'Pass this check to unlock the next one.'),
  say('a lock of another kind in a lab that waits on the Defence', 'lock/opens-on-progress', 'The vault in this lab opens after you pass the Defence.'),
  // one plant or more for each phrase no plant above reaches
  say('a requirement before the next lesson opens', ['lock/do-then-opens', 'lock/do-before-content', 'lock/do-then-granted', 'lock/must-do-before', 'lock/must-first'], 'You need to finish S1.L2 before S1.L3 opens.'),
  say('a permission only after a check', ['lock/can-open-after', 'lock/start-after', 'lock/can-open-on-progress', 'lock/only-after'], 'You can open S1.L3 only after you pass this check.'),
  say('not available until a lesson is finished', ['lock/available-after', 'lock/not-available', 'lock/until-you'], 'Not available until you finish S1.L2.'),
  say('a stage labeled locked', ['lock/locked', 'lock/label-locked'], 'S2: locked.'),
  say('lessons that unlock in order', ['lock/unlock', 'lock/content-unlocks', 'lock/in-order-only'], 'Lessons unlock in order.'),
  say('an answer to a question: not until', ['lock/not-eligible', 'lock/not-yet-answer'], 'S2? Not until the Defence.'),
  say('a stage earned by passing', ['lock/access-by-doing', 'lock/earned-content'], 'Earn S2 by passing the Defence.'),
  say('access once the Defence is passed', ['lock/access-by', 'lock/get-on-progress'], 'You get access to S2 once the Defence is passed.'),
  say('before you can start, you must pass', ['lock/before-access-do', 'lock/before-you-can', 'lock/must-first'], 'Before you can start S2, you need to pass the Defence.'),
  say('a prerequisite label', 'lock/required-for', 'Prereq: S1.L2'),
  say('locked content', 'lock/locked-content', 'Locked content'),
  say('a countdown to the next lesson', 'lock/countdown', 'Next lesson in 23h.'),
  say('complete to unlock', 'lock/to-unlock-end', 'Complete to unlock.'),
  say('one pass away', 'lock/progress-countdown', 'S1.L3 is one pass away.'),
  say('a stage behind the Defence', 'lock/content-behind', 'S2 sits behind the Defence.'),
  say('come back next week', 'lock/come-back-later', 'Come back next week for S2.'),
  say('a purpose clause that ends on the lesson', 'lock/to-get-content', 'Pass the check to get S1.L3.'),
  say('passing opens the next lesson', 'lock/doing-opens', 'Passing S1.L2 opens up S1.L3.'),
  say('available in seven days', ['lock/content-on-a-schedule', 'lock/becomes-available'], 'S2 becomes available in 7 days.'),
  say('a consequence in its own sentence', 'lock/then-opens', 'Pass the Defence. Then S2 opens.'),
  say('none of it until then', ['lock/none-until', 'lock/until-you'], 'No S2 until you pass the Defence.'),
  say('never start before the Defence', ['lock/dont-open-until', 'lock/not-until'], 'Never start S2 before the Defence.'),
  say('a stage gated by the Defence', 'lock/gated', 'This stage is gated by the Defence.'),
  say('you start once signed off', ['lock/start-after', 'lock/see-on-progress'], 'You start S2 once S1 is signed off.'),
  say('a lesson that shows up after a pass', ['lock/content-appears', 'lock/opens-on-progress'], 'S1.L4 shows up after you pass S1.L3.'),
  say('an answer to a question: first pass', 'lock/first-do', 'Ready for S2? First pass the Defence.'),
  say('the way in', 'lock/way-in', 'The way to S2 is through the Defence.'),
  say('a lesson that waits until a pass', ['lock/content-waits', 'lock/until-you'], 'S1.L3 waits until you pass this check.'),
  say('only once you pass can you open it', ['lock/only-after-can-you', 'lock/only-after'], 'Only once you pass can you open S1.L3.'),
  say('the Defence must be passed first', 'lock/must-be-done', 'The Defence must be passed to open S2.'),
  say('ready once you pass', ['lock/content-ready', 'lock/opens-on-progress'], 'S2 will be ready for you once you pass.'),
  say('cannot be opened before the Defence', ['lock/can-be-opened-after', 'lock/not-until'], 'S2 cannot be opened before the Defence.'),
  say('wait for the Defence', 'lock/wait-to-open', 'Wait for the Defence before you open S2.'),
  say('a stage as the reward', 'lock/reward-for', 'Your reward for passing the Defence: S2.'),
  say('closed without a sign-off', ['lock/content-closed', 'lock/without-done-cant'], 'Without signing off S1, S2 stays closed.'),
  say('locked until the Defence is passed', ['lock/locked', 'lock/content-locked', 'lock/until-done-cant'], 'Until the Defence is passed, S2 is locked.'),
  say('a drawer closed until a stage', ['lock/closed-until-content', 'lock/content-closed', 'lock/until-you', 'lock/closed-until'], 'The drawer stays closed until you reach S2.'),
  say('come back after a lesson', 'lock/come-back-after', 'Come back to LAB-1.3 after you finish S1.L3.'),
  say('may not open until the Defence', ['lock/not-until', 'lock/cant-until'], 'You may not open S2 until the Defence is passed.'),
  say('if you do not pass, you cannot start', 'lock/if-not-done-cant', "If you don't pass the Defence, you can't start S2."),
  say('a purpose that completes and opens', 'lock/do-to-and-open', 'Finish all four segments to complete the lesson and open the next one.'),
  say('a stage locked behind the Defence', 'lock/locked-behind-content', 'S2 is locked behind the Defence.'),

  // counters, loss framing and deadlines; rewards
  say('a streak', 'pressure/streak', 'Keep your streak alive: come back tomorrow.'),
  say('an overdue mark', 'pressure/overdue', 'Your next set is overdue.'),
  say('a count of days behind', ['pressure/behind', 'pressure/days-since'], 'You are 2 days behind.'),
  say('a missed day', 'pressure/missed-days', 'You missed yesterday.'),
  say('days in a row', 'pressure/in-a-row', '5 days in a row!'),
  say('a counter of days away', 'pressure/days-since', "You haven't practised in 4 days."),
  say('an overdue mark by another name', 'pressure/past-due', 'This review is past due.'),
  say('a chain', 'pressure/chain', 'Keep your chain going.'),
  say('do not miss a session', 'pressure/dont-lose', "Don't miss tomorrow's session."),
  say('loss framing', 'pressure/lose-progress', 'Come back tomorrow or lose your progress.'),
  say('a broken rhythm', 'pressure/lose-progress', 'Your rhythm is broken.'),
  say('due today', 'pressure/due', 'Due today: 3 reviews.'),
  say('a deadline by another name', 'pressure/finish-by', 'Finish by Sunday.'),
  say('days left', 'pressure/time-left', 'You have 3 days left to finish.'),
  say('your own deadline', 'pressure/deadline', 'Set your own deadline.'),
  say('a set that ends in hours', 'pressure/window-ends', 'Your set ends in 3 hours.'),
  say('a deadline on a day', 'pressure/deadline-day', 'Finish this set before the deadline on Friday.'),
  say('urgency', 'pressure/urgency', "Time's running out."),
  say('XP', 'reward/xp', 'You earned 50 XP for that answer.'),
  say('a ranking', 'reward/ranking', 'You beat 80% of learners.'),
  say('points for a click', 'reward/points', '+50 points.'),
  say('a badge for a click', 'reward/badge', 'You earned a badge.'),
  say('a level reached', 'reward/level-up', 'You reached level 2.'),
  say('praise on its own', 'reward/praise', 'Awesome!'),
  say('praise for a click', 'reward/praise', 'Great job!', { from: 'That answer was not safety. It answered the wrong question.' }),

  // internal names, each name and each kind of ID of the course's machinery that the glossary lists
  say('an internal name with a hyphen', 'internal/pocket checker', 'Your result carries a pocket-checker badge.', { from: MINIMAL }),
  say('an internal name in a stage record', 'internal/Shelf', 'summary: Find a bug mathematically, on the Shelf of side material', { file: STAGE, from: 'summary: Find a bug mathematically' }),
  say('an internal name in a drawer', 'internal/pocket checker', 'The pocket checker says "Every balance stays non-negative"', { file: D03, from: '"Every balance stays non-negative"' }),
  plant('an internal name in the lab manual', 'internal/pocket checker', (d) => edit(d, README, (t) => `${t}\nThe pocket checker runs offline.\n`)),
  plant('a cross-reference that names two internal terms', 'internal/cross-reference', (d) => edit(d, README, (t) => `${t}\nThe design notes call these lanes and dockets.\n`)),
  say('an internal name in the placement walk', 'internal/pocket checker', 'The pocket checker grades it.', { file: PLACEMENT, from: OFFER }),
  say('a docket', 'internal/docket', 'Check the docket for new incidents.'),
  say('a telescope', 'internal/telescope', 'The telescope shows where you are.'),
  say('the Hall of Records', 'internal/Hall of Records', 'The Hall of Records keeps dated incidents.'),
  say('a proof debt', 'internal/proof debt', 'Your proof debt is two goals.'),
  say('Judgment', 'internal/Judgment', 'Your Judgment went up this week.'),
  say('a tier name: Boot', 'internal/Boot', 'Boot asks one question.'),
  say('a tier name: core lesson', 'internal/tier', 'This core lesson has three segments.'),
  say('KC', 'internal/KC', 'Each KC has its own items.'),
  say('knowledge component', 'internal/knowledge component', 'Each knowledge component has its own items.'),
  say('a KC ID in copy', 'internal/id-kc', 'This item is tagged KC-1.witness-class.', { from: MINIMAL }),
  say('a KC ID in the placement walk', 'internal/id-kc', 'It checks KC-1.quantifier-negation first.', { file: PLACEMENT, from: OFFER }),
  say('a gate ID in a card', 'internal/id-gate', 'Next, find a transfer that makes the source balance negative (GATE-numbers checks it).'),
  say('a mechanic ID', 'internal/id-mechanic', 'This uses M-call-it.'),
  say('a generator ID', 'internal/id-generator', 'This item comes from GEN-call-it.'),
  say('an instrument ID', 'internal/id-instrument', 'Open INS-z3 to try it.'),
  say('a screen ID', 'internal/id-screen', 'Open SCR-today for your set.'),
  say('a task ID', 'internal/id-task', 'W1-T38 built this check.'),
  say('an owner decision ID', 'internal/id-owner-decision', 'OD-6 says so.'),
  say('a brief change ID', 'internal/id-brief-change', 'V2-05 says the rail shows titles.'),
  say('a misconception key', 'internal/id-misconception', 'This is dp:G4.'),

  // glossary terms before their lesson, at each place copy sits
  plant('Boot uses a term that is not Boot\'s', 'term/boot', (d) => replace(d, L0, 'An agent opened a pull request:', 'On your Bench, an agent opened a pull request:')),
  plant('Boot says run', 'term/boot', (d) => replace(d, L0, 'Is it safe for the sender?', 'Did the tests run against the guard?')),
  plant('a lesson uses a term from a later lesson', 'term/lesson', (d) => replace(d, L1, 'A green test suite checks the inputs', 'Your first claim comes later. A green test suite checks the inputs')),
  plant('a drawer uses a term from a later stage', 'term/drawer', (d) => replace(d, D03, '"Every balance stays non-negative" negates', 'A Goal Replay strip: "Every balance stays non-negative" negates')),
  // D-02 is used in S1, S2 and S4, so it sits at the end of S1, the first of them, and a term of S2 is early there
  plant('a drawer of several stages uses a term from after the first', 'term/drawer', (d) => write(d, D02, D02_TEXT.replace('A witness is one member', 'A Goal Replay shows the goals. A witness is one member'))),
  plant('a stage record uses a term from a later stage', 'term/stage', (d) => replace(d, STAGE, 'summary: Find a bug mathematically', 'summary: Find a bug mathematically, then watch a Goal Replay')),
  plant('a lab record uses a term from a later stage', 'term/lab', (d) => replace(d, LAB, 'summary: Project 00, the counterexample lab.', 'summary: Project 00, the counterexample lab, with a Goal Replay.')),
  plant('the placement walk uses a term that is not Boot\'s', 'term/placement', (d) => replace(d, PLACEMENT, OFFER, 'Your lab and your receipt come later.')),

  // anatomy: every rule; each end of each range one step past its limit, so a limit loosened by one at either end leaves
  // a plant missed (rules.test.mjs loosens each); and each part of a rule's condition (the cell, the role, the variant)
  plant('Boot at nine minutes, one over its eight', 'anatomy/boot-minutes', (d) => replace(d, L0, '## What it showed {minutes=3}', '## What it showed {minutes=5}')),
  plant('Boot without a call', 'anatomy/boot-call', (d) => {
    replace(d, L0, ':::instrument ins=INS-z3 cell=1 recorded=RUN-z3-boot-variant', ':::instrument ins=INS-z3 cell=1 recorded=RUN-z3-boot-variant call=false')
    edit(d, L0, (t) => t.replace(/\n@call[\s\S]*?(?=\n@after)/, ''))
  }),
  // the call comes before the first run: a free run first, or a fixed question after the run, asks it too late
  plant('Boot whose first cell runs free, before the cell with the call', 'anatomy/boot-call', (d) => replace(d, L0, ':::instrument ins=INS-z3 cell=1 recorded=RUN-z3-boot-variant\n', ':::instrument ins=INS-z3 cell=2 recorded=RUN-z3-boot-variant call=false\nThe same transfer, with no question first.\n:::\n\n:::instrument ins=INS-z3 cell=1 recorded=RUN-z3-boot-variant\n')),
  plant('Boot whose only call is a fixed question after its first run', 'anatomy/boot-call', (d) => {
    replace(d, L0, ':::instrument ins=INS-z3 cell=1 recorded=RUN-z3-boot-variant', ':::instrument ins=INS-z3 cell=1 recorded=RUN-z3-boot-variant call=false')
    edit(d, L0, (t) => t.replace(/\n@call[\s\S]*?(?=\n@after)/, ''))
    replace(d, L0, '## What it showed {minutes=3}\n', `## What it showed {minutes=3}\n\n${BOOT_QUESTION}`)
  }),
  plant('Boot without the "this will feel harder" card', 'anatomy/boot-feels-harder', (d) => edit(d, L0, (t) => t.replace(/:::card variant=feels-harder[\s\S]*?:::\n/, ''))),
  plant('Boot that ends on a card of another variant', 'anatomy/boot-feels-harder', (d) => replace(d, L0, ':::card variant=feels-harder', ':::card variant=twin')),
  plant('a core lesson that opens with a cell', 'anatomy/core-opener', (d) => replace(d, L1, 'A green test suite checks the inputs its author thought of.', ':::instrument ins=INS-z3 cell=7 recorded=RUN-z3-starter call=false\nFirst a run.\n:::\n\nA green test suite checks the inputs its author thought of.')),
  plant('a core lesson that opens with a graded item', 'anatomy/core-opener', (d) => replace(d, L1, 'A green test suite checks the inputs its author thought of.', '::item role=segment family=GEN-negate-it template=t1 kcs=KC-1.quantifier-negation\n\nA green test suite checks the inputs its author thought of.')),
  plant('a core lesson with one segment', 'anatomy/core-segments', (d) => edit(d, L1, (t) => t.replace(/## The violation query[\s\S]*?(?=## Exit)/, ''))),
  plant('a core lesson with five segments', 'anatomy/core-segments', (d) => replace(d, L1, '## Exit {minutes=5}', `${extraSegment('A second witness', 4)}${extraSegment('A third witness', 5)}## Exit {minutes=5}`)),
  plant('a core segment of 11 minutes', 'anatomy/core-segment-minutes', (d) => replace(d, L1, '## The violation query {minutes=13', '## The violation query {minutes=11')),
  plant('a core segment of 16 minutes', 'anatomy/core-segment-minutes', (d) => replace(d, L1, '## The violation query {minutes=13', '## The violation query {minutes=16')),
  plant('a core segment that does not end in a graded item', 'anatomy/segment-ends-graded', (d) => replace(d, L1, '::item role=segment family=GEN-find-the-witness template=t1 kcs=KC-1.witness-class\n', 'The class is every input with a larger amount than balance.\n')),
  plant('a core segment that ends in an exit item', 'anatomy/segment-ends-graded', (d) => replace(d, L1, `${MINIMAL}\n\n::item role=segment family=GEN-find-the-witness template=t1 kcs=KC-1.witness-class`, `${MINIMAL}\n\n::item role=exit family=GEN-find-the-witness template=t1 kcs=KC-1.witness-class`)),
  plant('a core lesson with no prequestion', 'anatomy/prequestions', (d) => edit(d, L1, (t) => t.replace(/:::item role=prequestion[\s\S]*?\n:::\n\n/g, ''))),
  plant('a core lesson with three prequestions', 'anatomy/prequestions', (d) => replace(d, L1, '## The violation query {minutes=13 kcs=KC-1.violation-as-sat}\n', '## The violation query {minutes=13 kcs=KC-1.violation-as-sat}\n\n::item role=prequestion family=GEN-call-it template=t1 kcs=KC-1.violation-as-sat\n')),
  plant('a segment whose cells run two instruments', 'anatomy/one-tool', (d) => replace(d, L1, ':::instrument ins=INS-z3 cell=1 ', ':::instrument ins=INS-pglite cell=9 recorded=RUN-z3-demorgan call=false\nA second tool.\n\n```sql\nselect 1;\n```\n:::\n\n:::instrument ins=INS-z3 cell=1 ')),
  plant('a core segment with no instrument cell', 'anatomy/core-cell', (d) => edit(d, L1, (t) => t.replace(/:::instrument ins=INS-z3 cell=3[\s\S]*?\n:::\n/, ''))),
  plant('a core segment with two cells, under --strict', 'anatomy/core-cells', (d) => replace(d, L1, '::item role=segment family=GEN-call-it template=t1 kcs=KC-1.violation-as-sat\n', ':::instrument ins=INS-z3 cell=8 recorded=RUN-z3-starter call=false\nThe same run again.\n:::\n\n::item role=segment family=GEN-call-it template=t1 kcs=KC-1.violation-as-sat\n'), { strict: true }),
  plant('a core segment that asks for no call', 'anatomy/core-call', (d) => freeRunCell3(d)),
  // a generated Call It is an item of GEN-call-it with the role segment: an exit item of the family is not the segment's call
  plant('a core segment whose only Call It is an exit item', 'anatomy/core-call', (d) => {
    freeRunCell3(d)
    replace(d, L1, `${MINIMAL}\n`, `${MINIMAL}\n\n::item role=exit family=GEN-call-it template=t1 kcs=KC-1.witness-class\n`)
  }),
  plant('a core lesson without exit items', 'anatomy/core-exit', (d) => edit(d, L1, (t) => t.replace(/::item role=exit [^\n]*\n\n/g, ''))),
  plant('a core lesson without a Build this card', 'anatomy/core-build-this', (d) => edit(d, L1, (t) => t.replace(/:::card variant=build-this[\s\S]*?:::\n/, ''))),
  plant('a Build this card that names no lab stage', 'anatomy/core-build-this', (d) => replace(d, L1, ':::card variant=build-this title="Build this" lab=LAB-1.2', ':::card variant=build-this title="Build this"')),
  plant('a Build this card that names a lab stage the registry does not have', 'anatomy/build-this-lab', (d) => replace(d, L1, ':::card variant=build-this title="Build this" lab=LAB-1.2', ':::card variant=build-this title="Build this" lab=LAB-1.99')),
  plant('a Build this card that names a lesson, in a bridge', 'anatomy/build-this-lab', (d) => replace(d, L2, ':::card variant=build-this title="Build this" lab=LAB-1.3', ':::card variant=build-this title="Build this" lab=S1.L3')),
  plant('a core lesson whose lab card is a twin card', 'anatomy/core-build-this', (d) => replace(d, L1, ':::card variant=build-this title="Build this" lab=LAB-1.2', ':::card variant=twin title="Build this" lab=LAB-1.2')),
  plant('a core lesson planned at 39 minutes, under --strict', 'anatomy/core-planned', (d) => edit(d, L1, (t) => t.replace('{minutes=13 kcs=KC-1.quantifier-negation', '{minutes=12 kcs=KC-1.quantifier-negation').replace('## The violation query {minutes=13', '## The violation query {minutes=12').replace('## One witness, one class {minutes=14', '## One witness, one class {minutes=12').replace('## Exit {minutes=5}', '## Exit {minutes=3}')), { strict: true }),
  plant('a core lesson planned at 61 minutes, under --strict', 'anatomy/core-planned', (d) => replace(d, L1, '## Exit {minutes=5}', '## Exit {minutes=21}'), { strict: true }),
  plant('exit items before the exit, under --strict', 'anatomy/exit-last', (d) => replace(d, L1, '::item role=segment family=GEN-call-it template=t1 kcs=KC-1.violation-as-sat\n', '::item role=exit family=GEN-call-it template=t2 kcs=KC-1.violation-as-sat\n\n::item role=segment family=GEN-call-it template=t1 kcs=KC-1.violation-as-sat\n'), { strict: true }),
  plant('a bridge of 1,001 words', 'anatomy/bridge-words', (d) => replace(d, L2, 'The solver answers for one query, one encoding and one run.', `The solver answers for one query, one encoding and one run. ${filler(1001 - BRIDGE_FIXTURE_WORDS)}`)),
  plant('a cell that asks for a call and carries none', 'anatomy/call-carried', (d) => edit(d, L2, (t) => t.replace(/@call key=C run=RUN-z3-unknown-pow[\s\S]*?(?=\n@after)/, ''))),
  plant('a bridge with no cell that asks for a call, under --strict', 'anatomy/bridge-cell', (d) => {
    replace(d, L2, ':::instrument ins=INS-z3 cell=1 recorded=RUN-z3-unknown-pow', ':::instrument ins=INS-z3 cell=1 recorded=RUN-z3-unknown-pow call=false')
    edit(d, L2, (t) => t.replace(/\n@call key=C run=RUN-z3-unknown-pow[\s\S]*?(?=\n@after)/, ''))
  }, { strict: true }),
  plant('a bridge without a reading pointer', 'anatomy/bridge-reading', (d) => edit(d, L2, (t) => t.replace(/:::card variant=reading[\s\S]*?:::\n\n/, ''))),
  plant('a bridge whose reading pointer is not dated', 'anatomy/bridge-reading-date', (d) => replace(d, L2, ' Read 2026-10-23.', ' Read it.')),
  plant('a bridge whose prequestion leaves out a component', 'anatomy/bridge-kcs', (d) => replace(d, L2, 'kcs=KC-1.three-answers,KC-1.unknown-fails-closed\n@choice', 'kcs=KC-1.three-answers\n@choice')),
  plant('a bridge that lists an earlier component and leaves out a new one', 'anatomy/bridge-kcs', (d) => {
    replace(d, L2, 'kcs: [KC-1.three-answers, KC-1.unknown-fails-closed]', 'kcs: [KC-1.three-answers, KC-1.unknown-fails-closed, KC-1.witness-class]')
    replace(d, L2, 'kcs=KC-1.three-answers,KC-1.unknown-fails-closed\n@choice', 'kcs=KC-1.three-answers\n@choice')
  }),
  plant('a bridge with no prequestion', 'anatomy/prequestions', (d) => edit(d, L2, (t) => t.replace(/:::item role=prequestion[\s\S]*?\n:::\n\n/, ''))),
  plant('a bridge with two prequestions', 'anatomy/prequestions', (d) => replace(d, L2, '::item role=segment family=GEN-call-it template=t4 kcs=KC-1.three-answers', '::item role=prequestion family=GEN-call-it template=t2 kcs=KC-1.three-answers\n\n::item role=segment family=GEN-call-it template=t4 kcs=KC-1.three-answers')),
  plant('a bridge without its graded item', 'anatomy/bridge-segment-item', (d) => replace(d, L2, '::item role=segment family=GEN-call-it template=t4 kcs=KC-1.three-answers\n', '')),
  plant('a bridge without its exit item', 'anatomy/bridge-exit', (d) => replace(d, L2, '::item role=exit family=GEN-which-stamp template=t1 kcs=KC-1.unknown-fails-closed,KC-1.three-answers\n', '')),
  plant('a bridge segment that ends in prose after its graded item', 'anatomy/segment-ends-graded', (d) => replace(d, L2, '::item role=segment family=GEN-call-it template=t4 kcs=KC-1.three-answers\n', '::item role=segment family=GEN-call-it template=t4 kcs=KC-1.three-answers\n\nThat is the whole idea.\n')),
  plant('a bridge planned at 14 minutes, under --strict', 'anatomy/bridge-planned', (d) => replace(d, L2, '## Exit {minutes=4}', '## Exit {minutes=2}'), { strict: true }),
  plant('a bridge planned at 26 minutes, under --strict', 'anatomy/bridge-planned', (d) => replace(d, L2, '## What each answer asserts {minutes=12}', '## What each answer asserts {minutes=22}'), { strict: true }),
  plant('a lesson with no graded item', 'anatomy/graded', (d) =>
    edit(d, L2, (t) =>
      t
        .replace(/:::item role=prequestion[\s\S]*?\n:::\n\n/, '')
        .replace(/::item role=[a-z]+ [^\n]*\n\n?/g, '')
        .replace(':::instrument ins=INS-z3 cell=1 recorded=RUN-z3-unknown-pow', ':::instrument ins=INS-z3 cell=1 recorded=RUN-z3-unknown-pow call=false')
        .replace(/\n@call key=C run=RUN-z3-unknown-pow[\s\S]*?(?=\n@after)/, ''),
    ),
  ),

  // the page, the record and the drawer
  plant('a lesson without an objective', 'front/objective', (d) => edit(d, L1, (t) => t.replace(/^objective: .*\n/m, ''))),
  plant('a lesson that lists no knowledge component', 'front/kcs', (d) => edit(d, L1, (t) => t.replace(/^kcs:\n(?: {2}- .*\n)+/m, 'kcs: []\n'))),
  plant('a lesson page with the wrong tier', 'front/tier', (d) => replace(d, L2, 'tier: bridge', 'tier: core')),
  plant('a lesson page whose ID is not registered', 'front/id', (d) => replace(d, L1, 'id: S1.L1', 'id: S1.L99')),
  plant('a lesson page without a title', 'front/title', (d) => replace(d, L1, 'title: Negate, then search\n', '')),
  plant('a stage record whose ID is not a stage', 'front/record-id', (d) => replace(d, STAGE, 'id: S1', 'id: X1')),
  plant('a deferred drawer without a trigger', 'drawer/card-field', (d) => edit(d, D33, (t) => t.replace(/ {2}trigger: .*\n/, ''))),
  plant('a deferred drawer without its card', 'drawer/card', (d) => edit(d, D33, (t) => t.replace(/^deferred:\n(?: {2}.*\n)+/m, ''))),
  plant('a deferred drawer with a segment', 'drawer/segments', (d) => edit(d, D33, (t) => `${t.trimEnd()}\n\n## Notes {minutes=2}\n\nThe notes come later.\n`)),
  plant('a page that cannot be read', 'read/page', (d) => replace(d, L2, '## Exit {minutes=4}', '## Exit')),
  // the build refuses prose written as a block; the gate leaves out only the build's problems that a rule of its own reports
  plant('prose written as a block, which the build refuses', 'read/page', (d) => replace(d, L1, MINIMAL, `:::prose\n${MINIMAL}\n:::`)),
  plant('a record that cannot be read', 'read/record', (d) => replace(d, STAGE, 'drawers: [D-01, D-02, D-03, D-04, D-06, D-13]', 'drawers: [D-01, D-02')),
  plant('a page that is not UTF-8', 'read/utf8', (d) => fs.appendFileSync(path.join(d, D03), Buffer.from([0x0a, 0xff, 0xfe, 0x0a]))),
  plant('a built lesson that is not JSON', 'read/built-json', (d) => write(d, BUILT, 'not json')),
  plant('a built lesson with no segments and no rail', 'read/built-shape', (d) => write(d, BUILT, JSON.stringify({ schema: 'statespace/lesson@1', id: 'S1.L1' }))),
  plant('no lesson and no drawer, under --strict', 'read/empty', (d) => {
    for (const rel of [L0, L1, L2, D03, D33]) fs.rmSync(path.join(d, rel))
  }, { strict: true }),

  // the glossary, which is data the spine decides
  gloss('a glossary the YAML reader cannot read', ['glossary/yaml', 'glossary/root'], swap('format: glossary/1', 'format: [glossary/1')),
  gloss('a glossary that is not a mapping', 'glossary/root', () => '- a list, not a mapping\n'),
  gloss('a glossary of another format', 'glossary/format', swap('format: glossary/1', 'format: glossary/2')),
  gloss('a glossary whose terms are not a list', ['glossary/terms', 'glossary/count', 'glossary/spine-count', 'glossary/spine-row'], swap('\nterms:\n', '\nterms: none\nlegacy:\n')),
  gloss('a glossary with a twenty-sixth term', ['glossary/count', 'glossary/spine-count'], swap('    forms: [Theater]\n    caseSensitive: true\n', '    forms: [Theater]\n    caseSensitive: true\n  - n: 26\n    term: Gallery\n    meaning: a wall of specimens\n    introduced: S5\n    from: S5.L1\n    forms: [Gallery]\n')),
  gloss('a term that is not a mapping', 'glossary/term', swap('terms:\n  - n: 1\n', 'terms:\n  - just a word\n  - n: 1\n')),
  gloss('a term without its number', ['glossary/term-n', 'glossary/numbering'], swap('  - n: 1\n', '  - n: one\n')),
  gloss('a term without its meaning', 'glossary/term-text', swap('    meaning: a verdict and a confidence committed before a run (Call It)\n', "    meaning: ''\n")),
  gloss('a term whose first lesson is not a lesson', ['glossary/term-from', 'glossary/from-registered'], swap('    introduced: Boot\n    from: S1.L0\n    forms: [call, calls, called]', '    introduced: Boot\n    from: Boot\n    forms: [call, calls, called]')),
  gloss('a term without forms', ['glossary/term-forms', 'glossary/count'], swap('    forms: [call, calls, called]', '    forms: []')),
  gloss('a term whose case is not true or false', 'glossary/term-case', swap('    forms: [Today]\n    caseSensitive: true', '    forms: [Today]\n    caseSensitive: often')),
  gloss('a term whose until is not text', 'glossary/term-until', swap('    until: say "result", and label the cold-start fallback "recorded result"', '    until: 5')),
  gloss('a term whose unmatched word is empty', 'glossary/term-unmatched', swap('      - word: check\n', "      - word: ''\n")),
  gloss('a glossary whose internal names are not a list', 'glossary/internal', swap('\ninternal:\n', '\ninternal: none\nlegacy:\n')),
  gloss('an internal name that is not a mapping', 'glossary/internal-entry', swap('\ninternal:\n', '\ninternal:\n  - just a word\n')),
  gloss('an internal name without what learners see', 'glossary/internal-text', swap('    say: Start here\n', "    say: ''\n")),
  gloss('an internal name without forms', 'glossary/internal-forms', swap('    forms: [docket, dockets]', '    forms: []')),
  gloss('an internal name whose case is not true or false', 'glossary/internal-case', swap('    forms: [Shelf]\n    caseSensitive: true', '    forms: [Shelf]\n    caseSensitive: often')),
  gloss('internal kinds of ID that are not a list', 'glossary/internal-ids', (t) => t.replace(/^internalIds: .*$/m, 'internalIds: kc')),
  gloss('an internal kind of ID the registry does not have', 'glossary/id-kind', (t) => t.replace(/^internalIds: \[/m, 'internalIds: [wizard, ')),
  gloss('terms out of the spine\'s order', ['glossary/numbering', 'glossary/spine-term'], (t) => swap('  - n: 2\n    term: stamp', '  - n: 1\n    term: stamp')(swap('  - n: 1\n    term: call', '  - n: 2\n    term: call')(t))),
  gloss('a glossary term the spine does not have', 'glossary/spine-term', swap('term: Bench', 'term: Workbench')),
  plant('a glossary term introduced somewhere else', ['glossary/spine-introduced'], (d, repo) => glossaryEdit(d, repo, (t) => setField(setField(t, 'claim', 'introduced', 'S1.L2'), 'claim', 'from', 'S1.L2'))),
  plant('a sixth term in Boot', ['glossary/boot-count', 'glossary/boot-number', 'glossary/from-lesson'], (d, repo) => glossaryEdit(d, repo, (t) => setField(t, 'run', 'from', 'S1.L0'))),
  plant('a Boot term that starts after Boot', ['glossary/from-boot', 'glossary/boot-terms'], (d, repo) => glossaryEdit(d, repo, (t) => setField(t, 'Today', 'from', 'S1.L1'))),
  plant('a term whose copy starts in another stage', 'glossary/from-stage', (d, repo) => glossaryEdit(d, repo, (t) => setField(t, 'lab · check', 'from', 'S2.L1'))),
  gloss('a term listed twice', ['glossary/duplicate', 'glossary/spine-term'], swap('    term: seam\n', '    term: claim\n')),
  plant('a spine without its glossary table', 'glossary/spine-table', (d) => write(d, 'docs/spine/SPINE.md', '# The spine\n\nNo glossary table here.\n')),
  gloss('a word that is a term and an internal name', ['glossary/form-collision', 'internal/lane'], swap('forms: [lane, lanes]', 'forms: [lane, lanes, drawer]')),
]

/** Set one field of one term of the glossary text, leaving the rest as it is. */
function setField(text, term, field, value) {
  const start = text.indexOf(`    term: ${term}\n`)
  if (start < 0) throw new Error(`the glossary has no term ${term}`)
  const next = text.indexOf('\n  - n:', start)
  const block = text.slice(start, next < 0 ? undefined : next)
  const line = new RegExp(`^( {4}${field}: ).*$`, 'm')
  if (!line.test(block)) throw new Error(`the term ${term} has no ${field}`)
  return text.slice(0, start) + block.replace(line, `$1${value}`) + (next < 0 ? '' : text.slice(next))
}

/** The glossary is the repository's unless the tree carries its own: plant the fault in a copy that the tree holds. */
function glossaryEdit(dir, repo, change) {
  const target = path.join(dir, 'content', 'glossary.yaml')
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const text = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : fs.readFileSync(path.join(repo, 'content', 'glossary.yaml'), 'utf8')
  const after = change(text)
  if (after === text) throw new Error('the plant did not change the glossary')
  fs.writeFileSync(target, after)
}
