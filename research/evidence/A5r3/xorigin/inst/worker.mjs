self.onmessage = async () => {
  const out = { origin: self.origin, t0: performance.now() };
  try {
    const { loadPyodide } = await import('/pyodide/pyodide.mjs');
    const py = await loadPyodide({ indexURL: '/pyodide/' });
    await py.loadPackage('/pyodide/micropip-0.11.1-py3-none-any.whl');
    await py.pyimport('micropip').install(self.location.origin + '/z3_solver-5.3.1.0-py3-none-pyemscripten_2026_0_wasm32.whl');
    out.readyMs = Math.round(performance.now() - out.t0);
    out.z3 = py.runPython("from z3 import *\na,b,amount=Ints('a b amount')\ns=Solver()\ns.add(a>=0,b>=0,amount>0,a-amount<0)\nr=s.check()\nf'{get_version_string()} {r} {s.model()}'");
    out.cacheApi = typeof caches !== 'undefined';
  } catch (e) { out.err = String(e && e.stack || e).slice(0, 400); }
  self.postMessage(out);
};
