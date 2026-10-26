// Hosts one Pyodide instance for one Python program (W1-T42). Not a gate: engines.mjs starts it.
//
//   node pyodide-host.mjs <pyodide dir> <z3 wheel> < program.py
//
// The wheel is loaded the way the tab loads it, with loadPackage; what the program prints goes to standard output,
// one line per print; Pyodide's own loading messages and a "ready" line go to standard error. Exit 0 when the program
// ran to its end, 1 when it raised, 2 when Pyodide could not start. A program that never returns (Z3's `timeout`
// under Pyodide [X RUN-z3-budget-pyodide]) is stopped by the parent's watchdog, not here.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [dir, wheel] = process.argv.slice(2);
if (!dir || !wheel) {
  process.stderr.write('usage: node pyodide-host.mjs <pyodide dir> <z3 wheel> < program.py\n');
  process.exit(2);
}

const flushAndExit = async (code) => {
  await new Promise((resolve) => process.stdout.write('', resolve));
  await new Promise((resolve) => process.stderr.write('', resolve));
  process.exit(code);
};

let py;
try {
  const source = fs.readFileSync(0, 'utf8');
  const started = performance.now();
  const { loadPyodide } = await import(pathToFileURL(path.join(dir, 'pyodide.mjs')).href);
  py = await loadPyodide({
    indexURL: `${path.resolve(dir)}/`,
    stdout: (line) => process.stdout.write(`${line}\n`),
    stderr: (line) => process.stderr.write(`${line}\n`),
  });
  await py.loadPackage(pathToFileURL(path.resolve(wheel)).href, {
    messageCallback: () => {},
    errorCallback: (message) => process.stderr.write(`${message}\n`),
  });
  process.stderr.write(`ready ${Math.round(performance.now() - started)} ms, pyodide ${py.version}\n`);
  try {
    py.runPython(source);
  } catch (e) {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
    await flushAndExit(1);
  }
} catch (e) {
  process.stderr.write(`pyodide could not start: ${e instanceof Error ? e.message : String(e)}\n`);
  await flushAndExit(2);
}
await flushAndExit(0);
