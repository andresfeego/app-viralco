# Espejo Magico: fototeca global mobile B.1

## Estado y alcance

Estado: `COMPLETADA`.

La entrada principal `Recursos` es una fototeca de consulta. Solo presenta `Global` y `Favoritos`; subir y asignar recursos permanece dentro del configurador de Espejo Magico.

## Navegacion y cuenta

La unica cuenta activa se selecciona automaticamente. Cuando el usuario pertenece a varias cuentas se muestra un selector compacto; cambiarla recarga catalogo y favoritos sin mezclar estado entre cuentas.

Global consulta `scope=global`. Favoritos conserva ese scope y agrega `favorite=true`. El configurador no cambia visualmente y consulta `scope=available` para combinar globales con recursos propios.

## Galeria

`ResourceGallery` usa una `FlatList` con tres columnas en telefono y cinco en pantallas amplias. La clave estable es `libraryAssetId`. La carga incremental deduplica resultados; pull-to-refresh reinicia la pagina sin perder cuenta, pestaña, busqueda o filtro.

`ResourceGalleryTile` muestra preview cuadrado `cover`, tipo, estrella, indicador de video y fallback accesible. `ResourcePreviewModal` usa el original con `contain`; videos permanecen pausados y ofrecen controles, mientras fuentes y archivos sin imagen presentan metadata o fallback.

Los filtros horizontales son Todos, Plantillas, Marcos, Animaciones, GIF, Fuentes, Fondos y Pantallas iniciales. `SelectableChipGroup` conserva el comportamiento anterior y añade una variante horizontal desplazable.

## Favoritos, permisos y estados

Owner, administrador y Super Admin actualizan favoritos de forma optimista; un fallo restaura la celda y el preview y muestra error. El operador ve Global y Favoritos en lectura.

La pantalla cubre carga, vacio, sin resultados, error/reintento, carga incremental y refresco. No contiene selector de evento, subida, resumen ni asignacion.

## Componentes reutilizables

- `ResourceGallery`
- `ResourceGalleryTile`
- `ResourcePreviewModal`
- `CompactAccountSelector`
- variante horizontal de `SelectableChipGroup`

Todos usan tokens y temas existentes, i18n español/ingles y labels accesibles. No existen marcas `comp_hardcode`.

## Evidencia de cierre

- 52 pruebas mobile verdes y lint sin errores.
- Grilla, 19 assets, posters de video, preview y favorito verificados en simulador.
- Temas claro y oscuro inspeccionados.
- Bundle iOS validado contra Metro.

