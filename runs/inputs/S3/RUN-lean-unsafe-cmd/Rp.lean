theorem s1 : ("ab" == "ab") = true := by decide
theorem s3 : decide ("ab" = "ac") = false := by decide
theorem n1 : decide ((3 : Nat) = 4) = false := by decide
theorem c1 : decide ('a' = 'b') = false := by decide
