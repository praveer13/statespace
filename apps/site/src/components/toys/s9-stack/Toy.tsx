// A stepper for S9.L1: compile an expression to the stack machine and run it one instruction at a time from a stack you
// choose. The expression tree lights the subexpression whose code is running, the stack grows and shrinks beside it,
// and a ruled table records the stack each subexpression's code started on. That table is the point: the second
// operand's code always starts on `aval e₁ s :: stk`, the stack a hypothesis must cover, which a hypothesis fixed at
// `stk` (the proof without `generalizing stk`) does not. Computed in the page; no Lean runs here.

import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ToyFrame } from "../ToyFrame.tsx";
import {
  aval,
  bal,
  comp,
  n,
  nodes,
  plus,
  run,
  same,
  show,
  showInstr,
  showStack,
} from "./model.ts";
import type { AExp, Node, Stack } from "./model.ts";
import "./stack.css";

const STORE = [5, 3] as const;

const EXPRS: ReadonlyArray<{ readonly id: string; readonly e: AExp }> = [
  { id: "one", e: plus(bal(0), n(2)) },
  { id: "left", e: plus(plus(bal(0), bal(1)), n(2)) },
  { id: "right", e: plus(n(1), plus(bal(0), bal(1))) },
];

const STACKS: ReadonlyArray<{ readonly id: string; readonly stk: Stack }> = [
  { id: "empty", stk: [] },
  { id: "one", stk: [7] },
  { id: "two", stk: [7, 4] },
];

/** A subexpression's name in the proof: e for the whole, e₁ and e₂ for its operands, e₁.₂ and so on below. */
const NAME = (path: string): string =>
  path === ""
    ? "e"
    : `e${path
        .split("")
        .map((c) => (c === "1" ? "₁" : "₂"))
        .join(".")}`;

const FRESH =
  "A new run from the start: step the compiled code and watch which stack each subexpression’s code starts on.";

const leaf = (e: AExp): string =>
  e.k === "n" ? `n ${e.v}` : e.k === "bal" ? `bal a${e.a}` : "plus";

interface Placed {
  readonly node: Node;
  readonly x: number;
  readonly y: number;
}

/** Tree positions: leaves spread in order, a plus centred over its operands. */
function layout(ns: readonly Node[], width: number): Placed[] {
  const leaves = ns
    .filter((x) => x.e.k !== "plus")
    .sort((a, b) => a.from - b.from);
  const gap = width / leaves.length;
  const pos = new Map<string, { x: number; y: number }>();
  leaves.forEach((l, i) => pos.set(l.path, { x: gap * (i + 0.5), y: 0 }));
  const depth = (p: string): number => p.length;
  const place = (p: string): { x: number; y: number } => {
    const got = pos.get(p);
    if (got !== undefined) return { x: got.x, y: depth(p) };
    const a = place(`${p}1`);
    const b = place(`${p}2`);
    const at = { x: (a.x + b.x) / 2, y: depth(p) };
    pos.set(p, at);
    return at;
  };
  return ns.map((node) => {
    const p = place(node.path);
    return { node, x: p.x, y: 26 + depth(node.path) * 62 };
  });
}

export default function StackStepper() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const [exprId, setExpr] = useState("left");
  const [stkId, setStk] = useState("one");
  const [at, setAt] = useState<{ readonly key: string; readonly k: number }>({
    key: "",
    k: 0,
  });
  const [status, setStatus] = useState<ReactNode>(
    "Step the compiled code and watch which stack each subexpression’s code starts on.",
  );

  const e = (EXPRS.find((x) => x.id === exprId) ?? EXPRS[1]).e;
  const stk = (STACKS.find((x) => x.id === stkId) ?? STACKS[1]).stk;
  const key = `${exprId}|${stkId}`;
  const code = useMemo(() => comp(e), [e]);
  const ns = useMemo(() => nodes(e), [e]);
  const stacks = useMemo(() => run(STORE, e, stk), [e, stk]);
  const k = at.key === key ? at.k : 0;
  const now = stacks[k];
  const ended = k === code.length;
  const W = 320;
  const placed = useMemo(() => layout(ns, W), [ns]);
  const H = 26 + Math.max(...ns.map((x) => x.path.length)) * 62 + 30;

  /** The innermost subexpression whose code holds instruction k. */
  const running = ended
    ? null
    : ns
        .filter((x) => x.from <= k && k < x.to)
        .sort((a, b) => b.path.length - a.path.length)[0];
  const isOn = (nd: Node): boolean => !ended && nd.from <= k && k < nd.to;
  const isDone = (nd: Node): boolean => k >= nd.to;

  const second = ns
    .filter((x) => x.e.k === "plus")
    .map((p) => ({ p, e2: ns.find((x) => x.path === `${p.path}2`) }));

  const say = (to: number): ReactNode => {
    if (to === 0)
      return `Back at the start: the stack is stk = ${showStack(stk)}.`;
    const ins = code[to - 1];
    const after = stacks[to];
    const finished = ns
      .filter((x) => x.to === to)
      .sort((a, b) => a.path.length - b.path.length);
    const parts: ReactNode[] = [
      <span key="i">
        <code>{showInstr(ins)}</code> leaves {showStack(after)}.
      </span>,
    ];
    const two = ns.find((x) => x.path.endsWith("2") && x.from === to - 1);
    if (two !== undefined) {
      const parent = ns.find((x) => x.path === two.path.slice(0, -1));
      if (parent !== undefined)
        parts.push(
          <span key="s">
            {" "}
            {NAME(two.path)}&apos;s code started on{" "}
            {showStack(stacks[two.from])}, which is {NAME(`${parent.path}1`)}
            &apos;s value on top of the stack {NAME(parent.path)} started on,{" "}
            {showStack(stacks[parent.from])}.
          </span>,
        );
    }
    const top = finished[0];
    if (top !== undefined && top.path === "" && to === code.length) {
      const want = [aval(e, STORE), ...stk];
      parts.push(
        same(after, want) ? (
          <span key="d">
            {" "}
            <strong>Done:</strong> exec s (comp e) stk = aval e s :: stk for
            this run. aval e s = {aval(e, STORE)} sits on top, and stk ={" "}
            {showStack(stk)} below it is untouched.
          </span>
        ) : (
          <span key="d">
            {" "}
            <strong>Done,</strong> but the stack is {showStack(after)}, not aval
            e s :: stk = {showStack(want)}.
          </span>
        ),
      );
    }
    return <>{parts}</>;
  };

  const go = (to: number): void => {
    const t = Math.max(0, Math.min(to, code.length));
    setAt({ key, k: t });
    setStatus(say(t));
  };

  const treeLabel =
    `Expression tree of ${show(e)}. ` +
    (ended
      ? "The run has ended."
      : running !== null && running !== undefined
        ? `Running the code of ${NAME(running.path)}, ${show(running.e)}.`
        : "");

  const BOX = 30;

  return (
    <ToyFrame
      title="Whose stack is it?"
      caption={
        <>
          The page compiles and runs the machine of the Lean listing above
          itself, with <code>bal a0</code> = {STORE[0]} and <code>bal a1</code>{" "}
          = {STORE[1]}, a store chosen for this figure. No Lean runs here, and
          three expressions on three stacks are examples, not the theorem;{" "}
          <code>exec_comp</code> is the statement about every expression and
          every stack.
        </>
      }
    >
      <p className="toy-goal">
        Goal: step the code and find the stack the second operand&apos;s code
        starts on. Is it <code>stk</code>?
      </p>

      <div className="s9k-pick">
        <fieldset className="toy-choice">
          <legend>The expression</legend>
          {EXPRS.map((x) => (
            <label key={x.id}>
              <input
                type="radio"
                name={`${uid}-e`}
                checked={exprId === x.id}
                onChange={() => {
                  setExpr(x.id);
                  setStatus(FRESH);
                }}
              />
              <code>{show(x.e)}</code>
            </label>
          ))}
        </fieldset>
        <fieldset className="toy-choice">
          <legend>The starting stack, stk</legend>
          {STACKS.map((x) => (
            <label key={x.id}>
              <input
                type="radio"
                name={`${uid}-stk`}
                checked={stkId === x.id}
                onChange={() => {
                  setStk(x.id);
                  setStatus(FRESH);
                }}
              />
              <code>{showStack(x.stk)}</code>
            </label>
          ))}
        </fieldset>
      </div>

      <div className="s9k-stage">
        <svg
          className="toy-svg s9k-tree"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={treeLabel}
        >
          {placed.map(({ node, x, y }) =>
            node.e.k === "plus"
              ? (["1", "2"] as const).map((c) => {
                  const ch = placed.find(
                    (q) => q.node.path === `${node.path}${c}`,
                  );
                  return ch === undefined ? null : (
                    <line
                      key={`${node.path}${c}`}
                      className="s9k-branch"
                      x1={x}
                      y1={y + 14}
                      x2={ch.x}
                      y2={ch.y - 14}
                    />
                  );
                })
              : null,
          )}
          {placed.map(({ node, x, y }) => {
            const on = isOn(node);
            const inner =
              running !== null &&
              running !== undefined &&
              running.path === node.path;
            return (
              <g
                key={`n${node.path}`}
                data-on={on ? "true" : undefined}
                data-inner={inner ? "true" : undefined}
                data-done={isDone(node) ? "true" : undefined}
                className="s9k-node"
              >
                <rect
                  className="s9k-box"
                  x={x - 42}
                  y={y - 14}
                  width={84}
                  height={28}
                />
                <text x={x} y={y + 5} textAnchor="middle">
                  {leaf(node.e)}
                </text>
                <text className="s9k-name" x={x - 46} y={y - 18}>
                  {NAME(node.path)}
                </text>
                {isDone(node) ? (
                  <text
                    key={`v${node.path}${k}`}
                    className="s9k-val toy-land"
                    x={x + 46}
                    y={y - 18}
                    textAnchor="end"
                  >
                    = {aval(node.e, STORE)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        <div className="s9k-machine">
          <ol className="s9k-code" aria-label="Compiled code">
            {code.map((ins, i) => (
              <li
                key={i}
                data-here={i === k ? "true" : undefined}
                data-past={i < k ? "true" : undefined}
              >
                <span className="s9k-pc" aria-hidden="true">
                  {i === k ? "▸" : ""}
                </span>
                <code>{showInstr(ins)}</code>
                {i === k ? (
                  <span className="visually-hidden"> (next)</span>
                ) : null}
              </li>
            ))}
          </ol>
          <div
            className="s9k-stack"
            aria-label={`Stack, top first: ${showStack(now)}`}
            role="img"
          >
            <span className="s9k-stack-name" aria-hidden="true">
              stack
            </span>
            <svg
              viewBox={`0 0 ${BOX * 2 + 40} ${
                (Math.max(
                  stacks.reduce((m, s) => Math.max(m, s.length), 0),
                  1,
                ) +
                  0.6) *
                BOX
              }`}
              className="s9k-stack-svg"
              aria-hidden="true"
            >
              {now.map((v, i) => {
                const fromStk = i >= now.length - stk.length;
                const y = i * BOX + 2;
                return (
                  <g
                    key={`${now.length - i}-${v}`}
                    className={`s9k-cell${i === 0 && k > 0 ? " toy-land" : ""}`}
                    data-stk={fromStk ? "true" : undefined}
                  >
                    <rect
                      className="s9k-slot"
                      x={2}
                      y={y}
                      width={BOX * 2}
                      height={BOX - 4}
                    />
                    <text x={BOX + 2} y={y + BOX / 2 + 3} textAnchor="middle">
                      {v}
                    </text>
                  </g>
                );
              })}
              {stk.length > 0 ? (
                <g className="s9k-stk-brace">
                  <line
                    x1={BOX * 2 + 8}
                    x2={BOX * 2 + 8}
                    y1={(now.length - stk.length) * BOX + 2}
                    y2={now.length * BOX - 2}
                  />
                  <text
                    x={BOX * 2 + 13}
                    y={(now.length - stk.length / 2) * BOX + 3}
                  >
                    stk
                  </text>
                </g>
              ) : null}
            </svg>
          </div>
        </div>
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
          onClick={() => go(code.length)}
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
      </div>

      <p className="toy-status" aria-live="polite">
        {status}
      </p>

      <div className="s9k-table-frame">
        <table className="s9k-table">
          <caption>The stack each plus case&apos;s hypotheses need</caption>
          <thead>
            <tr>
              <th scope="col">Case</th>
              <th scope="col">
                <code>ih₁</code> at
              </th>
              <th scope="col">
                <code>ih₂</code> at
              </th>
            </tr>
          </thead>
          <tbody>
            {second.map(({ p, e2 }) => {
              const e1 = ns.find((x) => x.path === `${p.path}1`);
              const seen1 = e1 !== undefined && k >= e1.from;
              const seen2 = e2 !== undefined && k >= e2.from;
              const differs =
                e2 !== undefined &&
                showStack(stacks[e2.from]) !== showStack(stacks[p.from]);
              return (
                <tr key={p.path}>
                  <th scope="row">
                    {NAME(p.path)} = plus {NAME(`${p.path}1`)}{" "}
                    {NAME(`${p.path}2`)}
                  </th>
                  <td>
                    <code>
                      {seen1 && e1 !== undefined
                        ? showStack(stacks[e1.from])
                        : "…"}
                    </code>
                    {seen1 ? (
                      <span className="s9k-note">
                        the stack {NAME(p.path)} started on
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <code>
                      {seen2 && e2 !== undefined
                        ? showStack(stacks[e2.from])
                        : "…"}
                    </code>
                    {seen2 ? (
                      <span className="s9k-note">
                        {NAME(`${p.path}1`)}&apos;s value on top
                        {differs ? `, not ${showStack(stacks[p.from])}` : ""}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="s9k-moral">
        Without <code>generalizing stk</code>, both hypotheses speak only about
        the one stack the theorem started with, so the plus case has nothing to
        say about the second column.
      </p>
    </ToyFrame>
  );
}
