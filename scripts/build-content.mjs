#!/usr/bin/env node
// The content build (ARCHITECTURE.md section 3.3; W1-T36). It reads the lessons and drawers under content/, the
// stages' and labs' own data, the ID registry, the runs and the facts, validates every content file against
// schemas/lesson.schema.json and the registry, resolves the run references, computes itemRev, builds the
// titles-only rail, and writes the per-lesson JSON, the per-lesson Markdown, the search index and the published
// schemas under apps/site/public/. The logic is packages/content (pure TypeScript); this file does the reading
// and the writing. It writes nothing when anything is an error.
//
//   node scripts/build-content.mjs                 build into apps/site/public
//   node scripts/build-content.mjs --check         validate everything and write nothing
//   node scripts/build-content.mjs --strict        warnings fail too
//   node scripts/build-content.mjs --json          print the report as JSON
//   node scripts/build-content.mjs --root DIR      read the tree under DIR (tests)
//   node scripts/build-content.mjs --out DIR       write under DIR (default: <root>/apps/site/public)
//   node scripts/build-content.mjs --built-at DATE the build date, YYYY-MM-DD (default: SOURCE_DATE_EPOCH, else today, UTC)
//
// Exit status: 0 built (or valid), 1 findings, 2 the build could not run.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// The pipeline is the package's TypeScript, which Node runs as it is from 22.18; before that it needs a flag.
if (!process.features.typescript) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(again.status ?? 1);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

const USAGE = 'usage: node scripts/build-content.mjs [--check] [--strict] [--json] [--root DIR] [--out DIR] [--built-at YYYY-MM-DD]';
/** The folders of the public directory this build owns: it clears them before it writes. */
const OWNED = ['content', 'md', 'schemas'];

const posix = (p) => p.split(sep).join('/');

/** Every file under a directory, as repository-relative paths, skipping links (which may point out of the tree). */
function walk(root, rel) {
  const dir = join(root, rel);
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    const st = lstatSync(p);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) out.push(...walk(root, posix(join(rel, name))));
    else if (st.isFile()) out.push(posix(join(rel, name)));
  }
  return out;
}

/** A file's text, or null with the reason when it is not valid UTF-8. */
function readText(root, path) {
  const bytes = readFileSync(join(root, path));
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return { error: 'is not valid UTF-8' };
  }
}

/** A fingerprint of a generator family's own files: its templates and key procedure (ASSESSMENT.md section 2.1). */
function templateRevs(root, registry) {
  const out = {};
  for (const e of registry.entries) {
    if (e.kind !== 'generator') continue;
    const slug = e.id.slice('GEN-'.length);
    const files = [...walk(root, `content/generators/${e.id}`), ...walk(root, `packages/generators/src/${slug}`)];
    if (files.length === 0) continue;
    const h = createHash('sha256');
    for (const f of files.sort()) h.update(`${f}\0${createHash('sha256').update(readFileSync(join(root, f))).digest('hex')}\n`);
    out[e.id] = h.digest('hex');
  }
  return out;
}

/**
 * @param {string[]} argv
 * @param {{ out?: (s: string) => void, err?: (s: string) => void }} [io]
 * @returns {Promise<number>} the exit code
 */
export async function main(argv, io = {}) {
  const out = io.out ?? ((s) => process.stdout.write(`${s}\n`));
  const err = io.err ?? ((s) => process.stderr.write(`${s}\n`));
  let root = REPO;
  let outDir = null;
  let check = false;
  let strict = false;
  let asJson = false;
  let builtAt = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      out(USAGE);
      return 0;
    } else if (a === '--check') check = true;
    else if (a === '--strict') strict = true;
    else if (a === '--json') asJson = true;
    else if (a === '--root') root = resolve(argv[++i] ?? '');
    else if (a === '--out') outDir = resolve(argv[++i] ?? '');
    else if (a === '--built-at') builtAt = argv[++i] ?? '';
    else {
      err(`${USAGE}\nunknown argument: ${a}`);
      return 2;
    }
  }
  const epoch = process.env.SOURCE_DATE_EPOCH;
  builtAt ??= (epoch !== undefined && /^[0-9]+$/.test(epoch) ? new Date(Number(epoch) * 1000) : new Date()).toISOString().slice(0, 10);
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(builtAt)) {
    err(`build-content: --built-at must be YYYY-MM-DD, not ${JSON.stringify(builtAt)}`);
    return 2;
  }
  const publicDir = outDir ?? join(root, 'apps', 'site', 'public');

  // The inputs.
  const registryPath = [join(root, 'packages/ids/src/registry.json'), join(REPO, 'packages/ids/src/registry.json')].find((p) => existsSync(p));
  if (registryPath === undefined) {
    err('build-content: packages/ids/src/registry.json is missing; run node scripts/build-ids.mjs');
    return 2;
  }
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  const { loadRegistry } = await import('./runs/registry.mjs');
  const runs = new Map();
  const readProblems = [];
  for (const r of loadRegistry(root)) {
    if (r.doc !== null) runs.set(r.id, r.doc);
    else readProblems.push({ severity: 'error', code: 'run-record', message: `does not parse: ${r.error}`, file: r.file, line: null });
  }
  const factsPath = join(root, 'content/registry/facts.json');
  let facts = null;
  if (existsSync(factsPath)) {
    try {
      facts = JSON.parse(readFileSync(factsPath, 'utf8'));
    } catch (e) {
      readProblems.push({ severity: 'error', code: 'facts', message: `content/registry/facts.json does not parse: ${e.message}`, file: 'content/registry/facts.json', line: null });
    }
  }
  const files = [];
  for (const path of [...walk(root, 'content/stages'), ...walk(root, 'content/drawers')]) {
    const r = readText(root, path);
    if (r.error !== undefined) readProblems.push({ severity: 'error', code: 'encoding', message: r.error, file: path, line: null });
    else files.push({ path, text: r.text });
  }
  const schemas = walk(root, 'schemas')
    .filter((p) => /^schemas\/[a-z][a-z0-9-]*\.schema\.json$/.test(p))
    .map((path) => ({ path, text: readFileSync(join(root, path), 'utf8') }));

  const { buildContent } = await import('../packages/content/src/build/index.ts');
  const result = buildContent({ registry, files, runs, facts, schemas, templateRevs: templateRevs(root, registry), builtAt });
  const problems = [...readProblems, ...result.problems];
  const errors = problems.filter((p) => p.severity === 'error');
  const warnings = problems.filter((p) => p.severity === 'warning');
  const failed = errors.length > 0 || (strict && warnings.length > 0);

  if (asJson) {
    out(JSON.stringify({ root: posix(relative(REPO, root)) || '.', check, strict, built: !failed && !check, report: result.report, problems }, null, 2));
  } else {
    out('build-content');
    for (const p of problems) out(`  ${p.severity === 'error' ? 'error' : 'warn '} ${p.file ?? '(build)'}${p.line === null ? '' : `:${p.line}`} [${p.code}] ${p.message}`);
    const r = result.report;
    const blocks = Object.entries(r.blocks).map(([t, n]) => `${n} ${t}`).join(', ');
    out(`  read  ${files.length} content files, ${runs.size} runs, ${result.report.skipped.length} left alone`);
    out(`  built ${r.lessons} lessons, ${r.drawers} drawers, ${r.stages} stage records and ${r.labs} lab records (${blocks}); ${r.itemRevs} itemRevs; ${r.runsCited} runs cited`);
    out(`  ${errors.length} errors, ${warnings.length} warnings${failed ? '' : check ? '; nothing written (--check)' : ''}`);
  }
  if (failed) return 1;
  if (check) return 0;

  // Write: clear the folders this build owns, then write every file, so a page that no longer exists leaves no file.
  const base = resolve(publicDir);
  if (base === resolve(root) || base === resolve('/') || base === resolve(REPO)) {
    err(`build-content: refusing to write into ${base}`);
    return 2;
  }
  for (const dir of OWNED) rmSync(join(base, dir), { recursive: true, force: true });
  for (const f of result.files) {
    const target = join(base, f.path);
    if (!resolve(target).startsWith(`${base}${sep}`)) {
      err(`build-content: ${f.path} would be written outside ${base}`);
      return 2;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, f.text);
  }
  const shown = relative(REPO, base);
  if (!asJson) out(`  wrote ${result.files.length} files under ${shown.startsWith('..') ? 'the output directory' : posix(shown) || '.'}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // a reader that closes the pipe early (`| head`) is not an error
  process.stdout.on('error', (e) => {
    if (e.code !== 'EPIPE') throw e;
  });
  process.exitCode = await main(process.argv.slice(2));
}
