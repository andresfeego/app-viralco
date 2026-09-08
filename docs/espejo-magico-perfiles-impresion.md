# Perfiles de impresion en Kaptura

## Flujo

En `Espejo magico > Operacion`, el usuario busca y selecciona perfiles de impresion favoritos mediante una lista horizontal. Si no hay favoritos puede ir a Recursos o detectar una impresora desde el dispositivo.

Al seleccionar un perfil se asocia como `event_resource`, se cargan sus valores recomendados y se habilita su edicion por evento. Al quitarlo se desactiva la impresion sin eliminar el recurso de la biblioteca.

## Deteccion local

- iOS abre `UIPrinterPickerController` y conserva localmente nombre y URL usando una clave por cuenta en AsyncStorage.
- La cancelacion no muestra un error.
- Android informa de forma controlada que la deteccion directa todavia no esta disponible.
- La URL de la impresora nunca se envia como parte del recurso global ni de `MirrorConfigV1`.

Una impresora reconocida reutiliza y marca favorito el perfil disponible. Si no existe, se crea un perfil de cuenta editable con valores iniciales Postal 100 x 148 mm, 300 DPI y AirPrint.

## Biblioteca

Recursos incorpora el filtro `Perfiles de impresion`. La accion Agregar, cuando ese tipo esta seleccionado, abre la deteccion nativa en lugar del selector de archivos. El perfil Canon SELPHY CP1500 global se restaura automaticamente por el bootstrap backend.

## Composicion

La pantalla usa un Stack para el ritmo vertical, Reel para perfiles y Cluster/Switcher para acciones y campos que se adaptan al ancho. Todos los espacios, radios, tipografias y colores proceden de tokens y del tema activo.

## Limite actual

Esta entrega configura y detecta; no envia todavia la fotografia final a la impresora. Ese paso se conectara al runtime cuando exista el entregable compuesto.
