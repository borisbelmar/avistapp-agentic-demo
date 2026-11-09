import type { SQLiteBindValue, SQLiteRunResult } from "expo-sqlite";

// Subconjunto de SQLiteDatabase que usa el proyecto. La base real de useSQLiteContext() lo
// cumple (STACK §3), lo que permite probar la capa de datos contra better-sqlite3 en memoria.
export interface Db {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: SQLiteBindValue[]): Promise<SQLiteRunResult>;
  getFirstAsync<T>(source: string, ...params: SQLiteBindValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: SQLiteBindValue[]): Promise<T[]>;
  withExclusiveTransactionAsync(task: (txn: Db) => Promise<void>): Promise<void>;
}
