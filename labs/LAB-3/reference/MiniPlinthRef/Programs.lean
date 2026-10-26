import MiniPlinthRef.Eval
/-!
# MiniPlinthRef.Programs: the reference program and the states the lessons use

Reference module, earns nothing. `refProgram` holds the roadmap's `Transfer` and one command for each other
operation. The goldens call these commands by name.
-/
namespace MiniPlinthRef
open MiniPlinth

/-- `command Transfer(from, to, amount); requires balance(from) >= amount; do move amount from from to to.`
The roadmap's command, with the types the front end infers. -/
def transfer : Cmd :=
  { name   := "Transfer"
    params := [("from", .account), ("to", .account), ("amount", .amount)]
    guard  := .ge (.balance (.var "from")) (.var "amount")
    body   := .op (.move (.var "amount") (.var "from") (.var "to")) }

def deposit : Cmd :=
  { name   := "Deposit"
    params := [("to", .account), ("amount", .amount)]
    guard  := .ge (.lit 0) (.lit 0)
    body   := .op (.deposit (.var "amount") (.var "to")) }

def holdCmd : Cmd :=
  { name   := "Hold"
    params := [("from", .account), ("amount", .amount)]
    guard  := .ge (.balance (.var "from")) (.var "amount")
    body   := .op (.hold (.var "amount") (.var "from")) }

def capture : Cmd :=
  { name   := "Capture"
    params := [("h", .hold), ("to", .account)]
    guard  := .ge (.lit 0) (.lit 0)
    body   := .op (.capture (.var "h") (.var "to")) }

def release : Cmd :=
  { name   := "Release"
    params := [("h", .hold)]
    guard  := .ge (.lit 0) (.lit 0)
    body   := .op (.release (.var "h")) }

def freeze : Cmd :=
  { name   := "Freeze"
    params := [("a", .account)]
    guard  := .not (.frozen (.var "a"))
    body   := .set "frozen" (.var "a") (.not (.frozen (.var "a"))) }

def refProgram : Program := [transfer, deposit, holdCmd, capture, release, freeze]

def a : Acct := .user "a"
def b : Acct := .user "b"

/-- mint -100 · a 100 · b 0 -/
def s0 : State := { bals := [(.mint, -100), (a, 100), (b, 0)] }

/-- mint -100 · a 70 · b 30 -/
def s1 : State := { bals := [(.mint, -100), (a, 70), (b, 30)] }

/-- `Transfer(a, b, 30)` -/
def transferCall : Call := ⟨"Transfer", [.acct a, .acct b, .int 30]⟩

end MiniPlinthRef
