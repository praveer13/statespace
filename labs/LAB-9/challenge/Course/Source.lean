/-!
# LAB-9 · the source fragment and the IR's syntax (course module, read-only)

The template's part of LAB-9 (curriculum S9 section 2): a subset of Mini-Plinth with its semantics, the
target IR's syntax, decidable views for the goldens, and named register-index lemmas, so that manual mode
can keep `omega` and `grind` off. The IR's semantics and the compiler are yours, in `S9/Defs.lean`.

Two decisions of the source semantics matter for every compile scheme:

* `move amt src dst` evaluates `amt` once, in the starting store, so compiled code must save it in a register
  before its first write;
* the credit reads the debited store, so a transfer from an account to itself nets to zero.
-/

namespace S9

abbrev Acct := Nat
abbrev Store := Acct → Int      -- balances
abbrev Regs := Nat → Int        -- target registers

inductive Err where
  | nonPositive
  | insufficient
  | denied
  deriving DecidableEq, Repr

inductive Expr where
  | lit (v : Int)
  | bal (a : Acct)
  | add (e₁ e₂ : Expr)
  | sub (e₁ e₂ : Expr)

inductive Cmd where
  | skip
  | move (amt : Expr) (src dst : Acct)
  | require (e₁ e₂ : Expr) (err : Err)
  | seq (c₁ c₂ : Cmd)
  | abort (err : Err)

inductive Outcome where
  | committed (s : Store)
  | aborted (e : Err)

/-- Update one entry of a store or a register file. -/
def upd (f : Nat → Int) (k : Nat) (v : Int) : Nat → Int :=
  fun j => if j = k then v else f j

def evalE (s : Store) : Expr → Int
  | .lit v => v
  | .bal a => s a
  | .add e₁ e₂ => evalE s e₁ + evalE s e₂
  | .sub e₁ e₂ => evalE s e₁ - evalE s e₂

/-- The source semantics. An abort is an outcome, never "going wrong". -/
def runS : Cmd → Store → Outcome
  | .skip, s => .committed s
  | .move amt src dst, s =>
      let v := evalE s amt
      let s₁ := upd s src (s src - v)
      .committed (upd s₁ dst (s₁ dst + v))
  | .require e₁ e₂ err, s => if evalE s e₂ ≤ evalE s e₁ then .committed s else .aborted err
  | .seq c₁ c₂, s =>
      match runS c₁ s with
      | .committed s₁ => runS c₂ s₁
      | .aborted e => .aborted e
  | .abort err, _ => .aborted err

/-- The roadmap's toy command: a positive amount, enough funds, then the move. -/
def transfer (amt : Int) (src dst : Acct) : Cmd :=
  .seq (.require (.lit amt) (.lit 1) .nonPositive)
    (.seq (.require (.bal src) (.lit amt) .insufficient) (.move (.lit amt) src dst))

/-! ## The target IR: syntax only. Its semantics is yours (`S9/Defs.lean`). -/

inductive Op where
  | add
  | sub
  deriving DecidableEq, Repr

def Op.eval : Op → Int → Int → Int
  | .add, x, y => x + y
  | .sub, x, y => x - y

/-- `read` is a SELECT of one balance; `write` an UPDATE by id expecting one row; `writeIf r₁ r₂ a r` an
UPDATE whose WHERE asks `regs r₂ ≤ regs r₁`, with the rowcount ignored; `assertGe r₁ r₂ err` a checked
condition, `regs r₂ ≤ regs r₁`, mapped to a typed error; `abort` a ROLLBACK with a typed error. -/
inductive Instr where
  | ldi (r : Nat) (v : Int)
  | read (r : Nat) (a : Acct)
  | arith (op : Op) (rd r₁ r₂ : Nat)
  | write (a : Acct) (r : Nat)
  | writeIf (r₁ r₂ : Nat) (a : Acct) (r : Nat)
  | assertGe (r₁ r₂ : Nat) (err : Err)
  | abort (err : Err)

/-! ## Decidable views, for goldens closed by `decide` -/

/-- A store from a list of balances: account `a` holds the `a`-th entry, and 0 past the end. -/
def store (l : List Int) : Store := fun a => l.getD a 0

def zeroRegs : Regs := fun _ => 0

/-- What a golden compares: the error, or the first `n` balances. -/
def Outcome.view (n : Nat) : Outcome → Sum Err (List Int)
  | .committed s => .inr ((List.range n).map s)
  | .aborted e => .inl e

/-! ## Register-index lemmas (supplied, so manual mode needs no `omega`) -/

theorem upd_same (f : Nat → Int) (k : Nat) (v : Int) : upd f k v k = v := by
  simp [upd]

theorem upd_other (f : Nat → Int) {k j : Nat} (v : Int) (h : j ≠ k) : upd f k v j = f j := by
  simp [upd, h]

theorem reg_ne_of_lt {q r : Nat} (h : q < r) : q ≠ r := Nat.ne_of_lt h

theorem reg_lt_succ_of_lt {q r : Nat} (h : q < r) : q < r + 1 := Nat.lt_succ_of_lt h

theorem reg_lt_succ (r : Nat) : r < r + 1 := Nat.lt_succ_self r

theorem reg_succ_ne (r : Nat) : r + 1 ≠ r := Nat.succ_ne_self r

theorem reg_one_ne_zero : (1 : Nat) ≠ 0 := Nat.one_ne_zero

theorem reg_zero_lt_one : (0 : Nat) < 1 := Nat.zero_lt_one

end S9
