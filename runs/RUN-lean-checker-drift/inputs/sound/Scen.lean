
-- Step-3 scenarios: does the theorem speak about this step? `covered` is true when the command and its result meet
-- every hypothesis of this project's step_preserves_inv; `accepted` and `ok` are the shipped checker and evaluator.
instance (c : Cmd) : Decidable (HasType c) := inferInstanceAs (Decidable (typecheck c = none))
def okB : Except String State → Bool | .ok _ => true | .error _ => false
def st (a b c : Int) : State := fun | .a => a | .b => b | .c => c
#eval IO.println s!"[q1 s1] accepted={decide (HasType (.transfer .a .b 5))} ok={okB (exec (.transfer .a .b 5) (st 10 0 0))} covered={decide (HasType (.transfer .a .b 5)) && okB (exec (.transfer .a .b 5) (st 10 0 0))}"
#eval IO.println s!"[q1 s2] accepted={decide (HasType (.transfer .a .a 5))} ok={okB (exec (.transfer .a .a 5) (st 10 0 0))} covered={decide (HasType (.transfer .a .a 5)) && okB (exec (.transfer .a .a 5) (st 10 0 0))}"
#eval IO.println s!"[q1 s3] accepted={decide (HasType (.transfer .a .b 0))} ok={okB (exec (.transfer .a .b 0) (st 10 0 0))} covered={decide (HasType (.transfer .a .b 0)) && okB (exec (.transfer .a .b 0) (st 10 0 0))}"
#eval IO.println s!"[q1 s4] accepted={decide (HasType (.transfer .b .c 3))} ok={okB (exec (.transfer .b .c 3) (st 10 3 0))} covered={decide (HasType (.transfer .b .c 3)) && okB (exec (.transfer .b .c 3) (st 10 3 0))}"
#eval IO.println s!"[q1 s5] accepted={decide (HasType (.transfer .a .b 20))} ok={okB (exec (.transfer .a .b 20) (st 10 0 0))} covered={decide (HasType (.transfer .a .b 20)) && okB (exec (.transfer .a .b 20) (st 10 0 0))}"
