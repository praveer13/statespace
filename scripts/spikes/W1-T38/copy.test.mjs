import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'
import { copyFindings, LOCK_PHRASES, PRESSURE_PHRASES, REWARD_PHRASES, spaced } from './lib/copy.mjs'
import { compileForms, lessonPosition, stageEnd } from './lib/glossary.mjs'
import { CORPORA, checkCopyCorpora, corpusRows } from './lib/corpus.mjs'
import { envFor } from './helpers.mjs'

const { env } = await envFor()
const BOOT = lessonPosition('S1.L0')

/** The check names a string of copy raises, with the optional position of its page. */
function raised(text, { unit = null, boot = false } = {}) {
  return [...new Set(copyFindings(text, { glossary: env.glossary, unit, boot, scanIds: env.scanIds }).map((f) => f.check))].sort()
}
const findings = (text, opts = {}) => copyFindings(text, { glossary: env.glossary, unit: opts.unit ?? null, boot: opts.boot ?? false, place: opts.place, scanIds: env.scanIds })

/** Every row of the tables below, which the corpora must hold too (the last test of this file). */
const TABLE_ROWS = []
function table(name, rows, opts) {
  if (opts === undefined) for (const [text, expected] of rows) TABLE_ROWS.push({ table: name, text, expected })
  test(name, () => {
    for (const [text, expected] of rows) assert.deepEqual(raised(text, opts), expected, text)
  })
}

// ------------------------------------------------------------------ lock copy (I5)

table('lock copy: a lesson, drawer, stage, lab or the Defence that waits on something is flagged', [
  ['Finish the Defence to unlock the next lesson.', ['lock']],
  ['Complete S1 first.', ['lock']],
  ['Finish LAB-1.2 first, then come back to this drawer.', ['lock']],
  ['This drawer is available only after you pass the Defence.', ['lock']],
  ['S2 becomes available once S1 is signed off.', ['lock']],
  ['Not yet available: S2.', ['lock']],
  ['The lab opens after you finish LAB-1.1.', ['lock']],
  ['This stage is locked until you complete the previous one.', ['lock']],
  ['You must complete the previous stage before you can open this one.', ['lock']],
  ['You have to finish S1.L3 to continue.', ['lock']],
  ['You cannot continue to the next lesson until you pass the check.', ['lock']],
  ['The next lesson is gated behind the Defence.', ['lock']],
  ['The drawer stays closed until you reach S2.', ['lock']],
  ['Only after you finish the Defence does the audit case open.', ['lock']],
])

table('lock copy: a sentence that names the content it locks is lock copy, whatever else the sentence is about', [
  // the nouns of S1's own examples (a transfer, a balance, an account, a refund, a payment) do not excuse a lock on a lab or a lesson
  ['Fix the transfer to unlock LAB-1.3.', ['lock']],
  ['This lesson stays locked until your balance query returns unsat.', ['lock']],
  ['Unlock the next lesson by finding a witness that overdraws the account.', ['lock']],
  ['The next lesson is locked until the transfer is fixed.', ['lock']],
  ['Unlock the next lesson by fixing the refund.', ['lock']],
  ['The counterexample lab of transfers, unlocked after S1.L3.', ['lock']],
  ['Your balance query unlocks S1.L3.', ['lock']],
  ['Once the transfer guard holds, S1.L3 unlocks.', ['lock']],
  ['Lesson 3 is locked until the refund query passes.', ['lock']],
  ['The Defence stays locked until the payment check passes.', ['lock']],
  ['LAB-1.3 is still locked.', ['lock']],
  ['Solve the refund query to unlock the next two lessons.', ['lock']],
  ['Unlock all the labs by fixing the transfer.', ['lock']],
  ['Everything in S2 is locked until you finish S1.', ['lock']],
  ['Fix the transfer to unlock the first drawer.', ['lock']],
  ['The audit case unlocks once the fund balances match.', ['lock']],
  ['Everything about balances stays locked behind the lab.', ['lock']],
  ['S2 is not unlocked until the transfer guard holds.', ['lock']],
])

table('lock copy: a purpose clause that opens a lesson, stage, lab, drawer or the Defence is lock copy, whether the access comes last or first', [
  ['Pass the Defence to open the next stage.', ['lock']],
  ['Complete this lesson to open LAB-1.', ['lock']],
  ['Finish this lesson to see the next one.', ['lock']],
  ['Pass this check to move on to S1.L2.', ['lock']],
  ['Earn a pass on the Defence to continue to S2.', ['lock']],
  ['Clear the check to start the lab.', ['lock']],
  ['Solve the refund query to reach D-03.', ['lock']],
  ['To open the next stage, pass the Defence.', ['lock']],
  ['To start LAB-1.1, first finish S1.L3.', ['lock']],
  ['To continue to the next lesson, you must complete this one.', ['lock']],
])

// the four classes a verifier planted (round 2), each with the variants that the same rule has to hold
table('lock copy (a): a purpose clause asks for any task, and the access may come first', [
  ['Answer three items to open the next lesson.', ['lock']],
  ['Submit your receipt to open LAB-1.4.', ['lock']],
  ['Mount a specimen to open the next drawer.', ['lock']],
  ['Get three calls right to see the next lesson.', ['lock']],
  ['To see S1.L3, finish this lesson.', ['lock']],
  ['To get to the next lesson, finish this one first.', ['lock']],
  ['Score 80% to reach S2.', ['lock']],
  ['Fix the guard to open LAB-1.4.', ['lock']],
  ['Write the violation query to move on to S1.L3.', ['lock']],
  ['Find a witness to continue to the next stage.', ['lock']],
  ['Master these ideas to take the Defence.', ['lock']],
  ["Complete the lab to open the lab's next stage.", ['lock']],
  ['To read the next drawer, answer this item.', ['lock']],
  ['To take the Defence, you must finish every lesson.', ['lock']],
  ['You need to pass the Defence to open S2.', ['lock']],
])

table('lock copy (b): the content opens or appears after, once or when the learner or the learner\'s work does something', [
  ['The next stage opens when your transfer query is unsat.', ['lock']],
  ['S1.L3 opens when your guard passes.', ['lock']],
  ['The lab opens as soon as you finish S1.L1.', ['lock']],
  ['S1.L3 opens if you pass this check.', ['lock']],
  ['S1.L3 is yours once you pass.', ['lock']],
  ['S1.L3 is open after you pass.', ['lock']],
  ['The next lesson shows up once you pass.', ['lock']],
  ['S1.L3 appears in your list once you pass.', ['lock']],
])

table('lock copy (c): a condition, then the content opens', [
  ['Pass the Defence and S2 opens.', ['lock']],
  ['Once you finish LAB-1.2, LAB-1.3 opens.', ['lock']],
  ['After the Defence, S2 opens.', ['lock']],
  ['After the Defence S2 opens.', ['lock']],
  ['Finish your transfer query, then the next lesson opens.', ['lock']],
  ['Your balance query must pass before S1.L3 opens.', ['lock']],
  ['When your balance check passes, S1.L3 opens.', ['lock']],
  ['Once S1 is signed off, S2 opens.', ['lock']],
  ['Pass the transfer check, and S1.L3 becomes yours.', ['lock']],
  ['Finish this lesson and the next one becomes available.', ['lock']],
  ['Passing the Defence opens S2.', ['lock']],
  ['Completing LAB-1.2 lets you start LAB-1.3.', ['lock']],
])

table('lock copy (d): a permission, a closure or a requirement that waits on a condition', [
  ['Only learners who pass the Defence can open S2.', ['lock']],
  ['You will be able to open S1.L3 after this lesson.', ['lock']],
  ['When your balance check passes, you can move on to S1.L3.', ['lock']],
  ['S1.L3 is closed to you until the Defence.', ['lock']],
  ['The next lesson appears when you pass this check.', ['lock']],
  ['Prerequisite: pass S1.L2 first.', ['lock']],
  ['Prerequisite: S1.L2.', ['lock']],
  ['S1.L2 is a prerequisite for S1.L3.', ['lock']],
  ['Learners who pass the Defence can open S2.', ['lock']],
  ['This lesson is available to learners who passed S1.L2.', ['lock']],
  ['S2 opens to anyone who passes the Defence.', ['lock']],
  ['S2 requires a passed Defence.', ['lock']],
  ['S2 requires you to pass the Defence.', ['lock']],
  ['This lesson requires S1.L2 to be complete.', ['lock']],
  ['Finish S1.L1 before starting S1.L2.', ['lock']],
  ['Come back to LAB-1.3 after you finish S1.L3.', ['lock']],
  ['S2 waits for the Defence.', ['lock']],
  ["Don't open S2 until you pass the Defence.", ['lock']],
  ['Gain access to S2 by passing the Defence.', ['lock']],
  ['S1.L3 stays hidden unless you pass.', ['lock']],
  ['You are allowed to open S2 after the Defence.', ['lock']],
])

table('lock copy: more ways to say the same, each held by one pattern', [
  ["You'll get S2 once you pass the Defence.", ['lock']],
  ['S2 is reserved for learners who passed the Defence.', ['lock']],
  ['S2 is only for those who passed the Defence.', ['lock']],
  ['The Defence must be passed before S2.', ['lock']],
  ['S1.L3 can only be opened after S1.L2.', ['lock']],
  ["S2 can't be opened until the Defence is passed.", ['lock']],
  ['Finish S1 to move to S2.', ['lock']],
  ['Pass the check and you can open S1.L3.', ['lock']],
  ["Pass the check, and you'll see S1.L3.", ['lock']],
  ['If you pass the Defence, S2 opens.', ['lock']],
  ['Unless you pass the Defence, S2 stays closed.', ['lock']],
  ['Start S2 once S1 is signed off.', ['lock']],
  ['Start LAB-1.2 after you finish S1.L1.', ['lock']],
  ['Open S2 only after the Defence.', ['lock']],
  ['The Defence is the gate to S2.', ['lock']],
  ['S2 is still closed.', ['lock']],
  ["S2 isn't open yet.", ['lock']],
  ['S2 is not open until the Defence.', ['lock']],
  ['Your next lesson will be ready after you pass.', ['lock']],
  ['S2 is your reward for passing the Defence.', ['lock']],
  ['🔒 Next lesson', ['lock']],
])

table('lock copy: their neighbours that say no such thing', [
  ['If you finish early, you can read D-03.', []],
  ['Start LAB-1.2 after S1.L1.', []],
  ['S2 comes after S1.', []],
  ['The key to this lesson is the negation.', []],
  ['Each drawer can be opened at any time.', []],
  ["You'll get the lab's verdict lines once you submit.", []],
  ['Unless you say otherwise, the lab runs in the tab.', []],
  ['The lesson is ready after a short warm-up.', []],
  ['The Defence is closed-book.', []],
  ['The lab is closed to edits while it checks.', []],
  ['Your reward is what you can now do, on unseen items.', []],
])

table('lock copy: a page that presents itself, an invitation, a view and a schedule are not flagged', [
  // curriculum/D-drawers.md sections 5.2, 5.6 and 6.7, and DESIGN.md section 11.6, word for word
  ['Pass, and the lesson opens on its summary. It stays open either way.', []],
  ['Already know this? Three items, about 5 minutes. Pass, and the lesson opens on its summary. It stays open either way.', []],
  ['Not shown yet: Two-state properties. The lesson is ready when you are.', []],
  ["Show this stage's ideas: 12 ideas, three items each. Labs and the Defence stay as they are.", []],
  ['Know some logic already? An optional 15-minute check lets the course skip what you show. You can take it later from Stages.', []],
  ['Worth a second look: Quantifiers and negation. Its page sits beside S1.L1.', []],
  ['Retake Part B on fresh seeds from 2026-11-02. Everything else stays open.', []],
  ['Deferred. The roadmap defers category theory until a concrete obligation demands it. This drawer is open now; it surfaces in Today when a claim carries the topic.', []],
  ["You've been on this stage about 40 minutes. Want the stuck protocol?", []],
  // how a page opens, and an invitation
  ['Miss it, and its drawer opens inline at its trigger.', []],
  ['Its drawer opens inline when your call misses.', []],
  ['D-01 opens on its summary once your placement shows the idea.', []],
  ['The Defence opens with Part A.', []],
  ['Open the next lesson whenever you like.', []],
  ['The next lesson opens when you\'re ready.', []],
  ['You can open S1.L3 now or after this lesson.', []],
  ['You can open S1.L3 now, or later.', []],
  ['S1.L3 is open now, and so is every drawer.', []],
  ['The lesson waits for you.', []],
  ['The Defence stays open after you sign off.', []],
  ['Every drawer is open to anyone who wants it.', []],
  // a view, a folder or a page of the lab, and navigation
  ["Submit your receipt to see the lab's verdict lines.", []],
  ['Finish the install to open the lab folder.', []],
  ['Pass the check to see the lab page.', []],
  ['To see the verdict, run the check.', []],
  ['Answer the prequestion, then read the next segment.', []],
  ['Scroll down to see the next lesson.', []],
  ['Follow the link to read D-03.', []],
  ['A drawer link appears when the trigger fires in the lab.', []],
  // a dependency, a pass condition and a schedule
  ['LAB-1.3 needs your guard from LAB-1.2.', []],
  ['The check requires a passing premise query in LAB-1.3.', []],
  ['Finish the setup before starting LAB-1.', []],
  ["Don't start LAB-1.2 before installing uv.", []],
  ['LAB-10.c5 passes only if your verdict matches the key.', []],
  ['The keep-alive starts only once S2 is signed off.', []],
  ['A drawer appears in lessons only once it ships.', []],
  ['Pass the Defence to sign off S1.', []],
])

table('lock copy: a dependency, a hint, a technical lock and the policy said in the negative are not flagged', [
  ['Next, this needs your interpreter from LAB-3.', []],
  ['Install uv before you can run LAB-1.1.', []],
  ['Make your call before you run the query.', []],
  ['R1 opens after a teach-back of at least 12 words.', []],
  ['The row stays locked until the transaction commits.', []],
  ['The mutex is unlocked when the thread leaves the critical section.', []],
  ['The sender account is locked until the audit case ends.', []],
  ['It unlocks nothing.', []],
  ['Nothing is locked: every drawer is open.', []],
  ['Run the unit tests first, then the lab.', []],
  ['Incidents begin after LAB-3.', []],
  ['Everything else stays open.', []],
  ["Correct, complete worked examples before each briefing's first call (S10's components).", []],
  ['Complete worked examples come first, in S1.', []],
  ['Deferred. The roadmap defers a topic until a concrete obligation demands it. This drawer is open now.', []],
  // a purpose clause that opens a view, a card or a result is not an access rule
  ["Finish the lab's README to see both cards prefilled.", []],
  ['Run the check to see the verdict.', []],
  ['Complete the worked example to see the next step.', []],
  ['Open the lesson to see the next card.', []],
  ['Finish the setup, then run the lab.', []],
  ['To start the starter, run `uv sync` in the lab folder.', []],
  // a lock of another kind: a session named s1, a row, a lab's mutex
  ['The row stays locked until s1 commits.', []],
  ['Session s2 stays locked until s1 commits.', []],
  ['The row stays locked until you commit.', []],
  ['The lab row is locked until the transaction commits.', []],
  ['The row is locked behind the transaction.', []],
  // the policy, which a lock phrase must not turn into a finding
  ['S2 is not locked.', []],
])

test('lock copy is read in a sentence: a lock phrase and a content noun apart are not one', () => {
  assert.deepEqual(raised('Unlock the phone. A lesson follows.'), [])
  assert.deepEqual(raised('A lesson follows. Unlock the lesson.'), ['lock'])
})

test('one lock finding per sentence, at the phrase, with the phrase in the message', () => {
  const [f, ...rest] = findings('Finish the Defence to unlock the next lesson and complete S1 first.')
  assert.equal(rest.length, 0)
  assert.equal(f.check, 'lock')
  assert.equal(f.index, 'Finish the Defence to '.length)
  assert.match(f.detail, /"unlock".*nothing here waits on anything \(I5\)/)
})

test('an explicit lock phrase is reported whole, at its place, whatever else the sentence is about', () => {
  const [f, ...rest] = findings('Fix the transfer to unlock LAB-1.3.')
  assert.equal(rest.length, 0)
  assert.equal(f.index, 'Fix the transfer to '.length)
  assert.equal(f.word, 'unlock LAB-1.3')
  assert.match(f.detail, /"unlock LAB-1\.3".*nothing here waits on anything \(I5\)/)
  assert.equal(findings('The counterexample lab of transfers, unlocked after S1.L3.')[0].word, 'unlocked after S1.L3')
  assert.equal(findings('Pass the Defence to open the next stage.')[0].word, 'Pass the Defence to open the next stage')
})

// the classes a verifier planted in round 3, each now one frame over the whole vocabulary (README section 3.4)
table('lock copy (round 3): a release on a schedule, "not yet", other conditions, progress with no object', [
  // a release on a schedule
  ['S1.L3 opens tomorrow.', ['lock']],
  ['The next lesson will be available in 24 hours.', ['lock']],
  ['New lessons open every Monday.', ['lock']],
  ['This drawer opens tomorrow.', ['lock']],
  // not yet
  ["You can't open S1.L3 yet.", ['lock']],
  ["S1.L3 can't be opened yet.", ['lock']],
  ["You can't open this drawer yet.", ['lock']],
  ["If you don't pass the Defence, you can't start S2.", ['lock']],
  // other conditions
  ["S2 won't open until you've signed off S1.", ['lock']],
  ['Only after the Defence can you open S2.', ['lock']],
  ['S2 starts after you pass the Defence.', ['lock']],
  ['Your access to S2 begins after the Defence.', ['lock']],
  ['No access to S2 until the Defence is passed.', ['lock']],
  ['Access to the next lesson is granted after you pass.', ['lock']],
  ['LAB-1.3 opens only when LAB-1.2 passes.', ['lock']],
  ['Get every item right and the next lesson opens.', ['lock']],
  ['First pass the Defence; then S2 opens.', ['lock']],
  ['Sign off S1 before you open S2.', ['lock']],
  ['Pass S1.L2 to qualify for S1.L3.', ['lock']],
  ['Passing S1.L2 gives you S1.L3.', ['lock']],
  // progress with no object
  ['Pass the Defence to progress.', ['lock']],
  ['Finish the lab to move on.', ['lock']],
  ['To move on, pass the Defence.', ['lock']],
])

table('lock copy (round 3): DESIGN.md section 11.4\'s own words beside the course, a module, a segment or content, and a padlock or a label alone', [
  ['Unlock the rest of the course.', ['lock']],
  ['Complete this module first.', ['lock']],
  ['The next segment unlocks after your call.', ['lock']],
  ['More content unlocks as you progress.', ['lock']],
  ['The course is locked until you set your week.', ['lock']],
  ['The rest of this page stays locked until you answer.', ['lock']],
  ['🔒 Locked', ['lock']],
  ['Unlocked!', ['lock']],
  ['Not started · Locked', ['lock']],
  ['Complete to unlock.', ['lock']],
  ['Locked content', ['lock']],
  // a question about content, answered in the next sentence
  ['Want the next lesson? Finish this one first.', ['lock']],
  ['Ready for S2? First pass the Defence.', ['lock']],
  ['Next up, once you\'re done: S1.L3.', ['lock']],
])

table('lock copy (round 3): the look-alikes stay clean', [
  ["You can't start LAB-3 without your interpreter from LAB-2.", []],
  ['You cannot start LAB-1.2 without uv installed.', []],
  ["If you don't install uv, you can't start LAB-1.1.", []],
  ['LAB-1.2 won\'t start until uv is installed.', []],
  ['Fix the encoding in LAB-1.3 to proceed.', []],
  ['Write the guard to continue LAB-1.2.', []],
  ['S2 begins after S1.', []],
  ['This lesson is open every day of the week.', []],
  ['Drawers are available every day.', []],
  ['The Defence retake opens on 2026-11-03.', []],
  ['Finishing S1.L2 gives you a specimen.', []],
  ['Passing the check gives you the lab\'s verdict lines.', []],
  ["You can't open a drawer that doesn't exist yet.", []],
  ["You can't see the lab's verdict lines until the run ends.", []],
  ['The Clearinghouse\'s incidents arrive every Monday.', []],
  ['To continue the proof, apply the lemma.', []],
  ['Pass the bound to the solver to continue.', []],
  // a lock of another kind, a domain story, and SQL
  ['In LAB-8, the outbox worker uses FOR UPDATE SKIP LOCKED.', []],
  ['In this lesson each worker claims a job with SKIP LOCKED.', []],
  ['The lock in LAB-6 opens after the transaction commits.', []],
  ['In LAB-7 the vault unlocks after the second key.', []],
  ['The mutex status: locked.', []],
  ['Enter your PIN to unlock.', []],
  // an order of reading, a suggestion and the honest dependency
  ['You may want to finish S1.L2 before S1.L3, but you don\'t have to.', []],
  ['Finish the unit tests first, then run the lab.', []],
  ['Finish your first lab to get your first receipt.', []],
  ['In S1.L1, the solver\'s answer stays hidden until you make your call.', []],
])

// the corpora of fixtures/copy/ and the lock rule's vocabulary matrix (lib/corpus.mjs), which --self-check reads too
const copyCorpora = checkCopyCorpora(env)
for (const { file, rows, wrong } of copyCorpora.corpora) {
  const [, flags, clean] = CORPORA.find(([f]) => f === file)
  test(`the ${file} corpus: every F row raises ${flags.join(' or ')}, and no C row raises ${clean.join(', ')}`, () => {
    assert.ok(rows > (file === 'internal.txt' ? 50 : 100), `${file} has ${rows} rows`)
    assert.deepEqual(wrong, [])
  })
}

// The glossary's internal names are data the copy rule reads, so the internal corpus holds each form of each: taking a
// form out of content/glossary.yaml unflags a row that it alone made internal, and the self-check's corpus stage fails.
test('each form of each internal name, taken out of the glossary, unflags a must-flag row of the internal corpus', () => {
  const rows = corpusRows('internal.txt').filter((r) => r.mark === 'F')
  const internal = (text) => copyFindings(text, { glossary: env.glossary, unit: null, scanIds: env.scanIds }).some((f) => f.check === 'internal')
  const unpinned = []
  let forms = 0
  for (const x of env.glossary.internal) {
    const matcher = x.matcher
    for (const form of x.forms) {
      forms += 1
      // a name of one form taken out is the name gone (an empty list of forms is glossary/internal-forms, and has a plant)
      const rest = x.forms.filter((f) => f !== form)
      x.matcher = rest.length === 0 ? /(?!)/gu : compileForms(rest, x.caseSensitive)
      try {
        if (!rows.some((r) => !internal(r.text))) unpinned.push(`${x.name}: ${form}`)
      } finally {
        x.matcher = matcher
      }
    }
  }
  assert.ok(forms > 25, `${forms} forms`)
  assert.deepEqual(unpinned, [])
  // and each kind of ID the glossary calls internal: taking one out unflags a row too
  for (const kind of [...env.glossary.internalIds]) {
    env.glossary.internalIds.delete(kind)
    try {
      assert.ok(rows.some((r) => !internal(r.text)), kind)
    } finally {
      env.glossary.internalIds.add(kind)
    }
  }
})

test('a frame reads the thing as one token and reports the original words', () => {
  const word = (text) => findings(text).find((f) => f.check === 'lock')
  for (const [text, expected] of [
    ['First pass the Defence; then S2 opens.', 'pass the Defence; then S2 opens'],
    ['Solve the refund query to unlock the next two lessons.', 'unlock the next two lessons'],
    ["You can't open S1.L3 yet.", "can't open S1.L3 yet"],
    ['The next lesson will be available in 24 hours.', 'The next lesson will be available in 24 hours'],
    ['Your access to S2 begins after the Defence.', 'access to S2 begins'],
    ['Passing S1.L2 gives you S1.L3.', 'Passing S1.L2 gives you S1.L3'],
  ]) {
    const f = word(text)
    assert.equal(f.word, expected, text)
    assert.equal(text.slice(f.index, f.index + f.word.length), expected, text)
  }
  // a stage or lesson ID is a thing in exact case only, inside a frame as elsewhere
  assert.deepEqual(raised("You can't open s1 yet."), [])
  assert.deepEqual(raised("You can't open S1 yet."), ['lock'])
})

test('the lock rule stays small enough to compile once per run of the gate', () => {
  // the frames read tokens (T, TD, DEF) instead of inlining the thing: inlined, the patterns ran to 741,451 characters and
  // --self-check, which starts the gate once per plant, took about 36 seconds on the build machine, against 8.5 with tokens
  // (both with the 83 plants of that time)
  const total = LOCK_PHRASES.reduce((n, p) => n + p.re.source.length, 0)
  assert.ok(total < 150000, `the lock patterns hold ${total} characters`)
})

test('a stage or lesson ID names content in exact case only: s1 and s2 are sessions', () => {
  assert.deepEqual(raised('S1 stays locked until S0 is done.'), ['lock'])
  assert.deepEqual(raised('The row stays locked until s1 commits.'), [])
  assert.deepEqual(raised('Unlock s2 by letting s1 commit.'), [])
  // the other IDs have no lower-case use, and a word that names content counts in any case
  assert.deepEqual(raised('Fix the transfer to unlock lab-1.3.'), ['lock'])
  assert.deepEqual(raised('Fix the transfer to unlock the Lab.'), ['lock'])
})

// the repair run's first verification (lenses A and B): the markup around a thing, a schedule in the plainest words, the
// README's own vocabulary, "the next one", and a phrase that only one rule of the lock rule catches
table('lock copy (repair run): emphasis and a link around the thing are not words', [
  ["You can't open **S1.L3** yet.", ['lock']],
  ['*S1.L3* opens tomorrow.', ['lock']],
  ['Get every item right and **the next lesson** opens.', ['lock']],
  ['Only after the Defence can you open **S2**.', ['lock']],
  ['**This drawer** opens tomorrow.', ['lock']],
  ['Find a bug mathematically. **S2** starts after you pass the Defence.', ['lock']],
  ["When you are done, **S1.L3** opens tomorrow, and *you can't* open **S2** yet.", ['lock']],
  ['_S1.L3_ opens tomorrow.', ['lock']],
  ['__S2__ is still closed.', ['lock']],
  ['S2 opens **only** after the Defence.', ['lock']],
  ['You **must** pass the Defence to start S2.', ['lock']],
  ['Complete **S1.L2** first.', ['lock']],
  ['*Locked* until you finish S1.L2.', ['lock']],
  ["You can't open [D-03](/drawers/D-03) yet.", ['lock']],
  ['Pass this check to open [D-05](/drawers/D-05).', ['lock']],
  ['[D-05](/drawers/D-05) opens after S1.L3.', ['lock']],
  ["You can't open [S1.L3](/stages/S1/S1.L3) yet.", ['lock']],
  ['*[S1.L3](/stages/S1/S1.L3)* opens tomorrow.', ['lock']],
  // and stay clean where the words do
  ['Read **D-03** whenever you like.', []],
  ['[D-01](/drawers/D-01) says why a test is not a proof.', []],
  ['The *next lesson* builds on this one.', []],
  ['In my_lab_folder, the next_lesson file holds notes.', []],
])

table('pressure, rewards and internal names: emphasis is not a word there either', [
  ['**5 days** in a row!', ['pressure']],
  ["You're __behind__.", ['pressure']],
  ['Due **today**: 3 reviews.', ['pressure']],
  ['You reached **level 2**.', ['reward']],
  ['This is a _core lesson_.', ['internal']],
  ['The __pocket checker__ grades it.', ['internal']],
  ['Each _KC_ has items.', ['internal']],
])

test('underscore emphasis does not hide a term from Boot, and a drawer link\'s target is not a word of Boot\'s copy', () => {
  assert.deepEqual(raised('_Run_ the starter yourself.', { unit: BOOT, boot: true }), ['term'])
  assert.deepEqual(raised('[D-01](/drawers/D-01) says why a test is not a proof.', { unit: BOOT, boot: true }), [])
})

table('lock copy (repair run): a release on a schedule, in the plainest words', [
  ['S1.L3 opens Friday.', ['lock']],
  ['S1.L3 opens this Friday.', ['lock']],
  ['S1.L3 opens on November 3.', ['lock']],
  ['S1.L3 opens on 3 November.', ['lock']],
  ['S2 opens on November 3.', ['lock']],
  ['A new lesson opens every day.', ['lock']],
  ['A new lesson opens each day.', ['lock']],
  ['A new drawer opens each day.', ['lock']],
  ['A new lesson opens every 24 hours.', ['lock']],
  ['A new lesson opens every other day.', ['lock']],
  ['A new lesson opens twice a week.', ['lock']],
  ['New lessons are released every day.', ['lock']],
  ['New lessons appear every day.', ['lock']],
  ['New lessons open daily.', ['lock']],
  ['The next lesson opens the next day.', ['lock']],
  ['The next lesson opens the following day.', ['lock']],
  ['S1.L3 opens a day later.', ['lock']],
  ['S1.L3 is available from tomorrow.', ['lock']],
  ['S1.L3 is available starting Monday.', ['lock']],
  ['Next lesson: tomorrow.', ['lock']],
  ["You can't open S1.L3 until Monday.", ['lock']],
  // the README's own words for what opens: shows up, is opened, is yours, is waiting for you
  ['S1.L3 will be yours tomorrow.', ['lock']],
  ['The next lesson shows up tomorrow.', ['lock']],
  ['The next lesson is waiting for you tomorrow.', ['lock']],
  ['Your next lesson will be waiting for you tomorrow.', ['lock']],
  ['S1.L3 is opened tomorrow.', ['lock']],
  // what is open every day is the policy, and a schedule of something else is not a lock
  ['Today opens every day with a short set.', []],
  ['This lesson is open every day of the week.', []],
  ['Drawers are available every day.', []],
  ['The Defence retake opens on 2026-11-03.', []],
  ['The Clearinghouse opens its incidents every Monday.', []],
])

table('lock copy (repair run): "the next one" is a thing beside a frame, and nothing else', [
  ['Unlock the next one.', ['lock']],
  ['Pass this check to unlock the next one.', ['lock']],
  ['Complete this one to unlock the next one.', ['lock']],
  ['The next one opens tomorrow.', ['lock']],
  ["You can't open the next one yet.", ['lock']],
  ['Pick the next one in the list.', []],
  ['The first witness is minimal; the next one is not.', []],
  ['Try the next one if this witness does not replay.', []],
  ['Each hold is captured once; the next one waits for its own capture.', []],
  ['The first lock is held, and the next one opens after a timeout.', []],
])

table('lock copy (repair run): sentences that one phrase of the rule alone catches', [
  ['After S1.L2, S1.L3 opens.', ['lock']],
  ['After this lesson, S1.L3 opens.', ['lock']],
  ['S2 becomes available on sign-off.', ['lock']],
  ['This lesson becomes available 7 days after you enroll.', ['lock']],
  ["You can't open S1.L3 until Monday.", ['lock']],
])

table('a lock of another kind in a lab is lock copy when it waits on the learner, and not when it waits on the system', [
  ['The vault in this lab opens after you pass the Defence.', ['lock']],
  ['The account in this lab is locked until you pass.', ['lock']],
  ['The lock in LAB-6 opens after the transaction commits.', []],
  ['The lock in LAB-6 opens after your transaction commits.', []],
  ['The row in this lesson stays locked until the transaction commits.', []],
  ['The account in this lab is locked until the audit case ends.', []],
  ['The account in S1.L3 is locked until the transfer settles.', []],
])

test('every F row of the lock corpus that names an ID is still flagged with the ID bolded, in italics or as a link', () => {
  const ID_IN = /\b(?:S[1-9][0-9]*(?:\.L[0-9]+)?|LAB-[1-9][0-9]*(?:\.[1-9][0-9]*)?|D-[0-9]{2}|AUD-[1-9][0-9]*\.[1-9][0-9]*)\b/
  const lost = []
  let n = 0
  for (const line of fs.readFileSync(new URL('./fixtures/copy/lock.txt', import.meta.url), 'utf8').split('\n')) {
    if (!line.startsWith('F|')) continue
    const text = line.slice(2)
    const m = ID_IN.exec(text)
    if (m === null || /\[$/.test(text.slice(0, m.index))) continue
    const wrap = [(id) => `**${id}**`, (id) => `*${id}*`, (id) => `_${id}_`, (id) => `[${id}](/x/${id})`][n % 4]
    n += 1
    const marked = text.slice(0, m.index) + wrap(m[0]) + text.slice(m.index + m[0].length)
    if (!raised(marked).includes('lock')) lost.push(marked)
  }
  assert.ok(n > 300, `${n} rows name an ID`)
  assert.deepEqual(lost, [])
})

test('a finding reports the original words, the emphasis marks around them included, at their offset', () => {
  for (const [text, word] of [
    ['**S1.L3** opens tomorrow.', '**S1.L3** opens tomorrow'],
    ["You can't open [D-03](/drawers/D-03) yet.", "can't open [D-03](/drawers/D-03) yet"],
    ['You reached **level 2**.', 'reached **level 2**'],
  ]) {
    const [f] = findings(text)
    assert.equal(f.word, word, text)
    assert.equal(text.slice(f.index, f.index + f.word.length), word, text)
  }
})

test('a finding names the rule that raised it, and a lock finding every lock phrase that matched its sentence', () => {
  const [f] = findings('Finish the Defence to unlock the next lesson.')
  assert.equal(f.rule, 'lock/unlock')
  assert.deepEqual(f.rules, ['lock/unlock', 'lock/unlock-content', 'lock/do-to-open'])
  assert.deepEqual(findings('🔒 Locked').map((x) => [x.rule, x.rules]), [['lock/padlock', ['lock/padlock']]])
  assert.deepEqual(findings('Not started · Locked').map((x) => x.rule), ['lock/label'])
  assert.deepEqual(findings('You missed yesterday. Great job!').map((x) => x.rule), ['pressure/missed-days', 'reward/praise'])
  assert.deepEqual(findings('Your lane badge, KC-1.witness-class.').map((x) => x.rule), ['internal/lane', 'internal/id-kc'])
  const term = (place) => findings('A Goal Replay strip.', { unit: [1, 99], place })[0].rule
  assert.deepEqual(['drawer', 'stage', 'lab', 'placement'].map(term), ['term/drawer', 'term/stage', 'term/lab', 'term/placement'])
  assert.equal(findings('Your first claim.', { unit: [1, 1] })[0].rule, 'term/lesson')
  assert.equal(findings('Your first claim.', { unit: [1, 0], boot: true })[0].rule, 'term/boot')
})

test('a pattern\'s spaces read as runs of white space, outside its character classes, and a space before a quantifier stays one', () => {
  assert.equal(spaced('in a row'), String.raw`in\s+a\s+row`)
  assert.equal(spaced('a  b'), String.raw`a\s+b`)
  assert.equal(spaced('[ ,] x'), String.raw`[ ,]\s+x`)
  assert.equal(spaced(String.raw`a\ b`), String.raw`a\ b`)
  assert.equal(spaced('due ?:'), String.raw`due\s?:`)
  assert.equal(spaced('x{0,60}, y'), String.raw`x{0,60}\s*,\s+y`)
  const re = new RegExp(spaced(String.raw`\bdays? in a row\b`), 'i')
  assert.ok(re.test('5 days   in a\nrow'))
})

// No phrase is dead weight: each lock, pressure and reward phrase is the only phrase of its rule that flags some
// must-flag row of the corpora, so deleting it unflags that row (and the self-check's corpus stage fails), not only its plant.
test('every lock, pressure and reward phrase flags some must-flag row of the corpora alone', () => {
  const alone = new Set()
  for (const [file] of CORPORA) {
    for (const { mark, text } of corpusRows(file)) {
      if (mark !== 'F') continue
      const got = findings(text)
      const lock = got.filter((f) => f.check === 'lock').flatMap((f) => f.rules)
      const other = got.filter((f) => f.check === 'pressure' || f.check === 'reward').map((f) => f.rule)
      if (file === 'lock.txt' && lock.length === 1) alone.add(lock[0])
      if (file === 'pressure.txt' && other.length === 1) alone.add(other[0])
    }
  }
  const phrases = ['lock/padlock', 'lock/label', ...LOCK_PHRASES.map((p) => `lock/${p.name}`), ...PRESSURE_PHRASES.map((p) => `pressure/${p.name}`), ...REWARD_PHRASES.map((p) => `reward/${p.name}`)]
  assert.deepEqual(phrases.filter((r) => !alone.has(r)), [])
})

/** A pattern's alternatives at its top level: the parts between the `|`s outside every group and character class. */
function alternatives(source) {
  const out = []
  let depth = 0
  let inClass = false
  let start = 0
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i]
    if (c === '\\') i += 1
    else if (inClass) inClass = c !== ']'
    else if (c === '[') inClass = true
    else if (c === '(') depth += 1
    else if (c === ')') depth -= 1
    else if (c === '|' && depth === 0) {
      out.push(source.slice(start, i))
      start = i + 1
    }
  }
  return [...out, source.slice(start)]
}

// Nor is any part of a phrase dead weight: each alternative of each phrase flags some must-flag row that nothing else
// flags, so taking one alternative out of a phrase unflags a row and the self-check's corpus stage fails.
test('every alternative of every lock, pressure and reward phrase flags some must-flag row of the corpora alone', () => {
  assert.deepEqual(alternatives('a|(b|c)|[|]|d\\|e'), ['a', '(b|c)', '[|]', 'd\\|e'])
  const rows = []
  for (const [file, checks] of CORPORA) for (const { mark, text } of corpusRows(file)) if (mark === 'F') rows.push({ text, checks })
  const fired = (row) => findings(row.text).filter((f) => row.checks.includes(f.check)).flatMap((f) => f.rules ?? [f.rule])
  const sole = new Map()
  for (const row of rows) {
    const rules = [...new Set(fired(row))]
    if (rules.length === 1) sole.set(rules[0], [...(sole.get(rules[0]) ?? []), row])
  }
  const unpinned = []
  let count = 0
  for (const [check, list] of [['lock', LOCK_PHRASES], ['pressure', PRESSURE_PHRASES], ['reward', REWARD_PHRASES]]) {
    for (const p of list) {
      const parts = alternatives(p.re.source)
      if (parts.length < 2) continue
      const re = p.re
      for (let k = 0; k < parts.length; k += 1) {
        count += 1
        p.re = new RegExp(parts.filter((_, j) => j !== k).join('|'), re.flags)
        try {
          if (!(sole.get(`${check}/${p.name}`) ?? []).some((row) => fired(row).length === 0)) unpinned.push(`${check}/${p.name} #${k + 1}: ${parts[k].slice(0, 100)}`)
        } finally {
          p.re = re
        }
      }
    }
  }
  assert.ok(count > 100, `${count} alternatives`)
  assert.deepEqual(unpinned, [])
})

// The vocabulary of README section 3.4, every word slotted into each frame that has its slot, and every thing into one
// sentence of each kind of frame: the README says a frame reads any word of the vocabulary in each of its slots, and this
// holds it to that. The one exception is the policy: what is open, available or ready "daily" is open every day.
test(`every word of the README's vocabulary reaches every frame that has its slot, and every thing each kind of frame (${copyCorpora.matrix.sentences.toLocaleString('en-US')} sentences)`, () => {
  const { sentences, policy, missed } = copyCorpora.matrix
  assert.ok(sentences > 5000, `${sentences}`)
  assert.ok(policy > 0 && policy < 100, `${policy}`)
  assert.deepEqual(missed, [])
  // and the policy itself is left alone
  assert.deepEqual(raised('S1.L3 is available daily.'), [])
  assert.deepEqual(raised('This lesson is open every day of the week.'), [])
})

// ------------------------------------------------------------------ counters, loss framing, deadlines, rewards

table('counters, loss framing and deadlines are flagged', [
  ['Keep your streak alive.', ['pressure']],
  ['Your next set is overdue.', ['pressure']],
  ["You're behind schedule.", ['pressure']],
  ['You are behind.', ['pressure']],
  ['You missed 3 days.', ['pressure']],
  ["You've missed two sessions this week.", ['pressure']],
  ['Four days in a row.', ['pressure']],
  ["Don't break your streak.", ['pressure']],
  ['Due today: a technical note.', ['pressure']],
  ['Set a deadline for finishing S1.', ['pressure']],
  ['Meet your deadline for S1.', ['pressure']],
  ['Never break your streak!', ['pressure']],
  // close variants of the same (a verifier's round 2), and their neighbours
  ['You are 2 days behind.', ['pressure']],
  ['You missed yesterday.', ['pressure']],
  ['This set is due Friday.', ['pressure']],
  ['Due: Friday', ['pressure']],
  ['Finish by Sunday.', ['pressure']],
  ['You have 3 days left to finish this set.', ['pressure']],
  ['Come back tomorrow or lose your progress.', ['pressure']],
  ['You will lose your progress if you skip today.', ['pressure']],
  ["You're falling behind.", ['pressure']],
  ['Falling behind? Here is a short set.', ['pressure']],
  ['You keep falling behind.', ['pressure']],
  ['Are you falling behind on reviews?', ['pressure']],
  ['Worried about falling behind?', ['pressure']],
  ["Don't fall behind.", ['pressure']],
  ['3 missed days.', ['pressure']],
  ['Due in 2 days: a technical note.', ['pressure']],
  ['This set is due next week.', ['pressure']],
  ['Submit by the end of the week.', ['pressure']],
  ['Only 2 days remain in this window.', ['pressure']],
  ["You've got 2 days to go.", ['pressure']],
  ['Your progress will be lost if you skip a week.', ['pressure']],
  ['Three weeks in a row.', ['pressure']],
  ['Your 5-day run ends tonight.', ['pressure']],
  ['Practice daily to keep your chain going.', ['pressure']],
])

table('a call that missed, a policy in the negative and a deadline in the other sense are not flagged', [
  ['Your call missed.', []],
  ['You missed the premise: it needs a witness.', []],
  ['No streaks, no deadlines.', []],
  ['Nothing is ever overdue, and there is never an overdue count.', []],
  ['We keep no streak and set no deadline.', []],
  ['The RPC deadline is 30 seconds from the request.', []],
  ['A bounded-response property ("before the deadline") is a liveness property.', []],
  ['The job must meet the deadline of the lease.', []],
  ['A lease expires when its timer fires.', []],
  ['Welcome back. Here is a short set to pick up where you were.', []],
  ['Met in 9 of the last 12 weeks.', []],
  // a system that falls behind, loses progress or has time left; "due to" is plain English
  ['Due to the encoding, the claim fails.', []],
  ['A replica falling behind the leader is a liveness failure.', []],
  ['The follower is 3 entries behind the leader.', []],
  ['The worker can crash and lose progress before it commits.', []],
  ['The lease expires at midnight in this model.', []],
  ['The lease has 2 hours remaining.', []],
  ["The token is valid for only 2 hours in the lab's model.", []],
  ['Complete the proof by induction.', []],
  ['A technical note fits here.', []],
])

table('XP and praise for a click are flagged', [
  ['You earned 50 XP.', ['reward']],
  ['Great job!', ['reward']],
  ['Well done, nice work.', ['reward']],
  ['You leveled up!', ['reward']],
])

table('a level in the other sense is not a reward', [
  ['This is S6\'s unchecked rowcount one level up.', []],
  ['Isolation levels differ in PostgreSQL.', []],
])

// the counters, overdue marks and deadlines a verifier planted in round 3, and their neighbours
table('counters (round 3): days away, overdue marks and counts, deadlines on a day', [
  ["You haven't practised in 4 days.", ['pressure']],
  ["It's been 5 days since your last session.", ['pressure']],
  ['You skipped 3 sessions this week.', ['pressure']],
  ["You're 2 sessions short this week.", ['pressure']],
  ['This review is past due.', ['pressure']],
  ['Your set is late.', ['pressure']],
  ['You have 14 reviews waiting.', ['pressure']],
  ['Your backlog: 23 cards.', ['pressure']],
  ['Finish this set before the deadline on Friday.', ['pressure']],
  ['Submit LAB-1 before Sunday night.', ['pressure']],
  ["Last chance: this week's set closes tonight.", ['pressure']],
  // loss framing by another name
  ['Your rhythm is broken.', ['pressure']],
  ["Don't miss tomorrow's session.", ['pressure']],
  ['Come back daily to keep your progress.', ['pressure']],
  ['Practise every day or you will forget.', ['pressure']],
  ['🔥 5', ['pressure']],
])

table('counters (round 3): a system\'s time, a replica, a lease and an aside stay clean', [
  ["If you haven't used Lean in a few weeks, D-07 is a refresher.", []],
  ['A replica falling behind the leader is a liveness failure.', []],
  ['The lease has 2 hours remaining.', []],
  ['Due to the encoding, the claim fails.', []],
  ['The lease expires at midnight in this model.', []],
  ['The timer fires before the deadline on every path.', []],
  ['The queue holds 14 messages waiting for a consumer.', []],
  ['The last chance the scheduler gets is the final tick.', []],
  ['Write it down, or you will forget which input failed.', []],
  ['There is no hurry: the lesson waits for you.', []],
])

table('rewards: points, badges, levels, rankings and praise on its own', [
  ['+50 points.', ['reward']],
  ['You earned 20 points for that call.', ['reward']],
  ['You earned a badge.', ['reward']],
  ['New badge unlocked.', ['reward']],
  ['You reached level 2.', ['reward']],
  ['You are now a Level 2 Solver.', ['reward']],
  ['Level up!', ['reward']],
  ['Awesome!', ['reward']],
  ['Nice one!', ['reward']],
  ["You're on fire!", ['reward']],
  ['Nailed it!', ['reward']],
  ["You're in the top 10% of learners.", ['reward']],
  ["Leaderboard: you're #3 this week.", ['reward']],
])

table('rewards: a badge, a level, points and a leaderboard in the other sense stay clean', [
  ['The badge shows where the check ran.', []],
  ['Your result carries a badge that says where it ran.', []],
  ['The checker reached level 3 of the hierarchy.', []],
  ['With one generator, later test-takers gained 13 points from earlier ones.', []],
  ['The interval runs from −5 to +43 points.', []],
  ['Perfect secrecy needs a key as long as the message.', []],
  ['The PutnamBench leaderboard moves; it is cited as a dated reading.', []],
])

// ------------------------------------------------------------------ internal names

test('every internal name of the spine is flagged, with what learners see instead', () => {
  const names = {
    'The lane badge.': 'lane',
    'The Shelf of side material.': 'Shelf',
    'The docket for the week.': 'docket',
    'A pocket checker runs offline.': 'pocket checker',
    'The telescope shows a minimap.': 'telescope',
    'The Hall of Records.': 'Hall of Records',
    'A proof debt is parked.': 'proof debt',
    'Judgment is the audit measure.': 'Judgment',
    // the same names with a hyphen in place of a space
    'The pocket-checker agrees.': 'pocket checker',
    'Your proof-debt grows.': 'proof debt',
    'See the Hall-of-Records.': 'Hall of Records',
  }
  for (const [text, name] of Object.entries(names)) {
    const [f, ...rest] = findings(text)
    assert.equal(rest.length, 0, text)
    assert.equal(f.check, 'internal', text)
    assert.match(f.detail, new RegExp(`internal name \\(${name}\\); learners see`), text)
  }
})

test('an internal name of several words is the same name with a non-breaking hyphen, a spaced hyphen or a line break, and tier names with a hyphen are tier names', () => {
  const names = {
    'The pocket\u2011checker agrees.': 'pocket checker',
    'The proof\u2010debt grows.': 'proof debt',
    'A pocket - checker.': 'pocket checker',
    'The Hall of\nRecords.': 'Hall of Records',
    'The core-lesson format.': 'tier',
    'A bridge-lesson tier.': 'tier',
    'A knowledge-component list.': 'knowledge component',
  }
  for (const [text, name] of Object.entries(names)) {
    const [f, ...rest] = findings(text)
    assert.equal(rest.length, 0, text)
    assert.equal(f.check, 'internal', text)
    assert.match(f.detail, new RegExp(`internal name \\(${name}\\); learners see`), text)
  }
  // a comma or a dash that is punctuation is not a hyphen between the words
  assert.deepEqual(raised('A pocket, checker; a proof\u2014debt; the hall of the records.'), [])
})

test('the tier names and KC are internal, and plain words of the same spelling are not', () => {
  assert.deepEqual(raised('Boot asks one question.'), ['internal'])
  assert.deepEqual(raised('In Boot the solver finds a transfer.'), ['internal'])
  assert.deepEqual(raised('Back in Boot you called it.'), ['internal'])
  assert.deepEqual(raised("Boot's tests passed."), ['internal'])
  // the verb, where the capital is the sentence's and an object follows
  assert.deepEqual(raised('Boot up the VM.'), [])
  assert.deepEqual(raised('Boot the machine, then run the lab.'), [])
  assert.deepEqual(raised('- Boot the replica from its snapshot.'), [])
  assert.deepEqual(raised('A core lesson and a bridge lesson.'), ['internal'])
  assert.deepEqual(raised('The [core] and [bridge] tags.'), ['internal'])
  assert.deepEqual(raised('Each KC has a prequestion.'), ['internal'])
  assert.deepEqual(raised('A knowledge component is taught once.'), ['internal'])
  assert.deepEqual(raised('Use your judgment; reboot the bridge; a core idea; a shelf; a docketing system.'), [])
  assert.deepEqual(raised('Start here, then a full lesson and a short lesson with reading.'), [])
})

test('an ID of the course\'s machinery in copy is internal; an ID a learner works with is not', () => {
  assert.deepEqual(raised('GATE-numbers and M-call-it and GEN-call-it and INS-z3 and SCR-today and OD-14 and V2-05 and W1-T38 and dp:G4.'), ['internal'])
  assert.equal(findings('GATE-numbers and M-call-it and GEN-call-it and INS-z3 and SCR-today and OD-14 and V2-05 and W1-T38 and dp:G4.').length, 9)
  assert.deepEqual(raised('S1.L3, LAB-1.2, D-03, SP-1.1, CL-1.1, SEAM-1, AUD-1.1 and RUN-z3-starter are IDs.'), [])
  // a knowledge component's ID is machinery too: learners see the idea in words (curriculum/D-drawers.md section 1.6)
  const [kc, ...rest] = findings('This item is tagged KC-1.witness-class.')
  assert.equal(rest.length, 0)
  assert.equal(kc.check, 'internal')
  assert.equal(kc.word, 'KC-1.witness-class')
  assert.match(kc.detail, /KC-1\.witness-class is an ID of the course's machinery \(kc\)/)
  assert.deepEqual(raised('S1.L3 teaches KC-1.violation-as-sat.'), ['internal'])
  // W1, W2 and I1 name steps and invariants inside the course's own examples
  assert.deepEqual(raised('Workers R1, R2, W1 and W2 each take a step; I1 holds.'), [])
})

test('code, link targets, references and tags are not copy', () => {
  assert.deepEqual(raised('The `lane` flag, a `GATE-numbers` ID and `Judgment` in code.'), [])
  assert.deepEqual(raised('See [the guide](https://example.org/lane) and https://example.org/docket.'), [])
  assert.deepEqual(raised('A result {{run:RUN-z3-starter}} [X RUN-z3-starter] [V] [D] [U] [KS].'), [])
  assert.deepEqual(raised('Before\n\n```python\nlane = unlock()\n```\n\nAfter.'), [])
})

test('a labeled cross-reference to the design documents may name one internal term, repeated in the sentence', () => {
  assert.deepEqual(raised('The design notes call the first path Lane A and the second Lane B.'), [])
  assert.deepEqual(raised('The design notes call these three the Bench\'s setup lanes; the interface says "ways to set up".'), [])
  assert.deepEqual(raised('See docs/DESIGN.md for the old name, docket.'), [])
  assert.deepEqual(raised('The design notes call these lanes and the docket.'), ['internal'])
  // an ID of the course's machinery is an internal name too: such a sentence names one internal thing, a term or an ID
  assert.deepEqual(raised('See docs/ARCHITECTURE.md, GATE-lessons.'), [])
  assert.deepEqual(raised('The design notes name it GATE-lessons; GATE-lessons is its ID.'), [])
  assert.deepEqual(raised('The design notes say GATE-numbers, M-call-it and INS-z3 handle it.'), ['internal'])
  assert.deepEqual(raised('The design notes call this lane (M-call-it, GATE-lessons and OD-14 say why).'), ['internal'])
  assert.match(findings('The design notes say GATE-numbers, M-call-it and INS-z3 handle it.')[0].detail, /names one internal term; this one names GATE-numbers and M-call-it and INS-z3/)
  assert.deepEqual(raised('GATE-lessons says why.'), ['internal'])
  assert.deepEqual(raised('The lane badge. The design notes call it a lane.'), ['internal'])
  assert.deepEqual(raised('Lane A is the first path.'), ['internal'])
})

// ------------------------------------------------------------------ glossary terms and where they may appear

test('Boot\'s copy uses terms 1 to 5 only', () => {
  const boot = { unit: BOOT, boot: true }
  assert.deepEqual(raised('Today you make a call. The stamp says what a check established; the specimen is kept in a Keep block.', boot), [])
  for (const text of [
    'The run is recorded.',
    'Open the Bench.',
    'Your lab starts next.',
    'A receipt comes back.',
    'Your claim has six fields.',
    'A seam is planted.',
    'A drawer holds side material.',
    'The Audit Desk and the Defence and the Mirror.',
    'A re-find in seven days. The Prove-it step. A twin.',
    'You are signed off once the case is settled.',
    'Goal Replay, a parked goal, an erosion, the Clearinghouse, the Derivation Board and the Theater.',
  ]) assert.deepEqual(raised(text, boot), ['term'], text)
  const [f] = findings('Open the Bench.', boot)
  assert.match(f.detail, /Boot's copy uses terms 1 to 5 only, and "Bench" is term 12, Bench, introduced at S1 \(LAB-1\)/)
})

test('a glossary term of two words is the same term with a hyphen, in Boot and elsewhere', () => {
  const boot = { unit: BOOT, boot: true }
  for (const text of ['A Goal-Replay strip.', 'The Audit-Desk.', 'A parked-goal.', 'The Derivation-Board.']) assert.deepEqual(raised(text, boot), ['term'], text)
  // Keep block is term 5, a Boot term: hyphenated or not
  assert.deepEqual(raised('A Keep-block holds Today.', boot), [])
})

test('a term the spine introduces at a lesson is allowed from that lesson, and a term it introduces at a stage from the stage\'s first lesson', () => {
  const at = (id, text) => raised(text, { unit: lessonPosition(id) })
  assert.deepEqual(at('S1.L1', 'A run, a drawer and a lab.'), [])
  assert.deepEqual(at('S1.L1', 'Your claim.'), ['term'])
  assert.deepEqual(at('S1.L2', 'A seam.'), ['term'])
  assert.deepEqual(at('S1.L3', 'Your claim and a seam.'), [])
  assert.deepEqual(at('S1.L5', 'The Mirror, the Defence, the Audit Desk, a twin, the Bench and a receipt.'), [])
  assert.deepEqual(at('S1.L5', 'Goal Replay.'), ['term'])
  assert.deepEqual(at('S2.L0', 'Goal Replay and a parked goal.'), [])
  assert.deepEqual(at('S2.L10', 'An erosion.'), ['term'])
  assert.deepEqual(at('S3.L1', 'An erosion.'), [])
  assert.deepEqual(at('S3.L8', 'The Clearinghouse.'), ['term'])
  assert.deepEqual(at('S3.L9', 'The Clearinghouse.'), [])
  assert.deepEqual(at('S4.L1', 'The Derivation Board.'), [])
  assert.deepEqual(at('S4.L9', 'The Theater.'), ['term'])
  assert.deepEqual(at('S5.L1', 'The Theater.'), [])
})

test('a stage page, a lab page and a drawer sit at the end of their stage', () => {
  assert.deepEqual(raised('Your claim, the Defence, the Audit Desk and a seam.', { unit: stageEnd(1) }), [])
  assert.deepEqual(raised('Goal Replay.', { unit: stageEnd(1) }), ['term'])
  assert.deepEqual(raised('Goal Replay.', { unit: stageEnd(2) }), [])
  assert.deepEqual(raised('The Clearinghouse.', { unit: stageEnd(3) }), [])
})

test('copy with no place in the course order is not held to the first-use rule', () => {
  assert.deepEqual(raised('Goal Replay, the Theater, the Clearinghouse and a parked goal.'), [])
})

test('an ID is not a use of the word it contains', () => {
  assert.deepEqual(raised('SEAM-1, RUN-z3-starter, LAB-1.1, CL-1.1, M-re-find and KC-2.theorem-statement-reading.', { unit: BOOT, boot: true }).filter((c) => c === 'term'), [])
})

test('"check" is plain English in Boot, and the words the spine reserves are matched whole', () => {
  assert.deepEqual(raised('Check with Z3. Then check the result. A runway; a rerun is a run again.', { unit: BOOT, boot: true }), ['term'])
  assert.deepEqual(raised('A runway, a crunch and a labyrinth.', { unit: BOOT, boot: true }), [])
  assert.deepEqual(raised('The bench press and the mirror on the wall.', { unit: BOOT, boot: true }), [])
})

test('Boot says "study blocks" and "recorded result" until the terms arrive: the finding says so', () => {
  const run = findings('The run is recorded.', { unit: BOOT, boot: true })
  assert.equal(run.length, 1)
  assert.match(run[0].detail, /term 6, run, introduced at S1.L1; until then, say "result", and label the cold-start fallback "recorded result"/)
  const bench = findings('Open the Bench.', { unit: BOOT, boot: true })
  assert.match(bench[0].detail, /term 12, Bench, introduced at S1 \(LAB-1\); until then, say "study blocks"/)
  // a term the spine gives no stand-in for says only where it is introduced
  assert.doesNotMatch(findings('A seam.', { unit: BOOT, boot: true })[0].detail, /until then/)
})

test('a finding carries the word it matched and an offset into the original string', () => {
  const text = 'Open `x` and the [Bench](https://example.org) now.'
  const [f] = findings(text, { unit: BOOT, boot: true })
  assert.equal(f.word, 'Bench')
  assert.equal(text.slice(f.index, f.index + f.word.length), 'Bench')
})

// --self-check reads the corpora and not these tables, so the corpora hold every sentence the tables hold: a must-flag row
// for each sentence a table expects lock, pressure, reward or an internal name on, and a must-not-flag row for each
// sentence it expects clean (one it expects a term on is not the corpora's: a term depends on where the copy sits).
test('every sentence of the tables above is a row of the corpora, with the mark the table expects', () => {
  const norm = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '')
  const marks = new Map()
  for (const [file] of CORPORA) for (const { mark, text } of corpusRows(file)) marks.set(`${file}|${norm(text)}`, mark)
  const markIn = (file, text) => marks.get(`${file}|${norm(text)}`)
  const missing = []
  for (const { table: name, text, expected } of TABLE_ROWS) {
    const lock = expected.includes('lock')
    const counter = expected.includes('pressure') || expected.includes('reward')
    if (lock && markIn('lock.txt', text) !== 'F') missing.push(`F lock.txt: ${text}`)
    if (counter && markIn('pressure.txt', text) !== 'F') missing.push(`F pressure.txt: ${text}`)
    if (expected.includes('internal') && markIn('internal.txt', text) !== 'F') missing.push(`F internal.txt: ${text}`)
    if (expected.length === 0 && markIn('lock.txt', text) !== 'C' && markIn('pressure.txt', text) !== 'C') missing.push(`C ${/lock/.test(name) ? 'lock.txt' : 'pressure.txt'}: ${text}`)
  }
  assert.ok(TABLE_ROWS.length > 300, `${TABLE_ROWS.length}`)
  assert.deepEqual(missing, [])
})

