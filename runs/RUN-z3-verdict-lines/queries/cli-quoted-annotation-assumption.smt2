(declare-const p Bool)
(assert (not p))
(check-sat-assuming ((|!| p :named q)))
