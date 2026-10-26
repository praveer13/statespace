; benchmark generated from python API
(set-info :status unknown)
(declare-fun amount () Int)
(declare-fun b () Int)
(declare-fun a () Int)
(assert
 (let ((?x1 (+ b amount)))
(let (($x1 (< ?x1 0)))
(let ((?x2 (- a amount)))
(let (($x2 (< ?x2 0)))
(let (($x3 (or $x2 $x1)))
(not (= (not (and (>= ?x2 0) (>= ?x1 0))) $x3))))))))
(check-sat)
