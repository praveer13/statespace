// Tests of the runner emulator: its expression subset, its env files and, when asked for, a real container.
// Run: node --test scripts/spikes/W0-T04/emulate-runner.test.mjs
// The container test needs Docker and the image ubuntu:24.04 on the host, and installs packages from the network, so it runs
// only with STATESPACE_EMULATOR_TESTS=1.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { EmulationError, emulate, evaluate, interpolate, loadWorkflow, parseEnvFile, pickJob, shouldRun } from './emulate-runner.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FAST = path.resolve(HERE, '..', '..', '..', '.github', 'workflows', 'fast.yml');

const ctx = (extra = {}) => ({ github: { sha: 'abc', ref: 'refs/heads/master', event_name: 'push', event: {} }, secrets: {}, vars: {}, env: { A: '1' }, runner: { os: 'Linux' }, status: 'success', ...extra });

test('expressions: contexts, literals, ||, &&, ==, != and !', () => {
  assert.equal(evaluate('github.sha', ctx()), 'abc');
  assert.equal(evaluate("github.event_name == 'PUSH'", ctx()), true, 'string comparison ignores case');
  assert.equal(evaluate("github.event_name != 'pull_request'", ctx()), true);
  assert.equal(evaluate("github.event.pull_request.number || github.ref", ctx()), 'refs/heads/master');
  assert.equal(evaluate("secrets.STATESPACE_PRIVACY_TERMS || 'none'", ctx()), 'none');
  assert.equal(evaluate("github.event_name == 'push' && env.A", ctx()), '1');
  assert.equal(evaluate("!(github.event_name == 'push')", ctx()), false);
  assert.equal(evaluate("'it''s'", ctx()), "it's");
  assert.equal(evaluate('always()', ctx({ status: 'failure' })), true);
  assert.equal(evaluate('success()', ctx({ status: 'failure' })), false);
  assert.equal(evaluate('failure()', ctx({ status: 'failure' })), true);
});

test('expressions the emulator does not know stop the run instead of being guessed', () => {
  assert.throws(() => evaluate("contains(github.ref, 'master')", ctx()), EmulationError);
  assert.throws(() => evaluate('bogus.thing', ctx()), /does not know the context bogus/);
  assert.throws(() => evaluate('github.sha ==', ctx()), /ends too early/);
  assert.throws(() => evaluate('github.sha @', ctx()), /cannot read the expression/);
});

test('interpolate replaces every ${{ }} and prints a missing value as empty text', () => {
  assert.equal(interpolate('fast-${{ github.event.pull_request.number || github.ref }}', ctx()), 'fast-refs/heads/master');
  assert.equal(interpolate('x=${{ secrets.NOPE }};y=${{ vars.NOPE }}', ctx()), 'x=;y=');
  assert.equal(interpolate("${{ github.event_name == 'push' }}", ctx()), 'true');
  assert.equal(interpolate('no expression', ctx()), 'no expression');
});

test('a step runs after success by default, always() runs after a failure, and a bare condition still needs success', () => {
  assert.equal(shouldRun({}, ctx()), true);
  assert.equal(shouldRun({}, ctx({ status: 'failure' })), false);
  assert.equal(shouldRun({ if: '${{ always() }}' }, ctx({ status: 'failure' })), true);
  assert.equal(shouldRun({ if: 'failure()' }, ctx({ status: 'failure' })), true);
  assert.equal(shouldRun({ if: "github.event_name == 'push'" }, ctx()), true);
  assert.equal(shouldRun({ if: "github.event_name == 'push'" }, ctx({ status: 'failure' })), false);
  assert.equal(shouldRun({ if: "github.event_name == 'pull_request'" }, ctx()), false);
});

test('GITHUB_ENV files: KEY=value lines and KEY<<DELIMITER blocks', () => {
  assert.deepEqual(parseEnvFile('A=1\nB=two words\nEMPTY=\n'), { A: '1', B: 'two words', EMPTY: '' });
  assert.deepEqual(parseEnvFile('NOTE<<EOF\nline one\nline two\nEOF\nC=3\n'), { NOTE: 'line one\nline two', C: '3' });
  assert.deepEqual(parseEnvFile('URL=https://x/?a=b\n'), { URL: 'https://x/?a=b' });
});

test('the committed fast workflow reads as the emulator expects', () => {
  const wf = loadWorkflow(FAST);
  assert.ok('on' in wf, 'the key `on` stays a string, not YAML 1.1 true');
  const { id, job } = pickJob(wf);
  assert.equal(id, 'lane');
  assert.equal(job['runs-on'], 'ubuntu-24.04');
  assert.equal(job.defaults.run.shell, 'bash');
  assert.match(job.steps[0].run, /STATESPACE_LANE_START/);
  assert.deepEqual(job.steps.map((s) => (s.uses ?? '').replace(/@.*/, '')), ['', 'actions/checkout', 'actions/setup-node', 'astral-sh/setup-uv', '', '']);
  assert.throws(() => pickJob({ jobs: { a: {}, b: {} } }), /name the job with --job/);
});

const docker = () => {
  try {
    return (
      process.env.STATESPACE_EMULATOR_TESTS === '1' &&
      fs.existsSync('/var/run/docker.sock')
    );
  } catch {
    return false;
  }
};

test('in a container: env files carry between steps, a failure skips the rest except always(), and the clock covers every step', { skip: docker() ? false : 'set STATESPACE_EMULATOR_TESTS=1 with Docker and ubuntu:24.04 present' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'emulate-test-'));
  try {
    const wf = path.join(dir, 'w.yml');
    fs.writeFileSync(
      wf,
      `name: t
on: push
env:
  FROM_WORKFLOW: wf
jobs:
  j:
    runs-on: ubuntu-24.04
    defaults:
      run:
        shell: bash
    env:
      FROM_JOB: \${{ secrets.NOPE || 'job' }}
    steps:
      - name: one
        run: |
          echo "PASSED=yes" >> "$GITHUB_ENV"
          echo "$FROM_WORKFLOW $FROM_JOB $CI $RUNNER_OS"
      - name: two
        run: |
          test "$PASSED" = yes
          false | true
          echo "pipefail did not apply"
      - name: three
        run: echo "must not run"
      - name: four
        if: always()
        run: echo "runs after a failure"
`,
    );
    const out = path.join(dir, 'out');
    const e = await emulate({ workflowFile: wf, jobId: 'j', outDir: out, cpus: 2, log: () => {} });
    assert.equal(e.result, 'fail');
    assert.deepEqual(e.steps.map((s) => [s.name, s.result]), [['one', 'pass'], ['two', 'fail'], ['three', 'skipped'], ['four', 'pass']]);
    assert.equal(e.steps[1].exit_code, 1, 'bash -eo pipefail: the failed pipeline ends the step');
    const log = fs.readFileSync(path.join(out, 'job.log'), 'utf8');
    assert.match(log, /wf job true Linux/);
    assert.match(log, /runs after a failure/);
    assert.ok(!log.includes('must not run'));
    assert.ok(!log.includes('pipefail did not apply'));
    assert.ok(e.duration_s >= e.steps.reduce((t, s) => t + s.duration_s, 0) - 0.01);
    assert.equal(e.container.cpus, 2);
    assert.ok(e.peak_memory_bytes > 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
