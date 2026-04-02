# Sorteo

SaaS B2B para crear, administrar y monetizar rifas digitales.

## Características

- Gestión de rifas simples y con múltiples oportunidades.
- Integración con WhatsApp para seguimiento de pagos.
- Dashboard de estadísticas en tiempo real.
- Sistema de suscripción para organizadores.

## Desarrollo

```bash
npm install
npm run dev
```

## Base de Datos

El proyecto utiliza SQLite (`sorteo.db`). Si existe una base de datos anterior (`kouun.db`), se migrará automáticamente al iniciar el servidor.

## Deploy en Render (TEMPORAL — eliminar después de pruebas)

Script de build para Render: `npm run build:render`
Start command para Render: `node dist/server.js`

### Variables de Entorno requeridas en Render:
- `JWT_SECRET`: Autenticación de usuarios.
- `MP_ACCESS_TOKEN`: Consultas de pagos en el webhook.
- `MP_WEBHOOK_SECRET`: Validación de firma en webhook.
- `MP_CLIENT_ID`: Flujo OAuth de Mercado Pago.
- `MP_CLIENT_SECRET`: Flujo OAuth de Mercado Pago.
- `ENCRYPTION_KEY`: Cifrado AES-256 de tokens (32 caracteres).
- `APP_URL`: URL base para redirects y webhooks.

### Archivos temporales a eliminar post-pruebas:
- `tsconfig.server.json`
- `render.yaml`
- Script `"build:render"` en package.json
