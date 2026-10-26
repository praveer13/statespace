; benchmark generated from python API
(set-info :status unknown)
(declare-fun low () (_ BitVec 32))
(declare-fun high () (_ BitVec 32))
(assert
 (bvsge low (_ bv0 32)))
(assert
 (bvsle low high))
(assert
 (let (($x1 (and (bvsle low (bvsdiv (bvadd low high) (_ bv2 32))) (bvsle (bvsdiv (bvadd low high) (_ bv2 32)) high))))
(not $x1)))
(check-sat)
