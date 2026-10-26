// The start page: what the course is, its ten stages, and what this build already opens. Copy follows DESIGN.md's voice
// and the glossary: no internal names, no stamp words used loosely, no tool numbers (those belong to recorded runs).

import { Link } from 'react-router'
import './home.css'

interface Stage {
  readonly code: string
  readonly name: string
  readonly question: string
}

const STAGES: readonly Stage[] = [
  { code: 'S1', name: 'Counterexample', question: 'Find a bug mathematically, with the Z3 solver.' },
  { code: 'S2', name: 'Proof', question: 'Prove the properties of a small ledger in Lean 4.' },
  { code: 'S3', name: 'Semantics', question: 'Invent Mini-Plinth, a tiny application language, and define what its programs mean.' },
  { code: 'S4', name: 'Obligations', question: 'Build the generator that turns its programs into proof obligations.' },
  { code: 'S5', name: 'Time', question: 'Explore concurrency and liveness with TLA+.' },
  { code: 'S6', name: 'Correspondence', question: 'Connect the semantics to PostgreSQL.' },
  { code: 'S7', name: 'Secrecy', question: 'Prove access-control and information-flow claims.' },
  { code: 'S8', name: 'Effects', question: 'Model external effects and crash recovery.' },
  { code: 'S9', name: 'Preservation', question: 'Prove that a compiler transformation keeps meaning.' },
  { code: 'S10', name: 'Assembly', question: 'Assemble the Core from the tools you built.' },
]

export function Home() {
  return (
    <article className="home">
      <header className="home-head">
        <p className="home-kicker">A course in formal methods for working engineers</p>
        <h1>Learn formal methods by building a tiny checked language</h1>
        <p className="home-lede">
          And learn to say exactly what each proof, model check and test establishes: about which property, under which
          assumptions, by which tool, and what it leaves unchecked.
        </p>
      </header>

      <section aria-labelledby="home-what">
        <h2 id="home-what">What it is</h2>
        <p>
          statespace is an interactive course with no servers behind it. Over ten stages you go from a counterexample found
          with a solver to a small ledger proved in Lean, then invent a tiny application language and build its tools: its
          semantics, a generator of proof obligations, models of its concurrency and its external effects, and a compiler
          to PostgreSQL with the proof that the compiler keeps meaning.
        </p>
        <p>
          It is written for a backend engineer studying alone, 6 to 10 hours a week, while building their own system with
          coding agents. Lessons, the daily session and the Audit Desk work on a phone; the hands-on Bench needs a laptop.
          Nothing locks: every page opens whenever you choose.
        </p>
      </section>

      <section aria-labelledby="home-stages">
        <h2 id="home-stages">The ten stages</h2>
        <ol className="stage-list">
          {STAGES.map((s) => (
            <li key={s.code}>
              <span className="stage-code">{s.code}</span>
              <span className="stage-body">
                <span className="stage-name">{s.name}</span>
                <span className="stage-question">{s.question}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="home-open">
        <h2 id="home-open">Open in this build</h2>
        <ul className="open-list">
          <li>
            <Link to="/specimens" className="open-card">
              <span className="open-name">The specimen cabinet</span>
              <span className="open-text">
                Where counterexamples are kept beside their fixes, each labeled from the run that found it. It starts empty:
                a lesson mounts a specimen when you make its first call.
              </span>
            </Link>
          </li>
        </ul>
        <p className="home-status">
          This is the first public build. The first stage is being written now: Boot, the five S1 lessons and the
          counterexample lab arrive next, then a stage at a time.
        </p>
      </section>
    </article>
  )
}
