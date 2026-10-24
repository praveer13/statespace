// W0-S03: run Souffle over the corpus, with the provenance (explain) shell where heights are wanted.
//
//   node souffle-run.mjs --corpus <dir> --out <dir>
//
// Runs where `souffle` is on PATH (the Bench container). Writes, under <out>:
//   cases/<id>/<relation>.csv       the interpreter's output relations
//   explain/<id>.json               derivation heights from `-t explain` with `format json`
//   compiled/<id>/<relation>.csv    the same cases through `souffle -c`
//   souffle-summary.json            version banner, argv templates, exit codes and timings
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []))
const corpus = path.resolve(args.corpus)
const out = path.resolve(args.out)
const cases = JSON.parse(fs.readFileSync(path.join(corpus, 'cases.json'), 'utf8'))
const COMPILED = new Set(['read-ref@w0', 'read-ref@w0-overlap', 'toy@toy', 'closure@graph-cycle6', 'read-teamless-cross@g0001'])

const run = (argv, input) => {
  const t0 = process.hrtime.bigint()
  const r = spawnSync(argv[0], argv.slice(1), { input, encoding: 'utf8', maxBuffer: 1 << 28 })
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, ms: Number(process.hrtime.bigint() - t0) / 1e6 }
}
const argvFor = (c, outDir, extra = []) => [
  'souffle',
  ...extra,
  '-F',
  path.join(corpus, 'worlds', c.world),
  '-D',
  outDir,
  path.join(corpus, 'programs', `${c.program}.dl`),
]
const firstError = (stderr) => (stderr.split('\n').find((l) => l.startsWith('Error')) ?? '').slice(0, 200)
const csv = (dir, rel) => {
  const f = path.join(dir, `${rel}.csv`)
  if (!fs.existsSync(f)) return null
  const rows = fs.readFileSync(f, 'utf8').split('\n')
  if (rows.at(-1) === '') rows.pop() // the newline that ends the last row
  return rows
}
const outputsOf = (program) => [...fs.readFileSync(path.join(corpus, 'programs', `${program}.dl`), 'utf8').matchAll(/^\.output\s+(\w+)/gm)].map((m) => m[1])

// ---- the explain shell: one session per case, one `explain` per derived tuple
const quote = (v, isNumber) => (isNumber ? v : `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
function parseAtom(text) {
  const m = /^(\w+)\((.*)\)$/s.exec(text)
  if (!m) return null
  const body = m[2]
  const cells = []
  let i = 0
  while (i < body.length) {
    while (body[i] === ' ' || body[i] === ',') i++
    if (i >= body.length) break
    if (body[i] === '"') {
      let j = i + 1
      let s = ''
      while (body[j] !== '"') {
        if (body[j] === '\\') j++
        s += body[j++]
      }
      cells.push(s)
      i = j + 1
    } else {
      let j = i
      while (j < body.length && body[j] !== ',') j++
      cells.push(body.slice(i, j).trim())
      i = j
    }
  }
  return { rel: m[1], cells }
}
function* jsonObjects(text) {
  let depth = 0
  let start = -1
  let inString = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === '"') inString = false
    } else if (ch === '"') inString = true
    else if (ch === '{') {
      if (depth++ === 0) start = i
    } else if (ch === '}' && --depth === 0) yield text.slice(start, i + 1)
  }
}
const height = (node) => ('axiom' in node ? 0 : 1 + Math.max(0, ...(node.children ?? []).map(height)))

const summary = { version: null, argv: {}, cases: {}, explain: {}, compiled: {} }
summary.version = run(['souffle', '--version']).stdout
summary.argv.interpreter = 'souffle -F <corpus>/worlds/<world> -D <out>/cases/<id> <corpus>/programs/<program>.dl'
summary.argv.explain = 'souffle -t explain -F <corpus>/worlds/<world> -D <out>/explain-out/<id> <corpus>/programs/<program>.dl   (stdin: format json, setdepth 100, one explain per derived tuple, exit)'
summary.argv.compiled = 'souffle -c -F <corpus>/worlds/<world> -D <out>/compiled/<id> <corpus>/programs/<program>.dl'

for (const c of cases) {
  const dir = path.join(out, 'cases', c.id)
  fs.mkdirSync(dir, { recursive: true })
  const r = run(argvFor(c, dir))
  summary.cases[c.id] = { exit: r.status, ms: r.ms, error: r.status === 0 ? '' : firstError(r.stderr) }
}

for (const c of cases.filter((x) => x.derive && summary.cases[x.id].exit === 0)) {
  const outputs = outputsOf(c.program)
  const commands = ['format json', 'setdepth 100']
  const numberColumns = {}
  const decls = fs.readFileSync(path.join(corpus, 'programs', `${c.program}.dl`), 'utf8')
  for (const m of decls.matchAll(/^\.decl\s+(\w+)\(([^)]*)\)/gm)) numberColumns[m[1]] = m[2].split(',').map((s) => /:\s*number/.test(s))
  const expected = []
  for (const rel of outputs) {
    for (const line of csv(path.join(out, 'cases', c.id), rel) ?? []) {
      const cells = line.split('\t')
      commands.push(`explain ${rel}(${cells.map((v, i) => quote(v, numberColumns[rel][i])).join(', ')})`)
      expected.push(`${rel}\t${cells.join('\t')}`)
    }
  }
  commands.push('exit')
  const dir = path.join(out, 'explain-out', c.id)
  fs.mkdirSync(dir, { recursive: true })
  const r = run(argvFor(c, dir, ['-t', 'explain']), commands.join('\n') + '\n')
  const heights = {}
  const problems = []
  const docs = [...jsonObjects(r.stdout)]
  if (docs.length !== expected.length) problems.push(`${docs.length} proofs for ${expected.length} tuples`)
  docs.forEach((doc, i) => {
    const proof = JSON.parse(doc).proof
    const atom = 'premises' in proof ? parseAtom(proof.premises) : null
    if (!atom) return problems.push(`no proof for ${expected[i]}: ${JSON.stringify(proof).slice(0, 80)}`)
    const key = `${atom.rel}\t${atom.cells.join('\t')}`
    if (key !== expected[i]) problems.push(`proof ${i} is for ${key}, asked ${expected[i]}`)
    heights[key] = height(proof)
  })
  // the provenance run must also leave the relations unchanged
  const same = outputs.every((rel) => JSON.stringify(csv(dir, rel)?.slice().sort()) === JSON.stringify(csv(path.join(out, 'cases', c.id), rel)?.slice().sort()))
  summary.explain[c.id] = { exit: r.status, ms: r.ms, tuples: expected.length, problems, relations_unchanged: same }
  if (c.id === 'read-ref@w0') fs.writeFileSync(path.join(out, 'explain-read-ref-w0.txt'), r.stdout) // one raw session, kept as a sample
  fs.mkdirSync(path.join(out, 'explain'), { recursive: true })
  fs.writeFileSync(path.join(out, 'explain', `${c.id}.json`), JSON.stringify(heights))
}

for (const c of cases.filter((x) => COMPILED.has(x.id))) {
  const dir = path.join(out, 'compiled', c.id)
  fs.mkdirSync(dir, { recursive: true })
  const r = run(argvFor(c, dir, ['-c']))
  summary.compiled[c.id] = { exit: r.status, ms: r.ms, error: r.status === 0 ? '' : firstError(r.stderr) }
}

fs.writeFileSync(path.join(out, 'souffle-summary.json'), JSON.stringify(summary, null, 1))
const failed = Object.entries(summary.cases).filter(([id, v]) => v.exit !== 0 && !id.startsWith('boundary/'))
console.log(`souffle: ${cases.length} cases, ${failed.length} unexpected failures, ${Object.keys(summary.explain).length} explain sessions, ${Object.keys(summary.compiled).length} compiled`)
if (failed.length) console.log(failed.slice(0, 5))
