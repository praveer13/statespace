; Self-composition of Acme's usage panel. Acme has one document; Birch has two private ones, each maybe present.
(declare-const own_L Int)
(declare-const own_R Int)
(declare-const ex0_L Bool)
(declare-const ex0_R Bool)
(declare-const ex1_L Bool)
(declare-const ex1_R Bool)
(declare-const body0_L Int)
(declare-const body0_R Int)
(declare-const body1_L Int)
(declare-const body1_R Int)
(define-fun cnt ((a Bool) (b Bool)) Int (+ (ite a 1 0) (ite b 1 0)))

; Rel: what Acme may know.
(assert (and (= own_L own_R) (= (cnt ex0_L ex1_L) (cnt ex0_R ex1_R))))   ; DCL-7.2: the platform-wide count

; Acme's usage panel, once per world.
(define-fun panel ((x0 Bool) (x1 Bool)) Int (+ 1 (cnt x0 x1)))   ; its document, and the platform-wide count

; The negated conclusion: Acme's two panels differ.
(assert (or (distinct own_L own_R) (distinct (panel ex0_L ex1_L) (panel ex0_R ex1_R))))
(check-sat)
