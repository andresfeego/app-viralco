# Manual de Producto ViralCo

## 1. Propósito del producto

ViralCo es una plataforma para captura, procesamiento, organización, entrega y viralización de contenido generado en eventos. El sistema está pensado para operar en experiencias como plataformas 360, cabinas de fotos tipo collage o espejo mágico y estaciones de video mensaje, con una capa web para administración, entrega y galería del evento.

El objetivo del producto es reemplazar flujos manuales, desorganizados o poco escalables por una operación centralizada donde el contenido se produce, se marca, se entrega y se reutiliza con una experiencia digital clara para operarios, marcas, clientes y asistentes.

## 2. Problema que resuelve

En eventos se generan decenas o cientos de assets por jornada. Hoy esto suele implicar:

- Entrega manual de videos o fotos.
- Pérdida de calidad en el contenido compartido.
- Falta de una experiencia centralizada para descarga o difusión.
- Dificultad para organizar el material por evento.
- Poco aprovechamiento del potencial de viralización en redes.

ViralCo resuelve esto con una plataforma que captura o recibe el contenido, lo organiza por evento, aplica branding, genera links o flujos de descarga y lo pone a disposición de invitados y clientes finales.

## 3. Alcance del sistema

ViralCo está compuesto por varios frentes funcionales conectados entre sí:

- App de captura para operación en evento.
- Backend de gestión, almacenamiento y procesamiento.
- Portal web administrativo y portal de galería/descarga.
- Gestión de usuarios, sesiones, suscripciones y dispositivos.
- Automatización opcional de hardware para experiencias 360.

## 4. Tipos de usuario

### 4.1 Operario o staff de evento

Responsable de usar el dispositivo en sitio, iniciar sesiones, seleccionar el evento y operar los modos de captura.

### 4.2 Administrador

Responsable de crear y configurar eventos, branding, assets, modos, permisos, suscripciones, dispositivos y opciones de entrega.

### 4.3 Cliente final u organizador

Responsable de revisar y descargar el contenido del evento desde el portal web, sin necesidad de acceder a la configuración operativa.

## 5. Propuesta de valor

ViralCo no es solo almacenamiento. Su valor diferencial incluye:

- Convertir experiencias presenciales en contenido listo para compartir.
- Operar como extensión digital del evento.
- Facilitar branding y reutilización del contenido.
- Permitir una experiencia más autónoma en cabina o 360.
- Escalar el manejo de alto volumen de assets sin perder orden.

## 6. Módulos del producto

## 6.1 Eventos

El módulo de eventos es el eje de organización del sistema. Todo asset, configuración, branding o experiencia operativa debe pertenecer a un evento.

### Funcionalidades

- Crear evento.
- Listar eventos con nombre y fecha.
- Editar evento.
- Configurar branding de la portada o landing del evento.
- Definir logo del cliente, proveedor o marca.
- Incluir número telefónico opcional.
- Configurar fondo o estilo visual del evento.
- Configurar assets gráficos del evento.
- Cargar marcos y overlays con transparencia.
- Ajustar orden de capas de los overlays.
- Subir imágenes para marcos o piezas visuales.

### Consideraciones

- El evento debe ser la unidad organizacional para capturas, descargas, galería, métricas y branding.
- El modelo debe permitir múltiples tipos de asset por evento.

## 6.2 Home y modos de captura

La pantalla principal del dispositivo debe mostrar los modos de experiencia disponibles para el evento activo.

### Funcionalidades

- Mostrar modos activables o desactivables por evento.
- Soportar como mínimo:
  - Video 360.
  - Foto collage.
  - Video mensaje.
- Soportar GIF como modo opcional, no prioritario.
- Permitir reordenar los modos.
- Permitir centrar o destacar modos en el home.

### Objetivo UX

- Debe ser una navegación simple, clara y directa.
- Debe evitar la complejidad detectada en apps de referencia con navegación enredada.

## 6.3 Módulo Foto collage

Este módulo representa la cabina instantánea o espejo mágico para toma de fotos y generación de un collage final.

### Configuración de captura

- Configurar cuenta regresiva antes de cada foto.
- Configurar tiempo de visualización después de cada captura.
- Capturar tres fotos como flujo base del collage.
- Permitir repetir solo una foto individual si quedó mal, sin reiniciar toda la secuencia.

### Plantilla y composición

- Cargar un marco o plantilla.
- Posicionar el marco respecto a las fotos.
- Ajustar tamaño y posición de cada foto.
- Soportar fotos verticales y tamaños configurables por bloque.

### Salidas

- Generar collage final.
- Compartir o descargar el collage.
- Opcionalmente guardar también las fotos individuales.

## 6.4 Módulo Video 360

Módulo principal de la experiencia 360. Debe cubrir configuración de captura, edición básica, overlays y estabilidad visual.

### Configuración de captura

- Cuenta regresiva antes de iniciar.
- Duración total de grabación.
- Formato o relación de aspecto.
- Perfil de velocidad con segmentos de cámara rápida y cámara lenta.
- Efecto reverse tipo boomerang.
- Selección de música o banda sonora.

### Overlays y efectos

- Superponer marcos transparentes.
- Aplicar efectos visuales decorativos como destellos o elementos temáticos.

### Configuración de cámara

- Activar ultra gran angular si el dispositivo lo soporta.
- Permitir estabilización alta por la oscilación del brazo 360.

### Consideraciones

- Este módulo tiene dependencias fuertes con procesamiento de media, overlays y entrega.

## 6.5 Módulo Video mensaje

Módulo para dejar mensajes en video con audio, orientado a bodas, eventos sociales o experiencias corporativas.

### Funcionalidades

- Cuenta regresiva antes de grabar.
- Configuración de duración máxima.
- Configuración de calidad de video.
- Aplicación de marco u overlay.
- Soporte de intro y outro en video.
- Uso de cierre con logo o fade a negro para clientes corporativos.

## 6.6 Stickers, pegatinas y filtros

Módulo opcional, pensado como gancho de engagement y diferenciación.

### Funcionalidades deseadas

- Stickers manuales.
- Filtros o pegatinas sobre cara o escena.
- Futuro soporte de tracking de rostro para colocación automática tipo redes sociales.

### Estado de prioridad

- No es núcleo del MVP.
- Debe quedar modelado como extensión futura del pipeline visual.

## 6.7 Compartir y entrega al invitado

Módulo de postcaptura para distribución inmediata del asset.

### Opciones de entrega configurables

- AirDrop.
- QR.
- Subida a la nube.
- WhatsApp.
- Correo como opción secundaria.

### Prioridades operativas

- QR como flujo principal en eventos.
- AirDrop para conservar calidad cuando aplique.

### Flujo QR

- Generar QR por toma o entregable.
- Mostrar página o panel para el invitado.
- Permitir descargar y compartir.
- Mostrar collage o video final.
- Permitir opcionalmente acceso a fotos individuales.

### Flujo interno QR

El flujo interno de QR debe desacoplar la entrega del link público del tiempo total de procesamiento del asset.

### Objetivo

Entregar la URL final al invitado inmediatamente después de terminar la captura, sin esperar a que finalicen todas las etapas internas de edición, guardado y publicación del archivo.

### Flujo actual identificado

Actualmente el proceso ocurre en este orden:

1. Finaliza la captura.
2. Se edita el video o asset.
3. Se guarda el archivo en Cloudflare.
4. Se guarda el registro en base de datos.
5. El asset queda visible en el feed del evento o uploader.

Este orden retrasa la entrega del link final porque la URL pública depende de que el procesamiento y el guardado hayan terminado completamente.

### Flujo esperado

El nuevo flujo debe operar en este orden:

1. Finaliza la captura.
2. Se crea inmediatamente el registro en base de datos.
3. Ese registro genera un hash único de 25 caracteres.
4. Ese hash se convierte en la URL final pública que verá el cliente o invitado.
5. El registro queda disponible desde ese momento para compartir por QR o link.
6. El sistema continúa en segundo plano con la edición del asset.
7. Después del procesamiento, el sistema guarda el archivo final en Cloudflare.
8. Cuando el archivo esté guardado, el sistema actualiza el mismo registro con la URL fuente final del asset.
9. El asset queda finalmente disponible como pieza lista dentro del feed del evento o uploader.

### Campos requeridos en base de datos

Cada registro de asset entregable debe incluir como mínimo:

- Un identificador del evento.
- Un identificador del tipo de experiencia.
- Un hash único de 25 caracteres.
- Un estado actual del asset.
- La URL final pública basada en el hash.
- La URL fuente del archivo en Cloudflare, cuando ya exista.

### Estados requeridos

El estado del asset debe reflejar de forma dinámica el punto exacto del pipeline en el que se encuentra.

Estados mínimos:

- `editando`
- `guardando`
- `listo`

### Comportamiento esperado de la URL pública

- La URL final debe existir desde el momento en que termina la captura.
- El invitado debe poder abrir esa URL aunque el archivo todavía no esté listo.
- La pantalla pública debe mostrar el estado actual del asset en tiempo real o mediante refresco periódico.
- Cuando el estado sea `editando`, la pantalla debe informar que la pieza se está procesando.
- Cuando el estado sea `guardando`, la pantalla debe informar que la pieza se está subiendo y preparando.
- Cuando el estado sea `listo`, la pantalla debe mostrar el asset final disponible para ver, descargar o compartir.

### Resultado esperado

Con este cambio, la experiencia de entrega deja de depender del tiempo completo del pipeline técnico. El QR o link se genera primero y el contenido final se acopla después al mismo registro, permitiendo una entrega inmediata con estados visibles para el invitado.

## 6.8 Impresión

Módulo orientado principalmente a cabina o espejo.

### Funcionalidades

- Conectar impresora.
- Configurar cantidad de copias por foto o collage.
- Soportar conexión por Wi-Fi.
- Soportar conexión por Bluetooth.
- Soportar AirPrint cuando sea compatible.
- Manejar robustez y reconexión ante fallos o desconfiguración.

## 6.9 Portal web del evento

Portal orientado a cliente final, organizador o asistentes con acceso al contenido consolidado del evento.

### Funcionalidades

- Link único del evento.
- Vista de galería del evento.
- Descarga individual de assets.
- Descarga masiva.
- Compartir link del evento.

### Roles

- Operario o admin configura.
- Cliente final consulta, ve y descarga.

### Consideraciones

- Debe servir como galería y como capa de distribución del contenido.

## 6.10 Cuenta, sesiones y dispositivos

Módulo para controlar suscripciones y seguridad operativa del sistema.

### Funcionalidades

- Registro de usuarios.
- Inicio de sesión.
- Gestión de sesiones.
- Límite de dispositivos activos por suscripción.
- Panel de dispositivos activos.
- Ver dispositivos conectados.
- Cerrar sesión remota o quitar dispositivo.
- Permitir monetización por dispositivo extra.

### Regla base sugerida

- El plan mínimo puede incluir dos dispositivos activos.

## 6.11 Onboarding, prueba, planes y pagos

Módulo comercial y de activación del producto.

### Funcionalidades

- Registro inicial.
- Crear evento de prueba.
- Permitir una sola toma de prueba como experiencia inicial.
- Mostrar planes y precios después de la prueba.
- Flujo de pago.
- Activación automática posterior al pago.

## 6.12 Asistente virtual y autonomía

Módulo orientado a reducir dependencia del operario y permitir operación autónoma de la experiencia.

### Funcionalidades

- Pantalla inicial con branding.
- Instrucciones previas a la captura.
- Instrucciones posteriores para impresión o escaneo QR.
- Animaciones o mensajes guiados en pantalla.

### Objetivo

- Permitir que la cabina opere con mínima intervención humana.

## 6.13 Automatización hardware 360

Módulo opcional de integración física con la plataforma 360.

### Funcionalidades

- Encendido y apagado desde la app.
- Control vía Wi-Fi o Bluetooth.
- Integración con relé o receptor inalámbrico.
- Integración con PWM o reducción de velocidad.
- Posibilidad de reemplazar o complementar el sistema electrónico existente.

### Naturaleza del módulo

- Es un value-add avanzado.
- Debe tratarse como integración especializada de hardware.

## 6.14 UX, UI y tablero operativo

El producto debe priorizar claridad operacional y consistencia visual.

### Requisitos de experiencia

- Flujo limpio y fácil de aprender.
- Evitar navegación confusa.
- Mantener separación clara entre configuración y operación.
- Mostrar al usuario solo lo necesario según rol y contexto.

### Requisitos de seguimiento

- Tablero tipo Kanban para features.
- Estados tipo Backlog, Doing y Done.
- Etiquetas por módulo.
- Posibilidad de adjuntar ejemplos visuales o audios por requerimiento.

## 7. Arquitectura funcional resumida

El flujo general del sistema debe ser:

1. Crear y configurar un evento.
2. Activar modos de captura y branding del evento.
3. Capturar fotos o videos desde la app.
4. Procesar el asset.
5. Aplicar overlays, música, intros, outros o composición.
6. Guardar el entregable en almacenamiento.
7. Generar opciones de entrega al invitado.
8. Publicar el contenido en portal o galería cuando aplique.
9. Permitir descarga, sharing y administración por roles.

## 8. Consideraciones técnicas y de escala

- El producto es intensivo en media, no solo en interfaz.
- El backend debe soportar videos de aproximadamente 20 MB por archivo como promedio base.
- Un evento pequeño puede producir alrededor de 70 videos.
- Un evento grande puede producir hasta 400 videos o más.
- El sistema debe estar preparado para almacenamiento y delivery de alto volumen por evento.

## 9. Infraestructura y operación actual conocida

### Dominios

- `viralco.feegosystem.com` para front y API.

### Front

- Servido como estático por Nginx luego de build.
- `VITE_API_URL=/api` bajo same-origin.

### API

- Proxy de Nginx sobre `/api/*`.
- Health disponible en `/health`.

### Backend

- Servicio systemd `backend-viralco.service`.
- Puerto `3023`.
- Requiere `R2_BUCKET_REGION=auto`.

### Seguridad

- SSL con Let's Encrypt.

### Base de datos

- Existe un dump importado desde despliegue previo.

## 10. Repositorios actuales

- Backend: `backend-viralco`
- Front: `web-viralco`

## 11. Reglas de producto para la nueva construcción

- El evento es la entidad central del sistema.
- Todo asset debe quedar asociado a un evento y a un tipo de experiencia.
- Las opciones de captura, branding, entrega y galería deben ser configurables por evento.
- La experiencia del operario no debe depender de flujos complejos.
- La experiencia del invitado debe ser corta, clara y orientada a descargar o compartir.
- Los módulos avanzados u opcionales deben diseñarse desde el inicio, pero no bloquear el núcleo del producto.

## 12. Alcance sugerido para MVP

Para una primera versión funcional se recomienda incluir:

- Autenticación básica.
- Gestión de eventos.
- Home con modos configurables.
- Video 360.
- Foto collage.
- Video mensaje.
- Pipeline de almacenamiento y entrega.
- Flujo QR.
- Portal del evento.
- Gestión básica de dispositivos activos.

Se pueden dejar fuera del MVP inicial:

- Stickers con IA.
- Automatización hardware 360.
- Impresión avanzada con múltiples protocolos.
- Monetización avanzada por add-ons.

## 13. Fuentes base de este manual

Este documento consolida como fuente funcional inicial:

- Resumen operativo del proyecto ViralCo.
- Listado de features por sección.
- Transcripción base de la reunión y levantamiento inicial.

Mientras no exista una versión aprobada posterior, este manual debe tratarse como documento base de producto para la nueva implementación.
