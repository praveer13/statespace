// The queries GATE-conformance puts to both Z3 engines (W1-T42), and the program that runs them.
//
// Spine section 11.2: "Pyodide Z3 = native Z3 on the same queries, the recipient wrap included". The two earlier runs
// posed different queries [X RUN-z3-bv64, RUN-z3-bv64-pyodide], so no same-query comparison existed; this corpus is
// one, and it is the baseline the authored cells and generator templates join (scripts/conformance/z3-pyodide-native.mjs,
// W1-T37, is the row for those). Each query is a z3py function that returns a Solver or an Optimize object; the
// program prints one RESULT line per query: the verdict, the reason for an unknown, and the model's values.
//
// Equality rule (ARCHITECTURE.md section 13.3): verdicts are exact, and a reason for `unknown` is exact too (SP-1.7
// is a reason-stable unknown); a witness is never compared by value. Each engine's witness has to satisfy the query's
// property, which is checked here, in JavaScript, with BigInt, independently of the engine that produced it.

/** Python run on both engines, before the queries: prints the engine and defines run_query. */
export const PRELUDE = `import json, sys, z3

def _value(model, decl):
    v = model[decl]
    if z3.is_int_value(v) or z3.is_bv_value(v):
        return str(v.as_long())
    return str(v)

def run_query(query_id, build):
    out = {"id": query_id}
    try:
        solver = build()
        verdict = solver.check()
        out["verdict"] = str(verdict)
        if verdict == z3.sat:
            model = solver.model()
            out["model"] = {str(d): _value(model, d) for d in model.decls() if d.arity() == 0}
        elif verdict == z3.unknown:
            out["reason"] = solver.reason_unknown()
    except Exception as e:
        out["error"] = type(e).__name__ + ": " + str(e)
    print("RESULT " + json.dumps(out, sort_keys=True))
`;

const U64 = 2n ** 64n;
const asSigned = (v) => BigInt.asIntN(64, v);
const bv = (model, name) => {
  if (!(name in model)) throw new Error(`the model has no value for ${name}`);
  return BigInt(model[name]);
};
const needs = (cond, message) => (cond ? null : message);
const first = (...checks) => checks.find((c) => c !== null) ?? null;

/**
 * @typedef {object} Query
 * @property {string} id
 * @property {string} specimen   the specimen of spine section 5.1 that the query is the same-query pair of, or ''
 * @property {string} title
 * @property {string} python     the body of `def build():`
 * @property {{verdict: 'sat'|'unsat'|'unknown', reasonIncludes?: string}} expect   the authored answer, from the recorded runs
 * @property {(model: Record<string,string>) => string|null} [witness]   null when the model satisfies the property, else why not
 */

/** @type {Query[]} */
export const QUERIES = [
  {
    id: 'starter-overdraft',
    specimen: 'SP-1.1',
    title: "the roadmap's starter: an overdraft over Int",
    python: `a, b, amount = z3.Ints('a b amount')
s = z3.Solver()
s.add(a >= 0, b >= 0, amount > 0, a - amount < 0)
return s`,
    expect: { verdict: 'sat' },
    witness: (m) => needs(bv(m, 'a') >= 0n && bv(m, 'b') >= 0n && bv(m, 'amount') > 0n && bv(m, 'a') - bv(m, 'amount') < 0n, 'a >= 0, b >= 0, amount > 0 and a - amount < 0 do not all hold'),
  },
  {
    id: 'starter-guarded',
    specimen: 'SP-1.1',
    title: 'the same query with the guard amount <= a',
    python: `a, b, amount = z3.Ints('a b amount')
s = z3.Solver()
s.add(a >= 0, b >= 0, amount > 0, a - amount < 0)
s.add(amount <= a)
return s`,
    expect: { verdict: 'unsat' },
  },
  {
    id: 'optimize-min',
    specimen: 'SP-1.1',
    title: 'the least overdraft amount under an Optimize objective',
    python: `a, b, amount = z3.Ints('a b amount')
o = z3.Optimize()
o.add(a >= 0, b >= 0, amount > 0, a - amount < 0)
o.minimize(amount)
return o`,
    expect: { verdict: 'sat' },
    // The optimum is a value, not a model detail: it is 1 on any engine that is right.
    witness: (m) => needs(bv(m, 'amount') === 1n && bv(m, 'a') >= 0n && bv(m, 'b') >= 0n && bv(m, 'a') - bv(m, 'amount') < 0n, 'the minimum of amount is 1 and the constraints must hold'),
  },
  {
    id: 'int-conservation-noguard',
    specimen: 'SP-2.2',
    title: 'conservation over Int needs no guard: its negation is unsat',
    python: `a, b, amt = z3.Ints('a b amt')
s = z3.Solver()
s.add(z3.Not((a - amt) + (b + amt) == a + b))
return s`,
    expect: { verdict: 'unsat' },
  },
  {
    id: 'bv64-sender-guarded',
    specimen: 'SP-1.4',
    title: 'signed BitVec 64: the guarded sender cannot overdraw',
    python: `A, B, X = z3.BitVecs('A B X', 64)
s = z3.Solver()
s.add(A >= 0, B >= 0, X > 0, X <= A)
s.add(A - X < 0)
return s`,
    expect: { verdict: 'unsat' },
  },
  {
    id: 'bv64-recipient-wrap',
    specimen: 'SP-1.4',
    title: 'signed BitVec 64: the guard protects the sender, not the recipient (the same query on both engines)',
    python: `A, B, X = z3.BitVecs('A B X', 64)
s = z3.Solver()
s.add(A >= 0, B >= 0, X > 0, X <= A)
s.add(B + X < 0)
return s`,
    expect: { verdict: 'sat' },
    witness: (m) => {
      const [A, B, X] = ['A', 'B', 'X'].map((n) => bv(m, n));
      return first(
        needs(asSigned(A) >= 0n && asSigned(B) >= 0n && asSigned(X) > 0n, 'A and B must be non-negative and X positive as signed 64-bit values'),
        needs(asSigned(X) <= asSigned(A), 'the guard X <= A must hold as signed 64-bit values'),
        needs(asSigned((B + X) % U64) < 0n, 'B + X must wrap to a negative signed 64-bit value'),
      );
    },
  },
  {
    id: 'bv64-conservation',
    specimen: 'SP-1.4',
    title: 'signed BitVec 64: conservation holds modulo 2^64, so its negation is unsat',
    python: `A, B, X = z3.BitVecs('A B X', 64)
s = z3.Solver()
s.add(z3.Not((A - X) + (B + X) == A + B))
return s`,
    expect: { verdict: 'unsat' },
  },
  {
    id: 'bv64-unsigned-guard-signed-check',
    specimen: 'SP-1.5',
    title: 'a guard that mixes unsigned and signed comparisons readmits the overdraft',
    python: `A, X = z3.BitVecs('A X', 64)
s = z3.Solver()
s.add(z3.UGT(X, 0), z3.ULE(X, A))
s.add(A - X < 0)
return s`,
    expect: { verdict: 'sat' },
    witness: (m) => {
      const [A, X] = ['A', 'X'].map((n) => bv(m, n));
      return first(
        needs(X > 0n && X <= A, 'the unsigned guard 0 < X <= A must hold as unsigned 64-bit values'),
        needs(asSigned((A - X + U64) % U64) < 0n, 'A - X must be negative as a signed 64-bit value'),
      );
    },
  },
  {
    id: 'vacuous-premises',
    specimen: 'SP-1.6',
    title: 'unsat over premises that cannot hold together (a maximum transfer of 0)',
    python: `a, amount, max_transfer = z3.Ints('a amount max_transfer')
s = z3.Solver()
s.add(max_transfer == 0, a >= 0, amount > 0, amount <= max_transfer, amount <= a)
return s`,
    expect: { verdict: 'unsat' },
  },
  {
    id: 'unknown-pow',
    specimen: 'SP-1.7',
    title: 'x**y == 8 with y > 1: a reason-stable unknown',
    python: `x, y = z3.Ints('x y')
s = z3.Solver()
s.add(x**y == 8, y > 1)
return s`,
    expect: { verdict: 'unknown', reasonIncludes: 'incomplete (theory arithmetic)' },
  },
  {
    id: 'rlimit-cubes',
    specimen: 'SP-1.8',
    title: 'the cubes query under an rlimit of 5000000: unknown, canceled (rlimit works where timeout does not)',
    python: `x, y, z = z3.Ints('x y z')
s = z3.Solver()
s.set('rlimit', 5000000)
s.add(x > 2, y > 2, z > 2, x*x*x + y*y*y == z*z*z)
return s`,
    expect: { verdict: 'unknown', reasonIncludes: 'canceled' },
  },
];

const indent = (text, by = '    ') => text.split('\n').map((l) => `${by}${l}`).join('\n');

/** The whole program for a list of queries: the prelude, then one def and one run_query call per query. */
export function programFor(queries = QUERIES) {
  const parts = [PRELUDE];
  queries.forEach((q, i) => {
    parts.push(`def build_${i}():\n${indent(q.python)}\nrun_query(${JSON.stringify(q.id)}, build_${i})`);
  });
  return `${parts.join('\n\n')}\n`;
}

/**
 * The RESULT lines of one engine's output, by query id. A line that is not JSON is kept as an error so that it
 * cannot hide a query.
 * @returns {{results: Map<string, Record<string, any>>, problems: string[]}}
 */
export function parseResults(stdout) {
  const results = new Map();
  const problems = [];
  for (const line of String(stdout).split('\n')) {
    if (!line.startsWith('RESULT ')) continue;
    try {
      const doc = JSON.parse(line.slice(7));
      if (typeof doc?.id !== 'string') throw new Error('no id');
      if (results.has(doc.id)) problems.push(`a second RESULT for ${doc.id}`);
      results.set(doc.id, doc);
    } catch (e) {
      problems.push(`an unreadable RESULT line (${e instanceof Error ? e.message : e}): ${line.slice(0, 80)}`);
    }
  }
  return { results, problems };
}
