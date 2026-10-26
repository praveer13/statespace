// SHA-256 (FIPS 180-4) and UTF-8 encoding in plain TypeScript, synchronous and dependency-free, so the
// digest of an event set and the keep/kill rules' hash are the same function on the main origin, in a
// worker and in Node. Tested against node:crypto (test/sha256.test.ts).
//
// Pure: no DOM, storage or network.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

/** UTF-8 bytes of a string. A lone surrogate becomes U+FFFD, as TextEncoder writes it. */
export function utf8(text: string): Uint8Array {
  // At most three bytes per UTF-16 code unit: a surrogate pair (two units) takes four.
  const out = new Uint8Array(text.length * 3)
  let n = 0
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i)
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      const d = text.charCodeAt(i + 1)
      if (d >= 0xdc00 && d <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00)
        i += 1
      } else c = 0xfffd
    } else if (c >= 0xd800 && c <= 0xdfff) c = 0xfffd
    if (c < 0x80) out[n++] = c
    else if (c < 0x800) {
      out[n++] = 0xc0 | (c >> 6)
      out[n++] = 0x80 | (c & 0x3f)
    } else if (c < 0x10000) {
      out[n++] = 0xe0 | (c >> 12)
      out[n++] = 0x80 | ((c >> 6) & 0x3f)
      out[n++] = 0x80 | (c & 0x3f)
    } else {
      out[n++] = 0xf0 | (c >> 18)
      out[n++] = 0x80 | ((c >> 12) & 0x3f)
      out[n++] = 0x80 | ((c >> 6) & 0x3f)
      out[n++] = 0x80 | (c & 0x3f)
    }
  }
  return out.slice(0, n)
}

/** The SHA-256 of bytes, or of a string's UTF-8 bytes, as 64 lowercase hexadecimal digits. */
export function sha256Hex(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? utf8(input) : input
  const bitLength = bytes.length * 8
  const padded = new Uint8Array((((bytes.length + 9 + 63) >> 6) << 6))
  padded.set(bytes)
  padded[bytes.length] = 0x80
  const view = new DataView(padded.buffer)
  // The length in bits as a 64-bit big-endian integer; lengths here stay far below 2^53.
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000))
  view.setUint32(padded.length - 4, bitLength >>> 0)

  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19])
  const w = new Uint32Array(64)
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let t = 0; t < 16; t++) w[t] = view.getUint32(offset + t * 4)
    for (let t = 16; t < 64; t++) {
      const a = w[t - 15] as number
      const b = w[t - 2] as number
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10)
      w[t] = ((w[t - 16] as number) + s0 + (w[t - 7] as number) + s1) >>> 0
    }
    let a = h[0] as number
    let b = h[1] as number
    let c = h[2] as number
    let d = h[3] as number
    let e = h[4] as number
    let f = h[5] as number
    let g = h[6] as number
    let k = h[7] as number
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (k + S1 + ch + (K[t] as number) + (w[t] as number)) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) >>> 0
      k = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }
    h[0] = ((h[0] as number) + a) >>> 0
    h[1] = ((h[1] as number) + b) >>> 0
    h[2] = ((h[2] as number) + c) >>> 0
    h[3] = ((h[3] as number) + d) >>> 0
    h[4] = ((h[4] as number) + e) >>> 0
    h[5] = ((h[5] as number) + f) >>> 0
    h[6] = ((h[6] as number) + g) >>> 0
    h[7] = ((h[7] as number) + k) >>> 0
  }
  let hex = ''
  for (const word of h) hex += word.toString(16).padStart(8, '0')
  return hex
}

const rotr = (x: number, n: number): number => ((x >>> n) | (x << (32 - n))) >>> 0
