# iOS Device Debug Configuration

Fecha de referencia: 2026-08-19  
Equipo usado: Mac mini de Andres  
Dispositivo fisico usado: iPhone de Andres  
Bundle ID instalado: `com.viralco.mobile.andres`

## Objetivo

Permitir correr la app React Native de ViralCo en un iPhone fisico conectado por cable o por red local, usando:

- Metro en el Mac.
- Backend local en el Mac.
- iPhone conectado a la misma red WiFi.

## Configuracion actual que funciono

### IP LAN del Mac

IP usada en esta sesion:

```bash
192.168.20.188
```

Esta IP puede cambiar si cambia la red WiFi o reinicia el router. Antes de correr en iPhone fisico, verificarla con:

```bash
ipconfig getifaddr en0
```

### Backend

El backend debe escuchar en todas las interfaces, no solo en localhost.

Comando usado:

```bash
cd /Volumes/02_SSD_1TB/Negocios/ViralCo/WEB/backend
/Volumes/01_SSD_1TB/USUARIO/.nvm/versions/node/v24.15.0/bin/node \
  /Volumes/01_SSD_1TB/USUARIO/.local/npm/package/bin/npm-cli.js run dev
```

URL LAN validada desde el Mac:

```bash
curl -i http://192.168.20.188:4000/health
```

Resultado esperado:

```text
HTTP/1.1 200 OK
{"ok":true}
```

### Metro para iPhone fisico

Para iPhone fisico Metro debe escuchar en `0.0.0.0`, no en `127.0.0.1`.

Comando usado:

```bash
cd /Volumes/02_SSD_1TB/Negocios/ViralCo/APP/mobile
/Volumes/01_SSD_1TB/USUARIO/.nvm/versions/node/v24.15.0/bin/node \
  /Volumes/01_SSD_1TB/USUARIO/.local/npm/package/bin/npm-cli.js exec -- \
  react-native start --host 0.0.0.0 --port 8081
```

URL LAN validada:

```bash
curl -I http://192.168.20.188:8081/status
```

Resultado esperado:

```text
HTTP/1.1 200 OK
```

## Cambios nativos iOS aplicados

### Bundle URL para device fisico

Archivo:

```text
APP/mobile/ios/mobile/AppDelegate.swift
```

Configuracion esperada:

- Simulador: `http://127.0.0.1:8081/index.bundle?...`
- iPhone fisico: `http://192.168.20.188:8081/index.bundle?...`

Si cambia la IP del Mac, actualizar este archivo o configurar el bundler manualmente desde el Dev Menu.

### API base para iOS

Archivos:

```text
APP/mobile/src/config/api.js
APP/mobile/src/config/api.ts
```

Configuracion actual para iOS:

```js
const host = Platform.OS === 'android' ? '10.0.2.2' : '192.168.20.188';
```

Si cambia la IP del Mac, actualizar estos archivos o introducir una configuracion de entorno real para `VIRALCO_API_URL`.

Nota: en esta app `process.env.VIRALCO_API_URL` no queda inyectado automaticamente en el bundle React Native con la configuracion actual de Babel/Metro. Por eso se dejo la IP LAN como fallback explicito.

## Firma iOS que funciono

Target iOS:

```text
APP/mobile/ios/mobile.xcworkspace
Target: mobile
Signing & Capabilities
```

Valores actuales detectados con `xcodebuild -showBuildSettings`:

```text
CODE_SIGN_STYLE = Automatic
DEVELOPMENT_TEAM = 8L7LMDPVN7
PRODUCT_BUNDLE_IDENTIFIER = com.viralco.mobile.andres
CODE_SIGN_IDENTITY = iPhone Developer
```

Certificado local usado:

```text
Apple Development: andres.feego@gmail.com (QNZSVW3URJ)
TeamIdentifier = 8L7LMDPVN7
```

## Problemas resueltos

### Bundle Identifier no disponible

El bundle original no funciono:

```text
org.reactjs.native.example.mobile
```

Error:

```text
Failed Registering Bundle Identifier
```

Solucion aplicada:

```text
com.viralco.mobile.andres
```

### Certificado Apple Root CA no confiado para codesign

Error durante firma:

```text
Warning: unable to build chain to self-signed root for signer
Apple Development: andres.feego@gmail.com (QNZSVW3URJ)
errSecInternalComponent
```

Solucion aplicada:

1. Instalar `AppleIncRootCertificate.cer` desde Apple.
2. Abrir Keychain Access.
3. En `System`, buscar `Apple Root CA`.
4. Marcar `Always Trust` / `Confiar siempre`.
5. Reiniciar trustd:

```bash
killall trustd
```

Verificacion que debe pasar:

```bash
tmp=/tmp/codesign-test-viralco
echo test > "$tmp"
codesign --force --sign 4BB6E4F59BCF263D7BC7E119218447BC7E492642 "$tmp"
codesign -dv "$tmp" 2>&1 | head -24
```

Debe mostrar:

```text
TeamIdentifier=8L7LMDPVN7
```

### App instalada pero iPhone no la abria

Despues de instalar, iOS bloqueo el launch con:

```text
profile has not been explicitly trusted by the user
```

Solucion en iPhone:

```text
Settings > General > VPN & Device Management > Trust Andres Manrique / Apple Development profile
```

## Instalar en iPhone fisico

Con backend y Metro ya activos:

```bash
cd /Volumes/02_SSD_1TB/Negocios/ViralCo/APP/mobile
VIRALCO_API_URL=http://192.168.20.188:4000 \
/Volumes/01_SSD_1TB/USUARIO/.nvm/versions/node/v24.15.0/bin/node \
/Volumes/01_SSD_1TB/USUARIO/.local/npm/package/bin/npm-cli.js exec -- \
react-native run-ios --device "iPhone de Andres" --no-packager --extra-params "-allowProvisioningUpdates"
```

Resultado esperado:

```text
success Successfully built the app
success Installed the app on the device
```

Si el launch falla pero la instalacion fue exitosa, abrir la app manualmente desde el iPhone.

## Verificaciones rapidas

### Dispositivo conectado

```bash
xcrun devicectl list devices
```

Debe aparecer:

```text
iPhone de Andres ... available (paired)
```

### Backend

```bash
curl -i http://192.168.20.188:4000/health
```

### Metro

```bash
curl -I http://192.168.20.188:8081/status
```

### Tipos de evento y modos

Requiere token de login. En la sesion validada, el backend devolvio:

```text
event_types: boda, cumpleanos, bautizo, quince-anos, grado, baby-shower, corporativo
modes: foto, video-360, videoblog
```

## Pendientes recomendados

- Crear scripts separados:
  - `ios:metro:lan`
  - `ios:device`
- Evitar hardcodear IP LAN en codigo fuente con una configuracion de entorno real para React Native.
- Definir un bundle id definitivo de producto, por ejemplo `com.viralco.app`, cuando exista cuenta Apple Developer formal.
- Cambiar display name de la app de `mobile` a `ViralCo` cuando se decida branding final.
