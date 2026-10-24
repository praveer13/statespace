// A5 spike: Z3 Fixedpoint (Datalog) with stratified negation + an access matrix, inside Pyodide (no threads).
// Usage: node z3-datalog-neg.mjs <pyodideDir> <wheelPath>
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
const [pyodideDir, wheelPath] = process.argv.slice(2)
const { loadPyodide } = await import(pathToFileURL(path.join(pyodideDir, 'pyodide.mjs')).href)
const py = await loadPyodide({ indexURL: pyodideDir + '/', stdout: (s) => console.log(s), stderr: (s) => console.error(s) })
await py.loadPackage('micropip')
const micropip = py.pyimport('micropip')
py.FS.writeFile('/tmp/z.whl', fs.readFileSync(wheelPath))
await micropip.install('emfs:/tmp/' + path.basename(wheelPath)).catch(async () => {
  py.FS.writeFile('/tmp/' + path.basename(wheelPath), fs.readFileSync(wheelPath))
  await micropip.install('emfs:/tmp/' + path.basename(wheelPath))
})
py.runPython(`
import z3, time
# --- 1. stratified negation: canread unless revoked
fp = z3.Fixedpoint(); fp.set(engine='datalog')
S = z3.BitVecSort(8)
member = z3.Function('member', S, S, z3.BoolSort())
owns = z3.Function('owns', S, S, z3.BoolSort())
revoked = z3.Function('revoked', S, S, z3.BoolSort())
canread = z3.Function('canread', S, S, z3.BoolSort())
for r in (member, owns, revoked, canread): fp.register_relation(r)
u, t, d = z3.BitVecs('u t d', 8); fp.declare_var(u, t, d)
fp.rule(canread(u, d), [member(u, t), owns(t, d), z3.Not(revoked(u, d))])
V = lambda n: z3.BitVecVal(n, 8)
fp.fact(member(V(1), V(7))); fp.fact(owns(V(7), V(3))); fp.fact(owns(V(7), V(4))); fp.fact(revoked(V(1), V(4)))
print('neg: canread(1,3)=', fp.query(canread(V(1), V(3))), ' canread(1,4)=', fp.query(canread(V(1), V(4))))
# --- 2. access matrix size: 60 users, 12 teams, 120 docs; all (u,d) answers
fp2 = z3.Fixedpoint(); fp2.set(engine='datalog')
B = z3.BitVecSort(8)
m2 = z3.Function('m2', B, B, z3.BoolSort()); o2 = z3.Function('o2', B, B, z3.BoolSort())
sh = z3.Function('sh', B, B, z3.BoolSort()); cr = z3.Function('cr', B, B, z3.BoolSort())
for r in (m2, o2, sh, cr): fp2.register_relation(r)
a, b, c = z3.BitVecs('a b c', 8); fp2.declare_var(a, b, c)
fp2.rule(cr(a, c), [m2(a, b), o2(b, c)]); fp2.rule(cr(a, c), [sh(a, c)])
import random; random.seed(7)
for usr in range(60): fp2.fact(m2(z3.BitVecVal(usr,8), z3.BitVecVal(usr % 12, 8)))
for doc in range(120): fp2.fact(o2(z3.BitVecVal(doc % 12, 8), z3.BitVecVal(doc, 8)))
for _ in range(40): fp2.fact(sh(z3.BitVecVal(random.randrange(60),8), z3.BitVecVal(random.randrange(120),8)))
t0 = time.time()
x, y = z3.BitVecs('x y', 8)
res = fp2.query(z3.Exists([x, y], cr(x, y)))
ans = fp2.get_answer()
n = len(ans.children()) if z3.is_or(ans) else 1
print('matrix query', res, 'answer disjuncts', n, 'secs', round(time.time()-t0, 3))
`)
process.exit(0)
