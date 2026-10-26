import Lab3.Typing
/-!
# Lab3.Eval: your evaluator and your policy (LAB-3.3)

`exec p c s` returns every failure as a value. It must be total and structurally recursive, so that the
kernel can compute a golden `exec p c s = r` with `decide`: no `partial`, no `implemented_by`, no well-founded
recursion (S3.L8). It checks, in this order (curriculum/S03-semantics.md section 2.4):

1. the command exists, else `unknownCommand C`;
2. the arguments decode by arity and type (an `amount` must be a positive `int`), else `badArgument p` for
   the first parameter that fails (`badArgument "arity"` for an extra argument); under `zero = noop` an
   amount of 0 returns `.ok (s, [], [])` at once, with no account or guard check;
3. every account argument exists, in parameter order, else `unknownAccount a`;
4. a `move` from an account to itself is `selfTransfer` under `self = reject`;
5. a false guard is `guardFailed C` under `guard = error`, or `.ok (s, [], [])` under `silent`; a guard that
   is not a bool is `typeError`;
6. the statement's run-time checks: capture and release need the hold to exist (`unknownHold h`), to be
   `held`, and its escrow to cover its amount (`holdNotOpen h`);
7. the postings, through `post`; under `overflow = bounded`, the first posted account outside
   [-maxBal, maxBal], credited account first, is `overflow a`;
8. the outcome: `.ok (s', output, effects)`, with `[h]` as the output of a hold (its id, `s.nextHold`), and
   `notify y` for the credited account when it is a user account (for a release, the hold's owner).

`hold n on x` posts from `x` to `.escrow s.nextHold`, records the hold `⟨x, n, .held⟩` under that id and
increments `nextHold`; a capture or a release posts the hold's amount out of its escrow and marks it
`captured` or `released`. `set frozen(x) := e` sets or clears the flag with `State.setFrozen`.
-/
namespace Lab3
open MiniPlinth

/-- Debit `x` by `n`, then credit `y` by `n`, reading the state the debit left. -/
def post (s : State) (_x _y : Acct) (_n : Int) : State :=
  s  -- TODO(you)

/-- One resolved operation (`MiniPlinth.Op`). -/
def applyOp (_op : Op) (_s : State) : Except Err State :=
  .error .typeError  -- TODO(you)

/-- Your four edge-case decisions (S3.L7). Your decision records (LAB-3.7) must match them. -/
def policy : Policy :=
  ⟨.reject, .allow, .error, .unbounded⟩  -- TODO(you): decide each field

/-- The evaluator, under `policy`. -/
def exec (_p : Program) (c : Call) (_s : State) : Except Err (State × Output × List Effect) :=
  .error (.unknownCommand c.name)  -- TODO(you): the outcome order above

end Lab3
