command TransferWithFee(from, to, amount, fee)
  requires balance(from) >= amount
  do move amount from from to to; move fee from from to sink
