// The determinism lint (invariant I3; ARCHITECTURE.md sections 13.2 and 17.2): seeded paths read no clock, no
// entropy pool and no engine-dependent arithmetic, so one seed gives one instance in Node, Chromium, Firefox
// and WebKit. GATE-generators runs it (scripts/verify-generators.mjs).
//
// This is statespace's wrapper of kernelspace's lint (vendor/kernelspace/scripts/verify-determinism.ts, module
// rng in vendor/kernelspace/VENDOR.md). The vendored file keeps its AST walk inside a script that exports only
// its kernelspace scope list, so the walk is ported here and the vendored file stays byte-identical; the
// package's tests run every self-test case of the vendored file through this port and require the same result
// (test/lint.test.ts), so a drift between the two shows up as a failing test. What statespace adds, each
// because it is another way the same seed could give different results in different engines:
//
//   - crypto.randomUUID, beside crypto.getRandomValues;
//   - the other transcendental Math functions (expm1, log1p, the hyperbolic and inverse trigonometric ones),
//     beside kernelspace's list, and the ** operator, which is Math.pow by another name;
//   - locale-dependent methods (localeCompare, toLocaleString and the like) and Intl, whose results follow the
//     engine's locale data;
//   - timers and garbage-collection observers (setTimeout, setInterval, setImmediate, queueMicrotask, WeakRef,
//     FinalizationRegistry), whose order or firing depends on the host.
//
// The scope is statespace's seeded paths (seededScope below). The TypeScript compiler is passed in, so this
// package imports no parser: the gate and the tests hand it the `typescript` package.
//
// Pure: no DOM, storage or network.

import type ts from 'typescript'

type Ts = typeof ts

export interface LintFinding {
  readonly line: number
  readonly col: number
  /** The rule that fired: clock, entropy, engine-math, locale, timer or alias. */
  readonly rule: 'clock' | 'entropy' | 'engine-math' | 'locale' | 'timer' | 'alias'
  readonly message: string
}

export interface LintOptions {
  /**
   * Also ban engine-dependent arithmetic (transcendental Math and **). kernelspace applied it to its numeric
   * scopes only; every statespace seeded path is numeric, so the scope list below sets it everywhere.
   */
  readonly numeric: boolean
}

/** Members that read the clock or the entropy pool, by the global that owns them. */
const NONDETERMINISTIC: Readonly<Record<string, { readonly members: ReadonlySet<string>; readonly rule: 'clock' | 'entropy'; readonly why: string }>> = {
  Math: { members: new Set(['random']), rule: 'entropy', why: 'draw from the seeded rng instead' },
  Date: { members: new Set(['now']), rule: 'clock', why: 'time must arrive as a parameter' },
  performance: { members: new Set(['now']), rule: 'clock', why: 'time must arrive as a parameter' },
  crypto: { members: new Set(['getRandomValues', 'randomUUID']), rule: 'entropy', why: 'draw from the seeded rng instead' },
}

/** Math functions whose last bit differs between engines (kernelspace's list, then statespace's additions). */
export const ENGINE_DEPENDENT_MATH: ReadonlySet<string> = new Set([
  'exp', 'log', 'log2', 'log10', 'pow', 'sin', 'cos', 'tan', 'atan2', 'cbrt', 'hypot',
  'expm1', 'log1p', 'sinh', 'cosh', 'tanh', 'asin', 'acos', 'atan', 'asinh', 'acosh', 'atanh',
])

/** Methods whose result follows the engine's locale data, on whatever receiver. */
const LOCALE_METHODS: ReadonlySet<string> = new Set([
  'localeCompare', 'toLocaleString', 'toLocaleUpperCase', 'toLocaleLowerCase', 'toLocaleDateString', 'toLocaleTimeString',
])

/** Globals whose behavior depends on the host's timing or garbage collector. */
const TIMING_GLOBALS: ReadonlySet<string> = new Set(['setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'WeakRef', 'FinalizationRegistry'])

/**
 * Globals a bare reference to would hide a banned member behind an alias. kernelspace guarded Math and Date;
 * statespace adds the two other owners of banned members.
 */
const ALIAS_GUARDED: ReadonlySet<string> = new Set(['Math', 'Date', 'crypto', 'performance'])
const GLOBAL_ROOTS: ReadonlySet<string> = new Set(['globalThis', 'window', 'self'])

/**
 * Lint one source text. Comments and strings never trip it, because it walks the TypeScript AST; a finding
 * gives the 1-based line and column of the offending node.
 */
export function lintDeterminism(tsc: Ts, fileName: string, text: string, options: LintOptions = { numeric: true }): LintFinding[] {
  const sf = tsc.createSourceFile(fileName, text, tsc.ScriptTarget.Latest, true, fileName.endsWith('x') ? tsc.ScriptKind.TSX : tsc.ScriptKind.TS)
  const found: LintFinding[] = []
  const report = (node: ts.Node, rule: LintFinding['rule'], message: string): void => {
    const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf))
    found.push({ line: line + 1, col: character + 1, rule, message })
  }

  /** Strips parentheses and casts: `(Math as any).random` is still Math. */
  const unwrap = (e0: ts.Expression): ts.Expression => {
    let e = e0
    while (tsc.isParenthesizedExpression(e) || tsc.isAsExpression(e) || tsc.isNonNullExpression(e) || tsc.isTypeAssertionExpression(e) || tsc.isSatisfiesExpression(e)) e = e.expression
    return e
  }

  /** A string-literal key, or undefined. */
  const literalKey = (key: ts.Expression): string | undefined => (tsc.isStringLiteral(key) || tsc.isNoSubstitutionTemplateLiteral(key) ? key.text : undefined)

  /** True for `globalThis`, `window` or `self` (behind any parentheses or casts). */
  const isGlobalRoot = (raw: ts.Expression): boolean => {
    const e = unwrap(raw)
    return tsc.isIdentifier(e) && GLOBAL_ROOTS.has(e.text)
  }

  /** The global an expression names: `Math`, `globalThis.Math`, `window.Math` and `globalThis['Math']` all give "Math". */
  const globalOf = (raw: ts.Expression): string | undefined => {
    const e = unwrap(raw)
    if (tsc.isIdentifier(e)) return e.text
    if (tsc.isPropertyAccessExpression(e) && isGlobalRoot(e.expression)) return e.name.text
    if (tsc.isElementAccessExpression(e) && isGlobalRoot(e.expression)) return literalKey(e.argumentExpression)
    return undefined
  }

  /** Reports a global that is banned outright (Intl and the timing globals) reached through the global object. */
  const checkGlobalObjectMember = (node: ts.Node, member: string): void => {
    if (member === 'Intl') report(node, 'locale', 'Intl follows the engine\'s locale data: format explicitly')
    else if (TIMING_GLOBALS.has(member)) report(node, 'timer', `${member} depends on the host's timing or garbage collector`)
  }

  /** True when `id` is the name being declared or a property key, not a use of the global. */
  const isNameOnly = (id: ts.Identifier): boolean => {
    const p = id.parent
    if (tsc.isPropertyAccessExpression(p) && p.name === id) return true
    if (tsc.isQualifiedName(p) || tsc.isTypeReferenceNode(p) || tsc.isTypeQueryNode(p) || tsc.isExpressionWithTypeArguments(p)) return true
    if (tsc.isImportSpecifier(p) || tsc.isExportSpecifier(p) || tsc.isImportClause(p) || tsc.isNamespaceImport(p)) return true
    if (tsc.isBindingElement(p)) return p.propertyName === id || p.name === id
    if (tsc.isVariableDeclaration(p) || tsc.isParameter(p)) return p.name === id
    if (tsc.isPropertyAssignment(p) || tsc.isPropertyDeclaration(p) || tsc.isPropertySignature(p)) return p.name === id
    if (tsc.isMethodDeclaration(p) || tsc.isMethodSignature(p) || tsc.isGetAccessorDeclaration(p) || tsc.isSetAccessorDeclaration(p)) return p.name === id
    if (tsc.isEnumMember(p) || tsc.isFunctionDeclaration(p) || tsc.isClassDeclaration(p) || tsc.isInterfaceDeclaration(p) || tsc.isTypeAliasDeclaration(p)) return p.name === id
    // `x instanceof Date` reads no clock.
    if (tsc.isBinaryExpression(p) && p.operatorToken.kind === tsc.SyntaxKind.InstanceOfKeyword && p.right === id) return true
    return false
  }

  /** Reports `<global>.<member>` when it is banned. */
  const checkMember = (node: ts.Node, global: string, member: string): void => {
    const rule = NONDETERMINISTIC[global]
    if (rule?.members.has(member)) report(node, rule.rule, `${global}.${member} is nondeterministic: ${rule.why}`)
    else if (options.numeric && global === 'Math' && ENGINE_DEPENDENT_MATH.has(member)) {
      report(node, 'engine-math', `Math.${member} rounds differently between engines: use integer arithmetic or a lookup table`)
    }
  }

  const visit = (node: ts.Node): void => {
    if (tsc.isPropertyAccessExpression(node)) {
      const g = globalOf(node.expression)
      if (g) checkMember(node, g, node.name.text)
      if (isGlobalRoot(node.expression)) checkGlobalObjectMember(node, node.name.text)
      if (LOCALE_METHODS.has(node.name.text)) report(node.name, 'locale', `${node.name.text} follows the engine's locale data: compare and format explicitly`)
    } else if (tsc.isElementAccessExpression(node)) {
      const g = globalOf(node.expression)
      const keyText = literalKey(node.argumentExpression)
      if (g && g in NONDETERMINISTIC) {
        if (keyText !== undefined) checkMember(node, g, keyText)
        else report(node, 'alias', `computed access on ${g} can reach a banned member: name the member`)
      }
      if (keyText !== undefined && isGlobalRoot(node.expression)) checkGlobalObjectMember(node, keyText)
      if (keyText !== undefined && LOCALE_METHODS.has(keyText)) report(node, 'locale', `${keyText} follows the engine's locale data: compare and format explicitly`)
    } else if (tsc.isNewExpression(node)) {
      if (globalOf(node.expression) === 'Date') report(node, 'clock', 'new Date( reads the clock: time must arrive as a parameter')
    } else if (tsc.isCallExpression(node)) {
      if (globalOf(node.expression) === 'Date') report(node, 'clock', 'Date() reads the clock: time must arrive as a parameter')
    } else if (tsc.isBinaryExpression(node)) {
      const k = node.operatorToken.kind
      if (options.numeric && (k === tsc.SyntaxKind.AsteriskAsteriskToken || k === tsc.SyntaxKind.AsteriskAsteriskEqualsToken)) {
        report(node.operatorToken, 'engine-math', '** is Math.pow and rounds differently between engines: multiply, or use a lookup table')
      }
    } else if (tsc.isVariableDeclaration(node) && tsc.isObjectBindingPattern(node.name) && node.initializer) {
      const g = globalOf(node.initializer)
      if (g && g in NONDETERMINISTIC) {
        for (const el of node.name.elements) {
          const key = el.propertyName ?? el.name
          if (!el.dotDotDotToken && (tsc.isIdentifier(key) || tsc.isStringLiteral(key))) checkMember(el, g, key.text)
          else report(el, 'alias', `destructuring ${g} with a rest or computed key can reach a banned member`)
        }
      }
    }

    if (tsc.isIdentifier(node) && !isNameOnly(node)) {
      if (node.text === 'Intl') report(node, 'locale', 'Intl follows the engine\'s locale data: format explicitly')
      else if (TIMING_GLOBALS.has(node.text)) report(node, 'timer', `${node.text} depends on the host's timing or garbage collector`)
      else if (ALIAS_GUARDED.has(node.text)) {
        let child: ts.Node = node
        let p = node.parent
        while (tsc.isParenthesizedExpression(p) || tsc.isAsExpression(p) || tsc.isNonNullExpression(p) || tsc.isTypeAssertionExpression(p) || tsc.isSatisfiesExpression(p)) {
          child = p
          p = p.parent
        }
        // Member access, `new Date(` and `Date(` are judged above; destructuring is judged on the declaration.
        const judgedAbove =
          ((tsc.isPropertyAccessExpression(p) || tsc.isElementAccessExpression(p) || tsc.isNewExpression(p) || tsc.isCallExpression(p)) && p.expression === child) ||
          (tsc.isVariableDeclaration(p) && p.initializer === child && tsc.isObjectBindingPattern(p.name))
        if (!judgedAbove) report(node, 'alias', `a bare ${node.text} value can hide a banned member behind an alias: call ${node.text} members directly`)
      }
    }
    tsc.forEachChild(node, visit)
  }
  visit(sf)
  return found.sort((a, b) => a.line - b.line || a.col - b.col)
}

/**
 * statespace's seeded paths (ARCHITECTURE.md section 17.2): the generators, the pocket checkers, this package
 * and the Clearinghouse world, whose home ARCHITECTURE.md section 17.1 puts among the instrument origin's
 * engine adapters. Paths that do not exist yet are fine: each owning task lands its files under the lint
 * already running. Every seeded path is numeric. Tests, declarations and the vendored files are out of scope.
 */
export const SEEDED_PATHS: readonly string[] = [
  'packages/generators/src/',
  'packages/pocket/src/',
  'packages/rng/src/',
  'apps/instruments/src/engines/clearinghouse/',
]

/** Whether a repository-relative POSIX path is linted, and with which options. */
export function seededScope(rel: string): LintOptions | null {
  if (!/\.(ts|tsx|mts)$/.test(rel) || rel.endsWith('.d.ts')) return null
  if (/(^|\/)(test|tests|__tests__)\//.test(rel) || /\.test\.tsx?$/.test(rel)) return null
  return SEEDED_PATHS.some((p) => rel.startsWith(p)) ? { numeric: true } : null
}
