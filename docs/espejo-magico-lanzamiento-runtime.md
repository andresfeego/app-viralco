# Kaptura — lanzamiento de Espejo Mágico

## Recorrido del invitado

Patrón temporal (crear y confirmar) → inicio en bucle → toque en cualquier parte → animación previa una vez → cámara completa con cuenta regresiva → disparo automático → procesamiento mínimo tres segundos. Repetir el ciclo desde inicio si faltan tomas; tras la última, mostrar composición.

- Un único toque en inicio activa toda la secuencia por toma, también al repetir. No hay segundo toque para abrir cámara, disparar ni componer. El contador tiene su centro horizontal en mitad de pantalla y su centro vertical al 30 % desde abajo.
- La carga comprueba publicación, recursos locales y espacio. No exige confirmar una cámara pequeña; los permisos y disponibilidad se comprueban al abrir la cámara.
- `start` permanece en bucle hasta tocar; `beforeCountdown` termina con el video, una sola vez. `afterCapture` queda fuera del lanzamiento. Un fallo de video ofrece reintentar/omitir. `processing` se reproduce al menos tres segundos después de cada captura y, en la última, hasta que la composición esté lista. Sin video de procesamiento se muestra una alternativa funcional.
- El primer conteo usa `firstCountdownSeconds`; siguientes y repeticiones usan `nextCountdownSeconds`. `reviewSeconds` sigue siendo compatible en el contrato, pero ya no introduce una pantalla de revisión. Se respetan switches y selección aleatoria. Sin inicio/previa activados se omiten esas etapas; tras una interrupción o error se requiere un toque explícito para reintentar.
- La frontal es predeterminada. Solo la vista en vivo se refleja; los archivos y textos no. El operador cambia/reinicia cámara entre tomas.
- La cámara se selecciona por capacidades; preparación informa si falta el ultra gran angular. La orientación del archivo sigue la interfaz, sin depender del acelerómetro.
- Flash de pantalla. JPEG diferencia media (0,75), alta (0,92) y superior (1), manteniendo dimensiones publicadas del resultado.

## Resultado y entrega

La composición completa se centra según sus dimensiones reales y el espacio disponible. No contiene números, bordes de edición ni fondo dependiente del tema. Tocar una toma permite repetirla, conservar las demás y recomponer automáticamente.

`MirrorOutputComposer` comparte capas con `CanvasContent`, no la superficie del editor. Respeta orden, recortes, rotaciones y las dos copias de una tira. Editor y resultado escalan texto con la misma anchura de referencia del lienzo. Espera imágenes y fuentes locales antes de generar el JPEG; no entrega silenciosamente una fuente de respaldo cuando falta la solicitada. Android admite fuentes del paquete desde almacenamiento privado.

Compartir, guardar y QR se agrupan según opciones publicadas. Compartir/guardar usan el archivo local; QR solo muestra el identificador sincronizado del resultado vigente. Una respuesta de una composición anterior no cambia la visible.

El resultado permanece hasta una acción del invitado. Otra foto vuelve al ciclo desde inicio. No hay reinicio automático ni selector de su plazo; el campo histórico se tolera, pero no se ejecuta.

## Operador y galería

El círculo superior izquierdo exige una pulsación de tres segundos y el patrón 3×3 para abrir operador. Está presente también en los modales. El panel permite cambiar/reiniciar cámara, cancelar experiencia con confirmación, galería local y salir al evento. Owner/admin también puede confirmar Configurar evento: conserva capturas, cierra la sesión y abre el configurador completo. El menú permanece accesible durante transiciones; cambiar cámara se bloquea durante el disparo y la salida espera el guardado de la captura en curso.

El patrón se crea y confirma antes de cada lanzamiento; vive solo en memoria, nunca se serializa ni registra en logs. Requiere cuatro puntos y bloquea 30 segundos tras cinco intentos fallidos. Al salir o cerrar la app se descarta. No hay recuperación mediante contraseña administrativa. El acceso protegido sustituye al interruptor histórico `operatorMenuEnabled`; permisos de edición siguen vigentes.

La galería reúne composiciones del evento en este dispositivo, incluyendo sesiones anteriores y el resultado actual, con su diseño original. Miniaturas y Otra foto están abajo a la izquierda; entrega abajo a la derecha. Cada toma del resultado tiene un botón numerado para repetirla. En galería hay selección, visor y archivado sin confirmación; impresión queda pendiente.

El archivado es compartido por evento: `assets.metadata.archived` conserva el estado sin borrar archivos ni originales y sin invalidar enlaces compartidos. Owner/admin consulta y restaura desde «Composiciones archivadas» en los detalles del evento. El índice local es una caché; una cola persistente conserva acciones sin conexión y migra una sola vez las marcas anteriores. Abrir las galerías o preparar el lanzamiento concilia la caché con el servidor. Después de subir una composición se reintenta su archivado pendiente. Las respuestas antiguas no sustituyen una acción local más reciente. Un dispositivo debe conectarse y abrir la galería para enviar sus marcas antiguas; una foto nunca subida aún no puede verse en otros dispositivos.

Compartir galería usa la selección, o todas las visibles si no hay selección. ZIP siempre incluye todas las composiciones visibles locales del evento (no archivadas); abre el menú nativo para Drive u otros destinos. Se genera en caché por bloques de 256 KiB con fflate, sin cargar toda la galería en memoria. Se valida espacio y límite ZIP clásico (menos de 4 GiB y 65.535 entradas), fallando explícitamente sin entregar un ZIP truncado. WhatsApp tiene acción directa; QR solo se habilita con resultado sincronizado vigente.

## Persistencia y recuperación

- La composición final se sincroniza automáticamente al terminar el procesamiento, antes de subir los originales. Su confirmación habilita el QR aunque queden originales pendientes; los errores posteriores no deshacen el acuse del resultado.
- R2 firma `x-amz-meta-sha256` como cabecera no trasladable a query y el cliente S3 usa `requestChecksumCalculation: WHEN_REQUIRED`, evitando el checksum automático de un cuerpo aún desconocido. Se verificó una composición real mediante PUT y confirmación de tamaño/hash.
- El QR recibe `publicUrl` del backend y abre la web `/photos/:hash`. `PUBLIC_WEB_URL` configura su origen; en este entorno es `http://192.168.20.188:5173`. Producción necesita un dominio público y proxy `/api` hacia backend. La URL firmada de R2 se obtiene al abrir la página, no se incrusta como dirección permanente del QR. En red local requiere que ambos teléfonos puedan acceder a esa red.

- Se mantienen `MirrorConfigV1`, publicación inmutable, endpoints, permisos y tablas. Sin migraciones ni reseed.
- Cada lanzamiento consulta la publicación vigente antes de recuperar una sesión. Si cambió y hay tomas pendientes, pregunta si continuar la versión anterior o conservarla archivada y usar la nueva. Sin tomas pendientes usa la nueva automáticamente. Nunca copia capturas entre versiones.
- El inicio acepta `expectedPublishedVersionId`; publicar e iniciar se serializan sobre el modo. Si cambia la publicación durante el inicio, el cliente vuelve a consultar una sola vez. Toda respuesta comprueba que sesión y configuración correspondan a la misma versión. El paquete local se separa por sesión y versión.
- Un fallo de video muestra Reintentar o Continuar sin video, sin avanzar silenciosamente. El registro técnico contiene etapa, versión, recurso y código nativo.
- Transiciones visibles concentradas en `guestSequenceReducer`; exclusión y generación bloquean dobles toques y resultados de operaciones interrumpidas.
- Segundo plano durante conteo, revisión, animación o composición cancela temporizadores y vuelve a espera. Nunca dispara al regresar sin otro toque.
- Recuperar una experiencia completa abre/genera resultado tras preparación; si faltan tomas, espera el siguiente toque.
- Cada disparo se mueve a Documents antes de depender de red. Acuses se combinan por UUID de captura/resultado, nunca reemplazan estado local ni selección.
- Las referencias locales se persisten como `storageRoot` (`captures`/`packages`) y `relativePath`, nunca como rutas absolutas del contenedor iOS. Al recuperar se reconstruyen `path`/`uri` con los directorios actuales y se verifican existencia, tamaño y SHA-256 disponible antes de elegir captura o composición.
- Compatibilidad: las rutas antiguas se recuperan por el sufijo de los directorios propios `kaptura-mirror-captures` y `kaptura-mirror-packages`. El siguiente guardado migra la referencia, sin mover ni borrar fotos. Esto también se aplica a resultados y sesiones archivadas.
- Un archivo ausente o ilegible conserva su registro con `localAvailable=false`; no cuenta como toma disponible. Si falta el resultado pero existen las tomas se recompone; si falta una toma se espera únicamente esa toma. Recursos de caché ausentes requieren conexión para descargarse de nuevo.
- Los errores distinguen inicio, cámara, guardado de toma, composición y guardado de resultado: mensaje funcional en toast y código/detalle técnico en el registro local existente. No se ejecuta eliminación automática de originales locales.
- Cerrar conserva experiencias y entregas en archivos de sesión locales. Pendientes se reintentan al reabrir con conexión. Backend admite subir experiencias iniciadas antes del cierre.
- Con originales desactivados, no se suben, pero sí se conservan en este dispositivo para repetir, recuperar y archivar. La limpieza automática anterior queda suspendida. Archivos ya eliminados por versiones anteriores no pueden recuperarse mediante este cambio.
- El archivo cerrado se congela antes de finalizar; respuestas tardías no recrean sesión activa ni sobrescriben el siguiente invitado.

## Composición visual

En iOS la exportación usa `renderInContext` para el subárbol estático del lienzo, sin incluir cámara ni video de procesamiento. El parche versionado `patches/react-native-view-shot+5.1.1.patch` incorpora la opción opt-in `kapturaExactPixels`: contexto a escala 1 y transformación desde los bounds del lienzo hasta las dimensiones publicadas. No basta con activar `useRenderInContext`: sin esa transformación la composición queda pequeña en una esquina y la escala Retina multiplica las dimensiones. `postinstall` aplica el parche y falla si no es compatible; cualquier actualización de la dependencia debe revisarlo. Requiere recompilar iOS, no solamente recargar Metro. Android conserva su estrategia existente.

Antes de aceptar un resultado se comprueba que el JPEG sea legible y tenga exactamente las dimensiones publicadas. Los errores nativos se conservan en el registro técnico; los toasts del lanzamiento usan exclusivamente mensajes funcionales propios de cada etapa. Esta comprobación no sustituye revisar la fidelidad visual de fotos, fuentes y capas en el dispositivo.

Se aplican `viralco-ui-guardrails` y Every Layout con `AppButton`, `IconTextButton`, `ModalSafeArea`, fuentes y tokens existentes. Cover para escenario sin scroll, Frame/Center para resultado y Stack/Cluster para controles. Modales conservan separación superior de Dynamic Island. Claro/oscuro, accesibilidad e i18n español/inglés. Las proporciones de fotos pertenecen al contrato, no al espaciado UI.

## Verificación automatizada

Jest: 1/3/8 tomas, disparo automático, dobles toques, repetición primera/intermedia/última, interrupción, fin de video, tiempos cero, reinicio y pausa durante entrega. También acuses tardíos, originales desactivados, retención de fotos durante sincronización, archivado, limpieza limitada, tira duplicada y escala de texto en claro/oscuro.

Ejecutar Jest/lint, pruebas focalizadas de configuración backend, bundle iOS y compilaciones iOS/Android. Estas pruebas no sustituyen la comprobación física.

## Checklist manual de entrega

1. Publicar 1, 3 y 8 tomas. Lanzar y tocar una vez por toma: un solo disparo al finalizar cada conteo.
2. Animaciones activadas/desactivadas, revisión cero/mayor que cero, conteos diferentes; videos largos deben terminar completos.
3. iPhone/Android real: guías de encuadre, frontal reflejada, archivo natural, cámara trasera, lentes disponibles, destello y tres calidades.
4. Comparar editor/resultado vertical/horizontal, tira duplicada, capas rotadas y fuentes descargadas. Repetir primera/intermedia/última sin alterar otras fotos.
5. Dejar el resultado abierto: nunca reinicia por tiempo. Otra foto vuelve al ciclo desde inicio. QR solo tras sincronizar resultado vigente.
6. Segundo plano durante conteo/video: al volver espera toque. Reiniciar app con tomas parciales y completas.
7. Sin red: terminar experiencias y finalizar sesión. Reabrir conectado y verificar entregas pendientes. Repetir mientras se sincroniza una composición anterior.
8. Crear/confirmar patrón, pulsación de tres segundos, patrón incorrecto/correcto, Configurar evento (owner/admin), galería y confirmación de salida. Publicar otro diseño con marcos/animaciones y relanzar: deben aparecer los cambios; con capturas pendientes comprobar ambas opciones de recuperación.
9. Teléfonos pequeño/grande, orientación, wrapping, resultado completo, targets táctiles y modales bajo Dynamic Island. En desarrollo, el simulador usa una carta de señal de TV y genera un JPEG para recorrer captura/composición; no sustituye la prueba de cámara física.
10. Actualizar la instalación iOS sin desinstalar, con una experiencia parcial y otra completa: reabrir el lanzamiento y recuperar las tomas aunque cambie el UUID del contenedor. No borrar la sesión para esta prueba. Las pruebas `MirrorRuntimeRelocation` simulan este cambio y archivos realmente ausentes/corruptos.

La revisión visual queda para el usuario salvo autorización explícita de controlar el simulador. Se instalan las compilaciones actualizadas para facilitarla.

Fuera de alcance: impresión física, GIF, eliminación de fondo y galería histórica entre dispositivos.

## Pruebas manuales de esta iteración

- Inicio en bucle sin botón superpuesto, toque en cualquier parte, previa completa, contador transparente en 30 % inferior, captura y mínimo tres segundos de procesamiento con 1/3/8 tomas.
- Repetir una toma numerada sin cambiar las restantes; Otra foto vuelve al ciclo.
- Archivar sin confirmación: desaparece de galería/ZIP, sigue en administración y se puede restaurar. Comprobar originales locales.
- Selección de varias composiciones, compartir galería, abrir ZIP desde el menú nativo y verificar contenido.
- WhatsApp instalado/no instalado; QR pendiente y sincronizado. Impresión no se ofrece todavía.
- Patrón nuevo en cada lanzamiento; punto en esquina superior izquierda también en galería, visor y entrega; Dynamic Island, teléfono pequeño e iPad, claro/oscuro.

## Escenario completo y encuadre de captura

### Galería del evento entre dispositivos

Detalles del evento incorpora un acceso `images` entre Configurar y Lanzar Espejo cuando hay composiciones sincronizadas. Consulta `GET /api/events/:id/modes/:eventModeId/compositions`, protegido por `events.view`, sin filtrar dispositivo ni sesión. Devuelve fotos sincronizadas con URLs firmadas y paginación por ID (30 por página). No requiere migraciones ni modifica capturas.

La galería reutiliza `GuestModal` y muestra cards `CompositionSyncCard` con miniatura cuadrada, fecha, estado y progreso. Combina composiciones locales y remotas sin duplicar `clientAssetId`, filtradas por el estado de archivo compartido. Los archivos locales se cargan aunque falle la consulta al servidor. No permite repetir tomas remotas ni imprimir. Las fotos pendientes de sincronización no pueden verse desde otros dispositivos. Las URLs se renuevan al actualizar/abrir la galería.

“Sincronizar todo” procesa secuencialmente las composiciones locales pendientes, continúa ante fallos y persiste los acuses en la sesión correspondiente sin sustituir las fotos. El porcentaje pondera bytes de originales pendientes y composición; se limita a 99 % hasta la confirmación del backend. Cada card distingue subida de originales, composición, confirmación, error y sincronizada. Los rechazos de almacenamiento conservan status HTTP, Code y Message acotados en el registro técnico local, nunca URLs firmadas completas; el front muestra texto funcional. No se cierra el modal durante esta operación y no se eliminan archivos.

La cámara ocupa todo el escenario independientemente de la proporción de la toma. Una ventana central mantiene nítido el recorte; las regiones exteriores usan desenfoque nativo, no reducen la cámara. Android usa PreviewView compatible para permitir superposiciones sobre su TextureView. Comprobar el desenfoque sobre cámara real en ambas plataformas; con reducir transparencia se respeta la alternativa accesible del sistema.

Las capturas nuevas conservan `previewAspectRatio` para reproducir en el compositor el encuadre central mostrado al capturar. Las antiguas sin ese dato mantienen su recorte anterior. El resultado ocupa el escenario completo con ajuste proporcional, sin recortar la composición ni deformarla; los botones para repetir se posicionan sobre sus tomas.

Se reemplazó `StyleSheet.absoluteFillObject`, ausente en React Native 0.85, por `StyleSheet.absoluteFill` en las capas del lanzamiento y recursos consumidos por el compositor. Extender la propiedad ausente eliminaba silenciosamente el posicionamiento absoluto. Las pruebas comprueban el posicionamiento real del resultado además de la geometría de encuadre.

Solo en un emulador detectado y con `__DEV__`, la cámara se sustituye por la carta de prueba SVG del proyecto. Su exportación produce una fotografía JPEG sin controles ni desenfoque incorporados y continúa por el guardado y composición habituales. Un fallo de cámara en un teléfono nunca activa esta sustitución. Las dependencias nativas de desenfoque y detección requieren recompilar, no basta recargar Metro.
