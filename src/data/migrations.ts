import type { Db } from "./db";
import { seedDevData } from "./devSeed";
import { seed } from "./seed";

// Esquema de STACK §4, tal cual.
const SCHEMA_V1 = `
CREATE TABLE users (
  id       TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email    TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role     TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN'))
);

CREATE TABLE credentials (
  userId       TEXT PRIMARY KEY REFERENCES users(id),
  passwordHash TEXT NOT NULL,
  passwordSalt TEXT NOT NULL
);

CREATE TABLE species (
  id             TEXT PRIMARY KEY,
  commonName     TEXT NOT NULL,
  scientificName TEXT NOT NULL UNIQUE
);

CREATE TABLE sightings (
  id         TEXT PRIMARY KEY,
  authorId   TEXT NOT NULL REFERENCES users(id),
  speciesId  TEXT NOT NULL REFERENCES species(id),
  photoUrl   TEXT NOT NULL,
  latitude   REAL NOT NULL,
  longitude  REAL NOT NULL,
  capturedAt TEXT NOT NULL,
  createdAt  TEXT NOT NULL
);

CREATE TABLE votes (
  userId     TEXT NOT NULL REFERENCES users(id),
  sightingId TEXT NOT NULL REFERENCES sightings(id) ON DELETE CASCADE,
  value      INTEGER NOT NULL CHECK (value IN (1, -1)),
  PRIMARY KEY (userId, sightingId)
);
`;

const migrations: ((db: Db) => Promise<void>)[] = [
  async (db) => {
    await db.execAsync(SCHEMA_V1);
    await seed(db);
  },
];

export async function migrate(db: Db): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const current = row?.user_version ?? 0;
  for (let v = current; v < migrations.length; v++) {
    // user_version es transaccional: si la migración falla, se revierte junto con ella.
    await db.withExclusiveTransactionAsync(async (txn) => {
      await migrations[v](txn);
      await txn.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

// onInit del SQLiteProvider del layout raíz: función de módulo, referencia estable para su memo.
export async function initDb(db: Db): Promise<void> {
  await db.execAsync("PRAGMA foreign_keys = ON");
  await migrate(db);
  // Solo en desarrollo: nunca corre en una versión publicada (5_MVP.md §6).
  if (__DEV__) {
    await seedDevData(db);
  }
}
