// Tests for mutate.mjs: node --test scripts/spikes/W0-S06/mutate.test.mjs
//
// They run on an INVENTED solution, not on the pack's private files: its proof lines are placeholders (toy_tactic_*)
// and its definition body is one. What they check is the shape of each edit, that is, which lines a variant changes
// and that every other line stays. Whether a variant is rejected for its reason is a matter for Lean and the
// full probe; whether the real fixtures make the recorded variants is `mutate.mjs --solutions DIR --verify`.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Source, VARIANTS, makeVariants, manifestFor, verifyDir, FIXTURES, ROLE } from './mutate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

const TOY = [
  'structure Ledger where',
  '  a : Int',
  '  b : Int',
  '',
  'def total (s : Ledger) : Int := s.a + s.b',
  'def transfer (s : Ledger) (n : Int) : Ledger :=',
  '  toy_body',
  'def run (s : Ledger) : List Int → Ledger',
  '  | [] => s',
  '',
  'theorem transfer_conserves (s : Ledger) (n : Int) : total (transfer s n) = total s := by',
  '  toy_tactic_c1',
  '  toy_tactic_c2',
  '',
  'theorem transfer_rejected (s : Ledger) (n : Int) (h : ¬ (0 ≤ n ∧ n ≤ s.a)) :',
  '    transfer s n = s := by',
  '  toy_tactic_r',
  '',
  'theorem transfer_nonneg (s : Ledger) (n : Int) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) :',
  '    0 ≤ (transfer s n).a ∧ 0 ≤ (transfer s n).b := by',
  '  toy_tactic_n1',
  '  toy_tactic_n2',
  '',
  'theorem run_conserves (s : Ledger) (ns : List Int) : total (run s ns) = total s := by',
  '  toy_tactic_run',
  '',
  '-- a comment that starts in column 0 ends the theorem above it',
  '',
  'theorem xfer_frame (f : Bal) (src dst k : Acct) (n : Int) (hs : k ≠ src) (hd : k ≠ dst) :',
  '    xfer f src dst n k = f k := by',
  '  toy_tactic_f',
  'theorem xfer_pair (f : Bal) (src dst : Acct) (n : Int) (h : src ≠ dst) :',
  '    xfer f src dst n src + xfer f src dst n dst = f src + f dst := by',
  '  toy_tactic_p',
  'theorem xfer_self (f : Bal) (k : Acct) (n : Int) : xfer f k k n k = f k := by',
  '  toy_tactic_s1',
  '  toy_tactic_s2',
  '',
].join('\n');

const toLines = (text) => text.split('\n').slice(0, -1);

// The lines of `after` that are not in `before`, and the lines of `before` that are not in `after`, in order, found
// by walking both from the front and from the back: one contiguous edit is what each variant makes.
function edit(before, after) {
  const a = toLines(before);
  const b = toLines(after);
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head += 1;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a.at(-1 - tail) === b.at(-1 - tail)) tail += 1;
  return { removed: a.slice(head, a.length - tail), added: b.slice(head, b.length - tail) };
}

const made = makeVariants(TOY);

test('the variants are the eight the probe and expectations.mjs name', () => {
  assert.deepEqual(Object.keys(VARIANTS).sort(), ['axiom', 'builderror', 'kernelskip', 'missing', 'native', 'redef', 'sorry', 'weak']);
  assert.deepEqual(Object.keys(made).sort(), Object.keys(VARIANTS).sort());
});

test('sorry and builderror replace the proof of transfer_conserves and nothing else', () => {
  assert.deepEqual(edit(TOY, made.sorry), { removed: ['  toy_tactic_c1', '  toy_tactic_c2'], added: ['  sorry'] });
  assert.deepEqual(edit(TOY, made.builderror), { removed: ['  toy_tactic_c1', '  toy_tactic_c2'], added: ['  exact no_such_lemma s n'] });
});

test('axiom puts a custom axiom before the theorem and proves the theorem from it', () => {
  const e = edit(TOY, made.axiom);
  assert.deepEqual(e.removed, [
    'theorem transfer_conserves (s : Ledger) (n : Int) : total (transfer s n) = total s := by',
    '  toy_tactic_c1',
    '  toy_tactic_c2',
  ]);
  assert.deepEqual(e.added, [
    'axiom cheat : ∀ (s : Ledger) (n : Int), total (transfer s n) = total s',
    '',
    'theorem transfer_conserves (s : Ledger) (n : Int) : total (transfer s n) = total s := cheat s n',
  ]);
});

test('weak adds one hypothesis to the statement line of transfer_nonneg', () => {
  assert.deepEqual(edit(TOY, made.weak), {
    removed: ['theorem transfer_nonneg (s : Ledger) (n : Int) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) :'],
    added: ['theorem transfer_nonneg (s : Ledger) (n : Int) (ha : 0 ≤ s.a) (hb : 0 ≤ s.b) (h : n = 0) :'],
  });
});

test('missing removes the last theorem, whose block runs to the end of the file', () => {
  assert.deepEqual(edit(TOY, made.missing), {
    removed: ['theorem xfer_self (f : Bal) (k : Acct) (n : Int) : xfer f k k n k = f k := by', '  toy_tactic_s1', '  toy_tactic_s2'],
    added: [],
  });
  assert.ok(made.missing.endsWith('  toy_tactic_p\n'));
});

test('native adds a helper before transfer_rejected and uses it in that proof', () => {
  const s = made.native.split('\n');
  const at = s.indexOf('theorem aux_native : (2 : Nat) + 2 = 4 := by native_decide');
  assert.ok(at > 0);
  assert.equal(s[at + 1], '');
  assert.ok(s[at + 2].startsWith('theorem transfer_rejected '));
  const i = s.indexOf('    transfer s n = s := by');
  assert.deepEqual(s.slice(i + 1, i + 3), ['  have _ := aux_native', '  toy_tactic_r']);
  // nothing else changed: removing the three added lines gives the original back
  assert.equal(made.native.split('\n').length, TOY.split('\n').length + 3);
});

test('redef replaces the body of transfer and the proofs of the three theorems about it', () => {
  const s = new Source(made.redef);
  assert.deepEqual(s.lines.slice(5, 8), ['def transfer (s : Ledger) (n : Int) : Ledger :=', '  s', 'def run (s : Ledger) : List Int → Ledger']);
  const body = (name) => {
    const { end } = s.find('theorem', name);
    return s.lines.slice(s.opener('theorem', name, ':= by') + 1, end);
  };
  assert.deepEqual(body('transfer_conserves'), ['  simp [transfer, total]']);
  assert.deepEqual(body('transfer_rejected'), ['  simp [transfer]']);
  assert.deepEqual(body('transfer_nonneg'), ['  simp [transfer]', '  exact ⟨ha, hb⟩']);
  // the other proofs are the original's
  assert.deepEqual(body('run_conserves'), ['  toy_tactic_run']);
  assert.deepEqual(body('xfer_self'), ['  toy_tactic_s1', '  toy_tactic_s2']);
});

test('kernelskip imports Lean, and replaces transfer_conserves with an unchecked declaration', () => {
  const l = toLines(made.kernelskip);
  assert.deepEqual(l.slice(0, 4), ['import Lean', 'open Lean Elab Command Term Meta', '', 'structure Ledger where']);
  assert.ok(l.includes('set_option debug.skipKernelTC true in'));
  assert.ok(l.some((x) => x.startsWith('unchecked_theorem transfer_conserves : ')));
  assert.ok(!l.some((x) => x.startsWith('theorem transfer_conserves')));
  // the other theorems are untouched
  assert.ok(l.includes('  toy_tactic_run'));
  assert.ok(l.includes('  toy_tactic_s2'));
});

test('a variant reads only the lines of the theorem it names: a comment in column 0 ends a block', () => {
  const s = new Source(TOY);
  const { start, end } = s.find('theorem', 'run_conserves');
  assert.deepEqual(s.lines.slice(start + 1, end), ['  toy_tactic_run']);
});

test('a solution without the expected shape fails with a message that names the variant and the shape', () => {
  assert.throws(() => makeVariants(TOY.replace('theorem xfer_self', 'theorem xfer_other'), ['missing']), /variant missing: no `theorem xfer_self`.*:= by/s);
  // a proof written on the statement line has no line that ends with the opener
  assert.throws(() => makeVariants(TOY.replace('total s := by', 'total s := by toy_inline'), ['sorry']), /variant sorry: `theorem transfer_conserves` has no line that ends with `:= by`/);
});

test('an unknown variant name is refused', () => {
  assert.throws(() => makeVariants(TOY, ['nonesuch']), /unknown variant nonesuch/);
});

// ---------- the command line and the manifest
function toyDir() {
  const dir = mkdtempSync(join(tmpdir(), 'w0s06-toy-'));
  mkdirSync(join(dir, 'broken'));
  mkdirSync(join(dir, 'fixed'));
  writeFileSync(join(dir, 'Solution.lean'), TOY);
  writeFileSync(join(dir, 'broken/Broken.lean'), 'import Solution\n-- toy\n');
  writeFileSync(join(dir, 'fixed/Fixed.lean'), 'import Solution\n-- toy\n');
  return dir;
}

test('a manifest of a directory verifies that directory, and fails when a file changes', () => {
  const dir = toyDir();
  try {
    const manifest = manifestFor(dir);
    assert.deepEqual(manifest.fixtures.map((f) => f.name), FIXTURES);
    assert.equal(manifest.variants.length, 8);
    assert.ok([...manifest.fixtures, ...manifest.variants].every((f) => f.role === ROLE && /^[0-9a-f]{64}$/.test(f.sha256) && f.bytes > 0));
    assert.deepEqual(verifyDir(dir, manifest).problems, []);
    writeFileSync(join(dir, 'broken/Broken.lean'), 'import Solution\n-- changed\n');
    const changed = verifyDir(dir, manifest).problems;
    assert.equal(changed.length, 1);
    assert.match(changed[0], /^broken\/Broken\.lean: SHA-256/);
    writeFileSync(join(dir, 'Solution.lean'), TOY.replace('toy_tactic_c1', 'toy_tactic_changed'));
    assert.ok(verifyDir(dir, manifest).problems.some((p) => p.startsWith('variants/Solution.sorry.lean') || p.startsWith('Solution.lean')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the command line writes the variants outside the repository, and refuses to write inside it', () => {
  const dir = toyDir();
  const out = mkdtempSync(join(tmpdir(), 'w0s06-out-'));
  try {
    const ok = spawnSync(process.execPath, [join(HERE, 'mutate.mjs'), '--solutions', dir, '--out', out], { encoding: 'utf8' });
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(readFileSync(join(out, 'Solution.sorry.lean'), 'utf8'), made.sorry);
    const inside = spawnSync(process.execPath, [join(HERE, 'mutate.mjs'), '--solutions', dir, '--out', join(HERE, 'tmp-variants')], { encoding: 'utf8' });
    assert.equal(inside.status, 64);
    assert.match(inside.stderr, /refusing to write private fixtures inside the repository/);
    const none = spawnSync(process.execPath, [join(HERE, 'mutate.mjs'), '--out', out], { encoding: 'utf8', env: { ...process.env, W0S06_SOLUTIONS: '' } });
    assert.equal(none.status, 64);
    assert.match(none.stderr, /--solutions DIR or W0S06_SOLUTIONS/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});
