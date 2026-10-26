; claims/no-cross-tenant.smt2: the pinned statement of LAB-7.3 and CL-7.2. The course ships it; its hash
; goes into every LAB-7.3 receipt, and a changed hash voids the claim to [?]. Do not edit it.
;
; It holds the S7 world's vocabulary over uninterpreted sorts, the schema invariants WF1 to WF3, and the
; read policy, rules 1 to 3, with team nesting grounded as data: `anc` is the hierarchy stored as data,
; any depth, and WF2 and WF3 constrain that data. `statespace check lab7.3` appends your
; labs/LAB-7/policy/read.smt2, which defines (violation u d), and then asks Z3 whether some request
; (req_u, req_d) is a violation in some world.

(declare-sort User 0)
(declare-sort Team 0)
(declare-sort Doc 0)
(declare-sort Tenant 0)
(declare-fun tu (User) Tenant)
(declare-fun tt (Team) Tenant)
(declare-fun owner (Doc) Team)
(declare-fun member (User Team) Bool)
(declare-fun anc (Team Team) Bool)
(declare-fun share_user (Doc User) Bool)
(declare-fun share_team (Doc Team) Bool)
(declare-fun revoked (Doc User) Bool)
(define-fun td ((d Doc)) Tenant (tt (owner d)))

; ---- schema invariants
; WF1: a member belongs to the team's tenant (no guest membership)
(define-fun WF1 () Bool (forall ((x User) (y Team)) (=> (member x y) (= (tu x) (tt y)))))
; WF2: a nested team belongs to its parent's tenant
(define-fun WF2 () Bool (forall ((s Team) (t Team)) (=> (anc s t) (= (tt s) (tt t)))))
; WF3: the hierarchy is acyclic, and anc holds it at every depth
(define-fun WF3 () Bool (forall ((s Team) (t Team) (r Team)) (and (not (anc s s)) (=> (and (anc s t) (anc t r)) (anc s r)))))
(assert WF1)
(assert WF2)
(assert WF3)

; ---- the read policy
(define-fun inteam ((u User) (t Team)) Bool (or (member u t) (exists ((s Team)) (and (member u s) (anc s t)))))
(define-fun rule1 ((u User) (d Doc)) Bool (inteam u (owner d)))
(define-fun rule2 ((u User) (d Doc)) Bool (and (share_user d u) (not (revoked d u))))
(define-fun rule3 ((u User) (d Doc)) Bool (exists ((t Team)) (and (inteam u t) (share_team d t))))
(define-fun canread ((u User) (d Doc)) Bool (or (rule1 u d) (rule2 u d) (rule3 u d)))
