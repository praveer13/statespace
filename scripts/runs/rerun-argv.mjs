#!/usr/bin/env node
// Re-execute a recorded run from its own argv, for records whose configurations ran one container over a staged copy
// of runs/<RUN-id>/inputs/ or runs/<RUN-id>/cells/ (the `<sandbox>/work:/w:ro` mount of the W1 follow-up records).
//
//   node scripts/runs/rerun-argv.mjs RUN-lean-stuck [RUN-...]     re-run, compare, write
//   node scripts/runs/rerun-argv.mjs --check RUN-lean-stuck        re-run and compare; write nothing
//   --drop-recorder-lines                                          also drop verdict lines the recorder added and no
//                                                                  log holds ("== <config>: <command>", "-- exit N")
//
// For each configuration it stages the record's inputs/ (else cells/) folder in a scratch directory, replaces <sandbox> in the argv,
// runs the argv with stdout and stderr in one stream (as the logs were written), and compares the new log with the
// committed one. A record whose logs all match keeps its verdict lines and values; the logs are rewritten, and every
// hash, size, start time, duration, exit code and recorded_at is refreshed from this execution. A record whose logs
// differ is not written: the differences are printed, because new output needs a person to re-read the verdict lines.
//
// A tool bump is W1-T29's job (`statespace run <RUN-id>`); this re-runs the recorded pins only.
// Exit status: 0 every record re-ran and matched; 1 a log differed or a run failed to start; 2 usage.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REPO, sha256File } from './registry.mjs';

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const DROP = args.includes('--drop-recorder-lines');
/** The recorder's own annotation lines, which the tool never prints. */
const RECORDER_LINE = /^(?:== [\w.-]+: .+|-- exit -?\d+)$/;
const ids = args.filter((a) => /^RUN-[a-z0-9-]+$/.test(a));
if (ids.length === 0) {
  console.error('usage: node scripts/runs/rerun-argv.mjs [--check] RUN-id ...');
  process.exit(2);
}

const rel = (p) => path.relative(REPO, p).split(path.sep).join('/');
const fileEntry = (p, extra) => ({ path: p, sha256: sha256File(path.join(REPO, p)), bytes: fs.statSync(path.join(REPO, p)).size, ...extra });

function rerun(id) {
  const recordPath = path.join(REPO, 'runs', `${id}.json`);
  const doc = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  const configs = doc.configs ?? [];
  if (configs.length === 0) throw new Error(`${id}: no configurations`);
  const inputsDir = ['inputs', 'cells'].map((d) => path.join(REPO, 'runs', id, d)).find((d) => fs.existsSync(d));
  if (!inputsDir) throw new Error(`${id}: no runs/${id}/inputs/ or cells/ to stage`);
  const scratch = fs.mkdtempSync(path.join(process.env.RERUN_SCRATCH ?? os.tmpdir(), 'rerun-argv-'));
  const work = path.join(scratch, 'work');
  fs.cpSync(inputsDir, work, { recursive: true });
  fs.chmodSync(work, 0o755);

  const results = [];
  for (const cfg of configs) {
    const argv = cfg.argv.map((a) => a.replaceAll('<sandbox>', scratch));
    if (argv[0] !== 'docker' || !cfg.argv.some((a) => a.startsWith('<sandbox>/work:'))) throw new Error(`${id}/${cfg.id}: not a staged container run`);
    const logs = (cfg.outputs ?? []).map((o) => (typeof o === 'string' ? o : o.path));
    if (logs.length !== 1) throw new Error(`${id}/${cfg.id}: expected one log output, found ${logs.length}`);
    const out = path.join(scratch, `${cfg.id}.log`);
    const fd = fs.openSync(out, 'w');
    const started = new Date();
    const t0 = process.hrtime.bigint();
    const r = spawnSync(argv[0], argv.slice(1), { stdio: ['ignore', fd, fd], timeout: 600000 });
    const duration_s = Math.round((Number(process.hrtime.bigint() - t0) / 1e9) * 1000) / 1000;
    fs.closeSync(fd);
    const text = fs.readFileSync(out, 'utf8').replaceAll(scratch, '<sandbox>');
    const committed = fs.readFileSync(path.join(REPO, logs[0]), 'utf8');
    results.push({ cfg, log: logs[0], text, same: text === committed, exit_code: r.status, started, duration_s, error: r.error });
  }
  fs.rmSync(scratch, { recursive: true, force: true });

  const bad = results.filter((x) => !x.same || x.exit_code !== x.cfg.exit_code || x.error);
  for (const x of results) console.log(`  ${x.same && x.exit_code === x.cfg.exit_code ? 'same' : 'DIFF'}  ${id}/${x.cfg.id}  exit ${x.exit_code} (recorded ${x.cfg.exit_code}), ${x.duration_s} s`);
  if (bad.length > 0) {
    for (const x of bad) {
      console.log(`--- ${x.log} (committed)\n+++ re-run`);
      console.log(x.error ? String(x.error) : x.text.slice(0, 2000));
    }
    return false;
  }
  if (CHECK) return true;

  for (const x of results) {
    fs.writeFileSync(path.join(REPO, x.log), x.text);
    x.cfg.started_at = x.started.toISOString();
    x.cfg.duration_s = x.duration_s;
    x.cfg.exit_code = x.exit_code;
    x.cfg.inputs = (x.cfg.inputs ?? []).map((i) => fileEntry(i.path, { role: i.role }));
  }
  let dropped = 0;
  if (DROP) {
    const logged = new Set(results.flatMap((x) => x.text.split('\n')));
    const keep = (lines) => (lines ?? []).filter((l) => !(RECORDER_LINE.test(l) && !logged.has(l)) || (dropped++, false));
    for (const c of configs) c.verdict_lines = keep(c.verdict_lines);
    doc.verdict_lines = keep(doc.verdict_lines);
  }
  doc.inputs = (doc.inputs ?? []).map((i) => fileEntry(i.path, { role: i.role }));
  doc.outputs = (doc.outputs ?? []).map((o) => (typeof o === 'string' ? o : fileEntry(o.path, { kind: o.kind })));
  const primary = configs.find((c) => c.id === doc.primary_config) ?? configs.find((c) => JSON.stringify(c.argv) === JSON.stringify(doc.argv));
  if (primary) {
    doc.started_at = primary.started_at;
    doc.duration_s = primary.duration_s;
    doc.exit_code = primary.exit_code;
  }
  doc.recorded_at = new Date().toISOString();
  const why = DROP
    ? `; ${dropped} verdict line(s) the recorder had added ("== <config>: <command>", "-- exit N"), which the tool never prints and no log holds, were dropped, so every verdict line is now a line of a log`
    : ', after edits to the files it cites left the executed code unchanged';
  const note = `Re-executed on ${doc.recorded_at.slice(0, 10)} with scripts/runs/rerun-argv.mjs, from the same argv and the same staged inputs; every log matched the earlier recording byte for byte${why}.`;
  doc.notes = [...(doc.notes ?? []).filter((n) => !n.startsWith('Re-executed on ')), note];
  fs.writeFileSync(recordPath, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`  wrote ${rel(recordPath)}`);
  return true;
}

let ok = true;
for (const id of ids) {
  try {
    ok = rerun(id) && ok;
  } catch (e) {
    console.error(`  FAIL  ${e.message}`);
    ok = false;
  }
}
process.exit(ok ? 0 : 1);
