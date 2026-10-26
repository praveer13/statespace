entity Account; command Transfer(from, to, amount); requires balance(from) >= amount; do move amount from from to to.
