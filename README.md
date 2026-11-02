# Cerrada del Marqués · Android

App React Native (Expo SDK 54) que muestra https://delmarques.harodoor.app/index.php en un WebView. Cada vecino ingresa su propia cuenta una vez; se guarda cifrada mediante Android Keystore / Expo SecureStore. No hay cuentas ni contraseñas incluidas en el proyecto.

## Desarrollo

Node.js 22 LTS o posterior compatible con Expo SDK 54.

```sh
npm ci
npm test
npm run check
npx expo start
```

Abre el proyecto desde Expo Go compatible con SDK 54, o usa un development build. Para desarrollo nativo local instala JDK 17 y Android SDK según Expo y ejecuta `npm run android`. El checkout actual ya está aislado: no necesita un Git worktree adicional.

## Generar APK para los vecinos

Con una cuenta Expo y acceso a EAS Build:

```sh
npx eas-cli@latest login
npx eas-cli@latest build:configure --platform android
npx eas-cli@latest build --platform android --profile preview
```

EAS pedirá vincular el proyecto y generar o seleccionar una llave de firma Android. Conserva esa llave para futuras actualizaciones. El perfil `preview` de `eas.json` genera un APK instalable; descarga el resultado de EAS y compártelo con tus vecinos. Android pedirá autorizar la instalación desde la fuente que use cada vecino. El perfil `production` genera un AAB para Google Play. No se ha generado ni firmado un APK en este entorno.

## Funcionamiento y límites

- El usuario guarda sus credenciales en su teléfono; la app no las envía a un servidor propio.
- El WebView usa una sesión temporal. Al volver a abrir la app se utiliza la cuenta guardada para iniciar sesión de nuevo. Borrar acceso elimina las credenciales y desmonta la sesión del WebView.
- Solo se permite navegar al origen HTTPS exacto de la cerrada. Las ventanas externas se bloquean; no se ignoran errores TLS.
- El autocompletado requiere un único formulario visible con una contraseña y un usuario identificable. Solo se envía automáticamente un formulario POST al mismo origen, con un botón de inicio de sesión reconocido, una vez por apertura de cuenta. No se pulsan controles del portón.
- Si el formulario es diferente, tiene CAPTCHA o requiere verificación adicional, se debe completar manualmente. No se eluden controles del sitio. Para modificar credenciales, usa **Borrar acceso** y vuelve a guardarlas.
- Las credenciales guardadas no acreditan que la cuenta sea válida. Los errores de autenticación los muestra Harodoor.
- Cualquier persona con acceso al teléfono desbloqueado puede usar esta app. Cada vecino debe usar su cuenta autorizada.

## Validación pendiente en Android

Se debe validar contra el formulario real antes de distribuir: primer acceso, cierre completo y reapertura, contraseña incorrecta (sin bucles), pérdida de conexión y recuperación, borrado de acceso, botón Atrás y navegación fuera del dominio. Verifica la apertura del portón solo cuando tú lo decidas, en una prueba supervisada.

Las pruebas unitarias usan un formulario simulado; no comprueban compatibilidad con Harodoor. El entorno de desarrollo bloqueó la consulta pública al dominio mediante su proxy. Se solicitó el dominio en el borrador de configuración del entorno; falta aplicar ese cambio y repetir la prueba real. No se han usado credenciales reales para ejecutar pruebas.
