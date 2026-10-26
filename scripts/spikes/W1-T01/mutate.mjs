#!/usr/bin/env node
// Which rules of GATE-stamps and GATE-codes could be removed without their self-checks noticing? Two analyses, both
// on a scratch copy of the repository (node_modules linked), never on the tree itself:
//
//   sinks  every place a gate records a finding (fail(), report(), flag(), or a push of {…, detail}) is tagged with
//          its line, every planted fault runs once against the tagged gate, and a finding site counts as covered when
//          some plant expects a finding that only that site makes: removing the site would leave the plant missed.
//   mutate every alternative of every regular expression in a gate's rules is removed in turn, and so is each change
//          a list file names (`--mutants FILE`, a module exporting [name, gate, [[from, to], …]]); each mutant must turn
//          the tree red or leave some planted fault missed (the plants are planted once and read by every mutant), and
//          one that does neither survives: a weakening the self-check does not notice.
//
//   node scripts/spikes/W1-T01/mutate.mjs sinks [--gate stamps|codes] [--work DIR]
//   node scripts/spikes/W1-T01/mutate.mjs mutate [--gate stamps|codes] [--mutants FILE [--listed-only]] [--only TEXT] [--match REGEX] [--match-any FILE] [--skip REGEX] [--all] [--jobs N]
//
// --skip leaves out the regular expressions on lines it matches: lists of exemptions, whose entries a mutant can only
// remove, which makes the gate stricter.
//
// It prints the finding sites no plant covers, or the mutants that survive. A helper, not a gate.

import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..', '..')
const GATES = { stamps: 'scripts/verify-stamps.mjs', codes: 'scripts/verify-codes.mjs' }
const argv = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : fallback
}
const mode = argv[0]
const work = path.resolve(opt('--work', path.join(os.tmpdir(), 'w1t01-mutate')))
const jobs = Number(opt('--jobs', '4'))

/** A scratch root: the repository's files without its heavy folders, node_modules linked. */
function scratchRoot() {
  const root = path.join(work, 'root')
  fs.mkdirSync(root, { recursive: true })
  const r = spawnSync('rsync', ['-a', '--delete', '--exclude', '/node_modules', '--exclude', '/.git', '--exclude', '/bench', '--exclude', '/.cache', '--exclude', '/scripts/spikes', '--exclude', 'dist', `${REPO}/`, `${root}/`], { stdio: 'inherit' })
  if (r.status !== 0) throw new Error('rsync failed')
  const link = path.join(root, 'node_modules')
  if (!fs.existsSync(link)) fs.symlinkSync(path.join(REPO, 'node_modules'), link)
  return root
}

function run(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (b) => (stdout += b))
    child.stderr.on('data', (b) => (stderr += b))
    child.on('close', (status) => resolve({ status, stdout, stderr }))
  })
}

async function pool(items, n, fn) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const k = next++
        out[k] = await fn(items[k], k)
      }
    }),
  )
  return out
}

// ------------------------------------------------------------------ sinks
/**
 * The gate's text with every finding site tagged: the detail of each fail(), report() and flag() call, and of each
 * pushed {…, detail}, gains " ⟦L<line>⟧". Sites in the self-check (after its section marker) are left alone.
 */
function tagSinks(text, rel) {
  const ts = createRequire(path.join(REPO, 'package.json'))('typescript')
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const stop = text.indexOf('// ------------------------------------------------------------------ self-check')
  const edits = []
  const tag = (node) => {
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
    edits.push({ at: node.getEnd(), insert: `) + ' ⟦L${line}⟧'` })
    edits.push({ at: node.getStart(sf), insert: '((' })
    edits.push({ at: node.getEnd(), insert: ')', after: true })
    return line
  }
  const sites = new Map()
  const visit = (node) => {
    if (stop >= 0 && node.getStart(sf) > stop) return
    if (ts.isCallExpression(node)) {
      const callee = node.expression
      const args = node.arguments
      if (ts.isIdentifier(callee) && /^(?:fail|report|flag)$/.test(callee.text) && args.length >= 2) {
        const line = tag(args[args.length - 1])
        sites.set(line, sf.text.split('\n')[line - 1].trim())
      }
      if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'push' && args[0] && ts.isObjectLiteralExpression(args[0])) {
        const detail = args[0].properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(sf) === 'detail')
        if (detail) {
          const line = tag(detail.initializer)
          sites.set(line, sf.text.split('\n')[line - 1].trim())
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  // apply from the end, so earlier offsets stay valid; at one offset, closing text goes after the tag
  edits.sort((a, b) => b.at - a.at || (a.after ? -1 : 1))
  let out = text
  for (const e of edits) out = out.slice(0, e.at) + e.insert + out.slice(e.at)
  return { text: out, sites }
}

const TAG = / ⟦L(\d+)⟧/g

async function sinks(gate) {
  const root = scratchRoot()
  const rel = GATES[gate]
  const original = fs.readFileSync(path.join(REPO, rel), 'utf8')
  const { text, sites } = tagSinks(original, rel)
  const tagged = path.join(root, rel)
  fs.writeFileSync(tagged, text)
  const tree = await run([tagged, '--json'])
  if (tree.status !== 0) throw new Error(`the tagged gate is not green on the scratch tree: ${tree.stdout.slice(0, 1500)}${tree.stderr.slice(0, 1500)}`)
  const mod = await import(pathToFileURL(tagged).href)
  const copy = mod.copyTree ?? null
  if (!copy) throw new Error(`${rel} exports no copyTree`)
  const results = await pool(mod.PLANTS, jobs, async ([name, expect, plant]) => {
    const dir = fs.mkdtempSync(path.join(work, 'plant-'))
    try {
      copy(root, dir)
      plant(dir)
      const r = await run([tagged, '--root', dir, '--json'])
      const findings = JSON.parse(r.stdout).findings ?? []
      // a control (`!check`) expects no finding, so it depends on no finding site
      const list = (typeof expect === 'string' ? [[expect, null, null]] : expect).filter(([check]) => !check.startsWith('!'))
      // for each expectation: the tags each matching finding carries
      return {
        name,
        expectations: list.map(([check, where, detail]) => findings.filter((f) => f.check === check && (where === null || (where instanceof RegExp ? where.test(f.where) : f.where === where)) && (detail === null || detail.test(String(f.detail)))).map((f) => new Set([...String(f.detail).matchAll(TAG)].map((m) => Number(m[1]))))),
      }
    } catch (e) {
      return { name, error: e instanceof Error ? e.message : String(e), expectations: [] }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
  const covered = new Map()
  for (const r of results) {
    if (r.error) console.log(`plant failed: ${r.name}: ${r.error}`)
    for (const matches of r.expectations) {
      if (matches.length === 0) {
        console.log(`plant not caught even untagged: ${r.name}`)
        continue
      }
      // a site that every matching finding passed through is one this expectation needs
      const common = [...matches[0]].filter((l) => matches.every((m) => m.has(l)))
      for (const l of common) covered.set(l, [...(covered.get(l) ?? []), r.name])
    }
  }
  const uncovered = [...sites.keys()].filter((l) => !covered.has(l)).sort((a, b) => a - b)
  console.log(`${rel}: ${sites.size} finding sites, ${sites.size - uncovered.length} covered by a plant, ${uncovered.length} not`)
  for (const l of uncovered) console.log(`  L${l}: ${sites.get(l).slice(0, 170)}`)
}

// ------------------------------------------------------------------ mutate
/**
 * Mutants of a gate: every alternative of every regular expression in its rules (outside the self-check) removed in
 * turn, and the mutants of a list file (`--mutants FILE`: [name, gate, [[from, to], …]]). Removing an alternative from
 * a list of exemptions makes the gate stricter, not weaker; such a mutant either turns the tree red (killed) or changes
 * nothing a plant shows, and is read as such in the report.
 */
function regexMutants(text, rel) {
  const ts = createRequire(path.join(REPO, 'package.json'))('typescript')
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const stop = text.indexOf('// ------------------------------------------------------------------ self-check')
  const out = []
  const visit = (node) => {
    if (stop >= 0 && node.getStart(sf) > stop) return
    const skip = opt('--skip', null)
    const lineText = () => text.split('\n')[sf.getLineAndCharacterOfPosition(node.getStart(sf)).line]
    if (node.kind === ts.SyntaxKind.RegularExpressionLiteral && !(skip && new RegExp(skip).test(lineText()))) {
      const lit = node.getText(sf)
      const end = lit.lastIndexOf('/')
      const body = lit.slice(1, end)
      const flags = lit.slice(end + 1)
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
      // the groups of the pattern (the whole pattern counts as one), with their top-level alternatives
      const groups = [{ from: 0, to: body.length, bars: [] }]
      const stack = [groups[0]]
      let cls = false
      for (let i = 0; i < body.length; i += 1) {
        const c = body[i]
        if (c === '\\') {
          i += 1
          continue
        }
        if (cls) {
          if (c === ']') cls = false
          continue
        }
        if (c === '[') cls = true
        else if (c === '(') {
          let from = i + 1
          const prefix = /^\?(?::|=|!|<=|<!|<[A-Za-z_]\w*>)/.exec(body.slice(i + 1))
          if (prefix) from += prefix[0].length
          const g = { from, to: -1, bars: [] }
          groups.push(g)
          stack.push(g)
        } else if (c === ')') {
          const g = stack.pop()
          if (g) g.to = i
        } else if (c === '|') stack[stack.length - 1].bars.push(i)
      }
      for (const g of groups) {
        if (g.bars.length === 0 || g.to < 0) continue
        const cuts = [g.from - 1, ...g.bars, g.to]
        for (let k = 0; k + 1 < cuts.length; k += 1) {
          const a = cuts[k] + 1
          const b = cuts[k + 1]
          const alt = body.slice(a, b)
          // drop the alternative and one bar beside it
          const mutated = k === 0 ? body.slice(0, a) + body.slice(b + 1) : body.slice(0, cuts[k]) + body.slice(b)
          out.push({ name: `L${line} ${lit.slice(0, 60)}${lit.length > 60 ? '…' : ''} without "${alt.slice(0, 40)}"`, from: lit, to: `/${mutated}/${flags}`, start: node.getStart(sf) })
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out.map((m) => ({ ...m, text: text.slice(0, m.start) + m.to + text.slice(m.start + m.from.length) }))
}

async function mutate(gate, file, only) {
  // --match-any FILE: only the mutants whose names hold one of the file's lines
  const anyOf = opt('--match-any', null) ? fs.readFileSync(opt('--match-any'), 'utf8').split('\n').filter((l) => l !== '') : null
  const root = scratchRoot()
  const rel = GATES[gate]
  const original = fs.readFileSync(path.join(REPO, rel), 'utf8')
  const listed = file ? (await import(pathToFileURL(path.resolve(file)).href)).default.filter(([, g]) => g === gate) : []
  const mutants = [
    ...(file && argv.includes('--listed-only') ? [] : regexMutants(original, rel)),
    ...listed.map(([name, , edits]) => ({ name, text: edits.every(([from]) => original.includes(from)) ? edits.reduce((acc, [from, to]) => acc.split(from).join(to), original) : null })),
  ].filter((m) => (only === undefined || m.name.includes(only)) && (opt('--match', null) === null || new RegExp(opt('--match')).test(m.name)) && (anyOf === null || anyOf.some((s) => m.name.includes(s))))
  // every plant planted once, in its own copy, which every mutant then reads
  const mod = await import(pathToFileURL(path.join(root, rel)).href)
  const planted = []
  for (const [name, expect, plant] of mod.PLANTS) {
    const dir = fs.mkdtempSync(path.join(work, 'planted-'))
    mod.copyTree(root, dir)
    plant(dir)
    planted.push({ name, expect, dir })
  }
  // the plants that killed earlier mutants run first: a sibling mutant is usually killed by the same plant
  const order = planted.map((_, i) => i)
  const results = await pool(mutants, jobs, async (m, k) => {
    if (m.text === null) return { name: m.name, verdict: 'EDIT-MISS' }
    const copy = path.join(root, path.dirname(rel), `mutant-${k}-${path.basename(rel)}`)
    fs.writeFileSync(copy, m.text)
    try {
      const tree = await run([copy, '--json'], { TMPDIR: work })
      if (tree.status !== 0) return { name: m.name, verdict: 'killed', by: `the tree is no longer green (exit ${tree.status})` }
      for (const i of [...order]) {
        const p = planted[i]
        const r = await run([copy, '--root', p.dir, '--json'], { TMPDIR: work })
        let findings = null
        try {
          findings = JSON.parse(r.stdout).findings
        } catch {
          findings = null
        }
        if (r.status !== 1 || !findings || mod.unmetExpectations(findings, p.expect).length > 0) {
          order.splice(order.indexOf(i), 1)
          order.unshift(i)
          return { name: m.name, verdict: 'killed', by: p.name }
        }
      }
      return { name: m.name, verdict: 'SURVIVES' }
    } finally {
      fs.rmSync(copy, { force: true })
    }
  })
  for (const p of planted) fs.rmSync(p.dir, { recursive: true, force: true })
  const survivors = results.filter((r) => r.verdict !== 'killed')
  for (const r of argv.includes('--all') ? results : survivors) console.log(`${r.verdict.padEnd(9)} ${r.name}${r.by ? ` :: ${r.by}` : ''}`)
  console.log(`${rel}: ${results.length} mutants, ${results.length - survivors.length} killed, ${survivors.length} not`)
}

if (mode === 'sinks') {
  for (const gate of opt('--gate', null) ? [opt('--gate')] : Object.keys(GATES)) await sinks(gate)
} else if (mode === 'mutate') {
  for (const gate of opt('--gate', null) ? [opt('--gate')] : Object.keys(GATES)) await mutate(gate, opt('--mutants', null), opt('--only', undefined))
} else {
  console.log('usage: mutate.mjs sinks [--gate stamps|codes] [--work DIR] | mutate [--gate stamps|codes] [--mutants FILE [--listed-only]] [--only TEXT] [--all] [--work DIR] [--jobs N]')
  process.exit(2)
}
