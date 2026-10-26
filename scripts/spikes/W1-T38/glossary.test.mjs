import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { END, checkGlossary, comparePositions, compileForms, lessonPosition, parseSpineGlossary, plain, shapeGlossary, stageEnd } from './lib/glossary.mjs'
import { REPO, envFor } from './helpers.mjs'

const glossaryText = fs.readFileSync(path.join(REPO, 'content/glossary.yaml'), 'utf8')
const spineText = fs.readFileSync(path.join(REPO, 'docs/spine/SPINE.md'), 'utf8')

async function check(change = (v) => v) {
  const { env } = await envFor()
  const value = change(structuredClone(env.content.readYaml(glossaryText).value))
  const shaped = shapeGlossary(value)
  assert.notEqual(shaped.glossary, null, JSON.stringify(shaped.problems))
  return {
    shape: shaped.problems,
    problems: checkGlossary(shaped.glossary, {
      spineRows: parseSpineGlossary(spineText),
      hasLesson: (id) => env.index.has('lesson', id),
      kindNames: ['kc', 'gate', 'mechanic', 'generator', 'instrument', 'screen', 'task', 'wave', 'owner-decision', 'brief-change', 'invariant', 'misconception', 'run', 'lesson'],
    }),
  }
}

test('the repository\'s glossary is valid data, is the spine\'s, and reads the same under YAML 1.1 and 1.2', async () => {
  const { env, findings } = await envFor(REPO)
  assert.deepEqual(findings, [])
  const read = env.content.readYaml(glossaryText, { pyyaml: true })
  assert.deepEqual(read.problems, [])
  const { shape, problems } = await check()
  assert.deepEqual([shape, problems], [[], []])
})

test('there are 25 terms in the spine\'s order, and Boot introduces terms 1 to 5 only', async () => {
  const { env } = await envFor(REPO)
  const { terms } = env.glossary
  assert.equal(terms.length, 25)
  assert.deepEqual(terms.map((t) => t.n), Array.from({ length: 25 }, (_, i) => i + 1))
  assert.deepEqual(terms.filter((t) => t.from === 'S1.L0').map((t) => t.n), [1, 2, 3, 4, 5])
  for (const t of terms) assert.ok(env.index.has('lesson', t.from), `${t.term}: ${t.from}`)
})

test('the file agrees with the spine\'s table, term for term and column for column', () => {
  const rows = parseSpineGlossary(spineText)
  assert.equal(rows.length, 25)
  assert.deepEqual(rows[4], { n: 5, term: 'Keep block', introduced: 'Boot (Set your week)' })
  assert.deepEqual(rows[6], { n: 7, term: 'lab · check', introduced: 'S1 (LAB-1)' })
  assert.deepEqual(rows[22], { n: 23, term: 'Clearinghouse', introduced: 'S3, after LAB-3' })
})

test('a table that is not there is null, and plain removes emphasis', () => {
  assert.equal(parseSpineGlossary('# nothing here\n'), null)
  assert.equal(plain('Boot (*Set your week*)'), 'Boot (Set your week)')
})

test('lesson positions run in the course\'s order, and the end of a stage is after its last lesson', () => {
  assert.deepEqual(lessonPosition('S1.L0'), [1, 0])
  assert.deepEqual(lessonPosition('S10.L3'), [10, 3])
  assert.equal(lessonPosition('S1'), null)
  assert.equal(lessonPosition('LAB-1'), null)
  const order = ['S1.L0', 'S1.L1', 'S1.L5', 'S2.L0', 'S2.L10', 'S3.L1', 'S10.L1'].map(lessonPosition)
  for (let i = 1; i < order.length; i += 1) assert.ok(comparePositions(order[i - 1], order[i]) < 0)
  assert.ok(comparePositions(stageEnd(1), lessonPosition('S1.L5')) > 0)
  assert.ok(comparePositions(stageEnd(1), lessonPosition('S2.L0')) < 0)
  assert.equal(comparePositions(stageEnd(2), stageEnd(2)), 0)
  assert.equal(stageEnd(4)[1], END)
})

test('forms match whole words, by case when asked, and a space matches any run of spaces and hyphens', () => {
  const ci = compileForms(['claim', 'claims', 'Audit Desk'], false)
  const hits = (re, text) => [...text.matchAll(re)].map((m) => m[0])
  assert.deepEqual(hits(ci, 'A Claim, two claims and the audit   desk; reclaim and claimed do not match'), ['Claim', 'claims', 'audit   desk'])
  // a hyphen, a non-breaking hyphen or the Unicode hyphen stands for a space; a comma, a dash or a letter does not
  assert.deepEqual(hits(ci, 'the Audit-Desk, the audit\u2011desk, the audit\u2010desk and the audit - desk'), ['Audit-Desk', 'audit\u2011desk', 'audit\u2010desk', 'audit - desk'])
  assert.deepEqual(hits(ci, 'the audit,desk, the audit\u2014desk, the auditdesk and the audit--desk'), ['audit--desk'])
  const cs = compileForms(['Bench'], true)
  assert.deepEqual(hits(cs, 'On the Bench, not on a bench or a Benchmark'), ['Bench'])
  const hyphen = compileForms(['re-find', 'signed off'], false)
  assert.deepEqual(hits(hyphen, 'a re-find, and it was signed off, not refind'), ['re-find', 'signed off'])
  assert.deepEqual(hits(compileForms(['run'], false), 'run, re-run, runtime and RUN-z3'), ['run', 'run', 'RUN'])
  assert.deepEqual(hits(compileForms(['[core]'], false), 'a [core] lesson'), ['[core]'])
})

test('a glossary of the wrong shape is reported where it is wrong', () => {
  assert.equal(shapeGlossary(null).glossary, null)
  assert.equal(shapeGlossary([]).glossary, null)
  const { problems } = shapeGlossary({ format: 'glossary/2', terms: [{ n: 'x', term: '', meaning: 1, introduced: null, from: 'S1', forms: [] }], internal: [{ name: 'x', forms: ['x'] }], internalIds: [] })
  const where = problems.map((p) => p.pointer)
  for (const w of ['/format', '/terms/0/n', '/terms/0/term', '/terms/0/meaning', '/terms/0/introduced', '/terms/0/from', '/terms/0/forms', '/internal/0/say', '/internal/0/source', '/internalIds']) assert.ok(where.includes(w), `${w} in ${where.join(' ')}`)
})

test('the glossary is checked against the spine and against itself', async () => {
  const said = async (change) => (await check(change)).problems.map((p) => p.message).join(' | ')
  assert.match(await said((v) => (v.terms.pop(), v)), /has 24/)
  assert.match(await said((v) => ((v.terms[3].n = 9), v)), /run 1 to 25 in the spine's order/)
  assert.match(await said((v) => ((v.terms[11].term = 'Workbench'), v)), /spine's term 12 is "Bench"; this file says "Workbench"/)
  assert.match(await said((v) => ((v.terms[8].introduced = 'S1.L2'), v)), /spine introduces claim at "S1.L3"/)
  assert.match(await said((v) => ((v.terms[8].introduced = 'S1.L2'), (v.terms[8].from = 'S1.L2'), v)), /spine introduces claim at "S1.L3"/)
  assert.match(await said((v) => ((v.terms[8].from = 'S1.L2'), v)), /introduced at S1.L3, so its copy starts there, not at S1.L2/)
  assert.match(await said((v) => ((v.terms[19].from = 'S3.L1'), v)), /introduced in stage S2/)
  assert.match(await said((v) => ((v.terms[1].from = 'S1.L1'), v)), /terms 1 to 5 are Boot's/)
  assert.match(await said((v) => ((v.terms[5].from = 'S1.L0'), v)), /Boot introduces at most 5 terms/)
  assert.match(await said((v) => ((v.terms[5].from = 'S1.L0'), v)), /term 6 and starts at S1.L0/)
  assert.match(await said((v) => ((v.terms[0].from = 'S9.L9'), v)), /terms 1 to 5 are Boot's/)
  assert.match(await said((v) => ((v.terms[0].from = 'S1.L7'), v)), /not a lesson of the spine's registry/)
  assert.match(await said((v) => (v.terms[1].term = 'call', v)), /listed twice/)
  assert.match(await said((v) => (v.internal[0].forms.push('drawer'), v)), /"drawer" is a form of both drawer and lane/)
  assert.match(await said((v) => (v.internalIds.push('nonsense'), v)), /nonsense is not a kind of ID/)
})
