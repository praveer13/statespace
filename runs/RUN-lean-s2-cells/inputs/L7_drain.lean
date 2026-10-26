def drain (bal : Int) : List Int → Int
  | [] => bal
  | x :: xs => drain (bal - x) xs
