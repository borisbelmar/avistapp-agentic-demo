import { normalizeForSearch } from "@/components/format";
import { HIDE_THRESHOLD } from "@/domain/constants";
import type { Actor, Species } from "@/domain/types";

import type { Db } from "./db";
import { SCORE_SQL } from "./sightings";

export type SpeciesListItem = Species & { inCollection: boolean };

type Row = Species & { inCollection: 0 | 1 };

// listSpecies (DOMAIN §6): catálogo marcando las especies ya en la colección visible del actor (C1).
// inCollection se calcula en SQL en cada lectura; no se guarda.
export async function listSpecies(db: Db, actor: Actor): Promise<SpeciesListItem[]> {
  const rows = await db.getAllAsync<Row>(
    `SELECT s.id, s.commonName, s.scientificName,
      EXISTS (
        SELECT 1 FROM sightings g
        WHERE g.speciesId = s.id AND g.authorId = ?
          AND ${SCORE_SQL} > ?
      ) AS inCollection
    FROM species s`,
    actor.id,
    HIDE_THRESHOLD,
  );

  // El orden binario de SQLite deja "Águila" después de "Zorzal": se ordena en TypeScript.
  return rows
    .map((row) => ({ ...row, inCollection: row.inCollection === 1 }))
    .sort((a, b) => {
      const an = normalizeForSearch(a.commonName);
      const bn = normalizeForSearch(b.commonName);
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
}
