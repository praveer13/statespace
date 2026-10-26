#!/bin/sh
# statespace-guard: the Claude Code PreToolUse hook of statespace-lab (labs/AGENTS.md, "What enforces this";
# ARCHITECTURE.md section 12.3). POSIX sh and awk, no jq.
#
# It blocks (exit 2) a tool call that would change a protected path:
#   - Edit, Write, MultiEdit or NotebookEdit on a protected file;
#   - a Bash command that names a protected path, unless every part of it is on the read-only allow-list below;
#   - an mcp__ tool whose input names a protected path;
#   - any payload it cannot read. It fails closed.
# Everything else is allowed (exit 0).
#
# Protected: labs/*/challenge/**, every comparator.json, claims/**, receipts/**, .claude/**, .statespace/**, the
# paths listed in .statespace/protected.d/*.txt (every file that carried a TODO(you) marker when its lab was
# packed), and any file that contains TODO(you) now.
#
# THE SWITCH: set STATESPACE_GUARD=off in the environment Claude Code runs in, and this hook allows everything.
# That is your decision, never your agent's; `statespace check` records it on the receipt as guard: off.
# The deny rules in .claude/settings.json still stop the edit tools on the fixed paths when this hook cannot run.

if [ "${STATESPACE_GUARD:-}" = "off" ]; then
  exit 0
fi

block() {
  printf 'statespace guard: %s\n' "$1" >&2
  printf 'The file belongs to the person (or to the course). Ask about the failing check instead, or end your turn with flag_for_human (AGENTS.md). Only the person can switch this guard off (STATESPACE_GUARD=off).\n' >&2
  exit 2
}

ROOT=${CLAUDE_PROJECT_DIR:-}
if [ -z "$ROOT" ]; then
  ROOT=$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd) || block "the hook could not find the repository, so it blocked this call (fail closed)"
fi
ROOT=${ROOT%/}

payload=$(cat) || block "the hook could not read this tool call, so it blocked it (fail closed)"

# Flatten the JSON payload into lines "key.path<TAB>string value". Numbers, booleans and null are checked
# for shape and dropped. The last line is OK, or ERR<TAB>why.
flat=$(printf '%s' "$payload" | awk '
function err(m) { print "ERR\t" m; failed = 1; exit 1 }
function ws() { while (pos <= n && index(" \t\r\n", substr(s, pos, 1)) > 0) pos++ }
function hex(h,   i, c, v) { v = 0; h = tolower(h); for (i = 1; i <= 4; i++) { c = index("0123456789abcdef", substr(h, i, 1)); if (c == 0) err("bad \\u escape"); v = v * 16 + c - 1 } return v }
function keep(piece) { if (length(out) + length(piece) <= CAP) out = out piece; else { if (length(out) < CAP) out = out substr(piece, 1, CAP - length(out)); cut = 1 } }
function str(   rest, i, c, v) {
  pos++; out = ""; cut = 0
  while (1) {
    if (pos > n) err("unterminated string")
    rest = substr(s, pos, 512); i = match(rest, /["\\]/)
    if (i == 0) { keep(rest); pos += length(rest); continue }
    keep(substr(rest, 1, i - 1)); pos += i - 1; c = substr(s, pos, 1)
    if (c == "\"") { pos++; return out }
    c = substr(s, pos + 1, 1); pos += 2
    if (c == "u") { v = hex(substr(s, pos, 4)); pos += 4; keep((v >= 32 && v < 127) ? sprintf("%c", v) : " ") }
    else if (c == "n" || c == "r" || c == "t" || c == "b" || c == "f") keep(" ")
    else if (c == "\"" || c == "\\" || c == "/") keep(c)
    else err("bad escape")
  }
}
function emit(path, v) { gsub(/[\t\n\r]/, " ", v); print path "\t" v; if (cut) print "CUT\t" path }
function value(path, depth,   c, k, i, v) {
  if (depth > 64) err("too deep")
  ws(); c = substr(s, pos, 1)
  if (c == "{") {
    pos++; ws(); if (substr(s, pos, 1) == "}") { pos++; return }
    while (1) {
      ws(); if (substr(s, pos, 1) != "\"") err("expected a key")
      k = str(); ws(); if (substr(s, pos, 1) != ":") err("expected :"); pos++
      value(path == "" ? k : path "." k, depth + 1)
      ws(); c = substr(s, pos, 1); pos++
      if (c == "}") return
      if (c != ",") err("expected , or }")
    }
  }
  if (c == "[") {
    pos++; ws(); if (substr(s, pos, 1) == "]") { pos++; return }
    i = 0
    while (1) {
      value(path "." i, depth + 1); i++
      ws(); c = substr(s, pos, 1); pos++
      if (c == "]") return
      if (c != ",") err("expected , or ]")
    }
  }
  if (c == "\"") { v = str(); emit(path, v); return }
  if (match(substr(s, pos, 32), /^(-?[0-9][0-9.eE+-]*|true|false|null)/)) { pos += RLENGTH; return }
  err("unexpected character")
}
BEGIN { CAP = 16384 }
{ s = s $0 "\n" }
END {
  if (failed) exit 1
  n = length(s); pos = 1; ws()
  if (substr(s, pos, 1) != "{") err("not a JSON object")
  value("", 0); ws()
  if (pos <= n) err("text after the object")
  print "OK"
}') || block "the hook could not read this tool call, so it blocked it (fail closed)"

case "$flat" in
  *"$(printf '\nOK')"|OK) ;;
  *) block "the hook could not read this tool call, so it blocked it (fail closed)" ;;
esac

field() { printf '%s\n' "$flat" | sed -n "s/^$1	//p"; }
# A judged value longer than the parser keeps (16 KiB) is not judged: block it (fail closed).
cut() { printf '%s\n' "$flat" | grep -q "^CUT	$1\$" && block "$2 is too long for the hook to judge, so it blocked the call (fail closed)"; return 0; }

TOOL=$(field 'tool_name' | head -n 1)
[ -n "$TOOL" ] || block "the tool call names no tool, so the hook blocked it (fail closed)"
CWD=$(field 'cwd' | head -n 1)
[ -n "$CWD" ] || CWD=$ROOT
CWD=${CWD%/}

# The path relative to the repository, or nothing when it is outside it. Exits 2 on a path with "..".
relpath() {
  p=$1
  case "$p" in
    /*) ;;
    *) p="$CWD/$p" ;;
  esac
  case "/$p/" in
    */../*) block "$1 has a .. in it, and the hook does not resolve those (fail closed)" ;;
  esac
  while :; do
    case "$p" in
      */./*) p=$(printf '%s' "$p" | sed 's#/\./#/#g') ;;
      *//*) p=$(printf '%s' "$p" | sed 's#//*#/#g') ;;
      *) break ;;
    esac
  done
  p=${p%/.}
  case "$p" in
    "$ROOT") printf '.\n' ;;
    "$ROOT"/*) printf '%s\n' "${p#"$ROOT"/}" ;;
    *) printf '\n' ;;
  esac
}

# Why `rel` is protected, or nothing.
protected() {
  rel=$1
  [ -n "$rel" ] || return 1
  low=$(printf '%s' "$rel" | tr 'A-Z' 'a-z')
  case "$low" in
    labs/*/challenge|labs/*/challenge/*) echo "a challenge file the course owns"; return 0 ;;
    comparator.json|*/comparator.json) echo "a comparator.json the course owns"; return 0 ;;
    claims|claims/*) echo "the person's claims"; return 0 ;;
    receipts|receipts/*) echo "a receipt that only statespace check writes"; return 0 ;;
    .claude|.claude/*) echo "the agent kit"; return 0 ;;
    .statespace|.statespace/*) echo "the template's pins and the CLI"; return 0 ;;
  esac
  for list in "$ROOT"/.statespace/protected.d/*.txt; do
    [ -f "$list" ] || continue
    if grep -Fqx -- "$rel" "$list" 2>/dev/null; then echo "a by-hand file of the lab (TODO(you) when packed)"; return 0; fi
  done
  if [ -f "$ROOT/$rel" ] && grep -Fq 'TODO(you)' "$ROOT/$rel" 2>/dev/null; then
    echo "a by-hand file: it contains TODO(you)"; return 0
  fi
  return 1
}

check_path() {
  rel=$(relpath "$1") || exit 2
  why=$(protected "$rel") && block "$1 is protected: $why"
  return 0
}

# Every word of a text that could be a path: split on white space and shell punctuation.
words() { printf '%s\n' "$1" | tr ' \t;|&<>()`"=,{}' '[\n*]' | tr "'" '\n' | sed '/^$/d'; }

check_text() {
  words "$1" > "${TMPDIR:-/tmp}/statespace-guard.$$" || block "the hook could not split the command (fail closed)"
  while IFS= read -r w; do
    case "$w" in
      -*=*) w=${w#*=} ;;
      -*) continue ;;
    esac
    check_path "$w"
  done < "${TMPDIR:-/tmp}/statespace-guard.$$"
  rm -f "${TMPDIR:-/tmp}/statespace-guard.$$"
}

allowed_part() {
  part=$(printf '%s' "$1" | sed 's/^[[:space:]]*//')
  case "$part" in
    cat|cat\ *|head|head\ *|tail|tail\ *|grep\ *|rg\ *|wc|wc\ *) return 0 ;;
    git\ diff|git\ diff\ *|git\ log|git\ log\ *|git\ show|git\ show\ *|git\ status|git\ status\ *) return 0 ;;
    statespace\ check*|statespace\ hash*|statespace\ receipt\ verify*|statespace\ doctor*) return 0 ;;
    uv\ run\ statespace\ check*|uv\ run\ statespace\ hash*|uv\ run\ statespace\ receipt\ verify*|uv\ run\ statespace\ doctor*) return 0 ;;
    lake\ build|lake\ build\ *|cargo\ test|cargo\ test\ *|cargo\ build|cargo\ build\ *) return 0 ;;
  esac
  return 1
}

allowed_command() {
  cmd=$1
  nl='
'
  case "$cmd" in
    *";"*|*"&"*|*">"*|*"<"*|*'$('*|*'`'*|*"$nl"*) return 1 ;;
  esac
  rest=$cmd
  while :; do
    case "$rest" in
      *"|"*) head=${rest%%|*}; rest=${rest#*|} ;;
      *) head=$rest; rest= ;;
    esac
    allowed_part "$head" || return 1
    [ -n "$rest" ] || return 0
  done
}

case "$TOOL" in
  Edit|Write|MultiEdit|NotebookEdit)
    cut 'tool_input\.file_path' "the file path"; cut 'tool_input\.notebook_path' "the notebook path"; cut 'tool_input\.path' "the path"
    paths=$(printf '%s\n' "$flat" | sed -n -e 's/^tool_input\.file_path	//p' -e 's/^tool_input\.notebook_path	//p' -e 's/^tool_input\.path	//p')
    [ -n "$paths" ] || block "$TOOL names no file, so the hook blocked it (fail closed)"
    printf '%s\n' "$paths" | while IFS= read -r p; do check_path "$p"; done || exit 2
    ;;
  Bash)
    cut 'tool_input\.command' "the command"
    cmd=$(printf '%s\n' "$flat" | sed -n 's/^tool_input\.command	//p')
    [ -n "$cmd" ] || block "Bash names no command, so the hook blocked it (fail closed)"
    if allowed_command "$cmd"; then exit 0; fi
    check_text "$cmd"
    ;;
  mcp__*)
    cut 'tool_input\..*' "an argument of $TOOL"
    printf '%s\n' "$flat" | sed -n 's/^tool_input\.[^	]*	//p' > "${TMPDIR:-/tmp}/statespace-guard-mcp.$$"
    while IFS= read -r v; do check_text "$v"; done < "${TMPDIR:-/tmp}/statespace-guard-mcp.$$" || { rm -f "${TMPDIR:-/tmp}/statespace-guard-mcp.$$"; exit 2; }
    rm -f "${TMPDIR:-/tmp}/statespace-guard-mcp.$$"
    ;;
esac
exit 0
