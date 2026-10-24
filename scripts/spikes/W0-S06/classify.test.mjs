// classify.test.mjs: tests of the rule that tells a sandbox failure from a rejection.
//
//   node --test scripts/spikes/W0-S06/classify.test.mjs
//
// Part 1 uses outputs copied from the executed runs already on file in research/ (each fixture is checked to
// appear verbatim in its source file), and synthetic outputs that put the rule's edges under pressure.
// Part 2, when runs/RUN-bwrap-lanes/ exists, classifies every recorded Lake run and compares it with
// expectations.mjs (through assemble-run.mjs --check).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, classifyCanary } from './classify.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const EVID = join(ROOT, 'research', 'evidence');

// A fixture: text copied from an executed log. `source` is the log, `needle` a verbatim fragment of it.
function verbatim(source, needle) {
  const text = readFileSync(join(EVID, source), 'utf8');
  assert.ok(text.includes(needle), `${source} no longer contains: ${needle.slice(0, 60)}`);
}

const BWRAP_NS =
  'bwrap: No permissions to create new namespace, likely because the kernel does not allow non-privileged user namespaces. See <https://deb.li/bubblewrap> or <file:///usr/share/doc/bubblewrap/README.Debian.gz>.';

test('default Docker: exit 1 with a bwrap diagnostic is a sandbox failure, not a rejection [A5r3/comp-run2.log]', () => {
  verbatim('A5r3/comp-run2.log', BWRAP_NS);
  const out = `${BWRAP_NS}\nerror: Child exited with 1\nResolving dependencies\n`;
  const c = classify({ argv: ['lake', 'comparator'], exitCode: 1, output: out });
  assert.equal(c.sandbox, 'failed');
  assert.equal(c.verdict, 'no-verdict');
  assert.equal(c.detail, BWRAP_NS);
});

test('the other bubblewrap start failures on file are sandbox failures too [A5r3/comp-run3.log, comp-run4.log]', () => {
  for (const [src, line] of [
    ['A5r3/comp-run3.log', "bwrap: Can't mkdir /run/user: Read-only file system"],
    ['A5r3/comp-run4.log', "bwrap: Can't mount proc on /newroot/proc: Operation not permitted"],
  ]) {
    verbatim(src, line);
    const c = classify({ argv: ['lake', 'comparator'], exitCode: 1, output: `${line}\nerror: Child exited with 1\n` });
    assert.equal(c.sandbox, 'failed', line);
    assert.equal(c.verdict, 'no-verdict', line);
  }
});

test('honest, weakened and redefined solutions with the sandbox off [A5r3/comp-run2.log]', () => {
  verbatim('A5r3/comp-run2.log', 'rc=0 :: Your solution is okay!');
  const off = ['lake', 'comparator', '--inadvisably-no-sandbox'];
  const warn = 'WARNING: Sandbox disabled, this run is not trustworthy.';
  const good = classify({ argv: off, exitCode: 0, output: `${warn}\nLean default kernel accepts the solution\nYour solution is okay!\n` });
  assert.deepEqual([good.sandbox, good.verdict], ['off', 'accepted']);
  verbatim('A5r3/comp-run2.log', "error: Challenge and solution theorem statement do not match: 'transfer_conserves'");
  const weak = classify({ argv: off, exitCode: 1, output: `${warn}\nerror: Challenge and solution theorem statement do not match: 'transfer_conserves'\n` });
  assert.deepEqual([weak.sandbox, weak.verdict, weak.reason], ['off', 'rejected', 'statement-mismatch']);
  verbatim('A5r3/comp-run2.log', "error: Const does not match between challenge and target 'transfer'");
  const redef = classify({ argv: off, exitCode: 1, output: `${warn}\nerror: Const does not match between challenge and target 'transfer'\n` });
  assert.deepEqual([redef.sandbox, redef.verdict, redef.reason], ['off', 'rejected', 'const-mismatch']);
});

test('--paranoid with the sandbox on: six checkers accept [A5r3/comp-run5.log]', () => {
  const out = [
    'Running Lean paranoid kernel on solution', 'Lean paranoid kernel accepts the solution',
    'Running lean4lean kernel on solution', 'lean4lean kernel accepts the solution',
    'Running nanoda kernel on solution', 'nanoda kernel accepts the solution',
    'Running con-leche kernel on solution', 'con-leche: accepted 1274 declarations (--verified)', 'con-leche kernel accepts the solution',
    'Running con-ron kernel on solution', 'con-ron: accepted 1274 declarations (--verified)', 'con-ron kernel accepts the solution',
    'Running Lean default kernel on solution', 'Lean default kernel accepts the solution', '',
  ].join('\n');
  for (const l of ['Lean paranoid kernel accepts the solution', 'con-ron kernel accepts the solution']) verbatim('A5r3/comp-run5.log', l);
  const c = classify({ argv: ['lake', 'comparator', '--paranoid'], exitCode: 0, output: out });
  assert.deepEqual([c.sandbox, c.verdict], ['on', 'accepted']);
  assert.equal(c.checkers.length, 6);
  assert.ok(c.checkers.every((k) => k.verdict === 'accepts'));
});

test('a toolchain that cannot run inside the sandbox leaves exit 1 with no verdict and no sandbox claim [lean-measure/measure.log]', () => {
  const out = 'Resolving dependencies\n[nix-ld] FATAL: panicked at src/main.rs:187:55:\ncalled `Result::unwrap()` on an `Err` value: Posix(2)\nerror: Child exited with 134\nBuilding and exporting\n';
  verbatim('lean-measure/measure.log', '[nix-ld] FATAL: panicked at src/main.rs:187:55:');
  verbatim('lean-measure/measure.log', 'error: Child exited with 134');
  const c = classify({ argv: ['lake', 'check'], exitCode: 1, output: out });
  assert.equal(c.verdict, 'no-verdict');
  assert.equal(c.sandbox, 'unknown');
  assert.match(c.reason, /^unexplained-exit-1$/);
  // the Lake-shaped canary settles it: bwrap started, the program died inside
  const k = classifyCanary({ exitCode: 134, output: '[nix-ld] FATAL: panicked at src/main.rs:187:55:\n' });
  assert.equal(k.sandbox, 'failed');
  assert.equal(k.reason, 'program-failed-inside-sandbox');
});

test('"error: Child exited with N" alone is not sandbox evidence: a project that fails to build prints it too', () => {
  const out = [
    'Resolving dependencies', '✖ [2/3] Building Solution (178ms)',
    'error: Solution.lean:14:8: Unknown identifier `no_such_lemma`',
    'Some required targets logged failures:', '- Solution', 'error: build failed', 'error: Child exited with 1', '',
  ].join('\n');
  const c = classify({ argv: ['lake', 'comparator'], exitCode: 1, output: out });
  assert.deepEqual([c.sandbox, c.verdict, c.reason], ['on', 'rejected', 'build-failed']);
});

test('a missing theorem crashes the exporter with exit code 134 and is a rejection, not a sandbox failure', () => {
  const out = 'Building Solution\nPANIC at LeanExport.dumpConstant LeanExport.Basic:254:48: Constant xfer_self not found in environment.\nbacktrace:\nerror: Child exited with 134\n';
  const c = classify({ argv: ['lake', 'comparator'], exitCode: 1, output: out });
  assert.deepEqual([c.sandbox, c.verdict, c.reason], ['on', 'rejected', 'theorem-missing']);
});

test('lake check: a forbidden axiom is a rejection even though the default kernel accepts [lean-measure/proj/check-bad.out]', () => {
  // the whole recorded output of `lake check --inadvisably-no-sandbox` on a project with sorry, native_decide and a custom axiom
  const out = readFileSync(join(EVID, 'lean-measure', 'proj', 'check-bad.out'), 'utf8');
  assert.ok(out.includes('Lean default kernel accepts the solution'));
  const c = classify({ argv: ['lake', 'check', '--inadvisably-no-sandbox'], exitCode: 1, output: out });
  assert.deepEqual([c.sandbox, c.verdict, c.reason], ['off', 'rejected', 'axiom-not-permitted']);
  // the same lines with the sandbox on
  const on = out.replace(/^WARNING: Sandbox disabled.*\n/, '');
  const d = classify({ argv: ['lake', 'check'], exitCode: 1, output: on });
  assert.deepEqual([d.sandbox, d.verdict, d.reason], ['on', 'rejected', 'axiom-not-permitted']);
});

test('a bwrap diagnostic outranks a kernel-rejection line: a failed sandbox judged nothing', () => {
  const out = `Running Lean default kernel on solution\n${BWRAP_NS}\nerror: Lean default exited with 1\nLean default kernel rejected the solution\n`;
  const c = classify({ argv: ['lake', 'comparator'], exitCode: 1, output: out });
  assert.deepEqual([c.sandbox, c.verdict], ['failed', 'no-verdict']);
});

test('exit 2 without bubblewrap is a sandbox failure; exit 2 for a missing manifest is not', () => {
  const noBwrap = 'error: `lake comparator` needs `bwrap` to sandbox the code it checks, and it was not found.\n\n  Install `bubblewrap` from your distribution and put `bwrap` on PATH.\n';
  const a = classify({ argv: ['lake', 'comparator'], exitCode: 2, output: noBwrap });
  assert.deepEqual([a.sandbox, a.verdict, a.reason], ['failed', 'no-verdict', 'bwrap-not-found']);
  const noManifest = "error: '/work/lab2' has no `lake-manifest.json`, and `lake comparator` resolves dependencies inside a sandbox that cannot write to the project directory. Run `lake build` there first.\n";
  const b = classify({ argv: ['lake', 'comparator'], exitCode: 2, output: noManifest });
  assert.deepEqual([b.sandbox, b.verdict, b.reason], ['unknown', 'no-verdict', 'no-manifest']);
});

test('a platform without Linux namespaces is a sandbox failure (text from Lake\'s source at v4.35.0, src/lake/Lake/CLI/Check.lean; not run, there is no macOS here)', () => {
  const line = 'error: `lake check` sandboxes the code it checks with `bwrap`, which needs Linux namespaces.';
  const c = classify({ argv: ['lake', 'check'], exitCode: 2, output: `${line}\n` });
  assert.deepEqual([c.sandbox, c.verdict, c.reason, c.detail], ['failed', 'no-verdict', 'not-linux', line]);
});

test('a bubblewrap warning on a run that accepts is not a failure (bubblewrap 0.9.0 warns "Only the last ... option will take effect", utils.c warn(), read 2026-10-24; not run)', () => {
  const out = 'bwrap: Only the last --info-fd option will take effect\nResolving dependencies\nRunning Lean default kernel on solution\nLean default kernel accepts the solution\nYour solution is okay!\n';
  const c = classify({ argv: ['lake', 'comparator'], exitCode: 0, output: out });
  assert.deepEqual([c.sandbox, c.verdict], ['on', 'accepted']);
  assert.equal(c.warnings.length, 1);
  // the same line on a run that exits 1 is a failure
  const d = classify({ argv: ['lake', 'comparator'], exitCode: 1, output: 'bwrap: Only the last --info-fd option will take effect\nerror: Child exited with 1\n' });
  assert.equal(d.sandbox, 'failed');
});

test('a checker the kernel killed is no verdict although Lake prints "kernel rejected the solution" (the out-of-memory killer sends SIGKILL, exit 137)', () => {
  const out = 'Running lean4lean kernel on solution\nlean4lean kernel rejected the solution\nRunning nanoda kernel on solution\nnanoda kernel accepts the solution\nerror: lean4lean exited with 137\n';
  const c = classify({ argv: ['lake', 'check', '--paranoid'], exitCode: 1, output: out });
  assert.deepEqual([c.verdict, c.reason, c.sandbox], ['no-verdict', 'checker-killed-137', 'unknown']);
  // a checker that rejects by panicking is still a rejection
  const d = classify({ argv: ['lake', 'comparator', '--paranoid'], exitCode: 1, output: 'lean4lean kernel rejected the solution\nerror: lean4lean exited with 134\n' });
  assert.deepEqual([d.verdict, d.reason], ['rejected', 'kernel-rejected']);
});

test('an exit code never decides alone', () => {
  // exit 0 and no accept line
  const a = classify({ argv: ['lake', 'check'], exitCode: 0, output: 'Resolving dependencies\n' });
  assert.equal(a.verdict, 'no-verdict');
  // exit 1 and nothing else
  const b = classify({ argv: ['lake', 'check'], exitCode: 1, output: '' });
  assert.equal(b.verdict, 'no-verdict');
  // exit 0 beside a rejection line
  const c = classify({ argv: ['lake', 'comparator'], exitCode: 0, output: "error: Illegal axiom detected: 'cheat'\n" });
  assert.deepEqual([c.verdict, c.reason], ['no-verdict', 'contradictory']);
  // exit 0 beside an error line and an accept line
  const d = classify({ argv: ['lake', 'comparator'], exitCode: 0, output: 'error: something\nYour solution is okay!\n' });
  assert.deepEqual([d.verdict, d.reason], ['no-verdict', 'contradictory']);
  // an accept line printed by the project, with a non-zero exit and an error, is not an acceptance
  const e = classify({ argv: ['lake', 'comparator'], exitCode: 1, output: "Your solution is okay!\nerror: Illegal axiom detected: 'sorryAx'\n" });
  assert.deepEqual([e.verdict, e.reason], ['rejected', 'illegal-axiom']);
});

test('Lake\'s other judgments on a solution are not in the closed list and read as no verdict (text from src/lake/Lake/Check/Compare.lean and Axioms.lean at v4.35.0; not run)', () => {
  // each is a judgment of the solution in Lake's source, but no recorded run printed it, so the exact line (the "error: "
  // prefix included) is unverified; the rule keeps its closed list and the sandbox state stays unknown
  for (const message of [
    "Const not found in solution: 'xfer_self'",
    "Challenge and solution constant kind don't match: 'xfer_self'",
    "Solution constant is not a theorem: 'xfer_self'",
    "Solution constant is not a definition: 'transfer'",
  ]) {
    const c = classify({ argv: ['lake', 'comparator'], exitCode: 1, output: `error: ${message}\n` });
    assert.deepEqual([c.sandbox, c.verdict], ['unknown', 'no-verdict'], message);
    assert.equal(c.reason, 'unexplained-exit-1', message);
  }
});

test('the sandbox-off flag and Lake\'s warning must agree', () => {
  const c = classify({ argv: ['lake', 'check', '--inadvisably-no-sandbox'], exitCode: 0, output: 'Lean default kernel accepts the solution\n' });
  assert.ok(c.warnings.length > 0);
  const d = classify({ argv: ['lake', 'check'], exitCode: 0, output: 'WARNING: Sandbox disabled, this run is not trustworthy.\nLean default kernel accepts the solution\n' });
  assert.ok(d.warnings.length > 0);
});

const recorded = join(ROOT, 'runs', 'RUN-bwrap-lanes');

// the recorded step named `name` of a configuration, as { argv, exitCode, output } (undefined when absent)
function recordedStep(config, name) {
  const dir = join(recorded, config, 'steps');
  if (!existsSync(dir)) return undefined;
  const base = readdirSync(dir).find((f) => f.endsWith(`-${name}.meta`));
  if (!base) return undefined;
  const meta = Object.fromEntries(readFileSync(join(dir, base), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
  const outFile = join(dir, base.replace(/\.meta$/, '.out'));
  return { argv: meta.argv.split(' '), exitCode: Number(meta.rc), output: existsSync(outFile) ? readFileSync(outFile, 'utf8') : '' };
}

const kernelskip = recordedStep('local-narrow', 'discover-kernelskip-paranoid');
test('a real kernel rejection under --paranoid is a rejection although the six checkers exit 1, 134 or 101 [recorded]', { skip: !kernelskip }, () => {
  const c = classify(kernelskip);
  assert.deepEqual([c.sandbox, c.verdict, c.reason], ['on', 'rejected', 'kernel-rejected']);
  assert.equal(c.checkers.length, 6);
  assert.ok(c.checkers.every((k) => k.verdict === 'rejects'));
});

const injected = recordedStep('local-narrow', 'inject-comparator-call6');
test('a bubblewrap failure at the first checker prints a kernel rejection and is still a sandbox failure [recorded, injected]', { skip: !injected }, () => {
  assert.match(injected.output, /kernel rejected the solution/);
  const c = classify(injected);
  assert.deepEqual([c.sandbox, c.verdict, c.reason], ['failed', 'no-verdict', 'bwrap-diagnostic']);
  // without its bwrap line the same output would be read as a rejection: that is the trap
  const without = injected.output.split('\n').filter((l) => !l.startsWith('bwrap: ')).join('\n');
  assert.equal(classify({ ...injected, output: without }).verdict, 'rejected');
});
const killed = recordedStep('local-narrow-std', 'check-paranoid');
test('a checker killed at the container\'s memory cap prints a kernel rejection and is no verdict [recorded: import Std in 6 GiB]', { skip: !killed }, () => {
  assert.equal(killed.exitCode, 1);
  assert.match(killed.output, /^nanoda kernel rejected the solution$/m);
  assert.match(killed.output, /^error: nanoda exited with 137$/m);
  assert.match(killed.output, /^con-ron kernel accepts the solution$/m);
  const c = classify(killed);
  assert.deepEqual([c.sandbox, c.verdict, c.reason], ['unknown', 'no-verdict', 'checker-killed-137']);
  // a checker that really rejects by crashing exits 101 (nanoda's Rust panic): the same lines with that code are a rejection
  const crashed = killed.output.replace('error: nanoda exited with 137', 'error: nanoda exited with 101');
  assert.deepEqual([classify({ ...killed, output: crashed }).verdict, classify({ ...killed, output: crashed }).reason], ['rejected', 'kernel-rejected']);
});

test('every recorded Lake run is classified as its construction predicts', { skip: !existsSync(recorded) }, () => {
  const r = spawnSync(process.execPath, [join(HERE, 'assemble-run.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
