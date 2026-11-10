// Mock de expo-file-system/legacy: sistema de archivos en memoria para las pruebas
// (STACK §9). Jest lo aplica automáticamente, sin jest.mock. Las fallas de escritura se
// simulan con jest.spyOn(FileSystem, "writeAsStringAsync").mockRejectedValueOnce(new Error(...)).

const entries = new Set<string>();

export const documentDirectory = "file:///document/";

export async function getInfoAsync(fileUri: string): Promise<{ exists: boolean; uri: string }> {
  return { exists: entries.has(fileUri), uri: fileUri };
}

export async function makeDirectoryAsync(
  fileUri: string,
  options?: { intermediates?: boolean },
): Promise<void> {
  entries.add(fileUri);
}

export async function writeAsStringAsync(
  fileUri: string,
  contents: string,
  options?: { encoding?: string },
): Promise<void> {
  entries.add(fileUri);
}

export async function deleteAsync(fileUri: string, options?: { idempotent?: boolean }): Promise<void> {
  entries.delete(fileUri);
}
