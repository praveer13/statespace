#!/usr/bin/env node
// GATE-labs' happy path (W1-T43 in spirit; ARCHITECTURE.md section 13.5): a lab's zip, unpacked into an empty
// folder as a learner would, fails every built check; with the private solution laid over it, every built check
// passes and writes a receipt that `statespace receipt verify` accepts.
//
//   node scripts/labs/prove-labs.mjs LAB-1                          template-only mode
//   node scripts/labs/prove-labs.mjs LAB-1 --solutions DIR          full mode: DIR/<LAB-id>/ is laid over the
//                                                                    unpacked repository (its paths are the
//                                                                    learner repository's, labs/LAB-1/starter.py)
//
// Solutions never enter this repository: DIR is outside it, and the script refuses one inside it. A stage whose
// checks are not built yet (it writes no receipt and says so) is reported and skipped. It needs `uv`, which runs
// `uv run statespace check` in the unpacked folder exactly as labs/README.md section 4.1 tells a learner to.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { collect } from "./build-zips.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function unpack(id) {
  const dir = mkdtempSync(join(process.env.W0S11_SCRATCH ?? tmpdir(), `statespace-${id}-`));
  for (const [path, file] of collect(id).files) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), file.data, { mode: file.mode });
  }
  return dir;
}

function check(dir, target) {
  const done = spawnSync("uv", ["run", "--quiet", "statespace", "check", target, "--json", "--assisted", "none", "--agent", "no"], { cwd: dir, encoding: "utf8" });
  try {
    return JSON.parse(done.stdout);
  } catch {
    throw new Error(`statespace check ${target} printed no JSON (exit ${done.status}): ${(done.stderr || done.stdout).trim().split("\n").slice(-3).join(" | ")}`);
  }
}

function verify(dir, receipt) {
  const done = spawnSync("uv", ["run", "--quiet", "statespace", "receipt", "verify", receipt], { cwd: dir, encoding: "utf8" });
  return done.status === 0;
}

function main(argv) {
  const at = argv.indexOf("--solutions");
  const solutions = at >= 0 ? resolve(argv[at + 1] ?? "") : null;
  const ids = argv.filter((a, i) => !a.startsWith("--") && (at < 0 || i !== at + 1));
  if (!ids.length) {
    process.stderr.write("usage: node scripts/labs/prove-labs.mjs LAB-<n> ... [--solutions DIR]\n");
    return 2;
  }
  if (solutions && !relative(REPO, solutions).startsWith("..")) {
    process.stderr.write("prove-labs: the solutions folder is inside the course repository; solutions never enter it\n");
    return 2;
  }
  let failed = 0;
  const fail = (line) => {
    failed++;
    process.stdout.write(`  FAIL  ${line}\n`);
  };
  for (const id of ids) {
    const n = id.split("-")[1];
    process.stdout.write(`${id} (${solutions ? "full mode" : "template-only mode"})\n`);
    const dir = unpack(id);
    try {
      const template = check(dir, `lab${n}`);
      const built = [];
      for (const stage of template.stages) {
        if (stage.problem) {
          process.stdout.write(`  skip  ${stage.stage}: ${stage.problem}\n`);
          continue;
        }
        built.push(stage.stage);
        for (const c of stage.checks) {
          if (c.passed) fail(`${c.id} passes on the template, so it establishes nothing about the learner's work`);
          else process.stdout.write(`  ok    ${c.id} fails on the template${c.suspect ? `, suspecting ${c.suspect}` : ""}: ${c.message}\n`);
        }
      }
      if (solutions) {
        const source = join(solutions, id);
        if (!existsSync(source)) {
          fail(`no private solution at ${source}`);
          continue;
        }
        cpSync(source, dir, { recursive: true });
        for (const stageId of built) {
          const result = check(dir, `lab${stageId.split("-")[1]}`);
          const [stage] = result.stages;
          for (const c of stage.checks) {
            if (!c.passed) fail(`${c.id} fails on the private solution: ${c.message}`);
            else process.stdout.write(`  ok    ${c.id} passes on the private solution: ${c.message}\n`);
          }
          if (!stage.receipt) fail(`${stageId} wrote no receipt on the private solution`);
          else if (!verify(dir, stage.receipt)) fail(`${stageId}'s receipt ${stage.receipt} does not verify`);
          else process.stdout.write(`  ok    ${stageId} wrote ${stage.receipt}, and statespace receipt verify accepts it\n`);
        }
      }
    } catch (error) {
      fail(error.message);
    } finally {
      if (!process.env.STATESPACE_KEEP) rmSync(dir, { recursive: true, force: true });
      else process.stdout.write(`  kept  ${dir}\n`);
    }
  }
  process.stdout.write(failed ? `prove-labs: ${failed} problem${failed === 1 ? "" : "s"}\n` : "prove-labs: ok\n");
  return failed ? 1 : 0;
}

process.exit(main(process.argv.slice(2)));
