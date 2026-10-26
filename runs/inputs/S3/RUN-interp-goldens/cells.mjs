import { runCell } from '../../../../packages/interp/src/index.ts'
const cells = [
 {
  "lesson": "S3.L2",
  "cell": 1,
  "recorded": "RUN-interp-goldens",
  "text": "command Pay(from: account, to: account, amount: amount)\n  requires balance(to) >= amount\n  do move amount from from to to\n"
 },
 {
  "lesson": "S3.L2",
  "cell": 2,
  "recorded": "RUN-interp-goldens",
  "text": "start    mint -100 \u00b7 a 100 \u00b7 sink 0\n1   hold 30 on a\n2   capture h to sink\n3   release h\n"
 },
 {
  "lesson": "S3.L3",
  "cell": 1,
  "recorded": "RUN-interp-goldens",
  "text": "start    mint -10 \u00b7 a 10\nTransfer(a, a, 5)\n"
 },
 {
  "lesson": "S3.L3",
  "cell": 2,
  "recorded": "RUN-interp-goldens",
  "text": "start    mint -100 \u00b7 a 100 \u00b7 b 0\nTransfer(a, b, 0)\n"
 },
 {
  "lesson": "S3.L7",
  "cell": 1,
  "recorded": "RUN-interp-goldens",
  "text": "policy   zero = reject \u00b7 self = allow \u00b7 guard = error \u00b7 overflow = unbounded\nstart    mint -100 \u00b7 a 100 \u00b7 b 0\n  Transfer(a, b, 0)\n  Transfer(a, a, 15)\n  Transfer(a, b, 130)\nstart    mint -(2^63 - 1) \u00b7 a 2^63 - 1 \u00b7 b 0\n  Deposit(a, 1)\n"
 },
 {
  "lesson": "S3.L7",
  "cell": 3,
  "recorded": "RUN-interp-goldens",
  "text": "before   zero = reject \u00b7 self = allow \u00b7 guard = error  \u00b7 overflow = unbounded\nafter    zero = reject \u00b7 self = allow \u00b7 guard = silent \u00b7 overflow = unbounded\nstart    mint -100 \u00b7 a 100 \u00b7 b 0\n  Transfer(a, b, 130)\n"
 },
 {
  "lesson": "S3.L9",
  "cell": 1,
  "recorded": "RUN-lean-unsafe-cmd",
  "text": "command ForcePay(from, to, amount)\n  do force move amount from from to to\n\nstart    mint 0 \u00b7 a 0 \u00b7 b 0\n  ForcePay(a, b, 1)\n"
 }
]
for (const c of cells) {
  console.log(`== ${c.lesson} cell ${c.cell} (recorded ${c.recorded})`)
  for (const line of runCell(c.text)) console.log(`OUT ${line.text}`)
}
