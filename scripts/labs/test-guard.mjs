#!/usr/bin/env node
// The guard hook's fixture matrix (ARCHITECTURE.md section 12.3), run against labs/template/.claude/hooks/
// statespace-guard.sh under `sh` in a scratch lab repository. GATE-guardrails is to run the same matrix over
// every built zip; until then:
//
//   node scripts/labs/test-guard.mjs              under this machine's sh
//   node scripts/labs/test-guard.mjs --sh dash    under another shell
//   node scripts/labs/test-guard.mjs --emit DIR --as /w
//       write the scratch repository, the payloads and run.sh to DIR, with paths as they will read when DIR is
//       mounted at /w, to run the matrix where there is no node: `sh /w/run.sh` (the Bench image: dash, mawk)
//
// Exit 0 when every row decides as expected.

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const shArg = process.argv.indexOf("--sh");
const SH = shArg > 0 ? process.argv[shArg + 1] : "sh";

const emitArg = process.argv.indexOf("--emit");
const asArg = process.argv.indexOf("--as");
const root = emitArg > 0 ? resolve(process.argv[emitArg + 1]) : mkdtempSync(join(process.env.W0S11_SCRATCH ?? tmpdir(), "statespace-guard-"));
const shown = asArg > 0 ? process.argv[asArg + 1] : root; // the root as the hook will see it
if (emitArg > 0) mkdirSync(root, { recursive: true });
cpSync(join(REPO, "labs", "template", ".claude"), join(root, ".claude"), { recursive: true });
mkdirSync(join(root, ".statespace", "protected.d"), { recursive: true });
mkdirSync(join(root, "labs", "LAB-2", "challenge"), { recursive: true });
mkdirSync(join(root, "labs", "LAB-1"), { recursive: true });
mkdirSync(join(root, "claims"), { recursive: true });
writeFileSync(join(root, ".statespace", "protected.d", "LAB-1.txt"), "# LAB-1\nlabs/LAB-1/transfer.py\n");
writeFileSync(join(root, "labs", "LAB-1", "starter.py"), "s.check()\n# TODO(you): add the guard\n");
writeFileSync(join(root, "labs", "LAB-1", "transfer.py"), "def guard(): return True  # marker removed after packing\n");
writeFileSync(join(root, "labs", "LAB-1", "notes.py"), "x = 1\n");
writeFileSync(join(root, "labs", "LAB-2", "challenge", "Challenge.lean"), "theorem t : True := trivial\n");
writeFileSync(join(root, "README.md"), "# lab\n");

const P = (rel) => `${shown}/${rel}`;
const call = (tool_name, tool_input) => JSON.stringify({ session_id: "s", cwd: shown, hook_event_name: "PreToolUse", tool_name, tool_input });

const rows = [
  ["block an Edit of a protected file (claims/)", call("Edit", { file_path: P("claims/cl-1-1.yaml"), old_string: "a", new_string: "b" }), 2],
  ["block a Write into a challenge pack", call("Write", { file_path: P("labs/LAB-2/challenge/Challenge.lean"), content: "x" }), 2],
  ["block an Edit of a file that contains TODO(you)", call("Edit", { file_path: P("labs/LAB-1/starter.py"), old_string: "a", new_string: "b" }), 2],
  ["block an Edit of a file listed in protected.d", call("MultiEdit", { file_path: P("labs/LAB-1/transfer.py"), edits: [] }), 2],
  ["block a relative path to a receipt", call("Write", { file_path: "receipts/LAB-1.1/x.json", content: "{}" }), 2],
  ["block an Edit of the hook itself", call("Edit", { file_path: P(".claude/hooks/statespace-guard.sh"), old_string: "a", new_string: "b" }), 2],
  ["block a path with ..", call("Edit", { file_path: P("labs/LAB-1/../../claims/x.yaml"), old_string: "a", new_string: "b" }), 2],
  ["block a case-folded path", call("Write", { file_path: P("Claims/x.yaml"), content: "x" }), 2],
  ["block sed -i on a protected file", call("Bash", { command: "sed -i 's/a/b/' claims/cl-1-1.yaml" }), 2],
  ["block sed -i on a TODO(you) file", call("Bash", { command: "sed -i s/x/y/ labs/LAB-1/starter.py" }), 2],
  ["block cat redirected into a protected file", call("Bash", { command: "cat README.md > claims/x.yaml" }), 2],
  ["block an escaped path in JSON", '{"cwd":' + JSON.stringify(shown) + ',"tool_name":"Bash","tool_input":{"command":"rm \\u0063laims/x.yaml"}}', 2],
  ["block an mcp__ call naming a protected path", call("mcp__fs__write_file", { path: P("receipts/LAB-1.1/x.json"), content: "{}" }), 2],
  ["block an unparseable payload", "{not json", 2],
  ["block a payload with no tool", JSON.stringify({ tool_input: {} }), 2],
  ["allow statespace check", call("Bash", { command: "statespace check lab1.1" }), 0],
  ["allow uv run statespace check", call("Bash", { command: "uv run statespace check lab1.1 --assisted none --agent no" }), 0],
  ["allow reading a receipt", call("Bash", { command: "cat receipts/LAB-1.1/x.json | head -n 5" }), 0],
  ["allow lake build", call("Bash", { command: "lake build" }), 0],
  ["allow cargo test", call("Bash", { command: "cargo test --release" }), 0],
  ["allow an Edit of README.md", call("Edit", { file_path: P("README.md"), old_string: "a", new_string: "b" }), 0],
  ["allow an Edit of a proof file outside the protected set", call("Edit", { file_path: P("labs/LAB-1/notes.py"), old_string: "a", new_string: "b" }), 0],
  ["allow a Write of a new proposal", call("Write", { file_path: P("proposals/p.yaml"), content: "agent: true" }), 0],
  ["allow a file outside the repository", call("Write", { file_path: "/tmp/elsewhere.txt", content: "x" }), 0],
  ["allow a Bash command that names nothing protected", call("Bash", { command: "python -I labs/LAB-1/notes.py && ls" }), 0],
  ["allow everything with the opt-out set", call("Edit", { file_path: P("claims/cl-1-1.yaml"), old_string: "a", new_string: "b" }), 0, { STATESPACE_GUARD: "off" }],
];

if (emitArg > 0) {
  mkdirSync(join(root, "cases"), { recursive: true });
  const script = ["#!/bin/sh", "# the guard matrix of scripts/labs/test-guard.mjs; run with sh", `R=${shown}`, "failed=0"];
  rows.forEach(([name, payload, want, env], i) => {
    writeFileSync(join(root, "cases", `${i}.json`), payload);
    const off = env?.STATESPACE_GUARD === "off" ? "off" : "";
    script.push(`STATESPACE_GUARD=${off} CLAUDE_PROJECT_DIR=$R sh $R/.claude/hooks/statespace-guard.sh < $R/cases/${i}.json 2>/dev/null; got=$?`);
    script.push(`if [ $got -eq ${want} ]; then echo "ok    ${name.replace(/"/g, "'")}"; else echo "FAIL  ${name.replace(/"/g, "'")}: exit $got, expected ${want}"; failed=$((failed+1)); fi`);
  });
  script.push(`echo "$((${rows.length}-failed)) of ${rows.length} rows decided as expected under $(readlink -f /bin/sh) and $(readlink -f $(command -v awk))"`, "[ $failed -eq 0 ]");
  writeFileSync(join(root, "run.sh"), script.join("\n") + "\n");
  process.stdout.write(`wrote ${rows.length} cases and run.sh to ${root}\n`);
  process.exit(0);
}

let failed = 0;
for (const [name, payload, want, env] of rows) {
  const done = spawnSync(SH, [join(root, ".claude", "hooks", "statespace-guard.sh")], {
    input: payload,
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: root, STATESPACE_GUARD: "", ...(env ?? {}) },
    cwd: root,
  });
  const ok = done.status === want;
  if (!ok) failed++;
  process.stdout.write(`${ok ? "ok  " : "FAIL"}  ${name}: exit ${done.status}${ok ? "" : `, expected ${want}; stderr: ${done.stderr.trim().split("\n")[0]}`}\n`);
}
rmSync(root, { recursive: true, force: true });
process.stdout.write(`${rows.length - failed} of ${rows.length} rows decided as expected under ${SH}\n`);
process.exit(failed ? 1 : 0);
