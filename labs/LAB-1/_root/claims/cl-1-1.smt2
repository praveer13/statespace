; CL-1.1: the guarded transfer never overdraws the sender (LAB-1.3). This file is the statement your claim
; card pins: every receipt records its hash, and a later change voids the claim.
;
; It is the guarded violation query: the premises, the guard, and the negated property LAST. Expect no
; model. `statespace check lab1.3` also asks it without its last assertion, which must have a model, and
; compares it with the premises, the sufficient-funds guard and the negated property.
(declare-const a Int)
(declare-const b Int)
(declare-const amount Int)
(assert (>= a 0))
(assert (>= b 0))
(assert (> amount 0))
; TODO(you): assert the sufficient-funds guard.
; TODO(you): assert the negated property, last: the sender ends below zero.
(check-sat)
