// Planted violation: an app outside the wrapper homes imports vendor/ directly.
export { splitmix32 } from '../../../vendor/kernelspace/src/lib/rng.ts' // VENDOR-IMPORT
