// The planted-fault tests of GATE-numbers and GATE-runs (W0-S11; spine section 13, the W0 exit: "GATE-numbers
// fails on a planted untagged number and GATE-runs on an unresolved run reference").
//
// Each test copies the tree the gate reads into a scratch directory, plants one fault (or one harmless
// change, for a control), runs the gate there with --root, and checks that it failed on that fault, or
// passed. The scratch directory is removed afterwards. Dependency-free.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scratch = () => fs.mkdtempSync(path.join(process.env.W0S11_SCRATCH ?? os.tmpdir(), 'gate-self-check-'));

function copyInto(repo, root, entries) {
  for (const e of entries) {
    const from = path.join(repo, e);
    if (!fs.existsSync(from)) continue;
    fs.cpSync(from, path.join(root, e), { recursive: true, filter: (src) => !/[/\\](?:node_modules|\.git)(?:[/\\]|$)/.test(src) });
  }
}

/** Run a gate script on root; returns {status, report}. */
function runGate(script, root, extra = []) {
  const r = spawnSync(process.execPath, [script, '--root', root, '--json', ...extra], { encoding: 'utf8', maxBuffer: 1 << 28 });
  let report = null;
  try {
    report = JSON.parse(r.stdout);
  } catch {
    report = { parseError: (r.stdout || r.stderr).slice(0, 400) };
  }
  return { status: r.status, report };
}

/** Change a file for one test and put it back afterwards. */
function withFile(root, rel, change, fn) {
  const file = path.join(root, rel);
  const existed = fs.existsSync(file);
  const before = existed ? fs.readFileSync(file) : null;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, change(before ? before.toString('utf8') : ''));
  try {
    return fn();
  } finally {
    if (existed) fs.writeFileSync(file, before);
    else fs.rmSync(file);
  }
}

// ------------------------------------------------------------------ GATE-numbers
export async function selfCheckNumbers({ repo, script }) {
  const root = scratch();
  const results = [];
  const check = (name, fn) => {
    try {
      const { ok, detail } = fn();
      results.push({ name, ok, detail });
    } catch (e) {
      results.push({ name, ok: false, detail: `threw ${e instanceof Error ? e.message : e}` });
    }
  };
  // Differential: a planted fault must add a finding that the untouched copy does not have, and a harmless
  // change must add none. The untouched copy's own findings belong to the tree, not to the test.
  const keyOf = (f) => `${f.file}|${f.kind}|${f.key ?? f.id}|${f.unit ?? ''}`;
  let before = new Set();
  const added = (r) => (r.report.findings ?? []).filter((f) => !before.has(keyOf(f)));
  const failsOn = (r, pred, what) => {
    const hit = added(r).find(pred);
    return { ok: r.status === 1 && Boolean(hit), detail: hit ? `fails as it should, on ${hit.file}:${hit.line} ${hit.kind === 'deny' ? `deny-list ${hit.id}` : `untagged ${hit.tokenKind} ${JSON.stringify(hit.token)}`}` : `exit ${r.status}; no new finding for ${what}` };
  };
  const passes = (r, what) => {
    const extra = added(r);
    return { ok: extra.length === 0, detail: extra.length === 0 ? `adds no finding, as it should: ${what}` : `adds ${extra.length}: ${extra.slice(0, 2).map((f) => `${f.file}:${f.line} ${f.token ?? f.id}`).join('; ')}` };
  };
  try {
    copyInto(repo, root, ['README.md', 'docs', 'curriculum', 'tracker', 'labs', 'content/stages', 'design', 'runs/README.md']);
    const append = (rel, text) => (old) => `${old.replace(/\n*$/, '\n')}\n${text}\n`;
    {
      const r = runGate(script, root);
      before = new Set((r.report.findings ?? []).map(keyOf));
      results.push({ name: 'the untouched copy', ok: true, detail: r.status === 0 ? 'passes' : `has ${before.size} findings of its own (the tree's, reported by the gate itself); the tests below look only at what each plant adds` });
    }
    check('planted: an untagged TLC count and timing as a new paragraph of README.md', () =>
      withFile(root, 'README.md', append('README.md', 'TLC 1.8.0 explored 9,999 distinct states in 2.5 s on the transfer spec.'), () =>
        failsOn(runGate(script, root), (f) => f.file === 'README.md' && f.kind === 'untagged' && /9,999 distinct states|2\.5 s/.test(f.token), 'the planted count')));
    check('planted: an untagged sentence after the last tag of a tagged paragraph in docs/PLAN.md', () => {
      const lines = fs.readFileSync(path.join(root, 'docs/PLAN.md'), 'utf8').split('\n');
      const i = lines.findIndex((l, k) => /\[X RUN-[a-z0-9-]+\]\.?$/.test(l.trim()) && !/^[|#>*-]/.test(l.trim()) && (lines[k + 1] ?? '').trim() === '');
      if (i < 0) return { ok: false, detail: 'no tagged paragraph to plant into' };
      return withFile(root, 'docs/PLAN.md', (old) => old.split('\n').map((l, k) => (k === i ? `${l} A second run took 4.25 s.` : l)).join('\n'), () =>
        failsOn(runGate(script, root), (f) => f.file === 'docs/PLAN.md' && f.token === '4.25 s', 'the planted timing'));
    });
    check('planted: an untagged TLC flag in docs/WORLD.md', () =>
      withFile(root, 'docs/WORLD.md', append('docs/WORLD.md', 'Run TLC with `-coverage 1` to see which actions fire.'), () =>
        failsOn(runGate(script, root), (f) => f.file === 'docs/WORLD.md' && f.token === '-coverage', 'the planted flag')));
    check('planted: an untagged SQLSTATE in README.md', () =>
      withFile(root, 'README.md', append('README.md', 'A violated CHECK constraint raises 23514.'), () =>
        failsOn(runGate(script, root), (f) => f.file === 'README.md' && f.token === '23514', 'the planted SQLSTATE')));
    check('planted: an untagged solver verdict with its model in README.md', () =>
      withFile(root, 'README.md', append('README.md', 'Z3 answers `sat [x = 7]` on the refund query.'), () =>
        failsOn(runGate(script, root), (f) => f.file === 'README.md' && f.tokenKind === 'verdict', 'the planted verdict')));
    check('planted: a deny-list sentence, even with a run reference (BRIEF section 2.2)', () =>
      withFile(root, 'README.md', append('README.md', 'TLC found 212 distinct states [X RUN-tlc-doublespend].'), () =>
        failsOn(runGate(script, root), (f) => f.kind === 'deny' && f.id === '212-states', 'the deny-list entry')));
    check('planted: learner copy repeating a tagged number without its own tag', () =>
      withFile(root, 'content/stages/S1/L1.md', () => 'Z3 5.3.1 answers `unsat` here {{run:RUN-z3-starter}}.\n\nZ3 5.3.1 answers `unsat` again.\n', () =>
        failsOn(runGate(script, root), (f) => f.file === 'content/stages/S1/L1.md' && f.line === 3, 'the untagged repetition in copy')));
    check('control: the planted README.md sentence with a run reference passes', () =>
      withFile(root, 'README.md', append('README.md', 'TLC 1.8.0 explored 9,999 distinct states in 2.5 s on the transfer spec [X RUN-tlc-doublespend].'), () => passes(runGate(script, root), 'a run reference covers its sentence')));
    check('control: a design value tagged [D] passes', () =>
      withFile(root, 'README.md', append('README.md', 'The consent threshold is 9 MB [D].'), () => passes(runGate(script, root), '[D] covers a design value')));
    check('control: learner copy with a reference in every sentence passes', () =>
      withFile(root, 'content/stages/S1/L1.md', () => 'Z3 5.3.1 answers `unsat` here {{run:RUN-z3-starter}}.\n\nZ3 5.3.1 answers `unsat` again {{run:RUN-z3-starter}}.\n', () => passes(runGate(script, root), 'every unit of copy carries its tag')));
    check('control: a fenced code block is not read', () =>
      withFile(root, 'README.md', append('README.md', '```\n11 states generated, 10 distinct states found\n```'), () => passes(runGate(script, root), 'fenced output is GATE-facts\' to check')));
    const baselineFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'numbers-baseline.json');
    const baseline = fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')) : { entries: [] };
    const entry = (baseline.entries ?? []).find((e) => fs.existsSync(path.join(root, e.file)) && fs.readFileSync(path.join(root, e.file), 'utf8').split('\n')[e.line - 1]?.includes(e.token));
    if (entry) {
      check('planted: a listed (baseline) sentence that is edited no longer matches its entry', () =>
        withFile(root, entry.file, (old) => old.split('\n').map((l, k) => (k === entry.line - 1 ? l.replace(entry.token, `really ${entry.token}`) : l)).join('\n'), () =>
          failsOn(runGate(script, root), (f) => f.file === entry.file && f.key === entry.key, `the edited sentence of ${entry.file}:${entry.line}`)));
      check('release lane: --strict fails on the listed debt', () => {
        const r = runGate(script, root, ['--strict']);
        return { ok: r.status === 1 && (r.report.known?.length ?? 0) > 0, detail: r.status === 1 ? `fails, as it should: ${r.report.known?.length ?? '?'} listed tokens` : `exit ${r.status}` };
      });
    } else results.push({ name: 'baseline tests', ok: true, detail: 'the baseline is empty: nothing to edit, and --strict equals the fast lane' });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  return results;
}

// ------------------------------------------------------------------ GATE-runs
export async function selfCheckRuns({ repo, script }) {
  const root = scratch();
  const results = [];
  const check = (name, fn) => {
    try {
      const { ok, detail } = fn();
      results.push({ name, ok, detail });
    } catch (e) {
      results.push({ name, ok: false, detail: `threw ${e instanceof Error ? e.message : e}` });
    }
  };
  // Differential, as for GATE-numbers: a plant must add a finding the untouched copy lacks.
  const keyOf = (f) => `${f.check}|${f.where}|${f.detail}`;
  let before = new Set();
  let beforeRelease = new Set();
  const added = (r, base = before) => (r.report.findings ?? []).filter((f) => !base.has(keyOf(f)));
  const failsOn = (r, pred, what, base = before) => {
    const hit = added(r, base).find(pred);
    return { ok: r.status === 1 && Boolean(hit), detail: hit ? `fails as it should: ${hit.check} ${hit.where}: ${hit.detail.slice(0, 140)}` : `exit ${r.status}; no new finding for ${what}${r.report.parseError ? ` (${r.report.parseError})` : ''}` };
  };
  const passes = (r, what) => {
    const extra = added(r);
    return { ok: extra.length === 0 && !r.report.parseError, detail: extra.length === 0 ? `adds no finding, as it should: ${what}` : `adds ${extra.length}: ${extra.slice(0, 2).map((f) => `${f.where} ${f.detail.slice(0, 100)}`).join('; ')}${r.report.parseError ? ` (${r.report.parseError})` : ''}` };
  };
  try {
    const readmes = [];
    for (const top of ['packages', 'apps', 'bench', 'scripts']) {
      const walk = (rel) => {
        const abs = path.join(repo, rel);
        if (!fs.existsSync(abs)) return;
        for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
          if (e.name === 'node_modules' || e.name === '.git') continue;
          const r = path.join(rel, e.name);
          if (e.isDirectory()) walk(r);
          else if (e.name === 'README.md') readmes.push(r);
        }
      };
      walk(top);
    }
    copyInto(repo, root, ['runs', 'research', 'README.md', 'docs', 'curriculum', 'tracker', 'labs', 'content', 'design', 'schemas/README.md', ...readmes]);
    const append = (text) => (old) => `${old.replace(/\n*$/, '\n')}\n${text}\n`;
    const editJson = (fn) => (old) => `${JSON.stringify(fn(JSON.parse(old)), null, 2)}\n`;
    {
      const r = runGate(script, root);
      before = new Set((r.report.findings ?? []).map(keyOf));
      beforeRelease = new Set((runGate(script, root, ['--release']).report.findings ?? []).map(keyOf));
      results.push({ name: 'the untouched copy', ok: !r.report.parseError, detail: r.report.parseError ? `the gate did not run: ${r.report.parseError}` : r.status === 0 ? 'passes the fast lane' : `has ${before.size} fast-lane findings of its own (the tree's, reported by the gate itself); the tests below look only at what each plant adds` });
    }
    check('planted: an unresolved {{run:}} in learner copy not labeled draft', () =>
      withFile(root, 'content/stages/S1/L1.md', () => 'The solver answers in under a second {{run:RUN-does-not-exist}}.\n', () =>
        failsOn(runGate(script, root), (f) => f.check === 'references' && f.where.startsWith('content/stages/S1/L1.md') && /RUN-does-not-exist/.test(f.detail), 'the planted reference')));
    check('planted: an unresolved [X RUN-id] tag in a document', () =>
      withFile(root, 'docs/PLAN.md', append('The double spend is 160 out of 100 [X RUN-does-not-exist].'), () =>
        failsOn(runGate(script, root), (f) => f.check === 'references' && f.where.startsWith('docs/PLAN.md') && /RUN-does-not-exist/.test(f.detail), 'the planted tag')));
    check('planted: a malformed {{run:}} ID', () =>
      withFile(root, 'docs/PLAN.md', append('See {{run:run_bad_id}}.'), () =>
        failsOn(runGate(script, root), (f) => /run_bad_id/.test(f.detail), 'the malformed ID')));
    check('planted: a value reference to a path the record does not have', () =>
      withFile(root, 'docs/PLAN.md', append('The model is {{run:RUN-z3-starter#values.no_such_value}}.'), () =>
        failsOn(runGate(script, root), (f) => /no_such_value/.test(f.detail), 'the missing value')));
    check('planted: an output file under runs/ tampered with', () =>
      withFile(root, 'runs/RUN-tlc-atomic/w2-default.log', (old) => `${old}tampered\n`, () =>
        failsOn(runGate(script, root), (f) => f.check === 'registry' && /RUN-tlc-atomic\/w2-default\.log/.test(f.detail), 'the tampered output')));
    check('planted: a record whose id is not its file name', () =>
      withFile(root, 'runs/RUN-z3-starter-copy.json', () => fs.readFileSync(path.join(root, 'runs/RUN-z3-starter.json'), 'utf8'), () =>
        failsOn(runGate(script, root), (f) => f.where === 'runs/RUN-z3-starter-copy.json' && /is not the file name/.test(f.detail), 'the id mismatch')));
    check('planted: an imported record with a null field it does not explain', () =>
      withFile(root, 'runs/RUN-z3-starter.json', editJson((r) => ({ ...r, unrecorded: r.unrecorded.filter((u) => u.field !== 'argv') })), () =>
        failsOn(runGate(script, root), (f) => f.where === 'runs/RUN-z3-starter.json' && /argv null/.test(f.detail), 'the unexplained null')));
    check('planted: a record that breaks run@1 (exit_code as a string)', () =>
      withFile(root, 'runs/RUN-tlc-full.json', editJson((r) => ({ ...r, exit_code: String(r.exit_code) })), () =>
        failsOn(runGate(script, root), (f) => f.where === 'runs/RUN-tlc-full.json' && /run@1/.test(f.detail), 'the schema violation')));
    check('planted: a primary_config that names no configuration', () =>
      withFile(root, 'runs/RUN-tlc-full.json', editJson((r) => ({ ...r, primary_config: 'nope' })), () =>
        failsOn(runGate(script, root), (f) => f.where === 'runs/RUN-tlc-full.json' && /primary_config/.test(f.detail), 'the dangling primary_config')));
    check('control: format placeholders in code spans pass', () =>
      withFile(root, 'docs/PLAN.md', append('Cite a run as `{{run:RUN-id}}` in copy and as `[X RUN-id]` in documents; `{{run:ID}}` is the form.'), () => passes(runGate(script, root), 'placeholders are exempt')));
    check('control: a value reference that resolves passes', () =>
      withFile(root, 'docs/PLAN.md', append('The model is {{run:RUN-z3-starter#values.model}}.'), () => passes(runGate(script, root), 'the value exists')));
    check('control: an unresolved {{run:}} in copy labeled draft passes the fast lane', () =>
      withFile(root, 'content/stages/S1/L1.md', () => '**Status:** draft: first-learner pass pending.\n\nThe solver answers in under a second {{run:RUN-does-not-exist}}.\n', () => passes(runGate(script, root), 'a draft may wait for its run')));
    check('release lane: the same draft fails --release', () =>
      withFile(root, 'content/stages/S1/L1.md', () => '**Status:** draft: first-learner pass pending.\n\nThe solver answers in under a second {{run:RUN-does-not-exist}}.\n', () =>
        failsOn(runGate(script, root, ['--release']), (f) => f.where.startsWith('content/stages/S1/L1.md'), 'the draft reference at release', beforeRelease)));
    check('release lane: an input changed since its run passes the fast lane and fails --release', () =>
      withFile(root, 'research/spikes/tla/A3.cfg', (old) => `${old}\\* changed\n`, () => {
        const fast = runGate(script, root);
        const release = runGate(script, root, ['--release']);
        const hit = added(release, beforeRelease).find((f) => /A3\.cfg changed/.test(f.detail));
        const fastExtra = added(fast);
        return { ok: fastExtra.length === 0 && release.status === 1 && Boolean(hit), detail: `the fast lane adds ${fastExtra.length} findings (a warning only); the release lane adds ${hit ? `${hit.where}: ${hit.detail.slice(0, 80)}` : 'nothing'}` };
      }));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  return results;
}
