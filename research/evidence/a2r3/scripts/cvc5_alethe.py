"""Does cvc5 emit an Alethe certificate for the Course 01 guard query (C1.1)?"""
import cvc5
from cvc5 import Kind

tm = cvc5.TermManager()
s = cvc5.Solver(tm)
s.setOption("produce-proofs", "true")
s.setOption("proof-format-mode", "alethe")
s.setLogic("QF_LIA")
I = tm.getIntegerSort()
a, b, amt = tm.mkConst(I, "a"), tm.mkConst(I, "b"), tm.mkConst(I, "amount")
zero = tm.mkInteger(0)
for t in [tm.mkTerm(Kind.GEQ, a, zero), tm.mkTerm(Kind.GEQ, b, zero), tm.mkTerm(Kind.GT, amt, zero),
          tm.mkTerm(Kind.LEQ, amt, a), tm.mkTerm(Kind.LT, tm.mkTerm(Kind.SUB, a, amt), zero)]:
    s.assertFormula(t)
r = s.checkSat()
print("cvc5", s.getVersion(), "->", r)
if r.isUnsat():
    pf = s.getProof()
    text = s.proofToString(pf[0]) if pf else ""
    text = text.decode() if isinstance(text, bytes) else text
    lines = text.strip().splitlines()
    print(f"Alethe proof: {len(lines)} lines; first lines:")
    print("\n".join(lines[:8]))
    print("steps:", sum(1 for l in lines if "(step " in l), "| hole steps:", sum(1 for l in lines if ":rule hole" in l))
    open("cvc5_guard.alethe","w").write(text)
