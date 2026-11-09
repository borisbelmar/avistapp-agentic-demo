import { hashPassword } from "@/auth/password";

import species from "../../assets/species.json";
import { migrate } from "./migrations";
import { openTestDb } from "./testing/testDb";

describe("migrate", () => {
  it("creates the schema, loads the catalog, and creates the dev admin", async () => {
    const db = openTestDb();
    await migrate(db);

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    );
    const names = tables.map((t) => t.name);
    for (const table of ["users", "credentials", "species", "sightings", "votes"]) {
      expect(names).toContain(table);
    }

    const speciesCount = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM species");
    expect(speciesCount?.count).toBe(species.length);

    const admin = await db.getFirstAsync<{
      username: string;
      email: string;
      role: string;
      passwordHash: string;
      passwordSalt: string;
    }>(
      `SELECT u.username, u.email, u.role, c.passwordHash, c.passwordSalt
       FROM users u JOIN credentials c ON c.userId = u.id
       WHERE u.username = ?`,
      "admin",
    );
    expect(admin?.email).toBe("admin@avistapp.local");
    expect(admin?.role).toBe("ADMIN");
    expect(admin?.passwordHash).toBe(await hashPassword("avistapp-admin", admin!.passwordSalt));
  });

  it("is idempotent: running twice does not duplicate data", async () => {
    const db = openTestDb();
    await migrate(db);
    await migrate(db);

    const speciesCount = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM species");
    expect(speciesCount?.count).toBe(species.length);

    const usersCount = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM users");
    expect(usersCount?.count).toBe(1);
  });
});
