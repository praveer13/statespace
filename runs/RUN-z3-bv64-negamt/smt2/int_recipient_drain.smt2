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
 (<= amount a))
(assert
 (let ((?x1 (+ b amount)))
(< ?x1 0)))
(check-sat)
