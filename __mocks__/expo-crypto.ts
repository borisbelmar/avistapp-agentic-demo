/// <reference types="node" />
import { createHash, randomBytes, randomUUID as nodeRandomUUID } from "node:crypto";

export const CryptoDigestAlgorithm = { SHA256: "SHA-256" } as const;

export function randomUUID(): string {
  return nodeRandomUUID();
}

export function getRandomBytes(byteCount: number): Uint8Array {
  return new Uint8Array(randomBytes(byteCount));
}

export async function digestStringAsync(algorithm: string, data: string): Promise<string> {
  return createHash(algorithm.replace("-", "").toLowerCase()).update(data).digest("hex");
}
