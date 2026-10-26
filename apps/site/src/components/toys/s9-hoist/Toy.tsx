// A square runner for S9.L7: pick a start, pick the code the compiler (or an agent) produced, and step the IR one
// instruction at a time while the source's outcome waits at the top right of the square. When the run ends the square
// either closes (the client observes the same thing on both paths) or it breaks, drawn on the violation line. "Sweep the
// grid" runs every start on a small grid and shows the class of starts that separate the two, and "Show me" moves to
// the smallest one. Everything is computed in the page, over balances 0 to 9 and amounts 1 to 9 only.

import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ToyFrame } from "../ToyFrame.tsx";
import {
  GRID,
  MAX_AMT,
  MAX_BAL,
  accounts,
  program,
  render,
  runSource,
  same,
  smallestSplit,
  startStore,
  sweep,
  trace,
} from "./model.ts";
import type {
  Aborts,
  Cell,
  Instr,
  Machine,
  Outcome,
  Start,
  Store,
  Variant,
} from "./model.ts";
import "./hoist.css";

const VARIANT_TEXT: Record<
  Variant,
  { readonly name: string; readonly note: ReactNode }
> = {
  compiled: {
    name: "As compiled",
    note: <>S9.L3&apos;s scheme: guard, debit, credit</>,
  },
  "read-first": {
    name: "Debit between read and assert",
    note: <>the guard read its operand before the write</>,
  },
  hoisted: {
    name: "Debit above the guard",
    note: <>the agent&apos;s edit: the guard reads the debited balance</>,
  },
  rewritten: {
    name: "Debit above, guard rewritten",
    note: (
      <>
        the guard becomes <code>balance ≥ 0</code>, by substitution
      </>
    ),
  },
  credit: {
    name: "Credit above the guard",
    note: <>the other agent&apos;s edit, from the exit question</>,
  },
};

const VARIANTS: readonly Variant[] = [
  "compiled",
  "read-first",
  "hoisted",
  "rewritten",
  "credit",
];

const num = (n: number): string => (n < 0 ? `−${-n}` : String(n));

const storeText = (st: Store, self: boolean): string =>
  self ? `a1 = ${num(st.a1)}` : `(${num(st.a1)}, ${num(st.a2)})`;

const outcomeText = (o: Outcome, self: boolean): string =>
  o.kind === "committed"
    ? `committed ${storeText(o.store, self)}`
    : `aborted with ${o.err}, the client seeing ${storeText(o.store, self)}`;

function parse(text: string, lo: number, hi: number): number | null {
  if (!/^\s*\d{1,2}\s*$/.test(text)) return null;
  const n = Number(text);
  return n >= lo && n <= hi ? n : null;
}

/** What one instruction did, in words. */
function said(ins: Instr, before: Machine, after: Machine): string {
  const v = (r: "r0" | "r1" | "r2"): string => num(after.regs[r] ?? 0);
  switch (ins.op) {
    case "ldi":
      return `loads ${ins.v} into ${ins.r}.`;
    case "read":
      return `reads ${ins.a}'s balance, ${v(ins.r)}, into ${ins.r}.`;
    case "add":
    case "sub":
      return `puts ${v(ins.r)} in ${ins.r}.`;
    case "write":
      return `writes ${num(after.store[ins.a])} to ${ins.a}.`;
    case "assertGe": {
      const x = num(before.regs[ins.x] ?? 0);
      const y = num(before.regs[ins.y] ?? 0);
      return after.done?.kind === "aborted"
        ? `tests ${x} ≥ ${y}, which fails, so the run aborts with ${ins.err}.`
        : `tests ${x} ≥ ${y}, which holds.`;
    }
  }
}

/** Why a broken square broke, for the variants that can break. */
function why(
  v: Variant,
  aborts: Aborts,
  s: Start,
  src: Outcome,
  tgt: Outcome,
): string {
  if (tgt.kind === "aborted" && src.kind === "aborted" && aborts === "keep")
    return "Both abort, but with aborts keeping earlier writes the write made before the failed guard stays, so the client sees a balance the source never wrote.";
  if (v === "hoisted")
    return `The guard tested the debited balance, ${num(s.bal1 - s.amt)}, against ${s.amt}: the source needs the balance to cover the amount once, this code needs it to cover it twice.`;
  if (v === "credit")
    return `The credit landed on ${s.self ? "the sender itself" : "the other account"} before the guard read the sender, so the guard tested ${num(s.bal1 + (s.self ? s.amt : 0))}, not ${s.bal1}.`;
  return "The write changed what the client sees after the abort.";
}

interface Tried {
  readonly key: string;
  readonly bal1: number;
  readonly amt: number;
  readonly agree: boolean;
  readonly commit: boolean;
}

const CELL = 24;
const LEFT = 40;
const TOP = 10;
const GW = CELL * MAX_AMT;
const GH = CELL * (MAX_BAL + 1);
const MW = LEFT + GW + 10;
const MH = TOP + GH + 42;
const mx = (amt: number): number => LEFT + (amt - 1) * CELL + CELL / 2;
const my = (bal: number): number => TOP + (MAX_BAL - bal) * CELL + CELL / 2;

function Mark({
  x,
  y,
  agree,
  commit,
  fresh,
}: {
  readonly x: number;
  readonly y: number;
  readonly agree: boolean;
  readonly commit: boolean;
  readonly fresh: boolean;
}) {
  const land = fresh ? " toy-land" : "";
  if (!agree)
    return (
      <rect
        className={`line-violation s9h-split${land}`}
        x={x - 6}
        y={y - 6}
        width={12}
        height={12}
      />
    );
  if (commit)
    return <circle className={`s9h-commit${land}`} cx={x} cy={y} r={5} />;
  return <circle className={`s9h-abort${land}`} cx={x} cy={y} r={4} />;
}

export default function SquareRunner() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const [variant, setVariant] = useState<Variant>("hoisted");
  const [aborts, setAborts] = useState<Aborts>("rollback");
  const [b1Text, setB1] = useState("1");
  const [b2Text, setB2] = useState("0");
  const [amtText, setAmt] = useState("1");
  const [self, setSelf] = useState(false);
  const [at, setAt] = useState<{ readonly key: string; readonly k: number }>({
    key: "",
    k: 0,
  });
  const [tried, setTried] = useState<readonly Tried[]>([]);
  const [swept, setSwept] = useState<ReadonlySet<string>>(new Set());
  const [status, setStatus] = useState<ReactNode>(
    "Step the code from the start above, or run it to the end, and watch whether the square closes.",
  );

  const bal1 = parse(b1Text, 0, MAX_BAL);
  const bal2 = parse(b2Text, 0, MAX_BAL);
  const amt = parse(amtText, 1, MAX_AMT);
  const valid = bal1 !== null && amt !== null && (self || bal2 !== null);
  const start: Start = {
    bal1: bal1 ?? 0,
    bal2: self ? 0 : (bal2 ?? 0),
    amt: amt ?? 1,
    self,
  };
  const { src, dst } = accounts(start);
  const prog = useMemo(
    () => program(variant, start.amt, src, dst),
    [variant, start.amt, src, dst],
  );
  const runKey = `${variant}|${aborts}|${start.bal1}|${start.bal2}|${start.amt}|${self}`;
  const gridKey = `${variant}|${aborts}|${start.bal2}|${self}`;
  const states = useMemo(() => trace(variant, start, aborts), [runKey]);
  const k = at.key === runKey ? at.k : 0;
  const m = states[Math.min(k, states.length - 1)];
  const source = runSource(start);
  const ended = m.done !== null;
  const agree = ended ? same(source, m.done, self) : null;
  const open = swept.has(gridKey);
  const cells = useMemo(
    () => (open ? sweep(variant, aborts, start.bal2, self) : []),
    [open, gridKey],
  );
  const splits = cells.filter((c) => !c.agree).length;
  const mine = tried.filter((t) => t.key === gridKey);

  const record = (s: Start, end: Outcome): void => {
    const ok = same(runSource(s), end, s.self);
    const g = `${variant}|${aborts}|${s.bal2}|${s.self}`;
    setTried((ts) => [
      ...ts.filter(
        (t) => !(t.key === g && t.bal1 === s.bal1 && t.amt === s.amt),
      ),
      {
        key: g,
        bal1: s.bal1,
        amt: s.amt,
        agree: ok,
        commit: end.kind === "committed",
      },
    ]);
  };

  /** A changed control starts a new run, so the status line says so rather than keep the last run's verdict. */
  const fresh = (): void =>
    setStatus(
      "A new run: step the code from this start, or run it to the end, and watch whether the square closes.",
    );

  const verdict = (s: Start, end: Outcome): ReactNode => {
    const srcO = runSource(s);
    if (same(srcO, end, s.self))
      return (
        <>
          <strong>The square closes.</strong> The source ends{" "}
          {outcomeText(srcO, s.self)}, and so does the code. A client cannot
          tell them apart from this start.
        </>
      );
    return (
      <>
        <strong>The square breaks.</strong> The source ends{" "}
        {outcomeText(srcO, s.self)}; the code ends {outcomeText(end, s.self)}.{" "}
        {why(variant, aborts, s, srcO, end)}
      </>
    );
  };

  const go = (to: number): void => {
    if (!valid) {
      setStatus(
        `Balances here are whole numbers from 0 to ${MAX_BAL}, and amounts from 1 to ${MAX_AMT}.`,
      );
      return;
    }
    const n = Math.min(to, states.length - 1);
    setAt({ key: runKey, k: n });
    const now = states[n];
    if (now.done !== null) {
      record(start, now.done);
      if (
        n - k === 1 &&
        prog[n - 1] !== undefined &&
        prog[n - 1].ins.op === "assertGe" &&
        now.done.kind === "aborted"
      )
        setStatus(
          <>
            Line {n}, <code>{render(prog[n - 1].ins)}</code>,{" "}
            {said(prog[n - 1].ins, states[n - 1], now)}{" "}
            {verdict(start, now.done)}
          </>,
        );
      else setStatus(verdict(start, now.done));
      return;
    }
    const line = prog[n - 1];
    setStatus(
      line === undefined ? (
        "Back at the start: the registers are empty and the store is the start store."
      ) : (
        <>
          Line {n} of {prog.length}, <code>{render(line.ins)}</code>,{" "}
          {said(line.ins, states[n - 1], now)}
        </>
      ),
    );
  };

  const sweepIt = (): void => {
    if (!valid) return go(0);
    setSwept((s) => new Set(s).add(gridKey));
    const all = sweep(variant, aborts, start.bal2, self);
    const n = all.filter((c) => !c.agree).length;
    const inClass = (c: Cell): boolean => c.amt <= c.bal1 && c.bal1 < 2 * c.amt;
    const isClass = n > 0 && all.every((c) => c.agree !== inClass(c));
    setStatus(
      n === 0 ? (
        <>
          <strong>No start in this grid separates them.</strong> This page ran
          all {GRID} starts with balances 0 to {MAX_BAL} and amounts 1 to{" "}
          {MAX_AMT}, {self ? "as self-transfers" : `with a2 at ${start.bal2}`}.
          That covers this grid only; a proof, or a validator run on each
          output, is what covers the rest.
        </>
      ) : (
        <>
          <strong>
            {n} of the grid&apos;s {GRID} starts separate them.
          </strong>{" "}
          Each square on the map is one: the source and the code end differently
          from it.
          {isClass
            ? " They are exactly the grid’s starts with amt ≤ balance < 2·amt, the class from §2."
            : aborts === "keep"
              ? " Among them are starts where both abort and the kept write shows."
              : ""}
        </>
      ),
    );
  };

  const moveTo = (
    c: { readonly bal1: number; readonly amt: number },
    toSelf: boolean = self,
    lead: ReactNode = null,
  ): void => {
    setB1(String(c.bal1));
    setAmt(String(c.amt));
    setSelf(toSelf);
    const s: Start = {
      ...start,
      bal1: c.bal1,
      amt: c.amt,
      self: toSelf,
      bal2: toSelf ? 0 : start.bal2,
    };
    const t = trace(variant, s, aborts);
    const end = t[t.length - 1].done;
    if (end === null) return;
    setAt({
      key: `${variant}|${aborts}|${s.bal1}|${s.bal2}|${s.amt}|${toSelf}`,
      k: t.length - 1,
    });
    record(s, end);
    setStatus(
      <>
        {lead}
        {verdict(s, end)}
      </>,
    );
  };

  const showMe = (): void => {
    if (!valid) return go(0);
    const w = smallestSplit(variant, aborts, start.bal2, self);
    if (w !== null) {
      setSwept((s) => new Set(s).add(gridKey));
      return moveTo(
        w,
        self,
        <>
          The smallest separating start in this grid: amount {w.amt}, a1 at{" "}
          {w.bal1}.{" "}
        </>,
      );
    }
    // None with this recipient: the other recipient may separate them (the exit question's self-transfer does).
    const other = !self;
    const b2 = other ? 0 : start.bal2;
    const w2 = smallestSplit(variant, aborts, b2, other);
    if (w2 === null) return sweepIt();
    setSwept((s) => new Set(s).add(`${variant}|${aborts}|${b2}|${other}`));
    moveTo(
      w2,
      other,
      <>
        No start in this grid separates them{" "}
        {self
          ? "as a self-transfer"
          : `with the money going to a2 at ${start.bal2}`}
        , so this moved to{" "}
        {other ? "a self-transfer" : `a transfer to a2 at ${b2}`}: amount{" "}
        {w2.amt}, a1 at {w2.bal1}.{" "}
      </>,
    );
  };

  const initial = startStore(start);
  const shownStore = m.done?.store ?? m.store;
  const sq = { l: 8, r: 352, t: 30, b: 150 };
  const right = ended
    ? agree
      ? "s9h-edge"
      : "line-violation"
    : "line-bounded";
  const squareLabel =
    `Square for ${self ? `transfer ${start.amt} a1 a1` : `transfer ${start.amt} a1 a2`} from ${storeText(initial, self)}. ` +
    `Top: the source ends ${outcomeText(source, self)}. Bottom: the code ${ended ? `ends ${outcomeText(m.done, self)}` : `is at line ${k} of ${prog.length}`}. ` +
    (ended
      ? agree
        ? "The square closes."
        : "The square breaks."
      : "The square is still open.");

  const mapLabel =
    `Map of sender balance (up, 0 to ${MAX_BAL}) against amount (across, 1 to ${MAX_AMT}). ` +
    (open
      ? `Every start is shown: ${splits === 0 ? "none separates the source from the code" : `${splits} separate the source from the code`}.`
      : `${mine.length} ${mine.length === 1 ? "start" : "starts"} run, ${mine.filter((t) => !t.agree).length} of them separating.`);

  const lastTried = tried.length > 0 ? tried[tried.length - 1] : undefined;

  return (
    <ToyFrame
      title="Close the square, or break it"
      caption={
        <>
          The page runs the source command and the IR of S9.L3 itself, one
          instruction at a time, over balances 0 to {MAX_BAL} and amounts 1 to{" "}
          {MAX_AMT}. No Lean, no solver and no database runs here, and a grid
          with no separating start says nothing about starts beyond it. The
          positivity check is unchanged by every edit and left out, as in the
          lesson&apos;s listing.
        </>
      }
    >
      <p className="toy-goal">
        Goal: find a start where the source and the edited code end differently,
        then find the edits that never do.
      </p>

      <div className="s9h-pick">
        <fieldset className="toy-choice">
          <legend>The code</legend>
          {VARIANTS.map((v) => (
            <label key={v}>
              <input
                type="radio"
                name={`${uid}-variant`}
                checked={variant === v}
                onChange={() => {
                  setVariant(v);
                  fresh();
                }}
              />
              <span>
                <span className="s9h-vname">{VARIANT_TEXT[v].name}</span>
                <span className="s9h-vnote">{VARIANT_TEXT[v].note}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="toy-choice">
          <legend>Aborts</legend>
          <label>
            <input
              type="radio"
              name={`${uid}-aborts`}
              checked={aborts === "rollback"}
              onChange={() => {
                setAborts("rollback");
                fresh();
              }}
            />
            <span>roll back every write (this IR)</span>
          </label>
          <label>
            <input
              type="radio"
              name={`${uid}-aborts`}
              checked={aborts === "keep"}
              onChange={() => {
                setAborts("keep");
                fresh();
              }}
            />
            <span>keep earlier writes</span>
          </label>
        </fieldset>
      </div>

      <div className="toy-controls">
        <label className="toy-field">
          <span className="toy-field-name">Amount</span>
          <input
            className="toy-number"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_AMT}
            step={1}
            value={amtText}
            aria-invalid={amt === null}
            onChange={(e) => {
              setAmt(e.target.value);
              fresh();
            }}
          />
        </label>
        <label className="toy-field">
          <span className="toy-field-name">a1, the sender</span>
          <input
            className="toy-number"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_BAL}
            step={1}
            value={b1Text}
            aria-invalid={bal1 === null}
            onChange={(e) => {
              setB1(e.target.value);
              fresh();
            }}
          />
        </label>
        <label className="toy-field">
          <span className="toy-field-name">To</span>
          <select
            className="toy-number s9h-select"
            value={self ? "a1" : "a2"}
            onChange={(e) => {
              setSelf(e.target.value === "a1");
              fresh();
            }}
          >
            <option value="a2">a2</option>
            <option value="a1">a1 itself</option>
          </select>
        </label>
        {self ? null : (
          <label className="toy-field">
            <span className="toy-field-name">a2</span>
            <input
              className="toy-number"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_BAL}
              step={1}
              value={b2Text}
              aria-invalid={bal2 === null}
              onChange={(e) => {
                setB2(e.target.value);
                fresh();
              }}
            />
          </label>
        )}
      </div>

      <svg
        className="toy-svg s9h-square"
        viewBox="0 0 360 184"
        role="img"
        aria-label={squareLabel}
      >
        <defs>
          <marker
            id={`${uid}-tip`}
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0 0 L8 4 L0 8 Z" className="s9h-tip" />
          </marker>
        </defs>
        <line
          className="s9h-edge"
          x1={sq.l + 96}
          y1={sq.t}
          x2={sq.r - 120}
          y2={sq.t}
          markerEnd={`url(#${uid}-tip)`}
        />
        <text
          className="s9h-edge-name"
          x={180}
          y={sq.t - 8}
          textAnchor="middle"
        >
          source
        </text>
        <line
          className="s9h-edge"
          x1={sq.l + 40}
          y1={sq.t + 16}
          x2={sq.l + 40}
          y2={sq.b - 16}
          markerEnd={`url(#${uid}-tip)`}
        />
        <text className="s9h-edge-name" x={sq.l + 48} y={(sq.t + sq.b) / 2 + 4}>
          compile
        </text>
        <line
          className={ended ? "s9h-edge" : "line-bounded"}
          x1={sq.l + 96}
          y1={sq.b}
          x2={sq.r - 120}
          y2={sq.b}
          markerEnd={ended ? `url(#${uid}-tip)` : undefined}
        />
        <text
          className="s9h-edge-name"
          x={180}
          y={sq.b - 8}
          textAnchor="middle"
        >
          {ended ? "run the IR" : `line ${k} of ${prog.length}`}
        </text>
        <line
          key={`${right}${runKey}`}
          className={`${right}${ended ? " toy-land" : ""}`}
          x1={sq.r - 40}
          y1={sq.t + 16}
          x2={sq.r - 40}
          y2={sq.b - 16}
        />
        <text
          className="s9h-verdict"
          x={sq.r - 48}
          y={(sq.t + sq.b) / 2 + 6}
          textAnchor="end"
        >
          {ended ? (agree ? "=" : "≠") : "?"}
        </text>

        <text className="s9h-corner" x={sq.l} y={sq.t + 4}>
          {storeText(initial, self)}
        </text>
        <text className="s9h-corner" x={sq.r} y={sq.t + 4} textAnchor="end">
          {source.kind === "committed"
            ? storeText(source.store, self)
            : source.err}
        </text>
        <text
          className="s9h-corner-sub"
          x={sq.r}
          y={sq.t - 12}
          textAnchor="end"
        >
          {source.kind === "committed"
            ? "committed"
            : `aborted, ${storeText(source.store, self)}`}
        </text>
        <text className="s9h-corner" x={sq.l} y={sq.b + 4}>
          {prog.length} lines
        </text>
        <text className="s9h-corner" x={sq.r} y={sq.b + 4} textAnchor="end">
          {m.done === null
            ? "…"
            : m.done.kind === "committed"
              ? storeText(m.done.store, self)
              : m.done.err}
        </text>
        {m.done !== null ? (
          <text
            className="s9h-corner-sub"
            x={sq.r}
            y={sq.b + 22}
            textAnchor="end"
          >
            {m.done.kind === "committed"
              ? "committed"
              : `aborted, sees ${storeText(m.done.store, self)}`}
          </text>
        ) : null}
        <text className="s9h-corner-sub" x={sq.l} y={sq.b + 22}>
          {VARIANT_TEXT[variant].name.toLowerCase()}
        </text>
      </svg>

      <div className="s9h-run">
        <ol
          className="s9h-listing"
          aria-label={`The code, ${VARIANT_TEXT[variant].name.toLowerCase()}, for transfer ${start.amt} ${src} ${dst}`}
        >
          {prog.map((line, i) => {
            const here = !ended && i === k;
            const doneHere = ended && i === k - 1;
            return (
              <li
                key={i}
                className="s9h-line"
                data-here={here || doneHere ? "true" : undefined}
                data-moved={line.moved ? "true" : undefined}
                data-past={i < k ? "true" : undefined}
              >
                <span className="s9h-pc" aria-hidden="true">
                  {here ? "▸" : doneHere ? "■" : ""}
                </span>
                <code>{render(line.ins)}</code>
                <span className="s9h-part">
                  {line.part}
                  {line.moved ? ", moved" : ""}
                </span>
                {here ? <span className="visually-hidden"> (next)</span> : null}
              </li>
            );
          })}
        </ol>
        <table className="s9h-state">
          <caption>Machine state</caption>
          <tbody>
            {(["r0", "r1", "r2"] as const).map((r) => (
              <tr key={r}>
                <th scope="row">{r}</th>
                <td>{m.regs[r] === null ? "—" : num(m.regs[r] ?? 0)}</td>
              </tr>
            ))}
            <tr className="s9h-store-row">
              <th scope="row">a1</th>
              <td>{num(shownStore.a1)}</td>
            </tr>
            {self ? null : (
              <tr>
                <th scope="row">a2</th>
                <td>{num(shownStore.a2)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="toy-actions">
        <button
          type="button"
          className="toy-button"
          data-primary="true"
          onClick={() => go(k + 1)}
          disabled={ended}
        >
          Step
        </button>
        <button
          type="button"
          className="toy-button"
          onClick={() => go(states.length - 1)}
          disabled={ended}
        >
          Run to the end
        </button>
        <button
          type="button"
          className="toy-button"
          onClick={() => go(0)}
          disabled={k === 0}
        >
          Reset
        </button>
        <button type="button" className="toy-button" onClick={sweepIt}>
          Sweep the grid
        </button>
        <button type="button" className="toy-button" onClick={showMe}>
          Show me
        </button>
      </div>

      <p className="toy-status" aria-live="polite">
        {status}
      </p>

      <div className="s9h-map">
        <svg
          className="toy-svg s9h-map-svg"
          viewBox={`0 0 ${MW} ${MH}`}
          role="img"
          aria-label={mapLabel}
        >
          <g className="s9h-axis">
            {Array.from({ length: MAX_AMT }, (_, i) => i + 1).map((a) => (
              <text
                key={`x${a}`}
                x={mx(a)}
                y={TOP + GH + 15}
                textAnchor="middle"
              >
                {a}
              </text>
            ))}
            {Array.from({ length: MAX_BAL + 1 }, (_, i) => i).map((b) => (
              <text key={`y${b}`} x={LEFT - 8} y={my(b) + 4} textAnchor="end">
                {b}
              </text>
            ))}
            <text
              className="s9h-axis-name"
              x={LEFT + GW / 2}
              y={TOP + GH + 35}
              textAnchor="middle"
            >
              amount
            </text>
            <text
              className="s9h-axis-name"
              x={11}
              y={TOP + GH / 2}
              textAnchor="middle"
              transform={`rotate(-90 11 ${TOP + GH / 2})`}
            >
              a1, the sender
            </text>
          </g>
          <rect className="s9h-frame" x={LEFT} y={TOP} width={GW} height={GH} />
          {Array.from({ length: MAX_BAL + 1 }, (_, b) =>
            Array.from({ length: MAX_AMT }, (_, i) => (
              <circle
                key={`u${b},${i}`}
                className="s9h-unknown"
                cx={mx(i + 1)}
                cy={my(b)}
                r={1.6}
              />
            )),
          )}
          {open
            ? cells.map((c: Cell) => (
                <Mark
                  key={`c${c.bal1},${c.amt}`}
                  x={mx(c.amt)}
                  y={my(c.bal1)}
                  agree={c.agree}
                  commit={c.source.kind === "committed"}
                  fresh={false}
                />
              ))
            : mine.map((t) => (
                <Mark
                  key={`t${t.bal1},${t.amt}`}
                  x={mx(t.amt)}
                  y={my(t.bal1)}
                  agree={t.agree}
                  commit={t.commit}
                  fresh={t === lastTried}
                />
              ))}
          {valid ? (
            <circle
              key={`h${start.bal1},${start.amt}`}
              className="s9h-here toy-land"
              cx={mx(start.amt)}
              cy={my(start.bal1)}
              r={10}
            />
          ) : null}
          <g className="s9h-hit" aria-hidden="true">
            {Array.from({ length: MAX_BAL + 1 }, (_, b) =>
              Array.from({ length: MAX_AMT }, (_, i) => (
                <rect
                  key={`h${b},${i}`}
                  x={mx(i + 1) - CELL / 2}
                  y={my(b) - CELL / 2}
                  width={CELL}
                  height={CELL}
                  onClick={() => valid && moveTo({ bal1: b, amt: i + 1 })}
                />
              )),
            )}
          </g>
        </svg>
        <ul className="toy-legend" aria-label="Key">
          <li>
            <svg
              className="toy-key"
              width="16"
              height="16"
              viewBox="-8 -8 16 16"
              aria-hidden="true"
            >
              <rect
                className="line-violation s9h-split"
                x={-6}
                y={-6}
                width={12}
                height={12}
              />
            </svg>
            separates: the two end differently
          </li>
          <li>
            <svg
              className="toy-key"
              width="14"
              height="14"
              viewBox="-7 -7 14 14"
              aria-hidden="true"
            >
              <circle className="s9h-commit" r={5} />
            </svg>
            both commit alike
          </li>
          <li>
            <svg
              className="toy-key"
              width="14"
              height="14"
              viewBox="-7 -7 14 14"
              aria-hidden="true"
            >
              <circle className="s9h-abort" r={4} />
            </svg>
            both abort alike
          </li>
          <li>
            <svg
              className="toy-key"
              width="22"
              height="22"
              viewBox="-11 -11 22 22"
              aria-hidden="true"
            >
              <circle className="s9h-here" r={9} />
            </svg>
            this start
          </li>
        </ul>
      </div>
    </ToyFrame>
  );
}
