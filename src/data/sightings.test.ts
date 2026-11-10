import { randomUUID } from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";

import { register } from "@/auth/auth";
import type { Db } from "@/data/db";
import { migrate } from "@/data/migrations";
import { openTestDb } from "@/data/testing/testDb";
import { VoteValue, type Actor, type User } from "@/domain/types";

import {
  castVote,
  changeSpecies,
  createSighting,
  deleteSighting,
  getFeed,
  getMySightings,
  removeVote,
  type CreateSightingInput,
} from "./sightings";

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

async function registerUser(db: Db, username: string): Promise<User> {
  return register(db, { username, email: `${username}@test.local`, password: "secreto123" });
}

async function getAdmin(db: Db): Promise<Actor> {
  return (await db.getFirstAsync<Actor>("SELECT id, role FROM users WHERE role = 'ADMIN'"))!;
}

// Cinco votos DOWN de cinco usuarios nuevos (voter1…voter5): el avistamiento queda en −5, oculto (SG6).
async function hideWithFiveDownVotes(db: Db, sightingId: string): Promise<User[]> {
  const voters: User[] = [];
  for (let i = 1; i <= 5; i++) {
    const voter = await registerUser(db, `voter${i}`);
    await castVote(db, voter, sightingId, VoteValue.DOWN);
    voters.push(voter);
  }
  return voters;
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

  it("C1: if the only sighting of a species got hidden, a new one of that species is new again", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");

    const first = await createSighting(db, ana, BASE_INPUT);
    expect(first.isNewSpecies).toBe(true);

    await hideWithFiveDownVotes(db, first.id);

    const second = await createSighting(db, ana, BASE_INPUT);
    expect(second.isNewSpecies).toBe(true);
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

  it("leaves hidden sightings out for USER and includes them, marked, for ADMIN", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const pedro = await registerUser(db, "pedro_birder");
    const admin = await getAdmin(db);

    const hidden = await createSighting(db, ana, BASE_INPUT);
    await hideWithFiveDownVotes(db, hidden.id);
    const visible = await createSighting(db, pedro, { ...BASE_INPUT, speciesId: "scelorchilus-rubecula" });

    const userFeed = await getFeed(db, pedro);
    expect(userFeed.map((item) => item.id)).not.toContain(hidden.id);
    expect(userFeed.map((item) => item.id)).toContain(visible.id);

    const adminFeed = await getFeed(db, admin);
    expect(adminFeed.find((item) => item.id === hidden.id)?.isHidden).toBe(true);
    expect(adminFeed.find((item) => item.id === visible.id)?.isHidden).toBe(false);
  });

  it("each item carries the current user's vote", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const pedro = await registerUser(db, "pedro_birder");
    const camila = await registerUser(db, "camila_fotos");
    const javier = await registerUser(db, "javier_sur");
    const { id } = await createSighting(db, ana, BASE_INPUT);

    await castVote(db, pedro, id, VoteValue.UP);
    await castVote(db, camila, id, VoteValue.DOWN);

    expect((await getFeed(db, pedro)).find((item) => item.id === id)?.myVote).toBe(1);
    expect((await getFeed(db, camila)).find((item) => item.id === id)?.myVote).toBe(-1);
    expect((await getFeed(db, javier)).find((item) => item.id === id)?.myVote).toBeNull();
  });
});

describe("castVote", () => {
  it("voting twice changes the value instead of adding a vote", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const pedro = await registerUser(db, "pedro_birder");
    const { id } = await createSighting(db, ana, BASE_INPUT);

    await castVote(db, pedro, id, VoteValue.UP);
    await castVote(db, pedro, id, VoteValue.DOWN);

    const item = (await getFeed(db, pedro)).find((i) => i.id === id);
    expect(item?.score).toBe(-1);
    expect(item?.myVote).toBe(-1);
  });

  it("rejects voting your own sighting with OWN_SIGHTING", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const { id } = await createSighting(db, ana, BASE_INPUT);

    await expect(castVote(db, ana, id, VoteValue.UP)).rejects.toMatchObject({ code: "OWN_SIGHTING" });
  });

  it("−4 stays visible, the fifth DOWN hides it and a sixth vote is SIGHTING_HIDDEN", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const { id } = await createSighting(db, ana, BASE_INPUT);
    const voters: User[] = [];
    for (let i = 1; i <= 6; i++) {
      voters.push(await registerUser(db, `voter${i}`));
    }

    for (const voter of voters.slice(0, 4)) {
      await castVote(db, voter, id, VoteValue.DOWN);
    }
    expect((await getFeed(db, ana)).map((item) => item.id)).toContain(id);

    await castVote(db, voters[4], id, VoteValue.DOWN);
    expect((await getFeed(db, ana)).map((item) => item.id)).not.toContain(id);

    await expect(castVote(db, voters[5], id, VoteValue.UP)).rejects.toMatchObject({
      code: "SIGHTING_HIDDEN",
    });
  });
});

describe("removeVote", () => {
  it("rejects on a hidden sighting with SIGHTING_HIDDEN", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const { id } = await createSighting(db, ana, BASE_INPUT);
    const voters = await hideWithFiveDownVotes(db, id);

    await expect(removeVote(db, voters[0], id)).rejects.toMatchObject({ code: "SIGHTING_HIDDEN" });
  });

  it("retires the vote; without a previous vote it is VOTE_NOT_FOUND", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const pedro = await registerUser(db, "pedro_birder");
    const { id } = await createSighting(db, ana, BASE_INPUT);

    await castVote(db, pedro, id, VoteValue.UP);
    await removeVote(db, pedro, id);

    const item = (await getFeed(db, pedro)).find((i) => i.id === id);
    expect(item?.score).toBe(0);
    expect(item?.myVote).toBeNull();

    await expect(removeVote(db, pedro, id)).rejects.toMatchObject({ code: "VOTE_NOT_FOUND" });
  });
});

describe("deleteSighting", () => {
  it("rejects a USER who is neither author nor ADMIN with FORBIDDEN", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const pedro = await registerUser(db, "pedro_birder");
    const id = await insertSighting(db, ana.id, "vultur-gryphus", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");

    await expect(deleteSighting(db, pedro, id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await countSightings(db)).toBe(1);
  });

  it.each([["author"], ["admin"]])("the %s deletes the sighting, its votes and its photo", async (role) => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const pedro = await registerUser(db, "pedro_birder");
    const admin = await getAdmin(db);

    const { id } = await createSighting(db, ana, BASE_INPUT);
    await castVote(db, pedro, id, VoteValue.UP);
    const photoUrl = (await getFeed(db, ana)).find((item) => item.id === id)!.photoUrl;

    await deleteSighting(db, role === "author" ? ana : admin, id);

    expect(await countSightings(db)).toBe(0);
    const votes = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM votes WHERE sightingId = ?", id);
    expect(votes!.n).toBe(0);
    expect((await FileSystem.getInfoAsync(photoUrl)).exists).toBe(false);
  });
});

describe("getMySightings", () => {
  it("includes own hidden sightings, marked, newest first, and leaves out other users' sightings", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const pedro = await registerUser(db, "pedro_birder");

    const s1 = await insertSighting(
      db,
      ana.id,
      "vultur-gryphus",
      "2026-01-01T09:00:00.000Z",
      "2026-01-01T09:00:00.000Z",
    );
    const s2 = await insertSighting(
      db,
      ana.id,
      "scelorchilus-rubecula",
      "2026-01-01T10:00:00.000Z",
      "2026-01-01T10:00:00.000Z",
    );
    await insertSighting(db, pedro.id, "vultur-gryphus", "2026-01-01T11:00:00.000Z", "2026-01-01T11:00:00.000Z");

    await hideWithFiveDownVotes(db, s2);

    const items = await getMySightings(db, ana);
    expect(items.map((item) => item.id)).toEqual([s2, s1]);
    expect(items.find((item) => item.id === s2)).toMatchObject({ isHidden: true, score: -5 });
    expect(items.find((item) => item.id === s1)).toMatchObject({ isHidden: false });
  });
});

describe("changeSpecies", () => {
  it("keeps the votes", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const pedro = await registerUser(db, "pedro_birder");
    const { id } = await createSighting(db, ana, BASE_INPUT);
    await castVote(db, pedro, id, VoteValue.UP);

    await changeSpecies(db, ana, id, "scelorchilus-rubecula");

    const item = (await getMySightings(db, ana)).find((i) => i.id === id);
    expect(item).toMatchObject({ speciesId: "scelorchilus-rubecula", score: 1 });
    expect((await getFeed(db, pedro)).find((i) => i.id === id)?.myVote).toBe(1);
  });

  it.each([["another user"], ["admin"]])("rejects anyone but the author with NOT_OWNER (%s)", async (who) => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const pedro = await registerUser(db, "pedro_birder");
    const admin = await getAdmin(db);
    const { id } = await createSighting(db, ana, BASE_INPUT);
    const actor = who === "another user" ? pedro : admin;

    await expect(changeSpecies(db, actor, id, "scelorchilus-rubecula")).rejects.toMatchObject({
      code: "NOT_OWNER",
    });

    expect((await getMySightings(db, ana))[0].speciesId).toBe("vultur-gryphus");
  });

  it("rejects an unknown species with SPECIES_NOT_FOUND", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const { id } = await createSighting(db, ana, BASE_INPUT);

    await expect(changeSpecies(db, ana, id, "no-existe")).rejects.toMatchObject({ code: "SPECIES_NOT_FOUND" });

    expect((await getMySightings(db, ana))[0].speciesId).toBe("vultur-gryphus");
  });

  it("works on a hidden sighting", async () => {
    const db = await freshDb();
    const ana = await registerUser(db, "ana_aves");
    const { id } = await createSighting(db, ana, BASE_INPUT);
    await hideWithFiveDownVotes(db, id);

    await changeSpecies(db, ana, id, "scelorchilus-rubecula");

    const item = (await getMySightings(db, ana)).find((i) => i.id === id);
    expect(item).toMatchObject({ speciesId: "scelorchilus-rubecula", score: -5, isHidden: true });
  });
});
