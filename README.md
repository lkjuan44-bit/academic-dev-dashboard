# Academic & Dev Dashboard Personal

Dashboard privado construido con Next.js App Router, TypeScript, Tailwind CSS, Prisma y PostgreSQL. Permite administrar cursos, cortes/notas, horarios y tareas; el acceso se restringe a una cuenta de GitHub autorizada.

[![Desplegar en Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flkjuan44-bit%2Facademic-dev-dashboard)

## Requisitos

- Node.js 20.9 o superior y npm
- PostgreSQL: Docker Desktop está incluido como opción para desarrollo local
- Una GitHub OAuth App (crea apps separadas para `localhost` y Vercel)
- Una API compatible con OpenAI, opcional, para desglosar tareas con IA

## Ejecutar en Windows

Abre PowerShell en esta carpeta y ejecuta:

```powershell
npm ci
Copy-Item .env.example .env
docker compose up -d postgres
```

En GitHub > Settings > Developer settings > OAuth Apps, crea una app para desarrollo con:

- **Homepage URL:** `http://localhost:3000`
- **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`

Copia su Client ID y Client Secret en `AUTH_GITHUB_ID` y `AUTH_GITHUB_SECRET` del archivo `.env`. Configura `GITHUB_ALLOWED_LOGIN` con el nombre de usuario GitHub autorizado. Genera un secreto de sesión con:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Pega el resultado en `AUTH_SECRET`. Después ejecuta:

```powershell
npm run db:generate
npm run db:push
npm run dev
```

Abre `http://localhost:3000` e inicia sesión con la cuenta de GitHub permitida. Si usas otra base PostgreSQL en vez de Docker, configura `DATABASE_URL` y `DIRECT_URL` en `.env`.

## Publicar en Vercel

Pulsa **Desplegar en Vercel**, inicia sesión y autoriza GitHub si te lo solicita. Vercel detecta Next.js y entrega una dirección pública `*.vercel.app`.

Conecta una base de datos PostgreSQL (por ejemplo, Neon) y agrega sus URLs como `DATABASE_URL` y `DIRECT_URL` en las variables de entorno de Vercel. Crea otra GitHub OAuth App con el dominio Vercel de producción como Homepage URL y `https://TU-DOMINIO-VERCEL/api/auth/callback/github` como callback. Configura también:

- `AUTH_SECRET`: secreto aleatorio largo, distinto de cualquier credencial.
- `AUTH_GITHUB_ID` y `AUTH_GITHUB_SECRET`: credenciales de la GitHub OAuth App de producción.
- `GITHUB_ALLOWED_LOGIN`: usuario autorizado; por defecto `lkjuan44-bit`.
- `AI_API_KEY` y `AI_MODEL`: opcionales, para activar el desglose de tareas con IA.
- `AI_BASE_URL`: opcional; por defecto `https://api.openai.com/v1`.

No publiques credenciales ni las añadas al repositorio. Tras configurar la base de datos, ejecuta `npm run db:push` contra ella para crear las tablas. Si Vercel importó el proyecto como una copia Git, conecta esa copia en Settings > Git o importa el repositorio fuente `lkjuan44-bit/academic-dev-dashboard` para que los cambios nuevos también se desplieguen.

## Qué se puede editar

En el panel puedes crear, editar y eliminar cursos, cortes y notas, horarios semanales y tareas. Los cambios se guardan en PostgreSQL y cada registro queda asociado a la cuenta autenticada.

`POST /api/ai/breakdown` recibe `{ "title": "..." }` y devuelve cuatro subtareas en JSON. Requiere sesión y, para llamar al proveedor, `AI_API_KEY` y `AI_MODEL`; si estas variables no están configuradas, responde `503 AI_NOT_CONFIGURED`.

## Comprobaciones

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```
