def fastImpl (n : Nat) : Nat := n + 1
@[implemented_by fastImpl] def spec (n : Nat) : Nat := n
theorem spec_id (n : Nat) : spec n = n := rfl
#print axioms spec_id
#eval spec 3
-- autoImplicit: the Main sheet's font specimen `theorem conserve (s : State) : total (transfer s a b n) = total s`
structure State where bal : Nat → Int
def transfer (s : State) (a b : Nat) (n : Int) : State := s
def total (s : State) : Int := s.bal 0
theorem conserve (s : State) : total (transfer s a b n) = total s := rfl
#check @conserve
set_option autoImplicit false in
theorem conserve' (s : State) : total (transfer s a b n) = total s := rfl
