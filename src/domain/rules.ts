import { HIDE_THRESHOLD, SPECIES_BONUS } from "./constants";

// SG6: un avistamiento está oculto cuando su puntaje llega al umbral.
export function isHidden(score: number): boolean {
  return score <= HIDE_THRESHOLD;
}

// C3: puntaje del usuario = suma de votos de sus avistamientos + bonus por especie en la colección.
export function userScore(votesTotal: number, collectionSize: number): number {
  return votesTotal + SPECIES_BONUS * collectionSize;
}

// C2: progreso de la colección respecto del catálogo completo.
export function progress(collectionSize: number, catalogSize: number): number {
  return catalogSize === 0 ? 0 : collectionSize / catalogSize;
}
