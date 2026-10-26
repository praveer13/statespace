
-- probe: each case's compiled code and observer, the pairs of runs, and the step-3 scenarios

namespace Q1
def compile (amt : Int) : List Instr :=
  [.ldi 0 amt,
   .assertPos 0 .nonPositive,
   .read 1 .a1,
   .assertLe 0 1 .insufficient,
   .sub 1 1 0,
   .write .a1 1,
   .read 3 .a2,
   .add 3 3 0,
   .write .a2 3]

def obs (s : Store) (r : Outcome) : Option Err × Store := (r.err?, view s r)
end Q1

namespace Q2
def compile (amt : Int) : List Instr :=
  [.ldi 0 amt,
   .assertPos 0 .nonPositive,
   .read 1 .a1,
   .sub 2 1 0,
   .writeIf 1 0 .a1 2,
   .read 3 .a2,
   .add 3 3 0,
   .writeIf 1 0 .a2 3]

def obs (s : Store) (r : Outcome) : Store := view s r
end Q2

namespace Q3
def compile (amt : Int) : List Instr :=
  [.ldi 0 amt,
   .assertPos 0 .insufficient,
   .read 1 .a1,
   .assertLe 0 1 .insufficient,
   .sub 2 1 0,
   .write .a1 2,
   .read 3 .a2,
   .add 3 3 0,
   .write .a2 3]

def obs (s : Store) (r : Outcome) : Bool × Store := (r.isAbort, view s r)
end Q3

namespace Q4
def compile (amt : Int) : List Instr :=
  [.ldi 0 amt,
   .read 1 .a1,
   .assertPos 0 .nonPositive,
   .assertLe 0 1 .insufficient,
   .sub 2 1 0,
   .write .a1 2,
   .read 3 .a2,
   .add 3 3 0,
   .write .a2 3]

def obs (s : Store) (r : Outcome) : Option Err × Store := (r.err?, view s r)
end Q4

namespace Q5
def compile (amt : Int) : List Instr :=
  [.ldi 0 amt,
   .assertPos 0 .nonPositive,
   .read 1 .a1,
   .assertLe 0 1 .insufficient,
   .sub 2 1 0,
   .write .a1 2,
   .read 3 .a2,
   .add 3 3 0,
   .write .a2 3]

def obs (s : Store) (r : Outcome) : Option Err × Store := (r.err?, view s r)
end Q5

namespace Q6
def compile (amt : Int) : List Instr :=
  [.ldi 0 amt,
   .assertPos 0 .nonPositive,
   .read 1 .a1,
   .assertLe 0 1 .insufficient,
   .sub 2 1 0,
   .write .a1 2,
   .read 4 .a2,
   .read 3 .a2,
   .write .a2 3]

def obs (s : Store) (r : Outcome) : Option Err × Int := (r.err?, (view s r).1)
end Q6

namespace Q7
def compile (amt : Int) : List Instr :=
  [.ldi 0 amt,
   .assertPos 0 .nonPositive,
   .read 1 .a1,
   .assertLe 0 1 .insufficient,
   .add 2 1 0,
   .write .a1 2,
   .read 3 .a2,
   .sub 3 3 0,
   .write .a2 3]

def obs (s : Store) (r : Outcome) : Option Err × Int := (r.err?, (view s r).1 + (view s r).2)
end Q7

namespace Q8
def compile (amt : Int) : List Instr :=
  [.ldi 0 amt,
   .assertPos 0 .nonPositive,
   .read 1 .a1,
   .assertLe 0 1 .insufficient,
   .sub 2 1 0,
   .write .a1 2,
   .read 3 .a2,
   .add 3 0 3,
   .write .a2 3]

def obs (s : Store) (r : Outcome) : Option Err × Store := (r.err?, view s r)
end Q8

def regs0 : Regs := fun _ => 0

#eval IO.println s!"[p1 store (0, 0) amt 1] source {repr (runS 1 (0, 0))} | compiled {repr (runT (Q1.compile 1) regs0 (0, 0))}"
#eval IO.println s!"[p1 store (0, 0) amt 1] the statement's obs equal: {decide (Q1.obs (0, 0) (runT (Q1.compile 1) regs0 (0, 0)) = Q1.obs (0, 0) (runS 1 (0, 0)))}"
#eval IO.println s!"[p1 store (0, 0) amt 1] outcomes equal: {decide ((runT (Q1.compile 1) regs0 (0, 0)) = (runS 1 (0, 0)))}"
#eval IO.println s!"[p2 store (0, 0) amt 1] source {repr (runS 1 (0, 0))} | compiled {repr (runT (Q2.compile 1) regs0 (0, 0))}"
#eval IO.println s!"[p2 store (0, 0) amt 1] the statement's obs equal: {decide (Q2.obs (0, 0) (runT (Q2.compile 1) regs0 (0, 0)) = Q2.obs (0, 0) (runS 1 (0, 0)))}"
#eval IO.println s!"[p2 store (0, 0) amt 1] outcomes equal: {decide ((runT (Q2.compile 1) regs0 (0, 0)) = (runS 1 (0, 0)))}"
#eval IO.println s!"[p3 store (10, 0) amt 0] source {repr (runS 0 (10, 0))} | compiled {repr (runT (Q3.compile 0) regs0 (10, 0))}"
#eval IO.println s!"[p3 store (10, 0) amt 0] the statement's obs equal: {decide (Q3.obs (10, 0) (runT (Q3.compile 0) regs0 (10, 0)) = Q3.obs (10, 0) (runS 0 (10, 0)))}"
#eval IO.println s!"[p3 store (10, 0) amt 0] outcomes equal: {decide ((runT (Q3.compile 0) regs0 (10, 0)) = (runS 0 (10, 0)))}"
#eval IO.println s!"[p4 store (10, 0) amt 0] source {repr (runS 0 (10, 0))} | compiled {repr (runT (Q4.compile 0) regs0 (10, 0))}"
#eval IO.println s!"[p4 store (10, 0) amt 0] the statement's obs equal: {decide (Q4.obs (10, 0) (runT (Q4.compile 0) regs0 (10, 0)) = Q4.obs (10, 0) (runS 0 (10, 0)))}"
#eval IO.println s!"[p4 store (10, 0) amt 0] outcomes equal: {decide ((runT (Q4.compile 0) regs0 (10, 0)) = (runS 0 (10, 0)))}"
#eval IO.println s!"[p5 store (10, 0) amt 5] source {repr (runS 5 (10, 0))} | compiled {repr (runT (Q5.compile 5) regs0 (10, 0))}"
#eval IO.println s!"[p5 store (10, 0) amt 5] the statement's obs equal: {decide (Q5.obs (10, 0) (runT (Q5.compile 5) regs0 (10, 0)) = Q5.obs (10, 0) (runS 5 (10, 0)))}"
#eval IO.println s!"[p5 store (10, 0) amt 5] outcomes equal: {decide ((runT (Q5.compile 5) regs0 (10, 0)) = (runS 5 (10, 0)))}"
#eval IO.println s!"[p6 store (10, 0) amt 5] source {repr (runS 5 (10, 0))} | compiled {repr (runT (Q6.compile 5) regs0 (10, 0))}"
#eval IO.println s!"[p6 store (10, 0) amt 5] the statement's obs equal: {decide (Q6.obs (10, 0) (runT (Q6.compile 5) regs0 (10, 0)) = Q6.obs (10, 0) (runS 5 (10, 0)))}"
#eval IO.println s!"[p6 store (10, 0) amt 5] outcomes equal: {decide ((runT (Q6.compile 5) regs0 (10, 0)) = (runS 5 (10, 0)))}"

#eval IO.println (if Q1.obs (0, 0) (.commit (0, 0) : Outcome) ≠ Q1.obs (0, 0) (runS 1 (0, 0)) then "[q1 s1] ruled out" else "[q1 s1] not ruled out")
#eval IO.println (if Q1.obs (10, 0) (.commit (5, 5) : Outcome) ≠ Q1.obs (10, 0) (runS 5 (10, 0)) then "[q1 s2] ruled out" else "[q1 s2] not ruled out")
#eval IO.println (if Q1.obs (10, 0) (.commit (10, 0) : Outcome) ≠ Q1.obs (10, 0) (runS 5 (10, 0)) then "[q1 s3] ruled out" else "[q1 s3] not ruled out")
#eval IO.println (if Q1.obs (3, 0) (.abort .insufficient : Outcome) ≠ Q1.obs (3, 0) (runS 5 (3, 0)) then "[q1 s4] ruled out" else "[q1 s4] not ruled out")
#eval IO.println (if Q1.obs (10, 0) (.abort .insufficient : Outcome) ≠ Q1.obs (10, 0) (runS 0 (10, 0)) then "[q1 s5] ruled out" else "[q1 s5] not ruled out")
#eval IO.println (if Q2.obs (0, 0) (.commit (0, 0) : Outcome) ≠ Q2.obs (0, 0) (runS 1 (0, 0)) then "[q2 s1] ruled out" else "[q2 s1] not ruled out")
#eval IO.println (if Q2.obs (10, 0) (.commit (5, 5) : Outcome) ≠ Q2.obs (10, 0) (runS 5 (10, 0)) then "[q2 s2] ruled out" else "[q2 s2] not ruled out")
#eval IO.println (if Q2.obs (10, 0) (.commit (10, 0) : Outcome) ≠ Q2.obs (10, 0) (runS 5 (10, 0)) then "[q2 s3] ruled out" else "[q2 s3] not ruled out")
#eval IO.println (if Q2.obs (3, 0) (.abort .insufficient : Outcome) ≠ Q2.obs (3, 0) (runS 5 (3, 0)) then "[q2 s4] ruled out" else "[q2 s4] not ruled out")
#eval IO.println (if Q2.obs (10, 0) (.abort .insufficient : Outcome) ≠ Q2.obs (10, 0) (runS 0 (10, 0)) then "[q2 s5] ruled out" else "[q2 s5] not ruled out")
#eval IO.println (if Q3.obs (10, 0) (.abort .insufficient : Outcome) ≠ Q3.obs (10, 0) (runS 0 (10, 0)) then "[q3 s1] ruled out" else "[q3 s1] not ruled out")
#eval IO.println (if Q3.obs (10, 0) (.commit (5, 5) : Outcome) ≠ Q3.obs (10, 0) (runS 5 (10, 0)) then "[q3 s2] ruled out" else "[q3 s2] not ruled out")
#eval IO.println (if Q3.obs (3, 0) (.commit (3, 0) : Outcome) ≠ Q3.obs (3, 0) (runS 5 (3, 0)) then "[q3 s3] ruled out" else "[q3 s3] not ruled out")
#eval IO.println (if Q3.obs (3, 0) (.abort .insufficient : Outcome) ≠ Q3.obs (3, 0) (runS 5 (3, 0)) then "[q3 s4] ruled out" else "[q3 s4] not ruled out")
#eval IO.println (if Q4.obs (10, 0) (.abort .insufficient : Outcome) ≠ Q4.obs (10, 0) (runS 0 (10, 0)) then "[q4 s1] ruled out" else "[q4 s1] not ruled out")
#eval IO.println (if Q4.obs (10, 0) (.commit (5, 5) : Outcome) ≠ Q4.obs (10, 0) (runS 5 (10, 0)) then "[q4 s2] ruled out" else "[q4 s2] not ruled out")
#eval IO.println (if Q4.obs (3, 0) (.commit (3, 0) : Outcome) ≠ Q4.obs (3, 0) (runS 5 (3, 0)) then "[q4 s3] ruled out" else "[q4 s3] not ruled out")
#eval IO.println (if Q4.obs (3, 0) (.abort .insufficient : Outcome) ≠ Q4.obs (3, 0) (runS 5 (3, 0)) then "[q4 s4] ruled out" else "[q4 s4] not ruled out")
#eval IO.println (if Q5.obs (10, 0) (.commit (5, 0) : Outcome) ≠ Q5.obs (10, 0) (runS 5 (10, 0)) then "[q5 s1] ruled out" else "[q5 s1] not ruled out")
#eval IO.println (if Q5.obs (10, 0) (.commit (5, 5) : Outcome) ≠ Q5.obs (10, 0) (runS 5 (10, 0)) then "[q5 s2] ruled out" else "[q5 s2] not ruled out")
#eval IO.println (if Q5.obs (10, 0) (.commit (6, 4) : Outcome) ≠ Q5.obs (10, 0) (runS 5 (10, 0)) then "[q5 s3] ruled out" else "[q5 s3] not ruled out")
#eval IO.println (if Q5.obs (3, 0) (.commit (3, 0) : Outcome) ≠ Q5.obs (3, 0) (runS 5 (3, 0)) then "[q5 s4] ruled out" else "[q5 s4] not ruled out")
#eval IO.println (if Q6.obs (10, 0) (.commit (5, 0) : Outcome) ≠ Q6.obs (10, 0) (runS 5 (10, 0)) then "[q6 s1] ruled out" else "[q6 s1] not ruled out")
#eval IO.println (if Q6.obs (10, 0) (.commit (5, 5) : Outcome) ≠ Q6.obs (10, 0) (runS 5 (10, 0)) then "[q6 s2] ruled out" else "[q6 s2] not ruled out")
#eval IO.println (if Q6.obs (10, 0) (.commit (6, 4) : Outcome) ≠ Q6.obs (10, 0) (runS 5 (10, 0)) then "[q6 s3] ruled out" else "[q6 s3] not ruled out")
#eval IO.println (if Q6.obs (3, 0) (.commit (3, 0) : Outcome) ≠ Q6.obs (3, 0) (runS 5 (3, 0)) then "[q6 s4] ruled out" else "[q6 s4] not ruled out")
#eval IO.println s!"[p7 store (10, 0) amt 5] source {repr (runS 5 (10, 0))} | compiled {repr (runT (Q7.compile 5) regs0 (10, 0))}"
#eval IO.println s!"[p7 store (10, 0) amt 5] the statement's obs equal: {decide (Q7.obs (10, 0) (runT (Q7.compile 5) regs0 (10, 0)) = Q7.obs (10, 0) (runS 5 (10, 0)))}"
#eval IO.println s!"[p7 store (10, 0) amt 5] outcomes equal: {decide ((runT (Q7.compile 5) regs0 (10, 0)) = (runS 5 (10, 0)))}"
#eval IO.println s!"[p8 store (10, 0) amt 5] source {repr (runS 5 (10, 0))} | compiled {repr (runT (Q8.compile 5) regs0 (10, 0))}"
#eval IO.println s!"[p8 store (10, 0) amt 5] the statement's obs equal: {decide (Q8.obs (10, 0) (runT (Q8.compile 5) regs0 (10, 0)) = Q8.obs (10, 0) (runS 5 (10, 0)))}"
#eval IO.println s!"[p8 store (10, 0) amt 5] outcomes equal: {decide ((runT (Q8.compile 5) regs0 (10, 0)) = (runS 5 (10, 0)))}"
#eval IO.println (if Q7.obs (10, 0) (.commit (15, -5) : Outcome) ≠ Q7.obs (10, 0) (runS 5 (10, 0)) then "[q7 s1] ruled out" else "[q7 s1] not ruled out")
#eval IO.println (if Q7.obs (10, 0) (.commit (5, 5) : Outcome) ≠ Q7.obs (10, 0) (runS 5 (10, 0)) then "[q7 s2] ruled out" else "[q7 s2] not ruled out")
#eval IO.println (if Q7.obs (10, 0) (.commit (6, 5) : Outcome) ≠ Q7.obs (10, 0) (runS 5 (10, 0)) then "[q7 s3] ruled out" else "[q7 s3] not ruled out")
#eval IO.println (if Q7.obs (3, 0) (.commit (3, 0) : Outcome) ≠ Q7.obs (3, 0) (runS 5 (3, 0)) then "[q7 s4] ruled out" else "[q7 s4] not ruled out")
#eval IO.println (if Q8.obs (10, 0) (.commit (15, -5) : Outcome) ≠ Q8.obs (10, 0) (runS 5 (10, 0)) then "[q8 s1] ruled out" else "[q8 s1] not ruled out")
#eval IO.println (if Q8.obs (10, 0) (.commit (5, 5) : Outcome) ≠ Q8.obs (10, 0) (runS 5 (10, 0)) then "[q8 s2] ruled out" else "[q8 s2] not ruled out")
#eval IO.println (if Q8.obs (10, 0) (.commit (6, 5) : Outcome) ≠ Q8.obs (10, 0) (runS 5 (10, 0)) then "[q8 s3] ruled out" else "[q8 s3] not ruled out")
#eval IO.println (if Q8.obs (3, 0) (.commit (3, 0) : Outcome) ≠ Q8.obs (3, 0) (runS 5 (3, 0)) then "[q8 s4] ruled out" else "[q8 s4] not ruled out")
