; ledger.go keeps balances as int64
(declare-const a Int)
(declare-const b Int)
(declare-const amount Int)
(assert (and (>= a 0) (>= b 0)))
(assert (and (> amount 0) (<= amount a)))          ; ledger.go: the transfer guard
(assert (or (< (- a amount) 0) (< (+ b amount) 0)))  ; the violation: a balance ends below zero
(check-sat)
