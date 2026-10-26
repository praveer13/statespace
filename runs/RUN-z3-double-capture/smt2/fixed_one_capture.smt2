; benchmark generated from python API
(set-info :status unknown)
(declare-datatypes ((Status 0)) (((HELD) (CAPTURED))))
(declare-fun avail () Int)
(declare-fun held () Int)
(declare-fun merchant () Int)
(declare-fun h () Int)
(declare-fun status () Status)
(declare-fun status_p () Status)
(declare-fun avail_p () Int)
(declare-fun merchant_p () Int)
(declare-fun held_p () Int)
(assert
 (>= avail 0))
(assert
 (>= held 0))
(assert
 (>= merchant 0))
(assert
 (> h 0))
(assert
 (>= held h))
(assert
 (= status HELD))
(assert
 (let (($x1 (= status_p CAPTURED)))
(let (($x2 (= avail_p avail)))
(let (($x3 (and (= held_p (- held h)) (= merchant_p (+ merchant h)) $x2 $x1)))
(let (($x4 (= status HELD)))
(and $x4 $x3))))))
(check-sat)
