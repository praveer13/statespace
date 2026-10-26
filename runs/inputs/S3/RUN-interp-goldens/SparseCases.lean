inductive V where
  | i (n : Int)
  | b (x : Bool)

def wildcard (o : Option V) : Option V :=
  match o with
  | some (.i n) => some (.i (-n))
  | _ => none

set_option backward.match.sparseCases false in
def wildcardNoSparse (o : Option V) : Option V :=
  match o with
  | some (.i n) => some (.i (-n))
  | _ => none

#print axioms wildcard
#print axioms wildcardNoSparse
