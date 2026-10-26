// The copy rules of GATE-lessons, run on one string of learner copy (spine section 0 and section 11.2):
//
//   internal   an internal name (lane, Shelf, docket, pocket checker, telescope, Hall of Records, proof debt,
//              Judgment, a tier name, KC) or an ID of the course's machinery (a knowledge component, a gate, a
//              mechanic, a generator family, an instrument, a screen, a task, an owner decision, a misconception key)
//   term       a glossary term used before the lesson its "First introduced" column names, Boot's copy using
//              terms 1 to 5 only
//   lock       copy that makes a lesson, drawer, stage, lab, case or the Defence wait on something (I5): on the
//              learner's progress, on a time, or on nothing said
//   pressure   daily counters and loss framing (docs/EVIDENCE.md section 4, rows 6, 7 and 17): a streak, days away,
//              an overdue mark or count, "you're behind", a deadline, loss of progress
//   reward     XP, points, badges, levels, rankings and praise for a click (docs/DESIGN.md section 11.4)
//
// Every rule reads sentences of the masked text (code, links' targets, references, tags and emphasis marks blanked), so
// a finding carries an offset into the original string and the original's words. Each finding names the rule that
// raised it (`rule`, `<check>/<name>`, lib/rules.mjs); a lock finding also names every lock phrase that matched its
// sentence (`rules`). The lock, pressure and reward patterns are in this file, with their tables in copy.test.mjs and
// their corpora in fixtures/copy/, because they are rules and not vocabulary.

import { blankSpans, maskCopy, splitSentences } from './text.mjs'
import { comparePositions } from './glossary.mjs'

/**
 * A pattern's literal spaces, outside its character classes, as runs of white space, and its literal commas as commas
 * that white space may precede: emphasis marks are blanked to spaces ("**S1.L3** opens" reads "  S1.L3   opens", and
 * "After *S1.L2*, S1.L3 opens" reads "After  S1.L2 , S1.L3 opens"), and a sentence may wrap at any space, so "in a row"
 * also reads "in  a\nrow". A space before a quantifier (" ?") becomes one white-space character, quantified the same way;
 * a quantifier's own comma ("{0,60}") is left alone.
 */
export function spaced(source) {
  let out = ''
  let inClass = false
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i]
    const quantifier = c === '{' && !inClass ? /^\{[0-9]*,?[0-9]*\}/.exec(source.slice(i)) : null
    if (c === '\\') {
      out += c + (source[i + 1] ?? '')
      i += 1
    } else if (inClass) {
      if (c === ']') inClass = false
      out += c
    } else if (c === '[') {
      inClass = true
      out += c
    } else if (quantifier !== null) {
      out += quantifier[0]
      i += quantifier[0].length - 1
    } else if (c === ' ') {
      while (source[i + 1] === ' ') i += 1
      out += source[i + 1] !== undefined && '?*+{'.includes(source[i + 1]) ? '\\s' : '\\s+'
    } else if (c === ',') out += '\\s*,'
    else out += c
  }
  return out
}
/** The same regular expression with its spaces read as runs of white space (spaced). */
const ws = (re) => new RegExp(spaced(re.source), re.flags)

// ------------------------------------------------------------------ lock copy (I5)
//
// The lock rule is built from one vocabulary and a set of frames. The vocabulary says what a learner can open (the
// thing), how a clause grants it (the access), what the learner does (the progress) and when (a time). Each frame is
// one way English makes access wait: the thing opens after the progress; it does not open until or yet; a purpose
// clause ("do X to open Y"); a consequence ("do X and Y opens"); the condition first ("once you X, Y opens"); a
// schedule; a requirement; a means ("passing X opens Y"); a restriction ("only learners who X"); a closure or a label.
// A frame reads any word of the vocabulary in each of its slots: the vocabulary matrix (lib/corpus.mjs, which
// copy.test.mjs and --self-check read) slots every word of the README's lists into each kind of frame that has the slot,
// and each thing into one sentence of each kind. scripts/spikes/W1-T38/README.md section 3.4 has every frame with an example,
// and what is not lock copy. Each phrase is a rule (`lock/<name>`, lib/rules.mjs) with a plant that names it.

/** The ID of a stage or lesson (S1, S1.L3), of a lab or one of its stages (LAB-1, LAB-1.2), of a drawer (D-03) or of an audit case (AUD-1.1). */
const ID = String.raw`(?:S[1-9][0-9]*(?:\.L[0-9]+)?|LAB-[1-9][0-9]*(?:\.[1-9][0-9]*)?|D-[0-9]{2}|AUD-[1-9][0-9]*\.[1-9][0-9]*)`
/** Nouns that name a piece of the course whatever stands before them: a lesson, stage, lab, drawer, audit case, the Defence. */
const STRONG = String.raw`(?:lessons?|stages?|labs?|drawers?|Defen[cs]es?|audit cases?)`
/**
 * Nouns that name a piece of the course only after a word that points at one: "the next module", "this unit", "more
 * content", "every segment", "your next level", "level 2", "the course". "The parser module", "unit tests" and "the
 * isolation level" are something else.
 */
const WEAK = String.raw`(?:courses?|content|modules?|units?|segments?|levels?|chapters?|sections?|exercises?|parts?)`
const POINT = String.raw`(?:next|following|previous|later|earlier|new|more|other|remaining|further|upcoming|first|second|third|last|final|whole|entire|current|each|every|all|this|that|these|those|your)`
const WEAK_PHRASE = String.raw`(?:${POINT}\s+(?:(?:${POINT}|[0-9]+|two|three|four|five)\s+)?${WEAK}|(?:the|this|your|our)\s+(?:course|content)|(?:level|module|unit|chapter|section|segment)\s+[0-9]+)`
/** "The rest of the course", "the rest of this page". */
const REST = String.raw`(?:the\s+rest\s+of\s+(?:the|this|your)\s+(?:course|lessons?|page|stages?|labs?|drawers?|content|material|segments?|sections?|chapters?|modules?|units?))`
/** Words that name something a learner can open, for the sentence test: the nouns above, and topics, exercises, chapters and sections. */
const CONTENT_WORD = /\b(?:lessons?|drawers?|stages?|labs?|Defence|Defense|sections?|chapters?|topics?|exercises?|audit)\b/i
const CONTENT_PHRASE = new RegExp(spaced(String.raw`\b(?:${WEAK_PHRASE}|${REST})\b`), 'i')
/** The ID of one, in exact case: `s1` and `s2` are sessions, steps or states. */
const CONTENT_ID = new RegExp(String.raw`\b${ID}\b`)
const namesContent = (text) => CONTENT_WORD.test(text) || CONTENT_ID.test(text) || CONTENT_PHRASE.test(text)
/** "The next one", which names a thing only beside a frame: "unlock the next one", "the next one opens tomorrow" ("the next one in the list" is not one). */
const NEXT_ONE = /\b(?:the|this|your)\s+(?:next|following)\s+one\b/i

/** A sentence about locks in the other sense (a mutex, a row, a locked account, SQL's SKIP LOCKED, a vault, a door, a phone) is not lock copy. */
/** The thing a lock of another kind sits in: "the lock in LAB-6 opens after the transaction commits" is about a lock, and LAB-6 is where it is. */
const HELD_IN = /\b(?:locks?|vaults?|doors?|gates?|safes?|rows?|tables?|accounts?|transactions?|mutex(?:es)?|threads?|records?|files?|sessions?|connections?|ports?|valves?|phones?|devices?|keys?|wallets?|servers?|workers?|jobs?|queues?)\s+(?:in|of|from|inside|within|at|on|for)\s+(?:the\s+|this\s+|that\s+|your\s+)?(?:\S+\s+){0,2}$/i
const NOT_ABOUT_CONTENT = ws(/\b(?:mutex(?:es)?|semaphores?|threads?|transactions?|rows?|tables?|advisory|lock manager|critical sections?|deadlocks?|spinlocks?|latch(?:es)?|isolation|serializ\w+|two-phase|concurren\w+|database|postgres(?:ql)?|process(?:es)?|resources?|records?|accounts?|balances?|funds?|transfers?|refunds?|holds?|payments?|skip locked|for update|for share|nowait|lock_timeout|workers?|jobs?|queues?|outbox|vaults?|doors?|safes?|phones?|devices?|wallets?|keys?|passwords?|PINs?|sessions?)\b/i)

const APOS = `(?:'|’)`

/** A sentence that says the policy, in the negative: "it unlocks nothing", "nothing is locked", "but you don't have to". */
const LOCK_DENIAL = new RegExp(spaced(String.raw`\b(?:unlocks? nothing|nothing (?:is |gets |ever )?(?:locked|unlocked|gated)|nothing locks|never (?:locked|locks)|(?:is|are) never (?:locked|gated)|not (?:locked|gated)|you don${APOS}t have to|you do not have to|in any order|(?:is|are|stays?) open either way)\b`), 'i')

/** A stretch of a sentence: anything but a full stop, except the full stop inside an ID (S1.L3, LAB-1.2). */
const GAP = String.raw`(?:[^.;:!?\n]|\.(?=[0-9L]))`
/** A stretch that holds no "now", "anytime" or "whenever": "you can open S1.L3 now or after this lesson" is an invitation. */
const OPEN_GAP = String.raw`(?:(?!\b(?:now|anytime|any time|whenever|either way)\b)${GAP})`

/** Something a learner can open: the ID of one, a lesson, stage, lab, drawer, audit case, the Defence, a module, unit, segment or level a word points at, the course, the rest of it. The IDs come first so that a match holds the whole ID. */
const REF = String.raw`(?:${ID}|${STRONG}(?:\s+[0-9]+\b(?![.-]))?|${WEAK_PHRASE}|${REST})`
/** What may stand between "unlock" and the thing unlocked, or between an owner and what it owns: "the next", "this", "all", "a new", "the next two", "the first". */
const DET = String.raw`(?:(?:the|this|that|these|those|your|a|an|each|every|all|any|more|new|further|other|remaining|another|next|following|previous|later|first|second|third|last|final|[0-9]+|one|two|three|four|five|six|both|several|many)\s+){0,3}`
/** A noun after a lesson, stage, lab or drawer that makes it a modifier: "the lab folder", "the lesson summary", "the lab page", "the Defence retake" (THING_SCAN). */
const MODIFIED = String.raw`(?:page|pages|folder|folders|directory|README|file|files|repo|repository|zip|summary|summaries|list|lists|card|cards|title|titles|menu|tab|tabs|link|links|view|notes?|kit|template|templates|manual|guide|row|rows|table|tables|output|outputs|results?|verdicts?|checks?|receipts?|report|reports|screen|instructions|text|copy|video|figure|sheet|rail|segments?|items?|questions?|cells?|heading|map|overview|index|records?|parts?|steps?|starter|tests?|retakes?|attempts?|icons?|badges?|names?|numbers?|order|header|buttons?|banner|plan|schedule|length|timer|goals?|strips?|model|models|spec|specs|code)`
/** What may stand between a thing and "locked": "is", "stays", "will remain", "is still", "is not" ("is not locked" is the policy, LOCK_DENIAL; "is not yet unlocked" is not-yet's). */
const WAITS = String.raw`(?:(?:is|are|stays?|remains?|gets?|becomes?|will be|will stay|will remain|is not|are not)\s+)?(?:(?:still|now|also)\s+)?`
/** Closed by another word: "hidden", "unavailable", "out of reach". */
const CLOSED = String.raw`(?:closed|hidden|unavailable|blocked|disabled|greyed out|grayed out|off-limits|off limits|out of reach|out of bounds|inaccessible|invisible|shut|sealed)`
/** The learner's progress as the price of access: "complete", "finish", "pass". */
const DO = String.raw`(?:complete|finish|pass|clear|solve|earn)`
/** The same verbs in any form: "passes", "finished", "completing". */
const DONE = String.raw`(?:complet(?:e|es|ed|ing)|finish(?:es|ed|ing)?|pass(?:es|ed|ing)?|clear(?:s|ed|ing)?|solv(?:e|es|ed|ing)|earn(?:s|ed|ing)?)`
/** The learner's progress in any form, wider: also mastering, scoring, submitting, answering, signing off and getting it right. */
const DONE_WIDE = String.raw`(?:${DONE}|master(?:s|ed|ing)?|scor(?:e|es|ed|ing)|submit(?:s|ted|ting)?|answer(?:s|ed|ing)?|sign(?:s|ed|ing)?\s+off|ace[sd]?|wrap(?:s|ped|ping)?\s+up|get(?:s|ting)?\s+through|got\s+through|make(?:s)?\s+it\s+through|made\s+it\s+through|get(?:s|ting)?\b${GAP}{0,30}?\bright|got\b${GAP}{0,30}?\bright)`
/** The progress as a participle: "S1 is signed off", "all exit items are answered", "the Defence is behind you". */
const DONE_PART = String.raw`(?:done|complete|completed|finished|passed|cleared|solved|signed off|answered|submitted|mastered|scored|right|over|behind you|out of the way)`
/** What a purpose clause can ask for before it opens something: "answer three items to open the next lesson", "get three calls right to see it". */
const DO_PURPOSE = String.raw`(?:complete|finish|pass|clear|solve|earn|answer|submit|score|import|mount|master|win|collect|fix|find|write|prove|build|reach|meet|mint|sign off|ace|get through|make it through|get\b${GAP}{0,30}\bright)`
/** What a learner does to move on: the progress verbs, without the tasks of a lab ("fix the encoding in LAB-1.3 to proceed" is a step of the lab). */
const DO_MOVE = String.raw`(?:${DO}|answer|submit|score|sign off|master|ace|get through|make it through|get\b${GAP}{0,30}\bright)`
/** What a learner does to meet a condition: the verbs of "until you ..." (a technical "until you commit" is not among them). */
const ACHIEVE = String.raw`(?:complete|finish|pass|earn|reach|clear|solve|score|get|answer|master|submit)`
/** The verbs of access, after "to" or a modal: "to open", "can move on to", "to qualify for". */
const ACCESS = String.raw`(?:open|see|read|view|unlock|reveal|start|begin|access|reach|enter|take|try|attempt|get to|go to|get into|move on to|move to|go on to|continue to|proceed to|progress to|advance to|skip to|jump to|jump ahead to|skip ahead to|qualify for|be eligible for|become eligible for|get through to|have access to|gain access to|get access to)`
/** Progress with no object, at the end of a clause: "to move on", "to continue", "to progress". */
const MOVE_ON = String.raw`(?:move on|move ahead|move forward|move along|continue|progress|proceed|advance|go on|keep going|go further|carry on|enter|get ahead)`
/**
 * How a page presents, which is not whether it opens: "the lesson opens on its summary", "its drawer opens inline", "the
 * Defence opens with Part A" (curriculum/D-drawers.md sections 1.2 and 6.7). "Opens to you" is access, and is not excused.
 */
const HOW = String.raw`(?!\s+(?:on|with|at|to(?!\s+(?:you|learners|anyone|everyone|those|people|students)\b)|summary|inline|in place|first|collapsed|beside|below|above|in Today|in a new tab|in the tab|in your browser)\b)`
/** What a thing does once a condition is met: "opens", "unlocks", "becomes available", "is yours". */
const OPENS_BARE = String.raw`(?:opens?|unlocks?|becomes? (?:open|available|visible|accessible|yours)|(?:is|are) (?:yours|available to you|open to you))\b${HOW}`
/**
 * The same, and "appears" and "shows up", for a subject that is the content itself ("a drawer link appears when the trigger
 * fires" is presentation). "Unlocks" after a thing is content-unlocks, so it is not here.
 */
const OPENS = String.raw`(?:opens?|appears?|shows? up|becomes? (?:open|available|visible|accessible|yours)|(?:is|are) (?:yours|available to you|open to you))\b${HOW}`
/** Every way a thing becomes the learner's: also "opens up", "goes live", "is available", "is ready", "is waiting for you", "is released". */
const OPENS_WIDE = String.raw`(?:opens?(?:\s+up)?|unlocks?|appears?|shows? up|goes live|go live|(?:becomes?|is|are|gets?|get|will be)\s+(?:(?:all|now|then|only)\s+)?(?:open|opened|available|made available|visible|accessible|yours|unlocked|released|ready|waiting)(?:\s+(?:to|for)\s+you)?)\b${HOW}`
/** "When you're ready", "when you like": an invitation, not a condition. */
const NOT_A_CONDITION = String.raw`(?!you${APOS}re ready|you are ready|you(?:${APOS}re| are)\s*(?:[.,;:!?)]|$)|you(?:${APOS}re| are)? (?:want|like|wish|choose|feel|need|miss|tap|click|press|ask)\b)`
/** The condition after the thing that opens: "after", "once", "as soon as", "if you", "when you", "when your query passes", "when LAB-1.2 passes". */
const AFTER = String.raw`(?:after|once|as soon as|if you|when(?!ever)\s+${NOT_A_CONDITION}(?:you|your|the|this|that|every|all|each|${ID}))\b`
// ---- the frames read the sentence with each thing a learner can open replaced by one token (tokenize, below)
/**
 * A thing, as a token: `zq`, then `d` for the Defence or `t` for another thing, then `d` for a definite one ("the next
 * lesson", "S1.L3", "your lab", "lessons") or `i` for any other ("a new lesson", "every drawer", "more content"). A frame
 * names the thing once, whatever words it took, and the token keeps a frame small.
 */
const T = String.raw`zq[dt][di]`
/** A definite thing, for the object of a refusal: "you can't open S1.L3 yet" ("you can't open a drawer that doesn't exist yet" is no refusal). */
const TD = String.raw`zq[dt]d`
/** The Defence, an event as well as a thing: "after the Defence". */
const DEF = String.raw`zqd[di]`
/** A thing with a count or "more" before it that the token did not take: "two more lessons" is "two" and the token "more lessons". */
const TA = String.raw`(?:(?:more|both|several|many|[0-9]+|one|two|three|four|five|six)\s+)?${T}`
/** The condition after a thing that appears or is ready, held to the learner's progress: "once you pass", "when the check passes", "after the Defence", "after S1.L2" ("once it ships" is about authoring). */
const AFTER_PROGRESS_T = String.raw`(?:after|once|as soon as|if|when(?!ever))\s+${NOT_A_CONDITION}(?:you\b|your\b|${TA}|(?:the|this|that|every|all|each)\b${GAP}{0,30}\b${DONE}\b)`
/**
 * The learner's progress as a condition: "you pass", "you've finished", "you're done", "your query returns unsat",
 * "passing", "the Defence", "S1 is signed off", "LAB-1.2 passes", "all exit items are answered", "this check",
 * "completion of S1". "If you finish early" is an aside.
 */
const PROGRESS = String.raw`(?:you(?:${APOS}ve|${APOS}d| have| had)?\s+(?:(?:just|already|finally|fully|successfully|first|all)\s+)?${DONE_WIDE}\b(?!\s+(?:early|quickly|ahead))|you(?:${APOS}re| are)\s+(?:all\s+)?(?:done|through|finished)\b|your\b${GAP}{0,40}?\b(?:${DONE_WIDE}|(?:is|are)\s+(?:unsat|sat|done|complete|green|passing|accepted|signed off)|returns|holds|replays|comes back)\b|(?:passing|finishing|completing|clearing|solving|signing off|answering|submitting|scoring|mastering|earning)\b|${DEF}\b|${TA}\s+(?:is|are|has been|have been|gets?|was|were)\s+(?:(?:all|fully)\s+)?${DONE_PART}\b|${T}\s+(?:passes|is passed)\b|(?:all|every|each|both)\b${GAP}{0,30}\b(?:is|are|has been|have been|get|gets)\s+${DONE_PART}\b|this\s+(?:check|item|set|quiz|test|exercise)\b|(?:the\s+|your\s+)?(?:completion|passing|finishing|clearing)\s+of\s+${T})`
/** The connective before PROGRESS: "after", "once", "as soon as", "when", "if", "the moment", "only after", "upon" ("right after" is "after" with a word before it). */
const IF_DONE = String.raw`(?:only\s+)?(?:after|once|as soon as|when(?!ever)|if|the moment|upon|on)\s+${NOT_A_CONDITION}`
/** "As you progress", "as you go", "as you finish lessons". */
const AS_YOU_GO = String.raw`as\s+you\s+(?:progress|go(?:\s+along)?|advance|move on|move along|work through|${DONE_WIDE})\b`
/** "can't", "won't be able to", "aren't allowed to". */
const CANT = String.raw`(?:can${APOS}t|cannot|can not|won${APOS}t be able to|will not be able to|may not|do(?:n${APOS}t| not) get to|won${APOS}t|will not|(?:are|${APOS}re)\s+not\s+(?:allowed|permitted|able)\s+to|aren${APOS}t\s+(?:allowed|permitted|able)\s+to)`
/** Access refused or closed: "you can't open S1.L3", "S1.L3 can't be opened", "S2 won't open", "S2 isn't available", "S2 stays hidden", "no access to S2", "don't start S2" ("don't have access to S2" among them), "you're not ready for S2". */
const NEG_ACCESS = String.raw`(?:\b${CANT}\s+(?:yet\s+)?(?:${ACCESS}|get|have|see)\s+${TD}|\b${TA}\s+(?:can${APOS}t|cannot|can not|won${APOS}t|will not|may not)\s+(?:yet\s+)?be\s+(?:opened|started|accessed|read|taken|seen|reached|attempted|unlocked|viewed|tried|entered|begun)\b|\b${TA}\s+(?:won${APOS}t|will not|does(?:n${APOS}t| not)|do(?:n${APOS}t| not)|can${APOS}t|cannot|is(?:n${APOS}t| not) going to)\s+(?:yet\s+)?(?:open|unlock|appear|show up|start|begin|become (?:available|open|visible|accessible)|be (?:available|open|visible|accessible|ready))\b|\b${TA}\s+(?:is|are)(?:n${APOS}t|\s+not)\s+(?:yet\s+)?(?:open|available|accessible|visible|unlocked|ready)\b|\b${TA}\s+(?:is|are|stays?|remains?|will (?:stay|remain|be))\s+(?:still\s+)?(?:${CLOSED}|locked)\b|\bno\s+access\s+to\s+${TD}|\b(?:don${APOS}t|do not|never)\s+(?:yet\s+)?${ACCESS}\s+${TD}|\b(?:none|nothing)\s+(?:of|in)\s+${TD}\s+(?:is|are)\s+(?:yet\s+)?(?:open|available|accessible)|\b(?:none|nothing)\s+(?:past|beyond|after)\s+${TD}\s+(?:opens?|unlocks?|is\s+(?:open|available|accessible))\b|\b${TA}\s+(?:has|have)(?:n${APOS}t|\s+not)\s+(?:yet\s+)?(?:opened|unlocked|appeared|started|become (?:available|open|visible|accessible))\b|\byou(?:${APOS}re| are)(?:n${APOS}t|\s+not)\s+(?:yet\s+)?(?:ready|eligible|allowed|cleared|qualified)\s+(?:for|to\s+${ACCESS})\s+${TD})`
/** What a consequence grants: the thing opens, "you can open it", "you're through to it", "you've earned it", "it is yours", "it awaits". */
const GRANTED = String.raw`(?:${TA}\s+(?:(?:will|then|also|only|automatically|now|all)\s+)*${OPENS_WIDE}|you(?:${APOS}ll| will| can| may| get to| are free to| are allowed to)\s+(?:(?:now|then|finally)\s+)?(?:be able to\s+)?(?:${ACCESS}|get|have)\s+${TA}|you(?:${APOS}re| are)\s+(?:through\s+to|into|on\s+to)\s+${TD}|you(?:${APOS}ve| have)\s+(?:earned|unlocked|won|got|gained)\s+${TA}|${TD}\s+(?:is|are|will be|becomes?)\s+(?:(?:all|now)\s+)?yours\b(?!\s+to\s+keep)|${TD}\s+(?:awaits|is waiting)\b)`
/** What joins a consequence to its condition: "and", "then", "so", "so that", "before", a semicolon, a colon or a dash. */
const THEN = String.raw`(?:(?:\s*[,;:—–]\s*|\s+)(?:and|then|so|and then|so that|before|after which|at which point)\s+|\s*[;:—–]\s*(?:then\s+)?)`
const WEEKDAY_L = String.raw`(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)`
const FEW_L = String.raw`(?:[0-9]+|one|two|three|four|five|six|seven|a few|several)`
const MONTH_L = String.raw`(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\.?`
/** A date in words: "November 3", "3 November", "the 3rd of November", "Nov 3, 2026". */
const DATE_L = String.raw`(?:${MONTH_L}\s+[0-9]{1,2}(?:st|nd|rd|th)?(?:,?\s+[0-9]{4})?|(?:the\s+)?[0-9]{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?${MONTH_L}(?:\s+[0-9]{4})?)`
/**
 * A time still to come: "tomorrow", "in 24 hours", "next week", "Friday", "on Monday", "this Friday", "from tomorrow",
 * "starting Monday", "on 2026-11-03", "on November 3", "the next day", "a day later", "at midnight".
 */
const TIME_LATER = String.raw`(?:tomorrow(?:\s+(?:morning|afternoon|evening|night))?|tonight|later today|next\s+(?:week|month|${WEEKDAY_L})|(?:on\s+|this\s+|from\s+|starting\s+|beginning\s+)?(?:${WEEKDAY_L}|${DATE_L})\b|on\s+(?:the\s+[0-9]{1,2}(?:st|nd|rd|th)\b|[0-9]{4}-[0-9]{2}-[0-9]{2})|(?:from|starting|beginning)\s+(?:tomorrow|tonight|next\s+(?:week|month)|[0-9]{4}-[0-9]{2}-[0-9]{2})|(?:the\s+)?(?:next|following)\s+day|(?:a|one|${FEW_L})\s+days?\s+later|in\s+(?:${FEW_L}|a|an|another)\s+(?:more\s+)?(?:minutes?|hours?|days?|weeks?)|in\s+[0-9]+\s*(?:h|hrs?|d|m|mins?)\b|at\s+(?:midnight|noon|[0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)\b))`
/**
 * A release on a schedule: a time to come, or a cadence ("every Monday", "every day", "each day", "every other day",
 * "twice a week", "daily", "one a day"). What is open every day ("this lesson is open every day") is the policy, so the
 * cadence goes with a release verb only (content-on-a-schedule).
 */
const TIME_WHEN = String.raw`(?:${TIME_LATER}|(?:every|each|per)\s+(?:day|week|morning|evening|night|${WEEKDAY_L})|every\s+(?:other\s+day|[0-9]+\s+(?:hours?|days?))|(?:twice|[0-9]+\s+times)\s+(?:a|per)\s+(?:day|week)|on\s+${WEEKDAY_L}s|daily|weekly|one (?:a|per) day|one at a time)`
/**
 * A cadence that restricts what is open to some days ("is available every Monday", "is open weekly"): what is open every
 * day or daily is open always, which is the policy.
 */
const TIME_SOME = String.raw`(?:(?:every|each|per)\s+(?:week|morning|evening|night|${WEEKDAY_L})|every\s+(?:other\s+day|[0-9]+\s+(?:hours?|days?))|(?:twice|[0-9]+\s+times)\s+(?:a|per)\s+(?:day|week)|(?:only\s+)?on\s+${WEEKDAY_L}s|weekly|one (?:a|per) day|one at a time)`

/** A stage or lesson ID in exact case: `s1` and `s2` are sessions, steps or states (the other IDs have no such use). */
const STAGE_ID_LIKE = /\bS[1-9][0-9]*(?:\.L[0-9]+)?\b/gi
const stageIdsExact = (text) => [...text.matchAll(STAGE_ID_LIKE)].every((m) => m[0] === m[0].toUpperCase())

const explicit = (name, source, extra = {}) => ({ name, re: new RegExp(spaced(source), 'gi'), exactIds: true, ...extra })
/** A frame: an explicit phrase that reads the tokenized sentence (T, TD, DEF). */
const frame = (name, source, extra = {}) => explicit(name, source, { tokens: true, ...extra })

/**
 * Each is a way to say that access to course content waits on something. The patterns ask for the learner as the subject
 * ("you must complete") or for an access verb ("before you can open") where a plain technical sentence would read the
 * same without them ("install uv before you can run the lab" is a dependency, and the spine's honest wording). `weak` ones
 * (unlock, locked) need the sentence to hold no word about locks of another kind, and `inside` ones need the thing that
 * waits to stand between the verb and the "first" ("complete worked examples before the first call" is no lock).
 *
 * The explicit ones name the content in the very phrase that locks it ("unlock the next lesson", "S1.L3 stays locked",
 * "complete S1 to open S2"), so a lock of another kind elsewhere in the sentence cannot excuse them: "Fix the transfer to
 * unlock LAB-1.3" is about a lab, whatever a transfer is. They match a stage or lesson ID by its exact case (`exactIds`: `s1` is a session).
 * `afterQuestion` ones apply only to a sentence that answers a question about content ("Want S2? First pass the Defence."), and
 * `anywhere` ones to any sentence, because the phrase is the lock whatever it names ("complete to unlock.", "locked content").
 * scripts/spikes/W1-T38/README.md section 3.4 has each one with an example.
 */
export const LOCK_PHRASES = [
  { name: 'unlock', re: /\bunlock(?:s|ed|ing|able)?\b/gi, weak: true },
  { name: 'locked', re: /\blocked\b/gi, weak: true },
  // the word lock, naming the content: the technical sense of a lock does not excuse these
  frame('unlock-content', String.raw`\bunlock(?:s|ed|ing)?\s+(?:(?:(?:the|this|that|your)\s+)?(?:next|following)\s+one|${DET}${T})\b`),
  frame('content-unlocks', String.raw`\b${T}(?:\s+[0-9]+)?\s+(?:(?:will|then|also|now|only|all|automatically)\s+)*unlock(?:s|ed)?\b`),
  frame('content-locked', String.raw`\b${T}(?:\s+[0-9]+(?:\.[0-9]+)?)?\s+${WAITS}(?:un)?locked\b`),
  explicit(
    'locked-until-content',
    String.raw`\b(?:un)?locked\s+(?:only\s+)?(?:after|until|once|when)\s+(?:you(?:${APOS}ve| have)?\s+${ACHIEVE}|${ID}\b|the (?:next|previous|first|last) (?:lesson|stage|lab|drawer)|the Defen[cs]e)`,
  ),
  frame('locked-behind-content', String.raw`\b(?:un)?locked\s+behind\s+${TA}\b`),
  // a purpose clause, the access last ("pass the Defence to open the next stage") or first ("to see S1.L3, finish this lesson")
  frame('do-to-open', String.raw`\b${DO_PURPOSE}\b${GAP}{0,60}\b(?:to|in order to|so as to|so (?:that\s+)?you\s+(?:can|may|will be able to|${APOS}ll be able to))\s+(?:(?:then|finally)\s+)?${ACCESS}\s+(?:${TA}|(?:the|your)\s+(?:second|third|fourth|next|following|last|final)(?:\s+one)?(?=\s*(?:[.,;:!?)]|$))|(?:this|that)\s+one\b)`),
  frame('to-open-do', String.raw`\bto\s+${ACCESS}\s+${TA}${GAP}{0,40},\s*(?:(?:you|we)\s+(?:must|need to|have to|should|will need to|${APOS}ll need to|${APOS}ll have to)\s+)?(?:first\s+)?${DO_PURPOSE}\b`),
  // a consequence: "pass the Defence and S2 opens", "finish your query, then the next lesson opens", "it must pass before S1.L3 opens"
  frame('do-then-opens', String.raw`\b${DONE}\b${GAP}{0,60}?\b(?:(?:and|then|before|so|so that)\s+${TA}\s+(?:(?:will|then|only|also)\s+)*${OPENS}|(?:and|then|so)\s+you(?:${APOS}ll| will| can| may| get to)\s+(?:be able to\s+)?${ACCESS}\s+${TD})`),
  // the condition first: "once you finish LAB-1.2, LAB-1.3 opens", "when your check passes, you can move on to S1.L3", "after the Defence, S2 opens"
  frame(
    'once-done-opens',
    String.raw`\b(?:once|after|when|as soon as|if)\b${GAP}{0,40}?\b${DONE}\b(?!\s+(?:early|already|quickly))${GAP}{0,40}?(?:,\s*|\s+)(?:${TA}\s+(?:(?:will|then)\s+)?${OPENS}|you\s+(?:can|may|will be able to|get to|are free to|are allowed to)\s+${ACCESS}\s+${TD})|\b(?:once|after|when|as soon as)\s+${TD}(?:\s+(?:is|are)\s+(?:done|complete|completed|finished|passed|signed off|over|behind you))?(?:,\s*|\s+)${TA}\s+(?:(?:will|then)\s+)?${OPENS}`,
  ),
  // a permission with a condition: "you will be able to open S1.L3 after this lesson"
  frame('can-open-after', String.raw`\b(?:(?:can|could|may|will be able to|get to|are allowed to|are free to)\s+(?:only\s+)?${ACCESS}|you(?:${APOS}ll| will)\s+(?:get|have access to))\s+${TD}${OPEN_GAP}{0,40}?\b(?:only\s+)?(?:after|once|until|as soon as|(?:when|if) you(?:${APOS}ve| have)? ${DONE})\b`),
  // the same in the passive: "S1.L3 can only be opened after S1.L2", "S2 can't be started until the Defence"
  frame('can-be-opened-after', String.raw`\b${TA}\s+(?:can|could|may|will|cannot|can${APOS}t|won${APOS}t)\s+(?:only\s+)?(?:not\s+)?be\s+(?:opened|started|accessed|read|taken|seen|reached|attempted|unlocked|viewed|tried)\s+(?:only\s+)?(?:after|once|when|until|if|before)\b`),
  // a restriction: "only learners who pass the Defence can open S2", "this lesson is available to learners who passed S1.L2", "S2 is for learners who passed"
  frame(
    'only-can-open',
    String.raw`\bonly\b${GAP}{0,60}\b(?:can|may|will be able to|get to)\s+${ACCESS}\s+${TA}|\b(?:learners|those|people|anyone|students|everyone|you)\s+who\s+(?:have\s+)?${DONE_WIDE}\b${GAP}{0,60}\b(?:(?:can|may|will be able to|get to)\s+${ACCESS}|get|gain|receive|earn|unlock)\s+${TA}|\b(?:available|open|opens?|reserved|only|is|are|accessible|limited|restricted|released|given|granted|shown)\s+(?:only\s+)?(?:to|for)\s+(?:learners|those|people|anyone|students|everyone|you)\s+(?:who|once|after|if)\b${GAP}{0,30}\b${DONE_WIDE}\b(?!\s+(?:early|quickly))`,
  ),
  // closed, hidden or out of reach until something happens: "S1.L3 is closed to you until the Defence"
  frame('closed-until-content', String.raw`\b${TA}\s+${WAITS}${CLOSED}\b${GAP}{0,40}\b(?:until|till|unless|before)\b|\bunless\b${GAP}{0,40}?(?:,\s*|\s+)${TA}\s+${WAITS}(?:${CLOSED}|locked)\b`),
  // a requirement that is a completion: "S2 requires a passed Defence"; "needs your guard from LAB-1.2" is a dependency
  frame(
    'requires-done',
    String.raw`\b(?:requires?|required|needs?|depends? on)\s+(?:(?:a|an|the|your)\s+)?(?:passed|passing|completed|finished|cleared|solved|signed[- ]off)\s+${TD}|\b(?:requires?|needs?)\s+(?:that\s+)?(?:you\s+(?:to\s+)?)?(?:have\s+)?${DONE}\s+${TD}|\b(?:requires?|needs?)\s+${TD}\s+(?:to be\s+)?(?:done|complete|completed|finished|passed|cleared|signed off)\b|\bprerequisites?\s*:\s*(?:${DO_PURPOSE}\b|${TA})|\b${TD}\s+(?:is|are)\s+(?:a\s+|the\s+)?(?:prerequisites?|required|mandatory)\s+(?:for|of|to|before)\b|\bmust\s+be\s+(?:passed|completed|finished|done|cleared|solved)\s+before\s+(?:you\s+(?:can\s+)?${ACCESS}\s+)?${TD}|\b(?:is|are|as)\s+(?:the|your|a|an)\s+(?:gate|gateway|ticket|key|entry)\s+(?:to|into|for)\s+${TD}`,
  ),
  // an order between pieces of content: "finish S1.L1 before starting S1.L2" ("finish the setup before starting LAB-1" is a dependency)
  frame('do-before-content', String.raw`\b(?:${DO}|do|sign off)\s+${TD}${GAP}{0,30}?\bbefore\s+(?:(?:you\s+)?(?:start|starting|open|opening|begin|beginning|move on to|moving on to|go on to|going on to|continue to|continuing to|read|reading|try|trying|take|taking|tackle|tackling|attempt|attempting)\s+)?${TD}`),
  // a return that waits: "come back to LAB-1.3 after you finish S1.L3"
  frame('come-back-after', String.raw`\b(?:come back|return|go back|get back)\s+to\s+${TD}${GAP}{0,30}?\b(?:only\s+)?(?:after|once|when|as soon as)\s+(?:you(?:${APOS}ve| have)?\s+)?(?:${DONE}\b|${TD})`),
  // an instruction to wait: "start S2 once S1 is signed off", "open S2 only after the Defence" ("start LAB-1.2 after S1.L1" is an order of reading)
  frame('start-after', String.raw`\b(?:start|open|begin|take|try|read|attempt|move on to|go on to|continue to)\s+${TD}${GAP}{0,30}?\b(?:only\s+)?(?:once|after|when|as soon as)\s+(?:you(?:${APOS}ve| have)?\s+${DONE}\b|${TD}\s+(?:is|are|has been|have been)\s+(?:done|complete|completed|finished|passed|signed off))|\b${ACCESS}\s+${TD}\s+only\s+(?:after|once|when)\b`),
  // closed with no condition said, or not open yet: "S2 is still closed", "S2 isn't open yet", "S2 is not open until the Defence"
  frame('content-closed', String.raw`\b${TA}\s+(?:is|are)(?:n${APOS}t|\s+not)\s+(?:currently\s+|yet\s+)?(?:open|available|accessible|unlocked)(?:\s+(?:to|for)\s+you)?(?=\s*(?:[.;!?)]|$))|\byou\s+(?:currently\s+)?(?:do(?:n${APOS}t| not)|have no)\s+(?:yet\s+)?(?:have\s+)?access\s+to\s+${TD}(?=\s*(?:[.;!?)]|$))|\b${TA}\s+(?:is|are|stays?|remains?)\s+(?:still\s+|currently\s+|now\s+)?${CLOSED}(?![-\w])(?!\s+(?:to|for)\s+(?:edits?|changes?|writes?|comments?))|\b${TA}\s+(?:is|are)(?:n${APOS}t|\s+not)\s+(?:yet\s+)?(?:open|available|ready)(?:\s+(?:to|for)\s+you)?\s+(?:yet|until)\b`),
  // ready once a condition is met: "your next lesson will be ready after you pass" ("the lesson is ready when you are" is a welcome)
  frame('content-ready', String.raw`\b${TD}\s+(?:is|are|will be|becomes?)\s+(?:only\s+)?ready(?:\s+for\s+you)?\s+(?:only\s+)?${AFTER_PROGRESS_T}`),
  // content as the prize: "S2 is your reward for passing the Defence"
  explicit('reward-for', String.raw`\b(?:reward|prize)\s+for\s+(?:${DONE}\b|your\b)`),
  // a thing that waits: "S2 waits for the Defence" ("the lesson waits for you" is a welcome)
  frame(
    'content-waits',
    String.raw`\b${TA}\s+(?:(?:will|still|only)\s+)?waits?\s+(?:until(?!\s+you(?:${APOS}re| are)\s+ready)|till|on\s+(?:you\b|your\b|${DEF}|${TD})|for\s+(?:you\s+to\s+${DONE}|your\s+(?:pass|passing|completion|finishing|clearing)|${DEF}|${TD}))`,
  ),
  // the progress as the subject: "passing the Defence opens S2", "passing S1.L2 earns you S1.L3", "your pass on the Defence opens S2"
  frame('doing-opens', String.raw`\b(?:passing|finishing|completing|clearing|solving|earning|answering|submitting|mounting|mastering|scoring|signing off|your\s+pass(?:\s+on\s+${TA})?|a\s+pass\s+on\s+${TA})\b${GAP}{0,60}\b(?:opens?(?:\s+up)?|unlocks?|gives you access to|grants(?:\s+you)?\s+access to|gives you|earns you|gets you(?:\s+into)?|takes you(?:\s+on)?\s+to|moves you(?:\s+on)?\s+to|brings you to|qualifies you for|makes you eligible for|lets you(?:\s+into|\s+(?:open|see|start|access|reach|move on to|go on to|continue to|take|try|enter|begin)))\s+${TA}`),
  // access as a reward: "gain access to S2 by passing the Defence", "your access to S2 begins after the Defence", "no access to S2 until ..."
  frame('access-by', String.raw`\b(?:gain|get|earn|have|unlock)\s+access\s+to\s+${TD}${GAP}{0,40}?\b(?:by|after|once|when|if|only)\b|\baccess\s+to\s+${TA}\s+(?:(?:only|then|will)\s+)*(?:requires?|needs?|depends on|comes? (?:after|with|once)|begins?|starts?|opens?|(?:is|will be|gets?)\s+(?:only\s+)?(?:granted|given|unlocked|earned|opened))\b|\bno\s+access\s+to\s+${TD}${GAP}{0,30}?\b(?:until|unless|before|without|till)\b`),
  // a ban with a condition: "don't open S2 until you pass the Defence" ("don't start LAB-1.2 before installing uv" is a dependency)
  frame('dont-open-until', String.raw`\b(?:don${APOS}t|do not|never)\s+${ACCESS}\s+${TD}${GAP}{0,40}?\b(?:until|before|unless)\s+(?:you(?:${APOS}ve| have)?\s+${DONE}\b|${DONE}\b|${DEF}|${TD}|your\b${GAP}{0,30}\b${DONE}\b)`),
  // the content appears once a condition is met: "the next lesson appears when you pass this check", "S1.L3 shows up once you pass"
  frame('content-appears', String.raw`\b${TD}\s+(?:(?:only|will|then|also|just)\s+)*(?:appears?|shows? up)\b${GAP}{0,30}?\b(?:only\s+)?${AFTER_PROGRESS_T}`),

  // ---- the frames, each over the whole vocabulary and over the tokenized sentence
  // a release on a schedule: "S1.L3 opens tomorrow", "the next lesson will be available in 24 hours", "new lessons open every Monday"
  frame('content-on-a-schedule', String.raw`\b${TA}\s*(?:(?:(?:will|only|also|then)\s+)*(?:opens?(?:\s+up)?|unlocks?|goes?\s+live|drops?|arrives?|appears?|shows?\s+up|(?:is|are|gets?|get|will be)\s+released)\s+(?:only\s+)?${TIME_WHEN}|(?:is|are|will\s+be|becomes?|gets?)\s+(?:only\s+)?(?:available|open|opened|released|unlocked|visible|accessible|ready|yours|waiting)(?:\s+(?:to|for)\s+you)?\s+(?:only\s+)?(?:${TIME_LATER}|${TIME_SOME})|[:—–·(]\s*(?:opens?|available|unlocks?|ready)\s+${TIME_WHEN}|[:—–·(]\s*${TIME_LATER}(?=\s*(?:[.;!?)]|$))|(?:is|are|will be)\s+(?:scheduled|set|due|planned|timed)\s+to\s+(?:open|unlock|be released|go live|become available|appear))\b`),
  frame('come-back-later', String.raw`\b(?:come back|check back|return|be back|wait)\s+(?:until\s+)?${TIME_LATER}\s+(?:for|to\s+(?:open|see|start|read|try|take|get(?:\s+to)?|access))\s+${TA}`),
  explicit('countdown', String.raw`\b(?:next|new)\s+${STRONG}\s+(?:in|opens in|unlocks in)\s+[0-9]+\s*(?:h|hrs?|hours?|d|days?|m|mins?|minutes?)\b`),
  // not yet: "you can't open S1.L3 yet", "S1.L3 can't be opened yet", "S2 is greyed out for now"
  frame('not-yet', String.raw`${NEG_ACCESS}${GAP}{0,30}?\b(?:yet|for now|for the moment|right now|at the moment|at this point|so far)\b|\b${TA}\s+(?:is|are|has|have)(?:n${APOS}t|\s+not)\s+yet\s+(?:been\s+)?(?:open|opened|available|accessible|visible|unlocked|ready|started)\b`),
  // refused until the progress: "S2 won't open until you've signed off S1", "no access to S2 until the Defence is passed"
  frame('not-until', String.raw`${NEG_ACCESS}${GAP}{0,40}?\b(?:until|till|unless|before)\s+${NOT_A_CONDITION}(?:${PROGRESS}|${TD}|${TIME_LATER})`),
  // the same, the condition first: "until you pass the Defence, you can't open S2", "if you don't pass the Defence, you can't start S2", "without a passed Defence, S2 stays closed"
  frame('until-done-cant', String.raw`\b(?:until|till|unless)\s+${PROGRESS}${GAP}{0,40}?(?:,\s*|\s+)${NEG_ACCESS}`),
  frame('if-not-done-cant', String.raw`\bif\s+you\s+(?:don${APOS}t|do not|haven${APOS}t|have not|didn${APOS}t|did not|fail to|can${APOS}t|cannot)\s+(?:yet\s+)?${DONE_WIDE}\b${GAP}{0,40}?(?:,\s*|\s+)(?:then\s+)?${NEG_ACCESS}`),
  frame('without-done-cant', String.raw`\bwithout\s+(?:(?:a|an|the|your)\s+)?(?:passed|passing|finishing|finished|completing|completed|clearing|cleared|signing off|signed[- ]off)\b${GAP}{0,40}?(?:,\s*|\s+)${NEG_ACCESS}`),
  // the thing opens on the progress: "S2 opens to you once you sign off S1", "new content becomes available as you finish lessons"
  frame('opens-on-progress', String.raw`\b${TA}\s+(?:(?:will|then|only|also|just|automatically|now|all)\s+)*${OPENS_WIDE}${OPEN_GAP}{0,30}?\b(?:${IF_DONE}${PROGRESS}|${AS_YOU_GO}|(?:only\s+)?(?:after|once|as soon as)\s+${TD})`),
  frame('can-open-on-progress', String.raw`\b(?:can|could|may|will|${APOS}ll|get to|be able to|are allowed to|are free to|are permitted to)\s+(?:(?:only|now|then|finally|also)\s+)?(?:be able to\s+)?(?:${ACCESS}|get|have)\s+${TA}${OPEN_GAP}{0,40}?\b(?:${IF_DONE}${PROGRESS}|${AS_YOU_GO})`),
  frame('get-on-progress', String.raw`\byou\s+(?:get|gain|have|earn|receive)\s+(?:access\s+to\s+)?${TA}${OPEN_GAP}{0,40}?\b${IF_DONE}${PROGRESS}`),
  // the condition first and inverted: "only after the Defence can you open S2", "only when you finish S1.L2 does S1.L3 open"
  frame('only-after-can-you', String.raw`\bonly\s+(?:after|once|when|if)\b${GAP}{0,60}?\b(?:can|may|will|could|do|does|did)\s+(?:you|learners|they|we)\s+(?:be able to\s+)?(?:${ACCESS}|get|have)\s+${TA}|\bonly\s+(?:after|once|when|if)\b${GAP}{0,60}?\b(?:does|do|will|can|may|could)\s+${TA}\s+(?:open|unlock|appear|show up|become (?:available|open|visible)|start|begin)\b`),
  // the thing starts on the learner's progress: "S2 starts after you pass the Defence" ("S2 begins after S1" is an order)
  frame('content-starts-after', String.raw`\b${TD}\s+(?:(?:only|will|then)\s+)*(?:starts?|begins?|kicks? off|follows?|comes?(?:\s+next)?|continues?|is next)\s+(?:only\s+)?(?:after|once|when|as soon as)\s+${NOT_A_CONDITION}(?:you(?:${APOS}ve| have)?\s+(?:(?:just|already|finally)\s+)?${DONE_WIDE}\b|you(?:${APOS}re| are)\s+(?:done|through)\b|your\b${GAP}{0,30}\b${DONE_WIDE}\b|(?:passing|finishing|completing|clearing|signing off)\b|${TD}\s+(?:is|are|has been)\s+(?:done|complete|completed|finished|passed|signed off)\b)`),
  // progress with no object: "pass the Defence to progress", "finish the lab to move on", "to move on, pass the Defence"
  frame('do-to-move-on', String.raw`\b${DO_MOVE}\b${GAP}{0,60}\bto\s+${MOVE_ON}(?=\s*(?:[.,;:!?)]|$))|\bto\s+${MOVE_ON}\s*,\s*(?:(?:you|we)\s+(?:must|need to|have to|should|will need to|${APOS}ll need to)\s+)?(?:first\s+)?${DO_MOVE}\b`),
  // a purpose that completes, then opens: "finish all four segments to complete the lesson and open the next one"
  frame('do-to-and-open', String.raw`\b${DO_PURPOSE}\b${GAP}{0,60}\bto\s+(?:complete|finish|pass|clear|close out|wrap up)\b${GAP}{0,40}?\b(?:and|then|and then)\s+${ACCESS}\s+${TA}`),
  // a consequence, any join: "get every item right and the next lesson opens", "first pass the Defence; then S2 opens", "pass the Defence: S2 opens"
  frame('do-then-granted', String.raw`\b${DONE_WIDE}\b(?!\s+(?:early|quickly))${GAP}{0,60}?${THEN}${GRANTED}`),
  // the condition first, any grant: "once you've finished S1.L2, you can start S1.L3", "as soon as you finish, S1.L3 is yours", "next up, once you're done: S1.L3"
  frame('once-done-granted', String.raw`\b(?:once|after|when(?!ever)|as soon as|if|the moment|now that)\s+${NOT_A_CONDITION}${PROGRESS}${GAP}{0,40}?(?:,\s*|\s+|\s*[:—–]\s*)(?:then\s+)?${GRANTED}|\b(?:once|after|when(?!ever)|as soon as)\s+you(?:${APOS}re| are)\s+(?:done|through|finished)\b${GAP}{0,20}?\s*[:—–]\s*${TD}|\b(?:on|upon)\s+(?:passing|finishing|completing|clearing|signing off|(?:the\s+)?completion\s+of)\b${GAP}{0,40}?(?:,\s*|\s+)(?:then\s+)?${GRANTED}|\bwith\s+${TD}\s+(?:now\s+)?${DONE_PART}\b${GAP}{0,20}?(?:,\s*|\s+)(?:then\s+)?${GRANTED}`),
  // a consequence in its own sentence: "Then S2 opens.", "After that, S1.L3 opens."
  frame('then-opens', String.raw`^[\s>*_"“'‘(\[-]*(?:then|after that|after this|once that${APOS}s done|once that is done|with that done)\s*,?\s+${TA}\s+(?:(?:will|also|then)\s+)*${OPENS_WIDE}`),
  // access by the progress: "progress to S2 by passing the Defence", "earn S2 by passing the Defence", "you've earned S2"
  frame('access-by-doing', String.raw`\b(?:${ACCESS}|move on to|progress to|proceed to|advance to|continue to|get to|earn)\s+${TA}${GAP}{0,30}?\bby\s+(?:passing|finishing|completing|clearing|solving|signing off|answering|submitting|scoring|mastering|earning|getting\b${GAP}{0,20}\bright)\b`),
  frame('earned-content', String.raw`\b(?:earns?|earned|you(?:${APOS}ve| have)\s+(?:earned|won))\s+(?:(?:your|the)\s+)?(?:access\s+to\s+|(?:your\s+)?way\s+(?:in)?to\s+)?${TA}`),
  // a requirement: "passing the Defence is required to start S2", "S1.L3 depends on finishing S1.L2", "Required: pass the Defence" ("you need S1
  // signed off to start S2" is requires-done's "needs S1 signed off")
  frame('required-for', String.raw`\b(?:passing|finishing|completing|clearing|signing off|a passed|the passed|a completed|a finished|a signed[- ]off|mastery of|completion of|a pass on|sign-off (?:of|on)|a passing (?:grade|score) on)\b${GAP}{0,40}\b(?:is|are|will be)\s+(?:required|needed|necessary|mandatory|a must|a requirement|a prerequisite|the price|the ticket)\s+(?:for|to|before|in order to|of)\b|\b(?:requires?|needs?|depends? on)\s+(?:you\s+)?(?:passing|finishing|completing|clearing|signing off)\s+${TD}|\b(?:requires?|needs?|depends? on)\s+(?:(?:full|complete)\s+)?(?:mastery|completion|a pass|sign-off)\s+(?:of|on|in)\s+${TD}|^\W*(?:required|requires|prereqs?|prerequisites?|needs first)\s*:\s*(?:${DO_PURPOSE}\b|${TA})`),
  // the progress before the access: "you have to complete this lesson before the next one", "before starting S2, you must pass the Defence"
  frame('must-do-before', String.raw`\b(?:must|need to|have to|will need to|${APOS}ll need to|${APOS}ll have to)\s+(?:first\s+)?(?:${DO}|sign off)\b${GAP}{0,40}?\bbefore\s+(?:(?:you\s+(?:can\s+|may\s+)?)?(?:${ACCESS}|starting|opening|beginning|moving on to|going on to|continuing to|reading|trying|taking|tackling|attempting|accessing|entering)\s+)?${TA}`),
  frame('before-access-do', String.raw`\bbefore\s+(?:you\s+(?:can\s+|may\s+|are able to\s+)?)?(?:${ACCESS}|starting|opening|beginning|moving on to|going on to|continuing to|reading|trying|taking|tackling|attempting|accessing|entering)\s+${TA}\s*,\s*(?:(?:you|we)\s+(?:must|need to|have to|should|will need to|${APOS}ll need to)\s+)?(?:first\s+)?(?:${DO}|sign off)\b`),
  // a wait before the access: "wait until you pass the Defence to start S2", "hold off on S2 until you pass the Defence"
  frame('wait-to-open', String.raw`\bwait\s+(?:until|till)\b${GAP}{0,40}?\bto\s+${ACCESS}\s+${TA}|\bwait\s+(?:for\s+)?${GAP}{0,40}?\bbefore\s+(?:you\s+)?(?:${ACCESS}|opening|starting|moving on to)\s+${TA}|\bhold off\s+(?:on\s+)?${TD}${GAP}{0,30}?\b(?:until|till)\b`),
  // a label: "S2 (locked)", "Next lesson: locked", "D-33: coming soon"
  frame('label-locked', String.raw`\b${TA}\s*(?:\(\s*|:\s*|—\s*|–\s*|·\s*|-\s+)(?:🔒\s*)?(?:locked|closed|unavailable|not (?:yet )?(?:open|available)|coming soon)\b|\b${TA}\s*(?:\(\s*|:\s*|—\s*|–\s*|·\s*|-\s+)(?:only\s+)?(?:after|once|when|available after|opens after|unlocks after)\s+(?:${PROGRESS}|${TD})|^[\s>*_"“'‘(\[-]*coming soon\s*[:—–-]\s*${TA}`),
  // the thing done, as a requirement: "the Defence must be passed to open S2", "S1.L2 has to be finished before S1.L3"
  frame('must-be-done', String.raw`\b${TD}\s+(?:must|has to|have to|needs? to|should)\s+(?:first\s+)?be\s+${DONE_PART}\s+(?:first\s+)?(?:before\s+(?:(?:you\s+(?:can\s+|may\s+)?)?(?:${ACCESS}|starting|opening|moving on to|going on to)\s+)?${TA}|(?:to|in order to|so (?:that\s+)?you can)\s+(?:${ACCESS}\s+${TA}|${MOVE_ON}\b)|for\s+${TA})`),
  // counting down by progress: "one more check and you're into S1.L3", "two more lessons until the Defence opens", "S1.L3 is one pass away"
  frame('progress-countdown', String.raw`\b(?:one|two|three|four|five|[0-9]+|a few)\s+(?:more\s+)?(?:checks?|items?|calls?|pass(?:es)?|exercises?|sets?|answers?|${T})\b${GAP}{0,20}?(?:,\s*|\s+)(?:and|then|until|before|till)\s+(?:${GRANTED}|${TA}\s+(?:(?:will|then)\s+)?${OPENS_WIDE})|\b(?:one|two|three|[0-9]+|a few|just)\s+(?:more\s+)?(?:pass(?:es)?|checks?|right answers?|correct answers?)\s+away\b|\b(?:one|a)\s+(?:passed|finished|completed|signed-off)\s+${T}\s+away\b`),
  // behind the progress: "S2 sits behind the Defence", "LAB-1.3 is behind a pass on LAB-1.2"
  frame('content-behind', String.raw`\b${TA}\s+(?:is|are|sits?|lies|lie|waits?|stays?)\s+behind\s+(?:(?:a|your)\s+pass(?:\s+on)?\s+|passing\s+|finishing\s+|completing\s+)?${T}\b`),
  // an order the course enforces: "lessons must be taken in order", "you can only open one lesson at a time", "lessons open in sequence"
  frame('in-order-only', String.raw`\b${TA}\s+(?:must|have to|has to|need to|needs to|can only)\s+be\s+(?:taken|done|completed|finished|passed|opened|read|followed|started)\s+(?:strictly\s+)?in\s+(?:order|sequence|turn)\b|\bcan\s+only\s+${ACCESS}\s+(?:a single\s+)?${T}\s+at\s+a\s+time\b|\b${TA}\s+(?:open|opens|unlock|unlocks|become available|becomes available|are released|is released)\s+(?:strictly\s+)?(?:in\s+(?:order|sequence|turn)|one\s+(?:by|after)\s+(?:one|another)|step by step)\b`),
  // the progress as the way in: "passing the Defence is how you get to S2", "the way to S2 is through the Defence", "S2 requires 80% on the Defence"
  frame('way-in', String.raw`\b(?:passing|finishing|completing|clearing|signing off)\b${GAP}{0,40}\b(?:is|was)\s+(?:how|the way|the only way)\s+(?:you\s+)?(?:${ACCESS}|get)\s+${TA}|\b(?:the\s+)?(?:only\s+)?(?:way|road|route|path)\s+(?:in)?to\s+${TD}\s+(?:is|goes|runs|leads)\s+(?:through|via|by)\b|\b(?:requires?|needs?)\s+(?:a\s+score\s+of\s+|at least\s+)?[0-9]+\s*%\s+(?:or (?:more|higher)\s+)?(?:on|in)\s+${TD}`),
  // eligibility refused: "you're not eligible for S2", "not until you pass the Defence"
  frame('not-eligible', String.raw`\byou(?:${APOS}re| are)(?:n${APOS}t|\s+not)\s+(?:yet\s+)?(?:eligible|cleared|qualified)\s+(?:for|to\s+${ACCESS})\s+${TD}|\bnot\s+(?:until|till|before)\s+(?:${PROGRESS}|${TD})`),
  // a purpose clause that ends on unlocking, whatever the sentence names ("complete to unlock.", "finish Negating English to unlock it."),
  // or on the thing itself ("pass the check to get S1.L3.")
  frame('to-unlock-end', String.raw`\b${DO_MOVE}\b${GAP}{0,60}\bto\s+unlock(?:\s+(?:it|them|this|that|everything|more|the rest))?\s*(?=[.,;:!?)]|$)`, { anywhere: true }),
  frame('to-get-content', String.raw`\b${DO_PURPOSE}\b${GAP}{0,60}\bto\s+get\s+${TA}(?=\s*(?:[.,;:!?)]|$))`),
  // a lesson, stage or lab called locked, whatever else the sentence names: "locked lessons", "a locked stage", "locked content"
  frame('locked-content', String.raw`\b(?:un)?locked\s+(?:${TA}|content|modules?|units?|levels?|segments?|chapters?|sections?)\b`, { anywhere: true }),
  // a score as the price: "S2 opens at 80% mastery", "S1.L3 unlocks with 3 of 3"
  frame('opens-at-score', String.raw`\b${TA}\s+(?:(?:will|only)\s+)*(?:opens?|unlocks?|becomes? available|is available)\s+(?:only\s+)?(?:at|with|from|after|once you (?:reach|hit|get))\s+(?:a\s+score\s+of\s+|at least\s+)?(?:[0-9]+\s*%|[0-9]+\s+(?:of|out of)\s+[0-9]+|full marks|mastery)`),
  // none of it until then: "no S2 until you pass the Defence", "there's no S2 for you before the Defence"
  frame('none-until', String.raw`\b(?:there${APOS}s\s+|there is\s+)?no\s+(?:more\s+)?${TA}\s+(?:for you\s+)?(?:until|till|unless|before)\s+(?:${PROGRESS}|${TD})`),
  // the learner sees it after the progress: "learners see S2 after passing the Defence", "you start S2 once S1 is signed off"
  frame('see-on-progress', String.raw`\b(?:learners|you|students|everyone)\s+(?:only\s+)?(?:see|get|open|start|reach|access|unlock|enter)\s+${TA}${OPEN_GAP}{0,30}?\b${IF_DONE}${PROGRESS}`),
  // an answer to a question about content: "Ready for S2? First pass the Defence."
  frame('not-yet-answer', String.raw`^[\s>*_"“'‘(\[-]*(?:no\s*[,.;:—–-]?\s*)?not\s+(?:yet|until|before)\b`, { afterQuestion: true }),
  frame('first-do', String.raw`^[\s>*_"“'‘(\[-]*first\s*,?\s+(?:you\s+(?:must|need to|have to|${APOS}ll need to)\s+)?${DO_MOVE}\b`, { afterQuestion: true }),

  // the ordinary ones
  // "first" the adverb ("complete S1 first", "finish it first, then ..."), not the adjective ("finish your first lab to get your first receipt")
  { name: 'complete-first', re: new RegExp(String.raw`\b(?:complete|finish|pass|clear|solve|do)\b${GAP}{0,60}\bfirst\b(?=\s*(?:[.,;:!?)\]—–-]|$)|\s+(?:and|then|so|or|before|if|when|because|but)\b)`, 'gi'), inside: true },
  { name: 'before-you-can', re: /\bbefore you (?:can|may|are able to|are allowed to) (?:open|start|see|read|continue|access|move on|begin|proceed|go on|unlock)\b/gi },
  { name: 'available-after', re: /\bavailable (?:only )?(?:after|once|when|until|upon|on completion)\b/gi },
  { name: 'not-available', re: /\bnot (?:yet )?available\b/gi },
  { name: 'becomes-available', re: /\bbecomes? available\b/gi },
  // "opens after", whatever opens; "the hint opens after a teach-back", "the vault unlocks after the second key" and "the lesson stays open after the Defence" are not locks on content
  {
    name: 'opens-after',
    re: new RegExp(
      String.raw`(?<!\b(?:R[0-9]|rungs?|hints?|answers?|keys?|feedback|whys?|stays?|remains?|still|also|keeps?|kept|even|locks?|vaults?|doors?|gates?|safes?|rows?|accounts?|phones?|devices?|valves?|ports?|wallets?)\s)\b${OPENS_BARE}\s*(?:only\s+)?${AFTER}`,
      'gi',
    ),
  },
  // "only after you": a condition on the learner ("the keep-alive starts only once S2 is signed off" is a schedule, and "the check passes only if your witness replays" a pass condition)
  { name: 'only-after', re: new RegExp(String.raw`\bonly (?:after|once|when) you(?:${APOS}ve| have)?\b`, 'gi') },
  { name: 'until-you', re: new RegExp(String.raw`\buntil you(?:${APOS}ve| have)? (?:complete|finish|pass|earn|unlock|reach|clear|score|get|answer|submit|solve|master)`, 'gi') },
  { name: 'must-first', re: new RegExp(String.raw`\byou(?:${APOS}ll)? (?:must|need to|have to|will need to) (?:first )?(?:have )?(?:complete|finish|pass|completed|finished|passed)\b`, 'gi') },
  { name: 'gated', re: /\bgated (?:behind|by|until|on)\b/gi },
  { name: 'closed-until', re: /\bclosed until\b/gi },
  // "you can't continue until ...": moving on, or opening a lesson, stage, lab or drawer ("you can't see the lab's verdict lines until the run ends" is how a run reports)
  frame('cant-until', String.raw`\byou (?:can${APOS}t|cannot|can not|won${APOS}t be able to|may not) (?:(?:\w+ ){0,2}(?:continue|proceed|move on)\b|(?:\w+ )?(?:open|start|access|see|begin|read|enter|reach)\s+${TA})${GAP}{0,50}\buntil\b`),
]
// read every space of a pattern as a run of white space: emphasis marks are blanked, and a sentence may wrap
for (const p of LOCK_PHRASES) p.re = ws(p.re)

/** A label that is lock copy whatever it names: "Locked", "Unlocked!", "🔒 Locked". */
const LOCK_LABEL = /(?:^|[·|•—–(\[])[\s>*_#"“'‘-]*(?:🔒|🔐)?\s*(?:locked|unlocked)\s*(?:[!.:)\]·|•—–]|$)/i
/** A padlock is lock copy whatever the sentence names. */
const PADLOCK = /🔒|🔐/u
/** The thing that "this one", "that one" or "the previous one" stands for, in "finish this one first". */
const ONE = ws(/\b(?:this|that|the (?:previous|last|current|earlier))\s+one\b/i)
/** A question that ends a sentence: "Want the next lesson?" makes the next sentence about content. */
const QUESTION_END = /\?[\s"”'’)\]*_]*$/

/** What may stand before a thing inside its token: an article, a demonstrative, a possessive, an ordinal, then a count or "more" ("the next two lessons", "all five lessons", "more lessons"). */
const DET_TOKEN = String.raw`(?:(?:the|this|that|these|those|your|our|a|an|each|every|all|any|another|new|other|remaining|further|next|following|previous|later|first|second|third|last|final)\s+){0,2}(?:(?:[0-9]+|one|two|three|four|five|six|seven|eight|nine|ten|both|several|many|more|a few)\s+)?`
/**
 * A thing a learner can open, as tokenize finds it: a determiner or two, the thing or "the next one", and a possessive only
 * when what it owns is such a thing too ("the lab's next stage"). A noun after it makes it a modifier, and then it is no
 * thing: "the lab folder", "the lab's verdict lines", "unit tests" and "the Defence retake" are not the lab or the Defence,
 * so "submit your receipt to see the lab's verdict lines" opens nothing.
 */
const THING_SCAN = new RegExp(String.raw`\b${DET_TOKEN}(?:${REF}|(?:next|following|other|previous|later|first|second|third|last|final)\s+one\b)(?:${APOS}s?\s+${DET}${REF})?\b(?!${APOS}|\s+${MODIFIED}\b)`, 'gi')
const INDEFINITE = /^(?:a|an|each|every|all|any|another|new|other|remaining|further|more)\b/i

/**
 * The sentence with each thing a learner can open replaced by one token (T, TD and DEF above), and the map back to the
 * sentence. A stage or lesson ID counts only in exact case, as everywhere in the lock rule (`s1` is a session).
 */
function tokenize(text) {
  let out = ''
  let last = 0
  const map = []
  for (const m of text.matchAll(THING_SCAN)) {
    if (!stageIdsExact(m[0])) continue
    const token = `zq${/Defen[cs]es?$/i.test(m[0]) ? 'd' : 't'}${INDEFINITE.test(m[0]) ? 'i' : 'd'}`
    out += text.slice(last, m.index)
    map.push({ at: out.length, length: token.length, from: m.index, to: m.index + m[0].length })
    out += token
    last = m.index + m[0].length
  }
  return { text: out + text.slice(last), map }
}

/** An offset into a tokenized sentence, as an offset into the sentence; an offset inside a token is the token's start, or its end for `end`. */
function untoken(map, at, end = false) {
  let shift = 0
  for (const t of map) {
    if (at <= t.at) break
    if (at >= t.at + t.length) {
      shift += t.to - t.from - t.length
      continue
    }
    return end ? t.to : t.from
  }
  return at + shift
}

// ------------------------------------------------------------------ counters, loss framing, deadlines

/** What the sentence may say that the pressure and reward rules leave alone: the policy, in the negative ("no streaks", "nothing is ever overdue", "no hurry"). */
const PRESSURE_DENIAL = /\b(?:(?:no|never|without)\s+(?:an?\s+|any\s+|ever\s+)?(?:streaks?|overdue|deadlines?|XP|badges?|counters?|leaderboards?|hurry|rush)|nothing\s+(?:is\s+|gets\s+)?(?:ever\s+)?(?:overdue|lost)|never\s+(?:overdue|late))\b/i

const WEEKDAY = String.raw`(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)`
/** A small count, in digits or words: "3 days", "two sessions". */
const FEW = String.raw`(?:[0-9]+|one|two|three|four|five|six|seven|a few|several)`
/** The learner's practice, as the pressure rules name it: a set, a session, a review, a Keep block. */
const PRACTICE = String.raw`(?:sets?|sessions?|reviews?|blocks?|Keep blocks?|cards?|practice)`
/** Practice that can pile up, counted: reviews, cards, sets, Keep blocks ("2 sessions waiting on the row lock" is a database). */
const PILE = String.raw`(?:reviews?|cards?|sets?|Keep blocks?)`
/** A sentence about a system's time: a deadline, an expiry or a window of a lease, a timer, a job or a protocol is not the learner's. */
/** The same, and a run, a solver or a build, whose time budget is not the learner's either ("the run ends in 2 hours of solver time"). */
const RUN_TIME = /\b(?:leases?|timers?|timeouts?|RPCs?|requests?|jobs?|protocols?|model|spec|traces?|messages?|epochs?|clocks?|ticks?|scheduler|cron|batch(?:es)?|replicas?|processes|workers?|servers?|clients?|tokens?|certificates?|caches?|connections?|runs?|solvers?|builds?|benchmarks?|simulations?|quer(?:y|ies))\b/i
const SYSTEM_TIME = /\b(?:leases?|timers?|timeouts?|RPCs?|requests?|jobs?|protocols?|model|spec|traces?|messages?|epochs?|clocks?|ticks?|scheduler|cron|batch(?:es)?|replicas?|processes|workers?|servers?|clients?|tokens?|certificates?|caches?|connections?)\b/i
/** A time that presses: a weekday, tonight, tomorrow, midnight, the end of the day or week. */
const SOON = String.raw`(?:${WEEKDAY}(?:\s+(?:night|morning|evening))?|today|tonight|tomorrow|midnight|noon|the end of (?:the |this )?(?:day|week|month)|end of (?:day|week))`

export const PRESSURE_PHRASES = [
  { name: 'streak', re: /\bstreaks?\b|🔥\s*[0-9]+|[0-9]+\s*🔥/giu },
  { name: 'overdue', re: /\boverdue\b/gi },
  // the learner behind; a replica "falling behind the leader" is another thing
  {
    name: 'behind',
    re: new RegExp(
      String.raw`\b(?:you${APOS}re|you are|are you|you${APOS}ve fallen|you have fallen|you fell|you${APOS}re falling|you are falling|you${APOS}re getting|you are getting)\s+(?:(?:already|now|still|a bit|a little)\s+)?(?:${FEW}\s+(?:days?|weeks?|sessions?|lessons?|items?|sets?|blocks?)\s+)?behind\b|\bbehind (?:schedule|pace)\b|\byou(?:${APOS}re| are)\s+(?:falling\s+|getting\s+|going\s+)?off\s+track\b|(?:^\s*|\byou\b[^.;!?\n]{0,20}\b|\b(?:about|of|stop|avoid|without|risk|keep from|no more)\s+)falling behind\b|\bdon${APOS}?t fall behind\b`,
      'gim',
    ),
  },
  { name: 'missed-days', re: new RegExp(String.raw`\byou(?:${APOS}ve| have)? missed\b[^.;!?\n]{0,25}\b(?:days?|sessions?|weeks?|practice|reviews?|blocks?|today|yesterday)\b|\b${FEW}\s+missed\s+(?:days?|sessions?|weeks?|reviews?|blocks?)\b`, 'gi') },
  { name: 'in-a-row', re: /\b(?:days?|weeks?|sessions?) in a row\b/gi },
  // a counter of days away: "you haven't practised in 4 days", "it's been 5 days since your last session", "you skipped 3 sessions", "last practised 9 days ago"
  {
    name: 'days-since',
    re: new RegExp(
      String.raw`\byou\s+(?:haven${APOS}t|have not)\s+(?:practi[cs]ed|studied|been back|been here|been around|opened|done|trained|logged in|visited|come back|returned|shown up|reviewed|worked)\b[^.;!?\n]{0,25}\b(?:(?:in|for)\s+(?:${FEW}|a|over a)\s+(?:days?|weeks?)|(?:yet\s+)?today|this week)\b|\b(?:it${APOS}s|it has|it is)\s+(?:now\s+)?been\s+(?:${FEW}|a|over a)\s+(?:days?|weeks?)\s+since\s+(?:your|you)\b|\byou(?:${APOS}ve| have)?\s+(?:skipped|missed)\s+(?:your\s+(?:last\s+)?)?${FEW}\s+(?:days?|${PRACTICE})\b|\byou(?:${APOS}re| are)\s+${FEW}\s+(?:days?|${PRACTICE})\s+(?:short|off|behind)\b|\b${FEW}\s+(?:days?|weeks?)\s+(?:without\s+(?:practice|a session|a review|studying|practising|practicing)|since\s+(?:your|you))\b|\byou(?:${APOS}ve| have)\s+been\s+(?:away|gone|offline|inactive)\s+(?:for\s+)?(?:${FEW}|a|over a)\s+(?:days?|weeks?)|\byou\s+were\s+(?:away|gone|offline|inactive)\s+(?:for\s+)?(?:${FEW}|a|over a)\s+(?:days?|weeks?)|\byou(?:${APOS}re| are)\s+on\s+day\s+[0-9]+\b|^[\s>*_"“'‘(-]*day\s+[0-9]+\s+of\s+[0-9]+\b|\b(?:last\s+(?:practi[cs]ed|studied|here|seen|active))\b[^.;!?\n]{0,15}\b${FEW}\s+(?:days?|weeks?)\s+ago\b|\byou\s+were\s+last\s+here\b|\bday\s+[0-9]+\s+of\s+(?:your|the)\s+(?:run|streak|chain|plan|challenge)\b`,
      'gi',
    ),
  },
  // an overdue mark by another name: "past due", "your set is late", "14 reviews waiting", "your backlog", "reviews are piling up"
  {
    name: 'past-due',
    re: new RegExp(
      String.raw`\bpast[- ]due\b|\byour\s+backlog\b|\bbacklog\s*:|\ba\s+backlog\s+of\s+[0-9]+\s+${PILE}\b|\b(?:your|today${APOS}s|this week${APOS}s)\s+(?:set|review|session|practice|Keep block|card)s?\s+(?:is|are|was|were)\s+(?:late|behind)\b|\bthis\s+(?:set|review|Keep block)\s+(?:is|was)\s+(?:late|behind)\b|\b[0-9]+\s+${PILE}\s+(?:are\s+|is\s+)?(?:waiting|piling up|pending|outstanding|to catch up on|overdue|due)\b|\byou\s+have\s+[0-9]+\s+${PILE}\s+(?:waiting|pending|due|to (?:catch up on|do|review|clear))\b|\b(?:reviews?|cards?|sets?)\s+(?:are|is)\s+piling\s+up\b|\byou(?:${APOS}re| are)\s+running\s+(?:late|behind)\b`,
      'gi',
    ),
  },
  // a run of days by another name: "your 5-day run ends tonight", "keep your chain going"
  { name: 'chain', re: new RegExp(String.raw`\b[0-9]+[- ]day\s+(?:run|chain|habit)\b|\bkeep\s+(?:your|the)\s+(?:chain|run|momentum|rhythm|habit)\s+(?:going|alive|unbroken)\b|\byour\b[^.;!?\n]{0,30}\b(?:expires?|ends?|resets?)\s+(?:today|tonight|tomorrow|soon|at midnight)\b`, 'gi') },
  { name: 'dont-lose', re: new RegExp(String.raw`\bdon${APOS}?t (?:lose|break|miss)\b[^.;!?\n]{0,30}\b(?:streak|progress|momentum|chain|habit|rhythm|day|days|session|sessions|set|sets|review|reviews|Keep block|practice)\b`, 'gi') },
  // loss framing: "come back tomorrow or lose your progress", "your rhythm is broken", "practise every day or you will forget"; "the worker can lose progress on a crash" is about a system
  {
    name: 'lose-progress',
    re: new RegExp(
      String.raw`\blose\s+(?:all\s+)?your\s+(?:progress|streak|momentum|place|spot|rhythm|chain)\b|\byour\s+(?:progress|streak|place|momentum)\s+(?:will|could|may|might)\s+be\s+(?:lost|reset|wiped|cleared)\b|\byour\s+(?:streak|rhythm|chain|run|habit|momentum|progress)\s+(?:is|was|has been|will be|gets?)\s+(?:broken|lost|reset|over|gone|wiped|ended)\b|\b(?:skip|miss)\s+(?:a day|today|tomorrow|a session|a week|one day|a Keep block)\b[^.;!?\n]{0,40}\b(?:resets?|start(?:s)? over|lose|lost|broken|ends?)\b|\b(?:daily|every day|each day|tomorrow|every morning|every night)\b[^.;!?\n]{0,40}\b(?:or\s+(?:else\s+)?(?:you(?:${APOS}ll| will)?\s+)?(?:forget|lose)\b|to\s+keep\s+your\s+(?:progress|streak|chain|rhythm|momentum|place)\b)`,
      'gi',
    ),
  },
  // "due" notes: "due today", "due Friday", a "Due:" label; "due to the encoding" is plain English
  {
    name: 'due',
    re: new RegExp(String.raw`\bdue (?:today|tomorrow|tonight|now|soon|date|by|(?:on |this |next )?${WEEKDAY}|(?:this|next) (?:week|month)|in ${FEW} (?:days?|hours?|weeks?))\b|^\s*due\s*:`, 'gim'),
  },
  // a deadline by another name: "finish by Sunday", "finish before midnight", "this week's set closes tonight", "you have until Friday"
  { name: 'finish-by', re: new RegExp(String.raw`\b(?:finish|complete|submit|be done|done|hand in)\b[^.;!?\n]{0,30}\b(?:by|before)\s+${SOON}\b|\byou\s+have\s+until\s+${SOON}\b|\b(?:set|session|window|practice|Keep block|review|week${APOS}s set)s?\s+(?:closes?|expires?|ends?|runs out)\s+(?:today|tonight|tomorrow|soon|at midnight|on ${WEEKDAY}|this week)\b`, 'gi'), unless: SYSTEM_TIME },
  {
    name: 'time-left',
    re: new RegExp(
      String.raw`\byou(?:${APOS}ve got| have got| have|${APOS}ve)\s+(?:only\s+|just\s+)?${FEW}\s+(?:more\s+)?(?:days?|hours?|weeks?)\s+(?:left|remaining|to go|to finish|to complete|to submit)\b|\b(?:only|just)\s+${FEW}\s+(?:days?|hours?|weeks?)\s+(?:left|remain(?:ing)?|to go)\b|\b${FEW}\s+(?:days?|hours?|weeks?)\s+(?:left|remaining)\s+(?:to|before|until|in which)\b|^[\s>*_"“'‘(-]*${FEW}\s+(?:days?|hours?|weeks?)\s+left\b`,
      'gi',
    ),
  },
  // a deadline for the learner, or a deadline on a day; a deadline in a protocol ("before the deadline") is another thing
  { name: 'deadline', re: new RegExp(String.raw`\byour (?:own )?deadlines?\b|\bset(?:ting)? (?:a |your )?(?:\w+ )?deadlines?\b|\bdeadlines? (?:for|to) (?:finish|complete|submit|study|learn|you|your)\b`, 'gi') },
  { name: 'window-ends', re: new RegExp(String.raw`\b(?:ends?|closes?|expires?|runs out)\s+in\s+(?:${FEW}|an?)\s+(?:more\s+)?(?:minutes?|hours?|days?)\b`, 'gi'), unless: RUN_TIME },
  { name: 'deadline-day', re: new RegExp(String.raw`\bdeadlines?\b[^.;!?\n]{0,20}\b(?:${WEEKDAY}|today|tonight|tomorrow|midnight|this week|next week|end of (?:the )?(?:day|week))\b`, 'gi'), unless: SYSTEM_TIME },
  // urgency: "last chance: ...", "hurry!", "don't miss out"
  { name: 'urgency', re: /\blast chance\s*(?:[:!,—–-]|to\b)|^[\s>*_"“'‘(-]*hurry\b|\bhurry(?: up)?\s*[:!]|\bdon(?:'|’)?t miss out\b|\bending soon\b|\bact now\b|\btime(?:'|’)?s running out\b|\btime is running out\b|\byou(?:'|’)?re running out of time\b|\bcatch up (?:now|today)\b|^[\s>*_"“'‘(-]*catch up\s*!/gim },
]
// read every space of a pattern as a run of white space: emphasis marks are blanked, and a sentence may wrap
for (const p of PRESSURE_PHRASES) p.re = ws(p.re)

export const REWARD_PHRASES = [
  { name: 'xp', re: /\bXP\b/g },
  // a ranking against other learners: "top 10% of learners", "you beat 80% of learners", "you're #3", "Leaderboard: ..." (a benchmark's
  // leaderboard, cited as a dated reading, is a source)
  { name: 'ranking', re: /\btop\s+[0-9]+\s*%\s+of\s+(?:learners|students|users|people)\b|\b(?:beat|outperformed|ahead of|better than)\s+[0-9]+\s*%\s+of\s+(?:learners|students|users|people)\b|\byou(?:'|’)?re\s+(?:#|number\s+|no\.\s*)[0-9]+\b|\byou are\s+(?:#|number\s+|no\.\s*)[0-9]+\b|^[\s>*_"“'‘(-]*leaderboard\s*:|\byour\s+(?:rank|place|position)\s+(?:on|in)\s+the\s+leaderboard\b/gim },
  // points and badges for a click: "+50 points", "you earned 20 points", "badge earned", "a new badge" ("the badge shows where the check ran" is the
  // instrument's badge, and "later test-takers gained 13 points" or "an interval up to +43 points" is a finding about learners)
  { name: 'points', re: /^[\s>*_"“'‘(-]*\+\s?[0-9]+\s*(?:points?|pts)\b|\+\s?[0-9]+\s*pts\b|\byou(?:(?:'|’)ve| have)?\s+(?:earn(?:ed|s)?|get|got|win|won)\s+(?:another\s+)?[0-9]+\s+(?:more\s+)?(?:points?|pts|coins|gems|stars)\b|\b[0-9]+\s+points?\s+(?:earned|awarded|for (?:that|this|your|the) (?:call|answer|item|click|try))\b/gim },
  { name: 'badge', re: /\b(?:earn(?:ed|s)?|got|unlock(?:ed|s)?|win|won|collect(?:ed|s)?|awarded)\s+(?:(?:a|an|the|your|this|another|[0-9]+)\s+)?(?:new\s+)?(?:badges?|troph(?:y|ies)|medals?|stars?|crowns?|gems?|achievements?)\b|\b(?:badges?|achievements?|troph(?:y|ies)|medals?)\s+(?:earned|unlocked|awarded|collected)\b|\bnew\s+(?:badge|trophy|medal|achievement)\b/gi },
  { name: 'level-up', re: /\b(?:leveled|levelled) up\b|\blevel up!|^[\s>*_"“'‘(-]*level up\b|\breach(?:ed|es)?\s+level\s+[0-9]+\b(?!\s+of\b)|\blevel\s+[0-9]+\s+(?:reached|unlocked|achieved|complete)\b|\b(?:now|become|became)\s+an?\s+level\s+[0-9]+\b/gim },
  // praise for a click: "great job", "well done", and an exclamation that is praise and nothing else
  { name: 'praise', re: /\b(?:great|good|nice|excellent|awesome|amazing|fantastic|brilliant|superb|outstanding|terrific|incredible|impressive)\s+(?:job|work|effort|going)\b|\bwell done\b|\bbravo\b|\bnailed it\b|\bkeep it up\b|\bway to go\b|\byou(?:'|’)re (?:a natural|on fire|a star|crushing it|killing it)\b|\byou rock\b|\b(?:great|good|nice|excellent|awesome|amazing|fantastic|brilliant|superb)\s+(?:answer|call|try|thinking|choice|stuff)\s*!|^[\s>*_"“'‘(-]*(?:great|awesome|perfect|nice(?: one)?|fantastic|amazing|excellent|brilliant|superb|outstanding|wonderful|terrific|impressive|incredible|superstar|rockstar|genius|woo+hoo+|yay|hooray)\s*!*[.!]?\s*$/gim },
]
// read every space of a pattern as a run of white space: emphasis marks are blanked, and a sentence may wrap
for (const p of REWARD_PHRASES) p.re = ws(p.re)

const MESSAGES = {
  lock: 'lock copy: nothing here waits on anything (I5); say what is open, and name an honest dependency as "needs ..."',
  pressure: 'counters and loss framing are out (EVIDENCE.md rows 6, 7 and 17); say what was met, or welcome the learner back',
  reward: 'a reward for a click (DESIGN.md section 11.4); say what the learner can now do, on unseen items',
}

/**
 * An internal name that is also a verb, used as the verb: "Boot the machine", "Boot up the VM" at the start of a sentence,
 * where the capital is the sentence's and an object follows. "Boot asks one question" and "In Boot the solver finds a
 * transfer" are the tier.
 */
const PLAIN_VERB = { Boot: /^\s+(?:up|the|a|an|your|my|this|that|it|them|into|from|again)\b/ }
const SENTENCE_START = /^[\s>*_"“'‘([-]*$/
const plainVerb = (name, sentence, m) => PLAIN_VERB[name] !== undefined && SENTENCE_START.test(sentence.slice(0, m.index)) && PLAIN_VERB[name].test(sentence.slice(m.index + m[0].length))

/** A sentence that names the design documents: a labeled cross-reference (spine section 0). */
const CROSS_REFERENCE = /\bdesign (?:notes?|documents?|docs?)\b|\b(?:ARCHITECTURE|DESIGN|SPINE|PLAN|ASSESSMENT|AUDIT-DESK|DECISIONS|EVIDENCE|WORLD|LANDSCAPE)\.md\b|\bdocs\/[A-Za-z0-9_./-]+/i

function* matches(re, text) {
  re.lastIndex = 0
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    yield m
    if (m[0] === '') re.lastIndex += 1
  }
}

/**
 * A wait on the learner's own progress or on the Defence: "until you pass", "after you finish S1.L2", "once S1.L2 is done",
 * "after the Defence". A lock of another kind may sit in a lab (HELD_IN), but what it waits on then makes it lock copy:
 * "the vault in this lab opens after you pass the Defence" makes the lab wait, "the lock in LAB-6 opens after the
 * transaction commits" does not. Read on the tokenized sentence.
 */
const LEARNER_WAIT = new RegExp(
  spaced(String.raw`\b(?:${IF_DONE}|(?:until|till|unless|before)\s+${NOT_A_CONDITION})(?:you(?:${APOS}ve|${APOS}d| have| had)?\s+(?:(?:just|already|finally|fully|successfully|first|all)\s+)?${DONE_WIDE}\b|you(?:${APOS}re| are)\s+(?:all\s+)?(?:done|through|finished)\b|${DEF}\b|(?:passing|finishing|completing|clearing|solving|signing off)\b|${TA}\s+(?:is|are|has been|have been)\s+(?:(?:all|fully)\s+)?${DONE_PART}\b)`),
  'i',
)

/**
 * The first match of a lock pattern that meets the pattern's own conditions, `inside` (a content noun, or "this one",
 * within the match) and `exactIds` (stage and lesson IDs in exact case), as {index, end} in the sentence. A frame reads
 * the tokenized sentence, which `tokens` makes once per sentence, and its match is mapped back. A match whose thing is
 * where a lock of another kind sits ("the lock in LAB-6 opens after ...") is not one (HELD_IN), unless the sentence
 * makes it wait on the learner (LEARNER_WAIT).
 */
function firstHit(p, sentence, tokens) {
  const text = p.tokens === true ? tokens().text : sentence
  for (const m of matches(p.re, text)) {
    if (p.inside === true && !namesContent(m[0]) && !ONE.test(m[0])) continue
    if (p.exactIds === true && !stageIdsExact(m[0])) continue
    const index = p.tokens === true ? untoken(tokens().map, m.index) : m.index
    const end = p.tokens === true ? untoken(tokens().map, m.index + m[0].length, true) : m.index + m[0].length
    if (HELD_IN.test(sentence.slice(0, index)) && !LEARNER_WAIT.test(tokens().text)) continue
    return { index, end }
  }
  return undefined
}

/** The places copy sits in, which name the first-use rule that read it (term/boot, term/lesson, ...): see lib/rules.mjs. */
export const PLACES = ['boot', 'lesson', 'drawer', 'stage', 'lab', 'placement']

/**
 * The findings in one string of learner copy: [{check, rule, rules?, index, word, detail}], `index` an offset into
 * `original` and `word` the original's words there, with the emphasis marks around them. `rule` is the rule that raised
 * the finding (lib/rules.mjs); a lock finding names in `rules` every lock phrase that matched its sentence, `rule` first.
 *
 *   glossary   the compiled glossary (terms, internal names, internalIds)
 *   unit       [stage, lesson] of the page the copy sits on, or null for copy that has no place in the course order
 *   boot       whether the page is Boot, which has its own message
 *   place      where the copy sits (PLACES), which names the first-use rule: Boot, a lesson, a drawer, a stage, a lab or
 *              the placement walk; by default Boot or a lesson, as `boot` says
 *   scanIds    a function from a line of text to its ID tokens (packages/ids' scanLine)
 */
export function copyFindings(original, { glossary, unit, boot = false, place, scanIds }) {
  const out = []
  const masked = maskCopy(original)
  const where = place ?? (boot ? 'boot' : 'lesson')
  // IDs are not words: SEAM-1 is not a use of seam, RUN-z3-starter is not a use of run
  const idSpans = []
  const idTokens = []
  let at = 0
  for (const line of masked.split('\n')) {
    for (const t of scanIds(line)) {
      const start = at + t.col - 1
      idSpans.push([start, start + t.id.length])
      idTokens.push({ ...t, start })
    }
    at += line.length + 1
  }
  const words = blankSpans(masked, idSpans)
  // the sentence before, for a question about content that the next sentence answers ("Want S2? First pass the Defence.")
  let previous = null
  for (const span of splitSentences(masked)) {
    const sentence = masked.slice(span.start, span.end)
    const bare = words.slice(span.start, span.end)
    const raw = original.slice(span.start, span.end)
    /** The original's words at [index, end) of the sentence, with the emphasis marks around them ("**S1.L3** opens tomorrow"). */
    const wordAt = (index, end) => {
      let a = span.start + index
      let b = span.start + end
      while (a > 0 && (original[a - 1] === '*' || original[a - 1] === '_')) a -= 1
      while (b < original.length && (original[b] === '*' || original[b] === '_')) b += 1
      return { at: a, word: original.slice(a, b) }
    }
    /** A finding at [index, end) of the sentence; `detail` makes the message from the original's words. */
    const add = (check, rule, index, end, detail, rules) => {
      const { at, word } = wordAt(index, end)
      out.push({ check, rule, ...(rules === undefined ? {} : { rules }), index: at, word, detail: detail(word) })
    }
    const crossReference = CROSS_REFERENCE.test(raw)

    // internal names, and the IDs of the course's machinery; a labeled cross-reference to the design documents may name
    // one of them ("may name an internal term once", spine section 0), as often as it likes inside that sentence
    const found = []
    for (const x of glossary.internal) {
      for (const m of matches(x.matcher, bare)) {
        if (plainVerb(x.name, bare, m)) continue
        found.push({ name: x.name, rule: `internal/${x.name}`, index: m.index, end: m.index + m[0].length, detail: (w) => `"${w}" is an internal name (${x.name}); learners see ${x.say}` })
      }
    }
    for (const t of idTokens) {
      if (t.start >= span.start && t.start < span.end && glossary.internalIds.has(t.kind)) {
        const index = t.start - span.start
        found.push({ name: t.id, rule: `internal/id-${t.kind}`, index, end: index + t.id.length, detail: () => `${t.id} is an ID of the course's machinery (${t.kind}); learner copy names the thing a learner works with, never this` })
      }
    }
    found.sort((a, b) => a.index - b.index)
    const names = [...new Set(found.map((f) => f.name))]
    if (crossReference && names.length > 1) {
      add('internal', 'internal/cross-reference', found[0].index, found[0].end, () => `a labeled cross-reference to the design documents names one internal term; this one names ${names.join(' and ')}`)
    } else if (!crossReference) {
      for (const f of found) add('internal', f.rule, f.index, f.end, f.detail)
    }

    // glossary terms before their lesson
    if (unit !== null) {
      for (const t of glossary.terms) {
        if (comparePositions(unit, t.fromPosition) >= 0) continue
        for (const m of matches(t.matcher, bare)) {
          const why = (w) =>
            boot
              ? `Boot's copy uses terms 1 to 5 only, and "${w}" is term ${t.n}, ${t.term}, introduced at ${t.introduced}`
              : `"${w}" is term ${t.n}, ${t.term}, introduced at ${t.introduced}; this page comes before ${t.from}`
          add('term', `term/${where}`, m.index, m.index + m[0].length, (w) => (t.until === undefined ? why(w) : `${why(w)}; until then, ${t.until}`))
        }
      }
    }

    // lock copy: a padlock or a lock label whatever the sentence names; otherwise a sentence that names something a learner
    // can open, or answers a question about it in the same paragraph
    const answers = previous !== null && previous.question && previous.content && !/\n[ \t]*\n/.test(masked.slice(previous.end, span.start))
    const padlock = PADLOCK.exec(sentence)
    const lockMessage = (w) => `"${w}": ${MESSAGES.lock}`
    if (padlock !== null) add('lock', 'lock/padlock', padlock.index, padlock.index + padlock[0].length, lockMessage, ['lock/padlock'])
    else if (LOCK_LABEL.test(sentence) && !NOT_ABOUT_CONTENT.test(sentence) && !LOCK_DENIAL.test(sentence)) {
      const from = LOCK_LABEL.exec(sentence).index
      const label = /(?:un)?locked/i.exec(sentence.slice(from))
      add('lock', 'lock/label', from + label.index, from + label.index + label[0].length, lockMessage, ['lock/label'])
    } else if (!LOCK_DENIAL.test(sentence)) {
      const content = namesContent(sentence) || answers
      // "the next one" names a thing for the frames, which read it beside an access or an opening ("unlock the next one")
      const nextOne = !content && NEXT_ONE.test(sentence)
      let tokenized = null
      const tokens = () => (tokenized ??= tokenize(sentence))
      const hits = []
      for (const p of LOCK_PHRASES) {
        if (!content && p.anywhere !== true && !(nextOne && p.tokens === true)) continue
        if (p.weak && NOT_ABOUT_CONTENT.test(sentence)) continue
        if (p.afterQuestion && !answers) continue
        const hit = firstHit(p, sentence, tokens)
        if (hit !== undefined) hits.push({ rule: `lock/${p.name}`, ...hit })
      }
      if (hits.length > 0) add('lock', hits[0].rule, hits[0].index, hits[0].end, lockMessage, hits.map((h) => h.rule))
    }
    previous = { end: span.end, question: QUESTION_END.test(sentence), content: namesContent(sentence) }

    // counters, loss framing, deadlines; rewards
    if (!PRESSURE_DENIAL.test(sentence)) {
      for (const p of PRESSURE_PHRASES) {
        if (p.unless !== undefined && p.unless.test(sentence)) continue
        const m = matches(p.re, sentence).next()
        if (!m.done) add('pressure', `pressure/${p.name}`, m.value.index, m.value.index + m.value[0].length, (w) => `"${w}": ${MESSAGES.pressure}`)
      }
      for (const p of REWARD_PHRASES) {
        const m = matches(p.re, sentence).next()
        if (!m.done) add('reward', `reward/${p.name}`, m.value.index, m.value.index + m.value[0].length, (w) => `"${w}": ${MESSAGES.reward}`)
      }
    }
  }
  return out
}
