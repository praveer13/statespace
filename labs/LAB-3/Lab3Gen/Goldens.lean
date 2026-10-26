import Lab3.Eval
/-!
# Lab3Gen.Goldens: the evaluator goldens (generated)

`statespace check lab3.3` and `lab3.7` write this module from `challenge/goldens.json` in a scratch copy of
the lab, with one literal and one theorem per golden. This empty copy lets `lake exe export-ir` build here.
-/
namespace Lab3Gen
open MiniPlinth

def refProgram : Lab3.Program := []

def goldenData : List GoldenRec := []

end Lab3Gen
