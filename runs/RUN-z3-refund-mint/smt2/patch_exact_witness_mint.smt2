; benchmark generated from python API
(set-info :status unknown)
(declare-fun c () Int)
(declare-fun m () Int)
(declare-fun r () Int)
(assert
 (>= c 0))
(assert
 (>= m 0))
(assert
 (> r 0))
(assert
 (let ((?x1 (+ c m)))
(let (($x1 (= r (+ m 1))))
(let ((?x2 (+ (ite $x1 c (+ c r)) (ite $x1 m (ite (> (- m r) 0) (- m r) 0)))))
(> (- ?x2 ?x1) 0)))))
(check-sat)
