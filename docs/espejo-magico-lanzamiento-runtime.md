# Kaptura — lanzamiento operativo de Espejo Mágico

## Acceso y recuperación

Desde el detalle de un evento activo, el botón Play de Espejo abre una superficie operativa a pantalla completa. Al entrar, Kaptura recupera el identificador permanente de instalación, consulta la sesión activa y descarga el paquete fijado de configuración y recursos. Si la app se reinicia, reutiliza esa sesión y el estado local de la experiencia en curso.

Un lanzamiento contiene muchas experiencias de invitados. “Siguiente persona” cierra solamente la experiencia actual; “Finalizar evento” cierra la sesión completa.

## Preflight

Antes de habilitar “Iniciar experiencia” se comprueba:

- versión publicada;
- manifiesto descargado y verificado;
- permiso y disponibilidad de cámara;
- espacio local suficiente.

El primer lanzamiento requiere red. Después de cachear el paquete, una pérdida de conectividad muestra el estado “Sin conexión · guardado local” y no bloquea las capturas.

## Flujo de invitado

1. Pantalla/animación de inicio configurada.
2. Animación previa, si está habilitada.
3. Cuenta regresiva inicial o entre tomas.
4. Captura real con lente y flash publicados.
5. Animación posterior a cada captura.
6. Revisión y repetición individual.
7. Animación de procesamiento, cuando está configurada, mientras se genera la composición.
8. Composición con el mismo contrato visual utilizado por el editor: slots, fondos, marcos, stickers, textos, rotaciones y tira duplicada.
9. Entrega local inmediata; sincronización en segundo plano.

Cada captura se mueve desde el archivo temporal de cámara hacia Documents antes de intentar la red. El resultado compuesto también se guarda allí. AsyncStorage conserva la máquina de estados y referencias de archivo; la caché del manifiesto vive separada de los archivos recuperables.

## Sincronización y entrega

- La cola usa UUID del cliente y hashes SHA-256 para reintentar sin duplicar registros.
- Primero crea el registro backend, después usa el PUT firmado y finalmente confirma tamaño/hash.
- Compartir y guardar usan el archivo local.
- El QR se muestra únicamente cuando el entregable tiene `publicHash` sincronizado.
- Al recuperar conectividad se reintentan la experiencia activa y las completadas pendientes.
- Si se solicita finalizar sin red, la intención queda pendiente y se confirma al reabrir con conexión.

## Composición y layout

Se aplicaron `viralco-ui-guardrails` y Every Layout: la pantalla reutiliza `AppButton`, `SurfaceCard`, `StatusBadge`, `IconTextButton`, `MediaPreview` y tokens. La estructura traduce Cover para la cámara/estado principal, Stack para el flujo vertical, Cluster con wrapping para acciones y Frame para cámara/resultado. No se añadieron valores visuales ajenos al sistema y se mantienen temas claro/oscuro.

## Prueba manual requerida

En iPhone real validar permiso de cámara, captura de 1 y varias tomas, repetición, composición, compartir/guardar, pérdida y retorno de Wi-Fi, reinicio durante revisión, QR después de sincronizar y exclusión al intentar abrir el mismo modo desde otro dispositivo. La inspección visual del simulador no sustituye las pruebas de cámara física.

Jest, lint, bundle iOS, build nativo del simulador iOS y `assembleDebug` Android quedaron verificados antes de la entrega. Lint conserva ocho advertencias heredadas fuera del runtime y cero errores.
