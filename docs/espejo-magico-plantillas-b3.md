# B.3 — Plantillas de diseño fotográfico en Kaptura

Estado: `COMPLETADA`.

En `Espejo mágico → Configurar → Diseño → Formato de foto` se muestran exactamente dos carruseles:

- Global: seis diseños portrait de `2000 × 2960` y `Personalizado` como primera entrada especial del editor.
- Favoritos: plantillas favoritas de la cuenta, incluidas las creadas por ella.
- Aplicarla localmente como preset independiente, sin adjudicarla al evento ni guardar automáticamente.
- Guardar la geometría actual como una nueva plantilla privada.

Al aplicar, Kaptura consulta el contrato de la plantilla y copia formato, dimensiones, tomas, orden, posiciones, tamaños, rotaciones y tira duplicada al borrador. El estado pasa a `Cambios sin guardar`; no se crea un `event_resource` y no se llama al guardado. El diseño se conserva y publica desde su propia geometría aunque el preset fuente desaparezca.

La interfaz muestra `Personalizado`, `Plantilla: Nombre · Global` o `Plantilla: Nombre · Favoritos`, y resalta el origen en la galería. La primera edición manual conserva el resultado pero limpia esa anotación. Durante la sesión, Restaurar usa un snapshot en memoria del último preset aplicado. Guardar con el corazón crea una plantilla favorita reutilizable, pero no cambia el origen ni es requisito para conservar el diseño.

El modal de guardado reutiliza `ModalSafeArea`, `SurfaceCard`, `PaperFormInput`, `AppButton` y `MirrorConfigPreview`. Funciona con temas claro/oscuro y no permite subir una imagen como plantilla.

La fototeca muestra `thumb/card` generados por el backend. Estas miniaturas reproducen relación de aspecto, posiciones, tamaños y números de captura desde el mismo JSON aplicado al evento.

## Editor portrait

El lienzo visible escala para caber en el dispositivo, pero mantiene siempre la proporción lógica `2000:2960` y no cambia según su contenido. Movimiento y redimensión usan coordenadas porcentuales, selección múltiple, límites comunes y guías de alineación.

Mientras el lienzo controla un gesto, el scroll vertical del configurador se desactiva y se recupera al soltar o cancelar. La validación exige únicamente que formato, dimensiones, tomas, orden y slots sean coherentes; una plantilla o un marco no son requisitos de publicación.
