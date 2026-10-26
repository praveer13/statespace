; benchmark generated from python API
(set-info :status unknown)
(declare-fun A () (_ BitVec 64))
(declare-fun B () (_ BitVec 64))
(declare-fun X () (_ BitVec 64))
(assert
 (bvsge A (_ bv0 64)))
(assert
 (bvsge B (_ bv0 64)))
(assert
 (bvsle X A))
(assert
 (bvslt (bvsub A X) (_ bv0 64)))
(check-sat)
