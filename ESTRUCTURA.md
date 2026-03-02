# 🗂️ Estructura del proyecto — RDAM Backend

```
campusback/
├── src/
│   ├── main.ts                          # Bootstrap, prefijo /v1, CORS
│   ├── app.module.ts                    # Módulo raíz
│   ├── app.controller.ts
│   ├── app.service.ts
│   │
│   ├── auth/                            # Autenticación JWT
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts           # POST /login, /refresh, /logout — GET /me
│   │   ├── auth.service.ts              # login(), refresh(), logout(), getMe()
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── refresh.dto.ts
│   │   └── strategies/
│   │       └── jwt.strategy.ts          # Estrategia Passport JWT
│   │
│   ├── usuarios/                        # CRUD de usuarios (solo Administrador)
│   │   ├── usuarios.module.ts
│   │   ├── usuarios.controller.ts       # CRUD + cambio de contraseña
│   │   ├── usuarios.service.ts
│   │   └── dto/
│   │       ├── create-usuario.dto.ts
│   │       └── update-usuario.dto.ts
│   │
│   ├── expedientes/                     # Módulo principal de negocio
│   │   ├── expedientes.module.ts
│   │   ├── expedientes.controller.ts    # CRUD + aprobar/rechazar + documentos + certificado
│   │   ├── expedientes.service.ts       # Lógica de estados, documentos, PDF certificado
│   │   └── dto/
│   │       ├── create-expediente.dto.ts
│   │       └── update-expediente.dto.ts
│   │
│   ├── pagos/                           # Pagos y órdenes
│   │   ├── pagos.module.ts
│   │   ├── pagos.controller.ts          # POST /crear-orden — GET /expediente/:id
│   │   ├── pagos.service.ts
│   │   └── dto/
│   │       └── create-pago.dto.ts
│   │
│   ├── certificados/                    # Generación y validación de certificados
│   │   ├── certificados.module.ts
│   │   ├── certificados.controller.ts   # POST /generar — GET /validar/:num — GET /:id/descargar
│   │   └── certificados.service.ts
│   │
│   ├── dashboard/                       # Estadísticas y KPIs
│   │   ├── dashboard.module.ts
│   │   ├── dashboard.controller.ts      # GET /stats
│   │   └── dashboard.service.ts
│   │
│   ├── auditoria/                       # Log de eventos
│   │   ├── auditoria.module.ts
│   │   ├── auditoria.controller.ts      # GET /auditoria
│   │   └── auditoria.service.ts         # registrar(), getLogs()
│   │
│   ├── webhooks/                        # Notificaciones externas de pago
│   │   ├── webhooks.module.ts
│   │   ├── webhooks.controller.ts       # POST /webhooks/pagos
│   │   └── webhooks.service.ts
│   │
│   └── common/                          # Utilidades compartidas
│       ├── interfaces/
│       │   └── jwt-payload.interface.ts # Tipo JwtPayload (id, nombre, email, rol)
│       ├── guards/
│       │   ├── jwt-auth.guard.ts        # Verifica token JWT
│       │   └── roles.guard.ts           # Verifica rol del usuario
│       ├── decorators/
│       │   ├── current-user.decorator.ts # @CurrentUser() → JwtPayload
│       │   └── roles.decorator.ts        # @Roles('Administrador', ...)
│       └── response.helper.ts            # successResponse()
│
├── API-CONTRACT.md                      # Contrato completo de la API (28 endpoints)
├── POSTMAN-GUIA.md                      # Guía paso a paso para testing con Postman
├── ESTRUCTURA.md                        # Este archivo
├── README.md                            # Descripción general y setup
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## Almacenes en memoria (stores)

| Store              | Archivo                                | Descripción            |
| ------------------ | -------------------------------------- | ---------------------- |
| `usersStore`       | `auth/auth.service.ts`                 | Usuarios con seed data |
| `expedientesStore` | `expedientes/expedientes.service.ts`   | Expedientes activos    |
| `auditoriaStore`   | `auditoria/auditoria.service.ts`       | Log de eventos         |
| Pagos              | `pagos/pagos.service.ts`               | Pagos y órdenes        |
| Certificados       | `certificados/certificados.service.ts` | Certificados generados |

> ⚠️ Todos los datos se pierden al reiniciar el servidor (excepto el seed de usuarios).
