abbrev Amount := { n : Int // 0 < n }

example : Amount := ⟨30, by decide⟩    -- goal: 0 < 30

example : Amount := ⟨0, by decide⟩     -- goal: 0 < 0

def Amount.add (a b : Amount) : Amount :=
  ⟨a.val + b.val, by
    have ha := a.property
    have hb := b.property
    omega⟩
