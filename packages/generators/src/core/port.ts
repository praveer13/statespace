// The engine port a generator keys and grades through (ARCHITECTURE.md section 17.3): one request in, one
// reply out, `{engine, version, input, budget} -> {verdict, witness, stats, provenance}`. On the main origin the
// port is the instrument bus (packages/bus, W1-T35) for the engines that live on the instrument origin, and plain
// code for the in-tab engines a family runs itself (the stamp deriver, a pocket checker, the fixture family's
// box engine). In Node, GATE-generators hands each family a port over the same engines.
//
// The shapes below are ARCHITECTURE.md section 17.3's sketch. packages/bus owns the protocol; until it lands,
// these structural types are what a family codes against, and a bus client whose types follow the sketch is
// assignable to EnginePort as it is.
//
// Pure: no DOM, storage or network.

/** The engines of the instrument bus (ARCHITECTURE.md section 17.3). */
export type BusEngineId =
  | 'z3'
  | 'datalog'
  | 'spectacle'
  | 'pglite'
  | 'lane-a'
  | 'lasso'
  | 'history'
  | 'pairs'
  | 'interp'
  | 'receipt'
  | 'bundle'
  | 'fragment'
  | 'trace'
  | 'clearinghouse'

/** A bus engine, or an in-tab engine that a family runs as plain code (named in lower case, such as fixture-box). */
export type EngineName = BusEngineId | (string & {})

export interface Budget {
  /** Watchdog: expiry means terminate() and no verdict. */
  readonly wallMs: number
  /** Z3; printed with the verdict (I10). */
  readonly rlimit?: number
  /** A state cap: the lasso validator, the fixture family's box engine. */
  readonly maxStates?: number
  /** Spectacle: stop at the bound and keep the partial verdict. */
  readonly maxMs?: number
  /** History search bound. */
  readonly maxTxns?: number
  /** Lane A. */
  readonly perCheckMs?: number
  /** uint32, drawn at grade time. */
  readonly seed?: number
}

export interface InstrumentRequest<I = unknown> {
  readonly engine: EngineName
  /** The version the content was written against. */
  readonly version: string
  readonly input: I
  readonly budget: Budget
}

/** Printed neutrally; stamps are derived on the main origin (packages/stamps). */
export type RawVerdict =
  | { readonly kind: 'sat' }
  | { readonly kind: 'unsat' }
  | { readonly kind: 'unknown'; readonly reason: string }
  | { readonly kind: 'no-error'; readonly complete: boolean }
  | { readonly kind: 'violated'; readonly property: string; readonly length: number; readonly unit: 'actions' | 'steps' | 'rows' }
  | { readonly kind: 'stopped'; readonly by: 'deadlock' | 'bound'; readonly distinct?: number }
  | { readonly kind: 'sql'; readonly rowCount: number; readonly sqlstate?: string }
  | { readonly kind: 'checks'; readonly results: readonly unknown[] }
  | { readonly kind: 'parsed'; readonly issues: readonly string[] }
  | { readonly kind: 'rejected'; readonly issues: readonly string[] }

export interface InstrumentReply<W = unknown> {
  readonly verdict: RawVerdict
  /** Plain data, never HTML. */
  readonly witness?: W
  readonly stats: {
    readonly ms: number
    readonly distinct?: number
    readonly generated?: number
    readonly depth?: number
    readonly n?: number
    readonly bound?: string
  }
  readonly provenance: { readonly engine: EngineName; readonly version: string; readonly build: string; readonly budget: Budget }
}

export interface EnginePort {
  run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>>
}

/**
 * The bus error codes that mean the engine stopped before a verdict (ARCHITECTURE.md section 5.8): a budget
 * stop. A key treats one as `unknown` and discards the seed; a grade records the answer as ungraded.
 */
export const BUDGET_STOPS: ReadonlySet<string> = new Set(['budget-exhausted', 'terminated'])

/** What a port answered, as a key or a grade reads it. */
export type Answer<W = unknown> =
  | { readonly kind: 'verdict'; readonly reply: InstrumentReply<W> }
  | {
      readonly kind: 'unknown'
      /** The engine's reason (Z3's reason string), or the bus error code of a budget stop. */
      readonly reason: string
      /** True for a budget stop (an rlimit or the watchdog), false for an `unknown` verdict. */
      readonly budget: boolean
      readonly reply?: InstrumentReply<W>
    }

/** The bus error code a rejected run carries, if it carries one. */
export function errorCodeOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : undefined
}

/**
 * Ask the port. An `unknown` verdict, an `unknown (canceled)` from an rlimit, and a budget stop all come back as
 * `unknown`, which keys discard and grades leave ungraded (ASSESSMENT.md section 4.1). Any other failure (an
 * invalid input, a crashed engine, a version mismatch) is thrown: it is a fault to report, never a reason to
 * redraw quietly.
 */
export async function ask<I, W>(port: EnginePort, req: InstrumentRequest<I>): Promise<Answer<W>> {
  let reply: InstrumentReply<W>
  try {
    reply = await port.run<I, W>(req)
  } catch (error) {
    const code = errorCodeOf(error)
    if (code !== undefined && BUDGET_STOPS.has(code)) return { kind: 'unknown', reason: code, budget: true }
    throw error
  }
  if (reply.verdict.kind === 'unknown') {
    const reason = reply.verdict.reason
    return { kind: 'unknown', reason, budget: /cancel/i.test(reason), reply }
  }
  return { kind: 'verdict', reply }
}

/** engine@version as an event's `engine` field records it. */
export function engineAtVersion(reply: Pick<InstrumentReply, 'provenance'>): string {
  return `${reply.provenance.engine}@${reply.provenance.version}`
}
