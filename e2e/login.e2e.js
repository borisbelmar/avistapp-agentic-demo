const path = require("path");
const { remote } = require("webdriverio");

// APK de depuración generado por `expo prebuild` + `gradlew assembleDebug` (ver e2e/README.md).
// AVISTAPP_APK permite apuntar a otro APK (por ejemplo uno de release) sin tocar este archivo.
const APP_PATH =
  process.env.AVISTAPP_APK || path.resolve(__dirname, "../android/app/build/outputs/apk/debug/app-debug.apk");

// Credenciales del administrador de desarrollo que crea el seed (AGENTS.md, Datos de desarrollo;
// src/data/seed.ts). Fase 3 pide probar justo que el administrador entra con ellas.
const ADMIN_EMAIL = "admin@avistapp.local";
const ADMIN_PASSWORD = "avistapp-admin";

// Ningún componente tiene testID: TextField sí pone accessibilityLabel (localizable con "~"),
// pero Button solo expone su texto visible, así que se ubica con un UiSelector de Android por
// texto, igual que lo encontraría una persona.
const byText = (text) => `android=new UiSelector().text("${text}")`;

function newSession() {
  return remote({
    hostname: process.env.APPIUM_HOST || "127.0.0.1",
    port: Number(process.env.APPIUM_PORT) || 4723,
    capabilities: {
      platformName: "Android",
      "appium:automationName": "UiAutomator2",
      "appium:app": APP_PATH,
      // noReset: false (por defecto) limpia los datos de la app antes de cada sesión, así la
      // base y el llavero quedan vacíos y cada prueba empieza siempre en la pantalla de acceso
      // (Fase 3: sin sesión solo se ven las pantallas de acceso).
      "appium:noReset": false,
      // Android 17 pide "dispositivos cercanos" (ACCESS_LOCAL_NETWORK) antes de que el APK de
      // depuración baje el JS de Metro; el diálogo tapa la app y las pruebas no encuentran nada.
      // Concede al instalar todos los permisos del manifest (también cámara y ubicación, que el
      // login no usa).
      "appium:autoGrantPermissions": true,
      "appium:newCommandTimeout": 120,
    },
  });
}

describe("Login", () => {
  /** @type {WebdriverIO.Browser} */
  let driver;

  beforeEach(async () => {
    driver = await newSession();
  });

  afterEach(async () => {
    await driver?.deleteSession();
  });

  test("muestra los campos de correo, contraseña y el botón de acceso", async () => {
    await expect(driver.$("~Correo").waitForDisplayed({ timeout: 20000 })).resolves.toBe(true);
    await expect(driver.$("~Contraseña").isDisplayed()).resolves.toBe(true);
    await expect(driver.$(byText("Iniciar sesión")).isDisplayed()).resolves.toBe(true);
  });

  test("contraseña incorrecta muestra el error de credenciales inválidas", async () => {
    await driver.$("~Correo").waitForDisplayed({ timeout: 20000 });
    await driver.$("~Correo").setValue(ADMIN_EMAIL);
    await driver.$("~Contraseña").setValue("contrasena-incorrecta");
    await driver.$(byText("Iniciar sesión")).click();

    // Texto exacto de ERROR_MESSAGES.INVALID_CREDENTIALS (src/domain/errors.ts, DESIGN §8).
    await expect(
      driver.$(byText("Correo o contraseña incorrectos.")).waitForDisplayed({ timeout: 10000 }),
    ).resolves.toBe(true);
  });

  test("el administrador de desarrollo inicia sesión y llega al Muro", async () => {
    await driver.$("~Correo").waitForDisplayed({ timeout: 20000 });
    await driver.$("~Correo").setValue(ADMIN_EMAIL);
    await driver.$("~Contraseña").setValue(ADMIN_PASSWORD);
    await driver.$(byText("Iniciar sesión")).click();

    // "Muro" es el título de la primera pestaña (app/(tabs)/_layout.tsx): solo se ve con sesión.
    await expect(driver.$(byText("Muro")).waitForDisplayed({ timeout: 15000 })).resolves.toBe(true);
  });
});
