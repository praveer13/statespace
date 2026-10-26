// node scripts/spikes/W1-T38/words.mjs [LIST...]
//
// Takes each word out of each list the copy rules are built from, one word at a time, in a scratch copy of the gate, and
// reports every word whose removal `node scripts/verify-lessons.mjs --self-check` would not notice: the corpora and the
// vocabulary matrix still hold (lib/corpus.mjs), and every lock, pressure and reward plant is still caught. A list is a
// constant of lib/copy.mjs whose pattern is a choice of words (ACCESS, OPENS_WIDE, TIME_LATER, ...): its words are the
// alternatives of its first group that has two or more. A word it reports needs a row of fixtures/copy/ that the word
// alone makes lock copy or pressure, or it is dead and comes out of its list.
//
// Not a gate and not a test: it starts one process for each list, three at a time, and takes about two minutes. It exits 0
// when every word is pinned and 1 when one is not. The determiners before a thing (DET, DET_TOKEN) are not among the
// lists: a token takes the determiners before a thing itself, so a word taken out of either changes what a frame reads
// only in a phrase of three determiners or more (README section 6).

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { exitWhenWritten } from '../../verify-lessons.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..', '..')
const COPY = path.join(HERE, 'lib', 'copy.mjs')

/** The lists of lib/copy.mjs that the lock, pressure and reward rules are built from. */
export const LISTS = [
  // what a learner can open, and the words that point at it
  'ID', 'STRONG', 'WEAK', 'POINT', 'WEAK_PHRASE', 'REST', 'CONTENT_WORD', 'NEXT_ONE', 'TA',
  // the access, the opening, the progress and the conditions
  'ACCESS', 'OPENS_BARE', 'OPENS', 'OPENS_WIDE', 'WAITS', 'CLOSED', 'DO', 'DONE', 'DONE_WIDE', 'DONE_PART', 'DO_PURPOSE', 'DO_MOVE', 'ACHIEVE', 'MOVE_ON',
  'AFTER', 'AFTER_PROGRESS_T', 'PROGRESS', 'IF_DONE', 'AS_YOU_GO', 'CANT', 'NEG_ACCESS', 'GRANTED', 'THEN', 'LEARNER_WAIT', 'LOCK_LABEL',
  // times
  'WEEKDAY_L', 'FEW_L', 'MONTH_L', 'DATE_L', 'TIME_LATER', 'TIME_WHEN', 'TIME_SOME',
  // the pressure rules
  'WEEKDAY', 'FEW', 'PRACTICE', 'PILE', 'SOON',
]

/** The end of the group that opens at `open` in `text` (an index of its closing parenthesis), or -1. */
function groupEnd(text, open) {
  let depth = 0
  let inClass = false
  for (let i = open; i < text.length; i += 1) {
    const c = text[i]
    if (c === '\\') i += 1
    else if (c === '$' && text[i + 1] === '{') i = text.indexOf('}', i)
    else if (inClass) inClass = c !== ']'
    else if (c === '[') inClass = true
    else if (c === '(') depth += 1
    else if (c === ')') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

/** The alternatives of a group's body at its top level, as [start, end] offsets into the body. */
function alternatives(body) {
  const out = []
  let depth = 0
  let inClass = false
  let start = 0
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i]
    if (c === '\\') i += 1
    else if (c === '$' && body[i + 1] === '{') i = body.indexOf('}', i)
    else if (inClass) inClass = c !== ']'
    else if (c === '[') inClass = true
    else if (c === '(') depth += 1
    else if (c === ')') depth -= 1
    else if (c === '|' && depth === 0) {
      out.push([start, i])
      start = i + 1
    }
  }
  return [...out, [start, body.length]]
}

/**
 * A list of the source: the body of the first group of `const NAME = ...` that has two or more alternatives. The
 * definition runs to the next statement at the start of a line, so one written over several lines (LEARNER_WAIT) is read.
 */
export function listOf(source, name) {
  const at = source.search(new RegExp(`^const ${name} = `, 'm'))
  if (at < 0) return null
  const next = source.slice(at + 1).search(/\n(?:const |export |function |\/\*\*|\/\/)/)
  const stop = next < 0 ? source.length : at + 1 + next
  for (let open = source.indexOf('(?:', at); open >= 0 && open < stop; open = source.indexOf('(?:', open + 1)) {
    const end = groupEnd(source, open)
    if (end < 0) continue
    const body = source.slice(open + 3, end)
    const parts = alternatives(body)
    if (parts.length >= 2) return { start: open + 3, end, words: parts.map(([a, b]) => body.slice(a, b)), parts }
  }
  return null
}

/** The source with word k of the list taken out, and the bar beside it. */
export function without(source, list, k) {
  const body = source.slice(list.start, list.end)
  const [a, b] = list.parts[k]
  const rest = k === 0 ? body.slice(list.parts[1][0]) : body.slice(0, list.parts[k - 1][1]) + body.slice(b)
  return source.slice(0, list.start) + rest + source.slice(list.end)
}

/** A scratch copy of the gate: its own files copied, the rest of the repository linked. */
function mirror(base, name) {
  const dir = path.join(base, name)
  fs.mkdirSync(path.join(dir, 'scripts', 'spikes'), { recursive: true })
  for (const e of fs.readdirSync(REPO)) if (e !== 'scripts' && !e.startsWith('.')) fs.symlinkSync(path.join(REPO, e), path.join(dir, e))
  fs.copyFileSync(path.join(REPO, 'scripts', 'verify-lessons.mjs'), path.join(dir, 'scripts', 'verify-lessons.mjs'))
  fs.cpSync(HERE, path.join(dir, 'scripts', 'spikes', 'W1-T38'), { recursive: true })
  return dir
}

/** Whether --self-check, run on the mirror, would catch what was done to it: the corpora and the matrix, then the plants. */
async function caught(dir) {
  const lib = path.join(dir, 'scripts', 'spikes', 'W1-T38', 'lib')
  const gate = await import(pathToFileURL(path.join(dir, 'scripts', 'verify-lessons.mjs')).href)
  const { checkCopyCorpora } = await import(pathToFileURL(path.join(lib, 'corpus.mjs')).href)
  const { PLANTS, scratchTree } = await import(pathToFileURL(path.join(lib, 'plants.mjs')).href)
  const { judge } = await import(pathToFileURL(path.join(lib, 'self-check.mjs')).href)
  const { env } = await gate.loadEnv(dir)
  const copy = checkCopyCorpora(env)
  if (copy.corpora.some((c) => c.wrong.length > 0) || copy.matrix.missed.length > 0) return true
  for (const plant of PLANTS.filter((p) => p.rules.some((r) => /^(?:lock|pressure|reward)\//.test(r)))) {
    const tree = scratchTree(dir)
    try {
      plant.apply(tree, dir)
      const r = await gate.runGate(tree, { strict: plant.strict === true })
      if (!judge(plant, gate.failing(r.findings, plant.strict === true).length > 0 ? 1 : 0, r.findings).caught) return true
    } finally {
      fs.rmSync(tree, { recursive: true, force: true })
    }
  }
  return false
}

/** One list, in this process: each word taken out in a mirror of its own. Prints one line for each word not pinned. */
async function checkList(name) {
  const source = fs.readFileSync(COPY, 'utf8')
  const list = listOf(source, name)
  if (list === null) throw new Error(`lib/copy.mjs has no list ${name}`)
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-lessons-words-'))
  let pinned = 0
  try {
    for (let k = 0; k < list.words.length; k += 1) {
      const dir = mirror(base, `w${k}`)
      fs.writeFileSync(path.join(dir, 'scripts', 'spikes', 'W1-T38', 'lib', 'copy.mjs'), without(source, list, k))
      if (await caught(dir)) pinned += 1
      else console.log(`NOT PINNED  ${name} #${k + 1}: ${list.words[k]}`)
    }
  } finally {
    fs.rmSync(base, { recursive: true, force: true })
  }
  console.log(`${pinned === list.words.length ? 'pinned' : 'open  '}      ${name}: ${pinned} of ${list.words.length} words`)
}

/** Every list, three processes at a time. Returns the exit status. */
async function main(names) {
  const queue = [...names]
  const lines = []
  const worker = async () => {
    while (queue.length > 0) {
      const name = queue.shift()
      const out = await new Promise((resolve) => {
        const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--list', name], { stdio: ['ignore', 'pipe', 'pipe'] })
        let text = ''
        child.stdout.setEncoding('utf8').on('data', (d) => (text += d))
        child.stderr.setEncoding('utf8').on('data', (d) => (text += d))
        child.on('close', (status) => resolve({ name, text, status }))
      })
      lines.push(out)
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, names.length) }, worker))
  lines.sort((a, b) => names.indexOf(a.name) - names.indexOf(b.name))
  let open = 0
  for (const { name, text, status } of lines) {
    process.stdout.write(text)
    if (status !== 0 || /^NOT PINNED/m.test(text)) open += 1
    if (status !== 0 && !/^NOT PINNED/m.test(text)) console.log(`failed      ${name} (exit ${status})`)
  }
  console.log(open === 0 ? `every word of the ${names.length} lists is pinned` : `${open} of ${names.length} lists have a word that is not pinned`)
  return open === 0 ? 0 : 1
}

// each exit waits for the output to be written: a line a child prints and loses would be a word reported pinned
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  if (args[0] === '--list') {
    checkList(args[1]).then(
      () => exitWhenWritten(0),
      (e) => {
        console.error(e instanceof Error ? e.stack : e)
        exitWhenWritten(2)
      },
    )
  } else {
    main(args.length > 0 ? args : LISTS).then((code) => exitWhenWritten(code))
  }
}
