// The vocabulary guard (lib/words.mjs) that the render tests of the sheet and the Mirror hold every word to. A guard that holds
// nothing is worse than none, so the guard is held too: each rule has plants it must flag and look-alikes it must leave alone. The
// expectations come from the glossary (content/glossary.yaml) and from an ordering written here a second way, never from the
// guard's own functions, so a weakened guard cannot agree with itself.
//
//   node --test scripts/spikes/W1-T07/test/words.test.mjs

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { KINDS } from '../../../../packages/ids/src/grammar.ts'
import { STATUS_WORDS, comparePositions, copyProblems, internalFindings, lessonPosition, readGlossary, statusWords, termsIn } from '../lib/words.mjs'

const glossary = readGlossary()
const term = (n) => glossary.terms.find((t) => t.n === n)
/** A lesson ID as one number, a second way of ordering lessons: stage first, then lesson. */
const rank = (id) => {
  const [, stage, lesson] = /^S([0-9]+)\.L([0-9]+)$/.exec(id)
  return Number(stage) * 1000 + Number(lesson)
}
const termProblems = (text, lesson) => copyProblems(text, glossary, { lesson }).filter((p) => p.startsWith('glossary term'))

test('lessons are ordered by stage and then by number, numerically, and a text that is no lesson ID is none', () => {
  assert.deepEqual(lessonPosition('S1.L3'), [1, 3])
  assert.deepEqual(lessonPosition('S12.L0'), [12, 0])
  for (const bad of ['S1', 'S1.L', 'L3', 'S0.L1', 's1.l1', ' S1.L1', 'Boot', '', undefined, null, 7]) assert.equal(lessonPosition(bad), null, String(bad))
  const order = ['S1.L0', 'S1.L1', 'S1.L2', 'S1.L9', 'S1.L10', 'S2.L0', 'S2.L1', 'S10.L0']
  for (const [i, a] of order.entries()) for (const [j, b] of order.entries()) assert.equal(Math.sign(comparePositions(lessonPosition(a), lessonPosition(b))), Math.sign(i - j), `${a} against ${b}`)
})

test('every term of the glossary carries a lesson, and a glossary with a term that has none cannot be read', () => {
  assert.equal(glossary.terms.length, 25)
  for (const t of glossary.terms) assert.deepEqual(t.at, lessonPosition(t.from), t.term)
  const root = fs.mkdtempSync(path.join(process.env.W1T07_SCRATCH ?? os.tmpdir(), 'w1t07-words-'))
  try {
    fs.mkdirSync(path.join(root, 'content'))
    const write = (from) => fs.writeFileSync(path.join(root, 'content/glossary.yaml'), `format: glossary/1\nterms:\n  - {n: 1, term: call, from: ${from}, forms: [call]}\ninternal:\n  - {name: lane, forms: [lane], say: x}\n`)
    write('S1.L0')
    assert.equal(readGlossary(root).terms.length, 1)
    for (const from of ['Boot', 'S1', '""', 'null']) {
      write(from)
      assert.throws(() => readGlossary(root), /has no lesson ID in from/, from)
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('a term is held by the lesson that first introduces it: all 25 terms against every lesson of S1 and the first lessons of later stages', () => {
  const pages = ['S1.L0', 'S1.L1', 'S1.L2', 'S1.L3', 'S1.L4', 'S1.L5', 'S2.L0', 'S2.L1', 'S3.L1', 'S3.L9', 'S4.L1', 'S5.L1']
  for (const t of glossary.terms) {
    const sentence = `You meet the ${t.forms[0]} here.`
    assert.deepEqual(termsIn(sentence, glossary).map((x) => x.n), [t.n], `the sample for ${t.term} names that term and no other`)
    for (const page of pages) assert.equal(termProblems(sentence, page).length, rank(t.from) > rank(page) ? 1 : 0, `${t.term} (first lesson ${t.from}) on a page of ${page}`)
  }
})

test('the cut is the term\'s lesson, not its row number: claim and seam (rows 9 and 10, S1.L3) against drawer (row 11, S1.L1)', () => {
  // the premise: the rows and the lessons do not run in the same order, so a cut by row number lets a late term through
  assert.ok(term(9).n < term(11).n && rank(term(9).from) > rank(term(11).from))
  assert.ok(term(10).n < term(11).n && rank(term(10).from) > rank(term(11).from))
  // the Mirror's lede as it read before this guard held it to its lesson: "Claims" is a term of S1.L3
  const lede = 'Only you see this. It stays on this device, never appears on Claims and is never part of a shared report.'
  const found = copyProblems(lede, glossary, { lesson: 'S1.L1' })
  assert.equal(found.length, 1)
  assert.match(found[0], /glossary term 9 \(claim\) before S1\.L3, the lesson that introduces it, on a page of S1\.L1/)
  assert.deepEqual(copyProblems(lede, glossary, { lesson: 'S1.L3' }), [])
  assert.deepEqual(copyProblems('The claim sits on a seam.', glossary, { lesson: 'S1.L2' }).length, 2)
  // a term at the end of its first lesson's range: the page of its own lesson may use it, the page before may not
  assert.deepEqual(termProblems('A drawer holds side material.', 'S1.L1'), [])
  assert.equal(termProblems('A drawer holds side material.', 'S1.L0').length, 1)
  assert.deepEqual(termProblems('Today holds the call.', 'S1.L0'), [])
  assert.equal(termProblems('The Mirror shows the call.', 'S1.L0').length, 1)
  assert.deepEqual(termProblems('The Mirror shows the call.', 'S1.L1'), [])
  // the stage counts before the lesson: S2.L0 comes after S1.L5, though 0 is less than 5
  assert.equal(termProblems('Goal Replay shows each step.', 'S1.L5').length, 1)
  assert.deepEqual(termProblems('Goal Replay shows each step.', 'S2.L0'), [])
})

test('a case-sensitive term matches in its own case only, a term matches whole words only, and a space in a term reads as a hyphen too', () => {
  assert.equal(termProblems('Open the Bench.', 'S1.L0').length, 1)
  assert.deepEqual(termProblems('A park bench, a benchmark.', 'S1.L0'), [])
  assert.deepEqual(termProblems('A seamless calling, a runway.', 'S1.L0'), [], 'a form inside another word is not a use of the term')
  // a term that is not case-sensitive matches in any case, and a space in it also reads as a hyphen
  assert.equal(termProblems('The audit desk opens.', 'S1.L0').length, 1)
  assert.equal(termProblems('The Audit-Desk opens.', 'S1.L0').length, 1)
})

test('a text with no lesson is held to nothing, so the guard refuses it', () => {
  for (const lesson of [undefined, null, 'S1', 'Boot', 'L1', 7]) assert.throws(() => copyProblems('Today.', glossary, { lesson }), /needs the lesson the text sits on/, String(lesson))
  assert.throws(() => copyProblems('Today.', glossary), /needs the lesson the text sits on/)
})

test('every internal name of the glossary is flagged in each of its forms, and a look-alike is not', () => {
  assert.ok(glossary.internal.length >= 11)
  for (const x of glossary.internal) {
    for (const form of x.forms) assert.ok(internalFindings(`See the ${form} here.`, glossary).some((f) => f.includes(`(${x.name})`)), `${x.name}: ${form}`)
    assert.ok(copyProblems(`See the ${x.forms[0]} here.`, glossary, { lesson: 'S1.L5' }).length >= 1, `${x.name} is a problem on every page`)
  }
  assert.deepEqual(internalFindings('We boot the machine, and a laned road.', glossary), [], 'a case-sensitive name matches in its own case; a name matches whole words')
  assert.equal(internalFindings('Boot comes first.', glossary).length, 1)
})

test('an ID is an internal name when its kind is one the glossary lists, and fine when its kind is one a learner works with', () => {
  assert.deepEqual([...glossary.internalIds].sort(), ['brief-change', 'gate', 'generator', 'instrument', 'kc', 'mechanic', 'misconception', 'owner-decision', 'screen', 'task'])
  for (const k of KINDS) {
    const found = internalFindings(`It is ${k.example} here.`, glossary).filter((f) => f.includes("the course's machinery"))
    assert.equal(found.length, glossary.internalIds.has(k.kind) ? 1 : 0, `${k.kind}: ${k.example}`)
  }
})

test('the bare status words are flagged, in any case, and a word named in quotes or a code span is not', () => {
  // GATE-codes reserves these for stamps (spine section 11.2): the list is written out here, not read from the guard
  const words = ['verified', 'correct', 'safe', 'proven', 'guaranteed']
  assert.deepEqual([...STATUS_WORDS].sort(), [...words].sort())
  for (const w of words) {
    assert.deepEqual(statusWords(`The result is ${w}.`), [w], w)
    assert.equal(copyProblems(`The result is ${w.toUpperCase()}.`, glossary, { lesson: 'S1.L0' }).length, 1, w)
    assert.deepEqual(statusWords(`The word "${w}" is reserved for stamps, and so is \`${w}\` and “${w}”.`), [], w)
  }
  assert.deepEqual(statusWords('An unverified, incorrect, safely, proving, guarantee.'), [])
})

test('an exclamation mark and a check mark are flagged', () => {
  assert.equal(copyProblems('Well done!', glossary, { lesson: 'S1.L0' }).length, 1)
  for (const mark of ['✓', '✔', '✅']) assert.equal(copyProblems(`${mark} done.`, glossary, { lesson: 'S1.L0' }).length, 1, mark)
  assert.deepEqual(copyProblems('A plain sentence with a call in it.', glossary, { lesson: 'S1.L0' }), [])
})
