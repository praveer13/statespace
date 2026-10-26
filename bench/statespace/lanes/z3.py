"""The Z3 lane of the Bench (INS-bench-smt; spine sections 9.2 and 9.6; ARCHITECTURE.md section 11.3).

It runs one SMT-LIB query per run under an rlimit, reads the verdict from the lines Z3 prints, and never
from the exit code alone: Z3 can print an ``(error ...)`` line for a dropped assertion and then answer
``sat`` about what is left.

Two entries, recorded as receipt@1's ``z3.entry`` because they can answer differently [X RUN-z3-11179]:

``cli``
    the ``z3`` binary from the z3-solver wheel: ``z3 -smt2 -model rlimit=<n> <file>``.
``api``
    the Python API in a fresh process: ``python -P -m statespace.lanes.z3 --rlimit <n> --model <file>``,
    which reads the file's bytes as UTF-8 with no line-ending translation, reads the script up to its
    question into a ``Solver`` under ``rlimit`` with ``Solver.from_string``, checks under the question's
    assumptions and prints the answer in the command line's own format. It reads the bytes the command
    line reads: Z3 ends a ``;`` comment only at a line feed, so an assertion after a bare carriage return
    in a comment is part of the comment through both entries (cases cli-cr-in-comment and
    api-cr-in-comment of RUN-z3-verdict-lines), and a string keeps the ``\\r\\n`` of a CRLF file (cases
    cli-crlf-string and api-crlf-string); ``Path.read_text`` would turn both into ``\\n``. ``from_string``
    reads a named assertion, ``(assert (! p :named n))``, as the command line does;
    ``parse_smt2_string`` returns it as ``(=> n p)`` with nothing assuming ``n``, which answered ``sat``
    to contradictory named premises that the command line calls ``unsat`` (cases cli-named-premises and
    api-named-premises). Each assumption is read with ``parse_smt2_string`` in the scope of the
    question, as the last formula of the text before the question plus ``(assert <assumption>)``: a term
    with no annotation comes back as the command line assumes it, and a named one would come back as
    ``(=> n p)``, which is why a question holds no annotation (below). Options that tune Z3's search
    configure the command line's solver and need not reach the api entry's, and an option the API cannot
    apply after the start, such as ``:global-declarations``, is an error there, which is why the two
    entries can still answer differently.

The input of every run is the query's text with trailing whitespace removed plus one newline, written
to a file beside the receipt, so the SHA-256 of what the engine read equals the query's statement hash
(statement-hash@1) and ``z3.smtlibSha256`` names it in both senses. The rules below are applied to those
bytes, the ones both entries read.

Scripts. A run asks one question, so both entries answer the same one, and ``check_script`` refuses
(``ScriptRefused``) any other script:

* exactly one ``(check-sat)`` or ``(check-sat-assuming (<literal>...))``; ``(check-sat-using ...)`` picks
  Z3's own tactic, which the api entry cannot follow;
* no annotation, ``(! ...)``, anywhere in the question's terms, spelled ``!`` or ``|!|``, which Z3 reads
  alike (case cli-quoted-annotation-assumption). With unsat cores on, ``parse_smt2_string`` returns a named
  assumption as ``(=> name formula)``, which the name's being false satisfies: premises that the command
  line calls ``unsat``, the second assumed under a name (case cli-named-assumption), were ``sat`` read that
  way (``values.parse_smt2_string_assumption_reading``), so a vacuous claim looked non-vacuous. The rule
  does not depend on the script's options, so no option that turns cores on can slip past it. A named
  assertion before the question (cases cli-named-premises and api-named-premises), or an assumed Boolean
  constant that an assertion ties to the formula (cases cli-assumed-constant and api-assumed-constant),
  reads the same through both entries;
* before the question, only what sets it up: ``set-logic``, ``set-option``, ``set-info``, declarations,
  definitions, ``assert``, ``push``, ``pop``, ``reset`` and ``reset-assertions``. A ``get-`` command there
  reads an answer not asked for yet, ``exit`` leaves before the question, and ``simplify``, ``eval`` and
  ``display`` print terms that could read as an answer (case cli-printed-word-before-question of
  RUN-z3-verdict-lines: ``(simplify sat)`` prints ``sat`` before a question that fails);
* after the question, only what reads the answer: the ``get-`` commands, ``eval``, ``set-info`` and
  ``exit``. An assertion there cannot change the answer, which Z3 has printed already (case
  cli-assert-after-question), but would read as if it did;
* no ``echo``, whose text could read as an answer, and no ``set-option`` of an rlimit, a timeout or a
  memory limit in any case or spelling (``:rlimit``, ``:opt.rlimit``, ``:timeout``, ``:solver.timeout``,
  ``:combined_solver.solver2_timeout``, ``:memory_max_size``, ``:sat.max_memory``): Z3 lets a script's own
  ``:rlimit`` replace the one on the command line, so ``(set-option :rlimit 0)`` runs unbounded under a
  receipt that records the lane's rlimit (case cli-script-rlimit-overrides). Nor an option that sends Z3's
  output elsewhere, since the verdict is read from that output;
* no ``set-option`` that turns models off or prints them as text: ``:produce-models`` or ``:model`` set to
  anything but ``true``, or ``:model.v1`` or ``:model.v2`` set to anything but ``false``. A check reads its
  witness from the model a run prints, and the command line then prints no model (cases
  cli-produce-models-off and cli-model-off) or prints it as a quoted string (case cli-model-v1-text), while
  the api entry prints its solver's model itself (``values.from_string_produce_models_off_reading`` and
  ``values.from_string_model_v1_reading``), so the two entries would hand a check different models;
* every top-level form is a command, a list headed by its name. ``from_string`` reads a text that starts
  ``p c`` as DIMACS, not SMT-LIB: it answered ``unsat`` to the clauses ``p cnf 1 2``, ``1 0``, ``-1 0``,
  where the command line reports ``p`` as an invalid command and answers ``sat`` to the ``(check-sat)``
  after them (case cli-dimacs-prefix, and ``values.from_string_dimacs_reading``). The refusal names a
  character that prints as nothing, such as a form feed or a byte order mark, by its code point;
* no NUL character (U+0000) anywhere. ``from_string`` takes a C string and reads the script only up to
  the first NUL, where the command line reads past it: premises whose second assertion follows a NUL in a
  ``;`` comment are ``unsat`` through the command line (case cli-nul-in-comment) and answered ``sat``
  through ``from_string`` (``values.from_string_nul_reading``), so a vacuous claim looked non-vacuous.

A script must parse, or it is refused too: Z3 runs every command it read before a fault, so the rules
above hold only for a script whose every command the lane can see. ``(echo "unsat")(exit)`` followed by
a stray ``)`` prints ``unsat`` and exits 0 (case cli-stray-paren-after-echo). The lane reads SMT-LIB 2.6
as Z3 does, and refuses the two things Z3 reads its own way: a ``#|`` block comment, which Z3 ends at the
first ``|#`` and which hid ``(echo "unsat")`` from a reader that took the ``|`` for a quoted symbol (case
cli-block-comment-hides-echo), and a backslash in a ``|quoted symbol|``, where Z3 reports an error and
reads on from the backslash (case cli-backslash-in-quoted-symbol). The input file is written only after
these checks, so a refused script never reaches Z3 through either entry.

Verdict lines, the grammar the CLI writes into ``runs[].verdictLines`` for engine ``z3`` and the one the
tab's parser must read the same way (ARCHITECTURE.md section 10.3):

* an answer: exactly ``sat``, ``unsat`` or ``unknown``;
* a reason: ``(:reason-unknown "<text>")``, kept only when the text is not empty;
* an error: a line that starts ``(error "``, continued on following lines until one ends ``")``;
* a note from the CLI itself: a line that starts ``statespace: `` (the engine was stopped by the
  wall-clock backstop or printed nothing, or the api runner could not ask the script's question).

Any other line is not a Z3 verdict line, and a receipt that holds one is rejected. The verdict is
``error`` when a note is present, when an error line comes before the answer (the solver answered a
different question than the script asked), or when there is not exactly one answer; otherwise it is the
answer. An error after the answer, such as asking for a model after ``unsat``, does not change it. Models
are not verdict lines: a run keeps its model for the check that replays it, because model values are not
canonical and witnesses are checked, never matched (spine section 9.1).

The model is the last block printed after ``sat`` that reads as one (``read_output``): a list of
``define-fun`` items, with the ``declare-fun`` and ``forall`` items of an uninterpreted sort's universe. The
command line's ``-model`` prints it after the output of every other command, ``(exit)`` included, so what
``(get-info ...)``, ``(get-model)``, ``(get-value ...)``, ``(eval ...)`` or ``(get-assignment)`` print after the
question comes before it (case cli-get-value-after-sat), and none of it but the model ``(get-model)`` prints
reads as a model with an item. The api entry prints only the answer and the model (case
api-get-value-after-sat).
"""

from __future__ import annotations

import hashlib
import os
import re
import shutil
import subprocess
import sys
import sysconfig
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from fractions import Fraction
from pathlib import Path
from typing import Any, Literal, Union

from statespace.check.lanes import Derivation, Finding, InputRefused, LineComparison, Refusal, RerunPlan, RunView, ToolUnavailable, as_list, as_map
from statespace.schema.statement_hash import statement_preimage

__all__ = [
    "ANSWERS",
    "DEFAULT_RLIMIT",
    "ENGINES",
    "MAX_RLIMIT",
    "BitVec",
    "Model",
    "ScriptLine",
    "ScriptRefused",
    "ToolUnavailable",
    "WALL_CLOCK_S",
    "Form",
    "Z3Run",
    "Z3Session",
    "Z3Tool",
    "check_script",
    "compare_output",
    "derive_verdict",
    "forms",
    "parse_model",
    "parse_script_line",
    "query_script",
    "question_parts",
    "read_output",
    "rerun_plan",
    "runner_env",
    "script_lines",
    "term_value",
    "unknown_reason",
    "verify_receipt",
]

ENGINES = ("z3",)
ANSWERS = ("sat", "unsat", "unknown")
DEFAULT_RLIMIT = 5_000_000  # a design value [D]; the receipt records whatever rlimit ran
WALL_CLOCK_S = 120.0  # a backstop [D]; the rlimit is the budget, and a run stopped here has no verdict
MAX_RLIMIT = 2**32 - 1  # Z3's rlimit parameter is an unsigned int; the command line refuses a larger value
Entry = Literal["cli", "api"]

_REASON = re.compile(r'\(:reason-unknown "(.*)"\)')
_STEP = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}")
CLI_NOTE = "statespace: "


class ScriptRefused(InputRefused):
    """The SMT-LIB text cannot be one run: it asks no question, several, or prints its own lines."""


# ----------------------------------------------------------------------------------- SMT-LIB reading
SExpr = Union[str, list["SExpr"]]


class SmtLibSyntaxError(ValueError):
    pass


def _scan(text: str) -> list[tuple[str, int]]:
    """SMT-LIB 2.6 tokens with the offset where each starts: parentheses, strings (with "" for a quote),
    |quoted symbols|, and words. Comments run from ; to the end of the line.

    It tokenizes as Z3 5.3.1 does wherever Z3 reads SMT-LIB 2.6 (a backslash in a string is a plain
    character, as Z3 reads it), and raises SmtLibSyntaxError where the two would part: a ``#|`` block
    comment, a Z3 extension that ends at the first ``|#``, and a backslash in a |quoted symbol|, which
    SMT-LIB forbids and where Z3 reports an error and reads on from the backslash. Elsewhere a character Z3
    rejects only makes Z3 report an error, without moving a parenthesis, a string or a quoted symbol."""
    tokens: list[tuple[str, int]] = []
    i, n = 0, len(text)
    while i < n:
        c = text[i]
        if c in " \t\r\n":
            i += 1
        elif c == ";":
            end = text.find("\n", i)
            i = n if end < 0 else end + 1
        elif c in "()":
            tokens.append((c, i))
            i += 1
        elif c == '"':
            j = i + 1
            while True:
                if j >= n:
                    raise SmtLibSyntaxError("a string is not terminated")
                if text[j] == '"':
                    if j + 1 < n and text[j + 1] == '"':
                        j += 2
                        continue
                    break
                j += 1
            tokens.append((text[i : j + 1], i))
            i = j + 1
        elif c == "|":
            j = text.find("|", i + 1)
            if j < 0:
                raise SmtLibSyntaxError("a |quoted symbol| is not terminated")
            if "\\" in text[i + 1 : j]:
                raise SmtLibSyntaxError("a |quoted symbol| holds a backslash, which SMT-LIB does not allow and Z3 reads its own way")
            tokens.append((text[i : j + 1], i))
            i = j + 1
        else:
            j = i
            while j < n and text[j] not in ' \t\r\n();"|':
                j += 1
            if text[j - 1] == "#" and j < n and text[j] == "|":
                # Z3 ends a symbol at #, so #| opens its block comment wherever it stands outside a string,
                # a quoted symbol or a ; comment.
                raise SmtLibSyntaxError("#| opens a block comment, which SMT-LIB does not define and Z3 reads its own way: use ; comments")
            tokens.append((text[i:j], i))
            i = j
    return tokens


def tokenize(text: str) -> list[str]:
    """SMT-LIB 2.6 tokens: parentheses, strings, |quoted symbols| and words, without comments."""
    return [token for token, _ in _scan(text)]


@dataclass(frozen=True)
class Form:
    """One top-level form of a script: its s-expression, the command it names (None when the form is
    not a list headed by a symbol, which Z3 reports as an error), and where it starts in the text."""

    expr: SExpr
    head: str | None
    start: int


def forms(text: str) -> list[Form]:
    """Every top-level form of `text`, in order."""
    out: list[Form] = []
    stack: list[list[SExpr]] = [[]]
    start = 0
    for token, at in _scan(text):
        if len(stack) == 1:
            start = at
        if token == "(":
            stack.append([])
            continue
        if token == ")":
            if len(stack) == 1:
                raise SmtLibSyntaxError("a ) closes nothing")
            done = stack.pop()
            stack[-1].append(done)
        else:
            stack[-1].append(token)
        if len(stack) == 1:
            expr = stack[0][-1]
            head = expr[0] if isinstance(expr, list) and expr and isinstance(expr[0], str) else None
            out.append(Form(expr, head, start))
    if len(stack) != 1:
        raise SmtLibSyntaxError("a ( is not closed")
    return out


def parse_sexprs(text: str) -> list[SExpr]:
    """Every top-level s-expression of `text`."""
    return [form.expr for form in forms(text)]


def render(expr: SExpr) -> str:
    if isinstance(expr, str):
        return expr
    return "(" + " ".join(render(part) for part in expr) + ")"


def _symbol(token: str) -> str:
    return token[1:-1] if len(token) >= 2 and token.startswith("|") and token.endswith("|") else token


def _smt_string(text: str) -> str:
    return '"' + text.replace('"', '""') + '"'


def query_script(assertions: str) -> str:
    """A complete query from declarations and assertions (`Solver.sexpr()`, or `to_smt2()`, which
    already ends in a check-sat): one (check-sat), then (get-info :reason-unknown), so that an
    `unknown` answer carries Z3's reason through either entry."""
    text = assertions.rstrip()
    heads = _heads(text)
    if "check-sat" not in heads:
        text += "\n(check-sat)"
    if "get-info" not in heads:
        text += "\n(get-info :reason-unknown)"
    return text + "\n"


def _heads(text: str) -> list[str]:
    try:
        exprs = parse_sexprs(text)
    except SmtLibSyntaxError:
        return []
    return [e[0] for e in exprs if isinstance(e, list) and e and isinstance(e[0], str)]


# The rules for a script that is one run (module docstring, "Scripts"). Before its question a script only
# sets the question up; after it, it only reads the answer.
QUESTIONS = ("check-sat", "check-sat-assuming")
SETUP = frozenset({
    "set-logic", "set-option", "set-info", "declare-sort", "define-sort", "declare-const", "declare-fun",
    "define-fun", "define-fun-rec", "define-funs-rec", "define-const", "declare-datatype", "declare-datatypes",
    "assert", "push", "pop", "reset", "reset-assertions",
})
READ = frozenset({
    "get-model", "get-value", "get-info", "get-assignment", "get-unsat-core", "get-unsat-assumptions", "get-proof",
    "get-assertions", "get-option", "eval", "set-info", "exit",
})
_PRINTS = frozenset({"simplify", "eval", "display"})  # print a term, which could read as an answer
_OUTPUT_OPTIONS = frozenset({"regular_output_channel", "diagnostic_output_channel"})
# Options that decide whether, and how, Z3 prints a model, with the one value a run allows: a check reads its
# witness from the model a run prints (cases cli-produce-models-off, cli-model-off and cli-model-v1-text).
_MODEL_OPTIONS = {"produce_models": "true", "model": "true", "model.v1": "false", "model.v2": "false"}


def _option(expr: SExpr) -> str | None:
    """The option a (set-option :name value) sets, as Z3 normalises it: lowercase, - read as _."""
    if isinstance(expr, list) and len(expr) >= 2 and isinstance(expr[1], str) and expr[1].startswith(":"):
        return expr[1][1:].lower().replace("-", "_")
    return None


def _option_value(expr: SExpr) -> str | None:
    """The value a (set-option :name value) gives, as Z3 reads a Boolean: the word, with the bars of a
    |quoted symbol| or the quotes of a "string" removed (Z3 reads |false| as false). None without one value."""
    if not (isinstance(expr, list) and len(expr) == 3 and isinstance(expr[2], str)):
        return None
    value = _symbol(expr[2])
    return value[1:-1] if len(value) >= 2 and value.startswith('"') and value.endswith('"') else value


def _budget_option(name: str) -> bool:
    """rlimit, timeout and memory limits (Z3 5.3.1's rlimit, opt.rlimit, timeout, solver.timeout,
    combined_solver.solver2_timeout, max_memory, memory_max_size and the like): Z3 lets a script's own
    value replace the rlimit the lane passes, so (set-option :rlimit 0) runs unbounded, and a timeout or a
    memory cap makes the answer depend on the machine. A deterministic limit that only stops the search
    sooner (smt.max_conflicts, rewriter.max_steps) cannot lift the rlimit."""
    last = name.rsplit(".", 1)[-1]
    return last.endswith(("rlimit", "timeout")) or last == "max_memory" or last.startswith("memory_")


def _sets_up(head: str) -> bool:
    """Whether a command only sets the question up: an option, a declaration, a definition, an assertion
    or a change of scope. No such command prints anything but an error."""
    return head in SETUP or head.startswith(("declare-", "define-"))


def _annotation(expr: SExpr) -> SExpr | None:
    """The first annotated term, (! term attribute ...), in `expr`, or None. Z3 reads the quoted symbol |!|
    as the keyword ! (case cli-quoted-annotation-assumption), so the bars are removed before comparing."""
    if not isinstance(expr, list):
        return None
    if expr and isinstance(expr[0], str) and _symbol(expr[0]) == "!":
        return expr
    for part in expr:
        inner = _annotation(part)
        if inner is not None:
            return inner
    return None


def _at(text: str, offset: int) -> str:
    """Where `offset` falls in `text`, as a message names it: the line and the column, both from 1."""
    line = text.count("\n", 0, offset) + 1
    column = offset - (text.rfind("\n", 0, offset) + 1) + 1
    return f"line {line}, column {column}"


def _shown(text: str, limit: int = 40) -> str:
    """Text as a message shows it, with each character that prints as nothing (a form feed, a byte order
    mark) written as U+XXXX, so that the learner can find it."""
    shown = "".join(c if c.isprintable() else f"U+{ord(c):04X}" for c in text[:limit])
    return shown + ("..." if len(text) > limit else "")


def check_script(text: str) -> None:
    """Refuse a script that cannot be one run with one verdict that both entries read the same way
    (module docstring, "Scripts"). A script the lane cannot read is refused as well: Z3 would run every
    command before the fault, and the rules hold only for commands the lane can see. `text` is what Z3
    reads, through either entry."""
    nul = text.find("\x00")
    if nul >= 0:
        raise ScriptRefused(f"the script holds a NUL character (U+0000) at {_at(text, nul)}; Z3's Python API reads a script only up to it while the z3 command reads past it, so the two would answer different questions: remove it")
    try:
        found = forms(text)
    except SmtLibSyntaxError as error:
        raise ScriptRefused(f"the script cannot be read as SMT-LIB ({error}); statespace runs only a script it can check asks one question, because Z3 runs every command before a fault") from error
    for f in found:
        if f.head is not None:
            continue
        if f.start == 0 and text.startswith("\ufeff"):
            raise ScriptRefused("the script starts with a byte order mark (U+FEFF), which Z3 does not read as SMT-LIB: save the file as UTF-8 without a byte order mark")
        raise ScriptRefused(f"the script has {_shown(render(f.expr))} at {_at(text, f.start)}, which is not a command; every top-level form of a run is a command, such as (assert ...), so remove it or move it into a ; comment")
    heads = [f.head for f in found if f.head is not None]
    if "echo" in heads:
        raise ScriptRefused("the script uses (echo ...), whose output could read as an answer; remove it")
    if "check-sat-using" in heads:
        raise ScriptRefused("the script asks (check-sat-using ...), which picks Z3's own tactic; a run asks (check-sat) or (check-sat-assuming ...), which statespace can ask through both the z3 command and Z3's Python API")
    asked = [i for i, f in enumerate(found) if f.head in QUESTIONS]
    if not asked:
        raise ScriptRefused("the script asks no question: add one (check-sat)")
    if len(asked) > 1:
        raise ScriptRefused(f"the script asks {len(asked)} questions; a run answers one, so give each its own script")
    for f in found:
        name = _option(f.expr) if f.head == "set-option" else None
        if name is not None and _budget_option(name):
            raise ScriptRefused(f"the script sets :{name}; statespace gives every run its budget (an rlimit, which the receipt records), and a script's own limit would replace it or tie the answer to the machine: remove it")
        if name in _OUTPUT_OPTIONS:
            raise ScriptRefused(f"the script sends Z3's output elsewhere with :{name}, and statespace reads the verdict from that output: remove it")
        kept = _MODEL_OPTIONS.get(name) if name is not None else None
        if kept is not None and _option_value(f.expr) != kept:
            assert isinstance(f.expr, list)  # _option read it as (set-option :name ...)
            what = "turns models off" if kept == "true" else "prints the model as text"
            given = " ".join(render(part) for part in f.expr[2:]) or "no value"
            raise ScriptRefused(f"the script sets {_shown(render(f.expr[1]))} to {_shown(given)}, which {what}, and statespace reads a run's witness from the model Z3 prints: remove it")
    q = asked[0]
    question = found[q].expr
    assert isinstance(question, list)
    if found[q].head == "check-sat-assuming" and not (len(question) == 2 and isinstance(question[1], list)):
        raise ScriptRefused("(check-sat-assuming ...) takes one list of literals, such as (check-sat-assuming (p (not q)))")
    assumptions = question[1] if found[q].head == "check-sat-assuming" else question[1:]
    assert isinstance(assumptions, list)
    annotated: SExpr | None = None
    for term in assumptions:
        annotated = _annotation(term)
        if annotated is not None:
            break
    if annotated is not None:
        raise ScriptRefused(
            f"({found[q].head} ...) holds the annotation {_shown(render(annotated), 60)}; a question holds none, because with unsat cores on, Z3's "
            "Python API reads a named assumption as an assertion that its name can switch off, while the z3 command assumes it, so the two would "
            "answer different questions: name an assertion before the question instead, or declare a Boolean constant, assert that it implies "
            "the formula, and assume the constant"
        )
    for f in found[:q]:
        if f.head is None or _sets_up(f.head):
            continue  # a form that is not a command was refused above
        head = _shown(f.head)
        if f.head == "exit":
            raise ScriptRefused("the script exits before it asks its question")
        if f.head.startswith("get-"):
            raise ScriptRefused(f"({head} ...) comes before the question, so it reads an answer the script has not asked for yet; move it after the question")
        if f.head in _PRINTS:
            raise ScriptRefused(f"({head} ...) prints before the question, and what it prints could read as an answer; remove it or move it after the question")
        raise ScriptRefused(f"({head} ...) is not part of a satisfiability question; before its question a run allows options, declarations, definitions, assertions, push, pop, reset and reset-assertions")
    for f in found[q + 1 :]:
        if f.head is not None and f.head not in READ:
            raise ScriptRefused(f"({_shown(f.head)} ...) comes after the question, where it cannot change the answer but reads as if it did; after its question a run allows only commands that read the answer, such as (get-model), (get-value ...) and (get-info :reason-unknown), and (exit)")


def question_parts(text: str) -> tuple[str, list[str]]:
    """What the api entry asks of a script that check_script accepts: the text before its one question,
    which holds the declarations and assertions in scope at the question, and the question's assumptions
    as SMT-LIB terms (Z3 reads (check-sat p q) as (check-sat-assuming (p q))). Raises SmtLibSyntaxError
    when the text does not parse."""
    found = forms(text)
    question = next(f for f in found if f.head in QUESTIONS)
    expr = question.expr
    assert isinstance(expr, list)
    if question.head == "check-sat":
        literals = expr[1:]
    else:
        literals = expr[1] if len(expr) == 2 and isinstance(expr[1], list) else []
    return text[: question.start], [render(literal) for literal in literals]


# ------------------------------------------------------------------------------------ verdict lines
def _error_complete(line: str) -> bool:
    return line.rstrip().endswith('")')


def derive_verdict(lines: Sequence[str]) -> Derivation:
    """The verdict that a z3 run's verdict lines carry, by the grammar in this module's docstring."""
    problems: list[str] = []
    answers: list[str] = []
    reason: str | None = None
    error_first = False
    notes = 0
    in_error = False
    for index, line in enumerate(lines):
        if in_error:
            in_error = not _error_complete(line)
            continue
        if line in ANSWERS:
            answers.append(line)
            continue
        found = _REASON.fullmatch(line)
        if found:
            reason = found.group(1).replace('""', '"')
            continue
        if line.startswith('(error "'):
            if not answers:
                error_first = True
            in_error = not _error_complete(line)
            continue
        if line.startswith(CLI_NOTE):
            notes += 1
            continue
        problems.append(f"line {index + 1} is not a Z3 verdict line: {line!r}")
    if in_error:
        problems.append("an (error ...) line is not terminated")
    if not lines:
        problems.append("there are no verdict lines")
    if problems:
        return Derivation(None, None, tuple(problems))
    if notes or error_first or len(answers) != 1:
        return Derivation("error")
    verdict = answers[0]
    return Derivation(verdict, reason if verdict == "unknown" else None)


@dataclass(frozen=True)
class Output:
    """Z3's output, sorted: the verdict lines, the model (the last block after `sat` that reads as one, if
    any), the rest."""

    lines: tuple[str, ...]
    verdict_lines: tuple[str, ...]
    model_text: str | None
    other: tuple[str, ...]


def _paren_delta(line: str, state: list[str]) -> int:
    """How much `line` changes the parenthesis depth, outside strings, |symbols| and comments. `state`
    carries an open string or symbol from one line to the next ("" when none)."""
    delta = 0
    i, n = 0, len(line)
    while i < n:
        c = line[i]
        if state[0] == '"':
            if c == '"':
                if i + 1 < n and line[i + 1] == '"':
                    i += 2
                    continue
                state[0] = ""
        elif state[0] == "|":
            if c == "|":
                state[0] = ""
        elif c == ";":
            break
        elif c in '"|':
            state[0] = c
        elif c == "(":
            delta += 1
        elif c == ")":
            delta -= 1
        i += 1
    return delta


# What a model holds as either entry prints it: a define-fun for each constant and function, and for an
# uninterpreted sort its universe, a declare-fun for each element and a forall that bounds the sort to them.
_MODEL_ITEMS = frozenset({"define-fun", "define-fun-rec", "declare-fun", "forall"})


def _model_size(block: str) -> int | None:
    """How many items `block` holds when it reads as a model, else None. A model is one list of define-fun,
    declare-fun and forall items, or such a list headed by `model`, as older Z3 printed it. What a command
    after the question prints does not read as one: (get-value ...) and (get-assignment) print a list of
    (term value) pairs, (eval ...) a term and (get-info ...) keywords. A forall comes only with the
    declare-fun items of the universe it bounds, so a list of quantified assertions, which (get-assertions)
    prints in interactive mode, is not a model either."""
    try:
        exprs = parse_sexprs(block)
    except SmtLibSyntaxError:
        return None
    if len(exprs) != 1 or not isinstance(exprs[0], list):
        return None
    items = exprs[0][1:] if exprs[0][:1] == ["model"] else exprs[0]
    heads = [item[0] for item in items if isinstance(item, list) and item and isinstance(item[0], str) and item[0] in _MODEL_ITEMS]
    if len(heads) != len(items) or ("forall" in heads and "declare-fun" not in heads):
        return None
    return len(items)


def read_output(text: str) -> Output:
    """Sort Z3's output into verdict lines, the model after `sat`, and other lines (`success`, what the
    commands after the question print, a model printed more than once), in the order printed.

    The model is the last block after `sat` that reads as one (_model_size): the command line's -model prints
    it after the output of every other command, (exit) included (case cli-get-value-after-sat), and Z3 prints
    it again for each (get-model). An empty list is also what (get-assignment) prints with nothing named (the
    same case), so an empty block is the model only when no block with an item reads as one."""
    lines = text.splitlines()
    verdict: list[str] = []
    pieces: list[tuple[list[str], int | None]] = []  # every other line or block, with its size as a model after sat
    last_answer: str | None = None
    i = 0
    while i < len(lines):
        line = lines[i]
        if line in ANSWERS:
            verdict.append(line)
            last_answer = line
            i += 1
            continue
        found = _REASON.fullmatch(line)
        if found:
            if found.group(1):
                verdict.append(line)
            i += 1
            continue
        if line.startswith('(error "'):
            verdict.append(line)
            i += 1
            while not _error_complete(verdict[-1]) and i < len(lines):
                verdict.append(lines[i])
                i += 1
            continue
        if line.startswith(CLI_NOTE):
            # The api runner's own note (a script it cannot run as one question). Z3 prints no such line
            # itself, since a script with echo is refused; a note makes the verdict error.
            verdict.append(line)
            i += 1
            continue
        if line.startswith("("):
            block = [line]
            state = [""]
            depth = _paren_delta(line, state)
            i += 1
            while depth > 0 and i < len(lines):
                block.append(lines[i])
                depth += _paren_delta(lines[i], state)
                i += 1
            pieces.append((block, _model_size("\n".join(block)) if last_answer == "sat" else None))
            continue
        pieces.append(([line], None))
        i += 1
    models = [k for k, (_, size) in enumerate(pieces) if size is not None]
    chosen = ([k for k in models if pieces[k][1]] or models or [None])[-1]
    model = "\n".join(pieces[chosen][0]) if chosen is not None else None
    other = tuple(line for k, (block, _) in enumerate(pieces) if k != chosen for line in block)
    return Output(tuple(lines), tuple(verdict), model, other)


# ---------------------------------------------------------------------------------------- models
@dataclass(frozen=True)
class BitVec:
    """A bit-vector value: `value` is the unsigned reading, `width` the number of bits."""

    value: int
    width: int

    @property
    def signed(self) -> int:
        """The two's-complement reading."""
        return self.value - (1 << self.width) if self.width and self.value >> (self.width - 1) else self.value


Value = Union[int, bool, Fraction, BitVec]


@dataclass(frozen=True)
class Model:
    """A model as Z3 printed it: each constant's value and sort as SMT-LIB terms, and any function's
    whole definition. Values are not canonical: replay them, do not compare them (spine section 9.1)."""

    constants: Mapping[str, str]
    sorts: Mapping[str, str]
    functions: Mapping[str, str] = field(default_factory=dict[str, str])

    def value(self, name: str) -> Value | None:
        """The value of constant `name` as a Python value, or None for a sort this module does not read."""
        term = self.constants.get(name)
        return None if term is None else term_value(term)


def parse_model(text: str) -> Model:
    """Read a model block, `( (define-fun a () Int 1) ... )` as both entries print it."""
    exprs = parse_sexprs(text)
    body: list[SExpr] = []
    for expr in exprs:
        if isinstance(expr, list):
            items: list[SExpr] = expr[1:] if expr and expr[0] == "model" else expr
            body.extend(items)
    constants: dict[str, str] = {}
    sorts: dict[str, str] = {}
    functions: dict[str, str] = {}
    for item in body:
        if not (isinstance(item, list) and len(item) == 5 and item[0] == "define-fun" and isinstance(item[1], str)):
            continue
        name = _symbol(item[1])
        if item[2] == []:
            sorts[name] = render(item[3])
            constants[name] = render(item[4])
        else:
            functions[name] = render(item)
    return Model(constants, sorts, functions)


def _value(expr: SExpr) -> Value | None:
    if isinstance(expr, str):
        if expr == "true":
            return True
        if expr == "false":
            return False
        if re.fullmatch(r"[0-9]+", expr):
            return int(expr)
        if re.fullmatch(r"[0-9]+\.[0-9]+", expr):
            return Fraction(expr)
        if re.fullmatch(r"#x[0-9a-fA-F]+", expr):
            return BitVec(int(expr[2:], 16), 4 * (len(expr) - 2))
        if re.fullmatch(r"#b[01]+", expr):
            return BitVec(int(expr[2:], 2), len(expr) - 2)
        return None
    if len(expr) == 2 and expr[0] == "-":
        inner = _value(expr[1])
        if isinstance(inner, bool) or not isinstance(inner, (int, Fraction)):
            return None
        return -inner
    if len(expr) == 3 and expr[0] == "/":
        top, bottom = _value(expr[1]), _value(expr[2])
        if isinstance(top, bool) or isinstance(bottom, bool) or not isinstance(top, (int, Fraction)) or not isinstance(bottom, (int, Fraction)) or bottom == 0:
            return None
        return Fraction(top) / Fraction(bottom)
    if len(expr) == 3 and expr[0] == "_" and isinstance(expr[1], str) and isinstance(expr[2], str):
        bits = re.fullmatch(r"bv([0-9]+)", expr[1])
        if bits and re.fullmatch(r"[0-9]+", expr[2]):
            return BitVec(int(bits.group(1)), int(expr[2]))
    return None


def term_value(term: str) -> Value | None:
    """An SMT-LIB value term as a Python value: an Int as int, a Real as Fraction, a Bool as bool and a
    bit-vector as BitVec. None for anything else (arrays, datatypes)."""
    try:
        exprs = parse_sexprs(term)
    except SmtLibSyntaxError:
        return None
    return _value(exprs[0]) if len(exprs) == 1 else None


# ----------------------------------------------------------------------------------------- tools
def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def _pinned(pin_id: str, sha256: str) -> bool:
    """Whether `sha256` is the course's pin for this tool on this machine (statespace doctor's pins)."""
    from statespace.doctor import pin_for

    pin = pin_for(pin_id)
    return bool(pin.sha256) and sha256 == pin.sha256


@dataclass(frozen=True)
class Z3Tool:
    """A Z3 that can run, named as `statespace doctor` names it: `z3` is the Python API's native library
    and `z3-cli` the binary. `path` locates it on this machine and is never written to a receipt."""

    name: str
    version: str  # verbatim: get_version_string() for z3, the --version line for z3-cli
    short_version: str  # such as 5.3.1, which runs[].version records
    sha256: str
    pinned: bool
    path: Path

    def receipt_entry(self) -> dict[str, Any]:
        return {"name": self.name, "version": self.version, "sha256": self.sha256, "pinned": self.pinned}


def find_cli(python: str | None = None) -> Z3Tool:
    """The z3 binary the wheel installed beside this Python, else the first `z3` on PATH."""
    executable = "z3.exe" if os.name == "nt" else "z3"
    scripts = [Path(sysconfig.get_path("scripts")) / executable, Path(python or sys.executable).parent / executable]
    binary = next((p for p in scripts if p.is_file()), None)
    if binary is None:
        on_path = shutil.which("z3")
        binary = Path(on_path) if on_path else None
    if binary is None:
        raise ToolUnavailable("the z3 binary is not installed here; it comes with the z3-solver wheel (uv run --with z3-solver==5.3.1 ...)")
    try:
        done = subprocess.run([str(binary), "--version"], capture_output=True, text=True, errors="replace", timeout=30, stdin=subprocess.DEVNULL)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise ToolUnavailable(f"the z3 binary at hand did not start: {error}") from error
    line = next((l.strip() for l in (done.stdout + done.stderr).splitlines() if l.strip()), "")
    found = re.match(r"Z3 version (\S+)", line)
    if done.returncode != 0 or found is None:
        raise ToolUnavailable(f"`z3 --version` printed {line!r} with exit code {done.returncode}, not a Z3 version line")
    sha = _sha256(binary)
    return Z3Tool("z3-cli", line, found.group(1), sha, _pinned("z3-cli", sha), binary)


def find_api() -> Z3Tool:
    """The z3 package this Python imports, and the native library it loads."""
    try:
        import z3  # pyright: ignore[reportMissingTypeStubs]
    except ImportError as error:
        raise ToolUnavailable("z3 is not importable here: install z3-solver==5.3.1 (uv run --with z3-solver==5.3.1 ...)") from error
    root = Path(str(z3.__file__)).resolve().parent
    library = next(iter(sorted((root / "lib").glob("libz3*"))), None)
    if library is None:
        raise ToolUnavailable(f"the z3 package at hand holds no native library under {root.name}/lib")
    version = str(z3.get_version_string())
    sha = _sha256(library)
    return Z3Tool("z3", version, version, sha, _pinned("z3", sha), library)


# ------------------------------------------------------------------------------------------ runs
@dataclass(frozen=True)
class Z3Run:
    """One Z3 execution, as a check reads it and as the receipt records it."""

    step: str
    entry: Entry
    version: str
    argv: tuple[str, ...]  # as recorded: the engine by name, paths relative to the lab repository
    input_path: str  # the input file, relative to the lab repository
    input_sha256: str  # of the bytes the engine read; equal to the query's statement hash
    rlimit: int
    seed: int | None
    exit_code: int  # recorded, never read alone; negative when the backstop killed the process
    timed_out: bool
    output: str  # everything the engine printed
    log_path: str  # where that output was written, relative to the lab repository
    verdict_lines: tuple[str, ...]
    verdict: str  # sat, unsat, unknown or error
    reason_unknown: str | None
    model: Model | None  # after sat, when a model was asked for and could be read
    ms: int

    def receipt_run(self) -> dict[str, Any]:
        budget: dict[str, int] = {"rlimit": self.rlimit}
        if self.seed is not None:
            budget["seed"] = self.seed
        return {
            "step": self.step,
            "engine": "z3",
            "version": self.version,
            "argv": list(self.argv),
            "inputSha256": self.input_sha256,
            "budget": budget,
            "exitCode": self.exit_code,
            "verdictLines": list(self.verdict_lines),
            "verdict": self.verdict,
            "ms": self.ms,
        }


class Z3Session:
    """The Z3 runs of one lab stage: each query is written beside the receipt, run under an rlimit and
    read by its verdict lines. `sink` receives each run's receipt entry as it finishes, so runs from
    several lanes keep the order they ran in."""

    SECTION = "z3"  # the receipt@1 block this session writes

    def __init__(
        self,
        *,
        root: Path,
        workdir: Path,
        sink: Callable[[dict[str, Any]], None] | None = None,
        wall_clock_s: float = WALL_CLOCK_S,
        python: str | None = None,
    ) -> None:
        self.root = root.resolve()
        self.workdir = workdir.resolve()
        if self.root != self.workdir and self.root not in self.workdir.parents:
            raise ValueError("the session's directory must be inside the lab repository")
        self.sink = sink
        self.wall_clock_s = wall_clock_s
        self.python = python or sys.executable
        self.runs: list[Z3Run] = []
        self._tools: dict[Entry, Z3Tool] = {}
        self._steps: set[str] = set()
        self.headline_run: Z3Run | None = None

    # -- tools
    def tool(self, entry: Entry) -> Z3Tool:
        if entry not in self._tools:
            self._tools[entry] = find_cli(self.python) if entry == "cli" else find_api()
        return self._tools[entry]

    def receipt_tools(self) -> list[dict[str, Any]]:
        used = {run.entry for run in self.runs}
        return [self._tools[entry].receipt_entry() for entry in ("api", "cli") if entry in used and entry in self._tools]

    # -- runs
    def _step(self, step: str) -> str:
        if not _STEP.fullmatch(step):
            raise ValueError(f"step {step!r} is not a local id: letters and digits, then . _ -, at most 64 characters")
        name, n = step, 1
        while name in self._steps:
            n += 1
            suffix = f"-{n}"
            name = step[: 64 - len(suffix)] + suffix
        self._steps.add(name)
        return name

    def _relative(self, path: Path) -> str:
        return path.relative_to(self.root).as_posix()

    def run(
        self,
        text: str,
        *,
        step: str,
        rlimit: int = DEFAULT_RLIMIT,
        entry: Entry = "cli",
        model: bool = True,
        seed: int | None = None,
    ) -> Z3Run:
        """Run one query. Raises ScriptRefused for a script that cannot be one run, ToolUnavailable when Z3
        cannot run here, and ValueError for a bad step name or rlimit (a fault in the lab's check)."""
        if type(rlimit) is not int or not 0 < rlimit <= MAX_RLIMIT:
            raise ValueError(f"a Z3 run needs an rlimit from 1 to {MAX_RLIMIT}: statespace never runs Z3 unbounded, and Z3 reads rlimit as an unsigned 32-bit number")
        if entry not in ("cli", "api"):
            raise ValueError(f"entry is cli or api, not {entry!r}")
        data = statement_preimage(text)
        check_script(data.decode("utf-8"))  # the bytes both entries read, so the rules hold for what Z3 sees
        tool = self.tool(entry)
        name = self._step(step)
        self.workdir.mkdir(parents=True, exist_ok=True)
        source = self.workdir / f"{name}.smt2"
        source.write_bytes(data)
        relative = self._relative(source)
        options = ["-model"] if model and entry == "cli" else (["--model"] if model else [])
        if entry == "cli":
            shown = ["z3", "-smt2", *options, f"rlimit={rlimit}", relative]
            actual = [str(tool.path), *shown[1:]]
            env = None
        else:
            shown = ["python", "-P", "-m", "statespace.lanes.z3", "--rlimit", str(rlimit), *options, relative]
            actual = [self.python, *shown[1:]]
            env = runner_env()
        from statespace.check import proc

        done = proc.run(actual, cwd=self.root, timeout_s=self.wall_clock_s, env=env)
        if done.returncode is None:
            raise ToolUnavailable(f"z3 did not start: {done.error}")
        output = read_output(done.output)
        lines = list(output.verdict_lines)
        if done.timed_out:
            lines.append(f"{CLI_NOTE}z3 gave no answer within {self.wall_clock_s:g} s of wall-clock time and was stopped")
        elif not lines:
            lines.append(f"{CLI_NOTE}z3 printed no verdict line (exit code {done.returncode})")
        derived = derive_verdict(lines)
        verdict = derived.verdict or "error"
        parsed: Model | None = None
        if verdict == "sat" and output.model_text is not None:
            try:
                parsed = parse_model(output.model_text)
            except SmtLibSyntaxError:
                parsed = None
        log = self.workdir / f"{name}.out"
        log.write_bytes(done.output.encode("utf-8"))  # as printed: no line-ending translation on any system
        result = Z3Run(
            step=name,
            entry=entry,
            version=tool.short_version,
            argv=tuple(shown),
            input_path=relative,
            input_sha256=hashlib.sha256(data).hexdigest(),
            rlimit=rlimit,
            seed=seed,
            exit_code=done.returncode,
            timed_out=done.timed_out,
            output=done.output,
            log_path=self._relative(log),
            verdict_lines=tuple(lines),
            verdict=verdict,
            reason_unknown=derived.reason,
            model=parsed,
            ms=done.ms,
        )
        self.runs.append(result)
        if self.sink is not None:
            self.sink(result.receipt_run())
        return result

    def headline(self, run: Z3Run) -> None:
        """Make `run` the receipt's z3 section: the stage's main query (its claim's statement)."""
        if run not in self.runs:
            raise ValueError("the headline must be a run of this session")
        if run.verdict not in ANSWERS:
            raise ValueError(f"the z3 section holds sat, unsat or unknown; this run's verdict is {run.verdict}")
        self.headline_run = run

    def receipt_section(self) -> dict[str, Any] | None:
        run = self.headline_run
        if run is None:
            return None
        section: dict[str, Any] = {"smtlibSha256": run.input_sha256, "entry": run.entry, "rlimit": run.rlimit, "verdict": run.verdict}
        if run.verdict == "unknown" and run.reason_unknown:
            section["reason_unknown"] = run.reason_unknown
        return section


def runner_env() -> dict[str, str]:
    """The environment for the API runner: this same statespace package first on the path, so the runner
    is the code that is running now. -P keeps the current directory off the path."""
    env = dict(os.environ)
    parent = str(Path(__file__).resolve().parents[2])
    env["PYTHONPATH"] = parent + (os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else "")
    return env


# ---------------------------------------------------------------------------------- receipt checks
def _argv_rlimit(argv: Sequence[Any]) -> int | None:
    for index, arg in enumerate(argv):
        if not isinstance(arg, str):
            continue
        found = re.fullmatch(r"rlimit=([0-9]+)", arg)
        if found:
            return int(found.group(1))
        if arg == "--rlimit" and index + 1 < len(argv) and re.fullmatch(r"[0-9]+", str(argv[index + 1])):
            return int(str(argv[index + 1]))
    return None


def _argv_entry(argv: Sequence[Any]) -> Entry | None:
    """The entry a z3 run's command line names, as Z3Session writes it: api for the api runner's module, cli
    for a z3 binary; None for a command that names neither, such as one a tool other than statespace wrote."""
    words = [arg for arg in argv if isinstance(arg, str)]
    if "statespace.lanes.z3" in words:
        return "api"
    if words and Path(words[0]).name in ("z3", "z3.exe"):
        return "cli"
    return None


def _argv_input(argv: Sequence[Any]) -> str | None:
    last = argv[-1] if argv else None
    if isinstance(last, str) and last.endswith(".smt2") and not last.startswith("-") and "=" not in last:
        return last
    return None


def _inside(root: Path, relative: str) -> Path | None:
    base = root.resolve()
    candidate = (base / relative).resolve()
    return candidate if candidate == base or base in candidate.parents else None


def verify_receipt(receipt: Mapping[str, Any], root: Path | None) -> list[Finding]:
    """The Z3 lane's checks of a receipt: each z3 run's rlimit against its command line, its input file
    against its hash, and the z3 section against the runs it describes (their input, verdict and rlimit,
    and the entry their command lines name)."""
    findings: list[Finding] = []
    runs: list[tuple[int, Mapping[str, Any]]] = [(i, m) for i, m in enumerate(as_map(r) for r in as_list(receipt.get("runs"))) if m is not None and m.get("engine") in ENGINES]
    for index, run in runs:
        where = f"/runs/{index}"
        argv = as_list(run.get("argv"))
        budget = as_map(run.get("budget")) or {}
        ran_with = _argv_rlimit(argv)
        if ran_with is not None and budget.get("rlimit") != ran_with:
            findings.append(Finding("fail", f"{where}/budget", f"the command line ran under rlimit {ran_with}, but the budget says {budget.get('rlimit')}"))
        if "rlimit" not in budget:
            findings.append(Finding("note", f"{where}/budget", "this z3 run records no rlimit; statespace always runs Z3 under one"))
        path = _argv_input(argv)
        if path is not None and root is not None:
            file = _inside(root, path)
            if file is None:
                findings.append(Finding("note", f"{where}/argv", f"the input {path} is outside the repository, so its hash is shown as reported"))
            elif not file.is_file():
                findings.append(Finding("note", f"{where}/inputSha256", f"the input {path} is not on disk, so its hash is shown as reported"))
            elif _sha256(file) != run.get("inputSha256"):
                findings.append(Finding("fail", f"{where}/inputSha256", f"the input {path} is not the file this run read: its SHA-256 differs"))
    section = as_map(receipt.get("z3"))
    if section is not None:
        on_input = [(i, r) for i, r in runs if r.get("inputSha256") == section.get("smtlibSha256")]
        if not on_input:
            findings.append(Finding("fail", "/z3/smtlibSha256", "no z3 run read the input this section names"))
        else:
            matching = [(i, r) for i, r in on_input if r.get("verdict") == section.get("verdict") and (as_map(r.get("budget")) or {}).get("rlimit") == section.get("rlimit")]
            if not matching:
                said = "; ".join(f"run {i + 1} says {r.get('verdict')} under rlimit {(as_map(r.get('budget')) or {}).get('rlimit')}" for i, r in on_input)
                findings.append(Finding("fail", "/z3", f"the z3 section says {section.get('verdict')} under rlimit {section.get('rlimit')}, but {said}"))
            else:
                # Only a command line that names its entry can contradict the section's entry.
                ran = {_argv_entry(as_list(r.get("argv"))) for _, r in matching}
                entry = section.get("entry")
                if entry in ("cli", "api") and None not in ran and entry not in ran:
                    through = " and ".join("the z3 command" if e == "cli" else "Z3's Python API" for e in sorted(e for e in ran if e is not None))
                    findings.append(Finding("fail", "/z3/entry", f"the z3 section says entry {entry}, but the run it describes went through {through}"))
            reason = section.get("reason_unknown")
            if reason is not None:
                if section.get("verdict") != "unknown":
                    findings.append(Finding("fail", "/z3/reason_unknown", "a reason_unknown goes only with the verdict unknown"))
                elif matching:
                    carried = {derive_verdict([str(line) for line in as_list(r.get("verdictLines"))]).reason for _, r in matching} - {None}
                    if carried and reason not in carried:
                        findings.append(Finding("fail", "/z3/reason_unknown", "the reason differs from the reason line of the run it describes"))
    return findings


# ----------------------------------------------------------------------------- statespace run support
_VERDICT_WORD = re.compile(r"(?<![\w-])(failed to prove|counterexample|proved|unsat|unknown|sat)(?![\w-])")
_REPLAY = re.compile(r"\s+replay (ok|FAILED):")  # W1-T12's scripts: a witness replayed in plain Python
_CORE_CHECK = re.compile(r"\s+core check:")  # W1-T12's scripts: an unsat core re-checked by Z3
_NOT_HELD = re.compile(r"\bNOT (?:un)?sat\b")  # how such a check says that it does not hold


def parse_script_line(line: str) -> tuple[Literal["verdict", "plain"], str, tuple[str, ...]]:
    """Read one line a Z3Py script printed, on its own, as the imported runs record them: `[label] sat
    (0.00s) model`, `label unknown reason`, `[label] proved`. Returns the kind, the label the line is
    matched by, and its verdict words; a line with no verdict word is plain, matched by its whole text.
    `script_lines` reads each line in the context of the lines before it, which decides whether an
    indented line continues a model."""
    label, rest = "", line
    if line.startswith("["):
        close = line.find("]")
        if close > 0:
            label, rest = line[: close + 1], line[close + 1 :]
    words = [m.group(1) for m in _VERDICT_WORD.finditer(rest)]
    if not words:
        return ("plain", line, ())
    if label:
        return ("verdict", label, (words[0],))
    first = _VERDICT_WORD.search(rest)
    assert first is not None
    return ("verdict", rest[: first.start()].strip(), tuple(words))


ScriptKind = Literal["verdict", "replay", "check", "model", "plain"]


@dataclass(frozen=True)
class ScriptLine:
    """One line a Z3Py script printed, read in the context of the lines before it (`script_lines`)."""

    kind: ScriptKind
    key: str = ""  # a verdict line's label; the whole text of a check or plain line
    words: tuple[str, ...] = ()  # a verdict line's verdict words; ("ok",) or ("FAILED",) for a replay


def _bracket_delta(text: str) -> int:
    """How much `text` changes the depth of [ ] brackets, outside "strings"."""
    depth, quoted = 0, False
    for i, c in enumerate(text):
        if c == '"' and (i == 0 or text[i - 1] != "\\"):
            quoted = not quoted
        elif not quoted and c == "[":
            depth += 1
        elif not quoted and c == "]":
            depth -= 1
    return depth


def script_lines(lines: Sequence[str]) -> list[ScriptLine]:
    """Read the lines a Z3Py script printed, each in the context of the lines before it:

    * model: an indented line that continues a model, which is not compared, because model values are not
      canonical (spine section 9.1). That is an indented line after a verdict line whose bracketed model
      is still open (`[q] sat [x = 1,` then ` y = 2]`), or an indented line of a model block that opens
      with a line `(` (`(model` for older Z3) and runs to the line that closes it; the opening and closing
      lines are plain. A line that is not indented ends a model.
    * replay: `  replay ok: ...` or `  replay FAILED: ...`, a witness checked by its property, compared by
      ok or FAILED, since the values it names are a model's.
    * check: `  core check: ...`, an unsat core re-checked, compared verbatim.
    * verdict or plain: any other line, by parse_script_line, indented or not.
    """
    out: list[ScriptLine] = []
    bracket = 0  # depth of a bracketed model that a verdict line left open
    paren = 0  # depth of a model block
    state = [""]  # a string or |symbol| a model block left open (_paren_delta)
    for line in lines:
        indented = line[:1].isspace()
        if paren > 0:
            if indented:
                paren = max(0, paren + _paren_delta(line, state))
                out.append(ScriptLine("model"))
                continue
            closes = paren + _paren_delta(line, state) <= 0
            paren = 0
            if closes:
                out.append(ScriptLine("plain", line))
                continue
        if bracket > 0:
            if indented:
                bracket = max(0, bracket + _bracket_delta(line))
                out.append(ScriptLine("model"))
                continue
            bracket = 0
        if line.strip() in ("(", "(model"):
            state = [""]
            paren = _paren_delta(line, state)
            out.append(ScriptLine("plain", line))
            continue
        replay = _REPLAY.match(line)
        if replay:
            out.append(ScriptLine("replay", "", (replay.group(1),)))
            continue
        if _CORE_CHECK.match(line):
            out.append(ScriptLine("check", line))
            continue
        kind, key, words = parse_script_line(line)
        if kind == "verdict":
            rest = line[len(key) :] if line.startswith("[") and line.startswith(key) else line
            bracket = max(0, _bracket_delta(rest))
        out.append(ScriptLine(kind, key, words))
    return out


_TIMING = re.compile(r"\(\s*[0-9]+(?:\.[0-9]+)?\s*m?s\s*\)")


def unknown_reason(line: str) -> str:
    """What a script's `unknown` line says after its verdict word, without timings: Z3's reason, such as
    `smt tactic failed ... (incomplete (theory arithmetic))` in `[q] unknown (0.00s) smt tactic failed ...`."""
    rest = line
    if line.startswith("["):
        close = line.find("]")
        if close > 0:
            rest = line[close + 1 :]
    word = _VERDICT_WORD.search(rest)
    tail = rest[word.end() :] if word else ""
    return " ".join(_TIMING.sub(" ", tail).split())


def _carries_verdict(line: str) -> bool:
    """A line of Z3's own that carries a verdict: an answer, an (error ...) line, or a reason that is not
    empty (the verdict-line grammar in this module's docstring)."""
    reason = _REASON.fullmatch(line)
    return line in ANSWERS or line.startswith('(error "') or bool(reason and reason.group(1))


def compare_output(recorded: Sequence[str], found: Sequence[str], *, version: str, engine_version: str | None = None) -> list[LineComparison]:
    """Compare a re-execution's output with the recorded verdict lines, each line read in the context of
    the lines before it (script_lines). A verdict line is matched by its label and compared by its verdict
    words, and an `unknown` line also by its reason; a replay line by ok or FAILED, and a core check
    verbatim, each against the line of its kind that follows the same verdict line in the new output; any
    other line verbatim. Only model lines are skipped, because model values and timings are not canonical.

    Each recorded line is matched to its own line of the new output, and a line the new output prints and
    the record does not is a difference when it carries a verdict: an answer, an (error ...) line or a
    reason that is not empty, a replay that FAILED, a check that does NOT hold, or a second verdict line
    for a label the record has. So a tool bump that drops an assertion, turns an answer into a budget stop
    or leaves a witness that no longer replays does not pass as reproduced. With engine_version, a line
    that names the recorded version may name that one instead."""
    before = script_lines(recorded)
    after = script_lines(found)
    labels = {read.key for read in before if read.kind == "verdict"}
    used: set[int] = set()
    results: list[LineComparison] = []
    anchor: int | None = None  # where the last recorded verdict line was found in the new output
    lost = False  # the last recorded verdict line is not in the new output

    def take(predicate: Callable[[int], bool]) -> int | None:
        match = next((j for j in range(len(found)) if j not in used and predicate(j)), None)
        if match is not None:
            used.add(match)
        return match

    def follower(kind: ScriptKind) -> int | None:
        """The first unused line of `kind` among the lines that follow the anchor's verdict line in the new
        output: its model, replay and check lines, up to the first line of another kind."""
        j = 0 if anchor is None else anchor + 1
        while j < len(found) and after[j].kind in ("model", "replay", "check"):
            if j not in used and after[j].kind == kind:
                used.add(j)
                return j
            j += 1
        return None

    for index, line in enumerate(recorded):
        read = before[index]
        if read.kind == "model":
            results.append(LineComparison("skipped", line, None, "part of a model; models are not canonical, so they are not compared"))
            continue
        if read.kind == "verdict":
            match = take(lambda j: after[j].kind == "verdict" and after[j].key == read.key)
            anchor, lost = match, match is None
            if match is None:
                results.append(LineComparison("missing", line, None, "no line with this label in the new output"))
                continue
            words, now = read.words, after[match].words
            if now != words:
                results.append(LineComparison("differs", line, found[match], f"recorded {' '.join(words)}, now {' '.join(now)}"))
            elif words == ("unknown",) and unknown_reason(line) != unknown_reason(found[match]):
                was, became = unknown_reason(line) or "no reason", unknown_reason(found[match]) or "no reason"
                results.append(LineComparison("differs", line, found[match], f"recorded unknown ({was}), now unknown ({became})"))
            else:
                note = None if found[match] == line else "same verdict; models and timings are not compared"
                results.append(LineComparison("same", line, found[match], note))
            continue
        if read.kind in ("replay", "check"):
            what = "replay" if read.kind == "replay" else "core check"
            if lost:
                results.append(LineComparison("missing", line, None, f"the verdict line this {what} follows is not in the new output"))
                continue
            match = follower(read.kind)
            if match is None:
                results.append(LineComparison("missing", line, None, f"no {what} line follows that verdict line in the new output"))
            elif read.kind == "replay" and after[match].words != read.words:
                results.append(LineComparison("differs", line, found[match], f"recorded replay {read.words[0]}, now replay {after[match].words[0]}"))
            elif read.kind == "replay":
                results.append(LineComparison("same", line, found[match], None if found[match] == line else "the witness replays; the values it names are a model's, which are not compared"))
            elif found[match] != line:
                results.append(LineComparison("differs", line, found[match], "the core check reads differently"))
            else:
                results.append(LineComparison("same", line, line))
            continue
        match = take(lambda j: found[j] == line)
        if match is not None:
            results.append(LineComparison("same", line, line))
            continue
        if version and version in line:
            prefix = line.split(version, 1)[0]
            candidate = take(lambda j: bool(prefix) and found[j].startswith(prefix))
            if candidate is None:
                # A version banner the recording harness printed, not the run: nothing to compare it with.
                results.append(LineComparison("skipped", line, None, "no line of the new output names a version this way; the command pins the version"))
            elif engine_version and found[candidate].replace(engine_version, version) == line:
                results.append(LineComparison("same", line, found[candidate], f"names {engine_version}, the version asked for"))
            else:
                results.append(LineComparison("differs", line, found[candidate], "the version differs"))
            continue
        results.append(LineComparison("missing", line, None, "not in the new output"))
    for j, line in enumerate(found):
        if j in used or after[j].kind == "model":
            continue
        why: str | None = None
        if _carries_verdict(line):
            why = "a verdict or error line the recorded run did not print"
        elif after[j].kind == "replay" and after[j].words == ("FAILED",):
            why = "a witness that does not replay, which the recorded run did not print"
        elif _NOT_HELD.search(line):
            why = "a check that does not hold, which the recorded run did not print"
        elif after[j].kind == "verdict" and after[j].key in labels:
            why = "a second verdict line for a label the record has"
        if why is not None:
            results.append(LineComparison("differs", "", line, why))
    return results


def rerun_plan(view: RunView, *, repo: Path, engine_version: str | None = None) -> RerunPlan | Refusal:
    """How `statespace run` re-executes a Z3 run: its recorded argv, or, for an imported run whose argv was
    not recorded and whose input is one Z3Py script, the pinned form the spikes ran,
    `uv run --with z3-solver==<version> python -I <script>` (labs/TOOLS.md section 2.1)."""
    del repo  # the plan is relative; the caller stages inputs or runs from the repository root
    version = engine_version or view.version
    if view.image:
        return Refusal(f"the run executed in the image {view.image}; the Z3 lane re-executes on this machine only")
    if view.argv is None:
        scripts = [str(i.get("path")) for i in view.inputs if i.get("role") == "script" and str(i.get("path", "")).endswith(".py")]
        if len(scripts) != 1:
            return Refusal(f"no argv is recorded and the record names {len(scripts)} Python scripts, so the Z3 lane cannot tell how it ran; re-record it with argv")
        if shutil.which("uv") is None:
            return Refusal("the pinned form needs uv, which is not on PATH")
        others = [str(i.get("path") or i.get("url") or i.get("name")) for i in view.inputs if i.get("role") == "script" and str(i.get("path")) != scripts[0]]
        why = view.unrecorded.get("argv")
        how = "argv is not recorded" + (f" ({why})" if why else "") + "; this is the Z3 lane's pinned form for a Z3Py script, uv run --with z3-solver==<version> python -I <script> (labs/TOOLS.md section 2.1)"
        notes = tuple(f"the record also lists {o}, which this re-execution does not run" for o in others)
        argv = ["uv", "run", "--no-project", "--quiet", "--with", f"z3-solver=={version}", "python", "-I", Path(scripts[0]).name]
        return RerunPlan(argv, "stage", how, notes)
    if view.argv and isinstance(view.argv[0], list):
        return Refusal("argv holds several commands; the Z3 lane re-executes one")
    argv = [str(a) for a in view.argv]
    if any(re.search(r"<[a-z][a-z0-9_:.-]*>", a) for a in argv):
        return Refusal("argv holds placeholders such as <sandbox> that the Z3 lane cannot fill")
    if "statespace.lanes.z3" in argv:
        return Refusal("the command is the api entry's runner, which is this CLI's own code; the Z3 lane's drift test re-executes those cases (test_z3_lane.py)")
    if engine_version:
        if not any(re.fullmatch(r"z3-solver==\S+", a) for a in argv):
            return Refusal(f"the recorded command does not pin z3-solver, so --engine-version {engine_version} cannot choose the Z3 it runs")
        argv = [re.sub(r"^z3-solver==\S+$", f"z3-solver=={engine_version}", a) for a in argv]
    paths = [str(i.get("path")) for i in view.inputs if isinstance(i.get("path"), str)]
    rooted = any(a in paths for a in argv)
    # A command that names an input by the end of its path (tour_cli.sh, original/z3_negamt.py) ran where
    # its inputs were laid out; statespace run lays them out the same way in a scratch directory.
    relative = any(p.endswith("/" + a) for a in argv if a and not a.startswith("-") for p in paths)
    return RerunPlan(argv, "stage" if relative and not rooted else "repo", "the recorded argv")


# ------------------------------------------------------------------------------- the API runner
def _print_z3_error(error: Exception) -> None:
    """Print a Z3Exception the way the command line prints the same fault: its (error ...) lines."""
    value: Any = getattr(error, "value", str(error))
    message = value.decode("utf-8", errors="replace") if isinstance(value, bytes) else str(value)
    lines = [line for line in message.splitlines() if line.strip()]
    if lines and lines[0].startswith('(error "'):
        print("\n".join(lines))
    else:
        print(f"{CLI_NOTE}z3 raised Z3Exception: {message.strip()}")


def _runner_main(argv: Sequence[str] | None = None) -> int:
    """`python -P -m statespace.lanes.z3 --rlimit N [--model] FILE`: the api entry. It asks the script's
    one question, no more: the script up to the question, read into a Solver under the rlimit with
    Solver.from_string (which reads named assertions and set-logic as the command line does; the
    parse_smt2_string reading dropped named assertions), then checked under the question's assumptions.
    It prints the answer in the command line's own format, so one reader serves both entries.

    It reads the bytes the command line reads: the file decoded as UTF-8 with no line-ending translation,
    and check_script refuses what from_string would read otherwise, a NUL (from_string takes a C string)
    and a form outside any command (from_string reads a text that starts `p c` as DIMACS). Each assumption
    is read with parse_smt2_string, the last formula of the text before the question plus one assert per
    assumption, and check_script refuses what that would read otherwise: an annotation in the question,
    since with unsat cores on an assert returns a named term as (=> name formula)."""
    import argparse

    parser = argparse.ArgumentParser(prog="python -P -m statespace.lanes.z3", description="Run one SMT-LIB query through Z3's Python API under an rlimit.")
    parser.add_argument("--rlimit", type=int, required=True)
    parser.add_argument("--model", action="store_true", help="print the model after sat")
    parser.add_argument("file")
    args = parser.parse_args(list(argv) if argv is not None else None)
    if not 0 < args.rlimit <= MAX_RLIMIT:
        print(f"{CLI_NOTE}the rlimit must be from 1 to {MAX_RLIMIT}; the api entry never runs unbounded")
        return 2
    try:
        # Path.read_text would turn a bare \r and \r\n into \n, where Z3 ends a ; comment only at \n and keeps
        # the \r of a string: the api entry would answer a question the file does not ask.
        text = Path(args.file).read_bytes().decode("utf-8")
    except (OSError, UnicodeDecodeError) as error:
        print(f"{CLI_NOTE}the query {args.file} could not be read: {error}")
        return 2
    try:
        check_script(text)
    except ScriptRefused as error:
        print(f"{CLI_NOTE}the script cannot be one run: {error}")
        return 2
    try:
        import z3 as engine  # pyright: ignore[reportMissingTypeStubs]
    except ImportError:
        print(f"{CLI_NOTE}z3 is not importable in this Python")
        return 2
    z3: Any = engine  # the z3 package carries no type information
    try:
        prefix, literals = question_parts(text)
    except SmtLibSyntaxError as error:  # check_script has read the same text, so this is a fault in statespace
        print(f"{CLI_NOTE}the api entry could not find the script's question ({error})")
        return 2
    solver: Any = z3.Solver()
    solver.set("rlimit", args.rlimit)
    try:
        solver.from_string(prefix)
        assumptions: list[Any] = []
        if literals:
            # Each literal is parsed in the scope of the question: the prefix again, then one assert per
            # literal. The prefix's own formulas must come back unchanged, and the literals after them. An
            # assert reads a term with no annotation as check-sat-assuming does; check_script has refused an
            # annotated one, which an assert under unsat cores returns as (=> name formula).
            assertions: Any = z3.parse_smt2_string(prefix)
            extended: Any = z3.parse_smt2_string(prefix + "\n" + "".join(f"(assert {literal})\n" for literal in literals))
            base = len(assertions)
            if len(extended) != base + len(literals) or not all(extended[i].eq(assertions[i]) for i in range(base)):
                print(f"{CLI_NOTE}the api entry could not read the question's assumptions")
                return 2
            assumptions = [extended[base + i] for i in range(len(literals))]
    except z3.Z3Exception as error:
        _print_z3_error(error)
        return 1
    answer: Any = solver.check(*assumptions)
    print(str(answer))
    if answer == z3.unknown:
        print(f"(:reason-unknown {_smt_string(str(solver.reason_unknown()))})")
    elif answer == z3.sat and args.model:
        try:
            body = str(solver.model().sexpr()).rstrip("\n")
        except z3.Z3Exception:
            return 0  # no model to print; the answer stands, as the command line's does
        print("(\n" + "\n".join("  " + line for line in body.splitlines()) + "\n)" if body else "(\n)")
    return 0


if __name__ == "__main__":
    raise SystemExit(_runner_main())
