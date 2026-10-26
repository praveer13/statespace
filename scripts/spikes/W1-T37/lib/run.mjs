// Running cells on the two Z3 engines and queries on cvc5, for GATE-calls and its conformance pair (W1-T37).

import { DEFAULT_RLIMIT, DEFAULT_WALL_MS } from './engines.mjs';
import { runCvc5 } from './cvc5.mjs';
import { runsOnZ3 } from './judge.mjs';

/**
 * Every Z3 cell on both engines, the engines side by side and each engine's cells one after another, each under its
 * own watchdog. Returns the replies by cell ref, with the engines' probes and descriptions.
 */
export async function runCells({ engines, cells, rlimit = DEFAULT_RLIMIT, wallMs = DEFAULT_WALL_MS }) {
  const todo = cells.filter(runsOnZ3);
  const replies = { native: new Map(), pyodide: new Map() };
  const probes = {};
  const describe = {};
  const timing = {};
  await Promise.all(
    ['native', 'pyodide'].map(async (id) => {
      const started = Date.now();
      const engine = await engines[id]();
      probes[id] = engine.probe;
      describe[id] = engine.describe;
      for (const cell of todo) {
        replies[id].set(cell.ref, await engine.server.call({ op: 'cell', lang: cell.lang, code: cell.code, rlimit }, { wallMs }));
      }
      timing[id] = Date.now() - started;
    }),
  );
  return { replies, probes, describe, timing, ran: todo.length };
}

/**
 * cvc5 on every task, a few at a time, and once per distinct query text (both engines' witness queries are often the
 * same text). `override(task)` may answer a task in place of cvc5 (the planted fixtures use it); a task with no text is
 * answered with the reason it has none.
 */
export async function runCvc5Tasks({ cvc5, tasks, override = () => undefined, concurrency = 4 }) {
  const answers = new Map();
  const byText = new Map();
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const task = tasks[next++];
      const forced = override(task);
      if (forced !== undefined) answers.set(task.key, forced);
      else if (task.text == null) answers.set(task.key, { verdicts: [], errors: [], detail: `the query has no SMT-LIB export${task.missing ? `: ${task.missing}` : ''}` });
      else {
        if (!byText.has(task.text)) byText.set(task.text, runCvc5(cvc5, task.text));
        answers.set(task.key, await byText.get(task.text));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, tasks.length)) }, worker));
  return answers;
}
