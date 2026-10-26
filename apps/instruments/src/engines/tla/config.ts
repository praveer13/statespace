// The model a lesson cell checks, read from the cell's own text. Lesson specs carry their TLC configuration as
// comment lines after the module's closing `====` (and sometimes before its opening line), in a loose form:
//
//   \* CONSTANTS Init = 100, Amount = 80, Workers = {w1, w2}
//   \* INIT Init_, NEXT Next, INVARIANT NoOverspend, deadlock check off
//   \* MaxTries = 2, CrashesOn = TRUE, INVARIANT NeverTwice
//
// What a cell leaves out follows TLC's defaults: INIT and NEXT from `Spec == Init /\ [][Next]_vars` (or the names
// Init and Next), the deadlock check on. With no INVARIANT line, the state predicates defined after `Spec` are
// checked, and the output says so. Nothing here evaluates anything: values stay TLA+ text for Spectacle's parser.

export interface ModelConfig {
  /** The root module's name, from `---- MODULE Name ----`. */
  readonly module: string
  readonly init: string
  readonly next: string
  readonly invariants: readonly string[]
  /** True when the invariants were named by the cell, false when they were taken from the definitions after Spec. */
  readonly invariantsNamed: boolean
  /** Constant name to its value as TLA+ text. */
  readonly constants: Readonly<Record<string, string>>
  readonly deadlock: boolean
  /** Lines of the configuration this adapter does not check (PROPERTY, SYMMETRY, ...), for the output to name. */
  readonly ignored: readonly string[]
}

export class ConfigError extends Error {}

/** Split on commas that are not inside brackets, braces, parentheses or a string. */
function splitTop(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let inStr = false
  let cur = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i] as string
    if (inStr) {
      cur += c
      if (c === '"' && s[i - 1] !== '\\') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{' || c === '[' || c === '(' || s.startsWith('<<', i)) depth++
    else if (c === '}' || c === ']' || c === ')' || s.startsWith('>>', i)) depth = Math.max(0, depth - 1)
    if (s.startsWith('<<', i) || s.startsWith('>>', i)) {
      cur += s.slice(i, i + 2)
      i++
      continue
    }
    if (c === ',' && depth === 0) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out.map((x) => x.trim()).filter((x) => x !== '')
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/

export function parseModelConfig(code: string): ModelConfig {
  const text = code.replace(/\r/g, '')
  const head = /^-{4,}\s*MODULE\s+([A-Za-z_][A-Za-z0-9_]*)\s*-{4,}\s*$/m.exec(text)
  if (head === null) throw new ConfigError('the cell has no `---- MODULE Name ----` line')
  const module = head[1] as string
  const endM = /^={4,}\s*$/m.exec(text.slice(head.index))
  const bodyEnd = endM === null ? text.length : head.index + endM.index
  const body = text.slice(head.index, bodyEnd)
  // Configuration comments: whole-line `\*` comments outside the module body.
  const outside = text.slice(0, head.index) + '\n' + text.slice(bodyEnd)
  const items: string[] = []
  for (const line of outside.split('\n')) {
    const m = /^\s*\\\*\s?(.*)$/.exec(line)
    if (m !== null) items.push(...splitTop((m[1] as string).trim()))
  }

  let init: string | null = null
  let next: string | null = null
  const invariants: string[] = []
  const constants: Record<string, string> = {}
  let deadlock = true
  const ignored: string[] = []
  for (let item of items) {
    item = item.replace(/^CONSTANTS?\s+/, '')
    let m: RegExpExecArray | null
    if ((m = /^INIT\s+([A-Za-z_]\w*)$/.exec(item)) !== null) init = m[1] as string
    else if ((m = /^NEXT\s+([A-Za-z_]\w*)$/.exec(item)) !== null) next = m[1] as string
    else if ((m = /^INVARIANTS?\s+(.+)$/.exec(item)) !== null) invariants.push(...(m[1] as string).split(/\s+/).filter((x) => IDENT.test(x)))
    else if (/^deadlock\s+check\s+off$/i.test(item) || /^-deadlock$/.test(item)) deadlock = false
    else if (/^deadlock\s+check\s+on$/i.test(item)) deadlock = true
    else if ((m = /^([A-Za-z_]\w*)\s*(?:=|<-)\s*([\s\S]+)$/.exec(item)) !== null) constants[m[1] as string] = (m[2] as string).trim()
    else if (/^(PROPERTY|PROPERTIES|SYMMETRY|VIEW|CONSTRAINT|ACTION_CONSTRAINT|SPECIFICATION)\b/.test(item)) ignored.push(item)
  }

  // INIT and NEXT from `Spec == I /\ [][N]_v`, when the cell does not name them.
  const spec = /^\s*Spec\s*==\s*([A-Za-z_]\w*)\s*\/\\\s*\[\]\s*\[\s*([A-Za-z_]\w*)\s*\]_/m.exec(body)
  if (init === null) init = spec !== null ? (spec[1] as string) : 'Init'
  if (next === null) next = spec !== null ? (spec[2] as string) : 'Next'

  let invariantsNamed = invariants.length > 0
  if (!invariantsNamed) {
    // The state predicates defined after Spec: zero-arity, no prime, no temporal operator.
    const specAt = /^\s*Spec\s*==/m.exec(body)
    if (specAt !== null) {
      const after = body.slice(specAt.index + specAt[0].length)
      const defs = [...after.matchAll(/^([A-Za-z_]\w*)\s*==([\s\S]*?)(?=^[A-Za-z_]\w*(?:\([^)]*\))?\s*==|$(?![\s\S]))/gm)]
      for (const d of defs) {
        const name = d[1] as string
        const rhs = d[2] as string
        if (name === init || name === next || name === 'Spec' || name === 'vars') continue
        if (/'|\[\]|<>|~>|\bWF_|\bSF_|\bENABLED\b|\\\/\s*UNCHANGED/.test(rhs)) {
          ignored.push(`${name} (a temporal or action formula: this tab checks invariants only)`)
          continue
        }
        // A predicate another definition uses is a helper (Resolved in `(hst = "held") ~> Resolved`), not an invariant.
        const uses = body.split(new RegExp(`\\b${name}\\b`)).length - 1
        if (uses > 1) continue
        invariants.push(name)
      }
    }
    invariantsNamed = false
  }
  return { module, init, next, invariants, invariantsNamed, constants, deadlock, ignored }
}
