; CL-1.3: a hold is captured at most once (LAB-1.5). This file is the statement the claim pins.
;
; Two fixed captures chain S0 -> S1 -> S2 (suffixes _p and _pp). The state before is given. Assert the
; first fixed capture, then, LAST and as one assertion, the second fixed capture together with the negated
; property. Expect no model. `statespace check lab1.5` also asks it without its last assertion (the state
; before plus one fixed capture), which must have a model.
(declare-datatypes ((Status 0)) (((HELD) (CAPTURED))))
(declare-const h Int)
(declare-const avail Int)
(declare-const held Int)
(declare-const merchant Int)
(declare-const status Status)
(declare-const avail_p Int)
(declare-const held_p Int)
(declare-const merchant_p Int)
(declare-const status_p Status)
(declare-const avail_pp Int)
(declare-const held_pp Int)
(declare-const merchant_pp Int)
(declare-const status_pp Status)
(assert (>= avail 0))
(assert (>= held 0))
(assert (>= merchant 0))
(assert (> h 0))
(assert (>= held h))
(assert (= status HELD))
; TODO(you): assert the first fixed capture, from S0 to S1.
; TODO(you): assert the second fixed capture and the negated property together, last, as one assertion.
(check-sat)
