// W0-S03: Pyodide + the Z3 wheel + the adapter, started the same way under Node and in a browser worker.
//
// startEngine returns { run(case), probe(scenario, corpus), ... }. `loadPyodide` and the URLs come from
// the caller, because Node and the browser find them differently.

const now = () => performance.now()

export async function startEngine({ loadPyodide, indexURL, wheelURL, sources }) {
  const t0 = now()
  const py = await loadPyodide(indexURL === undefined ? {} : { indexURL })
  const t1 = now()
  await py.loadPackage(wheelURL)
  const t2 = now()
  for (const [name, text] of Object.entries(sources)) py.FS.writeFile(`/tmp/${name}`, text)
  py.runPython('import sys, json\nsys.path.insert(0, "/tmp")\nimport ss_datalog, probes, z3')
  const t3 = now()
  const runCase = py.runPython('ss_datalog.run_case')
  const runProbe = py.runPython('lambda s, c=None: json.dumps(probes.run(s, json.loads(c) if c else None))')
  return {
    pyodide: py.version,
    python: py.runPython('sys.version.split()[0]'),
    z3: py.runPython('z3.get_version_string()'),
    load_ms: { pyodide: Math.round(t1 - t0), z3_wheel: Math.round(t2 - t1), adapter: Math.round(t3 - t2) },
    run(caseObj) {
      const t = now()
      const reply = JSON.parse(runCase(JSON.stringify(caseObj)))
      reply.wall_ms = now() - t
      return reply
    },
    scenarios() {
      return JSON.parse(py.runPython('json.dumps(probes.PROBES)'))
    },
    probe(scenario, corpus) {
      const t = now()
      const out = JSON.parse(runProbe(scenario, corpus ? JSON.stringify(corpus) : undefined))
      out.wall_ms = Math.round(now() - t)
      return out
    },
  }
}

// every case of the corpus through the adapter: Fixedpoint (the tab engine), the reference evaluator,
// and Fixedpoint-based derivation heights where the case asks for them
export function runCorpus(engine, corpus) {
  const t = now()
  const replies = corpus.cases.map((c) =>
    engine.run({
      id: c.id,
      program: corpus.programs[c.program],
      facts: corpus.worlds[c.world],
      engines: ['fixedpoint', 'reference'],
      derive: c.derive ? ['fixedpoint'] : [],
    }),
  )
  return { replies, total_s: (now() - t) / 1000 }
}

// Z3's datalog engine outside the adapter's normal path (probes.py lists the scenarios). Each probe gets a
// fresh engine, because a crash inside Z3 leaves the Pyodide instance unusable.
export async function runProbes(startFresh, corpus) {
  const scenarios = (await startFresh()).scenarios()
  const out = []
  for (const scenario of scenarios) {
    const entry = { scenario }
    try {
      const engine = await startFresh()
      Object.assign(entry, { outcome: 'returned', result: engine.probe(scenario, scenario.startsWith('explain-fixture') ? corpus : undefined) })
    } catch (e) {
      Object.assign(entry, { outcome: 'trapped', error: String(e && e.message ? e.message : e).split('\n')[0].slice(0, 160) })
    }
    out.push(entry)
  }
  return out
}
