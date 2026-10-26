import Lab3.Syntax
/-!
# Lab3.Typing: your type checker (LAB-3.2)

`HasType c` is `typecheck c = .ok ()`: a checking function, so every typing golden is decided by `decide`,
and a rejection names the rule it breaks (curriculum/S03-semantics.md section 2.2):

| Rule | Requires | Rejection |
|---|---|---|
| R-param | distinct parameter names | `dupParam` |
| R-var | every variable is a parameter | `unknownParam` |
| R-expr | `balance(e)` and `frozen(e)` take an account; `+`, `-` and `>=` take numbers (`int` or `amount`); `&&` and `!` take bools; the guard is a `bool` | `wrongType` |
| R-amount | an operation's amount is an `amount` parameter or a positive literal | `nonPositive` |
| R-cover | `move n from x to y` and `hold n on x` need a top-level guard conjunct `balance(x) >= n` | `unguardedDebit` |
| R-set | `set f(x) := e` needs the scalar field `frozen` (a bool); `balance` has no assignment rule | `assignsResource` |
| R-hold | `capture h to y` and `release h` need `h : hold` and `y : account` | `wrongType` |

Check them in this order, and report the first that fails: R-param, then the guard, then the statement
from left to right. A field that is neither `balance` nor `frozen` is `wrongType`. The typing goldens hold an
accepted command and a rejection for every rule, so a checker that rejects everything fails them.
-/
namespace Lab3
open MiniPlinth

/-- `covers g x n`: some top-level conjunct of `g` is `balance(x) >= n`. A disjunction never covers. -/
def covers (_g _x _n : Expr) : Bool :=
  false  -- TODO(you)

def Covers (g x n : Expr) : Prop := covers g x n = true

/-- The type checker. -/
def typecheck (_c : Cmd) : Except TypeErr Unit :=
  .ok ()  -- TODO(you): the rules above, in order

end Lab3
