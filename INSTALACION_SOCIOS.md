# Instalación de Kaptura para socios

Esta guía instala la app móvil, el backend y la web de entrega de fotografías para pruebas internas. No requiere editar archivos de código. Sí requiere instalar las herramientas de desarrollo, copiar la configuración privada que entregue Andrés y contar con autorización de firma para instalar en un iPhone físico.

**Los archivos `.env` y `.env.local`, credenciales de prueba, accesos a GitHub y material privado de firma deben solicitarse a Andrés Manrique. No están incluidos en GitHub. No compartas esos archivos por un repositorio, captura de pantalla ni grupo público.**

## Qué solicitar antes de comenzar

- Acceso a los tres repositorios indicados abajo.
- `WEB/backend/.env`, preparado para una base local nueva o para el entorno de pruebas autorizado. No usar la base de producción para instalar ni probar.
- `APP/mobile/.env.local`, preparado para la dirección del backend accesible desde el dispositivo.
- `WEB/front/.env`, si el entorno entregado lo necesita. El frontend local ya envía `/api` al backend del mismo equipo en el puerto 4000; la pantalla de entrega no usa `VITE_API_URL` para cambiar ese destino.
- Para ejecutar un backend propio: la clave privada Ed25519 que corresponda a la clave pública de esta app, por un canal seguro. Se ubica según `OFFLINE_SIGNING_KEY_FILE`; normalmente en `WEB/backend/.secrets/offline-ed25519.pem`. **No generar otra clave al azar**: los permisos offline dejarían de validarse. Esta clave solo pertenece al servidor, nunca a la app ni a la web.
- Para iPhone físico: acceso al equipo de desarrollo Apple de Kaptura, registro del dispositivo y permisos de firma, o una compilación instalable proporcionada por Andrés. No cambiar el identificador de la app ni desactivar Keychain para resolver un error de firma.

Si Andrés proporciona un backend y una web ya levantados, solo es necesario instalar la app. No copiar las credenciales R2 ni la clave privada del backend al teléfono.

## Herramientas

Los comandos están escritos para una terminal de macOS. iOS requiere un Mac; Android también puede compilarse en Windows o Linux con las herramientas equivalentes.

- Git y acceso a GitHub.
- Node **24.15.0** y npm. Usar los archivos de bloqueo existentes; no actualizar dependencias para instalar.
- Docker con Compose si se utilizará MariaDB local.
- iOS: Xcode con sus herramientas de línea de comandos y un simulador instalado. El proyecto exige iOS **18.0 o superior**; la configuración de trabajo usa Xcode 27. Ruby y Bundler deben poder instalar el `Gemfile` del proyecto.
- Android: JDK **17**, Android Studio, SDK Platform **36**, Build Tools **36.0.0**, NDK **27.1.12297006** y un emulador o dispositivo Android **11 o superior**. Configurar el SDK mediante Android Studio o `ANDROID_HOME`; no versionar `android/local.properties`.

## Descargar la versión correcta

Desde la carpeta donde quieras trabajar:

```sh
mkdir -p ViralCo/APP ViralCo/WEB
cd ViralCo
git clone --branch feature/modos-espejo https://github.com/andresfeego/app-viralco.git APP/mobile
git clone --branch feature/modos-espejo https://github.com/andresfeego/backend-viralco.git WEB/backend
git clone --branch and_fase_2_1 https://github.com/andresfeego/web-viralco.git WEB/front
```

Estas son las ramas de esta entrega; no sustituirlas por `main`. Si ya existen las carpetas, no repetir el clonado: seguir la sección de actualización. El instructivo queda en `APP/mobile/INSTALACION_SOCIOS.md`, dentro del repositorio de la app.

## Configuración privada y direcciones

Copiar los archivos recibidos en las ubicaciones indicadas, conservando sus nombres. Los `.env.example` son referencias sin secretos, no reemplazan los archivos preparados por Andrés.

| Archivo | Uso |
| --- | --- |
| `WEB/backend/.env` | Base de datos, tokens, medios R2, comprobantes privados, dirección de la web y firma offline |
| `APP/mobile/.env.local` | Dirección pública del backend y activación de atajos internos de prueba |
| `WEB/front/.env` | Configuración del entorno web, cuando corresponda |
| `WEB/backend/.secrets/offline-ed25519.pem` | Firma privada de permisos offline; ubicación modificable desde el `.env` del backend |

La app incorpora únicamente `VIRALCO_API_URL` y `VIRALCO_DEBUG_LOGIN_PRESETS` al compilar. La prioridad es: variables de la terminal, `.env.local`, `.env`. No se incluyen otras variables del entorno en el bundle mediante este mecanismo.

- `VIRALCO_API_URL` es el origen del backend, por ejemplo `https://api.ejemplo.com`, **sin `/api`**, usuario ni contraseña. Para un servidor local puede ser `http://nombre-del-equipo.local:4000` o la dirección de red que indique Andrés.
- En Debug, si no se define esa URL, la app busca el backend en el equipo que sirve Metro, puerto 4000. En una compilación autónoma para teléfono se debe definir explícitamente una dirección alcanzable.
- El móvil físico no debe usar `localhost` para acceder al computador. Ambos deben estar en la misma red local si se usa un backend local. Permitir la red local en iOS y los puertos 4000, 5173 y 8081 en el firewall de desarrollo.
- `PUBLIC_WEB_URL`, en el backend, debe apuntar a la web accesible desde el teléfono que leerá el QR. `http://localhost:5173` no sirve para invitados desde otro teléfono.
- Los comprobantes de pago usan un bucket R2 privado separado de los medios. No habilitarle dominio público ni `r2.dev`.

Si cambia la red o la dirección del servidor, pedir a Andrés la configuración actualizada. Después de cambiar el entorno móvil, detener Metro y arrancarlo con `npm start -- --reset-cache`; una app Release necesita volver a compilarse.

## Backend en un entorno nuevo

**Solo seguir esta inicialización si Andrés confirmó que el `.env` apunta a una base de pruebas nueva y propia. Si apunta a un servidor compartido ya preparado, no ejecutar migraciones, seeds ni bootstrap por cuenta propia.**

Desde `ViralCo/WEB/backend`:

```sh
npm ci
npm run db:local:up
docker compose -f docker-compose.mariadb.yml ps
```

Esperar a que MariaDB esté `healthy`. El contenedor incluido publica el puerto 3307. El `.env` recibido debe corresponder a este contenedor si se sigue esta ruta; no cambiar las credenciales del código para adaptarlo.

Inicializar únicamente la base nueva:

```sh
npm run db:migrate
npm run db:seed
npm run db:bootstrap-super-admin
npm run db:bootstrap-platform-account
npm run db:bootstrap-global-library
```

Los seeds son de instalación, **no un paso habitual de actualización**: uno reemplaza los posts de demostración y los presets pueden cambiar contraseñas de prueba. `BOOTSTRAP_SUPER_ADMIN_*` debe venir preparado por Andrés; el bootstrap también puede actualizar esa contraseña. Los usuarios de demostración solo se crean si `SEED_DEMO_USERS=true` y no es producción. No se deben usar para datos reales.

La biblioteca global se reconstruye desde los manifiestos y R2. Si falta un archivo de origen o un permiso, detenerse y avisar a Andrés; no resetear la base ni vaciar el bucket. Las tarifas COP y opciones bancarias se administran desde Superadmin. En una base nueva pueden requerir configuración antes de crear órdenes; no inventar datos de transferencia.

Arrancar la API y dejar esta terminal abierta:

```sh
npm run dev
```

En otra terminal, `curl http://localhost:4000/health` debe devolver `{"ok":true}`. Esta comprobación solo verifica que la API responde; el inicio de sesión y la biblioteca comprueban sus dependencias.

Para ejecutar el backend compilado se utiliza `npm run build` y después `npm start`, en lugar de `npm run dev`. No abrir dos servidores en el mismo puerto.

## Web para las fotos y los códigos QR

Desde `ViralCo/WEB/front`, en otra terminal:

```sh
npm ci
npm run dev
```

Abrir `http://localhost:5173`. La foto entregada vive en `/photos/<identificador>` y se abre con el enlace generado por Kaptura después de sincronizar una composición. La página inicial es una presentación, no un panel de administración.

El servidor de desarrollo redirige `/api` a `http://127.0.0.1:4000`. Si se usa un backend remoto, solicitar a Andrés una web desplegada o el entorno preparado para ese backend; no basta con cambiar `VITE_API_URL`.

En un despliegue, `npm run build` produce `dist`. El servidor que publique esa carpeta debe resolver las rutas SPA hacia `index.html` y redirigir `/api` al backend autorizado. `npm run preview` no sustituye esa configuración de despliegue.

## Instalar la app y abrir Metro

Desde `ViralCo/APP/mobile`:

```sh
npm ci
npm start
```

Dejar Metro abierto y utilizar otra terminal para instalar. `npm ci` aplica automáticamente el parche versionado de captura de imágenes: no utilizar `--ignore-scripts` ni omitir la carpeta `patches`.

### Simulador de iPhone

Desde `ViralCo/APP/mobile`:

```sh
bundle install
cd ios
bundle exec pod install
cd ..
npm run ios -- --no-packager
```

También se puede abrir `ios/kaptura.xcworkspace` en Xcode, seleccionar el esquema `kaptura`, un simulador disponible y pulsar Run. Usar el workspace, no el archivo `.xcodeproj`. La cámara simulada utiliza la señal de prueba incluida; no certifica la cámara ni la impresión física.

Si Xcode no encuentra Node, abrirlo desde una terminal donde Node esté disponible. Si necesita `ios/.xcode.env.local` con la ruta particular de Node, pedir ayuda a Andrés para prepararlo; ese archivo es local y no debe subirse a GitHub.

### iPhone físico

1. Conectar y desbloquear el iPhone, aceptar la confianza del computador y habilitar el modo desarrollador cuando iOS lo solicite.
2. Tener disponible en Xcode la cuenta autorizada para el equipo de desarrollo de Kaptura.
3. Abrir `ios/kaptura.xcworkspace`, elegir el esquema `kaptura` y el iPhone como destino, y ejecutar Run en Debug.
4. Aceptar los permisos de red local, cámara y fotos cuando sean necesarios. Mantener Metro abierto y accesible desde el iPhone.

Si Xcode rechaza el equipo, certificado, perfil o dispositivo, pedir a Andrés habilitarlo o entregar una compilación firmada. No desactivar la firma ni los entitlements: se necesitan para guardar la sesión de forma segura. Cambiar el identificador o desinstalar la app puede perder acceso a datos locales, por lo que no se utiliza como solución de instalación.

Para pruebas realmente offline, solicitar una **Release autónoma** con la configuración apropiada. Debug depende de Metro y no sirve para probar un arranque en frío sin computador. Los accesos rápidos del login son para pruebas internas; no distribuir esta entrega como una versión pública de tienda.

### Android

Abrir un emulador desde Android Studio o conectar un dispositivo con depuración USB autorizada. Desde `ViralCo/APP/mobile`:

```sh
npm run android -- --no-packager
```

Para conectar un dispositivo USB a Metro y al backend del computador se puede usar:

```sh
adb reverse tcp:8081 tcp:8081
adb reverse tcp:4000 tcp:4000
```

Si se usa una URL de API explícita, debe seguir siendo accesible desde el dispositivo. Para varios teléfonos conectados, seleccionar el dispositivo antes de ejecutar los comandos. Esta es una instalación Debug interna; la configuración de firma Android existente no es una firma de publicación en Play Store.

## Comprobar la instalación

1. Iniciar sesión con una cuenta de pruebas proporcionada por Andrés. Los tres puntos del login no crean usuarios ni activan suscripciones.
2. Abrir cuentas, eventos y recursos; confirmar que la cuenta tenga permiso vigente y que los medios se descarguen.
3. Configurar un evento de prueba, guardar y publicar. Antes de lanzar, comprobar que terminó de descargar la publicación y sus recursos.
4. Capturar, componer y sincronizar una foto. Abrir su QR desde otro dispositivo con acceso a la web configurada.
5. En Superadmin, comprobar Catálogo y Cobros. Los destinos de transferencia se agregan en tarjetas y solo los activos aparecen al solicitar un pago. No reportar transferencias ficticias sobre cuentas reales.
6. Para impresión, usar un teléfono físico y seguir [la guía de perfiles de impresión](docs/espejo-magico-perfiles-impresion.md). La Canon CP1500 se conecta por Wi-Fi o conexión directa de la impresora, no Bluetooth. Las pruebas físicas con las impresoras de los socios siguen siendo necesarias.

## Actualizar sin borrar información

Finalizar cualquier lanzamiento en curso y conservar las capturas pendientes. En cada repositorio, estando en su rama indicada y sin cambios locales pendientes:

```sh
git pull --ff-only
npm ci
```

- Backend local propio: hacer respaldo, ejecutar `npm run db:migrate` y reiniciar la API. **No repetir seeds, resets ni bootstrap de usuarios.** En un backend compartido, coordinar el despliegue con Andrés.
- iOS: después de actualizar dependencias nativas, repetir `bundle install` y `bundle exec pod install` desde `ios`; reconstruir sobre la instalación existente.
- Android: volver a ejecutar la instalación Debug sin desinstalar previamente.
- Metro: reiniciarlo después de cambios de entorno o dependencias. Web: reiniciar su servidor o volver a generar el build.

No ejecutar `db:reset`, `db:rollback`, `db:local:reset:volume` ni `docker compose down -v` como parte de una actualización. Tampoco ejecutar `npm run test:integration` sobre bases de trabajo: esa tarea incluye seeds y operaciones de inicialización. Si Git indica conflictos, detenerse; no usar un reset para descartarlos.

## Problemas frecuentes

| Síntoma | Comprobación |
| --- | --- |
| No inicia sesión o no carga listas | Revisar API, conectividad, `.env.local` y permisos de red local. Confirmar las credenciales con Andrés |
| Falta un módulo nativo | Ejecutar `npm ci`, instalar pods en iOS y reconstruir. Recargar solo JavaScript no agrega módulos al binario |
| Error de firma o Keychain | Pedir revisión del equipo, perfil y registro del iPhone. Conservar los entitlements existentes |
| No valida el permiso offline | Confirmar la clave privada del backend correspondiente a esta versión y realizar una primera conexión autorizada |
| QR no abre desde otro teléfono | Revisar `PUBLIC_WEB_URL`, web levantada, acceso a la red y proxy `/api` |
| R2 o comprobantes no funcionan | Pedir a Andrés las credenciales y permisos del bucket correcto. No hacer público el bucket de comprobantes |
| No puede crear órdenes de pago | Revisar tarifas COP válidas, disponibilidad comercial y al menos un destino de transferencia activo |

Enviar a Andrés el paso donde ocurre el fallo, dispositivo, versión y mensaje visible. Los logs y capturas que se compartan no deben contener contraseñas, tokens, claves privadas, comprobantes ni información bancaria personal.
