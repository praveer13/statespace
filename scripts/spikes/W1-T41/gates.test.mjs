// Tests of the two gate scripts as a user runs them: the lints and the budgets through the command line on planted trees, the argument
// handling and the exit statuses, and (when asked for, because they take minutes in a browser image) the self-checks that plant a fault
// per check.
//   node --test scripts/spikes/W1-T41/gates.test.mjs
//   SS_SELF_CHECK=1 node --test scripts/spikes/W1-T41/gates.test.mjs     adds the two self-checks
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { BUDGET_EXPECTED, BUDGET_VARIANTS, makeBudgetTree } from './fixtures/make-budget-tree.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '../../..')
const BUNDLE = join(REPO, 'scripts/verify-bundle.mjs')
const A11Y = join(REPO, 'scripts/a11y.mjs')
const planted = (name) => join(HERE, 'fixtures/planted', name)

const run = (script, args) => {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  return { status: r.status, out: r.stdout ?? '', err: r.stderr ?? '' }
}
const json = (r) => JSON.parse(r.out)

describe('GATE-bundle, the source lints through the command line', () => {
  test('a frame without the sandbox attribute trips lint.sandbox, and only it', () => {
    const r = run(BUNDLE, ['--root', planted('frame-without-sandbox'), '--only', 'lint.sandbox,lint.cookie,lint.fragment', '--json'])
    assert.equal(r.status, 1)
    const failed = json(r).results.filter((x) => x.status === 'fail')
    assert.deepEqual(failed.map((x) => x.id), ['lint.sandbox'])
    assert.match(failed[0].detail, /apps\/site\/src\/bus-client\/client\.tsx:\d+:\d+ iframe-sandbox an iframe has no sandbox attribute/)
  })
  test('a cookie assignment trips lint.cookie, and only it', () => {
    const r = run(BUNDLE, ['--root', planted('cookie-assignment'), '--only', 'lint.sandbox,lint.cookie,lint.fragment', '--json'])
    assert.equal(r.status, 1)
    const failed = json(r).results.filter((x) => x.status === 'fail')
    assert.deepEqual(failed.map((x) => x.id), ['lint.cookie'])
    assert.match(failed[0].detail, /apps\/site\/src\/app\/theme\.ts:\d+:\d+ document-cookie assigns document\.cookie/)
  })
  test('the control tree passes all three', () => {
    const r = run(BUNDLE, ['--root', planted('clean'), '--only', 'lint.sandbox,lint.cookie,lint.fragment'])
    assert.equal(r.status, 0, r.out)
    assert.match(r.out.trim().split('\n').at(-1), /^GATE-bundle: ok \(3 passed, 0 failed\)$/)
  })
  test('the real tree passes them', () => {
    const r = run(BUNDLE, ['--only', 'lint.sandbox,lint.cookie,lint.fragment'])
    assert.equal(r.status, 0, r.out)
  })
})

describe('GATE-bundle, the budgets through the command line on planted builds (fixtures/make-budget-tree.ts)', () => {
  for (const v of BUDGET_VARIANTS) {
    const want = BUDGET_EXPECTED[v]
    test(want.length === 0 ? 'the control build is within every budget' : `${v} fails ${want.join(' and ')}, and only that`, () => {
      const dir = mkdtempSync(join(tmpdir(), `ss-budget-${v}-`))
      try {
        makeBudgetTree(dir, v)
        const r = run(BUNDLE, ['--root', dir, '--only', 'budget.', '--json', '--no-browser'])
        assert.equal(r.status, want.length === 0 ? 0 : 1, r.out + r.err)
        const results = json(r).results
        assert.deepEqual(results.filter((x) => x.status === 'fail').map((x) => x.id), want)
        assert.equal(results.filter((x) => x.status === 'pass' || x.status === 'fail').length, 6, 'all six budget checks ran')
        const boot = results.find((x) => x.id === 'budget.route.boot').detail
        if (v === 'boot-unmapped') assert.match(boot, /cannot be measured: src\/screens\/boot\/route\.tsx loads src\/screens\/boot\/BootScreen\.tsx lazily, but the build manifest names no chunk for it/)
        else if (v === 'boot-unbuilt') assert.match(boot, /the build holds none of apps\/site\/src\/screens\/boot\/.*so the route cannot be measured/)
        else if (v.startsWith('boot-')) assert.match(boot, /^Boot route: \d+\.\d KB against 200 KB/)
        if (v.includes('facadeless')) assert.match(boot, /matched by name \(Rollup wrote it without a facade\): src\/screens\/boot\/BootScreen\.tsx -> _BootScreen-/)
        if (v === 'control') assert.match(boot, /every module of apps\/site\/src\/screens\/boot\/ in the build is in the entry's closure, and so is the module they load lazily, so the route adds nothing/)
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })
  }
  test('a delivered screen the build does not hold is pending on the shell (W1-T02) until the shell is in the tree, and --strict fails it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ss-budget-unbuilt-'))
    try {
      makeBudgetTree(dir, 'boot-unbuilt')
      rmSync(join(dir, 'apps/site/src/screens/stages'), { recursive: true, force: true })
      const r = run(BUNDLE, ['--root', dir, '--only', 'budget.route.boot', '--json', '--no-browser'])
      assert.equal(r.status, 0, r.out + r.err)
      const [boot] = json(r).results
      assert.deepEqual([boot.status, boot.owner], ['pending', 'W1-T02'])
      assert.match(boot.detail, /the build holds none of apps\/site\/src\/screens\/boot\/.*the shell's router \(W1-T02\) discovers each screen's route\.tsx, and it is not in the tree yet/)
      assert.equal(run(BUNDLE, ['--root', dir, '--only', 'budget.route.boot', '--no-browser', '--strict']).status, 1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('GATE-bundle, routes.present through the command line', () => {
  function tree({ shell }) {
    const dir = mkdtempSync(join(tmpdir(), 'ss-routes-'))
    const put = (rel, text) => {
      mkdirSync(dirname(join(dir, rel)), { recursive: true })
      writeFileSync(join(dir, rel), text)
    }
    put('apps/site/dist/index.html', '<!doctype html><title>home</title>')
    put('apps/site/dist/assets/index.js', 'export {}')
    put('apps/site/dist/.vite/manifest.json', JSON.stringify({ 'index.html': { file: 'assets/index.js', src: 'index.html', isEntry: true } }))
    put('apps/site/src/screens/today/route.tsx', 'export const routes = []')
    if (shell) put('apps/site/src/screens/stages/route.tsx', 'export const routes = []')
    if (shell) put('apps/site/dist/stages/index.html', '<!doctype html><title>stages</title>')
    return dir
  }
  test('with the shell delivered, a delivered screen with no static page fails', () => {
    const dir = tree({ shell: true })
    try {
      const r = run(BUNDLE, ['--root', dir, '--only', 'routes.present', '--json', '--no-browser'])
      assert.equal(r.status, 1, r.out + r.err)
      assert.match(json(r).results[0].detail, /\/today \(apps\/site\/src\/screens\/today\/\)/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
  test("before the shell (W1-T02) is delivered, the same screen is pending on it, and --strict fails it", () => {
    const dir = tree({ shell: false })
    try {
      const r = run(BUNDLE, ['--root', dir, '--only', 'routes.present', '--json', '--no-browser'])
      assert.equal(r.status, 0, r.out + r.err)
      assert.deepEqual([json(r).results[0].status, json(r).results[0].owner], ['pending', 'W1-T02'])
      assert.equal(run(BUNDLE, ['--root', dir, '--only', 'routes.present', '--no-browser', '--strict']).status, 1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('the gates as commands', () => {
  test('--list names every check without a browser', () => {
    const r = run(BUNDLE, ['--list', '--root', planted('clean')])
    assert.equal(r.status, 0)
    for (const id of ['budget.entry', 'lint.sandbox', 'loader.size', 'boot.responsive', 'handshake.allowed', 'sw.kill', 'import.fuzz']) assert.match(r.out, new RegExp(id.replace('.', '\\.')))
  })
  test('an --only name that selects no check is a harness error, never an empty pass', () => {
    const typo = run(BUNDLE, ['--root', planted('clean'), '--only', 'lint.sandbox,lint.sandbx', '--no-browser'])
    assert.equal(typo.status, 2)
    assert.match(typo.err, /--only lint\.sandbx selects no check/)
    const browserOnly = run(BUNDLE, ['--root', planted('clean'), '--only', 'loader.size', '--no-browser'])
    assert.equal(browserOnly.status, 2)
    assert.match(browserOnly.err, /selects no check that runs without a browser/)
  })
  test('an unknown argument is a harness error', () => {
    assert.equal(run(BUNDLE, ['--nonsense']).status, 2)
    assert.equal(run(A11Y, ['--nonsense']).status, 2)
    assert.equal(run(A11Y, ['--widths', 'wide']).status, 2)
    assert.equal(run(A11Y, ['--fail-on', 'bad']).status, 2)
    assert.equal(run(A11Y, ['--routes', 'today']).status, 2)
  })
  test('a tree without a build is a harness error, not a pass', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ss-nobuild-'))
    try {
      const r = run(BUNDLE, ['--root', dir, '--only', 'budget.entry'])
      assert.equal(r.status, 2)
      assert.match(r.err, /there is no site build/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
  test('--strict turns pending into failure', () => {
    // the real tree today has checks whose owners have not delivered; a static-only run still shows the rule
    const lax = run(BUNDLE, ['--only', 'budget.route.', '--no-browser', '--json'])
    const strict = run(BUNDLE, ['--only', 'budget.route.', '--no-browser', '--json', '--strict'])
    const pending = json(lax).results.filter((x) => x.status === 'pending').length
    if (pending > 0) {
      assert.equal(lax.status, 0)
      assert.equal(strict.status, 1)
    }
  })
})

describe('the self-checks (SS_SELF_CHECK=1: they run the gates in a browser, for minutes)', { skip: !process.env.SS_SELF_CHECK }, () => {
  test('GATE-bundle fails on every planted fault and passes on the control', () => {
    const r = run(BUNDLE, ['--self-check'])
    assert.equal(r.status, 0, r.out + r.err)
    assert.match(r.out, /GATE-bundle self-check: ok \(\d+ of \d+ held\)/)
  })
  test('GATE-a11y fails on every planted fault and passes on the control', () => {
    const r = run(A11Y, ['--self-check'])
    assert.equal(r.status, 0, r.out + r.err)
    assert.match(r.out, /GATE-a11y self-check: ok \(\d+ of \d+ held\)/)
  })
})
