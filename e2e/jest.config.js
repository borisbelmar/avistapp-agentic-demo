// Config de Jest solo para e2e/*.e2e.js: corren contra un servidor Appium real (Node puro), no
// contra componentes React Native, así que no usan el preset jest-expo de la raíz (STACK §9 lo
// reserva para las pruebas de unidad). El nombre ".e2e.js" ya evita que jest-expo las recoja en
// `npm test`, así que no hace falta tocar la config raíz.
module.exports = {
  rootDir: __dirname,
  testEnvironment: "node",
  testMatch: ["**/*.e2e.js"],
  testTimeout: 60000,
};
