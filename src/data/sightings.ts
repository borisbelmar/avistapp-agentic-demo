import { randomUUID } from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import type { z } from "zod";

import { HIDE_THRESHOLD } from "@/domain/constants";
import { DomainError, type ErrorCode } from "@/domain/errors";
import { createSightingSchema } from "@/domain/schemas";
import type { Actor } from "@/domain/types";

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
};

// getFeed (DOMAIN §6, Q1): el muro, de la publicación más reciente a la más antigua.
// Q2 (ocultos para ADMIN) y Q3 (voto del actor) llegan en la Fase 6; actor ya está en la firma
// del caso de uso, sin uso todavía.
export async function getFeed(db: Db, actor: Actor): Promise<FeedItem[]> {
  const rows = await db.getAllAsync<FeedItem>(
    `SELECT g.id, g.authorId, u.username AS authorUsername, g.speciesId, s.commonName, s.scientificName,
      g.photoUrl, g.latitude, g.longitude, g.capturedAt, g.createdAt, ${SCORE_SQL} AS score
     FROM sightings g
     JOIN users u ON u.id = g.authorId
     JOIN species s ON s.id = g.speciesId
     WHERE ${SCORE_SQL} > ?
     ORDER BY g.createdAt DESC`,
    HIDE_THRESHOLD,
  );

  return rows.map((row) => ({ ...row, photoUrl: resolvePhotoUrl(row.photoUrl) }));
}
