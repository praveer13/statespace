#!/usr/bin/env node
// Record RUN-specimens-screen (W1-T16): the specimen screen checked as it stands. The screen's unit and render tests, the
// tests of the scripts, the freshness of the cabinet and of the schema fixtures, and the browser harness in the pinned
// Playwright image: Chromium, Firefox and WebKit at 320, 360 and 1280 px in both themes, axe on the WCAG 2.2 AA tags, every
// control at least 44 px, the keyboard, a fragment link, and the route over a real IndexedDB with a second tab writing.
// Every log goes under runs/RUN-specimens-screen/ and the verdict lines are copied from them.
//
//   node scripts/spikes/W1-T16/record-screen.mjs      a few minutes; needs Docker and mcr.microsoft.com/playwright:v1.63.0-noble
//
// The record is of the files it hashes: record it again after any change to the screen, the scripts of this task (the
// builder, the guard, the tests and the harness), the records, the schema, the glossary or this script. The ID is not in
// packages/ids/proposals.json: spine section 9.5 registers no run for this task, and GATE-links fails a proposal that no
// scanned document cites, so the first document that cites it adds it (propose-ids.mjs shows how).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileRecord, hostEnvironment, normalizePaths, posix, REPO, sha256, sha256File } from '../../runs/registry.mjs';

const RUN_ID = 'RUN-specimens-screen';
const TASK = 'W1-T16';
const IMAGE = 'mcr.microsoft.com/playwright:v1.63.0-noble';
const OUT = path.join(REPO, 'runs', RUN_ID);
const node = process.execPath;
const HARNESS = 'scripts/spikes/W1-T16/harness';
const scratch = fs.mkdtempSync(path.join(process.env.W1T16_SCRATCH ?? os.tmpdir(), 'w1t16-screen-'));
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
      verdict_lines: text.split('\n').filter((l) => keep.test(l)).slice(0, 60),
      outputs: [fileRecord(REPO, posix(path.relative(REPO, log)), { kind: 'log' })],
    },
    text,
    ok: r.status === 0,
  };
}

const NODE_TEST = /^(# (tests|pass|fail|skipped|cancelled) |not ok )/;
const count = (text, name) => Number(new RegExp(`^# ${name} ([0-9]+)$`, 'm').exec(text)?.[1] ?? NaN);
const testsOk = (s) => s.ok && count(s.text, 'tests') > 0 && count(s.text, 'fail') === 0 && count(s.text, 'cancelled') === 0;

const steps = [];
const screenTests = step('screen-tests', "the screen's unit and render tests: the model, the evidence resolver with planted faults, the status rules and the markup", {
  args: ['--test', 'apps/site/src/screens/specimens/test/blocks.test.mjs', 'apps/site/src/screens/specimens/test/cabinet.test.mjs', 'apps/site/src/screens/specimens/test/evidence.test.mjs', 'apps/site/src/screens/specimens/test/label.test.mjs', 'apps/site/src/screens/specimens/test/render.test.mjs', 'apps/site/src/screens/specimens/test/status.test.mjs'],
  shown: ['node', '--test', 'apps/site/src/screens/specimens/test/*.test.mjs'],
  keep: NODE_TEST,
});
steps.push(screenTests);
const scriptTests = step('script-tests', "the tests of the cabinet's builder, the internal-name guard, the schema fixtures and the replay run", {
  args: ['--test', 'scripts/spikes/W1-T16/cabinet.test.mjs', 'scripts/spikes/W1-T16/words.test.mjs', 'scripts/spikes/W1-T16/fixtures.test.mjs', 'scripts/spikes/W1-T16/replay.test.mjs'],
  shown: ['node', '--test', 'scripts/spikes/W1-T16/cabinet.test.mjs', 'scripts/spikes/W1-T16/words.test.mjs', 'scripts/spikes/W1-T16/fixtures.test.mjs', 'scripts/spikes/W1-T16/replay.test.mjs'],
  keep: NODE_TEST,
});
steps.push(scriptTests);
const cabinet = step('cabinet-fresh', 'the committed cabinet is what content/specimens/ and runs/ build', {
  args: ['scripts/spikes/W1-T16/build-cabinet.mjs', '--check'],
  shown: ['node', 'scripts/spikes/W1-T16/build-cabinet.mjs', '--check'],
  keep: /^build-cabinet: /,
});
steps.push(cabinet);
const fixtures = step('fixtures-fresh', 'the committed specimen@1 fixtures are what the generator writes', {
  args: ['scripts/spikes/W1-T16/make-schema-fixtures.mjs', '--check'],
  shown: ['node', 'scripts/spikes/W1-T16/make-schema-fixtures.mjs', '--check'],
  keep: /^make-schema-fixtures: /,
});
steps.push(fixtures);
const build = step('harness-build', "the harness built with Vite: the real screen, and the real route over the real IndexedDB adapter, with the site's fonts and a project base path", {
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

const BROWSERS = 'w1t16-screen-browsers';
const browsers = step('browsers', 'the harness in Chromium, Firefox and WebKit, inside the pinned image with no network: layout, axe, target sizes, the keyboard, a fragment link and the route over a real IndexedDB', {
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
const report = reported ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : { runs: [], keyboard: [], route: [], notes: [], failures: ['no report.json'] };
if (reported) fs.copyFileSync(reportFile, path.join(OUT, 'browsers-report.json'));
const reportOutput = reported ? fileRecord(REPO, `runs/${RUN_ID}/browsers-report.json`, { kind: 'report' }) : null;
if (reportOutput) browsers.entry.outputs.push(reportOutput);
browsers.entry.inputs = [distInput];

// ------------------------------------------------------------------ values and checks
const unique = (xs) => [...new Set(xs)];
const engines = unique(report.runs.map((r) => r.engine));
const versions = Object.fromEntries(engines.map((e) => [e, report.runs.find((r) => r.engine === e)?.version ?? null]));
const widths = unique(report.runs.map((r) => r.width)).sort((a, b) => a - b);
const themes = unique(report.runs.map((r) => r.theme));
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
// the faces the browser reported loaded in every run that checks them (the closed-labels page of every engine, width and theme)
const SITE_FACES = ['Archivo', 'Source Serif 4', 'JuliaMono'];
const fontRuns = report.runs.filter((r) => Array.isArray(r.fonts));
const facesLoadedEverywhere = fontRuns.length === 0 ? [] : fontRuns.map((r) => r.fonts).reduce((a, b) => a.filter((f) => b.includes(f)));
const playwrightVersion = JSON.parse(fs.readFileSync(path.join(REPO, 'node_modules', 'playwright-core', 'package.json'), 'utf8')).version;
const axeVersion = JSON.parse(fs.readFileSync(path.join(REPO, 'node_modules', 'axe-core', 'package.json'), 'utf8')).version;
const dockerVersion = spawnSync('docker', ['--version'], { encoding: 'utf8' }).stdout.trim();

const checks = [
  { id: 'screen-tests-pass', pass: testsOk(screenTests) },
  { id: 'script-tests-pass', pass: testsOk(scriptTests) },
  { id: 'cabinet-is-fresh', pass: cabinet.ok && /is what [0-9]+ records and their runs build/.test(cabinet.text) },
  { id: 'fixtures-are-fresh', pass: fixtures.ok && /is what this script writes/.test(fixtures.text) },
  { id: 'harness-builds', pass: build.ok },
  { id: 'browsers-report-no-failure', pass: browsers.ok && reported && report.failures.length === 0 && report.runs.length > 0 },
  { id: 'three-engines', pass: ['chromium', 'firefox', 'webkit'].every((e) => engines.includes(e)) },
  { id: 'three-widths-two-themes', pass: [320, 360, 1280].every((w) => widths.includes(w)) && themes.includes('light') && themes.includes('night') },
  { id: 'axe-no-serious-or-critical', pass: report.runs.length > 0 && report.runs.every((r) => r.axeSerious === 0) },
  { id: 'no-sideways-scroll-and-no-small-control', pass: report.runs.length > 0 && report.runs.every((r) => r.overflowPx === 0 && r.smallControls === 0) },
  { id: 'three-faces-loaded', pass: fontRuns.length > 0 && SITE_FACES.every((f) => facesLoadedEverywhere.includes(f)) },
  { id: 'keyboard-walks-and-route-checks-ran', pass: report.keyboard.length > 0 && report.route.length > 0 },
];

const record = {
  id: RUN_ID,
  title: "The specimen screen as it stands: its tests and the cabinet's freshness on the host, and the screen in Chromium, Firefox and WebKit at 320, 360 and 1280 px in both themes with axe, target sizes, the keyboard and the route over a real IndexedDB",
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
    { ...manifest('apps/site/src/screens/specimens'), path: 'apps/site/src/screens/specimens', role: 'the screen: its model, components, styles, tests and the cabinet it loads' },
    { ...manifest('scripts/spikes/W1-T16'), path: 'scripts/spikes/W1-T16', role: 'the builder, the internal-name guard, the fixtures generator, the replay script, their tests and the browser harness' },
    { ...manifest('content/specimens'), path: 'content/specimens', role: 'the specimen records the cabinet is built from' },
    { ...fileRecord(REPO, 'schemas/specimen.schema.json'), role: 'the schema of the records' },
    { ...fileRecord(REPO, 'content/glossary.yaml'), role: "the glossary whose internal names the builder and the render tests hold every word to (W1-T38's file)" },
    { ...fileRecord(REPO, 'scripts/spikes/W1-T16/record-screen.mjs'), role: 'recording script' },
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
    layout_and_axe_runs: report.runs.length,
    axe_serious_or_critical: sum(report.runs.map((r) => r.axeSerious)),
    sideways_scroll_px_max: Math.max(0, ...report.runs.map((r) => r.overflowPx)),
    controls_under_44_px: sum(report.runs.map((r) => r.smallControls)),
    faces_checked: SITE_FACES,
    faces_loaded_in_every_run_that_checks_them: facesLoadedEverywhere,
    runs_that_check_faces: fontRuns.length,
    labels_listed_when_every_specimen_is_held: unique(report.runs.filter((r) => r.kind !== 'none').map((r) => r.labels)),
    keyboard_walks: report.keyboard.length,
    route_checks: report.route.length,
    failures: report.failures.length,
    screen_tests: { tests: count(screenTests.text, 'tests'), pass: count(screenTests.text, 'pass'), fail: count(screenTests.text, 'fail') },
    script_tests: { tests: count(scriptTests.text, 'tests'), pass: count(scriptTests.text, 'pass'), fail: count(scriptTests.text, 'fail') },
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
    "The screen ran in a harness of its own (scripts/spikes/W1-T16/harness), not in the site's shell: it is the real screen and the real route over the real IndexedDB adapter, with the clock fixed and a second tab writing a call, inside a minimal router with the site's fonts. W1-T02's shell and the lesson pages that link to the specimens were not part of it.",
    'axe finds a share of the accessibility problems a page can have; the checks here (target sizes, the keyboard, no sideways scroll at 320 and 360 px) are the ones a script can make. A screen-reader pass is W1-T46.',
    'The browsers ran with no network in the pinned Playwright image; Node ran the harness server and the checks. The unit tests and the freshness checks ran on the host.',
    'A control of 43.5 px or more in both directions counts as 44 px, for subpixel layout; the check reports every control below that.',
    'The tests of the screen and of the scripts are listed by file in their configurations; a machine without python3 skips the two replay tests that run it, and the log says so.',
    "This ran on the development host, not on a CI runner, and no lane runs it: the integrator decides where the browser step belongs.",
    'Spine section 9.5 registers no run for this task; the ID is proposed once a scanned document cites it.',
  ],
};
fs.writeFileSync(path.join(REPO, 'runs', `${RUN_ID}.json`), `${JSON.stringify(record, null, 2)}\n`);
fs.rmSync(scratch, { recursive: true, force: true });
console.log(`${RUN_ID}: ${record.pass ? 'pass' : 'FAIL'} (${checks.filter((c) => !c.pass).map((c) => c.id).join(', ') || 'every check passed'})`);
process.exitCode = record.pass ? 0 : 1;
