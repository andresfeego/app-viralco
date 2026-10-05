# Preparación y lanzamiento sin conexión

Publicar en servidor no descarga automáticamente una configuración a todos los dispositivos.
Cada dispositivo debe abrir **Lanzar → Preparar lanzamiento**. Si hay conexión, consulta la
publicación vigente y descarga automáticamente cuando falta el paquete o cambió la publicación.
La pantalla muestra la publicación del servidor cuando puede consultarlo y la publicación local
verificada. Solo marca disponible un paquete completo; comprueba archivos, tamaños y hashes
cuando existen. Muestra progreso tanto al descargar como al verificar archivos existentes.

La descarga conserva el paquete anterior si falla. La confirmación del lanzamiento muestra
el número real de la publicación utilizada, incluso al recuperar capturas de una anterior.
Reconectar comprueba la publicación mientras esta pantalla está abierta; no sustituye silenciosamente
una configuración durante la experiencia activa. No se pregunta si se quiere descargar.
La nueva publicación reemplaza el paquete activo solamente tras verificar todos sus recursos.
Las capturas históricas y los archivos que utilizan permanecen disponibles; no se borran al actualizar.
Preparación, confirmación y creación del patrón comparten un único modal nativo para evitar
presentar un modal mientras iOS todavía está cerrando el anterior (especialmente en el camino offline).

Sin conexión se puede iniciar una sesión nueva desde el paquete descargado, no solamente
reanudar una sesión anterior. No se espera una respuesta del servidor ni la subida de fotos.
La sesión local conserva su publicación inmutable. Al reconectar, se registra idempotentemente
como sesión histórica para subir sus resultados, sin ocupar ni desplazar la sesión activa de otro
dispositivo. El QR requiere la sincronización del resultado, no basta con tener internet.

El patrón de recuperación se descarga durante la preparación y sigue siendo independiente
de la publicación. La ausencia de patrón es válida; la imposibilidad de consultar si existe no
permite dar por completada una nueva preparación. La clave temporal del lanzamiento no cambia.

## Arranque completo offline (actualización)

Después del primer acceso conectado, se guardan el perfil y los tokens en Keychain/Keystore
con `react-native-keychain`, sin guardar la contraseña. Los datos heredados se migran al
almacenamiento protegido. En esta actualización hay que abrir una vez con conexión para
obtener el perfil que la versión anterior no persistía.

El arranque restaura primero ese perfil y no espera `/auth/me`. Un timeout no borra la sesión.
La consulta al servidor se hace en segundo plano al abrir, recuperar foco y reconectar.
Cerrar sesión sí elimina el acceso local, pero no las fotos pendientes. Una reinstalación
no restaura inadvertidamente credenciales que hayan quedado en Keychain.

El catálogo se guarda por usuario: cuentas, eventos, detalles, permisos, tipos y modos.
Al preparar un evento también se asegura su contexto de navegación. Logos descargados y
recursos de lanzamiento se conservan en Documents; las referencias de la caché anterior
se migran mediante copia verificada, sin borrar los originales.

Antes de registrar una sesión offline o subir una composición/original, y nuevamente justo
antes de usar una URL de subida, se consulta `GET /api/events/:id/modes/:mode/operation-access`.
Esta consulta nunca usa caché: exige sesión válida, cuenta activa, permiso `capture.operate`,
evento activo y modo habilitado. El backend comprueba esos mismos requisitos al preparar
y completar cada captura/composición. Las URLs prefirmadas ya emitidas tienen su propia
vigencia; no se afirma revocación retroactiva de bytes que ya estaban en tránsito.

Una denegación 401/403/404/409 queda persistida por usuario/evento/modo y bloquea nuevos
lanzamientos y subidas, incluso si se vuelve a modo avión. Un resultado desconocido por
timeout o error 5xx no permite sincronizar. Nada de esto elimina las fotos. Las operaciones
conocidas se revalidan al reconectar aunque ya no aparezcan en la lista de cuentas.
La bandeja local también se procesa al recuperar la sesión online, aunque no esté abierta
la pantalla de lanzamiento; cada archivo pendiente pasa por la misma autorización en vivo.

El acceso offline conservado es operativo; las superficies administrativas se restringen
cuando no se ha confirmado la conexión/sesión. Los datos y la publicación descargada pueden
estar desactualizados mientras no exista contacto con el servidor.

## Límites explícitos

- Se requiere haber accedido al evento y preparado el dispositivo con conexión y permisos.
  El primer ingreso y los recursos todavía no descargados requieren conexión.
- Sin servidor no se puede saber si existe una publicación posterior o si se revocaron permisos.
  Una denegación recibida del servidor invalida el paquete disponible para ese usuario.
- Los archivos preparados se conservan en almacenamiento persistente. Si se elimina la app
  o sus datos, hay que descargar de nuevo; se verifica su integridad antes de lanzar.
- No se añaden tablas, migraciones ni impresión. La actualización automática ocurre al preparar,
  nunca a mitad de una experiencia.

## Prueba manual en iPhone

1. En un evento activo, abrir Lanzar. Verificar descarga automática, número y progreso de recursos.
2. Salir, activar modo avión, volver a Lanzar desde el evento ya abierto y confirmar el número.
3. Crear patrón, completar fotos y otra experiencia. Salir y volver a lanzar aún sin conexión.
4. Reconectar y revisar sincronización y QR de los resultados; no debe cambiar el diseño activo.
5. Publicar una configuración distinta desde otro dispositivo. Comprobar actualización automática;
   las fotos pendientes anteriores deben conservar su publicación y geometría originales.
6. Interrumpir una descarga y comprobar que no aparece disponible un paquete parcial.
7. Revisar recuperación con patrón descargado, tema claro/oscuro, orientación, texto largo y Dynamic Island.
8. Cerrar completamente, activar modo avión, reiniciar el teléfono, desbloquearlo y entrar:
   deben aparecer el perfil y los eventos guardados y funcionar el lanzamiento preparado.
9. Con fotos pendientes, revocar el acceso desde otra sesión y reconectar: comprobar que no
   empieza ninguna subida, que se conservan originales/resultados y que modo avión no restaura
   el acceso revocado. Repetir con timeout/500: sincronización pendiente, no autorización implícita.

La prueba tras reinicio debe hacerse con una compilación Release que incluya `main.jsbundle`,
no con la compilación Debug dependiente de Metro. La firma de desarrollo del iPhone conserva
su vencimiento normal; el funcionamiento offline no elimina esa restricción de instalación.

También en simulador se debe conservar la firma y los entitlements de Keychain definidos en
`ios/kaptura/kaptura.entitlements`: no compilar con `CODE_SIGNING_ALLOWED=NO`. Una app sin
esos permisos puede abrir, pero falla al guardar la sesión con `errSecMissingEntitlement`.

Temporalmente, `ENABLE_INTERNAL_RELEASE_LOGIN_PRESETS` en `src/config/debug.js` habilita
los tres accesos a usuarios de prueba también en Release autónoma. Antes de distribuir una
compilación de producción debe cambiarse a `false` y reconstruirse la aplicación. Solo rellena
el formulario: no evita la autenticación ni concede permisos adicionales.

Referencias del almacenamiento protegido: [API de react-native-keychain](https://oblador.github.io/react-native-keychain/docs/api/)
y [acceso después del primer desbloqueo, solo en este dispositivo](https://developer.apple.com/documentation/Security/kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly).

La interfaz reutiliza GuestModal, AppButton y StatusBadge. Usa los tokens y temas de
viralco-ui-guardrails y el Stack del contenedor de Every Layout, sin CSS ajeno ni comp_hardcode.
