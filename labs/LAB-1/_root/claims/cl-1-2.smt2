; CL-1.2: a transfer conserves the total (LAB-1.5). This file is the statement the claim pins.
;
; It is the negated conservation property of the transfer step, with primed variables: the step, then the
; negated property LAST. Expect no model. `statespace check lab1.5` also asks it without its last
; assertion, which must have a model.
(declare-const a Int)
(declare-const b Int)
(declare-const amount Int)
(declare-const a_p Int)
(declare-const b_p Int)
; TODO(you): assert the transfer step, with primed variables.
; TODO(you): assert the negated property, last: the total after differs from the total before.
(check-sat)
