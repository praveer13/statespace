import Std.WP
set_option experimental.vcgen true
set_option experimental.intrinsic true

-- guard forgets `amt ≤ a`: the non-negativity postcondition should not be provable
def transferBad (a b amt : Int) : Id (Int × Int)
    requires 0 < amt ∧ 0 ≤ a
    ensures r => 0 ≤ r.1
  := pure (a - amt, b + amt)
