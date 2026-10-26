#!/usr/bin/env node
// Build one zip per lab: apps/site/public/labs/<LAB-id>.zip, the file a learner downloads and unpacks into
// the root of their statespace-lab repository (labs/README.md sections 1 and 5; ARCHITECTURE.md section 12).
//
//   node scripts/labs/build-zips.mjs                 every lab with a folder labs/LAB-<n>/
//   node scripts/labs/build-zips.mjs LAB-1 LAB-2     only these
//   node scripts/labs/build-zips.mjs --out DIR       write the zips to DIR instead
//   node scripts/labs/build-zips.mjs --list LAB-1    print what the zip would hold, and write nothing
//
// The zips are build output and are gitignored. What a zip holds, in this order (a later layer replaces an
// earlier file at the same path):
//
//   1. labs/template/**                        the repository frame: agent kit, pyproject.toml, folders.
//                                              .devcontainer/ is left out of LAB-1's zip (LAB-1 needs none).
//   2. AGENTS.md                               labs/AGENTS.md without its maintainer note, plus a section
//                                              "This lab" generated from content/stages/S<n>/lab.yaml.
//   3. .statespace/cli/statespace/**           bench/statespace/, the command line, without its tests and
//                                              fixtures, and with only this lab's check module from
//                                              bench/statespace/labs/ (lab<n>.py, plus __init__.py).
//   4. labs/LAB-<n>/**                         from labs/LAB-<n>/ in this repository (else, for a lab not
//                                              moved yet, labs/template/labs/LAB-<n>/), except its _root/.
//   5. <root>/**                               labs/LAB-<n>/_root/**, unpacked at the repository root: the
//                                              lab's claims/*.smt2 templates and the like.
//   6. .statespace/protected.d/LAB-<n>.txt     every packed file that carries TODO(you), and the lab's
//                                              challenge/ files and comparator.json: what the guard protects.
//   7. .statespace/labs/LAB-<n>.json           the lab's manifest: stages, checks, by-hand files, sources.
//
// Never packed, anywhere: _solutions/, __pycache__/, *.pyc, target/, .lake/, node_modules/, .venv/,
// .DS_Store. The audit then fails the build on any _solutions path, any build product, any absolute home
// path in a text file, and a lab whose folder carries no TODO(you) (a template with nothing to do).
// Entries are sorted and dated 1980-01-01, so the same tree gives the same zip.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateRawSync } from "node:zlib";
import { parse as parseYaml } from "yaml";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_OUT = join(REPO, "apps", "site", "public", "labs");
const SKIP_DIRS = new Set(["_solutions", "__pycache__", "target", ".lake", "node_modules", ".venv", ".pytest_cache", ".mypy_cache", ".ruff_cache"]);
const SKIP_FILES = /(^\.DS_Store$|\.py[cod]$|~$|\.swp$)/;
const TODO = "TODO(you)";

function walk(dir, base = dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, base, out);
    } else if (entry.isFile() && !SKIP_FILES.test(entry.name)) {
      out.push(relative(base, full).split("\\").join("/"));
    }
  }
  return out;
}

function labNumber(id) {
  const m = /^LAB-([1-9][0-9]*)$/.exec(id);
  if (!m) throw new Error(`${id} is not a lab id such as LAB-1`);
  return Number(m[1]);
}

function labSource(id) {
  for (const dir of [join(REPO, "labs", id), join(REPO, "labs", "template", "labs", id)]) {
    if (existsSync(dir) && statSync(dir).isDirectory()) return dir;
  }
  return null;
}

function labYaml(n) {
  const path = join(REPO, "content", "stages", `S${n}`, "lab.yaml");
  return existsSync(path) ? { path: relative(REPO, path), data: parseYaml(readFileSync(path, "utf8")) } : null;
}

function commit() {
  try {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return /^[0-9a-f]{40,64}$/.test(head) ? head : null;
  } catch {
    return null;
  }
}

function oneLine(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function thisLab(id, n, lab, todo, statements) {
  const out = ["", "## This lab", ""];
  out.push(`${id}${lab?.data?.title ? `, ${oneLine(lab.data.title)}` : ""}: the stages of stage S${n}. Run a stage's checks with \`uv run statespace check lab${n}.<k>\` (or \`statespace check\` inside the devcontainer), and \`uv run statespace check\` to list them.`);
  out.push("");
  const stages = Array.isArray(lab?.data?.stages) ? lab.data.stages : [];
  if (stages.length) {
    out.push("| Stage | Check | What passes | Manual mode |", "|---|---|---|---|");
    for (const stage of stages) {
      for (const check of stage.checks ?? []) {
        out.push(`| ${stage.id}${stage.weekend ? " [weekend]" : ""}${stage.stretch ? " [stretch]" : ""} | ${check.id} | ${oneLine(check.label)} | ${stage.manual ? "yes" : "no"} |`);
      }
    }
  } else {
    out.push("The lab's stages and checks are not listed yet: ask the person which stage they are on.");
  }
  out.push("");
  out.push(todo.length ? "By hand (`TODO(you)`), and protected:" : "No file carries a `TODO(you)` marker.");
  for (const path of todo) out.push(`- \`${path}\``);
  out.push("");
  out.push(statements.length ? "Pinned statements:" : "Pinned statements: none in this zip; a stage that pins one names it.");
  for (const path of statements) out.push(`- \`${path}\``);
  return out.join("\n") + "\n";
}

function agentsTemplate() {
  const text = readFileSync(join(REPO, "labs", "AGENTS.md"), "utf8");
  return text.replace(/^<!--[\s\S]*?-->\s*/, "").replace(/\s*$/, "\n");
}

function isText(buffer) {
  if (buffer.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

// files: Map<zip path, { data: Buffer, mode: number, from: string }>
export function collect(id) {
  const n = labNumber(id);
  const source = labSource(id);
  if (!source) throw new Error(`${id}: no labs/${id}/ folder to pack`);
  const files = new Map();
  const add = (path, data, from, mode = 0o644) => files.set(path, { data: Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8"), mode, from });
  const addFile = (path, full, from) => add(path, readFileSync(full), from, statSync(full).mode & 0o111 ? 0o755 : 0o644);

  const template = join(REPO, "labs", "template");
  for (const rel of walk(template)) {
    if (rel.startsWith("labs/")) continue; // per-lab folders under the template are layer 4's
    if (n === 1 && rel.startsWith(".devcontainer/")) continue;
    addFile(rel, join(template, rel), `labs/template/${rel}`);
  }

  const bench = join(REPO, "bench", "statespace");
  for (const rel of walk(bench)) {
    if (rel.startsWith("check/tests/") || rel.startsWith("check/fixtures/")) continue;
    const m = /^labs\/(lab[0-9]+)\.py$/.exec(rel);
    if (rel.startsWith("labs/") && rel !== "labs/__init__.py" && !(m && m[1] === `lab${n}`)) continue;
    addFile(`.statespace/cli/statespace/${rel}`, join(bench, rel), `bench/statespace/${rel}`);
  }

  const sourceRel = relative(REPO, source).split("\\").join("/");
  for (const rel of walk(source)) {
    if (rel.startsWith("_root/")) addFile(rel.slice("_root/".length), join(source, rel), `${sourceRel}/${rel}`);
    else addFile(`labs/${id}/${rel}`, join(source, rel), `${sourceRel}/${rel}`);
  }

  const todo = [];
  const protectedPaths = [];
  for (const [path, file] of [...files].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (path.startsWith(".statespace/") || path.startsWith(".claude/") || path === "AGENTS.md") continue; // the kit names the marker; it is protected as a whole
    const carries = isText(file.data) && file.data.toString("utf8").includes(TODO);
    if (carries) todo.push(path);
    if (carries || (path.startsWith(`labs/${id}/challenge/`)) || path.endsWith("/comparator.json")) protectedPaths.push(path);
  }
  const statements = [...files.keys()]
    .filter((p) => (/^claims\/[^/]+\.(smt2|tla|yaml|yml)$/.test(p)) || p.startsWith(`labs/${id}/challenge/`))
    .sort();

  const lab = labYaml(n);
  add("AGENTS.md", agentsTemplate() + thisLab(id, n, lab, todo, statements), "labs/AGENTS.md");
  add(`.statespace/protected.d/${id}.txt`, `# ${id}: files the guard protects (packed by scripts/labs/build-zips.mjs)\n${protectedPaths.join("\n")}\n`, "generated");

  const sha = (data) => createHash("sha256").update(data).digest("hex");
  const manifest = {
    schema: "statespace/labzip-manifest@0",
    lab: id,
    stage: `S${n}`,
    commit: commit(),
    labYaml: lab?.path ?? null,
    stages: (lab?.data?.stages ?? []).map((s) => ({ id: s.id, checks: (s.checks ?? []).map((c) => c.id) })),
    byHand: todo,
    statements,
    files: [...files].filter(([p]) => !p.startsWith(".statespace/labs/")).map(([p, f]) => ({ path: p, sha256: sha(f.data) })).sort((a, b) => (a.path < b.path ? -1 : 1)),
  };
  add(`.statespace/labs/${id}.json`, JSON.stringify(manifest, null, 2) + "\n", "generated");
  return { files, todo, manifest, source: sourceRel };
}

export function audit(id, files, todo) {
  const problems = [];
  for (const [path, file] of files) {
    const parts = path.split("/");
    if (parts.includes("_solutions")) problems.push(`${path}: a solutions path`);
    if (parts.some((p) => SKIP_DIRS.has(p)) || SKIP_FILES.test(parts.at(-1))) problems.push(`${path}: a build product`);
    if (isText(file.data) && /(\/home\/[a-z_][a-z0-9_-]*\/|\/Users\/[A-Za-z]|[A-Z]:\\Users\\)/.test(file.data.toString("utf8"))) problems.push(`${path}: an absolute home path`);
  }
  if (!todo.some((p) => p.startsWith(`labs/${id}/`))) problems.push(`labs/${id}/: no file carries TODO(you), so the template has nothing for the learner to do`);
  return problems;
}

// A plain zip (deflate, no zip64): local headers, then the central directory, then its end record.
function dosDateTime() {
  return { time: 0, date: (0 << 9) | (1 << 5) | 1 }; // 1980-01-01 00:00:00
}

export function zip(files) {
  const { time, date } = dosDateTime();
  const locals = [];
  const central = [];
  let offset = 0;
  for (const [path, file] of [...files].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const name = Buffer.from(path, "utf8");
    const deflated = deflateRawSync(file.data, { level: 9 });
    const stored = deflated.length >= file.data.length;
    const body = stored ? file.data : deflated;
    const crc = crc32(file.data) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(stored ? 0 : 8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, body);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE((3 << 8) | 20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(stored ? 0 : 8, 10);
    entry.writeUInt16LE(time, 12);
    entry.writeUInt16LE(date, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(body.length, 20);
    entry.writeUInt32LE(file.data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt16LE(0, 30);
    entry.writeUInt16LE(0, 32);
    entry.writeUInt16LE(0, 34);
    entry.writeUInt16LE(0, 36);
    entry.writeUInt32LE(((0o100000 | file.mode) << 16) >>> 0, 38);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += local.length + name.length + body.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.size, 8);
  end.writeUInt16LE(files.size, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

function main(argv) {
  let out = DEFAULT_OUT;
  let list = false;
  const ids = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out = resolve(argv[++i] ?? "");
    else if (argv[i] === "--list") list = true;
    else if (argv[i] === "-h" || argv[i] === "--help") {
      process.stdout.write("usage: node scripts/labs/build-zips.mjs [--out DIR] [--list] [LAB-<n> ...]\n");
      return 0;
    } else ids.push(argv[i]);
  }
  if (!ids.length) {
    for (const entry of readdirSync(join(REPO, "labs"), { withFileTypes: true })) {
      if (entry.isDirectory() && /^LAB-[1-9][0-9]*$/.test(entry.name)) ids.push(entry.name);
    }
    ids.sort((a, b) => labNumber(a) - labNumber(b));
  }
  let failed = 0;
  for (const id of ids) {
    let built;
    try {
      built = collect(id);
    } catch (error) {
      process.stderr.write(`build-zips: ${error.message}\n`);
      failed++;
      continue;
    }
    const problems = audit(id, built.files, built.todo);
    if (problems.length) {
      process.stderr.write(`build-zips: ${id} fails the audit:\n${problems.map((p) => `  ${p}`).join("\n")}\n`);
      failed++;
      continue;
    }
    if (list) {
      for (const [path, file] of [...built.files].sort(([a], [b]) => (a < b ? -1 : 1))) process.stdout.write(`${path}\t${file.from}\n`);
      continue;
    }
    const data = zip(built.files);
    mkdirSync(out, { recursive: true });
    const target = join(out, `${id}.zip`);
    writeFileSync(target, data);
    const digest = createHash("sha256").update(data).digest("hex");
    process.stdout.write(`${posix.normalize(relative(REPO, target).split("\\").join("/"))}  ${built.files.size} files, ${data.length} bytes, sha256 ${digest} (from ${built.source})\n`);
  }
  return failed ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  process.exit(main(process.argv.slice(2)));
}
