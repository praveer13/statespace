#!/usr/bin/env node
// Record RUN-call-it-mirror (W1-T07): the Call It sheet and the Mirror as they stand. The tests of the derivations, of the sheet,
// of the screen and of the vocabulary guard; the two type checks; GATE-items and GATE-calls on the sheet's fixtures; the weakened copies on the host; and the browser
// harness in the pinned Playwright image: Chromium, Firefox and WebKit, where the first call is final on the real IndexedDB
// adapter (a reload, a second tab, a stale tab, tabs that commit at the same moment, a forced click, a hostile re-enable), the
// layout at 320, 360 and 1280 px in both themes with axe, target sizes, the keyboard, the docked bar and the Mirror's route; and
// the weakened copies of the sheet that the harness must fail on. Every log goes under runs/RUN-call-it-mirror/ and the verdict
// lines are copied from them.
//
//   node scripts/spikes/W1-T07/record.mjs      about ten minutes; needs Docker and mcr.microsoft.com/playwright:v1.63.0-noble
//
// The record is of the files it hashes: record it again after any change to the sheet, the screen, the derivations, the scripts of
// this task (the harness, the weakened copies, the gate runner and the guard) or this script. The ID is not in
// packages/ids/proposals.json: spine section 9.5 registers no run for this task, and GATE-links fails a proposal that no scanned
// document cites.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileRecord, hostEnvironment, normalizePaths, posix, REPO, sha256, sha256File } from '../../runs/registry.mjs';

const RUN_ID = 'RUN-call-it-mirror';
const TASK = 'W1-T07';
const IMAGE = 'mcr.microsoft.com/playwright:v1.63.0-noble';
const OUT = path.join(REPO, 'runs', RUN_ID);
const node = process.execPath;
const HARNESS = 'scripts/spikes/W1-T07/harness';
const scratch = fs.mkdtempSync(path.join(process.env.W1T07_SCRATCH ?? os.tmpdir(), 'w1t07-record-'));
const dist = path.join(scratch, 'dist');
const out = path.join(scratch, 'out');
fs.mkdirSync(out);

const inspect = spawnSync('docker', ['image', 'inspect', '--format', '{{index .RepoDigests 0}}', IMAGE], { encoding: 'utf8' });
if (inspect.status !== 0) {
  console.error(`record: the image ${IMAGE} is not on this host; pull it first`);
  process.exit(2);
}
const imageRef = `${IMAGE}@${inspect.stdout.trim().replace(/^[^@]*@/, '')}`;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

/** Run one step, keep its normalized log, and return its configuration entry. */
function step(id, purpose, { cmd = node, args, shown, keep, env = {}, image = null }) {
  const started = new Date();
  const t0 = process.hrtime.bigint();
  const r = spawnSync(cmd, args, { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, ...env } });
  const duration_s = Math.round((Number(process.hrtime.bigint() - t0) / 1e9) * 1000) / 1000;
  const text = normalizePaths(`${r.stdout ?? ''}${r.stderr ?? ''}`, { sandbox: [scratch, os.tmpdir()] });
  const log = path.join(OUT, `${id}.log`);
  fs.writeFileSync(log, text);
  console.log(`${RUN_ID} ${id}: exit ${r.status}, ${duration_s} s`);
  return {
    entry: {
      id,
      origin: 'recorded',
      purpose,
      ...(image ? { image } : {}),
      started_at: started.toISOString(),
      duration_s,
      argv: shown,
      exit_code: r.status,
      verdict_lines: text.split('\n').filter((l) => keep.test(l)).slice(0, 80),
      outputs: [fileRecord(REPO, posix(path.relative(REPO, log)), { kind: 'log' })],
    },
    text,
    ok: r.status === 0,
  };
}

const NODE_TEST = /^(# (tests|pass|fail|skipped|cancelled) |not ok )/;
const count = (text, name) => Number(new RegExp(`^# ${name} ([0-9]+)$`, 'm').exec(text)?.[1] ?? NaN);
const testsOk = (s) => s.ok && count(s.text, 'tests') > 0 && count(s.text, 'fail') === 0 && count(s.text, 'cancelled') === 0;
const mutantLine = (s) => /^mutants: ([0-9]+) of ([0-9]+) weakened copies failed their tests/m.exec(s.text);
const mutantsOk = (s) => s.ok && (mutantLine(s)?.[1] ?? 'x') === (mutantLine(s)?.[2] ?? 'y') && Number(mutantLine(s)?.[2]) > 0;

const steps = [];
const learnerTests = step('learner-tests', "the derivations' tests: which call counts, the first-call properties over seeded random logs, the Mirror's bands, bias and diagnosis, and VRK30", {
  args: ['--test', ...['mirror-bands', 'mirror-derive', 'mirror-first-call', 'mirror-vrk30'].map((t) => `packages/learner/test/${t}.test.ts`)],
  shown: ['node', '--test', 'packages/learner/test/mirror-*.test.ts'],
  keep: NODE_TEST,
});
steps.push(learnerTests);
const learnerTypes = step('typecheck-learner', "the learner package's type check, sources and tests", {
  cmd: 'npm',
  args: ['run', 'typecheck', '-w', '@statespace/learner'],
  shown: ['npm', 'run', 'typecheck', '-w', '@statespace/learner'],
  keep: /./,
});
steps.push(learnerTypes);
const siteTypes = step('typecheck-site', "the site's type check, the sheet and the screen included", {
  cmd: 'npm',
  args: ['run', 'typecheck', '-w', '@statespace/site'],
  shown: ['npm', 'run', 'typecheck', '-w', '@statespace/site'],
  keep: /./,
});
steps.push(siteTypes);
const sheetTests = step('sheet-tests', "the sheet's tests: the model with its properties, commitCall on the real ledger adapter, the markup, and GATE-items on the fixtures with planted faults", {
  args: ['--test', ...['model', 'commit', 'render', 'items-gate'].map((t) => `apps/site/src/components/call-it/test/${t}.test.mjs`)],
  shown: ['node', '--test', 'apps/site/src/components/call-it/test/*.test.mjs'],
  keep: NODE_TEST,
});
steps.push(sheetTests);
const screenTests = step('screen-tests', "the screen's render tests: the diagnosis table, bias and its threshold, sets, assisted calls apart, VRK30, the document, every word against the glossary, and the stylesheets", {
  args: ['--test', 'apps/site/src/screens/mirror/test/render.test.mjs'],
  shown: ['node', '--test', 'apps/site/src/screens/mirror/test/*.test.mjs'],
  keep: NODE_TEST,
});
steps.push(screenTests);
const guardTests = step('guard-tests', "the vocabulary guard's own tests: every term of the glossary against every lesson, claim and seam against drawer, the case and whole-word rules, the internal names and kinds of ID, the status words, and the refusal of a text with no lesson", {
  args: ['--test', 'scripts/spikes/W1-T07/test/words.test.mjs'],
  shown: ['node', '--test', 'scripts/spikes/W1-T07/test/words.test.mjs'],
  keep: NODE_TEST,
});
steps.push(guardTests);
const gate = step('items-gate', "GATE-items on the three fixture lesson pages of the sheet, through the gate's command line, with its planted-fixture self-check", {
  args: ['scripts/spikes/W1-T07/items-gate.mjs'],
  shown: ['node', 'scripts/spikes/W1-T07/items-gate.mjs'],
  keep: /^(GATE-items|planted fixtures|  ok |  FAIL )/,
});
steps.push(gate);
const callsGate = step('calls-gate', "GATE-calls on the same fixture pages: every authored call runs on native Z3 and on Pyodide's Z3, the two agree, every unsat is cross-checked with cvc5, and each key is what the call's first check gives", {
  args: ['scripts/spikes/W1-T07/calls-gate.mjs'],
  shown: ['node', 'scripts/spikes/W1-T07/calls-gate.mjs'],
  keep: /^(GATE-calls|  cvc5 confirmed|  engines: |planted fixtures)/,
});
steps.push(callsGate);
const hostMutants = step('mutants-host', "the weakened copies of the derivations, the sheet, the screen and the vocabulary guard, on the host: each must fail the tests of its group", {
  args: ['scripts/spikes/W1-T07/mutants.mjs'],
  shown: ['node', 'scripts/spikes/W1-T07/mutants.mjs'],
  keep: /^(mutants: |[a-z]+: the unchanged copy|SURVIVED|BROKEN)/,
});
steps.push(hostMutants);
const build = step('harness-build', "the harness built with Vite: the real sheet and screen, and the Mirror's route over the real IndexedDB adapter, with the site's fonts and a project base path", {
  cmd: 'npx',
  args: ['vite', 'build', '-c', `${HARNESS}/vite.config.mjs`],
  shown: ['npx', 'vite', 'build', '-c', `${HARNESS}/vite.config.mjs`],
  keep: /./,
  env: { HARNESS_OUT: dist },
});
steps.push(build);

const manifest = (dir, root = REPO) => {
  const files = [];
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const child = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(child);
      else files.push(child);
    }
  };
  walk(dir);
  const lines = files.map((f) => `${sha256File(path.join(root, f))}  ${f}`).sort();
  return { sha256: sha256(Buffer.from(`${lines.join('\n')}\n`)), sha256_method: 'SHA-256 of the sorted "sha256  path" lines of every file under the path', files: files.length };
};

const BROWSERS = 'w1t07-record-browsers';
const browsers = step('browsers', 'the harness in Chromium, Firefox and WebKit, inside the pinned image with no network: the first call is final, layout, axe, target sizes, the keyboard, the docked bar and the Mirror route over a real IndexedDB', {
  cmd: 'docker',
  args: ['run', '--rm', '--memory=4g', '--network', 'none', '--name', BROWSERS, '-v', `${REPO}:/repo:ro`, '-v', `${dist}:/dist:ro`, '-v', `${out}:/out`, IMAGE, 'node', `/repo/${HARNESS}/check.mjs`, '/dist', '/out', '/statespace/'],
  shown: ['docker', 'run', '--rm', '--memory=4g', '--network', 'none', '--name', BROWSERS, '-v', '<repo>:/repo:ro', '-v', '<sandbox>/dist:/dist:ro', '-v', '<sandbox>/out:/out', imageRef, 'node', `/repo/${HARNESS}/check.mjs`, '/dist', '/out', '/statespace/'],
  keep: /^(FAIL |[0-9]+ axe and layout runs)/,
  image: imageRef,
});
steps.push(browsers);
const distInput = { path: '<sandbox>/dist', ...manifest('dist', scratch), role: 'the built harness the browsers loaded' };
const reportFile = path.join(out, 'report.json');
const reported = fs.existsSync(reportFile);
const report = reported ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : { layout: [], final: [], keyboard: [], dock: [], mirror: [], notes: [], failures: ['no report.json'] };
if (reported) fs.copyFileSync(reportFile, path.join(OUT, 'browsers-report.json'));
if (reported) browsers.entry.outputs.push(fileRecord(REPO, `runs/${RUN_ID}/browsers-report.json`, { kind: 'report' }));
browsers.entry.inputs = [distInput];

const browserMutants = step('mutants-browser', 'the weakened copies of the sheet that the harness must fail on: the harness is built from each weakened copy and run in Chromium inside the pinned image', {
  args: ['scripts/spikes/W1-T07/mutants.mjs', '--group', 'browser', '--verbose'],
  shown: ['node', 'scripts/spikes/W1-T07/mutants.mjs', '--group', 'browser', '--verbose'],
  keep: /^(mutants: |KILLED|SURVIVED|BROKEN)/,
  image: imageRef,
});
steps.push(browserMutants);

// ------------------------------------------------------------------ values and checks
const unique = (xs) => [...new Set(xs)];
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const finals = report.final.filter((f) => f.version);
const engines = finals.map((f) => f.engine);
const versions = Object.fromEntries(finals.map((f) => [f.engine, f.version]));
const widths = unique(report.layout.map((r) => r.width)).sort((a, b) => a - b);
const themes = unique(report.layout.map((r) => r.theme));
const SITE_FACES = ['Archivo', 'Source Serif 4', 'JuliaMono'];
const faceRuns = report.layout.filter((r) => r.kind === 'open verdict' && Array.isArray(r.fonts));
const facesLoadedEverywhere = faceRuns.length === 0 ? [] : faceRuns.map((r) => r.fonts).reduce((a, b) => a.filter((f) => b.includes(f)));
const races = report.final.filter((f) => f.race);
const playwrightVersion = JSON.parse(fs.readFileSync(path.join(REPO, 'node_modules', 'playwright-core', 'package.json'), 'utf8')).version;
const axeVersion = JSON.parse(fs.readFileSync(path.join(REPO, 'node_modules', 'axe-core', 'package.json'), 'utf8')).version;
const dockerVersion = spawnSync('docker', ['--version'], { encoding: 'utf8' }).stdout.trim();
const killed = (s) => Number(mutantLine(s)?.[1] ?? NaN);
const total = (s) => Number(mutantLine(s)?.[2] ?? NaN);
const gateGreen = gate.ok && /^GATE-items: green /m.test(gate.text) && /planted fixtures: ([0-9]+) of \1 held/.test(gate.text);
const callsHeader = /^GATE-calls \(fast lane\): ([0-9]+) authored cells in ([0-9]+) pages .*, ([0-9]+) calls: ([0-9]+) findings/m.exec(callsGate.text);
const callsCvc5 = /cvc5 confirmed ([0-9]+) of ([0-9]+) unsat answers/.exec(callsGate.text);
const callsGreen = callsGate.ok && /^GATE-calls: green/m.test(callsGate.text) && callsHeader?.[4] === '0' && Number(callsHeader?.[3]) > 0 && callsCvc5?.[1] === callsCvc5?.[2] && /planted fixtures: ([0-9]+) of \1 cases held/.test(callsGate.text);

const checks = [
  { id: 'learner-tests-pass', pass: testsOk(learnerTests) },
  { id: 'typechecks-pass', pass: learnerTypes.ok && siteTypes.ok },
  { id: 'sheet-tests-pass', pass: testsOk(sheetTests) },
  { id: 'screen-tests-pass', pass: testsOk(screenTests) },
  { id: 'guard-tests-pass', pass: testsOk(guardTests) },
  { id: 'gate-items-green-on-the-fixtures', pass: gateGreen },
  { id: 'gate-calls-green-on-the-fixtures', pass: callsGreen },
  { id: 'host-weakened-copies-all-killed', pass: mutantsOk(hostMutants) },
  { id: 'harness-builds', pass: build.ok },
  { id: 'browsers-report-no-failure', pass: browsers.ok && reported && report.failures.length === 0 && report.layout.length > 0 },
  { id: 'three-engines', pass: ['chromium', 'firefox', 'webkit'].every((e) => engines.includes(e)) },
  { id: 'three-widths-two-themes', pass: [320, 360, 1280].every((w) => widths.includes(w)) && themes.includes('light') && themes.includes('night') },
  { id: 'axe-no-violation-of-any-impact', pass: report.layout.length > 0 && report.layout.every((r) => r.axeSerious === 0 && r.axeViolations.length === 0) },
  { id: 'no-sideways-scroll-and-no-small-control', pass: report.layout.length > 0 && report.layout.every((r) => r.overflowPx === 0 && (r.smallControls ?? 0) === 0) },
  { id: 'three-faces-loaded', pass: faceRuns.length > 0 && SITE_FACES.every((f) => facesLoadedEverywhere.includes(f)) },
  { id: 'first-call-final-in-three-engines', pass: ['chromium', 'firefox', 'webkit'].every((e) => finals.some((f) => f.engine === e) && races.filter((r) => r.engine === e).length === 3) },
  { id: 'keyboard-walks-dock-checks-and-route-checks-ran', pass: report.keyboard.length === 6 && report.dock.length === 3 && report.mirror.length === 3 && report.mirror.every((m) => m.heard === true) },
  { id: 'browser-weakened-copies-all-killed', pass: mutantsOk(browserMutants) },
];

const record = {
  id: RUN_ID,
  title: 'The Call It sheet and the Mirror as they stand: their tests, GATE-items on the sheet\'s fixtures and the weakened copies on the host, and the sheet and the screen in Chromium, Firefox and WebKit at 320, 360 and 1280 px in both themes, where the first call is final on the real IndexedDB adapter',
  task: TASK,
  origin: 'recorded',
  engine: 'playwright',
  version: playwrightVersion,
  version_string: `Playwright ${playwrightVersion} in ${IMAGE}; ${engines.map((e) => `${e} ${versions[e]}`).join(', ')}; axe-core ${axeVersion}`,
  binary: null,
  binary_sha256: null,
  image: imageRef,
  recorded_at: new Date().toISOString(),
  started_at: steps[0].entry.started_at,
  duration_s: Math.round(sum(steps.map((s) => s.entry.duration_s)) * 1000) / 1000,
  argv: browsers.entry.argv,
  inputs: [
    { ...manifest('apps/site/src/components/call-it'), path: 'apps/site/src/components/call-it', role: 'the sheet: its model, commit, components, styles, fixtures and tests' },
    { ...manifest('apps/site/src/screens/mirror'), path: 'apps/site/src/screens/mirror', role: 'the screen: its route, components, copy, styles and tests' },
    { ...manifest('packages/learner/src/mirror'), path: 'packages/learner/src/mirror', role: 'the derivations: which call counts, the Mirror and VRK30' },
    { ...manifest('packages/learner/test'), path: 'packages/learner/test', role: "the package's tests" },
    { ...manifest('scripts/spikes/W1-T07'), path: 'scripts/spikes/W1-T07', role: 'the gate runner, the vocabulary guard, the browser harness, the weakened copies and this recording script' },
    { ...fileRecord(REPO, 'scripts/verify-items.mjs'), role: "GATE-items, W1-T39's gate, which the fixtures are run through" },
    { ...fileRecord(REPO, 'scripts/verify-calls.mjs'), role: "GATE-calls, W1-T37's gate, which the fixtures are run through" },
    { ...fileRecord(REPO, 'content/glossary.yaml'), role: "the glossary whose names the render tests hold every word to (W1-T38's file)" },
    { ...fileRecord(REPO, 'schemas/event.schema.json'), role: "event@1, which every call the sheet writes must satisfy (W1-T03's file)" },
    distInput,
  ],
  budget: { container_memory: '4g', network: 'none: the image, node_modules and the built harness are local', widths_px: [320, 360, 1280], themes: ['light', 'night'], viewport_height_px: 900, minimum_target_px: 44 },
  exit_code: browsers.entry.exit_code,
  verdict_lines: browsers.entry.verdict_lines,
  outputs: [...steps.flatMap((s) => s.entry.outputs)],
  values: {
    browsers: versions,
    widths_px: widths,
    themes,
    layout_and_axe_runs: report.layout.length,
    axe_violations_of_any_impact: sum(report.layout.map((r) => r.axeViolations.length)),
    axe_serious_or_critical: sum(report.layout.map((r) => r.axeSerious)),
    sideways_scroll_px_max: Math.max(0, ...report.layout.map((r) => r.overflowPx)),
    controls_under_44_px: sum(report.layout.map((r) => r.smallControls ?? 0)),
    faces_checked: SITE_FACES,
    faces_loaded_on_the_open_verdict_page_of_every_run: facesLoadedEverywhere,
    first_call_final_engines: engines,
    races_of_two_tabs_committing_at_once: races.length,
    race_call_events_written: races.map((r) => ({ engine: r.engine, item: r.race, events: r.events })),
    keyboard_walks: report.keyboard.length,
    dock_checks: report.dock.map((d) => ({ engine: d.engine, scroll_padding_px: d.padding, bar_height_px: d.barHeight })),
    route_checks_where_a_second_tab_was_heard: report.mirror.filter((m) => m.heard).length,
    failures: report.failures.length,
    learner_tests: { tests: count(learnerTests.text, 'tests'), pass: count(learnerTests.text, 'pass'), fail: count(learnerTests.text, 'fail') },
    sheet_tests: { tests: count(sheetTests.text, 'tests'), pass: count(sheetTests.text, 'pass'), fail: count(sheetTests.text, 'fail') },
    screen_tests: { tests: count(screenTests.text, 'tests'), pass: count(screenTests.text, 'pass'), fail: count(screenTests.text, 'fail') },
    guard_tests: { tests: count(guardTests.text, 'tests'), pass: count(guardTests.text, 'pass'), fail: count(guardTests.text, 'fail') },
    gate_items: { verdict: gateGreen ? 'green' : 'not green', pages: 3, authored_calls: 7 },
    gate_calls: { verdict: callsGreen ? 'green' : 'not green', cells: Number(callsHeader?.[1]), pages: Number(callsHeader?.[2]), calls: Number(callsHeader?.[3]), findings: Number(callsHeader?.[4]), unsat_answers_confirmed_by_cvc5: `${callsCvc5?.[1]} of ${callsCvc5?.[2]}` },
    weakened_copies_on_the_host: { killed: killed(hostMutants), of: total(hostMutants) },
    weakened_copies_in_the_browser: { killed: killed(browserMutants), of: total(browserMutants) },
    tools: { playwright: playwrightVersion, 'axe-core': axeVersion, vite: JSON.parse(fs.readFileSync(path.join(REPO, 'node_modules', 'vite', 'package.json'), 'utf8')).version },
  },
  checks,
  pass: checks.every((c) => c.pass),
  environment: { ...hostEnvironment(), node: process.version, container: imageRef, docker: dockerVersion },
  primary_config: 'browsers',
  configs: steps.map((s) => s.entry),
  unrecorded: [
    { field: 'binary', reason: 'no single file ran: the browsers ran inside the pinned image, which is named by digest under image' },
    { field: 'binary_sha256', reason: 'as binary: the image is named by digest, and the browsers it holds are not hashed one by one' },
  ],
  notes: [
    "The sheet and the screen ran in a harness of their own (scripts/spikes/W1-T07/harness), not in the site's shell: the real sheet bound to the real IndexedDB adapter inside a mock lesson cell, the real screen over a learner's log held in the page, and the Mirror's real route over the real adapter with the clock fixed and a second tab writing calls. W1-T02's shell, W1-T06's instrument cell and the lesson pages that mount the sheet were not part of it.",
    'Two tabs that commit at the same moment may each write a call (the race entries list how many events each wrote): the first in fold order is the call that counts, and both screens show it. That is how the sheet keeps the first call final on an append-only log, and the check is that both screens agree on that call.',
    'axe finds a share of the accessibility problems a page can have; the checks here (target sizes, the keyboard, the docked bar, no sideways scroll at 320 and 360 px) are the ones a script can make. A screen-reader pass is W1-T46.',
    'The browsers ran with no network in the pinned Playwright image; Node ran the harness server and the checks. The unit tests, the gate and the weakened copies of the derivations, the sheet, the screen and the vocabulary guard ran on the host. The weakened copies of the browser group ran Chromium only, in the same image.',
    'A control of 43.5 px or more in both directions counts as 44 px, for subpixel layout; the check reports every control below that.',
    'This ran on the development host, not on a CI runner, and no lane runs it: the integrator decides where the browser step belongs.',
    'Spine section 9.5 registers no run for this task; the ID is proposed once a scanned document cites it.',
  ],
};
fs.writeFileSync(path.join(REPO, 'runs', `${RUN_ID}.json`), `${JSON.stringify(record, null, 2)}\n`);
fs.rmSync(scratch, { recursive: true, force: true });
console.log(`${RUN_ID}: ${record.pass ? 'pass' : 'FAIL'} (${checks.filter((c) => !c.pass).map((c) => c.id).join(', ') || 'every check passed'})`);
process.exitCode = record.pass ? 0 : 1;
