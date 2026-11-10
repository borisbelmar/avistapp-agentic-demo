// setupFilesAfterEnv (package.json): corre después de los setupFiles del preset jest-expo.
// jest-expo mockea "expo-file-system/legacy" con un objeto fijo en su propio setupFile
// (getInfoAsync siempre exists: true, sin documentDirectory), que se registra antes que este
// archivo y oculta por completo nuestro manual mock de __mocks__/. Se vuelve a mockear aquí,
// después, para que el sistema de archivos en memoria real de __mocks__/expo-file-system/legacy.ts
// tome efecto (STACK §9).
jest.mock("expo-file-system/legacy", () => jest.requireActual("./__mocks__/expo-file-system/legacy"));
