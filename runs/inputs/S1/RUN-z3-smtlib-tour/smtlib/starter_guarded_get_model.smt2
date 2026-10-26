(declare-const a Int)
(declare-const b Int)
(declare-const amount Int)
(assert (and (>= a 0) (>= b 0) (> amount 0)))
(assert (<= amount a))        ; the guard
(assert (< (- a amount) 0))   ; the negated property
(check-sat)
(get-model)
