// The copy rules held to sentences, for copy.test.mjs and for `node scripts/verify-lessons.mjs --self-check`:
//
//   the corpora   fixtures/copy/lock.txt, pressure.txt and internal.txt, one sentence a row: an F row must raise one of
//                 its file's checks, a C row none of the checks its file keeps clean (CORPORA), and a ? row is not judged
//   the matrix    the lock rule's vocabulary (VOCABULARY, which README section 3.4 lists word for word, and readme.test.mjs
//                 holds the two to each other): every word of each list slotted into each kind of frame that has its slot,
//                 and every thing into one sentence of each kind of frame (frameSentences); each sentence must raise
//                 lock, but for the policy: what is open, available or ready every day or daily is open always
//
// The plants (lib/plants.mjs) pin each rule; these pin the words and the sentences, so a word taken out of a rule's
// vocabulary or out of a glossary's forms, or a rule narrowed until a row or a sentence it caught passes, fails the
// self-check too. copy.test.mjs requires each alternative of each lock, pressure and reward phrase to flag some F row alone.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyFindings } from './copy.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
/** Each corpus, the checks its F rows must raise (one of them), and the checks its C rows must raise none of. */
export const CORPORA = [
  ['lock.txt', ['lock'], ['lock', 'pressure', 'reward']],
  ['pressure.txt', ['pressure', 'reward'], ['lock', 'pressure', 'reward']],
  ['internal.txt', ['internal'], ['internal']],
]

/** The rows of a corpus file: [{mark, text}], comments and blank lines left out. */
export function corpusRows(file) {
  const rows = []
  for (const line of fs.readFileSync(path.join(HERE, '..', 'fixtures', 'copy', file), 'utf8').split('\n')) {
    if (line.trim() === '' || line.startsWith('#')) continue
    const bar = line.indexOf('|')
    rows.push({ mark: line.slice(0, bar), text: line.slice(bar + 1) })
  }
  return rows
}

/** The lock rule's vocabulary, as README section 3.4 lists it (readme.test.mjs holds the README's lists to these). */
export const VOCABULARY = {
  /** Something a learner can open: each kind of thing the README names, as a sentence would name it. */
  things: ['the next lesson', 'the next stage', 'the next lab', 'this drawer', 'the next audit case', 'the Defence', 'S2', 'S1.L3', 'LAB-2', 'LAB-1.3', 'D-03', 'AUD-1.2', 'the course', 'more content', 'the next module', 'this unit', 'every segment', 'level 2', 'the next chapter', 'the next section', 'the next exercise', 'the next part', 'the next one', 'the rest of the course', "the lab's next stage"],
  access: ['open', 'see', 'read', 'view', 'unlock', 'reveal', 'start', 'begin', 'access', 'reach', 'enter', 'take', 'try', 'attempt', 'get to', 'go to', 'get into', 'move on to', 'move to', 'go on to', 'continue to', 'proceed to', 'progress to', 'advance to', 'skip to', 'jump to', 'jump ahead to', 'skip ahead to', 'qualify for', 'be eligible for', 'become eligible for', 'get through to', 'have access to', 'gain access to', 'get access to'],
  /** The progress: the verb, its participle, what it is done to, and a word after that ("get the exit items right"). */
  progress: [['complete', 'completed', 'S1.L2'], ['finish', 'finished', 'S1.L2'], ['pass', 'passed', 'the Defence'], ['clear', 'cleared', 'the Defence'], ['solve', 'solved', 'the exit items'], ['earn', 'earned', 'a pass on the Defence'], ['master', 'mastered', 'S1'], ['score', 'scored', '80% on the Defence'], ['submit', 'submitted', 'LAB-1.2'], ['answer', 'answered', 'the exit items'], ['sign off', 'signed off', 'S1'], ['ace', 'aced', 'the Defence'], ['get through', 'got through', 'the Defence'], ['get', 'got', 'the exit items', 'right']],
  /** Opening: a verb on its own, or a state after one of stateVerbs. */
  opening: ['opens', 'opens up', 'unlocks', 'appears', 'shows up', 'goes live'],
  stateVerbs: ['is', 'becomes', 'will be'],
  states: ['open', 'opened', 'available', 'visible', 'accessible', 'yours', 'unlocked', 'released', 'ready', 'waiting for you'],
  time: ['tomorrow', 'tonight', 'in 24 hours', 'in two days', 'a day later', 'the next day', 'next week', 'Friday', 'on Monday', 'this Friday', 'from tomorrow', 'starting Monday', 'on 2026-11-03', 'on November 3', '3 November', 'at midnight', 'every Monday', 'every day', 'each day', 'every other day', 'every 24 hours', 'twice a week', 'daily', 'weekly', 'one a day', 'one at a time'],
  /** A refusal with the access ("you can't open S1.L3"). */
  refusal: ["can't", 'cannot', "won't", "won't be able to", 'may not', "aren't allowed to", "don't get to"],
  /** The thing refused or closed ("S1.L3 stays closed"). */
  closed: ["won't open", "doesn't open", "can't be opened", "isn't open", "hasn't opened", 'stays closed', 'stays hidden', 'stays greyed out', 'stays off-limits', 'stays out of reach', 'stays shut', 'stays locked'],
  /** Access denied with no verb ("no access to S1.L3", "you're not ready for S1.L3"). */
  denied: ['no access to', "you're not ready for", "you're not eligible for"],
}

const cap = (x) => x[0].toUpperCase() + x.slice(1)
/** Every opening: the verbs on their own, then each state after each state verb ("becomes available"). */
export const openings = () => [...VOCABULARY.opening, ...VOCABULARY.stateVerbs.flatMap((v) => VOCABULARY.states.map((s) => `${v} ${s}`))]
/** The progress as an instruction ("get the exit items right") and as done ("got the exit items right"). */
const doing = ([verb, , object, after]) => `${verb} ${object}${after === undefined ? '' : ` ${after}`}`
const done = ([, participle, object, after]) => `${participle} ${object}${after === undefined ? '' : ` ${after}`}`
/** A thing a refusal can name: "you can't open more content yet" refuses nothing in particular (README section 3.4). */
export const definite = (thing) => !/^(?:a|an|each|every|all|any|another|new|other|remaining|further|more)\b/i.test(thing)

/** The matrix: each kind of frame with every word of each of its slots, the thing being S1.L3. */
export function matrixSentences() {
  const { access, progress, time, refusal, closed, denied } = VOCABULARY
  const opening = openings()
  return [
    ...progress.flatMap((p) => access.map((a) => `${cap(doing(p))} to ${a} S1.L3.`)),
    ...progress.flatMap((p) => access.map((a) => `To ${a} S1.L3, ${doing(p)}.`)),
    ...progress.flatMap((p) => opening.map((w) => `${cap(doing(p))} and S1.L3 ${w}.`)),
    ...progress.flatMap((p) => opening.map((w) => `Once you've ${done(p)}, S1.L3 ${w}.`)),
    ...progress.flatMap((p) => access.map((a) => `Once you've ${done(p)}, you can ${a} S1.L3.`)),
    ...progress.flatMap((p) => opening.map((w) => `S1.L3 ${w} once you ${doing(p)}.`)),
    ...progress.flatMap((p) => access.map((a) => `You can ${a} S1.L3 once you ${doing(p)}.`)),
    ...refusal.flatMap((r) => access.map((a) => `You ${r} ${a} S1.L3 yet.`)),
    ...refusal.flatMap((r) => access.map((a) => `You ${r} ${a} S1.L3 until you pass the Defence.`)),
    ...closed.map((r) => `S1.L3 ${r} until you pass the Defence.`),
    ...closed.map((r) => `S1.L3 ${r} for now.`),
    ...denied.flatMap((d) => [`${cap(d)} S1.L3 yet.`, `${cap(d)} S1.L3 until you pass the Defence.`]),
    ...opening.flatMap((w) => time.map((t) => `S1.L3 ${w} ${t}.`)),
  ]
}

/** One sentence of each kind of frame for each thing; a refusal and access denied name a definite thing only. */
export function frameSentences() {
  return VOCABULARY.things.flatMap((t) => [
    `Finish S1.L2 to open ${t}.`,
    `To open ${t}, finish S1.L2.`,
    `Finish S1.L2 and ${t} opens.`,
    `Once you've finished S1.L2, ${t} opens.`,
    `Once you've finished S1.L2, you can open ${t}.`,
    `${cap(t)} opens once you finish S1.L2.`,
    `You can open ${t} once you finish S1.L2.`,
    ...(definite(t) ? [`You can't open ${t} yet.`, `You can't open ${t} until you pass the Defence.`, `No access to ${t} until you pass the Defence.`] : []),
    `${cap(t)} stays closed until you pass the Defence.`,
    `${cap(t)} stays closed for now.`,
    `${cap(t)} opens tomorrow.`,
  ])
}

/** A sentence of the matrix that says the policy: a state that holds every day ("S1.L3 is available daily"). */
export const isPolicy = (sentence) => /^S1\.L3 (?:is|becomes|will be) (?:\S+ )*?(?:open|opened|available|visible|accessible|yours|ready|unlocked|released|waiting for you) (?:every day|each day|daily)\.$/.test(sentence)

/**
 * The corpora and the matrix through the copy rules, given the gate's environment (its glossary and ID scanner).
 * Returns {corpora: [{file, rows, wrong}], matrix: {sentences, policy, missed}}; `wrong` and `missed` are empty when the
 * rules hold. The matrix's sentences are the vocabulary's (matrixSentences) and the things' (frameSentences).
 */
export function checkCopyCorpora(env) {
  const raised = (text) => new Set(copyFindings(text, { glossary: env.glossary, unit: null, scanIds: env.scanIds }).map((f) => f.check))
  const corpora = CORPORA.map(([file, checks, clean]) => {
    const wrong = []
    let rows = 0
    for (const { mark, text } of corpusRows(file)) {
      if (mark === '?') continue
      rows += 1
      const got = raised(text)
      const ok = mark === 'F' ? checks.some((c) => got.has(c)) : !clean.some((c) => got.has(c))
      if (!ok) wrong.push(`${mark}|${text} -> ${JSON.stringify([...got])}`)
    }
    return { file, rows, wrong }
  })
  const sentences = [...matrixSentences(), ...frameSentences()]
  const policy = sentences.filter(isPolicy)
  const missed = sentences.filter((s) => !isPolicy(s) && !raised(s).has('lock'))
  return { corpora, matrix: { sentences: sentences.length, policy: policy.length, missed } }
}
