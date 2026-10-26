// GATE-bundle's source and build lints (spine section 11.2; ARCHITECTURE.md sections 5.3, 5.5, 5.7 and 15.4):
//
//   sandbox    every iframe in apps/site carries sandbox="allow-scripts allow-same-origin", exactly (W0-S01: the attribute
//              changed no worker, cache or handshake behavior in three engines and blocked top navigation and document.domain),
//              however the frame is made (JSX, an element factory such as React's createElement('iframe', props), the DOM's
//              createElement before insertion, markup in a string, HTML), and nothing removes or toggles the attribute or a
//              token of it afterwards
//   cookie     apps/site never assigns document.cookie (a cookie scoped to the registrable domain is the one store a same-site
//              instrument origin can read, W0-S01): no assignment, compound assignment, destructuring target, loop target or
//              increment writes a member named cookie, and neither do Reflect.set or Object.assign; the Cookie Store API and a
//              Set-Cookie meta tag count too
//   fragment   apps/site never parses what a URL fragment carries: a spec-duel or receipt payload is parsed only on the
//              instrument origin (I6), so a value read from `.hash` never reaches a decoder or parser (a best-effort taint
//              check over one file at a time; the browser canary test backs it with a run). No folder is exempt, the bus
//              client included: it hands a fragment to the instrument origin unparsed (ARCHITECTURE.md section 2, item 4),
//              and posting the raw string trips nothing, while decoding it first does
//   parents    a production instrument build lists no localhost in its parent origins (ARCHITECTURE.md section 5.5)
//
// The source lints read TypeScript, JSX and HTML with the TypeScript compiler's parser, so comments and strings never trip
// them. A finding names file, line and rule. Test files, fixtures and the build output are not production source.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'

export interface Finding {
  file: string
  line: number
  col: number
  rule: string
  message: string
}

const SOURCE = /\.(?:[cm]?[jt]s|[jt]sx|html?)$/i
const NOT_PRODUCTION = /(?:^|\/)(?:node_modules|dist|\.vite|test|tests|__tests__|e2e|fixtures)\/|\.(?:test|spec)\.[cm]?[jt]sx?$|\.d\.ts$/

export function* walkFiles(dir: string, accept: RegExp = SOURCE): Generator<string> {
  if (!existsSync(dir)) return
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.vite') continue
      yield* walkFiles(full, accept)
    } else if (accept.test(e.name)) yield full
  }
}

/** Production source under a directory: relative POSIX path and text. */
export function productionSources(root: string, dir: string): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = []
  for (const abs of walkFiles(join(root, dir))) {
    const rel = relative(root, abs).split('\\').join('/')
    if (NOT_PRODUCTION.test(rel)) continue
    out.push({ file: rel, text: readFileSync(abs, 'utf8') })
  }
  return out
}

function kindOf(file: string): ts.ScriptKind {
  if (/\.tsx$/i.test(file)) return ts.ScriptKind.TSX
  if (/\.jsx$/i.test(file)) return ts.ScriptKind.JSX
  if (/\.[cm]?js$/i.test(file)) return ts.ScriptKind.JS
  return ts.ScriptKind.TS
}

interface Parsed {
  file: string
  sf: ts.SourceFile
  /** Added to every reported line: a script block inside an HTML file starts below line 1. */
  lineOffset: number
}

function parse(file: string, text: string, lineOffset = 0): Parsed {
  return { file, sf: ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kindOf(file)), lineOffset }
}

/** The JavaScript in an HTML file's inline scripts, as separately parsed pieces. */
function inlineScripts(file: string, html: string): Parsed[] {
  const out: Parsed[] = []
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(m[1] ?? '') || (m[2] ?? '').trim() === '') continue
    if (/type\s*=\s*["']?(?:application\/(?:ld\+)?json|importmap|text\/template)/i.test(m[1] ?? '')) continue
    const before = html.slice(0, (m.index ?? 0) + m[0].indexOf('>') + 1)
    out.push(parse(`${file}`, m[2] ?? '', before.split('\n').length - 1))
  }
  return out
}

function finding(p: Parsed, node: ts.Node, rule: string, message: string): Finding {
  const { line, character } = p.sf.getLineAndCharacterOfPosition(node.getStart(p.sf))
  return { file: p.file, line: line + 1 + p.lineOffset, col: character + 1, rule, message }
}

const textOf = (n: ts.Node | undefined): string | null => {
  if (!n) return null
  if (ts.isStringLiteralLike(n)) return n.text
  if (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isSatisfiesExpression(n)) return textOf(n.expression)
  return null
}

const nameOf = (n: ts.Node): string | null => (ts.isIdentifier(n) ? n.text : null)

// ---------------------------------------------------------------------------------------------- sandbox

export const SANDBOX_TOKENS = ['allow-same-origin', 'allow-scripts'] as const
export const SANDBOX_VALUE = 'allow-scripts allow-same-origin'

/** True when the attribute value is exactly the two tokens, in any order and spacing. */
export function sandboxOk(value: string): boolean {
  const tokens = value.trim().split(/\s+/).filter(Boolean).map((t) => t.toLowerCase())
  return tokens.length === SANDBOX_TOKENS.length && SANDBOX_TOKENS.every((t) => tokens.includes(t))
}

const SANDBOX_RULE = 'iframe-sandbox'

/** Constants of a file that hold a string: `const SANDBOX = 'allow-scripts allow-same-origin'`. */
function stringConstants(sf: ts.SourceFile): Map<string, string> {
  const out = new Map<string, string>()
  const visit = (n: ts.Node): void => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      const t = textOf(n.initializer)
      if (t !== null) out.set(n.name.text, t)
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return out
}

function attributeValue(attr: ts.JsxAttribute, consts: Map<string, string>): { value: string | null; unresolved: boolean } {
  const init = attr.initializer
  if (!init) return { value: '', unresolved: false }
  if (ts.isStringLiteral(init)) return { value: init.text, unresolved: false }
  if (ts.isJsxExpression(init) && init.expression) {
    const t = textOf(init.expression)
    if (t !== null) return { value: t, unresolved: false }
    if (ts.isIdentifier(init.expression) && consts.has(init.expression.text)) return { value: consts.get(init.expression.text) ?? null, unresolved: false }
  }
  return { value: null, unresolved: true }
}

/** `<iframe ...>` tags inside text (an HTML file, or a string a script writes into the page). */
function iframeTagsIn(text: string): { attrs: string; index: number }[] {
  return [...text.matchAll(/<iframe\b([^>]*)>/gi)].map((m) => ({ attrs: m[1] ?? '', index: m.index ?? 0 }))
}

function sandboxOfTag(attrs: string): string | null {
  const m = /\bsandbox\b(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/i.exec(attrs)
  if (!m) return null
  return m[1] ?? m[2] ?? m[3] ?? ''
}

/** An `<iframe` tag still open when a text ends: the rest of it is written somewhere this text does not show. */
const OPEN_IFRAME_AT_END = /<iframe\b[^>]*$/i

const isPlus = (n: ts.Node): n is ts.BinaryExpression => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken

const unparen = (e: ts.Expression): ts.Expression => (ts.isParenthesizedExpression(e) ? unparen(e.expression) : e)

/** True when a node is an operand of a `+` chain (through parentheses). */
function inPlusChain(n: ts.Node): boolean {
  let p = n.parent
  while (p && ts.isParenthesizedExpression(p)) p = p.parent
  return p !== undefined && isPlus(p)
}

/** The operands of a chain of `+`, in order, through parentheses. */
function plusOperands(e: ts.Expression): ts.Expression[] {
  const u = unparen(e)
  return isPlus(u) ? [...plusOperands(u.left), ...plusOperands(u.right)] : [u]
}

/** The text an expression contributes to markup: a literal's text, a template's literal parts, a string constant's value, else nothing. */
function markupText(e: ts.Expression, consts: Map<string, string>): string {
  const u = unparen(e)
  if (ts.isStringLiteralLike(u)) return u.text
  if (ts.isTemplateExpression(u)) return u.head.text + u.templateSpans.map((s) => s.literal.text).join('')
  if (ts.isIdentifier(u)) return consts.get(u.text) ?? ''
  return ''
}

const INSERTERS = new Set(['append', 'appendChild', 'prepend', 'before', 'after', 'insertBefore', 'replaceWith', 'replaceChildren', 'insertAdjacentElement', 'replaceChild'])

/** Element factories that take a tag and props: React's and Preact's createElement, Preact's h, the JSX runtime's jsx. */
const FACTORIES = new Set(['createElement', 'h', 'jsx', 'jsxs', 'jsxDEV', '_jsx', '_jsxs', '_jsxDEV'])
const DOCUMENTS = /^(?:document|doc|ownerDocument|contentDocument)$/

const isDocumentLike = (e: ts.Expression): boolean =>
  (ts.isIdentifier(e) && DOCUMENTS.test(e.text)) || (ts.isPropertyAccessExpression(e) && DOCUMENTS.test(e.name.text))

/** The DOM's second argument to createElement, `{ is: 'name' }`, as opposed to an element factory's props. */
const isCreationOptions = (e: ts.Expression | undefined): boolean =>
  e !== undefined &&
  ts.isObjectLiteralExpression(e) &&
  e.properties.length > 0 &&
  e.properties.every((q) => (ts.isPropertyAssignment(q) || ts.isShorthandPropertyAssignment(q)) && propertyNameOf(q.name) === 'is')

function propertyNameOf(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) return name.text
  if (ts.isComputedPropertyName(name)) return textOf(name.expression)
  return null
}

/**
 * How a call makes an element: 'dom' for document.createElement(tag[, options]) and createElementNS(ns, tag), whose frame gets its
 * attribute through the DOM afterwards; 'factory' for an element factory, whose frame gets it in its props. A bare createElement is
 * a factory (the DOM's method cannot be called unbound); a method of anything but a document is one when it is given props.
 */
function elementCall(n: ts.CallExpression): 'dom' | 'factory' | null {
  const callee = n.expression
  if (ts.isIdentifier(callee)) return FACTORIES.has(callee.text) ? 'factory' : null
  if (!ts.isPropertyAccessExpression(callee)) return null
  const name = callee.name.text
  if (name === 'createElementNS') return 'dom'
  if (name === 'createElement') return isDocumentLike(callee.expression) || n.arguments.length < 2 || isCreationOptions(n.arguments[1]) ? 'dom' : 'factory'
  return FACTORIES.has(name) ? 'factory' : null
}

function lintSandboxParsed(p: Parsed): Finding[] {
  const out: Finding[] = []
  const consts = stringConstants(p.sf)
  const bad = (node: ts.Node, message: string): void => void out.push(finding(p, node, SANDBOX_RULE, message))

  const checkLiteralFor = (node: ts.Node, value: string, where: string): void => {
    if (!sandboxOk(value)) bad(node, `${where} sets sandbox="${value}"; the instrument frame carries exactly "${SANDBOX_VALUE}"`)
  }

  const visit = (n: ts.Node): void => {
    // <iframe ...> in JSX; the last sandbox attribute counts, and a spread after it can replace it
    if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && ts.isIdentifier(n.tagName) && n.tagName.text.toLowerCase() === 'iframe') {
      const props = n.attributes.properties
      const at = props.findLastIndex((a) => ts.isJsxAttribute(a) && ts.isIdentifier(a.name) && a.name.text === 'sandbox')
      const attr = at >= 0 ? (props[at] as ts.JsxAttribute) : undefined
      const spread = props.some((a) => ts.isJsxSpreadAttribute(a))
      if (!attr) bad(n, spread ? 'an iframe takes its attributes from a spread, so its sandbox attribute cannot be checked: write sandbox="allow-scripts allow-same-origin"' : 'an iframe has no sandbox attribute')
      else if (props.slice(at + 1).some((a) => ts.isJsxSpreadAttribute(a))) bad(n, 'a spread after the iframe\'s sandbox attribute can replace it: write sandbox="allow-scripts allow-same-origin" after the spread')
      else {
        const v = attributeValue(attr, consts)
        if (v.unresolved || v.value === null) bad(n, 'the iframe\'s sandbox value is not a literal: write it as a string')
        else checkLiteralFor(n, v.value, 'an iframe')
      }
    }
    // taking the attribute, or a token of it, off a frame: removeAttribute('sandbox'), toggleAttribute('sandbox'),
    // frame.sandbox.remove('allow-scripts'), .toggle(…), .replace(…); only an iframe has a sandbox attribute
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const method = n.expression.name.text
      const attrArg = method === 'removeAttributeNS' ? n.arguments[1] : n.arguments[0]
      if (/^(?:removeAttribute|removeAttributeNS|toggleAttribute)$/.test(method) && textOf(attrArg)?.toLowerCase() === 'sandbox') {
        bad(n, `${method}('sandbox') takes the sandbox attribute off a frame; the instrument frame keeps exactly "${SANDBOX_VALUE}"`)
      }
      const owner = n.expression.expression
      if (/^(?:remove|toggle|replace)$/.test(method) && ts.isPropertyAccessExpression(owner) && owner.name.text === 'sandbox') {
        bad(n, `sandbox.${method}() changes a frame's sandbox tokens; the instrument frame keeps exactly "${SANDBOX_VALUE}"`)
      }
    }
    // iframe markup inside a string or template that a script writes into the page. A chain of `+` is read as one text, each
    // operand that is not a literal read as its value when it is a string constant of the file and as empty otherwise, and it is
    // checked once, at the top of the chain; a literal inside the chain is not checked again on its own. A text that leaves an
    // <iframe tag open at its end is built in pieces some other way (`.join('')`, `+=`, `.concat`), so its attribute cannot be read:
    // that fails closed.
    const chainTop = isPlus(n) && !inPlusChain(n)
    if (chainTop || ((ts.isStringLiteralLike(n) || ts.isTemplateExpression(n)) && !inPlusChain(n))) {
      const text = chainTop ? plusOperands(n as ts.Expression).map((o) => markupText(o, consts)).join('') : markupText(n as ts.Expression, consts)
      for (const tag of iframeTagsIn(text)) {
        const v = sandboxOfTag(tag.attrs)
        if (v === null) bad(n, 'markup in a string creates an iframe with no sandbox attribute')
        else checkLiteralFor(n, v, 'markup in a string')
      }
      if (OPEN_IFRAME_AT_END.test(text)) bad(n, 'markup in a string opens an iframe tag that this text does not close, so its sandbox attribute cannot be checked: write the whole tag in one string or template')
    }
    // document.createElement('iframe'), and createElement('iframe', props) or h('iframe', props) from an element factory
    if (ts.isCallExpression(n)) {
      const kind = elementCall(n)
      const tagArg = kind === 'dom' && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'createElementNS' ? n.arguments[1] : n.arguments[0]
      if (kind !== null && textOf(tagArg)?.toLowerCase() === 'iframe') out.push(...(kind === 'dom' ? lintCreatedFrame(p, n) : lintFactoryFrame(p, n, consts)))
    }
    ts.forEachChild(n, visit)
  }
  visit(p.sf)
  return out
}

/** An iframe from an element factory carries the attribute in its props literal: createElement('iframe', { sandbox: '…', … }). */
function lintFactoryFrame(p: Parsed, call: ts.CallExpression, consts: Map<string, string>): Finding[] {
  const bad = (message: string): Finding[] => [finding(p, call, SANDBOX_RULE, message)]
  const props = call.arguments[1]
  if (props === undefined || props.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(props) && props.text === 'undefined')) {
    return bad('an iframe made by an element factory has no props, so no sandbox attribute')
  }
  if (!ts.isObjectLiteralExpression(props)) {
    return bad('an iframe made by an element factory takes its props from an expression, so its sandbox attribute cannot be checked: write sandbox: "allow-scripts allow-same-origin" in a props literal')
  }
  const list = [...props.properties]
  const at = list.findLastIndex((q) => (ts.isPropertyAssignment(q) || ts.isShorthandPropertyAssignment(q)) && propertyNameOf(q.name) === 'sandbox')
  if (at < 0) {
    return bad(list.some((q) => ts.isSpreadAssignment(q)) ? 'an iframe takes its props from a spread, so its sandbox attribute cannot be checked: write sandbox: "allow-scripts allow-same-origin"' : 'an iframe made by an element factory has no sandbox attribute')
  }
  if (list.slice(at + 1).some((q) => ts.isSpreadAssignment(q))) return bad('a spread after the iframe\'s sandbox prop can replace it: write sandbox after the spread')
  const prop = list[at] as ts.PropertyAssignment | ts.ShorthandPropertyAssignment
  const value = ts.isShorthandPropertyAssignment(prop)
    ? (consts.get(prop.name.text) ?? null)
    : (textOf(prop.initializer) ?? (ts.isIdentifier(prop.initializer) ? (consts.get(prop.initializer.text) ?? null) : null))
  if (value === null) return bad('the iframe\'s sandbox value is not a literal: write it as a string')
  if (!sandboxOk(value)) return bad(`an iframe sets sandbox="${value}"; the instrument frame carries exactly "${SANDBOX_VALUE}"`)
  return []
}

/**
 * A frame made by createElement must get its sandbox attribute before it is put in the page: that is when the flags apply. The
 * attribute may be written as setAttribute('sandbox', '…'), as frame.sandbox = '…' or frame.sandbox.value = '…' (each replaces the
 * tokens) or as frame.sandbox.add('…', …) (each adds); the tokens left when the frame is inserted must be exactly the two.
 */
function lintCreatedFrame(p: Parsed, call: ts.CallExpression): Finding[] {
  const bad = (message: string): Finding => finding(p, call, SANDBOX_RULE, message)
  const parent = call.parent
  let name: string | null = null
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) name = parent.name.text
  else if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(parent.left)) name = parent.left.text
  if (name === null) return [bad('a frame made by createElement is not held in a variable, so its sandbox attribute cannot be checked')]

  let scope: ts.Node = call
  while (scope.parent && !ts.isFunctionLike(scope.parent) && !ts.isSourceFile(scope.parent)) scope = scope.parent
  scope = scope.parent ?? p.sf

  const consts = stringConstants(p.sf)
  const valueOf = (e: ts.Expression | undefined): string | null => textOf(e) ?? (e && ts.isIdentifier(e) ? (consts.get(e.text) ?? null) : null)
  const ops: { at: number; replace: boolean; tokens: string[] | null }[] = []
  let insertAt = Infinity
  const isFrameSandbox = (n: ts.Expression): boolean => ts.isPropertyAccessExpression(n) && n.name.text === 'sandbox' && nameOf(n.expression) === name
  const visit = (n: ts.Node): void => {
    if (n.pos >= call.pos) {
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
        const callee = n.expression
        // frame.setAttribute('sandbox', '…')
        if (nameOf(callee.expression) === name && callee.name.text === 'setAttribute' && textOf(n.arguments[0])?.toLowerCase() === 'sandbox') {
          const v = valueOf(n.arguments[1])
          ops.push({ at: n.getStart(p.sf), replace: true, tokens: v === null ? null : v.split(/\s+/).filter(Boolean) })
        }
        // frame.sandbox.add('…', …)
        if (callee.name.text === 'add' && isFrameSandbox(callee.expression)) {
          const values = n.arguments.map((a) => valueOf(a as ts.Expression))
          ops.push({ at: n.getStart(p.sf), replace: false, tokens: values.some((v) => v === null) ? null : (values as string[]) })
        }
        // something.append(frame) and the like
        if (INSERTERS.has(callee.name.text) && n.arguments.some((a) => nameOf(a) === name)) insertAt = Math.min(insertAt, n.getStart(p.sf))
      }
      // frame.sandbox = '…', frame.sandbox.value = '…'
      if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left)) {
        const left = n.left
        if ((nameOf(left.expression) === name && left.name.text === 'sandbox') || (left.name.text === 'value' && ts.isPropertyAccessExpression(left.expression) && isFrameSandbox(left.expression))) {
          const v = valueOf(n.right)
          ops.push({ at: n.getStart(p.sf), replace: true, tokens: v === null ? null : v.split(/\s+/).filter(Boolean) })
        }
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(scope)
  ops.sort((a, b) => a.at - b.at)
  if (ops.length === 0) return [bad(`the frame ${name} is created without a sandbox attribute`)]
  if (ops.some((o) => o.tokens === null)) return [bad('the sandbox value is not a literal: write it as a string')]
  let tokens: string[] = []
  for (const o of ops) tokens = o.replace ? [...(o.tokens as string[])] : [...tokens, ...(o.tokens as string[])]
  const final = tokens.join(' ')
  if (!sandboxOk(final)) return [bad(`a frame is given sandbox="${final}"; the instrument frame carries exactly "${SANDBOX_VALUE}"`)]
  if (insertAt < (ops[ops.length - 1] as { at: number }).at) return [bad(`the frame ${name} is put in the page before its sandbox attribute is set, so the flags do not apply to its first load`)]
  return []
}

function lintSandboxHtml(file: string, html: string): Finding[] {
  const out: Finding[] = []
  for (const tag of iframeTagsIn(html)) {
    const line = html.slice(0, tag.index).split('\n').length
    const v = sandboxOfTag(tag.attrs)
    if (v === null) out.push({ file, line, col: 1, rule: SANDBOX_RULE, message: 'an iframe has no sandbox attribute' })
    else if (!sandboxOk(v)) out.push({ file, line, col: 1, rule: SANDBOX_RULE, message: `an iframe sets sandbox="${v}"; the instrument frame carries exactly "${SANDBOX_VALUE}"` })
  }
  return out
}

export function lintSandbox(sources: { file: string; text: string }[]): Finding[] {
  const out: Finding[] = []
  for (const s of sources) {
    if (/\.html?$/i.test(s.file)) {
      out.push(...lintSandboxHtml(s.file, s.text))
      for (const sc of inlineScripts(s.file, s.text)) out.push(...lintSandboxParsed(sc))
    } else out.push(...lintSandboxParsed(parse(s.file, s.text)))
  }
  return out
}

// ---------------------------------------------------------------------------------------------- cookie

const COOKIE_RULE = 'document-cookie'
/** `=` and every compound assignment (`+=`, `||=`, `??=` and the rest). */
const isAssignment = (k: ts.SyntaxKind): boolean => k >= ts.SyntaxKind.FirstAssignment && k <= ts.SyntaxKind.LastAssignment
/** Calls that write, through its setter, the property their second argument names (Object.defineProperty only shadows it). */
const COOKIE_KEYED = new Set(['Reflect.set'])

const isCookieMember = (n: ts.Node): boolean =>
  (ts.isPropertyAccessExpression(n) && n.name.text === 'cookie') || (ts.isElementAccessExpression(n) && textOf(n.argumentExpression) === 'cookie')

function objectHasCookieKey(n: ts.Node): boolean {
  return ts.isObjectLiteralExpression(n) && n.properties.some((p) => (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && propertyNameOf(p.name) === 'cookie')
}

/**
 * True when an assignment target writes a member named cookie, directly or inside a destructuring pattern:
 * `[document.cookie] = [v]`, `({ value: document.cookie } = o)`, `[...document.cookie] = v`, `[document.cookie = 'x'] = []`.
 */
function targetWritesCookie(n: ts.Expression): boolean {
  if (isCookieMember(n)) return true
  if (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isSatisfiesExpression(n) || ts.isNonNullExpression(n) || ts.isTypeAssertionExpression(n)) {
    return targetWritesCookie(n.expression)
  }
  if (ts.isArrayLiteralExpression(n)) return n.elements.some((e) => targetWritesCookie(ts.isSpreadElement(e) ? e.expression : e))
  if (ts.isObjectLiteralExpression(n)) {
    return n.properties.some((q) => (ts.isPropertyAssignment(q) && targetWritesCookie(q.initializer)) || (ts.isSpreadAssignment(q) && targetWritesCookie(q.expression)))
  }
  if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) return targetWritesCookie(n.left)
  return false
}

function lintCookieParsed(p: Parsed): Finding[] {
  const out: Finding[] = []
  const bad = (n: ts.Node, message: string): void => void out.push(finding(p, n, COOKIE_RULE, message))
  const visit = (n: ts.Node): void => {
    if (ts.isBinaryExpression(n) && isAssignment(n.operatorToken.kind)) {
      if (isCookieMember(n.left)) bad(n, 'assigns document.cookie: the main origin sets no cookies')
      // a destructuring target writes cookie only through a member in it (`{ v: document.cookie }`); `({ cookie } = o)` writes a local
      else if (n.operatorToken.kind === ts.SyntaxKind.EqualsToken && targetWritesCookie(n.left)) bad(n, 'a destructuring assignment writes to cookie: the main origin sets no cookies')
    }
    // for (document.cookie of values) and for (document.cookie in object) assign on every turn
    if ((ts.isForOfStatement(n) || ts.isForInStatement(n)) && !ts.isVariableDeclarationList(n.initializer) && targetWritesCookie(n.initializer)) {
      bad(n, 'a loop assigns document.cookie: the main origin sets no cookies')
    }
    // document.cookie++ and the like
    if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && (n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken) && isCookieMember(n.operand)) {
      bad(n, 'an increment writes document.cookie: the main origin sets no cookies')
    }
    if (ts.isCallExpression(n)) {
      const callee = n.expression
      if (ts.isPropertyAccessExpression(callee)) {
        const obj = callee.expression
        const objName = ts.isIdentifier(obj) ? obj.text : ts.isPropertyAccessExpression(obj) ? obj.name.text : ''
        const method = callee.name.text
        if (objName === 'cookieStore' && (method === 'set' || method === 'delete')) bad(n, `cookieStore.${method}() writes a cookie: the main origin sets no cookies`)
        if (COOKIE_KEYED.has(`${objName}.${method}`) && textOf(n.arguments[1]) === 'cookie') {
          bad(n, `${objName}.${method}(…, "cookie", …) writes a cookie: the main origin sets no cookies`)
        }
        if (objName === 'Object' && method === 'assign' && n.arguments.slice(1).some(objectHasCookieKey)) bad(n, 'Object.assign(…, { cookie }) writes a cookie: the main origin sets no cookies')
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(p.sf)
  return out
}

export function lintCookie(sources: { file: string; text: string }[]): Finding[] {
  const out: Finding[] = []
  for (const s of sources) {
    if (/\.html?$/i.test(s.file)) {
      for (const m of s.text.matchAll(/<meta\b[^>]*http-equiv\s*=\s*["']?set-cookie["']?[^>]*>/gi)) {
        out.push({ file: s.file, line: s.text.slice(0, m.index ?? 0).split('\n').length, col: 1, rule: COOKIE_RULE, message: 'a Set-Cookie meta tag: the main origin sets no cookies' })
      }
      for (const sc of inlineScripts(s.file, s.text)) out.push(...lintCookieParsed(sc))
    } else out.push(...lintCookieParsed(parse(s.file, s.text)))
  }
  return out
}

// ---------------------------------------------------------------------------------------------- fragment

const FRAGMENT_RULE = 'fragment-parse'
/** Callees that decode or parse a string: a fragment's payload goes to none of them on the main origin. */
const SINK_FUNCTIONS = new Set(['atob', 'decodeURIComponent', 'decodeURI', 'unescape', 'eval', 'Function'])
const SINK_METHODS = new Set(['parse', 'decode', 'parseFromString', 'write', 'writeln', 'inflate', 'inflateRaw', 'ungzip'])

const isHashRead = (n: ts.Node): boolean => (ts.isPropertyAccessExpression(n) && n.name.text === 'hash') || (ts.isElementAccessExpression(n) && textOf(n.argumentExpression) === 'hash')

function lintFragmentParsed(p: Parsed): Finding[] {
  const tainted = new Set<string>()
  const mentionsTaint = (n: ts.Node): boolean => {
    let hit = false
    const visit = (c: ts.Node): void => {
      if (hit) return
      if (isHashRead(c) || (ts.isIdentifier(c) && tainted.has(c.text))) hit = true
      else ts.forEachChild(c, visit)
    }
    visit(n)
    return hit
  }
  // names that come from the hash: `const h = location.hash`, `const { hash } = useLocation()`, and anything built from them
  for (let pass = 0; pass < 6; pass += 1) {
    const before = tainted.size
    const visit = (n: ts.Node): void => {
      if (ts.isVariableDeclaration(n) && n.initializer) {
        if (ts.isIdentifier(n.name) && mentionsTaint(n.initializer)) tainted.add(n.name.text)
        if (ts.isObjectBindingPattern(n.name)) {
          for (const el of n.name.elements) {
            const prop = el.propertyName && ts.isIdentifier(el.propertyName) ? el.propertyName.text : ts.isIdentifier(el.name) ? el.name.text : ''
            if (ts.isIdentifier(el.name) && (prop === 'hash' || mentionsTaint(n.initializer))) tainted.add(el.name.text)
          }
        }
      }
      if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(n.left) && mentionsTaint(n.right)) tainted.add(n.left.text)
      ts.forEachChild(n, visit)
    }
    visit(p.sf)
    if (tainted.size === before) break
  }
  const out: Finding[] = []
  const bad = (n: ts.Node, what: string): void =>
    void out.push(finding(p, n, FRAGMENT_RULE, `${what} takes a value read from a URL fragment: only the instrument origin parses what a fragment carries`))
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
      const callee = n.expression
      const args = n.arguments ?? []
      let sink: string | null = null
      if (ts.isIdentifier(callee) && SINK_FUNCTIONS.has(callee.text)) sink = `${callee.text}()`
      else if (ts.isPropertyAccessExpression(callee) && SINK_METHODS.has(callee.name.text)) sink = `${ts.isIdentifier(callee.expression) ? `${callee.expression.text}.` : '.'}${callee.name.text}()`
      if (sink && args.some(mentionsTaint)) bad(n, sink)
    }
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left) && /^(?:inner|outer)HTML$/.test(n.left.name.text) && mentionsTaint(n.right)) bad(n, n.left.name.text)
    ts.forEachChild(n, visit)
  }
  visit(p.sf)
  return out
}

export function lintFragment(sources: { file: string; text: string }[]): Finding[] {
  const out: Finding[] = []
  for (const s of sources) {
    if (/\.html?$/i.test(s.file)) for (const sc of inlineScripts(s.file, s.text)) out.push(...lintFragmentParsed(sc))
    else out.push(...lintFragmentParsed(parse(s.file, s.text)))
  }
  return out
}

// ---------------------------------------------------------------------------------------------- parents (build output)

const PARENTS_RULE = 'production-parents'
const LOOPBACK = /(?:https?:\/\/)?(?:localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(?::\d+)?/i

/**
 * A production instrument build lists one parent origin, the production main origin (ARCHITECTURE.md section 5.5); development
 * builds add http://localhost:<port>, and GATE-bundle fails a production build that carries that. The check reads the host
 * page's own files in the build (HTML, scripts, JSON), not the engines, whose code may name localhost in its messages.
 */
export function lintParents(instrumentsDir: string, skip: ReadonlySet<string>): Finding[] {
  const out: Finding[] = []
  for (const abs of walkFiles(instrumentsDir, /\.(?:m?js|cjs|html?|json)$/i)) {
    const rel = relative(instrumentsDir, abs).split('\\').join('/')
    if (skip.has(rel) || /(?:^|\/)engines\//.test(rel)) continue
    const text = readFileSync(abs, 'utf8')
    const lines = text.split('\n')
    lines.forEach((l, i) => {
      const m = LOOPBACK.exec(l)
      if (m) out.push({ file: `apps/instruments/dist/${rel}`, line: i + 1, col: m.index + 1, rule: PARENTS_RULE, message: `a production instrument build names ${m[0]}: development parent origins stay out of production builds` })
    })
  }
  return out
}

export function formatFinding(f: Finding): string {
  return `${f.file}:${f.line}:${f.col} ${f.rule} ${f.message}`
}
