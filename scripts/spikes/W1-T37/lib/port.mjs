// The Z3 engine port (W1-T37): `EnginePort.run({engine, version, input, budget})` in the shapes of
// packages/generators/src/core/port.ts (ARCHITECTURE.md section 17.3), over the harness servers of lib/engines.mjs.
// GATE-generators borrows it, through scripts/conformance/z3-pyodide-native.mjs's createPorts(), to key the Z3
// families with the engine the tab runs; the conformance pair runs it on both engines at once.
//
// The request (until packages/bus, W1-T35, publishes the z3 engine's input type, this is the shape both ends use):
//   engine   'z3'
//   version  '5.3.1', the pin; any other is refused with code version-mismatch (a stamp's qualifier names the version)
//   input    {smtlib: string}   declarations and assertions in SMT-LIB, parsed by Z3's own parser; the port checks
//                               their conjunction (commands such as check-sat are ignored; an option is refused,
//                               because the budget comes from the request)
//          | {python: string}   z3py source, run in a fresh namespace and context; the answer is its first check
//   budget   {wallMs, rlimit?}  rlimit bounds every check (default 5000000, the S1 runs' budget); wallMs is the watchdog
// The reply:
//   verdict      {kind: 'sat'} | {kind: 'unsat'} | {kind: 'unknown', reason}   an rlimit stop is unknown, reason canceled
//   witness      for sat, the model's constants as strings (bit-vectors as Z3 prints them, unsigned), never canonical
//   stats        {ms, bound: 'rlimit N'}   the bound the verdict rests on (I10)
//   provenance   {engine: 'z3', version: '5.3.1', build, budget}
// Failures reject with an Error whose `code` is a bus error code: terminated (the watchdog fired: a budget stop, which
// ask() turns into unknown), invalid-input (the engine could not read the input), engine-crashed, version-mismatch,
// unknown-engine.

import { DEFAULT_RLIMIT, DEFAULT_WALL_MS, PINS } from './engines.mjs';

export class PortError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = 'PortError';
    this.code = code;
    this.detail = detail;
  }
}

/** Check a request against the port's contract; returns the rlimit and the watchdog it runs under. */
export function admit(req) {
  if (!req || typeof req !== 'object') throw new PortError('bad-message', 'a request is an object {engine, version, input, budget}');
  if (req.engine !== 'z3') throw new PortError('unknown-engine', `this port serves z3, not ${req.engine}`);
  if (req.version !== PINS.z3.versionString) throw new PortError('version-mismatch', `the request names z3 ${req.version}; this build pins ${PINS.z3.versionString}`);
  const input = req.input;
  if (!input || typeof input !== 'object' || (typeof input.smtlib !== 'string' && typeof input.python !== 'string')) {
    throw new PortError('invalid-input', 'the z3 input is {smtlib: string} or {python: string}');
  }
  const rlimit = req.budget?.rlimit ?? DEFAULT_RLIMIT;
  const wallMs = req.budget?.wallMs ?? DEFAULT_WALL_MS;
  if (!Number.isInteger(rlimit) || rlimit <= 0) throw new PortError('invalid-input', `rlimit must be a positive integer, not ${rlimit}`);
  if (!Number.isFinite(wallMs) || wallMs <= 0) throw new PortError('invalid-input', `wallMs must be a positive number, not ${wallMs}`);
  return { rlimit, wallMs };
}

/**
 * The harness's reply as the port's: `{reply, witnessHolds}` (whether a sat model satisfies every assertion by Z3's
 * own evaluation: true, false, or null when Z3 could not settle one under the model; the pair reads it and the reply
 * does not carry it), or the PortError it stands for.
 */
export function toReply(raw, req, { rlimit, build }) {
  if (raw.terminated) return new PortError('terminated', raw.detail ?? 'the watchdog fired');
  if (raw.crashed) return new PortError('engine-crashed', raw.detail ?? 'the engine died');
  if (raw.ok !== true) return new PortError(raw.code ?? 'engine-crashed', raw.detail ?? 'the engine refused the request');
  const verdict = raw.verdict === 'unknown' ? { kind: 'unknown', reason: raw.reason ?? '' } : raw.verdict === 'sat' || raw.verdict === 'unsat' ? { kind: raw.verdict } : null;
  if (!verdict) return new PortError('engine-crashed', `the engine answered ${JSON.stringify(raw.verdict)}`);
  const reply = {
    verdict,
    ...(raw.verdict === 'sat' && raw.model ? { witness: raw.model } : {}),
    stats: { ms: raw.ms ?? raw.wallMs ?? 0, bound: `rlimit ${raw.rlimit ?? rlimit}` },
    provenance: { engine: 'z3', version: PINS.z3.versionString, build, budget: { ...req.budget, rlimit: raw.rlimit ?? rlimit } },
  };
  return { reply, witnessHolds: raw.witness_holds ?? null };
}

/** A port over one engine (a promise of {server, describe}), started on first use. */
export function enginePort(getEngine) {
  return {
    async run(req) {
      const { rlimit, wallMs } = admit(req);
      const engine = await getEngine();
      const raw = await engine.server.call({ op: 'request', input: req.input, rlimit }, { wallMs });
      const out = toReply(raw, req, { rlimit, build: engine.describe });
      if (out instanceof Error) throw out;
      return out.reply;
    },
  };
}

/**
 * A port over both engines at once, for the conformance pair: each request runs on native and on Pyodide, any
 * difference (an outcome, a verdict, the reason of an unknown, a witness that fails its query) is recorded in
 * `differences`, and the caller gets Pyodide's answer, the tab's.
 */
export function pairPort(getNative, getPyodide, label = () => 'a request') {
  const differences = [];
  let compared = 0;
  const port = {
    differences,
    get compared() {
      return compared;
    },
    async run(req) {
      const { rlimit, wallMs } = admit(req);
      const [n, p] = await Promise.all([getNative(), getPyodide()]);
      const [rn, rp] = await Promise.all([
        n.server.call({ op: 'request', input: req.input, rlimit }, { wallMs }),
        p.server.call({ op: 'request', input: req.input, rlimit }, { wallMs }),
      ]);
      const on = toReply(rn, req, { rlimit, build: n.describe });
      const op = toReply(rp, req, { rlimit, build: p.describe });
      compared += 1;
      const where = label(req);
      const show = (o) => (o instanceof Error ? `error ${o.code}` : o.reply.verdict.kind + (o.reply.verdict.kind === 'unknown' ? ` (${o.reply.verdict.reason})` : ''));
      if (show(on) !== show(op)) {
        differences.push({ fixture: where, expected: `native: ${show(on)}`, got: `pyodide: ${show(op)}`, detail: 'native and Pyodide answered the same request differently' });
      }
      for (const [id, o] of [['native', on], ['pyodide', op]]) {
        if (!(o instanceof Error) && o.reply.verdict.kind === 'sat' && o.witnessHolds === false) differences.push({ fixture: where, expected: 'a witness that satisfies the query', got: `${id}'s model does not`, detail: "the witness fails its property by Z3's own evaluation" });
      }
      if (op instanceof Error) throw op;
      return op.reply;
    },
  };
  return port;
}
