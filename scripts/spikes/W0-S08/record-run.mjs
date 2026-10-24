#!/usr/bin/env node
// W0-S08: write runs/RUN-pglite-rls.json and runs/RUN-pglite-0511.json from the outputs under runs/RUN-pglite-*/.
//
//   node scripts/spikes/W0-S08/record-run.mjs [--only rls|0511]      (from the repository root)
//
// run-all.mjs calls this at its end; it can also be run alone to rebuild the records from the files on disk.
// Every number in a verdict line is computed here from an output file. Field names follow the task rules for run
// records and the other W0 records: id, engine, version, binary_sha256, image, argv, inputs, budget, environment,
// started_at, duration_s, exit_code, verdict_lines, outputs, notes, and configs[] for one entry per configuration.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const H = 'scripts/spikes/W0-S08'
const HARNESS_FILES = [
  'package.json', 'package-lock.json', 'rls-spec.mjs', 'run-node.mjs', 'compare.mjs', 'serve.mjs', 'precompress.mjs', 'browser-run.mjs',
  'browser/index.html', 'browser/worker.mjs', 'size-report.mjs', 'summarize-first-load.mjs', 'gh-pages-probe.mjs', 'npm-meta.mjs', 'run-all.mjs', 'record-run.mjs',
].map((f) => `${H}/${f}`)
const OLD_EVIDENCE = ['research/evidence/A5r3/scripts/pglite.mjs', 'research/evidence/A5r3/scripts/pglite-tx.mjs', 'research/evidence/a2r3/scripts/pglite_check.mjs']
const ENGINES = ['chromium', 'firefox', 'webkit']
const SETUP = ['npm-ci', 'precompress-0.5.11', 'precompress-0.5.10', 'start-postgresql']
const SCHEMA_NOTE = 'This record was not validated against run@1: schemas/run.schema.json did not exist when it was recorded (W0-S11 owns it). Field names follow the task rules for run records and the other W0 records.'

const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const json = (root, p) => JSON.parse(readFileSync(path.join(root, p), 'utf8'))
const walk = (dir) => readdirSync(dir).sort().flatMap((n) => { const p = path.join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p] })
const fmt = (n) => Number(n).toLocaleString('en-US')
const signed = (n) => (n >= 0 ? '+' : '-') + fmt(Math.abs(n))
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2 }
const r1 = (x) => Math.round(x * 10) / 10

function outputInfo(root, p) { return { path: p, sha256: sha(path.join(root, p)), bytes: statSync(path.join(root, p)).size } }

function common(root, dir) {
  const commands = readFileSync(path.join(root, dir, 'commands.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  const env = json(root, `${dir}/environment.json`)
  const start = commands[0].started_at
  const last = commands.at(-1)
  const end = Date.parse(last.started_at) + last.duration_s * 1000
  const outputs = walk(path.join(root, dir)).map((f) => path.relative(root, f)).map((f) => outputInfo(root, f))
  return {
    commands, env, started_at: start, recorded_at: new Date().toISOString(),
    duration_s: Math.round((end - Date.parse(start)) / 10) / 100, exit_code: commands.every((c) => c.exit_code === 0) ? 0 : 1, outputs,
  }
}

function environmentBlock(env, flagsFor, emulation) {
  const arch = env.arch === 'x64' ? 'x86_64' : env.arch
  return {
    os: `${env.os} ${arch}`, cpu_count: env.cpu_count, ram_gib: env.memory_gib,
    container: {
      runtime: 'docker', server_version: env.docker_server,
      image: env.images.playwright.ref, id: env.images.playwright.id, digest: env.images.playwright.id,
      reference_image: env.images.postgres.ref, reference_digest: env.images.postgres.id,
      run_flags: flagsFor, network: 'Docker default bridge; the harness server listens on loopback inside the container; PostgreSQL is published on a loopback port of the host',
    },
    host_tools: { node: env.node, node_zlib: env.node_zlib, npm: env.npm, playwright_core: env.playwright_core, pg_driver: env.pg_driver },
    cpu_architecture: arch,
    load_average_at_start: env.loadavg_start, load_average_at_end: env.loadavg_end,
    emulated: Boolean(emulation),
    ...(emulation ? { emulation } : {}),
  }
}

const inputsFor = (root, extra = [], role = 'harness') => [...HARNESS_FILES.map((p) => ({ path: p, sha256: sha(path.join(root, p)), role })), ...extra.map((p) => ({ path: p, sha256: sha(path.join(root, p)), role: 'earlier evidence, run unchanged' }))]
const base = (c) => ({ id: c.id, purpose: c.purpose, argv: c.argv, started_at: c.started_at, duration_s: c.duration_s, exit_code: c.exit_code })
const setupOf = (commands) => commands.filter((c) => SETUP.includes(c.id)).map(base)

// ---------------------------------------------------------------------------------------------------------------

function recordRls(root) {
  const dir = 'runs/RUN-pglite-rls'
  const p = common(root, dir)
  const summary = json(root, `${dir}/summary.json`)
  const pg = json(root, `${dir}/pg-18.6.json`)
  const node = json(root, `${dir}/pglite-0.5.11-node.json`)
  const browsers = Object.fromEntries(ENGINES.map((e) => [e, json(root, `${dir}/${e}.json`)]))
  const wasm = sha(path.join(root, `${H}/node_modules/@electric-sql/pglite/dist/pglite.wasm`))
  const resultOf = { 'postgresql-18.6': pg, 'pglite-0.5.11-node': node, ...Object.fromEntries(ENGINES.map((e) => [`pglite-0.5.11-${e}`, browsers[e].rls])) }
  const labelOf = { 'postgresql-18.6': 'pg-18.6', 'pglite-0.5.11-node': 'pglite-0.5.11-node', ...Object.fromEntries(ENGINES.map((e) => [`pglite-0.5.11-${e}`, e])) }
  const failed = (r) => r.part1.checks.filter((c) => !c.pass).map((c) => c.id)
  const per = (r) => { const w = r.part2.worlds; return `the whole run took ${r.duration_s} s (start-up, part 1, ${w.length} worlds and the single-session specimens), ${fmt(r.statements.count)} statements, median ${r1(med(w.map((x) => x.ms.total)))} ms per world` }
  const step = (r, id) => r.part1.steps.find((s) => s.id === id)?.outcome

  const configs = []
  for (const c of p.commands.filter((x) => !SETUP.includes(x.id))) {
    const out = base(c)
    const r = resultOf[c.id]
    if (r) {
      const e = summary.engines[labelOf[c.id]]
      const isPg = c.id === 'postgresql-18.6'
      const lines = [
        `${r.server_version}`,
        `part 1: ${r.part1.steps.length} steps, ${r.part1.checks.filter((x) => x.pass).length}/${r.part1.checks.length} checks pass${failed(r).length ? ' (failed: ' + failed(r).join(', ') + ')' : ''}`,
        `${per(r)}; baseline disagreements with the matrix ${e.part2.baseline_disagreements}; owner probe under FORCE, disagreements ${e.part2.owner_probe_force_disagreements}`,
      ]
      if (!isPg) lines.push(`against PostgreSQL 18.6: ${e.part1.steps - e.part1.step_divergences.length}/${e.part1.steps} part 1 steps equal, ${e.part2.worlds - e.part2.divergent_worlds.length}/${e.part2.worlds} worlds equal, ${e.single_session.steps - e.single_session.divergences.length}/${e.single_session.steps} single-session steps equal; known divergence: ${e.known_divergences.map((d) => d.id).join(', ') || 'none'}; unexplained: ${e.unexplained.length}`)
      Object.assign(out, {
        engine: isPg ? 'PostgreSQL' : 'PGlite', version: isPg ? '18.6' : node.package.version, version_string: r.server_version,
        binary_sha256: isPg ? p.env.postgres.binary_sha256 : wasm,
        ...(isPg ? { image: `${p.env.images.postgres.ref}@${p.env.images.postgres.id}`, driver: p.env.pg_driver } : {}),
        ...(!isPg && labelOf[c.id] !== 'pglite-0.5.11-node' ? { image: `${p.env.images.playwright.ref}@${p.env.images.playwright.id}`, browser: { name: labelOf[c.id], version: browsers[labelOf[c.id]].browser_version, user_agent: browsers[labelOf[c.id]].user_agent } } : {}),
        ...(labelOf[c.id] === 'pglite-0.5.11-node' ? { runtime: `node ${node.node}` } : {}),
        statements: r.statements, verdict_lines: lines,
        outputs: [outputInfo(root, `${dir}/${labelOf[c.id] === 'pg-18.6' ? 'pg-18.6' : labelOf[c.id] === 'pglite-0.5.11-node' ? 'pglite-0.5.11-node' : labelOf[c.id]}.json`)],
      })
    } else if (c.id === 'compare-with-postgresql') {
      Object.assign(out, { engine: 'harness', verdict_lines: summary.verdict_lines, outputs: [outputInfo(root, `${dir}/summary.json`)] })
    }
    configs.push(out)
  }

  const lines = [...summary.verdict_lines]
  lines.push(`timing, PostgreSQL 18.6 over TCP from Node: ${per(pg)}`)
  lines.push(`timing, PGlite 0.5.11 under Node: ${per(node)}`)
  for (const e of ENGINES) lines.push(`timing, PGlite 0.5.11 in ${e} ${browsers[e].browser_version} (module worker): ${per(browsers[e].rls)}`)
  lines.push(`checks that fail on PGlite: ${[...new Set([node, ...ENGINES.map((e) => browsers[e].rls)].flatMap(failed))].join(', ') || 'none'}; on PostgreSQL 18.6: ${failed(pg).join(', ') || 'none'}`)
  const lit = step(pg, 'P1.02'), litG = step(node, 'P1.02')
  lines.push(`SET app.user = 'dana' (the lesson's text): PostgreSQL ${lit.sqlstate} "${lit.message}"; PGlite ${litG.sqlstate} "${litG.message}"`)
  lines.push(`after RESET SESSION AUTHORIZATION (current_user, session_user): PostgreSQL ${step(pg, 'P1.18d').rows[0].join(', ')}; PGlite ${step(node, 'P1.18d').rows[0].join(', ')}`)
  const flags = (r, id) => step(r, id).rows[0].join('/')
  lines.push(`pg_class read-back (relrowsecurity/relforcerowsecurity) before and after FORCE: PostgreSQL ${flags(pg, 'P1.04a')} then ${flags(pg, 'P1.13c')}; PGlite ${flags(node, 'P1.04a')} then ${flags(node, 'P1.13c')}`)
  const keys = (r, id) => step(r, id).rows.filter((x) => x[1].length || x[2].length).map((x) => `${x[0]}${x[1].length ? ' +' + x[1].join(',') : ''}${x[2].length ? ' -' + x[2].join(',') : ''}`).join('; ')
  for (const v of ['restrictive', 'subset', 'norevoke', 'missing']) lines.push(`reference world, variant ${v}, disagreements with the matrix on PGlite (+ extra ids, - missing ids): ${keys(node, 'P1.06.' + v)}; equal to PostgreSQL: ${JSON.stringify(step(node, 'P1.06.' + v)) === JSON.stringify(step(pg, 'P1.06.' + v))}`)
  lines.push(`PGlite default role: ${step(node, 'P1.16a').rows[0].join(', ')} (current_user, session_user, rolsuper); PostgreSQL: ${step(pg, 'P1.16a').rows[0].join(', ')}`)

  const flagsFor = ['--rm', '--init', '--ipc=host', '--memory=6g', '-v <harness>:/work:ro', '-v <gzip copies>:/gz:ro', '-w /work']
  return {
    id: 'RUN-pglite-rls',
    title: 'Row-level security in PGlite 0.5.11 against PostgreSQL 18.6 (W0-S08)',
    engine: 'PGlite',
    version: node.package.version,
    version_string: node.server_version,
    binary: `pglite.wasm in @electric-sql/pglite@${node.package.version}`,
    binary_sha256: wasm,
    image: `${p.env.images.playwright.ref}@${p.env.images.playwright.id}`,
    recorded_at: p.recorded_at,
    started_at: p.started_at,
    argv: ['node', `${H}/run-all.mjs`, '--worlds', String(node.part2.n)],
    inputs: inputsFor(root),
    budget: {
      worlds: node.part2.n, seeds: `1..${node.part2.n}`, users_per_world: '3..8', variants: ['restrictive', 'subset', 'norevoke', 'missing'],
      part1_steps: pg.part1.steps.length, part1_checks: pg.part1.checks.length,
    },
    limits: {
      container_memory: p.env.container_memory, containers_at_once: 1, statement_timeout: 'none', browser_timeout_ms: 900000,
      cross_origin_isolation: 'none: no COOP, COEP or CORP headers',
    },
    exit_code: p.exit_code,
    duration_s: p.duration_s,
    verdict_lines: lines,
    outputs: p.outputs,
    environment: environmentBlock(p.env, flagsFor),
    setup: setupOf(p.commands),
    primary_config: 'compare-with-postgresql',
    notes: [
      'Reference: PostgreSQL 18.6 (the postgres:18 image) on one node-postgres connection, in a fresh container started for this run and removed at its end. Compared: PGlite 0.5.11 under Node 22 and in a module worker in Chromium, Firefox and WebKit as shipped by Playwright 1.63.0, headless, in the Playwright container, served from a loopback server that sends no cross-origin isolation headers.',
      'The browsers are desktop engines on a 20-CPU host, not phones; no timing in this record is a phone timing.',
      'The access matrix is computed in plain code from S7\'s three read rules and compared with what each engine returns under SET ROLE. Equality between engines is exact on rows, row counts, SQLSTATE, message and detail; per-world results compare as SHA-256 hashes of the full visible-id maps, and the first three worlds keep their full maps in the result files.',
      'The reference world is S7\'s W0 plus Risk (a team nested in Payments, with eli in it), ivy (a teamless user) and a revoked share of roadmap to gia. Generated worlds follow S7\'s ranges, with WF1 to WF3 true by construction, and each seed gives the same world in every engine (the world hash is compared).',
      'The SQL under test is this harness\'s realization of S7.L4\'s policies and functions (the lesson\'s own text for the three read policies; the UPDATE and INSERT policies and user_teams are written here). The lab template\'s policies and harness do not exist yet.',
      'The policy-subquery race under READ COMMITTED (catalog row H17) needs two sessions and cannot run on PGlite\'s single connection; it is not tested here.',
      'PGlite\'s default connection role is the superuser postgres, which bypasses row security even on a forced table, so every RLS specimen switches role with SET ROLE first; the owner connection is emulated by SET ROLE to the table owner.',
      'RUN-pglite-rls and RUN-pglite-0511 come from one invocation of run-all.mjs; each lists the commands it used under configs and setup.',
      SCHEMA_NOTE,
    ],
    configs,
  }
}

// ---------------------------------------------------------------------------------------------------------------

function record0511(root) {
  const dir = 'runs/RUN-pglite-0511'
  const p = common(root, dir)
  const meta = json(root, `${dir}/npm-meta.json`)
  const size = json(root, `${dir}/size-manifest.json`)
  const fl = json(root, `${dir}/first-load-summary.json`)
  const cmp = json(root, `${dir}/compare-0.5.10-vs-0.5.11.json`)
  const gh = json(root, `${dir}/gh-pages-probe.json`)
  const node11 = json(root, 'runs/RUN-pglite-rls/pglite-0.5.11-node.json'), node10 = json(root, `${dir}/pglite-0.5.10-node.json`)
  const m11 = meta.versions['0.5.11'], m10 = meta.versions['0.5.10']
  const b11 = size.builds.find((b) => b.label === '0.5.11'), b10 = size.builds.find((b) => b.label === '0.5.10')
  const wasm11 = b11.files.find((f) => f.path === 'pglite.wasm').sha256, wasm10 = b10.files.find((f) => f.path === 'pglite.wasm').sha256
  const eng = Object.entries(fl.engines)
  const version = eng[0][1].modes.gzip.version[0]
  const e11 = cmp.engines[node11.label]
  const cmpS = size.comparison[0]
  const txt = (f) => readFileSync(path.join(root, `${dir}/${f}`), 'utf8').split('\n').filter(Boolean)
  const flLines = Object.fromEntries(fl.verdict_lines.map((l) => [l.split(' ')[0], l]))

  const byId = {
    'npm-meta': () => ({ engine: 'npm registry', verdict_lines: [`@electric-sql/pglite 0.5.11 published ${m11.published}; the latest dist-tag at recording is ${meta.dist_tags.latest}; tarball ${fmt(m11.tarball_bytes)} B, sha256 ${m11.tarball_sha256}; registry and lockfile integrity match: ${m11.integrity_matches_registry && m11.integrity_matches_lockfile}`, `0.5.10 published ${m10.published}; tarball ${fmt(m10.tarball_bytes)} B, sha256 ${m10.tarball_sha256}`, `0.5.11 license ${m11.license}, dependencies ${JSON.stringify(m11.dependencies)}, unpacked ${fmt(m11.dist.unpacked_size)} B in ${m11.dist.file_count} files`], outputs: [outputInfo(root, `${dir}/npm-meta.json`)] }),
    'pglite-0.5.10-node': () => ({ engine: 'PGlite', version: '0.5.10', version_string: node10.server_version, binary_sha256: wasm10, runtime: `node ${node10.node}`, statements: node10.statements, verdict_lines: [node10.server_version, `part 1: ${node10.part1.steps.length} steps, ${node10.part1.checks.filter((x) => x.pass).length}/${node10.part1.checks.length} checks pass (failed: ${node10.part1.checks.filter((x) => !x.pass).map((x) => x.id).join(', ') || 'none'})`], outputs: [outputInfo(root, `${dir}/pglite-0.5.10-node.json`)] }),
    'compare-0.5.10-vs-0.5.11': () => ({ engine: 'harness', verdict_lines: [`0.5.11 against 0.5.10 under Node, same specimens: ${e11.part1.steps - e11.part1.step_divergences.length}/${e11.part1.steps} part 1 steps equal, ${e11.part2.worlds - e11.part2.divergent_worlds.length}/${e11.part2.worlds} worlds equal, ${e11.single_session.steps - e11.single_session.divergences.length}/${e11.single_session.steps} single-session steps equal, unexplained divergences ${e11.unexplained.length}`, `version() under Node: 0.5.10 "${node10.server_version}"; 0.5.11 "${node11.server_version}"`], outputs: [outputInfo(root, `${dir}/compare-0.5.10-vs-0.5.11.json`)] }),
    'gh-pages-probe': () => ({ engine: 'harness', verdict_lines: gh.rows.map((r) => `${r.kind}: ${r.url.split('/').slice(2).join('/')} sent ${r.content_encoding}, ${fmt(r.content_length_sent)} B for ${fmt(r.decoded_bytes)} B; stock zlib ${gh.zlib} exact at level ${JSON.stringify(r.exact_matches.node_zlib_levels)}, GNU gzip exact at ${JSON.stringify(r.exact_matches.gnu_gzip_levels)}`), outputs: [outputInfo(root, `${dir}/gh-pages-probe.json`)] }),
    'size-manifest': () => ({ engine: 'harness', verdict_lines: [
      `first load of 0.5.11 as requested by the browsers: ${b11.files.length} files, ${fmt(b11.totals.raw)} B raw; gzip level 5 ${fmt(b11.totals.gzip5)} B (${b11.totals_mb.gzip5} MB, ${b11.totals_mib.gzip5} MiB); gzip 6 ${fmt(b11.totals.gzip6)} B; gzip 9 ${fmt(b11.totals.gzip9)} B; Brotli 11 ${fmt(b11.totals.brotli11)} B (${b11.totals_mb.brotli11} MB)`,
      `against OD-6's "5 MB": gzip level 5 is above 5,000,000 B: ${b11.above_5_000_000.gzip5}, above 5,242,880 B: ${b11.above_5_242_880.gzip5}; Brotli 11 is above 5,000,000 B: ${b11.above_5_000_000.brotli11}`,
      `by file class (raw / gzip 5, in bytes): ${Object.entries(b11.by_class).map(([k, c]) => `${k} ${fmt(c.raw_bytes)} / ${fmt(c.gzip5_bytes)}`).join('; ')}`,
      `bytes the browser run's server sent and the engine's resource timing reported equal the computed gzip 5 sum: ${b11.cross_check.equal} (${fmt(b11.cross_check.server_log_bytes_sent)} B)`,
      `package files the first load does not request: ${b11.not_loaded.files}, ${fmt(b11.not_loaded.bytes)} B, of which ${b11.not_loaded.extension_tarballs} extension tarballs, ${fmt(b11.not_loaded.extension_tarball_bytes)} B (largest ${b11.not_loaded.largest_extension.path}, ${fmt(b11.not_loaded.largest_extension.bytes)} B)`,
      `0.5.11 against 0.5.10, first load: raw ${signed(cmpS.raw_delta_bytes)} B (${fmt(b10.totals.raw)} to ${fmt(b11.totals.raw)}); gzip 5 ${signed(cmpS.gzip5_delta_bytes)} B (${fmt(b10.totals.gzip5)} to ${fmt(b11.totals.gzip5)}); Brotli 11 ${signed(cmpS.brotli11_delta_bytes)} B`,
    ], outputs: [outputInfo(root, `${dir}/size-manifest.json`)] }),
    'summarize-first-load': () => ({ engine: 'harness', verdict_lines: fl.verdict_lines, outputs: [outputInfo(root, `${dir}/first-load-summary.json`)] }),
    'first-load-chromium-0.5.10': () => ({ engine: 'PGlite', version: '0.5.10', binary_sha256: wasm10, verdict_lines: [`0.5.10 first load in chromium: ${b10.files.length} files, ${fmt(b10.totals.raw)} B raw, gzip 5 ${fmt(b10.totals.gzip5)} B, Brotli 11 ${fmt(b10.totals.brotli11)} B; cross-check equal ${b10.cross_check.equal}`], outputs: [outputInfo(root, `${dir}/first-load-chromium-0.5.10.json`)] }),
    'cdp-throttle-chromium': () => ({ engine: 'PGlite', version: '0.5.11', binary_sha256: wasm11, emulated: true, verdict_lines: [fl.verdict_lines.find((l) => l.startsWith('Chromium CDP'))], outputs: [outputInfo(root, `${dir}/throttle-chromium.json`)] }),
  }
  for (const e of ENGINES) {
    byId[`first-load-${e}`] = () => ({ engine: 'PGlite', version: '0.5.11', version_string: version, binary_sha256: wasm11, image: `${p.env.images.playwright.ref}@${p.env.images.playwright.id}`, verdict_lines: [flLines[e]], outputs: [outputInfo(root, `${dir}/first-load-${e}.json`)] })
    byId[`specimens-${e}`] = () => {
      const s = json(root, `${dir}/specimens-${e}.json`).specimens
      return { engine: 'PGlite', version: '0.5.11', version_string: s.server_version, binary_sha256: wasm11, image: `${p.env.images.playwright.ref}@${p.env.images.playwright.id}`,
        verdict_lines: [...s.single_session.map((x) => `${x.id} ${x.claim}: ${x.outcome.kind === 'error' ? x.outcome.sqlstate + ' ' + x.outcome.message : x.outcome.kind === 'rows' ? JSON.stringify(x.outcome.rows) : 'count ' + x.outcome.count}`), `two interleaved workers: ${JSON.stringify(s.serialize.log)}, final balance ${s.serialize.final}`], outputs: [outputInfo(root, `${dir}/specimens-${e}.json`)] }
    }
  }
  for (const v of ['0.5.11', '0.5.10']) {
    byId[`script-pglite-${v}`] = () => ({ engine: 'PGlite', version: v, binary_sha256: v === '0.5.11' ? wasm11 : wasm10, runtime: `node ${node11.node}`, verdict_lines: txt(`script-pglite-${v}.txt`), outputs: [outputInfo(root, `${dir}/script-pglite-${v}.txt`)] })
    byId[`script-pglite-tx-${v}`] = () => ({ engine: 'PGlite', version: v, binary_sha256: v === '0.5.11' ? wasm11 : wasm10, runtime: `node ${node11.node}`, verdict_lines: txt(`script-pglite-tx-${v}.txt`), outputs: [outputInfo(root, `${dir}/script-pglite-tx-${v}.txt`)] })
  }
  byId['script-pglite-check-0.5.11'] = () => ({ engine: 'PGlite', version: '0.5.11', binary_sha256: wasm11, runtime: `node ${node11.node}`, verdict_lines: txt('script-pglite-check-0.5.11.txt'), outputs: [outputInfo(root, `${dir}/script-pglite-check-0.5.11.txt`)] })
  for (const e of ENGINES) {
    byId[`memory-${e}`] = () => ({ engine: 'PGlite', version: '0.5.11', binary_sha256: wasm11, image: `${p.env.images.playwright.ref}@${p.env.images.playwright.id}`, verdict_lines: [fl.verdict_lines.find((l) => l.startsWith(`memory, ${e}:`))], outputs: [outputInfo(root, `${dir}/memory-${e}.json`)] })
  }
  for (const q of ['20', '1', '0.5', '0.25']) {
    byId[`slow-cpu-${q}-chromium`] = () => ({ engine: 'PGlite', version: '0.5.11', binary_sha256: wasm11, emulated: true, cpu_quota: q, image: `${p.env.images.playwright.ref}@${p.env.images.playwright.id}`, verdict_lines: [fl.verdict_lines.find((l) => l.startsWith(`emulated slow CPU (cpus=${q})`))], outputs: [outputInfo(root, `${dir}/slow-chromium-cpus${q}.json`)] })
  }

  const configs = p.commands.filter((c) => !SETUP.includes(c.id)).map((c) => {
    const out = base(c)
    if (c.id === 'pglite-0.5.11-node') return { ...out, engine: 'PGlite', version: '0.5.11', note: 'the same run as in RUN-pglite-rls; its output is runs/RUN-pglite-rls/pglite-0.5.11-node.json' }
    if (!byId[c.id]) throw new Error('no record rule for ' + c.id)
    const extra = byId[c.id]()
    if (extra.verdict_lines?.some((l) => l === undefined)) throw new Error('missing verdict line for ' + c.id)
    return { ...out, ...extra }
  })

  const lines = []
  lines.push(`@electric-sql/pglite 0.5.11 was published ${m11.published}; the latest dist-tag at recording is ${meta.dist_tags.latest}; tarball ${fmt(m11.tarball_bytes)} B, sha256 ${m11.tarball_sha256}; registry and lockfile integrity match: ${m11.integrity_matches_registry && m11.integrity_matches_lockfile}`)
  lines.push(`version() in every browser run: ${eng.every(([, e]) => e.modes.gzip.version.length === 1 && e.modes.gzip.version[0] === version) ? version : 'differs between engines'}`)
  lines.push(`version() under Node: 0.5.10 "${node10.server_version}"; 0.5.11 "${node11.server_version}"`)
  lines.push(...byId['compare-0.5.10-vs-0.5.11']().verdict_lines.slice(0, 1))
  lines.push(...byId['size-manifest']().verdict_lines)
  lines.push(...fl.verdict_lines)
  const matched = gh.rows.filter((r) => r.exact_matches.node_zlib_levels.length > 0)
  const levels = [...new Set(matched.flatMap((r) => r.exact_matches.node_zlib_levels))]
  lines.push(`GitHub Pages probe (public sites, not this deployment): ${gh.rows.map((r) => `${r.content_type.split(';')[0]} sent ${r.content_encoding}`).join('; ')}; the body length equalled stock zlib ${gh.zlib} at level ${levels.join('/')} for ${matched.length} of ${gh.rows.length} files, and the host sent gzip although the request offered br`)
  lines.push(`RUN-pglite's pglite.mjs on 0.5.11: ${txt('script-pglite-0.5.11.txt').map((l) => l.replace(/^\d+ms /, '').replace(/ on wasm32.*$/, '')).join(' | ')}`)
  lines.push(`RUN-pglite's pglite-tx.mjs on 0.5.11: ${txt('script-pglite-tx-0.5.11.txt').map((l) => l.replace(/^\d+ms /, '')).join(' | ')}`)
  lines.push(`RUN-pglite's pglite_check.mjs on 0.5.11: ${txt('script-pglite-check-0.5.11.txt').slice(1).join(' | ')}`)

  const flagsFor = ['--rm', '--init', '--ipc=host', '--memory=6g', '(slow-CPU configurations add --cpus=<quota>)', '-v <harness>:/work:ro', '-v <gzip copies>:/gz:ro', '-w /work']
  return {
    id: 'RUN-pglite-0511',
    title: 'PGlite 0.5.11: the pin, its specimens and its first-load size (W0-S08)',
    engine: 'PGlite',
    version: '0.5.11',
    version_string: version,
    binary: 'pglite.wasm in @electric-sql/pglite@0.5.11',
    binary_sha256: wasm11,
    image: `${p.env.images.playwright.ref}@${p.env.images.playwright.id}`,
    recorded_at: p.recorded_at,
    started_at: p.started_at,
    argv: ['node', `${H}/run-all.mjs`, '--repeat', String(fl.engines.chromium.modes.gzip.cold_runs)],
    inputs: inputsFor(root, OLD_EVIDENCE).concat([{ path: 'runs/RUN-pglite-rls/pglite-0.5.11-node.json', sha256: sha(path.join(root, 'runs/RUN-pglite-rls/pglite-0.5.11-node.json')), role: 'output of RUN-pglite-rls, compared with 0.5.10' }]),
    budget: {
      cold_loads_per_engine_and_encoding: fl.engines.chromium.modes.gzip.cold_runs, fresh_instances_per_load: 5, encodings: ['identity', 'gzip level 5, precompressed on the host with stock zlib'],
      worlds_for_the_patch_release_comparison: node10.part2.n, slow_cpu_quotas: ['20', '1', '0.5', '0.25'], slow_repeats: fl.engines.chromium.modes.gzip.cold_runs,
    },
    limits: {
      container_memory: p.env.container_memory, containers_at_once: 1, browser_timeout_ms: { first_load: 180000, slow: 600000 },
      cross_origin_isolation: 'none: no COOP, COEP or CORP headers', cache_control_sent: 'public, max-age=600',
    },
    exit_code: p.exit_code,
    duration_s: p.duration_s,
    verdict_lines: lines,
    outputs: p.outputs,
    environment: environmentBlock(p.env, flagsFor, 'the slow-CPU configurations emulate a slow device by capping the container\'s CPU quota (docker --cpus); the CDP-throttle configuration tries Chromium\'s CPU throttle; neither is a phone'),
    setup: setupOf(p.commands),
    primary_config: 'size-manifest',
    notes: [
      'First-load sizes are what the engine requested on a cold load of a page whose module worker imports PGlite and makes one query; the page and worker files are excluded. Wire sizes are gzip bodies made on the host with stock zlib at level 5, the level at which GitHub Pages\' gzip output matched byte for byte on four probed public files; GitHub Pages sent gzip and no Brotli to a client that offered both.',
      'No `.data` file was probed and no file as large as pglite.wasm was probed (the probed files are under 1 MB), so the host\'s behavior for a 10 MB wasm file is an assumption until the first deployment is measured. Brotli sizes are what a host that encoded with Brotli 11 would send; GitHub Pages does not.',
      'Browser timings are desktop engines on a 20-CPU host, not phones. Chromium\'s CPU throttle does not reach a worker (the probe loop does not slow), so the slow-CPU configurations cap the whole container\'s CPU quota instead: an emulation that slows every browser thread together, pessimistic for a multi-core phone, calibrated by the probe loop. Neither is a phone measurement.',
      'wasm_memory_bytes is the byte length of the instance\'s linear memory, read from the Emscripten module; resident memory is the sum of VmRSS of every process in the container except the driver, sampled every 100 ms.',
      'The load average at the start and end is in the environment block; other work ran on the machine at the same time, so timings are indicative, not benchmark-grade.',
      'RUN-pglite\'s scripts ran unchanged on 0.5.11 and on 0.5.10; pglite_check.mjs ran on 0.5.11 only, because it resolves the package by its name.',
      'RUN-pglite-rls and RUN-pglite-0511 come from one invocation of run-all.mjs; each lists the commands it used under configs and setup.',
      SCHEMA_NOTE,
    ],
    configs,
  }
}

const REBUILT = 'This record was rebuilt from the outputs on disk by record-run.mjs (its SHA-256 is in the inputs) after run-all.mjs finished; no measurement was repeated.'

export function record(root, { only, rebuilt = false } = {}) {
  const out = []
  if (!only || only === 'rls') out.push(['runs/RUN-pglite-rls.json', recordRls(root)])
  if (!only || only === '0511') out.push(['runs/RUN-pglite-0511.json', record0511(root)])
  if (rebuilt) for (const [, rec] of out) rec.notes.splice(rec.notes.length - 1, 0, REBUILT)
  for (const [file, rec] of out) { writeFileSync(path.join(root, file), JSON.stringify(rec, null, 2) + '\n'); console.error(`wrote ${file} (${rec.verdict_lines.length} verdict lines, ${rec.outputs.length} outputs, ${rec.configs.length} configs)`) }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--only')
  record(process.cwd(), { only: i > 0 ? process.argv[i + 1] : undefined, rebuilt: true })
}
