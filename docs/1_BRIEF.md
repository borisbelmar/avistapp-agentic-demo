# AvistApp — Brief de producto

## 1. Resumen

AvistApp es una aplicación móvil (Android e iOS) para registrar y compartir avistamientos de aves en Chile. Cada avistamiento es una foto tomada con la cámara del teléfono, asociada a una especie del catálogo de aves de Chile y a la ubicación GPS del momento de la captura. La comunidad vota las fotos para separar las buenas de las malas, y cada usuario arma su colección personal con el objetivo de fotografiar todas las aves de Chile.

## 2. Problema y oportunidad

- Quienes observan aves no tienen un lugar simple y local para registrar sus avistamientos y mostrarlos.
- Las fotos que circulan en redes generales no tienen especie ni ubicación confiables, ni un filtro de calidad.
- Coleccionar especies motiva a salir a observar; hoy ese progreso se lleva a mano o no se lleva.

AvistApp resuelve esto con registros verificables (cámara + GPS en el momento), filtro de calidad comunitario (votos) y una meta clara (completar la colección).

## 3. Objetivos del producto

1. Permitir publicar un avistamiento en pocos pasos: tomar foto → elegir especie → publicar.
2. Mostrar a todos los usuarios un muro con los avistamientos de la comunidad.
3. Filtrar automáticamente las fotos de mala calidad mediante votos.
4. Motivar la participación con puntaje y una colección de especies.

## 4. Usuarios y roles

| Rol | Descripción | Puede |
|---|---|---|
| Usuario | Persona registrada que observa y fotografía aves | Ver el muro, publicar, editar y eliminar sus publicaciones, votar publicaciones ajenas, ver su perfil y colección |
| Administrador | Usuario con permisos de moderación | Todo lo anterior, y eliminar publicaciones de cualquier usuario |

Toda la app requiere sesión iniciada; no hay acceso anónimo. El rol administrador se asigna directamente en el sistema (no desde la app).

## 5. Funcionalidades

### 5.1 Registro e inicio de sesión
- Registro con nombre de usuario, correo y contraseña.
- Inicio y cierre de sesión con correo y contraseña.

### 5.2 Publicar avistamiento
- El usuario toma la foto con la cámara desde la app (no se permite subir desde la galería).
- La app captura la ubicación GPS del dispositivo en el momento de la foto.
- El usuario elige la especie desde el catálogo de aves de Chile.
- La publicación registra autor, foto, especie, ubicación y fecha/hora.

### 5.3 Muro de publicaciones
- Lista de publicaciones visibles de todos los usuarios, de la más reciente a la más antigua.
- Cada publicación muestra foto, especie, autor, fecha, ubicación y puntaje.
- Desde el muro el usuario vota publicaciones ajenas.

### 5.4 Votos
- Cada usuario puede dar un voto positivo (+1) o negativo (−1) por publicación.
- El voto se puede cambiar o retirar.
- No se puede votar una publicación propia.

### 5.5 Mantenedor de mis publicaciones
- Lista de las publicaciones propias, incluidas las ocultas por mal puntaje.
- Editar: solo la especie (para corregir una identificación errónea). La foto y la ubicación no se editan porque están ligadas a la captura; para cambiarlas se elimina y se publica de nuevo.
- Eliminar una publicación propia.

### 5.6 Perfil y colección
- Muestra nombre de usuario, puntaje total y progreso de la colección ("X de N especies").
- La colección lista las especies del catálogo que el usuario ya fotografió.

### 5.7 Moderación
- El administrador puede eliminar cualquier publicación desde el muro.

## 6. Reglas de negocio clave

Los valores numéricos son iniciales y ajustables. El detalle formal del modelo se define en `2_DOMAIN.md`.

| Regla | Definición |
|---|---|
| Puntaje de publicación | Suma de sus votos (+1 / −1) |
| Publicación oculta | Una publicación con puntaje ≤ **−5** deja de mostrarse en el muro. Sigue visible para su autor (en el mantenedor) y para el administrador |
| Colección | Conjunto de especies distintas con al menos una publicación propia, existente y no oculta |
| Puntaje del usuario | Suma del puntaje de todas sus publicaciones + **10** puntos por cada especie de su colección |
| Consistencia del bonus | El bonus se calcula a partir de la colección actual: si el usuario elimina su única publicación de una especie, o esta queda oculta, pierde ese bonus. Publicar y borrar repetidamente no suma puntos |
| Catálogo | Lista cerrada y precargada de especies de aves de Chile (nombre común y nombre científico). Los usuarios no agregan especies |

## 7. Fuera de alcance

- Subir fotos desde la galería o desde otras cámaras.
- Ubicación ingresada a mano o tomada de los metadatos de la foto.
- Propuestas de especies nuevas por parte de usuarios.
- Comentarios, seguidores, mensajería y notificaciones push.
- Ranking de usuarios y perfiles públicos de otros usuarios.
- Búsqueda y filtros en el muro.
- Recuperación de contraseña e inicio de sesión con redes sociales.
- Panel de administración web y gestión de roles desde la app.
- Uso sin conexión a internet.

## 8. Restricciones y supuestos

- Idioma: español. Mercado: Chile.
- La app necesita permisos de cámara y de ubicación; sin ellos no se puede publicar.
- **Etapa 1 (MVP, `5_MVP.md`):** no hay backend; todos los datos viven en el dispositivo y la app funciona sin conexión (ver `3_STACK.md` §2). La "comunidad" son las cuentas creadas en el mismo dispositivo.
- **Desde la etapa 2 (con backend):** se requiere conexión a internet para publicar, votar y ver el muro. "Uso sin conexión" (§7) se refiere a un modo *offline* con sincronización posterior, que sigue fuera de alcance.
- Publicar exige un dispositivo con cámara y GPS reales. El simulador de iOS no tiene cámara y el emulador de Android entrega una foto sintética y una ubicación fija, así que el flujo de publicación se acepta solo en dispositivos físicos (ver `3_STACK.md` §11).
- La tecnología se define en `3_STACK.md`, el diseño en `4_DESIGN.md` y el alcance del primer entregable en `5_MVP.md`.

## 9. Riesgos

- **Privacidad:** la ubicación exacta de la foto es pública y revela dónde estuvo el usuario.
- **Especies sensibles:** publicar la ubicación exacta de nidos o especies amenazadas puede ponerlas en riesgo.
- **Votos coordinados:** un grupo de usuarios puede ocultar fotos válidas con votos negativos; el administrador no tiene forma de restaurarlas.

## 10. Criterios de éxito

- Un usuario nuevo se registra y publica su primer avistamiento sin ayuda, en un teléfono Android y en un iPhone físicos.
- Cada publicación tiene foto, especie del catálogo y ubicación GPS válidas.
- Las publicaciones con puntaje ≤ −5 desaparecen del muro de inmediato.
- El puntaje y la colección del perfil coinciden siempre con las publicaciones y votos existentes.
- Solo el autor edita o elimina su publicación; solo el administrador elimina publicaciones ajenas.
