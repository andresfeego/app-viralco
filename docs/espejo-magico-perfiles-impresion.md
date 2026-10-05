# Perfiles de impresion en Kaptura

## Guia, manual y CP1500 por Wi-Fi directo

En Recursos, abrir un perfil → Como configurar la impresora → Editar guia y manual (solo superadmin). Escribir los pasos comunes y, opcionalmente, pasos adicionales para iPhone y Android; cada linea corresponde a un paso. Adjuntar un PDF de hasta 25 MB y un enlace HTTPS al manual oficial es opcional. Guardar y publicar hace visible la guia. Puede hacerse despues de crear el perfil. No hay generacion por IA.

La ayuda tambien aparece bajo el perfil seleccionado en configuracion de impresion y en el menu protegido del operador. Se reutilizan PaperFormInput, SurfaceCard, AppButton e IconTextButton con Stack y Cluster, tokens, temas y area segura superior explicita.

El backend conserva guia y referencia al PDF en metadata, sin cambiar geometria, publicaciones ni tablas. Solo superadmin puede escribir; se comprueba la revision para no pisar otra edicion. El PDF se almacena por hash y la guia versionada en R2 junto al perfil. No se borran manuales antiguos referenciados por sesiones. El endpoint de publicacion es POST /api/admin/library/print-profiles/:id/guide, multipart con guide (JSON) y file (PDF opcional). Los enlaces de descarga se firman al consultar recursos.

Al preparar un evento se intenta descargar el manual y se verifica SHA-256. El tutorial queda en el paquete local; el PDF en Documents/kaptura-print-manuals, identificado por hash para sobrevivir a cambios de ruta del contenedor iOS. Una descarga fallida no bloquea el lanzamiento. Para leerlo offline debe haberse descargado previamente. iOS usa el visor nativo; Android requiere una aplicacion capaz de abrir PDF y comparte acceso solo al archivo concreto. El enlace web oficial requiere internet.

La CP1500 tiene una guia inicial incluida para ambas plataformas. Activar en la impresora Wi-Fi settings → Connection settings → Other → Direct Connection → On y conectar el telefono a la red indicada. En iOS se usa AirPrint; Android requiere Mopria Print Service instalado y activado previamente. Kaptura no conecta silenciosamente el telefono a la red ni solicita Bluetooth: iOS no ofrece un enlace publico directo al panel Wi-Fi; se explica como llegar desde Ajustes. Android abre los ajustes Wi-Fi. Al volver se usa el motor de impresion existente; no se crea otro transporte ni se requiere internet para imprimir localmente. La sincronizacion/QR siguen necesitando internet.

Fuentes oficiales: [conexion directa](https://cam.start.canon/en/P001/manual/html/UG-03_Print_Wi-Fi_0020.html), [AirPrint](https://cam.start.canon/en/P001/manual/html/UG-03_Print_Wi-Fi_0030.html), [Mopria](https://cam.start.canon/en/P001/manual/html/UG-03_Print_Wi-Fi_0040.html). La salida fisica sigue pendiente de comprobacion con la impresora.

## Flujo

En `Espejo magico > Operacion`, el usuario busca y selecciona perfiles de impresion favoritos mediante una lista horizontal. Si no hay favoritos puede ir a Recursos o detectar una impresora desde el dispositivo.

Al seleccionar un perfil se asocia como `event_resource`, se cargan sus valores recomendados y se habilita su edicion por evento. Al quitarlo se desactiva la impresion sin eliminar el recurso de la biblioteca.

## Deteccion local

- iOS abre `UIPrinterPickerController` y conserva localmente nombre y URL usando una clave por cuenta en AsyncStorage.
- La cancelacion no muestra un error.
- Android selecciona el destino en el dialogo de impresion del sistema, mediante los servicios de impresion instalados. No ofrece una deteccion independiente.
- La URL de la impresora nunca se envia como parte del recurso global ni de `MirrorConfigV1`.

Una impresora reconocida reutiliza y marca favorito el perfil disponible. Si no existe, se crea un perfil de cuenta editable con valores iniciales Postal 100 x 148 mm, 300 DPI y AirPrint.

## Biblioteca

Recursos incorpora el filtro `Perfiles de impresion`. La accion Agregar, cuando ese tipo esta seleccionado, abre la deteccion nativa en lugar del selector de archivos. El perfil Canon SELPHY CP1500 global se restaura automaticamente por el bootstrap backend.

## Composicion

La pantalla usa un Stack para el ritmo vertical, Reel para perfiles y Cluster/Switcher para acciones y campos que se adaptan al ancho. Todos los espacios, radios, tipografias y colores proceden de tokens y del tema activo.

## Impresion real desde el lanzamiento

Imprimir aparece en la entrega, el visor y las fotografias locales de la galeria cuando la configuracion historica de esa fotografia habilita impresion y entrega por impresion. La barra permite imprimir las seleccionadas. El menu protegido del operador incluye Impresora: en iOS cambia el destino local sin modificar la publicacion; en Android explica la seleccion en el dialogo nativo.

El reinicio automatico se pausa durante la preparacion y el dialogo. Se bloquean envios simultaneos. Cada envio captura una referencia estable a la composicion y su configuracion historica. Las selecciones con distintos parametros se agrupan y envian secuencialmente; cancelar detiene los grupos restantes.

El TurboModule prepara internamente un PDF desde las imagenes finales locales: no reconstruye capas ni muestra un paso de exportacion. Respeta dimensiones fisicas, orientacion, margen, contain/cover y color/grises. Dos por pagina coloca la misma composicion en dos celdas sobre el eje mayor del area imprimible; no duplica otra vez las tiras contenidas en la imagen.

- iOS contacta la impresora AirPrint seleccionada y envia directamente. El renderizador rechaza diferencias de papel mayores a dos puntos y margenes fuera del area imprimible informada por el sistema.
- Android utiliza PrintManager y PrintDocumentAdapter; el documento se adapta a los atributos finales elegidos en el dialogo. Requiere un servicio compatible con la impresora, por ejemplo el del fabricante o el servicio de impresion del dispositivo.
- Las copias configuradas se materializan como hojas en el documento. Android no permite establecer copias iniciales mediante su API publica: su dialogo empieza con una copia del documento. Aumentar ese valor multiplica el documento completo. No se fija ademas una cantidad nativa que duplique automaticamente las copias.
- El nombre detectado no certifica papel, impresion sin bordes ni compatibilidad. Los valores iniciales del perfil deben contrastarse con el papel real.

No se necesita internet ni sincronizar la fotografia: se requiere comunicacion local con la impresora y permiso operativo vigente. Con conexion se comprueba la autorizacion; sin conexion se aplican las autorizaciones offline existentes.

## Trabajos y fallos

Los ultimos 100 estados locales se guardan en AsyncStorage bajo `@kaptura/print-jobs:v1`: preparing, sending, submitted, completed, cancelled, failed y unknown. Al recuperar la app, trabajos interrumpidos se marcan unknown, nunca se reenvian automaticamente. Submitted/completed reflejan lo comunicado por el sistema, no una comprobacion fisica de salida.

Los detalles tecnicos se registran mediante el logger existente y los mensajes visibles son funcionales. Una reimpresion requiere pulsar Imprimir explicitamente; antes de repetir un trabajo incierto hay que revisar la impresora para evitar duplicados. No se borran capturas ni originales. iOS elimina su PDF temporal al concluir la operacion; Android escribe el documento en el descriptor administrado por el sistema.

## Prueba fisica pendiente para socios

La integracion no esta certificada con hardware. Probar en iOS y Android, anotando modelo, firmware, papel y servicio Android utilizado:

1. Descubrimiento, seleccion, cancelacion y cambio de impresora; misma red local, incluido funcionamiento sin internet.
2. Una fotografia, varias seleccionadas y seleccion con perfiles historicos distintos.
3. Una y varias copias; dos por pagina debe producir dos composiciones iguales por hoja y exactamente las hojas configuradas con una copia nativa.
4. Medir papel, orientacion, margenes y recorte contain/cover; probar color/grises y tiras ya duplicadas.
5. En iOS probar papel incompatible y margenes no admitidos; en Android cambiar papel/orientacion en el dialogo y comprobar el resultado.
6. Falta de papel, desconexion antes/durante envio, segundo plano y cierre inesperado. Revisar la cola antes de reimprimir; no debe haber reintentos automaticos.
7. Comprobar pausa del reinicio, regreso al resultado/galeria sin perder seleccion y permiso revocado.

No incluye USB, servidor intermediario, aplicacion de escritorio ni certificacion de salida fisica.
