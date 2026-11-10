# AGENTS.md — AvistApp

App móvil Expo (SDK 58) para registrar avistamientos de aves de Chile: foto de la cámara + GPS + especie del catálogo, votos de la comunidad y colección por usuario. **Etapa 1:** sin backend; todo vive en el dispositivo (SQLite).

## Documentos: la fuente de verdad

Los documentos de `docs/` mandan sobre el código. Léelos antes de cambiar algo en su área.

| Documento | Úsalo para |
|---|---|
| `docs/1_BRIEF.md` | Alcance del producto, lo que está fuera de alcance (§7) y los criterios de éxito |
| `docs/2_DOMAIN.md` | Nombres del dominio, reglas (U*, S*, SG*, V*, C*, Q*), casos de uso y códigos de error |
| `docs/3_STACK.md` | Paquetes, estructura, esquema SQL, auth, fotos, navegación y advertencias conocidas |
| `docs/4_DESIGN.md` | Colores, tipografía, pantallas, **textos de la interfaz** (§8) y accesibilidad |
| `docs/5_MVP.md` | Fases, criterios de aceptación y estado de avance (§3) |

Referencias como **SG6** o **DESIGN §7.2** apuntan a reglas y secciones de esos documentos.

## Flujo de trabajo

El trabajo se hace por fases (`docs/5_MVP.md` §2), **de a una y en orden**:

1. Lee la fase completa, sus secciones de "Lee antes" y el estado actual del repositorio. Marca la fase "En curso" en `5_MVP.md` §3.
2. **Propón un plan y espera la aprobación antes de escribir código:** pasos, archivos que se crean o modifican, la prueba de cada criterio **[auto]** y las dudas que los documentos no resuelven.
3. Implementa **solo el alcance de la fase**. Si hace falta algo de una fase posterior, implementa lo mínimo y avísalo.
4. Verifica con la definición de terminado (ver Verificación).
5. Entrega el informe de `5_MVP.md` §2 (paso 5) y marca la fase "En revisión". **Solo una persona marca "Aprobada".**

**Las decisiones de producto no se inventan: se preguntan.** Si una regla o decisión de los documentos debe cambiar, detente y pregunta. Si se aprueba el cambio, actualiza el documento en el mismo cambio que el código.

## Comandos

```bash
npx expo start                 # servidor Metro para Expo Go
npx tsc --noEmit               # tipos
npx expo lint                  # ESLint (configuración de Expo)
npm test                       # Jest (preset jest-expo)
npx expo-doctor                # compatibilidad con la SDK
npx expo install <paquete>     # paquetes de Expo / React Native
npx expo install <paquete> -- --save-dev   # dependencias de desarrollo de Expo
npm install --save-dev <paquete>           # solo herramientas de Node que no van en la app (better-sqlite3 y sus tipos)
```

- Paquetes de Expo o React Native **siempre** con `npx expo install`, nunca con `npm install`.
- Tailwind con versión explícita: `tailwindcss@^3.4.19`. Sin versión se instala Tailwind 4, que no funciona con NativeWind v4.
- En shells no interactivos (agentes, CI), ejecuta los comandos con la entrada estándar cerrada (`< /dev/null`). La primera ejecución de `npx expo lint` tarda mientras crea la caché.

## Arquitectura

```
app/                  Rutas y pantallas (Expo Router)
src/domain/           Tipos, constantes, esquemas zod, errores y reglas puras
src/data/             SQLite: db.ts (interfaz Db), migraciones, seed, photos.ts y casos de uso
src/data/testing/     testDb.ts: Db sobre better-sqlite3 para las pruebas
src/auth/             Registro, login, hash de contraseñas y sesión
src/components/       Componentes de UI y format.ts (fechas, coordenadas, puntaje, búsqueda)
src/theme/colors.js   Paleta única, compartida con tailwind.config.js
assets/species.json   Catálogo para el seed
__mocks__/            Manual mocks de módulos nativos (en la raíz)
```

- `src/domain` no importa nada del resto del proyecto ni de React Native.
- Las pantallas de `app/` llaman a funciones de `src/data` y `src/auth`; **nunca escriben SQL**.
- Cada caso de uso de DOMAIN §6 es una función exportada con el mismo nombre: `castVote(db, actor, …)`. Primer parámetro `db: Db`; si requiere sesión, segundo parámetro `actor: Pick<User, "id" | "role">`.
- Las reglas que dependen del estado (V3, V5, SG3, SG4) se verifican en `src/data` y lanzan `DomainError` con el código de DOMAIN §6. Las pantallas lo muestran con `errorMessage(error)`.
- Los esquemas zod de `src/domain/schemas.ts` son la única fuente de las reglas de formato. Las funciones de `src/data` y `src/auth` también validan su entrada con ellos.
- Alias de importación: `@/*` → `./src/*`.

## Convenciones

- **Idioma:** nombres de código en inglés (los términos de DOMAIN, tal cual); textos de la interfaz en español; comentarios y documentos en español.
- **SQLite:** columnas en camelCase; fechas en texto ISO 8601 UTC; ids con `randomUUID()` de `expo-crypto`, salvo `species.id`, que es el *slug* del nombre científico. `VoteValue` se guarda como `1` / `-1`.
- Las escrituras que verifican una regla antes de escribir van dentro de `withExclusiveTransactionAsync`.
- Estilos con `className` de NativeWind; componentes propios en `src/components`, sin librería de componentes. Íconos: solo Ionicons.

## Reglas que no se pueden romper

1. **Textos de la interfaz en español, tal como están en DESIGN §8** (errores, fallas del sistema, confirmaciones, permisos). No se inventan textos nuevos sin preguntar.
2. **Ningún color hexadecimal en componentes.** Clases de Tailwind con los tokens de DESIGN §2; si un prop necesita el color directo, importa `src/theme/colors.js`. `primary-500` nunca se usa para texto.
3. **Los valores derivados nunca se guardan:** `score`, `isHidden`, colección y `userScore` se calculan con SQL en cada lectura, con `HIDE_THRESHOLD` y `SPECIES_BONUS` de `src/domain` como parámetros.
4. **Sin red:** ni backend, ni APIs externas, ni mapas, ni geocodificación, ni fuentes remotas.
5. **Foto solo de la cámara y ubicación solo del GPS** al momento de capturar. Nada de galería, ubicación manual ni metadatos EXIF.
6. La tabla `credentials` solo la lee `src/auth`; ningún objeto `User` lleva datos de contraseña.
7. Nada de lo listado en `1_BRIEF.md` §7 (fuera de alcance) se implementa.

## Trampas conocidas

Cada una costó un error real. El detalle está en la sección indicada.

- **Archivos:** usa solo `expo-file-system/legacy`. La API de clases (`File`, `Directory`, `Paths`) rechaza con `Missing 'READ' permission` en Android (STACK §7).
- **Foto entre pantallas:** viaja como base64 (`photoBase64`) en los parámetros de navegación. Nunca pases ni reconstruyas un URI `file://` (STACK §7).
- **Cámara + GPS:** `Promise.allSettled`, con un mensaje propio para cada falla. Con un único `catch`, una falla de cámara se muestra como error de GPS (STACK §7).
- **Promesas nativas:** siempre con `await` dentro del `try`; si no, terminan en `Uncaught (in promise)` (STACK §6).
- **`errorMessage`** registra con `console.error` todo error que no sea `DomainError`. La cámara, que usa textos propios, registra el error ella misma (STACK §6).
- **SG1a:** `createSighting` inserta la fila, luego escribe la foto y, si la escritura falla, borra la fila y relanza el error. La foto de origen no se toca hasta confirmar (STACK §7).
- **Transacciones:** `withExclusiveTransactionAsync` abre otra conexión sin `PRAGMA foreign_keys`: dentro de `txn` no corre `ON DELETE CASCADE`; borra los hijos a mano (STACK §4).
- **Navegación:** cada `Stack.Screen` con sesión declara `presentation`. `capture` y `publish` son `fullScreenModal`; una pantalla `card` encima de un modal queda invisible. Para salir del flujo al publicar, usa `router.dismissTo({ pathname: "/(tabs)", params })`, no `router.replace` (STACK §10).
- **Proporciones:** `aspect-[4/3]` deja la imagen con alto 0; usa `style={{ aspectRatio: 4 / 3 }}`. `aspect-square` sí funciona (STACK §8).
- **Fuentes:** una clase por peso (`font-display`, `font-sans-semibold`, `font-scientific`); no las combines con `font-bold`/`font-semibold` (STACK §8).
- **Área segura:** `SafeAreaView` de `react-native-safe-area-context` con `edges={["top"]}` en las pestañas; `pt-14` en los encabezados propios. Nunca uses el `SafeAreaView` de `react-native` (STACK §8).
- **Orden de especies:** ordena en TypeScript con `normalizeForSearch`; el orden binario de SQLite deja "Águila" después de "Zorzal".
- **Sesión en iOS:** el llavero sobrevive a la desinstalación, así que `restoreSession` verifica que el usuario exista (STACK §5).
- **React Compiler:** el lint marca `sharedValue.value = …`. Desactívalo solo en esa línea y explica el motivo.
- Los parámetros de ruta (`useLocalSearchParams`) son siempre texto.
- **Mocks en pruebas:** `jest-expo` mockea `expo-file-system/legacy` con un *stub* fijo que oculta el manual mock de `__mocks__/`; `jest.setup.ts` lo vuelve a mockear después para que el sistema de archivos en memoria real tome efecto (STACK §9).

## Verificación

Definición de terminado de cada fase (`5_MVP.md` §2):

- `npx tsc --noEmit`, `npx expo lint` y `npm test` terminan sin errores.
- Cada criterio **[auto]** está cubierto por una prueba que pasa.
- Al recorrer lo nuevo, la terminal de Metro no muestra `Uncaught (in promise)` ni advertencias de `presentation` de Expo Router. `ImageBackground is deprecated` viene de una dependencia y se ignora.
- Se respetan las Reglas que no se pueden romper, y los documentos afectados quedaron actualizados.

Pruebas:

- **Las pruebas verifican comportamiento y bordes, no detalles internos.** Ejemplos: −4 visible y −5 oculto; `username` de 2, 3, 20 y 21 caracteres. No escribas pruebas de cableado, de textos copiados ni de implementación.
- `src/domain`: funciones puras y esquemas zod.
- `src/data` y `src/auth`: se prueban contra SQLite en memoria (`src/data/testing/testDb.ts` sobre `better-sqlite3`), con las mismas migraciones que la app.
- Los módulos nativos (`expo-file-system/legacy`, `expo-secure-store`, `expo-crypto`) se reemplazan con *manual mocks* en `__mocks__/` de la raíz. Jest los aplica sin `jest.mock`. El mock de un subpath va en una carpeta: `__mocks__/expo-file-system/legacy.ts`.
- Los caminos de falla se prueban espiando el mock: `jest.spyOn(FileSystem, "writeAsStringAsync").mockRejectedValueOnce(…)`.

Criterios manuales:

- Cámara, GPS, permisos, fuentes, navegación y aspecto visual se verifican en Expo Go, en dispositivos físicos. **Quien implementa nunca marca un criterio [dispositivo] ni [revisión]**: los entrega en el informe como pendientes, con los pasos para verificarlos.
- El emulador de Android sirve para desarrollar (foto negra sintética y ubicación fija); el simulador de iOS no tiene cámara (STACK §11).

## Datos de desarrollo

El seed crea un administrador: `admin@avistapp.local` / `admin` / `avistapp-admin`. Solo es para desarrollo y debe quitarse antes de cualquier versión publicada.
