# Fases de Programación ViralCo

## 1. Objetivo de este documento

Este documento define el orden de desarrollo recomendado para reconstruir ViralCo desde cero, evitando empezar módulos que dependan de otros aún no resueltos.

La lógica de fases está organizada por dependencias reales de producto, arquitectura y operación.

## 2. Regla obligatoria de UI

Este documento pertenece al repo `frontend`. Por lo tanto, toda referencia a skills dentro de este archivo debe apuntar solo a skills versionadas dentro de `frontend`.

Toda nueva interfaz, vista, dashboard, formulario, modal, tabla, tooltip, card, panel o flujo visual del frontend debe seguir la skill:

- [$viralco-ui-guardrails](./skills/viralco-ui-guardrails/SKILL.md)

Reglas operativas derivadas:

- Primero reutilizar componentes del design system.
- Primero usar tokens y variables del sistema.
- No construir UI suelta si el patrón debe ser reusable.
- Si hace falta un componente nuevo, se crea primero como componente reusable.
- Todo componente reusable nuevo debe mostrarse en `/ui-components`.
- Si algo temporalmente no puede entrar al sistema reusable, debe marcarse como `comp_hardcode`.

## 2.1 Skills de proyecto en repositorio

Las skills específicas usadas por este documento deben vivir dentro del repo `frontend`, para que cualquier desarrollador del front pueda usarlas sin depender de rutas locales privadas.

Reglas:

- Las skills referenciadas desde `frontend/fases-de-programacion.md` deben existir dentro de `frontend/skills/`.
- `fases-de-programacion.md`, `manual-de-producto.md` y demás documentación del frontend deben apuntar siempre a rutas del propio repo `frontend`, no a rutas locales del equipo.
- Las skills genéricas del entorno pueden seguir siendo externas, pero las reglas propias de ViralCo para frontend deben quedar versionadas aquí.
- Las reglas o skills del backend deben documentarse y versionarse dentro del repo `backend`, no en este archivo.

## 3. Principios para el orden de desarrollo

- Primero se construyen las bases transversales.
- Luego las entidades núcleo del dominio.
- Después el pipeline de media.
- La URL pública de entrega debe nacer antes de que termine el procesamiento del asset.
- Luego la experiencia operativa de captura.
- Después la entrega al invitado y el portal.
- Por último los módulos avanzados, comerciales y de hardware.

## 4. Fase 0. Definición base y preparación

### Objetivo

Dejar alineadas las decisiones mínimas para construir sin retrabajo.

### Entregables

- Confirmación del alcance MVP.
- Confirmación de módulos fuera del MVP.
- Confirmación de roles base.
- Confirmación de nomenclatura de eventos, assets y sesiones.
- Confirmación de ambientes LAB y PROD.
- Confirmación de estrategia de ramas y deploy continuo.

### Dependencias

- Ninguna.

### Nota

Sin esta fase, el desarrollo entra en riesgo de rehacer modelos y flujos.

## 5. Fase 1. Fundaciones técnicas

### Objetivo

Montar la base transversal para backend, frontend y almacenamiento.

### Alcance

- Estructura limpia del proyecto.
- Configuración de ambientes.
- Configuración de variables de entorno.
- Conexión a base de datos.
- Configuración de almacenamiento de media.
- Configuración base de API.
- Estructura de autenticación.
- Base del frontend con routing.
- Integración del design system como contrato visual.

### Entregables

- Proyecto ejecutando localmente.
- Pipeline básico de build y deploy.
- Modelos base iniciales.
- Tokens y componentes base del frontend listos para crecer.

### Dependencias

- Requiere Fase 0.

## 6. Fase 2. Dominio núcleo: usuarios, autenticación y roles

### Objetivo

Resolver primero quién usa el sistema y bajo qué permisos.

### Alcance

- Registro.
- Inicio de sesión.
- Sesiones.
- Roles base.
- Permisos base entre admin, operario y cliente final.
- Gestión básica de perfil.

### Dependencias

- Requiere Fase 1.

### Razón del orden

Eventos, dispositivos, portal y configuración necesitan saber quién puede ver o modificar cada cosa.

## 7. Fase 3. Dominio núcleo: eventos y branding

### Objetivo

Crear la entidad principal del producto.

### Alcance

- Crear evento.
- Editar evento.
- Listar eventos.
- Configurar branding.
- Configurar logo, teléfono opcional y fondo.
- Configurar assets del evento.
- Subir overlays o marcos.
- Definir orden de capas.

### Dependencias

- Requiere Fase 2.

### Razón del orden

No tiene sentido construir captura, entrega o portal sin que exista primero el evento como contenedor.

## 8. Fase 4. Pipeline de media y storage

### Objetivo

Resolver el backend de archivos antes de construir seriamente los módulos de captura.

### Alcance

- Modelo de assets por evento.
- Creación temprana del registro entregable al finalizar la captura.
- Generación de hash público de 25 caracteres por asset entregable.
- Upload de archivos.
- Almacenamiento en nube.
- Metadatos por asset.
- URL pública final basada en hash.
- URL fuente final del archivo en Cloudflare.
- Organización por evento y por tipo de experiencia.
- Estados de procesamiento.
- Estados mínimos del asset: `editando`, `guardando`, `listo`.
- Base para overlays, intros, outros y entregables.

### Dependencias

- Requiere Fase 3.

### Razón del orden

Foto, video 360, videoblog, QR y portal dependen directamente del pipeline de media. Además, el QR rápido depende de que el registro público del asset exista antes de terminar la edición y la subida final.

## 9. Fase 5. Shell operativo del dispositivo y home de modos

### Objetivo

Construir la experiencia principal del dispositivo sin entrar todavía en toda la complejidad interna de cada módulo.

### Alcance

- Home del dispositivo.
- Carga de evento activo.
- Modos visibles por evento.
- Activación y desactivación de modos.
- Ordenamiento de modos.
- Navegación simple del operario.

### Dependencias

- Requiere Fase 3.
- Debe coordinar con Fase 4 si el home ya muestra assets o previews reales.

### Razón del orden

La app necesita un shell de operación antes de profundizar cada modo de captura.

## 10. Fase 6. Módulo Foto collage

### Objetivo

Entregar el primer flujo completo de captura a salida final.

### Alcance

- Cuenta regresiva.
- Toma de tres fotos.
- Preview después de cada toma.
- Repetición individual de una foto.
- Configuración de plantilla.
- Posición y tamaño de fotos.
- Generación de collage final.
- Guardado del collage.
- Opcional de fotos individuales.

### Dependencias

- Requiere Fase 4.
- Requiere Fase 5.

### Razón del orden

Es un flujo de media complejo pero más controlable que video 360 y permite validar la arquitectura del producto.

## 11. Fase 7. Módulo Video mensaje

### Objetivo

Agregar un segundo flujo completo de captura de video, más simple que 360.

### Alcance

- Cuenta regresiva.
- Duración configurable.
- Calidad configurable.
- Overlay.
- Intro.
- Outro.
- Generación del entregable final.

### Dependencias

- Requiere Fase 4.
- Requiere Fase 5.

### Razón del orden

Sirve para consolidar el pipeline de video antes de entrar al 360 con sus particularidades técnicas.

## 12. Fase 8. Módulo Video 360

### Objetivo

Construir el modo principal y más exigente del producto.

### Alcance

- Cuenta regresiva.
- Duración.
- Aspect ratio.
- Música.
- Segmentos de velocidad.
- Reverse.
- Overlay.
- Efectos visuales.
- Ajustes de cámara.
- Estabilización y ultra gran angular.

### Dependencias

- Requiere Fase 4.
- Requiere Fase 5.
- Se beneficia de la experiencia ya ganada en Fase 7.

### Razón del orden

Es el flujo con mayor complejidad de captura, procesamiento y operación. No debe abrirse primero.

## 13. Fase 9. Compartir y entrega al invitado

### Objetivo

Cerrar el ciclo operativo para que cada captura tenga salida inmediata.

### Alcance

- Configuración de métodos de entrega.
- QR.
- AirDrop.
- WhatsApp.
- Subida a nube.
- Correo opcional.
- Generación inmediata del link público al terminar la captura.
- Pantalla pública sin autenticación para ver el estado del asset.
- Refresco o consulta de estado del asset por hash público.
- Pantalla de entrega al invitado.
- Página o panel de descarga por asset.

### Dependencias

- Requiere Fase 4.
- Requiere al menos una fase de captura terminada entre Fase 6, 7 u 8.

### Razón del orden

No se puede entregar lo que todavía no se produce de forma estable, pero el link sí debe existir antes de que termine el procesamiento. Por eso la lógica del hash, los estados y la URL pública nacen en Fase 4 y aquí se completa la experiencia de entrega.

## 14. Fase 10. Portal web del evento

### Objetivo

Construir la capa web externa para cliente final y organizador.

### Alcance

- Link único del evento.
- Galería.
- Descarga individual.
- Descarga masiva.
- Compartir link.
- Separación clara entre rol admin y cliente final.
- Vistas públicas de asset por hash sin inicio de sesión para destinatarios externos.

### Dependencias

- Requiere Fase 3.
- Requiere Fase 4.
- Requiere Fase 9 para coherencia de entrega y assets públicos.

### Razón del orden

El portal depende del evento, del storage y del modelo de publicación o sharing.

## 15. Fase 11. Dispositivos activos y control de sesiones

### Objetivo

Resolver la operación comercial y de seguridad de cuentas multi-dispositivo.

### Alcance

- Límite de dispositivos activos.
- Listado de dispositivos.
- Remoción de dispositivo.
- Cierre remoto de sesión.
- Reglas por suscripción.

### Dependencias

- Requiere Fase 2.

### Razón del orden

Es transversal, pero puede entrar después del núcleo de captura si la prioridad es sacar operación funcional primero.

## 16. Fase 12. Onboarding, prueba, planes y pagos

### Objetivo

Convertir el producto en una plataforma comercializable con activación clara.

### Alcance

- Flujo de prueba.
- Evento demo.
- Límite de una toma de prueba.
- Pantalla de planes.
- Pago.
- Activación automática.

### Dependencias

- Requiere Fase 2.
- Requiere definición comercial del negocio.

### Razón del orden

No debe bloquear el desarrollo del producto núcleo, pero sí debe entrar antes de lanzar comercialmente.

## 17. Fase 13. Asistente virtual y autonomía

### Objetivo

Agregar una capa guiada para operación autónoma de cabina.

### Alcance

- Pantalla inicial con branding.
- Instrucciones previas a captura.
- Instrucciones posteriores.
- Guía para impresión o QR.
- Estados animados o mensajes contextuales.

### Dependencias

- Requiere Fase 5.
- Requiere coordinación con Fase 6, 7, 8 y 9.

### Razón del orden

Primero se definen los flujos reales; luego se automatiza la guía sobre esos flujos.

## 18. Fase 14. Impresión

### Objetivo

Habilitar salida física para foto collage o cabina.

### Alcance

- Conexión de impresora.
- Copias configurables.
- Wi-Fi.
- Bluetooth.
- AirPrint.
- Reconexión y tolerancia a fallos.

### Dependencias

- Requiere Fase 6.
- Requiere Fase 13 si se desea experiencia autónoma completa con instrucciones impresas.

### Razón del orden

La impresión depende sobre todo del flujo de foto ya resuelto y estable.

## 19. Fase 15. Stickers, filtros y extras visuales

### Objetivo

Agregar capas de engagement no esenciales al núcleo del MVP.

### Alcance

- Stickers manuales.
- Filtros decorativos.
- Exploración futura de tracking facial.

### Dependencias

- Requiere que los módulos visuales principales ya estén estables.

### Razón del orden

No debe competir con la construcción del núcleo del producto.

## 20. Fase 16. Automatización hardware 360

### Objetivo

Integrar control físico de la plataforma 360 desde la app.

### Alcance

- Encendido y apagado.
- Señales por Wi-Fi o Bluetooth.
- Integración con relé.
- Integración con PWM o velocidad.
- Adaptación al circuito actual o rediseño parcial.

### Dependencias

- Requiere Fase 8.
- Requiere investigación y validación de hardware real.

### Razón del orden

Es una integración avanzada y especializada. No debe bloquear el software base.

## 21. Fase 17. Observabilidad, hardening y release

### Objetivo

Preparar el sistema para operación real sostenida.

### Alcance

- Logging útil.
- Health checks.
- Monitoreo de uploads y procesamiento.
- Manejo de errores operativos.
- Revisión de seguridad.
- Revisión de rendimiento.
- QA de flujos críticos.
- Ajustes para deploy continuo LAB/PROD.

### Dependencias

- Debe acompañar el proyecto desde el inicio, pero se formaliza fuerte al final del MVP.

## 22. Orden resumido recomendado

1. Fase 0. Definición base y preparación.
2. Fase 1. Fundaciones técnicas.
3. Fase 2. Usuarios, autenticación y roles.
4. Fase 3. Eventos y branding.
5. Fase 4. Pipeline de media y storage.
6. Fase 5. Shell operativo y home de modos.
7. Fase 6. Foto collage.
8. Fase 7. Video mensaje.
9. Fase 8. Video 360.
10. Fase 9. Compartir y entrega.
11. Fase 10. Portal web del evento.
12. Fase 11. Dispositivos activos y control de sesiones.
13. Fase 12. Onboarding, planes y pagos.
14. Fase 13. Asistente virtual y autonomía.
15. Fase 14. Impresión.
16. Fase 15. Stickers y filtros.
17. Fase 16. Automatización hardware 360.
18. Fase 17. Observabilidad, hardening y release.

## 23. Qué sí puede correrse en paralelo

Se puede trabajar en paralelo solo cuando no haya dependencia directa de producto o arquitectura.

Paralelizables con control:

- Design system y componentes base mientras avanza Fase 1.
- Portal web visual mientras Fase 4 define contratos de datos.
- Dispositivos activos mientras el núcleo de captura avanza.
- Onboarding comercial mientras el MVP operativo se estabiliza.

No conviene abrir en paralelo demasiado temprano:

- Video 360 antes de cerrar pipeline de media.
- Portal final antes de definir publicación, permisos y modelo de URL pública por hash.
- Automatización hardware antes de estabilizar el modo 360.

## 24. Regla de implementación por fase

Ninguna fase debe darse por terminada si deja bloqueada la siguiente por falta de contrato, modelo de datos o componente reusable crítico.

Para cada fase debe cerrarse como mínimo:

- Modelo de datos afectado.
- Contratos API afectados.
- Estados UX principales.
- Casos de error visibles.
- Componentes reusables necesarios.
- Documentación mínima para la siguiente fase.
