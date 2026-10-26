import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { LOCK_PHRASES, PRESSURE_PHRASES, REWARD_PHRASES } from './lib/copy.mjs'
import { CORPORA, VOCABULARY, corpusRows, frameSentences, isPolicy, matrixSentences } from './lib/corpus.mjs'
import { FIXED, allRules, copyRules } from './lib/rules.mjs'
import { PLANTS, REPO, envFor } from './helpers.mjs'

// The README says what the gate holds, and these hold the README to it: its vocabulary lists are the matrix's, word for
// word; the copy it quotes as flagged or as fine is a row of the corpora that --self-check reads, with that mark; and the
// numbers it gives are the modules' own.

const { env } = await envFor()
const README = fs.readFileSync(path.join(REPO, 'scripts', 'spikes', 'W1-T38', 'README.md'), 'utf8')
const between = (from, to) => {
  const a = README.indexOf(from)
  assert.ok(a >= 0, `the README has no ${from}`)
  const b = README.indexOf(to, a)
  assert.ok(b > a, `the README has no ${to} after ${from}`)
  return README.slice(a, b)
}
const SECTION_34 = between('### 3.4 The lock rule in detail', '## 4. content/glossary.yaml')
const quotes = (text) => [...text.matchAll(/"([^"]+)"/g)].map((m) => m[1])
/** A row's words for a match: case, runs of space and the end's full stop or mark set aside. */
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '')
const marks = new Map()
for (const [file] of CORPORA) for (const { mark, text } of corpusRows(file)) marks.set(`${file}|${norm(text)}`, mark)
/** The quotes that are not rows of the corpus file with one of the marks. */
const notRows = (file, list, allowed) => list.filter((q) => !allowed.includes(marks.get(`${file}|${norm(q)}`)))

test('the README\'s vocabulary lists are VOCABULARY\'s, word for word and in order', () => {
  const item = (key, entry) => (key === 'progress' ? (entry[3] === undefined ? entry[0] : `${entry[0]} … ${entry[3]}`) : entry)
  for (const key of Object.keys(VOCABULARY)) {
    const at = SECTION_34.indexOf(`(\`${key}\`): `)
    assert.ok(at >= 0, `README section 3.4 has no list (\`${key}\`)`)
    assert.equal(SECTION_34.indexOf(`(\`${key}\`): `, at + 1), -1, `README section 3.4 has two lists (\`${key}\`)`)
    const rest = SECTION_34.slice(at + key.length + 6)
    const list = rest.slice(0, rest.search(/\.(?=\s|$)/)).split(/,\s+(?:and\s+|or\s+)?|\s+and\s+|\s+or\s+/)
    assert.deepEqual(list, VOCABULARY[key].map((e) => item(key, e)), key)
  }
})

test('the copy README section 3.3 quotes as counters and rewards is a must-flag row of the pressure corpus, and what it calls fine a must-not-flag row', () => {
  for (const check of ['pressure', 'reward']) {
    const row = README.split('\n').find((l) => l.startsWith(`| \`${check}\` |`))
    assert.ok(row !== undefined && row.includes('Fine'), check)
    const [flagged, fine] = [row.slice(0, row.indexOf('Fine')), row.slice(row.indexOf('Fine'))]
    assert.ok(quotes(flagged).length > 15 && quotes(fine).length > 0, check)
    assert.deepEqual(notRows('pressure.txt', quotes(flagged), ['F']), [], `${check}: flagged`)
    assert.deepEqual(notRows('pressure.txt', quotes(fine), ['C']), [], `${check}: fine`)
  }
})

test('every internal name and every example README section 3.3 gives of one is held by the internal corpus: flagged, or fine where the README says so', () => {
  const rows = README.split('\n').filter((l) => l.startsWith('| `internal` |')).map((l) => l.slice('| `internal` |'.length))
  assert.equal(rows.length, 2)
  const internal = corpusRows('internal.txt')
  const flaggedIn = (e) => internal.some((r) => r.mark === 'F' && r.text.includes(e))
  // the names the first row lists, each a name of the glossary and a word of a must-flag row
  const names = rows[0].slice(0, rows[0].indexOf(' (spine section 0)')).trim().split(/,\s+|\s+and\s+/)
  assert.deepEqual(names, ['lane', 'Shelf', 'docket', 'pocket checker', 'telescope', 'Hall of Records', 'proof debt', 'Judgment'])
  for (const name of names) assert.ok(env.glossary.internal.some((x) => x.name === name) && flaggedIn(name), name)
  // the examples, quoted or in code: the README calls the verb and a cross-reference that names one internal term fine
  const examples = rows.flatMap((r) => [...r.matchAll(/"([^"]+)"|`([^`]+)`/g)].map((m) => m[1] ?? m[2]))
  assert.ok(examples.length > 15, `${examples.length}`)
  const FINE = ['Boot the machine', 'Boot up the VM', 'The design notes call the first path Lane A and the second Lane B']
  const missing = []
  for (const e of examples) {
    if (FINE.includes(e)) {
      if (marks.get(`internal.txt|${norm(e)}`) !== 'C') missing.push(`C ${e}`)
    } else if (!flaggedIn(e)) missing.push(`F ${e}`)
  }
  assert.deepEqual(missing, [])
})

test('every quote of README section 3.4\'s table of frames is a must-flag row of the lock corpus, and every quote of "Not lock copy" a must-not-flag or unjudged row', () => {
  const table = SECTION_34.split('\n').filter((l) => l.startsWith('| **'))
  assert.ok(table.length >= 12)
  const flagged = table.flatMap(quotes)
  assert.ok(flagged.length > 90, `${flagged.length}`)
  assert.deepEqual(notRows('lock.txt', flagged, ['F']), [])
  const clean = quotes(SECTION_34.slice(SECTION_34.indexOf('**Not lock copy.**'), SECTION_34.indexOf('**What the frames cost.**')))
  assert.ok(clean.length > 40, `${clean.length}`)
  assert.deepEqual(notRows('lock.txt', clean, ['C', '?']), [])
})

test('the numbers the README gives are the modules\' own', () => {
  const has = (text, what) => assert.ok(README.includes(text), `the README does not say ${JSON.stringify(text)} (${what})`)
  const n = (x) => x.toLocaleString('en-US')
  // the matrix
  const sentences = [...matrixSentences(), ...frameSentences()]
  has(`That is ${n(sentences.length)} sentences`, 'the matrix')
  has(`but for the ${sentences.filter(isPolicy).length} that say the policy`, 'the policy')
  // the rules, the plants and the phrases
  const rules = allRules(env.glossary)
  const copy = copyRules(env.glossary)
  has(`${rules.length} in all: ${Object.keys(FIXED).length} written out in code`, 'the rules')
  has(`and ${copy.length} copy rules`, 'the copy rules')
  has(`each of the ${LOCK_PHRASES.length} lock phrases`, 'the lock phrases')
  has(`the ${PRESSURE_PHRASES.length} pressure and ${REWARD_PHRASES.length} reward phrases`, 'the pressure and reward phrases')
  has(`each of the glossary's ${env.glossary.internal.length} internal names and ${env.glossary.internalIds.size} internal kinds of ID`, 'the internal names')
  const named = new Set(PLANTS.flatMap((p) => p.rules)).size
  has(`${PLANTS.length} plants that name ${named} rules`, 'the plants')
  const strict = PLANTS.filter((p) => p.strict === true).length
  has(`${['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'][strict] ?? strict} plants run under \`--strict\``, 'the strict plants')
  has(`${PLANTS.length} planted faults and ${rules.length} rules`, 'section 8\'s summary')
  // the corpora
  const count = (file, mark) => corpusRows(file).filter((r) => r.mark === mark).length
  has(`\`fixtures/copy/lock.txt\` holds ${count('lock.txt', 'F')} sentences that must be flagged, ${count('lock.txt', 'C')} that must not and ${count('lock.txt', '?')} left unjudged`, 'the lock corpus')
  has(`\`fixtures/copy/pressure.txt\` holds ${count('pressure.txt', 'F')} counter, loss, deadline and reward sentences and ${count('pressure.txt', 'C')} look-alikes`, 'the pressure corpus')
  has(`\`fixtures/copy/internal.txt\` holds ${count('internal.txt', 'F')} sentences that an internal name makes internal and ${count('internal.txt', 'C')} look-alikes`, 'the internal corpus')
  // the size of the lock patterns, in thousands
  const size = LOCK_PHRASES.reduce((k, p) => k + p.re.source.length, 0)
  has(`about ${n(Math.round(size / 1000) * 1000)} characters`, 'the lock patterns')
})
