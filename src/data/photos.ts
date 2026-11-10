import * as FileSystem from "expo-file-system/legacy";

export const PHOTOS_DIR = "photos/";

// photoUrl se guarda relativo (STACK §7): en iOS la ruta absoluta de documentDirectory puede
// cambiar entre actualizaciones de la app.
export function resolvePhotoUrl(photoUrl: string): string {
  return `${FileSystem.documentDirectory}${photoUrl}`;
}

export async function ensurePhotosDir(): Promise<void> {
  const dir = resolvePhotoUrl(PHOTOS_DIR);
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}
