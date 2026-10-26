import S9.Defs

/-!
# LAB-9.4 · what a client observes, and the matching relation (yours)

Your statement module. The receipt of LAB-9.4 freezes it by its statement hash. The course's adequacy
theorems (`challenge/Challenge/S9B.lean`) hold it to a floor: aborts, error codes and every balance must be
observable, `R` must hold on the starting states, and `R` must imply equal observations.

* `Obs`, the type of what a client sees;
* `obs s₀ o`, what a client sees of outcome `o` of a run that started from store `s₀`;
* `R s regs st`, relating a source store `s` to the target's registers `regs` and store `st`.
-/

namespace S9

/-- TODO(you): what a client observes. The placeholder observes nothing. -/
def Obs : Type := Unit

/-- TODO(you): the observation of one outcome. -/
def obs (_s₀ : Store) (_o : Outcome) : Obs := ()

/-- TODO(you): the matching relation between a source store and a target state. -/
def R (_s : Store) (_regs : Regs) (_st : Store) : Prop := True

end S9
