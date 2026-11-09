import Database from "better-sqlite3";
import type { SQLiteBindValue } from "expo-sqlite";

import type { Db } from "../db";

// Base vacía: cada prueba llama a migrate(db) si la necesita.
export function openTestDb(): Db {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");

  const db: Db = {
    async execAsync(source) {
      sqlite.exec(source);
    },
    async runAsync(source, ...params: SQLiteBindValue[]) {
      const { changes, lastInsertRowid } = sqlite.prepare(source).run(...params);
      return { changes, lastInsertRowId: Number(lastInsertRowid) };
    },
    async getFirstAsync<T>(source: string, ...params: SQLiteBindValue[]) {
      return (sqlite.prepare(source).get(...params) ?? null) as T | null;
    },
    async getAllAsync<T>(source: string, ...params: SQLiteBindValue[]) {
      return sqlite.prepare(source).all(...params) as T[];
    },
    // ponytail: misma conexión, sin concurrencia; basta para probar reglas y rollback.
    async withExclusiveTransactionAsync(task) {
      sqlite.exec("BEGIN");
      try {
        await task(db);
        sqlite.exec("COMMIT");
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return db;
}
