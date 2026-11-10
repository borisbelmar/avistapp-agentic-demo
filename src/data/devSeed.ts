import { randomUUID } from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";

import { generateSalt, hashPassword } from "@/auth/password";

import type { Db } from "./db";
import { ensurePhotosDir, PHOTOS_DIR, resolvePhotoUrl } from "./photos";

// Fotos de prueba: bloques de color PNG de 64×48 generados sin red (regla "Sin red", AGENTS.md).
// No hay cámara real en este flujo: son datos de desarrollo, no avistamientos capturados.
const PLACEHOLDER_PHOTOS = [
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAbElEQVR4nO3RQQ0AIAwEQYzhqDIRhggeE5JNTkA7u87sr7f4BT2gCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSswXvFlFz01HQDuUe7oAAAAAElFTkSuQmCC", // terracota
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAbElEQVR4nO3RQQ0AIAwEQQTiBC/VjAgeE5JNTkA7u87sr7f4BT2gCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSswXvFlF1/pPOKezp81AAAAAElFTkSuQmCC", // musgo
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAbElEQVR4nO3RQQ0AIAwEQXyjpzqwhggeE5JNTkA7u/acr7f4BT2gCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSswXvFlF6NJdUsUotmvAAAAAElFTkSuQmCC", // cielo
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAbElEQVR4nO3RQQ0AIAwEQQQjr0pQhAgeE5JNTkA7u87sr7f4BT2gCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSugCSswXvFlF+2DWVr3weOjAAAAAElFTkSuQmCC", // trigo
];

type UserKey = "admin" | "ana" | "pedro" | "camila" | "javier";

const TEST_USERS: { key: Exclude<UserKey, "admin">; username: string; email: string }[] = [
  { key: "ana", username: "ana_aves", email: "ana@avistapp.test" },
  { key: "pedro", username: "pedro_birder", email: "pedro@avistapp.test" },
  { key: "camila", username: "camila_fotos", email: "camila@avistapp.test" },
  { key: "javier", username: "javier_sur", email: "javier@avistapp.test" },
];
const TEST_PASSWORD = "avistapp-test";

type TestVote = { voter: UserKey; value: 1 | -1 };

type TestSighting = {
  author: UserKey;
  speciesId: string;
  location: { latitude: number; longitude: number };
  minutesAgo: number;
  photo: number; // índice en PLACEHOLDER_PHOTOS
  votes: TestVote[];
};

// Variedad de especies, ubicaciones, fechas relativas (minutos, horas, días y la fecha corta a
// partir de 7 días) y puntajes: las dos publicaciones del admin quedan con +4 y −1, visibles de
// inmediato al iniciar sesión como admin (5_MVP.md §6), sin esperar los votos de la Fase 6.
const TEST_SIGHTINGS: TestSighting[] = [
  {
    author: "ana",
    speciesId: "vultur-gryphus", // Cóndor
    location: { latitude: -33.4489, longitude: -70.6693 }, // Santiago
    minutesAgo: 8,
    photo: 0,
    votes: [
      { voter: "pedro", value: 1 },
      { voter: "camila", value: 1 },
    ],
  },
  {
    author: "pedro",
    speciesId: "scelorchilus-rubecula", // Chucao
    location: { latitude: -41.4693, longitude: -72.9424 }, // Puerto Montt
    minutesAgo: 25,
    photo: 1,
    votes: [
      { voter: "ana", value: 1 },
      { voter: "javier", value: 1 },
      { voter: "camila", value: -1 },
      { voter: "admin", value: 1 },
    ],
  },
  {
    author: "camila",
    speciesId: "turdus-falcklandii", // Zorzal patagónico
    location: { latitude: -36.8269, longitude: -73.0498 }, // Concepción
    minutesAgo: 180,
    photo: 2,
    votes: [],
  },
  {
    author: "javier",
    speciesId: "theristicus-melanopis", // Bandurria
    location: { latitude: -53.1638, longitude: -70.9171 }, // Punta Arenas
    minutesAgo: 1440,
    photo: 3,
    votes: [
      { voter: "ana", value: 1 },
      { voter: "pedro", value: 1 },
    ],
  },
  {
    author: "admin",
    speciesId: "vanellus-chilensis", // Queltehue común
    location: { latitude: -33.0472, longitude: -71.6127 }, // Valparaíso
    minutesAgo: 120,
    photo: 1,
    votes: [
      { voter: "ana", value: 1 },
      { voter: "pedro", value: 1 },
      { voter: "camila", value: 1 },
      { voter: "javier", value: 1 },
    ],
  },
  {
    author: "admin",
    speciesId: "pyrope-pyrope", // Diucón
    location: { latitude: -18.4783, longitude: -70.3126 }, // Arica
    minutesAgo: 13000,
    photo: 3,
    votes: [
      { voter: "ana", value: -1 },
      { voter: "pedro", value: -1 },
      { voter: "camila", value: 1 },
    ],
  },
  {
    author: "ana",
    speciesId: "turdus-falcklandii", // Zorzal patagónico
    location: { latitude: -29.9027, longitude: -71.252 }, // La Serena
    minutesAgo: 7200,
    photo: 2,
    votes: [],
  },
];

// seedDevData: solo en desarrollo (__DEV__, nunca en una versión publicada). Borra los votos, los
// avistamientos y los usuarios de prueba (todo salvo el administrador y el catálogo) y los
// recrea con datos variados en cada inicio de la app, "como si se reiniciara todo", para probar
// el Muro sin depender de la cámara real. Las contraseñas de prueba: avistapp-test.
export async function seedDevData(db: Db): Promise<void> {
  const photosToWrite: { photoUrl: string; photo: number }[] = [];

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("DELETE FROM votes");
    await txn.runAsync("DELETE FROM sightings");
    await txn.runAsync(
      "DELETE FROM credentials WHERE userId IN (SELECT id FROM users WHERE role != 'ADMIN')",
    );
    await txn.runAsync("DELETE FROM users WHERE role != 'ADMIN'");

    const userIds = new Map<UserKey, string>();
    const admin = await txn.getFirstAsync<{ id: string }>("SELECT id FROM users WHERE role = 'ADMIN'");
    if (admin) userIds.set("admin", admin.id);

    for (const user of TEST_USERS) {
      const id = randomUUID();
      userIds.set(user.key, id);
      const salt = generateSalt();
      const hash = await hashPassword(TEST_PASSWORD, salt);
      await txn.runAsync(
        "INSERT INTO users (id, username, email, role) VALUES (?, ?, ?, 'USER')",
        id,
        user.username,
        user.email,
      );
      await txn.runAsync(
        "INSERT INTO credentials (userId, passwordHash, passwordSalt) VALUES (?, ?, ?)",
        id,
        hash,
        salt,
      );
    }

    const now = Date.now();
    for (const sighting of TEST_SIGHTINGS) {
      const authorId = userIds.get(sighting.author);
      if (!authorId) continue;

      const id = randomUUID();
      const photoUrl = `${PHOTOS_DIR}${id}.png`;
      const timestamp = new Date(now - sighting.minutesAgo * 60_000).toISOString();

      await txn.runAsync(
        `INSERT INTO sightings (id, authorId, speciesId, photoUrl, latitude, longitude, capturedAt, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        authorId,
        sighting.speciesId,
        photoUrl,
        sighting.location.latitude,
        sighting.location.longitude,
        timestamp,
        timestamp,
      );
      photosToWrite.push({ photoUrl, photo: sighting.photo });

      for (const vote of sighting.votes) {
        const voterId = userIds.get(vote.voter);
        if (!voterId) continue;
        await txn.runAsync(
          "INSERT INTO votes (userId, sightingId, value) VALUES (?, ?, ?)",
          voterId,
          id,
          vote.value,
        );
      }
    }
  });

  // La foto se escribe después de confirmar la transacción, igual que createSighting (SG1a).
  await ensurePhotosDir();
  for (const { photoUrl, photo } of photosToWrite) {
    await FileSystem.writeAsStringAsync(resolvePhotoUrl(photoUrl), PLACEHOLDER_PHOTOS[photo], {
      encoding: "base64",
    });
  }
}
