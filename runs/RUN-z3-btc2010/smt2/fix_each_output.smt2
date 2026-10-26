; benchmark generated from python API
(set-info :status unknown)
(declare-fun I () (_ BitVec 64))
(declare-fun O1 () (_ BitVec 64))
(declare-fun O2 () (_ BitVec 64))
(assert
 (bvsge I (_ bv0 64)))
(assert
 (bvsge O1 (_ bv0 64)))
(assert
 (bvsle O1 (_ bv2100000000000000 64)))
(assert
 (bvsge O2 (_ bv0 64)))
(assert
 (bvsle O2 (_ bv2100000000000000 64)))
(assert
 (let ((?x1 (bvadd O1 O2)))
 (bvsle ?x1 I)))
(assert
 (let ((?x2 (bvadd ((_ sign_extend 1) O1) ((_ sign_extend 1) O2))))
(bvsgt ?x2 ((_ sign_extend 1) I))))
(check-sat)
