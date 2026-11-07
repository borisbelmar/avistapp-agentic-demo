# AvistApp — Stack técnico

Fuentes: [`1_BRIEF.md`](1_BRIEF.md), [`2_DOMAIN.md`](2_DOMAIN.md). Los nombres de código (carpetas, tablas, columnas, funciones) están en inglés, igual que el dominio.

## 1. Resumen

| Necesidad | Tecnología | Paquetes |
|---|---|---|
| Framework | React Native con Expo (flujo administrado) | `expo` |
| Lenguaje | TypeScript en modo `strict` | `typescript` |
| Navegación | Expo Router (rutas por archivos) | `expo-router` |
| UI | NativeWind v4 sobre Tailwind CSS 3.4 | `nativewind`, `tailwindcss`, `react-native-reanimated`, `react-native-safe-area-context` |
| Formularios | React Hook Form | `react-hook-form`, `@hookform/resolvers` |
| Validación | Zod | `zod` |
| Persistencia | SQLite del dispositivo | `expo-sqlite` |
| Sesión | Almacenamiento seguro del dispositivo | `expo-secure-store` |
| Cámara | Cámara del dispositivo | `expo-camera` |
| Ubicación | GPS del dispositivo | `expo-location` |
| Archivos de fotos | Sistema de archivos de la app (API `legacy`) | `expo-file-system` (importado como `expo-file-system/legacy`) |
| IDs y hash | Utilidades criptográficas | `expo-crypto` |
| Íconos | Incluidos en Expo | `@expo/vector-icons` |
| Tipografías | Fraunces y Figtree, empaquetadas en la app | `@expo-google-fonts/fraunces`, `@expo-google-fonts/figtree`, `expo-font` |
| Pruebas | Jest; SQLite en memoria para la capa de datos | `jest`, `jest-expo`, `@types/jest`, `better-sqlite3` |

- Versión de referencia: **Expo SDK 58** (`expo ~58.0.22`, React Native 0.88, React 19). Las dependencias se instalan con `npx expo install`, que elige versiones compatibles con la SDK; las versiones exactas quedan fijadas en `package.json`. Si se recrea el proyecto con una SDK más nueva, revisar contra su *changelog* las notas de §7, §10 y §11, que dependen de comportamientos de la SDK 58.
- NativeWind v5 (Tailwind 4) sigue en *preview*; se usa v4, que es la versión estable.
- Todos los paquetes funcionan en Expo Go: no se necesita *development build* en la etapa 1. La aceptación de cámara y GPS se hace en dispositivos físicos (§11).

## 2. Etapa 1: todo en el dispositivo

En esta etapa no hay backend ni APIs externas. Toda la información vive en el dispositivo.

Consecuencias:
- La "comunidad" son los usuarios registrados en el mismo dispositivo. Para probar votos se cierra sesión y se entra con otra cuenta.
- Desinstalar la app borra todos los datos.
- La app funciona sin conexión a internet.
- No hay mapas embebidos ni conversión de coordenadas a dirección, porque ambos requieren servicios externos. La ubicación se muestra como coordenadas.
- No hay servidor: `createdAt` (SG7) lo asigna la capa de datos local con el reloj del dispositivo.

Cuando exista backend (etapa 2), se reemplazan `src/data` y `src/auth`. `src/domain` y las pantallas no deberían cambiar.

## 3. Estructura del proyecto

```
app/                  Rutas y pantallas (Expo Router)
src/
  domain/             Tipos, constantes, esquemas zod, errores y reglas puras. Sin dependencias de React Native.
  data/               Conexión SQLite, migraciones, seed y funciones por caso de uso
    db.ts             Interfaz `Db`: el subconjunto de `SQLiteDatabase` que usa el proyecto
    testing/testDb.ts Implementación de `Db` sobre better-sqlite3 para las pruebas
  auth/               Registro, login, hash de contraseñas y sesión
  components/         Componentes de UI reutilizables y formateo de textos (fechas, coordenadas, puntaje)
  theme/colors.js     Paleta de colores, compartida con tailwind.config.js
assets/
  species.json        Catálogo de especies para el seed
__mocks__/            Manual mocks de Jest para módulos nativos (en la raíz, junto a node_modules)
  expo-crypto.ts
  expo-secure-store.ts
  expo-file-system/legacy.ts   El mock de un subpath va en una carpeta con el nombre del paquete
global.css            Directivas de Tailwind
```

Reglas de dependencia:
- `src/domain` no importa nada del resto del proyecto.
- Las pantallas en `app/` llaman a funciones de `src/data` y `src/auth`; nunca escriben SQL.
- Cada caso de uso de `2_DOMAIN.md` §6 es una función exportada con el mismo nombre (`createSighting`, `castVote`, …). Recibe la base como primer parámetro, tipada con la interfaz `Db` de `src/data/db.ts` (la base real de `useSQLiteContext()` la cumple), lo que permite probarla contra otra base SQLite. Los casos de uso que requieren sesión reciben como segundo parámetro al usuario actual (`actor: Pick<User, "id" | "role">`).

## 4. Persistencia (SQLite)

- Una base `avistapp.db`, abierta con `SQLiteProvider` en el layout raíz. Su `onInit` ejecuta `PRAGMA foreign_keys = ON` y aplica las migraciones pendientes.
- Las migraciones son un arreglo ordenado de funciones `async (db) => { … }` en `src/data/migrations.ts`; cada una corre dentro de una transacción. La versión aplicada se guarda en `PRAGMA user_version`. La migración 1 crea las tablas y carga el seed (`src/data/seed.ts`: catálogo desde `assets/species.json` y usuario administrador).
- Las columnas usan camelCase, igual que el dominio, para no necesitar una capa de mapeo. La única excepción es `Location`, que se guarda en dos columnas (`latitude`, `longitude`).
- IDs: `randomUUID()` de `expo-crypto`, salvo `species.id`, que es un *slug* estable del nombre científico (`vultur-gryphus`). Fechas: texto ISO 8601 en UTC.
- `VoteValue` se guarda como entero: `UP = 1`, `DOWN = -1`.
- Los valores derivados (`score`, `isHidden`, `collection`, `userScore`) se calculan con SQL en cada lectura, pasando `HIDE_THRESHOLD` y `SPECIES_BONUS` desde `src/domain` como parámetros. No se guardan.
- Las escrituras que verifican una regla antes de escribir (por ejemplo `castVote`: existe, no está oculto, no es propio) se ejecutan dentro de `withExclusiveTransactionAsync`.

### Esquema

```sql
CREATE TABLE users (
  id       TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email    TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role     TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN'))
);

CREATE TABLE credentials (
  userId       TEXT PRIMARY KEY REFERENCES users(id),
  passwordHash TEXT NOT NULL,
  passwordSalt TEXT NOT NULL
);

CREATE TABLE species (
  id             TEXT PRIMARY KEY,
  commonName     TEXT NOT NULL,
  scientificName TEXT NOT NULL UNIQUE
);

CREATE TABLE sightings (
  id         TEXT PRIMARY KEY,
  authorId   TEXT NOT NULL REFERENCES users(id),
  speciesId  TEXT NOT NULL REFERENCES species(id),
  photoUrl   TEXT NOT NULL,
  latitude   REAL NOT NULL,
  longitude  REAL NOT NULL,
  capturedAt TEXT NOT NULL,
  createdAt  TEXT NOT NULL
);

CREATE TABLE votes (
  userId     TEXT NOT NULL REFERENCES users(id),
  sightingId TEXT NOT NULL REFERENCES sightings(id) ON DELETE CASCADE,
  value      INTEGER NOT NULL CHECK (value IN (1, -1)),
  PRIMARY KEY (userId, sightingId)
);
```

- La base protege la integridad: unicidad (U1, U2, S2, V1), valores permitidos (`role`, V2), referencias y borrado en cascada de votos (SG4). El formato de los datos lo valida zod (§6).
- `credentials` está separada de `users` para que las contraseñas nunca lleguen a un objeto `User`. Solo `src/auth` la lee.

## 5. Autenticación local

- **Registro:** valida con zod (U1–U3) y crea `users` y `credentials` en una sola transacción. Si el correo o el nombre de usuario ya existen, devuelve `EMAIL_TAKEN` o `USERNAME_TAKEN`.
- **Contraseñas:** se guarda SHA-256 de `salt + password` con un *salt* aleatorio de 16 bytes (`expo-crypto`). Es aceptable solo porque los datos no salen del dispositivo; en la etapa 2 la autenticación pasa al backend.
- **Sesión:** el `id` del usuario activo se guarda en `expo-secure-store` y se restaura al abrir la app. `logout` lo borra. Al restaurar, se verifica que el usuario exista en la base; si no, se borra la sesión. En iOS el llavero (*Keychain*) sobrevive a la desinstalación, así que después de reinstalar puede quedar un `id` de una base que ya no existe.
- **Administrador:** la migración 1 crea un usuario `ADMIN` con credenciales de desarrollo definidas en `src/data/seed.ts`. Así se cumple U4 (el rol se asigna fuera de la app). Esas credenciales no deben llegar a una versión publicada.

## 6. Validación, formularios y errores

- Los esquemas zod viven en `src/domain/schemas.ts` y son la única fuente de las reglas de formato (U1–U3, SG1, SG2). Los mensajes de error están en español.
- Los formularios (registro, login) usan React Hook Form con `zodResolver`.
- Las funciones de `src/data` y `src/auth` validan su entrada con el mismo esquema, para no depender de que la pantalla lo haya hecho.
- Las reglas que dependen del estado (V3, V5, SG3, SG4) se verifican en `src/data`. Si fallan, se lanza un `DomainError` con el código de error de `2_DOMAIN.md` §6. La pantalla traduce ese código a un mensaje en español con `errorMessage(error)`.
- **`errorMessage` registra con `console.error` todo error que no sea `DomainError`** antes de devolver "Algo salió mal. Inténtalo de nuevo.". Ese mensaje genérico oculta la causa; sin el registro, una falla nativa en el dispositivo no se puede diagnosticar. Los `DomainError` no se registran: son errores esperados del usuario y en desarrollo cada `console.error` abre un aviso rojo. Las pantallas que muestran textos propios en vez de `errorMessage` (la cámara) registran el error ellas mismas.
- Toda llamada a un módulo nativo que devuelve una `Promise` se espera con `await` dentro del `try`. Algunos ejemplos de la documentación de Expo se ven síncronos aunque la función sea asíncrona; una promesa sin `await` que falla termina como `Uncaught (in promise)` y no la atrapa ningún `try/catch`.

## 7. Fotos y ubicación

- **Captura** (`app/capture.tsx`): `CameraView` de `expo-camera`. El disparador queda deshabilitado (con indicador) hasta que llega `onCameraReady`; la documentación de `expo-camera` pide esperarlo antes de llamar a `takePictureAsync`. `onMountError` se registra con `console.error` y muestra el texto de `4_DESIGN.md` §8.
- Al disparar se piden en paralelo, con `Promise.allSettled` (no `Promise.all` ni un único `catch`), `takePictureAsync({ quality: 0.7, base64: true })` y `getCurrentPositionAsync({ accuracy: Location.Accuracy.High })`. Cada rechazo se registra y muestra **su propio** mensaje (cámara o ubicación); con un solo `catch`, una falla de cámara se mostraba como error de GPS. Si no hay ubicación, no se puede publicar (SG1).
- **Traspaso a Nuevo avistamiento:** la foto viaja como base64 en los parámetros de navegación (`photoBase64`); latitud y longitud como texto (`String(...)`, y `Number(...)` al leerlas). Nunca se pasa ni se reconstruye un URI `file://`: en Android, `expo-file-system` rechaza con `Missing 'READ' permission` operaciones sobre un `File` creado desde un URI que cruzó `router.push`/`useLocalSearchParams`, incluso si el archivo lo escribió la propia app. `publish.tsx` muestra la vista previa como `data:image/jpeg;base64,…`.
- **Persistencia** (`createSighting`, SG1a): (1) valida y verifica reglas; (2) asegura la carpeta `documentDirectory + "photos/"` (`getInfoAsync` y, si no existe, `makeDirectoryAsync(…, { intermediates: true })`); (3) inserta la fila con `photoUrl = "photos/<id>.jpg"`; (4) escribe la foto con `writeAsStringAsync(uri, photoBase64, { encoding: "base64" })`; (5) si la escritura falla, borra la fila y relanza el error. Nunca se mueve ni se borra la foto de origen antes de confirmar la escritura: si un paso falla, el usuario puede reintentar con la misma foto.
- Se usa solo `expo-file-system/legacy` (`documentDirectory`, `getInfoAsync`, `makeDirectoryAsync`, `writeAsStringAsync`, `deleteAsync`). La API de clases de `expo-file-system` (`File`, `Directory`, `Paths`) **no se usa**: en el emulador de Android sus métodos `move`, `copy` y `write` rechazaron con `Missing 'READ' permission`, porque su verificación de tipo exige permiso de lectura en toda operación.
- `photoUrl` se guarda como ruta relativa (`photos/<id>.jpg`) y `src/data/photos.ts` (`resolvePhotoUrl`) la resuelve a `documentDirectory + photoUrl` al leer. En iOS la ruta absoluta del directorio de documentos puede cambiar entre actualizaciones de la app.
- Al eliminar un avistamiento se borra primero la fila (los votos caen en cascada) y luego el archivo, si existe (`getInfoAsync` + `deleteAsync`).
- Los textos de los permisos de cámara y ubicación se declaran en español en los *config plugins* de `app.json` (`expo-camera` → `cameraPermission`, `expo-location` → `locationWhenInUsePermission`).

## 8. UI

- Estilos con `className` de NativeWind. `tailwind.config.js` incluye `app/**` y `src/**` en `content` y define los colores y tipografías que fije `4_DESIGN.md`.
- Componentes propios en `src/components`; no se usa una librería de componentes.
- Las fuentes se cargan con `useFonts` en el layout raíz; la pantalla de inicio (`expo-splash-screen`) se mantiene visible hasta que terminan de cargar y se restaura la sesión.
- **Áreas seguras:** todas las pantallas usan `headerShown: false`, así que cada una resuelve su margen superior. Las pantallas de pestañas envuelven su contenido en `SafeAreaView` de `react-native-safe-area-context` con `edges={["top"]}` (el borde inferior lo maneja la barra de pestañas). Las pantallas apiladas con fila de encabezado propia (Nuevo avistamiento, Mis publicaciones) usan `pt-14` en esa fila. La cámara va de borde a borde y su botón cerrar usa `top-14`. No se usa el `SafeAreaView` de `react-native`.
- **Proporciones:** NativeWind traduce `aspect-[N/M]` con N≠M a un `aspectRatio` de texto (`"4 / 3"`) que Yoga ignora, y la imagen queda con alto 0. Se usa `style={{ aspectRatio: 4 / 3 }}`; `aspect-square` sí funciona.
- **Fuentes:** en React Native cada peso es una familia distinta: una clase por peso (`font-display`, `font-sans-semibold`, `font-scientific`), sin combinar con `font-bold`/`font-semibold`.
- **Colores en props:** ningún componente escribe hexadecimales. Si un prop necesita el color directo (íconos, `ActivityIndicator`, barra de pestañas), se importa `src/theme/colors.js`, que debe incluir todos los tokens que el código usa (también `white`).

## 9. Calidad

- TypeScript en modo `strict` (valor por defecto de la plantilla de Expo).
- ESLint con la configuración de Expo: `npx expo lint`.
- Pruebas con Jest y el preset `jest-expo` (`npm test`):
  - `src/domain`: funciones puras y esquemas zod.
  - `src/data` y `src/auth`: las reglas que viven en SQL se prueban contra SQLite en memoria con `better-sqlite3`. Un adaptador de prueba en `src/data/testing/` implementa la interfaz `Db` (`execAsync`, `runAsync`, `getFirstAsync`, `getAllAsync`, `withExclusiveTransactionAsync`) y aplica las mismas migraciones. Los módulos nativos (`expo-file-system/legacy`, `expo-secure-store`, `expo-crypto`) se reemplazan con *manual mocks* en `__mocks__/` (en la raíz), que Jest aplica automáticamente sin `jest.mock`.
  - Los caminos de falla de un módulo nativo se prueban espiando el mock: `jest.spyOn(FileSystem, "writeAsStringAsync").mockRejectedValueOnce(...)` (así se prueba SG1a).
- Cámara, GPS, permisos, fuentes, navegación y aspecto visual se verifican a mano en dispositivos físicos (§11), con los criterios de aceptación de `5_MVP.md`.
- En shells no interactivos (agentes, CI), ejecutar los comandos con la entrada estándar cerrada; la primera ejecución de `npx expo lint` puede tardar mientras se crea la caché de ESLint.

## 10. Navegación

- Expo Router con rutas por archivos. El layout raíz (`app/_layout.tsx`) anida `SQLiteProvider` → `SessionProvider` → un `Stack` con `headerShown: false` y dos `Stack.Protected`: sin sesión, `(auth)`; con sesión, el resto.
- **Cada pantalla del `Stack` autenticado declara `presentation` de forma explícita.** Una pantalla que se abre encima de un modal también es modal:

| Ruta | `presentation` | Se abre desde |
|---|---|---|
| `(tabs)` | `card` | Raíz con sesión |
| `capture` | `fullScreenModal` | Pestaña Capturar, estados vacíos |
| `publish` | `fullScreenModal` | `capture` (encima del modal) |
| `my-sightings` | `card` | Perfil |

- Si una pantalla sin `presentation` queda junto a un modal, Expo Router advierte `Route "X" has no presentation option, so it is shown as a modal because a modal screen is below it`. Si `publish` fuera `card`, la advertencia es `Route "publish" uses presentation "card" above a modal screen, so it is pushed behind the modal…` y la pantalla queda **invisible** detrás de la cámara.
- Salir del flujo modal al publicar: `router.dismissTo({ pathname: "/(tabs)", params })`, que cierra `capture` y `publish` y vuelve a la instancia existente de las pestañas con los nuevos parámetros. `router.replace("/(tabs)")` deja la cámara abierta encima (el usuario "vuelve a la cámara" después de publicar).
- "Repetir foto", "Volver" y "Cerrar cámara" usan `router.back()`. Login y registro usan `router.replace("/")` al terminar.
- La pestaña Capturar no tiene contenido (`(tabs)/new.tsx` devuelve `null`): su `tabPress` llama a `event.preventDefault()` y `router.push("/capture")`.
- Los parámetros de ruta (`useLocalSearchParams`) son siempre texto.

## 11. Entornos de prueba y advertencias conocidas

| Entorno | Cámara | Ubicación | Sirve para |
|---|---|---|---|
| Expo Go en Android físico | Real | Real | Aceptación |
| Expo Go en iPhone físico | Real | Real | Aceptación |
| Emulador de Android | `expo-camera` detecta el emulador y entrega una foto sintética (negra, con la fecha en amarillo) | Fija; se cambia en *Extended controls → Location* | Desarrollo del flujo completo; la foto negra es esperada |
| Simulador de iOS | No tiene cámara: `takePictureAsync` falla | Simulada (*Features → Location*) | Pantallas sin cámara |

- Expo Go de las tiendas solo abre proyectos de la SDK más reciente.
- `ImageBackground is deprecated…` aparece en la terminal y viene de una dependencia, no del código del proyecto: se puede ignorar.
- Las advertencias de `presentation` de Expo Router (§10) **no** se ignoran: indican pantallas que pueden quedar ocultas.
