import { randomUUID } from "expo-crypto";

import { register } from "@/auth/auth";
import { VoteValue, type User } from "@/domain/types";

import speciesJson from "../../assets/species.json";
import type { Db } from "./db";
import { migrate } from "./migrations";
import { getProfile } from "./profile";
import { castVote, deleteSighting } from "./sightings";
import { openTestDb } from "./testing/testDb";

async function freshDb(): Promise<Db> {
  const db = openTestDb();
  await migrate(db);
  return db;
}

async function registerUser(db: Db, username: string): Promise<User> {
  return register(db, { username, email: `${username}@test.local`, password: "secreto123" });
}

async function insertSighting(db: Db, authorId: string, speciesId: string, createdAt: string): Promise<string> {
  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO sightings (id, authorId, speciesId, photoUrl, latitude, longitude, capturedAt, createdAt)
     VALUES (?, ?, ?, ?, 0, 0, ?, ?)`,
    id,
    authorId,
    speciesId,
    `photos/${id}.jpg`,
    createdAt,
    createdAt,
  );
  return id;
}

// Cinco votos DOWN de cinco usuarios nuevos: el avistamiento queda en −5, oculto (SG6).
async function hideWithFiveDownVotes(db: Db, sightingId: string): Promise<void> {
  for (let i = 1; i <= 5; i++) {
    const voter = await registerUser(db, `voter${i}`);
    await castVote(db, voter, sightingId, VoteValue.DOWN);
  }
}

describe("getProfile", () => {
  it("a user without sightings has score 0, empty collection and progress 0", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");

    const profile = await getProfile(db, ana);

    expect(profile.votesTotal).toBe(0);
    expect(profile.speciesBonus).toBe(0);
    expect(profile.userScore).toBe(0);
    expect(profile.collection).toEqual([]);
    expect(profile.progress).toBe(0);
    expect(profile.catalogSize).toBe(speciesJson.length);
  });

  it("C3: userScore sums votes of all own sightings, hidden included, plus 10 per visible species", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const pedro = await registerUser(db, "pedro_birder");

    const s1 = await insertSighting(db, ana.id, "vultur-gryphus", "2026-01-01T09:00:00.000Z");
    await castVote(db, pedro, s1, VoteValue.UP);

    const s2 = await insertSighting(db, ana.id, "scelorchilus-rubecula", "2026-01-01T10:00:00.000Z");
    await hideWithFiveDownVotes(db, s2);

    const s3 = await insertSighting(db, pedro.id, "theristicus-melanopis", "2026-01-01T11:00:00.000Z");
    await castVote(db, ana, s3, VoteValue.UP); // voto emitido por ana, no debe contar en su puntaje

    const profile = await getProfile(db, ana);

    expect(profile.votesTotal).toBe(-4); // +1 (s1) − 5 (s2 oculto)
    expect(profile.collection.map((c) => c.speciesId)).toEqual(["vultur-gryphus"]);
    expect(profile.speciesBonus).toBe(10);
    expect(profile.userScore).toBe(6);
    expect(profile.progress).toBe(1 / profile.catalogSize);
  });

  it("C4: deleting the only sighting of a species removes its bonus", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const pedro = await registerUser(db, "pedro_birder");

    const s1 = await insertSighting(db, ana.id, "vultur-gryphus", "2026-01-01T09:00:00.000Z");
    await castVote(db, pedro, s1, VoteValue.UP);
    const s2 = await insertSighting(db, ana.id, "scelorchilus-rubecula", "2026-01-01T10:00:00.000Z");

    expect((await getProfile(db, ana)).userScore).toBe(21); // 1 + 10 × 2

    await deleteSighting(db, ana, s2);

    const after = await getProfile(db, ana);
    expect(after.userScore).toBe(11); // 1 + 10 × 1
    expect(after.collection.map((c) => c.speciesId)).not.toContain("scelorchilus-rubecula");
  });

  it("C4: publishing and deleting leaves the score as before", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const pedro = await registerUser(db, "pedro_birder");

    const s1 = await insertSighting(db, ana.id, "vultur-gryphus", "2026-01-01T09:00:00.000Z");
    await castVote(db, pedro, s1, VoteValue.UP);

    const before = await getProfile(db, ana);

    const s4 = await insertSighting(db, ana.id, "theristicus-melanopis", "2026-01-01T10:00:00.000Z");
    await castVote(db, pedro, s4, VoteValue.UP);
    await deleteSighting(db, ana, s4);

    const after = await getProfile(db, ana);
    expect(after.userScore).toBe(before.userScore);
    expect(after.collection).toEqual(before.collection);
  });

  it("each collection species shows its most recent visible photo, alphabetically", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");

    const a1 = await insertSighting(db, ana.id, "geranoaetus-melanoleucus", "2026-01-01T09:00:00.000Z"); // Águila
    const a2 = await insertSighting(db, ana.id, "geranoaetus-melanoleucus", "2026-01-01T10:00:00.000Z"); // Águila, visible, más reciente
    const a3 = await insertSighting(db, ana.id, "geranoaetus-melanoleucus", "2026-01-01T11:00:00.000Z"); // Águila, oculta
    await hideWithFiveDownVotes(db, a3);
    await insertSighting(db, ana.id, "anairetes-parulus", "2026-01-01T08:00:00.000Z"); // Cachudito común

    const profile = await getProfile(db, ana);

    expect(profile.collection.map((c) => c.speciesId)).toEqual([
      "geranoaetus-melanoleucus",
      "anairetes-parulus",
    ]);
    const aguila = profile.collection.find((c) => c.speciesId === "geranoaetus-melanoleucus")!;
    expect(aguila.photoUrl).toContain(`${a2}.jpg`);
    expect(aguila.photoUrl).not.toContain(`${a1}.jpg`);
    expect(aguila.photoUrl).not.toContain(`${a3}.jpg`);
  });
});
