// Run GATE-items (scripts/verify-items.mjs) over the Call It fixtures: the lesson pages of
// apps/site/src/components/call-it/fixtures/tree/content/, read by the gate's own discovery and the content build's reader, in
// a scratch root that also holds what the gate reads beside pages (the ID registry, and the run records the pages cite). The
// fixture families (apps/site/src/components/call-it/fixtures/generated/) go through the gate's own instance reader and rules.
//
// Run through Node's type stripping: the gate and its readers are TypeScript at the edges.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const HERE = path.dirname(fileURLToPath(import.meta.url))
export const REPO = path.resolve(HERE, '../../../..')
export const FIXTURES = path.join(REPO, 'apps/site/src/components/call-it/fixtures')

const gate = () => import(pathToFileURL(path.join(REPO, 'scripts/verify-items.mjs')).href)

/** A scratch root: the fixture pages, the registry and the run records the pages cite. `edit` may rewrite a page's text. */
export function scratchRoot(edit = (_id, text) => text, { extraPages = {} } = {}) {
  const root = fs.mkdtempSync(path.join(process.env.W1T07_SCRATCH ?? os.tmpdir(), 'w1t07-items-'))
  const stageDir = path.join(root, 'content/stages/S1')
  fs.mkdirSync(stageDir, { recursive: true })
  const source = path.join(FIXTURES, 'tree/content/stages/S1')
  const pages = {}
  for (const f of fs.readdirSync(source).sort()) if (/^S\d+\.L\d+\.md$/.test(f)) pages[f.replace(/\.md$/, '')] = fs.readFileSync(path.join(source, f), 'utf8')
  for (const [id, text] of Object.entries({ ...pages, ...extraPages })) {
    const out = edit(id, text)
    if (out !== null) fs.writeFileSync(path.join(stageDir, `${id}.md`), out)
  }
  fs.mkdirSync(path.join(root, 'packages/ids/src'), { recursive: true })
  fs.copyFileSync(path.join(REPO, 'packages/ids/src/registry.json'), path.join(root, 'packages/ids/src/registry.json'))
  fs.mkdirSync(path.join(root, 'runs'), { recursive: true })
  for (const id of new Set(Object.values(pages).flatMap((t) => [...t.matchAll(/RUN-[a-z0-9]+(?:-[a-z0-9]+)*/g)].map((m) => m[0])))) {
    const file = path.join(REPO, 'runs', `${id}.json`)
    if (fs.existsSync(file)) fs.copyFileSync(file, path.join(root, 'runs', `${id}.json`))
  }
  return root
}

/** The gate over a scratch root: its findings, pools and notes (no families are sampled: the root has none). */
export async function gateOnPages(root) {
  const g = await gate()
  const collected = await g.collect({ root, families: [], seeds: g.SEEDS_PER_CELL })
  const result = g.checkModel(collected.model)
  result.findings.unshift(...collected.findings)
  return { ...result, model: collected.model }
}

/** The generated fixtures: [{ instance, key, instanceRef }], as fixtures/generated/instances.json holds them. */
export const loadInstances = () => JSON.parse(fs.readFileSync(path.join(FIXTURES, 'generated/instances.json'), 'utf8')).entries

/**
 * The generated fixtures through the gate's own instance reader and rules, as GEN-call-it's: every instance is read into
 * its items (itemsOfInstance), the family is judged on its pool and per template (checkModel), and a pool is both samples
 * [D]: the fixtures are a hand-written pool, so the one set stands as the primary sample and the replicate. The registry
 * is the repository's, so a misconception key the registry lacks is a finding here too.
 */
export async function gateOnInstances(entries = loadInstances(), { registry = undefined } = {}) {
  const g = await gate()
  const generators = await import(pathToFileURL(path.join(REPO, 'scripts/verify-generators.mjs')).href)
  const reg = registry ?? generators.loadRegistry(REPO)
  const read = (sample) => entries.flatMap((e) => g.itemsOfInstance(e.instance, sample).items)
  const family = {
    id: 'GEN-call-it',
    fixture: true,
    mode: 'offered',
    live: [...new Set(entries.map((e) => e.instance.template))].sort(),
    pending: [],
    items: read('primary'),
    replicate: read('replicate'),
    boundIssues: [],
    notes: [],
  }
  const model = { families: [family], pages: [], registry: reg ? { misconceptions: reg.misconceptions, generators: reg.generators } : null, ctiActive: false, sources: [], runs: new Map() }
  return { ...g.checkModel(model), model }
}

export const cleanup = (root) => fs.rmSync(root, { recursive: true, force: true })
