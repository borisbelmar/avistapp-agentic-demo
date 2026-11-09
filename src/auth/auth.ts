import { randomUUID } from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import type { z } from "zod";

import type { Db } from "@/data/db";
import { DomainError, type ErrorCode } from "@/domain/errors";
import { loginSchema, registerSchema } from "@/domain/schemas";
import type { Role, User } from "@/domain/types";

import { generateSalt, hashPassword } from "./password";

const SESSION_KEY = "sessionUserId";

const FIELD_ERRORS = {
  username: "INVALID_USERNAME",
  email: "INVALID_EMAIL",
  password: "WEAK_PASSWORD",
} as const satisfies Record<keyof z.infer<typeof registerSchema>, ErrorCode>;

// register (DOMAIN §6, U1–U4): crea un User con rol USER y sus credenciales, en una transacción.
// email y username no distinguen mayúsculas (COLLATE NOCASE), así que la unicidad la protege la
// base; aquí solo se consulta para devolver el código de error correcto.
export async function register(db: Db, input: z.infer<typeof registerSchema>): Promise<User> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0].path[0] as keyof typeof FIELD_ERRORS;
    throw new DomainError(FIELD_ERRORS[field]);
  }
  const { username, email, password } = parsed.data;

  const id = randomUUID();
  const salt = generateSalt();
  const hash = await hashPassword(password, salt);

  await db.withExclusiveTransactionAsync(async (txn) => {
    const emailTaken = await txn.getFirstAsync("SELECT 1 FROM users WHERE email = ?", email);
    if (emailTaken) throw new DomainError("EMAIL_TAKEN");

    const usernameTaken = await txn.getFirstAsync("SELECT 1 FROM users WHERE username = ?", username);
    if (usernameTaken) throw new DomainError("USERNAME_TAKEN");

    await txn.runAsync(
      "INSERT INTO users (id, username, email, role) VALUES (?, ?, ?, 'USER')",
      id,
      username,
      email,
    );
    await txn.runAsync(
      "INSERT INTO credentials (userId, passwordHash, passwordSalt) VALUES (?, ?, ?)",
      id,
      hash,
      salt,
    );
  });

  return { id, username, email, role: "USER" };
}

// login (DOMAIN §6): el correo no distingue mayúsculas (COLLATE NOCASE).
export async function login(db: Db, input: z.infer<typeof loginSchema>): Promise<User> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) throw new DomainError("INVALID_CREDENTIALS");
  const { email, password } = parsed.data;

  const row = await db.getFirstAsync<{
    id: string;
    username: string;
    email: string;
    role: Role;
    passwordHash: string;
    passwordSalt: string;
  }>(
    `SELECT u.id, u.username, u.email, u.role, c.passwordHash, c.passwordSalt
     FROM users u JOIN credentials c ON c.userId = u.id
     WHERE u.email = ?`,
    email,
  );

  if (!row || (await hashPassword(password, row.passwordSalt)) !== row.passwordHash) {
    throw new DomainError("INVALID_CREDENTIALS");
  }

  return { id: row.id, username: row.username, email: row.email, role: row.role };
}

export async function saveSession(userId: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, userId);
}

// restoreSession (STACK §5): en iOS el llavero sobrevive a la desinstalación, así que se verifica
// que el usuario todavía exista; si no, se borra la sesión guardada.
export async function restoreSession(db: Db): Promise<User | null> {
  const userId = await SecureStore.getItemAsync(SESSION_KEY);
  if (userId === null) return null;

  const row = await db.getFirstAsync<User>(
    "SELECT id, username, email, role FROM users WHERE id = ?",
    userId,
  );
  if (!row) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
  return row;
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
