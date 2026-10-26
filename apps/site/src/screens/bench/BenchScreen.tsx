// SCR-bench, the happy path's version: the ten labs, and how to install and run the statespace command line on your own
// machine (labs/README.md sections 4 and 5; bench/). Receipt import, the environment panel and lane badges arrive with
// the receipt viewer.

import { Link } from 'react-router'
import { loadLabs, useLoaded } from '../../app/content.ts'
import { useTitle } from '../../app/title.ts'
import { InlineMd } from '../../components/markdown/Markdown.tsx'
import { Loading } from '../../components/page/states.tsx'
import './bench.css'

const MANUAL = 'https://github.com/praveer13/statespace/blob/main/labs/README.md'

function Command({ label, children }: { readonly label: string; readonly children: string }) {
  return (
    <div className="code-block" role="region" aria-label={label} tabIndex={0}>
      <pre>
        <code>{children}</code>
      </pre>
    </div>
  )
}

export function BenchScreen() {
  useTitle('Bench')
  const labs = useLoaded(loadLabs, [])
  return (
    <article className="screen bench">
      <header className="screen-head">
        <p className="kicker">Bench · laptop</p>
        <h1>The Bench</h1>
        <p className="lede">
          The Bench is your laptop with the real tools. Each stage's lab is built there, in a repository you keep, and each lab stage ends
          in a check that writes a receipt. A phone reads the labs; the building needs a laptop.
        </p>
      </header>

      <section aria-labelledby="bench-setup" className="bench-setup">
        <h2 id="bench-setup">Set up</h2>
        <div className="prose">
          <p>
            <strong>The first lab needs only uv.</strong> Install <a href="https://docs.astral.sh/uv/">uv</a>, then run a lab script with
            the course's pinned Z3:
          </p>
        </div>
        <Command label="Run a lab script">{'uv run --with z3-solver==5.3.1 python -I <script>'}</Command>
        <div className="prose">
          <p>
            <strong>The statespace command line</strong> comes with the lab template, a Python tool that uv runs. From the repository
            root:
          </p>
        </div>
        <Command label="The statespace commands">
          {[
            'uv run statespace doctor        # check the pinned tools and the sandbox',
            'uv run statespace check lab1.1  # run one stage\'s checks and write its receipt',
            'uv run statespace check lab1    # run the whole lab',
          ].join('\n')}
        </Command>
        <div className="prose">
          <p>
            Inside the course's devcontainer the command is on your path, so <code>statespace check lab2.2</code> works as it is. From the
            second stage on you set up once: the devcontainer (the default), a native install at the pinned versions, or the same image in
            a cloud workspace. <code>statespace doctor</code> reads your setup and never changes it.
          </p>
          <p>
            <a href={MANUAL}>The lab manual</a> covers each way to set up, the sandbox, receipts, the hint ladder and what to do when you
            are stuck.
          </p>
        </div>
      </section>

      <section aria-labelledby="bench-labs">
        <h2 id="bench-labs">The labs</h2>
        {labs.status === 'loading' ? <Loading what="the labs" /> : null}
        {labs.status === 'error' ? <p className="status">The labs could not load ({labs.message}).</p> : null}
        {labs.status === 'ready' ? (
          <ol className="rows">
            {labs.value.map((lab) => {
              const minutes = lab.stages.filter((s) => !s.stretch).reduce((n, s) => n + s.minutes, 0)
              return (
                <li key={lab.id}>
                  <Link to={`/labs/${lab.id}`} className="row">
                    <span className="row-id">{lab.id}</span>
                    <span className="row-body">
                      <span className="row-title">
                        <InlineMd text={lab.title.charAt(0).toUpperCase() + lab.title.slice(1)} />
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
    </article>
  )
}
