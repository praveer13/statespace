import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { REPO, aliasBomb, fixture } from './helpers.ts'

const SCRIPT = join(REPO, 'scripts', 'build-content.mjs')
const made: string[] = []
after(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true })
})

/** A scratch tree with the fixture content, the two runs it cites, the facts and the schemas. */
function tree(): { root: string; out: string } {
  const root = mkdtempSync(join(tmpdir(), 'content-build-'))
  made.push(root)
  const put = (path: string, text: string): void => {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  put('content/stages/S1/S1.L1.md', fixture('lessons/S1.L1.md'))
  put('content/drawers/D-03.md', fixture('drawers/D-03.md'))
  put('content/stages/S1/stage.yaml', fixture('stages/S1.stage.yaml'))
  put('content/stages/S1/lab.yaml', fixture('stages/S1.lab.yaml'))
  mkdirSync(join(root, 'runs'), { recursive: true })
  for (const id of ['RUN-z3-starter', 'RUN-z3-bv64']) cpSync(join(REPO, 'runs', `${id}.json`), join(root, 'runs', `${id}.json`))
  mkdirSync(join(root, 'content/registry'), { recursive: true })
  cpSync(join(REPO, 'content/registry/facts.json'), join(root, 'content/registry/facts.json'))
  mkdirSync(join(root, 'schemas'), { recursive: true })
  for (const name of ['defs', 'lesson']) cpSync(join(REPO, 'schemas', `${name}.schema.json`), join(root, 'schemas', `${name}.schema.json`))
  return { root, out: join(root, 'public') }
}

const run = (args: string[]): { status: number | null; stdout: string; stderr: string } => {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' })
  return { status: r.status, stdout: r.stdout, stderr: r.stderr }
}
const files = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name).slice(dir.length + 1))
    .sort()

test('a build writes the pages, the Markdown, the indexes and the schemas under the output directory', () => {
  const { root, out } = tree()
  const r = run(['--root', root, '--out', out, '--built-at', '2026-10-25'])
  assert.equal(r.status, 0, r.stdout + r.stderr)
  assert.match(r.stdout, /built 1 lessons, 1 drawers, 1 stage records and 1 lab records/)
  const written = files(out)
  assert.ok(written.includes('content/manifest.json'))
  assert.ok(written.includes('md/S1.L1.md'))
  assert.ok(written.includes('md/D-03.md'))
  assert.ok(written.includes('schemas/lesson.schema.json'))
  assert.ok(written.some((f) => /^content\/S1\.L1\.[0-9a-f]{12}\.json$/.test(f)))
  const manifest = JSON.parse(readFileSync(join(out, 'content/manifest.json'), 'utf8')) as { lessons: Record<string, { file: string }>; builtAt: string }
  assert.equal(manifest.builtAt, '2026-10-25')
  assert.ok(existsSync(join(out, manifest.lessons['S1.L1']?.file ?? 'missing')))
})

test('a second build is byte for byte the first, and clears what no longer exists', () => {
  const { root, out } = tree()
  assert.equal(run(['--root', root, '--out', out, '--built-at', '2026-10-25']).status, 0)
  const first = files(out).map((f) => [f, readFileSync(join(out, f), 'utf8')])
  writeFileSync(join(out, 'content/stale.json'), '{}')
  writeFileSync(join(out, 'md/stale.md'), 'old')
  rmSync(join(root, 'content/drawers/D-03.md'))
  assert.equal(run(['--root', root, '--out', out, '--built-at', '2026-10-25']).status, 0)
  const second = files(out)
  assert.ok(!second.includes('content/stale.json') && !second.includes('md/stale.md'))
  assert.ok(!second.includes('md/D-03.md'), 'a page that is gone leaves no file')
  assert.deepEqual(
    second.filter((f) => !f.includes('manifest') && !f.includes('search') && !f.includes('D-03') && !f.includes('stages.') && !f.includes('md/index')),
    first.map(([f]) => f as string).filter((f) => !f.includes('manifest') && !f.includes('search') && !f.includes('D-03') && !f.includes('stages.') && !f.includes('md/index')),
  )
})

test('--check validates and writes nothing', () => {
  const { root, out } = tree()
  const r = run(['--root', root, '--out', out, '--check'])
  assert.equal(r.status, 0, r.stdout + r.stderr)
  assert.match(r.stdout, /nothing written \(--check\)/)
  assert.ok(!existsSync(out))
})

test('an error fails the build, prints file and line, and leaves the output untouched', () => {
  const { root, out } = tree()
  mkdirSync(join(out, 'content'), { recursive: true })
  writeFileSync(join(out, 'content/keep.json'), '{"kept":true}')
  const lesson = join(root, 'content/stages/S1/S1.L1.md')
  writeFileSync(lesson, fixture('lessons/S1.L1.md').replace('KC-1.witness-class', 'KC-1.typo-slug'))
  const r = run(['--root', root, '--out', out])
  assert.equal(r.status, 1)
  assert.match(r.stdout, /error content\/stages\/S1\/S1\.L1\.md:6 \[unknown-kc\] KC-1\.typo-slug is not a knowledge component/)
  assert.equal(readFileSync(join(out, 'content/keep.json'), 'utf8'), '{"kept":true}')
  assert.deepEqual(readdirSync(join(out, 'content')), ['keep.json'])
})

test('--strict fails on a warning, and the default does not', () => {
  const { root, out } = tree()
  assert.equal(run(['--root', root, '--out', out]).status, 0)
  const r = run(['--root', root, '--out', out, '--strict'])
  assert.equal(r.status, 1)
  assert.match(r.stdout, /warn  content\/stages\/S1\/S1\.L1\.md:1 \[row-differs\]/)
})

test('--json prints the report and the problems as JSON', () => {
  const { root, out } = tree()
  const r = run(['--root', root, '--out', out, '--check', '--json'])
  assert.equal(r.status, 0)
  const report = JSON.parse(r.stdout) as { built: boolean; report: { lessons: number }; problems: Array<{ code: string; file: string; line: number }> }
  assert.equal(report.built, false)
  assert.equal(report.report.lessons, 1)
  assert.ok(report.problems.some((p) => p.code === 'row-differs' && p.file === 'content/stages/S1/S1.L1.md'))
})

test('a run record that does not parse and a file that is not UTF-8 are errors', () => {
  const { root, out } = tree()
  writeFileSync(join(root, 'runs/RUN-broken.json'), '{')
  writeFileSync(join(root, 'content/stages/S1/S1.L2.md'), Buffer.from([0xff, 0xfe, 0x00]))
  const r = run(['--root', root, '--out', out, '--check'])
  assert.equal(r.status, 1)
  assert.match(r.stdout, /error runs\/RUN-broken\.json \[run-record\]/)
  assert.match(r.stdout, /error content\/stages\/S1\/S1\.L2\.md \[encoding\] is not valid UTF-8/)
})

test('a bad argument or date is a usage error, and the build will not write into the repository root', () => {
  const { root } = tree()
  assert.equal(run(['--nope']).status, 2)
  assert.equal(run(['--built-at', 'tomorrow', '--check']).status, 2)
  const r = run(['--root', root, '--out', root])
  assert.equal(r.status, 2)
  assert.match(r.stderr, /refusing to write into/)
  assert.ok(existsSync(join(root, 'content/stages/S1/S1.L1.md')))
})

test('SOURCE_DATE_EPOCH sets the build date', () => {
  const { root, out } = tree()
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root, '--out', out], { encoding: 'utf8', env: { ...process.env, SOURCE_DATE_EPOCH: '1761350400' } })
  assert.equal(r.status, 0, r.stdout + r.stderr)
  assert.equal((JSON.parse(readFileSync(join(out, 'content/manifest.json'), 'utf8')) as { builtAt: string }).builtAt, '2025-10-25')
})

test('a stage file or a page whose aliases expand past the library limit is a finding with its file, not a stack trace', () => {
  const { root, out } = tree()
  const nested = aliasBomb()
    .split('\n')
    .filter((l) => l !== '')
    .map((l) => `  ${l}`)
    .join('\n')
  writeFileSync(join(root, 'content/stages/S1/stage.yaml'), `schema: statespace/lesson@1\nid: S1\ndraft: true\nextra:\n${nested}\n`)
  writeFileSync(join(root, 'content/drawers/D-03.md'), `---\n${aliasBomb()}---\n\n## S {minutes=5}\ntext\n`)
  const r = run(['--root', root, '--out', out, '--check'])
  assert.equal(r.status, 1, r.stdout + r.stderr)
  assert.match(r.stdout, /error content\/stages\/S1\/stage\.yaml:1 \[yaml\] not valid YAML: .*alias/i)
  assert.match(r.stdout, /error content\/drawers\/D-03\.md:2 \[front-matter\] the front matter is not valid YAML: .*alias/i)
  assert.equal(r.stderr, '', 'nothing on stderr: no stack trace')
  assert.ok(!existsSync(out))
})

test('a stage file without its schema tag is a finding at its first line', () => {
  const { root, out } = tree()
  writeFileSync(join(root, 'content/stages/S1/lab.yaml'), fixture('stages/S1.lab.yaml').replace(/^schema: .*\n/, ''))
  const r = run(['--root', root, '--out', out, '--check'])
  assert.equal(r.status, 1)
  assert.match(r.stdout, /error content\/stages\/S1\/lab\.yaml:1 \[schema-tag\] a lab file declares its schema, "schema: statespace\/lesson@1"/)
})
