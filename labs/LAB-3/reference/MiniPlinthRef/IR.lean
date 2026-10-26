import MiniPlinth.IR
import MiniPlinthRef.Programs
/-! # MiniPlinthRef.IR: JSON for the reference's syntax. Reference module, earns nothing. -/
namespace MiniPlinthRef.IR
open Lean (Json)
open MiniPlinth MiniPlinth.IR MiniPlinthRef

def resourceOp : ResourceOp → Json
  | .deposit n a => tagged "deposit" [("amount", expr n), ("to", expr a)]
  | .move n x y => tagged "move" [("amount", expr n), ("from", expr x), ("to", expr y)]
  | .hold n x => tagged "hold" [("amount", expr n), ("on", expr x)]
  | .capture h y => tagged "capture" [("hold", expr h), ("to", expr y)]
  | .release h => tagged "release" [("hold", expr h)]

def stmt : Stmt → Json
  | .op r => tagged "op" [("op", resourceOp r)]
  | .set f x e => tagged "set" [("field", Json.str f), ("target", expr x), ("value", expr e)]

def cmd (c : Cmd) : Json :=
  Json.mkObj [("name", Json.str c.name),
    ("params", Json.arr (c.params.map (fun (p, t) => Json.mkObj [("name", Json.str p), ("ty", ty t)])).toArray),
    ("guard", expr c.guard), ("body", stmt c.body)]

def program (p : Program) : Json := Json.mkObj [("commands", Json.arr (p.map cmd).toArray)]

end MiniPlinthRef.IR
