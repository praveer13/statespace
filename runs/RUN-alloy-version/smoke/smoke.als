sig Node { succ: lone Node }
fact acyclic { no n: Node | n in n.^succ }
run showSome { some succ } for 3
check selfLoopFree { no n: Node | n.succ = n } for 4
