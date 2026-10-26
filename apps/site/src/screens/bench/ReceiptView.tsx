// A receipt shown as text, never as HTML (labs/README.md section 8): its colophon (where and with what the checks
// ran, and the help declared), each check with who ran it, what each run earned as packages/stamps derived it, the
// parts that earned no stamp and why, and the claim cards it mints or updates.

import { Link } from 'react-router'
import { claimName } from '../../app/content.ts'
import { InlineMd } from '../../components/markdown/Markdown.tsx'
import { DerivationView, LaneBadge } from '../../components/stamp/index.ts'
import { claimKey, toolsOf, whenOf, type ImportedReceipt } from './receipt-model.ts'
import './receipt.css'

/** A check's label from the lab's page, when the screen has it. */
export type CheckLabel = (id: string) => string | undefined

const assistedWords = { none: 'no help', explain: 'explanations', code: 'code' } as const

export function CheckResultMark({ pass }: { readonly pass: boolean }) {
  return (
    <span className="rcpt-mark" data-pass={pass ? 'true' : 'false'}>
      <span className="rcpt-mark-box" aria-hidden="true" />
      <span className="rcpt-mark-word">{pass ? 'passed' : 'failed'}</span>
    </span>
  )
}

export function ReceiptView({ imported, checkLabel }: { readonly imported: ImportedReceipt; readonly checkLabel?: CheckLabel }) {
  const r = imported.receipt
  const lane = imported.stamps.lane
  const env = r.environment
  return (
    <div className="rcpt">
      <p className="rcpt-strip">
        <span className="rcpt-strip-word">Receipt</span> <span className="rcpt-strip-id">{r.stage}</span>
        <span className="rcpt-strip-when">{whenOf(r.createdAt)}</span>
      </p>

      <dl className="rcpt-colophon">
        <div>
          <dt>Who ran it</dt>
          <dd>
            <LaneBadge lane={lane} />
          </dd>
        </div>
        <div>
          <dt>File</dt>
          <dd>
            <code>{imported.path}</code>
          </dd>
        </div>
        <div>
          <dt>Written by</dt>
          <dd>
            <code>
              {r.cli.name} {r.cli.version}
            </code>
          </dd>
        </div>
        <div>
          <dt>Tools</dt>
          <dd className="rcpt-tools">
            {r.tools.length === 0
              ? 'none'
              : r.tools.map((t) => (
                  <code key={`${t.name}-${t.version}`}>
                    {t.name} {t.version}
                    {t.pinned === false ? ' (unpinned)' : ''}
                  </code>
                ))}
          </dd>
        </div>
        <div>
          <dt>Machine</dt>
          <dd>
            {env.os.name}
            {env.os.version !== undefined ? ` ${env.os.version}` : ''} · {env.os.arch} · sandbox {env.sandbox}
            {env.devcontainer !== null ? ' · devcontainer' : ' · no devcontainer'}
            {env.sandboxDetail !== undefined ? <span className="rcpt-quote">{env.sandboxDetail}</span> : null}
          </dd>
        </div>
        <div>
          <dt>Help declared</dt>
          <dd>
            {assistedWords[r.provenance.assisted]} · agent {r.provenance.agent ? 'yes' : 'no'} · guard {r.provenance.guard}
          </dd>
        </div>
        {r.statements.length > 0 ? (
          <div>
            <dt>Statements</dt>
            <dd className="rcpt-tools">
              {r.statements.map((s) => (
                <span key={s.path}>
                  <code>{s.path}</code> <span className="rcpt-hash">{s.sha256.slice(0, 12)}…, as reported</span>
                </span>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>

      <section className="rcpt-part" aria-label={`The checks of ${r.stage}`}>
        <h3 className="rcpt-head">{r.checks.length === 1 ? 'The check' : 'The checks'}</h3>
        <ul className="rcpt-checks">
          {r.checks.map((c) => (
            <li key={c.id} className="rcpt-check">
              <CheckResultMark pass={c.pass} />
              <span className="rcpt-check-text">
                <code>{c.id}</code> {checkLabel?.(c.id) !== undefined ? <InlineMd text={checkLabel(c.id) as string} /> : null}
                <span className="rcpt-check-by">
                  Run by {lane === 'self-assessed' ? 'you, self-assessed' : `statespace check on your machine${r.tools.length > 0 ? `, with ${toolsOf(r)}` : ''}`}.
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rcpt-part" aria-label="What the runs earned">
        <h3 className="rcpt-head">What the runs earned</h3>
        {imported.stamps.items.length === 0 && imported.stamps.problems.length === 0 ? <p className="rcpt-note">The receipt records no runs.</p> : null}
        {imported.stamps.items.length > 0 ? (
          <ul className="rcpt-items">
            {imported.stamps.items.map((it, i) => (
              <li key={i} className="rcpt-item">
                <code className="rcpt-section">{it.section}</code>
                <DerivationView derivation={it.derivation} />
              </li>
            ))}
          </ul>
        ) : null}
        {imported.stamps.problems.length > 0 ? (
          <details className="rcpt-problems">
            <summary>
              {imported.stamps.problems.length} {imported.stamps.problems.length === 1 ? 'part' : 'parts'} earned no stamp
            </summary>
            <ul>
              {imported.stamps.problems.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      {(r.claims ?? []).length > 0 ? (
        <section className="rcpt-part" aria-label="Claim cards">
          <h3 className="rcpt-head">Claim cards it mints or updates</h3>
          <ul className="rcpt-claims">
            {(r.claims ?? []).map((c) => {
              const key = claimKey(c)
              const name = c.template !== undefined ? claimName(c.template) : undefined
              return (
                <li key={key}>
                  <Link to={`/claims#claim-${key}`}>
                    <code>{key}</code>
                  </Link>
                  {c.id !== undefined && c.template !== undefined ? <code className="rcpt-local"> {c.id}</code> : null}
                  {name !== undefined ? (
                    <span className="rcpt-claim-name">
                      {' '}
                      <InlineMd text={name} />
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
