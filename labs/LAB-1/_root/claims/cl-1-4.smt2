; CL-1.4: the fixed refund never mints (LAB-1.4). This file is the statement your claim card pins.
;
; It is the mint query of your fixed rule, with the default parameters: the premises, your rule, and the
; mint LAST. Expect no model. `statespace check lab1.4` also asks it without its last assertion, which
; must have a model.
(declare-const c Int)
(declare-const m Int)
(declare-const r Int)
(assert (>= c 0))
(assert (>= m 0))
(assert (> r 0))
; TODO(you): define your fixed rule's accepted flag and new balances, for example with define-fun.
; TODO(you): assert the mint, last: the new total exceeds c + m.
(check-sat)
