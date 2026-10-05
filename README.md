# app-viralco

Aplicacion mobile de ViralCo (React Native CLI) para iOS y Android.

## Instalación para socios

Seguir [INSTALACION_SOCIOS.md](./INSTALACION_SOCIOS.md) para instalar app, backend y web sin editar código. Los archivos `.env` y `.env.local`, accesos y credenciales necesarios deben solicitarse a **Andrés Manrique**. Nunca subirlos al repositorio.

## Desarrollo

```sh
npm ci
npm start
npm run ios
npm run android
```

## Requisitos iOS

```sh
bundle install
cd ios
bundle exec pod install
cd ..
```

## Entorno móvil

Copiar el `.env.local` entregado por Andrés en esta carpeta. Solo se incorporan al bundle estas variables públicas:

```sh
VIRALCO_API_URL=https://api.ejemplo.com
VIRALCO_DEBUG_LOGIN_PRESETS=true
```

La URL no lleva `/api`. Sin URL explícita, Debug utiliza el equipo que sirve Metro, puerto 4000. Reiniciar Metro con `npm start -- --reset-cache` al cambiar estas variables y recompilar si se usa Release.

Los tres indicadores del login completan las cuentas de demostración existentes: superadmin, administrador y usuario recién registrado. No crean cuentas ni activan servicios; no utilizarlos en producción. El archivo `.env.example` no contiene secretos y no reemplaza la configuración entregada por Andrés.
