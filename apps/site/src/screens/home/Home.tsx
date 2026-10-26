// The start page: the series cover. The course is a set of ten slim volumes; the cover carries the course's promise,
// a state space you explore by hand (Boot's transfer), and the way into volume 1. Below it, the shelf of ten volumes,
// then what the course is and what this build opens. Copy follows DESIGN.md's voice and the glossary: no internal
// names, no stamp words used loosely, no tool numbers (those belong to recorded runs).

import { Link } from 'react-router'
import { loadStages, useLoaded } from '../../app/content.ts'
import { useTitle } from '../../app/title.ts'
import { Shelf } from '../../components/volume/Shelf.tsx'
import { StateGraph } from './StateGraph.tsx'
import './home.css'

export function Home() {
  useTitle(undefined)
  const stages = useLoaded(loadStages, [])
  return (
    <article className="home">
      <section className="cover" aria-labelledby="home-title">
        <p className="cover-masthead">
          <span className="cover-band-name">statespace</span>
          <span>A course in formal methods for working engineers</span>
          <span>Ten volumes · no servers behind it</span>
        </p>
        <div className="cover-inner">
          <div className="cover-text">
            <h1 id="home-title" className="cover-title">
              Learn formal methods by building a tiny checked language
            </h1>
            <p className="cover-lede">
              And learn to say exactly what each proof, model check and test establishes: about which property, under which
              assumptions, by which tool, and what it leaves unchecked.
            </p>
            <div className="cover-actions">
              <Link to="/lessons/S1.L0" className="flag">
                <span className="flag-verb">Open</span>
                <span className="flag-vol">volume 1</span>
                <span className="flag-sub">Start here</span>
              </Link>
              <Link to="/stages" className="cover-link">
                All ten volumes
              </Link>
            </div>
          </div>
          <div className="cover-figure">
            <StateGraph />
          </div>
        </div>
      </section>

      <section className="home-shelf wrap" aria-labelledby="home-shelf-title">
        <div className="home-shelf-head">
          <h2 id="home-shelf-title">The ten volumes</h2>
          <p>Read in order or open any one; nothing locks. A spine is as thick as its volume's planned lessons and lab.</p>
        </div>
        {stages.status === 'ready' ? <Shelf stages={stages.value} /> : <p className="status">{stages.status === 'loading' ? 'Taking down the volumes…' : 'The volumes did not load. Reload to try again.'}</p>}
      </section>

      <section className="home-about wrap" aria-labelledby="home-what">
        <h2 id="home-what">What it is</h2>
        <div className="home-about-text">
          <p>
            statespace is an interactive course with no servers behind it. Over ten stages you go from a counterexample found
            with a solver to a small ledger proved in Lean, then invent a tiny application language and build its tools: its
            semantics, a generator of proof obligations, models of its concurrency and its external effects, and a compiler to
            PostgreSQL with the proof that the compiler keeps meaning.
          </p>
          <p>
            It is written for a backend engineer studying alone, 6 to 10 hours a week, while building their own system with
            coding agents. Lessons, the daily session and the Audit Desk work on a phone; the hands-on Bench needs a laptop.
            Nothing locks: every page opens whenever you choose.
          </p>
        </div>
      </section>

      <section className="home-open wrap" aria-labelledby="home-open">
        <h2 id="home-open">Open in this build</h2>
        <Link to="/specimens" className="open-plate">
          <span className="open-name">The specimen cabinet</span>
          <span className="open-text">
            Where counterexamples are kept beside their fixes, each labeled from the run that found it. It starts empty: a
            lesson mounts a specimen when you make its first call.
          </span>
        </Link>
        <p className="home-status">
          This is the first public build. The first stage is being written now: Boot, the five S1 lessons and the
          counterexample lab arrive next, then a stage at a time.
        </p>
      </section>
    </article>
  )
}
