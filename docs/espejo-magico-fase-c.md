# Espejo magico: configurador mobile de fase C

## Entrada y navegacion

El acceso parte de `Eventos > Detalle del evento > Espejo magico > Configurar`. `MagicMirrorConfigScreen` conserva un unico borrador mientras el usuario navega por diseno, experiencia, captura, operacion y revision.

El flujo replica las capacidades de configuracion del prototipo, adaptadas al design system mobile. El configurador publica una version lista para la fase D; no abre camara ni crea una sesion.

## Secciones

1. Diseno: formato, slots, marco, fondo, stickers y capas de texto.
2. Experiencia: pantalla inicial, asistente, estilo y animaciones por etapa.
3. Captura: tiempos, flash, lente, calidad y originales.
4. Operacion: entrega, reinicio, menu del operador y perfiles de impresion.
5. Revision: errores, guardado, validacion y publicacion.

Los recursos visuales de Diseno se eligen exclusivamente entre favoritos de la cuenta; las plantillas ofrecen carruseles separados Global y Favoritos. La interfaz nunca solicita IDs, URLs o keys. Experiencia conserva el selector general para animaciones.

## Estado local y servidor

El estado visible puede ser `loading`, `clean`, `dirty`, `saving`, `saved`, `invalid`, `conflict`, `published` o `error`. Los cambios no guardados se respaldan en AsyncStorage con una clave formada por cuenta, evento y modo; no existe autosave silencioso al servidor.

Publicar guarda primero el borrador, valida la revision resultante y pide confirmacion antes de crear la version inmutable. Ante `CONFIG_REVISION_CONFLICT`, el usuario puede cargar el servidor o conservar su copia local y reaplicarla sobre la revision actual tras confirmar.

## Permisos y accesibilidad

Owner, administrador y Super Admin editan y publican. El operador consulta la publicacion activa sin controles de edicion. Arrastre y redimension se complementan con controles numericos, orden y restauracion del preset.

Todos los componentes usan tokens, temas claro/oscuro, i18n y primitivas reutilizables de ViralCo. GIF real, eliminacion de fondo e impresion fisica se muestran como capacidades no disponibles.

## Estado final

Fase `COMPLETA`.

- Acceso implementado desde el detalle del evento y regreso conservando el evento seleccionado.
- Seis plantillas globales, formato personalizado, preview, editor tactil/preciso, textos, favoritos, animaciones, captura, entrega y runtime implementados.

## Navegacion interna de Diseno

Debajo del submenu principal, Diseno expone un segundo submenu sin separacion: `Formato de foto`, `Marcos`, `Fondos`, `Texto` y `Stickers`. El preview compuesto permanece visible encima del separador y el panel inferior cambia segun la opcion activa. El boton flotante de preview se conserva en todas las secciones.

- Formato de foto: `Personalizado` encabeza el carrusel global; los seis diseños portrait `2000 × 2960` proceden de recursos globales. Favoritos se presenta como galería. Las plantillas son presets independientes que copian geometría al borrador sin adjudicarse al evento ni guardarse automáticamente.
- Marcos: muestra exclusivamente favoritos y admite varias capas editables del mismo grupo.
- Fondos: ofrece la paleta ViralCo, color hexadecimal personalizado y recursos favoritos; admite varias capas de color o imagen editables y ordenadas exclusivamente dentro del grupo de fondos.
- Stickers: admite hasta diez favoritos estaticos con posicion, tamano, rotacion y orden independientes; cada insercion inicia al 25 % del lienzo.
- Texto: ofrece nombre del evento, fecha y multiples textos personalizados. Cada capa puede seleccionar su propia fuente favorita.
- Orden de composicion: fondo, tomas, marco, stickers y textos.

Las plantillas creadas por una cuenta quedan marcadas como favoritas automaticamente. El contrato conserva lectura de campos historicos y agrega `layout.stickerLayers` y `fontResourceId` por capa de texto sin cambiar `schemaVersion: 1`. En los editores de Fondos y Stickers una capa puede salir parcialmente del lienzo mientras conserve al menos 10% de su area dentro del recorte. El movimiento y la redimension mantienen esa porcion recuperable. Los fondos de color pueden medir hasta 200% de ancho y alto; fondos de imagen y stickers conservan el maximo de 100%, y las tomas y los marcos siguen totalmente contenidos.
- El lienzo de edicion conserva una proporcion portrait fija, bloquea el scroll mientras mueve o redimensiona y convierte una plantilla aplicada en personalizada ante la primera modificacion.
- Cuando no existen favoritos del tipo requerido, el estado vacio permite abrir Recursos directamente.
- Recuperacion AsyncStorage, conflicto explicito, validacion y publicacion cubiertos por pruebas.
- Operador en lectura y owner/administrador/Super Admin en edicion verificados en temas oscuro y claro.
- No quedan componentes `comp_hardcode`.

## Editor unificado de tomas

El preview superior de Diseno es la unica superficie de edicion: no existe un segundo lienzo. Una paleta vertical relativa ocupa una columna al borde izquierdo, deja 8 px antes del lienzo y toma solamente la altura de sus controles; el canvas usa el ancho restante y conserva completa su proporcion portrait. La paleta permite mover/redimensionar, rotar, activar seleccion multiple, deshacer, rehacer, duplicar como una toma nueva, repetir visualmente la misma toma, agregar una toma, alternar tira duplicada y restaurar el preset. Cada toma expone su accion de eliminar dentro de la esquina superior derecha.

“Duplicar” crea una captura nueva con otro numero. “Repetir la misma toma” crea un segundo slot con el mismo numero de foto, pero con posicion, tamano, rotacion y orden de capa independientes. Borrar una repeticion elimina solamente esa instancia; borrar la ultima instancia de una captura elimina la toma y renumera las posteriores. El editor permite hasta 8 capturas y 16 slots visuales.

## Editor de marcos

La seccion Marcos reutiliza el lienzo portrait, el fondo gris de contraste y la barra vertical del editor. Las tomas permanecen visibles como referencia con borde azul delgado, pero solo los marcos reciben interaccion. Se pueden agregar hasta 10 capas, mover, redimensionar, rotar, seleccionar en grupo, ordenar dentro del grupo de marcos, duplicar, deshacer, rehacer y eliminar. La papelera sobre el lienzo elimina una instancia; la papelera de la galeria elimina todas las instancias del recurso; restaurar quita todos los marcos.

La galeria de Marcos muestra los favoritos en tres columnas. En Formato de foto, Global permanece como lista horizontal superior y Favoritos se presenta debajo como grilla de tres columnas. Las asociaciones nuevas se revierten ante errores y un `event_resource` solo se desvincula cuando ninguna capa lo utiliza.

La seccion Fondos reutiliza el mismo lienzo portrait, fondo gris exterior y barra vertical. Cada color o imagen empieza cubriendo el 100 % del lienzo y luego puede moverse, redimensionarse, rotarse, duplicarse, seleccionarse en grupo y ordenarse respecto a otros fondos. Las capas se componen antes de las tomas; el orden no puede atravesar hacia tomas, marcos, stickers o textos. Los colores se guardan directamente en el borrador y no crean assets ni favoritos. Las imagenes se eligen desde Favoritos en una grilla de tres columnas.

La seccion Stickers usa el mismo lienzo portrait, fondo gris exterior y barra vertical. Solo permite stickers estaticos marcados como favoritos, presentados en una grilla de tres columnas. Se pueden agregar varias capas, mover, redimensionar, rotar, seleccionar en grupo, duplicar, deshacer, rehacer, eliminar y ordenar exclusivamente dentro del grupo de stickers. Una misma asociacion de recurso puede alimentar varias instancias visuales; se desvincula solamente cuando ya no queda ninguna instancia que la utilice.

La herramienta Rotar muestra cuatro manejadores tactiles separados alrededor de cada toma seleccionada. La rotacion se persiste por slot en grados, entre `-180` y `180`; los slots historicos sin ese dato se normalizan a `0` y reciben un `slotId` estable al editarse.
