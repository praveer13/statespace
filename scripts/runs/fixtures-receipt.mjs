#!/usr/bin/env node
// Write the receipt@1 fixtures, schemas/fixtures/receipt/valid/ and invalid/ with invalid/index.json (W0-S11).
//
//   node scripts/runs/fixtures-receipt.mjs
//
// GATE-schema reads them (schemas/README.md section 5). Each invalid fixture is a valid one with one fault,
// and index.json names the keyword and path both validators must report. Statement and tool hashes are
// real where the fixture names a real file or binary (files in research/, the pinned tla2tools jar, binaries
// as recorded runs hash them); hashes of the fictional files a fixture lab holds are hashes of short texts.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = process.argv[2] ?? path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const dir = path.join(root, 'schemas', 'fixtures', 'receipt');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(path.join(dir, 'valid'), { recursive: true });
fs.mkdirSync(path.join(dir, 'invalid'), { recursive: true });
const write = (sub, name, doc) => fs.writeFileSync(path.join(dir, sub, name), JSON.stringify(doc, null, 2) + '\n');

// Real hashes: files in research/ (statement hash equals file hash for these, each ending in one newline),
// the tla2tools 1.8.0 jar pin, the z3-solver 5.3.1.0 manylinux wheel (PyPI digest in research/evidence/A5v2/z3pypi.json),
// bin/lean of the 4.35.0 toolchain and the cvc5 1.4.2 binary (as RUN-replay-gen and RUN-scaffold record them).
const H = {
  doubleSpendTla: '2dd02b13ef0381398044662e06ab3dd74083a2bdfd5d4eb32722721339c3bc97',
  doubleSpendCfg: '8f509a37e9582f12b8097df139697600c35b7ddab2a904990bb5c166b4babc69',
  challengeLean: '97070e165cddcc721497a4a587265f37033c71ec5ab7ced23a367a26018fc446',
  guardSmt2: 'ecd4abd06a716df4ef3667c1976b260331a9a199c2ef3cfd96eaeebddceeacda',
  tla180: '5bd7b64db99ae4c6c35f290de5e809c0ee41af43f8699cf696099ffb6452b1e2',
  z3wheel: '3e2e00bc80e776849d917daa194f33759ffa61d6528a859cfc4923ee3277a386',
  lean: 'bf8d54e4714cc4b03d3f6bb34c83b7202b87e49c8bfcbff6895c085bb90ceb38',
  cvc5: '6aecddf466552b83bb5883756c7955e0c9d5ddcc6d7f45b48c2f6e06a741b102',
  pg18: '74935e72241653ca55e0414067e6d8763aceb8a810eb51b452253ec3dcfc4336',
};
const env = { devcontainer: null, os: { name: 'Linux', version: '6.12.63', arch: 'x86_64' }, sandbox: 'off' };
const prov = { assisted: 'none', agent: false, guard: 'on' };

const z3 = {
  schema: 'statespace/receipt@1', lab: 'LAB-1', stage: 'LAB-1.3', lane: 'reported', createdAt: '2026-10-24T14:02:11Z',
  cli: { name: 'statespace', version: '0.0.0' },
  environment: env,
  tools: [{ name: 'z3', version: '5.3.1', sha256: H.z3wheel, pinned: true }, { name: 'cvc5', version: '1.4.2', sha256: H.cvc5, pinned: true }],
  statements: [{ path: 'claims/guard.smt2', kind: 'smt2', sha256: H.guardSmt2 }],
  runs: [
    { step: 'z3', engine: 'z3', version: '5.3.1', argv: ['z3', '-smt2', 'rlimit=5000000', 'claims/guard.smt2'], inputSha256: H.guardSmt2, budget: { rlimit: 5000000 }, exitCode: 0, verdictLines: ['unsat'], verdict: 'unsat' },
    { step: 'cross-check', engine: 'cvc5', version: '1.4.2', argv: ['cvc5', '--lang=smt2', 'claims/guard.smt2'], inputSha256: H.guardSmt2, budget: {}, exitCode: 0, verdictLines: ['unsat'], verdict: 'unsat' },
  ],
  z3: { smtlibSha256: H.guardSmt2, entry: 'cli', rlimit: 5000000, verdict: 'unsat' },
  checks: [{ id: 'LAB-1.c3', pass: true }],
  provenance: prov,
  claims: [{ template: 'CL-1.1' }],
  tcb: [{ component: 'Z3 5.3.1 and cvc5 1.4.2', status: 'trusted' }, { component: 'the SMT-LIB encoding of the guard', status: 'trusted' }],
};
write('valid', 'z3-unsat-cross-checked.json', z3);

const lean = {
  schema: 'statespace/receipt@1', lab: 'LAB-2', stage: 'LAB-2.2', lane: 'reported', createdAt: '2026-10-24T14:10:00+01:00',
  cli: { name: 'statespace', version: '0.0.0' },
  environment: {
    devcontainer: 'ss-lean:4.35.0@sha256:58d9eb9929bf5489dc7dab509ebc9d861cf3cf5bda968b8255c37a71ca740cb3',
    os: { name: 'Linux', arch: 'x86_64' },
    sandbox: 'failed',
    sandboxDetail: 'bwrap: No permissions to create new namespace, likely because the kernel does not allow non-privileged user namespaces. See <https://deb.li/bubblewrap> or <file:///usr/share/doc/bubblewrap/README.Debian.gz>.',
  },
  tools: [{ name: 'lean', version: '4.35.0', sha256: H.lean, pinned: true }],
  statements: [{ path: 'Challenge.lean', kind: 'lean-challenge', sha256: H.challengeLean }],
  runs: [
    { step: 'build', engine: 'lake', version: '5.0.0-src+eb6cafb', argv: ['lake', 'build'], inputSha256: H.challengeLean, budget: {}, exitCode: 0, verdictLines: ['Build completed successfully (5 jobs).'], verdict: 'passed' },
    { step: 'comparator', engine: 'lake', version: '5.0.0-src+eb6cafb', argv: ['lake', 'comparator', '--inadvisably-no-sandbox'], inputSha256: H.challengeLean, budget: {}, exitCode: 0, verdictLines: ['Lean default kernel accepts the solution', 'Your solution is okay!'], verdict: 'accepted' },
  ],
  lean: {
    toolchain: 'leanprover/lean4:v4.35.0',
    challengeSha: H.challengeLean,
    permittedAxioms: ['propext', 'Quot.sound', 'Classical.choice'],
    checkers: [{ name: 'Lean default kernel', version: '4.35.0', verdict: 'accepts' }, { name: 'nanoda', version: '4.35.0', verdict: 'not-run' }],
    theorems: [{ name: 'transfer_conserves', axioms: ['propext', 'Quot.sound'] }],
    nativeAxioms: [],
    sorryCount: 0,
    automation: { manualMode: false, grind: false, omega: true, decide: false },
    statementCheck: 'comparator',
    lints: [],
  },
  checks: [{ id: 'LAB-2.c2', pass: true }],
  provenance: { assisted: 'explain', agent: true, guard: 'on' },
  claims: [{ template: 'CL-2.1', id: 'transfer-conserves' }],
  tcb: [{ component: 'the Lean 4.35.0 kernel', status: 'trusted' }, { component: 'transfer_conserves', status: 'proved' }],
};
write('valid', 'lean-comparator-sandbox-failed.json', lean);

const tlc = {
  schema: 'statespace/receipt@1', lab: 'LAB-5', stage: 'LAB-5.1', lane: 'reported', createdAt: '2026-10-24T15:00:00Z',
  cli: { name: 'statespace', version: '0.0.0' },
  environment: { devcontainer: 'ss-lean:4.35.0@sha256:58d9eb9929bf5489dc7dab509ebc9d861cf3cf5bda968b8255c37a71ca740cb3', os: { name: 'Linux', version: '6.12.63', arch: 'x86_64' }, sandbox: 'off' },
  tools: [{ name: 'tlc', version: '2026.10.20.183001', sha256: H.tla180, pinned: true }],
  statements: [{ path: 'claims/DoubleSpend.tla', kind: 'tla', sha256: H.doubleSpendTla }],
  runs: [{
    engine: 'tlc', version: '2026.10.20.183001',
    argv: ['java', '-jar', 'tla2tools.jar', '-workers', '1', '-config', 'claims/DoubleSpend.cfg', 'claims/DoubleSpend.tla'],
    inputSha256: H.doubleSpendTla, budget: { workers: 1 }, exitCode: 11,
    verdictLines: ['Error: Deadlock reached.', '11 states generated, 10 distinct states found, 3 states left on queue.', 'The depth of the complete state graph search is 4.'],
    verdict: 'deadlock',
  }],
  tlc: {
    specSha256: H.doubleSpendTla, configSha256: H.doubleSpendCfg,
    constants: { Init: '100', Amount: '80', Workers: '{w1, w2}' },
    flags: ['-workers 1'], distinctStates: 10, depth: 4, result: 'deadlock', complete: false,
  },
  checks: [{ id: 'LAB-5.c1', pass: false }],
  provenance: prov,
};
write('valid', 'tlc-deadlock-stop.json', tlc);

const sqlText = 'select count(*) from acct where bal < 0;\n';
const historyText = 'history: rmw\n';
const pg = {
  schema: 'statespace/receipt@1', lab: 'LAB-6', stage: 'LAB-6.4', lane: 'reported', createdAt: '2026-10-24T16:00:00Z',
  cli: { name: 'statespace', version: '0.0.0' },
  environment: env,
  tools: [{ name: 'postgres', version: 'PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2)', sha256: H.pg18 }],
  statements: [{ path: 'claims/no-negative-balance.sql', kind: 'sql', sha256: sha(sqlText) }],
  runs: [{ step: 'isorun', engine: 'postgres', version: '18.6', argv: ['statespace', 'isorun', 'histories/rmw.yaml'], inputSha256: sha(historyText), budget: {}, exitCode: 0, verdictLines: ['SerializationFailure [40001] could not serialize access due to concurrent update'], verdict: 'passed' }],
  pg: {
    serverVersion: 'PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2)', isolationLevel: 'repeatable-read', historySha256: sha(historyText),
    sqlstateClasses: { '40001': 1 },
    rls: { roleMode: 'non-owner', policySha256: sha('create policy own on acct using (owner = current_user);\n'), readBacks: 4, disagreements: 0 },
  },
  checks: [{ id: 'LAB-6.c4', pass: true }],
  provenance: prov,
};
write('valid', 'pg-isorun-rls.json', pg);

const traces = {
  schema: 'statespace/receipt@1', lab: 'LAB-8', stage: 'LAB-8.3', lane: 'reported', createdAt: '2026-10-24T17:00:00Z',
  cli: { name: 'statespace', version: '0.0.0' },
  environment: env,
  tools: [{ name: 'tlc', version: '2026.10.20.183001', sha256: H.tla180, pinned: true }],
  statements: [{ path: 'claims/Outbox.tla', kind: 'tla', sha256: sha('---- MODULE Outbox ----\n====\n') }],
  runs: [{ step: 'trace-validate', engine: 'tlc', version: '2026.10.20.183001', argv: ['statespace', 'trace', 'validate', 'claims/Outbox.tla', 'traces/'], inputSha256: sha('1\n2\n3\n'), budget: { workers: 1, seed: 3 }, exitCode: 1, verdictLines: ['trace traces/seed-2.ndjson: not conforming at line 7'], verdict: 'rejected' }],
  traces: {
    n: 3, seedListSha256: sha('1\n2\n3\n'),
    verdicts: [
      { trace: 'traces/seed-1.ndjson', seed: 1, verdict: 'accepted', firstNonConformingLine: null },
      { trace: 'traces/seed-2.ndjson', seed: 2, verdict: 'rejected', firstNonConformingLine: 7 },
      { trace: 'traces/seed-3.ndjson', seed: 3, verdict: 'partial', firstNonConformingLine: 4 },
    ],
  },
  checks: [{ id: 'LAB-8.c3', pass: false }],
  provenance: { assisted: 'code', agent: true, guard: 'off' },
};
write('valid', 'trace-validation.json', traces);

const datalog = {
  schema: 'statespace/receipt@1', lab: 'LAB-7', stage: 'LAB-7.2', lane: 'reported', createdAt: '2026-10-24T18:00:00Z',
  cli: { name: 'statespace', version: '0.0.0' },
  environment: { devcontainer: null, os: { name: 'Linux', arch: 'x86_64' }, sandbox: 'off' },
  tools: [{ name: 'souffle', version: '2.5', sha256: 'e8e4d8bff0b8377d2d42ae30886121a61061ec0c8bb948f1f5129e09aecfa9a1', pinned: true }],
  statements: [{ path: 'claims/access.yaml', kind: 'yaml', sha256: sha('claim: canread\n') }],
  runs: [{ engine: 'souffle', version: '2.5', argv: ['souffle', '-D', 'out/', 'access.dl'], inputSha256: sha('canread(u, d) :- member(u, d).\n'), budget: {}, exitCode: 0, verdictLines: ['canread: 2 tuples'], verdict: 'passed' }],
  datalog: { engine: 'souffle@2.5', relations: { canread: sha('1\t3\n') }, derivations: { checked: 2, invalid: 0 }, generator: { worlds: 1 } },
  pairs: { witnessSha256: sha('w\n'), relationSha256: sha('r\n'), observerSha256: sha('o\n'), bound: 'two users, three documents' },
  goldens: { poolSha: sha('pool\n'), n: 2, passed: 2, failed: 0, noVerdict: 0 },
  checks: [{ id: 'LAB-7.c2', pass: true }],
  provenance: prov,
};
write('valid', 'datalog-pairs-goldens.json', datalog);

const self = {
  schema: 'statespace/receipt@1', lab: 'LAB-3', stage: 'LAB-3.1', lane: 'self-assessed', createdAt: '2026-10-24T19:00:00Z',
  cli: { name: 'statespace', version: '0.0.0' },
  environment: env, tools: [], statements: [], runs: [],
  checks: [{ id: 'LAB-3.c1', pass: false }],
  provenance: prov,
};
write('valid', 'self-assessed-minimal.json', self);

// ---- invalid: one fault each, on a copy of a valid base
const clone = (o) => structuredClone(o);
const index = [];
const bad = (file, base, mutate, instancePath, keyword) => {
  const doc = clone(base);
  mutate(doc);
  write('invalid', file, doc);
  index.push({ file, instancePath, keyword });
};
bad('lane-rechecked-here.json', z3, (d) => { d.lane = 'rechecked-here'; }, '/lane', 'enum');
bad('missing-provenance.json', z3, (d) => { delete d.provenance; }, '', 'required');
bad('stamp-typed-in.json', z3, (d) => { d.stamp = '[P]'; }, '', 'additionalProperties');
bad('wrong-schema-tag.json', z3, (d) => { d.schema = 'statespace/receipt@2'; }, '/schema', 'const');
bad('stage-without-number.json', z3, (d) => { d.stage = 'LAB-1'; }, '/stage', 'pattern');
bad('created-at-without-zone.json', z3, (d) => { d.createdAt = '2026-10-24T14:02:11'; }, '/createdAt', 'pattern');
bad('cli-wrong-name.json', z3, (d) => { d.cli.name = 'bench'; }, '/cli/name', 'const');
bad('tool-sha-uppercase.json', z3, (d) => { d.tools[0].sha256 = d.tools[0].sha256.toUpperCase(); }, '/tools/0/sha256', 'pattern');
bad('tool-without-sha.json', z3, (d) => { delete d.tools[0].sha256; }, '/tools/0', 'required');
bad('statement-absolute-path.json', z3, (d) => { d.statements[0].path = '/srv/lab/claims/guard.smt2'; }, '/statements/0/path', 'pattern');
bad('statement-unknown-kind.json', z3, (d) => { d.statements[0].kind = 'coq'; }, '/statements/0/kind', 'enum');
bad('statement-sha-trailing-newline.json', z3, (d) => { d.statements[0].sha256 = `${d.statements[0].sha256}\n`; }, '/statements/0/sha256', 'pattern');
bad('run-without-argv.json', z3, (d) => { delete d.runs[0].argv; }, '/runs/0', 'required');
bad('run-empty-verdict-lines.json', z3, (d) => { d.runs[0].verdictLines = []; }, '/runs/0/verdictLines', 'minItems');
bad('run-unknown-verdict.json', z3, (d) => { d.runs[0].verdict = 'proved'; }, '/runs/0/verdict', 'enum');
bad('run-budget-timeout.json', z3, (d) => { d.runs[0].budget = { rlimit: 5000000, timeout: 2000 }; }, '/runs/0/budget', 'additionalProperties');
bad('run-exit-code-string.json', z3, (d) => { d.runs[0].exitCode = '0'; }, '/runs/0/exitCode', 'type');
bad('environment-without-sandbox.json', z3, (d) => { delete d.environment.sandbox; }, '/environment', 'required');
bad('sandbox-unknown.json', z3, (d) => { d.environment.sandbox = 'partial'; }, '/environment/sandbox', 'enum');
bad('os-without-arch.json', z3, (d) => { delete d.environment.os.arch; }, '/environment/os', 'required');
bad('z3-unknown-entry.json', z3, (d) => { d.z3.entry = 'wasm'; }, '/z3/entry', 'enum');
bad('check-bad-id.json', z3, (d) => { d.checks[0].id = 'LAB-1.3'; }, '/checks/0/id', 'pattern');
bad('claim-empty.json', z3, (d) => { d.claims = [{}]; }, '/claims/0', 'minProperties');
bad('provenance-without-guard.json', z3, (d) => { delete d.provenance.guard; }, '/provenance', 'required');
bad('provenance-assisted-unknown.json', z3, (d) => { d.provenance.assisted = 'some'; }, '/provenance/assisted', 'enum');
bad('tcb-unknown-status.json', z3, (d) => { d.tcb[1].status = 'assumed'; }, '/tcb/1/status', 'enum');
bad('lean-negative-sorry-count.json', lean, (d) => { d.lean.sorryCount = -1; }, '/lean/sorryCount', 'minimum');
bad('lean-checker-unknown-verdict.json', lean, (d) => { d.lean.checkers[0].verdict = 'accepted'; }, '/lean/checkers/0/verdict', 'enum');
bad('lean-without-theorems.json', lean, (d) => { delete d.lean.theorems; }, '/lean', 'required');
bad('tlc-without-complete.json', tlc, (d) => { delete d.tlc.complete; }, '/tlc', 'required');
bad('tlc-constant-number.json', tlc, (d) => { d.tlc.constants.Init = 100; }, '/tlc/constants/Init', 'type');
bad('pg-negative-sqlstate-count.json', pg, (d) => { d.pg.sqlstateClasses['40001'] = -1; }, '/pg/sqlstateClasses/40001', 'minimum');
bad('pg-isolation-unknown.json', pg, (d) => { d.pg.isolationLevel = 'snapshot'; }, '/pg/isolationLevel', 'enum');
bad('traces-line-zero.json', traces, (d) => { d.traces.verdicts[1].firstNonConformingLine = 0; }, '/traces/verdicts/1/firstNonConformingLine', 'minimum');
bad('traces-unknown-verdict.json', traces, (d) => { d.traces.verdicts[0].verdict = 'conforming'; }, '/traces/verdicts/0/verdict', 'enum');
bad('datalog-engine-without-version.json', datalog, (d) => { d.datalog.engine = 'souffle'; }, '/datalog/engine', 'pattern');
bad('goldens-without-no-verdict.json', datalog, (d) => { delete d.goldens.noVerdict; }, '/goldens', 'required');
bad('pairs-empty-bound.json', datalog, (d) => { d.pairs.bound = ''; }, '/pairs/bound', 'minLength');
fs.writeFileSync(path.join(dir, 'invalid', 'index.json'), '[\n' + index.map((e) => '  ' + JSON.stringify(e)).join(',\n') + '\n]\n');
console.log('receipt fixtures:', fs.readdirSync(path.join(dir, 'valid')).length, 'valid,', index.length, 'invalid');
