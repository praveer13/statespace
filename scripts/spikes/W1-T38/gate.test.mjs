import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { WARN_DOCUMENTS, failing, runGate } from '../../verify-lessons.mjs'
import { FIXTURE_TREE, REPO, PLANTS, scratchTree } from './helpers.mjs'
import { edit, replace, write } from './lib/plants.mjs'

const SCRIPT = path.join(REPO, 'scripts', 'verify-lessons.mjs')
const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', cwd: os.tmpdir() })
const withTree = async (change, body) => {
  const dir = scratchTree(REPO)
  try {
    change(dir)
    return await body(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test('the repository\'s own content is green (the lane runs exactly this); the warn-only documents may print warnings', () => {
  const r = run()
  assert.equal(r.status, 0, r.stdout + r.stderr)
  assert.match(r.stdout, /^(?:(?:warn |note: ).*\n)*GATE-lessons: green \(\d+ lessons, \d+ drawers, \d+ stage, \d+ lab and \d+ placement records, \d+ documents, \d+ warn-only documents, \d+ built pages; 25 glossary terms, 12 internal names; \d of 6 block types in use/)
  // nothing but a warn-only document is allowed to warn
  for (const line of r.stdout.split('\n').filter((l) => l.startsWith('warn '))) assert.match(line, new RegExp(`^warn +\\S+ +(?:${WARN_DOCUMENTS.map((d) => d.replace('.', '\\.')).join('|')}):\\d+: `), line)
})

test('the fixture tree is green, and the same through --root', () => {
  const r = run('--root', FIXTURE_TREE)
  assert.equal(r.status, 0, r.stdout + r.stderr)
  assert.match(r.stdout, /GATE-lessons: green \(3 lessons, 2 drawers, 1 stage, 1 lab and 1 placement records, 1 documents, 0 warn-only documents, 0 built pages; 25 glossary terms, 12 internal names; 5 of 6 block types in use \(card 4, instrument 6, item 12, prose 7, specimen 1\)\)/)
})

test('a planted fault exits 1 and names the file, the line, the check and the rule', async () => {
  const plant = PLANTS.find((p) => p.name === 'a graded item without a family')
  await withTree(
    (d) => plant.apply(d, REPO),
    (dir) => {
      const r = run('--root', dir)
      assert.equal(r.status, 1)
      assert.match(r.stdout, /^fail family {5}content\/stages\/S1\/S1\.L1\.md:\d+: a graded item names its generator family/m)
      assert.match(r.stdout, /GATE-lessons: 1 finding\(s\)/)
    },
  )
})

test('--json prints the report: strict, summary, findings and notes', async () => {
  await withTree(
    (d) => replace(d, 'content/stages/S1/S1.L1.md', 'Next, find a transfer that makes the source balance negative.', 'Finish the Defence to unlock the next lesson.'),
    (dir) => {
      const r = run('--root', dir, '--json')
      assert.equal(r.status, 1)
      const report = JSON.parse(r.stdout)
      assert.deepEqual(Object.keys(report), ['strict', 'summary', 'findings', 'notes'])
      assert.equal(report.strict, false)
      assert.equal(report.summary.lessons, 3)
      assert.deepEqual(report.findings.map((f) => [f.check, f.severity]), [['lock', 'error']])
      assert.match(report.findings[0].where, /^content\/stages\/S1\/S1\.L1\.md:\d+$/)
    },
  )
})

test('exit codes: 0 green, 1 findings, 2 a bad argument or a gate that cannot run', async () => {
  assert.equal(run('--no-such-flag').status, 2)
  assert.match(run('--no-such-flag').stderr, /unknown argument: --no-such-flag/)
  const help = run('--help')
  assert.equal(help.status, 0)
  assert.match(help.stdout, /GATE-lessons/)
  assert.match(help.stdout, /node scripts\/verify-lessons\.mjs --self-check/)
  // a tree that is not there is a mistake in the call, not a green tree with nothing in it
  const missing = run('--root', path.join(os.tmpdir(), 'gate-lessons-no-such-tree'))
  assert.equal(missing.status, 2)
  assert.match(missing.stderr, /is not a directory/)
  assert.equal(run('--root').status, 2)
  // a tree whose glossary is broken is a finding, not a crash
  await withTree(
    (d) => write(d, 'content/glossary.yaml', 'format: glossary/1\nterms: [\n'),
    (dir) => {
      const r = run('--root', dir)
      assert.equal(r.status, 1)
      assert.match(r.stdout, /^fail glossary +content\/glossary\.yaml:/m)
    },
  )
})

test('the gate exits once its output is written, so a slow reader gets every line and a --json report that parses', async () => {
  // a process that writes a mebibyte and exits through the gate's exit, read only after a pause: a pipe takes the write
  // asynchronously, and process.exit() would drop what is still queued (the self-check's output came out cut short)
  const paused = await new Promise((resolve) => {
    const code = `import { exitWhenWritten } from ${JSON.stringify(pathToFileURL(SCRIPT).href)}; process.stdout.write('x'.repeat(1 << 20)); exitWhenWritten(3)`
    const child = spawn(process.execPath, ['--input-type=module', '-e', code], { cwd: os.tmpdir(), stdio: ['ignore', 'pipe', 'inherit'] })
    let bytes = 0
    child.stdout.pause()
    setTimeout(() => child.stdout.on('data', (d) => (bytes += d.length)).resume(), 300)
    child.on('close', (status) => resolve({ status, bytes }))
  })
  assert.deepEqual(paused, { status: 3, bytes: 1 << 20 })
  // and the gate's own way out goes through it, the error path too
  const source = fs.readFileSync(SCRIPT, 'utf8')
  const entry = source.slice(source.lastIndexOf('main(process.argv.slice(2))'))
  assert.match(entry, /^main\(process\.argv\.slice\(2\)\)\.then\(\s*\(code\) => exitWhenWritten\(code\),/)
  assert.match(entry, /exitWhenWritten\(2\)/)
  assert.doesNotMatch(entry, /process\.exit\(/)
})

test('warnings print and pass, and --strict fails on them', async () => {
  await withTree(
    (d) => replace(d, 'content/stages/S1/S1.L2.md', '## Exit {minutes=4}', '## Exit {minutes=1}'),
    (dir) => {
      const loose = run('--root', dir)
      assert.equal(loose.status, 0, loose.stdout)
      assert.match(loose.stdout, /^warn anatomy +content\/stages\/S1\/S1\.L2\.md:\d+: a bridge lesson is planned at 15 to 25 minutes; this one adds up to 13/m)
      assert.match(loose.stdout, /GATE-lessons: green/)
      const strict = run('--root', dir, '--strict')
      assert.equal(strict.status, 1)
      assert.match(strict.stdout, /GATE-lessons: 1 finding\(s\)/)
    },
  )
})

test('a family with no generator module is a note, and a failure under --strict', async () => {
  await withTree(
    (d) => fs.rmSync(path.join(d, 'packages/generators/src/which-stamp'), { recursive: true }),
    (dir) => {
      const loose = run('--root', dir)
      assert.equal(loose.status, 0, loose.stdout)
      assert.match(loose.stdout, /note: the rail rule read only the authored options of GEN-which-stamp: no generator module yet/)
      const strict = run('--root', dir, '--strict')
      assert.equal(strict.status, 1)
      assert.match(strict.stdout, /^fail generators +packages\/generators\/src\/which-stamp\/index\.ts:1: the generator of GEN-which-stamp is not built/m)
    },
  )
})

test('with nothing to lint the gate says so, and --strict fails', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-lessons-empty-'))
  try {
    const loose = run('--root', dir)
    assert.equal(loose.status, 0, loose.stdout)
    assert.match(loose.stdout, /note: no lesson, drawer, stage, lab or placement file under .*: nothing to lint yet/)
    assert.equal(run('--root', dir, '--strict').status, 1)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('failing() is the errors, and every finding under --strict', () => {
  const findings = [{ severity: 'error' }, { severity: 'warn' }]
  assert.equal(failing(findings, false).length, 1)
  assert.equal(failing(findings, true).length, 2)
})

test('a file that is not UTF-8 is a finding on that file', async () => {
  await withTree(
    (d) => fs.writeFileSync(path.join(d, 'content/stages/S1/S1.L2.md'), Buffer.from([0xff, 0xfe, 0x41])),
    async (dir) => {
      const r = await runGate(dir)
      assert.deepEqual(r.findings.map((f) => [f.check, f.where, f.detail]), [['read', 'content/stages/S1/S1.L2.md:1', 'is not valid UTF-8']])
    },
  )
})

test('only the named files are read: a stray Markdown file, a link and another task\'s data are left alone', async () => {
  await withTree(
    (d) => {
      write(d, 'content/stages/S1/notes.md', 'The lane badge. Finish S1 first to unlock S2.\n')
      write(d, 'content/stages/S1/placement.yml', 'summary: Finish S1 first to unlock S2.\n')
      write(d, 'content/stages/budget.yaml', 'lane: x\n')
      write(d, 'content/drawers/README.md', 'The docket.\n')
      write(d, 'content/kc/graph.yaml', 'tools:\n  lane-a:\n    what: Lane A\n')
      fs.symlinkSync('/etc', path.join(d, 'content', 'stages', 'S9'))
    },
    async (dir) => {
      const r = await runGate(dir)
      assert.deepEqual(r.findings, [])
      assert.equal(r.summary.lessons, 3)
    },
  )
})

test('the placement walk is learner copy: content/stages/S{n}/placement.yaml is read at the start of its stage', async () => {
  // the walk that closes Boot (W1-T45 accepts on "GATE-lessons on its copy")
  await withTree(
    (d) => write(d, 'content/stages/S1/placement.yaml', 'id: S1\nsummary: The placement walk. Finish it to unlock S1.L3; the pocket checker grades it.\nsteps:\n  - kc: KC-1.quantifier-negation\n    family: GEN-negate-it\n    prompt: Your lab comes later.\n'),
    async (dir) => {
      const r = await runGate(dir)
      assert.deepEqual(
        r.findings.map((f) => `${f.check} ${f.where}`),
        ['internal content/stages/S1/placement.yaml:2', 'lock content/stages/S1/placement.yaml:2', 'term content/stages/S1/placement.yaml:6'],
      )
      assert.match(r.findings[2].detail, /^Boot's copy uses terms 1 to 5 only, and "lab" is term 7/)
      assert.equal(r.summary.placements, 1)
      const cli = run('--root', dir)
      assert.equal(cli.status, 1)
      assert.match(cli.stdout, /^fail lock +content\/stages\/S1\/placement\.yaml:2: "unlock": lock copy/m)
      assert.match(cli.stdout, /1 stage, 1 lab and 1 placement records/)
    },
  )
  // S2's sits at the start of S2: S2's terms are open to it, Boot's limit is not
  await withTree(
    (d) => write(d, 'content/stages/S2/placement.yaml', 'id: S2\nsummary: A Goal Replay and your lab, at the start of S2.\n'),
    async (dir) => {
      const r = await runGate(dir)
      assert.deepEqual(r.findings, [])
      assert.equal(r.summary.placements, 2)
    },
  )
})

test('a lesson file is read wherever the build reads it: content/stages/S{n}/S{n}.L{k}.md, by name', async () => {
  await withTree(
    (d) => edit(d, 'labs/README.md', (t) => `${t}\nThe docket.\n`),
    async (dir) => {
      const r = await runGate(dir)
      assert.deepEqual(r.findings.map((f) => f.check), ['internal'])
      assert.match(r.findings[0].where, /^labs\/README\.md:\d+$/)
    },
  )
})

// ------------------------------------------------------------------ learner documents that are not clean yet

test('labs/TOOLS.md and labs/AGENTS.md are read with the copy rules, as warnings: the lane stays green and --strict fails', async () => {
  assert.deepEqual(WARN_DOCUMENTS, ['labs/TOOLS.md', 'labs/AGENTS.md'])
  await withTree(
    (d) => {
      write(d, 'labs/TOOLS.md', '# Tools\n\nBoot installs the tools.\n\nSee the lanes.\n')
      write(d, 'labs/AGENTS.md', '# Agents\n\nFinish the Defence to unlock the next lesson.\n')
    },
    async (dir) => {
      const r = await runGate(dir)
      assert.deepEqual(
        r.findings.map((f) => `${f.severity} ${f.check} ${f.where}`),
        ['warn lock labs/AGENTS.md:3', 'warn internal labs/TOOLS.md:3', 'warn internal labs/TOOLS.md:5'],
      )
      assert.equal(r.summary.warnDocuments, 2)
      assert.equal(r.summary.documents, 1)
      assert.deepEqual(failing(r.findings, false), [])
      assert.equal(failing(r.findings, true).length, 3)
      const loose = run('--root', dir)
      assert.equal(loose.status, 0, loose.stdout)
      assert.match(loose.stdout, /^warn +internal +labs\/TOOLS\.md:3: "Boot" is an internal name/m)
      assert.match(loose.stdout, /^warn +lock +labs\/AGENTS\.md:3: /m)
      assert.match(loose.stdout, /GATE-lessons: green \(.*1 documents, 2 warn-only documents, 0 built pages/)
      const strict = run('--root', dir, '--strict')
      assert.equal(strict.status, 1)
      assert.match(strict.stdout, /GATE-lessons: 3 finding\(s\)/)
      const json = JSON.parse(run('--root', dir, '--json').stdout)
      assert.deepEqual([...new Set(json.findings.map((f) => f.severity))], ['warn'])
    },
  )
})

test('a warn-only document that is clean says nothing, and one that is missing is not an error', async () => {
  await withTree(
    (d) => write(d, 'labs/TOOLS.md', '# Tools\n\nThe pins are in the table. Start here, then run the starter.\n'),
    async (dir) => {
      const r = await runGate(dir)
      assert.deepEqual(r.findings, [])
      assert.equal(r.summary.warnDocuments, 1)
    },
  )
  assert.equal((await runGate(FIXTURE_TREE)).summary.warnDocuments, 0)
})

test('a warn-only document that is not UTF-8 is a warning on that file; a document held to the rules is still an error', async () => {
  await withTree(
    (d) => {
      fs.writeFileSync(path.join(d, 'labs', 'TOOLS.md'), Buffer.from([0xff, 0xfe, 0x41]))
      edit(d, 'labs/README.md', (t) => `${t}\nThe docket.\n`)
    },
    async (dir) => {
      const r = await runGate(dir)
      assert.deepEqual(
        r.findings.map((f) => `${f.severity} ${f.check} ${f.where.replace(/:\d+$/, '')}`),
        ['error internal labs/README.md', 'warn read labs/TOOLS.md'],
      )
    },
  )
})

test('--root may repeat: each tree is checked on its own, --json gives one report a tree, and the run exits with the worst status', async () => {
  const bad = scratchTree(REPO)
  try {
    replace(bad, 'content/stages/S1/S1.L1.md', 'Next, find a transfer that makes the source balance negative.', "You can't open **S1.L3** yet.")
    const r = run('--root', FIXTURE_TREE, '--root', bad, '--json')
    assert.equal(r.status, 1, r.stderr)
    const { strict, reports } = JSON.parse(r.stdout)
    assert.equal(strict, false)
    assert.deepEqual(reports.map((x) => [x.root, x.status]), [[FIXTURE_TREE, 0], [bad, 1]])
    assert.deepEqual(reports[0].findings, [])
    assert.deepEqual(reports[1].findings.map((f) => [f.check, f.rule, f.rules]), [['lock', 'lock/not-yet', ['lock/not-yet']]])
    // the same trees as text, and two green trees exit 0
    const text = run('--root', FIXTURE_TREE, '--root', bad)
    assert.equal(text.status, 1)
    assert.match(text.stdout, /^== .*\nGATE-lessons: green/m)
    assert.match(text.stdout, /^fail lock +content\/stages\/S1\/S1\.L1\.md:\d+: "can't open \*\*S1\.L3\*\* yet"/m)
    assert.equal(run('--root', FIXTURE_TREE, '--root', FIXTURE_TREE).status, 0)
    // a tree that is not there stops the run before any tree is checked
    assert.equal(run('--root', FIXTURE_TREE, '--root', path.join(os.tmpdir(), 'gate-lessons-no-such-tree')).status, 2)
  } finally {
    fs.rmSync(bad, { recursive: true, force: true })
  }
})

test('a rule that throws on a file is a finding on that file (read/crash, which no plant can reach)', async () => {
  const r = await runGate(FIXTURE_TREE, { stubs: { lintPage: async () => { throw new Error('a stand-in rule that throws') } } })
  const crashes = r.findings.filter((f) => f.rule === 'read/crash')
  assert.deepEqual(crashes.map((f) => f.where).sort(), ['content/drawers/D-03.md:1', 'content/drawers/D-33.md:1', 'content/stages/S1/S1.L0.md:1', 'content/stages/S1/S1.L1.md:1', 'content/stages/S1/S1.L2.md:1'])
  assert.ok(crashes.every((f) => f.check === 'read' && f.severity === 'error' && /a stand-in rule that throws/.test(f.detail)))
})

test('every finding names a rule of lib/rules.mjs, whose check is the finding\'s', async () => {
  const { knownRule, ruleCheck } = await import('./lib/rules.mjs')
  for (const plant of PLANTS.slice(0, 40)) {
    await withTree(
      (d) => plant.apply(d, REPO),
      async (dir) => {
        for (const f of (await runGate(dir, { strict: true })).findings) {
          assert.ok(knownRule(f.rule), `${plant.name}: ${f.rule}`)
          assert.equal(f.check, ruleCheck(f.rule), `${plant.name}: ${f.rule}`)
          for (const x of f.rules ?? []) assert.equal(ruleCheck(x), f.check)
        }
      },
    )
  }
})
