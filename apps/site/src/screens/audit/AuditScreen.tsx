// SCR-audit, before the Audit Desk is built: what it will be (DESIGN.md SCR-audit and section 6.10).

import { Link } from 'react-router'
import { useTitle } from '../../app/title.ts'

export function AuditScreen() {
  useTitle('Audit')
  return (
    <article className="screen">
      <header className="screen-head">
        <p className="kicker">Audit</p>
        <h1>The Audit Desk</h1>
        <p className="lede">The Audit Desk opens in a later build.</p>
      </header>
      <div className="sheet prose">
        <p>
          It is where you judge whether a claim is justified. A case shows one claim on its own: a theorem, a model check or a test,
          and what someone says it supports. You call it sound or not before anything else is shown, then read the evidence (the
          statement, the change, the runs) and, where there is a gap, name what kind it is: a statement too weak for what it is said to
          prove, a premise that can never hold, a property of the wrong kind, a check that does not meet the requirement, and others.
        </p>
        <p>
          Cases come from every stage, a few a week reach Today, and they work on a phone. Until the Desk opens, the lessons'
          questions and the <Link to="/specimens">specimen cabinet</Link> practise the same reading.
        </p>
      </div>
    </article>
  )
}
