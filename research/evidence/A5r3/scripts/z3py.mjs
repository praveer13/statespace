// Usage: node z3py.mjs <pyodide dir> <z3 wheel> <case>
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
const [pyodideDir, wheelPath, which] = process.argv.slice(2)
const t0 = performance.now()
const log = (...a) => console.log(Math.round(performance.now() - t0) + 'ms', ...a)
const { loadPyodide } = await import(pathToFileURL(path.join(pyodideDir, 'pyodide.mjs')).href)
const py = await loadPyodide({ indexURL: path.resolve(pyodideDir) + '/', stdout: (s) => log('py:', s) })
await py.loadPackage(path.resolve(pyodideDir, 'micropip-0.11.1-py3-none-any.whl'))
const micropip = py.pyimport('micropip')
py.FS.writeFile('/tmp/' + path.basename(wheelPath), fs.readFileSync(wheelPath))
await micropip.install('emfs:/tmp/' + path.basename(wheelPath))
py.runPython('import z3, time')
log('ready z3', py.runPython('z3.get_version_string()'))
const cases = {
starter: `
from z3 import *
a, b, amount = Ints('a b amount')
s = Solver()
s.add(a >= 0, b >= 0, amount > 0)
s.add(a - amount < 0)
r = s.check(); print('starter-1', r, s.model())
s.add(amount <= a)
print('starter-2', s.check())
`,
bv: `
from z3 import *
a, amount = BitVecs('a amount', 64)
s = Solver()
s.add(a >= 0, amount > 0, amount <= a)   # signed guard
s.add(a - amount > a)                      # result larger than source: wrap?
print('bv', s.check())
`,
timeout: `
x, y, z = z3.Ints('x y z')
s=z3.Solver(); s.set('timeout', 2000)
s.add(x > 2, y > 2, z > 2, x*x*x + y*y*y == z*z*z)
t=time.time(); r=s.check(); print('timeout-case', r, s.reason_unknown() if r==z3.unknown else '', round(time.time()-t,2),'s')
`,
rlimit: `
x, y, z = z3.Ints('x y z')
s=z3.Solver(); s.set('rlimit', 5000000)
s.add(x > 2, y > 2, z > 2, x*x*x + y*y*y == z*z*z)
t=time.time(); r=s.check(); print('rlimit-case', r, s.reason_unknown() if r==z3.unknown else '', round(time.time()-t,2),'s')
`,
}
py.runPython(cases[which])
log('done')
