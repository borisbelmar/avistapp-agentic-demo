# Pruebas E2E del login (Appium + emulador de Android)

Batería mínima contra un emulador de Android real, fuera de Expo Go. Cubre el criterio
[dispositivo] de la Fase 3 "El administrador entra con las credenciales de §6" y los errores de
inicio de sesión (`docs/5_MVP.md`).

## Preparar una vez por máquina

1. Instalar el driver de Android de Appium:
   ```
   npm run appium:drivers
   ```
2. Si `app.json` todavía no tiene `expo.android.package`, agregar uno (identificador de paquete,
   ej. `com.avistapp.app`); `expo prebuild` lo pide la primera vez si falta.
3. **Solo Windows:** el `ninja.exe` 1.10.2 que trae el CMake 3.22.1 del SDK no maneja rutas de
   más de 260 caracteres, y el build de `react-native-worklets` falla con
   `ninja: error: mkdir(CMakeFiles/worklets.dir/C_/Users/...): No such file or directory`.
   Reemplazar `%LOCALAPPDATA%\Android\Sdk\cmake\3.22.1\bin\ninja.exe` por el de
   [ninja 1.12.1](https://github.com/ninja-build/ninja/releases/tag/v1.12.1) (`ninja-win.zip`),
   que sí maneja rutas largas, y tener `LongPathsEnabled = 1` en
   `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem`.
4. Generar un APK de depuración (para el emulador basta `x86_64`, y compila más rápido):
   ```
   npx expo prebuild --platform android
   cd android
   .\gradlew assembleDebug -PreactNativeArchitectures=x86_64
   ```
   Queda en `android/app/build/outputs/apk/debug/app-debug.apk` (ruta por defecto de las
   pruebas). Para usar otro APK, exportar `AVISTAPP_APK` con la ruta completa.
   El APK de depuración **no trae el JS**: lo baja de Metro al abrir.
5. Tener un emulador de Android corriendo (Android Studio → Device Manager, o
   `emulator -avd <nombre>`).

## Correr las pruebas

Tres terminales:

```
npx expo start            # Metro: el APK de depuración saca el JS de aquí
npm run appium            # servidor de Appium
npm run test:e2e          # las pruebas
```

Sin Metro, la app abre en una pantalla de error y ninguna prueba encuentra el campo "Correo".
La primera carga del bundle tarda; si la primera prueba vence por tiempo, vuelve a correrlas.

`test:e2e` corre Jest con `--experimental-vm-modules` porque `webdriverio` 10 carga su API con un
`import()` dinámico.

En Android 17 el APK pide "dispositivos cercanos" (`ACCESS_LOCAL_NETWORK`) para llegar a Metro;
la sesión usa `autoGrantPermissions` para que ese diálogo no tape la app.

## Qué prueban (`login.e2e.js`)

- La pantalla de login muestra correo, contraseña y el botón "Iniciar sesión".
- Contraseña incorrecta muestra "Correo o contraseña incorrectos." (`INVALID_CREDENTIALS`).
- El administrador de desarrollo (`admin@avistapp.local` / `avistapp-admin`) inicia sesión y
  llega a la pestaña Muro.

Cada prueba abre y cierra su propia sesión de Appium; `noReset: false` limpia la base SQLite y
el llavero antes de cada una, así que la app siempre arranca en la pantalla de acceso, sin
sesión restaurada.

No cubre registro, cierre de sesión ni el resto de las pantallas: son otras fases.
