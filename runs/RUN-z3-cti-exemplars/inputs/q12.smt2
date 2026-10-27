; vouchers.smt2: the inductive step for redeemed <= issued. Init: issued, redeemed and outstanding all 0
(declare-const issued Int)
(declare-const redeemed Int)
(declare-const outstanding Int)
(declare-const issued_p Int)
(declare-const redeemed_p Int)
(declare-const outstanding_p Int)
(assert (<= redeemed issued))
(assert (or
  (and (= issued_p (+ issued 1)) (= outstanding_p (+ outstanding 1)) (= redeemed_p redeemed))        ; Issue
  (and (> outstanding 0) (= redeemed_p (+ redeemed 1)) (= outstanding_p (- outstanding 1)) (= issued_p issued))  ; Redeem
  (and (> outstanding 0) (= outstanding_p (+ outstanding 1)) (= issued_p (+ issued 1)) (= redeemed_p redeemed))))  ; Split
(assert (> redeemed_p issued_p))
(check-sat)
