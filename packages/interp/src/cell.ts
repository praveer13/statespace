// The S3 lesson cells of INS-interp: a small text format for states, calls, policies and commands, run through the
// reference semantics. A cell holds, one per line:
//
//   policy   zero = reject · self = allow · guard = error · overflow = unbounded
//   before   <policy> / after <policy>        the same calls under two policies
//   start    mint -100 · a 100 · b 0            a state; values may be written 2^63 - 1
//   Transfer(a, b, 30)                         a call of the reference program (or `call Transfer(...)`)
//   1   hold 30 on a                           one operation on its own; `h` is the last hold opened
//   command ...                                a command in the toy syntax: typechecked, and callable after
//
// `--` starts a comment. Account names are user accounts, except `mint` and `sink`.

import type { Acct, Call, Cmd, Effect, Outcome, Policy, Program, State, Val } from './ir.ts'
import { MAX_BAL, REFERENCE_POLICY } from './ir.ts'
import { execTraced, inv, typecheck } from './semantics.ts'
import { REF_PROGRAM } from './program.ts'
import { parseCommand, parseProgram } from './toy.ts'

const showAcct = (a: Acct): string => (a.tag === 'user' ? a.name : a.tag === 'escrow' ? `escrow ${a.hold}` : a.tag)

const acctOf = (name: string): Acct => (name === 'mint' ? { tag: 'mint' } : name === 'sink' ? { tag: 'sink' } : { tag: 'user', name })

/** A number as the cells write it: `30`, `-100`, `2^63 - 1`, `-(2^63 - 1)`. */
export function readNumber(text: string): bigint {
  const t = text.replace(/\s+/g, '')
  const neg = t.startsWith('-(') && t.endsWith(')')
  const body = neg ? t.slice(2, -1) : t
  const m = /^(-?)(?:(\d+)\^(\d+))?([+-]\d+)?$|^(-?\d+)$/.exec(body)
  if (m === null) throw new Error(`not a number: ${text}`)
  let v: bigint
  if (m[5] !== undefined) v = BigInt(m[5])
  else v = (m[1] === '-' ? -1n : 1n) * BigInt(m[2] ?? '0') ** BigInt(m[3] ?? '1') + BigInt(m[4] ?? '0')
  return neg ? -v : v
}

function readState(text: string): State {
  const bals = text.split('·').map((part) => {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s+(.+?)\s*$/.exec(part)
    if (m === null) throw new Error(`not a balance: ${part.trim()}`)
    return { acct: acctOf(m[1]!), bal: readNumber(m[2]!).toString() }
  })
  return { bals, holds: [], nextHold: 0, frozen: [] }
}

function readPolicy(text: string): Policy {
  const kv = new Map(text.split('·').map((p) => p.split('=').map((x) => x.trim()) as [string, string]))
  const overflow = kv.get('overflow') ?? 'unbounded'
  return {
    zero: (kv.get('zero') ?? 'reject') as Policy['zero'],
    self: (kv.get('self') ?? 'allow') as Policy['self'],
    guard: (kv.get('guard') ?? 'error') as Policy['guard'],
    overflow: overflow === 'bounded' ? { mode: 'bounded', maxBal: MAX_BAL.toString() } : { mode: 'unbounded' },
  }
}

const showPolicy = (p: Policy): string => `zero = ${p.zero} · self = ${p.self} · guard = ${p.guard} · overflow = ${p.overflow.mode}`

function readArg(text: string, lastHold: number): Val {
  const t = text.trim()
  if (/^-?\d/.test(t) || /\^/.test(t)) return { tag: 'int', value: readNumber(t).toString() }
  if (t === 'true' || t === 'false') return { tag: 'bool', value: t === 'true' }
  if (t === 'h') return { tag: 'hold', hold: lastHold }
  return { tag: 'acct', acct: acctOf(t) }
}

export function showState(s: State): string {
  const parts = s.bals.map((b) => `${showAcct(b.acct)} ${b.bal}`)
  for (const h of s.holds) parts.push(`hold ${h.id}: ${h.amount} of ${showAcct(h.owner)}, ${h.status}`)
  for (const a of s.frozen) parts.push(`${showAcct(a)} frozen`)
  return parts.join(' · ')
}

const showEffect = (e: Effect): string => `notify ${showAcct(e.acct)}`

export function showOutcome(o: Outcome): string {
  if ('ok' in o) {
    const extra = [...o.ok.output.map((h) => `output [${h}]`), ...o.ok.effects.map(showEffect)]
    return `ok · ${showState(o.ok.state)}${extra.length ? ' · ' + extra.join(' · ') : ''}`
  }
  const e = o.error
  const arg = 'name' in e ? ` "${e.name}"` : 'param' in e ? ` "${e.param}"` : 'acct' in e ? ` ${showAcct(e.acct)}` : 'hold' in e ? ` ${e.hold}` : ''
  return `${e.tag}${arg}`
}

const STEP_WORDS = ['', 'the command exists', 'the arguments decode', 'the accounts exist', 'the self-transfer rule', 'the guard', 'the run-time checks', 'the postings', 'the effects']

export interface CellLine {
  readonly kind: 'typing' | 'call' | 'op' | 'note'
  readonly text: string
}

/** Run one lesson cell and return what the view prints, line by line. */
export function runCell(text: string): CellLine[] {
  const out: CellLine[] = []
  const lines = text.split('\n').map((l) => l.replace(/--.*$/, '').trimEnd())
  let policies: Policy[] = [REFERENCE_POLICY]
  let state: State | null = null
  let program: Program = REF_PROGRAM
  let lastHold = 0
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!.trim()
    i++
    if (line === '') continue
    if (line.startsWith('command ')) {
      const block = [line]
      while (i < lines.length && lines[i]!.trim() !== '' && !/^(start|policy|before|after|command|call)\b/.test(lines[i]!.trim()) && !/^[A-Z][A-Za-z]*\(/.test(lines[i]!.trim())) {
        block.push(lines[i]!)
        i++
      }
      const cmd: Cmd = parseCommand(block.join('\n'))
      const v = typecheck(cmd)
      out.push({ kind: 'typing', text: `${cmd.name}: ${'ok' in v ? 'type-checks' : `rejected by ${v.error}`}` })
      program = { commands: [...program.commands.filter((c) => c.name !== cmd.name), cmd] }
      continue
    }
    const kw = /^(policy|before|after|start)\s+(.*)$/.exec(line)
    if (kw !== null) {
      if (kw[1] === 'start') {
        state = readState(kw[2]!)
        out.push({ kind: 'note', text: `start  ${showState(state)}` })
      } else if (kw[1] === 'policy') policies = [readPolicy(kw[2]!)]
      else if (kw[1] === 'before') policies = [readPolicy(kw[2]!)]
      else policies = [...policies.slice(0, 1), readPolicy(kw[2]!)]
      continue
    }
    const callM = /^(?:call\s+|\d+\s+)?([A-Z][A-Za-z0-9_]*)\((.*)\)$/.exec(line)
    if (callM !== null && state !== null) {
      const args = callM[2]!.trim() === '' ? [] : callM[2]!.split(',').map((a) => readArg(a, lastHold))
      const call: Call = { name: callM[1]!, args }
      for (const pol of policies) {
        const t = execTraced(pol, program, call, state)
        const where = policies.length > 1 || pol !== REFERENCE_POLICY ? `  under ${showPolicy(pol)}` : ''
        out.push({ kind: 'call', text: `${line}  →  ${showOutcome(t.outcome)}  [decided at step ${t.step}: ${STEP_WORDS[t.step]}]${where}` })
      }
      continue
    }
    const opM = /^(\d+)\s+(.*)$/.exec(line)
    if (opM !== null && state !== null) {
      const body = opM[2]!
      const holdName = /\bh\b/.test(body)
      const cmdText = `command Op${opM[1]}(${holdName ? 'h: hold, ' : ''}${[...new Set(body.match(/\b(?!h\b|hold\b|on\b|to\b|from\b|move\b|deposit\b|capture\b|release\b)[a-z][a-z0-9_]*\b/g) ?? [])].map((a) => `${a}: account`).join(', ')}) do ${body}`.replace('(, ', '(').replace(', )', ')')
      const { commands } = parseProgram(cmdText)
      const cmd = commands[0]!
      const args: Val[] = cmd.params.map((p) => (p.ty === 'hold' ? { tag: 'hold', hold: lastHold } : { tag: 'acct', acct: acctOf(p.name) }))
      const t = execTraced(policies[0]!, { commands: [cmd] }, { name: cmd.name, args }, state)
      out.push({ kind: 'op', text: `${opM[1]}  ${body}  →  ${showOutcome(t.outcome)}` })
      if ('ok' in t.outcome) {
        state = t.outcome.ok.state
        const opened = t.outcome.ok.output[0]
        if (opened !== undefined) lastHold = opened
        const i2 = inv(state)
        out.push({ kind: 'note', text: `   total ${i2.total} · ${i2.nonneg ? 'no account but the mint below zero' : 'an account is below zero'}` })
      }
      continue
    }
    out.push({ kind: 'note', text: `not read: ${line}` })
  }
  return out
}
