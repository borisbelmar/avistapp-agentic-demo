import { randomUUID } from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import type { z } from "zod";

import { HIDE_THRESHOLD } from "@/domain/constants";
import { DomainError, type ErrorCode } from "@/domain/errors";
import { isHidden } from "@/domain/rules";
import { createSightingSchema } from "@/domain/schemas";
import type { Actor, VoteValue } from "@/domain/types";

import type { Db } from "./db";
import { ensurePhotosDir, PHOTOS_DIR, resolvePhotoUrl } from "./photos";

// SG5: el puntaje de un avistamiento se calcula en cada lectura a partir de sus votos; nunca se guarda.
export const SCORE_SQL = "(SELECT COALESCE(SUM(v.value), 0) FROM votes v WHERE v.sightingId = g.id)";

export type CreateSightingInput = z.infer<typeof createSightingSchema>;

const FIELD_ERRORS = {
  photoBase64: "PHOTO_REQUIRED",
  location: "INVALID_LOCATION",
  speciesId: "SPECIES_NOT_FOUND",
} as const satisfies Partial<Record<keyof CreateSightingInput, ErrorCode>>;

// createSighting (DOMAIN §6, SG1, SG1a, SG2, SG7, C1): crea un Sighting visible con puntaje 0 a
// partir de la foto capturada, la ubicación y la especie, e indica si la especie es nueva en la
// colección visible del actor (C1). Es atómico respecto de la foto: si escribirla falla, el
// avistamiento insertado se borra y el error se relanza, sin tocar la foto de origen (SG1a,
// STACK §7).
export async function createSighting(
  db: Db,
  actor: Actor,
  input: CreateSightingInput,
): Promise<{ id: string; isNewSpecies: boolean }> {
  const parsed = createSightingSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0].path[0];
    if (typeof field === "string" && field in FIELD_ERRORS) {
      throw new DomainError(FIELD_ERRORS[field as keyof typeof FIELD_ERRORS]);
    }
    // Solo capturedAt llega aquí: lo pone el dispositivo, no el usuario (falla, no error de dominio).
    throw parsed.error;
  }
  const { photoBase64, location, speciesId, capturedAt } = parsed.data;

  const id = randomUUID();
  const photoUrl = `${PHOTOS_DIR}${id}.jpg`;
  await ensurePhotosDir();

  let isNewSpecies = false;
  await db.withExclusiveTransactionAsync(async (txn) => {
    const species = await txn.getFirstAsync("SELECT 1 FROM species WHERE id = ?", speciesId);
    if (!species) throw new DomainError("SPECIES_NOT_FOUND");

    const inCollection = await txn.getFirstAsync(
      `SELECT 1 FROM sightings g WHERE g.authorId = ? AND g.speciesId = ? AND ${SCORE_SQL} > ?`,
      actor.id,
      speciesId,
      HIDE_THRESHOLD,
    );
    isNewSpecies = inCollection === null;

    await txn.runAsync(
      `INSERT INTO sightings (id, authorId, speciesId, photoUrl, latitude, longitude, capturedAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      actor.id,
      speciesId,
      photoUrl,
      location.latitude,
      location.longitude,
      capturedAt,
      new Date().toISOString(),
    );
  });

  try {
    await FileSystem.writeAsStringAsync(resolvePhotoUrl(photoUrl), photoBase64, { encoding: "base64" });
  } catch (error) {
    await db.runAsync("DELETE FROM sightings WHERE id = ?", id);
    throw error;
  }

  return { id, isNewSpecies };
}

export type FeedItem = {
  id: string;
  authorId: string;
  authorUsername: string;
  speciesId: string;
  commonName: string;
  scientificName: string;
  photoUrl: string;
  latitude: number;
  longitude: number;
  capturedAt: string;
  createdAt: string;
  score: number;
  myVote: VoteValue | null;
  isHidden: boolean;
};

// getFeed (DOMAIN §6, Q1–Q3): el muro, de la publicación más reciente a la más antigua. Los
// ocultos solo llegan al ADMIN (Q2), marcados con isHidden; el puntaje y el voto del actor se
// calculan en SQL (Q3).
export async function getFeed(db: Db, actor: Actor): Promise<FeedItem[]> {
  const rows = await db.getAllAsync<Omit<FeedItem, "isHidden">>(
    `SELECT g.id, g.authorId, u.username AS authorUsername, g.speciesId, s.commonName, s.scientificName,
      g.photoUrl, g.latitude, g.longitude, g.capturedAt, g.createdAt, ${SCORE_SQL} AS score,
      (SELECT v.value FROM votes v WHERE v.sightingId = g.id AND v.userId = ?) AS myVote
     FROM sightings g
     JOIN users u ON u.id = g.authorId
     JOIN species s ON s.id = g.speciesId
     WHERE ? = 'ADMIN' OR ${SCORE_SQL} > ?
     ORDER BY g.createdAt DESC`,
    actor.id,
    actor.role,
    HIDE_THRESHOLD,
  );

  return rows.map((row) => ({ ...row, photoUrl: resolvePhotoUrl(row.photoUrl), isHidden: isHidden(row.score) }));
}

// V5: en un avistamiento oculto no se emite, cambia ni retira un voto.
async function findVotableSighting(txn: Db, sightingId: string): Promise<{ authorId: string }> {
  const row = await txn.getFirstAsync<{ authorId: string; score: number }>(
    `SELECT g.authorId, ${SCORE_SQL} AS score FROM sightings g WHERE g.id = ?`,
    sightingId,
  );
  if (!row) throw new DomainError("SIGHTING_NOT_FOUND");
  if (isHidden(row.score)) throw new DomainError("SIGHTING_HIDDEN");
  return row;
}

// castVote (DOMAIN §6, V1–V6, SG6): crea el voto del actor sobre el avistamiento o cambia su
// valor si ya existía (V1); nunca sobre el propio (V3) ni sobre uno oculto (V5).
export async function castVote(db: Db, actor: Actor, sightingId: string, value: VoteValue): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const { authorId } = await findVotableSighting(txn, sightingId);
    if (authorId === actor.id) throw new DomainError("OWN_SIGHTING");
    await txn.runAsync(
      `INSERT INTO votes (userId, sightingId, value) VALUES (?, ?, ?)
       ON CONFLICT (userId, sightingId) DO UPDATE SET value = excluded.value`,
      actor.id,
      sightingId,
      value,
    );
  });
}

// removeVote (DOMAIN §6, V4, V5): retira el voto del actor; nunca sobre un avistamiento oculto.
export async function removeVote(db: Db, actor: Actor, sightingId: string): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await findVotableSighting(txn, sightingId);
    const { changes } = await txn.runAsync(
      "DELETE FROM votes WHERE userId = ? AND sightingId = ?",
      actor.id,
      sightingId,
    );
    if (changes === 0) throw new DomainError("VOTE_NOT_FOUND");
  });
}

// deleteSighting (DOMAIN §6, SG4, C4): solo el autor o un ADMIN. Borra los votos y la fila en la
// misma transacción y después el archivo de la foto, si existe (STACK §7). Los votos se borran a
// mano porque la conexión de txn no tiene PRAGMA foreign_keys y el ON DELETE CASCADE no corre
// (STACK §4).
export async function deleteSighting(db: Db, actor: Actor, sightingId: string): Promise<void> {
  const deleted: { photoUrl?: string } = {};
  await db.withExclusiveTransactionAsync(async (txn) => {
    const row = await txn.getFirstAsync<{ authorId: string; photoUrl: string }>(
      "SELECT authorId, photoUrl FROM sightings WHERE id = ?",
      sightingId,
    );
    if (!row) throw new DomainError("SIGHTING_NOT_FOUND");
    if (row.authorId !== actor.id && actor.role !== "ADMIN") throw new DomainError("FORBIDDEN");
    await txn.runAsync("DELETE FROM votes WHERE sightingId = ?", sightingId);
    await txn.runAsync("DELETE FROM sightings WHERE id = ?", sightingId);
    deleted.photoUrl = row.photoUrl;
  });
  if (deleted.photoUrl === undefined) return;
  const uri = resolvePhotoUrl(deleted.photoUrl);
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) await FileSystem.deleteAsync(uri);
}

export type MySightingItem = Pick<
  FeedItem,
  "id" | "speciesId" | "commonName" | "photoUrl" | "capturedAt" | "score" | "isHidden"
>;

// getMySightings (DOMAIN §6, Q4): todos los avistamientos del actor, ocultos incluidos y
// marcados con isHidden, del más reciente al más antiguo (createdAt).
export async function getMySightings(db: Db, actor: Actor): Promise<MySightingItem[]> {
  const rows = await db.getAllAsync<Omit<MySightingItem, "isHidden">>(
    `SELECT g.id, g.speciesId, s.commonName, g.photoUrl, g.capturedAt, ${SCORE_SQL} AS score
     FROM sightings g
     JOIN species s ON s.id = g.speciesId
     WHERE g.authorId = ?
     ORDER BY g.createdAt DESC`,
    actor.id,
  );
  return rows.map((row) => ({ ...row, photoUrl: resolvePhotoUrl(row.photoUrl), isHidden: isHidden(row.score) }));
}

// changeSpecies (DOMAIN §6, SG3, C1): solo el autor (tampoco el ADMIN) reemplaza speciesId. Los
// votos no se tocan y la colección se recalcula al leer (C1). Vale también para un avistamiento
// oculto (DOMAIN §4: Hidden → Hidden).
export async function changeSpecies(db: Db, actor: Actor, sightingId: string, speciesId: string): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const row = await txn.getFirstAsync<{ authorId: string }>("SELECT authorId FROM sightings WHERE id = ?", sightingId);
    if (!row) throw new DomainError("SIGHTING_NOT_FOUND");
    if (row.authorId !== actor.id) throw new DomainError("NOT_OWNER");
    const species = await txn.getFirstAsync("SELECT 1 FROM species WHERE id = ?", speciesId);
    if (!species) throw new DomainError("SPECIES_NOT_FOUND");
    await txn.runAsync("UPDATE sightings SET speciesId = ? WHERE id = ?", speciesId, sightingId);
  });
}
