from z3 import *

W = DeclareSort('W')                          # any number of workers
Pc, (go, done) = EnumSort('Pc', ['go', 'done'])
Init, Amount = Ints('Init Amount')            # the constants stay symbolic
bal, spent, bal2, spent2 = Ints('bal spent bal2 spent2')
pc, pc2 = Array('pc', W, Pc), Array('pc2', W, Pc)
w = Const('w', W)                             # the worker that steps

consts = And(Init >= 0, Amount > 0)
init = And(bal == Init, spent == 0, pc == K(W, go))

def Inv(b, s):
    return And(b + s == Init, b >= 0, s >= 0)

step = And(pc[w] == go,
           If(bal >= Amount,
              And(bal2 == bal - Amount, spent2 == spent + Amount),
              And(bal2 == bal, spent2 == spent)),
           pc2 == Store(pc, w, done))

def ask(label, *claims):
    s = Solver()
    s.add(consts, *claims)
    print(label, s.check())

ask('Init => Inv         ', init, Not(Inv(bal, spent)))
ask('Inv & Step & ~Inv2  ', Inv(bal, spent), step, Not(Inv(bal2, spent2)))
ask('Inv => NoOverspend  ', Inv(bal, spent), Not(spent <= Init))
ask('premise: Inv & Step ', Inv(bal, spent), step)
