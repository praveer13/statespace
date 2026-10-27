; Self-composition of Open v1 for frank and layoffs-memo.
; _L is the left world and _R the right world.
(declare-const exists_L Bool)
(declare-const exists_R Bool)
(declare-const mayread_L Bool)
(declare-const mayread_R Bool)
(declare-const body_L Int)
(declare-const body_R Int)

; Rel: the worlds agree on what Acme may know.
(assert (= mayread_L mayread_R))
(assert (and (=> mayread_L (= exists_L exists_R)) (= body_L body_R)))

; The view, once per world: a page only when the document exists and frank may read it.
(define-fun resp_code ((e Bool) (m Bool)) Int (ite (and e m) 2 0))
(define-fun resp_body ((e Bool) (m Bool) (b Int)) Int b)

; The negated conclusion: frank's two responses differ.
(assert (or (distinct (resp_code exists_L mayread_L) (resp_code exists_R mayread_R))
            (distinct (resp_body exists_L mayread_L body_L) (resp_body exists_R mayread_R body_R))))
(check-sat)
