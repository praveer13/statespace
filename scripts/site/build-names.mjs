#!/usr/bin/env node
// The names of the claim templates and specimens the site shows on a card: the spine's tables (sections 5.1 and 5.2) hold
// them, and the ID registry does not. Writes apps/site/src/app/names.generated.json, which the site build regenerates
// before the typecheck; the file is written only when its text changes.
//
//   node scripts/site/build-names.mjs           write the file
//   node scripts/site/build-names.mjs --check   exit 1 when the file is not what the spine gives

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SPINE = join(REPO, 'docs/spine/SPINE.md')
const OUT = join(REPO, 'apps/site/src/app/names.generated.json')

/** A table cell as learner copy: run tags and run references dropped, spaces closed up. */
const clean = (cell) =>
  cell
    .replace(/\[X [^\]]*\]/g, '')
    .replace(/\{\{run:[^}]*\}\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export function namesOf(spine) {
  const claims = {}
  const specimens = {}
  for (const line of spine.split('\n')) {
    const m = /^\| (CL-[0-9]+\.[0-9]+|SP-[0-9]+\.[0-9]+) \| ([^|]+) \|/.exec(line)
    if (m === null) continue
    const [, id, cell] = m
    const text = clean(cell)
    if (id.startsWith('CL-')) claims[id] ??= text
    // A specimen's row runs "The overdraft: the starter's witness, ...": the name is the part before the colon, and the
    // rest describes what was found, which a lesson shows only after its questions.
    else specimens[id] ??= clean(text.split(':')[0])
  }
  return { format: 'statespace site names, revision 1', claims, specimens }
}

const text = `${JSON.stringify(namesOf(readFileSync(SPINE, 'utf8')), null, 2)}\n`
const held = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null
if (process.argv.includes('--check')) {
  if (held !== text) {
    process.stderr.write('build-names: apps/site/src/app/names.generated.json is not what the spine gives; run node scripts/site/build-names.mjs\n')
    process.exit(1)
  }
} else if (held !== text) {
  writeFileSync(OUT, text)
}
