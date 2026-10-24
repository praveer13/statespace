import Std.WP
set_option experimental.vcgen true
set_option experimental.intrinsic true

def transfer (a b amt : Int) : Id (Int × Int)
    requires 0 < amt ∧ amt ≤ a
    ensures r => r.1 + r.2 = a + b ∧ 0 ≤ r.1 ∨ a < 0
  := pure (a - amt, b + amt)

#check @transfer.spec

def applyAll (amts : List Int) (total : Int) : StateM (Int × Int) Unit
    requires s => s.1 + s.2 = total
    ensures _ s => s.1 + s.2 = total
  := do
  for amt in amts invariant _ _ s => s.1 + s.2 = total do
    let (a, b) ← get
    if 0 < amt ∧ amt ≤ a then
      set (a - amt, b + amt)

#check @applyAll.spec
#print axioms applyAll.spec
