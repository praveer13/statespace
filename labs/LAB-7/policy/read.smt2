; LAB-7.3: "no cross-tenant read without an explicit share", as a violation over all worlds. TODO(you)
;
; claims/no-cross-tenant.smt2 comes first: the sorts User, Team, Doc and Tenant, the functions tu, tt,
; owner and td (a user's, a team's and a document's tenant), the relations member, anc, share_user,
; share_team and revoked, WF1 to WF3, and the policy: inteam, rule1, rule2, rule3 and canread.
;
; Define (violation u d): true exactly when u may read d, d belongs to another tenant than u's, and no
; explicit share explains the read (an unrevoked share to u, or a share to one of u's teams). The check
; appends a request (req_u, req_d), asserts (violation req_u req_d) and asks Z3:
;   - with WF1 to WF3 the reference answers unsat, beside a premise and a non-vacuity witness;
;   - on mutants seeded when you check (WF1 dropped, a tenant-level grant, subset for overlap in a team
;     share, nesting without WF2) the reference answers sat, and each of your sat answers must name a
;     request that replays as a real violation.
;
; One definition, no (check-sat): the check asks the question. Write define-fun forms only.

(define-fun violation ((u User) (d Doc)) Bool
  false)
