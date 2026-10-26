def exec (p : Program) (c : Call) (s : State) :
    Except Err (State × Output × List Effect) :=
  .error (.guardFailed c.name)
