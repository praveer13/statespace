// A claim card minted or updated from an imported receipt (labs/README.md section 9.2; ARCHITECTURE.md section 8.4).
// Its strip comes from the stamps packages/stamps derived from the receipt's verdict lines (no stamp is typed); the
// correspondence and the requirement fit stay pending until the learner's own card arrives with the lab bundle. Its
// rests-on view lists what the claim stands on: the pinned statements it states, the receipt that supports it, and
// the trusted base the receipt names.

import { Link } from 'react-router'
import { claimName } from '../../app/content.ts'
import { InlineMd } from '../../components/markdown/Markdown.tsx'
import { DerivationView, LaneBadge } from '../../components/stamp/index.ts'
import { Strip } from '../../components/strip/index.ts'
import { whenOf, type ClaimCard as Card } from '../bench/receipt-model.ts'

const stageOf = (key: string): number | undefined => {
  const m = /^CL-([1-9][0-9]?)\./.exec(key)
  const n = m === null ? NaN : Number(m[1])
  return n >= 1 && n <= 10 ? n : undefined
}

export function ClaimCard({ card }: { readonly card: Card }) {
  const r = card.from.receipt
  const name = card.template !== undefined ? claimName(card.template) : undefined
  const stage = stageOf(card.key)
  return (
    <li id={`claim-${card.key}`} className="ccard" data-vol={stage}>
      <p className="ccard-id">
        <span className="claims-vol" aria-hidden="true" />
        <span className="visually-hidden">Claim </span>
        {card.key}
        {card.localId !== undefined && card.template !== undefined ? <span className="ccard-local">{card.localId}</span> : null}
        {stage !== undefined ? <span className="claims-stage">S{stage}</span> : null}
      </p>
      <h3 className="ccard-name">{name !== undefined ? <InlineMd text={name} /> : card.key}</h3>

      {card.strip !== null ? (
        <Strip strip={card.strip} />
      ) : (
        <p className="ccard-note">The strip could not be drawn: {card.stripProblems.join('; ')}</p>
      )}

      <dl className="ccard-rows">
        <div>
          <dt>Method</dt>
          <dd>
            From <code>{card.from.path}</code>, written {whenOf(r.createdAt)} <LaneBadge lane={card.from.stamps.lane} />
            {card.earlier.length > 0 ? (
              <span className="ccard-sub">
                Updated: it supersedes {card.earlier.length} earlier {card.earlier.length === 1 ? 'receipt' : 'receipts'} ({card.earlier.map((e) => whenOf(e.receipt.createdAt)).join(', ')}).
              </span>
            ) : (
              <span className="ccard-sub">Minted by this receipt.</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Correspondence, requirement</dt>
          <dd>
            Yours to write on the card in <code>claims/</code>; the tab shows them once your lab bundle is imported.
          </dd>
        </div>
      </dl>

      <details className="ccard-rests">
        <summary>What it rests on</summary>
        <dl className="ccard-rows">
          <div>
            <dt>States</dt>
            <dd>
              {r.statements.length === 0 ? (
                'no pinned statement'
              ) : (
                <ul className="ccard-list">
                  {r.statements.map((s) => (
                    <li key={s.path}>
                      <code>{s.path}</code> ({s.kind}), hash <code>{s.sha256.slice(0, 12)}…</code> as reported
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
          <div>
            <dt>Supported by</dt>
            <dd>
              <ul className="ccard-list">
                {card.derivations.length === 0 ? <li>no run in the receipt</li> : null}
                {card.derivations.map((d, i) => (
                  <li key={i} className="ccard-deriv">
                    <code>{d.section}</code> <DerivationView derivation={d.derivation} />
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          {(r.tcb ?? []).length > 0 ? (
            <div>
              <dt>Trusts</dt>
              <dd>
                <ul className="ccard-list">
                  {(r.tcb ?? []).map((t, i) => (
                    <li key={i}>
                      {t.component} <span className="ccard-status">{t.status}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
          {card.template !== undefined ? (
            <div>
              <dt>Template</dt>
              <dd>
                <code>{card.template}</code>, minted at <Link to={`/labs/${r.lab}#step-${r.stage.replace(/\./g, '-')}`}>{r.stage}</Link>.
              </dd>
            </div>
          ) : null}
        </dl>
      </details>
    </li>
  )
}
