"""The Z3 lane: its verdict-line grammar against the captured fixture set, its reading of output and
models, and live runs through both entries under an rlimit."""

from __future__ import annotations

import json
import re
import subprocess
import tempfile
import unittest
from fractions import Fraction
from pathlib import Path

from statespace.check.lanes import RunView, lane_for
from statespace.lanes import z3 as lane
from statespace.schema.statement_hash import statement_hash_text, statement_preimage

from .support import FIXTURES, GUARD, STARTER, Z3

FIXTURE = json.loads((FIXTURES / "z3-verdict-lines.json").read_text(encoding="utf-8"))


class Grammar(unittest.TestCase):
    def test_captured_cases_read_as_the_fixture_states(self) -> None:
        self.assertGreaterEqual(len(FIXTURE["cases"]), 13)
        for case in FIXTURE["cases"]:
            with self.subTest(case["id"]):
                out = lane.read_output(case["output"])
                self.assertEqual(list(out.verdict_lines), case["expect"]["verdictLines"])
                # The model is the last block after sat that reads as one; the fixture names its constants.
                read = None if out.model_text is None else sorted(lane.parse_model(out.model_text).constants)
                self.assertEqual(read, case["expect"]["model"])
                if not case["expect"]["verdictLines"]:
                    self.assertIsNone(case["expect"]["verdict"], "output with no verdict line carries no verdict")
                    continue
                derived = lane.derive_verdict(out.verdict_lines)
                self.assertEqual(derived.verdict, case["expect"]["verdict"])
                self.assertEqual(derived.reason, case["expect"]["reason"])
                self.assertEqual(derived.problems, ())

    def test_synthetic_cases_read_as_the_fixture_states(self) -> None:
        for case in FIXTURE["synthetic"]:
            with self.subTest(case["id"]):
                derived = lane.derive_verdict(case["verdictLines"])
                self.assertEqual(derived.verdict, case["verdict"])
                if "reason" in case:
                    self.assertEqual(derived.reason, case["reason"])
                self.assertEqual(bool(derived.problems), case["verdict"] is None)

    def test_exit_code_is_never_read(self) -> None:
        # The captured error-then-sat case exits 1 and prints sat; the verdict is error from the lines alone.
        case = next(c for c in FIXTURE["cases"] if c["id"] == "cli-error-then-sat")
        self.assertEqual(case["exitCode"], 1)
        self.assertIn("sat", case["output"].splitlines())
        self.assertEqual(lane.derive_verdict(lane.read_output(case["output"]).verdict_lines).verdict, "error")
        # And an unsat after which a model was asked for keeps its answer although Z3 exits 1.
        case = next(c for c in FIXTURE["cases"] if c["id"] == "cli-model-asked-after-unsat")
        self.assertEqual(case["exitCode"], 1)
        self.assertEqual(lane.derive_verdict(lane.read_output(case["output"]).verdict_lines).verdict, "unsat")

    def test_rlimit_range_is_zs_own(self) -> None:
        case = next(c for c in FIXTURE["cases"] if c["id"] == "cli-rlimit-too-large")
        self.assertIn(f"rlimit={lane.MAX_RLIMIT + 1}", case["argv"])
        self.assertIn("unsigned int parameter 'rlimit'", case["output"])

    def test_fixture_was_captured_from_the_pinned_engine(self) -> None:
        from statespace.doctor import PINS

        captured = FIXTURE["captured"]
        self.assertEqual(captured["version"], "5.3.1")
        self.assertEqual(captured["binary_sha256"], PINS["z3-cli"].sha256)
        self.assertEqual(captured["library_sha256"], PINS["z3"].sha256)
        for case in FIXTURE["cases"]:
            self.assertNotIn("/", case["argv"][-1], "the input is named by file name only")

    def test_the_fixture_is_a_recorded_run(self) -> None:
        # RUN-z3-verdict-lines records the execution the fixture was written from: the fixture is one of its
        # outputs, byte for byte, and its queries are the cases' inputs.
        import hashlib

        from statespace.schema import validate

        from .support import REPO

        record = json.loads((REPO / "runs" / f"{FIXTURE['captured']['run']}.json").read_text(encoding="utf-8"))
        self.assertEqual(validate("run", record), [])
        fixture = FIXTURES / "z3-verdict-lines.json"
        listed = {o["path"]: o["sha256"] for o in record["outputs"]}
        self.assertEqual(listed["bench/statespace/check/fixtures/z3-verdict-lines.json"], hashlib.sha256(fixture.read_bytes()).hexdigest(), "capture again: the fixture is no longer the recorded output")
        queries = {i["path"].rsplit("/", 1)[-1]: i["sha256"] for i in record["inputs"] if i.get("role") == "query"}
        for case in FIXTURE["cases"]:
            self.assertEqual(queries[case["argv"][-1]], hashlib.sha256(case["input"].encode("utf-8")).hexdigest())
        self.assertEqual(record["argv"], [case["argv"] for case in FIXTURE["cases"]])
        self.assertEqual(record["values"]["cases"]["cli-error-then-sat"]["exit_code"], 1)

    def test_lane_is_discovered_for_its_engine(self) -> None:
        self.assertIs(lane_for("z3"), lane)
        self.assertIsNone(lane_for("no-such-engine"))


class Reading(unittest.TestCase):
    def test_model_and_values(self) -> None:
        case = next(c for c in FIXTURE["cases"] if c["id"] == "cli-bitvector-model")
        out = lane.read_output(case["output"])
        assert out.model_text is not None
        model = lane.parse_model(out.model_text)
        self.assertEqual(model.sorts["b"], "(_ BitVec 64)")
        b, m = model.value("b"), model.value("m")
        assert isinstance(b, lane.BitVec) and isinstance(m, lane.BitVec)
        self.assertEqual(b.width, 64)
        self.assertGreaterEqual(b.signed, 0)
        self.assertGreater(m.signed, 0)
        self.assertLess(lane.BitVec((b.value + m.value) % (1 << 64), 64).signed, 0, "the captured witness wraps")

    def test_term_values(self) -> None:
        self.assertEqual(lane.term_value("42"), 42)
        self.assertEqual(lane.term_value("(- 7)"), -7)
        self.assertEqual(lane.term_value("(/ 1 2)"), Fraction(1, 2))
        self.assertEqual(lane.term_value("(- (/ 3 4))"), Fraction(-3, 4))
        self.assertEqual(lane.term_value("1.5"), Fraction(3, 2))
        self.assertIs(lane.term_value("true"), True)
        self.assertEqual(lane.term_value("#xff"), lane.BitVec(255, 8))
        self.assertEqual(lane.term_value("#b101"), lane.BitVec(5, 3))
        self.assertEqual(lane.term_value("(_ bv9 64)"), lane.BitVec(9, 64))
        self.assertEqual(lane.BitVec(0xFFFFFFFFFFFFFFFF, 64).signed, -1)
        self.assertIsNone(lane.term_value("((as const (Array Int Int)) 2)"))
        self.assertIsNone(lane.term_value("(unbalanced"))

    def test_quoted_symbols_and_functions_in_models(self) -> None:
        model = lane.parse_model('(\n  (define-fun |odd name| () Int\n    3)\n  (define-fun f ((x!0 Int)) Int\n    (ite (= x!0 1) 2 0))\n)')
        self.assertEqual(model.constants, {"odd name": "3"})
        self.assertIn("f", model.functions)

    def test_other_output_is_not_a_verdict(self) -> None:
        # In the order z3 -smt2 -model prints them: success after each command before the question under
        # (set-option :print-success true), the answer, the model (get-model) prints, the values of (get-value (a)),
        # the reason (get-info :reason-unknown) gives after sat, and last the model -model prints.
        model = "(\n  (define-fun amount () Int\n    1)\n  (define-fun a () Int\n    0)\n)"
        text = "success\nsuccess\nsuccess\nsat\n" + model + '\n((a 0))\n(:reason-unknown "")\n' + model + "\n"
        out = lane.read_output(text)
        self.assertEqual(out.verdict_lines, ("sat",))
        self.assertEqual(out.model_text, model)
        self.assertEqual(out.other, ("success", "success", "success", *model.splitlines(), "((a 0))"), "the model printed first is other output")

    def test_the_model_is_the_last_block_that_reads_as_one(self) -> None:
        # The verifier's case, captured: -model prints the model after the output of every other command, (exit)
        # included, so the model of (get-model), the values of (get-value (a b amount)), the term of
        # (eval (- a amount)) and the empty list of (get-assignment) come first. On a starter that asks for values,
        # the cli entry once read the first block as the model, which then had no constants, and a witness check
        # failed on a correct starter.
        case = next(c for c in FIXTURE["cases"] if c["id"] == "cli-get-value-after-sat")
        out = lane.read_output(case["output"])
        assert out.model_text is not None
        model = lane.parse_model(out.model_text)
        a, b, amount = (model.value(name) for name in ("a", "b", "amount"))
        assert isinstance(a, int) and isinstance(b, int) and isinstance(amount, int)
        self.assertTrue(a >= 0 and b >= 0 and amount > 0 and a - amount < 0, "the witness replays")
        self.assertEqual(out.model_text.splitlines()[-1], case["output"].splitlines()[-1], "the last block")
        self.assertTrue(out.other, "the values and the term are other output")
        # What other commands print, each in the place Z3 prints it; a sort's universe; and, without -model, the
        # model (get-model) prints before an empty (get-assignment) or a list of quantified assertions.
        two = "(\n  (define-fun amount () Int\n    1)\n  (define-fun a () Int\n    0)\n)"
        universe = "(\n  ;; universe for U:\n  ;;   U!val!0 \n  ;; -----------\n  ;; definitions for universe elements:\n  (declare-fun U!val!0 () U)\n  ;; cardinality constraint:\n  (forall ((x U)) (= x U!val!0))\n  ;; -----------\n  (define-fun x () U\n    U!val!0)\n)"
        for text, constants in (
            ("sat\n(- 1)\n" + two, ["a", "amount"]),  # (eval (- a amount))
            ('sat\n(:version "5.3.1")\n' + two, ["a", "amount"]),  # (get-info :version)
            ("sat\n((nonneg true))\n" + two, ["a", "amount"]),  # (get-assignment)
            ("sat\n()\n" + two, ["a", "amount"]),  # (get-assignment) with nothing named
            ("sat\n(:arith-lower         1\n :memory              18.22)\n" + two, ["a", "amount"]),  # (get-info :all-statistics)
            ("sat\n((x U!val!0))\n" + universe, ["x"]),  # (get-value (x)) of an uninterpreted sort
            ("sat\n" + two + "\n()\n", ["a", "amount"]),
            ("sat\n" + two + "\n((forall ((y Int)) (> (* y y) (- 1))))\n", ["a", "amount"]),
            ("sat\n(\n  (define-fun a () Int\n    0)\n)\n" + two, ["a", "amount"]),  # of two models, the last
            ("sat\n" + two + "\n(\n  (define-fun a () Int\n    0)\n)\n", ["a"]),
            ("sat\n()\n(\n)\n", []),  # an empty model, after an empty (get-assignment)
            ("sat\n((a 0))\n", None),  # values and no model
            ("sat\n(model\n  (define-fun a () Int\n    0)\n)\n", ["a"]),  # the header older Z3 printed
            ("unsat\n(a b)\n", None),  # an unsat core
            ("unknown\n" + two + "\n", None),  # a model after unknown is not read
        ):
            with self.subTest(text):
                out = lane.read_output(text)
                self.assertEqual(None if out.model_text is None else sorted(lane.parse_model(out.model_text).constants), constants)

    def test_scripts_that_cannot_be_one_run_are_refused(self) -> None:
        with self.assertRaisesRegex(lane.ScriptRefused, "no question"):
            lane.check_script("(declare-const a Int)")
        with self.assertRaisesRegex(lane.ScriptRefused, "2 questions"):
            lane.check_script("(check-sat)(check-sat)")
        with self.assertRaisesRegex(lane.ScriptRefused, "2 questions"):
            lane.check_script("(check-sat)(check-sat-assuming (p))")
        with self.assertRaisesRegex(lane.ScriptRefused, "echo"):
            lane.check_script('(echo "sat")(check-sat)')
        lane.check_script("(check-sat) ; (check-sat) in a comment")
        lane.check_script('(assert (= "(check-sat)" "x"))(check-sat)')
        with self.assertRaisesRegex(lane.ScriptRefused, "cannot be read as SMT-LIB"):
            lane.check_script("(assert (> a 0)")  # does not parse: Z3 would run what it read before the fault

    def test_a_script_the_lane_cannot_read_is_refused(self) -> None:
        # Z3 runs every command before a fault, so a script the lane cannot read could hide what the rules
        # forbid: each of these gave an answer through the cli entry when the lane let them through.
        refused = {
            '(declare-const x Int)(assert (> x 0))(echo "unsat")(exit))': "a \\) closes nothing",
            '(declare-const x Int)(assert (> x 0))(echo "unsat")(exit)(': "a \\( is not closed",
            '(declare-const x Int)(echo "unsat")(check-sat-assuming (q))(': "a \\( is not closed",
            "(declare-const x Int)(assert (> x 0))(check-sat)(assert false)(": "a \\( is not closed",
            "(set-option :rlimit 0)(declare-const x Int)(declare-const y Int)(declare-const z Int)(assert (> x 0))(assert (> y 0))(assert (> z 0))(assert (= (+ (* x x x) (* y y y)) (* z z z)))(check-sat)(": "a \\( is not closed",
            # Z3 skips a #| block comment to the first |#, which hid this echo from a reader of quoted symbols.
            '#| a | b |# (echo "unsat") | (check-sat)': "block comment",
            "(declare-const x Int)(assert (> x 0))(check-sat) #| a comment |#": "block comment",
            "(declare-const abc#|x|# Int)(check-sat)": "block comment",
            '(declare-const s String)(assert (= s "a"))#|x|#(check-sat)': "block comment",
            # Z3 reports a backslash in a quoted symbol and reads on from it, where this reader would not.
            "(declare-const |a\\| x |)(echo \"unsat\")(check-sat)| )(check-sat)": "backslash",
            '(declare-const s String)(assert (= s "x))(check-sat)': "string is not terminated",
            "(declare-const |x Int)(check-sat)": "quoted symbol\\| is not terminated",
        }
        for script, why in refused.items():
            with self.subTest(script), self.assertRaisesRegex(lane.ScriptRefused, f"cannot be read as SMT-LIB.*{why}"):
                lane.check_script(script)
        # What Z3 reads as SMT-LIB 2.6 reads the same here: a backslash in a string is a plain character, and
        # #| or |# inside a string, a quoted symbol or a ; comment is text.
        for script in (
            '(declare-const s String)(assert (= s "x\\"))(check-sat)',
            '(declare-const s String)(assert (= s "#| not a comment |#"))(check-sat)',
            "(declare-const |a#| Int)(declare-const |#b| Int)(check-sat)",
            "; #| not a comment\n(declare-const x (_ BitVec 8))(assert (= x #xff))(check-sat)",
        ):
            with self.subTest(script):
                lane.check_script(script)

    def test_a_script_only_sets_up_its_question_before_it(self) -> None:
        refused = {
            "(declare-const x Int)(assert false)(exit)(check-sat)": "exits before",
            "(declare-const x Int)(get-model)(check-sat)": "reads an answer the script has not asked for",
            "(get-info :reason-unknown)(check-sat)": "reads an answer the script has not asked for",
            "(declare-const sat Bool)(simplify sat)(check-sat-assuming (q))": "could read as an answer",
            "(declare-const x Int)(eval x)(check-sat)": "could read as an answer",
            "(declare-const x Int)(minimize x)(check-sat)": "not part of a satisfiability question",
            "(declare-rel r ())(rule r)(check-sat)": "not part of a satisfiability question",
            "(declare-const x Int)(check-sat-using smt)": "check-sat-using",
            "(declare-const p Bool)(check-sat-assuming p)": "one list of literals",
            "(declare-const p Bool)(check-sat-assuming (p) (p))": "one list of literals",
        }
        for script, why in refused.items():
            with self.subTest(script), self.assertRaisesRegex(lane.ScriptRefused, why):
                lane.check_script(script)
        for script in (
            "(set-logic QF_LIA)(set-option :produce-models true)(set-info :status sat)(declare-const x Int)(define-fun y () Int (+ x 1))(push 1)(assert false)(pop 1)(assert (> y 0))(check-sat)",
            "(declare-datatypes ((C 0)) (((red) (green))))(declare-const c C)(reset-assertions)(assert (not (= c red)))(check-sat)",
            "(declare-const x Int)(assert false)(reset)(declare-const y Int)(check-sat)",
        ):
            with self.subTest(script):
                lane.check_script(script)

    def test_every_top_level_form_is_a_command(self) -> None:
        # Solver.from_string reads a text that starts "p c" as DIMACS: the api entry answered unsat to these
        # clauses, where the z3 command reports an error and answers sat to the (check-sat) after them. Any
        # other form outside a command is an error to Z3, so a run allows none.
        refused = {
            "p cnf 1 2\n1 0\n-1 0\n(check-sat)\n": "has p at line 1, column 1, which is not a command",
            "foo (declare-const x Int)(check-sat)": "has foo at line 1, column 1, which is not a command",
            "(declare-const x Int)\n(check-sat) foo": "has foo at line 2, column 13",
            "()(check-sat)": "has \\(\\) at line 1, column 1",
            "((assert false))(check-sat)": "has \\(\\(assert false\\)\\) at line 1",
            '(declare-const x Int)"text"(check-sat)': 'has "text" at line 1, column 22',
            # Characters Z3 reads as unexpected, which print as nothing, are named by their code point.
            "\ufeff(declare-const x Int)(check-sat)": "starts with a byte order mark \\(U\\+FEFF\\)",
            "(declare-const x Int)\n\x0c(assert (> x 0))(check-sat)": "has U\\+000C at line 2, column 1",
            "(declare-const x Int)\n\x0b(check-sat)": "has U\\+000B at line 2, column 1",
        }
        for script, why in refused.items():
            with self.subTest(script), self.assertRaisesRegex(lane.ScriptRefused, why):
                lane.check_script(script)

    def test_an_annotation_in_the_question_is_refused(self) -> None:
        # parse_smt2_string, which reads the api entry's assumptions, returns a named assumption under unsat cores
        # as (=> name formula): the api entry answered sat to each of the first eight, which the z3 command
        # answers unsat. Z3 reads |!| as ! and |let| as let, so the bars are removed before comparing.
        cores = "(set-option :produce-unsat-cores true)(declare-const p Bool)(assert (not p))"
        refused = {
            cores + "(check-sat-assuming ((! p :named q)))": ("check-sat-assuming", "(! p :named q)"),
            cores + "(check-sat (! p :named q))": ("check-sat", "(! p :named q)"),
            cores + "(check-sat-assuming ((let ((y p)) (! y :named q))))": ("check-sat-assuming", "(! y :named q)"),
            cores + "(check-sat-assuming ((|!| p :named q)))": ("check-sat-assuming", "(|!| p :named q)"),
            cores + "(check-sat-assuming ((|let| ((y p)) (|!| y :named q))))": ("check-sat-assuming", "(|!| y :named q)"),
            "(set-option :unsat_core true)(declare-const p Bool)(assert (not p))(check-sat-assuming ((! p :named q)))": ("check-sat-assuming", "(! p :named q)"),
            "(set-option :produce-unsat-cores true)(declare-const amount Int)(define-fun MAX_TRANSFER () Int 0)(assert (> amount 0))(check-sat-assuming ((! (<= amount MAX_TRANSFER) :named under-max)))(get-unsat-core)": ("check-sat-assuming", "(! (<= amount MAX_TRANSFER) :named under-max)"),
            "(set-option :produce-unsat-cores true)(declare-const amount Int)(check-sat-assuming ((> amount 5) (! (> amount 0) :named pos) (! (<= amount 0) :named neg)))": ("check-sat-assuming", "(! (> amount 0) :named pos)"),
            # Nested, with unsat cores off, or another attribute: one rule, so no option or spelling slips past it.
            cores + "(check-sat-assuming ((not (! p :named q))))": ("check-sat-assuming", "(! p :named q)"),
            "(declare-const p Bool)(assert (not p))(check-sat-assuming ((! p :named q)))": ("check-sat-assuming", "(! p :named q)"),
            "(declare-const p Bool)(check-sat-assuming ((! p :lblpos L)))": ("check-sat-assuming", "(! p :lblpos L)"),
            "(declare-fun f (Int) Int)(check-sat-assuming ((forall ((x Int)) (! (> (f x) 0) :pattern ((f x))))))": ("check-sat-assuming", "(! (> (f x) 0) :pattern ((f x)))"),
        }
        for script, (question, annotation) in refused.items():
            with self.subTest(script), self.assertRaisesRegex(lane.ScriptRefused, re.escape(f"({question} ...) holds the annotation {annotation}; a question holds none")):
                lane.check_script(script)
        # Annotations before the question, the names they define, what the refusal suggests instead, and a symbol
        # or a string that only holds a ! are not annotations in the question.
        for script in (
            cores + "(assert (! (not p) :named n))(check-sat-assuming (n))",
            cores + "(assert (! p :named n))(check-sat-assuming ((not n)))",
            "(set-option :produce-unsat-cores true)(declare-const amount Int)(assert (> amount 0))(declare-const under-max Bool)(assert (=> under-max (<= amount 0)))(check-sat-assuming (under-max))(get-unsat-core)",
            "(declare-const |! p| Bool)(check-sat-assuming (|! p| (not |!q|)))",
            '(declare-const s String)(assert (= s "(! p :named q)"))(check-sat)',
            "(declare-const x Int)(check-sat-assuming ((> x 5) (not (= x 7))))",
        ):
            with self.subTest(script):
                lane.check_script(script)

    def test_a_command_name_is_shown_as_it_is_spelled(self) -> None:
        # A character that prints as nothing, glued to a command's name, is shown by its code point, so the message
        # does not seem to refuse (assert ...) itself.
        with self.assertRaisesRegex(lane.ScriptRefused, re.escape("(assertU+000B ...) is not part of a satisfiability question")):
            lane.check_script("(declare-const x Int)\n(assert (> x 0))\n(assert\x0b(< x 0))\n(check-sat)\n")
        with self.assertRaisesRegex(lane.ScriptRefused, re.escape("(get-modelU+000C ...) comes after the question")):
            lane.check_script("(declare-const x Int)\n(check-sat)\n(get-model\x0c)\n")

    def test_a_nul_character_is_refused(self) -> None:
        # Solver.from_string takes a C string and reads a script only up to its first NUL, while the z3 command
        # reads past it: the first script is unsat through the command line and was sat through the api entry.
        for script, where in (
            ("(declare-const x Int)\n(assert (> x 0))\n; note \x00 here\n(assert (< x 0))\n(check-sat)\n", "line 3, column 8"),
            ('(declare-const x Int)(set-info :source "a\x00b")(check-sat)', "line 1, column 42"),
            ("(declare-const |a\x00b| Int)(check-sat)", "line 1, column 18"),
            ("(declare-const x Int)(check-sat)(get-model) ; \x00", "line 1, column 47"),
        ):
            with self.subTest(script), self.assertRaisesRegex(lane.ScriptRefused, f"NUL character \\(U\\+0000\\) at {where}"):
                lane.check_script(script)

    def test_line_ends_are_read_as_z3_reads_them(self) -> None:
        # Z3 ends a ; comment only at \n, reads \r elsewhere as a space, and keeps it inside a string or a quoted
        # symbol; so does the lane, and the api entry reads the same bytes (LiveRuns), so none is refused.
        for script in (
            "(declare-const x Int)\r\n(assert (> x 0))\r\n; a CRLF file\r\n(check-sat)\r\n",
            "(declare-const x Int)\n(assert (> x 0))\n; note\r(assert (< x 0))\n(check-sat)\n",
            '(declare-const s String)\n(assert (= s "a\rb"))\n(declare-const |c\rd| Int)\n(check-sat)\n',
            "(declare-const x Int)\n; note\u2028(assert false)\n; and\x85(assert false)\n(check-sat)\n",
        ):
            with self.subTest(script):
                lane.check_script(script)
        # A bare \r does not end the comment, so the (check-sat) after it is part of the comment.
        with self.assertRaisesRegex(lane.ScriptRefused, "no question"):
            lane.check_script("(declare-const x Int)\n(assert (> x 0)) ; c\r(check-sat)\n")
        # The api entry's prefix is the text before the question, byte for byte.
        self.assertEqual(lane.question_parts("(declare-const x Int)\r\n; c\r(assert false)\r\n(check-sat)\r\n"), ("(declare-const x Int)\r\n; c\r(assert false)\r\n", []))

    def test_a_script_only_reads_the_answer_after_its_question(self) -> None:
        for after in ("(assert false)", "(declare-const y Int)", "(define-fun z () Int 1)", "(push 1)", "(pop 1)", "(reset)", "(reset-assertions)", "(set-option :produce-models true)", "(apply smt)"):
            with self.subTest(after), self.assertRaisesRegex(lane.ScriptRefused, "after the question"):
                lane.check_script(f"(declare-const x Int)(push 1)(assert (> x 0))(check-sat){after}")
        lane.check_script("(declare-const x Int)(assert (! (> x 0) :named a))(check-sat)(get-model)(get-value (x))(get-unsat-core)(get-info :reason-unknown)(eval x)(set-info :status sat)(exit)")
        # A fault after the question hides what follows it from the rules as well: (check-sat)(assert false)
        # followed by ( answered sat through the command line when it was let through.
        for script in ("(declare-const x Int)(check-sat)(get-value (x)", "(declare-const x Int)(check-sat)(assert false)("):
            with self.subTest(script), self.assertRaisesRegex(lane.ScriptRefused, "cannot be read as SMT-LIB"):
                lane.check_script(script)

    def test_a_script_never_sets_its_own_budget(self) -> None:
        # Z3 lets a script's :rlimit replace the command line's, in any case and in any form of value, so
        # (set-option :rlimit 0) would run unbounded under a receipt that records the lane's rlimit.
        for option in (
            ":rlimit 0",
            ":RLIMIT 0",
            ':Rlimit "0"',
            ":rlimit 4000000000",
            ":opt.rlimit 0",
            ":timeout 1000",
            ":solver.timeout 5",
            ":combined_solver.solver2_timeout 5",
            ":memory_max_size 10",
            ":memory-max-size 10",
            ":memory_high_watermark 10",
            ":sat.max_memory 10",
        ):
            with self.subTest(option), self.assertRaisesRegex(lane.ScriptRefused, "budget"):
                lane.check_script(f"(set-option {option})(declare-const x Int)(check-sat)")
        for option in (':regular-output-channel "x.txt"', ':diagnostic-output-channel "stdout"'):
            with self.subTest(option), self.assertRaisesRegex(lane.ScriptRefused, "elsewhere.*statespace reads the verdict"):
                lane.check_script(f"(set-option {option})(check-sat)")
        for option in (":smt.max_conflicts 100", ":rewriter.max_steps 100", ":random-seed 3", ":smt.random_seed 3", ":produce-unsat-cores true", ":print-success true"):
            with self.subTest(option):
                lane.check_script(f"(set-option {option})(declare-const x Int)(check-sat)")

    def test_a_script_keeps_its_model_on_and_readable(self) -> None:
        # A check reads its witness from the model a run prints. With models off the command line prints none (case
        # cli-produce-models-off), and under :model.v1 it prints the model as a string (case cli-model-v1-text),
        # while the api entry prints its solver's model itself. Z3 reads |false| as false, and option names in
        # any case.
        for option, why in (
            (":produce-models false", "sets :produce-models to false, which turns models off"),
            (":produce-models |false|", "sets :produce-models to |false|, which turns models off"),
            (":model false", "sets :model to false, which turns models off"),
            (':model "false"', 'sets :model to "false", which turns models off'),
            (":produce-models", "sets :produce-models to no value, which turns models off"),
            (":model.v1 true", "sets :model.v1 to true, which prints the model as text"),
            (":MODEL.V2 true", "sets :MODEL.V2 to true, which prints the model as text"),
            (":model.v1 |true|", "sets :model.v1 to |true|, which prints the model as text"),
            (':model.v2 "true"', 'sets :model.v2 to "true", which prints the model as text'),
        ):
            with self.subTest(option), self.assertRaisesRegex(lane.ScriptRefused, re.escape(why) + ".*statespace reads a run's witness from the model"):
                lane.check_script(f"(set-option {option})(declare-const x Int)(check-sat)")
        for option in (":produce-models true", ":produce-models |true|", ":model true", ':model "true"', ":model.v1 false", ":model.v2 false", ":model.compact true", ":model.completion true", ":dump-models true"):
            with self.subTest(option):
                lane.check_script(f"(set-option {option})(declare-const x Int)(check-sat)")

    def test_refusals_name_nothing_internal(self) -> None:
        # `statespace check` prints a refusal to the learner as the failing check's message, and a bad request
        # reaches the learner inside "the check itself broke (...)": neither may use a name that stays out of
        # learner copy, such as "lane" (content/glossary.yaml, internal).
        import yaml

        from .support import REPO

        glossary = yaml.safe_load((REPO / "content" / "glossary.yaml").read_text(encoding="utf-8"))
        patterns = [re.compile(rf"(?<![\w.-]){re.escape(form)}(?![\w-])", 0 if entry.get("caseSensitive") else re.IGNORECASE) for entry in glossary["internal"] for form in entry["forms"]]
        scripts = (
            "(declare-const x Int)\x00(check-sat)",
            '(assert (= s "x))(check-sat)',
            "(declare-const |x Int)(check-sat)",
            "(declare-const |a\\b| Int)(check-sat)",
            "#| c |#(check-sat)",
            "(check-sat))",
            "(check-sat)(",
            "\ufeff(check-sat)",
            "p cnf 1 1\n1 0\n(check-sat)",
            '(echo "sat")(check-sat)',
            "(check-sat-using smt)",
            "(declare-const x Int)",
            "(check-sat)(check-sat)",
            "(set-option :rlimit 0)(check-sat)",
            '(set-option :regular-output-channel "x")(check-sat)',
            "(check-sat-assuming p)",
            "(exit)(check-sat)",
            "(get-model)(check-sat)",
            "(simplify true)(check-sat)",
            "(minimize x)(check-sat)",
            "(check-sat)(assert false)",
            "(declare-const p Bool)(check-sat-assuming ((! p :named q)))",
            "(set-option :produce-models false)(check-sat)",
            "(set-option :model.v1 true)(check-sat)",
        )
        messages: list[str] = []
        for script in scripts:
            with self.subTest(script), self.assertRaises(lane.ScriptRefused) as refused:
                lane.check_script(script)
            messages.append(str(refused.exception))
        with tempfile.TemporaryDirectory() as tmp:
            session = lane.Z3Session(root=Path(tmp), workdir=Path(tmp) / "w")
            for request in ({"rlimit": 0}, {"rlimit": 2**32}, {"step": "no spaces"}, {"entry": "web"}):
                with self.subTest(request), self.assertRaises(ValueError) as bad:
                    session.run("(check-sat)", **{"step": "s", **request})  # type: ignore[arg-type]
                messages.append(str(bad.exception))
        self.assertEqual(len(messages), len(scripts) + 4)
        for message in messages:
            with self.subTest(message):
                found = [p.pattern for p in patterns if p.search(message)]
                self.assertEqual(found, [], message)

    def test_question_parts_are_the_scope_and_the_assumptions(self) -> None:
        self.assertEqual(lane.question_parts("(declare-const x Int)\n(assert (> x 0))\n(check-sat)\n(get-model)\n"), ("(declare-const x Int)\n(assert (> x 0))\n", []))
        self.assertEqual(lane.question_parts("(declare-const p Bool)(check-sat-assuming (p (not |odd q|)))(get-model)"), ("(declare-const p Bool)", ["p", "(not |odd q|)"]))
        self.assertEqual(lane.question_parts("(declare-const p Bool) ; (check-sat) here is a comment\n(check-sat p)"), ("(declare-const p Bool) ; (check-sat) here is a comment\n", ["p"]))
        self.assertEqual([f.head for f in lane.forms('foo (a "x)" |y z|) ()')], [None, "a", None])

    def test_query_script_adds_the_question_and_the_reason(self) -> None:
        text = lane.query_script("(declare-const a Int)\n(assert (> a 0))\n\n")
        self.assertTrue(text.endswith("(check-sat)\n(get-info :reason-unknown)\n"))
        self.assertEqual(lane.query_script(text), text)


class ScriptLines(unittest.TestCase):
    def test_labels_and_verdict_words(self) -> None:
        self.assertEqual(lane.parse_script_line("[1.2 starter: overdraft search] sat (0.00s) [b = 0, amount = 1, a = 0]"), ("verdict", "[1.2 starter: overdraft search]", ("sat",)))
        self.assertEqual(lane.parse_script_line("[issue input 1 (truth: sat, y=2)] -> unknown"), ("verdict", "[issue input 1 (truth: sat, y=2)]", ("unknown",)))
        self.assertEqual(lane.parse_script_line("[conservation without any guard, Int] proved"), ("verdict", "[conservation without any guard, Int]", ("proved",)))
        self.assertEqual(lane.parse_script_line("[x] unknown (5.00s) reason_unknown=timeout"), ("verdict", "[x]", ("unknown",)))
        self.assertEqual(lane.parse_script_line("datalog canread(1,3) sat canread(1,4) unsat"), ("verdict", "datalog canread(1,3)", ("sat", "unsat")))
        # On its own a line is not a model's: script_lines decides that from the lines before it.
        self.assertEqual(lane.parse_script_line(" B = 9223372036850581504,"), ("plain", " B = 9223372036850581504,", ()))
        self.assertEqual(lane.parse_script_line("z3 version: 5.3.1"), ("plain", "z3 version: 5.3.1", ()))

    def test_script_lines_read_each_line_in_context(self) -> None:
        lines = [
            "[1.5 wrap] sat (0.00s) [A = 9223372036854775806,",  # Z3Py wraps a long model onto indented lines
            " B = 9223372036850581504,",
            " X = 4194304]",
            "  replay ok: A=1 B=2: A >= 0 ok",
            "[core] unsat unsat_core=['a', 'b']",
            "  core check: the core alone is unsat; dropping any one member leaves it sat",
            "  an indented line that continues nothing",
            "sat",
            "(",
            "  (define-fun b () Int",
            "    0)",
            ")",
            "[closed] sat [x = 1]",
            " y = 2",
        ]
        read = [(r.kind, r.key, r.words) for r in lane.script_lines(lines)]
        self.assertEqual(
            read,
            [
                ("verdict", "[1.5 wrap]", ("sat",)),
                ("model", "", ()),
                ("model", "", ()),
                ("replay", "", ("ok",)),
                ("verdict", "[core]", ("unsat",)),
                ("check", lines[5], ()),
                ("plain", lines[6], ()),
                ("verdict", "", ("sat",)),
                ("plain", "(", ()),
                ("model", "", ()),
                ("model", "", ()),
                ("plain", ")", ()),
                ("verdict", "[closed]", ("sat",)),
                ("plain", " y = 2", ()),  # the model closed on its own line, so this continues nothing
            ],
        )
        # A line that is not indented ends a model left open, and is read on its own.
        self.assertEqual([r.kind for r in lane.script_lines(["[q] sat [x = 1,", "[r] unsat"])], ["verdict", "verdict"])
        self.assertEqual([r.kind for r in lane.script_lines(["(", "  (define-fun a () Int", "[r] unsat"])], ["plain", "model", "verdict"])

    def test_compare_ignores_models_and_timings_but_not_verdicts(self) -> None:
        recorded = ["z3 version: 5.3.1", "[q] sat (0.00s) [x = 1,", " y = 2]", "[r] unsat (0.00s) "]
        same = lane.compare_output(recorded, ["z3 version: 5.3.1", "[q] sat (0.02s) [x = 7, y = 9]", "[r] unsat (0.01s) "], version="5.3.1")
        self.assertEqual([c.status for c in same], ["same", "same", "skipped", "same"])
        flipped = lane.compare_output(recorded, ["z3 version: 5.3.1", "[q] unsat (0.00s) ", "[r] unsat (0.00s) "], version="5.3.1")
        self.assertEqual(flipped[1].status, "differs")
        missing = lane.compare_output(recorded, ["z3 version: 5.3.2", "[r] unsat"], version="5.3.1")
        self.assertEqual([c.status for c in missing], ["differs", "missing", "skipped", "same"])
        banner = lane.compare_output(["=== z3-solver 5.3.1.0", "[r] unsat"], ["[r] unsat"], version="5.3.1")
        self.assertEqual(banner[0].status, "skipped")
        bumped = lane.compare_output(["z3 version: 5.3.1", "[r] unsat"], ["z3 version: 5.3.2", "[r] unsat"], version="5.3.1", engine_version="5.3.2")
        self.assertEqual(bumped[0].status, "same")

    def test_compare_flags_what_the_record_does_not_have(self) -> None:
        # A re-run that drops an assertion prints an error the record does not have, before the same answer.
        dropped = lane.compare_output(["== a.smt2", "sat"], ["== a.smt2", '(error "line 3 column 1: unknown constant x")', "sat"], version="5.3.1")
        self.assertEqual([c.status for c in dropped], ["same", "same", "differs"])
        self.assertEqual((dropped[2].recorded, dropped[2].found), ("", '(error "line 3 column 1: unknown constant x")'))
        # A second answer, and a reason, that the record does not have.
        self.assertEqual([c.status for c in lane.compare_output(["sat"], ["sat", "unsat"], version="5.3.1")], ["same", "differs"])
        self.assertEqual([c.status for c in lane.compare_output(["unknown"], ["unknown", '(:reason-unknown "canceled")'], version="5.3.1")], ["same", "differs"])
        # An empty reason carries nothing, and other lines (models, the scripts' @@ lines) are not verdicts.
        quiet = lane.compare_output(["unsat"], ["unsat", '(:reason-unknown "")', "success", '@@ {"verdict": "sat"}', "(", "  (define-fun a () Int", "    1)", ")"], version="5.3.1")
        self.assertEqual([c.status for c in quiet], ["same"])
        # Each recorded line is matched to its own line of the new output.
        self.assertEqual([c.status for c in lane.compare_output(["sat", "sat"], ["sat"], version="5.3.1")], ["same", "missing"])
        self.assertEqual([c.status for c in lane.compare_output(["== a", "== a"], ["== a"], version="5.3.1")], ["same", "missing"])

    def test_compare_reads_replays_and_core_checks(self) -> None:
        # W1-T12's scripts replay every witness and re-check every unsat core on an indented line under the
        # verdict line; a tool bump whose witness no longer replays must not pass as reproduced.
        replayed = ["[q] sat [x = 1]", "  replay ok: x=1: x > 0 ok"]

        def statuses(found: list[str]) -> list[str]:
            return [c.status for c in lane.compare_output(replayed, found, version="5.3.1")]

        self.assertEqual(statuses(["[q] sat [x = 7]", "  replay ok: x=7: x > 0 ok", '@@ {"q": "q"}']), ["same", "same"], "the values a replay names are a model's")
        failed = lane.compare_output(replayed, ["[q] sat [x = 1]", "  replay FAILED: x=1: x > 0 FAILS"], version="5.3.1")
        self.assertEqual([c.status for c in failed], ["same", "differs"])
        self.assertEqual(failed[1].note, "recorded replay ok, now replay FAILED")
        self.assertEqual(statuses(["[q] sat [x = 1]"]), ["same", "missing"])
        self.assertEqual(statuses(["[r] unsat"]), ["missing", "missing"])
        # A replay belongs to the verdict line it follows, not to the next one that has a replay.
        two = ["[q] sat [x = 1]", "  replay ok: q", "[r] sat [y = 1]", "  replay ok: r"]
        self.assertEqual([c.status for c in lane.compare_output(two, ["[q] sat [x = 1]", "[r] sat [y = 1]", "  replay ok: r"], version="5.3.1")], ["same", "missing", "same", "same"])
        held = "  core check: the core alone is unsat; dropping any one member leaves it sat"
        cored = ["[c] unsat unsat_core=['a', 'b']", held]
        self.assertEqual([c.status for c in lane.compare_output(cored, cored, version="5.3.1")], ["same", "same"])
        broken = lane.compare_output(cored, [cored[0], held.replace("is unsat", "is NOT unsat")], version="5.3.1")
        self.assertEqual([c.status for c in broken], ["same", "differs"])
        loose = lane.compare_output(cored, [cored[0], held.replace("leaves it sat", "leaves it NOT sat")], version="5.3.1")
        self.assertEqual([c.status for c in loose], ["same", "differs"])
        # Lines the record does not have: a replay that FAILED or a check that does NOT hold is a difference.
        extra = lane.compare_output(["[q] sat [x = 1]"], ["[q] sat [x = 1]", "  replay FAILED: x=1: FAILS", "  core check: the core alone is NOT unsat"], version="5.3.1")
        self.assertEqual([c.status for c in extra], ["same", "differs", "differs"])
        self.assertEqual(lane.compare_output(["[q] sat [x = 1]"], ["[q] sat [x = 1]", "  replay ok: x=1: ok"], version="5.3.1")[-1].status, "same")

    def test_compare_flags_a_second_verdict_line_for_a_label(self) -> None:
        twice = lane.compare_output(["[q] sat [x = 1]"], ["[q] sat [x = 1]", "[q] unsat"], version="5.3.1")
        self.assertEqual([c.status for c in twice], ["same", "differs"])
        self.assertEqual(twice[1].note, "a second verdict line for a label the record has")
        # Labels the record does not keep are other queries of the same script, not a difference.
        self.assertEqual([c.status for c in lane.compare_output(["[q] sat [x = 1]"], ["[q] sat [x = 1]", "[other] unsat"], version="5.3.1")], ["same"])

    def test_compare_skips_only_model_lines(self) -> None:
        # A model Z3Py wrapped onto indented lines, and a model block, are skipped; an indented line that
        # continues nothing is compared verbatim.
        wrapped = ["[w] sat (0.00s) [A = 1,", " B = 2,", " X = 3]", "[p] proved"]
        self.assertEqual([c.status for c in lane.compare_output(wrapped, ["[w] sat (0.01s) [A = 5, B = 6, X = 7]", "[p] proved"], version="5.3.1")], ["same", "skipped", "skipped", "same"])
        block = ["sat", "(", "  (define-fun b () Int", "    0)", ")"]
        self.assertEqual([c.status for c in lane.compare_output(block, ["sat", "(", "  (define-fun b () Int", "    9)", ")"], version="5.3.1")], ["same", "same", "skipped", "skipped", "same"])
        self.assertEqual([c.status for c in lane.compare_output(["[q] unsat", "  note: kept"], ["[q] unsat", "  note: changed"], version="5.3.1")], ["same", "missing"])

    def test_compare_reads_the_reason_of_an_unknown(self) -> None:
        theory = "[q] unknown (0.00s) smt tactic failed to show goal to be sat/unsat (incomplete (theory arithmetic)) "
        self.assertEqual(lane.unknown_reason(theory), "smt tactic failed to show goal to be sat/unsat (incomplete (theory arithmetic))")
        budget = lane.compare_output([theory], ["[q] unknown (0.00s) max. resource limit exceeded"], version="5.3.1")
        self.assertEqual(budget[0].status, "differs")
        self.assertIn("max. resource limit exceeded", budget[0].note or "")
        slower = lane.compare_output([theory], [theory.replace("(0.00s)", "(4.44s)")], version="5.3.1")
        self.assertEqual(slower[0].status, "same", "timings are not compared")
        self.assertEqual(lane.compare_output(["[issue input 1 (truth: sat, y=2)] -> unknown"], ["[issue input 1 (truth: sat, y=2)] -> unknown"], version="5.3.1")[0].status, "same")

    def test_rerun_plans(self) -> None:
        def view(**overrides: object) -> RunView:
            base: dict[str, object] = {"run_id": "RUN-x", "config": None, "engine": "z3", "version": "5.3.1", "argv": None, "inputs": [{"path": "s/a.py", "sha256": "0" * 64, "role": "script"}], "image": None, "verdict_lines": ["sat"], "exit_code": None, "budget": {}, "unrecorded": {"argv": "not logged"}}
            base.update(overrides)
            return RunView(**base)  # type: ignore[arg-type]

        plan = lane.rerun_plan(view(), repo=Path("."))
        if isinstance(plan, lane.RerunPlan):  # uv is on PATH
            self.assertEqual(plan.argv, ["uv", "run", "--no-project", "--quiet", "--with", "z3-solver==5.3.1", "python", "-I", "a.py"])
            self.assertEqual(plan.cwd, "stage")
            self.assertIn("not logged", plan.how)
            bumped = lane.rerun_plan(view(), repo=Path("."), engine_version="5.3.2")
            assert isinstance(bumped, lane.RerunPlan)
            self.assertIn("z3-solver==5.3.2", bumped.argv)
        self.assertIsInstance(lane.rerun_plan(view(image="x@sha256:" + "0" * 64), repo=Path(".")), lane.Refusal)
        self.assertIsInstance(lane.rerun_plan(view(inputs=[]), repo=Path(".")), lane.Refusal)
        self.assertIsInstance(lane.rerun_plan(view(argv=["node", "<sandbox>/x.mjs"]), repo=Path(".")), lane.Refusal)
        self.assertIsInstance(lane.rerun_plan(view(argv=[["a"], ["b"]]), repo=Path(".")), lane.Refusal)
        staged = lane.rerun_plan(view(argv=["python3", "a.py"]), repo=Path("."))
        assert isinstance(staged, lane.RerunPlan)
        self.assertEqual(staged.cwd, "stage")
        rooted = lane.rerun_plan(view(argv=["python3", "s/a.py"]), repo=Path("."))
        assert isinstance(rooted, lane.RerunPlan)
        self.assertEqual(rooted.cwd, "repo")
        nested = lane.rerun_plan(view(argv=["python3", "b/a.py"], inputs=[{"path": "s/b/a.py", "sha256": "0" * 64}]), repo=Path("."))
        assert isinstance(nested, lane.RerunPlan)
        self.assertEqual(nested.cwd, "stage", "a command that names the end of an input's path ran where the inputs were laid out")
        # A tool bump must change the engine that runs, or be refused: a bare z3 names no version to change.
        self.assertIsInstance(lane.rerun_plan(view(argv=["z3", "-smt2", "q.smt2"]), repo=Path("."), engine_version="5.3.2"), lane.Refusal)
        pinned = lane.rerun_plan(view(argv=["uv", "run", "--with", "z3-solver==5.3.1", "python", "a.py"]), repo=Path("."), engine_version="5.3.2")
        assert isinstance(pinned, lane.RerunPlan)
        self.assertIn("z3-solver==5.3.2", pinned.argv)
        self.assertIsInstance(lane.rerun_plan(view(argv=["python", "-P", "-m", "statespace.lanes.z3", "--rlimit", "5", "q.smt2"]), repo=Path(".")), lane.Refusal)


@unittest.skipUnless(Z3, "needs z3-solver installed (uv run --group image)")
class LiveRuns(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.session = lane.Z3Session(root=self.root, workdir=self.root / "receipts" / "LAB-90.1" / "t", wall_clock_s=60)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_both_entries_agree_on_the_starter_and_the_guard(self) -> None:
        for entry in ("cli", "api"):
            with self.subTest(entry):
                sat = self.session.run(STARTER, step="starter", entry=entry)
                self.assertEqual(sat.verdict, "sat")
                assert sat.model is not None
                a, amount = sat.model.value("a"), sat.model.value("amount")
                assert isinstance(a, int) and isinstance(amount, int)
                self.assertLess(a - amount, 0, "witnesses are replayed, not matched")
                unsat = self.session.run(GUARD, step="guard", entry=entry)
                self.assertEqual(unsat.verdict, "unsat")
                self.assertEqual(unsat.input_sha256, statement_hash_text(GUARD), "the engine reads the statement text, so the two hashes agree")
                self.assertEqual((self.root / unsat.input_path).read_bytes(), (GUARD.rstrip() + "\n").encode())
                self.assertTrue((self.root / unsat.log_path).read_text().startswith("unsat"))

    def test_both_entries_read_the_model_after_what_the_script_prints(self) -> None:
        # The command line prints its model last, after what each command after the question prints; the api entry
        # prints only the answer and the model. The cli entry once read the first block after sat as the model, so
        # each of the first five gave it a model with no values, where the api entry's held the witness.
        tails = (
            "(get-value (a b amount))",
            "(eval (- a amount))",
            "(get-info :version)\n(exit)",
            "(get-value (amount))\n(get-model)",
            "(get-info :all-statistics)",
            "(get-model)",
        )
        for i, tail in enumerate(tails):
            for entry in ("cli", "api"):
                with self.subTest(tail, entry=entry):
                    run = self.session.run(STARTER.rstrip() + "\n" + tail + "\n", step=f"tail{i}-{entry}", entry=entry)
                    self.assertEqual(run.verdict, "sat")
                    assert run.model is not None, run.output
                    a, b, amount = (run.model.value(name) for name in ("a", "b", "amount"))
                    assert isinstance(a, int) and isinstance(b, int) and isinstance(amount, int), run.output
                    self.assertTrue(a >= 0 and b >= 0 and amount > 0 and a - amount < 0, "the witness replays")
        # Named terms in the model, and a sort's universe, printed with declare-fun and forall items.
        named = "(set-option :produce-assignments true)\n(declare-const a Int)\n(declare-const amount Int)\n(assert (! (>= a 0) :named nonneg))\n(assert (> amount 0))\n(assert (< (- a amount) 0))\n(check-sat)\n(get-assignment)\n"
        universe = "(declare-sort U 0)\n(declare-const x U)\n(declare-const y U)\n(assert (distinct x y))\n(check-sat)\n(get-value (x))\n"
        for entry in ("cli", "api"):
            with self.subTest("named", entry=entry):
                run = self.session.run(named, step=f"named-{entry}", entry=entry)
                assert run.model is not None, run.output
                self.assertIsInstance(run.model.value("amount"), int)
            with self.subTest("universe", entry=entry):
                run = self.session.run(universe, step=f"universe-{entry}", entry=entry)
                assert run.model is not None, run.output
                self.assertEqual(set(run.model.constants), {"x", "y"})
                self.assertNotEqual(run.model.constants["x"], run.model.constants["y"])
        # Without -model, the model is the one (get-model) prints, not the empty list (get-assignment) prints after it,
        # and a run that asks for no model has none.
        asked = self.session.run("(set-option :produce-assignments true)\n" + STARTER.rstrip() + "\n(get-model)\n(get-assignment)\n", step="asked", entry="cli", model=False)
        assert asked.model is not None, asked.output
        self.assertIsInstance(asked.model.value("amount"), int)
        self.assertIn("()", asked.output.splitlines())
        self.assertIsNone(self.session.run(STARTER.rstrip() + "\n(get-value (a))\n", step="unasked", entry="cli", model=False).model)

    def test_a_script_that_turns_its_model_off_never_reaches_z3(self) -> None:
        # The command line then prints no model (case cli-produce-models-off), or prints it as a string (case
        # cli-model-v1-text), where the api entry prints its solver's model itself.
        for i, option in enumerate(("(set-option :produce-models false)", "(set-option :model false)", "(set-option :model.v1 true)")):
            for entry in ("cli", "api"):
                with self.subTest(option, entry=entry), self.assertRaisesRegex(lane.ScriptRefused, "statespace reads a run's witness from the model"):
                    self.session.run(option + "\n" + STARTER, step=f"off{i}-{entry}", entry=entry)
        self.assertEqual(self.session.runs, [], "no refused script ran")
        written = sorted(self.session.workdir.glob("*.smt2")) if self.session.workdir.exists() else []
        self.assertEqual(written, [], "no refused script was written for Z3 to read")

    def test_both_entries_answer_the_question_the_script_asks(self) -> None:
        # The api entry checks the assertions in scope at the question, under its assumptions: before this
        # fix it answered sat to the first script and unsat to the push/pop one.
        agree = {
            "(declare-const p Bool)(assert (not p))(check-sat-assuming (p))": "unsat",
            "(declare-const p Bool)(declare-const q Bool)(assert (or p q))(check-sat-assuming ((not p)))": "sat",
            "(declare-const p Bool)(assert (not p))(check-sat p)": "unsat",
            "(declare-const x Int)(assert (< x 3))(check-sat-assuming ((> x 5)))": "unsat",
            "(declare-const x Int)(push 1)(assert false)(pop 1)(assert (> x 0))(check-sat)": "sat",
            "(declare-const x Int)(push 1)(assert (> x 0))(assert (< x 0))(check-sat)": "unsat",
            "(declare-const x Int)(assert false)(reset-assertions)(check-sat)(get-model)": "sat",
            "(declare-const x Int)(assert false)(reset)(declare-const y Int)(check-sat)": "sat",
            "(declare-const x Int)(check-sat-assuming (q))": "error",
            # Named assertions: read with parse_smt2_string, each came back as (=> name formula) with nothing
            # assuming the name, and the api entry answered sat to all four.
            "(set-option :produce-unsat-cores true)(declare-const p Bool)(assert (! p :named n))(assert (! (not p) :named m))(check-sat)": "unsat",
            "(set-option :produce-unsat-cores true)(declare-const amount Int)(define-fun MAX_TRANSFER () Int 0)(assert (! (> amount 0) :named amount-pos))(assert (! (<= amount MAX_TRANSFER) :named under-max))(check-sat)(get-unsat-core)": "unsat",
            "(set-option :produce-unsat-cores true)(declare-const p Bool)(assert (! p :named a1))(check-sat-assuming ((not a1)))": "unsat",
            "(declare-const x Int)(assert (! (> x 0) :named pos))(assert (not pos))(check-sat)": "unsat",
            "(declare-const p Bool)(assert (! (not p) :named a1))(check-sat-assuming (a1))": "sat",
            # The logic is read as the command line reads it: QF_LIA has no nonlinear terms, an error before the answer.
            "(set-logic QF_LIA)(declare-const x Int)(assert (> (* x x) 3))(check-sat)": "error",
        }
        for i, (script, verdict) in enumerate(agree.items()):
            with self.subTest(script):
                runs = [self.session.run(script, step=f"q{i}-{entry}", entry=entry) for entry in ("cli", "api")]
                self.assertEqual([r.verdict for r in runs], [verdict, verdict], [r.verdict_lines for r in runs])
        # A script whose answer the api entry once misread is now not one run at all, through either entry.
        for entry in ("cli", "api"):
            with self.subTest(entry), self.assertRaises(lane.ScriptRefused):
                self.session.run("(declare-const x Int)(assert (> x 0))(check-sat)(assert false)", step="after", entry=entry)

    def test_both_entries_read_the_bytes_z3_reads(self) -> None:
        # The api runner once read its input with Path.read_text, which turns a bare \r and \r\n into \n. Z3 ends a
        # ; comment only at \n and keeps the \r of a string, so the api entry answered unsat to the first three
        # scripts, where the z3 command answers sat: in the first, the guard after "; guard\r" is part of a comment.
        agree = {
            "(declare-const a Int)\n(declare-const amount Int)\n(assert (>= a 0))\n(assert (> amount 0))\n; guard\r(assert (<= amount a))\n(assert (< (- a amount) 0))\n(check-sat)\n": "sat",
            "(declare-const x Int)\n(assert (> x 0))\n; note\r(assert (< x 0))\n(check-sat)\n": "sat",
            '(declare-const s String)\r\n(assert (= s "a\r\nb"))\r\n(assert (= (str.len s) 4))\r\n(check-sat)\r\n': "sat",
            '(declare-const s String)\n(assert (= s "a\rb"))\n(assert (= (str.len s) 3))\n(check-sat)\n': "sat",
            "(declare-const x Int)\r\n(assert (> x 0))\r\n; note\r\n(assert (< x 0))\r\n(check-sat)\r\n": "unsat",
            "(declare-const |c\rd| Int)\n(assert (> |c\rd| 0))\n(check-sat)\n": "sat",
            "(declare-const x Int)\n(assert (> x 0))\n; note\u2028(assert (< x 0))\n; and\x85(assert (< x 0))\n(check-sat)\n": "sat",
        }
        for i, (script, verdict) in enumerate(agree.items()):
            with self.subTest(script):
                runs = [self.session.run(script, step=f"bytes{i}-{entry}", entry=entry) for entry in ("cli", "api")]
                self.assertEqual([r.verdict for r in runs], [verdict, verdict], [r.verdict_lines for r in runs])
                for run in runs:
                    self.assertEqual((self.root / run.input_path).read_bytes(), statement_preimage(script), "the engine reads the script's own bytes")
        # The rules apply to the bytes Z3 reads: white space the statement hash trims from the end, such as a form
        # feed or a byte order mark, never reaches Z3, so it is not refused as a form outside any command.
        trailing = self.session.run(GUARD + "\x0c\ufeff", step="trailing", entry="cli")
        self.assertEqual(trailing.verdict, "unsat")
        self.assertEqual((self.root / trailing.input_path).read_bytes(), (GUARD.rstrip("\n") + "\n").encode())

    def test_scripts_the_python_api_would_read_otherwise_never_reach_z3(self) -> None:
        # Through the z3 command the first is unsat, and Solver.from_string read it only up to the NUL and
        # answered sat: premises that contradict each other passed as premises with a model. The second,
        # which from_string reads as DIMACS, was unsat through the api entry and an error through the command.
        scripts = (
            "(declare-const amount Int)\n(assert (> amount 0))\n; MAX_TRANSFER = 0 \x00\n(assert (<= amount 0))\n(check-sat)\n",
            "p cnf 1 2\n1 0\n-1 0\n(check-sat)\n",
            "\ufeff(declare-const x Int)\n(check-sat)\n",
            "(declare-const x Int)\n\x0c(assert (> x 0))\n(check-sat)\n",
        )
        for i, script in enumerate(scripts):
            for entry in ("cli", "api"):
                with self.subTest(script, entry=entry), self.assertRaises(lane.ScriptRefused):
                    self.session.run(script, step=f"other{i}-{entry}", entry=entry)
        self.assertEqual(self.session.runs, [], "no refused script ran")
        written = sorted(self.session.workdir.glob("*.smt2")) if self.session.workdir.exists() else []
        self.assertEqual(written, [], "no refused script was written for Z3 to read")

    def test_an_annotated_question_never_reaches_z3(self) -> None:
        # The verifier's case first: through the z3 command these premises are unsat, and the api entry, which read
        # the named assumption with parse_smt2_string as (=> under-max (<= amount 0)), answered sat with exit 0, so
        # a vacuous claim was minted. Each of the others also gave unsat through the command line and sat through
        # the api entry, and none is let through either entry now.
        scripts = (
            "(set-option :produce-unsat-cores true)(declare-const amount Int)(define-fun MAX_TRANSFER () Int 0)(assert (> amount 0))(check-sat-assuming ((! (<= amount MAX_TRANSFER) :named under-max)))(get-unsat-core)",
            "(set-option :produce-unsat-cores true)(declare-const p Bool)(assert (not p))(check-sat-assuming ((! p :named q)))",
            "(set-option :produce-unsat-cores true)(declare-const p Bool)(assert (not p))(check-sat (! p :named q))",
            "(set-option :produce-unsat-cores true)(declare-const p Bool)(assert (not p))(check-sat-assuming ((let ((y p)) (! y :named q))))",
            "(set-option :produce-unsat-cores true)(declare-const p Bool)(assert (not p))(check-sat-assuming ((|!| p :named q)))",
            "(set-option :unsat_core true)(declare-const p Bool)(assert (not p))(check-sat-assuming ((! p :named q)))",
        )
        for i, script in enumerate(scripts):
            for entry in ("cli", "api"):
                with self.subTest(script, entry=entry), self.assertRaisesRegex(lane.ScriptRefused, "holds the annotation"):
                    self.session.run(script, step=f"named{i}-{entry}", entry=entry)
        self.assertEqual(self.session.runs, [], "no refused script ran")
        written = sorted(self.session.workdir.glob("*.smt2")) if self.session.workdir.exists() else []
        self.assertEqual(written, [], "no refused script was written for Z3 to read")
        # What the refusal suggests instead, a named assertion or an assumed constant tied to the formula, reads the
        # same through both entries.
        agree = {
            "(set-option :produce-unsat-cores true)(declare-const amount Int)(define-fun MAX_TRANSFER () Int 0)(assert (> amount 0))(assert (! (<= amount MAX_TRANSFER) :named under-max))(check-sat)(get-unsat-core)": "unsat",
            "(set-option :produce-unsat-cores true)(declare-const amount Int)(define-fun MAX_TRANSFER () Int 0)(assert (> amount 0))(declare-const under-max Bool)(assert (=> under-max (<= amount MAX_TRANSFER)))(check-sat-assuming (under-max))(get-unsat-core)": "unsat",
            "(set-option :produce-unsat-cores true)(declare-const amount Int)(define-fun MAX_TRANSFER () Int 100)(assert (> amount 0))(declare-const under-max Bool)(assert (=> under-max (<= amount MAX_TRANSFER)))(check-sat-assuming (under-max))": "sat",
            "(set-option :produce-unsat-cores true)(declare-const p Bool)(assert (! (not p) :named n))(check-sat-assuming (n))": "sat",
        }
        for i, (script, verdict) in enumerate(agree.items()):
            with self.subTest(script):
                runs = [self.session.run(script, step=f"instead{i}-{entry}", entry=entry) for entry in ("cli", "api")]
                self.assertEqual([r.verdict for r in runs], [verdict, verdict], [r.verdict_lines for r in runs])

    def test_scripts_the_lane_cannot_read_never_reach_z3(self) -> None:
        # Each gave an answer through the cli entry when the lane let a script it could not read through:
        # unsat with exit code 0 for the first two, which ask no question, sat for the fourth, and an
        # unbounded run under a receipt that recorded rlimit 5000000 for the fifth.
        cubes = "(declare-const x Int)(declare-const y Int)(declare-const z Int)(assert (> x 0))(assert (> y 0))(assert (> z 0))(assert (= (+ (* x x x) (* y y y)) (* z z z)))(check-sat)"
        scripts = (
            '(declare-const x Int)(assert (> x 0))(echo "unsat")(exit))',
            '(declare-const x Int)(assert (> x 0))(echo "unsat")(exit)(',
            '(declare-const x Int)(echo "unsat")(check-sat-assuming (q))(',
            "(declare-const x Int)(check-sat)(assert false)(",
            "(set-option :rlimit 0)" + cubes + "(",
            '#| a | b |# (echo "unsat") | (check-sat)',
            "(declare-const |a\\| x |)(echo \"unsat\")(check-sat)| )(check-sat)",
        )
        for i, script in enumerate(scripts):
            for entry in ("cli", "api"):
                with self.subTest(script, entry=entry), self.assertRaisesRegex(lane.ScriptRefused, "cannot be read as SMT-LIB"):
                    self.session.run(script, step=f"bad{i}-{entry}", entry=entry)
        self.assertEqual(self.session.runs, [], "no refused script ran")
        written = sorted(self.session.workdir.glob("*.smt2")) if self.session.workdir.exists() else []
        self.assertEqual(written, [], "no refused script was written for Z3 to read")

    def test_the_api_runner_checks_the_script_itself(self) -> None:
        import sys

        from statespace.lanes.z3 import runner_env

        for script, rlimit in (
            ("(declare-const x Int)(check-sat)(assert false)", "5000000"),
            ("(set-option :rlimit 0)(check-sat)", "5000000"),
            ("(check-sat)", "0"),
            ('(declare-const x Int)(assert (> x 0))(echo "unsat")(exit))', "5000000"),
            ('#| a | b |# (echo "unsat") | (check-sat)', "5000000"),
            ("(declare-const x Int)\n(assert (> x 0))\n; note \x00 here\n(assert (< x 0))\n(check-sat)\n", "5000000"),
            ("p cnf 1 2\n1 0\n-1 0\n(check-sat)\n", "5000000"),
            ("(set-option :produce-unsat-cores true)(declare-const amount Int)(assert (> amount 0))(check-sat-assuming ((! (<= amount 0) :named under-max)))", "5000000"),
            ("(set-option :produce-models false)(declare-const x Int)(assert (> x 0))(check-sat)", "5000000"),
        ):
            with self.subTest(script, rlimit=rlimit):
                (self.root / "q.smt2").write_bytes(script.encode("utf-8"))
                done = subprocess.run([sys.executable, "-P", "-m", "statespace.lanes.z3", "--rlimit", rlimit, "q.smt2"], cwd=self.root, capture_output=True, text=True, timeout=60, env=runner_env())
                self.assertEqual(done.returncode, 2)
                self.assertTrue(done.stdout.startswith(lane.CLI_NOTE), done.stdout)
                self.assertEqual(lane.derive_verdict(lane.read_output(done.stdout).verdict_lines).verdict, "error")

    def test_the_api_runner_reads_the_file_as_bytes(self) -> None:
        # The file on disk, not a string the lane wrote: a bare \r in a comment and a CRLF string read as the z3
        # command reads them, and a file that is not UTF-8 gives a note, never an answer.
        import sys

        from statespace.lanes.z3 import find_cli, runner_env

        binary = find_cli().path
        for script, verdict in (
            (b"(declare-const x Int)\n(assert (> x 0))\n; note\r(assert (< x 0))\n(check-sat)\n", "sat"),
            (b'(declare-const s String)\r\n(assert (= s "a\r\nb"))\r\n(assert (= (str.len s) 4))\r\n(check-sat)\r\n', "sat"),
        ):
            with self.subTest(script):
                (self.root / "q.smt2").write_bytes(script)
                api = subprocess.run([sys.executable, "-P", "-m", "statespace.lanes.z3", "--rlimit", "5000000", "q.smt2"], cwd=self.root, capture_output=True, text=True, timeout=60, env=runner_env())
                cli = subprocess.run([str(binary), "-smt2", "rlimit=5000000", "q.smt2"], cwd=self.root, capture_output=True, text=True, timeout=60)
                self.assertEqual(lane.derive_verdict(lane.read_output(api.stdout).verdict_lines).verdict, verdict, api.stdout)
                self.assertEqual(lane.derive_verdict(lane.read_output(cli.stdout).verdict_lines).verdict, verdict, cli.stdout)
        (self.root / "q.smt2").write_bytes(b"(declare-const x Int)\n; caf\xe9\n(check-sat)\n")
        done = subprocess.run([sys.executable, "-P", "-m", "statespace.lanes.z3", "--rlimit", "5000000", "q.smt2"], cwd=self.root, capture_output=True, text=True, timeout=60, env=runner_env())
        self.assertEqual((done.returncode, lane.derive_verdict(lane.read_output(done.stdout).verdict_lines).verdict), (2, "error"), done.stdout)

    def test_rlimit_stops_a_hard_query_with_unknown(self) -> None:
        cubes = "(declare-const x Int)(declare-const y Int)(declare-const z Int)(assert (> x 0))(assert (> y 0))(assert (> z 0))(assert (= (+ (* x x x) (* y y y)) (* z z z)))"
        for entry in ("cli", "api"):
            with self.subTest(entry):
                run = self.session.run(lane.query_script(cubes), step="cubes", entry=entry, rlimit=1_000_000)
                self.assertEqual(run.verdict, "unknown")
                self.assertEqual(run.reason_unknown, "canceled")
                self.assertEqual(run.receipt_run()["budget"], {"rlimit": 1_000_000})

    def test_receipt_entries_and_tools(self) -> None:
        run = self.session.run(GUARD, step="guard", entry="cli", seed=7)
        entry = run.receipt_run()
        self.assertEqual(entry["argv"], ["z3", "-smt2", "-model", "rlimit=5000000", "receipts/LAB-90.1/t/guard.smt2"])
        self.assertEqual(entry["budget"], {"rlimit": 5000000, "seed": 7})
        self.assertEqual(entry["verdictLines"], ["unsat"])
        self.assertEqual(lane.derive_verdict(entry["verdictLines"]).verdict, entry["verdict"])
        api = self.session.run(GUARD, step="guard", entry="api")
        self.assertEqual(api.step, "guard-2")
        self.assertEqual(api.argv[:4], ("python", "-P", "-m", "statespace.lanes.z3"))
        tools = {t["name"]: t for t in self.session.receipt_tools()}
        self.assertEqual(set(tools), {"z3", "z3-cli"})
        self.assertEqual(tools["z3"]["version"], "5.3.1")
        self.assertTrue(tools["z3-cli"]["version"].startswith("Z3 version 5.3.1"))
        self.session.headline(run)
        self.assertEqual(self.session.receipt_section(), {"smtlibSha256": run.input_sha256, "entry": "cli", "rlimit": 5000000, "verdict": "unsat"})

    def test_bad_requests_fail_loudly(self) -> None:
        with self.assertRaises(ValueError):
            self.session.run(GUARD, step="guard", rlimit=0)
        with self.assertRaises(ValueError):
            self.session.run(GUARD, step="guard", rlimit=2**32)
        with self.assertRaises(ValueError):
            self.session.run(GUARD, step="no spaces")
        with self.assertRaises(lane.ScriptRefused):
            self.session.run("(declare-const a Int)", step="none")
        error = self.session.run("(declare-const a Int)(assert (> q 0))(check-sat)", step="err")
        self.assertEqual(error.verdict, "error")
        with self.assertRaises(ValueError):
            self.session.headline(error)

    def test_wall_clock_backstop_records_a_note_and_no_verdict(self) -> None:
        session = lane.Z3Session(root=self.root, workdir=self.root / "w", wall_clock_s=0.5)
        cubes = "(declare-const x Int)(declare-const y Int)(declare-const z Int)(assert (> x 1))(assert (> y 1))(assert (> z 1))(assert (= (+ (* x x x) (* y y y)) (* z z z)))"
        run = session.run(lane.query_script(cubes), step="slow", rlimit=lane.MAX_RLIMIT)
        self.assertTrue(run.timed_out)
        self.assertEqual(run.verdict, "error")
        self.assertTrue(run.verdict_lines[-1].startswith("statespace: z3 gave no answer within 0.5 s"))

    def test_captured_cases_still_reproduce(self) -> None:
        # Drift check: the pinned engine still prints what the fixture captured.
        import sys

        from statespace.lanes.z3 import find_cli, runner_env

        binary = find_cli().path
        for case in FIXTURE["cases"]:
            with self.subTest(case["id"]):
                name = case["argv"][-1]
                (self.root / name).write_bytes(case["input"].encode("utf-8"))
                if case["entry"] == "cli":
                    argv = [str(binary), *case["argv"][1:]]
                    env = None
                else:
                    argv = [sys.executable, *case["argv"][1:]]
                    env = runner_env()
                if case.get("stoppedAfterS") is not None:
                    # The script's own (set-option :rlimit 0) lifts the command line's rlimit: still no answer.
                    with self.assertRaises(subprocess.TimeoutExpired):
                        subprocess.run(argv, cwd=self.root, capture_output=True, text=True, timeout=case["stoppedAfterS"], env=env)
                    continue
                done = subprocess.run(argv, cwd=self.root, capture_output=True, timeout=120, env=env)
                output = (done.stdout + done.stderr).decode("utf-8", errors="replace")  # no line-ending translation
                if lane.read_output(case["output"]).model_text is not None:
                    # Model values are not canonical; compare what the grammar reads.
                    self.assertEqual(list(lane.read_output(output).verdict_lines), case["expect"]["verdictLines"])
                else:
                    self.assertEqual(output, case["output"])
                self.assertEqual(done.returncode, case["exitCode"])


if __name__ == "__main__":
    unittest.main()
