# Espejo Magico: taxonomia y filtros mobile B.2

Estado: `COMPLETADA`.

## Fototeca

La pantalla conserva `Favoritos` y `Global` y presenta filtros independientes en este orden:

1. Recursos: Todos, Fondos, Marcos, Stickers, Plantillas, Animaciones y Fuentes.
2. Eventos: Todos y los tipos activos entregados por la API.
3. Movimiento, solo para Stickers: Todos, Con movimiento y Sin movimiento.

Busqueda y filtros se conservan al cambiar de submenu. Cada cambio reinicia la paginacion; la grilla continua deduplicando por `libraryAssetId`.

El filtro de evento es estricto: un tipo concreto muestra solo recursos asociados explicitamente. Los recursos universales aparecen en `Todos` y no se agregan automaticamente a cada resultado especifico.

## Componentes

`ResourceTypeBadge` representa el tipo mediante un icono circular y mantiene el nombre completo como etiqueta accesible. `IconTextButton` admite colores de fondo, estado presionado e icono; sin texto usa ancho y alto iguales, radio circular y area tactil estable. La celda ya no envuelve el favorito en un contenedor con padding.

Las fuentes muestran las variantes WebP generadas con `Tu evento`; el modal presenta el nombre y abre la imagen de muestra, no el archivo TTF. El configurador mantiene `scope=available`, expone los mismos filtros y no restringe la seleccion por tipo de evento.

`start_screen` y `gif_overlay` se retiraron de filtros y nuevas cargas. La lectura de publicaciones historicas permanece en backend. `template` sigue visible como categoria reservada, pero no se puede subir como imagen.

## Verificacion

- Jest cubre orden, independencia y visibilidad contextual de filtros, badge, favorito circular y preview de fuente.
- Lint se ejecuta sin errores y con advertencias heredadas fuera de este cambio.
- La comprobacion visual en simulador queda como prueba manual del usuario.
