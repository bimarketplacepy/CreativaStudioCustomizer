declare module "wawoff2" {
  /** Decompress a WOFF2 buffer into raw TTF/OTF bytes. */
  export function decompress(data: Buffer | Uint8Array): Promise<Uint8Array>;
  export function compress(data: Buffer | Uint8Array): Promise<Uint8Array>;
}
