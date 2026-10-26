import Course.Run
import S9.Statement

/-!
# LAB-9 · the simulation relation (course module, read-only)

Built on your frozen modules: `Follows` says what it means for the compiled code's result to match a source
outcome under your matching relation `R`, and `SimR c p` is the forward-simulation diagram for one command
and its code, from every pair of related states (curriculum S9 section 4.2).
-/

namespace S9

def Follows (o : Outcome) (t : Except Err (Regs × Store)) : Prop :=
  match o, t with
  | .committed s', .ok (regs', st') => R s' regs' st'
  | .aborted e, .error e' => e = e'
  | _, _ => False

def SimR (c : Cmd) (p : List Instr) : Prop :=
  ∀ (s : Store) (regs : Regs) (st : Store), R s regs st → Follows (runS c s) (exec p regs st)

end S9
