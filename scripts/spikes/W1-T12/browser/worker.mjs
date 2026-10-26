// W1-T12: a module worker that runs S1 Python scripts in Pyodide 314.0.7 with the Z3 5.3.1.0 wheel, the way
// INS-z3 will (ARCHITECTURE.md section 6.2): one engine per worker, a fresh Python namespace per script.
// Spike code, not product code. Messages in: {t:'init'} {t:'run', name, source, files:[{path, text}]};
// messages out carry the same id: {lines, stderr, ms} or {error}.
let py = null;
let sink = [];
let errs = [];
const now = () => performance.now();

async function init() {
  const t0 = now();
  const { loadPyodide } = await import('/pyodide/pyodide.mjs');
  py = await loadPyodide({ indexURL: '/pyodide/', stdout: (l) => sink.push(l), stderr: (l) => errs.push(l) });
  const t1 = now();
  const wheel = await (await fetch('/wheel-name')).text();
  await py.loadPackage(`/wheels/${wheel}`, { messageCallback: (m) => errs.push(`pyodide: ${m}`), errorCallback: (m) => errs.push(`pyodide error: ${m}`) });
  const t2 = now();
  sink = []; errs = [];
  return {
    pyodide: py.version,
    python: py.runPython('import sys; sys.version.split()[0]'),
    z3: py.runPython('import z3; z3.get_version_string()'),
    load_pyodide_ms: Math.round(t1 - t0),
    load_wheel_ms: Math.round(t2 - t1),
    user_agent: self.navigator.userAgent,
  };
}

async function run({ name, source, files = [] }) {
  sink = []; errs = [];
  for (const f of files) {
    const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : null;
    if (dir) py.FS.mkdirTree(dir);
    py.FS.writeFile(f.path, f.text);
  }
  const t = now();
  const ns = py.globals.get('dict')();
  let error = null;
  try {
    py.runPython(source, { globals: ns });
  } catch (e) {
    error = String(e && e.message ? e.message : e).trim();
  }
  const ms = Math.round(now() - t);
  ns.destroy();
  return { name, lines: sink, stderr: errs, ms, error };
}

self.onmessage = async (e) => {
  const m = e.data || {};
  try {
    if (m.t === 'init') self.postMessage({ id: m.id, ...(await init()) });
    else if (m.t === 'run') self.postMessage({ id: m.id, ...(await run(m)) });
    else self.postMessage({ id: m.id, error: `unknown message ${m.t}` });
  } catch (err) {
    self.postMessage({ id: m.id, error: String((err && err.stack) || err).slice(0, 800) });
  }
};
