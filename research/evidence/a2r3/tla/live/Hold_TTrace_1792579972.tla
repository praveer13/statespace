---- MODULE Hold_TTrace_1792579972 ----
EXTENDS Sequences, TLCExt, Toolbox, Naturals, TLC, Hold_TEConstants, Hold

_expression ==
    LET Hold_TEExpression == INSTANCE Hold_TEExpression
    IN Hold_TEExpression!expression
----

_trace ==
    LET Hold_TETrace == INSTANCE Hold_TETrace
    IN Hold_TETrace!trace
----

_prop ==
    ~(([]<>(
            tries = (0)
            /\
            st = ("pending")
    ))/\([]<>(
            tries = (0)
            /\
            st = ("held")
    )))
----

_init ==
    /\ tries = _TETrace[1].tries
    /\ st = _TETrace[1].st
----

_next ==
    /\ \E i,j \in DOMAIN _TETrace:
        /\ \/ /\ j = i + 1
              /\ i = TLCGet("level")
           \/ /\ i = _TTraceLassoEnd
              /\ j = _TTraceLassoStart
        /\ tries  = _TETrace[i].tries
        /\ tries' = _TETrace[j].tries
        /\ st  = _TETrace[i].st
        /\ st' = _TETrace[j].st

\* Uncomment the ASSUME below to write the states of the error trace
\* to the given file in Json format. Note that you can pass any tuple
\* to `JsonSerialize`. For example, a sub-sequence of _TETrace.
    \* ASSUME
    \*     LET J == INSTANCE Json
    \*         IN J!JsonSerialize("Hold_TTrace_1792579972.json", _TETrace)


_view ==
    <<tries, st, IF TLCGet("level") = _TTraceLassoEnd + 1 THEN _TTraceLassoStart ELSE TLCGet("level")>>
=============================================================================

 Note that you can extract this module `Hold_TEExpression`
  to a dedicated file to reuse `expression` (the module in the 
  dedicated `Hold_TEExpression.tla` file takes precedence 
  over the module `Hold_TEExpression` below).

---- MODULE Hold_TEExpression ----
EXTENDS Sequences, TLCExt, Toolbox, Naturals, TLC, Hold_TEConstants, Hold

expression == 
    [
        \* To hide variables of the `Hold` spec from the error trace,
        \* remove the variables below.  The trace will be written in the order
        \* of the fields of this record.
        tries |-> tries
        ,st |-> st
        
        \* Put additional constant-, state-, and action-level expressions here:
        \* ,_stateNumber |-> _TEPosition
        \* ,_triesUnchanged |-> tries = tries'
        
        \* Format the `tries` variable as Json value.
        \* ,_triesJson |->
        \*     LET J == INSTANCE Json
        \*     IN J!ToJson(tries)
        
        \* Lastly, you may build expressions over arbitrary sets of states by
        \* leveraging the _TETrace operator.  For example, this is how to
        \* count the number of times a spec variable changed up to the current
        \* state in the trace.
        \* ,_triesModCount |->
        \*     LET F[s \in DOMAIN _TETrace] ==
        \*         IF s = 1 THEN 0
        \*         ELSE IF _TETrace[s].tries # _TETrace[s-1].tries
        \*             THEN 1 + F[s-1] ELSE F[s-1]
        \*     IN F[_TEPosition - 1]
    ]

=============================================================================



Parsing and semantic processing can take forever if the trace below is long.
 In this case, it is advised to uncomment the module below to deserialize the
 trace from a generated binary file.

\*
\*---- MODULE Hold_TETrace ----
\*EXTENDS IOUtils, TLC, Hold_TEConstants, Hold
\*
\*trace == IODeserialize("Hold_TTrace_1792579972.bin", TRUE)
\*
\*=============================================================================
\*

---- MODULE Hold_TETrace ----
EXTENDS TLC, Hold_TEConstants, Hold

trace == 
    <<
    ([tries |-> 0,st |-> "held"]),
    ([tries |-> 1,st |-> "pending"]),
    ([tries |-> 1,st |-> "held"]),
    ([tries |-> 0,st |-> "pending"])
    >>
----


=============================================================================

---- MODULE Hold_TEConstants ----
EXTENDS Hold

CONSTANTS _TTraceLassoStart, _TTraceLassoEnd

=============================================================================

---- CONFIG Hold_TTrace_1792579972 ----
CONSTANTS
_TTraceLassoStart = 1
_TTraceLassoEnd = 4

PROPERTY
    _prop

CHECK_DEADLOCK
    \* CHECK_DEADLOCK off because of PROPERTY or INVARIANT above.
    FALSE

INIT
    _init

NEXT
    _next

VIEW
    _view

CONSTANT
    _TETrace <- _trace

ALIAS
    _expression
=============================================================================
\* Generated on Wed Oct 21 10:52:53 UTC 2026