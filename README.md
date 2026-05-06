# app-viralco

Aplicacion mobile de ViralCo (React Native CLI) para iOS y Android.

## Desarrollo

```sh
npm install
npm start
npm run ios
npm run android
```

## Requisitos iOS

```sh
bundle install
bundle exec pod install
```

## Debug login presets (variables de entorno)

Para habilitar los botones `SA / AUA / AUP` sin credenciales hardcodeadas:

```sh
VIRALCO_DEBUG_LOGIN_PRESETS=true
VIRALCO_LOGIN_SA_EMAIL=superadmin@viralco.local
VIRALCO_LOGIN_SA_PASSWORD=tu_password
VIRALCO_LOGIN_AUA_EMAIL=admin.active@viralco.local
VIRALCO_LOGIN_AUA_PASSWORD=tu_password
VIRALCO_LOGIN_AUP_EMAIL=admin.pending@viralco.local
VIRALCO_LOGIN_AUP_PASSWORD=tu_password
```

Si falta email o password en una credencial, ese botón no se muestra.
