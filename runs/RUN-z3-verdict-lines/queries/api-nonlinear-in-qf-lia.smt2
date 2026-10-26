(set-logic QF_LIA)
(declare-const x Int)
(assert (> (* x x) 3))
(check-sat)
