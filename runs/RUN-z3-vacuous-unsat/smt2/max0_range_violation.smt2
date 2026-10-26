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
 (<= amount 0))
(assert
 (let ((?x1 (- a amount)))
(< ?x1 0)))
(check-sat)
