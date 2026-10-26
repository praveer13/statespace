; benchmark generated from python API
(set-info :status unknown)
(declare-fun a () Int)
(declare-fun b () Int)
(declare-fun amount () Int)
(assert
 (>= a 0))
(assert
 (>= b 0))
(assert
 (> amount 0))
(assert
 (<= amount 100))
(assert
 (not (= (- a amount) (+ a 1000000))))
(check-sat)
