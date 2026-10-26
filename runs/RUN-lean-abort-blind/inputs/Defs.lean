-- AUD-9.1's shared model: the source transfer, the IR, and the observations' parts. Every case file below is
-- appended to this one (run.sh), so all eight cases are elaborated against the same definitions.

set_option linter.unusedSimpArgs false

inductive Acct where
  | a1 | a2
  deriving DecidableEq, Repr

abbrev Store := Int × Int          -- (balance of a1, balance of a2)

def bal (s : Store) : Acct → Int
  | .a1 => s.1
  | .a2 => s.2

def put (s : Store) : Acct → Int → Store
  | .a1, v => (v, s.2)
  | .a2, v => (s.1, v)

inductive Err where
  | nonPositive | insufficient
  deriving DecidableEq, Repr

inductive Outcome where
  | commit (s : Store)
  | abort (e : Err)
  deriving DecidableEq, Repr

def Outcome.isAbort : Outcome → Bool
  | .commit _ => false
  | .abort _ => true

def Outcome.err? : Outcome → Option Err
  | .commit _ => none
  | .abort e => some e

-- the balances a client reads after the command: an abort leaves the starting store
def view (s : Store) : Outcome → Store
  | .commit s' => s'
  | .abort _ => s

-- source: transfer amt from a1 to a2
def runS (amt : Int) (s : Store) : Outcome :=
  if amt ≤ 0 then .abort .nonPositive
  else if s.1 < amt then .abort .insufficient
  else .commit (s.1 - amt, s.2 + amt)

abbrev Regs := Nat → Int

def upd (f : Regs) (k : Nat) (v : Int) : Regs := fun j => if j = k then v else f j

inductive Instr where
  | ldi (r : Nat) (v : Int)
  | read (r : Nat) (a : Acct)
  | add (rd r₁ r₂ : Nat)
  | sub (rd r₁ r₂ : Nat)
  | write (a : Acct) (r : Nat)
  | writeIf (rc ra : Nat) (a : Acct) (r : Nat)   -- write only when regs rc ≥ regs ra
  | assertPos (r : Nat) (e : Err)                -- abort with e unless 0 < regs r
  | assertLe (ra rb : Nat) (e : Err)             -- abort with e unless regs ra ≤ regs rb

def runT : List Instr → Regs → Store → Outcome
  | [], _, s => .commit s
  | .ldi r v :: is, regs, s => runT is (upd regs r v) s
  | .read r a :: is, regs, s => runT is (upd regs r (bal s a)) s
  | .add rd r₁ r₂ :: is, regs, s => runT is (upd regs rd (regs r₁ + regs r₂)) s
  | .sub rd r₁ r₂ :: is, regs, s => runT is (upd regs rd (regs r₁ - regs r₂)) s
  | .write a r :: is, regs, s => runT is regs (put s a (regs r))
  | .writeIf rc ra a r :: is, regs, s =>
      runT is regs (if regs ra ≤ regs rc then put s a (regs r) else s)
  | .assertPos r e :: is, regs, s => if 0 < regs r then runT is regs s else .abort e
  | .assertLe ra rb e :: is, regs, s => if regs ra ≤ regs rb then runT is regs s else .abort e
