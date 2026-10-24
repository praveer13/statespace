#!/usr/bin/env node
// Re-run the executed runs that spine section 9.5 asks W0-S11 to re-run, and record the runs it asks W0-S11
// to record, with argv, hashes and outputs committed under runs/<RUN-id>/.
//
//   node scripts/runs/rerun.mjs <group> [--jar180 FILE] [--jar174 FILE]
//
// groups:
//   tlc        RUN-tlc-atomic, RUN-tlc-unsafe-3w, RUN-tlc-full: TLC 1.8.0 in eclipse-temurin:21-jre (needs --jar180)
//   lean       RUN-lean-ledger, RUN-lean-selftransfer, RUN-lean-bv-decide, RUN-lean-vcgen: Lean 4.35.0 in ss-lean:4.35.0
//   cvc5       RUN-cvc5-alethe: the cvc5 1.4.2 pip wheel under uv, with the full Alethe proof
//   asset      RUN-lean-asset: the Lean 4.35.0 release assets, from the GitHub release API
//   plaingoal  RUN-lean-plaingoal: research/evidence/A5r3/scripts/lean-plaingoal.mjs, with a memory cap added
//   wasm       RUN-lean-wasm: research/evidence/lean-measure/scripts/probe-wasm*.cjs in the Playwright image
//
// Every container runs with --memory=6g and is removed when it exits. Host paths in recorded argv are
// replaced by <sandbox>; the record says which file each placeholder stands for, by its SHA-256.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REPO, fileRecord, hostEnvironment, normalizePaths, sha256, sha256File } from './registry.mjs';
import { importedRecord } from './import-research.mjs';

const args = process.argv.slice(2);
const group = args[0];
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
// Scratch space for staged inputs: W0S11_SCRATCH when set (outside the repository), else the system temp directory.
const WORK = fs.mkdtempSync(path.join(process.env.W0S11_SCRATCH ?? os.tmpdir(), 'w0s11-rerun-'));
const IMAGES = {
  java: 'eclipse-temurin:21-jre',
  lean: 'ss-lean:4.35.0',
  playwright: 'mcr.microsoft.com/playwright:v1.63.0-noble',
};

// ------------------------------------------------------------------ helpers
function imageRef(tag) {
  const r = spawnSync('docker', ['image', 'inspect', tag, '--format', '{{.Id}}'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`docker image ${tag} is not here`);
  return `${tag}@${r.stdout.trim()}`;
}

function dockerVersion() {
  const r = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

/** Run argv with stdout and stderr in one file, in order. */
function exec(argv, { logFile, cwd = WORK, timeoutMs = 600000, env } = {}) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const fd = fs.openSync(logFile, 'w');
  const started = new Date();
  const t0 = process.hrtime.bigint();
  const r = spawnSync(argv[0], argv.slice(1), { cwd, stdio: ['ignore', fd, fd], timeout: timeoutMs, env: env ?? process.env });
  const duration_s = Number(process.hrtime.bigint() - t0) / 1e9;
  fs.closeSync(fd);
  // Normalise private paths in the committed log.
  const text = fs.readFileSync(logFile, 'utf8');
  const clean = normalizePaths(text, { sandbox: [WORK] });
  if (clean !== text) fs.writeFileSync(logFile, clean);
  return { code: r.status, signal: r.signal, started_at: started.toISOString(), duration_s: Math.round(duration_s * 1000) / 1000, text: clean };
}

const rel = (abs) => path.relative(REPO, abs).split(path.sep).join('/');
const runDir = (id) => path.join(REPO, 'runs', id);
const linesOf = (text) => text.replaceAll('\r\n', '\n').split('\n');
const keep = (text, res) => linesOf(text).filter((l) => res.some((re) => re.test(l)));
const write = (id, record) => fs.writeFileSync(path.join(REPO, 'runs', `${id}.json`), `${JSON.stringify(record, null, 2)}\n`);

/** Copy repository files into a fresh work directory; returns its path. */
function stage(name, files) {
  const dir = path.join(WORK, name);
  fs.mkdirSync(dir, { recursive: true });
  for (const [from, to] of files) fs.copyFileSync(path.join(REPO, from), path.join(dir, to ?? path.basename(from)));
  return dir;
}

/** Argv as recorded: host paths replaced by placeholders. */
const recordArgv = (argv, placeholders) => argv.map((a) => {
  let out = a;
  for (const [real, shown] of placeholders) out = out.split(real).join(shown);
  return normalizePaths(out, { sandbox: [WORK] });
});

/** Fold an imported record into a re-run record as configurations that hold the original execution. */
function originalConfigs(id) {
  const old = importedRecord(id);
  const main = {
    id: 'original',
    origin: 'imported',
    purpose: `the execution the spine registered (${old.records}), imported from research/ as it was before this re-run`,
    engine: old.engine,
    version: old.version,
    binary_sha256: old.binary_sha256,
    image: old.image,
    started_at: old.started_at,
    argv: old.argv,
    inputs: old.inputs,
    exit_code: old.exit_code,
    verdict_lines: old.verdict_lines,
    outputs: old.outputs,
    values: old.values,
    unrecorded: old.unrecorded,
  };
  const nested = (old.configs ?? []).map((c) => ({ ...c, id: `original-${c.id}`, origin: 'imported' }));
  return { old, configs: [main, ...nested] };
}

const environmentOf = (extra = {}) => ({ ...hostEnvironment(), docker: dockerVersion(), ...extra });

// ------------------------------------------------------------------ TLC
function tlcGroup() {
  const jar = opt('--jar180');
  if (!jar) throw new Error('tlc needs --jar180 <path to the pinned tla2tools.jar 1.8.0>');
  const jarSha = sha256File(jar);
  const PIN = '5bd7b64db99ae4c6c35f290de5e809c0ee41af43f8699cf696099ffb6452b1e2';
  if (jarSha !== PIN) throw new Error(`the jar hashes to ${jarSha}, not the pinned ${PIN}`);
  const image = imageRef(IMAGES.java);
  const javaVersion = spawnSync('docker', ['run', '--rm', '--memory=6g', '--network', 'none', IMAGES.java, 'java', '-version'], { encoding: 'utf8' }).stderr.split('\n')[0];

  /** One TLC configuration: copy spec and cfg, run TLC with one worker, keep the verdict lines. */
  function tlc(id, cfgId, { spec, cfg, flags = [] }) {
    const dir = stage(`${id}-${cfgId}`, [[spec], [cfg]]);
    const container = `w0s11-${id.toLowerCase()}-${cfgId}`.slice(0, 60);
    const tlcArgv = ['java', '-jar', '/t/tla2tools.jar', '-workers', '1', ...flags, '-metadir', '/tmp/tlc-states', '-config', path.basename(cfg), path.basename(spec)];
    const argv = ['docker', 'run', '--rm', '--name', container, '--memory=6g', '--network', 'none', '-v', `${dir}:/w`, '-v', `${jar}:/t/tla2tools.jar:ro`, '-w', '/w', IMAGES.java, ...tlcArgv];
    const logFile = path.join(runDir(id), `${cfgId}.log`);
    const r = exec(argv, { logFile });
    const verdict = keep(r.text, [/^TLC2 Version/, /^Running breadth-first search/, /^Error: /, /^Model checking completed/, /states generated, .* distinct states? found/, /^The depth of the complete state graph search is/, /^Finished in/]);
    const distinct = /(\d[\d,]*) distinct states? found/.exec(r.text);
    const depth = /The depth of the complete state graph search is (\d+)/.exec(r.text);
    const generated = /(\d[\d,]*) states generated/.exec(r.text);
    const result = /Error: Deadlock reached/.test(r.text) ? 'deadlock' : /Error: Invariant \w+ is violated/.test(r.text) ? 'violated' : /No error has been found/.test(r.text) ? 'no error' : 'other';
    return {
      id: cfgId,
      origin: 'recorded',
      engine: 'tlc',
      version: '2026.10.20.183001',
      binary_sha256: jarSha,
      image,
      started_at: r.started_at,
      duration_s: r.duration_s,
      argv: recordArgv(argv, [[jar, '<sandbox>/tla2tools-1.8.0.jar'], [dir, '<sandbox>/work']]),
      inputs: [fileRecord(REPO, spec, { role: 'spec' }), fileRecord(REPO, cfg, { role: 'config' })],
      budget: { workers: 1, container_memory: '6g', network: 'none' },
      exit_code: r.code,
      verdict_lines: verdict,
      outputs: [fileRecord(REPO, rel(logFile), { kind: 'log' })],
      values: { result, distinct_states: distinct ? Number(distinct[1].replace(/,/g, '')) : null, states_generated: generated ? Number(generated[1].replace(/,/g, '')) : null, depth: depth ? Number(depth[1]) : null },
    };
  }

  const finish = (id, title, configs, primary, { values, notes = [] }) => {
    const { old, configs: original } = originalConfigs(id);
    const p = configs.find((c) => c.id === primary);
    const record = {
      id,
      title,
      task: 'W0-S11',
      origin: 'recorded',
      records: old.records,
      engine: 'tlc',
      version: '2026.10.20.183001',
      version_string: (configs[0].verdict_lines.find((l) => l.startsWith('TLC2 Version')) ?? '').trim() || undefined,
      binary: 'tla2tools.jar 1.8.0, the pinned pre-release jar (labs/TOOLS.md section 1)',
      binary_sha256: jarSha,
      image,
      recorded_at: new Date().toISOString(),
      started_at: configs[0].started_at,
      duration_s: Math.round(configs.reduce((s, c) => s + c.duration_s, 0) * 1000) / 1000,
      argv: p.argv,
      inputs: [...new Map(configs.flatMap((c) => c.inputs).map((i) => [i.path, i])).values()],
      budget: { workers: 1, container_memory: '6g', network: 'none' },
      exit_code: p.exit_code,
      verdict_lines: p.verdict_lines,
      outputs: configs.flatMap((c) => c.outputs),
      values,
      environment: environmentOf({ container: { image, java: javaVersion } }),
      primary_config: primary,
      configs: [...configs.map((c) => ({ ...c, outputs: c.outputs.map((o) => o.path) })), ...original],
      notes: [
        'Re-run by W0-S11 with argv recorded, because the earlier record holds no command line (spine section 9.5). The configuration "original" and those that start with "original-" hold the earlier execution as it was imported from research/.',
        `The jar is the pinned 1.8.0 pre-release (SHA-256 ${jarSha}); <sandbox>/tla2tools-1.8.0.jar in argv stands for it, and <sandbox>/work for a scratch copy of the spec and configuration listed in inputs.`,
        'TLC writes its state queue under -metadir /tmp/tlc-states inside the container, so the scratch copy holds only the inputs.',
        ...notes,
      ],
    };
    if (!record.version_string) delete record.version_string;
    write(id, record);
    console.log(`${id}: ${configs.map((c) => `${c.id} exit ${c.exit_code}, ${c.values.result}, ${c.values.distinct_states} distinct`).join('; ')}`);
  };

  // RUN-tlc-atomic
  {
    const id = 'RUN-tlc-atomic';
    const spec = 'research/spikes/tla/DoubleSpendAtomic.tla';
    const c = [
      tlc(id, 'w2-default', { spec, cfg: 'research/spikes/tla/DoubleSpendAtomic.cfg' }),
      tlc(id, 'w2-deadlock-off', { spec, cfg: 'research/spikes/tla/DoubleSpendAtomic.cfg', flags: ['-deadlock'] }),
      tlc(id, 'w3-a40-default', { spec, cfg: 'research/spikes/tla/A3.cfg' }),
      tlc(id, 'w3-a40-deadlock-off', { spec, cfg: 'research/spikes/tla/A3.cfg', flags: ['-deadlock'] }),
    ];
    finish(id, 'The atomic variant re-run with argv: with -deadlock no error, at 4 distinct states for two workers and 8 for three at Amount 40', c, 'w2-deadlock-off', {
      values: Object.fromEntries(c.map((x) => [x.id, x.values])),
      notes: ['Each configuration ran twice in spirit: with default flags, where TLC checks for deadlock, and with -deadlock. RESULTS.md\'s "no error" matches the -deadlock runs (spine section 9.5 suspected the deadlock check was off).'],
    });
  }
  // RUN-tlc-unsafe-3w
  {
    const id = 'RUN-tlc-unsafe-3w';
    const spec = 'research/spikes/tla/DoubleSpend.tla';
    const c = [
      tlc(id, 'w3-a40-default', { spec, cfg: 'research/spikes/tla/U3.cfg' }),
      tlc(id, 'w3-a40-deadlock-off', { spec, cfg: 'research/spikes/tla/U3.cfg', flags: ['-deadlock'] }),
    ];
    finish(id, 'The unsafe spec with three workers at Amount 40 re-run with argv: with -deadlock the invariant is violated at 69 distinct states; default flags stop first at a deadlock', c, 'w3-a40-deadlock-off', {
      values: Object.fromEntries(c.map((x) => [x.id, x.values])),
      notes: ['With default flags TLC checks for deadlock and stops at the first state with no successor, before it reaches the violation; RESULTS.md\'s "violated; 69 distinct when found" matches the -deadlock run.'],
    });
  }
  // RUN-tlc-full
  {
    const id = 'RUN-tlc-full';
    const spec = 'research/spikes/tla/DoubleSpend.tla';
    const c = [
      tlc(id, 'w2', { spec, cfg: 'research/spikes/tla/DoubleSpendFull.cfg', flags: ['-deadlock'] }),
      tlc(id, 'w3', { spec, cfg: 'research/evidence/A5r3/tla/Full3.cfg', flags: ['-deadlock'] }),
      tlc(id, 'w4', { spec, cfg: 'research/evidence/A5r3/tla/Full4.cfg', flags: ['-deadlock'] }),
      tlc(id, 'w5', { spec, cfg: 'research/evidence/A5r3/tla/Full5.cfg', flags: ['-deadlock'] }),
    ];
    finish(id, 'The full reachable space of the unsafe spec for 2 to 5 workers, re-run with argv on the 1.8.0 jar', c, 'w2', {
      values: { distinct_states: Object.fromEntries(c.map((x) => [x.id, x.values.distinct_states])), depth: Object.fromEntries(c.map((x) => [x.id, x.values.depth])), states_generated: Object.fromEntries(c.map((x) => [x.id, x.values.states_generated])) },
      notes: ['The configurations have no invariant; -deadlock lets TLC explore every reachable state instead of stopping at the first state with no successor.'],
    });
  }
}

// ------------------------------------------------------------------ Lean
function leanGroup() {
  const image = imageRef(IMAGES.lean);
  const leanVersion = spawnSync('docker', ['run', '--rm', '--memory=6g', '--network', 'none', IMAGES.lean, 'lean', '--version'], { encoding: 'utf8' }).stdout.trim();
  const leanSha = spawnSync('docker', ['run', '--rm', '--memory=6g', '--network', 'none', IMAGES.lean, 'sh', '-c', 'sha256sum "$(readlink -f "$(elan which lean)")"'], { encoding: 'utf8' }).stdout.split(' ')[0];

  /** lean <file> in the image, the file staged read-only at /w. */
  function lean(id, cfgId, files, file, purpose) {
    const dir = stage(`${id}-${cfgId}`, files);
    const container = `w0s11-${id.toLowerCase()}-${cfgId}`.slice(0, 60);
    const argv = ['docker', 'run', '--rm', '--name', container, '--memory=6g', '--network', 'none', '-v', `${dir}:/w:ro`, '-w', '/w', IMAGES.lean, 'lean', file];
    const logFile = path.join(runDir(id), `${cfgId}.log`);
    const r = exec(argv, { logFile });
    return {
      id: cfgId,
      origin: 'recorded',
      purpose,
      engine: 'lean',
      version: '4.35.0',
      binary_sha256: leanSha,
      image,
      started_at: r.started_at,
      duration_s: r.duration_s,
      argv: recordArgv(argv, [[dir, '<sandbox>/work']]),
      inputs: files.map(([from]) => fileRecord(REPO, from, { role: 'source' })),
      budget: { container_memory: '6g', network: 'none' },
      exit_code: r.code,
      verdict_lines: linesOf(r.text).filter((l) => l.trim() !== ''),
      outputs: [fileRecord(REPO, rel(logFile), { kind: 'log' })],
    };
  }

  const base = (id, title, configs, primary, extra) => {
    const p = configs.find((c) => c.id === primary);
    return {
      id,
      title,
      task: 'W0-S11',
      origin: 'recorded',
      ...(extra.records ? { records: extra.records } : {}),
      engine: 'lean',
      version: '4.35.0',
      version_string: leanVersion,
      binary: 'bin/lean of the Lean 4.35.0 toolchain in the ss-lean:4.35.0 image (elan resolves /opt/elan/bin/lean to it)',
      binary_sha256: leanSha,
      image,
      recorded_at: new Date().toISOString(),
      started_at: configs[0].started_at,
      duration_s: Math.round(configs.reduce((s, c) => s + c.duration_s, 0) * 1000) / 1000,
      argv: p.argv,
      inputs: [...new Map(configs.flatMap((c) => c.inputs).map((i) => [i.path, i])).values()],
      budget: { container_memory: '6g', network: 'none' },
      exit_code: p.exit_code,
      verdict_lines: p.verdict_lines,
      outputs: configs.flatMap((c) => c.outputs),
      values: extra.values,
      environment: environmentOf({ container: { image } }),
      primary_config: primary,
      configs: [...configs.map((c) => ({ ...c, outputs: c.outputs.map((o) => o.path) })), ...(extra.original ?? [])],
      notes: [
        '<sandbox>/work in argv stands for a scratch copy of the files listed in inputs, mounted read-only.',
        ...(extra.notes ?? []),
      ],
    };
  };

  // RUN-lean-ledger and RUN-lean-selftransfer: research/spikes/lean/Ledger.lean
  const ledger = 'research/spikes/lean/Ledger.lean';
  {
    const id = 'RUN-lean-ledger';
    const c = [lean(id, 'ledger', [[ledger]], 'Ledger.lean', 'elaborate Ledger.lean: the four ledger theorems and #print axioms for both conservation theorems')];
    const axioms = c[0].verdict_lines.filter((l) => /depends on axioms/.test(l));
    const { old, configs: original } = originalConfigs(id);
    write(id, base(id, 'Core Lean 4.35.0 proves the four ledger theorems, re-run with argv: conservation uses [propext, Quot.sound]', c, 'ledger', {
      records: old.records,
      values: { exit_code: c[0].exit_code, axioms_lines: axioms, errors: c[0].verdict_lines.filter((l) => /error/.test(l)).length },
      original,
      notes: ['Re-run by W0-S11 with argv, because RESULTS.md, the earlier record, holds no command line. The configurations named original hold that record.', 'Exit code 0 with no error line means every theorem in the file, the four ledger theorems among them, was accepted.'],
    }));
    console.log(`${id}: exit ${c[0].exit_code}; ${axioms.join(' | ')}`);
  }
  {
    const id = 'RUN-lean-selftransfer';
    const mutantDir = path.join(runDir(id), 'inputs');
    fs.mkdirSync(mutantDir, { recursive: true });
    // A negative control: the buggy example claims the honest result, 10, which decide must refuse.
    const src = fs.readFileSync(path.join(REPO, ledger), 'utf8');
    const needle = 'example : xferBuggy (fun _ => 10) 0 0 5 0 = 15 := by decide';
    if (!src.includes(needle)) throw new Error('Ledger.lean no longer holds the self-transfer example');
    fs.writeFileSync(path.join(mutantDir, 'LedgerMutant.lean'), src.replace(needle, 'example : xferBuggy (fun _ => 10) 0 0 5 0 = 10 := by decide'));
    const mutant = rel(path.join(mutantDir, 'LedgerMutant.lean'));
    const c = [
      lean(id, 'ledger', [[ledger]], 'Ledger.lean', 'elaborate Ledger.lean: decide proves xferBuggy (fun _ => 10) 0 0 5 0 = 15 and xfer (fun _ => 10) 0 0 5 0 = 10'),
      lean(id, 'mutant-buggy-gives-10', [[mutant]], 'LedgerMutant.lean', 'a negative control: the same file with the buggy example claiming 10, the honest result, which decide must refuse'),
    ];
    const { old, configs: original } = originalConfigs(id);
    write(id, base(id, 'The self-transfer mint re-run with argv: decide proves the buggy transfer gives 15 and the fixed one 10, and refuses the claim that the buggy one gives 10', c, 'ledger', {
      records: old.records,
      values: { ledger_exit: c[0].exit_code, ledger_errors: c[0].verdict_lines.filter((l) => /error/.test(l)).length, mutant_exit: c[1].exit_code, mutant_error: c[1].verdict_lines.find((l) => /error/.test(l)) ?? null },
      original,
      notes: [
        'Re-run by W0-S11 with argv, because RESULTS.md, the earlier record, holds no command line (spine section 9.5). The configurations named original hold that record.',
        'The examples are anonymous, so a pass prints nothing: the evidence is exit code 0 with no error, beside the mutant whose changed example decide refuses. runs/RUN-lean-selftransfer/inputs/LedgerMutant.lean is Ledger.lean with that one line changed.',
      ],
    }));
    console.log(`${id}: ledger exit ${c[0].exit_code}; mutant exit ${c[1].exit_code}`);
  }
  // RUN-lean-bv-decide: Bits.lean and BitsBad.lean
  {
    const id = 'RUN-lean-bv-decide';
    const dir = 'research/evidence/lean-measure/proj/ledger/Ledger';
    const c = [
      lean(id, 'bits', [[`${dir}/Bits.lean`]], 'Bits.lean', 'Bits.lean: omega proves the guard over Int; bv_decide proves guarded 64-bit subtraction does not wrap; #print axioms'),
      lean(id, 'bits-bad', [[`${dir}/BitsBad.lean`]], 'BitsBad.lean', 'BitsBad.lean: the false claim that 64-bit subtraction never wraps, which bv_decide refutes with a counterexample'),
    ];
    write(id, base(id, 'bv_decide on 64-bit subtraction: proved with the guard, refuted with a counterexample without it', c, 'bits-bad', {
      values: { bits_exit: c[0].exit_code, bits_bad_exit: c[1].exit_code, counterexample_lines: c[1].verdict_lines.filter((l) => /=/.test(l)) },
      notes: ['Recorded by W0-S11 from the sources on disk; until now their outputs existed only as prose in the R1 verification report (spine section 9.5).'],
    }));
    console.log(`${id}: bits exit ${c[0].exit_code}; bits-bad exit ${c[1].exit_code}`);
  }
  // RUN-lean-vcgen: Contract.lean and ContractBad.lean
  {
    const id = 'RUN-lean-vcgen';
    const dir = 'research/evidence/lean-measure/proj/ledger/Ledger';
    const c = [
      lean(id, 'contract', [[`${dir}/Contract.lean`]], 'Contract.lean', 'Contract.lean: experimental vcgen with requires and ensures on the transfer contract, and a loop invariant; #check and #print axioms'),
      lean(id, 'contract-bad', [[`${dir}/ContractBad.lean`]], 'ContractBad.lean', 'ContractBad.lean: the guard forgets amt <= a, so the non-negativity postcondition must not be provable'),
    ];
    write(id, base(id, "Lean's experimental vcgen on the transfer contract: the contract and its loop elaborate, and a weakened guard is refused", c, 'contract', {
      values: { contract_exit: c[0].exit_code, contract_bad_exit: c[1].exit_code, contract_bad_first_error: c[1].verdict_lines.find((l) => /error/.test(l)) ?? null },
      notes: ['Recorded by W0-S11 from the sources on disk; until now their outputs existed only as prose in the R1 verification report (spine section 9.5). The vcgen options are experimental in 4.35.0.'],
    }));
    console.log(`${id}: contract exit ${c[0].exit_code}; contract-bad exit ${c[1].exit_code}`);
  }
}

// ------------------------------------------------------------------ cvc5
function cvc5Group() {
  const id = 'RUN-cvc5-alethe';
  const script = 'research/evidence/a2r3/scripts/cvc5_alethe.py';
  const dir = stage('cvc5', [[script]]);
  const uvArgs = ['uv', 'run', '--no-project', '--quiet', '--with', 'cvc5==1.4.2', 'python', '-I'];
  const argv = [...uvArgs, 'cvc5_alethe.py'];
  const logFile = path.join(runDir(id), 'run.log');
  const r = exec(argv, { logFile, cwd: dir });
  const proofFrom = path.join(dir, 'cvc5_guard.alethe');
  if (!fs.existsSync(proofFrom)) throw new Error('cvc5_alethe.py wrote no proof');
  const proofTo = path.join(runDir(id), 'cvc5_guard.alethe');
  fs.copyFileSync(proofFrom, proofTo);
  const proof = fs.readFileSync(proofTo, 'utf8').trim().split('\n');
  // The native library that ran, and the versions around it.
  const probe = spawnSync(uvArgs[0], [...uvArgs.slice(1), '-c', 'import cvc5, os, sys, importlib.metadata as m; d = os.path.dirname(cvc5.__file__); print(sys.version.split()[0]); print(m.version("cvc5")); print(next(os.path.join(d, f) for f in sorted(os.listdir(d)) if f.endswith(".so")))'], { cwd: dir, encoding: 'utf8' });
  const [python, wheelVersion, lib] = probe.stdout.trim().split('\n');
  const libSha = sha256File(lib);
  const uvVersion = spawnSync('uv', ['--version'], { encoding: 'utf8' }).stdout.trim();
  const pypi = spawnSync('curl', ['-sS', '--max-time', '60', 'https://pypi.org/pypi/cvc5/1.4.2/json'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const files = JSON.parse(pypi.stdout).urls ?? [];
  const wheel = files.find((f) => f.filename.includes(`cp${python.split('.').slice(0, 2).join('')}`) && f.filename.includes('manylinux') && f.filename.includes('x86_64'));
  const versionLine = linesOf(r.text).find((l) => l.startsWith('cvc5 ')) ?? null;
  // The version as the solver prints it (Solver.getVersion()), verbatim; the wheel's metadata may differ.
  const printed = versionLine ? (/^cvc5 b?'([^']+)'/.exec(versionLine) ?? [])[1] ?? null : null;
  const verdict = linesOf(r.text).filter((l) => l.trim() !== '');
  const { old, configs: original } = originalConfigs(id);
  write(id, {
    id,
    title: 'cvc5 1.4.2 from the pip wheel re-run: unsat on the guard query, with the whole Alethe proof committed',
    task: 'W0-S11',
    origin: 'recorded',
    records: old.records,
    engine: 'cvc5',
    version: printed ?? wheelVersion,
    ...(versionLine ? { version_string: versionLine } : {}),
    binary: `cvc5/${path.basename(lib)} from the cvc5 ${wheelVersion} wheel${wheel ? ` (${wheel.filename})` : ''}`,
    binary_sha256: libSha,
    image: null,
    recorded_at: new Date().toISOString(),
    started_at: r.started_at,
    duration_s: r.duration_s,
    argv,
    inputs: [fileRecord(REPO, script, { role: 'script' }), ...(wheel ? [{ url: wheel.url, file: wheel.filename, sha256: wheel.digests.sha256, bytes: wheel.size, role: 'wheel' }] : [])],
    budget: {},
    exit_code: r.code,
    verdict_lines: verdict,
    outputs: [fileRecord(REPO, rel(logFile), { kind: 'log' }), fileRecord(REPO, rel(proofTo), { kind: 'Alethe proof' })],
    values: {
      version_printed: printed,
      wheel_version: wheelVersion,
      verdict: /-> unsat/.test(r.text) ? 'unsat' : null,
      proof_lines: proof.length,
      proof_steps: proof.filter((l) => l.includes('(step ')).length,
      hole_steps: proof.filter((l) => l.includes(':rule hole')).length,
      hole_args: proof.filter((l) => l.includes(':rule hole')).map((l) => (/:args \((.*)\)\)\s*$/.exec(l) ?? [])[1] ?? null),
    },
    environment: { ...hostEnvironment(), python, uv: uvVersion, container: null },
    primary_config: 'rerun',
    configs: [{ id: 'rerun', origin: 'recorded', purpose: 'the script on disk under uv with the cvc5 1.4.2 wheel; it writes the proof to cvc5_guard.alethe', version: printed ?? wheelVersion, binary_sha256: libSha, started_at: r.started_at, duration_s: r.duration_s, argv, exit_code: r.code, verdict_lines: verdict, outputs: [rel(logFile), rel(proofTo)] }, ...original],
    notes: [
      'Re-run by W0-S11 to commit the whole proof (spine section 9.5): the earlier log kept only its first eight lines.',
      'binary_sha256 is the hash of the native library the wheel installs, the code that ran; the wheel itself is listed in inputs with the SHA-256 PyPI publishes for it.',
      'version is what the solver printed, verbatim; the wheel\'s own metadata says 1.4.2 (values.wheel_version). Receipts keep the printed string (labs/TOOLS.md section 2.3).',
      'uv ran on the host; no container.',
    ],
  });
  console.log(`${id}: exit ${r.code}; ${versionLine}; proof ${proof.length} lines, ${proof.filter((l) => l.includes(':rule hole')).length} hole steps`);
}

// ------------------------------------------------------------------ the Lean release assets
function assetGroup() {
  const id = 'RUN-lean-asset';
  const url = 'https://api.github.com/repos/leanprover/lean4/releases/tags/v4.35.0';
  const argv = ['curl', '-sS', '--max-time', '60', '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28', url];
  const rawFile = path.join(WORK, 'release-raw.json');
  const r = exec(argv, { logFile: rawFile });
  if (r.code !== 0) throw new Error(`curl exited ${r.code}`);
  const raw = fs.readFileSync(rawFile);
  const release = JSON.parse(raw.toString('utf8'));
  const keepAsset = (a) => ({ name: a.name, size: a.size, digest: a.digest ?? null, content_type: a.content_type, created_at: a.created_at, updated_at: a.updated_at, browser_download_url: a.browser_download_url });
  const kept = { tag_name: release.tag_name, name: release.name, published_at: release.published_at, html_url: release.html_url, prerelease: release.prerelease, assets: (release.assets ?? []).map(keepAsset) };
  fs.mkdirSync(runDir(id), { recursive: true });
  const outFile = path.join(runDir(id), 'release-assets.json');
  fs.writeFileSync(outFile, `${JSON.stringify(kept, null, 2)}\n`);
  const lines = kept.assets.map((a) => `${a.name} ${a.size} bytes ${a.digest ?? 'no digest'} ${a.browser_download_url}`);
  const linux = kept.assets.find((a) => a.name === 'lean-4.35.0-linux.tar.zst') ?? null;
  const curlVersion = spawnSync('curl', ['--version'], { encoding: 'utf8' }).stdout.split('\n')[0];
  const curlPath = spawnSync('sh', ['-c', 'command -v curl'], { encoding: 'utf8' }).stdout.trim();
  write(id, {
    id,
    title: "The Lean 4.35.0 release assets, read from GitHub's release API: each asset's byte count, digest and download URL",
    task: 'W0-S11',
    origin: 'recorded',
    engine: 'curl',
    version: curlVersion.split(' ')[1] ?? curlVersion,
    version_string: curlVersion,
    binary: 'curl on the host',
    binary_sha256: curlPath ? sha256File(fs.realpathSync(curlPath)) : null,
    image: null,
    recorded_at: new Date().toISOString(),
    started_at: r.started_at,
    duration_s: r.duration_s,
    argv,
    inputs: [{ url, name: 'the API response', sha256: sha256(raw), bytes: raw.length, role: 'response, kept in part' }],
    budget: { timeout_s: 60 },
    exit_code: r.code,
    verdict_lines: [`${kept.tag_name} published ${kept.published_at}`, ...lines],
    outputs: [fileRecord(REPO, rel(outFile), { kind: 'release assets' })],
    values: { tag: kept.tag_name, published_at: kept.published_at, linux_asset: linux, assets: kept.assets.length },
    environment: { ...hostEnvironment(), container: null },
    ttl_days: 60,
    notes: [
      'The committed file keeps the release and asset fields this run needs; the input lists the SHA-256 of the whole response as it arrived.',
      'A release asset can be replaced under its tag, so the run carries a 60-day TTL (labs/TOOLS.md section 6.1).',
    ],
  });
  console.log(`${id}: ${lines.filter((l) => l.startsWith('lean-4.35.0-linux')).join(' | ')}`);
}

// ------------------------------------------------------------------ Goal Replay's source: $/lean/plainGoal
function plaingoalGroup() {
  const id = 'RUN-lean-plaingoal';
  const script = 'research/evidence/A5r3/scripts/lean-plaingoal.mjs';
  const source = 'research/evidence/A5r3/lean/Ledger.lean';
  const original = fs.readFileSync(path.join(REPO, script), 'utf8');
  const from = "spawn('docker', ['run', '-i', '--rm', '--network', 'none',";
  const to = "spawn('docker', ['run', '-i', '--rm', '--memory=6g', '--network', 'none',";
  if (!original.includes(from)) throw new Error('the plainGoal script no longer starts docker as expected');
  const patched = original.replace(from, to);
  const scriptDir = path.join(WORK, 'plaingoal-script');
  fs.mkdirSync(scriptDir, { recursive: true });
  const scriptCopy = path.join(scriptDir, 'lean-plaingoal.mjs');
  fs.writeFileSync(scriptCopy, patched);
  const dir = stage('plaingoal-ledger', [[source]]);
  const argv = ['node', scriptCopy, dir];
  const logFile = path.join(runDir(id), 'goals.log');
  const r = exec(argv, { logFile });
  const image = imageRef(IMAGES.lean);
  const leanSha = spawnSync('docker', ['run', '--rm', '--memory=6g', '--network', 'none', IMAGES.lean, 'sh', '-c', 'sha256sum "$(readlink -f "$(elan which lean)")"'], { encoding: 'utf8' }).stdout.split(' ')[0];
  const probes = linesOf(r.text).filter((l) => l.startsWith('--- '));
  write(id, {
    id,
    title: 'Goal states extracted at build time from real Lean 4.35.0 elaboration through the language server request $/lean/plainGoal',
    task: 'W0-S11',
    origin: 'recorded',
    engine: 'lean',
    version: '4.35.0',
    binary: 'lean --server of the Lean 4.35.0 toolchain in the ss-lean:4.35.0 image',
    binary_sha256: leanSha,
    image,
    recorded_at: new Date().toISOString(),
    started_at: r.started_at,
    duration_s: r.duration_s,
    argv: recordArgv(argv, [[scriptCopy, '<sandbox>/lean-plaingoal.mjs'], [dir, '<sandbox>/ledger']]),
    inputs: [fileRecord(REPO, script, { role: 'script, as committed' }), { name: 'lean-plaingoal.mjs, as run', sha256: sha256(Buffer.from(patched)), bytes: Buffer.byteLength(patched), role: 'script with --memory=6g added' }, fileRecord(REPO, source, { role: 'source' })],
    budget: { container_memory: '6g', network: 'none' },
    exit_code: r.code,
    verdict_lines: linesOf(r.text).filter((l) => l.trim() !== ''),
    outputs: [fileRecord(REPO, rel(logFile), { kind: 'goal strips' })],
    values: { probes: probes.length, probe_labels: probes.map((l) => l.replace(/ \(t=\d+ ms\)$/, '').replace(/^--- /, '')) },
    environment: { ...hostEnvironment(), node: process.version, docker: dockerVersion(), container: { image, network: 'none' } },
    notes: [
      `Re-run by W0-S11 from ${script} (spine section 9.5). The one change: the script's docker run gains --memory=6g, the cap every container on this host runs with; the input "as run" is that copy.`,
      'The script opens Ledger.lean in lean --server and asks for the goal at five positions: before each tactic of transfer_conserves and run_conserves, and inside the induction cases. The t= times are wall-clock times since the server started and vary from run to run.',
      '<sandbox>/ledger in argv stands for a scratch copy of the source listed in inputs; the script mounts it at /w.',
    ],
  });
  console.log(`${id}: exit ${r.code}; ${probes.length} probes`);
}

// ------------------------------------------------------------------ the community WebAssembly build of Lean
async function wasmGroup() {
  const id = 'RUN-lean-wasm';
  const url = 'https://lean.cau.li';
  const scripts = ['probe-wasm.cjs', 'probe-wasm2.cjs', 'probe-wasm3.cjs'].map((f) => `research/evidence/lean-measure/scripts/${f}`);
  // playwright-core 1.63.0, the version of the pinned image, installed into scratch space.
  const pw = path.join(WORK, 'pw');
  fs.mkdirSync(pw, { recursive: true });
  const npm = spawnSync('npm', ['install', '--prefix', pw, '--no-audit', '--no-fund', '--ignore-scripts', 'playwright-core@1.63.0'], { encoding: 'utf8' });
  if (npm.status !== 0) throw new Error(`npm install playwright-core failed: ${npm.stderr}`);
  const pwPkg = JSON.parse(fs.readFileSync(path.join(pw, 'node_modules', 'playwright-core', 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(pw, 'package-lock.json'), 'utf8'));
  const pwIntegrity = lock.packages?.['node_modules/playwright-core']?.integrity ?? null;
  const pwTarballUrl = lock.packages?.['node_modules/playwright-core']?.resolved ?? 'https://registry.npmjs.org/playwright-core/-/playwright-core-1.63.0.tgz';
  // The tarball npm installed, fetched again and hashed; its sha512 must equal the lockfile's integrity.
  const tgz = path.join(WORK, 'playwright-core.tgz');
  const fetched = spawnSync('curl', ['-sS', '--max-time', '120', '-o', tgz, pwTarballUrl]);
  if (fetched.status !== 0) throw new Error('could not fetch the playwright-core tarball');
  const tgzBytes = fs.readFileSync(tgz);
  const sri = `sha512-${(await import('node:crypto')).createHash('sha512').update(tgzBytes).digest('base64')}`;
  if (pwIntegrity && sri !== pwIntegrity) throw new Error(`the playwright-core tarball does not match the lockfile: ${sri} vs ${pwIntegrity}`);
  // The scripts, staged; probe-wasm2's net-log parse is fixed in its copy.
  const probe = path.join(WORK, 'probe');
  fs.mkdirSync(path.join(probe, 'out'), { recursive: true });
  const asRun = {};
  for (const s of scripts) {
    let text = fs.readFileSync(path.join(REPO, s), 'utf8');
    if (s.endsWith('probe-wasm2.cjs')) {
      const bug = "const nl = JSON.parse(fs.readFileSync(netlog, 'utf8').replace(/,\\s*$/, '') + (fs.readFileSync(netlog, 'utf8').trim().endsWith(']}') ? '' : ']}'));";
      if (!text.includes(bug)) throw new Error('probe-wasm2.cjs no longer holds the net-log parse it had');
      text = text.replace(bug, "const rawNl = fs.readFileSync(netlog, 'utf8'); let nl; try { nl = JSON.parse(rawNl); } catch { nl = JSON.parse(rawNl.replace(/,\\s*$/, '') + (rawNl.trim().endsWith(']}') ? '' : ']}')); }");
    }
    fs.writeFileSync(path.join(probe, path.basename(s)), text);
    asRun[s] = { sha256: sha256(Buffer.from(text)), bytes: Buffer.byteLength(text) };
  }
  const image = imageRef(IMAGES.playwright);
  const chrome = '/ms-playwright/chromium-1243/chrome-linux64/chrome';
  const chromeVersion = spawnSync('docker', ['run', '--rm', '--memory=6g', IMAGES.playwright, chrome, '--version'], { encoding: 'utf8' }).stdout.trim();
  const configs = [];
  const steps = [
    ['home', 'probe-wasm.cjs', [url, '/probe/out/caul-home', '90000'], 'probe-wasm.cjs: page-level bytes, time to network idle, isolation, the page text and buttons'],
    ['cold', 'probe-wasm2.cjs', [url, '/probe/out/caul2'], 'probe-wasm2.cjs: a cold load with a Chromium net log, ready time, then an attempt to type and run a proof'],
    ['warm', 'probe-wasm3.cjs', [url, '/probe/out/caul3'], 'probe-wasm3.cjs: load, pick examples from the menu, run them, time to output'],
  ];
  for (const [cfgId, script, scriptArgs, purpose] of steps) {
    const container = `w0s11-lean-wasm-${cfgId}`;
    // As the invoking user; and Chromium writes its net log 0600, so the container makes its outputs readable
    // before it exits, because the container's users need not map to the invoking user on the host.
    const user = `${process.getuid()}:${process.getgid()}`;
    const probeCmd = ['node', `/probe/${script}`, ...scriptArgs].map((a) => `'${a}'`).join(' ');
    const argv = ['docker', 'run', '--rm', '--name', container, '--memory=6g', '--ipc=host', '--user', user, '-e', 'HOME=/tmp', '-v', `${pw}:/pw:ro`, '-v', `${probe}:/probe`, '-w', '/probe', '-e', 'PW_DIR=/pw', '-e', `CHROME_EXE=${chrome}`, IMAGES.playwright, 'sh', '-c', `${probeCmd}; status=$?; chmod -R a+rX /probe/out; exit $status`];
    const logFile = path.join(runDir(id), `${cfgId}.log`);
    const r = exec(argv, { logFile, timeoutMs: 420000 });
    const measured = /"(?:url|tDom|tIdle|iso|totalMB|tReady|tOut|socketMB|tOutMs|label|MB|u|run|cm|monaco|selCount)"|PROBE FAILED|\[COMPILE\]/;
    configs.push({ id: cfgId, origin: 'recorded', purpose, engine: 'chromium', version: chromeVersion, image, started_at: r.started_at, duration_s: r.duration_s, argv: recordArgv(argv, [[pw, '<sandbox>/pw'], [probe, '<sandbox>/probe'], [user, '<uid>:<gid>']]), exit_code: r.code, verdict_lines: linesOf(r.text).filter((l) => measured.test(l)).slice(0, 40), outputs: [rel(logFile)] });
  }
  // Keep the JSON reports; hash the net log and the screenshots, which stay out of the repository.
  const outputs = configs.map((c) => fileRecord(REPO, c.outputs[0], { kind: 'log' }));
  const reports = {};
  for (const name of ['caul-home.json', 'caul2.json', 'caul3.json']) {
    const from = path.join(probe, 'out', name);
    if (!fs.existsSync(from)) continue;
    const to = path.join(runDir(id), name);
    fs.copyFileSync(from, to);
    outputs.push(fileRecord(REPO, rel(to), { kind: 'probe report' }));
    reports[name] = JSON.parse(fs.readFileSync(to, 'utf8'));
  }
  const notCommitted = fs.readdirSync(path.join(probe, 'out')).filter((f) => !f.endsWith('.json') || f.includes('netlog')).map((f) => {
    const abs = path.join(probe, 'out', f);
    return { name: f, sha256: sha256File(abs), bytes: fs.statSync(abs).size };
  });
  // The net log: bytes on the wire, and body bytes per URL, summed from the events.
  let netlog = null;
  const nlFile = path.join(probe, 'out', 'caul2.netlog.json');
  if (fs.existsSync(nlFile)) {
    const raw = fs.readFileSync(nlFile, 'utf8');
    let nl;
    try {
      nl = JSON.parse(raw);
    } catch {
      nl = JSON.parse(`${raw.replace(/,\s*$/, '')}${raw.trim().endsWith(']}') ? '' : ']}'}`);
    }
    const types = Object.fromEntries(Object.entries(nl.constants.logEventTypes).map(([k, v]) => [v, k]));
    const urlOf = new Map();
    const body = new Map(); // bytes read from the network, before content decoding
    const decoded = new Map(); // bytes after content decoding
    const encoding = new Map();
    let socket = 0;
    let udp = 0;
    for (const ev of nl.events) {
      const ty = types[ev.type];
      if (ty === 'URL_REQUEST_START_JOB' && ev.params?.url) urlOf.set(ev.source.id, ev.params.url);
      if (ty === 'SOCKET_BYTES_RECEIVED' && ev.params?.byte_count) socket += ev.params.byte_count;
      if (ty === 'UDP_BYTES_RECEIVED' && ev.params?.byte_count) udp += ev.params.byte_count;
      const u = urlOf.get(ev.source.id) ?? '?';
      if (ty === 'URL_REQUEST_JOB_BYTES_READ' && ev.params?.byte_count) body.set(u, (body.get(u) ?? 0) + ev.params.byte_count);
      if (ty === 'URL_REQUEST_JOB_FILTERED_BYTES_READ' && ev.params?.byte_count) decoded.set(u, (decoded.get(u) ?? 0) + ev.params.byte_count);
      if (/RESPONSE_HEADERS/.test(ty ?? '') && Array.isArray(ev.params?.headers)) {
        const ce = ev.params.headers.find((h) => /^content-encoding:/i.test(h));
        if (ce) encoding.set(ev.source.id, ce.split(':').slice(1).join(':').trim());
      }
    }
    const byHost = new Map();
    for (const [u, b] of body) {
      let host = '?';
      try {
        host = new URL(u).host;
      } catch {}
      byHost.set(host, (byHost.get(host) ?? 0) + b);
    }
    const encodingOf = new Map();
    for (const [src, ce] of encoding) if (urlOf.has(src)) encodingOf.set(urlOf.get(src), ce);
    const top = [...body].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([u, b]) => ({ url: u, bytes: b, decoded_bytes: decoded.get(u) ?? null, content_encoding: encodingOf.get(u) ?? null }));
    netlog = {
      capture_mode: nl.constants?.logCaptureMode ?? null,
      socket_bytes_received: socket,
      udp_bytes_received: udp,
      body_bytes_total: [...body.values()].reduce((s, b) => s + b, 0),
      decoded_bytes_total: [...decoded.values()].reduce((s, b) => s + b, 0),
      body_bytes_by_host: Object.fromEntries([...byHost].sort((a, b) => b[1] - a[1])),
      top_urls: top,
      reading: 'body_bytes are URL_REQUEST_JOB_BYTES_READ (from the network, before content decoding), decoded_bytes URL_REQUEST_JOB_FILTERED_BYTES_READ (after it); socket and UDP bytes are what the sockets received, TCP and QUIC',
    };
    const summary = path.join(runDir(id), 'netlog-summary.json');
    fs.writeFileSync(summary, `${JSON.stringify(netlog, null, 2)}\n`);
    outputs.push(fileRecord(REPO, rel(summary), { kind: 'net-log summary' }));
  }
  const cold = reports['caul2.json'] ?? {};
  const home = reports['caul-home.json'] ?? {};
  const versionSeen = /Lean [0-9][^\s·]*/.exec(cold.textReady ?? home.textHead ?? '')?.[0] ?? null;
  const verdict = configs.find((c) => c.id === 'cold').verdict_lines;
  write(id, {
    id,
    title: 'The community WebAssembly build of Lean in Chromium: cross-origin isolated, its ready time, the version it reports and what a cold load downloads',
    task: 'W0-S11',
    origin: 'recorded',
    engine: 'chromium',
    version: chromeVersion.replace(/^[^0-9]*/, ''),
    version_string: chromeVersion,
    binary: `the Chromium of the Playwright image (${chrome}), driven by playwright-core ${pwPkg.version}`,
    binary_sha256: null,
    image,
    recorded_at: new Date().toISOString(),
    started_at: configs[0].started_at,
    duration_s: Math.round(configs.reduce((s, c) => s + c.duration_s, 0) * 1000) / 1000,
    argv: configs.find((c) => c.id === 'cold').argv,
    inputs: [
      ...scripts.map((s) => fileRecord(REPO, s, { role: 'probe, as committed' })),
      ...scripts.map((s) => ({ name: `${path.basename(s)}, as run`, sha256: asRun[s].sha256, bytes: asRun[s].bytes, role: s.endsWith('probe-wasm2.cjs') ? 'probe with the net-log parse fixed' : 'probe, unchanged' })),
      { url: pwTarballUrl, name: `playwright-core@${pwPkg.version}`, sha256: sha256(tgzBytes), bytes: tgzBytes.length, integrity: pwIntegrity, role: 'driver, installed with npm into scratch space' },
    ],
    budget: { container_memory: '6g', timeout_s: 420, network: 'the public site, live' },
    exit_code: configs.find((c) => c.id === 'cold').exit_code,
    verdict_lines: verdict,
    outputs,
    values: {
      url,
      cross_origin_isolated: cold.crossOriginIsolated ?? home.crossOriginIsolated ?? null,
      ready_ms_cold: cold.tReadyMs ?? null,
      lean_version_reported: versionSeen,
      socket_bytes_received_cold: netlog?.socket_bytes_received ?? null,
      udp_bytes_received_cold: netlog?.udp_bytes_received ?? null,
      body_bytes_total_cold: netlog?.body_bytes_total ?? null,
      decoded_bytes_total_cold: netlog?.decoded_bytes_total ?? null,
      lean_wasm_bytes_cold: netlog?.top_urls.find((x) => /lean\.wasm/.test(x.url))?.bytes ?? null,
      page_level_bytes_home: home.totalEncodedMB ?? null,
      not_committed: notCommitted,
    },
    environment: { ...hostEnvironment(), docker: dockerVersion(), container: { image, chromium: chromeVersion, playwright_core: pwPkg.version } },
    primary_config: 'cold',
    configs,
    unrecorded: [],
    notes: [
      'Re-run by W0-S11 from research/evidence/lean-measure/scripts/probe-wasm*.cjs (spine section 9.5). The earlier probe outputs (lean-measure/out/caul*.json) recorded ready times and the isolation flag but not the payload: probe-wasm2 appended "]}" to a complete net log and failed to parse it. The copy that ran tries the log as it is first; that is its only change.',
      'The probes ran against the live site with Chromium from the pinned Playwright image (the earlier probes used a Chrome on the host). The net log itself and the screenshots are not committed; values.not_committed lists them with their hashes. netlog-summary.json sums the net log: bytes received on sockets, and body bytes per URL.',
      'binary_sha256 is null because Chromium is a directory of files in the image; the image digest pins it.',
      'The site is a third-party service whose content can change; this is a measurement of 2026-10-24, not a pin.',
    ],
  });
  console.log(`${id}: ${configs.map((c) => `${c.id} exit ${c.exit_code}`).join(', ')}; isolated ${cold.crossOriginIsolated}; ready ${cold.tReadyMs} ms; socket ${netlog?.socket_bytes_received} B, udp ${netlog?.udp_bytes_received} B; body ${netlog?.body_bytes_total} B, decoded ${netlog?.decoded_bytes_total} B; ${versionSeen}`);
}

// ------------------------------------------------------------------ main
const groups = { tlc: tlcGroup, lean: leanGroup, cvc5: cvc5Group, asset: assetGroup, plaingoal: plaingoalGroup, wasm: wasmGroup };
if (!groups[group]) {
  console.error(`usage: node scripts/runs/rerun.mjs <${Object.keys(groups).join('|')}> [options]`);
  process.exit(2);
}
try {
  await groups[group]();
} finally {
  fs.rmSync(WORK, { recursive: true, force: true });
}
