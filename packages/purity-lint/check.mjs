#!/usr/bin/env node
// purity-lint: the lint that keeps packages/ pure and vendored code behind its wrappers
// (ARCHITECTURE.md sections 4.1 and 17.2). It runs in the fast lane's build step.
//
//   node packages/purity-lint/check.mjs [--root <dir>]
//
// It parses every source file with the TypeScript compiler, so comments and strings never trip it, and
// checks:
//   PURE-GLOBAL      packages/*/src: a reference to a browser, network, worker or Node global (window,
//                    document, fetch, indexedDB, localStorage, process, Worker, ...). A name the file declares
//                    itself (a variable called `history`) is not a reference to the global.
//   PURE-GLOBALTHIS  packages/*/src: the same names reached through globalThis, self or window.
//   PURE-IMPORT      packages/*/src: an import, re-export, dynamic import or require of a Node module
//                    (node:fs, path, ...) or of a URL. Packages run unchanged on the main origin, in a worker
//                    and in Node, so they may import only other code.
//   PKG-APP-IMPORT   packages/*/src: an import that reaches into apps/.
//   VENDOR-IMPORT    apps/*/src and packages/*/src: an import that reaches into vendor/ from outside a wrapper
//                    home. Vendored code is imported only through wrapper modules.
// The packages' tsconfig files add a second layer: they compile with no DOM, WebWorker or Node types, so the
// same names are also compile errors there.
//
// Out of scope by design: tests and tooling (they sit outside src/), declaration files, and the vendored files
// themselves. Exit codes: 0 clean, 1 findings, 2 usage or environment problem.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { builtinModules } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

let ts
try {
  ts = (await import('typescript')).default
} catch {
  console.error('purity-lint: the typescript package is not installed; run npm ci at the repository root')
  process.exit(2)
}

/** Repository-relative directories that may import vendor/: the wrapper homes of ARCHITECTURE.md section 4.2. */
export const WRAPPER_HOMES = [
  'packages/rng/',
  'packages/learner/src/schedule/',
  'apps/site/src/sw/',
  'apps/instruments/src/sw/',
  'apps/instruments/src/lane-a/',
]

const FORBIDDEN_GLOBALS = new Set([
  // the page and its storage
  'window', 'document', 'navigator', 'location', 'history', 'screen', 'alert', 'confirm', 'prompt',
  'localStorage', 'sessionStorage', 'indexedDB', 'IDBKeyRange', 'caches', 'customElements',
  // the network
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'WebTransport', 'RTCPeerConnection',
  // workers and messaging: the bus is the only contract between the apps, and it lives in the apps
  'Worker', 'SharedWorker', 'BroadcastChannel', 'MessageChannel', 'postMessage', 'importScripts', 'self',
  // Node and other runtimes
  'process', 'Buffer', 'require', 'module', 'exports', '__dirname', '__filename', 'global', 'Deno', 'Bun',
])
const GLOBAL_ROOTS = new Set(['globalThis', 'self', 'window', 'global'])
const NODE_MODULES = new Set(builtinModules.flatMap((m) => [m, m.replace(/^node:/, '')]))
const SOURCE = /\.(ts|tsx|mts|js|mjs)$/

// ------------------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..') }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root' && argv[i + 1]) opts.root = path.resolve(argv[++i])
    else {
      console.error(`purity-lint: unknown argument ${argv[i]}\nusage: check.mjs [--root <dir>]`)
      process.exit(2)
    }
  }
  return opts
}

function walk(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist') continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, out)
    else if (SOURCE.test(e.name) && !e.name.endsWith('.d.ts')) out.push(full)
  }
  return out
}

/** `<root>/<area>/<name>/src/**` for every name under the area. */
function sourcesOf(root, area) {
  const base = path.join(root, area)
  let names = []
  try {
    names = readdirSync(base).filter((n) => statSync(path.join(base, n)).isDirectory())
  } catch {
    // no such area in this tree
  }
  return names.flatMap((n) => walk(path.join(base, n, 'src')))
}

// ------------------------------------------------------------------------------------------------------
// Names a file declares itself (not through `declare`), so that a local `history` is not the global one.

function declaredNames(sf) {
  const names = new Set()
  const bind = (name) => {
    if (ts.isIdentifier(name)) names.add(name.text)
    else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) for (const el of name.elements) if (ts.isBindingElement(el)) bind(el.name)
  }
  const ambient = (node) => (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Ambient) !== 0
  const visit = (node) => {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) && !ambient(node)) bind(node.name)
    else if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name && !ambient(node)) names.add(node.name.text)
    else if (ts.isImportClause(node) && node.name) names.add(node.name.text)
    else if (ts.isImportSpecifier(node) || ts.isNamespaceImport(node)) names.add(node.name.text)
    else if (ts.isCatchClause(node) && node.variableDeclaration) bind(node.variableDeclaration.name)
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return names
}

/** True when the identifier is used as a value, not as a property name, a declaration or a type. */
function isValueReference(id) {
  const p = id.parent
  if (ts.isPropertyAccessExpression(p)) return p.expression === id
  if (ts.isQualifiedName(p) || ts.isTypeReferenceNode(p) || ts.isTypeQueryNode(p)) return false
  if (ts.isExpressionWithTypeArguments(p)) return ts.isHeritageClause(p.parent) && p.parent.token === ts.SyntaxKind.ExtendsKeyword && ts.isClassLike(p.parent.parent)
  if (ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p) || ts.isPropertySignature(p) || ts.isMethodDeclaration(p) || ts.isMethodSignature(p) || ts.isGetAccessor(p) || ts.isSetAccessor(p) || ts.isEnumMember(p)) return p.name !== id
  if (ts.isBindingElement(p)) return p.initializer === id
  if (ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isClassDeclaration(p) || ts.isClassExpression(p)) return p.name !== id
  if (ts.isImportSpecifier(p) || ts.isExportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p) || ts.isNamespaceExport(p)) return false
  if (ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p) || ts.isTypeParameterDeclaration(p) || ts.isModuleDeclaration(p) || ts.isEnumDeclaration(p)) return false
  if (ts.isLabeledStatement(p) || ts.isBreakStatement(p) || ts.isContinueStatement(p)) return false
  if (ts.isJsxAttribute(p)) return false
  return true
}

const stringOf = (node) => (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null)

function specifiersOf(sf) {
  const out = []
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && stringOf(node.moduleSpecifier) !== null) out.push({ node: node.moduleSpecifier, spec: node.moduleSpecifier.text })
    else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && stringOf(node.moduleReference.expression) !== null) out.push({ node: node.moduleReference.expression, spec: node.moduleReference.expression.text })
    else if (ts.isCallExpression(node) && node.arguments.length > 0 && stringOf(node.arguments[0]) !== null) {
      const callee = node.expression
      if (callee.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(callee) && callee.text === 'require')) out.push({ node: node.arguments[0], spec: stringOf(node.arguments[0]) })
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}

// ------------------------------------------------------------------------------------------------------

function lintFile(root, file, { pure }) {
  const rel = path.relative(root, file).split(path.sep).join('/')
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const findings = []
  const report = (node, rule, message) => {
    const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf))
    findings.push(`${rel}:${line + 1}:${character + 1} ${rule} ${message}`)
  }

  for (const { node, spec } of specifiersOf(sf)) {
    if (pure && (spec.startsWith('node:') || NODE_MODULES.has(spec))) report(node, 'PURE-IMPORT', `${spec} is a Node module; packages run unchanged in the browser, a worker and Node`)
    if (pure && /^(https?|data|blob|file):/.test(spec)) report(node, 'PURE-IMPORT', `${spec} is a URL import; packages import code, never the network`)
    if (spec.startsWith('.')) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec))
      if (pure && (target === 'apps' || target.startsWith('apps/'))) report(node, 'PKG-APP-IMPORT', `${spec} reaches into apps/; packages are shared code and depend on no app`)
      if ((target === 'vendor' || target.startsWith('vendor/')) && !WRAPPER_HOMES.some((h) => rel.startsWith(h))) {
        report(node, 'VENDOR-IMPORT', `${spec} reaches into vendor/ from outside a wrapper home (${WRAPPER_HOMES.join(', ')})`)
      }
    }
  }

  if (pure) {
    const own = declaredNames(sf)
    const visit = (node) => {
      const viaGlobalObject =
        ts.isIdentifier(node) && ts.isPropertyAccessExpression(node.parent) && node.parent.expression === node && GLOBAL_ROOTS.has(node.text) && FORBIDDEN_GLOBALS.has(node.parent.name.text)
      if (ts.isIdentifier(node) && FORBIDDEN_GLOBALS.has(node.text) && !own.has(node.text) && !viaGlobalObject && isValueReference(node)) {
        report(node, 'PURE-GLOBAL', `${node.text} is a platform global; packages are pure (no DOM, storage, network or Node)`)
      }
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && GLOBAL_ROOTS.has(node.expression.text) && FORBIDDEN_GLOBALS.has(node.name.text)) {
        report(node, 'PURE-GLOBALTHIS', `${node.expression.text}.${node.name.text} reaches a platform global through the global object`)
      }
      if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && GLOBAL_ROOTS.has(node.expression.text)) {
        const key = stringOf(node.argumentExpression)
        if (key === null || FORBIDDEN_GLOBALS.has(key)) report(node, 'PURE-GLOBALTHIS', `${node.expression.text}[${key === null ? '...' : JSON.stringify(key)}] reaches a platform global through the global object`)
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return findings
}

const opts = parseArgs(process.argv.slice(2))
const packageFiles = sourcesOf(opts.root, 'packages')
const appFiles = sourcesOf(opts.root, 'apps')
const findings = [
  ...packageFiles.flatMap((f) => lintFile(opts.root, f, { pure: true })),
  ...appFiles.flatMap((f) => lintFile(opts.root, f, { pure: false })),
]
const checked = packageFiles.length + appFiles.length
if (findings.length > 0) {
  console.log(findings.join('\n'))
  console.log(`purity-lint: FAIL (${findings.length} findings in ${checked} files)`)
  process.exitCode = 1
} else {
  console.log(`purity-lint: ok (${packageFiles.length} package files pure; ${appFiles.length} app files import vendor/ only through a wrapper home)`)
}
