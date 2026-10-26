// Pyodide's Z3 as a line server under Node (W1-T37). Not a gate: lib/engines.mjs starts it.
//
//   node pyodide-server.mjs <pyodide dir> <z3 wheel> <harness.py>
//
// It loads Pyodide and the pyemscripten Z3 wheel the way the tab loads them (loadPackage of the wheel), runs
// harness.py, prints one "ready" line of JSON with the versions, and then answers each line of standard input with the
// harness's reply on one line of standard output. Python's own output (there should be none: the harness captures what
// a cell prints) and Pyodide's loading messages go to standard error, so standard output carries the protocol only.
// Exit 2 when Pyodide or the wheel cannot be loaded. A request that never returns is stopped by the parent's watchdog,
// which kills this process; nothing here times out.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { pathToFileURL } from 'node:url';

const [dir, wheel, harness] = process.argv.slice(2);
if (!dir || !wheel || !harness) {
  process.stderr.write('usage: node pyodide-server.mjs <pyodide dir> <z3 wheel> <harness.py>\n');
  process.exit(2);
}

const write = (line) => new Promise((resolve) => process.stdout.write(`${line}\n`, resolve));

let handle;
let version;
try {
  const started = performance.now();
  const { loadPyodide } = await import(pathToFileURL(path.join(path.resolve(dir), 'pyodide.mjs')).href);
  const py = await loadPyodide({
    indexURL: `${path.resolve(dir)}/`,
    stdout: (line) => process.stderr.write(`[python] ${line}\n`),
    stderr: (line) => process.stderr.write(`[python] ${line}\n`),
  });
  await py.loadPackage(pathToFileURL(path.resolve(wheel)).href, {
    messageCallback: () => {},
    errorCallback: (message) => process.stderr.write(`${message}\n`),
  });
  py.runPython(fs.readFileSync(harness, 'utf8'));
  handle = py.globals.get('handle');
  const probe = JSON.parse(py.runPython('import json; json.dumps(probe())'));
  version = py.version;
  await write(JSON.stringify({ ready: true, probe: { ...probe, pyodide: version }, readyMs: Math.round(performance.now() - started) }));
} catch (e) {
  process.stderr.write(`pyodide could not start: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(2);
}

const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) {
  if (!line.trim()) continue;
  let reply;
  try {
    reply = handle(line);
  } catch (e) {
    let id = null;
    try {
      id = JSON.parse(line).id ?? null;
    } catch {
      /* not JSON: the reply carries no id */
    }
    reply = JSON.stringify({ id, ok: false, code: 'engine-crashed', detail: String(e instanceof Error ? e.message : e).slice(0, 400) });
  }
  await write(reply);
}
process.exit(0);
