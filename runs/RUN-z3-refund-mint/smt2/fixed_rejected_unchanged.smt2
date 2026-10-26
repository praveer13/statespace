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
 (let (($x1 (<= r m)))
 (not $x1)))
(assert
 (or (and (distinct (ite (<= r m) (+ c r) c) c) true) (and (distinct (ite (<= r m) (- m r) m) m) true)))
(check-sat)
