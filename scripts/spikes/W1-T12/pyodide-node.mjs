// W1-T12: run one S1 Python script in Pyodide under Node, the way INS-z3 runs a cell: Pyodide 314.0.7, the
// z3_solver 5.3.1.0 pyemscripten wheel, a fresh Python namespace for the script, nothing else loaded.
//
//   node pyodide-node.mjs --pyodide <dir> --wheel <z3 wheel> --script <file.py> [--file <host-path>=<fs-path> ...]
//
// The script's own output goes to stdout, line by line, exactly as the script printed it. What the harness
// knows (versions, the time each phase took) goes to stderr as "# key: value" lines. --file stages a file
// (the SMT-LIB texts of the tour) at a path in Pyodide's file system before the script runs. A Python error
// prints its traceback on stderr and exits 1. Spike code, not product code.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const opt = (name) => argv.flatMap((a, i) => (a === `--${name}` ? [argv[i + 1]] : []));
const [pyodideDir] = opt('pyodide');
const [wheel] = opt('wheel');
const [script] = opt('script');
if (!pyodideDir || !wheel || !script) {
  console.error('usage: node pyodide-node.mjs --pyodide <dir> --wheel <whl> --script <file.py> [--file <host>=<fs> ...]');
  process.exit(2);
}

const now = () => performance.now();
const t0 = now();
const { loadPyodide } = await import(pathToFileURL(path.resolve(pyodideDir, 'pyodide.mjs')).href);
const out = [];
const py = await loadPyodide({ indexURL: `${path.resolve(pyodideDir)}/`, stdout: (line) => out.push(line), stderr: (line) => console.error(`# pyodide stderr: ${line}`) });
const t1 = now();
await py.loadPackage(pathToFileURL(path.resolve(wheel)).href, { messageCallback: (m) => console.error(`# pyodide: ${m}`), errorCallback: (m) => console.error(`# pyodide error: ${m}`) });
const t2 = now();
for (const spec of opt('file')) {
  const [host, target] = spec.split('=');
  const dir = path.posix.dirname(target);
  if (dir !== '.') py.FS.mkdirTree(dir);
  py.FS.writeFile(target, fs.readFileSync(host));
}
let status = 0;
const ns = py.globals.get('dict')();
const t3 = now();
try {
  py.runPython(fs.readFileSync(script, 'utf8'), { globals: ns });
} catch (e) {
  status = 1;
  console.error(`# python error: ${String(e && e.message ? e.message : e).trim()}`);
}
const t4 = now();
process.stdout.write(out.length ? `${out.join('\n')}\n` : '');
console.error(`# pyodide: ${py.version}`);
console.error(`# python: ${py.runPython('import sys; sys.version.split()[0]')}`);
console.error(`# node: ${process.version} ${process.arch}`);
console.error(`# load_pyodide_ms: ${Math.round(t1 - t0)}`);
console.error(`# load_wheel_ms: ${Math.round(t2 - t1)}`);
console.error(`# script_ms: ${Math.round(t4 - t3)}`);
process.exit(status);
