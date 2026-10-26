#!/usr/bin/env node
// Goal Replay: goal strips for the S2 and S3 Lean cells, read from real Lean 4.35.0 elaboration in the bench image
// through the language server's `$/lean/plainGoal` request (W0-S10's decision; INS-goal-replay, W2-T03 happy path).
//
// For every `:::instrument ins=INS-goal-replay` cell in content/stages/S2 and S3 it takes the cell's first ```lean
// fence, finds a source that elaborates it (a committed run input that contains the cell's text, the cell alone,
// or the cell after the lesson's earlier cells), and asks Lean for the goals at the start of each tactic and at the
// end of each tactic proof. The anchors say where to look and never what Lean answers: every goal in a strip is
// Lean's output. A cell whose candidates all fail to elaborate keeps its strip with Lean's messages; a cell with no
// tactic proof gets no strip and keeps its messages (a `#print axioms` or `#eval` cell).
//
// Usage: node scripts/build-goal-replay.mjs [--out runs/RUN-goal-replay] [--image <name@digest>] [--twice]
//                                           [--record] [--timeout-s 600]
//   --twice   generate twice (two cold servers) and require byte-identical bundles
//   --record  also write runs/RUN-goal-replay.json (run@1) and refresh runs/index.json
//
// Writes <out>/goal-strips.json (the bundle the instrument origin serves; scripts/instruments/fetch-engines.mjs pins
// it by SHA-256) and <out>/goal-strips.txt (a text view for review). No timestamp, path or timing enters either.
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { withLeanServer } from './spikes/W0-S10/lib/lean-server.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RUN_ID = 'RUN-goal-replay'
const IMAGE = 'statespace-bench@sha256:701be043775cc261e84a92fe985ef94d524617fdb3d53e2255187932d2ec0f9a'
const PINNED = '4.35.0'
const SCHEMA = 'statespace/goal-strips@1'
const REQUEST = '$/lean/plainGoal'
const STAGES = ['S2', 'S3']
const CONTEXT_ERRORS = /Unknown (identifier|constant|namespace)|Function expected|Invalid field notation|has no definition|unexpected token/
const SEVERITY = { 1: 'error', 2: 'warning', 3: 'information', 4: 'hint' }

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex')
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/')

/** The text the site shows and the worker hashes: LF, no trailing blanks, no trailing blank lines. */
export const normalise = (text) => text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').replace(/\n+$/, '')

// ------------------------------------------------------------------------------------------------ cells

/** Every Goal Replay cell of S2 and S3, with its first lean fence. */
export function readCells() {
  const cells = []
  for (const stage of STAGES) {
    const dir = path.join(ROOT, 'content/stages', stage)
    const files = fs.readdirSync(dir).filter((f) => /^S\d+\.L\d+\.md$/.test(f))
    files.sort((a, b) => Number(a.split('.L')[1].split('.')[0]) - Number(b.split('.L')[1].split('.')[0]))
    for (const f of files) {
      const lesson = f.replace(/\.md$/, '')
      const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n')
      for (let i = 0; i < lines.length; i++) {
        const m = /^:::instrument\s+(.*)$/.exec(lines[i])
        if (m === null || !/\bins=INS-goal-replay\b/.test(m[1])) continue
        const attrs = Object.fromEntries([...m[1].matchAll(/(\w+)=(\S+)/g)].map((x) => [x[1], x[2]]))
        let j = i + 1
        while (j < lines.length && lines[j] !== ':::' && !/^```lean\s*$/.test(lines[j])) j++
        if (j >= lines.length || lines[j] === ':::') continue
        const body = []
        for (j++; j < lines.length && lines[j] !== '```'; j++) body.push(lines[j])
        cells.push({ lesson, file: rel(path.join(dir, f)), cell: Number(attrs.cell), recorded: attrs.recorded ?? null, text: normalise(body.join('\n')) })
      }
    }
  }
  return cells
}

/** Every committed Lean run input: the sources a cell may have been elaborated in. */
function runInputs() {
  const out = []
  const runs = path.join(ROOT, 'runs')
  for (const d of fs.readdirSync(runs).sort()) {
    const inputs = path.join(runs, d, 'inputs')
    if (!fs.existsSync(inputs) || !fs.statSync(inputs).isDirectory()) continue
    for (const f of fs.readdirSync(inputs).sort()) if (f.endsWith('.lean')) out.push({ path: rel(path.join(inputs, f)), text: normalise(fs.readFileSync(path.join(inputs, f), 'utf8')), run: d })
  }
  return out
}

/** Candidate sources for a cell, in the order tried. `offset` is the source line where the cell's line 0 sits. */
function candidates(cell, earlier, inputs) {
  const out = []
  const own = inputs.filter((x) => x.run === cell.recorded)
  for (const x of [...own, ...inputs.filter((y) => y.run !== cell.recorded)]) {
    const at = x.text.indexOf(cell.text)
    if (at < 0) continue
    if (at > 0 && x.text[at - 1] !== '\n') continue
    out.push({ kind: 'run-input', path: x.path, text: x.text, offset: x.text.slice(0, at).split('\n').length - 1 })
  }
  out.push({ kind: 'cell', text: cell.text, offset: 0 })
  if (earlier.length > 0) {
    const prelude = earlier.map((c) => c.text).join('\n\n')
    out.push({ kind: 'after-earlier-cells', cells: earlier.map((c) => c.cell), text: `${prelude}\n\n${cell.text}`, offset: prelude.split('\n').length + 1 })
  }
  return out
}

// ------------------------------------------------------------------------------------------------ anchors

const stripComment = (l) => {
  const i = l.indexOf('--')
  return i < 0 ? l : l.slice(0, i)
}
const indentOf = (l) => l.length - l.trimStart().length
const BY = /(?<![\w'.])by(?![\w'.!?])/g
const DECL = /^(?:@\[[^\]]*\]\s*)?(?:private\s+|protected\s+|noncomputable\s+)*(theorem|lemma|example|def|abbrev|instance)\b\s*([^\s:({[⦃]*)/

/**
 * The tactic proofs of a cell, each with its steps: where each tactic starts (0-based line and UTF-16
 * character, in cell coordinates) and where the proof ends. Pure; no Lean.
 */
export function proofsOf(cellText) {
  const lines = cellText.split('\n')
  const decls = []
  for (let i = 0; i < lines.length; i++) {
    const m = DECL.exec(lines[i])
    if (m === null) continue
    let end = i
    for (let k = i + 1; k < lines.length; k++) {
      if (lines[k] !== '' && !/^\s/.test(lines[k])) break
      end = k
    }
    decls.push({ kind: m[1], name: m[2] !== '' ? m[2] : `${m[1]} at line ${i + 1}`, start: i, end })
  }
  const proofs = []
  for (const d of decls) {
    let by = null
    for (let i = d.start; i <= d.end && by === null; i++) {
      const code = stripComment(lines[i])
      BY.lastIndex = 0
      const m = BY.exec(code)
      if (m !== null) by = { line: i, col: m.index }
    }
    if (by === null) continue
    const head = stripComment(lines[by.line])
    const termBy = !/:=\s*$/.test(head.slice(0, by.col)) // `⟨30, by decide⟩`: closers after the block are the term's
    const trimClose = (s) => (termBy ? s.replace(/[⟩)\]}]+$/, '').trimEnd() : s)
    const steps = []
    const rest = head.slice(by.col + 2)
    let last = null
    if (rest.trim() !== '') {
      const t = trimClose(rest.trim())
      const col = by.col + 2 + (rest.length - rest.trimStart().length)
      steps.push({ tactic: t, line: by.line, character: col })
      last = { line: by.line, character: col + t.length }
    } else {
      let first = -1
      for (let i = by.line + 1; i <= d.end; i++) if (stripComment(lines[i]).trim() !== '') { first = i; break }
      if (first >= 0) {
        const stack = [indentOf(lines[first])]
        let opens = false
        for (let i = first; i <= d.end; i++) {
          const code = stripComment(lines[i]).trimEnd()
          if (code.trim() === '') continue
          const dd = indentOf(code)
          while (stack.length > 0 && dd < stack[stack.length - 1]) stack.pop()
          if (stack.length === 0) break
          let start = dd === stack[stack.length - 1]
          if (dd > stack[stack.length - 1]) {
            if (opens) { stack.push(dd); start = true } else start = false
          }
          last = { line: i, character: trimClose(code).length }
          if (!start) continue
          let t = code.trim()
          let col = dd
          opens = /(=>|(?<![\w'.])by|(?<![\w'.])with)$/.test(t)
          // a bullet focuses one goal: read at the tactic after it
          const bullet = /^[·.]\s+/.exec(t)
          if (bullet !== null) {
            col += bullet[0].length
            t = t.slice(bullet[0].length)
            opens = true
          }
          // `| cons x xs ih => tac`, `case h => tac`, `next h => tac`: read at the tactic after `=>`
          if (/^(\||case\s|next\s)/.test(t)) {
            const arrow = t.indexOf('=>')
            if (arrow < 0) continue
            const after = t.slice(arrow + 2)
            if (after.trim() === '') { opens = true; continue }
            col += arrow + 2 + (after.length - after.trimStart().length)
            t = after.trim()
            opens = /(=>|(?<![\w'.])by|(?<![\w'.])with)$/.test(t)
          }
          steps.push({ tactic: trimClose(t), line: i, character: col })
        }
      }
    }
    if (steps.length === 0 || last === null) continue
    proofs.push({ decl: d.name, kind: d.kind, start: d.start, end: d.end, steps, endAt: last })
  }
  return proofs
}

// ------------------------------------------------------------------------------------------------ generation

const diagOf = (raw, offset, lineCount) =>
  raw
    .map((d) => ({ severity: SEVERITY[d.severity] ?? String(d.severity), line: d.range.start.line - offset, character: d.range.start.character, text: d.message.replace(/\r\n/g, '\n') }))
    .filter((d) => d.line >= 0 && d.line < lineCount)
    .sort((a, b) => a.line - b.line || a.character - b.character || (a.text < b.text ? -1 : a.text > b.text ? 1 : 0))

async function generate({ image, timeoutS }) {
  const cells = readCells()
  const inputs = runInputs()
  const work = fs.mkdtempSync(path.join(process.env.W0S11_SCRATCH ?? os.tmpdir(), 'ss-goal-'))
  let toolchain = null
  let argv = null
  const out = []
  try {
    await withLeanServer({ image, leanBin: 'lean', leanOptions: [], corpus: work, mounts: [], cpusetCpus: null, timeoutS }, async (server, info) => {
      toolchain = info.toolchain
      argv = info.argv
      if (!toolchain.banner.includes(`version ${PINNED},`)) throw new Error(`the image reports ${toolchain.banner}; Goal Replay pins Lean ${PINNED}`)
      let k = 0
      for (const cell of cells) {
        const earlier = cells.filter((c) => c.lesson === cell.lesson && c.cell < cell.cell)
        const lineCount = cell.text.split('\n').length
        let chosen = null
        const tried = []
        for (const cand of candidates(cell, earlier, inputs)) {
          const file = `Cell${++k}.lean`
          const raw = await server.open(file, `${cand.text}\n`)
          const all = raw.map((d) => ({ severity: SEVERITY[d.severity] ?? String(d.severity), line: d.range.start.line }))
          const errors = all.filter((d) => d.severity === 'error').length
          const outside = all.filter((d) => d.severity === 'error' && (d.line < cand.offset || d.line >= cand.offset + lineCount)).length
          tried.push({ kind: cand.kind, ...(cand.path !== undefined ? { path: cand.path } : {}), errors })
          const score = { cand, file, raw, errors, outside }
          if (chosen === null || (chosen.errors > 0 && (errors < chosen.errors || (errors === chosen.errors && outside < chosen.outside)))) {
            if (chosen !== null) server.notify('textDocument/didClose', { textDocument: { uri: `file:///w/${chosen.file}` } })
            chosen = score
          } else server.notify('textDocument/didClose', { textDocument: { uri: `file:///w/${file}` } })
          if (errors === 0) break
        }
        const { cand, file, raw } = chosen
        const strips = []
        for (const p of proofsOf(cell.text)) {
          const states = []
          for (const s of p.steps) {
            const goals = await server.plainGoal(file, s.line + cand.offset, s.character)
            states.push({ when: 'before', tactic: s.tactic, line: s.line, character: s.character, goals })
          }
          const endGoals = await server.plainGoal(file, p.endAt.line + cand.offset, p.endAt.character)
          states.push({ when: 'end', tactic: null, line: p.endAt.line, character: p.endAt.character, goals: endGoals })
          strips.push({ decl: p.decl, kind: p.kind, lines: [p.start, p.end], states })
        }
        server.notify('textDocument/didClose', { textDocument: { uri: `file:///w/${file}` } })
        const messages = diagOf(raw, cand.offset, lineCount)
        // Errors that say the cell's context is missing (the S3 stage template): the goals would be Lean's, but
        // about a context the lesson does not have, so the cell keeps Lean's messages and no strip.
        const needsContext = chosen.errors > 0 && messages.some((m) => m.severity === 'error' && CONTEXT_ERRORS.test(m.text))
        if (needsContext) strips.length = 0
        out.push({
          lesson: cell.lesson,
          cell: cell.cell,
          lesson_file: cell.file,
          recorded: cell.recorded,
          text_sha256: sha256(cell.text),
          lines: lineCount,
          source:
            cand.kind === 'run-input'
              ? { kind: 'run-input', path: cand.path, sha256: sha256(`${cand.text}\n`), offset: cand.offset }
              : cand.kind === 'cell'
                ? { kind: 'cell', sha256: sha256(`${cand.text}\n`) }
                : { kind: 'after-earlier-cells', cells: cand.cells, sha256: sha256(`${cand.text}\n`), offset: cand.offset },
          elaborated: chosen.errors === 0 ? 'clean' : needsContext ? 'needs-context' : 'with-errors',
          errors: chosen.errors,
          tried,
          strips,
          messages,
        })
        console.log(`goal-replay: ${cell.lesson} cell ${cell.cell}: ${strips.length} strip(s), ${strips.reduce((n, s) => n + s.states.length, 0)} states, ${chosen.errors} error(s), source ${cand.kind}${cand.path ? ` ${cand.path}` : ''}`)
      }
    })
  } finally {
    fs.rmSync(work, { recursive: true, force: true })
  }
  const bundle = {
    schema: SCHEMA,
    run: RUN_ID,
    request: REQUEST,
    image,
    toolchain: { version: PINNED, banner: toolchain.banner, binary_sha256: toolchain.binarySha256 },
    note: 'Every goal is Lean output from $/lean/plainGoal at the start of a tactic (before it runs) or at the end of a proof. null: Lean reported no goal information there. Lines and characters are 0-based, in the cell text.',
    cells: out,
  }
  return { bundle, argv }
}

const goalLines = (goals, indent) => {
  if (goals === null) return [`${indent}(no goal information)`]
  if (goals.length === 0) return [`${indent}no goals`]
  return goals.flatMap((g, k) => [...(goals.length > 1 ? [`${indent}goal ${k + 1} of ${goals.length}`] : []), ...g.split('\n').map((l) => `${indent}${goals.length > 1 ? '  ' : ''}${l}`)])
}

export function textView(bundle) {
  const out = [`Goal Replay strips · ${bundle.toolchain.banner}`, `${bundle.request} in ${bundle.image}`, '']
  for (const c of bundle.cells) {
    out.push(`== ${c.lesson} cell ${c.cell} (${c.elaborated}${c.errors > 0 ? `, ${c.errors} error(s)` : ''}; source ${c.source.kind}${c.source.path ? ` ${c.source.path}` : ''})`)
    for (const s of c.strips) {
      out.push(`-- ${s.kind} ${s.decl}`)
      s.states.forEach((st, i) => {
        out.push(`[${i}] ${st.when === 'end' ? 'end of proof' : `before \`${st.tactic}\``}   (line ${st.line + 1}, character ${st.character})`, ...goalLines(st.goals, '    '))
      })
    }
    for (const m of c.messages) out.push(`${m.severity} at line ${m.line + 1}: ${m.text.split('\n')[0]}`)
    out.push('')
  }
  return `${out.join('\n').trimEnd()}\n`
}

// ------------------------------------------------------------------------------------------------ main

function arg(flag, dflt) {
  const i = process.argv.indexOf(flag)
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : dflt
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = path.resolve(ROOT, arg('--out', `runs/${RUN_ID}`))
  const image = arg('--image', IMAGE)
  const timeoutS = Number(arg('--timeout-s', '600'))
  const startedAt = new Date()
  const t0 = performance.now()
  const first = await generate({ image, timeoutS })
  const json = `${JSON.stringify(first.bundle, null, 2)}\n`
  const t1 = performance.now()
  let identical = null
  if (process.argv.includes('--twice')) {
    const second = await generate({ image, timeoutS })
    identical = `${JSON.stringify(second.bundle, null, 2)}\n` === json
    console.log(`goal-replay: second cold generation ${identical ? 'byte-identical' : 'DIFFERS'}`)
    if (!identical) process.exit(1)
  }
  fs.mkdirSync(out, { recursive: true })
  const txt = textView(first.bundle)
  fs.writeFileSync(path.join(out, 'goal-strips.json'), json)
  fs.writeFileSync(path.join(out, 'goal-strips.txt'), txt)
  const cells = first.bundle.cells
  const nStrips = cells.reduce((n, c) => n + c.strips.length, 0)
  const nStates = cells.reduce((n, c) => n + c.strips.reduce((m, s) => m + s.states.length, 0), 0)
  const clean = cells.filter((c) => c.elaborated === 'clean').length
  const summary = `${cells.length} cells, ${nStrips} strips, ${nStates} states; ${clean} cells elaborate cleanly`
  console.log(`goal-replay: ${summary}; bundle sha256 ${sha256(json)}`)
  if (process.argv.includes('--record')) {
    const fileRec = (p, role) => {
      const buf = fs.readFileSync(path.join(ROOT, p))
      return { path: p, sha256: sha256(buf), bytes: buf.length, role }
    }
    const tc = first.bundle.toolchain
    const lessonFiles = [...new Set(cells.map((c) => c.lesson_file))]
    const sources = [...new Set(cells.filter((c) => c.source.kind === 'run-input').map((c) => c.source.path))]
    const record = {
      id: RUN_ID,
      title: `Goal Replay strips for the S2 and S3 Lean cells, read through $/lean/plainGoal from Lean ${PINNED} in the bench image: ${summary}`,
      task: 'W2-T03',
      origin: 'recorded',
      records: 'the goal before each tactic and at the end of each tactic proof, for every INS-goal-replay cell of S2 and S3, as the instrument origin serves them to the cell stepper',
      engine: 'lean',
      version: PINNED,
      version_string: tc.banner,
      binary: `bin/lean of the Lean ${PINNED} toolchain in the statespace-bench image, run as lean --server`,
      binary_sha256: tc.binary_sha256,
      image,
      recorded_at: new Date().toISOString(),
      started_at: startedAt.toISOString(),
      duration_s: Math.round(t1 - t0) / 1000,
      argv: [['node', 'scripts/build-goal-replay.mjs', ...process.argv.slice(2)], first.argv.split(' ')],
      inputs: [fileRec('scripts/build-goal-replay.mjs', 'generator'), fileRec('scripts/spikes/W0-S10/lib/lean-server.mjs', 'language-server client'), ...lessonFiles.map((p) => fileRec(p, 'lesson')), ...sources.map((p) => fileRec(p, 'source'))],
      budget: { memory: '6g', network: 'none', timeout_s: timeoutS, workers: 1 },
      exit_code: 0,
      verdict_lines: [tc.banner, `goal-replay: ${summary}`, ...(identical === null ? [] : [`goal-replay: second cold generation ${identical ? 'byte-identical' : 'DIFFERS'}`])],
      outputs: [fileRec(`${rel(out)}/goal-strips.json`, 'bundle served on the instrument origin'), fileRec(`${rel(out)}/goal-strips.txt`, 'text view')],
      values: { cells: cells.length, strips: nStrips, states: nStates, clean_cells: clean, identical_twice: identical },
      environment: { os: `${os.type()} ${os.release()}`, cpu_count: os.cpus().length, ram_gib: Math.round(os.totalmem() / 2 ** 30 * 10) / 10, cpu_architecture: os.arch() === 'x64' ? 'x86_64' : os.arch(), node: process.version },
      notes: [
        'Each goal is Lean output; the generator chooses only where to ask (the start of each tactic and the end of each tactic proof).',
        'A cell is elaborated in the first source that elaborates without errors: a committed run input containing the cell text, the cell alone, or the cell after its lesson\'s earlier cells. A cell that elaborates only with errors keeps its strips and Lean\'s messages (elaborated: with-errors: the failure is the lesson\'s point); a cell whose errors say its context is missing (the S3 stage template) keeps Lean\'s messages and no strip (elaborated: needs-context).',
        'The bundle is what scripts/instruments/fetch-engines.mjs pins for the goal-replay engine; no Lean runs in the browser.',
      ],
    }
    fs.writeFileSync(path.join(ROOT, 'runs', `${RUN_ID}.json`), `${JSON.stringify(record, null, 2)}\n`)
    execFileSync('node', [path.join(ROOT, 'scripts/runs/build-index.mjs')], { stdio: 'inherit' })
  }
}
