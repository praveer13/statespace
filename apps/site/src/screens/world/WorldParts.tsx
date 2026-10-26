// The world's side of SCR-clearinghouse (docs/WORLD.md section 6.2): the ledger drawn from the week's canonical
// state, the traffic, the holds, the rules with the stamps their runs derive, what is plugged in, and "About this
// world". Every number here is a live result of INS-interp on this week's inputs, printed with its seed and its n,
// or it cites a recorded run.

import type { ReactNode } from 'react'
import { deriveStamp } from '@statespace/stamps'
import type { State } from '@statespace/interp'
import { acctName, balanceOf, RULES, SLOTS, user } from '@statespace/world'
import type { Standing, Week } from '@statespace/world'
import { LaneBadge, Stamp } from '../../components/stamp/index.ts'

const fmt = (n: bigint): string => {
  const s = (n < 0n ? -n : n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return n < 0n ? `−${s}` : s
}

const hex8 = (n: number): string => (n >>> 0).toString(16).padStart(8, '0')

/** The run line every world number carries: engine · seed · n (WORLD.md section 6.2). */
export function RunLine({ week, what }: { readonly week: Week; readonly what?: string }) {
  return (
    <p className="wrun">
      <LaneBadge lane="rechecked-here" /> <span>INS-interp · week {week.input.k} · seed <code>{hex8(week.input.seed)}</code> · n = {week.run.steps.length} calls{what ? ` · ${what}` : ''}</span>
    </p>
  )
}

function heldBy(s: State, name: string): bigint {
  return s.holds.filter((h) => h.status === 'held' && h.owner.tag === 'user' && h.owner.name === name).reduce((t, h) => t + BigInt(h.amount), 0n)
}

/**
 * The ledger board: one ruled row per account, grouped by tenant. A filled bar is the closing balance, an open bar
 * beside it the credits held in escrow, and a short ink tick the opening balance. mint, sink and the escrow total close
 * the board above the sum the conservation rule checks.
 */
export function LedgerBoard({ w, week }: { readonly w: Standing; readonly week: Week }) {
  const start = week.run.start
  const end = week.run.end
  const users = w.tenants.flatMap((t) => t.users)
  const max = users.reduce((m, u) => {
    const v = [balanceOf(start, user(u)) + heldBy(start, u), balanceOf(end, user(u)) + heldBy(end, u)]
    return v.reduce((a, b) => (b > a ? b : a), m)
  }, 1n)
  const X0 = 84
  const W = 220
  const xOf = (n: bigint) => X0 + Number((n * BigInt(W)) / max)
  const ROW = 26
  const rows: { y: number; el: ReactNode }[] = []
  let y = 0
  for (const t of w.tenants) {
    rows.push({
      y,
      el: (
        <text key={`t-${t.name}`} x={0} y={y + 18} className="wl-tenant">
          {t.name}
        </text>
      ),
    })
    y += ROW
    for (const u of t.users) {
      const open = balanceOf(start, user(u))
      const close = balanceOf(end, user(u))
      const held = heldBy(end, u)
      const xa = xOf(close)
      const xh = xOf(close + held)
      const xo = xOf(open)
      rows.push({
        y,
        el: (
          <g key={`u-${u}`}>
            <line x1={0} x2={480} y1={y + ROW} y2={y + ROW} className="wl-rule" />
            <text x={12} y={y + 17} className="wl-name">
              {u}
            </text>
            <rect x={X0} y={y + 7} width={Math.max(0, xa - X0)} height={12} className="wl-bar" />
            {held > 0n ? <rect x={xa} y={y + 7.5} width={Math.max(1, xh - xa)} height={11} className="wl-held" /> : null}
            <line x1={xo} x2={xo} y1={y + 3} y2={y + 23} className="wl-tick" />
            <text x={480} y={y + 17} className="wl-num" textAnchor="end">
              {fmt(open)} → {fmt(close)}
              {held > 0n ? ` · held ${fmt(held)}` : ''}
            </text>
          </g>
        ),
      })
      y += ROW
    }
  }
  const mint = balanceOf(end, { tag: 'mint' })
  const sink = balanceOf(end, { tag: 'sink' })
  const escrow = end.bals.filter((b) => b.acct.tag === 'escrow').reduce((t, b) => t + BigInt(b.bal), 0n)
  const total = end.bals.reduce((t, b) => t + BigInt(b.bal), 0n)
  const tail: [string, bigint, string][] = [
    ['mint', mint, 'the setup grants, and nothing since'],
    ['sink', sink, 'captured to sink'],
    ['escrow', escrow, `${end.holds.filter((h) => h.status === 'held').length} open holds`],
  ]
  y += 6
  rows.push({ y, el: <line key="heavy" x1={0} x2={480} y1={y} y2={y} className="wl-rule-heavy" /> })
  for (const [name, v, note] of tail) {
    rows.push({
      y,
      el: (
        <g key={`a-${name}`}>
          <text x={12} y={y + 18} className="wl-name">
            {name}
          </text>
          <text x={X0} y={y + 18} className="wl-note">
            {note}
          </text>
          <text x={480} y={y + 18} className="wl-num" textAnchor="end">
            {fmt(v)}
          </text>
        </g>
      ),
    })
    y += ROW
  }
  rows.push({
    y,
    el: (
      <g key="sum">
        <line x1={0} x2={480} y1={y + 2} y2={y + 2} className="wl-rule-heavy" />
        <text x={12} y={y + 22} className="wl-sum">
          sum over every account
        </text>
        <text x={480} y={y + 22} className="wl-sum" textAnchor="end">
          {fmt(total)}
        </text>
      </g>
    ),
  })
  y += ROW + 6
  const label = `The ledger at the end of week ${week.input.k}: ${users.map((u) => `${u} ${balanceOf(end, user(u))}`).join(', ')}; mint ${mint}, sink ${sink}, escrow ${escrow}; the sum over every account is ${total}.`
  return (
    <figure className="wfig no-margin">
      <figcaption className="adf-head">
        <span>
          <span className="adf-n">Figure</span> <span className="adf-title">· The ledger, week {week.input.k} · INS-interp</span>
        </span>
        <code className="adf-lane">{week.run.endHash.slice(0, 8)}</code>
      </figcaption>
      <div className="wfig-body">
        <svg viewBox={`0 0 480 ${y}`} role="img" aria-label={label} className="wl">
          {rows.map((r) => r.el)}
        </svg>
        <ul className="wl-key" aria-hidden="true">
          <li>
            <span className="wl-key-bar" /> closing balance
          </li>
          <li>
            <span className="wl-key-held" /> held in escrow
          </li>
          <li>
            <span className="wl-key-tick" /> opening balance
          </li>
        </ul>
      </div>
    </figure>
  )
}

export function Traffic({ week }: { readonly week: Week }) {
  return (
    <div className="wtable-frame" tabIndex={0} role="region" aria-label={`Traffic, week ${week.input.k}, ${week.run.steps.length} calls`}>
      <table className="atable wtable">
        <caption>Traffic · step · call · outcome · effects</caption>
        <thead>
          <tr>
            <th scope="col" className="num">
              Step
            </th>
            <th scope="col">Call</th>
            <th scope="col">Outcome</th>
            <th scope="col">Effects</th>
          </tr>
        </thead>
        <tbody>
          {week.run.steps.map((s) => (
            <tr key={s.i}>
              <th scope="row" className="num">
                {s.i}
              </th>
              <td>
                <code>{s.text}</code>
                <span className="wtenant"> · {s.tenant}</span>
              </td>
              <td>{s.outcome}</td>
              <td>{s.effects.join(', ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Holds({ week }: { readonly week: Week }) {
  const holds = week.run.end.holds
  if (holds.length === 0) return <p className="aplain">No holds were placed this week.</p>
  return (
    <div className="wtable-frame">
      <table className="atable wtable">
        <caption>Holds · owner · amount · status</caption>
        <thead>
          <tr>
            <th scope="col" className="num">
              Hold
            </th>
            <th scope="col">Owner</th>
            <th scope="col" className="num">
              Amount
            </th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {holds.map((h) => (
            <tr key={h.id}>
              <th scope="row" className="num">
                {h.id}
              </th>
              <td>{acctName(h.owner)}</td>
              <td className="num">{h.amount}</td>
              <td>{h.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Each rule with the stamp its run derives (spine section 8.8): quiet over n calls earns at most [T] · n calls. */
export function Rules({ week }: { readonly week: Week }) {
  const n = week.run.steps.length
  return (
    <ul className="wrules">
      {RULES.map((r) => {
        const firing = week.run.steps.find((s) => s.fired.includes(r.id))
        const d = firing
          ? deriveStamp({ kind: 'clearinghouse-fires', rule: r.pinned.split(':')[0]?.replace('rule ', '') ?? r.id, witness: { length: 1, unit: 'calls' }, replay: 'replayed' }, { lane: 'rechecked-here', source: 'INS-interp' })
          : deriveStamp({ kind: 'clearinghouse-quiet', rule: r.pinned.split(':')[0]?.replace('rule ', '') ?? r.id, calls: n }, { lane: 'rechecked-here', source: 'INS-interp' })
        return (
          <li key={r.id}>
            <p className="wrule-text">{r.text}</p>
            {d.kind === 'stamp' ? <Stamp stamp={d.stamp} /> : <p className="anote">No stamp: {d.kind}</p>}
          </li>
        )
      })}
    </ul>
  )
}

export type SlotStatus = 'yours' | 'reference' | 'not built'

/** What is plugged in, in pipeline order, each box labeled with its status in words (WORLD.md section 6.2). */
export function Plugged({ labs }: { readonly labs: ReadonlySet<string> }) {
  const H = 46
  const GAP = 14
  const status = (lab: string): string => (labs.has(lab) ? 'reference module, earns nothing' : 'not built yet · reference module, earns nothing')
  const total = SLOTS.length * H + (SLOTS.length - 1) * GAP
  return (
    <div className="wplug">
      <svg viewBox={`0 0 260 ${total}`} className="wplug-svg" role="img" aria-label={`The pipeline: ${SLOTS.map((s) => `${s.name}, ${status(s.lab)}`).join('; ')}.`}>
        {SLOTS.map((s, i) => {
          const y = i * (H + GAP)
          return (
            <g key={s.id}>
              {i > 0 ? <line x1={22} x2={22} y1={y - GAP} y2={y} className="wplug-link" /> : null}
              <rect x={1} y={y + 1} width={258} height={H - 2} className="wplug-box" />
              <text x={12} y={y + 19} className="wplug-name">
                Your {s.name}
              </text>
              <text x={248} y={y + 19} className="wplug-lab" textAnchor="end">
                {s.lab}
              </text>
              <text x={12} y={y + 36} className="wplug-status">
                {labs.has(s.lab) ? 'reference module, earns nothing' : 'not built yet'}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="anote">
        An empty slot runs the course’s reference module, labeled “earns nothing”. Plugging in your own build (“Use a new build”) is laptop work on the Bench, and arrives with its module host.
      </p>
    </div>
  )
}

export function About() {
  return (
    <details className="wabout">
      <summary>About this world</summary>
      <ul>
        <li>The agent here is a seeded mutation generator. No language model runs.</li>
        <li>
          The world runs on the course’s port of the Mini-Plinth semantics, INS-interp. For the ledger, the port agrees with the Lean reference on 1,344 kernel-checked evaluator goldens [X RUN-interp-goldens]: a test over those goldens,
          not a proof. The access and provider layers have no Lean reference; other engines check them.
        </li>
        <li>PGlite runs one connection, so concurrency here will come from histories recorded on PostgreSQL.</li>
        <li>Each incident’s bar is checked to break a naive version and spare the reference, on that very instance, before it is served.</li>
        <li>Erosions come only from your oldest open seam. None fires in the ledger phase.</li>
        <li>The checker in this tab is a bounded search over a sample of the week’s states, not a solver. Its results print their runs and earn at most a test.</li>
        <li>Nothing here leaves your device unless you export it.</li>
      </ul>
    </details>
  )
}
