def spend (bal n : Int) : Int := if n ≤ bal then bal - n else bal

theorem spend_le (bal n : Int) (h0 : 0 ≤ bal) (h1 : 0 ≤ n) (h2 : bal ≤ 100) :
    spend bal n ≤ bal := by
  unfold spend
  split
  · omega   -- ◀
  · omega
