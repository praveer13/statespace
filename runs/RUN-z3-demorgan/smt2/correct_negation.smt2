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
 (let ((?x1 (+ b amount)))
(let (($x1 (< ?x1 0)))
(let ((?x2 (- a amount)))
(let (($x2 (< ?x2 0)))
(or $x2 $x1))))))
(check-sat)
