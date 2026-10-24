#!/usr/bin/env node
// vendor-drift: keeps vendor/kernelspace/ honest (ARCHITECTURE.md section 4.1).
//
// The vendored set is the file list in vendor/kernelspace/VENDOR.md. Each row records the SHA-256 of the
// bytes in this repository and of the upstream blob they came from. Vendored files are never edited in
// place; statespace changes live in wrapper modules. The one exception is a redaction (a mechanical
// substitution recorded in VENDOR.md) that the privacy rules require. The tool applies every redaction to
// the upstream bytes before it compares or writes anything, so a report shows real upstream changes only.
//
//   node scripts/vendor-drift.mjs verify
//       Offline. Fails when a vendored file differs from its recorded SHA-256 or mode, when a file is
//       missing or unlisted, when a file named AGENTS.md or CLAUDE.md is present (spine 11.1: they would bind
//       the course's own agents), or when the generated import table in VENDOR.md is stale.
//
//   node scripts/vendor-drift.mjs diff   --repo <path|url> --ref <commit-ish> [--no-diff]
//       Compares the vendored set with kernelspace at <ref> and prints a Markdown report: each file's
//       status, the unified diff of each changed file, and any import the new upstream adds that leaves the
//       vendored set. Exit 1 when anything drifted.
//
//   node scripts/vendor-drift.mjs update --repo <path|url> --ref <commit-ish> [--write]
//       The same comparison; with --write it also copies the new bytes, then rewrites the pinned commit,
//       the manifest and the import table in VENDOR.md. The result is an ordinary working-tree change for
//       review. A row with empty hashes in VENDOR.md is a new file: this is how a file enters the set.
//
//   node scripts/vendor-drift.mjs closure
//       Prints the generated import table (what verify compares against).
//
// The upstream location is never written in this repository: pass --repo, or set KERNELSPACE_REPO, to a
// local clone or a URL. --root <dir> runs the tool on another checkout (the tests use it). The tool reads the
// vendored files' import statements with the typescript package, so run npm install first.
// Exit codes: 0 clean, 1 drift or a failed check, 2 usage or an environment problem.

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

class Usage extends Error {}
const fail = (msg) => {
  throw new Usage(msg)
}

// ---------------------------------------------------------------------------------------------------------
// Arguments

function parseArgs(argv) {
  const [command, ...rest] = argv
  const opts = { command, repo: process.env.KERNELSPACE_REPO || '', ref: '', write: false, diff: true, root: path.resolve(HERE, '..') }
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    const value = () => {
      if (i + 1 >= rest.length) fail(`${a} needs a value`)
      return rest[++i]
    }
    if (a === '--repo') opts.repo = value()
    else if (a === '--ref') opts.ref = value()
    else if (a === '--root') opts.root = path.resolve(value())
    else if (a === '--write') opts.write = true
    else if (a === '--no-diff') opts.diff = false
    else fail(`unknown argument ${a}`)
  }
  if (!['verify', 'diff', 'update', 'closure'].includes(command ?? '')) fail('usage: vendor-drift.mjs verify | diff | update | closure (see the header of this file)')
  if ((command === 'diff' || command === 'update') && !opts.repo) fail('--repo <path|url> (or KERNELSPACE_REPO) is required: the upstream location is not written in this repository')
  if ((command === 'diff' || command === 'update') && !opts.ref) fail('--ref <commit-ish> is required')
  if (command === 'diff' && opts.write) fail('diff never writes; use update --write')
  return opts
}

// ---------------------------------------------------------------------------------------------------------
// VENDOR.md

const BLOCKS = {
  manifest: ['<!-- vendor-manifest:begin -->', '<!-- vendor-manifest:end -->'],
  redactions: ['<!-- vendor-redactions:begin -->', '<!-- vendor-redactions:end -->'],
  imports: ['<!-- vendor-imports:begin -->', '<!-- vendor-imports:end -->'],
}

function blockOf(text, name) {
  const [begin, end] = BLOCKS[name]
  const from = text.indexOf(begin)
  const to = text.indexOf(end)
  if (from < 0 || to < from) fail(`VENDOR.md has no ${begin} ... ${end} block`)
  return { from: from + begin.length, to, body: text.slice(from + begin.length, to) }
}

const unTick = (s) => s.trim().replace(/^`+|`+$/g, '')
const rowsOf = (body) =>
  body
    .split('\n')
    .filter((l) => l.startsWith('|'))
    .slice(2) // header and separator
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))

function readVendorMd(root) {
  const file = path.join(root, 'vendor', 'kernelspace', 'VENDOR.md')
  if (!existsSync(file)) fail('vendor/kernelspace/VENDOR.md does not exist')
  const text = readFileSync(file, 'utf8')
  const pin = /^\|\s*Pinned commit\s*\|\s*`([0-9a-f]{40})`\s*\|/m.exec(text)
  if (!pin) fail('VENDOR.md has no "| Pinned commit | `<40 hex>` |" row')
  const manifest = rowsOf(blockOf(text, 'manifest').body).map(([p, module, sha, upstream, mode, ...note]) => ({
    path: unTick(p),
    module,
    sha: unTick(sha ?? ''),
    upstream: unTick(upstream ?? ''),
    mode: unTick(mode ?? ''),
    note: note.join('|').trim(),
  }))
  const redactions = rowsOf(blockOf(text, 'redactions').body).map(([p, find, replace, why]) => ({ path: unTick(p), find: unTick(find), replace: unTick(replace), why }))
  const seen = new Set()
  for (const row of manifest) {
    if (seen.has(row.path)) fail(`VENDOR.md lists ${row.path} twice`)
    seen.add(row.path)
  }
  return { file, text, pin: pin[1], manifest, redactions }
}

// ---------------------------------------------------------------------------------------------------------
// Bytes, redactions, hashes

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

function applyRedactions(rel, buf, redactions) {
  let text = null
  for (const r of redactions) {
    if (r.path !== rel) continue
    text ??= buf.toString('utf8')
    const re = new RegExp(r.find, 'g')
    if (!re.test(text)) fail(`redaction for ${rel} no longer matches upstream; review VENDOR.md before updating`)
    text = text.replace(new RegExp(r.find, 'g'), r.replace)
  }
  return text === null ? buf : Buffer.from(text, 'utf8')
}

// ---------------------------------------------------------------------------------------------------------
// Imports that leave the vendored set (the generated table)

const SCANNED = /\.(ts|tsx|mts|js|mjs)$/
const NODE_BUILTINS = new Set(builtinModules.flatMap((m) => [m, m.replace(/^node:/, '')]))

let ts = null
async function loadTypeScript() {
  try {
    ts = (await import('typescript')).default
  } catch {
    fail('the typescript package is not installed (it reads the import statements of the vendored files); run npm ci at the repository root')
  }
}

/** [{spec, kind}] with kind runtime | type | dynamic. A clause of only `type` members is type-only. */
function importsOf(rel, source) {
  const sf = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true)
  const found = []
  const text = (n) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null)
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && text(node.moduleSpecifier) !== null) {
      const c = node.importClause
      const named = c && !c.name && c.namedBindings && ts.isNamedImports(c.namedBindings) ? c.namedBindings.elements : null
      const typeOnly = Boolean(c) && (c.isTypeOnly || (named !== null && named.length > 0 && named.every((e) => e.isTypeOnly)))
      found.push({ spec: node.moduleSpecifier.text, kind: typeOnly ? 'type' : 'runtime' })
    } else if (ts.isExportDeclaration(node) && text(node.moduleSpecifier) !== null) {
      found.push({ spec: node.moduleSpecifier.text, kind: node.isTypeOnly ? 'type' : 'runtime' })
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && text(node.moduleReference.expression) !== null) {
      found.push({ spec: node.moduleReference.expression.text, kind: 'runtime' })
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && text(node.arguments[0]) !== null) {
      found.push({ spec: node.arguments[0].text, kind: 'dynamic' })
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

const RESOLVE_EXT = ['', '.ts', '.tsx', '.js', '.mjs', '.json', '/index.ts', '/index.tsx', '/index.js']

function packageName(spec) {
  const parts = spec.split('/')
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

/** Rows [importer, specifier, kind, target] for imports that do not resolve inside the vendored set. */
function externalImports(files) {
  const inSet = new Set(files.keys())
  const rows = []
  for (const [rel, buf] of [...files].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (!SCANNED.test(rel)) continue
    for (const { spec, kind } of importsOf(rel, buf.toString('utf8'))) {
      if (spec.startsWith('node:') || NODE_BUILTINS.has(spec)) continue
      let target
      if (spec.startsWith('.') || spec.startsWith('@/')) {
        const base = spec.startsWith('@/') ? `src/${spec.slice(2)}` : path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec))
        if (RESOLVE_EXT.some((e) => inSet.has(base + e))) continue
        target = `${base} (not vendored)`
      } else if (spec.startsWith('bun:')) {
        target = `${spec} (bun only)`
      } else {
        target = `package ${packageName(spec)}`
      }
      rows.push([rel, spec, kind, target])
    }
  }
  const seen = new Set()
  return rows.filter((r) => {
    const key = r.join('\u0000')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const importsTable = (rows) =>
  [
    '| Importer | Imports | Kind | Target |',
    '|---|---|---|---|',
    ...rows.map(([importer, spec, kind, target]) => `| \`${importer}\` | \`${spec}\` | ${kind} | ${target} |`),
  ].join('\n')

// ---------------------------------------------------------------------------------------------------------
// The vendored tree as it is in this repository

const MODES = { 644: 0o644, 755: 0o755 }
const modeOf = (file) => ((statSync(file).mode & 0o111) !== 0 ? '755' : '644')

function listTree(dir, base = dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) listTree(full, base, out)
    else out.push(path.relative(base, full).split(path.sep).join('/'))
  }
  return out
}

function vendoredFiles(root, manifest) {
  const dir = path.join(root, 'vendor', 'kernelspace')
  const files = new Map()
  for (const row of manifest) {
    const file = path.join(dir, row.path)
    if (existsSync(file)) files.set(row.path, readFileSync(file))
  }
  return files
}

// ---------------------------------------------------------------------------------------------------------
// verify

function verify(opts) {
  const vm = readVendorMd(opts.root)
  const dir = path.join(opts.root, 'vendor', 'kernelspace')
  const problems = []
  const files = vendoredFiles(opts.root, vm.manifest)
  for (const row of vm.manifest) {
    const file = path.join(dir, row.path)
    if (!row.sha || !row.upstream) {
      problems.push(`${row.path}: listed without hashes (run update --write)`)
      continue
    }
    if (!existsSync(file)) {
      problems.push(`${row.path}: listed but missing`)
      continue
    }
    const actual = sha256(files.get(row.path))
    if (actual !== row.sha) problems.push(`${row.path}: SHA-256 is ${actual}, VENDOR.md records ${row.sha} (vendored files are never edited in place)`)
    if (modeOf(file) !== row.mode) problems.push(`${row.path}: mode ${modeOf(file)}, VENDOR.md records ${row.mode}`)
    const redacted = vm.redactions.some((r) => r.path === row.path)
    if (!redacted && row.sha !== row.upstream) problems.push(`${row.path}: vendored and upstream hashes differ but no redaction is recorded`)
  }
  const listed = new Set(vm.manifest.map((r) => r.path))
  for (const rel of listTree(dir)) {
    const name = rel.split('/').pop()
    if (rel === 'VENDOR.md' || rel === '.gitattributes' || /^(LICENSE|COPYING|NOTICE)/i.test(rel)) continue
    if (!listed.has(rel)) problems.push(`${rel}: present but not listed in VENDOR.md`)
    if (name === 'AGENTS.md' || name === 'CLAUDE.md') problems.push(`${rel}: a file named ${name} would bind the course's own agents (spine 11.1)`)
  }
  const current = importsTable(externalImports(files))
  if (blockOf(vm.text, 'imports').body.trim() !== current.trim()) problems.push('VENDOR.md import table is stale (run update --write, or closure to see the current one)')
  if (problems.length > 0) {
    console.log(`vendor-drift: FAIL (${problems.length})`)
    for (const p of problems) console.log(`  ${p}`)
    return 1
  }
  console.log(`vendor-drift: ok (${vm.manifest.length} files match VENDOR.md at ${vm.pin.slice(0, 12)})`)
  return 0
}

// ---------------------------------------------------------------------------------------------------------
// Upstream access

function git(cwd, args, { allowFail = false } = {}) {
  const res = spawnSync('git', args, { cwd, encoding: 'buffer', maxBuffer: 1 << 28 })
  if (res.status !== 0 && !allowFail) fail(`git ${args.join(' ')} failed: ${res.stderr?.toString().trim()}`)
  return res
}

/** An upstream accessor for a local clone or a URL (fetched shallow into a temporary repository). */
function openUpstream(repo, ref) {
  let dir = repo
  let cleanup = () => {}
  if (!existsSync(repo)) {
    dir = mkdtempSync(path.join(tmpdir(), 'vendor-drift-'))
    cleanup = () => rmSync(dir, { recursive: true, force: true })
    git(dir, ['init', '-q'])
    git(dir, ['fetch', '-q', '--depth', '1', repo, ref])
    ref = 'FETCH_HEAD'
  }
  const sha = git(dir, ['rev-parse', '--verify', `${ref}^{commit}`]).stdout.toString().trim()
  const date = git(dir, ['show', '-s', '--format=%cI', sha]).stdout.toString().trim()
  return {
    sha,
    date: new Date(date).toISOString().replace(/\.\d+Z$/, 'Z'),
    cleanup,
    blob(rel) {
      const res = git(dir, ['cat-file', 'blob', `${sha}:${rel}`], { allowFail: true })
      return res.status === 0 ? res.stdout : null
    },
    mode(rel) {
      const res = git(dir, ['ls-tree', sha, '--', rel], { allowFail: true })
      const m = /^(\d{6})/.exec(res.stdout.toString())
      return m && m[1] === '100755' ? '755' : '644'
    },
    renamedFrom(oldSha, rel) {
      const res = git(dir, ['diff', '--name-status', '-M', '--diff-filter=R', oldSha, sha], { allowFail: true })
      if (res.status !== 0) return null
      for (const line of res.stdout.toString().split('\n')) {
        const [, from, to] = line.split('\t')
        if (from === rel) return to
      }
      return null
    },
  }
}

function unifiedDiff(rel, before, after) {
  const dir = mkdtempSync(path.join(tmpdir(), 'vendor-drift-diff-'))
  try {
    for (const [side, buf] of [['a', before], ['b', after]]) {
      mkdirSync(path.dirname(path.join(dir, side, rel)), { recursive: true })
      writeFileSync(path.join(dir, side, rel), buf)
    }
    const res = spawnSync('git', ['diff', '--no-index', '--no-color', '--unified=3', `a/${rel}`, `b/${rel}`], { cwd: dir, encoding: 'utf8', maxBuffer: 1 << 28 })
    return res.stdout.trimEnd()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ---------------------------------------------------------------------------------------------------------
// diff and update

function compare(opts) {
  const vm = readVendorMd(opts.root)
  const up = openUpstream(opts.repo, opts.ref)
  try {
    return compareWith(opts, vm, up)
  } catch (err) {
    up.cleanup()
    throw err
  }
}

function compareWith(opts, vm, up) {
  const dir = path.join(opts.root, 'vendor', 'kernelspace')
  const entries = []
  const nextFiles = new Map()
  for (const row of vm.manifest) {
    const local = existsSync(path.join(dir, row.path)) ? readFileSync(path.join(dir, row.path)) : null
    const raw = up.blob(row.path)
    if (raw === null) {
      entries.push({ row, status: 'missing', renamed: up.renamedFrom(vm.pin, row.path), local })
      continue
    }
    const expected = applyRedactions(row.path, raw, vm.redactions)
    const mode = up.mode(row.path)
    nextFiles.set(row.path, expected)
    const isNew = !row.sha
    const status = isNew ? 'new' : local && sha256(local) === sha256(expected) && row.mode === mode ? 'unchanged' : 'changed'
    entries.push({ row, status, local, raw, expected, mode })
  }
  return { vm, up, entries, nextFiles }
}

function report(opts, cmp) {
  const { vm, up, entries, nextFiles } = cmp
  const count = (s) => entries.filter((e) => e.status === s).length
  const lines = []
  lines.push(`# Vendor drift: ${vm.pin.slice(0, 12)} to ${up.sha.slice(0, 12)}`, '')
  lines.push(`Pinned commit ${vm.pin}; compared with ${up.sha} (committed ${up.date}).`, '')
  if (vm.pin !== up.sha && entries.every((e) => e.status === 'unchanged')) lines.push('No vendored file changed between the two commits; update --write would only move the pin.', '')
  lines.push(`| Status | Files |`, '|---|---|')
  for (const s of ['unchanged', 'changed', 'new', 'missing']) lines.push(`| ${s} | ${count(s)} |`)
  lines.push('')
  for (const e of entries.filter((x) => x.status !== 'unchanged')) {
    lines.push(`## ${e.status}: \`${e.row.path}\``, '')
    if (e.status === 'missing') {
      lines.push(e.renamed ? `Upstream renamed it to \`${e.renamed}\`.` : 'The file is not in the new upstream tree (deleted, or moved without rename detection).', '')
      continue
    }
    lines.push(`Vendored ${e.row.sha ? `\`${e.row.sha.slice(0, 16)}\`` : '(none)'} to \`${sha256(e.expected).slice(0, 16)}\` (upstream blob \`${sha256(e.raw).slice(0, 16)}\`), mode ${e.mode}.`, '')
    if (opts.diff && e.status === 'changed' && e.local) lines.push('```diff', unifiedDiff(e.row.path, e.local, e.expected), '```', '')
  }
  const before = externalImports(vendoredFiles(opts.root, vm.manifest))
  const after = externalImports(nextFiles)
  const key = (r) => r.join('\u0000')
  const known = new Set(before.map(key))
  const added = after.filter((r) => !known.has(key(r)))
  lines.push('## Imports that leave the vendored set', '')
  lines.push(added.length === 0 ? 'No new ones.' : `${added.length} new:\n\n${importsTable(added)}`, '')
  return lines.join('\n')
}

const rowCells = (r) => `| \`${r.path}\` | ${r.module} | \`${r.sha}\` | \`${r.upstream}\` | ${r.mode} | ${r.note} |`

function writeUpdate(opts, cmp) {
  const { vm, up, entries, nextFiles } = cmp
  const dir = path.join(opts.root, 'vendor', 'kernelspace')
  // refuse before touching anything: a half-applied update would leave files and manifest disagreeing
  for (const e of entries) {
    if (e.status === 'missing') fail(`${e.row.path} is missing at ${up.sha.slice(0, 12)}; edit the manifest in VENDOR.md (drop or rename the row) and run again`)
  }
  for (const e of entries) {
    const file = path.join(dir, e.row.path)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, e.expected)
    chmodSync(file, MODES[e.mode])
    e.row.sha = sha256(e.expected)
    e.row.upstream = sha256(e.raw)
    e.row.mode = e.mode
  }
  let text = vm.text
  const replaceBlock = (name, body) => {
    const b = blockOf(text, name)
    text = `${text.slice(0, b.from)}\n${body}\n${text.slice(b.to)}`
  }
  const header = '| Path | Module | SHA-256 (this repository) | SHA-256 (upstream blob) | Mode | Note |\n|---|---|---|---|---|---|'
  replaceBlock('manifest', `${header}\n${entries.map((e) => rowCells(e.row)).join('\n')}`)
  replaceBlock('imports', importsTable(externalImports(nextFiles)))
  text = text.replace(/^(\|\s*Pinned commit\s*\|\s*)`[0-9a-f]{40}`/m, `$1\`${up.sha}\``)
  text = text.replace(/^(\|\s*Commit date\s*\|\s*)[^|]*\|/m, `$1${up.date} |`)
  text = text.replace(/^(\|\s*Files\s*\|\s*)[^|]*\|/m, `$1${entries.length} |`)
  text = text.replace(/^(\|\s*Last updated\s*\|\s*)[^|]*\|/m, `$1${new Date().toISOString().slice(0, 10)} |`)
  writeFileSync(vm.file, text)
}

async function run(opts) {
  await loadTypeScript()
  if (opts.command === 'verify') return verify(opts)
  if (opts.command === 'closure') {
    const vm = readVendorMd(opts.root)
    console.log(importsTable(externalImports(vendoredFiles(opts.root, vm.manifest))))
    return 0
  }
  const cmp = compare(opts)
  try {
    console.log(report(opts, cmp))
    const drift = cmp.entries.some((e) => e.status !== 'unchanged')
    if (opts.command === 'update' && opts.write) {
      writeUpdate(opts, cmp)
      console.log(`vendor-drift: wrote ${cmp.entries.length} files and VENDOR.md at ${cmp.up.sha.slice(0, 12)}`)
      return 0
    }
    if (opts.command === 'update') console.log('vendor-drift: dry run (pass --write to apply)')
    return drift ? 1 : 0
  } finally {
    cmp.up.cleanup()
  }
}

try {
  process.exitCode = await run(parseArgs(process.argv.slice(2)))
} catch (err) {
  if (err instanceof Usage) {
    console.error(`vendor-drift: ${err.message}`)
    process.exitCode = 2
  } else throw err
}
