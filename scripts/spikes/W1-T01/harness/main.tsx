// One page of every stamp the deriver makes, a strip, a "modulo" reading, an [?] that fails closed, and an agent's
// assertion, each derived from a raw output through packages/stamps; ?theme=night sets the night theme.
import { createRoot } from 'react-dom/client'
import { buildStrip, deriveStamp, type Derivation, type RawOutput } from '@statespace/stamps'
import { DerivationView, LaneBadge, Stamp } from '../../../../apps/site/src/components/stamp/index.ts'
import { Strip } from '../../../../apps/site/src/components/strip/index.ts'

const theme = new URLSearchParams(location.search).get('theme')
if (theme) document.documentElement.dataset.theme = theme

const z3 = { name: 'Z3', version: '5.3.1' }
const ctx = { lane: 'reported' as const, source: 'harness' }
const raws: RawOutput[] = [
  { kind: 'smt-unsat', solver: z3, rlimit: 5000000 },
  { kind: 'tlc-complete', engine: { name: 'TLC', version: '1.8.0' }, constants: [['Init', '100'], ['Amount', '80'], ['Workers', '{w1, w2}']], distinctStates: 4 },
  { kind: 'grader', n: 12, passed: 10, unit: 'unseen items', interval: [0.55, 0.95] },
  { kind: 'runtime-check', where: 'deferred check over postings, at commit' },
  { kind: 'setting-read-back', setting: 'relrowsecurity', source: 'pg_class', at: 'the end of the run' },
  { kind: 'assumption', why: 'balances are unbounded integers' },
  { kind: 'smt-unknown', solver: z3, reason: 'incomplete (theory arithmetic)' },
  { kind: 'not-covered', what: "the recipient's balance" },
  { kind: 'tlc-violation', engine: { name: 'TLC', version: '1.8.0' }, property: 'NoOverspend', witness: { length: 4, unit: 'actions', states: 5 } },
]
const derived = raws.map((r) => deriveStamp(r, ctx))
const stampOf = (d: Derivation) => (d.kind === 'stamp' ? d.stamp : null)
const strip = buildStrip({
  claim: 'CL-1.1',
  title: 'the guarded transfer never overdraws the sender',
  proposition: { primary: derived[0], assumptions: [{ seam: 'SEAM-1', text: 'balances are unbounded integers' }] },
  correspondence: { primary: deriveStamp({ kind: 'assumption', why: 'the code computes a − amount without overflow' }, ctx) },
  requirement: { primary: deriveStamp({ kind: 'assumption', why: 'your statement' }, { lane: 'self-assessed', source: 'harness' }), supporting: [stampOf(derived[7])!] },
})

function Page() {
  return (
    <main style={{ padding: 'var(--gutter)', maxWidth: 'var(--content-max)' }}>
      <h1 style={{ fontSize: 'var(--fs-page-title)' }}>Stamps</h1>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 'var(--space-3)' }}>
        {derived.map((d, i) => (
          <li key={i}>{d.kind === 'stamp' ? <Stamp stamp={d.stamp} /> : null}</li>
        ))}
        <li>
          <Stamp stamp={stampOf(derived[0])!} onOpen={() => undefined} expanded={false} badge={false} />
        </li>
      </ul>
      <h2 style={{ fontSize: 'var(--fs-section)' }}>A claim's strip</h2>
      {strip.ok ? <Strip strip={strip.strip} assumptionHref={(a) => `#${a.seam ?? 'a'}`} /> : <p>{strip.problems.join('; ')}</p>}
      <h2 style={{ fontSize: 'var(--fs-section)' }}>Readings without a plain stamp</h2>
      <p>
        <DerivationView derivation={deriveStamp({ kind: 'lean-sorry', lean: { name: 'Lean', version: '4.35.0' }, lemmas: ['step_case'], count: 1 }, ctx)} />
      </p>
      <p>
        <DerivationView derivation={deriveStamp({ kind: 'smt-unknown', solver: z3, reason: 'canceled', rlimit: 5000000, guardsEnforcement: true }, ctx)} />
      </p>
      <DerivationView derivation={deriveStamp({ kind: 'agent-assertion', text: 'Proved: transfer never overdraws. 200 tests green.' }, ctx)} />
      <p>
        <LaneBadge lane="recorded-run" detail="RUN-z3-starter · Z3 5.3.1" />
      </p>
      <p style={{ fontFamily: 'var(--font-reading)', fontSize: 'var(--fs-prose)', lineHeight: 'var(--lh-prose)', maxWidth: 'var(--measure)' }}>
        Prose in Source Serif 4, with <a href="#x">an underlined link</a>, <em>italic</em>, <strong>semibold</strong>, and inline math{' '}
        <code>∀ a, b ∈ ℤ. a ≥ 0 ∧ amount ≤ a ⇒ a − amount ≥ 0</code>.
      </p>
      <pre tabIndex={0} aria-label="A Lean proof, which scrolls sideways">{'theorem transfer_nonneg : ∀ s, inv s → inv (step s) := by\n  intro s h; omega'}</pre>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Page />)
