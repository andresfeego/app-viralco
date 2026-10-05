# Recuperación de acceso al lanzamiento

- Configuración del espejo → Operación → Menú del operador → Recuperación de acceso.
- Solo propietario, administrador de la cuenta o superadministrador pueden guardar el patrón, confirmado dos veces.
- El patrón pertenece al modo Espejo de ese evento. Se guarda inmediatamente en una tabla independiente: no cambia revisión, borrador ni publicación.
- En lanzamiento se acepta el patrón temporal o el de recuperación. Después de desbloquear, “Cambiar patrón del lanzamiento” reemplaza únicamente el temporal, sin borrar capturas.
- El patrón temporal permanece en memoria y desaparece al salir. El servidor conserva un verificador bcrypt con coste 12, nunca los nodos originales. Los dispositivos autorizados descargan ese verificador para comprobación local y offline; el caché se separa por usuario, cuenta, evento y modo.
- Con la pantalla activa y conexión se refresca al entrar, al abrir el desbloqueo y cada 30 segundos. Una actualización remota no puede llegar a un dispositivo sin conexión: allí funciona el último verificador descargado. Un rechazo 401/403/404 elimina el verificador local.
- Cinco intentos fallidos bloquean 30 segundos; cerrar el modal no borra el contador persistente.
- Este control protege la operación de la fotocabina, no reemplaza permisos de cuenta ni autenticación del servidor. Un patrón 3×3 tiene baja entropía; un dispositivo comprometido puede atacar el verificador offline. El caché se almacena en el almacenamiento privado de la app, no en un enclave hardware.

## Prueba manual en iPhone

1. Definir recuperación como administrador, sin guardar ni publicar diseño.
2. Lanzar con un patrón temporal distinto y abrir el círculo con pulsación de tres segundos.
3. Desbloquear con cada patrón y reemplazar el temporal desde el menú. Confirmar que las capturas permanecen.
4. Con recuperación ya descargada, desconectar internet y comprobar el desbloqueo.
5. Conectar y cambiar recuperación desde otro dispositivo. Esperar la sincronización y comprobar que el nuevo reemplaza al anterior.
6. Comprobar cinco fallos, cierre/reapertura del modal y bloqueo de 30 segundos; revisar área segura y tema claro/oscuro.
