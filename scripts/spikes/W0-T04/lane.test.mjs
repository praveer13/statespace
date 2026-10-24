// Tests of the lane runner (lane.mjs): fixture repositories with scripts that pass, fail, hang and print paths.
// Run: node --test scripts/spikes/W0-T04/lane.test.mjs

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildStatus, redactor, resolveSteps, validateManifest, verdictOf } from './lane.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LANE = path.join(HERE, 'lane.mjs');

const LANES = { fast: { step_timeout_s: 30, budget_s: 300 }, nightly: { step_timeout_s: 30 }, release: { step_timeout_s: 30 }, monthly: { step_timeout_s: 30 } };

/** A scratch repository: `files` are written under it; `steps` become the manifest. */
function fixture(files, steps, lanes = LANES) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lane-test-'));
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  const manifest = path.join(root, 'gates.json');
  fs.writeFileSync(manifest, JSON.stringify({ format: 'lane-manifest/1', lanes, steps }));
  return { root, manifest, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

const gate = (id, script, lanes = { fast: {} }, extra = {}) => ({ id, kind: 'gate', script, built_by: 'W0-T04', lanes, ...extra });

function run(fx, lane, args = [], env = {}) {
  const r = spawnSync(process.execPath, [LANE, lane, '--root', fx.root, '--manifest', fx.manifest, ...args], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env },
    timeout: 60000,
  });
  return { status: r.status, out: r.stdout, err: r.stderr };
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const PASS = "console.log('GATE-x: PASS');";
const FAIL = "console.log('GATE-x: FAIL (1 finding)'); process.exit(1);";

test('an absent step is reported with the task that builds it, and neither passes nor fails the lane', () => {
  const fx = fixture({ 'scripts/ok.mjs': PASS }, [gate('GATE-numbers', 'scripts/ok.mjs'), gate('GATE-kc', 'scripts/verify-kc.mjs', { fast: {} }, { built_by: 'W1-T04' })]);
  try {
    const summaryFile = path.join(fx.root, 'summary.json');
    const r = run(fx, 'fast', ['--summary', summaryFile]);
    assert.equal(r.status, 0, r.out + r.err);
    const s = readJson(summaryFile);
    assert.equal(s.result, 'pass');
    assert.deepEqual(s.counts, { pass: 1, fail: 0, error: 0, timeout: 0, absent: 1, skipped: 0 });
    const absent = s.steps.find((x) => x.id === 'GATE-kc');
    assert.equal(absent.result, 'absent');
    assert.equal(absent.built_by, 'W1-T04');
    assert.match(r.out, /absent, not built yet \(1\): GATE-kc \(W1-T04\)/);
  } finally {
    fx.cleanup();
  }
});

test('a failing gate fails the lane; the summary keeps its verdict line and the tail of its output', () => {
  const fx = fixture({ 'scripts/ok.mjs': PASS, 'scripts/bad.mjs': `console.log('first'); console.log('second'); ${FAIL}` }, [gate('GATE-numbers', 'scripts/ok.mjs'), gate('GATE-links', 'scripts/bad.mjs')]);
  try {
    const summaryFile = path.join(fx.root, 'summary.json');
    const r = run(fx, 'fast', ['--summary', summaryFile]);
    assert.equal(r.status, 1);
    const s = readJson(summaryFile);
    assert.equal(s.result, 'fail');
    const bad = s.steps.find((x) => x.id === 'GATE-links');
    assert.equal(bad.result, 'fail');
    assert.equal(bad.exit_code, 1);
    assert.equal(bad.verdict, 'GATE-x: FAIL (1 finding)');
    assert.deepEqual(bad.output_tail, ['first', 'second', 'GATE-x: FAIL (1 finding)']);
    assert.equal(s.steps.find((x) => x.id === 'GATE-numbers').output_tail, undefined, 'a pass stores no tail');
  } finally {
    fx.cleanup();
  }
});

test('exit 2 ("the gate could not run") is an error and also fails the lane; a gate that was not started is an error', () => {
  const fx = fixture({ 'scripts/two.mjs': 'process.exit(2);' }, [gate('GATE-numbers', 'scripts/two.mjs')]);
  try {
    const summaryFile = path.join(fx.root, 'summary.json');
    const r = run(fx, 'fast', ['--summary', summaryFile]);
    assert.equal(r.status, 1);
    assert.equal(readJson(summaryFile).steps[0].result, 'error');
  } finally {
    fx.cleanup();
  }
});

test('a step that outlives its timeout is killed with its children, and the lane fails', () => {
  const hang = `import { spawn } from 'node:child_process';
spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
console.log('started');
setInterval(() => {}, 1000);`;
  const fx = fixture({ 'scripts/hang.mjs': hang, 'scripts/ok.mjs': PASS }, [gate('GATE-numbers', 'scripts/hang.mjs'), gate('GATE-links', 'scripts/ok.mjs')]);
  try {
    const summaryFile = path.join(fx.root, 'summary.json');
    const t0 = Date.now();
    const r = run(fx, 'fast', ['--timeout-s', '1', '--summary', summaryFile]);
    assert.ok(Date.now() - t0 < 20000, 'the lane must not wait for the hung step');
    assert.equal(r.status, 1);
    const s = readJson(summaryFile);
    assert.equal(s.steps[0].result, 'timeout');
    assert.match(s.steps[0].verdict, /stopped after 1 s/);
    assert.equal(s.steps[1].result, 'pass', 'the next step still runs');
  } finally {
    fx.cleanup();
  }
});

test('the lane budget fails the lane after the fact, and steps that would start past it are skipped', () => {
  const sleep = (ms) => `await new Promise((r) => setTimeout(r, ${ms})); console.log('done');`;
  const fx = fixture({ 'scripts/a.mjs': sleep(700), 'scripts/b.mjs': sleep(700), 'scripts/c.mjs': PASS }, [gate('GATE-numbers', 'scripts/a.mjs'), gate('GATE-links', 'scripts/b.mjs'), gate('GATE-budget', 'scripts/c.mjs')]);
  try {
    const summaryFile = path.join(fx.root, 'summary.json');
    const r = run(fx, 'fast', ['--budget-s', '1', '--summary', summaryFile]);
    assert.equal(r.status, 1);
    const s = readJson(summaryFile);
    assert.equal(s.over_budget, true);
    assert.equal(s.result, 'fail');
    assert.equal(s.steps[2].result, 'skipped');
    assert.match(r.out, /over its budget/);
  } finally {
    fx.cleanup();
  }
});

test('STATESPACE_LANE_START puts the setup steps of the job inside the budget', () => {
  const fx = fixture({ 'scripts/ok.mjs': PASS }, [gate('GATE-numbers', 'scripts/ok.mjs')]);
  try {
    const summaryFile = path.join(fx.root, 'summary.json');
    const started = Math.floor(Date.now() / 1000) - 400;
    const r = run(fx, 'fast', ['--summary', summaryFile], { STATESPACE_LANE_START: String(started) });
    assert.equal(r.status, 1, 'the job started 400 s ago, so the 300 s budget is gone');
    const s = readJson(summaryFile);
    assert.equal(s.over_budget, true);
    assert.equal(s.steps[0].result, 'skipped');
    assert.ok(s.duration_s >= 399);
  } finally {
    fx.cleanup();
  }
});

test('in the release lane a required step whose script is missing fails the lane (the GATE-release stub fails closed)', () => {
  const fx = fixture({ 'scripts/ok.mjs': PASS }, [gate('GATE-numbers', 'scripts/ok.mjs', { release: { args: ['--strict'] } }), gate('GATE-release', 'scripts/verify-release.mjs', { release: { required: true } }, { built_by: 'W5-T09' })]);
  try {
    const summaryFile = path.join(fx.root, 'summary.json');
    const r = run(fx, 'release', ['--summary', summaryFile]);
    assert.equal(r.status, 1);
    const s = readJson(summaryFile);
    const stub = s.steps.find((x) => x.id === 'GATE-release');
    assert.equal(stub.result, 'error');
    assert.equal(stub.required, true);
    assert.match(stub.verdict, /a step this lane requires is missing \(built by W5-T09\)/);
    assert.match(r.out, /\[ 2\/2\] GATE-release\s+ERROR\s+0\.0 s  scripts\/verify-release\.mjs does not exist: a step this lane requires is missing/, 'the console names the step that failed the lane');
    // The same step, not required, would only be absent:
    const fx2 = fixture({}, [gate('GATE-release', 'scripts/verify-release.mjs', { release: {} }, { built_by: 'W5-T09' })]);
    try {
      assert.equal(run(fx2, 'release').status, 0);
    } finally {
      fx2.cleanup();
    }
  } finally {
    fx.cleanup();
  }
});

test('arguments: a lane adds its own, and args_if_env adds more only when the variable is set', () => {
  const echo = "console.log('args=' + JSON.stringify(process.argv.slice(2)));";
  const steps = [gate('GATE-privacy', 'scripts/echo.mjs', { fast: { args_if_env: { STATESPACE_PRIVACY_TERMS: ['--strict'] } }, release: { args: ['--strict'] } })];
  const fx = fixture({ 'scripts/echo.mjs': echo }, steps);
  try {
    const verdict = (env, lane = 'fast') => {
      const f = path.join(fx.root, 'summary.json');
      run(fx, lane, ['--summary', f], env);
      return readJson(f).steps[0].verdict;
    };
    assert.equal(verdict({}), 'args=[]');
    assert.equal(verdict({ STATESPACE_PRIVACY_TERMS: 'x' }), 'args=["--strict"]');
    assert.equal(verdict({ STATESPACE_PRIVACY_TERMS: '' }), 'args=[]', 'an empty secret (a fork has none) counts as unset');
    assert.equal(verdict({}, 'release'), 'args=["--strict"]');
  } finally {
    fx.cleanup();
  }
});

test('--only runs named steps, and a name the lane lacks is a usage error', () => {
  const fx = fixture({ 'scripts/ok.mjs': PASS, 'scripts/bad.mjs': FAIL }, [gate('GATE-numbers', 'scripts/ok.mjs'), gate('GATE-links', 'scripts/bad.mjs')]);
  try {
    assert.equal(run(fx, 'fast', ['--only', 'GATE-numbers']).status, 0);
    const r = run(fx, 'fast', ['--only', 'GATE-nope']);
    assert.equal(r.status, 2);
    assert.match(r.err, /does not have: GATE-nope/);
  } finally {
    fx.cleanup();
  }
});

test('--only on the nightly lane would write a partial status, so it must name another file', () => {
  const fx = fixture({ 'scripts/ok.mjs': PASS }, [gate('GATE-numbers', 'scripts/ok.mjs', { nightly: {} })]);
  try {
    const refused = run(fx, 'nightly', ['--only', 'GATE-numbers']);
    assert.equal(refused.status, 2);
    assert.match(refused.err, /covers some steps only/);
    assert.ok(!fs.existsSync(path.join(fx.root, 'status', 'nightly.json')));
    const other = path.join(fx.root, 'partial.json');
    assert.equal(run(fx, 'nightly', ['--only', 'GATE-numbers', '--status', other]).status, 0);
    assert.ok(fs.existsSync(other));
  } finally {
    fx.cleanup();
  }
});

test('the monthly lane needs --lean and hands it to its steps as a toolchain name', () => {
  const echo = "console.log('toolchain=' + process.env.STATESPACE_LEAN_TOOLCHAIN);";
  const fx = fixture({ 'scripts/echo.mjs': echo }, [gate('GATE-labs', 'scripts/echo.mjs', { monthly: {} })]);
  try {
    assert.equal(run(fx, 'monthly').status, 2);
    const f = path.join(fx.root, 'summary.json');
    assert.equal(run(fx, 'monthly', ['--lean', '4.35.0', '--summary', f]).status, 0);
    assert.equal(readJson(f).steps[0].verdict, 'toolchain=leanprover/lean4:v4.35.0');
    assert.equal(run(fx, 'monthly', ['--lean', 'v4.36.0', '--summary', f]).status, 0);
    assert.equal(readJson(f).steps[0].verdict, 'toolchain=leanprover/lean4:v4.36.0');
    assert.equal(run(fx, 'monthly', ['--lean', '4.36.0-rc1']).status, 2, 'a release candidate is not a stable release');
  } finally {
    fx.cleanup();
  }
});

test('paths of the machine are replaced in everything the runner stores', () => {
  const noisy = "console.log('cwd=' + process.cwd()); console.log('home=/home/someone/project'); console.log('done ' + process.cwd());";
  const fx = fixture({ 'scripts/noisy.mjs': noisy }, [gate('GATE-numbers', 'scripts/noisy.mjs')]);
  try {
    const f = path.join(fx.root, 'summary.json');
    const r = run(fx, 'fast', ['--summary', f]);
    assert.equal(r.status, 0);
    const text = fs.readFileSync(f, 'utf8');
    assert.ok(!text.includes(fs.realpathSync(fx.root)), 'the repository path must not be stored');
    assert.ok(!text.includes('/home/someone'), 'a home directory must not be stored');
    assert.equal(readJson(f).steps[0].verdict, 'done <repo>');
    assert.ok(!r.out.includes(fs.realpathSync(fx.root)), 'nor printed');
    assert.ok(!text.includes(os.tmpdir() + '/lane-test'));
  } finally {
    fx.cleanup();
  }
});

test('in GitHub Actions the runner groups each step, annotates a failure and writes the job summary', () => {
  const fx = fixture({ 'scripts/ok.mjs': PASS, 'scripts/bad.mjs': FAIL }, [gate('GATE-numbers', 'scripts/ok.mjs'), gate('GATE-links', 'scripts/bad.mjs')]);
  try {
    const stepSummary = path.join(fx.root, 'step-summary.md');
    const f = path.join(fx.root, 'summary.json');
    const r = run(fx, 'fast', ['--summary', f], { GITHUB_ACTIONS: 'true', GITHUB_STEP_SUMMARY: stepSummary, GITHUB_RUN_ID: '4242', GITHUB_RUN_ATTEMPT: '2', GITHUB_WORKFLOW: 'fast', GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: 'a'.repeat(40) });
    assert.equal(r.status, 1);
    assert.match(r.out, /^::group::\[ 1\/2\] GATE-numbers/m);
    assert.match(r.out, /^::endgroup::$/m);
    assert.match(r.out, /^::error title=GATE-links::GATE-links fail: GATE-x: FAIL \(1 finding\)$/m);
    const s = readJson(f);
    assert.deepEqual(s.source, { kind: 'github-actions', workflow: 'fast', event: 'pull_request', run_id: '4242', run_attempt: 2 });
    assert.equal(s.commit, 'a'.repeat(40));
    assert.equal(s.dirty, undefined, 'a hosted checkout has no dirty flag');
    const md = fs.readFileSync(stepSummary, 'utf8');
    assert.match(md, /### fast lane: FAIL/);
    assert.match(md, /\| GATE-links \| fail \|/);
  } finally {
    fx.cleanup();
  }
});

test('--source or STATESPACE_LANE_SOURCE labels a run that is not what it looks like (the emulated runner)', () => {
  const fx = fixture({ 'scripts/ok.mjs': PASS }, [gate('GATE-numbers', 'scripts/ok.mjs')]);
  try {
    const f = path.join(fx.root, 'summary.json');
    run(fx, 'fast', ['--summary', f], { GITHUB_ACTIONS: 'true', STATESPACE_LANE_SOURCE: 'emulated-runner' });
    assert.deepEqual(readJson(f).source, { kind: 'emulated-runner' });
  } finally {
    fx.cleanup();
  }
});

// ---------------------------------------------------------------- the nightly status document
const NIGHTLY = (extra = {}) => ({ nightly: {}, ...extra });
const statusFixture = (gateScript) => fixture({ 'scripts/g.mjs': gateScript, 'scripts/ok.mjs': PASS, 'scripts/h.mjs': "process.exit(process.env.H_FAILS ? 1 : 0);" }, [gate('GATE-interp', 'scripts/g.mjs', NIGHTLY()), gate('GATE-kc', 'scripts/ok.mjs', NIGHTLY()), gate('GATE-codes', 'scripts/h.mjs', NIGHTLY()), gate('GATE-replay', 'scripts/verify-replay.mjs', NIGHTLY(), { built_by: 'W2-T03' }), { id: 'unit-tests', kind: 'check', argv: ['node', 'scripts/ok.mjs'], needs: 'scripts/ok.mjs', built_by: 'W0-S12', lanes: { nightly: {} } }]);

test('nightly writes status/nightly.json: commit, date, each failed gate with its claims, and the gates not built yet', () => {
  const fx = statusFixture(FAIL);
  try {
    const claims = path.join(fx.root, 'claims.json');
    fs.writeFileSync(claims, JSON.stringify({ 'GATE-interp': ['SEAM-13'], 'GATE-kc': ['SEAM-1'] }));
    const r = run(fx, 'nightly', ['--now', '2026-10-20T02:23:00Z', '--claims', claims], { GITHUB_SHA: 'b'.repeat(40), GITHUB_ACTIONS: 'true', GITHUB_RUN_ID: '7', STATESPACE_BENCH_IMAGE: `ghcr.io/example/bench@sha256:${'c'.repeat(64)}` });
    assert.equal(r.status, 1);
    const st = readJson(path.join(fx.root, 'status', 'nightly.json'));
    assert.equal(st.schema, 'statespace/nightly-status@1');
    assert.equal(st.date, '2026-10-20');
    assert.equal(st.commit, 'b'.repeat(40));
    assert.equal(st.result, 'red');
    assert.equal(st.red_since, '2026-10-20');
    assert.equal(st.blocked, null);
    assert.equal(st.image_digest, `sha256:${'c'.repeat(64)}`);
    assert.deepEqual(st.failed, [{ gate: 'GATE-interp', result: 'fail', since: '2026-10-20', claims: ['SEAM-13'] }]);
    assert.deepEqual(st.gates.map((g) => [g.id, g.result]), [['GATE-interp', 'fail'], ['GATE-kc', 'pass'], ['GATE-codes', 'pass']]);
    assert.deepEqual(st.checks.map((g) => [g.id, g.result]), [['unit-tests', 'pass']]);
    assert.deepEqual(st.absent, [{ gate: 'GATE-replay', built_by: 'W2-T03' }]);
    assert.equal(st.claims_source, 'claims.json');
    assert.ok(!JSON.stringify(st).includes(fs.realpathSync(fx.root)));
    assert.ok(!('url' in st.source), 'no repository name or URL in a published document');
  } finally {
    fx.cleanup();
  }
});

test('a gate that stays red keeps its since date; a gate that turns red gets today; a green night clears red_since', () => {
  const fx = statusFixture(FAIL);
  try {
    const file = path.join(fx.root, 'status', 'nightly.json');
    const nights = path.join(fx.root, 'nights');
    fs.mkdirSync(nights);
    run(fx, 'nightly', ['--now', '2026-10-20T02:23:00Z']);
    fs.copyFileSync(file, path.join(nights, '1.json'));
    // Night 2: GATE-interp is still red and GATE-codes turns red too.
    run(fx, 'nightly', ['--now', '2026-10-21T02:23:00Z', '--previous', path.join(nights, '1.json')], { H_FAILS: '1' });
    fs.copyFileSync(file, path.join(nights, '2.json'));
    const two = readJson(path.join(nights, '2.json'));
    assert.deepEqual(two.failed.map((f) => [f.gate, f.since]), [['GATE-interp', '2026-10-20'], ['GATE-codes', '2026-10-21']]);
    assert.equal(two.red_since, '2026-10-20');
    // Night 3: the unrelated gate recovered; GATE-interp is still red since the 20th.
    run(fx, 'nightly', ['--now', '2026-10-22T02:23:00Z', '--previous', path.join(nights, '2.json')]);
    const three = readJson(file);
    assert.deepEqual(three.failed.map((f) => [f.gate, f.since]), [['GATE-interp', '2026-10-20']]);
    // Night 4: everything passes.
    fs.writeFileSync(path.join(fx.root, 'scripts', 'g.mjs'), PASS);
    const r = run(fx, 'nightly', ['--now', '2026-10-23T02:23:00Z', '--previous', file]);
    assert.equal(r.status, 0, r.out + r.err);
    const four = readJson(file);
    assert.equal(four.result, 'green');
    assert.equal(four.red_since, null);
    assert.deepEqual(four.failed, []);
  } finally {
    fx.cleanup();
  }
});

test('a previous status that is missing, unreadable or of another format is ignored, not trusted', () => {
  const fx = statusFixture(FAIL);
  try {
    const file = path.join(fx.root, 'status', 'nightly.json');
    const junk = path.join(fx.root, 'junk.json');
    fs.writeFileSync(junk, '{ not json');
    run(fx, 'nightly', ['--now', '2026-10-21T02:23:00Z', '--previous', junk]);
    assert.equal(readJson(file).failed[0].since, '2026-10-21');
    fs.writeFileSync(junk, JSON.stringify({ schema: 'something-else', result: 'red', red_since: '2020-01-01', failed: [{ gate: 'GATE-interp', since: '2020-01-01' }] }));
    run(fx, 'nightly', ['--now', '2026-10-21T02:23:00Z', '--previous', junk]);
    assert.equal(readJson(file).failed[0].since, '2026-10-21');
    run(fx, 'nightly', ['--now', '2026-10-21T02:23:00Z', '--previous', path.join(fx.root, 'missing.json')]);
    assert.equal(readJson(file).failed[0].since, '2026-10-21');
  } finally {
    fx.cleanup();
  }
});

test('--blocked runs nothing, writes a red status and keeps the earlier failures listed with their dates', () => {
  const fx = statusFixture(FAIL);
  try {
    const file = path.join(fx.root, 'status', 'nightly.json');
    const prev = path.join(fx.root, 'prev.json');
    run(fx, 'nightly', ['--now', '2026-10-20T02:23:00Z']);
    fs.copyFileSync(file, prev);
    const claims = path.join(fx.root, 'claims.json');
    fs.writeFileSync(claims, JSON.stringify({ 'GATE-interp': ['SEAM-13'] }));
    const r = run(fx, 'nightly', ['--blocked', `the gates job did not finish; ${fx.root}/x`, '--now', '2026-10-21T02:23:00Z', '--previous', prev, '--claims', claims]);
    assert.equal(r.status, 1);
    const st = readJson(file);
    assert.equal(st.result, 'red');
    assert.match(st.blocked, /^the gates job did not finish; <repo>\/x$/);
    assert.equal(st.red_since, '2026-10-20');
    assert.deepEqual(st.failed, [{ gate: 'GATE-interp', result: 'fail', since: '2026-10-20', claims: ['SEAM-13'] }]);
    assert.deepEqual(st.gates, []);
    // With no earlier status there is nothing to carry, but the night is still red.
    const first = run(fx, 'nightly', ['--blocked', 'no image', '--now', '2026-10-22T02:23:00Z']);
    assert.equal(first.status, 1);
    assert.deepEqual([readJson(file).result, readJson(file).failed, readJson(file).red_since], ['red', [], '2026-10-22']);
  } finally {
    fx.cleanup();
  }
});

test('the default status path is status/nightly.json under the root, and only the nightly lane writes one', () => {
  const fx = statusFixture(PASS);
  try {
    const r = run(fx, 'nightly', ['--now', '2026-10-20T02:23:00Z']);
    assert.equal(r.status, 0, r.out + r.err);
    const st = readJson(path.join(fx.root, 'status', 'nightly.json'));
    assert.equal(st.result, 'green');
    assert.deepEqual(st.failed, []);
    const other = run(fx, 'fast', ['--status', 'x.json']);
    assert.equal(other.status, 2);
    assert.match(other.err, /belong to the nightly lane/);
  } finally {
    fx.cleanup();
  }
});

// ---------------------------------------------------------------- pure functions
test('buildStatus: a failing check makes the night red without naming a gate; an over-budget night is red', () => {
  const base = { schema: 'x', date: '', commit: 'd'.repeat(40), source: { kind: 'local' }, runner: {}, started_at: '2026-10-20T02:00:00.000Z', duration_s: 1, over_budget: false };
  const step = (id, kind, result) => ({ id, kind, result, exit_code: result === 'pass' ? 0 : 1, duration_s: 0.1, verdict: 'v', built_by: 'W0-T04' });
  const now = new Date('2026-10-20T02:23:00Z');
  const a = buildStatus({ summary: { ...base, steps: [step('GATE-kc', 'gate', 'pass'), step('unit-tests', 'check', 'fail')] }, previous: null, claimsMap: {}, claimsSource: null, now, imageDigest: null, blocked: null });
  assert.equal(a.result, 'red');
  assert.deepEqual(a.failed, []);
  assert.equal(a.checks[0].result, 'fail');
  const b = buildStatus({ summary: { ...base, over_budget: true, steps: [step('GATE-kc', 'gate', 'pass')] }, previous: null, claimsMap: {}, claimsSource: null, now, imageDigest: null, blocked: null });
  assert.equal(b.result, 'red');
  const c = buildStatus({ summary: { ...base, steps: [step('GATE-kc', 'gate', 'pass')] }, previous: null, claimsMap: {}, claimsSource: null, now, imageDigest: null, blocked: null });
  assert.equal(c.result, 'green');
});

test('verdictOf skips npm\'s own lines; redactor replaces the repository, tmp and home paths', () => {
  assert.equal(verdictOf('> pkg@0 test\n> node --test\n\nGATE-x: PASS\nnpm notice a new version\n'), 'GATE-x: PASS');
  assert.equal(verdictOf('> tsc -p .\n'), 'no output');
  const tap = (n, p, f) => `TAP version 13\n# tests ${n}\n# suites 0\n# pass ${p}\n# fail ${f}\n# cancelled 0\n# skipped 0\n# todo 0\n# duration_ms 12.5\n`;
  assert.equal(verdictOf(tap(7, 7, 0)), '7 tests, 7 passed, 0 failed');
  assert.equal(verdictOf(`${tap(67, 67, 0)}${tap(12, 12, 0)}${tap(19, 18, 1)}npm error workspace x\n`), '98 tests, 97 passed, 1 failed', 'one block per workspace adds up');
  assert.equal(verdictOf('# tests 3\n# pass 2\n# fail 0\n# skipped 1\n'), '3 tests, 2 passed, 0 failed, 1 skipped');
  assert.equal(verdictOf(''), 'no output');
  const redact = redactor('/work/repo', { HOME: '/home/someone', RUNNER_TEMP: '/work/_temp', GITHUB_WORKSPACE: '/work/repo' });
  assert.equal(redact('at /work/repo/scripts/a.mjs:3 and /home/someone/.npm/_logs and /work/_temp/x and /home/somebody/y'), 'at <repo>/scripts/a.mjs:3 and <home>/.npm/_logs and <tmp>/x and <home>/y');
  assert.equal(redact('\u001b[31mred\u001b[0m'), 'red');
});

test('the manifest validator names each problem', () => {
  const good = { format: 'lane-manifest/1', lanes: LANES, steps: [gate('GATE-kc', 'scripts/verify-kc.mjs')] };
  assert.deepEqual(validateManifest(good), []);
  const bad = structuredClone(good);
  bad.steps.push(gate('GATE-kc', 'scripts/x.mjs'));
  assert.match(validateManifest(bad).join('\n'), /the id is used twice/);
  const noLane = structuredClone(good);
  noLane.steps[0].lanes = { weekly: {} };
  assert.match(validateManifest(noLane).join('\n'), /unknown lane weekly/);
  const both = structuredClone(good);
  both.steps[0].argv = ['npm', 'test'];
  assert.match(validateManifest(both).join('\n'), /exactly one of script/);
  const badTask = structuredClone(good);
  badTask.steps[0].built_by = 'T04';
  assert.match(validateManifest(badTask).join('\n'), /built_by is a task ID/);
  const checkNeedsFile = structuredClone(good);
  checkNeedsFile.steps.push({ id: 'unit-tests', kind: 'check', argv: ['npm', 'test'], built_by: 'W0-S12', lanes: { fast: {} } });
  assert.match(validateManifest(checkNeedsFile).join('\n'), /a command needs "needs"/);
  const gateName = structuredClone(good);
  gateName.steps.push({ id: 'kc', kind: 'gate', script: 'scripts/x.mjs', built_by: null, lanes: { fast: {} } });
  assert.match(validateManifest(gateName).join('\n'), /a gate's id starts with GATE-/);
});

test('resolveSteps keeps manifest order, resolves arguments for the lane and reports presence', () => {
  const fx = fixture({ 'scripts/a.mjs': PASS }, []);
  try {
    const manifest = { steps: [gate('GATE-a', 'scripts/a.mjs', { fast: { args: ['--x'] }, nightly: {} }), gate('GATE-b', 'scripts/b.mjs', { fast: {} }, { built_by: null }), gate('GATE-c', 'scripts/c.mjs', { nightly: {} })] };
    const steps = resolveSteps(manifest, 'fast', fx.root, {});
    assert.deepEqual(steps.map((s) => [s.id, s.present, s.argv.join(' ')]), [['GATE-a', true, 'node scripts/a.mjs --x'], ['GATE-b', false, 'node scripts/b.mjs']]);
    assert.equal(steps[1].builtBy, null);
  } finally {
    fx.cleanup();
  }
});
