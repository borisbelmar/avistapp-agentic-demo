import type { Location } from "@/domain/types";

// Sin Intl ni toLocale*: Hermes no garantiza datos de locale (STACK §6).
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

function shortDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// DESIGN §7.2: "+12", "0", "−3" (signo menos U+2212, no el guion ASCII).
export function formatScore(score: number): string {
  if (score > 0) return `+${score}`;
  if (score < 0) return `\u2212${Math.abs(score)}`;
  return "0";
}

// DESIGN §7.2/§7.4: 4 decimales, guion ASCII.
export function formatCoords({ latitude, longitude }: Location): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

// DESIGN §7.2: relativo bajo 7 días, luego fecha corta.
export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const seconds = Math.floor((now.getTime() - Date.parse(iso)) / 1000);
  if (seconds < 60) return "ahora"; // también cubre fechas futuras por desfase de reloj.

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;

  return shortDate(new Date(iso));
}

// DESIGN §7.4: fecha corta + hora 24 h con ceros, p. ej. "2 nov 2026, 14:32".
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${shortDate(date)}, ${hours}:${minutes}`;
}

// Búsqueda sin distinguir mayúsculas ni tildes (DESIGN §7.5).
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Orden por nombre común sin distinguir tildes ni mayúsculas: el orden binario de SQLite deja
// "Águila" después de "Zorzal".
export function compareCommonName(a: { commonName: string }, b: { commonName: string }): number {
  const an = normalizeForSearch(a.commonName);
  const bn = normalizeForSearch(b.commonName);
  return an < bn ? -1 : an > bn ? 1 : 0;
}
