// W0-S03: the module worker. Pyodide, the Z3 wheel and the adapter, all served from this page's own origin.
//   {cmd: 'corpus'}              the whole corpus through the adapter
//   {cmd: 'scenarios'}           the probe list
//   {cmd: 'probe', scenario}     one probe, in a fresh engine
import { loadPyodide } from '/pyodide/pyodide.mjs'
import { startEngine, runCorpus } from '/engine.mjs'

self.onmessage = async (e) => {
  const job = e.data
  try {
    const text = async (url) => (await fetch(url)).text()
    const sources = { 'ss_datalog.py': await text('/ss_datalog.py'), 'probes.py': await text('/probes.py') }
    const wheelURL = `${self.location.origin}/wheels/${await text('/wheels/NAME')}`
    const engine = await startEngine({ loadPyodide, indexURL: '/pyodide/', wheelURL, sources })
    self.postMessage({ log: `engine ready ${JSON.stringify(engine.load_ms)}` })
    if (job.cmd === 'scenarios') return self.postMessage({ result: engine.scenarios() })
    const corpus = JSON.parse(await text('/corpus.json'))
    if (job.cmd === 'probe') return self.postMessage({ result: engine.probe(job.scenario, job.scenario.startsWith('explain-fixture') ? corpus : undefined) })
    const { replies, total_s } = runCorpus(engine, corpus)
    const meta = { pyodide: engine.pyodide, python: engine.python, z3: engine.z3, load_ms: engine.load_ms, total_s, worker: 'module worker, same origin', userAgent: self.navigator.userAgent }
    self.postMessage({ log: `corpus done in ${total_s.toFixed(1)} s` })
    self.postMessage({ result: { meta, replies } })
  } catch (err) {
    self.postMessage({ error: String((err && err.message) || err).split('\n')[0].slice(0, 300) })
  }
}
