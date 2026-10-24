# Academic & Dev Dashboard Personal

Dashboard personal con Next.js App Router, TypeScript, Tailwind CSS, Prisma y PostgreSQL. La pantalla inicial incluye datos de ejemplo para mostrar el horario y las tarjetas de notas. El esquema Prisma y el endpoint de IA están preparados para conectarse a servicios configurados.

## Requisitos

- Node.js 20.9 o superior y npm
- Docker Desktop (para iniciar PostgreSQL con el Compose incluido), o una instancia propia de PostgreSQL
- Una clave de una API compatible con OpenAI, solo si quieres probar el endpoint de IA

## Ejecutar en Windows

Abre PowerShell en esta carpeta (`academic-dev-dashboard`) y ejecuta:

```powershell
npm ci
Copy-Item .env.example .env
docker compose up -d postgres
npm run db:generate
npm run db:push
npm run dev
```

Abre `http://localhost:3000`. La página del dashboard funciona con datos de demostración; PostgreSQL queda listo para el esquema Prisma. Si ya tienes PostgreSQL en otra ubicación, omite Docker y actualiza `DATABASE_URL` en `.env`.

El endpoint `POST /api/ai/breakdown` recibe `{ "title": "..." }` y devuelve `{ "subtasks": ["...", "...", "...", "..."] }`. Para habilitarlo, configura `AI_API_KEY` y `AI_MODEL` en `.env`; `AI_BASE_URL` es opcional y acepta la URL raíz de una API compatible (por defecto usa `https://api.openai.com/v1`). Sin clave y modelo configurados, el endpoint responde `503 AI_NOT_CONFIGURED`. No se incluye ninguna credencial.

Para detener PostgreSQL: `docker compose down`. Para detenerlo y borrar sus datos locales: `docker compose down -v`.

## Comprobaciones

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```
