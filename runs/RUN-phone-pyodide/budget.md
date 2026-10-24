Reference: emulated (provisional: no real device on file); profiles cpu0.25/chromium, cpu0.25/firefox, cpu0.25/webkit

| Quantity | Reference value | Budget (x1.25, up to 0.5 s) |
|---|---|---|
| consent sheet ready (handshake) | 461 ms | 1.0 s |
| live verdict, cache warm (spawn + start + first solve) | 16.8 s | 21.0 s |
| cold start, CPU part (consent to verdict on an unshaped link) | 17.3 s | 22.0 s |
| worker restart after a stop, to the next verdict | 17.9 s | 22.5 s |
| page responsiveness: the latest tick of a 50 ms main-thread timer during the fill and the engine start | 160 ms | 200 ms |
| watchdog wall-clock default (twice the slowest rlimit 5e6 run, at least 10.0 s) | 6.9 s | 14.0 s |

| Watchdog `wallMs` for a default `rlimit` of | 100,000 | 1,000,000 | 5,000,000 |
|---|---:|---:|---:|
| twice the slowest run at the reference, at least 10.0 s | 10.0 s | 12.0 s | 14.0 s |

| Link | Fetch, arithmetic | Cold live verdict | Budget |
|---|---|---|---|
| slow: 1.6 Mbit/s, 150 ms | 65.4 s | 82.7 s | 103.5 s |
| lte: 10 Mbit/s, 50 ms | 10.6 s | 27.9 s | 35.0 s |

| CI threshold at yardstick parity | Engine | Handshake | Warm live verdict | Cold, CPU part | Restart | Yardstick here (JS) | Main-thread throttle |
|---|---|---:|---:|---:|---:|---:|---:|
| budget / ratio | chromium | 250 ms | 3.8 s | 2.4 s | 4.3 s | 120.3 ms | 4x |
| budget / ratio | firefox | 250 ms | 2.6 s | 2.8 s | 2.9 s | 125 ms | 4x |
| budget / ratio | webkit | 250 ms | 2.0 s | 2.2 s | 2.0 s | 123 ms | 4x |
