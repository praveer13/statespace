// Usage: node run-py.mjs <node_modules/pyodide dir> <z3 wheel> <script.py>
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
const [pyodideDir, wheelPath, script] = process.argv.slice(2)
const { loadPyodide } = await import(pathToFileURL(path.join(pyodideDir, 'pyodide.mjs')).href)
const py = await loadPyodide({ indexURL: pyodideDir + '/', stdout: (s) => console.log(s) })
await py.loadPackage('micropip')
const micropip = py.pyimport('micropip')
py.FS.writeFile('/tmp/' + path.basename(wheelPath), fs.readFileSync(wheelPath))
await micropip.install('emfs:/tmp/' + path.basename(wheelPath))
py.runPython(fs.readFileSync(script, 'utf8'))
