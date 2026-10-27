; withdraw.smt2: a withdrawal of amount plus its 1% fee
(declare-const bal Int)
(declare-const amount Int)
(declare-const fee Int)
(assert (>= bal 0))
(assert (> amount 0))
(assert (= fee (div amount 100)))      ; the fee, rounded down
(assert (<= (+ amount fee) bal))
(assert (>= fee amount))              ; the fee cap
(assert (< (- bal (+ amount fee)) 0))  ; the violation: the balance ends below zero
(check-sat)
