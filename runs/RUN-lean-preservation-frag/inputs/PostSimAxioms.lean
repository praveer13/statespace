abbrev Acct := Nat
abbrev Store := Acct → Int
abbrev Regs := Nat → Int

def upd (f : Nat → Int) (k : Nat) (v : Int) : Nat → Int :=
  fun j => if j = k then v else f j

-- source: one posting adds v to account a
def postS (a : Acct) (v : Int) (s : Store) : Store := upd s a (s a + v)

inductive Instr where
  | ldi (r : Nat) (v : Int)
  | read (r : Nat) (a : Acct)
  | add (rd r₁ r₂ : Nat)
  | write (a : Acct) (r : Nat)

def step : Instr → Regs × Store → Regs × Store
  | .ldi r v, (regs, st) => (upd regs r v, st)
  | .read r a, (regs, st) => (upd regs r (st a), st)
  | .add rd r₁ r₂, (regs, st) => (upd regs rd (regs r₁ + regs r₂), st)
  | .write a r, (regs, st) => (regs, upd st a (regs r))

def run : List Instr → Regs × Store → Regs × Store
  | [], m => m
  | i :: is, m => run is (step i m)

-- target: load the amount, read the balance, add, write
def postT (a : Acct) (v : Int) : List Instr :=
  [.ldi 0 v, .read 1 a, .add 1 1 0, .write a 1]

-- the matching relation: the stores agree, registers are ignored
def R (s : Store) (_regs : Regs) (st : Store) : Prop := st = s

theorem post_sim (a : Acct) (v : Int) (s : Store) (regs : Regs) (st : Store)
    (h : R s regs st) :
    R (postS a v s) (run (postT a v) (regs, st)).1 (run (postT a v) (regs, st)).2 := by
  unfold R at h ⊢
  rw [h]
  simp [postT, run, step, postS, upd]

#print axioms post_sim
