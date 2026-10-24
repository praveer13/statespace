---- MODULE RTW3_TTrace_1792580815 ----
EXTENDS Sequences, TLCExt, Toolbox, RTW3_TEConstants, RTW3, Naturals, TLC

_expression ==
    LET RTW3_TEExpression == INSTANCE RTW3_TEExpression
    IN RTW3_TEExpression!expression
----

_trace ==
    LET RTW3_TETrace == INSTANCE RTW3_TETrace
    IN RTW3_TETrace!trace
----

_inv ==
    ~(
        TLCGet("level") = Len(_TETrace)
        /\
        pc = ((w1 :> "done" @@ w2 :> "done"))
        /\
        spent = (160)
        /\
        bal = (20)
        /\
        seen = ((w1 :> 100 @@ w2 :> 100))
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
    \*         IN J!JsonSerialize("RTW3_TTrace_1792580815.json", _TETrace)

=============================================================================

 Note that you can extract this module `RTW3_TEExpression`
  to a dedicated file to reuse `expression` (the module in the 
  dedicated `RTW3_TEExpression.tla` file takes precedence 
  over the module `RTW3_TEExpression` below).

---- MODULE RTW3_TEExpression ----
EXTENDS Sequences, TLCExt, Toolbox, RTW3_TEConstants, RTW3, Naturals, TLC

expression == 
    [
        \* To hide variables of the `RTW3` spec from the error trace,
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
\*---- MODULE RTW3_TETrace ----
\*EXTENDS IOUtils, RTW3_TEConstants, RTW3, TLC
\*
\*trace == IODeserialize("RTW3_TTrace_1792580815.bin", TRUE)
\*
\*=============================================================================
\*

---- MODULE RTW3_TETrace ----
EXTENDS RTW3_TEConstants, RTW3, TLC

trace == 
    <<
    ([pc |-> (w1 :> "read" @@ w2 :> "read"),spent |-> 0,bal |-> 100,seen |-> (w1 :> 0 @@ w2 :> 0)]),
    ([pc |-> (w1 :> "check" @@ w2 :> "read"),spent |-> 0,bal |-> 100,seen |-> (w1 :> 100 @@ w2 :> 0)]),
    ([pc |-> (w1 :> "write" @@ w2 :> "read"),spent |-> 0,bal |-> 100,seen |-> (w1 :> 100 @@ w2 :> 0)]),
    ([pc |-> (w1 :> "write" @@ w2 :> "check"),spent |-> 0,bal |-> 100,seen |-> (w1 :> 100 @@ w2 :> 100)]),
    ([pc |-> (w1 :> "done" @@ w2 :> "check"),spent |-> 80,bal |-> 20,seen |-> (w1 :> 100 @@ w2 :> 100)]),
    ([pc |-> (w1 :> "done" @@ w2 :> "write"),spent |-> 80,bal |-> 20,seen |-> (w1 :> 100 @@ w2 :> 100)]),
    ([pc |-> (w1 :> "done" @@ w2 :> "done"),spent |-> 160,bal |-> 20,seen |-> (w1 :> 100 @@ w2 :> 100)])
    >>
----


=============================================================================

---- MODULE RTW3_TEConstants ----
EXTENDS RTW3

CONSTANTS w1, w2

=============================================================================

---- CONFIG RTW3_TTrace_1792580815 ----
CONSTANTS
    Workers = { w1 , w2 }
    Amt = 80
    Init = 100
    w2 = w2
    w1 = w1

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
\* Generated on Wed Oct 21 11:06:55 UTC 2026