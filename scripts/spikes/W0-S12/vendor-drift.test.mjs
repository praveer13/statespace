// Tests for scripts/vendor-drift.mjs on a throwaway upstream repository and a throwaway statespace tree.
// Nothing here touches vendor/kernelspace/ itself (that is `npm run vendor:verify`).
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'vendor-drift.mjs')
const scratch = mkdtempSync(path.join(tmpdir(), 'vendor-drift-test-'))
const upstream = path.join(scratch, 'upstream')
const root = path.join(scratch, 'tree')
const vendorDir = path.join(root, 'vendor', 'kernelspace')
const manifestFile = path.join(vendorDir, 'VENDOR.md')
after(() => rmSync(scratch, { recursive: true, force: true }))

const git = (...args) => {
  const res = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: upstream, encoding: 'utf8' })
  assert.equal(res.status, 0, `git ${args.join(' ')}: ${res.stderr}`)
  return res.stdout.trim()
}
const put = (rel, text, mode) => {
  mkdirSync(path.dirname(path.join(upstream, rel)), { recursive: true })
  writeFileSync(path.join(upstream, rel), text)
  if (mode) chmodSync(path.join(upstream, rel), mode)
}
const commit = (msg) => {
  git('add', '-A')
  git('commit', '-q', '-m', msg)
  return git('rev-parse', 'HEAD')
}
const drift = (...args) => {
  const res = spawnSync(process.execPath, [SCRIPT, ...args, '--root', root], { encoding: 'utf8' })
  return { status: res.status, out: res.stdout + res.stderr }
}
const vendored = (rel) => path.join(vendorDir, rel)

const HOST_RE = '(https://)[^/]+(/forge/)'
function vendorMd(paths) {
  const rows = paths.map(([p, mod]) => `| \`${p}\` | ${mod} | \`\` | \`\` | 644 | |`).join('\n')
  return `# vendor/kernelspace

| Field | Value |
|---|---|
| Pinned commit | \`${'0'.repeat(40)}\` |
| Commit date | none |
| Last updated | none |
| Files | 0 |

<!-- vendor-manifest:begin -->
| Path | Module | SHA-256 (this repository) | SHA-256 (upstream blob) | Mode | Note |
|---|---|---|---|---|---|
${rows}
<!-- vendor-manifest:end -->

<!-- vendor-redactions:begin -->
| Path | Find (regular expression) | Replace | Why |
|---|---|---|---|
| \`tool.py\` | \`${HOST_RE}\` | \`$1<course-domain>$2\` | test |
<!-- vendor-redactions:end -->

<!-- vendor-imports:begin -->
| Importer | Imports | Kind | Target |
|---|---|---|---|
<!-- vendor-imports:end -->
`
}

let c1
before(() => {
  mkdirSync(upstream, { recursive: true })
  git('init', '-q')
  put('src/a.ts', "import { b } from './b'\nimport type { T } from '../missing/types'\nexport const a: T = b + 1\n")
  put('src/b.ts', 'export const b = 1\n')
  put('run.sh', '#!/bin/sh\necho hi\n', 0o755)
  put('tool.py', 'URL = f"https://private.example.invalid/forge/{x}"\n')
  c1 = commit('one')
  mkdirSync(vendorDir, { recursive: true })
  writeFileSync(manifestFile, vendorMd([['src/a.ts', 'm'], ['src/b.ts', 'm'], ['run.sh', 'm'], ['tool.py', 'm']]))
})

test('update --write vendors the files, applies the redaction and keeps the mode', () => {
  const res = drift('update', '--repo', upstream, '--ref', c1, '--write')
  assert.equal(res.status, 0, res.out)
  assert.ok(existsSync(vendored('src/a.ts')))
  assert.equal(readFileSync(vendored('tool.py'), 'utf8'), 'URL = f"https://<course-domain>/forge/{x}"\n')
  assert.equal(statSync(vendored('run.sh')).mode & 0o111, 0o111, 'the executable bit survives')
  const md = readFileSync(manifestFile, 'utf8')
  assert.match(md, new RegExp(`Pinned commit \\| \`${c1}\``))
  assert.match(md, /\| Files \| 4 \|/)
  assert.match(md, /`..\/missing\/types` \| type \| missing\/types \(not vendored\)/)
  assert.doesNotMatch(md, /private\.example/)
  const verified = drift('verify')
  assert.equal(verified.status, 0, verified.out)
})

test('a redacted file shows no drift against the commit it came from', () => {
  const res = drift('diff', '--repo', upstream, '--ref', c1)
  assert.equal(res.status, 0, res.out)
  assert.match(res.out, /\| unchanged \| 4 \|/)
})

test('verify fails on an edited file, an unlisted file and a file named AGENTS.md', () => {
  const original = readFileSync(vendored('src/b.ts'))
  writeFileSync(vendored('src/b.ts'), `${original.toString()}// edited\n`)
  let res = drift('verify')
  assert.equal(res.status, 1)
  assert.match(res.out, /src\/b\.ts: SHA-256 is/)
  writeFileSync(vendored('src/b.ts'), original)

  writeFileSync(vendored('extra.ts'), 'export {}\n')
  res = drift('verify')
  assert.equal(res.status, 1)
  assert.match(res.out, /extra\.ts: present but not listed/)
  rmSync(vendored('extra.ts'))

  writeFileSync(vendored('.gitattributes'), '* -text\n')
  assert.equal(drift('verify').status, 0, 'a .gitattributes beside VENDOR.md is allowed')
  rmSync(vendored('.gitattributes'))

  writeFileSync(vendored('AGENTS.md'), '# bind\n')
  res = drift('verify')
  assert.equal(res.status, 1)
  assert.match(res.out, /AGENTS\.md: a file named AGENTS\.md would bind/)
  rmSync(vendored('AGENTS.md'))

  chmodSync(vendored('run.sh'), 0o644)
  res = drift('verify')
  assert.equal(res.status, 1)
  assert.match(res.out, /run\.sh: mode 644, VENDOR\.md records 755/)
  chmodSync(vendored('run.sh'), 0o755)

  assert.equal(drift('verify').status, 0)
})

let c2
test('diff reports a changed file with its diff and the imports the update adds', () => {
  put('src/a.ts', "import { b } from './b'\nimport type { T } from '../missing/types'\nimport { z } from '../lib/z'\nexport const a: T = b + z\n")
  put('tool.py', 'URL = f"https://private.example.invalid/forge/{x}"\nMORE = 1\n')
  c2 = commit('two')
  const res = drift('diff', '--repo', upstream, '--ref', c2)
  assert.equal(res.status, 1, res.out)
  assert.match(res.out, /\| changed \| 2 \|/)
  assert.match(res.out, /\+import \{ z \} from '\.\.\/lib\/z'/)
  assert.match(res.out, /`\.\.\/lib\/z` \| runtime \| lib\/z \(not vendored\)/)
  assert.doesNotMatch(res.out, /private\.example/, 'a report never shows the redacted host')
  assert.equal(drift('verify').status, 0, 'diff wrote nothing')
})

test('update without --write is a dry run', () => {
  const before = readFileSync(vendored('src/a.ts'), 'utf8')
  const res = drift('update', '--repo', upstream, '--ref', c2)
  assert.equal(res.status, 1)
  assert.match(res.out, /dry run/)
  assert.equal(readFileSync(vendored('src/a.ts'), 'utf8'), before)
})

test('a file the new commit lacks stops update --write, and dropping its row lets it go on', () => {
  git('rm', '-q', 'src/b.ts')
  const c3 = commit('three')
  const diff = drift('diff', '--repo', upstream, '--ref', c3)
  assert.equal(diff.status, 1)
  assert.match(diff.out, /missing: `src\/b\.ts`/)
  const stopped = drift('update', '--repo', upstream, '--ref', c3, '--write')
  assert.equal(stopped.status, 2, stopped.out)
  assert.match(stopped.out, /src\/b\.ts is missing/)
  assert.equal(drift('verify').status, 0, 'a refused update changed nothing')

  writeFileSync(manifestFile, readFileSync(manifestFile, 'utf8').split('\n').filter((l) => !l.startsWith('| `src/b.ts`')).join('\n'))
  rmSync(vendored('src/b.ts'))
  const done = drift('update', '--repo', upstream, '--ref', c3, '--write')
  assert.equal(done.status, 0, done.out)
  assert.equal(drift('verify').status, 0)
  assert.match(readFileSync(manifestFile, 'utf8'), new RegExp(`Pinned commit \\| \`${c3}\``))
  assert.match(readFileSync(vendored('src/a.ts'), 'utf8'), /import \{ z \}/)
  assert.match(readFileSync(manifestFile, 'utf8'), /\| Files \| 3 \|/)
})

test('a redaction that no longer matches upstream is an error, not a silent pass', () => {
  put('tool.py', 'NO_URL_HERE = 1\n')
  const c4 = commit('four')
  const res = drift('diff', '--repo', upstream, '--ref', c4)
  assert.equal(res.status, 2, res.out)
  assert.match(res.out, /redaction for tool\.py no longer matches upstream/)
})

test('usage errors exit 2: no --repo, no --ref, an unknown command', () => {
  const env = { ...process.env, KERNELSPACE_REPO: '' }
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args, '--root', root], { encoding: 'utf8', env })
  assert.equal(run('diff', '--ref', 'HEAD').status, 2)
  assert.equal(run('diff', '--repo', upstream).status, 2)
  assert.equal(run('frobnicate').status, 2)
})
