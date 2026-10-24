// W0-S03: compare Souffle's relations and derivation heights with the adapter's, per runtime.
//
//   node compare.mjs --corpus <dir> --souffle <dir> --out <dir> --z3 <name>=<replies.json> [--z3 ...]
//
// Relations are compared as the SHA-256 of their sorted tuples (each tuple one line, columns joined by a
// tab, every line ending in a newline), case by case and relation by relation. Heights are compared
// tuple by tuple against Souffle's `explain` trees. Exit status is 1 when anything differs.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const argv = process.argv.slice(2)
const opt = (name) => argv.flatMap((a, i) => (a === `--${name}` ? [argv[i + 1]] : []))
const corpusDir = path.resolve(opt('corpus')[0])
const souffleDir = path.resolve(opt('souffle')[0])
const outDir = path.resolve(opt('out')[0])
const configs = opt('z3').map((s) => {
  const [name, file] = s.split('=')
  return { name, ...JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')) }
})

const read = (p) => fs.readFileSync(p, 'utf8')
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')
const relationHash = (rows) => sha256([...rows].sort().map((l) => l + '\n').join(''))
const cases = JSON.parse(read(path.join(corpusDir, 'cases.json')))
const corpus = JSON.parse(read(path.join(corpusDir, 'corpus.json')))
const summary = JSON.parse(read(path.join(souffleDir, 'souffle-summary.json')))
const outputsOf = (program) => [...corpus.programs[program].matchAll(/^\.output\s+(\w+)/gm)].map((m) => m[1])
const csv = (dir, rel) => {
  const f = path.join(dir, `${rel}.csv`)
  if (!fs.existsSync(f)) return null
  const rows = read(f).split('\n')
  if (rows.at(-1) === '') rows.pop() // the newline that ends the last row; an empty row is a tuple of one empty symbol
  return rows
}
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const pct = (xs, p) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))]
const round = (x) => Math.round(x * 100) / 100

// Souffle's relations, per case
const souffle = {}
for (const c of cases) {
  if (summary.cases[c.id].exit !== 0) continue
  souffle[c.id] = Object.fromEntries(outputsOf(c.program).map((rel) => {
    const rows = csv(path.join(souffleDir, 'cases', c.id), rel)
    return [rel, { tuples: rows.length, sha256: relationHash(rows) }]
  }))
}

const result = { configs: {}, boundary: {}, compiled: {}, explain: {}, souffle: { cases: Object.keys(souffle).length, version: summary.version.split('\n').filter((l) => l.startsWith('Version') || l.startsWith('Options')).join('; ') } }
let failed = false
const mismatchLimit = 12

// Souffle's compiled mode against its interpreter
for (const [id, run] of Object.entries(summary.compiled)) {
  const same = outputsOf(cases.find((c) => c.id === id).program).every((rel) => relationHash(csv(path.join(souffleDir, 'compiled', id), rel) ?? []) === souffle[id][rel].sha256)
  result.compiled[id] = { exit: run.exit, relations_equal_to_interpreter: same, ms: round(run.ms) }
  failed ||= !same
}

const sorted = (xs) => [...xs].sort()
for (const cfg of configs) {
  const byId = new Map(cfg.replies.map((r) => [r.id, r]))
  const stat = { runtime: cfg.meta.runtime, z3: cfg.meta.z3, engines: {}, errors: [], heights: null, timing: {} }
  for (const engine of ['fixedpoint', 'reference']) {
    const e = { cases: 0, relations: 0, equal: 0, mismatches: [], digest: null }
    const digestLines = []
    for (const c of cases.filter((x) => x.kind === 'relations')) {
      const r = byId.get(c.id)
      if (!r?.ok) {
        stat.errors.push({ id: c.id, error: r?.error ?? 'missing' })
        failed = true
        continue
      }
      e.cases++
      for (const rel of outputsOf(c.program)) {
        const got = r[engine][rel]
        const want = souffle[c.id][rel]
        e.relations++
        digestLines.push(`${c.id}\t${rel}\t${got.tuples}\t${got.sha256}`)
        if (got.sha256 === want.sha256 && got.tuples === want.tuples) e.equal++
        else if (e.mismatches.length < mismatchLimit) e.mismatches.push({ id: c.id, rel, got: got.tuples, want: want.tuples })
      }
    }
    e.digest = sha256(sorted(digestLines).join('\n') + '\n')
    stat.engines[engine] = e
    failed ||= e.equal !== e.relations
  }
  // heights
  const h = { cases: 0, tuples: 0, equal: 0, key_mismatches: 0, value_mismatches: [], failures: 0, checked: 0, contested: 0, max_height: 0, histogram: {} }
  for (const c of cases.filter((x) => x.derive)) {
    const r = byId.get(c.id)
    const mine = r?.derive?.fixedpoint
    const theirs = JSON.parse(read(path.join(souffleDir, 'explain', `${c.id}.json`)))
    if (!mine) {
      failed = true
      continue
    }
    h.cases++
    h.failures += mine.failures.length
    h.checked += mine.checked
    h.contested += mine.contested
    const keys = new Set([...Object.keys(mine.heights), ...Object.keys(theirs)])
    for (const k of keys) {
      if (!(k in mine.heights) || !(k in theirs)) h.key_mismatches++
      else {
        h.tuples++
        if (mine.heights[k] === theirs[k]) {
          h.equal++
          h.max_height = Math.max(h.max_height, theirs[k])
          h.histogram[theirs[k]] = (h.histogram[theirs[k]] ?? 0) + 1
        } else if (h.value_mismatches.length < mismatchLimit) h.value_mismatches.push({ id: c.id, tuple: k, adapter: mine.heights[k], souffle: theirs[k] })
      }
    }
  }
  stat.heights = h
  failed ||= h.equal !== h.tuples || h.key_mismatches > 0 || h.failures > 0
  // boundary
  for (const c of cases.filter((x) => x.kind === 'boundary')) {
    const r = byId.get(c.id)
    const s = summary.cases[c.id]
    const row = { souffle: s.exit === 0 ? 'accepts' : `rejects: ${s.error}`, adapter: r.ok ? 'accepts' : `rejects (${r.error.kind}): ${r.error.message}` }
    if (s.exit !== 0) row.verdict = r.ok ? 'ADAPTER LOOSER' : 'both reject'
    else if (!r.ok) row.verdict = 'adapter stricter'
    else {
      const same = outputsOf(c.program).every((rel) => r.fixedpoint[rel].sha256 === souffle[c.id][rel].sha256 && r.reference[rel].sha256 === souffle[c.id][rel].sha256)
      row.verdict = same ? 'both accept, relations equal' : 'BOTH ACCEPT, RELATIONS DIFFER'
    }
    failed ||= /LOOSER|DIFFER/.test(row.verdict)
    result.boundary[c.id.replace('boundary/', '')] = { ...(result.boundary[c.id.replace('boundary/', '')] ?? {}), [cfg.name]: row }
  }
  // timing
  const rel = cases.filter((c) => c.kind === 'relations').map((c) => byId.get(c.id))
  for (const k of ['fixedpoint_ms', 'reference_ms', 'parse_check_ms']) {
    const xs = rel.map((r) => r[k]).filter((x) => typeof x === 'number')
    stat.timing[k] = { n: xs.length, median: round(median(xs)), p95: round(pct(xs, 0.95)), max: round(Math.max(...xs)) }
  }
  result.configs[cfg.name] = stat
}

// the scale worlds: how the two evaluations grow beyond the curriculum's sizes
result.scale = {}
for (const c of cases.filter((x) => /@scale-/.test(x.id))) {
  const meta = corpus.meta[c.world]
  result.scale[c.id] = {
    users: meta.users,
    documents: meta.docs,
    teams: meta.teams,
    tuples: Object.fromEntries(outputsOf(c.program).map((rel) => [rel, souffle[c.id][rel].tuples])),
    souffle_ms: round(summary.cases[c.id].ms),
    ...Object.fromEntries(configs.map((cfg) => {
      const r = cfg.replies.find((x) => x.id === c.id)
      return [cfg.name, { fixedpoint_ms: round(r.fixedpoint_ms), reference_ms: round(r.reference_ms) }]
    })),
  }
}

// Souffle timing, and corpus statistics from the first config's derive replies
const sms = cases.filter((c) => c.kind === 'relations').map((c) => summary.cases[c.id].ms)
result.souffle.interpreter_ms = { n: sms.length, median: round(median(sms)), p95: round(pct(sms, 0.95)), max: round(Math.max(...sms)) }
const ems = Object.values(summary.explain).map((e) => e.ms)
result.souffle.explain_session_ms = { n: ems.length, median: round(median(ems)), p95: round(pct(ems, 0.95)), max: round(Math.max(...ems)) }
result.souffle.explain_problems = Object.entries(summary.explain).filter(([, e]) => e.problems.length || !e.relations_unchanged).length
failed ||= result.souffle.explain_problems > 0

const first = configs[0]
if (first) {
  const byId = new Map(first.replies.map((r) => [r.id, r]))
  const ruleLines = corpus.programs['read-ref'].split('\n').filter((l) => l.includes(':-')).map((l) => l.replace(/\/\/.*$/, '').replace(/\s+/g, ' ').trim())
  const generated = cases.filter((c) => c.program === 'read-ref' && c.world.startsWith('g'))
  const fires = ruleLines.map(() => 0)
  let trivial = 0
  for (const c of generated) {
    byId.get(c.id).derive.fixedpoint.firing.forEach((n, i) => (fires[i] += n > 0 ? 1 : 0))
    const w = corpus.worlds[c.world]
    const users = w.tenant_of_user.split('\n').filter(Boolean).length
    const docs = new Set(w.owns.split('\n').filter(Boolean).map((l) => l.split('\t')[1])).size
    const n = byId.get(c.id).fixedpoint.canread.tuples
    if (n === 0 || n === users * docs) trivial++
  }
  result.generated_worlds = {
    n: generated.length,
    rules: ruleLines.map((r, i) => ({ rule: r, worlds_where_it_fires: fires[i], share: round(fires[i] / generated.length) })),
    trivial_canread_matrices: { n: trivial, share: round(trivial / generated.length) },
  }
}

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'comparison.json'), JSON.stringify(result, null, 1))
const brief = Object.entries(result.configs).map(([n, c]) => `${n}: fixedpoint ${c.engines.fixedpoint.equal}/${c.engines.fixedpoint.relations}, reference ${c.engines.reference.equal}/${c.engines.reference.relations}, heights ${c.heights.equal}/${c.heights.tuples} (${c.heights.key_mismatches} key mismatches, ${c.heights.failures} invalid derivations), errors ${c.errors.length}`)
console.log(brief.join('\n'))
console.log(failed ? 'DIFFERENCES FOUND' : 'ALL EQUAL')
process.exit(failed ? 1 : 0)
