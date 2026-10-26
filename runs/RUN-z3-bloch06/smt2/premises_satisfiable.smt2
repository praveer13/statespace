; benchmark generated from python API
(set-info :status unknown)
(declare-fun low () (_ BitVec 32))
(declare-fun high () (_ BitVec 32))
(assert
 (bvsge low (_ bv0 32)))
(assert
 (bvsle low high))
(check-sat)
