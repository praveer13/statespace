// W0-S03: build the differential corpus from the committed fixtures and seeded generators.
//
//   node worldgen.mjs --out <dir> [--worlds 200] [--graphs 24]
//
// Writes <dir>/programs, <dir>/worlds, <dir>/boundary (the tree Souffle reads), <dir>/corpus.json
// (one file the other runners read) and <dir>/manifest.json (SHA-256 of every input).
// Everything is a pure function of the fixtures, the seeds and this file.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
)
if (!args.out) throw new Error('usage: node worldgen.mjs --out <dir> [--worlds 200] [--graphs 24]')
const N_WORLDS = Number(args.worlds ?? 200)
const N_GRAPHS = Number(args.graphs ?? 24)
const out = path.resolve(args.out)

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const read = (p) => fs.readFileSync(p, 'utf8')

// ---------------------------------------------------------------- seeded generators

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const S7_RELATIONS = ['tenant_of_user', 'tenant_of_team', 'member', 'owns', 'subteam', 'share_user', 'share_team', 'revoked']

// A world per curriculum/S07-secrecy.md section 1: 2-3 tenants, 2-5 teams, 3-8 users, 3-10 documents,
// nesting depth 0-2, shares, revocations and teamless users. Some worlds break WF1-WF3 on purpose, as
// LAB-7.c3's seeded mutants do; the Datalog engines must agree on those too. `cfg` fixes sizes for the
// scale worlds that probe how far the engines go beyond the curriculum's.
function s7World(seed, cfg = {}) {
  const rnd = mulberry32(seed * 7919 + 17)
  const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1))
  const pick = (xs) => xs[Math.floor(rnd() * xs.length)]
  const chance = (p) => rnd() < p
  const rel = Object.fromEntries(S7_RELATIONS.map((r) => [r, new Map()]))
  const add = (r, ...cols) => rel[r].set(cols.join('\t'), cols)

  const tenants = ['acme', 'birch', 'cobalt'].slice(0, cfg.tenants ?? int(2, 3))
  const teams = Array.from({ length: cfg.teams ?? int(2, 5) }, (_, i) => ({ name: `team${i + 1}`, tenant: i < tenants.length ? tenants[i] : pick(tenants) }))
  for (const t of teams) add('tenant_of_team', t.name, t.tenant)
  const users = Array.from({ length: cfg.users ?? int(3, 8) }, (_, i) => ({ name: `user${i + 1}`, tenant: pick(teams).tenant }))
  const docs = Array.from({ length: cfg.docs ?? int(3, 10) }, (_, i) => `doc${String(i + 1).padStart(2, '0')}`)
  const roles = ['viewer', 'editor', 'admin']

  const classes = []
  const memberOf = new Set()
  for (const u of users) {
    add('tenant_of_user', u.name, u.tenant)
    const own = teams.filter((t) => t.tenant === u.tenant)
    if (chance(0.2)) continue // teamless
    const first = pick(own)
    add('member', u.name, first.name, pick(roles))
    memberOf.add(first.name)
    if (own.length > 1 && chance(0.3)) add('member', u.name, pick(own).name, pick(roles))
  }
  for (const d of docs) add('owns', pick(teams).name, d)

  // nesting: one to three subteam edges inside a tenant, and a member in the nested team more often than not
  const sameTenant = (a, b) => a.tenant === b.tenant && a.name !== b.name
  const depth = cfg.depth ?? pick([0, 1, 2])
  if (depth >= 1) {
    const pairs = teams.flatMap((s) => teams.filter((t) => sameTenant(s, t)).map((t) => [s, t]))
    for (let edges = cfg.depth ? 3 : 1; pairs.length && edges > 0; edges--) {
      const [s, t] = pick(pairs)
      add('subteam', s.name, t.name)
      if (!memberOf.has(s.name) && chance(0.8)) {
        const u = users.find((x) => x.tenant === s.tenant)
        if (u) add('member', u.name, s.name, pick(roles))
      }
      if (depth === 2) {
        const next = teams.filter((r) => sameTenant(t, r) && r.name !== s.name)
        if (next.length) add('subteam', t.name, pick(next).name)
      }
    }
  }
  for (let i = cfg.shares ?? int(0, 3); i > 0; i--) add('share_user', pick(docs), pick(users).name)
  for (let i = cfg.shares ? Math.ceil(cfg.shares / 2) : int(0, 2); i > 0; i--) add('share_team', pick(docs), pick(teams).name)
  const shared = [...rel.share_user.values()]
  for (let i = cfg.shares ? Math.ceil(cfg.shares / 3) : int(0, 2); i > 0; i--) {
    if (shared.length && chance(0.7)) add('revoked', ...pick(shared))
    else add('revoked', pick(docs), pick(users).name)
  }
  if (chance(0.12)) {
    const u = pick(users)
    const foreign = teams.filter((t) => t.tenant !== u.tenant)
    if (foreign.length) {
      add('member', u.name, pick(foreign).name, pick(roles))
      classes.push('wf1')
    }
  }
  if (chance(0.1)) {
    const cross = teams.flatMap((s) => teams.filter((t) => s.tenant !== t.tenant).map((t) => [s, t]))
    if (cross.length) {
      const [s, t] = pick(cross)
      add('subteam', s.name, t.name)
      classes.push('wf2')
    }
  }
  if (chance(0.05)) {
    const [s, t] = [pick(teams), pick(teams)]
    if (s.name !== t.name) {
      add('subteam', s.name, t.name)
      add('subteam', t.name, s.name)
      classes.push('wf3')
    }
  }
  const facts = Object.fromEntries(S7_RELATIONS.map((r) => [r, [...rel[r].values()].map((c) => c.join('\t') + '\n').join('')]))
  return { facts, meta: { seed, classes: classes.length ? classes : ['wf-ok'], tenants: tenants.length, teams: teams.length, users: users.length, docs: docs.length, depth } }
}

function graphWorld(nodes, edges) {
  const name = (i) => `n${String(i).padStart(2, '0')}`
  return {
    node: nodes.map((i) => name(i) + '\n').join(''),
    edge: [...new Set(edges.map(([a, b]) => `${name(a)}\t${name(b)}\n`))].join(''),
  }
}

function randomGraph(seed) {
  const rnd = mulberry32(seed * 104729 + 3)
  const n = 3 + Math.floor(rnd() * 10)
  const p = 0.08 + rnd() * 0.22
  const edges = []
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (rnd() < (a === b ? p / 3 : p)) edges.push([a, b])
  return { facts: graphWorld([...Array(n).keys()], edges), meta: { seed, nodes: n, edges: edges.length } }
}

// ---------------------------------------------------------------- assemble the corpus

const fixtures = path.join(here, 'fixtures')
const programs = {}
for (const f of fs.readdirSync(path.join(fixtures, 'programs')).sort()) programs[f.replace(/\.dl$/, '')] = read(path.join(fixtures, 'programs', f))
const boundary = {}
for (const f of fs.readdirSync(path.join(fixtures, 'boundary')).sort()) if (f.endsWith('.dl')) boundary[f.replace(/\.dl$/, '')] = read(path.join(fixtures, 'boundary', f))

const readFacts = (dir) => Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith('.facts')).sort().map((f) => [f.replace(/\.facts$/, ''), read(path.join(dir, f))]))
const worlds = {}
const meta = {}
for (const w of fs.readdirSync(path.join(fixtures, 'worlds')).sort()) worlds[w] = readFacts(path.join(fixtures, 'worlds', w))
const boundaryWorld = readFacts(path.join(fixtures, 'boundary', 'world'))

const chain = Array.from({ length: 11 }, (_, i) => [i, i + 1])
Object.assign(worlds, {
  'graph-empty': graphWorld([0, 1, 2], []),
  'graph-chain12': graphWorld([...Array(12).keys()], chain),
  'graph-cycle6': graphWorld([...Array(6).keys()], [...Array(6).keys()].map((i) => [i, (i + 1) % 6])),
  'graph-complete4': graphWorld([0, 1, 2, 3], [0, 1, 2, 3].flatMap((a) => [0, 1, 2, 3].map((b) => [a, b]))),
})
const s7Worlds = ['w0', 'w0-revoked', 'w0-nested', 'w0-overlap', 'w0-spaces', 'empty']
for (let seed = 1; seed <= N_WORLDS; seed++) {
  const id = `g${String(seed).padStart(4, '0')}`
  const w = s7World(seed)
  worlds[id] = w.facts
  meta[id] = w.meta
  s7Worlds.push(id)
}
const SCALES = {
  'scale-medium': { tenants: 3, teams: 8, users: 30, docs: 40, shares: 12, depth: 2 },
  'scale-large': { tenants: 3, teams: 20, users: 100, docs: 150, shares: 40, depth: 2 },
}
for (const [id, cfg] of Object.entries(SCALES)) {
  const w = s7World(900 + Object.keys(SCALES).indexOf(id), cfg)
  worlds[id] = w.facts
  meta[id] = w.meta
}
const graphWorlds = ['graph-empty', 'graph-chain12', 'graph-cycle6', 'graph-complete4']
for (let seed = 1; seed <= N_GRAPHS; seed++) {
  const id = `h${String(seed).padStart(4, '0')}`
  const g = randomGraph(seed)
  worlds[id] = g.facts
  meta[id] = g.meta
  graphWorlds.push(id)
}
for (const [id, w] of Object.entries(worlds)) for (const [r, text] of Object.entries(w)) if (/[^\x00-\x7f]/.test(text)) throw new Error(`non-ASCII facts in ${id}/${r}`)

const S7_PROGRAMS = Object.keys(programs).filter((p) => p.startsWith('read-'))
const cases = []
for (const p of S7_PROGRAMS) for (const w of s7Worlds) cases.push({ id: `${p}@${w}`, kind: 'relations', program: p, world: w, derive: true })
for (const w of Object.keys(SCALES)) cases.push({ id: `read-ref@${w}`, kind: 'relations', program: 'read-ref', world: w, derive: false })
cases.push({ id: 'toy@toy', kind: 'relations', program: 'toy', world: 'toy', derive: true })
for (const w of graphWorlds) cases.push({ id: `closure@${w}`, kind: 'relations', program: 'closure', world: w, derive: true })
// facts-file quirks: the same program text over files that Souffle reads in surprising ways
const boundaryWorlds = {
  'blank-line-one-column': { q: 'a\n\nb\n' },
  'blank-line-two-columns': { r: 'a\tb\n\nc\td\n' },
  'extra-column': { r: 'a\tb\tc\nd\te\tf\n' },
}
for (const b of Object.keys(boundary)) cases.push({ id: `boundary/${b}`, kind: 'boundary', program: `boundary/${b}`, world: boundaryWorlds[b] ? `boundary-${b}` : 'boundary-world', derive: false })
worlds['boundary-world'] = boundaryWorld
for (const [b, w] of Object.entries(boundaryWorlds)) worlds[`boundary-${b}`] = w
for (const [b, text] of Object.entries(boundary)) programs[`boundary/${b}`] = text

// ---------------------------------------------------------------- write

fs.rmSync(out, { recursive: true, force: true })
const write = (rel, text) => {
  const p = path.join(out, rel)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, text)
}
for (const [name, text] of Object.entries(programs)) write(`programs/${name}.dl`, text)
for (const [id, w] of Object.entries(worlds)) for (const [r, text] of Object.entries(w)) write(`worlds/${id}/${r}.facts`, text)
write('cases.json', JSON.stringify(cases))
const corpus = { schema: 'w0-s03-corpus@0', programs, worlds, cases, meta }
write('corpus.json', JSON.stringify(corpus))

const lines = []
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (!['manifest.json', 'corpus.json', 'cases.json'].includes(e.name) || path.dirname(p) !== out) lines.push(`${sha256(fs.readFileSync(p))}  ${path.relative(out, p)}`)
  }
}
walk(out)
const corpusDigest = sha256(lines.join('\n') + '\n')
const classCount = {}
for (const [id, m] of Object.entries(meta)) if (id.startsWith('g')) for (const c of m.classes) classCount[c] = (classCount[c] ?? 0) + 1
write(
  'manifest.json',
  JSON.stringify(
    {
      generator: { file: 'worldgen.mjs', sha256: sha256(fs.readFileSync(fileURLToPath(import.meta.url))) },
      counts: { programs: S7_PROGRAMS.length + 2, s7_worlds: s7Worlds.length, generated_s7_worlds: N_WORLDS, scale_worlds: Object.keys(SCALES).length, graph_worlds: graphWorlds.length, cases: cases.length, boundary_programs: Object.keys(boundary).length },
      classes: classCount,
      corpus_sha256: corpusDigest,
      files: lines.length,
    },
    null,
    1,
  ),
)
console.log(`corpus: ${cases.length} cases, ${Object.keys(worlds).length} worlds, ${lines.length} files, digest ${corpusDigest}`)
