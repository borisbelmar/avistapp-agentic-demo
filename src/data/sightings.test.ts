import { randomUUID } from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";

import { register } from "@/auth/auth";
import type { Db } from "@/data/db";
import { migrate } from "@/data/migrations";
import { openTestDb } from "@/data/testing/testDb";

import { createSighting, getFeed, type CreateSightingInput } from "./sightings";

async function freshDb(): Promise<Db> {
  const db = openTestDb();
  await migrate(db);
  return db;
}

async function insertSighting(db: Db, authorId: string, speciesId: string, createdAt: string, capturedAt: string) {
  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO sightings (id, authorId, speciesId, photoUrl, latitude, longitude, capturedAt, createdAt)
     VALUES (?, ?, ?, 'photos/x.jpg', 0, 0, ?, ?)`,
    id,
    authorId,
    speciesId,
    capturedAt,
    createdAt,
  );
  return id;
}

async function countSightings(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM sightings");
  return row!.n;
}

const BASE_INPUT: CreateSightingInput = {
  photoBase64: "aGVsbG8=",
  location: { latitude: -33.4489, longitude: -70.6693 },
  speciesId: "vultur-gryphus",
  capturedAt: "2026-11-01T12:00:00.000Z",
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("createSighting", () => {
  it.each([
    ["latitude", { ...BASE_INPUT.location, latitude: 90.0001 }],
    ["longitude", { ...BASE_INPUT.location, longitude: -180.0001 }],
  ])("rejects coordinates out of range (%s)", async (_field, location) => {
    const db = await freshDb();
    const actor = await register(db, { username: "ana_aves", email: "ana@test.local", password: "secreto123" });

    await expect(createSighting(db, actor, { ...BASE_INPUT, location })).rejects.toMatchObject({
      code: "INVALID_LOCATION",
    });
    expect(await countSightings(db)).toBe(0);
  });

  it("rejects a non-existent species with SPECIES_NOT_FOUND", async () => {
    const db = await freshDb();
    const actor = await register(db, { username: "ana_aves", email: "ana@test.local", password: "secreto123" });

    await expect(
      createSighting(db, actor, { ...BASE_INPUT, speciesId: "no-existe" }),
    ).rejects.toMatchObject({ code: "SPECIES_NOT_FOUND" });
    expect(await countSightings(db)).toBe(0);
  });

  it("marks isNewSpecies true the first time and false the second time, same actor and species", async () => {
    const db = await freshDb();
    const actor = await register(db, { username: "ana_aves", email: "ana@test.local", password: "secreto123" });

    const first = await createSighting(db, actor, BASE_INPUT);
    expect(first.isNewSpecies).toBe(true);

    const second = await createSighting(db, actor, BASE_INPUT);
    expect(second.isNewSpecies).toBe(false);
  });

  it("SG1a: if writing the photo fails, no sighting is left, and a retry works", async () => {
    const db = await freshDb();
    const actor = await register(db, { username: "ana_aves", email: "ana@test.local", password: "secreto123" });

    jest.spyOn(FileSystem, "writeAsStringAsync").mockRejectedValueOnce(new Error("disk full"));

    await expect(createSighting(db, actor, BASE_INPUT)).rejects.toThrow("disk full");
    expect(await countSightings(db)).toBe(0);

    const retry = await createSighting(db, actor, BASE_INPUT);
    expect(retry.isNewSpecies).toBe(true);

    const feed = await getFeed(db, actor);
    expect(feed).toHaveLength(1);
    expect((await FileSystem.getInfoAsync(feed[0].photoUrl)).exists).toBe(true);
  });
});

describe("getFeed", () => {
  it("orders by createdAt descending", async () => {
    const db = await freshDb();
    const actor = await register(db, { username: "ana_aves", email: "ana@test.local", password: "secreto123" });

    // capturedAt en orden inverso al de createdAt: getFeed debe ordenar por createdAt, no por capturedAt.
    const b = await insertSighting(
      db,
      actor.id,
      "vultur-gryphus",
      "2026-01-01T10:00:00.000Z",
      "2026-01-03T00:00:00.000Z",
    );
    const a = await insertSighting(
      db,
      actor.id,
      "vultur-gryphus",
      "2026-01-01T09:00:00.000Z",
      "2026-01-02T00:00:00.000Z",
    );
    const c = await insertSighting(
      db,
      actor.id,
      "vultur-gryphus",
      "2026-01-01T11:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    );

    const feed = await getFeed(db, actor);
    expect(feed.map((item) => item.id)).toEqual([c, b, a]);
  });
});
