; RUN-z3-nat-trunc: the remedy S3.L7 states after cell 2 (Int balances with a guard, and a positive Amount),
; as the cell's second query ("total changed") with the truncating subtraction replaced by Int subtraction
; under the guard n <= a. Run by z3 and by cvc5, the second solver the lesson names.
(set-logic QF_LIA)
(declare-const a Int)
(declare-const b Int)
(declare-const n Int)
(assert (>= a 0))
(assert (>= b 0))
(assert (> n 0))
(assert (<= n a))
(assert (distinct (+ (- a n) (+ b n)) (+ a b)))
(check-sat)
