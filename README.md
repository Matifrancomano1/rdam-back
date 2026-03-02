# RDAM — Backend API

Backend REST para el sistema de **Registro de Deuda Alimentaria Morosa (RDAM)** de la provincia de Santa Fe. Desarrollado con **NestJS + TypeScript** con almacenamiento en memoria (POC).

---

## 🚀 Stack

| Tecnología      | Uso                                 |
| --------------- | ----------------------------------- |
| NestJS          | Framework principal                 |
| TypeScript      | Lenguaje                            |
| JWT (HS256)     | Autenticación stateless             |
| bcryptjs        | Hash de contraseñas                 |
| multer          | Subida de archivos PDF              |
| class-validator | Validación de DTOs                  |
| uuid            | Generación de IDs                   |
| Almacenamiento  | In-memory (arrays) — sin base datos |

---

## ⚙️ Instalación y ejecución

```bash
# Instalar dependencias
npm install

# Modo desarrollo (hot-reload)
npm run start:dev

# Modo producción
npm run start:prod
```

La API queda disponible en: `http://localhost:3000/v1`

---

## 🔐 Autenticación

Todos los endpoints (excepto `/auth/login`, `/auth/refresh` y `GET /certificados/validar/:numero`) requieren un token JWT en el header:

```
Authorization: Bearer <accessToken>
```

**Roles disponibles:** `Administrador`, `Operador`, `Ciudadano`

---

## 👥 Usuarios de prueba (seed data)

| Username     | Password        | Rol           | Email                         |
| ------------ | --------------- | ------------- | ----------------------------- |
| `admin`      | `Admin123!`     | Administrador | admin@rdam.gob.ar             |
| `operador1`  | `Operador123!`  | Operador      | matias.francomano@rdam.gob.ar |
| `ciudadano1` | `Ciudadano123!` | Ciudadano     | juan.perez@email.com          |

---

## 📋 Módulos y endpoints

| Módulo       | Prefijo            | Descripción                                      |
| ------------ | ------------------ | ------------------------------------------------ |
| Auth         | `/v1/auth`         | Login, logout, refresh, perfil                   |
| Usuarios     | `/v1/usuarios`     | CRUD de usuarios (solo Administrador)            |
| Expedientes  | `/v1/expedientes`  | Gestión de expedientes, documentos, certificados |
| Pagos        | `/v1/pagos`        | Órdenes de pago                 |
| Certificados | `/v1/certificados` | Generación y validación de certificados          |
| Dashboard    | `/v1/dashboard`    | Estadísticas y métricas                          |
| Auditoría    | `/v1/auditoria`    | Log de eventos del sistema                       |
| Webhooks     | `/v1/webhooks`     | Notificaciones de pasarela de pago               |

Ver [`API-CONTRACT.md`](./API-CONTRACT.md) para la documentación completa de cada endpoint.

---

## 📄 Flujo principal de un expediente

```
Pendiente de Revisión
  → [aprobar]  → Aprobado - Pendiente de Pago
  → [pago]     → Pago Confirmado - Pendiente Validación
  → [cert PDF] → Certificado Emitido
```

Ver [`POSTMAN-GUIA.md`](./POSTMAN-GUIA.md) para la guía paso a paso de testing.

---

## 🗂️ Estructura del proyecto

Ver [`ESTRUCTURA.md`](./ESTRUCTURA.md) para el árbol de archivos detallado.

---

## 🧪 Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Cobertura
npm run test:cov
```

---

## 📝 Notas de diseño

- **Sin base de datos:** los datos viven en arrays en memoria. Al reiniciar el servidor se pierden (excepto el seed).
- **Certificados:** se almacenan como `Buffer` en memoria (solo POC). En producción deberían ir a S3 o similar.
- **Tipo de usuario compartido:** `JwtPayload` definido en `src/common/interfaces/jwt-payload.interface.ts` y usado en todos los módulos.
- **Prefijo global:** todas las rutas tienen el prefijo `/v1` configurado en `main.ts`.
