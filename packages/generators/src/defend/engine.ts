// GEN-defend's checker in the tab: the defend box. It builds a model artifact (artifact.ts) and runs its checks in
// order, the way `statespace check` does, and answers through the same EnginePort a bus engine uses:
//
//   does not build   `rejected`, with the build error as the issue;
//   passes           `no-error` (complete: every check held over its bound);
//   rejects          `violated`, naming the first check that failed, with its counterexample as the witness.
//
// ASSESSMENT.md section 4.15 grades predictions against the receipt `statespace defend` writes on the Bench, from the
// learner's own artifact and the stage's checker (comparator, TLC, Z3, cargo). This page cannot read the learner's
// files, so it seeds the mutation into a model artifact shaped like the lab's and checks that one itself [D]. The
// ledger's checks are decided over a printed box; the spec's are exact for its constants. It reads no clock.
//
// Pure: no DOM, storage or network.

import type { EnginePort, InstrumentReply, InstrumentRequest } from '../core/port.ts'
import { check } from './artifact.ts'
import type { Artifact } from './artifact.ts'

export const DEFEND_BOX = 'defend-box'
export const DEFEND_BOX_VERSION = '1'

export interface DefendQuery {
  readonly op: 'check'
  readonly artifact: Artifact
}

export class DefendBoxError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'DefendBoxError'
    this.code = code
  }
}

function isQuery(input: unknown): input is DefendQuery {
  if (typeof input !== 'object' || input === null) return false
  const q = input as Partial<DefendQuery>
  return q.op === 'check' && typeof q.artifact === 'object' && q.artifact !== null && (q.artifact.kind === 'ledger' || q.artifact.kind === 'spec')
}

export function decide(q: DefendQuery): InstrumentReply<unknown> {
  const provenance = { engine: DEFEND_BOX, version: DEFEND_BOX_VERSION, build: `${DEFEND_BOX}@${DEFEND_BOX_VERSION}`, budget: { wallMs: 0 } }
  const out = check(q.artifact)
  if (out.verdict === 'no-build') return { verdict: { kind: 'rejected', issues: [out.error] }, witness: { error: out.error }, stats: { ms: 0 }, provenance }
  if (out.verdict === 'passes') return { verdict: { kind: 'no-error', complete: true }, stats: { ms: 0 }, provenance }
  return { verdict: { kind: 'violated', property: out.locus, length: 0, unit: 'steps' }, witness: out.witness, stats: { ms: 0 }, provenance }
}

export const defendBoxPort: EnginePort = {
  async run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> {
    if (req.engine !== DEFEND_BOX) throw new DefendBoxError('unknown-engine', `the defend box runs ${DEFEND_BOX}, not ${req.engine}`)
    if (req.version !== DEFEND_BOX_VERSION) throw new DefendBoxError('version-mismatch', `the defend box is version ${DEFEND_BOX_VERSION}, not ${req.version}`)
    if (!isQuery(req.input)) throw new DefendBoxError('invalid-input', 'not a defend-box query')
    return decide(req.input) as unknown as InstrumentReply<W>
  },
}
