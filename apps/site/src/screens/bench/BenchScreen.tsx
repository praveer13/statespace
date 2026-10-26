// SCR-bench, the happy path's version: the ten labs, how to install and run the statespace command line on your own
// machine (labs/README.md sections 4 and 5; bench/), and receipt import (section 8): paste or drop a receipt, see each
// check with who ran it and the claim cards it mints, and the receipts this tab holds a read-only copy of. The page sits
// in the series black (--vol-10); each lab on the shelf carries its own volume's ink.

import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { loadLabs, useLoaded } from '../../app/content.ts'
import { useStore } from '../../app/ledger.ts'
import { useTitle } from '../../app/title.ts'
import { InlineMd } from '../../components/markdown/Markdown.tsx'
import { Loading } from '../../components/page/states.tsx'
import { CoverArt } from '../../components/volume/CoverArt.tsx'
import { volumeOf } from '../../components/volume/volumes.ts'
import '../../components/volume/volume.css'
import './bench.css'
import { whenOf } from './receipt-model.ts'
import { ReceiptImport } from './ReceiptImport.tsx'
import { ReceiptView } from './ReceiptView.tsx'
import { useReceipts } from './useReceipts.ts'

const MANUAL = 'https://github.com/praveer13/statespace/blob/main/labs/README.md'

/** A command as a terminal plate: a strip in the series black that names it, then the lines on paper in an ink frame. */
function Command({ label, children }: { readonly label: string; readonly children: string }) {
  return (
    <div className="bench-term">
      <p className="bench-term-head" aria-hidden="true">
        {label}
      </p>
      <div className="code-block bench-term-body" role="region" aria-label={label} tabIndex={0}>
        <pre>
          <code>{children}</code>
        </pre>
      </div>
    </div>
  )
}

function Step({ n, children }: { readonly n: number; readonly children: ReactNode }) {
  return (
    <li className="bench-step">
      <p className="bench-step-n" aria-hidden="true">
        {n}
      </p>
      <div className="bench-step-body">{children}</div>
    </li>
  )
}

export function BenchScreen() {
  useTitle('Bench')
  const labs = useLoaded(loadLabs, [])
  const store = useStore()
  const { mirror, receipts } = useReceipts(store)
  const labels = new Map<string, string>()
  if (labs.status === 'ready') for (const lab of labs.value) for (const s of lab.stages) for (const c of s.checks) labels.set(c.id, c.label)
  const checkLabel = (id: string): string | undefined => labels.get(id)
  return (
    <article className="screen bench">
      <header className="screen-head ws-head">
        <h1>The Bench</h1>
        <p className="lede">
          The Bench is your laptop with the real tools. Each stage's lab is built there, in a repository you keep, and each lab stage ends
          in a check that writes a receipt. A phone reads the labs; the building needs a laptop.
        </p>
      </header>

      <div className="bench-layout">
        <section aria-labelledby="bench-setup" className="bench-setup">
          <h2 id="bench-setup">Set up</h2>
          <ol className="bench-steps">
            <Step n={1}>
              <div className="prose">
                <p>
                  <strong>The first lab needs only uv.</strong> Install <a href="https://docs.astral.sh/uv/">uv</a>, then run a lab script
                  with the course's pinned Z3:
                </p>
              </div>
              <Command label="Run a lab script">{'uv run --with z3-solver==5.3.1 python -I <script>'}</Command>
            </Step>
            <Step n={2}>
              <div className="prose">
                <p>
                  <strong>The statespace command line</strong> comes with the lab template, a Python tool that uv runs. From the
                  repository root:
                </p>
              </div>
              <Command label="The statespace commands">
                {[
                  'uv run statespace doctor        # check the pinned tools and the sandbox',
                  'uv run statespace check lab1.1  # run one stage\'s checks and write its receipt',
                  'uv run statespace check lab1    # run the whole lab',
                ].join('\n')}
              </Command>
            </Step>
            <Step n={3}>
              <div className="prose">
                <p>
                  Inside the course's devcontainer the command is on your path, so <code>statespace check lab2.2</code> works as it is.
                  From the second stage on you set up once: the devcontainer (the default), a native install at the pinned versions, or the
                  same image in a cloud workspace. <code>statespace doctor</code> reads your setup and never changes it.
                </p>
                <p>
                  <a href={MANUAL}>The lab manual</a> covers each way to set up, the sandbox, receipts, the hint ladder and what to do when
                  you are stuck.
                </p>
              </div>
            </Step>
          </ol>
        </section>

        <section aria-labelledby="bench-receipts" className="bench-receipts">
          <h2 id="bench-receipts">Receipts</h2>
          <p className="bench-receipts-lede">
            <code>statespace check</code> writes a receipt for each stage it runs. Import it here: the tab shows each check with who ran it, and
            mints or updates the claim cards it names on the <Link to="/claims">claims</Link> page.
          </p>
          <ReceiptImport store={store} checkLabel={checkLabel} />
          {mirror.status === 'ready' && receipts.length > 0 ? (
            <div className="bench-held">
              <h3 className="bench-held-head">In this tab's copy</h3>
              <ol className="bench-held-list">
                {receipts.map((imp) => (
                  <li key={imp.path}>
                    <details className="bench-held-row">
                      <summary>
                        <code>{imp.receipt.stage}</code>
                        <span className="bench-held-when">{whenOf(imp.receipt.createdAt)}</span>
                        <span className="bench-held-sum">
                          {imp.receipt.checks.length === 1 ? (imp.receipt.checks[0]?.pass ? 'its check passed' : 'its check failed') : `${imp.receipt.checks.filter((c) => c.pass).length} of ${imp.receipt.checks.length} checks passed`}
                        </span>
                      </summary>
                      <ReceiptView imported={imp} checkLabel={checkLabel} />
                    </details>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>

        <section aria-labelledby="bench-labs" className="bench-labs">
          <h2 id="bench-labs">The labs</h2>
          {labs.status === 'loading' ? <Loading what="the labs" /> : null}
          {labs.status === 'error' ? <p className="status">The labs could not load ({labs.message}).</p> : null}
          {labs.status === 'ready' ? (
            <ol className="rows bench-shelf">
              {labs.value.map((lab) => {
                const minutes = lab.stages.filter((s) => !s.stretch).reduce((n, s) => n + s.minutes, 0)
                const v = volumeOf(lab.stage)
                return (
                  <li key={lab.id} style={{ '--vol': v?.ink ?? 'var(--vol-10)' } as CSSProperties}>
                    <Link to={`/labs/${lab.id}`} className="row bench-lab">
                      <span className="mini-cover bench-lab-cover" aria-hidden="true">
                        {v !== undefined ? <CoverArt kind={v.motif} id={`bench-${lab.id}`} /> : null}
                        <span className="mini-cover-n">{v?.n ?? ''}</span>
                      </span>
                      <span className="row-body">
                        <span className="row-id">{lab.id}</span>
                        <span className="row-title">
                          <InlineMd text={(lab.title.charAt(0).toUpperCase() + lab.title.slice(1)).replace(/\.$/, '')} />
                        </span>
                        <span className="row-meta">
                          {lab.stage} · {lab.stages.length} stages · about {minutes} min
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          ) : null}
        </section>
      </div>
    </article>
  )
}
