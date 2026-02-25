# 📁 Estructura del Proyecto — `campusback`

Backend NestJS del sistema RDAM. Todos los archivos fuente viven bajo `src/`.

---

## Raíz de `src/`

| Archivo             | Descripción                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `main.ts`           | Punto de entrada. Levanta la app NestJS, configura prefijo global `/api`, pipes de validación y filtros de excepción. |
| `app.module.ts`     | Módulo raíz. Importa y conecta todos los módulos de la aplicación.                                                    |
| `app.controller.ts` | Controlador raíz (health-check básico).                                                                               |
| `app.service.ts`    | Servicio raíz mínimo.                                                                                                 |

---

## 📂 `auth/` — Autenticación

Gestiona login, generación y validación de JWT.

| Archivo                      | Descripción                                                      |
| ---------------------------- | ---------------------------------------------------------------- |
| `auth.module.ts`             | Registra el módulo, importa JwtModule y PassportModule.          |
| `auth.controller.ts`         | Expone `POST /auth/login` y `POST /auth/refresh`.                |
| `auth.service.ts`            | Valida credenciales, firma tokens JWT, maneja refresh tokens.    |
| `dto/login.dto.ts`           | DTO para el body del login (email, password).                    |
| `dto/refresh.dto.ts`         | DTO para el body del refresh token.                              |
| `strategies/jwt.strategy.ts` | Estrategia Passport que valida el JWT en cada request protegido. |

---

## 📂 `usuarios/` — Gestión de Usuarios

CRUD de usuarios internos del sistema (operadores, administradores).

| Archivo                     | Descripción                                                            |
| --------------------------- | ---------------------------------------------------------------------- |
| `usuarios.module.ts`        | Registra el módulo y sus dependencias.                                 |
| `usuarios.controller.ts`    | Endpoints para crear, listar, obtener, actualizar y eliminar usuarios. |
| `usuarios.service.ts`       | Lógica de negocio: almacén en memoria, hash de contraseñas, búsqueda.  |
| `dto/create-usuario.dto.ts` | DTO para creación de usuarios.                                         |
| `dto/update-usuario.dto.ts` | DTO para actualización parcial de usuarios.                            |

---

## 📂 `expedientes/` — Expedientes Judiciales

Módulo central. Maneja el ciclo de vida completo de un expediente.

| Archivo                        | Descripción                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `expedientes.module.ts`        | Registra el módulo con MulterModule para uploads de archivos.                                       |
| `expedientes.controller.ts`    | Endpoints: crear, listar, obtener, actualizar, aprobar, rechazar, cargar documentos, validar pagos. |
| `expedientes.service.ts`       | Lógica completa: estados, historial, documentos adjuntos, pagos asociados.                          |
| `dto/create-expediente.dto.ts` | DTO para alta de expediente (cliente, monto, juzgado, etc.).                                        |
| `dto/update-expediente.dto.ts` | DTO para actualización parcial del expediente.                                                      |

---

## 📂 `pagos/` — Pagos

Registro y seguimiento de pagos vinculados a expedientes.

| Archivo                  | Descripción                                                               |
| ------------------------ | ------------------------------------------------------------------------- |
| `pagos.module.ts`        | Registra el módulo.                                                       |
| `pagos.controller.ts`    | Endpoints para registrar y listar pagos.                                  |
| `pagos.service.ts`       | Lógica de negocio: creación de pagos, vinculación a expedientes, estados. |
| `dto/create-pago.dto.ts` | DTO para registrar un nuevo pago.                                         |
| `dto/update-pago.dto.ts` | DTO para actualizar el estado de un pago.                                 |

---

## 📂 `certificados/` — Certificados

Generación y descarga de certificados en PDF para los expedientes.

| Archivo                           | Descripción                                                       |
| --------------------------------- | ----------------------------------------------------------------- |
| `certificados.module.ts`          | Registra el módulo.                                               |
| `certificados.controller.ts`      | Endpoints para generar y obtener certificados de un expediente.   |
| `certificados.service.ts`         | Lógica: genera el certificado, lo almacena y devuelve el recurso. |
| `dto/generate-certificado.dto.ts` | DTO para la solicitud de generación de certificado.               |

---

## 📂 `dashboard/` — Dashboard

Estadísticas y métricas globales del sistema para el panel de administración.

| Archivo                   | Descripción                                                      |
| ------------------------- | ---------------------------------------------------------------- |
| `dashboard.module.ts`     | Registra el módulo e importa los servicios necesarios.           |
| `dashboard.controller.ts` | Expone `GET /dashboard/stats` con métricas generales.            |
| `dashboard.service.ts`    | Calcula totales: expedientes por estado, pagos, montos, alertas. |

---

## 📂 `auditoria/` — Auditoría

Log de todas las acciones relevantes realizadas en el sistema.

| Archivo                   | Descripción                                                    |
| ------------------------- | -------------------------------------------------------------- |
| `auditoria.module.ts`     | Registra el módulo.                                            |
| `auditoria.controller.ts` | Endpoint para consultar el log de auditoría con filtros.       |
| `auditoria.service.ts`    | Almacena y consulta eventos de auditoría (quién, qué, cuándo). |

---

## 📂 `webhooks/` — Webhooks

Recepción de notificaciones externas (ej: confirmación de pagos de pasarelas).

| Archivo                  | Descripción                                                                |
| ------------------------ | -------------------------------------------------------------------------- |
| `webhooks.module.ts`     | Registra el módulo.                                                        |
| `webhooks.controller.ts` | Endpoint público `POST /webhooks/pagos` para recibir eventos externos.     |
| `webhooks.service.ts`    | Procesa el evento recibido y actualiza el estado del pago correspondiente. |

---

## 📂 `common/` — Utilidades Compartidas

Código transversal reutilizado por todos los módulos.

### `common/guards/`

| Archivo             | Descripción                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| `jwt-auth.guard.ts` | Guard que protege rutas verificando el token JWT.                        |
| `roles.guard.ts`    | Guard que verifica que el usuario tenga el rol requerido (vía `@Roles`). |

### `common/decorators/`

| Archivo                     | Descripción                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `roles.decorator.ts`        | Decorador `@Roles('Admin', 'Operador')` para marcar el rol requerido en un endpoint. |
| `current-user.decorator.ts` | Decorador `@CurrentUser()` para inyectar el usuario autenticado en el handler.       |

### `common/filters/`

| Archivo                    | Descripción                                                            |
| -------------------------- | ---------------------------------------------------------------------- |
| `http-exception.filter.ts` | Filtro global que da formato uniforme a todas las respuestas de error. |

### `common/`

| Archivo              | Descripción                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `response.helper.ts` | Helper `successResponse(data)` para envolver respuestas exitosas en un formato estándar. |

---

## Patrón general de cada módulo

Cada módulo funcional sigue el mismo patrón de tres archivos:

```
modulo/
├── modulo.module.ts      ← Declaración del módulo NestJS
├── modulo.controller.ts  ← Define las rutas HTTP y sus decoradores
├── modulo.service.ts     ← Contiene la lógica de negocio
└── dto/                  ← Objetos de transferencia de datos (validación de entrada)
```
