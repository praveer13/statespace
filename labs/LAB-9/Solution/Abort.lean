import Solution.Seq

/-!
# LAB-9.9 · the abort cases (your proofs)

Prove each theorem against the pinned statement in `challenge/Challenge/`: the comparator judges the
statement as it is there, so a changed hypothesis or a renamed theorem is rejected. Replace each `sorry`.
Manual mode: close the steps without `omega` or `grind`; the register-index lemmas of `Course.Source` are
there for that.
-/

namespace S9

theorem seq_abort (c₁ : Cmd) (p₁ p₂ : List Instr) (h₁ : SimR c₁ p₁)
    (s : Store) (regs : Regs) (st : Store) (e : Err) (hR : R s regs st) (ha : runS c₁ s = .aborted e) :
    exec (p₁ ++ p₂) regs st = .error e := by
  sorry

theorem abort_sim (err : Err) (p : List Instr) : compile (.abort err) = some p → SimR (.abort err) p := by
  sorry

theorem skip_sim (p : List Instr) : compile .skip = some p → SimR .skip p := by
  sorry

end S9
