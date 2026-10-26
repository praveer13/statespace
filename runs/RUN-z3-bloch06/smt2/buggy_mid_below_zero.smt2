; benchmark generated from python API
(set-info :status unknown)
(declare-fun low () (_ BitVec 32))
(declare-fun high () (_ BitVec 32))
(assert
 (bvsge low (_ bv0 32)))
(assert
 (bvsle low high))
(assert
 (let ((?x1 (bvadd low high)))
(let ((?x2 (bvsdiv ?x1 (_ bv2 32))))
(bvslt ?x2 (_ bv0 32)))))
(check-sat)
