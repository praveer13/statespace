// The planted-fault proof of GATE-bundle and GATE-a11y (the tracker's "each trips on a planted fixture"). A gate that cannot fail
// proves nothing, so this plants one fault at a time and requires the gate to fail on the check that names it, and to pass on the
// control. It is `--self-check` of both scripts, a nightly step beside the other gates' self-checks, and what the tests of this
// folder run.
//
//   GATE-bundle   the source lints on planted files (a frame without the sandbox attribute, a cookie assignment, and every file under
//                 fixtures/lint-cases, each in a tree of its own: a fault trips its own lint only, a correct neighbour none); the budgets on
//                 planted builds with their source (fixtures/make-budget-tree.ts: an entry over 250 KB, a host page over 50 KB, a Boot
//                 route over 200 KB in each way a router can load it, lazily loaded at any depth, a chunk Rollup writes without a
//                 facade, a component's own import() under a screen in the entry chunk and a lazy import inside a third-party package
//                 included, a Boot route that cannot be measured, a screen the build does not hold, a Today and a lesson route over
//                 theirs), each failing only its own budget, beside a control that holds the shapes the measurement must count
//                 rather than fail; then a small world per fault (fixtures/make-world.ts) through the whole gate: a loader size that
//                 differs from the build manifest, a bar maximum that does, a loader that takes the host's progress total for it,
//                 one that tells the eye one figure and a screen reader another; a warning, a size stated before the tap or outside
//                 the loader, a warning in a toast or the header outside <main>, a browser dialog, a dialog element, a second step;
//                 a busy main thread, a host slow to answer `connect` with `ready`; a markup-rendering importer; a host that accepts
//                 any parent, one with no message cap, one with no input cap; a worker that will not retire; a page that parses a
//                 fragment (on every route, and on /receipts only); a frame with no sandbox attribute; a route that requests another
//                 origin, one that logs a console error; a build with no instrument frame
//   GATE-a11y     a page with a contrast failure, one that fails only in the night theme, one that fails only below 340 px (found at
//                 320 px, and passing at 360 and 1280 px), a page that scrolls sideways, and a clean page; and an app, as small as
//                 W1-T03's storage will let one be, that shows low contrast only when the learner-state fixture is in its database
//                 and the clock is at the fixture's instant, which proves that the fixture reaches the screens
//
// Each bad world runs only the checks that can see its fault (fixtures/make-world.ts RUN_ONLY); the control world runs them all,
// which is what shows that those checks pass when nothing is wrong.
//
// It needs a browser for the second half, like the gates do: a local one, else the pinned image (the script runs itself in it).

import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

function line(ok, name, detail = '') {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`)
  return ok
}

function runGate(script, args) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
}

const failedIds = (json) => json.results.filter((r) => r.status === 'fail').map((r) => r.id)

export async function selfCheck({ gate, repo, script, kind }) {
  console.log(`${gate} self-check: plant one fault at a time; the gate must fail on the check that names it and pass on the control`)
  const ok = kind === 'a11y' ? await a11yCases(script, repo) : await bundleCases(script, repo)
  console.log(`${gate} self-check: ${ok.every(Boolean) ? 'ok' : 'FAIL'} (${ok.filter(Boolean).length} of ${ok.length} held)`)
  return ok.every(Boolean) ? 0 : 1
}

// ------------------------------------------------------------------------------------------------ GATE-bundle
async function bundleCases(script, repo) {
  const held = []
  const planted = join(HERE, 'fixtures/planted')

  // the lints, on planted source: no build and no browser needed
  const lintCase = (name, root, only, expectFail) => {
    const r = runGate(script, ['--root', root, '--only', only, '--json', '--no-browser'])
    let json
    try {
      json = JSON.parse(r.stdout)
    } catch {
      return held.push(line(false, name, `no report (exit ${r.status}): ${r.stderr.split('\n')[0]}`))
    }
    const failed = failedIds(json)
    const good = expectFail ? r.status === 1 && failed.includes(expectFail) && failed.length === 1 : r.status === 0 && failed.length === 0
    held.push(line(good, name, expectFail ? `exit ${r.status}, failed ${failed.join(', ') || 'nothing'}` : `exit ${r.status}`))
  }
  lintCase('lint.sandbox trips on a frame without the attribute', join(planted, 'frame-without-sandbox'), 'lint.sandbox', 'lint.sandbox')
  lintCase('lint.cookie trips on a cookie assignment', join(planted, 'cookie-assignment'), 'lint.cookie', 'lint.cookie')
  lintCase('the control passes both lints and the fragment lint', join(planted, 'clean'), 'lint.sandbox,lint.cookie,lint.fragment', null)

  // every file under fixtures/lint-cases through the command line, each in a tree of its own: a fault (bad/) trips the lint its name
  // begins with and no other, and a correct neighbour (good/) trips none
  const cases = join(HERE, 'fixtures/lint-cases')
  const filesUnder = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name))
  for (const kind of ['bad', 'good']) {
    const misses = new Map()
    const counts = new Map()
    for (const file of filesUnder(join(cases, kind))) {
      const rel = relative(join(cases, kind), file)
      const lint = `lint.${basename(file).split('-')[0]}`
      counts.set(lint, (counts.get(lint) ?? 0) + 1)
      const dir = mkdtempSync(join(tmpdir(), 'ss-lint-case-'))
      try {
        mkdirSync(dirname(join(dir, rel)), { recursive: true })
        copyFileSync(file, join(dir, rel))
        const r = runGate(script, ['--root', dir, '--only', 'lint.sandbox,lint.cookie,lint.fragment', '--json', '--no-browser'])
        let failed = null
        try {
          failed = failedIds(JSON.parse(r.stdout))
        } catch {
          failed = null
        }
        const good = failed !== null && (kind === 'bad' ? r.status === 1 && failed.length === 1 && failed[0] === lint : r.status === 0 && failed.length === 0)
        if (!good) misses.set(lint, [...(misses.get(lint) ?? []), `${basename(file)} (exit ${r.status}, failed ${failed === null ? 'no report' : failed.join(', ') || 'nothing'})`])
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    }
    for (const [lint, n] of [...counts].sort()) {
      const missed = misses.get(lint) ?? []
      held.push(line(missed.length === 0, kind === 'bad' ? `${lint} trips on each of its ${n} planted faults, and nothing else does` : `${lint}: none of its ${n} correct neighbours trips a lint`, missed.join('; ')))
    }
  }

  // the budgets, on planted builds and their source: no browser needed; each tree fails only its own budget, and all six budget
  // checks run (none pending)
  const { makeBudgetTree, BUDGET_VARIANTS, BUDGET_EXPECTED } = await import(pathToFileURL(join(HERE, 'fixtures/make-budget-tree.ts')).href)
  for (const v of BUDGET_VARIANTS) {
    const dir = mkdtempSync(join(tmpdir(), `ss-budget-${v}-`))
    try {
      makeBudgetTree(dir, v)
      const r = runGate(script, ['--root', dir, '--only', 'budget.', '--json', '--no-browser'])
      let json
      try {
        json = JSON.parse(r.stdout)
      } catch {
        held.push(line(false, `budget tree ${v}`, `no report (exit ${r.status}): ${r.stderr.split('\n')[0]}`))
        continue
      }
      const failed = failedIds(json).sort()
      const want = [...BUDGET_EXPECTED[v]].sort()
      const ran = json.results.filter((x) => x.status === 'pass' || x.status === 'fail').length
      const exact = JSON.stringify(failed) === JSON.stringify(want) && r.status === (want.length === 0 ? 0 : 1) && ran === 6
      held.push(line(exact, v === 'control' ? 'the control build is within every budget' : `budget tree "${v}" fails ${want.join(' and ')}`, `exit ${r.status}; failed: ${failed.join(', ') || 'none'}; ${ran} of 6 budget checks ran`))
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  // the browser checks, on a small world per fault
  const { makeWorld, VARIANTS, EXPECTED_FAILURES, RUN_ONLY } = await import(pathToFileURL(join(HERE, 'fixtures/make-world.ts')).href)
  for (const variant of VARIANTS) {
    const dir = mkdtempSync(join(tmpdir(), `ss-world-${variant}-`))
    try {
      makeWorld(dir, variant)
      const only = RUN_ONLY[variant]
      const r = runGate(script, ['--root', dir, '--json', '--runner', 'local', ...(only ? ['--only', only] : [])])
      let json
      try {
        json = JSON.parse(r.stdout)
      } catch {
        held.push(line(false, `world ${variant}`, `no report (exit ${r.status}): ${(r.stderr || r.stdout).split('\n').filter(Boolean).slice(-3).join(' | ')}`))
        continue
      }
      const failed = failedIds(json).sort()
      const want = [...EXPECTED_FAILURES[variant]].sort()
      const pending = json.results.filter((x) => x.status === 'pending' || x.status === 'skipped').map((x) => x.id)
      const exact = JSON.stringify(failed) === JSON.stringify(want) && r.status === (want.length === 0 ? 0 : 1)
      const name = variant === 'good' ? 'the control world passes every check' : `world "${variant}" fails ${want.join(' and ')}`
      // the frame-less build blocks the checks that need a frame, which stay skipped: that is its fault's other face
      held.push(line(exact && (variant === 'nodomain' || pending.length === 0), name, `exit ${r.status}; failed: ${failed.join(', ') || 'none'}${pending.length ? `; not enforced: ${pending.join(', ')}` : ''}; ${json.summary.passed} passed${only ? ` (ran ${only})` : ' (every check)'}`))
      if (!exact) for (const f of json.results.filter((x) => x.status === 'fail')) console.log(`        ${f.id}: ${f.detail}`)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }
  return held
}

// ------------------------------------------------------------------------------------------------ GATE-a11y
const PAGE = (title, style, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>${style}</style></head>
<body><main><h1>${title}</h1>${body}</main></body></html>
`

async function a11yCases(script, repo) {
  const held = []
  const seedNow = JSON.parse(readFileSync(join(repo, 'tests/fixtures/learner-state.json'), 'utf8')).now
  const dir = mkdtempSync(join(tmpdir(), 'ss-a11y-self-'))
  try {
    const files = {
      'good.html': PAGE('A page that passes', 'body{background:#fff;color:#111}', '<p>Dark text on white, and a paragraph that wraps inside the viewport without trouble.</p>'),
      'bad-contrast-night.html': PAGE(
        'Fails only at night',
        'body{background:#fff;color:#111}@media (prefers-color-scheme: dark){body{background:#222;color:#2f2f2f}}',
        '<p>Fine in the light theme and unreadable in the night theme.</p>',
      ),
      'sideways.html': PAGE('Scrolls sideways', 'body{background:#fff;color:#111}', '<div style="width:900px;height:20px;background:#ccc">a rigid box wider than a phone</div>'),
      'bad-contrast-narrow.html': PAGE('Fails only on a narrow screen', 'body{background:#fff;color:#111}@media (max-width: 340px){p{color:#bbb}}', '<p>Readable at 360 and 1280 px, too faint at 320 px.</p>'),
    }
    mkdirSync(dir, { recursive: true })
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text)
    const proof = (name, args, wantStatus, wantText) => {
      const r = runGate(script, [...args, '--runner', 'local'])
      const out = r.stdout + r.stderr
      held.push(line(r.status === wantStatus && (wantText === null || wantText.test(out)), name, `exit ${r.status}${wantText && !wantText.test(out) ? `, expected ${wantText}` : ''}`))
    }
    proof('a clean page passes', ['--fixture', join(dir, 'good.html')], 0, /a11y: ok/)
    proof('a contrast failure trips it (kernelspace\'s own fixture)', ['--fixture', join(repo, 'vendor/kernelspace/e2e/fixtures/bad-contrast.html')], 1, /color-contrast/)
    proof('a page that fails only in the night theme trips it, and only the night pass sees it', ['--fixture', join(dir, 'bad-contrast-night.html')], 1, /dark\s+color-contrast|color-contrast/)
    proof('the light theme alone does not see it', ['--fixture', join(dir, 'bad-contrast-night.html'), '--themes', 'light'], 0, /a11y: ok/)
    proof('a page that scrolls sideways trips the reflow check', ['--fixture', join(dir, 'sideways.html')], 1, /scrolls sideways/)
    // the three widths of spine section 11.2 are each checked: a fault only below 340 px is found at 320 px, and only there
    proof('a page that fails contrast only below 340 px trips it at 320 px', ['--fixture', join(dir, 'bad-contrast-narrow.html')], 1, /320px\s+(?:light|dark)\s+color-contrast/)
    proof('and the same page passes at 360 and 1280 px alone', ['--fixture', join(dir, 'bad-contrast-narrow.html'), '--widths', '360,1280'], 0, /a11y: ok/)

    // the fixture reaches the screens: a mini app whose page is low in contrast only when the fixture is in its database and
    // the clock stands at the fixture's instant
    const app = join(dir, 'app')
    const put = (rel, text) => {
      mkdirSync(dirname(join(app, rel)), { recursive: true })
      writeFileSync(join(app, rel), text)
    }
    // the home screen never opens the store, as W1-T03's will not until a screen needs the log; /today does, so the fixture must be
    // put in when that screen has made the database, and the screen drawn again
    put('apps/site/dist/index.html', '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Home</title></head><body style="background:#fff;color:#111"><main><h1>Home</h1><p>Nothing here reads the log.</p></main></body></html>\n')
    put('apps/site/dist/today/index.html', '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Seeded app</title><script type="module" src="/assets/app.js"></script></head><body style="background:#fff;color:#111"><main><h1>Seeded app</h1><p id="n">no events</p></main></body></html>\n')
    put('apps/site/dist/.vite/manifest.json', '{}')
    put('apps/site/dist/assets/app.js', `
const open = indexedDB.open('statespace', 1)
open.onupgradeneeded = () => {
  const db = open.result
  db.createObjectStore('events', { keyPath: 'id' }).createIndex('at', 'at')
  db.createObjectStore('mirror', { keyPath: 'path' })
  db.createObjectStore('meta', { keyPath: 'key' })
}
open.onsuccess = () => {
  const count = open.result.transaction('events').objectStore('events').count()
  count.onsuccess = () => {
    document.getElementById('n').textContent = count.result + ' events'
    const low = (text) => { const p = document.createElement('p'); p.style.cssText = 'color:#ddd;background:#fff'; p.textContent = text; document.querySelector('main').append(p) }
    if (count.result >= 20) low('the fixture is in the database')
    if (Date.now() === Date.parse('${seedNow}')) low("the clock is the fixture's")
  }
}
`)
    const seeded = runGate(script, ['--root', app, '--runner', 'local', '--widths', '360', '--themes', 'light'])
    held.push(line(seeded.status === 1 && /learner state: applied \(24 events, 6 mirror\)/.test(seeded.stdout) && /color-contrast\s+2 nodes/.test(seeded.stdout), 'the learner-state fixture reaches the app: its events are in the database and the clock is its instant', `exit ${seeded.status}`))
    const unseeded = runGate(script, ['--root', app, '--runner', 'local', '--widths', '360', '--themes', 'light', '--learner-state', 'none'])
    held.push(line(unseeded.status === 0, 'and without the fixture the same app is clean', `exit ${unseeded.status}`))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  return held
}
