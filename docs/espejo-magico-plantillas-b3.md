# B.3 — Plantillas de diseño fotográfico en Kaptura

Estado: `COMPLETADA`.

En `Espejo mágico → Configurar → Diseño → Formato de foto` se muestran exactamente dos carruseles:

- Global: seis diseños portrait de `2000 × 2960` y `Personalizado` como primera entrada especial del editor.
- Favoritos: plantillas favoritas de la cuenta, incluidas las creadas por ella.
- Aplicarla con control `expectedRevision`.
- Guardar la geometría actual como una nueva plantilla privada.

Al aplicar, Kaptura guarda primero cualquier borrador local pendiente. El servidor devuelve la nueva revisión y la geometría persistida. Un conflicto no se sobrescribe: activa el flujo de recuperación ya existente.

El modal de guardado reutiliza `ModalSafeArea`, `SurfaceCard`, `PaperFormInput`, `AppButton` y `MirrorConfigPreview`. Funciona con temas claro/oscuro y no permite subir una imagen como plantilla.

La fototeca muestra `thumb/card` generados por el backend. Estas miniaturas reproducen relación de aspecto, posiciones, tamaños y números de captura desde el mismo JSON aplicado al evento.

## Editor portrait

El lienzo visible escala para caber en el dispositivo, pero mantiene siempre la proporción lógica `2000:2960` y no cambia según su contenido. Movimiento y redimensión usan coordenadas porcentuales, selección múltiple, límites comunes y guías de alineación.

Mientras el lienzo controla un gesto, el scroll vertical del configurador se desactiva y se recupera al soltar o cancelar. La primera modificación de una plantilla aplicada la convierte inmediatamente en `Personalizado`; restaurar antes de guardar recupera la plantilla de origen.
