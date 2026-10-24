// The vendored rng.ts (vendor/kernelspace/src/lib/rng.ts) reads the entropy pool in freshSeed() through the
// Web Crypto global. This package never re-exports freshSeed, but the vendored file is part of the program, so
// the one global it names is declared here, with only the shape it uses.
declare const crypto: {
  getRandomValues<T extends ArrayBufferView | null>(array: T): T
}
