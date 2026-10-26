def topUp (bal n cap : Int) : Int := if bal + n ≤ cap then bal + n else bal

theorem topUp_le_cap (bal n cap : Int) (hb : bal ≤ cap) (hn : 0 ≤ n) (hc : 0 ≤ cap) :
    topUp bal n cap ≤ cap := by
  unfold topUp
  split
  · omega
  · omega   -- ◀
