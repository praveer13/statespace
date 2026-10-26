// A game for S1.L5, "The encoding is the claim": the same guarded transfer run over `Int`, signed 8-bit and signed
// 64-bit integers. The learner sets A, B and X; the page runs the guard `X <= A`, stores each result the way the
// encoding does, and draws it on a dial of the bit patterns, where a sum that passes the largest value comes round on the
// negative side. "Show me" searches the whole 8-bit space the premises allow, builds a 64-bit pick by hand, and over
// `Int` searches a small box and says that the box is only a sample. No solver runs here.

import { useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import { bitsOf, built64, fits, parseWhole, rangeOf, run, search, unsignedOf, widthOf } from './model.ts'
import type { Encoding, Line, Pick, Run, Search } from './model.ts'
import './wrap.css'

// ------------------------------------------------------------------ words

const MINUS = '−'

/** A whole number as printed: a true minus sign, and thousands separators past four digits. */
function num(v: bigint): string {
  const abs = v < 0n ? -v : v
  const s = abs >= 10000n ? abs.toLocaleString('en') : abs.toString()
  return v < 0n ? `${MINUS}${s}` : s
}

const POW: Record<8 | 64, string> = { 8: '2⁸', 64: '2⁶⁴' }

const ENC_NAME: Record<Encoding, string> = {
  int: 'Int',
  bv8: 'signed 8-bit',
  bv64: 'signed 64-bit',
}

function sayRun(e: Encoding, positive: boolean, p: Pick, r: Run): ReactNode {
  const n = widthOf(e)
  const o = r.outcome
  if (o.kind === 'premise') {
    const what = o.which === 'a' ? <code>A &gt;= 0</code> : o.which === 'b' ? <code>B &gt;= 0</code> : <code>X &gt; 0</code>
    return (
      <>
        <strong>Not an input the claim is about.</strong> The premise {what} fails, so this pick is outside the question.
        {o.which === 'x' ? ' Untick the premise to let a zero or negative amount in.' : ''}
      </>
    )
  }
  if (o.kind === 'rejected') {
    return (
      <>
        <strong>Rejected, not a witness.</strong> The guard <code>X &lt;= A</code> fails: {num(p.x)} is above {num(p.a)}.
      </>
    )
  }
  const wrapNote = (who: string, l: Line, op: string): ReactNode =>
    l.wrapped && n !== null ? (
      <>
        {' '}
        The {who}&apos;s {op} is {num(l.exact)} exactly, which does not fit in {n} bits; the bits that are left,{' '}
        <code>{bitsOf(l.exact, n)}</code>, read as {num(l.after)}.
      </>
    ) : l.after < 0n && n !== null ? (
      <>
        {' '}
        The {who}&apos;s {op} is {num(l.exact)}, which fits in {n} bits and wraps nothing: with X negative, the transfer
        takes from the {who} directly.
      </>
    ) : null
  const total =
    n === null ? null : (
      <> The total A + B, itself taken modulo {POW[n]}, reads {num(r.totalBefore)} before and {num(r.totalAfter)} after: {r.conserved ? 'the same' : 'not the same'}.</>
    )
  if (o.kind === 'fine') {
    return (
      <>
        <strong>Through, but not a witness.</strong> The guard passes, the sender ends at {num(r.sender.after)} and the
        recipient at {num(r.recipient.after)}. Nobody is below zero.
      </>
    )
  }
  const head =
    o.who === 'recipient'
      ? 'A witness: the recipient ends below zero.'
      : o.who === 'sender'
        ? 'A witness: the sender ends below zero.'
        : 'A witness: both end below zero.'
  const plain =
    n === null ? (
      <>
        {' '}
        Over <code>Int</code> nothing wraps: a negative amount of {num(p.x)} passes the guard and takes money from the
        recipient, who ends at {num(r.recipient.after)}.{positive ? '' : ' That is why the premise X > 0 is there.'}
      </>
    ) : null
  return (
    <>
      <strong>{head}</strong> The guard <code>X &lt;= A</code> passes; it bounds the debit and never looks at the credit.
      {o.who !== 'recipient' ? wrapNote('sender', r.sender, 'A − X') : null}
      {o.who !== 'sender' ? wrapNote('recipient', r.recipient, 'B + X') : null}
      {plain}
      {total}
    </>
  )
}

// ------------------------------------------------------------------ the dial

const CX = 170
const CY = 158
const R_OUT = 124
const R_IN = 88
const VB_W = 340
const VB_H = 330

/** The angle of a bit pattern, clockwise from the top, as a fraction of a turn. */
function turnOf(v: bigint, n: number): number {
  const u = unsignedOf(v, n)
  // Scale down before converting, so 64-bit values keep their leading digits.
  const shift = BigInt(Math.max(0, n - 40))
  return Number(u >> shift) / 2 ** (n - Number(shift))
}

function at(t: number, r: number): { x: number; y: number } {
  const th = t * 2 * Math.PI
  return { x: CX + r * Math.sin(th), y: CY - r * Math.cos(th) }
}

/** The path a result travels: from the starting balance, `delta` steps round the dial (clockwise for a positive one). */
function arcPath(from: bigint, delta: bigint, n: number, r: number): string | null {
  if (delta === 0n) return null
  const t0 = turnOf(from, n)
  const span = turnOf(delta < 0n ? -delta : delta, n)
  if (span === 0) return null
  const t1 = delta > 0n ? t0 + span : t0 - span
  const p0 = at(t0, r)
  const p1 = at(t1, r)
  const large = span > 0.5 ? 1 : 0
  const sweep = delta > 0n ? 1 : 0
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`
}

function End({ x, y, below, k }: { readonly x: number; readonly y: number; readonly below: boolean; readonly k: string }) {
  return below ? (
    <rect key={k} className="line-violation te-below toy-land" x={x - 6.5} y={y - 6.5} width={13} height={13} />
  ) : (
    <circle key={k} className="te-end toy-land" cx={x} cy={y} r={6} />
  )
}

function Dial({ n, p, r, uid }: { readonly n: 8 | 64; readonly p: Pick; readonly r: Run; readonly uid: string }) {
  const labels =
    n === 8
      ? { top: '0', right: '64', left: `${MINUS}64`, seamL: `${MINUS}128`, seamR: '127' }
      : { top: '0', right: '2⁶²', left: `${MINUS}2⁶²`, seamL: `${MINUS}2⁶³`, seamR: '2⁶³−1' }
  const sPath = arcPath(p.a, -p.x, n, R_IN)
  const rPath = arcPath(p.b, p.x, n, R_OUT)
  const sA = at(turnOf(p.a, n), R_IN)
  const sZ = at(turnOf(r.sender.after, n), R_IN)
  const rA = at(turnOf(p.b, n), R_OUT)
  const rZ = at(turnOf(r.recipient.after, n), R_OUT)
  const outer = R_OUT + 14
  const label =
    `Dial of the ${n}-bit patterns: 0 at the top, positive readings clockwise down the right half, negative readings ` +
    `up the left half, and the seam at the bottom where ${labels.seamR} is followed by ${labels.seamL}. ` +
    `Inner ring, the sender: from ${num(p.a)} to ${num(r.sender.after)}. Outer ring, the recipient: from ${num(p.b)} to ${num(r.recipient.after)}.`
  return (
    <svg className="toy-svg te-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} role="img" aria-label={label}>
      <defs>
        <pattern id={`${uid}-dots`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
          <circle cx="2" cy="2" r="0.8" className="te-dot" />
        </pattern>
      </defs>
      {/* The left half reads negative: halftone, not colour. */}
      <path className="te-neg" d={`M ${CX} ${CY - outer} A ${outer} ${outer} 0 0 0 ${CX} ${CY + outer} Z`} fill={`url(#${uid}-dots)`} />
      <circle className="te-ring" cx={CX} cy={CY} r={R_OUT} />
      <circle className="te-ring" cx={CX} cy={CY} r={R_IN} />
      <line className="te-axis" x1={CX} x2={CX} y1={CY - outer} y2={CY - R_IN + 12} />
      {/* The seam: where the largest value is followed by the smallest. */}
      <line className="te-seam" x1={CX} x2={CX} y1={CY + R_IN - 16} y2={CY + outer} />
      <g className="te-labels">
        <text x={CX} y={CY - outer - 6} textAnchor="middle">
          {labels.top}
        </text>
        <text x={CX + outer + 4} y={CY + 4} textAnchor="start">
          {labels.right}
        </text>
        <text x={CX - outer - 4} y={CY + 4} textAnchor="end">
          {labels.left}
        </text>
        <text x={CX + 6} y={CY + outer + 16} textAnchor="start">
          {labels.seamR}
        </text>
        <text x={CX - 6} y={CY + outer + 16} textAnchor="end">
          {labels.seamL}
        </text>
        <text className="te-seam-name" x={CX} y={CY + outer + 34} textAnchor="middle">
          the seam
        </text>
        <text className="te-half" x={CX - 52} y={CY + 4} textAnchor="middle">
          reads
        </text>
        <text className="te-half" x={CX - 52} y={CY + 20} textAnchor="middle">
          negative
        </text>
        <text className="te-half" x={CX + 52} y={CY + 4} textAnchor="middle">
          reads
        </text>
        <text className="te-half" x={CX + 52} y={CY + 20} textAnchor="middle">
          zero or more
        </text>
      </g>
      {sPath !== null ? <path className="te-arc te-arc-in" d={sPath} /> : null}
      {rPath !== null ? <path className="te-arc" d={rPath} /> : null}
      <End k={`s${r.sender.after}`} x={sZ.x} y={sZ.y} below={r.sender.after < 0n} />
      <End k={`r${r.recipient.after}`} x={rZ.x} y={rZ.y} below={r.recipient.after < 0n} />
      <circle className="te-start" cx={sA.x} cy={sA.y} r={9} />
      <circle className="te-start" cx={rA.x} cy={rA.y} r={9} />
    </svg>
  )
}

/** Over `Int` there is no dial: two number lines, sender above recipient, with the negatives shaded. */
function Lines({ p, r, uid }: { readonly p: Pick; readonly r: Run; readonly uid: string }) {
  const vals = [0n, p.a, p.b, r.sender.after, r.recipient.after]
  let lo = vals.reduce((m, v) => (v < m ? v : m))
  let hi = vals.reduce((m, v) => (v > m ? v : m))
  if (hi === lo) hi = lo + 1n
  const pad = (hi - lo) / 8n + 1n
  lo -= pad
  hi += pad
  const L = 24
  const RR = VB_W - 24
  const span = Number(hi - lo)
  const xOf = (v: bigint): number => L + (Number(v - lo) / span) * (RR - L)
  const x0 = xOf(0n)
  const rows: Array<{ name: string; y: number; from: bigint; to: bigint }> = [
    { name: 'sender, A − X', y: 64, from: p.a, to: r.sender.after },
    { name: 'recipient, B + X', y: 138, from: p.b, to: r.recipient.after },
  ]
  const label =
    `Two number lines over Int, with no seam: the sender from ${num(p.a)} to ${num(r.sender.after)}, ` +
    `and the recipient from ${num(p.b)} to ${num(r.recipient.after)}.`
  return (
    <svg className="toy-svg te-svg" viewBox={`0 0 ${VB_W} 190`} role="img" aria-label={label}>
      <defs>
        <pattern id={`${uid}-dots`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
          <circle cx="2" cy="2" r="0.8" className="te-dot" />
        </pattern>
      </defs>
      {x0 > L ? <rect className="te-neg" x={L} y={24} width={x0 - L} height={140} fill={`url(#${uid}-dots)`} /> : null}
      <line className="te-zero" x1={x0} x2={x0} y1={20} y2={168} />
      <g className="te-labels">
        <text x={x0} y={184} textAnchor="middle">
          0
        </text>
      </g>
      {rows.map((row) => {
        const a = xOf(row.from)
        const z = xOf(row.to)
        return (
          <g key={row.name}>
            <text className="te-row-name" x={RR} y={row.y - 16} textAnchor="end">
              {row.name}
            </text>
            <line className="te-ring" x1={L} x2={RR} y1={row.y} y2={row.y} />
            <line className="te-arc" x1={a} x2={z} y1={row.y} y2={row.y} />
            <End k={`${row.name}${row.to}`} x={z} y={row.y} below={row.to < 0n} />
            <circle className="te-start" cx={a} cy={row.y} r={9} />
            <g className="te-labels">
              <text x={z} y={row.y + 22} textAnchor="middle">
                {num(row.to)}
              </text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}

// ------------------------------------------------------------------ the game

/** Where the game starts: a transfer that goes through with nobody below zero. */
const START = { a: '100', b: '90', x: '20' }

export default function WrapGame() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [enc, setEnc] = useState<Encoding>('bv8')
  const [positive, setPositive] = useState(true)
  const [aText, setA] = useState(START.a)
  const [bText, setB] = useState(START.b)
  const [xText, setX] = useState(START.x)
  const [shown, setShown] = useState<ReactNode>(null)
  const searches = useRef(new Map<string, Search>())

  const n = widthOf(enc)
  const range = rangeOf(enc)
  const parsed = [parseWhole(aText), parseWhole(bText), parseWhole(xText)] as const
  const bad = parsed.map((v) => v === null || !fits(enc, v))
  const valid = !bad.some(Boolean)
  const pick: Pick | null = valid ? { a: parsed[0] as bigint, b: parsed[1] as bigint, x: parsed[2] as bigint } : null
  const result = useMemo(() => (pick === null ? null : run(enc, positive, pick)), [enc, positive, pick?.a, pick?.b, pick?.x])

  // The slider covers the 8-bit range (for Int, the same stretch); at 64 bits it would only crawl near zero.
  const xNow = parsed[2]
  const slideRange = enc === 'bv64' ? null : { min: positive ? 1 : -128, max: 127 }
  const rangeText = range === null ? 'any whole number' : `whole numbers from ${num(range.min)} to ${num(range.max)}`
  const status: ReactNode =
    shown ??
    (pick === null || result === null ? (
      <>
        <strong>Not a pick yet.</strong> In {ENC_NAME[enc]}, A, B and X are {rangeText}.
      </>
    ) : (
      sayRun(enc, positive, pick, result)
    ))

  const edit = (set: (s: string) => void) => (s: string) => {
    setShown(null)
    set(s)
  }

  /** Arrow keys step a field by one (by ten with Shift), staying inside the encoding's range. */
  const step = (text: string, set: (s: string) => void) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    const v = parseWhole(text)
    if (v === null) return
    e.preventDefault()
    let next = v + (e.key === 'ArrowUp' ? 1n : -1n) * (e.shiftKey ? 10n : 1n)
    if (range !== null) next = next > range.max ? range.max : next < range.min ? range.min : next
    edit(set)(next.toString())
  }

  const load = (p: Pick): void => {
    setA(p.a.toString())
    setB(p.b.toString())
    setX(p.x.toString())
  }

  const showMe = (): void => {
    if (enc === 'bv64') {
      const b = built64(positive)
      const p = !positive && b.sender !== null ? b.sender : b.recipient
      load(p)
      const r = run(enc, positive, p)
      setShown(
        <>
          <strong>Here is one the page built:</strong> A = {num(p.a)}, B = {num(p.b)}, X = {num(p.x)}.{' '}
          {p === b.sender
            ? 'With X negative, A − X is an addition, and it passes the largest 64-bit value.'
            : 'The guard passes, and B + X passes the largest 64-bit value.'}{' '}
          The result reads as {num(p === b.sender ? r.sender.after : r.recipient.after)}. A, B and X have 2¹⁹² bit patterns
          between them, far too many to walk, so this pick is built, not searched; Z3&apos;s recorded witness above is a different one,
          and any pair that wraps will do.
        </>,
      )
      return
    }
    const key = `${enc}:${positive}`
    let s = searches.current.get(key)
    if (s === undefined) {
      s = search(enc, positive)
      searches.current.set(key, s)
    }
    const xRange = positive ? '1 to 127' : `${MINUS}128 to 127`
    const count = s.picks.toLocaleString('en')
    if (enc === 'int') {
      const ex = s.example.recipient
      if (ex === null) {
        setShown(
          <>
            <strong>No witness in this box.</strong> Over <code>Int</code> the page ran every pick with A and B from 0 to
            127 and X from {xRange}, {count} in all, and none ends below zero: with <code>X &lt;= A</code> the sender keeps{' '}
            <code>A &#8722; X &gt;= 0</code>, and with <code>X &gt; 0</code> the recipient only gains. The box is a sample,
            and the reason, not the search, is what covers every integer. Now switch to 8-bit.
          </>,
        )
        return
      }
      load(ex)
      setShown(
        <>
          <strong>Here is one:</strong> A = {num(ex.a)}, B = {num(ex.b)}, X = {num(ex.x)}. Over <code>Int</code> nothing wraps,
          but without <code>X &gt; 0</code> a negative amount passes the guard and takes from the recipient. In the box of{' '}
          {count} picks the page ran, {s.recipient.toLocaleString('en')} do this and none overdraws the sender.
        </>,
      )
      return
    }
    const ex = positive ? s.example.recipient : (s.example.sender ?? s.example.recipient)
    if (ex !== null) load(ex)
    setShown(
      <>
        <strong>Here is one:</strong>{' '}
        {ex === null ? 'none.' : <>A = {num(ex.a)}, B = {num(ex.b)}, X = {num(ex.x)}.</>} The page ran all {count} picks the
        premises allow at 8 bits (A and B from 0 to 127, X from {xRange}); {s.through.toLocaleString('en')} get past the guard.
        Of those, {s.recipient.toLocaleString('en')} leave only the recipient below zero,{' '}
        {s.sender === 0 && s.both === 0
          ? 'and none overdraws the sender: with X > 0 the guarded debit never wraps.'
          : `${s.sender.toLocaleString('en')} overdraw only the sender, and ${s.both.toLocaleString('en')} do both: a negative amount turns the debit into an addition that can wrap, and takes from the recipient directly.`}{' '}
        This covers the 8-bit model only.
      </>,
    )
  }

  const switchEnc = (e: Encoding): void => {
    setShown(null)
    setEnc(e)
  }

  const fields: Array<{ key: 'a' | 'b' | 'x'; name: string; text: string; set: (s: string) => void; i: number }> = [
    { key: 'a', name: 'Sender, A', text: aText, set: setA, i: 0 },
    { key: 'b', name: 'Recipient, B', text: bText, set: setB, i: 1 },
    { key: 'x', name: 'Amount, X', text: xText, set: setX, i: 2 },
  ]

  const rows: Array<{ name: string; op: string; l: Line }> =
    result === null
      ? []
      : [
          { name: 'Sender', op: 'A − X', l: result.sender },
          { name: 'Recipient', op: 'B + X', l: result.recipient },
        ]

  return (
    <ToyFrame
      title="Past the largest value"
      kind="Game"
      caption={
        <>
          The page runs the transfer itself, in exact integers or in {POW[8]} and {POW[64]} wrap-around arithmetic read as
          signed, and draws where each result lands. Its 8-bit search covers every pick the premises allow at that width, and
          nothing wider; over <code>Int</code> it searches only a small box. No solver runs here.
        </>
      }
    >
      <p className="toy-goal">
        Goal: keep the guard <code>X &lt;= A</code> and the premise <code>X &gt; 0</code>, and leave the recipient below zero.
        Then try the same numbers over <code>Int</code>.
      </p>

      <div className="te-settings">
        <fieldset className="toy-choice">
          <legend>The encoding</legend>
          <label>
            <input type="radio" name={`${uid}-enc`} checked={enc === 'int'} onChange={() => switchEnc('int')} />
            <span>
              <code>Int</code>: mathematical integers, no wrap
            </span>
          </label>
          <label>
            <input type="radio" name={`${uid}-enc`} checked={enc === 'bv8'} onChange={() => switchEnc('bv8')} />
            <span>Signed 8-bit: {MINUS}128 to 127</span>
          </label>
          <label>
            <input type="radio" name={`${uid}-enc`} checked={enc === 'bv64'} onChange={() => switchEnc('bv64')} />
            <span>
              Signed 64-bit: <code>BitVec(64)</code>, signed operators
            </span>
          </label>
        </fieldset>

        <fieldset className="toy-choice">
          <legend>The premises</legend>
          <label>
            <input type="checkbox" checked disabled />
            <span>
              <code>A &gt;= 0</code> and <code>B &gt;= 0</code>
            </span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={positive}
              onChange={(e) => {
                setShown(null)
                setPositive(e.target.checked)
              }}
            />
            <span>
              <code>X &gt; 0</code>, a positive amount
            </span>
          </label>
        </fieldset>
      </div>

      <form
        className="toy-controls te-controls" data-wide={enc === 'bv64'}
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        {fields.map((f) => (
          <label key={f.key} className="toy-field te-field">
            <span className="toy-field-name">{f.name}</span>
            <input
              className="toy-number te-number"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={f.text}
              aria-invalid={bad[f.i]}
              aria-describedby={`${uid}-keys`}
              onChange={(e) => edit(f.set)(e.target.value)}
              onKeyDown={step(f.text, f.set)}
            />
          </label>
        ))}
        <div className="toy-actions">
          <button type="button" className="toy-button" data-primary="true" onClick={showMe}>
            Show me
          </button>
        </div>
      </form>
      {slideRange !== null ? (
        <label className="toy-field te-slide">
          <span className="toy-field-name">
            Slide the amount, X = {xNow === null ? '?' : num(xNow)}
          </span>
          <input
            className="toy-range"
            type="range"
            min={slideRange.min}
            max={slideRange.max}
            step={1}
            value={xNow === null ? 0 : Math.min(slideRange.max, Math.max(slideRange.min, Number(xNow)))}
            onChange={(e) => edit(setX)(e.target.value)}
          />
        </label>
      ) : null}
      <p id={`${uid}-keys`} className="te-hint">
        Type whole numbers, or use the up and down arrow keys to step by one (by ten with Shift).
      </p>

      <p className="toy-status" aria-live="polite">
        {status}
      </p>

      {pick !== null && result !== null ? (
        <div className="te-figure">
          {n === null ? <Lines p={pick} r={result} uid={uid} /> : <Dial n={n} p={pick} r={result} uid={uid} />}
          <ul className="toy-legend" aria-label="Key">
            <li>
              <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
                <circle className="te-start" r={6} />
              </svg>
              balance before
            </li>
            <li>
              <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
                <circle className="te-end" r={5.5} />
              </svg>
              after, zero or more
            </li>
            <li>
              <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
                <rect className="line-violation te-below" x={-6} y={-6} width={12} height={12} />
              </svg>
              after, below zero
            </li>
            {n !== null ? <li>inner ring the sender, outer ring the recipient</li> : null}
          </ul>

          <div className="te-table-frame">
            <table className="te-table">
              <caption>What each balance holds, {n === null ? 'over Int' : `in ${n} bits`}</caption>
              <thead>
                <tr>
                  <th scope="col">Balance</th>
                  <th scope="col">Before</th>
                  <th scope="col">Exact result</th>
                  {n !== null ? (
                    <>
                      <th scope="col">Bits stored</th>
                      <th scope="col">Unsigned reading</th>
                    </>
                  ) : null}
                  <th scope="col">{n !== null ? 'Signed reading' : 'Stored'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.name}>
                    <th scope="row">
                      {row.name}, <code>{row.op}</code>
                    </th>
                    <td>{num(row.l.before)}</td>
                    <td>{num(row.l.exact)}</td>
                    {n !== null ? (
                      <>
                        <td>
                          <code>{bitsOf(row.l.exact, n)}</code>
                        </td>
                        <td>{num(unsignedOf(row.l.exact, n))}</td>
                      </>
                    ) : null}
                    <td>
                      <strong>{num(row.l.after)}</strong>
                      {row.l.after < 0n ? ', below zero' : ''}
                      {row.l.wrapped ? ', wrapped' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </ToyFrame>
  )
}
