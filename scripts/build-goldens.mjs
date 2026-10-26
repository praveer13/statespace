#!/usr/bin/env node
// Build LAB-3's golden pool (W2-T07): labs/reference/mini-plinth/build_goldens.py draws the inputs from a seed,
// computes every right-hand side with the Lean reference in the Bench image, kernel-checks every golden, and writes
// labs/LAB-3/challenge/goldens.json. This wrapper runs it with the Python on PATH; arguments pass through.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const script = join(dirname(fileURLToPath(import.meta.url)), "..", "labs", "reference", "mini-plinth", "build_goldens.py");
const done = spawnSync("python3", [script, ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(done.status ?? 1);
