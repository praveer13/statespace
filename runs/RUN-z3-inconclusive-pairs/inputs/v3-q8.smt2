(set-option :rlimit 20000)
(declare-const a Int)
(declare-const amount Int)
(declare-const rate Int)
(declare-const fee Int)
(assert (and (>= a 0) (> amount 0)))
(assert (and (>= rate 0) (<= rate 500)))                 ; the rate in basis points
(assert (<= (* fee 10000) (* amount rate)))              ; fee = floor(amount * rate / 10000)
(assert (< (* amount rate) (+ (* fee 10000) 10000)))
(assert (<= (+ amount fee) a))                           ; the guard: the sender covers amount and fee
(assert (< (- a amount fee) 0))                          ; the violation: the sender ends below zero
(check-sat)
(get-info :reason-unknown)
