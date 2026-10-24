#!/usr/bin/env bash
# Measure a from-scratch Lean toolchain install and first build, isolated under ./lean-measure (run it from a throwaway directory).
# Nothing is installed outside $S (ELAN_HOME is redirected; PATH is not persisted).
set -u
S=$PWD/lean-measure
mkdir -p "$S"
export ELAN_HOME=$S/elan-home
export PATH=$ELAN_HOME/bin:$PATH
LOG=$S/measure.log
: > "$LOG"
now(){ date +%s.%N; }
dt(){ awk -v a="$1" -v b="$2" 'BEGIN{printf "%.1f", b-a}'; }
log(){ echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG"; }

log "host: $(nproc) cpus; $(free -g | awk '/Mem:/{print $2" GiB RAM"}'); $(uname -sr)"

# 1. elan
mkdir -p "$S/dl/elan" && cd "$S/dl/elan"
t0=$(now)
curl -sSL -o elan.tar.gz https://github.com/leanprover/elan/releases/download/v4.2.4/elan-x86_64-unknown-linux-gnu.tar.gz
tar xzf elan.tar.gz
./elan-init -y --default-toolchain none --no-modify-path >>"$LOG" 2>&1
t1=$(now); log "elan v4.2.4 install: $(dt $t0 $t1) s"

# 2. toolchain
t0=$(now)
elan toolchain install leanprover/lean4:v4.35.0 >>"$LOG" 2>&1
t1=$(now); log "toolchain v4.35.0 download+unpack: $(dt $t0 $t1) s"
du -sh "$ELAN_HOME"/toolchains/* 2>&1 | tee -a "$LOG"
log "bin/ contents:"; ls -la "$ELAN_HOME"/toolchains/*/bin 2>&1 | tee -a "$LOG"
TC=leanprover/lean4:v4.35.0

# 3. help texts straight from the binaries (primary source)
log "lake --version: $(lake +$TC --version 2>&1)"
log "lean --version: $(lean +$TC --version 2>&1)"
{ echo "----- lake help (top) -----"; lake +$TC help 2>&1;
  echo "----- lake help check -----"; lake +$TC help check 2>&1;
  echo "----- lake help comparator -----"; lake +$TC help comparator 2>&1;
  echo "----- lake help new -----"; lake +$TC help new 2>&1; } >> "$LOG"

# 4. a tiny core-only project (no Mathlib)
mkdir -p "$S/proj" && cd "$S/proj"
rm -rf ledger
t0=$(now)
lake +$TC new ledger lib >>"$LOG" 2>&1
t1=$(now); log "lake new ledger lib: $(dt $t0 $t1) s"
cd ledger
log "generated files:"; find . -maxdepth 2 -not -path './.git*' | sort | tee -a "$LOG"
cat lean-toolchain >> "$LOG"; cat lakefile.* >> "$LOG" 2>/dev/null
mkdir -p Ledger
cat > Ledger/Basic.lean <<'EOF'
structure Ledger where
  a : Int
  b : Int
deriving Repr

def transfer (l : Ledger) (amt : Int) : Ledger :=
  if 0 < amt ∧ amt ≤ l.a then { a := l.a - amt, b := l.b + amt } else l

theorem transfer_conserves (l : Ledger) (amt : Int) :
    (transfer l amt).a + (transfer l amt).b = l.a + l.b := by
  unfold transfer
  split <;> simp <;> omega

theorem transfer_conserves_grind (l : Ledger) (amt : Int) :
    (transfer l amt).a + (transfer l amt).b = l.a + l.b := by
  unfold transfer; split <;> grind

theorem transfer_nonneg (l : Ledger) (amt : Int) (h : 0 ≤ l.a) :
    0 ≤ (transfer l amt).a := by
  unfold transfer; split <;> grind

theorem rejected_unchanged (l : Ledger) (amt : Int) (h : ¬ (0 < amt ∧ amt ≤ l.a)) :
    transfer l amt = l := by
  simp [transfer, h]

#eval transfer { a := 10, b := 0 } 3
#print axioms transfer_conserves
#print axioms transfer_conserves_grind
EOF
cat > Ledger/Bad.lean <<'EOF'
-- deliberately untrustworthy specimens
theorem big_native : (2^64 : Nat) % 7 = 2 := by native_decide
theorem by_decide : (2^10 : Nat) % 7 = 2 := by decide
theorem with_sorry : (1 : Nat) = 2 := by sorry
axiom cheat : False
theorem with_axiom : (1 : Nat) = 2 := cheat.elim
#print axioms big_native
#print axioms by_decide
#print axioms with_sorry
#print axioms with_axiom
EOF
printf 'import Ledger.Basic\n' > Ledger.lean
t0=$(now)
lake build >>"$LOG" 2>&1; rc=$?
t1=$(now); log "lake build (clean module only) rc=$rc: $(dt $t0 $t1) s"
t0=$(now)
lake env lean Ledger/Basic.lean >>"$LOG" 2>&1; rc=$?
t1=$(now); log "lean Ledger/Basic.lean rc=$rc: $(dt $t0 $t1) s"
t0=$(now)
lake env lean Ledger/Bad.lean >>"$LOG" 2>&1; rc=$?
t1=$(now); log "lean Ledger/Bad.lean rc=$rc: $(dt $t0 $t1) s"

# 5. lake check on the clean project, then with the bad module included
t0=$(now)
lake check >>"$LOG" 2>&1; rc=$?
t1=$(now); log "lake check (clean) rc=$rc: $(dt $t0 $t1) s"
t0=$(now)
lake check --paranoid >>"$LOG" 2>&1; rc=$?
t1=$(now); log "lake check --paranoid (clean) rc=$rc: $(dt $t0 $t1) s"
printf 'import Ledger.Basic\nimport Ledger.Bad\n' > Ledger.lean
t0=$(now)
lake check >>"$LOG" 2>&1; rc=$?
t1=$(now); log "lake check (with Bad) rc=$rc: $(dt $t0 $t1) s"
printf 'import Ledger.Basic\n' > Ledger.lean
du -sh .lake 2>&1 | tee -a "$LOG"
log "DONE"
