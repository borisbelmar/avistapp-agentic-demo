import { randomUUID } from "expo-crypto";

import { generateSalt, hashPassword } from "@/auth/password";

import species from "../../assets/species.json";
import type { Db } from "./db";

// Solo desarrollo: quitar antes de cualquier versión publicada (5_MVP.md §6).
const ADMIN = { username: "admin", email: "admin@avistapp.local", password: "avistapp-admin" };

export async function seed(db: Db): Promise<void> {
  const placeholders = species.map(() => "(?, ?, ?)").join(", ");
  const params = species.flatMap((s) => [s.id, s.commonName, s.scientificName]);
  await db.runAsync(`INSERT INTO species (id, commonName, scientificName) VALUES ${placeholders}`, ...params);

  const id = randomUUID();
  const salt = generateSalt();
  const hash = await hashPassword(ADMIN.password, salt);
  await db.runAsync(
    "INSERT INTO users (id, username, email, role) VALUES (?, ?, ?, 'ADMIN')",
    id,
    ADMIN.username,
    ADMIN.email,
  );
  await db.runAsync(
    "INSERT INTO credentials (userId, passwordHash, passwordSalt) VALUES (?, ?, ?)",
    id,
    hash,
    salt,
  );
}
