
-- Step-3 scenarios: does the operation keep every unit of money? kept compares the total before and after.
def keptB (f t a : Int) : Bool := decide ((pay f t a).1 + (pay f t a).2 = f + t)
#eval IO.println s!"[q2 s1 pay 30 0 50] returns {(pay 30 0 50)} kept={keptB 30 0 50}"
#eval IO.println s!"[q2 s2 pay 30 0 20] returns {(pay 30 0 20)} kept={keptB 30 0 20}"
#eval IO.println s!"[q2 s3 pay 30 0 30] returns {(pay 30 0 30)} kept={keptB 30 0 30}"
#eval IO.println s!"[q2 s4 pay 0 5 1] returns {(pay 0 5 1)} kept={keptB 0 5 1}"
