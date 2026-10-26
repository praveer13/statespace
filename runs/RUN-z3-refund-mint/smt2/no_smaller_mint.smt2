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
 (let ((?x2 (- (+ (+ c r) (ite (> (- m r) 0) (- m r) 0)) ?x1)))
 (> ?x2 0))))
(assert
 (let ((?x1 (+ c m)))
(let ((?x2 (- (+ (+ c r) (ite (> (- m r) 0) (- m r) 0)) ?x1)))
(< ?x2 1))))
(check-sat)
