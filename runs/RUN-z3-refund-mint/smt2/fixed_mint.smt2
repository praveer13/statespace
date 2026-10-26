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
(let ((?x2 (+ (ite (<= r m) (+ c r) c) (ite (<= r m) (- m r) m))))
(> (- ?x2 ?x1) 0))))
(check-sat)
