// Usage: node z3unk.mjs <pyodide dir> <z3 wheel>
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
const [pyodideDir, wheelPath] = process.argv.slice(2)
const { loadPyodide } = await import(pathToFileURL(path.join(pyodideDir, 'pyodide.mjs')).href)
const py = await loadPyodide({ indexURL: path.resolve(pyodideDir) + '/', stdout: (s) => console.log(s) })
await py.loadPackage(path.resolve(pyodideDir, 'micropip-0.11.1-py3-none-any.whl'))
const micropip = py.pyimport('micropip')
py.FS.writeFile('/tmp/' + path.basename(wheelPath), fs.readFileSync(wheelPath))
await micropip.install('emfs:/tmp/' + path.basename(wheelPath))
py.runPython(`
import z3, time
x, y = z3.Ints('x y')
s = z3.Solver(); s.add(x**y == 8, y > 1)
t=time.time(); r=s.check(); print('pow-unknown', r, s.reason_unknown(), round(time.time()-t,3),'s')
# overflow wrap specimen: recipient wraps under 64-bit bit-vectors
B, M = z3.BitVecs('B M', 64)
s2 = z3.Solver(); s2.add(B >= 0, M > 0, B + M < 0)
print('recipient-wrap', s2.check(), s2.model())
# Datalog via Fixedpoint with stratified negation
fp = z3.Fixedpoint(); fp.set(engine='datalog')
U = z3.BitVecSort(8)
member = z3.Function('member', U, U, z3.BoolSort()); shared = z3.Function('shared', U, U, z3.BoolSort())
revoked = z3.Function('revoked', U, U, z3.BoolSort()); canread = z3.Function('canread', U, U, z3.BoolSort())
for f in (member, shared, revoked, canread): fp.register_relation(f)
u, d = z3.BitVecs('u d', 8); fp.declare_var(u, d)
fp.rule(canread(u, d), [member(u, d)])
fp.rule(canread(u, d), [shared(u, d), z3.Not(revoked(u, d))])
fp.fact(member(z3.BitVecVal(1,8), z3.BitVecVal(3,8))); fp.fact(shared(z3.BitVecVal(1,8), z3.BitVecVal(4,8))); fp.fact(revoked(z3.BitVecVal(1,8), z3.BitVecVal(4,8)))
print('datalog canread(1,3)', fp.query(canread(z3.BitVecVal(1,8), z3.BitVecVal(3,8))), 'canread(1,4)', fp.query(canread(z3.BitVecVal(1,8), z3.BitVecVal(4,8))))
`)
