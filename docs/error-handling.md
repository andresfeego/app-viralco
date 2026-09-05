# Manejo de errores en Kaptura

`apiRequest` es el limite comun de seguridad para todas las APIs mobile. Convierte cada fallo en `ApiError` y conserva internamente `status`, `code`, `requestId` y `clientErrorId`, pero su propiedad visible `message` nunca contiene SQL, stack traces, rutas locales, errores de red o mensajes de drivers.

Las pantallas usan `userErrorMessage(error, fallback)` antes de presentar un error. `ToastProvider` vuelve a aplicar la misma proteccion como defensa final y no muestra detalles secundarios en toasts de error. Login presenta el error exclusivamente mediante toast.

Los fallos tecnicos del cliente se guardan de forma acotada en AsyncStorage bajo `kaptura_technical_errors_v1`:

- Maximo 50 registros.
- Sin cuerpos de peticion ni credenciales.
- Tokens y autorizaciones redactados.
- Correlacion mediante `requestId` del backend o `clientErrorId` local.

Los errores esperados, como credenciales invalidas o validaciones de formulario, conservan mensajes accionables. Los inesperados muestran el mensaje generico traducido `error_000`.

La auditoria cubre login, registro, recuperacion de contrasena, cuentas, detalle de cuenta, eventos, recursos, configurador de Espejo, perfil, permisos, bootstrap de sesion, Super Admin y la pantalla heredada de posts.
