// SCR-audit, before the Audit Desk is built: what it will be (DESIGN.md SCR-audit and section 6.10; docs/AUDIT-DESK.md
// sections 1, 2.2, 5 and 8, in learner words: "case", "kind of gap", "sound", "audit accuracy"). It shows no case,
// because none is keyed yet: the anatomy of a case, the five moves, the kinds of gap, and the Desk's own rules. In
// the series black (--vol-10), since the Desk draws on every volume.

import { Link } from 'react-router'
import { useTitle } from '../../app/title.ts'
import './audit.css'

const PARTS = [
  {
    name: 'The claim',
    text: 'What the agent says its change achieves, quoted as it wrote it. It carries no stamp: a claim earns one only from a check.',
  },
  {
    name: 'The statement it rests on',
    text: 'A theorem, a solver query, a TLA+ property, a policy or a SQL plan: the thing a checker actually checked.',
  },
  {
    name: 'The change that produced it',
    text: 'The diff, its description and the runs behind it. You see these only after your first call.',
    hidden: true,
  },
] as const

const MOVES = [
  ['Call the statement alone.', 'Sound, or a gap, with how sure you are: guess, think so or sure. Only the first call counts, and it feeds your Mirror.'],
  ['Read the change.', 'The diff, the agent’s description and the runs behind it, each badged with where it ran.'],
  ['Say what it establishes.', 'One line in your own words, then a handful of concrete scenarios: does the statement, as written, rule this one out?'],
  ['Name the kind of gap.', 'Or call it sound. Nothing is selected for you, and you cannot file until you choose.'],
  ['Point at the lines.', 'Anchor your evidence to the lines that carry it: a witness, a trace, a pair of states, or the stamp the method earns.'],
] as const

const KINDS = [
  {
    attacks: 'The claim',
    how: 'The statement holds, but of the wrong thing.',
    gaps: ['a statement too weak for what it is said to prove', 'a premise that can never hold', 'a property of the wrong kind', 'a different requirement, faithfully proved'],
  },
  {
    attacks: 'The evidence',
    how: 'The check did not show what it is said to show.',
    gaps: [
      'an encoding whose arithmetic differs from the code’s',
      'a bounded or inconclusive run reported as proof',
      'trust hidden inside or beneath the checker',
      'an assumption about the environment left unsaid',
      'a test presented as proof',
    ],
  },
  {
    attacks: 'The step between',
    how: 'True premises, and still the conclusion does not follow.',
    gaps: [
      'a checked model that is not the shipped code',
      'a model step coarser than the code’s',
      'an observer that sees less than the attacker',
      'a counterexample to induction treated as a bug',
    ],
  },
] as const

export function AuditScreen() {
  useTitle('Audit')
  return (
    <article className="screen audit">
      <header className="screen-head ws-head">
        <h1>The Audit Desk</h1>
        <p className="lede">The Audit Desk opens in a later build.</p>
        <p className="audit-purpose">
          It is where you decide whether a claim about code is justified before you trust the code. Each case is an agent’s proposal, and
          you judge it the way the course has taught you to read every stamp.
        </p>
      </header>

      <section aria-labelledby="audit-case" className="audit-section">
        <h2 id="audit-case">What a case holds</h2>
        <ol className="audit-anatomy">
          {PARTS.map((p) => (
            <li key={p.name} className="audit-part" data-hidden={'hidden' in p ? 'true' : undefined}>
              <h3 className="audit-part-name">{p.name}</h3>
              <p className="audit-part-text">{p.text}</p>
            </li>
          ))}
        </ol>
        <p className="audit-note">
          No case is shown here yet. Every case’s answer will come from a recorded run of a checker, never from a person or a language
          model, so none is printed until its run is recorded.
        </p>
      </section>

      <section aria-labelledby="audit-moves" className="audit-section">
        <h2 id="audit-moves">Five moves, in order</h2>
        <ol className="audit-moves">
          {MOVES.map(([head, text], i) => (
            <li key={head} className="audit-move">
              <p className="audit-move-n" aria-hidden="true">
                {i + 1}
              </p>
              <div className="audit-move-text">
                <h3 className="audit-move-head">{head}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="audit-kinds" className="audit-section">
        <h2 id="audit-kinds">Kinds of gap</h2>
        <p className="audit-intro">
          A gap attacks one of three things: the claim, the evidence under it, or the step from the evidence to the claim. The Desk names
          thirteen kinds, and a session brings a kind only after the lab stages that teach it.
        </p>
        <div className="audit-kinds">
          {KINDS.map((k) => (
            <section key={k.attacks} className="audit-kind" aria-label={`Gaps that attack ${k.attacks.toLowerCase()}`}>
              <h3 className="audit-kind-head">{k.attacks}</h3>
              <p className="audit-kind-how">{k.how}</p>
              <ul className="audit-kind-list">
                {k.gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section aria-labelledby="audit-rules" className="audit-section">
        <h2 id="audit-rules">How the Desk will keep you honest</h2>
        <dl className="audit-rules">
          <div>
            <dt>Sound cases</dt>
            <dd>
              Between 30 and 60 percent of a session’s cases are sound, so rejecting everything scores no better than chance. The share is seeded; it says
              nothing about how often agents err.
            </dd>
          </div>
          <div>
            <dt>Pairs</dt>
            <dd>
              Cases come in pairs that differ in one place, one sound and one flawed. The two never share a session; after you file, you
              see the other beside yours.
            </dd>
          </div>
          <div>
            <dt>Where</dt>
            <dd>A Desk session of 5, 6 or 8 cases that you start, and now and then one case on Today: two or three a week. It works on a phone.</dd>
          </div>
          <div>
            <dt>Afterwards</dt>
            <dd>
              Counts split by truth (sound cases accepted, flawed cases found), the key, and about a week later a fresh case of the same
              kind.
            </dd>
          </div>
          <div>
            <dt>Your figure</dt>
            <dd>
              Audit accuracy, private and kept on this device. It is a count until a kind has ten decisions, and a rate with its interval
              after that.
            </dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>Always open. Every case can be opened at any time, and audit accuracy unlocks nothing.</dd>
          </div>
          <div>
            <dt>Your own work</dt>
            <dd>
              Later, <code>statespace audit</code> turns your own lab repository, and your agent’s commits to it, into cases keyed on your
              machine. Nothing leaves the device.
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="audit-until" className="audit-section audit-until">
        <h2 id="audit-until">Until it opens</h2>
        <p>
          The lessons’ questions and the <Link to="/specimens">specimen cabinet</Link> practise the same reading, and the{' '}
          <Link to="/claims">claims ledger</Link> shows what each stamp in the course rests on.
        </p>
      </section>
    </article>
  )
}
