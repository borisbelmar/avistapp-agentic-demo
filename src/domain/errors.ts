// Textos exactos de DESIGN §8 "Errores de dominio".
export const ERROR_MESSAGES = {
  INVALID_EMAIL: "Ingresa un correo válido.",
  EMAIL_TAKEN: "Ya existe una cuenta con este correo.",
  INVALID_USERNAME: "Usa entre 3 y 20 caracteres: letras, números o _.",
  USERNAME_TAKEN: "Ese nombre de usuario ya está en uso.",
  WEAK_PASSWORD: "La contraseña debe tener al menos 8 caracteres.",
  INVALID_CREDENTIALS: "Correo o contraseña incorrectos.",
  PHOTO_REQUIRED: "Toma una foto para publicar.",
  INVALID_LOCATION: "No pudimos obtener tu ubicación. Revisa que el GPS esté activo e inténtalo de nuevo.",
  SPECIES_NOT_FOUND: "Elige una especie de la lista.",
  SIGHTING_NOT_FOUND: "Esta publicación ya no existe.",
  NOT_OWNER: "No tienes permiso para hacer esto.",
  FORBIDDEN: "No tienes permiso para hacer esto.",
  OWN_SIGHTING: "No puedes votar tu propia publicación.",
  SIGHTING_HIDDEN: "La comunidad ocultó esta publicación.",
  VOTE_NOT_FOUND: "No habías votado esta publicación.",
  UNAUTHENTICATED: "Tu sesión terminó. Inicia sesión de nuevo.",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export const UNKNOWN_ERROR_MESSAGE = "Algo salió mal. Inténtalo de nuevo.";

export class DomainError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.code = code;
    this.name = "DomainError";
  }
}

// Registra con console.error todo error que no sea DomainError (STACK §6): un DomainError
// es esperado (error del usuario); cualquier otra cosa es una falla que hay que poder diagnosticar.
export function errorMessage(error: unknown): string {
  if (error instanceof DomainError) return error.message;
  console.error(error);
  return UNKNOWN_ERROR_MESSAGE;
}
