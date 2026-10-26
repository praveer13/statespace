#!/usr/bin/env node
// GATE-labs (spine section 11.2; ARCHITECTURE.md section 13.5): every lab's zip, unpacked into an empty folder as a
// learner would, fails every built check on the template; with the private solution laid over it, every built
// check passes and each stage writes a receipt that `statespace receipt verify` accepts.
//
//   node scripts/verify-labs.mjs                                  every labs/LAB-*/ folder, template-only mode
//   node scripts/verify-labs.mjs LAB-2 LAB-9                      the named labs
//   node scripts/verify-labs.mjs --solutions DIR                  full mode: DIR/<LAB-id>/ is laid over the unpacked
//                                                                 repository (its paths are the learner's)
//   --lane bench (default)  run the checks in the pinned Bench image, with a PostgreSQL 18.6 container beside it
//   --lane host             run `uv run statespace check` on this machine (scripts/labs/prove-labs.mjs); stages
//                           whose tools are missing here are skipped, not failed
//   --work DIR              where the unpacked repositories and the uv cache go (default: the OS temporary folder)
//
// Both lanes run the command line exactly as labs/README.md section 4.1 tells a learner to: `uv run statespace check`
// in the unpacked repository, which installs the zip's .statespace/cli with the pins of its pyproject.toml.
//
// Solutions never enter this repository: DIR must be outside it. In CI they come from the private companion
// repository through a read-only deploy key (ARCHITECTURE.md section 13.5); a fork without the key runs
// template-only mode, and GATE-release requires the full mode.
//
// A solution may carry `.gate/hooks.json`, {"before": {"LAB-7.7": ["python3", "-I", "fill-cards.py", "/w"]}}: each
// command runs in the Bench image at the repository root before that stage's full-mode check (a learner's act,
// such as writing claim cards from the receipts the earlier stages wrote). `.gate/` itself is not laid over.
//
// Lean stages run with STATESPACE_SANDBOX=off: bubblewrap cannot start in a default container, the receipt records
// the sandbox as off, and the sandbox is recorded, never required (spine section 9.2).

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { collect } from "./labs/build-zips.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const IMAGE = process.env.STATESPACE_BENCH_IMAGE ?? "statespace-bench@sha256:701be043775cc261e84a92fe985ef94d524617fdb3d53e2255187932d2ec0f9a";
const POSTGRES = "postgres:18@sha256:74935e72241653ca55e0414067e6d8763aceb8a810eb51b452253ec3dcfc4336";

function option(argv, name) {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : undefined;
}

function labIds() {
  return readdirSync(join(REPO, "labs"))
    .filter((name) => /^LAB-\d+$/.test(name))
    .sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]));
}

function unpack(id, work) {
  const dir = mkdtempSync(join(work, `statespace-${id}-`));
  for (const [path, file] of collect(id).files) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), file.data, { mode: file.mode | 0o200 });
  }
  return dir;
}

class BenchLane {
  constructor(cache) {
    this.cache = cache;
    mkdirSync(cache, { recursive: true });
    const tag = `ss-gate-labs-${process.pid}`;
    this.network = `${tag}-net`;
    this.pg = `${tag}-pg`;
    this.started = false;
  }

  start() {
    const net = spawnSync("docker", ["network", "create", this.network], { encoding: "utf8" });
    if (net.status !== 0) throw new Error(`docker network create failed: ${net.stderr.trim()}`);
    const pg = spawnSync("docker", ["run", "-d", "--rm", "--name", this.pg, "--network", this.network, "-e", "POSTGRES_HOST_AUTH_METHOD=trust", POSTGRES], { encoding: "utf8" });
    if (pg.status !== 0) throw new Error(`the PostgreSQL container did not start: ${pg.stderr.trim()}`);
    this.started = true;
    for (let i = 0; i < 60; i++) {
      const ready = spawnSync("docker", ["exec", this.pg, "pg_isready", "-U", "postgres", "-h", "127.0.0.1"], { encoding: "utf8" });
      if (ready.status === 0) return;
      spawnSync("sleep", ["1"]);
    }
    throw new Error("PostgreSQL did not become ready within 60 s");
  }

  stop() {
    if (this.started) spawnSync("docker", ["rm", "-f", this.pg], { encoding: "utf8" });
    spawnSync("docker", ["network", "rm", this.network], { encoding: "utf8" });
  }

  exec(dir, argv) {
    const run = spawnSync(
      "docker",
      [
        // The image runs as its own user (learner, uid 1000); the unpacked repository must be writable by it.
        "run", "--rm", "--memory=6g", "--network", this.network,
        "-e", `STATESPACE_PG_DSN=postgresql://postgres@${this.pg}:5432/postgres`,
        "-e", `PGHOST=${this.pg}`, "-e", "PGUSER=postgres", "-e", "PGPORT=5432",
        "-e", "STATESPACE_SANDBOX=off", "-e", `STATESPACE_BENCH_IMAGE=${IMAGE}`,
        "-e", "HOME=/tmp/home", "-e", "UV_CACHE_DIR=/uv-cache", "-e", "PYTHONDONTWRITEBYTECODE=1",
        "-v", `${dir}:/w`, "-v", `${this.cache}:/uv-cache`, "-w", "/w", IMAGE,
        ...argv,
      ],
      { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
    );
    return run;
  }

  check(dir, target) {
    return this.exec(dir, ["uv", "run", "--quiet", "statespace", "check", target, "--json", "--assisted", "none", "--agent", "no"]);
  }

  verify(dir, receipt) {
    return this.exec(dir, ["uv", "run", "--quiet", "statespace", "receipt", "verify", receipt]).status === 0;
  }
}

class HostLane {
  start() {}
  stop() {}
  exec(dir, argv) {
    return spawnSync(argv[0], argv.slice(1), { cwd: dir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  }
  check(dir, target) {
    return this.exec(dir, ["uv", "run", "--quiet", "statespace", "check", target, "--json", "--assisted", "none", "--agent", "no"]);
  }
  verify(dir, receipt) {
    return this.exec(dir, ["uv", "run", "--quiet", "statespace", "receipt", "verify", receipt]).status === 0;
  }
}

function parsed(done, target) {
  try {
    return JSON.parse(done.stdout);
  } catch {
    throw new Error(`statespace check ${target} printed no JSON (exit ${done.status}): ${(done.stderr || done.stdout || "").trim().split("\n").slice(-3).join(" | ")}`);
  }
}

function main(argv) {
  const solutionsArg = option(argv, "--solutions");
  const solutions = solutionsArg ? resolve(solutionsArg) : null;
  const laneName = option(argv, "--lane") ?? "bench";
  const work = resolve(option(argv, "--work") ?? process.env.W0S11_SCRATCH ?? tmpdir());
  const valued = new Set(["--solutions", "--lane", "--work"]);
  const ids = argv.filter((a, i) => !a.startsWith("--") && !valued.has(argv[i - 1]));
  if (!["bench", "host"].includes(laneName)) {
    process.stderr.write("verify-labs: --lane is bench or host\n");
    return 2;
  }
  if (solutions && !relative(REPO, solutions).startsWith("..")) {
    process.stderr.write("verify-labs: the solutions folder is inside the course repository; solutions never enter it\n");
    return 2;
  }
  const lane = laneName === "bench" ? new BenchLane(join(work, "uv-cache")) : new HostLane();
  const counts = { failed: 0, ok: 0, skipped: 0 };
  const say = (line) => process.stdout.write(`${line}\n`);
  const fail = (line) => {
    counts.failed++;
    say(`  FAIL  ${line}`);
  };
  const ok = (line) => {
    counts.ok++;
    say(`  ok    ${line}`);
  };
  const started = Date.now();
  say(`GATE-labs (${solutions ? "full mode" : "template-only mode"}, ${laneName} lane)`);
  mkdirSync(work, { recursive: true });
  try {
    lane.start();
    for (const id of ids.length ? ids : labIds()) {
      const n = id.split("-")[1];
      say(`${id}`);
      const t0 = Date.now();
      let dir;
      try {
        dir = unpack(id, work);
        const template = parsed(lane.check(dir, `lab${n}`), `lab${n}`);
        const built = [];
        for (const stage of template.stages) {
          if (stage.problem) {
            counts.skipped++;
            say(`  skip  ${stage.stage}: ${stage.problem}`);
            continue;
          }
          built.push(stage.stage);
          for (const c of stage.checks) {
            if (c.passed) fail(`${c.id} passes on the template, so it establishes nothing about the learner's work`);
            else ok(`${c.id} fails on the template${c.suspect ? `, suspecting your ${c.suspect}` : ""}`);
          }
        }
        if (solutions) {
          const source = join(solutions, id);
          if (!existsSync(source)) {
            fail(`no private solution at ${source}`);
            continue;
          }
          cpSync(source, dir, { recursive: true, filter: (src) => !relative(source, src).split(/[\\/]/).includes(".gate") });
          const hooksFile = join(source, ".gate", "hooks.json");
          const hooks = existsSync(hooksFile) ? JSON.parse(readFileSync(hooksFile, "utf8")).before ?? {} : {};
          for (const stageId of built) {
            if (hooks[stageId]) {
              const done = lane.exec(dir, hooks[stageId]);
              if (done.status !== 0) fail(`the solution's hook before ${stageId} failed: ${(done.stderr || done.stdout).trim().split("\n").slice(-2).join(" | ")}`);
            }
            const result = parsed(lane.check(dir, `lab${stageId.split("-")[1]}`), stageId);
            const [stage] = result.stages;
            if (stage.problem) {
              fail(`${stageId} ran on the template but not on the private solution: ${stage.problem}`);
              continue;
            }
            for (const c of stage.checks) {
              if (!c.passed) fail(`${c.id} fails on the private solution: ${c.message}`);
              else ok(`${c.id} passes on the private solution`);
            }
            if (!stage.receipt) fail(`${stageId} wrote no receipt on the private solution`);
            else if (!lane.verify(dir, stage.receipt)) fail(`${stageId}'s receipt ${stage.receipt} does not verify`);
            else ok(`${stageId}'s receipt verifies (${stage.receipt})`);
          }
        }
      } catch (error) {
        fail(`${id}: ${error.message}`);
      } finally {
        if (dir && !process.env.STATESPACE_KEEP) rmSync(dir, { recursive: true, force: true });
        else if (dir) say(`  kept  ${dir}`);
        say(`  time  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      }
    }
  } catch (error) {
    fail(error.message);
  } finally {
    lane.stop();
  }
  say(`GATE-labs: ${counts.failed ? "FAIL" : "PASS"} (${counts.ok} ok, ${counts.skipped} stages skipped, ${counts.failed} problem${counts.failed === 1 ? "" : "s"}; ${((Date.now() - started) / 1000).toFixed(0)} s)`);
  return counts.failed ? 1 : 0;
}

process.exit(main(process.argv.slice(2)));
