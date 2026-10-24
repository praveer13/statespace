#!/usr/bin/env node
// GATE-links (spine 11.2; W0-T03). Dependency-free; the checks live in packages/ids/src/check.ts.
//
//   node scripts/verify-links.mjs            run the gate on this repository
//   node scripts/verify-links.mjs --strict   also fail on pending proposals (W0-T10's exit)
//   node scripts/verify-links.mjs --json     print the findings as JSON
//   node scripts/verify-links.mjs --root DIR check the tree under DIR (tests)
//
// Exit status: 0 green, 1 findings, 2 a required file could not be read.

import { spawnSync } from 'node:child_process';
import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The checks are the package's TypeScript, which Node runs as it is from 22.18; before that it needs a flag.
if (!process.features.typescript) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(again.status ?? 1);
}
const { checkLinks, PROPOSALS_PATH, REGISTRY_PATH, TASKS_PATH, TRACKER_PATH, TYPES_PATH } = await import('../packages/ids/src/check.ts');
const { EVIDENCE_PATH, SPINE_PATH } = await import('../packages/ids/src/registry.ts');

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Where IDs are resolved (spine 11.2: docs/, curriculum/, tracker/, README.md and new artboards; W0-T03 adds labs/ and content/). */
const SCAN = ['README.md', 'docs', 'curriculum', 'labs', 'content', 'tracker', 'design'];
/** v1 history: its IDs follow v1's formats (spine 10.2; DESIGN.md issue 11). */
const EXEMPT = ['docs/history', 'design/canvas'];
const SKIP_DIRS = new Set(['node_modules', '.git', '.lake', 'target', '_solutions', '__pycache__', '.venv']);
const EXTENSIONS = new Set(['.md', '.mdx', '.yaml', '.yml', '.json', '.txt', '.html']);

/** @param {string} path @returns {string | null} */
function readOrNull(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (e) {
    if (/** @type {NodeJS.ErrnoException} */ (e).code === 'ENOENT') return null;
    throw e;
  }
}

/**
 * @param {string} root
 * @returns {{ path: string, text: string }[]}
 */
export function collectFiles(root) {
  /** @type {{ path: string, text: string }[]} */
  const files = [];
  /** @param {string} rel */
  const visit = (rel) => {
    if (EXEMPT.includes(rel)) return;
    let st;
    try {
      st = lstatSync(join(root, rel));
    } catch {
      return;
    }
    if (st.isSymbolicLink()) return; // a link may point out of the tree or loop back into it
    if (st.isDirectory()) {
      for (const name of readdirSync(join(root, rel)).sort()) {
        if (!SKIP_DIRS.has(name)) visit(`${rel}/${name}`);
      }
    } else if (EXTENSIONS.has(rel.slice(rel.lastIndexOf('.')))) {
      files.push({ path: rel, text: readFileSync(join(root, rel), 'utf8') });
    }
  };
  for (const entry of SCAN) visit(entry);
  return files;
}

/**
 * Read everything the gate needs from a repository root.
 * @param {string} root
 * @param {{ strict?: boolean }} [options]
 * @returns {import('../packages/ids/src/check.ts').Inputs | { missing: string } | { invalid: string }}
 */
export function loadInputs(root, options = {}) {
  const need = [SPINE_PATH, EVIDENCE_PATH, TASKS_PATH, TRACKER_PATH];
  const texts = need.map((p) => readOrNull(join(root, p)));
  const gone = need.find((_, i) => texts[i] === null);
  if (gone !== undefined) return { missing: gone };
  const proposalsText = readOrNull(join(root, PROPOSALS_PATH));
  let proposals = null;
  if (proposalsText !== null) {
    try {
      proposals = JSON.parse(proposalsText);
    } catch (e) {
      return { invalid: `${PROPOSALS_PATH} is not valid JSON: ${/** @type {Error} */ (e).message}` };
    }
    if (!Array.isArray(proposals?.proposals) || !proposals.proposals.every((p) => typeof p?.id === 'string')) {
      return { invalid: `${PROPOSALS_PATH} must be {"proposals": [{"id": "..."}, ...]}` };
    }
  }
  return {
    spine: /** @type {string} */ (texts[0]),
    evidence: /** @type {string} */ (texts[1]),
    tasks: /** @type {string} */ (texts[2]),
    trackerMd: /** @type {string} */ (texts[3]),
    files: collectFiles(root),
    registryJson: readOrNull(join(root, REGISTRY_PATH)),
    registryTs: readOrNull(join(root, TYPES_PATH)),
    proposals,
    strict: options.strict === true,
  };
}

/**
 * Group findings of one ID (a mistyped ID used in many places is one problem).
 * @param {import('../packages/ids/src/check.ts').Finding[]} findings
 */
function groupById(findings) {
  /** @type {Map<string, import('../packages/ids/src/check.ts').Finding[]>} */
  const groups = new Map();
  for (const f of findings) {
    const key = f.id ?? `${f.file}:${f.line}:${f.message}`;
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  return [...groups.values()];
}

/** @param {import('../packages/ids/src/check.ts').Finding} f */
const where = (f) => `${f.file}${f.line === null ? '' : `:${f.line}${f.col === null ? '' : `:${f.col}`}`}`;

/**
 * @param {ReturnType<typeof checkLinks>} r
 * @returns {string[]}
 */
export function formatReport(r) {
  const lines = [];
  lines.push(
    `GATE-links: ${r.stats.files} files, ${r.stats.tokens} ID tokens (${r.stats.distinctIds} distinct) against ${r.stats.entries} registry entries and ${r.stats.tasks} tasks`,
  );
  for (const check of [...new Set(r.failures.map((f) => f.check))]) {
    for (const g of groupById(r.failures.filter((f) => f.check === check))) {
      if (g.length === 1 || g[0].id === undefined) {
        for (const f of g) lines.push(`FAIL  ${check}  ${where(f)}  ${f.message}`);
      } else {
        const shown = g.slice(0, 5).map(where).join(', ');
        lines.push(`FAIL  ${check}  ${g[0].message}  [${g.length} places: ${shown}${g.length > 5 ? `, +${g.length - 5} more` : ''}]`);
      }
    }
  }
  if (r.pending.length > 0) {
    const groups = groupById(r.pending);
    lines.push(`PENDING  ${groups.length} proposed ID(s), not failures until \`--strict\`; W0-T10 registers or declines each:`);
    for (const g of groups) {
      const shown = g.slice(0, 3).map(where).join(', ');
      lines.push(`  ${g[0].id}  ${g.length} place(s): ${shown}${g.length > 3 ? ', ...' : ''}  (${/\((.*)\)$/.exec(g[0].message)?.[1] ?? ''})`);
    }
  }
  for (const a of r.advisories) lines.push(`NOTE  ${a.check}  ${where(a)}  ${a.message}`);
  lines.push(
    r.failures.length === 0
      ? `GATE-links: green${r.pending.length ? ` (${groupById(r.pending).length} pending proposal(s))` : ''}`
      : `GATE-links: FAIL (${r.failures.length} finding(s))`,
  );
  return lines;
}

/**
 * @param {string[]} argv
 * @param {{ out?: (s: string) => void, err?: (s: string) => void }} [io]
 * @returns {number} the exit code
 */
export function main(argv, io = {}) {
  const out = io.out ?? ((s) => process.stdout.write(`${s}\n`));
  const err = io.err ?? ((s) => process.stderr.write(`${s}\n`));
  let root = defaultRoot;
  let strict = false;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      out('usage: node scripts/verify-links.mjs [--strict] [--json] [--root dir]');
      return 0;
    } else if (a === '--strict') strict = true;
    else if (a === '--json') json = true;
    else if (a === '--root') root = resolve(argv[++i] ?? '');
    else {
      err(`usage: node scripts/verify-links.mjs [--strict] [--json] [--root dir]\nunknown argument: ${a}`);
      return 2;
    }
  }
  const inputs = loadInputs(root, { strict });
  if ('missing' in inputs) {
    err(`GATE-links: cannot read ${inputs.missing} under ${root}`);
    return 2;
  }
  if ('invalid' in inputs) {
    err(`GATE-links: ${inputs.invalid}`);
    return 2;
  }
  const result = checkLinks(inputs);
  if (json) {
    const { registry: _registry, ...rest } = result;
    out(JSON.stringify({ ok: result.failures.length === 0, ...rest }, null, 2));
  } else {
    for (const l of formatReport(result)) out(l);
  }
  return result.failures.length === 0 ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // a reader that closes the pipe early (`| head`) is not an error
  process.stdout.on('error', (e) => {
    if (/** @type {NodeJS.ErrnoException} */ (e).code !== 'EPIPE') throw e;
  });
  process.exitCode = main(process.argv.slice(2));
}
