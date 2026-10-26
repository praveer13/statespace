(declare-const s String)
(assert (= s "a
b"))
(assert (= (str.len s) 4))
(check-sat)
