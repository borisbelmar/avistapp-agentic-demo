import { z } from "zod";

import { ERROR_MESSAGES } from "./errors";

const username = z.string().regex(/^[A-Za-z0-9_]{3,20}$/, ERROR_MESSAGES.INVALID_USERNAME);
const email = z.email(ERROR_MESSAGES.INVALID_EMAIL);
const password = z.string().min(8, ERROR_MESSAGES.WEAK_PASSWORD);

export const registerSchema = z.object({ username, email, password });

export const loginSchema = z.object({ email, password: z.string().min(1, "Ingresa tu contraseña.") });

const coordinate = (limit: number) =>
  z
    .number({ error: ERROR_MESSAGES.INVALID_LOCATION })
    .min(-limit, ERROR_MESSAGES.INVALID_LOCATION)
    .max(limit, ERROR_MESSAGES.INVALID_LOCATION);

export const locationSchema = z.object({
  latitude: coordinate(90),
  longitude: coordinate(180),
});

export const createSightingSchema = z.object({
  photoBase64: z.string().min(1, ERROR_MESSAGES.PHOTO_REQUIRED),
  location: locationSchema,
  speciesId: z.string().min(1, ERROR_MESSAGES.SPECIES_NOT_FOUND),
  capturedAt: z.iso.datetime(),
});
