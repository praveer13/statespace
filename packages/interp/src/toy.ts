// The course's front end for Mini-Plinth's toy syntax: text to IR@1, with each untyped parameter's type inferred
// from its uses (curriculum/S03-semantics.md section 2.1). The roadmap's text reads verbatim:
//
//   entity Account; command Transfer(from, to, amount); requires balance(from) >= amount; do move amount from from to to.
//
// The lesson cells write the same language over several lines, with typed parameters and without the semicolons.
// Semicolons and the final period are optional; a command with no `requires` has the guard `0 >= 0`, which always
// holds. `from`, `to` and `on` are keywords only where an operation expects them, so they also name parameters.
//
// Every error names its line and column, as `line 2, column 14: ...`.

import type { Cmd, Expr, Param, Program, Stmt, Ty } from './ir.ts'

export class ParseError extends Error {
  readonly line: number
  readonly column: number
  constructor(line: number, column: number, message: string) {
    super(`line ${line}, column ${column}: ${message}`)
    this.line = line
    this.column = column
  }
}

interface Tok {
  readonly kind: 'ident' | 'int' | 'sym' | 'eof'
  readonly text: string
  readonly line: number
  readonly column: number
}

const SYMS = [':=', '>=', '&&', '(', ')', ',', ';', ':', '.', '!', '+', '-', '=']
const RESERVED = new Set(['entity', 'command', 'requires', 'do', 'move', 'deposit', 'hold', 'capture', 'release', 'set', 'force', 'balance', 'frozen'])
const TYPES: readonly Ty[] = ['account', 'amount', 'hold', 'int', 'bool']

function lex(text: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  let line = 1
  let col = 1
  while (i < text.length) {
    const c = text[i]!
    if (c === '\n') {
      i++
      line++
      col = 1
      continue
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      i++
      col++
      continue
    }
    if (text.startsWith('--', i)) {
      while (i < text.length && text[i] !== '\n') i++
      continue
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i
      while (j < text.length && /[A-Za-z0-9_]/.test(text[j]!)) j++
      out.push({ kind: 'ident', text: text.slice(i, j), line, column: col })
      col += j - i
      i = j
      continue
    }
    if (/[0-9]/.test(c)) {
      let j = i
      while (j < text.length && /[0-9]/.test(text[j]!)) j++
      out.push({ kind: 'int', text: text.slice(i, j), line, column: col })
      col += j - i
      i = j
      continue
    }
    const sym = SYMS.find((s) => text.startsWith(s, i))
    if (sym === undefined) throw new ParseError(line, col, `unexpected character ${JSON.stringify(c)}`)
    out.push({ kind: 'sym', text: sym, line, column: col })
    i += sym.length
    col += sym.length
  }
  out.push({ kind: 'eof', text: '', line, column: col })
  return out
}

class Parser {
  private readonly toks: Tok[]
  private i = 0
  constructor(text: string) {
    this.toks = lex(text)
  }
  private get t(): Tok {
    return this.toks[this.i]!
  }
  private next(): Tok {
    const t = this.t
    if (t.kind !== 'eof') this.i++
    return t
  }
  private is(text: string): boolean {
    return (this.t.kind === 'sym' || this.t.kind === 'ident') && this.t.text === text
  }
  private accept(text: string): boolean {
    if (!this.is(text)) return false
    this.next()
    return true
  }
  private err(message: string, at: Tok = this.t): never {
    throw new ParseError(at.line, at.column, message)
  }
  private describe(t: Tok): string {
    return t.kind === 'eof' ? 'the end of the text' : JSON.stringify(t.text)
  }
  private expect(text: string): Tok {
    if (!this.is(text)) this.err(`expected ${JSON.stringify(text)}, found ${this.describe(this.t)}`)
    return this.next()
  }
  private ident(what: string): Tok {
    const t = this.t
    if (t.kind !== 'ident' || RESERVED.has(t.text)) this.err(`expected ${what}, found ${this.describe(t)}`)
    return this.next()
  }

  program(): { readonly program: Program; readonly positions: Map<Cmd, Tok> } {
    const commands: Cmd[] = []
    const positions = new Map<Cmd, Tok>()
    while (this.t.kind !== 'eof') {
      if (this.accept('entity')) {
        const name = this.ident('an entity name')
        if (name.text !== 'Account') this.err(`only the entity Account is supported, not ${name.text}`, name)
        this.accept(';')
        continue
      }
      if (this.is('command')) {
        const at = this.t
        const c = this.command()
        if (commands.some((k) => k.name === c.name)) this.err(`a second command named ${c.name}`, at)
        commands.push(c)
        positions.set(c, at)
        continue
      }
      this.err(`expected "entity" or "command", found ${this.describe(this.t)}`)
    }
    return { program: { commands }, positions }
  }

  private command(): Cmd {
    this.expect('command')
    const name = this.ident('a command name')
    this.expect('(')
    const params: { name: string; ty: Ty | null; at: Tok }[] = []
    if (!this.is(')')) {
      do {
        const p = this.ident('a parameter name')
        let ty: Ty | null = null
        if (this.accept(':')) {
          const t = this.t
          if (t.kind !== 'ident') this.err(`expected a type, found ${this.describe(t)}`)
          this.next()
          if (!TYPES.includes(t.text as Ty)) this.err(`${t.text} is not a type; the types are ${TYPES.join(', ')}`, t)
          ty = t.text as Ty
        }
        params.push({ name: p.text, ty, at: p })
      } while (this.accept(','))
    }
    this.expect(')')
    this.accept(';')
    let guard: Expr = { tag: 'ge', a: { tag: 'lit', value: '0' }, b: { tag: 'lit', value: '0' } }
    if (this.accept('requires')) {
      guard = this.expr()
      this.accept(';')
    }
    this.expect('do')
    const body = this.stmt()
    this.accept('.')
    this.accept(';')
    return { name: name.text, params: inferParams(params, guard, body), guard, body }
  }

  private stmt(): Stmt {
    const t = this.t
    if (this.accept('force')) {
      this.expect('move')
      const amount = this.expr()
      this.expect('from')
      const from = this.expr()
      this.expect('to')
      return { tag: 'forceMove', amount, from, to: this.expr() }
    }
    if (this.accept('move')) {
      const amount = this.expr()
      this.expect('from')
      const from = this.expr()
      this.expect('to')
      return { tag: 'op', op: { tag: 'move', amount, from, to: this.expr() } }
    }
    if (this.accept('deposit')) {
      const amount = this.expr()
      this.expect('to')
      return { tag: 'op', op: { tag: 'deposit', amount, to: this.expr() } }
    }
    if (this.accept('hold')) {
      const amount = this.expr()
      this.expect('on')
      return { tag: 'op', op: { tag: 'hold', amount, on: this.expr() } }
    }
    if (this.accept('capture')) {
      const hold = this.expr()
      this.expect('to')
      return { tag: 'op', op: { tag: 'capture', hold, to: this.expr() } }
    }
    if (this.accept('release')) return { tag: 'op', op: { tag: 'release', hold: this.expr() } }
    if (this.accept('set')) {
      const f = this.t
      if (f.kind !== 'ident') this.err(`expected a field name, found ${this.describe(f)}`)
      this.next()
      this.expect('(')
      const target = this.expr()
      this.expect(')')
      this.expect(':=')
      return { tag: 'set', field: f.text, target, value: this.expr() }
    }
    return this.err(`expected a statement (move, deposit, hold, capture, release, set), found ${this.describe(t)}`)
  }

  private expr(): Expr {
    let e = this.neg()
    while (this.accept('&&')) e = { tag: 'and', a: e, b: this.neg() }
    return e
  }
  private neg(): Expr {
    if (this.accept('!')) return { tag: 'not', a: this.neg() }
    return this.cmp()
  }
  private cmp(): Expr {
    const a = this.sum()
    if (this.accept('>=')) return { tag: 'ge', a, b: this.sum() }
    if (this.accept('=')) return { tag: 'eq', a, b: this.sum() }
    return a
  }
  private sum(): Expr {
    let e = this.atom()
    for (;;) {
      if (this.accept('+')) e = { tag: 'add', a: e, b: this.atom() }
      else if (this.accept('-')) e = { tag: 'sub', a: e, b: this.atom() }
      else return e
    }
  }
  private atom(): Expr {
    const t = this.t
    if (t.kind === 'int') {
      this.next()
      return { tag: 'lit', value: t.text }
    }
    if (this.accept('-')) {
      const n = this.t
      if (n.kind !== 'int') this.err(`expected a number after "-", found ${this.describe(n)}`)
      this.next()
      return { tag: 'lit', value: `-${n.text}` }
    }
    if (this.accept('(')) {
      const e = this.expr()
      this.expect(')')
      return e
    }
    if (this.accept('balance') || this.accept('frozen')) {
      this.expect('(')
      const e = this.expr()
      this.expect(')')
      return { tag: t.text as 'balance' | 'frozen', e }
    }
    if (t.kind === 'ident' && !RESERVED.has(t.text)) {
      this.next()
      return { tag: 'var', name: t.text }
    }
    return this.err(`expected an expression, found ${this.describe(t)}`)
  }
}

// ------------------------------------------------------------------------------------------------ inference

type Use = 'account' | 'amount' | 'hold' | 'bool' | 'numeric'

function usesOf(e: Expr, want: Use | null, out: Map<string, Use[]>): void {
  const add = (x: string, u: Use) => out.set(x, [...(out.get(x) ?? []), u])
  switch (e.tag) {
    case 'lit':
      return
    case 'var':
      if (want !== null) add(e.name, want)
      return
    case 'balance':
    case 'frozen':
      return usesOf(e.e, 'account', out)
    case 'add':
    case 'sub':
    case 'ge':
      usesOf(e.a, 'numeric', out)
      return usesOf(e.b, 'numeric', out)
    case 'eq':
      usesOf(e.a, null, out)
      return usesOf(e.b, null, out)
    case 'and':
      usesOf(e.a, 'bool', out)
      return usesOf(e.b, 'bool', out)
    case 'not':
      return usesOf(e.a, 'bool', out)
  }
}

function stmtUses(s: Stmt, out: Map<string, Use[]>): void {
  if (s.tag === 'set') {
    usesOf(s.target, 'account', out)
    return usesOf(s.value, s.field === 'frozen' ? 'bool' : null, out)
  }
  if (s.tag === 'forceMove') {
    usesOf(s.amount, 'amount', out)
    usesOf(s.from, 'account', out)
    return usesOf(s.to, 'account', out)
  }
  const r = s.op
  switch (r.tag) {
    case 'deposit':
      usesOf(r.amount, 'amount', out)
      return usesOf(r.to, 'account', out)
    case 'move':
      usesOf(r.amount, 'amount', out)
      usesOf(r.from, 'account', out)
      return usesOf(r.to, 'account', out)
    case 'hold':
      usesOf(r.amount, 'amount', out)
      return usesOf(r.on, 'account', out)
    case 'capture':
      usesOf(r.hold, 'hold', out)
      return usesOf(r.to, 'account', out)
    case 'release':
      return usesOf(r.hold, 'hold', out)
  }
}

/** Each untyped parameter's type, from its uses: an account, an amount (the amount of an operation, which may also
 * be compared and added), a hold, a bool, or an int (used only in arithmetic). Two uses that disagree are an error. */
function inferParams(params: readonly { name: string; ty: Ty | null; at: Tok }[], guard: Expr, body: Stmt): Param[] {
  const uses = new Map<string, Use[]>()
  usesOf(guard, 'bool', uses)
  stmtUses(body, uses)
  return params.map((p) => {
    if (p.ty !== null) return { name: p.name, ty: p.ty }
    const us = new Set(uses.get(p.name) ?? [])
    const fixed = [...us].filter((u) => u !== 'numeric')
    if (fixed.length > 1) throw new ParseError(p.at.line, p.at.column, `the uses of ${p.name} disagree: ${fixed.join(' and ')}`)
    if (fixed.length === 1) {
      const u = fixed[0]!
      if (us.has('numeric') && u !== 'amount') throw new ParseError(p.at.line, p.at.column, `the uses of ${p.name} disagree: ${u} and a number`)
      return { name: p.name, ty: u as Ty }
    }
    if (us.has('numeric')) return { name: p.name, ty: 'int' }
    throw new ParseError(p.at.line, p.at.column, `nothing in the command says what ${p.name} is: give it a type, as ${p.name}: account`)
  })
}

/** Parse a program in the toy syntax. Throws a ParseError that names a line and a column. */
export function parseProgram(text: string): Program {
  return new Parser(text).program().program
}

/** Parse one command. */
export function parseCommand(text: string): Cmd {
  const p = parseProgram(text)
  if (p.commands.length !== 1) throw new ParseError(1, 1, `expected one command, found ${p.commands.length}`)
  return p.commands[0]!
}
