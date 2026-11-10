import { compareCommonName } from "@/components/format";
import { HIDE_THRESHOLD, SPECIES_BONUS } from "@/domain/constants";
import { DomainError } from "@/domain/errors";
import { progress as progressOf, userScore as userScoreOf } from "@/domain/rules";
import type { Actor, Role } from "@/domain/types";

import type { Db } from "./db";
import { resolvePhotoUrl } from "./photos";
import { SCORE_SQL } from "./sightings";

export type CollectionItem = { speciesId: string; commonName: string; photoUrl: string };

export type Profile = {
  username: string;
  role: Role;
  votesTotal: number;
  speciesBonus: number;
  userScore: number;
  collection: CollectionItem[];
  catalogSize: number;
  progress: number;
};

type SummaryRow = { username: string; role: Role; votesTotal: number; catalogSize: number };
type CollectionRow = { speciesId: string; commonName: string; photoUrl: string };

// getProfile (DOMAIN §6, C1–C4): username, role, userScore desglosado (votos de todos los
// avistamientos propios, ocultos incluidos, más el bonus por especie) y la colección con su
// progreso. Todo se calcula al leer (C4): no hay valores guardados.
export async function getProfile(db: Db, actor: Actor): Promise<Profile> {
  const summary = await db.getFirstAsync<SummaryRow>(
    `SELECT u.username, u.role,
      (SELECT COALESCE(SUM(v.value), 0) FROM votes v JOIN sightings g ON g.id = v.sightingId
       WHERE g.authorId = u.id) AS votesTotal,
      (SELECT COUNT(*) FROM species) AS catalogSize
     FROM users u WHERE u.id = ?`,
    actor.id,
  );
  if (!summary) throw new DomainError("UNAUTHENTICATED");

  const rows = await db.getAllAsync<CollectionRow>(
    `SELECT speciesId, commonName, photoUrl FROM (
       SELECT g.speciesId, s.commonName, g.photoUrl,
         ROW_NUMBER() OVER (PARTITION BY g.speciesId ORDER BY g.createdAt DESC) AS rowNumber
       FROM sightings g
       JOIN species s ON s.id = g.speciesId
       WHERE g.authorId = ? AND ${SCORE_SQL} > ?
     ) WHERE rowNumber = 1`,
    actor.id,
    HIDE_THRESHOLD,
  );

  const collection = rows
    .map((row) => ({ ...row, photoUrl: resolvePhotoUrl(row.photoUrl) }))
    .sort(compareCommonName);
  const speciesBonus = SPECIES_BONUS * collection.length;

  return {
    username: summary.username,
    role: summary.role,
    votesTotal: summary.votesTotal,
    speciesBonus,
    userScore: userScoreOf(summary.votesTotal, collection.length),
    collection,
    catalogSize: summary.catalogSize,
    progress: progressOf(collection.length, summary.catalogSize),
  };
}
