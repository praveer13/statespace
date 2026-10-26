#!/usr/bin/env node
// Calibrating GATE-lessons' copy rules against the copy the documents intend to ship (not a gate, and not a test).
//
//   node scripts/spikes/W1-T38/calibrate.mjs
//
// 1. Every quoted string of 20 or more characters in docs/ (history excluded), curriculum/ and labs/ is read by the lock,
//    pressure and reward rules. The documents quote what they ban in two tables of docs/DESIGN.md, and those lines
//    are the only expected findings: a pattern that fires anywhere else is a misfire to fix in lib/copy.mjs.
// 2. The learner copy that curriculum/S01-counterexample.md quotes ("Copy: ...") is read by the term and internal rules
//    at the lesson it sits in, which shows where the S1 spec's own wording and the rules part.
//
// Exit status: 0; the output is the finding list.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from '../../verify-lessons.mjs'
import { copyFindings } from './lib/copy.mjs'
import { lessonPosition } from './lib/glossary.mjs'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const loaded = await loadEnv(REPO)
if (loaded.error !== undefined) {
  console.error(loaded.error)
  process.exit(2)
}
const { env } = loaded
const read = (text, unit, boot) => copyFindings(text, { glossary: env.glossary, unit, boot, scanIds: env.scanIds })

function markdownFiles(rel) {
  const dir = path.join(REPO, rel)
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.posix.join(rel, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'history') out.push(...markdownFiles(p))
    } else if (e.name.endsWith('.md')) out.push(p)
  }
  return out.sort()
}

// 1. the quoted strings of the documents
let quoted = 0
const hits = []
for (const file of ['docs', 'curriculum', 'labs'].flatMap(markdownFiles)) {
  const lines = fs.readFileSync(path.join(REPO, file), 'utf8').split('\n')
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/[“"]([^”"\n]{20,300})[”"]/g)) {
      quoted += 1
      for (const f of read(m[1], null, false)) if (['lock', 'pressure', 'reward'].includes(f.check)) hits.push(`${file}:${i + 1} ${f.check} "${f.word}" in: ${m[1].slice(0, 90)}`)
    }
  })
}
console.log(`1. ${quoted} quoted strings of 20 or more characters in docs/, curriculum/ and labs/: ${hits.length} finding(s) of the lock, pressure and reward rules`)
for (const h of hits) console.log(`   ${h}`)

// 2. the S1 spec's quoted copy, at the lesson it sits in
const s1 = 'curriculum/S01-counterexample.md'
const lines = fs.readFileSync(path.join(REPO, s1), 'utf8').split('\n')
let lesson = null
let strings = 0
const s1hits = []
lines.forEach((line, i) => {
  const h = /^### (S1\.L[0-5]) /.exec(line)
  if (h !== null) lesson = h[1]
  if (/^## 3\./.test(line)) lesson = null
  if (lesson === null) return
  for (const m of line.matchAll(/Copy(?: \([^)]*\))?:\s*[“"]([^”"\n]+)[”"]/g)) {
    strings += 1
    for (const f of read(m[1], lessonPosition(lesson), lesson === 'S1.L0')) s1hits.push(`${s1}:${i + 1} ${lesson} ${f.check} "${f.word}" in: ${m[1].slice(0, 90)}`)
  }
})
console.log(`2. ${strings} strings that ${s1} quotes as copy, read at their lesson: ${s1hits.length} finding(s)`)
for (const h of s1hits) console.log(`   ${h}`)
