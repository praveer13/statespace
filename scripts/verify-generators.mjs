#!/usr/bin/env node
// GATE-generators (spine section 11.2; ARCHITECTURE.md section 13.2; invariant I3; W1-T21): purity, determinism
// across three engines, 2-4 structurally different templates banded 1-3, unknown discarded, distractors distinct
// from keys. The checks are pure code in packages/generators/src/core/checks.ts; this script finds the families,
// runs the determinism lint, guards make() against clocks and entropy, hands each family a port over its engines,
// drives the browsers and reports. A template whose engine ships in a later wave is declared `pending` (its family
// needs no port for that engine): it counts toward 2-4, the checks skip it, and the gate fails it once a port for
// its engine exists.
//
//   node scripts/verify-generators.mjs                    the fast lane: the lint, then every family's checks, with
//                                                         determinism compared against each family's determinism.json
//   node scripts/verify-generators.mjs --family GEN-x     only these families (comma-separated or repeated); the lint still runs
//   node scripts/verify-generators.mjs --engines          also compute every family's digest in Chromium, Firefox and
//                                                         WebKit (playwright-core) and compare them with Node's; run it
//                                                         in the pinned Playwright image (see the README)
//   node scripts/verify-generators.mjs --engines --write  and write determinism.json for every family whose four digests agree
//   --engines-out FILE / --engines-in FILE                split the browser step from the write, for a read-only mount
//   --key-seeds N                                         seeds per template and band for the key and grading checks (default 8)
//   --ports MODULE                                        a port-provider module (repeatable); STATESPACE_GENERATOR_PORTS adds more
//   --self-check                                          plant one fault per check in memory; the gate must fail on each
//   --json, --verbose, --root DIR
//
// A family is a folder packages/generators/src/<slug>/ whose index.ts exports `generator` (and, for engines that run
// as plain code in the tab, `ports`: engine name to EnginePort). The framework's fixture family,
// packages/generators/src/core/fixture/, is always checked: it is how the gate proves the framework itself.
//
// Exit status: 0 green, 1 findings, 2 the gate could not run (a usage error, or browsers that would not start).

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The checks are the package's TypeScript, which Node runs as it is from 22.18; before that it needs a flag.
if (!process.features.typescript) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(again.status ?? 2);
}

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUN_ID = 'RUN-generators-gate';

/**
 * Provider modules the gate tries when a family needs an engine it does not run itself, if they exist and export
 * `ports` or `createPorts()`: GATE-calls' Z3 pair (W1-T37) runs Pyodide's Z3, the tab's engine, under Node.
 */
const DEFAULT_PROVIDERS = ['scripts/conformance/z3-pyodide-native.mjs'];

// ------------------------------------------------------------------ arguments

const USAGE = 'usage: verify-generators.mjs [--family GEN-x] [--engines [--write] | --engines-out FILE | --engines-in FILE [--write]] [--key-seeds N] [--ports MODULE] [--self-check] [--json] [--verbose] [--root DIR]';

export function parseArgs(argv) {
  const o = { root: REPO, families: [], engines: false, write: false, enginesOut: null, enginesIn: null, keySeeds: null, ports: [], selfCheck: false, json: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--root') o.root = resolve(value());
    else if (a === '--family') o.families.push(...value().split(',').map((s) => s.trim()).filter(Boolean));
    else if (a === '--engines') o.engines = true;
    else if (a === '--write') o.write = true;
    else if (a === '--engines-out') o.enginesOut = resolve(value());
    else if (a === '--engines-in') o.enginesIn = resolve(value());
    else if (a === '--key-seeds') {
      o.keySeeds = Number(value());
      if (!Number.isInteger(o.keySeeds) || o.keySeeds < 1) throw new Error('--key-seeds needs a positive integer');
    } else if (a === '--ports') o.ports.push(resolve(value()));
    else if (a === '--self-check') o.selfCheck = true;
    else if (a === '--json') o.json = true;
    else if (a === '--verbose') o.verbose = true;
    else throw new Error(`unknown argument ${a}`);
  }
  if (o.enginesOut) o.engines = true;
  if (o.write && !o.engines && !o.enginesIn) throw new Error('--write needs --engines or --engines-in: digests are written only once three browsers have confirmed them');
  if (o.enginesIn && o.engines) throw new Error('--engines-in reads browser digests recorded elsewhere; it does not run browsers');
  return o;
}

// ------------------------------------------------------------------ the guard: make() reads no clock and no entropy

const GUARD_MESSAGE = (what) => `${what} was read inside make(): a generator takes time and randomness only from its seed (I3)`;

/** Run fn with Math.random, Date.now, new Date(), Date(), performance.now and the Web Crypto entropy calls throwing. */
export function withGuard(fn) {
  const g = globalThis;
  const RealDate = g.Date;
  const realRandom = Math.random;
  const restore = [];
  const patch = (obj, name, what) => {
    if (!obj) return;
    const own = Object.getOwnPropertyDescriptor(obj, name);
    Object.defineProperty(obj, name, {
      value: () => {
        throw new Error(GUARD_MESSAGE(what));
      },
      configurable: true,
      writable: true,
    });
    restore.push(() => {
      if (own) Object.defineProperty(obj, name, own);
      else delete obj[name];
    });
  };
  function GuardDate(...args) {
    if (!new.target) throw new Error(GUARD_MESSAGE('Date()'));
    if (args.length === 0) throw new Error(GUARD_MESSAGE('new Date()'));
    return Reflect.construct(RealDate, args, new.target);
  }
  GuardDate.prototype = RealDate.prototype;
  GuardDate.UTC = RealDate.UTC;
  GuardDate.parse = RealDate.parse;
  GuardDate.now = () => {
    throw new Error(GUARD_MESSAGE('Date.now'));
  };
  Math.random = () => {
    throw new Error(GUARD_MESSAGE('Math.random'));
  };
  g.Date = GuardDate;
  patch(g.performance, 'now', 'performance.now');
  patch(g.crypto, 'getRandomValues', 'crypto.getRandomValues');
  patch(g.crypto, 'randomUUID', 'crypto.randomUUID');
  try {
    return fn();
  } finally {
    Math.random = realRandom;
    g.Date = RealDate;
    for (const r of restore.reverse()) r();
  }
}

/** The family with its pure functions (make, measure, structure) run under the guard. key and grade call ports, which may run real engines in-process, so they are not. */
export function guarded(gen) {
  return { ...gen, make: (...a) => withGuard(() => gen.make(...a)), measure: (i) => withGuard(() => gen.measure(i)), structure: (i) => withGuard(() => gen.structure(i)) };
}

// ------------------------------------------------------------------ discovery

const genRoot = (root) => join(root, 'packages', 'generators', 'src');

/** The families of a tree: the fixture first, then every packages/generators/src/<slug>/index.ts but core's. */
export function familyDirs(root) {
  const base = genRoot(root);
  const dirs = [];
  if (existsSync(join(base, 'core', 'fixture', 'index.ts'))) dirs.push('core/fixture');
  let names = [];
  try {
    names = readdirSync(base).sort();
  } catch {
    return dirs;
  }
  for (const n of names) {
    if (n === 'core') continue;
    const p = join(base, n);
    let dir = false;
    try {
      dir = statSync(p).isDirectory();
    } catch {
      continue; // a dangling link is not a family
    }
    if (dir && existsSync(join(p, 'index.ts'))) dirs.push(n);
  }
  return dirs;
}

export async function loadFamilies(root) {
  const out = [];
  for (const dir of familyDirs(root)) {
    const file = join(genRoot(root), ...dir.split('/'), 'index.ts');
    const rel = relative(root, file).split(sep).join('/');
    try {
      const mod = await import(pathToFileURL(file).href);
      const generator = mod.generator ?? mod.default;
      if (!generator || typeof generator !== 'object') out.push({ dir, file, rel, error: `${rel} exports no generator` });
      else out.push({ dir, file, rel, generator, ports: mod.ports ?? {} });
    } catch (e) {
      out.push({ dir, file, rel, error: `${rel} did not load: ${e instanceof Error ? e.message : String(e)}` });
    }
  }
  return out;
}

const determinismPath = (root, dir) => join(genRoot(root), ...dir.split('/'), 'determinism.json');

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
}

/** The task IDs of tracker/tasks.yaml (its `  - id: W1-T21` lines), or null when the tree has no tracker. */
export function trackerTasks(root) {
  let text;
  try {
    text = readFileSync(join(root, 'tracker', 'tasks.yaml'), 'utf8');
  } catch {
    return null;
  }
  return new Set([...text.matchAll(/^\s*-\s+id:\s*["']?(W[0-9]+-[TS][0-9]{2,})["']?\s*$/gm)].map((m) => m[1]));
}

export function loadRegistry(root) {
  const reg = readJson(join(root, 'packages', 'ids', 'src', 'registry.json'));
  if (!reg || !Array.isArray(reg.entries)) return null;
  const generators = new Map();
  const misconceptions = new Set();
  const kcs = new Set();
  const spineTasks = new Set();
  for (const e of reg.entries) {
    if (e.kind === 'generator') generators.set(e.id, e.templates);
    else if (e.kind === 'misconception') misconceptions.add(e.id);
    else if (e.kind === 'kc') kcs.add(e.id);
    else if (e.kind === 'task') spineTasks.add(e.id);
  }
  // A pending template lands with a tracker task, which may be a refined one the spine does not list (W3-T27).
  // Without a tracker the landing tasks are not checked.
  const tracker = trackerTasks(root);
  return { generators, misconceptions, kcs, ...(tracker ? { tasks: new Set([...spineTasks, ...tracker]) } : {}) };
}

// ------------------------------------------------------------------ the determinism lint

export async function lintTree(root) {
  const ts = (await import('typescript')).default;
  const { lintDeterminism, seededScope, SEEDED_PATHS } = await import(pathToFileURL(join(REPO, 'packages', 'rng', 'src', 'lint.ts')).href);
  const files = [];
  const walk = (rel) => {
    let entries;
    try {
      entries = readdirSync(join(root, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      const child = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(child);
      else if (e.isFile() && seededScope(child)) files.push(child);
    }
  };
  for (const p of SEEDED_PATHS) walk(p.replace(/\/$/, ''));
  files.sort();
  const findings = [];
  for (const rel of files) {
    for (const f of lintDeterminism(ts, rel, readFileSync(join(root, rel), 'utf8'), seededScope(rel))) {
      findings.push({ check: 'lint', family: '-', where: `${rel}:${f.line}:${f.col}`, message: f.message });
    }
  }
  return { files: files.length, findings };
}

// ------------------------------------------------------------------ ports

function compositePort(map) {
  return {
    async run(req) {
      const p = map.get(req.engine);
      if (!p) throw Object.assign(new Error(`no port for engine ${req.engine} here`), { code: 'unknown-engine' });
      return p.run(req);
    },
  };
}

const enginesOf = (gen) => (Array.isArray(gen?.engines) ? gen.engines.filter((e) => typeof e === 'string') : []);
/** The engines a family's pending templates wait for. */
const pendingEnginesOf = (gen) => (Array.isArray(gen?.templates) ? gen.templates.map((t) => t?.pending?.engine).filter((e) => typeof e === 'string') : []);

/**
 * The port a family is checked with: one over every engine here, or undefined when an engine its live templates
 * consult has none. A pending template's engine is never required; the checks fail a template still pending once
 * its engine has a port (`portEngines`).
 */
export function portFor(gen, map) {
  const waiting = new Set(pendingEnginesOf(gen));
  const required = enginesOf(gen).filter((e) => !waiting.has(e));
  return required.length > 0 && required.every((e) => map.has(e)) ? compositePort(map) : undefined;
}

/** Engine ports from provider modules: each exports `ports` (engine to port) or `createPorts()` returning them. */
export async function loadProviders(modules, quiet = false) {
  const map = new Map();
  const problems = [];
  for (const m of modules) {
    try {
      const mod = await import(pathToFileURL(m).href);
      const ports = typeof mod.createPorts === 'function' ? await mod.createPorts() : mod.ports;
      if (!ports || typeof ports !== 'object') {
        if (!quiet) problems.push(`${m} exports neither ports nor createPorts()`);
      }
      else for (const [engine, port] of Object.entries(ports)) map.set(engine, port);
    } catch (e) {
      problems.push(`${m} did not load: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { map, problems };
}

// ------------------------------------------------------------------ browsers

/** Every family's digest in Chromium, Firefox and WebKit: one bundle of the families and the core, one page per engine. */
export async function browserDigests(root, families) {
  const esbuild = (await import('esbuild')).default ?? (await import('esbuild'));
  const { chromium, firefox, webkit } = await import('playwright-core');
  const core = join(genRoot(root), 'core', 'index.ts');
  const lines = [`import { familyDigest } from ${JSON.stringify(core)};`];
  families.forEach((f, i) => lines.push(`import * as m${i} from ${JSON.stringify(f.file)};`));
  lines.push('const out = {};', 'try {');
  families.forEach((f, i) => lines.push(`  out[${JSON.stringify(f.generator.id)}] = familyDigest(m${i}.generator ?? m${i}.default);`));
  lines.push('  window.__digests = out;', "  document.title = 'digests ready';", '} catch (e) {', '  window.__error = String(e && e.stack || e);', "  document.title = 'digests failed';", '}');
  const built = await esbuild.build({
    stdin: { contents: lines.join('\n'), resolveDir: root, sourcefile: 'generators-harness.ts', loader: 'ts' },
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2022',
    platform: 'browser',
    logLevel: 'silent',
  });
  const bundle = built.outputFiles[0].text;
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>generators harness</title><script type="module" src="/bundle.js"></script></head><body></body></html>';
  const server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') {
      res.writeHead(200, { 'content-type': 'text/javascript' });
      res.end(bundle);
    } else {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(html);
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const engines = [];
  try {
    for (const [name, type] of [
      ['chromium', chromium],
      ['firefox', firefox],
      ['webkit', webkit],
    ]) {
      const browser = await type.launch();
      try {
        const page = await browser.newPage();
        await page.goto(base);
        await page.waitForFunction(() => document.title === 'digests ready' || document.title === 'digests failed', null, { timeout: 180_000 });
        const got = await page.evaluate(() => ({ digests: window.__digests ?? null, error: window.__error ?? null, ua: navigator.userAgent }));
        if (got.error) throw new Error(`${name}: ${got.error}`);
        engines.push({ engine: name, version: browser.version(), userAgent: got.ua, digests: got.digests });
      } finally {
        await browser.close();
      }
    }
  } finally {
    server.close();
  }
  return { bundleBytes: Buffer.byteLength(bundle), engines };
}

// ------------------------------------------------------------------ the run

async function checkAll(o, io) {
  const { checkFamily, CORE_REV, DETERMINISM_SCHEMA, DEFAULT_SAMPLE, familyDigest } = await import(pathToFileURL(join(genRoot(o.root), 'core', 'index.ts')).href);
  const lint = await lintTree(o.root);
  const registry = loadRegistry(o.root);
  const loaded = await loadFamilies(o.root);
  const selected = o.families.length === 0 ? loaded : loaded.filter((f) => f.generator && o.families.includes(f.generator.id));
  const findings = [...lint.findings];
  if (o.families.length > 0) for (const id of o.families) if (!loaded.some((f) => f.generator?.id === id)) findings.push({ check: 'contract', family: id, message: `no family ${id} under packages/generators/src` });
  // A family that does not load is a finding whatever the filter: its ID is unknown until it loads. A family lives in
  // the folder its ID names (the content build fingerprints packages/generators/src/<slug>), and no ID is defined twice.
  for (const f of loaded) if (f.error) findings.push({ check: 'contract', family: f.dir, message: f.error });
  const seen = new Map();
  for (const f of loaded) {
    if (!f.generator) continue;
    const id = String(f.generator.id);
    if (f.dir !== 'core/fixture' && id !== `GEN-${f.dir}`) findings.push({ check: 'contract', family: id, message: `${f.rel} defines ${id}, but a family lives in packages/generators/src/${id.replace(/^GEN-/, '')}/` });
    if (seen.has(id)) findings.push({ check: 'contract', family: id, message: `${id} is defined twice: ${seen.get(id)} and ${f.rel}` });
    else seen.set(id, f.rel);
  }
  if (!registry) findings.push({ check: 'registry', family: '-', message: 'packages/ids/src/registry.json is missing or unreadable' });
  const families = selected.filter((f) => f.generator);

  // Engines a family does not run itself come from provider modules, loaded only when a family needs one (a
  // provider may start a real engine). Named providers must load; the default ones are used when they exist and
  // export ports. A pending template's engine counts as needed too, so the gate learns whether it has a port yet.
  const needed = new Set(families.flatMap((f) => [...enginesOf(f.generator), ...pendingEnginesOf(f.generator)].filter((e) => !(e in (f.ports ?? {})))));
  let providers = { map: new Map(), problems: [] };
  if (needed.size > 0) {
    const named = [...o.ports, ...(process.env.STATESPACE_GENERATOR_PORTS ?? '').split(',').map((s) => s.trim()).filter(Boolean)];
    const defaults = DEFAULT_PROVIDERS.map((p) => join(o.root, p)).filter((p) => existsSync(p) && !named.includes(p));
    providers = await loadProviders(named);
    const fallback = await loadProviders(defaults, true);
    for (const [engine, port] of fallback.map) if (!providers.map.has(engine)) providers.map.set(engine, port);
  }
  for (const p of providers.problems) findings.push({ check: 'unknown', family: '-', message: `port provider: ${p}` });

  // Browser digests, when asked: computed now (--engines) or read from a file (--engines-in).
  let browsers = null;
  if (o.engines) {
    try {
      browsers = await browserDigests(o.root, families);
    } catch (e) {
      return { exit: 2, error: `the browsers did not run: ${e instanceof Error ? e.message : String(e)} (run --engines in the pinned Playwright image; see packages/generators/src/core/README.md)` };
    }
    if (o.enginesOut) writeFileSync(o.enginesOut, `${JSON.stringify({ format: 'generators-engines/1', ...browsers }, null, 2)}\n`);
  } else if (o.enginesIn) {
    browsers = readJson(o.enginesIn);
    if (!browsers || !Array.isArray(browsers.engines)) return { exit: 2, error: `${o.enginesIn} is not a browser digest file` };
  }

  const reports = [];
  const written = [];
  for (const f of families) {
    const gen = f.generator;
    const map = new Map([...providers.map, ...Object.entries(f.ports ?? {})]);
    const port = portFor(gen, map);
    const path = determinismPath(o.root, f.dir);
    let record = readJson(path);
    if (browsers) {
      const node = guarded(gen);
      let nodeDigest;
      try {
        nodeDigest = familyDigest(node);
      } catch (e) {
        findings.push({ check: 'determinism', family: gen.id, message: `the digest could not be computed: ${e instanceof Error ? e.message : String(e)}` });
        continue;
      }
      const confirmations = browsers.engines.map((e) => ({ engine: e.engine, version: e.version, digest: e.digests?.[gen.id]?.digest ?? null }));
      const disagree = confirmations.filter((c) => c.digest !== nodeDigest.digest);
      for (const c of disagree) findings.push({ check: 'determinism', family: gen.id, message: `${c.engine} ${c.version} computed ${c.digest}, Node ${process.versions.node} computed ${nodeDigest.digest}: the instances differ between engines` });
      if (disagree.length === 0 && o.write) {
        record = {
          schema: DETERMINISM_SCHEMA,
          family: gen.id,
          core: CORE_REV,
          sample: DEFAULT_SAMPLE,
          seeds: nodeDigest.seeds,
          cells: nodeDigest.cells,
          digest: nodeDigest.digest,
          engines: [{ engine: 'node', version: process.versions.node, digest: nodeDigest.digest }, ...confirmations],
          run: RUN_ID,
        };
        writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
        written.push(relative(o.root, path).split(sep).join('/'));
      }
    }
    const report = await checkFamily(guarded(gen), { port, portEngines: new Set(map.keys()), registry: registry ?? undefined, determinism: record, ...(o.keySeeds ? { keySeeds: o.keySeeds } : {}) });
    reports.push({ ...report, dir: f.dir });
    findings.push(...report.findings);
  }
  return { exit: findings.length > 0 ? 1 : 0, lint, reports, findings, browsers, written };
}

function summarize(result) {
  const reps = result.reports;
  const fixtures = reps.filter((r) => r.fixture).length;
  const instances = reps.reduce((n, r) => n + r.stats.instances, 0);
  const keyed = reps.reduce((n, r) => n + r.stats.keyed, 0);
  const discarded = reps.reduce((n, r) => n + Object.values(r.stats.discarded).reduce((a, b) => a + b, 0), 0);
  const engines = result.browsers ? `; digests compared in ${result.browsers.engines.map((e) => `${e.engine} ${e.version}`).join(', ')}` : '; determinism read from each family\'s determinism.json';
  return `${reps.length} famil${reps.length === 1 ? 'y' : 'ies'} (${fixtures} fixture), ${instances} instances, ${keyed} keyed, ${discarded} discarded; lint over ${result.lint.files} files${engines}`;
}

export function formatReport(result, verbose = false) {
  const lines = [`GATE-generators: ${summarize(result)}`];
  for (const r of result.reports) {
    const d = Object.entries(r.stats.discarded).map(([k, v]) => `${k} ${v}`).join(', ');
    const own = r.findings.length;
    const waiting = (r.pending ?? []).map((p) => `${p.template} until ${p.lands}`).join(', ');
    lines.push(`  ${own === 0 ? 'ok  ' : 'FAIL'}  ${r.family}${r.fixture ? ' (fixture)' : ''}  ${r.stats.instances} instances, ${r.stats.keyed} keyed${d ? `, discarded: ${d}` : ''}, ${r.stats.graded} answers graded${r.digest ? `, digest ${r.digest.digest.slice(0, 19)}` : ''}${waiting ? `; pending: ${waiting}` : ''}`);
    if (verbose) for (const n of r.notes) lines.push(`        note: ${n}`);
  }
  for (const w of result.written) lines.push(`  wrote ${w}`);
  const shown = verbose ? result.findings : result.findings.slice(0, 60);
  for (const f of shown) lines.push(`FAIL  ${f.check}  ${f.family}${f.where ? `  ${f.where}` : ''}  ${f.message}`);
  if (shown.length < result.findings.length) lines.push(`  ... ${result.findings.length - shown.length} more (--verbose shows all)`);
  const byCheck = {};
  for (const f of result.findings) byCheck[f.check] = (byCheck[f.check] ?? 0) + 1;
  lines.push(
    result.findings.length === 0
      ? `GATE-generators: green (${summarize(result)})`
      : `GATE-generators: FAIL (${result.findings.length} finding${result.findings.length === 1 ? '' : 's'}: ${Object.entries(byCheck).map(([k, v]) => `${k} ${v}`).join(', ')})`,
  );
  return lines;
}

// ------------------------------------------------------------------ self-check

/** Plant one fault per check in memory; each must fail its own check, and the clean fixture must pass. */
export async function selfCheck() {
  const core = await import(pathToFileURL(join(REPO, 'packages', 'generators', 'src', 'core', 'index.ts')).href);
  const fx = await import(pathToFileURL(join(REPO, 'packages', 'generators', 'src', 'core', 'fixture', 'index.ts')).href);
  const ts = (await import('typescript')).default;
  const { lintDeterminism } = await import(pathToFileURL(join(REPO, 'packages', 'rng', 'src', 'lint.ts')).href);
  const base = fx.generator;
  const registry = loadRegistry(REPO);
  const digest = core.familyDigest(base);
  const record = (d) => ({
    schema: core.DETERMINISM_SCHEMA,
    family: d.family,
    core: core.CORE_REV,
    sample: core.DEFAULT_SAMPLE,
    seeds: d.seeds,
    cells: d.cells,
    digest: d.digest,
    engines: core.BROWSER_ENGINES.map((engine) => ({ engine, version: 'planted', digest: d.digest })),
    run: 'planted',
  });
  const good = record(digest);
  // As checkAll runs a family: the port comes from portFor over the ports at hand, and the checks see every engine they cover.
  const run = (gen, determinism = good, ports = fx.ports) => {
    const map = new Map(Object.entries(ports));
    return core.checkFamily(guarded(gen), { port: portFor(gen, map), portEngines: new Set(map.keys()), registry, determinism, keySeeds: 4 });
  };
  const results = [];
  const expect = async (name, check, promise) => {
    const r = await promise;
    const hit = r.findings.some((f) => f.check === check);
    results.push({ name, check, pass: hit, detail: hit ? r.findings.find((f) => f.check === check).message : `no ${check} finding (${r.findings.map((f) => f.check).join(', ') || 'none'})` });
  };

  const clean = await run(base);
  results.push({ name: 'the clean fixture passes', check: '-', pass: clean.findings.length === 0, detail: clean.findings.map((f) => `${f.check}: ${f.message}`).join('; ') || 'no findings' });

  const lintHits = lintDeterminism(ts, 'planted.ts', 'export const pick = (xs: number[]) => xs[Math.floor(Math.random() * xs.length)]');
  results.push({ name: 'the lint flags Math.random', check: 'lint', pass: lintHits.length === 1, detail: `${lintHits.length} finding(s)` });

  let calls = 0;
  await expect('make that counts its calls is impure', 'purity', run({ ...base, make: (s, b, t) => ({ ...base.make(s, b, t), calls: ++calls }) }));
  await expect('make that reads the clock trips the guard', 'purity', run({ ...base, make: (s, b, t) => ({ ...base.make(s, b, t), at: Date.now() }) }));
  await expect('one template breaks the contract', 'contract', run({ ...base, templates: base.templates.slice(0, 1) }));
  await expect('templates that share a shape are parameter variety', 'templates', run({ ...base, structure: () => 'the same shape' }));
  await expect('a measure outside its band', 'banding', run({ ...base, measure: (i) => ({ ...base.measure(i), span: 99 }) }));
  await expect('a digest that differs from the recorded one', 'determinism', run(base, { ...good, digest: 'sha256:planted', cells: { ...good.cells, 't1/b1': 'sha256:planted' } }));
  await expect('a digest no WebKit run confirmed', 'determinism', run(base, { ...good, engines: good.engines.filter((e) => e.engine !== 'webkit') }));
  await expect('a key kept although its checker said unknown', 'unknown', run({ ...base, key: async (i, p) => {
    await p.run({ engine: fx.BOX_ENGINE, version: fx.BOX_VERSION, input: { op: 'sat', formula: i.data.property, vars: i.data.vars, span: i.data.span }, budget: { wallMs: 1000 } }).catch(() => null);
    return base.key(i, fx.boxPort);
  } }));
  const tamper = (fn) => async (i, p) => {
    const k = await base.key(i, p);
    return core.isDiscard(k) ? k : fn(k, i);
  };
  await expect('a key that leaves a pair of options untold', 'distractors', run({ ...base, key: tamper((k) => ({ ...k, choices: k.choices.map((c) => ({ ...c, distinctions: c.distinctions.slice(1) })) })) }));
  await expect('a witness that does not replay', 'distractors', run({ ...base, replay: () => false }));
  await expect('a key that is not the reference', 'distractors', run({ ...base, key: tamper((k, i) => ({ ...k, choices: k.choices.map((c) => ({ ...c, answer: i.item.parts[0].options.find((o) => o.id !== c.answer).id })) })) }));
  await expect('a key that discards every seed', 'distractors', run({ ...base, key: async () => core.discard('equivalent', 'planted') }));
  await expect('a grader that matches everything', 'grading', run({ ...base, grade: async () => ({ ok: true, why: 'planted', basis: 'planted' }) }));

  // Pending templates. A family shaped like GEN-find-the-witness's W1 slice (one template live, two waiting for
  // engines of later waves) passes, and the report names when each lands; the faults around it all fail.
  const waitOn = (t, engine, lands) => ({ ...t, pending: { engine, lands } });
  const [t1, t2, t3] = base.templates;
  const slice = { ...base, templates: [t1, waitOn(t2, 'trace', 'W3-T27'), waitOn(t3, 'history', 'W4-T20')] };
  const sliceRecord = record(core.familyDigest(slice));
  const sliced = await run(slice, sliceRecord);
  const landsNoted = sliced.notes.some((n) => n.includes('W3-T27')) && sliced.notes.some((n) => n.includes('W4-T20'));
  results.push({
    name: 'a family with one live template and two pending passes',
    check: '-',
    pass: sliced.findings.length === 0 && sliced.pending.length === 2 && landsNoted,
    detail: sliced.findings.map((f) => `${f.check}: ${f.message}`).join('; ') || `no findings; pending ${sliced.pending.map((p) => `${p.template} until ${p.lands}`).join(', ')}`,
  });
  let refused = null;
  try {
    await core.drawInstance(slice, fx.boxPort, { seed: 1, band: 1, template: 't2' });
  } catch (e) {
    refused = e;
  }
  results.push({ name: 'a pending template that gets drawn', check: 'pending', pass: refused instanceof core.PendingTemplateError, detail: refused ? refused.message : 'the draw served an item from a pending template' });
  const liveTrace = { ...slice, engines: [...base.engines, 'trace'], templates: [t1, t2, slice.templates[2]] };
  await expect('a template that is not pending whose engine has no port', 'unknown', run(liveTrace, record(core.familyDigest(liveTrace))));
  await expect('a template still pending once its engine has a port', 'pending', run(slice, sliceRecord, { ...fx.ports, trace: fx.boxPort }));
  await expect('a pending template that lands with no tracker task', 'registry', run({ ...slice, templates: [t1, waitOn(t2, 'trace', 'W9-T99'), slice.templates[2]] }, sliceRecord));
  await expect('every template pending breaks the contract', 'contract', run({ ...base, templates: base.templates.map((t) => waitOn(t, 'trace', 'W3-T27')) }));
  return results;
}

// ------------------------------------------------------------------ main

export async function main(argv, io = { out: (s) => process.stdout.write(`${s}\n`), err: (s) => process.stderr.write(`${s}\n`) }) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (e) {
    io.err(`verify-generators: ${e.message}\n${USAGE}`);
    return 2;
  }
  if (o.selfCheck) {
    const results = await selfCheck();
    for (const r of results) io.out(`${r.pass ? 'held' : 'FAIL'}  ${r.check.padEnd(11)}  ${r.name}: ${r.detail}`);
    const failed = results.filter((r) => !r.pass).length;
    io.out(failed === 0 ? `GATE-generators self-check: green (${results.length} cases held)` : `GATE-generators self-check: FAIL (${failed} of ${results.length} cases did not hold)`);
    return failed === 0 ? 0 : 1;
  }
  const result = await checkAll(o, io);
  if (result.error) {
    io.err(`verify-generators: ${result.error}`);
    return result.exit;
  }
  if (o.json) io.out(JSON.stringify({ exit: result.exit, lint: result.lint, reports: result.reports, findings: result.findings, browsers: result.browsers, written: result.written }, null, 2));
  else for (const l of formatReport(result, o.verbose)) io.out(l);
  return result.exit;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
