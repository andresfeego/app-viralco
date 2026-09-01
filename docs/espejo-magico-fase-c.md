# Espejo magico: configurador mobile de fase C

## Entrada y navegacion

El acceso parte de `Eventos > Detalle del evento > Espejo magico > Configurar`. `MagicMirrorConfigScreen` conserva un unico borrador mientras el usuario navega por evento, diseno, experiencia, captura, operacion y revision.

El flujo replica las capacidades de configuracion del prototipo, adaptadas al design system mobile. El configurador publica una version lista para la fase D; no abre camara ni crea una sesion.

## Secciones

1. Evento: formato, preview, plantilla y marco.
2. Diseno: slots porcentuales, orden, tira duplicada y capas de texto.
3. Experiencia: pantalla inicial, asistente, estilo y animaciones por etapa.
4. Captura: tiempos, flash, lente, calidad, originales y modo itinerante.
5. Operacion: entrega, reinicio y menu del operador.
6. Revision: errores, guardado, validacion y publicacion.

Los recursos se eligen mediante `ResourcePicker` desde pool, favoritos o subida. La interfaz nunca solicita IDs, URLs o keys.

## Estado local y servidor

El estado visible puede ser `loading`, `clean`, `dirty`, `saving`, `saved`, `invalid`, `conflict`, `published` o `error`. Los cambios no guardados se respaldan en AsyncStorage con una clave formada por cuenta, evento y modo; no existe autosave silencioso al servidor.

Publicar guarda primero el borrador, valida la revision resultante y pide confirmacion antes de crear la version inmutable. Ante `CONFIG_REVISION_CONFLICT`, el usuario puede cargar el servidor o conservar su copia local y reaplicarla sobre la revision actual tras confirmar.

## Permisos y accesibilidad

Owner, administrador y Super Admin editan y publican. El operador consulta la publicacion activa sin controles de edicion. Arrastre y redimension se complementan con controles numericos, orden y restauracion del preset.

Todos los componentes usan tokens, temas claro/oscuro, i18n y primitivas reutilizables de ViralCo. GIF real, eliminacion de fondo e impresion fisica se muestran como capacidades no disponibles.

