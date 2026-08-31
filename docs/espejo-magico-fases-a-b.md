# Espejo magico: integracion mobile de fases A y B

> El plan maestro y el estado oficial de las fases A–H se mantienen en `WEB/backend/docs/modes/espejo-magico-plan-maestro.md`. Este documento conserva el detalle mobile de A y B.

## Estado transversal

| Fase | Estado | Participacion mobile |
| --- | --- | --- |
| A — Contrato y sesiones backend | `COMPLETADA` | Contratos API disponibles; UI completa se construye en C y D |
| B — Pool, favoritos y recursos | `COMPLETADA` | Biblioteca y selector integrados |
| C — Configurador visual | `PENDIENTE` | Siguiente fase de implementación |
| D — Lanzamiento operativo | `EN_PROGRESO` | Backend listo; preflight y control mobile pendientes |
| E — Runtime de captura | `PENDIENTE` | Cámara y secuencia pendientes |
| F — Composición y entregable | `PENDIENTE` | Render y pipeline pendientes |
| G — Entrega al invitado | `PENDIENTE` | QR, compartir y descarga operativa pendientes |
| H — Capacidades avanzadas | `FUERA_DE_ALCANCE_ACTUAL` | GIF, fondo e impresión pendientes |

## Objetivo

La app administra el pool de recursos de la cuenta y consume el contrato versionado del modo `espejo`. En estas fases no se implementa aun la camara: se prepara la configuracion publicada y el lanzamiento local para el runtime posterior.

## Biblioteca de recursos

La seccion Recursos deja de exponer keys o URLs tecnicas. Usa componentes reutilizables para:

- listar el pool y favoritos compartidos;
- buscar y filtrar por categoria/tipo;
- previsualizar imagen o video;
- marcar favoritos segun `library.manage`;
- subir recursos y asociarlos a un evento/modo;
- manejar carga, vacio, error, reintento e incompatibilidad.

El selector recibe `accountId`, `eventId`, `eventModeId`, proposito y restricciones. Al confirmar, crea un `event_resource` y devuelve su ID para `MirrorConfigV1`.

## Reglas UI

- Reutilizar tokens, tema, `AppButton`, `SurfaceCard`, `MediaPreview` y permisos existentes.
- Funcionar en tema claro y oscuro.
- Todos los textos nuevos viven en `src/i18n`.
- No dejar URLs, assets demo ni valores visuales hardcodeados.
- No dejar etiquetas `comp_hardcode`.

## Fuera de alcance

Camara, composicion final, GIF real, eliminacion de fondo e impresion fisica se implementan despues de validar A y B.

## Estado implementado

- La entrada principal `Recursos` usa `ResourceLibraryScreen` y ya no muestra campos de key o URL.
- `ResourcePicker`, `ResourceCard`, `ResourceFilters`, `ResourceUploadAction` y `ResourceSelectionSummary` son reutilizables por el configurador posterior.
- El pool admite busqueda, tipo, favoritos, paginacion, previews, reemplazo de seleccion y estados de carga, vacio, error e incompatibilidad.
- Los roles owner/admin administran; el operador conserva consulta de solo lectura.
- Las cargas validan MIME y tamano, muestran progreso y se integran con el selector nativo de documentos.
- La asignacion crea el `event_resource`, actualiza `MirrorConfigV1` con revision optimista y revierte la asociacion si ocurre un conflicto.
- La seleccion no se guarda localmente: al reiniciar, la fuente de verdad sigue siendo el borrador versionado del backend.
