// Does Z3's wall-clock `timeout` fire in the single-threaded Pyodide wheel?
// Usage: node z3-timeout.mjs <node_modules/pyodide dir> <wheel path> <case>
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
const [pyodideDir, wheelPath, which] = process.argv.slice(2)
const { loadPyodide } = await import(pathToFileURL(path.join(pyodideDir, 'pyodide.mjs')).href)
const t0 = performance.now()
const log = (...a) => console.log(Math.round(performance.now() - t0) + 'ms', ...a)
const py = await loadPyodide({ indexURL: pyodideDir + '/', stdout: (s) => log('py:', s) })
await py.loadPackage('micropip')
const micropip = py.pyimport('micropip')
py.FS.writeFile('/tmp/' + path.basename(wheelPath), fs.readFileSync(wheelPath))
await micropip.install('emfs:/tmp/' + path.basename(wheelPath))
py.runPython('import z3, time')
log('ready', py.runPython('z3.get_version_string()'))
const cases = {
  // pigeonhole: 9 pigeons, 8 holes, pure propositional; hard for CDCL
  php: `
n=13; m=12
p=[[z3.Bool(f"p_{i}_{j}") for j in range(m)] for i in range(n)]
s=z3.Solver(); s.set('timeout', 2000)
for i in range(n): s.add(z3.Or(p[i]))
for j in range(m):
  for i in range(n):
    for k in range(i+1,n): s.add(z3.Or(z3.Not(p[i][j]), z3.Not(p[k][j])))
t=time.time(); r=s.check(); print('php', r, s.reason_unknown() if r==z3.unknown else '', round(time.time()-t,2),'s')
`,
  php_global: `
z3.set_param('timeout', 2000)
n=13; m=12
p=[[z3.Bool(f"p_{i}_{j}") for j in range(m)] for i in range(n)]
s=z3.Solver()
for i in range(n): s.add(z3.Or(p[i]))
for j in range(m):
  for i in range(n):
    for k in range(i+1,n): s.add(z3.Or(z3.Not(p[i][j]), z3.Not(p[k][j])))
t=time.time(); r=s.check(); print('php_global', r, s.reason_unknown() if r==z3.unknown else '', round(time.time()-t,2),'s')
`,
  nl: `
x, y, z = z3.Ints('x y z')
s=z3.Solver(); s.set('timeout', 2000)
s.add(x > 2, y > 2, z > 2, x*x*x + y*y*y == z*z*z)
t=time.time(); r=s.check(); print('nl', r, s.reason_unknown() if r==z3.unknown else '', round(time.time()-t,2),'s')
`,
  nl_rlimit: `
x, y, z = z3.Ints('x y z')
s=z3.Solver(); s.set('rlimit', 5000000)
s.add(x > 2, y > 2, z > 2, x*x*x + y*y*y == z*z*z)
t=time.time(); r=s.check(); print('nl_rlimit', r, s.reason_unknown() if r==z3.unknown else '', round(time.time()-t,2),'s')
`,
  php_rlimit: `
n=13; m=12
p=[[z3.Bool(f"p_{i}_{j}") for j in range(m)] for i in range(n)]
s=z3.Solver(); s.set('rlimit', 2000000)
for i in range(n): s.add(z3.Or(p[i]))
for j in range(m):
  for i in range(n):
    for k in range(i+1,n): s.add(z3.Or(z3.Not(p[i][j]), z3.Not(p[k][j])))
t=time.time(); r=s.check(); print('php_rlimit', r, s.reason_unknown() if r==z3.unknown else '', round(time.time()-t,2),'s')
`,
}
py.runPython(cases[which])
log('done')
