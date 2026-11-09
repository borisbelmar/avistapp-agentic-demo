import type { Db } from "@/data/db";
import { migrate } from "@/data/migrations";
import { openTestDb } from "@/data/testing/testDb";

import { login, logout, register, restoreSession, saveSession } from "./auth";
import { hashPassword } from "./password";

async function freshDb(): Promise<Db> {
  const db = openTestDb();
  await migrate(db);
  return db;
}

const ANA = { username: "ana_aves", email: "ana@test.local", password: "secreto123" };

describe("register", () => {
  it("creates the user with role USER and its credentials", async () => {
    const db = await freshDb();
    const user = await register(db, ANA);

    expect(user).toEqual({
      id: expect.any(String),
      username: ANA.username,
      email: ANA.email,
      role: "USER",
    });

    const row = await db.getFirstAsync<{ passwordHash: string; passwordSalt: string }>(
      "SELECT passwordHash, passwordSalt FROM credentials WHERE userId = ?",
      user.id,
    );
    expect(row?.passwordHash).toBe(await hashPassword(ANA.password, row!.passwordSalt));
  });

  it("rejects an email already taken with different casing", async () => {
    const db = await freshDb();
    await register(db, ANA);

    await expect(
      register(db, { username: "otro_user", email: "ANA@Test.Local", password: "otraclave1" }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("rejects a username already taken with different casing", async () => {
    const db = await freshDb();
    await register(db, ANA);

    await expect(
      register(db, { username: "ANA_AVES", email: "otro@test.local", password: "otraclave1" }),
    ).rejects.toMatchObject({ code: "USERNAME_TAKEN" });
  });

  it("hashes the same password differently for two users and never stores it in clear", async () => {
    const db = await freshDb();
    const ana = await register(db, ANA);
    const beto = await register(db, {
      username: "beto_aves",
      email: "beto@test.local",
      password: ANA.password,
    });

    const rows = await db.getAllAsync<{ userId: string; passwordHash: string }>(
      "SELECT userId, passwordHash FROM credentials WHERE userId IN (?, ?)",
      ana.id,
      beto.id,
    );
    expect(rows[0].passwordHash).not.toBe(rows[1].passwordHash);

    const users = await db.getAllAsync("SELECT * FROM users");
    const credentials = await db.getAllAsync("SELECT * FROM credentials");
    expect(JSON.stringify(users) + JSON.stringify(credentials)).not.toContain(ANA.password);
  });
});

describe("login", () => {
  it("logs in regardless of email casing", async () => {
    const db = await freshDb();
    const ana = await register(db, ANA);

    const user = await login(db, { email: "ANA@TEST.LOCAL", password: ANA.password });
    expect(user).toEqual(ana);
  });

  it("rejects an incorrect password", async () => {
    const db = await freshDb();
    await register(db, ANA);

    await expect(login(db, { email: ANA.email, password: "incorrecta1" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });

  it("rejects an email that doesn't exist", async () => {
    const db = await freshDb();

    await expect(
      login(db, { email: "nadie@test.local", password: "secreto123" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });
});

describe("session", () => {
  it("restores the saved user, and null after logout", async () => {
    const db = await freshDb();
    const user = await register(db, ANA);

    await saveSession(user.id);
    expect(await restoreSession(db)).toEqual(user);

    await logout();
    expect(await restoreSession(db)).toBeNull();
  });

  it("clears a session whose user no longer exists (iOS keychain survives uninstall)", async () => {
    const db = await freshDb();

    await saveSession("ghost");
    expect(await restoreSession(db)).toBeNull();

    // restoreSession ya borró la sesión: insertar "ghost" directo en la base no la revive.
    await db.runAsync(
      "INSERT INTO users (id, username, email, role) VALUES ('ghost', 'ghost', 'ghost@test.local', 'USER')",
    );
    expect(await restoreSession(db)).toBeNull();
  });
});
