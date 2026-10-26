#!/usr/bin/env node
// GATE-lessons (spine section 3.0, section 11.2 and section 12 item 48; invariants I1 and I5; W1-T38).
//
// A lint over learner content, specified rule by rule in the spine:
//
//   anatomy     lesson anatomy by tier: Boot (at most 8 minutes, one call before the first run, the "this will feel
//               harder" card), a core lesson (1-2 prequestions; 2-4 segments of 12-15 minutes, each with one instrument
//               run, a call on its first run, and a graded item last; exit items; a Build this card that names a lab
//               stage) and a bridge (at most 1,000 words; one prequestion tagged with every knowledge component the
//               bridge introduces, which is one that no earlier lesson lists; cells with calls; a graded item and an
//               exit item; a dated reading pointer).
//               Every lesson has a graded item (I1). A drawer has no anatomy.
//   family      every graded item names a generator family the spine registers and one of its templates
//   rail        the rail shows segment titles only: plain text, no repeat, no option text (the options of generated
//               items included), and no verdict, whether or not a question offers it: sat, unsat, unknown, or a
//               stamp word in capitals (V2-05)
//   block-type  at most the six content block types of W1-W2 (V2-18): prose, instrument, item, claim, specimen, card;
//               a line that reads as a block and is not one (":::Figure") is a finding too
//   lock        no lock copy (I5): nothing a learner can open (a lesson, stage, lab, drawer, audit case, the Defence,
//               the course or a piece of it) waits on the learner's progress, on a time or on nothing said. Frames
//               over one vocabulary read "unlock" and "locked", a purpose clause, a consequence, a condition first,
//               "not yet" and "won't open until", a schedule, a requirement, a means, a restriction, a wait, a label
//               and a padlock (scripts/spikes/W1-T38/README.md section 3.4)
//   pressure    no daily counters, days away, overdue marks, deadlines or loss framing (EVIDENCE.md rows 6, 7, 17)
//   reward      no XP, points, badges, levels, rankings or praise for a click (DESIGN.md section 11.4)
//   internal    none of the internal names (lane, Shelf, docket, pocket checker, telescope, Hall of Records, proof
//               debt, Judgment, the tier names, KC) and no ID of the course's machinery in learner copy, a knowledge
//               component's ID included
//   term        a glossary term appears only from the lesson or stage its "First introduced" column names, so Boot's
//               copy uses terms 1-5 only; the glossary is content/glossary.yaml, compared with the spine's table
//
//   node scripts/verify-lessons.mjs                  the fast lane
//   node scripts/verify-lessons.mjs --strict         warnings fail too, and so does a generator family not built yet
//   node scripts/verify-lessons.mjs --json           print the report as JSON
//   node scripts/verify-lessons.mjs --root DIR       check the tree under DIR (the glossary, the registry, the spine and
//                                                    the generators fall back to this repository's when DIR has none);
//                                                    --root may repeat, and then each tree is checked on its own, --json
//                                                    prints {strict, reports: [{root, status, ...}]} and the run exits
//                                                    with the worst status
//   node scripts/verify-lessons.mjs --self-check     plant one fault at a time in a scratch copy of a small tree; the
//                                                    gate must fail on each with every rule the plant names; every
//                                                    rule of the gate has a plant but two that no plant can reach,
//                                                    which tests hold instead (lib/rules.mjs, lib/plants.mjs); then
//                                                    the copy rules must hold the corpora and the vocabulary matrix
//
// What it reads: content/stages/S*/S*.L*.md (lessons), content/drawers/D-*.md (drawers: the copy, block-type and
// no-lock rules and the deferred card, but no anatomy and no rail), content/stages/S*/stage.yaml and lab.yaml (the
// copy rules, at the end of their stage), content/stages/S*/placement.yaml (the copy rules, at the start of its stage;
// S1's walk closes Boot, so Boot's terms), labs/README.md (the copy rules), labs/TOOLS.md and labs/AGENTS.md (the same
// rules, as warnings until they are clean), and the lessons the content build writes under apps/site/public/content/,
// when it has (their rail is titles and nothing else). scripts/spikes/W1-T38/README.md is the manual: each rule with the
// spine line it comes from, the decisions this task made, and what is not checked.
//
// Exit status: 0 green, 1 findings, 2 the gate could not run.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { checkGlossary, comparePositions, lessonPosition, parseSpineGlossary, shapeGlossary } from './spikes/W1-T38/lib/glossary.mjs'
import { generatedOptions } from './spikes/W1-T38/lib/generators.mjs'
import { SIX_BLOCK_TYPES, finding, lintBuilt, lintDocument, lintPage, lintRecord, pipelineDrift } from './spikes/W1-T38/lib/page.mjs'

// The content pipeline and the ID registry are TypeScript, which Node 22 runs with type stripping.
if (!process.features.typescript && !process.env.LESSONS_GATE_STRIP) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, LESSONS_GATE_STRIP: '1' },
  })
  process.exit(again.status ?? 1)
}

const SCRIPT = fileURLToPath(import.meta.url)
const REPO = path.resolve(path.dirname(SCRIPT), '..')

const LESSON_FILE = /^content\/stages\/S[1-9][0-9]*\/S[1-9][0-9]*\.L[0-9]+\.md$/
const DRAWER_FILE = /^content\/drawers\/D-[0-9]{2}\.md$/
const STAGE_FILE = /^content\/stages\/S[1-9][0-9]*\/stage\.yaml$/
const LAB_FILE = /^content\/stages\/S[1-9][0-9]*\/lab\.yaml$/
/** The placement walk (W1-T45; curriculum/D-drawers.md section 5): learner copy, read at the start of its stage. */
const PLACEMENT_FILE = /^content\/stages\/S([1-9][0-9]*)\/placement\.yaml$/
/** What the content build writes for a lesson: the page the site loads (packages/content/README.md section 2). */
const BUILT_PAGE = /^apps\/site\/public\/content\/S[1-9][0-9]*\.L[0-9]+\.[0-9a-f]{12}\.json$/
/** Learner documents with no place in the course order: the copy rules apply, the first-use rule does not. */
export const DOCUMENTS = ['labs/README.md']
/**
 * Learner-facing lab documents that are not clean yet: the same rules, with every finding a warning, so the fast lane stays
 * green and --strict fails. A document moves to DOCUMENTS once it is clean, or leaves this list if the owner rules it
 * maintainer documentation (scripts/spikes/W1-T38/README.md section 7).
 */
export const WARN_DOCUMENTS = ['labs/TOOLS.md', 'labs/AGENTS.md']

const GLOSSARY = 'content/glossary.yaml'
const posix = (p) => p.split(path.sep).join('/')

/** Every file under a directory as repository-relative paths, links skipped (they may point out of the tree). */
function walk(root, rel) {
  const dir = path.join(root, rel)
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name)
    const st = fs.lstatSync(p)
    if (st.isSymbolicLink()) continue
    if (st.isDirectory()) out.push(...walk(root, posix(path.join(rel, name))))
    else if (st.isFile()) out.push(posix(path.join(rel, name)))
  }
  return out
}

/** The first of the tree's and the repository's copies of a file that exists. */
const inTree = (root, rel) => [path.join(root, rel), path.join(REPO, rel)].find((p) => fs.existsSync(p))

function readUtf8(file) {
  const bytes = fs.readFileSync(file)
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  } catch {
    return { error: 'is not valid UTF-8' }
  }
}

/**
 * What a rule needs of the world: the content pipeline, the ID registry, the glossary, and the generators' options.
 * Returns {env, findings, notes} (the findings are the glossary's own), {glossaryBroken, findings} when the glossary is
 * too broken to use, or {error} when the gate cannot run.
 */
export async function loadEnv(root) {
  let content
  let grammar
  try {
    content = await import(pathToFileURL(path.join(REPO, 'packages', 'content', 'src', 'build', 'index.ts')).href)
    grammar = await import(pathToFileURL(path.join(REPO, 'packages', 'ids', 'src', 'grammar.ts')).href)
  } catch (e) {
    return { error: `could not load the content pipeline (packages/content) and the ID grammar (packages/ids): ${e instanceof Error ? e.message : e}` }
  }
  const registryFile = inTree(root, 'packages/ids/src/registry.json')
  const glossaryFile = inTree(root, GLOSSARY)
  const spineFile = inTree(root, 'docs/spine/SPINE.md')
  if (registryFile === undefined) return { error: 'packages/ids/src/registry.json is missing: run node scripts/build-ids.mjs' }
  if (glossaryFile === undefined) return { error: `${GLOSSARY} is missing: the gate reads the glossary from it` }
  if (spineFile === undefined) return { error: 'docs/spine/SPINE.md is missing' }
  const index = content.indexRegistry(JSON.parse(fs.readFileSync(registryFile, 'utf8')))
  const findings = []
  const notes = new Set()

  // the glossary: the file is data, and the spine decides it
  const glossaryText = readUtf8(glossaryFile)
  if (glossaryText.error !== undefined) return { error: `${GLOSSARY} ${glossaryText.error}` }
  const read = content.readYaml(glossaryText.text)
  for (const p of read.problems) if (p.severity === 'error') findings.push(finding('glossary/yaml', `${GLOSSARY}:${p.line ?? 1}`, p.message))
  const shaped = shapeGlossary(read.value)
  const glossaryAt = (pointer) => `${GLOSSARY}:${content.lineOf(read.lines, pointer) ?? 1}`
  for (const p of shaped.problems) findings.push(finding(p.rule, glossaryAt(p.pointer), p.message))
  if (shaped.glossary === null) return { findings, notes, glossaryBroken: true }
  const glossary = shaped.glossary
  const spineRows = parseSpineGlossary(fs.readFileSync(spineFile, 'utf8'))
  for (const p of checkGlossary(glossary, { spineRows, hasLesson: (id) => index.has('lesson', id), kindNames: grammar.KIND_NAMES })) {
    findings.push(finding(p.rule, glossaryAt(p.pointer), p.message))
  }

  // the pipeline's own lists are the six, or the gate says so: a seventh type is a decision, not an edit of a list
  findings.push(...pipelineDrift(content))

  // what each lesson lists, in roadmap order: a bridge introduces the knowledge components no earlier lesson lists (spine section 3.0)
  const listed = index
    .byKind('lesson')
    .map((e) => ({ at: lessonPosition(e.id), kcs: Array.isArray(e.kcs) ? e.kcs : [] }))
    .filter((l) => l.at !== null)

  const env = {
    content,
    index,
    glossary,
    scanIds: (line) => grammar.scanLine(line),
    generated: generatedOptions([root, REPO]),
    note: (n) => notes.add(n),
    counts: new Map(),
    /** The knowledge components that a lesson before this one, in roadmap order, lists. */
    kcsBefore(id) {
      const at = lessonPosition(id)
      const out = new Set()
      if (at !== null) for (const l of listed) if (comparePositions(l.at, at) < 0) for (const k of l.kcs) out.add(k)
      return out
    },
  }
  return { env, findings, notes }
}

/**
 * Run the gate over a tree. Returns {findings, notes, summary} or {error}.
 * `findings` are {check, rule, rules?, where, detail, severity} (lib/page.mjs); `notes` are lines about what the gate
 * could not read. `stubs.lintPage` stands in for the page rules, for gate.test.mjs, which needs a rule that throws.
 */
export async function runGate(root, { strict = false, stubs = {} } = {}) {
  const loaded = await loadEnv(root)
  if (loaded.error !== undefined) return loaded
  const { findings, notes } = loaded
  if (loaded.glossaryBroken) return { findings, notes: [], summary: emptySummary() }
  const { env } = loaded
  const glossary = env.glossary

  const files = [...walk(root, 'content/stages'), ...walk(root, 'content/drawers')]
  const summary = { ...emptySummary(), terms: glossary.terms.length, internal: glossary.internal.length }
  const lint = async (rel, kind, run, severity = 'error') => {
    const r = readUtf8(path.join(root, rel))
    if (r.error !== undefined) return findings.push(finding('read/utf8', `${rel}:1`, r.error, severity))
    try {
      findings.push(...(await run(r.text)).findings)
    } catch (e) {
      findings.push(finding('read/crash', `${rel}:1`, `the gate failed on this file (${kind}): ${e instanceof Error ? e.stack?.split('\n').slice(0, 3).join(' | ') : e}`))
    }
  }
  const page = stubs.lintPage ?? lintPage
  for (const rel of files.filter((f) => LESSON_FILE.test(f))) {
    summary.lessons += 1
    await lint(rel, 'lesson', (text) => page({ text, file: rel, kind: 'lesson', env }))
  }
  for (const rel of files.filter((f) => DRAWER_FILE.test(f))) {
    summary.drawers += 1
    await lint(rel, 'drawer', (text) => page({ text, file: rel, kind: 'drawer', env }))
  }
  for (const rel of files.filter((f) => STAGE_FILE.test(f))) {
    summary.stages += 1
    await lint(rel, 'stage record', (text) => lintRecord({ text, file: rel, env }))
  }
  for (const rel of files.filter((f) => LAB_FILE.test(f))) {
    summary.labs += 1
    await lint(rel, 'lab record', (text) => lintRecord({ text, file: rel, env }))
  }
  // the placement walk sits at the start of its stage; S1's closes Boot and comes before S1.L1, so it uses Boot's terms (spine section 3.1)
  for (const rel of files.filter((f) => PLACEMENT_FILE.test(f))) {
    const n = Number(PLACEMENT_FILE.exec(rel)[1])
    summary.placements += 1
    await lint(rel, 'placement record', (text) => lintRecord({ text, file: rel, env, at: [n, 0], boot: n === 1 }))
  }
  // the lessons the site loads, once a build has written them: the rail is titles and nothing else
  for (const rel of walk(root, 'apps/site/public/content').filter((f) => BUILT_PAGE.test(f))) {
    summary.built += 1
    await lint(rel, 'built page', (text) => lintBuilt({ text, file: rel, env }))
  }
  for (const rel of DOCUMENTS) {
    if (!fs.existsSync(path.join(root, rel))) continue
    summary.documents += 1
    await lint(rel, 'document', (text) => lintDocument({ text, file: rel, env }))
  }
  for (const rel of WARN_DOCUMENTS) {
    if (!fs.existsSync(path.join(root, rel))) continue
    summary.warnDocuments += 1
    await lint(rel, 'document', (text) => lintDocument({ text, file: rel, env, severity: 'warn' }), 'warn')
  }

  // at most six content block types in W1-W2, counted over every page (V2-18)
  summary.blockTypes = Object.fromEntries([...env.counts].sort(([a], [b]) => (a < b ? -1 : 1)))
  if (env.counts.size > SIX_BLOCK_TYPES.length) findings.push(finding('block-type/count', 'content/stages:1', `${env.counts.size} block types are in use (${[...env.counts.keys()].join(', ')}): W1-W2 content uses at most six (V2-18)`))

  // what the gate could not read, said plainly; --strict makes it a failure
  const missing = [...notes].filter((n) => n.startsWith('generator-missing:')).map((n) => n.slice('generator-missing:'.length)).sort()
  summary.generatorsMissing = missing
  const lines = []
  if (summary.lessons + summary.drawers + summary.stages + summary.labs + summary.placements === 0) lines.push(`no lesson, drawer, stage, lab or placement file under ${root === REPO ? 'content/' : posix(path.relative(REPO, root)) || '.'}: nothing to lint yet`)
  if (missing.length > 0) lines.push(`the rail rule read only the authored options of ${missing.join(', ')}: no generator module yet (packages/generators/src/<family>/index.ts)`)
  if (strict) {
    for (const family of missing) findings.push(finding('generators/missing', `packages/generators/src/${family.replace(/^GEN-/, '')}/index.ts:1`, `the generator of ${family} is not built, so the rail rule cannot read the options its items show (--strict)`))
    if (summary.lessons + summary.drawers === 0) findings.push(finding('read/empty', 'content/stages:1', 'no lesson or drawer to lint (--strict)'))
  }
  findings.sort(byPlace)
  return { findings, notes: lines, summary }
}

/** Findings in reading order: by file, then by line (numerically), then as they were found. */
function byPlace(a, b) {
  const [fa, la] = splitWhere(a.where)
  const [fb, lb] = splitWhere(b.where)
  return fa < fb ? -1 : fa > fb ? 1 : la - lb
}
const splitWhere = (where) => {
  const m = /^(.*):([0-9]+)$/.exec(where)
  return m === null ? [where, 0] : [m[1], Number(m[2])]
}

function emptySummary() {
  return { lessons: 0, drawers: 0, stages: 0, labs: 0, placements: 0, documents: 0, warnDocuments: 0, built: 0, terms: 0, internal: 0, blockTypes: {}, generatorsMissing: [] }
}

/** The findings that fail the run: errors, and warnings under --strict. */
export const failing = (findings, strict) => findings.filter((f) => f.severity === 'error' || strict)

const USAGE = 'usage: node scripts/verify-lessons.mjs [--strict] [--json] [--root DIR]... [--self-check]'

/** The status a report earns: 0 green, 1 findings that fail the run. */
const statusOf = (result, strict) => (failing(result.findings, strict).length === 0 ? 0 : 1)

/** A report as text: each finding, each note, and the summary line. Returns the status. */
function printText(result, strict) {
  for (const f of result.findings) console.log(`${f.severity === 'warn' ? 'warn' : 'fail'} ${f.check.padEnd(10)} ${f.where}: ${f.detail}`)
  for (const n of result.notes) console.log(`note: ${n}`)
  const s = result.summary
  const types = Object.entries(s.blockTypes).map(([t, n]) => `${t} ${n}`).join(', ')
  const read = `${s.lessons} lessons, ${s.drawers} drawers, ${s.stages} stage, ${s.labs} lab and ${s.placements} placement records, ${s.documents} documents, ${s.warnDocuments} warn-only documents, ${s.built} built pages; ${s.terms} glossary terms, ${s.internal} internal names; ${Object.keys(s.blockTypes).length} of 6 block types in use${types === '' ? '' : ` (${types})`}`
  const bad = failing(result.findings, strict)
  console.log(bad.length === 0 ? `GATE-lessons: green (${read})` : `GATE-lessons: ${bad.length} finding(s) (${read})`)
  return statusOf(result, strict)
}

async function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    const lines = fs.readFileSync(SCRIPT, 'utf8').split('\n').slice(1)
    console.log(lines.slice(0, lines.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
    return 0
  }
  const known = new Set(['--strict', '--json', '--root', '--self-check'])
  const roots = []
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root') {
      if (argv[i + 1] === undefined || argv[i + 1].startsWith('--')) {
        console.error(`${USAGE}\n--root needs a directory`)
        return 2
      }
      roots.push(argv[i + 1])
      i += 1
    } else if (!known.has(argv[i])) {
      console.error(`${USAGE}\nunknown argument: ${argv[i]}`)
      return 2
    }
  }
  if (argv.includes('--self-check')) {
    const { selfCheck } = await import(pathToFileURL(path.join(REPO, 'scripts', 'spikes', 'W1-T38', 'lib', 'self-check.mjs')).href)
    const loaded = await loadEnv(REPO)
    if (loaded.env === undefined) {
      console.error(`GATE-lessons self-check: the gate cannot run on this repository: ${loaded.error ?? 'its glossary is broken'}`)
      return 1
    }
    const { results, copy, error } = await selfCheck({ repo: REPO, script: SCRIPT, env: loaded.env })
    if (error !== undefined) {
      console.error(`GATE-lessons self-check: ${error}`)
      return 1
    }
    for (const r of results) console.log(`${r.caught ? 'caught' : 'MISSED'}  ${r.check.padEnd(10)} ${r.name} [${r.rules.join(', ')}]${r.caught ? '' : `: ${r.detail}`}`)
    for (const c of copy.corpora) {
      console.log(`${c.wrong.length === 0 ? 'held  ' : 'BROKEN'}  corpus     fixtures/copy/${c.file}: ${c.rows - c.wrong.length} of ${c.rows} rows as marked`)
      for (const w of c.wrong) console.log(`        ${w}`)
    }
    const m = copy.matrix
    console.log(`${m.missed.length === 0 ? 'held  ' : 'BROKEN'}  matrix     the lock rule's vocabulary in each frame: ${m.sentences - m.policy - m.missed.length} of ${m.sentences - m.policy} sentences flagged (${m.policy} that say the policy are not judged)`)
    for (const s of m.missed) console.log(`        not flagged: ${s}`)
    const missed = results.filter((r) => !r.caught)
    const broken = copy.corpora.some((c) => c.wrong.length > 0) || m.missed.length > 0
    const rules = new Set(results.flatMap((r) => r.rules)).size
    console.log(
      missed.length === 0 && !broken
        ? `GATE-lessons self-check: all ${results.length} planted faults caught, each with every rule it names (${rules} rules); the copy corpora and the vocabulary matrix hold`
        : `GATE-lessons self-check: ${missed.length} of ${results.length} planted faults missed${broken ? '; the copy corpora or the vocabulary matrix do not hold' : ''}`,
    )
    return missed.length === 0 && !broken ? 0 : 1
  }
  // a tree that is not there is a mistake in the call, not a tree with nothing to lint
  for (const r of roots) {
    if (!fs.existsSync(path.resolve(r)) || !fs.statSync(path.resolve(r)).isDirectory()) {
      console.error(`GATE-lessons could not run: --root ${r} is not a directory`)
      return 2
    }
  }
  const strict = argv.includes('--strict')
  const json = argv.includes('--json')
  // several trees: each is checked on its own, one after the other (the self-check plants one fault in each)
  if (roots.length > 1) {
    const reports = []
    for (const root of roots.map((r) => path.resolve(r))) {
      const result = await runGate(root, { strict })
      if (result.error !== undefined) reports.push({ root, status: 2, error: result.error })
      else reports.push({ root, status: statusOf(result, strict), summary: result.summary, findings: result.findings, notes: result.notes })
    }
    if (json) console.log(JSON.stringify({ strict, reports }))
    else {
      for (const r of reports) {
        console.log(`== ${r.root}`)
        if (r.error !== undefined) console.log(`GATE-lessons could not run: ${r.error}`)
        else printText(r, strict)
      }
    }
    return Math.max(...reports.map((r) => r.status))
  }
  const root = roots.length === 1 ? path.resolve(roots[0]) : REPO
  const result = await runGate(root, { strict })
  if (result.error !== undefined) {
    if (json) console.log(JSON.stringify({ error: result.error }))
    else console.error(`GATE-lessons could not run: ${result.error}`)
    return 2
  }
  if (json) {
    console.log(JSON.stringify({ strict, summary: result.summary, findings: result.findings, notes: result.notes }, null, 2))
    return statusOf(result, strict)
  }
  return printText(result, strict)
}

/**
 * Exit with a status once stdout and stderr have taken everything written to them. A pipe can take a write
 * asynchronously, and process.exit() drops what is still queued: on a busy machine a long report came out cut short,
 * and a --json report cut short does not parse (the self-check reads one for each batch of planted copies).
 */
export function exitWhenWritten(code) {
  process.exitCode = code
  let left = 2
  const done = () => {
    left -= 1
    if (left === 0) process.exit(code)
  }
  process.stdout.write('', done)
  process.stderr.write('', done)
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT) {
  main(process.argv.slice(2)).then(
    (code) => exitWhenWritten(code),
    (e) => {
      console.error(`GATE-lessons could not run: ${e instanceof Error ? e.stack : e}`)
      exitWhenWritten(2)
    },
  )
}
