# Suscripciones por transferencia

## Puesta en marcha

1. Entrar como superadmin y abrir Catálogo. Configurar tarifas enteras en COP por modo para 30 y 365 días, descripción, características y disponibilidad. No se convierten precios históricos en USD. Los modos sin implementación compatible permanecen como borrador comercial.
2. En Cobros → Datos para transferencia, agregar una o varias opciones bancarias y marcar las activas. Se muestran en tarjetas horizontales; el cliente elige entre las activas. No introducir credenciales de banca. Sin una opción activa y precios válidos no se pueden crear órdenes. Editar o desactivar un destino no modifica los datos guardados en órdenes anteriores.
3. Como dueño o administrador, abrir el detalle de cuenta → Suscripción y pagos. Seleccionar modos y periodicidad común, generar la orden y reportar la transferencia con importe, fecha, referencia y comprobante JPG, PNG o PDF de hasta 10 MB.
4. Revisar desde Cobros: abrir el comprobante privado, verificar el ingreso bancario y aprobar expresamente el importe exacto o rechazar con motivo. Un comprobante pendiente no activa servicios. La advertencia de duplicados exige revisión humana; no reemplaza conciliación bancaria.
5. Después de aprobar, conectar cada dispositivo para renovar su autorización offline. No existe cobro automático ni notificación externa.

## Datos y despliegue

- Backend: migración aditiva `20261005150000_manual_billing.cjs`. No ejecutar resets para instalarla. El historial financiero no se elimina mediante rollback automático.
- La transición concede una sola cortesía de 30 días a cuentas existentes activas con suscripción activa o en prueba; no reactiva bloqueos administrativos. No registra pagos ficticios.
- Configurar `BILLING_R2_BUCKET_NAME`, `BILLING_R2_ACCOUNT_ID`, `BILLING_R2_ACCESS_KEY_ID`, `BILLING_R2_SECRET_ACCESS_KEY` y región `auto`. El bucket debe permanecer sin dominio público ni r2.dev. No reutilizar la biblioteca pública. Los enlaces autorizados de comprobantes expiran a los 120 segundos.
- Configurar `OFFLINE_SIGNING_KEY_FILE` con una clave Ed25519 privada persistente y protegida. En desarrollo está en `.secrets/offline-ed25519.pem`, excluida de Git. Respaldarla por un canal seguro: no copiarla a documentación, repositorio, app ni logs.
- La app incorpora únicamente la clave pública correspondiente en `offlineBillingGrant.js`. Otro servidor debe usar la clave privada correspondiente; una rotación exige planificar la actualización de las claves confiables y la renovación de autorizaciones. No generar una clave nueva en cada arranque o despliegue.
- Los permisos offline anteriores sin firma no son aceptados por esta versión. Es necesaria una conexión inicial después de actualizar.

## Vigencia y continuidad

La vigencia se evalúa por fecha en las operaciones protegidas. El proceso periódico solo actualiza la representación de estados; no sustituye ese control. Cada cuenta mantiene su propio período, y una renovación anticipada comienza al terminar el anterior. Las órdenes conservan sus precios y datos bancarios aunque el catálogo cambie.

Al vencer se conserva acceso de consulta y pago, pero no nuevas operaciones protegidas ni sincronización de pendientes anteriores. Un lanzamiento autorizado que siga vivo en el mismo proceso puede terminar y sincronizar sus propias capturas. Al salir o cerrar el proceso pierde esa excepción. Una revocación o bloqueo administrativo prevalece al comprobarse con el servidor.

Las autorizaciones firmadas se vinculan a usuario, cuenta, dispositivo, evento y servicios. Se conserva una referencia temporal del servidor y se detectan retrocesos del reloj. Esto no garantiza revocación instantánea sin red ni protección absoluta en dispositivos manipulados.

## Verificación de esta entrega (2026-10-05)

- Backend: 146 pruebas unitarias aprobadas; 7 pruebas de integración de cobros y 16 de integración de autenticación/cuentas en base aislada. Build aprobado.
- Mobile: 70 suites / 370 pruebas aprobadas; lint sin errores (9 advertencias existentes). Compilaciones iOS Release para dispositivo y simulador y Android debug aprobadas.
- Release instalada y abierta en iPhone y simulador conservando datos y Keychain. Backend y Metro responden.
- Almacenamiento privado probado con un objeto sintético: acceso firmado válido y acceso sin firma rechazado; objeto de prueba retirado. No se usaron comprobantes reales.
- Guardrails: componentes y tokens existentes, textos español/inglés, colores de tema y modal seguro. Every Layout: separación desde contenedores, filas con wrapping y `minWidth: 0`.

## Checklist manual pendiente

- Recorrer Catálogo, Cobros y Suscripción y pagos en claro/oscuro, dispositivos pequeños y orientación horizontal; revisar teclado, wrapping, scroll y targets táctiles.
- Adjuntar JPG, PNG y PDF desde iPhone; comprobar visualización privada, rechazo con motivo, nuevo reporte y aprobación con importe exacto.
- Verificar renovación anticipada/vencida, avisos a siete días y bloqueo exacto con una cuenta de prueba, sin cambiar el reloj de un dispositivo de trabajo.
- Lanzar antes de vencer, continuar en segundo plano y confirmar que solo esa sesión puede sincronizar; cerrar la app y comprobar bloqueo del siguiente lanzamiento.
- Repetir reconexión con revocación, cambio de servicios y renovación; confirmar que capturas pendientes se conservan.
- No se certifica una transferencia bancaria real mediante pruebas automatizadas. La confirmación corresponde siempre al superadmin.

Para instalar el entorno de pruebas, seguir [la guía para socios](../INSTALACION_SOCIOS.md). Solicitar los archivos privados a Andrés Manrique.
