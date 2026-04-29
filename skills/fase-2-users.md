Desarrolla la Fase 2 del sistema ViralCo: dominio núcleo de usuarios, autenticación, sesiones, roles, permisos y aprobación de usuarios.

## CONTEXTO DEL PROYECTO

Este sistema hace parte de una plataforma de captura de contenido en eventos (video 360, cabina de fotos, video mensaje, etc.).

La Fase 2 es crítica porque define quién puede usar el sistema y bajo qué permisos, antes de construir eventos, captura o portal.

Stack definido:

Backend:
- Node.js 24.15.0
- Express 5.1.x
- MariaDB 11.4
- Drizzle ORM
- Knex para migrations y seeds
- npm

App Mobile:
- React Native CLI (NO Expo)
- react-native 0.85.2
- react 19.2.3
- npm

Reglas:
- No usar TypeScript en front ni app
- No romper estructura existente
- Código modular y escalable
- Backend y frontend separados por capas

---

# 🎯 OBJETIVO

Implementar:

- Registro
- Login
- Logout
- Sesiones con JWT + refresh token
- Recuperación de contraseña por correo (token)
- Perfil básico
- Sistema de roles
- Sistema de permisos por slug
- Estados de usuario (pending, active, inactive)
- Sistema de aprobación manual por Super Admin
- Protección de vistas en React Native

---

# 🧱 MODELO DE DATOS

Crear migrations con Knex para las siguientes tablas:

## users
- id (PK)
- email (unique)
- password (hash)
- estado ENUM('pending','active','inactive') DEFAULT 'pending'
- created_at
- updated_at

## roles
- id
- slug (unique) → super_admin, admin, operario, cliente
- name

## permissions
- id
- slug (unique)
- name

## user_roles
- user_id
- role_id

## role_permissions
- role_id
- permission_id

## refresh_tokens
- id
- user_id
- token
- expires_at
- revoked

## password_reset_tokens
- id
- user_id
- token
- expires_at
- used

---

# 🌱 SEEDS OBLIGATORIOS

1. Crear roles:
- super_admin
- admin
- operario
- cliente

2. Crear permisos base:

auth.login
auth.register
profile.view
profile.update

users.view
users.create
users.update
users.delete

roles.view
roles.assign
permissions.view
permissions.assign

events.view
events.create
events.update
events.delete

capture.operate
portal.view
devices.view
devices.manage

3. Crear usuario SUPER ADMIN:

- email: superadmin@viralco.local
- password: hash seguro de string fija (mínimo 12 caracteres)
- estado: active
- role: super_admin

---

# 🔐 LÓGICA DE USUARIOS

Estados:

- pending → usuario registrado, sin acceso
- active → acceso completo según permisos
- inactive → bloqueado manualmente

Flujo:

1. Registro:
   - usuario se registra
   - role = admin
   - estado = pending

2. Usuario pending:
   - NO puede acceder a funcionalidades protegidas
   - backend debe bloquear acceso

3. Super Admin:
   - aprueba usuario → estado = active
   - puede desactivar usuario → estado = inactive

---

# 🔌 ENDPOINTS BACKEND

## Auth

POST /api/auth/register  
POST /api/auth/login  
POST /api/auth/refresh  
POST /api/auth/logout  
POST /api/auth/forgot-password  
POST /api/auth/reset-password  
GET  /api/auth/me  

## Permisos

GET /api/permissions/me

## Super Admin

GET    /api/admin/users  
PATCH  /api/admin/users/:id/activate  
PATCH  /api/admin/users/:id/deactivate  

---

# 🔒 SEGURIDAD

- Usar JWT access token (corto)
- Refresh token persistido en DB
- Hash de password seguro (bcrypt o similar)
- No devolver password nunca
- Tokens sensibles no deben exponerse

---

# 🧠 MIDDLEWARES

Implementar:

requireAuth  
requireRole(roleSlug)  
requirePermission(permissionSlug)

Ejemplo:

requireRole('super_admin')  
requirePermission('events.create')

---

# 📱 REACT NATIVE

## Pantallas

- LoginScreen
- RegisterScreen
- ForgotPasswordScreen
- ResetPasswordScreen
- ProfileScreen
- SuperAdminUsersScreen

---

## Providers

Crear:

AuthProvider  
PermissionProvider  

---

## Hooks

useAuth()  
useCan(permissionSlug)

---

## Componentes

ProtectedScreen  
ProtectedView  
ProtectedButton  

---

## LÓGICA APP

1. Al iniciar:
   - llamar /api/auth/me
   - cargar usuario y permisos

2. Si token expira:
   - intentar refresh automático

3. Si refresh falla:
   - cerrar sesión

4. Si usuario.estado !== 'active':
   - bloquear acceso global
   - mostrar pantalla de “pendiente de aprobación”

---

# 👑 SUPER ADMIN UI

Pantalla:

SuperAdminUsersScreen

Debe mostrar:

- email
- estado (pending / active / inactive)
- botón activar
- botón desactivar

Acciones:

- activar → PATCH activate
- desactivar → PATCH deactivate

---

# ⚠️ REGLAS IMPORTANTES

- NO confiar en frontend para seguridad
- TODA validación debe estar en backend
- NO permitir acceso si estado != active
- Estructura preparada para fases futuras:
  - events
  - capture
  - devices
  - portal

---

# 🧩 ORGANIZACIÓN DE CÓDIGO

Backend:

- /routes
- /controllers
- /services
- /middlewares
- /db (drizzle)
- /migrations (knex)
- /seeds

Frontend:

- /screens
- /components
- /providers
- /hooks
- /services/api

---

# 🎯 RESULTADO ESPERADO

- Usuario se registra → queda pending
- Super admin lo aprueba → pasa a active
- Usuario puede usar sistema
- Permisos controlan vistas y acciones
- App mobile maneja sesión persistente
- Sistema listo para Fase 3 (eventos)

---