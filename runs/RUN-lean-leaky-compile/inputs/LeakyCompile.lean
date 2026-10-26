/-!
SP-9.6 (S9.L9 cell 1): S7's document view compiled two ways, a full scan and an index scan, run in two worlds
that differ only in one more private document of tenant Birch. Each plan returns frank's response body and
the number of rows it read (its steps).
-/

inductive Tenant where
  | acme | birch
  deriving DecidableEq, Repr

structure Doc where
  id : Nat
  tenant : Tenant
  title : String
  deriving DecidableEq, Repr

/-- frank belongs to Acme and may see Acme's documents. -/
def mayOpen (d : Doc) : Bool := d.tenant == .acme

structure World where
  docs : List Doc            -- the document table
  acmeIndex : List Doc       -- the index on tenant, Acme's entries

/-- Plan 1, the full scan: read every row, keep the ones frank may see. -/
def fullScan (w : World) : List String × Nat :=
  ((w.docs.filter mayOpen).map (·.title), w.docs.length)

/-- Plan 2, the index scan: read only the rows of Acme's index entries. -/
def indexScan (w : World) : List String × Nat :=
  ((w.acmeIndex.filter mayOpen).map (·.title), w.acmeIndex.length)

def acme1 : Doc := ⟨1, .acme, "roadmap"⟩
def acme2 : Doc := ⟨2, .acme, "budget"⟩
def birch1 : Doc := ⟨3, .birch, "merger"⟩
def birch2 : Doc := ⟨4, .birch, "layoffs"⟩

def W0 : World := ⟨[acme1, birch1, acme2], [acme1, acme2]⟩
def W1 : World := ⟨[acme1, birch1, acme2, birch2], [acme1, acme2]⟩

-- the bodies: equal across the two worlds, and equal between the plans
theorem bodies_equal_full : (fullScan W0).1 = (fullScan W1).1 := by decide
theorem bodies_equal_index : (indexScan W0).1 = (indexScan W1).1 := by decide
theorem plans_agree_on_body : (fullScan W0).1 = (indexScan W0).1 ∧ (fullScan W1).1 = (indexScan W1).1 := by decide

-- the steps: the full scan's differ between the worlds, the index scan's do not
theorem full_scan_steps_differ : (fullScan W0).2 ≠ (fullScan W1).2 := by decide
theorem index_scan_steps_equal : (indexScan W0).2 = (indexScan W1).2 := by decide

#eval (fullScan W0, fullScan W1)
#eval (indexScan W0, indexScan W1)
#print axioms full_scan_steps_differ
#print axioms index_scan_steps_equal
