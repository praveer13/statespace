// Reading the lines of a run for the label (DESIGN.md section 6.5): where a query's verdict line is, whether its witness
// replayed, what an Optimize query minimized, which constraints an unsat core holds, and a model split into its
// assignments. The solver's own verdicts are read by @statespace/stamps' parser, the one that GATE-stamps holds to
// the spine, so the label and a stamp never read a line two ways. Pure: no DOM, storage, clock or network.

import { ParseError, parseSolverLines } from '@statespace/stamps'
import type { SolverLine } from '@statespace/stamps'

/** The prefix the budget harness puts before a line: `2806ms py: rlimit-case unknown canceled 1.1 s`. */
const HARNESS_PREFIX = /^\d+(?:\.\d+)?m?s py:\s+/

/**
 * Whether a line is the first line of a query's block: at the left margin, and beginning `[query]` (the harnesses
 * of W0 and W1), `query ` or `query:` (the Pyodide harnesses' `recipient-wrap sat ...`, `timeout-case (...): ...`),
 * once the harness's prefix is removed. A continuation line is indented, so it never starts a block.
 */
export function startsQuery(line: string, query: string): boolean {
  if (query === '' || /^\s/.test(line)) return false
  const body = line.replace(HARNESS_PREFIX, '')
  return body.startsWith(`[${query}]`) || body.startsWith(`${query} `) || body.startsWith(`${query}:`)
}

export type Located = { readonly ok: true; readonly lines: readonly string[] } | { readonly ok: false; readonly problem: string }

/**
 * The block of one query: its first line and the indented lines that follow it, verbatim. Exactly one line of the run
 * may start the query, because a name that fits two lines would let a label read another query's answer.
 */
export function locateBlock(runLines: readonly string[], query: string): Located {
  const starts: number[] = []
  runLines.forEach((line, i) => {
    if (startsQuery(line, query)) starts.push(i)
  })
  if (starts.length === 0) return { ok: false, problem: `no verdict line of the run begins with the query ${JSON.stringify(query)}` }
  if (starts.length > 1) return { ok: false, problem: `${starts.length} verdict lines of the run begin with the query ${JSON.stringify(query)}; a query names one` }
  const start = starts[0] as number
  let end = start + 1
  while (end < runLines.length && /^\s/.test(runLines[end] as string)) end += 1
  return { ok: true, lines: runLines.slice(start, end) }
}

export type Replay = 'replayed' | 'failed' | 'pending'

const REPLAY = /(?:^|\s)replay (ok|FAILED):/

/**
 * Whether the lines say their witness replayed: a line that says `replay ok:` (and none that says `replay FAILED:`).
 * The W1 Z3 runs print one under every sat query, and RUN-specimens-replay prints one per witness it replays.
 */
export function replayOf(lines: readonly string[]): Replay {
  const verdicts = lines.map((l) => REPLAY.exec(l)?.[1]).filter((v): v is string => v !== undefined)
  if (verdicts.includes('FAILED')) return 'failed'
  return verdicts.includes('ok') ? 'replayed' : 'pending'
}

/** The solver's reading of a block, or null when the lines carry no verdict (a harness note, a run that never returned). */
export function readVerdict(lines: readonly string[]): SolverLine | null {
  try {
    return parseSolverLines(lines)
  } catch (e) {
    if (e instanceof ParseError) return null
    throw e
  }
}

/** Split a string at the commas outside brackets, parentheses and braces. */
function splitTop(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const c of s) {
    if (c === '[' || c === '(' || c === '{') depth += 1
    else if (c === ']' || c === ')' || c === '}') depth -= 1
    if (c === ',' && depth === 0) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  if (cur.trim() !== '') out.push(cur)
  return out
}

/** A model as the solver printed it, `[b = 0, amount = 1, a = 0]`, in its assignments, in the order printed. */
export function modelPairs(model: string): [string, string][] {
  let inner = model.trim()
  if (inner.startsWith('[') && inner.endsWith(']')) inner = inner.slice(1, -1)
  const pairs: [string, string][] = []
  for (const part of splitTop(inner)) {
    const eq = part.indexOf('=')
    if (eq > 0) pairs.push([part.slice(0, eq).trim(), part.slice(eq + 1).trim()])
  }
  return pairs
}

/**
 * The `name=value` tokens that open a replay line, between `replay ok:` and the next colon (`a=0 b=0 amount=1`), by
 * name: the values the replay checked, which the label compares with the witness it prints.
 */
export function replayedValues(lines: readonly string[]): Map<string, string> {
  const values = new Map<string, string>()
  for (const line of lines) {
    const header = /replay ok:\s*([^:]*):/.exec(line)?.[1]
    if (header === undefined) continue
    for (const m of header.matchAll(/(?:^|\s)([A-Za-z_][A-Za-z0-9_]*)=(-?[0-9]+)(?![0-9A-Za-z_.])/g)) if (!values.has(m[1] as string)) values.set(m[1] as string, m[2] as string)
  }
  return values
}

/**
 * The length of a witness in steps, read from the model that states it and never typed. The course's Z3 harnesses write
 * the state after step k with k primes, as D-04's primed variables do (`a′` is `a_p`, `a″` is `a_pp`), so a model whose
 * longest chain is `merchant_pp` describes two steps: S, S′ and S″. A model with no primed name is one transfer, one step.
 * A chain named another way is not read and counts as 1, which is why a record that states a longer length is refused
 * (the resolver compares the two) and the label never takes the length from the record.
 */
export function witnessSteps(model: string): number {
  let steps = 1
  for (const [name] of modelPairs(model)) {
    const primes = /_(p+)$/.exec(name)?.[1]
    if (primes !== undefined) steps = Math.max(steps, primes.length)
  }
  return steps
}

/** Whether a query's lines say it ran under an explicit Optimize objective: the harness's own words for it. */
export function isOptimizeBlock(lines: readonly string[]): boolean {
  return /\bOptimi[sz]e\b|\bminimum\b/i.test(lines.join('\n'))
}

/** What the lines print after `minimum`: `minimum h = 1` is the objective `h` reaching 1. Null when they print none. */
export function printedMinimum(lines: readonly string[]): { readonly objective: string; readonly value: string } | null {
  const m = /\bminimum\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(-?[0-9]+)(?![0-9A-Za-z_.])/.exec(lines.join('\n'))
  return m === null ? null : { objective: m[1] as string, value: m[2] as string }
}

/**
 * The value an Optimize query reached for its objective: `minimum h = 1` where the W1 harness prints it, and else the
 * objective's value in the model (the W0 harness prints only the model). Null when the lines hold neither, and null when
 * they print the minimum of another objective: the model's value of a variable that was not minimized is no minimum.
 */
export function readMinimum(lines: readonly string[], objective: string): string | null {
  const printed = printedMinimum(lines)
  if (printed !== null) return printed.objective === objective ? printed.value : null
  const verdict = readVerdict(lines)
  if (verdict?.verdict !== 'sat' || verdict.model === undefined) return null
  return modelPairs(verdict.model).find(([name]) => name === objective)?.[1] ?? null
}

export interface Core {
  /** The names of the core's members, as the harness tracked them. */
  readonly members: readonly string[]
  /** The harness checked that the core alone is unsat and that dropping any one member leaves it sat. */
  readonly minimal: boolean
}

/** An unsat core as the harness prints it: `unsat_core=['a', 'b']`, then its own check of the core. Null when there is none. */
export function readCore(lines: readonly string[]): Core | null {
  const text = lines.join('\n')
  const m = /\bunsat_core=\[([^\]]*)\]/.exec(text)
  if (!m) return null
  const members = (m[1] as string)
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter((s) => s !== '')
  const minimal = /core check: the core alone is unsat; dropping any one member leaves it sat/.test(text)
  return { members, minimal }
}
