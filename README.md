# AvistApp

Aplicación móvil (Android e iOS) para registrar y compartir avistamientos de aves en Chile. Cada avistamiento es una foto tomada con la cámara de la app, asociada a una especie del catálogo de aves de Chile y a la ubicación GPS del momento de la captura. La comunidad vota las fotos y cada usuario arma su colección con la meta de fotografiar todas las aves de Chile.

> **Etapa 1 (MVP):** no hay backend. Todos los datos viven en el dispositivo (SQLite) y la app funciona sin conexión. La "comunidad" son las cuentas creadas en el mismo teléfono.

## Funcionalidades

- **Cuenta:** registro con nombre de usuario, correo y contraseña; inicio y cierre de sesión.
- **Publicar:** foto con la cámara (no desde la galería) + GPS del momento + especie del catálogo.
- **Muro:** publicaciones de todos los usuarios, de la más reciente a la más antigua.
- **Votos:** +1 o −1 por publicación ajena; se pueden cambiar o retirar.
- **Mis publicaciones:** cambiar la especie o eliminar las publicaciones propias, incluidas las ocultas.
- **Perfil y colección:** puntaje desglosado y progreso "X de N especies".
- **Moderación:** el administrador elimina cualquier publicación.

### Reglas principales

| Regla | Definición |
|---|---|
| Puntaje de una publicación | Suma de sus votos (+1 / −1) |
| Publicación oculta | Puntaje ≤ −5: sale del muro y ya no se puede votar. Su autor y el administrador la siguen viendo |
| Colección | Especies distintas con al menos una publicación propia no oculta |
| Puntaje del usuario | Suma de los votos de todas sus publicaciones + 10 por cada especie de la colección |

El detalle está en [`docs/2_DOMAIN.md`](docs/2_DOMAIN.md).

## Stack

| Necesidad | Tecnología |
|---|---|
| Framework | React Native con Expo SDK 58 (flujo administrado), TypeScript `strict` |
| Navegación | Expo Router |
| UI | NativeWind v4 + Tailwind CSS 3.4; tipografías Fraunces y Figtree |
| Formularios y validación | React Hook Form + Zod |
| Datos | `expo-sqlite`, `expo-secure-store`, `expo-file-system/legacy` |
| Cámara y ubicación | `expo-camera`, `expo-location` |
| Pruebas | Jest (`jest-expo`) y SQLite en memoria con `better-sqlite3` |

Detalle y justificación en [`docs/3_STACK.md`](docs/3_STACK.md).

## Requisitos

- Node.js (versión LTS) y npm.
- Expo Go en un teléfono Android o iPhone. Expo Go de las tiendas solo abre proyectos de la SDK más reciente.
- Para publicar hace falta un **dispositivo físico**: el simulador de iOS no tiene cámara y el emulador de Android entrega una foto negra sintética con una ubicación fija.

## Puesta en marcha

El código se construye por fases ([`docs/5_MVP.md`](docs/5_MVP.md)). Estos comandos funcionan desde la Fase 0.

```bash
npm install
npx expo start
```

Escanea el código QR con Expo Go (Android) o con la cámara (iPhone). La app pide permisos de cámara y de ubicación al publicar.

### Administrador de desarrollo

La primera migración crea un administrador. **Solo es para desarrollo:** quítalo del seed antes de cualquier versión publicada.

| Correo | Usuario | Contraseña |
|---|---|---|
| `admin@avistapp.local` | `admin` | `avistapp-admin` |

## Calidad

```bash
npx tsc --noEmit   # tipos
npx expo lint      # ESLint (configuración de Expo)
npm test           # Jest
npx expo-doctor    # compatibilidad de dependencias con la SDK
```

Cámara, GPS, permisos, fuentes, navegación y aspecto visual se verifican a mano en un Android y un iPhone físicos.

## Estructura

```
app/          Rutas y pantallas (Expo Router)
src/domain/   Tipos, constantes, esquemas zod, errores y reglas puras
src/data/     SQLite: migraciones, seed y un caso de uso por función
src/auth/     Registro, login, contraseñas y sesión
src/components/  Componentes de UI y formato de textos
src/theme/    Paleta de colores (compartida con Tailwind)
assets/       Catálogo de especies (species.json) y recursos
__mocks__/    Mocks de módulos nativos para Jest
docs/         Documentación del producto
```

## Documentación

| Documento | Contenido |
|---|---|
| [`1_BRIEF.md`](docs/1_BRIEF.md) | Producto: problema, usuarios, funcionalidades, alcance y criterios de éxito |
| [`2_DOMAIN.md`](docs/2_DOMAIN.md) | Modelo de dominio: entidades, reglas, casos de uso y errores |
| [`3_STACK.md`](docs/3_STACK.md) | Stack técnico, persistencia, navegación y advertencias conocidas |
| [`4_DESIGN.md`](docs/4_DESIGN.md) | Diseño visual, pantallas, textos y accesibilidad |
| [`5_MVP.md`](docs/5_MVP.md) | Fases del MVP, criterios de aceptación y avance |
| [`AGENTS.md`](AGENTS.md) | Instrucciones para agentes de código que trabajen en el repositorio |

## Limitaciones de la etapa 1

- Desinstalar la app borra todos los datos.
- Para probar votos se cierra sesión y se entra con otra cuenta en el mismo dispositivo.
- La ubicación se muestra como coordenadas: no hay mapas ni direcciones, porque requieren servicios externos.
- Fuera de alcance: subir desde la galería, comentarios, notificaciones, ranking, búsqueda en el muro, recuperación de contraseña y uso *offline* con sincronización ([`1_BRIEF.md`](docs/1_BRIEF.md) §7).
