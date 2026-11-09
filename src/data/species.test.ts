import { randomUUID } from "expo-crypto";

import speciesJson from "../../assets/species.json";
import { migrate } from "./migrations";
import { listSpecies } from "./species";
import { openTestDb } from "./testing/testDb";
import type { Db } from "./db";

describe("assets/species.json", () => {
  it("has no duplicate ids, no duplicate scientific names, and no empty fields", () => {
    const ids = new Set(speciesJson.map((s) => s.id));
    const scientificNames = new Set(speciesJson.map((s) => s.scientificName));
    expect(ids.size).toBe(speciesJson.length);
    expect(scientificNames.size).toBe(speciesJson.length);

    for (const s of speciesJson) {
      expect(s.id.trim()).not.toBe("");
      expect(s.commonName.trim()).not.toBe("");
      expect(s.scientificName.trim()).not.toBe("");
      expect(s.id).toBe(s.scientificName.toLowerCase().replace(/ /g, "-"));
    }
  });
});

async function insertUser(db: Db, role: "USER" | "ADMIN" = "USER") {
  const id = randomUUID();
  await db.runAsync(
    "INSERT INTO users (id, username, email, role) VALUES (?, ?, ?, ?)",
    id,
    id,
    `${id}@test.local`,
    role,
  );
  return id;
}

async function insertSighting(db: Db, authorId: string, speciesId: string) {
  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO sightings (id, authorId, speciesId, photoUrl, latitude, longitude, capturedAt, createdAt)
     VALUES (?, ?, ?, 'photos/x.jpg', 0, 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
    id,
    authorId,
    speciesId,
  );
  return id;
}

describe("listSpecies", () => {
  it("orders by commonName, Águila before Bandurria", async () => {
    const db = openTestDb();
    await migrate(db);
    const author = await insertUser(db);

    const list = await listSpecies(db, { id: author, role: "USER" });
    const aguila = list.findIndex((s) => s.commonName === "Águila");
    const bandurria = list.findIndex((s) => s.commonName === "Bandurria");
    expect(aguila).toBeGreaterThanOrEqual(0);
    expect(bandurria).toBeGreaterThanOrEqual(0);
    expect(aguila).toBeLessThan(bandurria);
  });

  it("marks inCollection only for visible sightings of the actor", async () => {
    const db = openTestDb();
    await migrate(db);
    const author = await insertUser(db);
    const voters = await Promise.all(Array.from({ length: 5 }, () => insertUser(db)));

    // Cóndor: 4 votos -1, score -4 > HIDE_THRESHOLD (-5): visible.
    const condorSighting = await insertSighting(db, author, "vultur-gryphus");
    for (const voter of voters.slice(0, 4)) {
      await db.runAsync(
        "INSERT INTO votes (userId, sightingId, value) VALUES (?, ?, -1)",
        voter,
        condorSighting,
      );
    }

    // Bandurria: 5 votos -1, score -5 = HIDE_THRESHOLD: oculta.
    const bandurriaSighting = await insertSighting(db, author, "theristicus-melanopis");
    for (const voter of voters) {
      await db.runAsync(
        "INSERT INTO votes (userId, sightingId, value) VALUES (?, ?, -1)",
        voter,
        bandurriaSighting,
      );
    }

    const authorList = await listSpecies(db, { id: author, role: "USER" });
    const inCollection = (list: typeof authorList, scientificName: string) =>
      list.find((s) => s.scientificName === scientificName)?.inCollection;

    expect(inCollection(authorList, "Vultur gryphus")).toBe(true);
    expect(inCollection(authorList, "Theristicus melanopis")).toBe(false);
    expect(inCollection(authorList, "Geranoaetus melanoleucus")).toBe(false);

    const voterList = await listSpecies(db, { id: voters[0], role: "USER" });
    expect(inCollection(voterList, "Vultur gryphus")).toBe(false);
  });
});
