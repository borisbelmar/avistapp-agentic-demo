# AvistApp — Cierre del MVP (Fase 9)

Fuentes: [`1_BRIEF.md`](1_BRIEF.md), [`3_STACK.md`](3_STACK.md), [`4_DESIGN.md`](4_DESIGN.md), [`5_MVP.md`](5_MVP.md).

Este documento es el guion para que una persona apruebe el recorrido completo en un Android y un iPhone físicos (`5_MVP.md`, Fase 9), con el checklist de todos los criterios **[dispositivo]** de las fases 1 a 9, los criterios de éxito de `1_BRIEF.md` §10 y la revisión de accesibilidad de `4_DESIGN.md` §9 pantalla por pantalla.

## 1. Preparación

- PC y teléfonos en la misma red Wi-Fi. Expo Go instalado y compatible con la SDK 58 (`3_STACK.md` §1, §11).
- **Instalación nueva** (para que el recorrido empiece sin sesión ni datos previos):
  - **Android:** Ajustes > Apps > Expo Go > Permisos, quitar Cámara y Ubicación; luego Almacenamiento > Borrar datos.
  - **iPhone:** borrar Expo Go y reinstalarlo.
- El recorrido principal (§2) corre con `npx expo start --no-dev`, para probar la app como la vería una persona usuaria, sin los datos de desarrollo.
- **Advertencia (`5_MVP.md` §6):** en modo desarrollo (`npx expo start`, sin `--no-dev`), `seedDevData` borra en cada inicio todos los usuarios de prueba (salvo el administrador) y todos los avistamientos, y los recrea. Por eso, en desarrollo, "cerrar y reabrir la app" pierde la cuenta recién creada y sus fotos. La sección de datos de desarrollo (§3) se deja para el final, y no se cierra la app durante ella.
- En `--no-dev` la terminal de Metro no muestra los errores de la app en pantalla; la verificación de la terminal (sin `Uncaught (in promise)` ni advertencias de `presentation`) se hace en modo desarrollo, en la sección §3.

## 2. Recorrido principal (`--no-dev`)

Se repite completo en cada teléfono (Android y iPhone). Cada paso termina con la referencia a los criterios **[dispositivo]** que cubre (F# = Fase #, `5_MVP.md` §4).

1. Abrir la app.
   - Pantalla de inicio sin texto con la fuente del sistema.
   - Fondo papel, títulos en Fraunces, nada bajo la barra de estado o la isla dinámica (F1, F2).
2. Crear cuenta `prueba_a` (usuario `prueba_a`, cualquier correo y contraseña válidos).
   - Enviar el formulario vacío → errores en español bajo cada campo.
   - Contraseñas distintas → "Las contraseñas no coinciden."
   - El teclado no tapa los campos.
   - Al terminar llega al Muro vacío: "Aún no hay avistamientos. ¡Sé el primero en publicar uno!" con el botón "Tomar una foto" (F3).
3. Perfil.
   - Puntaje 0 y "0 de N especies".
   - Texto de colección vacía de DESIGN §7.6 (F7).
   - Mis publicaciones vacía; "Tomar una foto" abre la cámara (F8).
4. Cámara.
   - Rechazar el permiso de cámara → mensaje de DESIGN §8.
   - Rechazarlo de forma permanente → el botón pasa a "Abrir ajustes". En Android se rechaza dos veces; en iPhone, el primer rechazo ya es permanente.
   - Conceder el permiso desde Ajustes y volver a la app; repetir con la ubicación.
   - El disparador está deshabilitado, con indicador, hasta que se ve la imagen de la cámara (F4).
5. Con la ubicación del teléfono apagada, disparar → mensaje de `INVALID_LOCATION` y se sigue en la cámara. Encender la ubicación (F4).
6. Disparar → se abre Nuevo avistamiento con la foto, las coordenadas y la hora, bajo la barra de estado.
   - "Repetir foto" vuelve a la cámara.
   - Cerrar la cámara (botón "Cerrar cámara") vuelve a la pestaña anterior (F4).
7. Publicar.
   - "Publicar" está deshabilitado hasta elegir una especie; buscar "condor" en el selector encuentra "Cóndor".
   - Al publicar, la app vuelve al Muro (no a la cámara), con la publicación primera, el aviso "¡Nueva especie para tu colección!… +10 puntos" y, en la propia tarjeta, "Tu publicación" (F5, F6).
8. Quitar la app de recientes y reabrirla → la sesión sigue activa y la foto publicada se ve (F2, F3, F5).
9. Perfil: puntaje 10 ("Votos 0 · Especies +10"), "1 de N especies" y la barra de progreso se anima (F7).
10. Cerrar sesión, con confirmación → vuelve a Iniciar sesión (F3).
11. Crear cuenta `prueba_b`. Sobre la publicación de `prueba_a`:
    - ▲ → el puntaje sube a +1;
    - ▲ otra vez → vuelve a 0 (retira el voto);
    - ▼ → baja a −1;
    - ▲ → vuelve a +1 (F6).
12. Entrar como `prueba_a`.
    - Perfil: "Votos +1 · Especies +10" = 11, que coincide con el puntaje visto en el Muro (F7; BRIEF §10).
    - `prueba_a` no ve la papelera de eliminar en publicaciones ajenas.
13. Mis publicaciones.
    - Cambiar la especie de la publicación → cambia la colección del perfil.
    - Publicar una segunda foto (desde el botón "Tomar una foto" o la pestaña Capturar).
    - Eliminar una publicación, con confirmación → sale de la lista y del Muro (F8).
14. Entrar como administrador (credenciales de `5_MVP.md` §6) (F3).
    - Ve la papelera de eliminar en todas las publicaciones, también las ajenas.
    - Elimina una publicación de `prueba_a` tras confirmar (BRIEF §10).
15. Letra máxima.
    - **iPhone:** Ajustes > Accesibilidad > Pantalla y tamaño del texto > Texto más grande, con "Tamaños más grandes" activado, llevado al máximo.
    - **Android:** Ajustes > Pantalla > Tamaño de fuente, llevado al máximo.
    - Recorrer Iniciar sesión, Crear cuenta, Muro, Cámara (pantallas de permiso y de error), Nuevo avistamiento, Selector de especie, Perfil y Mis publicaciones.
    - Se espera: todo el texto se lee completo, sin recortes ni desbordes, y todo botón se alcanza con desplazamiento. Las etiquetas de la barra de pestañas no crecen (por diseño, DESIGN §3) (F9).
    - Volver el tamaño de letra a su valor normal antes de seguir.
16. Reducción de movimiento.
    - **iPhone:** Accesibilidad > Movimiento > Reducir movimiento.
    - **Android:** Accesibilidad > Quitar animaciones (o "Eliminar animaciones").
    - Cerrar y reabrir la app.
    - Votar una publicación: el ícono del voto no crece. Entrar al Perfil: la barra de colección aparece llena de inmediato, sin animarse. Publicar una especie nueva: el aviso aparece sin deslizarse desde arriba. Abrir el selector de especie: aparece sin deslizarse (F7; DESIGN §5).
    - Desactivar la reducción de movimiento antes de seguir.
17. Lector de pantalla (VoiceOver en iPhone / TalkBack en Android).
    - En el Muro se anuncian "Voto positivo" / "Voto negativo", con su estado activo o inactivo.
    - Se anuncian "Eliminar publicación" (vista de administrador), "Cerrar cámara", "Tomar foto", "Cerrar" (selector de especie), "Volver" (Nuevo avistamiento, Mis publicaciones), "Cerrar sesión" y, en la barra de pestañas, "Capturar" para la pestaña que solo tiene ícono.
    - Las fotos se anuncian como "Foto de {especie} por {usuario}"; en Nuevo avistamiento, antes de elegir la especie, se anuncia "Foto recién tomada".
    - El avatar (círculo con la inicial) no se anuncia: el nombre de usuario de al lado ya lo hace.

## 3. Datos de desarrollo (`npx expo start`, al final)

Esta sección usa los usuarios de prueba de `5_MVP.md` §6 y se hace al final para no interferir con el recorrido principal: **no cerrar la app en medio de esta sección**, porque reabrirla regenera los datos de prueba.

Pasos:
1. Entrar como `sofia_campo` (`sofia@avistapp.test` / `avistapp-test`) y votar ▼ en la publicación de "Picaflor chico" de `ana_aves` (está en −4) → el voto la lleva a −5 y sale del Muro de inmediato (F6; BRIEF §10).
2. Entrar como administrador → la ve atenuada (50 % de opacidad) con la insignia "Oculta" y la elimina tras confirmar (F6).

Verificación de la terminal (en este modo de desarrollo, no en `--no-dev`): a lo largo de todo el recorrido (§2 y este), la terminal de Metro no debe mostrar `Uncaught (in promise)` ni advertencias de `presentation` de Expo Router. `ImageBackground is deprecated…` viene de una dependencia y se ignora.

## 4. Checklist de criterios [dispositivo]

Todos los criterios **[dispositivo]** de `5_MVP.md` §4, Fases 1 a 9, en orden. "Paso" referencia los pasos de §2 (sin prefijo) o de §3 (con el prefijo `§3`).

| Fase | Criterio | Paso | Android | iPhone |
|---|---|---|---|---|
| 1 | La app abre en Expo Go en un Android y un iPhone físicos: fondo `paper`, título en Fraunces, texto en Figtree, nada bajo la barra de estado o la isla dinámica. | 1 | ☐ | ☐ |
| 1 | No se ve texto con la fuente del sistema antes de que carguen las fuentes. | 1 | ☐ | ☐ |
| 2 | La app abre sin errores en una instalación nueva y al reabrirla. | 1, 8 | ☐ | ☐ |
| 3 | Registrarse lleva al Muro; al cerrar y reabrir la app la sesión sigue activa. Cerrar sesión lleva a Iniciar sesión. | 2, 8, 10 | ☐ | ☐ |
| 3 | El administrador entra con las credenciales de §6. | 14 | ☐ | ☐ |
| 3 | Los errores aparecen en español bajo cada campo y el teclado no tapa los campos. | 2 | ☐ | ☐ |
| 3 | El contenido del Muro y del Perfil no queda bajo la barra de estado ni la isla dinámica. | 2, 3 | ☐ | ☐ |
| 4 | Rechazar un permiso muestra el mensaje de DESIGN §8; rechazarlo de forma permanente muestra "Abrir ajustes". | 4 | ☐ | ☐ |
| 4 | Al abrir la cámara, el disparador está deshabilitado (con indicador) hasta que la vista previa está lista. | 4 | ☐ | ☐ |
| 4 | Con el GPS apagado aparece el mensaje de `INVALID_LOCATION` y el usuario sigue en la cámara. | 5 | ☐ | ☐ |
| 4 | Nuevo avistamiento muestra la foto recién tomada, las coordenadas y la hora, bajo la barra de estado. "Repetir foto" vuelve a la cámara; cerrar la cámara vuelve a la pestaña anterior. | 6 | ☐ | ☐ |
| 4 | Funciona en un iPhone físico y en Android (físico, o emulador con la foto sintética). | 4–6 | ☐ | ☐ |
| 5 | "Publicar" está deshabilitado hasta elegir una especie; buscar "condor" encuentra "Cóndor". | 7 | ☐ | ☐ |
| 5 | Al publicar, la app vuelve al Muro (no a la cámara) y la publicación aparece primera; si la especie es nueva, aparece el aviso con +10. | 7 | ☐ | ☐ |
| 5 | La foto sigue visible después de cerrar y reabrir la app. | 8 | ☐ | ☐ |
| 6 | Votar, cambiar y retirar el voto actualiza el puntaje de inmediato. La publicación propia muestra "Tu publicación" en vez de los votos. | 7, 11 | ☐ | ☐ |
| 6 | Un voto que oculta una publicación la saca del muro. | §3.1 | ☐ | ☐ |
| 6 | El administrador ve las ocultas atenuadas con la insignia "Oculta" y puede eliminarlas tras confirmar. | §3.2 | ☐ | ☐ |
| 7 | El puntaje y la colección del perfil coinciden con lo que se ve en el muro; la barra de progreso se anima (salvo con reducción de movimiento). | 9, 12, 16 | ☐ | ☐ |
| 7 | Con la colección vacía se muestra el texto de DESIGN §7.6. | 3 | ☐ | ☐ |
| 8 | Cambiar la especie actualiza la colección del perfil; eliminar quita la publicación de la lista y del muro. | 13 | ☐ | ☐ |
| 8 | Con la lista vacía se muestra el texto de DESIGN §7.7, y "Tomar una foto" abre la cámara. | 3 | ☐ | ☐ |
| 9 | Recorrido completo en un Android y un iPhone físicos: registro, publicación, votos con dos cuentas, perfil, mis publicaciones y moderación. | 1–14 | ☐ | ☐ |
| 9 | Con el tamaño de letra máximo del sistema, las pantallas siguen usables. | 15 | ☐ | ☐ |
| 9 | Se cumplen los criterios de éxito de `1_BRIEF.md` §10. | §5 | ☐ | ☐ |

## 5. Criterios de éxito (`1_BRIEF.md` §10)

| Criterio | Paso | Android | iPhone |
|---|---|---|---|
| Un usuario nuevo se registra y publica su primer avistamiento sin ayuda, en un teléfono Android y en un iPhone físicos. | 2–7 | ☐ | ☐ |
| Cada publicación tiene foto, especie del catálogo y ubicación GPS válidas. | 6–7 | ☐ | ☐ |
| Las publicaciones con puntaje ≤ −5 desaparecen del muro de inmediato. | §3.1 | ☐ | ☐ |
| El puntaje y la colección del perfil coinciden siempre con las publicaciones y votos existentes. | 9, 12 | ☐ | ☐ |
| Solo el autor edita o elimina su publicación; solo el administrador elimina publicaciones ajenas. | 12–14 | ☐ | ☐ |

## 6. Revisión de DESIGN §9, pantalla por pantalla ([revisión])

Cada celda cita el archivo y el mecanismo del código. Celdas no aplicables: "—".

| Pantalla | Etiquetas y roles | Fotos | Estado sin solo color | Áreas táctiles | Letra máxima | Movimiento | Estados (§7) |
|---|---|---|---|---|---|---|---|
| Iniciar sesión / Crear cuenta | `TextField.tsx`: `accessibilityLabel={label}`; botón del ojo "Mostrar contraseña" / "Ocultar contraseña" + `accessibilityRole="button"`. | — | Errores bajo cada campo (`fieldState.error`, texto); `INVALID_CREDENTIALS` y errores desconocidos en recuadro `danger-50`/`danger-600` sobre el botón principal. | Botón del ojo `h-12 w-11`; `Button` y `TextField` ≥ 44 px de alto. | `TextField.tsx` y `Button.tsx`: `min-h-12` en vez de `h-12`. | — | Sin estados de carga de datos (no hay lista); "Crear cuenta"/"Iniciar sesión" con indicador y deshabilitado mientras envían. |
| Muro | `VoteControl.tsx`: "Voto positivo"/"Voto negativo" + `accessibilityState={{ selected }}`; `SightingCard.tsx`: papelera "Eliminar publicación" (solo ADMIN). | `SightingCard.tsx`: `accessibilityLabel={`Foto de ${commonName} por ${authorUsername}`}`. | Voto activo por la forma del ícono (contorno/relleno), no solo color; insignia "Oculta" con texto (`Badge`). | `VoteButton` y la papelera: `h-11 w-11`. | `SightingCard.tsx`: `shrink` en coordenadas y en "Tu publicación". | `VoteButton`: `withSequence`/`withTiming` con `ReduceMotion.System`; `SightingCard`: `Animated.View exiting={FadeOut}` al ocultarse o eliminarse. | `ActivityIndicator` mientras carga; `EmptyState` con "Reintentar" si falla; vacío "Tomar una foto". La papelera (ADMIN) no tiene indicador propio: la protege el `Alert` de confirmación y el borrado es local e instantáneo. |
| Barra de pestañas | `_layout.tsx`: `tabBarAccessibilityLabel="Capturar"` en la pestaña sin texto. | — | Pestaña activa con ícono relleno vs. contorno, además del color. | Pestañas nativas de Expo Router / React Navigation (≥ 44 px). | `_layout.tsx`: `tabBarAllowFontScaling: false` (excepción documentada en DESIGN §3: la barra tiene alto fijo). | — | — |
| Cámara | `capture.tsx`: `CloseButton` "Cerrar cámara"; disparador "Tomar foto" + `accessibilityState={{ disabled, busy }}`. | — (`CameraView` en vivo, no una `Image`). | Mensajes de error en texto blanco sobre el disparador (`PHOTO_FAILED`, `CAMERA_FAILED`, `INVALID_LOCATION`). | `CloseButton`: `h-11 w-11`; disparador: 72×72 px. | `capture.tsx`: "Obteniendo ubicación…" con `shrink`; `PermissionScreen` usa `Button` (`min-h-12`). | — | Mientras cargan los permisos: `ActivityIndicator` centrado (antes, pantalla negra sin salida); disparador deshabilitado con indicador hasta `cameraState === "ready"`. |
| Nuevo avistamiento | `publish.tsx`: botón "Volver" con `accessibilityLabel`. | `publish.tsx`: `accessibilityLabel` "Foto de {especie} por {usuario}" tras elegir especie, "Foto recién tomada" antes. | Error de publicar en recuadro `danger-50`/`danger-600` con texto. | Botón volver `h-11 w-11`; selector de especie `min-h-12`. | `publish.tsx`: `min-h-12` en el selector; `shrink` en título, coordenadas, fecha y nombre de la especie elegida. | — (las animaciones del selector que abre están en su propia fila). | Catálogo con error y "Reintentar" (`speciesError`/`loadSpecies`, pasado a `SpeciesPicker`); "Publicar" con indicador mientras guarda. |
| Selector de especie | `SpeciesPicker.tsx`: botón "Cerrar"; buscador `accessibilityLabel="Buscar por nombre común o científico"`. | — | "En tu colección" con ícono `leaf` + texto, no solo color. | Botón cerrar `h-11 w-11`; filas de resultado con `py-3`. | `SpeciesPicker.tsx`: `min-h-12` en el buscador; `shrink` en el título y en "En tu colección". | `SpeciesPicker.tsx`: `animationType={reduceMotion ? "none" : "slide"}` con `useReducedMotion`. | Error del catálogo con `EmptyState` "Reintentar" (`onRetry`); sin resultados, "No encontramos esa especie." |
| Perfil | `profile.tsx`: "Cerrar sesión" con `accessibilityLabel`; `Avatar.tsx` oculto (`accessibilityElementsHidden`, el nombre va al lado). | `profile.tsx`: cada foto de la colección con `accessibilityLabel` "Foto de {especie} por {usuario}". | Insignia `ADMIN` con texto; progreso con el texto "X de N especies" junto a la barra. | "Cerrar sesión" `h-11 w-11`; "Mis publicaciones" (`Button`) `min-h-12`. | `profile.tsx`: fila "Colección" con `shrink`/`text-right` en el progreso; `Button` `min-h-12`. | `ProgressBar.tsx`: `withTiming` con `ReduceMotion.System` (sin `useReducedMotion` explícito, mismo mecanismo que `VoteControl`). | `ActivityIndicator` mientras carga; `EmptyState` "Reintentar" si falla; colección vacía con el texto de DESIGN §7.6. |
| Mis publicaciones | `my-sightings.tsx`: botón "Volver"; "Cambiar especie"/"Eliminar" son `Button` con título visible, no solo ícono. | `my-sightings.tsx`: miniatura con `accessibilityLabel` "Foto de {especie} por {usuario}". | Insignia "Oculta" + texto "Ya no aparece en el muro." | `Button` "Cambiar especie"/"Eliminar": `min-h-12`; fila con `flex-wrap` para que no se corten. | `my-sightings.tsx`: título con `shrink`; fila de botones `flex-row flex-wrap`; `Button` `min-h-12`. | — (sin animación de salida al eliminar). | `EmptyState` "Reintentar" si falla la lista; selector de especie con su propio error/"Reintentar" (`speciesError`/`loadSpecies`); lista vacía con "Tomar una foto". |

Contraste: solo tokens de DESIGN §2 (valores calculados ahí); sin cambios en esta fase.
