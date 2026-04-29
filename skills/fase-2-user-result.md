# Fase 2 Users - Resultado de Implementacion

Fecha: 2026-04-28

## Contexto aplicado

- Raiz proyecto: `/Volumes/02_SSD_1TB/Negocios/ViralCo`
- App movil: `APP/mobile`
- Backend compartido: `WEB/backend`
- Front web: `WEB/front`
- Ramas de trabajo validadas: `and_fase_2_1`

## Alcance implementado

Se implemento la Fase 2 del dominio de usuarios para ViralCo:

- Registro de usuario
- Login
- Logout
- Sesiones con JWT access + refresh token persistido en DB
- Recuperacion de contrasena con token
- Perfil (`/api/auth/me`)
- Sistema de roles
- Sistema de permisos por slug
- Estados de usuario (`pending`, `active`, `inactive`)
- Aprobacion/desactivacion de usuarios por Super Admin
- Segunda capa de confirmacion para vistas/acciones sensibles de Super Admin
- Proteccion de vistas en App mobile (providers, hooks y componentes protegidos)

## Base de datos (Knex)

### Migration nueva

- `WEB/backend/migrations/20260428180000_create_auth_core_tables.cjs`

Tablas creadas:

- `users`
- `roles`
- `permissions`
- `user_roles`
- `role_permissions`
- `refresh_tokens`
- `password_reset_tokens`

### Seed nuevo

- `WEB/backend/seeds/20260428181000_seed_auth_core.cjs`

Incluye:

1. Roles base:
- `super_admin`
- `admin`
- `operario`
- `cliente`

2. Permisos base:
- `auth.login`
- `auth.register`
- `profile.view`
- `profile.update`
- `users.view`
- `users.create`
- `users.update`
- `users.delete`
- `roles.view`
- `roles.assign`
- `permissions.view`
- `permissions.assign`
- `events.view`
- `events.create`
- `events.update`
- `events.delete`
- `capture.operate`
- `portal.view`
- `devices.view`
- `devices.manage`

3. Mapeo inicial `role_permissions` por rol.

4. Usuario super admin:
- email: `superadmin@viralco.local`
- estado: `active`
- role: `super_admin`
- password seed fija: `ViralCo_SA_2026!`

## Backend - arquitectura implementada

Se agregaron capas modulares en `WEB/backend/src`:

- `routes/`
- `controllers/`
- `services/`
- `middlewares/`
- `lib/`

### Endpoints Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`

### Endpoints Permisos

- `GET /api/permissions/me`

### Endpoints Super Admin

- `POST /api/admin/confirm-password`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/activate`
- `PATCH /api/admin/users/:id/deactivate`

## Seguridad implementada

- Password hash con `bcryptjs`
- JWT access token corto
- Refresh token persistido en `refresh_tokens` y revocable
- Token reset password persistido y de un solo uso
- Nunca se retorna password en respuestas
- Bloqueo backend de rutas protegidas cuando `estado != active`

## Middlewares implementados

- `requireAuth`
- `requireActive`
- `requireRole(roleSlug)`
- `requirePermission(permissionSlug)`
- `requireSuperAdminConfirmation`

## Capa extra Super Admin

Flujo implementado:

1. Login normal (`email + password`) con rol `super_admin`
2. Confirmacion adicional por `POST /api/admin/confirm-password`
3. Se emite token temporal de confirmacion
4. Endpoints sensibles de administracion requieren header:
   - `x-super-admin-confirmation: Bearer <token>`

## SMTP simulado

`forgot-password` registra en logs:

- destino
- asunto
- token de recuperacion

No se integro proveedor SMTP real en esta fase.

## Mobile App - implementacion

### Providers

- `AuthProvider`
- `PermissionProvider`

### Hooks

- `useAuth()`
- `useCan(permissionSlug)`

### Componentes protegidos

- `ProtectedScreen`
- `ProtectedView`
- `ProtectedButton`

### Pantallas

- `LoginScreen`
- `RegisterScreen`
- `ForgotPasswordScreen`
- `ResetPasswordScreen`
- `ProfileScreen`
- `SuperAdminUsersScreen`
- `PendingApprovalScreen` (bloqueo global para `pending/inactive`)

### Flujo app

- Boot: carga sesion y llama `/api/auth/me`
- Si access token expira: intenta refresh automatico
- Si refresh falla: cierra sesion
- Si `estado !== active`: bloquea acceso global y muestra pantalla de restriccion

## Variables de entorno recomendadas (backend)

Agregar en `.env`:

- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `ACCESS_TOKEN_TTL` (ej: `15m`)
- `REFRESH_TOKEN_TTL_DAYS` (ej: `30`)
- `SUPER_ADMIN_CONFIRM_SECRET`
- `SUPER_ADMIN_CONFIRM_PASSWORD`
- `SUPER_ADMIN_CONFIRM_TTL` (ej: `10m`)
- `PASSWORD_RESET_TTL_MINUTES` (ej: `30`)

## Dependencias agregadas

### WEB/backend

- `bcryptjs`
- `jsonwebtoken`

### APP/mobile

- `@react-native-async-storage/async-storage`

## Verificacion tecnica ejecutada

- Backend build: OK (`npm run build`)
- Mobile test: OK (`npm test -- --watch=false --runInBand`)

## Resultado funcional esperado

- Usuario nuevo se registra como `admin` con estado `pending`
- Super Admin puede activar/desactivar usuarios admin
- Usuario solo accede a funcionalidades protegidas si estado `active`
- Permisos por slug gobiernan vistas/acciones
- Sesion persistente en app con refresh automatico
- Base lista para Fase 3 (`events`)
