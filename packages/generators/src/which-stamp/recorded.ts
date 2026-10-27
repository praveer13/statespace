// GEN-which-stamp's recorded outputs: the verdict lines of executed runs, by run id, with what the deriver needs beside
// them (the checker the run's configuration names, the constants its configuration file assigns, the trace records'
// configurations). Copied, never typed: written by a script from content/generators/GEN-which-stamp/fixtures.json and
// the run records under runs/, the way scripts/verify-stamps.mjs resolves them; test/which-stamp/ checks that every
// line here is the fixture's. Numbers are never altered (ASSESSMENT.md section 4.13). Pure data.

export interface RecordedOutput {
  readonly id: string
  readonly run: string
  readonly config?: string
  /** The difficulty tier of ASSESSMENT.md section 4.13's bands: 1 Z3 sat or unsat; 2 Lean and complete TLC; 3 stops, unknowns, rejections. */
  readonly tier: 1 | 2 | 3
  readonly parser: 'solver' | 'tlc' | 'lean' | 'trace'
  readonly lines: readonly string[]
  readonly checker: { readonly name: string; readonly version: string }
  readonly constants?: readonly (readonly [string, string])[]
  readonly traces?: readonly { readonly trace: string; readonly line: string; readonly sha256?: string }[]
  readonly context: Readonly<Record<string, string | number | boolean | { readonly length: number; readonly unit: 'steps' }>>
}

export const RECORDED: readonly RecordedOutput[] = [
  {
    "id": "z3-guard-unsat",
    "run": "RUN-z3-starter",
    "tier": 1,
    "parser": "solver",
    "lines": [
      "[1.3 guard added] unsat (0.00s) "
    ],
    "checker": {
      "name": "Z3",
      "version": "5.3.1"
    },
    "context": {
      "direction": "violation"
    }
  },
  {
    "id": "z3-overdraft-sat-replayed",
    "run": "RUN-z3-starter",
    "tier": 1,
    "parser": "solver",
    "lines": [
      "[1.2 starter: overdraft search] sat (0.00s) [b = 0, amount = 1, a = 0]"
    ],
    "checker": {
      "name": "Z3",
      "version": "5.3.1"
    },
    "context": {
      "direction": "violation",
      "replay": "replayed",
      "witness": {
        "length": 1,
        "unit": "steps"
      }
    }
  },
  {
    "id": "z3-overdraft-sat-not-yet-replayed",
    "run": "RUN-z3-starter",
    "tier": 3,
    "parser": "solver",
    "lines": [
      "[1.2 starter: overdraft search] sat (0.00s) [b = 0, amount = 1, a = 0]"
    ],
    "checker": {
      "name": "Z3",
      "version": "5.3.1"
    },
    "context": {
      "direction": "violation"
    }
  },
  {
    "id": "z3-unknown-theory-arithmetic",
    "run": "RUN-z3-unknown-pow",
    "config": "RUN-z3-unknown-pow",
    "tier": 3,
    "parser": "solver",
    "lines": [
      "[Int x**y == 8, y>1] unknown (0.00s) smt tactic failed to show goal to be sat/unsat (incomplete (theory arithmetic)) "
    ],
    "checker": {
      "name": "Z3",
      "version": "5.3.1"
    },
    "context": {}
  },
  {
    "id": "z3-unknown-canceled-at-rlimit",
    "run": "RUN-z3-budget-pyodide",
    "tier": 3,
    "parser": "solver",
    "lines": [
      "2806ms py: rlimit-case unknown canceled 1.1 s"
    ],
    "checker": {
      "name": "Z3",
      "version": "5.3.1"
    },
    "context": {
      "rlimit": 5000000,
      "guardsEnforcement": true
    }
  },
  {
    "id": "tlc-atomic-complete",
    "run": "RUN-tlc-atomic",
    "tier": 2,
    "parser": "tlc",
    "lines": [
      "Model checking completed. No error has been found.",
      "5 states generated, 4 distinct states found, 0 states left on queue."
    ],
    "checker": {
      "name": "TLC",
      "version": "2026.10.20.183001"
    },
    "constants": [
      [
        "Init",
        "100"
      ],
      [
        "Amount",
        "80"
      ],
      [
        "Workers",
        "{w1, w2}"
      ]
    ],
    "context": {}
  },
  {
    "id": "tlc-doublespend-deadlock",
    "run": "RUN-tlc-doublespend",
    "config": "1.8.0-default",
    "tier": 3,
    "parser": "tlc",
    "lines": [
      "Error: Deadlock reached.",
      "11 states generated, 10 distinct states found, 3 states left on queue."
    ],
    "checker": {
      "name": "TLC",
      "version": "2026.10.20.183001"
    },
    "constants": [
      [
        "Init",
        "100"
      ],
      [
        "Amount",
        "80"
      ],
      [
        "Workers",
        "{w1, w2}"
      ]
    ],
    "context": {
      "deadlockFreedom": false
    }
  },
  {
    "id": "tlc-rtw3-violation",
    "run": "RUN-tlc-rtw3",
    "tier": 2,
    "parser": "tlc",
    "lines": [
      "Error: Invariant NoOverspend is violated.",
      "State 1: <Initial predicate>",
      "State 2: <Read(w1) line 10, col 13 to line 11, col 75 of module RTW3>",
      "State 3: <Check(w1) line 12, col 13 to line 14, col 45 of module RTW3>",
      "State 4: <Read(w2) line 10, col 13 to line 11, col 75 of module RTW3>",
      "State 5: <Write(w1) line 15, col 13 to line 16, col 64 of module RTW3>",
      "State 6: <Check(w2) line 12, col 13 to line 14, col 45 of module RTW3>",
      "State 7: <Write(w2) line 15, col 13 to line 16, col 64 of module RTW3>"
    ],
    "checker": {
      "name": "TLC",
      "version": "2026.10.20.183001"
    },
    "constants": [
      [
        "Workers",
        "{w1, w2}"
      ],
      [
        "Amt",
        "80"
      ],
      [
        "Init",
        "100"
      ]
    ],
    "context": {}
  },
  {
    "id": "lean-comparator-okay",
    "run": "RUN-lean-comparator",
    "tier": 2,
    "parser": "lean",
    "lines": [
      "== good comparator(no-sandbox) rc=0 :: Your solution is okay! "
    ],
    "checker": {
      "name": "Lean",
      "version": "4.35.0"
    },
    "context": {}
  },
  {
    "id": "lean-comparator-paranoid",
    "run": "RUN-lean-comparator",
    "tier": 2,
    "parser": "lean",
    "lines": [
      "Lean paranoid kernel accepts the solution",
      "lean4lean kernel accepts the solution",
      "nanoda kernel accepts the solution",
      "con-leche kernel accepts the solution",
      "con-ron kernel accepts the solution",
      "Lean default kernel accepts the solution"
    ],
    "checker": {
      "name": "Lean",
      "version": "4.35.0"
    },
    "context": {
      "paranoid": true
    }
  },
  {
    "id": "lean-sorry",
    "run": "RUN-lean-axioms",
    "config": "lean-bad",
    "tier": 2,
    "parser": "lean",
    "lines": [
      "Ledger/Bad.lean:4:8: warning: declaration uses `sorry`",
      "'with_sorry' depends on axioms: [sorryAx]"
    ],
    "checker": {
      "name": "Lean",
      "version": "4.35.0"
    },
    "context": {}
  },
  {
    "id": "lean-custom-axiom",
    "run": "RUN-lean-axioms",
    "config": "lean-bad",
    "tier": 2,
    "parser": "lean",
    "lines": [
      "'with_axiom' depends on axioms: [cheat]"
    ],
    "checker": {
      "name": "Lean",
      "version": "4.35.0"
    },
    "context": {}
  },
  {
    "id": "lean-native-not-permitted",
    "run": "RUN-lean-axioms",
    "tier": 3,
    "parser": "lean",
    "lines": [
      "error: Axiom 'big_native._native.native_decide.ax_1_1' is not permitted; it is used by 'big_native'",
      "Lean default kernel accepts the solution"
    ],
    "checker": {
      "name": "Lean",
      "version": "4.35.0"
    },
    "context": {}
  },
  {
    "id": "lean-statement-mismatch",
    "run": "RUN-lean-comparator",
    "tier": 2,
    "parser": "lean",
    "lines": [
      "== weak comparator(no-sandbox) rc=1 :: error: Challenge and solution theorem statement do not match: 'transfer_conserves' "
    ],
    "checker": {
      "name": "Lean",
      "version": "4.35.0"
    },
    "context": {}
  },
  {
    "id": "lean-constant-mismatch",
    "run": "RUN-lean-comparator",
    "tier": 2,
    "parser": "lean",
    "lines": [
      "== redef comparator(no-sandbox) rc=1 :: error: Const does not match between challenge and target 'transfer' "
    ],
    "checker": {
      "name": "Lean",
      "version": "4.35.0"
    },
    "context": {}
  },
  {
    "id": "lean-checker-rejects",
    "run": "RUN-lean-skipkernel",
    "tier": 3,
    "parser": "lean",
    "lines": [
      "'oops' does not depend on any axioms",
      "leanchecker found a problem in Probe.Bypass"
    ],
    "checker": {
      "name": "Lean",
      "version": "4.35.0"
    },
    "context": {}
  },
  {
    "id": "trace-validation-safety",
    "run": "RUN-tlc-tracemodule",
    "tier": 3,
    "parser": "trace",
    "lines": [
      "<<\"trace-validation\", [diameter |-> 15, verdict |-> \"accepted\", lines |-> 11, matched |-> 11, first_unmatched |-> 0, end_record |-> TRUE, paper_accepted |-> FALSE]>>",
      "<<\"trace-validation\", [diameter |-> 11, verdict |-> \"rejected\", lines |-> 11, matched |-> 7, first_unmatched |-> 8, end_record |-> TRUE, paper_accepted |-> FALSE]>>",
      "<<\"trace-validation\", [diameter |-> 12, verdict |-> \"partial\", lines |-> 8, matched |-> 8, first_unmatched |-> 0, end_record |-> FALSE, paper_accepted |-> FALSE]>>"
    ],
    "checker": {
      "name": "TLC",
      "version": "1.8.0"
    },
    "traces": [
      {
        "trace": "accepted",
        "line": "<<\"trace-validation\", [diameter |-> 15, verdict |-> \"accepted\", lines |-> 11, matched |-> 11, first_unmatched |-> 0, end_record |-> TRUE, paper_accepted |-> FALSE]>>",
        "sha256": "2145fa82f5547bf809074679d9b8b6cbad7c59a0fd07d1dcdd0d174d800d1ee1"
      },
      {
        "trace": "rejected",
        "line": "<<\"trace-validation\", [diameter |-> 11, verdict |-> \"rejected\", lines |-> 11, matched |-> 7, first_unmatched |-> 8, end_record |-> TRUE, paper_accepted |-> FALSE]>>",
        "sha256": "0da133a7d7546d8e7fb80ef1bef45c88cbcb7f2c99f802fafc2ba50663dd9637"
      },
      {
        "trace": "partial",
        "line": "<<\"trace-validation\", [diameter |-> 12, verdict |-> \"partial\", lines |-> 8, matched |-> 8, first_unmatched |-> 0, end_record |-> FALSE, paper_accepted |-> FALSE]>>",
        "sha256": "89c6fce9102c8fc395c65d30904667c25dafe97fbe1a44dea247a62c1f64644a"
      }
    ],
    "context": {
      "property": "safety"
    }
  },
  {
    "id": "trace-validation-liveness",
    "run": "RUN-tlc-tracemodule",
    "tier": 3,
    "parser": "trace",
    "lines": [
      "<<\"trace-validation\", [diameter |-> 15, verdict |-> \"accepted\", lines |-> 11, matched |-> 11, first_unmatched |-> 0, end_record |-> TRUE, paper_accepted |-> FALSE]>>"
    ],
    "checker": {
      "name": "TLC",
      "version": "1.8.0"
    },
    "traces": [
      {
        "trace": "accepted",
        "line": "<<\"trace-validation\", [diameter |-> 15, verdict |-> \"accepted\", lines |-> 11, matched |-> 11, first_unmatched |-> 0, end_record |-> TRUE, paper_accepted |-> FALSE]>>",
        "sha256": "2145fa82f5547bf809074679d9b8b6cbad7c59a0fd07d1dcdd0d174d800d1ee1"
      }
    ],
    "context": {
      "property": "liveness"
    }
  }
]
