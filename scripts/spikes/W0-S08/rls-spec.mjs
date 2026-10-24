// W0-S08: the row-level-security specimens of S7.L4 and the single-session specimens of RUN-pglite,
// written once and run unchanged against PostgreSQL 18.6 (node-postgres), PGlite under Node and
// PGlite in a browser module worker.
//
// Environment-neutral on purpose: no node: imports and no DOM, so the same file loads in Node and in a worker.
// An executor is { run(sql, params?) -> outcome }, and an outcome is one of
//   { kind: 'rows',  fields: [name], rows: [[value]], count }   (a statement that returns a row set)
//   { kind: 'count', count }                                     (any other statement; count from the command tag, 0 for DDL)
//   { kind: 'error', sqlstate, message, detail }
// Nothing here measures time: the callers do.

export const SPEC_VERSION = '1'

// ---------------------------------------------------------------------------------------------
// Small helpers

export const USER_POOL = ['dana', 'frank', 'gia', 'hal', 'eli', 'ivy', 'jo', 'kim']

export function lit(s) { return "'" + String(s).replace(/'/g, "''") + "'" }

export function canon(v) {
  // canonical JSON: sorted keys, BigInt as string
  return JSON.stringify(v, (k, x) => {
    if (typeof x === 'bigint') return x.toString()
    if (x && typeof x === 'object' && !Array.isArray(x)) return Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]]))
    return x
  })
}

export async function sha256hex(text) {
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Wraps a PGlite instance as an executor. Rows come back as arrays so both drivers agree.
export function pgliteExecutor(db) {
  return {
    name: 'pglite',
    async run(sql, params = []) {
      try {
        const r = await db.query(sql, params, { rowMode: 'array' })
        if (r.fields && r.fields.length > 0) return { kind: 'rows', fields: r.fields.map((f) => f.name), rows: r.rows.map(normRow), count: r.rows.length }
        return { kind: 'count', count: Number(r.affectedRows ?? 0) }
      } catch (e) {
        return { kind: 'error', sqlstate: e.code ?? null, message: e.message, detail: e.detail ?? null }
      }
    },
  }
}

export function normRow(row) { return row.map((v) => (typeof v === 'bigint' ? v.toString() : v)) }

// Wraps an executor and counts statements, errors and time spent in the engine.
export function counting(ex) {
  const st = { count: 0, errors: 0, ms: 0 }
  return {
    st, name: ex.name,
    async run(sql, params) {
      const t = globalThis.performance.now()
      const o = await ex.run(sql, params)
      st.ms += globalThis.performance.now() - t
      st.count++
      if (o.kind === 'error') st.errors++
      return o
    },
  }
}

// ---------------------------------------------------------------------------------------------
// The access model: S7's three read rules, evaluated in plain code, independent of both engines.
//
//   inteam(u, t)  :- member(u, t, _).       inteam(u, t) :- inteam(u, s), subteam(s, t).
//   canread(u, d) :- inteam(u, t), owns(t, d).                      % rule 1
//   canread(u, d) :- share_user(d, u), !revoked(d, u).              % rule 2
//   canread(u, d) :- inteam(u, t), share_team(d, t).                % rule 3
//
// A world is { users, teams: [{id, name, tenant}], subteams: [{child, parent}], members: [{user, team, role}],
//              docs: [{id, slug, team, shared_teams: [teamId]}], shares: [{doc, user, revoked}] }.

export function inTeams(world, user) {
  const seen = new Set(world.members.filter((m) => m.user === user).map((m) => m.team))
  const stack = [...seen]
  while (stack.length) {
    const t = stack.pop()
    for (const s of world.subteams) if (s.child === t && !seen.has(s.parent)) { seen.add(s.parent); stack.push(s.parent) }
  }
  return seen
}

export function canread(world) {
  const matrix = {}
  const fired = { rule1: 0, rule2: 0, rule3: 0 }
  for (const u of world.users) {
    const teams = inTeams(world, u)
    const ids = []
    for (const d of world.docs) {
      const r1 = teams.has(d.team)
      const r2 = world.shares.some((s) => s.doc === d.id && s.user === u && !s.revoked)
      const r3 = d.shared_teams.some((t) => teams.has(t))
      if (r1) fired.rule1++
      if (r2) fired.rule2++
      if (r3) fired.rule3++
      if (r1 || r2 || r3) ids.push(d.id)
    }
    matrix[u] = ids.sort()
  }
  return { matrix, fired }
}

export function worldStats(world) {
  const { matrix, fired } = canread(world)
  const cells = world.users.length * world.docs.length
  const allowed = Object.values(matrix).reduce((n, ids) => n + ids.length, 0)
  const teamless = world.users.filter((u) => !world.members.some((m) => m.user === u)).length
  return {
    users: world.users.length, teams: world.teams.length, docs: world.docs.length, shares: world.shares.length,
    revoked: world.shares.filter((s) => s.revoked).length, nested: world.subteams.length, teamless,
    cells, allowed, trivial: allowed === 0 || allowed === cells,
    rule1: fired.rule1 > 0, rule2: fired.rule2 > 0, rule3: fired.rule3 > 0,
  }
}

// ---------------------------------------------------------------------------------------------
// Worlds

// The spike's reference world: S7's W0 (Acme and Birch; Payments, Growth and Legal; dana, frank, gia, hal;
// the documents q3-plan, roadmap, contract and layoffs-memo; share_user(contract, dana); share_team(roadmap,
// Payments)) plus four additions that the lesson's rules need: Risk, a team nested in Payments, with eli in it;
// ivy, a teamless user; and a revoked share of roadmap to gia.
export const WORLD_W0 = {
  users: ['dana', 'frank', 'gia', 'hal', 'eli', 'ivy'],
  teams: [
    { id: 1, name: 'Payments', tenant: 'Acme' }, { id: 2, name: 'Growth', tenant: 'Acme' },
    { id: 3, name: 'Legal', tenant: 'Birch' }, { id: 4, name: 'Risk', tenant: 'Acme' },
  ],
  subteams: [{ child: 4, parent: 1 }],
  members: [
    { user: 'dana', team: 1, role: 'editor' }, { user: 'frank', team: 2, role: 'viewer' },
    { user: 'gia', team: 3, role: 'admin' }, { user: 'hal', team: 3, role: 'viewer' }, { user: 'eli', team: 4, role: 'viewer' },
  ],
  docs: [
    { id: 'contract', slug: 'contract', team: 3, shared_teams: [] },
    { id: 'layoffs-memo', slug: 'layoffs-memo', team: 3, shared_teams: [] },
    { id: 'q3-plan', slug: 'q3-plan', team: 1, shared_teams: [] },
    { id: 'roadmap', slug: 'roadmap', team: 2, shared_teams: [1] },
  ],
  shares: [{ doc: 'contract', user: 'dana', revoked: false }, { doc: 'roadmap', user: 'gia', revoked: true }],
}

// Seeded generator with S7's ranges: 2-3 tenants, 2-5 teams, 3-8 users, 3-10 documents, nesting depth 0-2,
// shares, revocations and teamless users. WF1 (a member belongs to the team's tenant), WF2 (a subteam belongs to
// its parent's tenant) and WF3 (subteam is acyclic: a child always has a higher id than its parent) hold by construction.
export function generateWorld(seed) {
  const r = mulberry32(Math.imul(seed, 2654435761) ^ 0x9e3779b9)
  const int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1))
  const tenants = ['Acme', 'Birch', 'Cobalt'].slice(0, int(2, 3))
  const nTeams = int(2, 5)
  const teams = Array.from({ length: nTeams }, (_, i) => ({ id: i + 1, name: 'T' + (i + 1), tenant: tenants[int(0, tenants.length - 1)] }))
  const maxDepth = int(0, 2)
  const depth = new Map(teams.map((t) => [t.id, 0]))
  const subteams = []
  for (const t of teams.slice(1)) {
    if (r() < 0.45) {
      const parents = teams.filter((p) => p.id < t.id && p.tenant === t.tenant && depth.get(p.id) + 1 <= maxDepth)
      if (parents.length) { const p = parents[int(0, parents.length - 1)]; subteams.push({ child: t.id, parent: p.id }); depth.set(t.id, depth.get(p.id) + 1) }
    }
  }
  const nUsers = int(3, 8)
  const users = USER_POOL.slice(0, nUsers)
  const members = []
  const populated = tenants.filter((tn) => teams.some((t) => t.tenant === tn))
  for (const u of users) {
    if (r() < 0.15) continue // teamless
    const tenant = populated[int(0, populated.length - 1)]
    const options = teams.filter((t) => t.tenant === tenant)
    const first = options[int(0, options.length - 1)]
    members.push({ user: u, team: first.id, role: ['viewer', 'editor', 'admin'][int(0, 2)] })
    if (r() < 0.2) {
      const second = options[int(0, options.length - 1)]
      if (second.id !== first.id) members.push({ user: u, team: second.id, role: ['viewer', 'editor', 'admin'][int(0, 2)] })
    }
  }
  const nDocs = int(3, 10)
  const docs = Array.from({ length: nDocs }, (_, i) => {
    const id = 'd' + String(i + 1).padStart(2, '0')
    const shared = []
    if (r() < 0.4) for (let k = int(1, 2); k > 0; k--) { const t = int(1, nTeams); if (!shared.includes(t)) shared.push(t) }
    return { id, slug: 's' + String(i + 1).padStart(2, '0'), team: int(1, nTeams), shared_teams: shared.sort((a, b) => a - b) }
  })
  const shares = []
  for (let k = int(0, 4); k > 0; k--) {
    const doc = docs[int(0, nDocs - 1)].id
    const user = users[int(0, nUsers - 1)]
    if (!shares.some((s) => s.doc === doc && s.user === user)) shares.push({ doc, user, revoked: r() < 0.35 })
  }
  return { users, teams, subteams, members, docs, shares }
}

// ---------------------------------------------------------------------------------------------
// The schema, the functions and the policies. Names are schema-qualified so nothing depends on search_path.

export const ROLE_SETUP = [
  'CREATE ROLE app_owner NOLOGIN',
  'CREATE ROLE app_users NOLOGIN',
  ...USER_POOL.map((u) => `CREATE ROLE ${u} NOLOGIN IN ROLE app_users`),
  'CREATE ROLE rls_bypass NOLOGIN BYPASSRLS IN ROLE app_users',
]

export const SCHEMA_SETUP_AS_SUPERUSER = [
  'CREATE SCHEMA app AUTHORIZATION app_owner',
  'GRANT USAGE ON SCHEMA app TO app_users',
]

export const SCHEMA_SETUP_AS_OWNER = [
  'CREATE TABLE app.teams (id int PRIMARY KEY, name text NOT NULL, tenant text NOT NULL)',
  'CREATE TABLE app.subteams (child_id int NOT NULL REFERENCES app.teams (id), parent_id int NOT NULL REFERENCES app.teams (id))',
  "CREATE TABLE app.memberships (user_name text NOT NULL, team_id int NOT NULL REFERENCES app.teams (id), role text NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')), PRIMARY KEY (user_name, team_id))",
  "CREATE TABLE app.documents (id text PRIMARY KEY, slug text NOT NULL UNIQUE, team_id int NOT NULL REFERENCES app.teams (id), title text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '', internal_notes text NOT NULL DEFAULT '', shared_team_ids int[] NOT NULL DEFAULT '{}')",
  'CREATE TABLE app.shares (doc_id text NOT NULL REFERENCES app.documents (id), user_name text NOT NULL, revoked boolean NOT NULL DEFAULT false)',
  // the team closure, independent of the Datalog engine; a teamless user gets '{}', never NULL
  `CREATE FUNCTION app.user_teams(u text) RETURNS int[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $f$
     WITH RECURSIVE t(team_id) AS (
       SELECT m.team_id FROM app.memberships m WHERE m.user_name = u
       UNION
       SELECT s.parent_id FROM app.subteams s JOIN t ON s.child_id = t.team_id)
     SELECT coalesce(array_agg(team_id ORDER BY team_id), '{}'::int[]) FROM t $f$`,
  `CREATE FUNCTION app.editor_teams(u text) RETURNS int[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $f$
     SELECT coalesce(array_agg(m.team_id ORDER BY m.team_id), '{}'::int[]) FROM app.memberships m WHERE m.user_name = u AND m.role <> 'viewer' $f$`,
  // two small tables for the specimens about default deny and TO <role>
  'CREATE TABLE app.notes (id int PRIMARY KEY, body text NOT NULL)',
  'CREATE TABLE app.vault (id int PRIMARY KEY, secret text NOT NULL)',
  "INSERT INTO app.notes VALUES (1, 'n1'), (2, 'n2')",
  "INSERT INTO app.vault VALUES (1, 's1'), (2, 's2')",
  'GRANT SELECT, INSERT, UPDATE ON app.documents TO app_users',
  'GRANT SELECT ON app.shares, app.notes, app.vault TO app_users',
  'ALTER TABLE app.documents ENABLE ROW LEVEL SECURITY',
  'ALTER TABLE app.notes ENABLE ROW LEVEL SECURITY',
  'ALTER TABLE app.vault ENABLE ROW LEVEL SECURITY',
]

const UT = "app.user_teams(current_setting('app.user', true))"
const ET = "app.editor_teams(current_setting('app.user', true))"

export const POLICIES = {
  read_team: `CREATE POLICY read_team ON app.documents FOR SELECT USING (team_id = ANY (${UT}))`,
  read_shared: `CREATE POLICY read_shared ON app.documents FOR SELECT USING (EXISTS (SELECT 1 FROM app.shares s WHERE s.doc_id = documents.id AND s.user_name = current_setting('app.user', true) AND NOT s.revoked))`,
  read_team_shared: `CREATE POLICY read_team_shared ON app.documents FOR SELECT USING (shared_team_ids && ${UT})`,
  edit_team: `CREATE POLICY edit_team ON app.documents FOR UPDATE USING (team_id = ANY (${ET})) WITH CHECK (team_id = ANY (${ET}))`,
  insert_team: `CREATE POLICY insert_team ON app.documents FOR INSERT WITH CHECK (team_id = ANY (${UT}))`,
}

export const POLICY_SETUP = [
  ...Object.values(POLICIES),
  'CREATE POLICY notes_read ON app.notes FOR SELECT TO app_users USING (true)', // vault has no policy: default deny
]

// The four generated variants of S7.L4's graded item (restrictive for permissive; <@ for &&; a dropped
// NOT s.revoked; a missing policy). Each replaces or drops one policy of the baseline.
export const VARIANTS = {
  restrictive: { policy: 'read_team', create: POLICIES.read_team.replace('ON app.documents FOR', 'ON app.documents AS RESTRICTIVE FOR') },
  subset: { policy: 'read_team_shared', create: POLICIES.read_team_shared.replace('shared_team_ids &&', 'shared_team_ids <@') },
  norevoke: { policy: 'read_shared', create: POLICIES.read_shared.replace(' AND NOT s.revoked', '') },
  missing: { policy: 'read_team_shared', create: null },
}

export function worldLoadStatements(world) {
  const rows = (xs, f) => xs.map(f).join(', ')
  const stmts = ['TRUNCATE app.shares, app.documents, app.memberships, app.subteams, app.teams']
  stmts.push(`INSERT INTO app.teams VALUES ${rows(world.teams, (t) => `(${t.id}, ${lit(t.name)}, ${lit(t.tenant)})`)}`)
  if (world.subteams.length) stmts.push(`INSERT INTO app.subteams VALUES ${rows(world.subteams, (s) => `(${s.child}, ${s.parent})`)}`)
  if (world.members.length) stmts.push(`INSERT INTO app.memberships VALUES ${rows(world.members, (m) => `(${lit(m.user)}, ${m.team}, ${lit(m.role)})`)}`)
  stmts.push(`INSERT INTO app.documents (id, slug, team_id, title, shared_team_ids) VALUES ${rows(world.docs, (d) => `(${lit(d.id)}, ${lit(d.slug)}, ${d.team}, ${lit(d.id + ' title')}, '{${d.shared_teams.join(',')}}')`)}`)
  if (world.shares.length) stmts.push(`INSERT INTO app.shares VALUES ${rows(world.shares, (s) => `(${lit(s.doc)}, ${lit(s.user)}, ${s.revoked})`)}`)
  return stmts
}

// ---------------------------------------------------------------------------------------------
// The S7.L4 differential, in the lesson's shape: SET ROLE u; set app.user to u; SELECT id FROM documents.
// (The lesson writes the second statement as SET app.user = 'u'; that is a syntax error, see P1.02.)

export async function visibleAs(ex, user) {
  const a = await ex.run(`SET ROLE ${user}`)
  const b = await ex.run('SELECT set_config($1, $2, false)', ['app.user', user])
  const c = await ex.run('SELECT id FROM app.documents ORDER BY id')
  if (a.kind === 'error' || b.kind === 'error' || c.kind === 'error') return { error: [a, b, c].find((o) => o.kind === 'error') }
  return { ids: c.rows.map((r) => r[0]).sort() }
}

function diff(actual, expected) {
  const extra = actual.filter((x) => !expected.includes(x))
  const missing = expected.filter((x) => !actual.includes(x))
  return { extra, missing }
}

// Differential of one world under one policy variant: for every user, visible ids against the matrix row.
export async function differential(ex, world, matrix) {
  const out = {}
  let disagreements = 0
  for (const u of world.users) {
    const v = await visibleAs(ex, u)
    if (v.error) { out[u] = { error: v.error.sqlstate }; disagreements++; continue }
    const d = diff(v.ids, matrix[u] ?? [])
    out[u] = { visible: v.ids, extra: d.extra, missing: d.missing }
    disagreements += d.extra.length + d.missing.length
  }
  return { perUser: out, disagreements }
}

async function swapPolicy(ex, variant) {
  await ex.run('RESET ROLE')
  await ex.run(`DROP POLICY ${variant.policy} ON app.documents`)
  if (variant.create) await ex.run(variant.create)
}

async function restorePolicy(ex, variant) {
  await ex.run('RESET ROLE')
  if (variant.create) await ex.run(`DROP POLICY ${variant.policy} ON app.documents`)
  await ex.run(POLICIES[variant.policy])
}

// ---------------------------------------------------------------------------------------------
// Setup: roles (once per server), then schema, world and policies. Both return the outcome of every statement.

async function logged(ex, log, sql) {
  const o = await ex.run(sql)
  log.push({ sql, ok: o.kind !== 'error', sqlstate: o.kind === 'error' ? o.sqlstate : null })
  return o
}

export async function setupRoles(ex) {
  const log = []
  for (const s of ROLE_SETUP) await logged(ex, log, s)
  return log
}

export async function setupSchema(ex, world = WORLD_W0) {
  const log = []
  await logged(ex, log, 'RESET ROLE')
  for (const s of SCHEMA_SETUP_AS_SUPERUSER) await logged(ex, log, s)
  await logged(ex, log, 'SET ROLE app_owner')
  for (const s of SCHEMA_SETUP_AS_OWNER) await logged(ex, log, s)
  await logged(ex, log, 'RESET ROLE')
  for (const s of worldLoadStatements(world)) await logged(ex, log, s)
  for (const s of POLICY_SETUP) await logged(ex, log, s)
  return log
}

// ---------------------------------------------------------------------------------------------
// Part 1: the named specimens of S7.L4 on the reference world. Each step is one statement or a
// small fixed group; the result is a list of { id, claim, sql, outcome } plus checks against the matrix.

export async function runPart1(ex) {
  const world = WORLD_W0
  const { matrix } = canread(world)
  const steps = []
  const checks = []
  const rec = (id, claim, sql, outcome) => { steps.push({ id, claim, sql, outcome }); return outcome }
  const q = async (id, claim, sql, params) => rec(id, claim, params ? `${sql}  -- ${canon(params)}` : sql, await ex.run(sql, params))
  const check = (id, claim, actual, expected) => checks.push({ id, claim, actual, expected, pass: canon(actual) === canon(expected) })
  const ids = (o) => (o.kind === 'rows' ? o.rows.map((r) => r[0]).sort() : o)
  const asUser = async (u) => { await ex.run(`SET ROLE ${u}`); await ex.run('SELECT set_config($1, $2, false)', ['app.user', u]) }

  const setupLog = [...(await setupRoles(ex)), ...(await setupSchema(ex, world))]
  check('P1.00', 'setup statements all succeed', setupLog.filter((s) => !s.ok).length, 0)

  // P1.01 an unset app.user fails closed (the setting is NULL in a fresh session)
  await ex.run('SET ROLE dana')
  const unset = await q('P1.01a', 'app.user was never set: current_setting(..., true) is NULL', "SELECT current_setting('app.user', true) IS NULL AS unset")
  const none = await q('P1.01b', 'dana with an unset app.user sees no row', 'SELECT id FROM app.documents ORDER BY id')
  check('P1.01', 'an unset app.user fails closed', { unset: unset.rows?.[0]?.[0], visible: ids(none) }, { unset: true, visible: [] })
  await ex.run('RESET ROLE')

  // P1.02 the lesson writes SET app.user = 'u'; user is a reserved word
  const lit1 = await q('P1.02', "the lesson's literal statement: SET app.user = 'dana'", "SET app.user = 'dana'")
  check('P1.02', "SET app.user = 'dana' is a syntax error", lit1.kind === 'error' ? lit1.sqlstate : lit1, '42601')
  await q('P1.03a', 'the quoted form is accepted', `SET app."user" = 'dana'`)
  const got = await q('P1.03b', 'and sets the same setting', "SELECT current_setting('app.user', true)")
  check('P1.03', 'app."user" and app.user name the same setting', got.rows?.[0]?.[0], 'dana')
  await q('P1.03c', "set_config('app.user', ..., false) is the form the harness uses", "SELECT set_config('app.user', 'dana', false)")

  // P1.04 the catalog read-back of the policies and of the flags (the receipt's policy hash and read-backs)
  const flags = await q('P1.04a', 'relrowsecurity and relforcerowsecurity read back from pg_class', "SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = 'app.documents'::regclass")
  check('P1.04a', 'RLS enabled, not forced', flags.rows?.[0], [true, false])
  const pols = await q('P1.04b', 'pg_policies lists the five policies of documents, deparsed', "SELECT policyname, permissive, roles::text, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'app' AND tablename = 'documents' ORDER BY policyname")
  check('P1.04b', 'five policies', pols.rows?.length, 5)

  // P1.05 the SET ROLE differential on the reference world
  const base = await differential(ex, world, matrix)
  rec('P1.05', 'SET ROLE differential, baseline policies, six users', 'SET ROLE u; set app.user; SELECT id FROM app.documents', { kind: 'rows', fields: ['user', 'visible'], rows: Object.entries(base.perUser).map(([u, v]) => [u, v.visible ?? v.error]), count: world.users.length })
  check('P1.05', 'zero disagreements with the matrix', base.disagreements, 0)
  await ex.run('RESET ROLE')

  // P1.06 the four variants of the graded item, on the reference world
  for (const [name, variant] of Object.entries(VARIANTS)) {
    await swapPolicy(ex, variant)
    const d = await differential(ex, world, matrix)
    rec(`P1.06.${name}`, `variant ${name}: disagreements with the matrix`, `DROP POLICY ${variant.policy}${variant.create ? '; ' + variant.create.slice(0, 60) + '...' : ''}`, {
      kind: 'rows', fields: ['user', 'extra', 'missing'], rows: Object.entries(d.perUser).map(([u, v]) => [u, v.extra ?? v.error, v.missing ?? null]), count: world.users.length,
    })
    check(`P1.06.${name}`, `variant ${name} disagrees with the matrix somewhere`, d.disagreements > 0, true)
    await restorePolicy(ex, variant)
  }
  const again = await differential(ex, world, matrix)
  check('P1.06.restored', 'baseline restored: zero disagreements', again.disagreements, 0)

  // P1.07 UPDATE on a row the policy hides: no error, no row
  await asUser('frank')
  const hidden = await q('P1.07', "frank updates q3-plan, which his policies hide", "UPDATE app.documents SET title = 'x' WHERE id = 'q3-plan'")
  check('P1.07', 'UPDATE 0 and no error', hidden, { kind: 'count', count: 0 })
  const viewer = await q('P1.08', 'frank (a viewer) updates roadmap, which he can see but may not edit', "UPDATE app.documents SET title = 'x' WHERE id = 'roadmap'")
  check('P1.08', 'UPDATE 0 for a viewer', viewer, { kind: 'count', count: 0 })

  // P1.09 an editor updates; WITH CHECK refuses a move to a team she does not edit
  await asUser('dana')
  const ok = await q('P1.09', 'dana (an editor of Payments) updates q3-plan', "UPDATE app.documents SET title = 'Q3 plan v2' WHERE id = 'q3-plan'")
  check('P1.09', 'UPDATE 1', ok, { kind: 'count', count: 1 })
  const move = await q('P1.10', 'dana moves q3-plan to Growth, where she is not an editor', 'UPDATE app.documents SET team_id = 2 WHERE id = \'q3-plan\'')
  check('P1.10', 'WITH CHECK raises 42501', move.kind === 'error' ? [move.sqlstate, move.message] : move, ['42501', 'new row violates row-level security policy for table "documents"'])
  await ex.run('RESET ROLE')
  const still = await q('P1.10b', 'the row is unchanged (read as the superuser)', "SELECT team_id FROM app.documents WHERE id = 'q3-plan'")
  check('P1.10b', 'q3-plan still belongs to Payments', still.rows?.[0]?.[0], 1)

  // P1.11 INSERT policy
  await asUser('frank')
  const insBad = await q('P1.11a', 'frank inserts a document into Legal, which is not his team', "INSERT INTO app.documents (id, slug, team_id) VALUES ('n1', 'n1', 3)")
  check('P1.11a', 'WITH CHECK raises 42501', insBad.kind === 'error' ? insBad.sqlstate : insBad, '42501')
  const insOk = await q('P1.11b', 'frank inserts a document into Growth', "INSERT INTO app.documents (id, slug, team_id) VALUES ('n2', 'n2', 2)")
  check('P1.11b', 'INSERT 1', insOk, { kind: 'count', count: 1 })
  await ex.run('RESET ROLE')
  await ex.run("DELETE FROM app.documents WHERE id = 'n2'")

  // P1.12 the covert channel: a unique constraint is checked against rows the user cannot see
  await asUser('frank')
  const withRow = await q('P1.12a', "frank inserts slug 'layoffs-memo' into Growth; Birch already has that slug in a row he cannot see", "INSERT INTO app.documents (id, slug, team_id) VALUES ('f1', 'layoffs-memo', 2)")
  await ex.run('RESET ROLE')
  await ex.run("DELETE FROM app.documents WHERE id = 'layoffs-memo'")
  await asUser('frank')
  const withoutRow = await q('P1.12b', 'the same insert in the paired world, where Birch has no such row', "INSERT INTO app.documents (id, slug, team_id) VALUES ('f1', 'layoffs-memo', 2)")
  await ex.run('RESET ROLE')
  await ex.run("DELETE FROM app.documents WHERE id = 'f1'")
  await ex.run("INSERT INTO app.documents (id, slug, team_id, title) VALUES ('layoffs-memo', 'layoffs-memo', 3, 'layoffs-memo title')")
  // the same duplicate, from a role that row security does not bind: the error then carries the value in its DETAIL line
  const asSuper = await q('P1.12c', "the same duplicate insert as the superuser, for whom row security is off: the DETAIL line names the key", "INSERT INTO app.documents (id, slug, team_id) VALUES ('f2', 'layoffs-memo', 2)")
  check('P1.12c', 'the superuser sees the key in the error detail; under row security the detail is withheld', { superuser: asSuper.kind === 'error' ? [asSuper.sqlstate, asSuper.detail] : asSuper, bound: withRow.kind === 'error' ? withRow.detail : withRow }, { superuser: ['23505', 'Key (slug)=(layoffs-memo) already exists.'], bound: null })
  check('P1.12a', 'unique violation 23505 although the row is invisible', withRow.kind === 'error' ? withRow.sqlstate : withRow, '23505')
  check('P1.12b', 'the paired world succeeds', withoutRow, { kind: 'count', count: 1 })
  check('P1.12', 'the two outcomes differ: one bit crosses the tenant boundary', canon(withRow) !== canon(withoutRow), true)

  // P1.13 the owner: bypass without FORCE, bound with FORCE
  await ex.run('SET ROLE app_owner')
  await ex.run('SELECT set_config($1, $2, false)', ['app.user', 'frank'])
  const ownerBefore = await q('P1.13a', 'the table owner, app.user = frank, FORCE off', 'SELECT id FROM app.documents ORDER BY id')
  check('P1.13a', 'the owner sees every row', ids(ownerBefore), world.docs.map((d) => d.id).sort())
  await q('P1.13b', 'the owner forces row security on its own table', 'ALTER TABLE app.documents FORCE ROW LEVEL SECURITY')
  const flags2 = await q('P1.13c', 'relforcerowsecurity reads back true', "SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid = 'app.documents'::regclass")
  check('P1.13c', 'RLS enabled and forced', flags2.rows?.[0], [true, true])
  const ownerAfter = await q('P1.13d', 'the owner, app.user = frank, FORCE on', 'SELECT id FROM app.documents ORDER BY id')
  check('P1.13d', "the owner now sees frank's matrix row", ids(ownerAfter), matrix.frank)
  await ex.run('RESET ROLE')

  // P1.14 default deny, and the owner without a policy
  await asUser('dana')
  const vaultUser = await q('P1.14a', 'vault has RLS on and no policy: a member of app_users', 'SELECT id FROM app.vault ORDER BY id')
  await ex.run('SET ROLE app_owner')
  const vaultOwner = await q('P1.14b', 'vault, the owner, FORCE off', 'SELECT id FROM app.vault ORDER BY id')
  await q('P1.14c', 'FORCE on vault', 'ALTER TABLE app.vault FORCE ROW LEVEL SECURITY')
  const vaultOwnerForced = await q('P1.14d', 'vault, the owner, FORCE on', 'SELECT id FROM app.vault ORDER BY id')
  check('P1.14', 'default deny binds users and, once forced, the owner; the unforced owner sees all', { user: ids(vaultUser), owner: ids(vaultOwner), forced: ids(vaultOwnerForced) }, { user: [], owner: ['1', '2'].map(Number), forced: [] })
  await ex.run('RESET ROLE')

  // P1.15 a policy limited TO app_users, and the owner (not a member) under FORCE
  await ex.run('SET ROLE app_owner')
  const notesBefore = await q('P1.15a', 'notes (policy TO app_users), the owner, FORCE off', 'SELECT id FROM app.notes ORDER BY id')
  await q('P1.15b', 'FORCE on notes', 'ALTER TABLE app.notes FORCE ROW LEVEL SECURITY')
  const notesAfter = await q('P1.15c', 'notes, the owner, FORCE on: no policy applies to the owner', 'SELECT id FROM app.notes ORDER BY id')
  await asUser('dana')
  const notesUser = await q('P1.15d', 'notes, dana, a member of app_users', 'SELECT id FROM app.notes ORDER BY id')
  check('P1.15', 'TO app_users leaves the forced owner with nothing', { before: ids(notesBefore), after: ids(notesAfter), member: ids(notesUser) }, { before: [1, 2], after: [], member: [1, 2] })
  await ex.run('RESET ROLE')

  // P1.16 the superuser and a BYPASSRLS role bypass even a forced table
  const who = await q('P1.16a', 'the default connection role', 'SELECT current_user, session_user, (SELECT rolsuper FROM pg_roles WHERE rolname = current_user)')
  const superRows = await q('P1.16b', 'the default role reads documents with FORCE on', 'SELECT id FROM app.documents ORDER BY id')
  await ex.run('SET ROLE rls_bypass')
  const bypassRows = await q('P1.16c', 'a BYPASSRLS role reads documents with FORCE on', 'SELECT id FROM app.documents ORDER BY id')
  await ex.run('RESET ROLE')
  check('P1.16', 'superuser and BYPASSRLS see every row of a forced table', { superuser: ids(superRows).length, bypass: ids(bypassRows).length, rolsuper: who.rows?.[0]?.[2] }, { superuser: world.docs.length, bypass: world.docs.length, rolsuper: true })

  // P1.17 a setting that lasts for one transaction: how an application sets app.user per request on a pooled connection.
  // FORCE is still on from P1.13, so the owner is bound by the policies.
  await ex.run("SELECT set_config('app.user', 'nobody', false)")
  await q('P1.17a', 'BEGIN', 'BEGIN')
  await q('P1.17b', 'SET LOCAL ROLE app_owner inside the transaction', 'SET LOCAL ROLE app_owner')
  await q('P1.17c', "set_config('app.user', 'frank', true) is local to the transaction", "SELECT set_config('app.user', 'frank', true)")
  const inTx = await q('P1.17d', 'the owner, forced, inside the transaction as frank', 'SELECT id FROM app.documents ORDER BY id')
  await q('P1.17e', 'COMMIT', 'COMMIT')
  const afterTx = await q('P1.17f', 'after COMMIT the role and the setting are back', "SELECT current_user, current_setting('app.user', true)")
  check('P1.17', 'inside the transaction frank sees his matrix row; after COMMIT the role and the setting are back', { inside: ids(inTx), after: afterTx.rows?.[0] }, { inside: matrix.frank, after: ['postgres', 'nobody'] })
  await q('P1.17g', 'BEGIN again', 'BEGIN')
  await q('P1.17h', 'a statement that fails inside the transaction', 'SELECT 1/0')
  const aborted = await q('P1.17i', 'the next statement is refused', 'SELECT 1')
  await q('P1.17j', 'ROLLBACK', 'ROLLBACK')
  check('P1.17i', 'the transaction is aborted until it ends (25P02)', aborted.kind === 'error' ? aborted.sqlstate : aborted, '25P02')

  // P1.18 the owner connection, emulated by switching the session user. On PostgreSQL, RESET SESSION AUTHORIZATION
  // returns to the connected role. Run last: on PGlite 0.5.11 it does not (see the decision record).
  await q('P1.18a', 'SET SESSION AUTHORIZATION app_owner', 'SET SESSION AUTHORIZATION app_owner')
  const sa1 = await q('P1.18b', 'who am I', 'SELECT current_user, session_user')
  await q('P1.18c', 'RESET SESSION AUTHORIZATION', 'RESET SESSION AUTHORIZATION')
  const sa2 = await q('P1.18d', 'who am I after the reset', 'SELECT current_user, session_user')
  await ex.run('SET SESSION AUTHORIZATION postgres')
  const sa3 = await q('P1.18e', 'who am I after SET SESSION AUTHORIZATION postgres', 'SELECT current_user, session_user')
  check('P1.18b', 'SET SESSION AUTHORIZATION switches both names', sa1.rows?.[0], ['app_owner', 'app_owner'])
  check('P1.18d', 'RESET SESSION AUTHORIZATION returns to the connected role', sa2.rows?.[0], ['postgres', 'postgres'])
  check('P1.18e', 'SET SESSION AUTHORIZATION postgres returns to it', sa3.rows?.[0], ['postgres', 'postgres'])
  await ex.run('RESET ALL')

  return { setup: setupLog, steps, checks }
}

// ---------------------------------------------------------------------------------------------
// Part 2: n seeded worlds. For each world, the baseline differential, the four variants, and the owner probe.
// Results carry hashes of the full visible-id maps so engines can be compared exactly without storing every row;
// the first `detailSeeds` worlds keep their full maps.

export async function runPart2(ex, n, opts = {}) {
  const { roles = false, detailSeeds = 3, onProgress } = opts
  const now = () => globalThis.performance.now()
  const results = []
  // rebuild the schema (roles stay), then each world replaces the data
  await ex.run('RESET ROLE')
  if (roles) await setupRoles(ex)
  await ex.run('DROP SCHEMA IF EXISTS app CASCADE')
  await setupSchema(ex, WORLD_W0)
  for (let seed = 1; seed <= n; seed++) {
    const t0 = now()
    const world = generateWorld(seed)
    const { matrix } = canread(world)
    await ex.run('RESET ROLE')
    for (const s of worldLoadStatements(world)) {
      const o = await ex.run(s)
      if (o.kind === 'error') throw new Error(`world ${seed}: ${s.slice(0, 60)} -> ${o.sqlstate} ${o.message}`)
    }
    const tLoad = now()
    const base = await differential(ex, world, matrix)
    const tBase = now()
    const variants = {}
    const variantDetail = {}
    for (const [name, variant] of Object.entries(VARIANTS)) {
      await swapPolicy(ex, variant)
      const d = await differential(ex, world, matrix)
      const perUser = Object.fromEntries(Object.entries(d.perUser).map(([u, v]) => [u, v.error ? { error: v.error } : { extra: v.extra, missing: v.missing }]))
      variants[name] = { disagreements: d.disagreements, hash: await sha256hex(canon(perUser)) }
      variantDetail[name] = perUser
      await restorePolicy(ex, variant)
    }
    const tVar = now()
    // owner probe: the application query run as the table owner, without and with FORCE
    const probe = {}
    for (const mode of ['noforce', 'force']) {
      await ex.run('RESET ROLE')
      await ex.run(mode === 'force' ? 'ALTER TABLE app.documents FORCE ROW LEVEL SECURITY' : 'ALTER TABLE app.documents NO FORCE ROW LEVEL SECURITY')
      let dis = 0
      for (const u of world.users) {
        await ex.run('SET ROLE app_owner')
        await ex.run('SELECT set_config($1, $2, false)', ['app.user', u])
        const o = await ex.run('SELECT id FROM app.documents ORDER BY id')
        const d = diff(o.kind === 'rows' ? o.rows.map((r) => r[0]).sort() : [], matrix[u])
        dis += d.extra.length + d.missing.length
      }
      probe[mode] = dis
    }
    await ex.run('RESET ROLE')
    const tEnd = now()
    const visible = Object.fromEntries(Object.entries(base.perUser).map(([u, v]) => [u, v.visible ?? { error: v.error }]))
    const row = {
      seed, worldHash: await sha256hex(canon(world)), matrixHash: await sha256hex(canon(matrix)), stats: worldStats(world),
      baseline: { disagreements: base.disagreements, hash: await sha256hex(canon(visible)) },
      variants, ownerProbe: probe,
      ms: { load: tLoad - t0, baseline: tBase - tLoad, variants: tVar - tBase, ownerProbe: tEnd - tVar, total: tEnd - t0 },
    }
    if (seed <= detailSeeds) row.detail = { world, matrix, visible, variants: variantDetail }
    results.push(row)
    if (onProgress && seed % 25 === 0) onProgress(seed, n)
  }
  return results
}

// ---------------------------------------------------------------------------------------------
// The single-session specimens of RUN-pglite, plus the two NULL specimens of S6.L1, as statements whose
// rows, row counts and SQLSTATE can be compared exactly with PostgreSQL 18.6.

export async function runSingleSession(ex) {
  const steps = []
  const q = async (id, claim, sql, params) => { const outcome = await ex.run(sql, params); steps.push({ id, claim, sql, outcome }); return outcome }
  await q('SS.00', 'schema', 'CREATE TABLE acct (id int PRIMARY KEY, bal bigint NOT NULL CHECK (bal >= 0))')
  await q('SS.01', 'seed', 'INSERT INTO acct VALUES (1, 9223372036854775807), (2, 0)')
  await q('SS.02', 'a credit past 2^63-1 raises 22003', 'UPDATE acct SET bal = bal + 1 WHERE id = 1')
  await q('SS.03', 'a NULL amount in a guarded update affects 0 rows', 'UPDATE acct SET bal = bal - $1 WHERE id = 2 AND bal >= $1 RETURNING bal', [null])
  await q('SS.04', 'the default isolation level', 'SHOW transaction_isolation')
  await q('SS.05', 'the same bigint overflow as a SELECT', 'SELECT 9223372036854775807::bigint + 1')
  await q('SS.06', 'a CHECK accepts NULL', 'CREATE TABLE chk (id int PRIMARY KEY, bal bigint CHECK (bal >= 0))')
  await q('SS.07', 'INSERT of NULL passes the CHECK', 'INSERT INTO chk VALUES (1, NULL), (2, 50)')
  await q('SS.08', 'a guarded UPDATE skips the NULL row', 'UPDATE chk SET bal = bal - 10 WHERE bal >= 10')
  await q('SS.09', 'the rows afterwards', 'SELECT id, bal::text AS bal FROM chk ORDER BY id')
  return steps
}

// PGlite only: two interleaved db.transaction() workers, the experiment of research/evidence/A5r3/scripts/pglite-tx.mjs.
// A single connection runs them one after the other.
export async function runSerialize(db) {
  await db.exec('CREATE TABLE acct2 (id int PRIMARY KEY, bal bigint NOT NULL); INSERT INTO acct2 VALUES (1, 100)')
  const log = []
  const t0 = globalThis.performance.now()
  const stamp = (s) => log.push(s)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const worker = (name, delay) => db.transaction(async (tx) => {
    const r = await tx.query('SELECT bal FROM acct2 WHERE id = 1')
    stamp(`${name} read ${r.rows[0].bal}`)
    await sleep(delay)
    if (Number(r.rows[0].bal) >= 80) { await tx.query('UPDATE acct2 SET bal = $1 WHERE id = 1', [Number(r.rows[0].bal) - 80]); stamp(`${name} wrote ${Number(r.rows[0].bal) - 80}`) }
  })
  await Promise.all([worker('W1', 300), worker('W2', 0)])
  const final = (await db.query('SELECT bal FROM acct2 WHERE id = 1')).rows[0].bal
  return { log, final: String(final), ms: globalThis.performance.now() - t0 }
}
