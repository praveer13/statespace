---- MODULE RTW2R_TTrace_1792580817 ----
EXTENDS Sequences, TLCExt, Toolbox, Naturals, TLC, RTW2R_TEConstants, RTW2R

_expression ==
    LET RTW2R_TEExpression == INSTANCE RTW2R_TEExpression
    IN RTW2R_TEExpression!expression
----

_trace ==
    LET RTW2R_TETrace == INSTANCE RTW2R_TETrace
    IN RTW2R_TETrace!trace
----

_inv ==
    ~(
        TLCGet("level") = Len(_TETrace)
        /\
        pc = ((w1 :> "done" @@ w2 :> "done"))
        /\
        spent = (160)
        /\
        bal = (0)
        /\
        seen = ((w1 :> 80 @@ w2 :> 80))
    )
----

_init ==
    /\ seen = _TETrace[1].seen
    /\ spent = _TETrace[1].spent
    /\ bal = _TETrace[1].bal
    /\ pc = _TETrace[1].pc
----

_next ==
    /\ \E i,j \in DOMAIN _TETrace:
        /\ \/ /\ j = i + 1
              /\ i = TLCGet("level")
        /\ seen  = _TETrace[i].seen
        /\ seen' = _TETrace[j].seen
        /\ spent  = _TETrace[i].spent
        /\ spent' = _TETrace[j].spent
        /\ bal  = _TETrace[i].bal
        /\ bal' = _TETrace[j].bal
        /\ pc  = _TETrace[i].pc
        /\ pc' = _TETrace[j].pc

\* Uncomment the ASSUME below to write the states of the error trace
\* to the given file in Json format. Note that you can pass any tuple
\* to `JsonSerialize`. For example, a sub-sequence of _TETrace.
    \* ASSUME
    \*     LET J == INSTANCE Json
    \*         IN J!JsonSerialize("RTW2R_TTrace_1792580817.json", _TETrace)

=============================================================================

 Note that you can extract this module `RTW2R_TEExpression`
  to a dedicated file to reuse `expression` (the module in the 
  dedicated `RTW2R_TEExpression.tla` file takes precedence 
  over the module `RTW2R_TEExpression` below).

---- MODULE RTW2R_TEExpression ----
EXTENDS Sequences, TLCExt, Toolbox, Naturals, TLC, RTW2R_TEConstants, RTW2R

expression == 
    [
        \* To hide variables of the `RTW2R` spec from the error trace,
        \* remove the variables below.  The trace will be written in the order
        \* of the fields of this record.
        seen |-> seen
        ,spent |-> spent
        ,bal |-> bal
        ,pc |-> pc
        
        \* Put additional constant-, state-, and action-level expressions here:
        \* ,_stateNumber |-> _TEPosition
        \* ,_seenUnchanged |-> seen = seen'
        
        \* Format the `seen` variable as Json value.
        \* ,_seenJson |->
        \*     LET J == INSTANCE Json
        \*     IN J!ToJson(seen)
        
        \* Lastly, you may build expressions over arbitrary sets of states by
        \* leveraging the _TETrace operator.  For example, this is how to
        \* count the number of times a spec variable changed up to the current
        \* state in the trace.
        \* ,_seenModCount |->
        \*     LET F[s \in DOMAIN _TETrace] ==
        \*         IF s = 1 THEN 0
        \*         ELSE IF _TETrace[s].seen # _TETrace[s-1].seen
        \*             THEN 1 + F[s-1] ELSE F[s-1]
        \*     IN F[_TEPosition - 1]
    ]

=============================================================================



Parsing and semantic processing can take forever if the trace below is long.
 In this case, it is advised to uncomment the module below to deserialize the
 trace from a generated binary file.

\*
\*---- MODULE RTW2R_TETrace ----
\*EXTENDS IOUtils, TLC, RTW2R_TEConstants, RTW2R
\*
\*trace == IODeserialize("RTW2R_TTrace_1792580817.bin", TRUE)
\*
\*=============================================================================
\*

---- MODULE RTW2R_TETrace ----
EXTENDS TLC, RTW2R_TEConstants, RTW2R

trace == 
    <<
    ([pc |-> (w1 :> "read" @@ w2 :> "read"),spent |-> 0,bal |-> 80,seen |-> (w1 :> 0 @@ w2 :> 0)]),
    ([pc |-> (w1 :> "write" @@ w2 :> "read"),spent |-> 0,bal |-> 80,seen |-> (w1 :> 80 @@ w2 :> 0)]),
    ([pc |-> (w1 :> "write" @@ w2 :> "write"),spent |-> 0,bal |-> 80,seen |-> (w1 :> 80 @@ w2 :> 80)]),
    ([pc |-> (w1 :> "done" @@ w2 :> "write"),spent |-> 80,bal |-> 0,seen |-> (w1 :> 80 @@ w2 :> 80)]),
    ([pc |-> (w1 :> "done" @@ w2 :> "done"),spent |-> 160,bal |-> 0,seen |-> (w1 :> 80 @@ w2 :> 80)])
    >>
----


=============================================================================

---- MODULE RTW2R_TEConstants ----
EXTENDS RTW2R

CONSTANTS w1, w2

=============================================================================

---- CONFIG RTW2R_TTrace_1792580817 ----
CONSTANTS
    Workers = { w1 , w2 }
    Amt = 80
    Init = 100
    w1 = w1
    w2 = w2

INVARIANT
    _inv

CHECK_DEADLOCK
    \* CHECK_DEADLOCK off because of PROPERTY or INVARIANT above.
    FALSE

INIT
    _init

NEXT
    _next

CONSTANT
    _TETrace <- _trace

ALIAS
    _expression
=============================================================================
\* Generated on Wed Oct 21 11:06:57 UTC 2026