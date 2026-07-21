# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM node:22-bookworm-slim AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY backend/prisma ./prisma
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate

FROM backend-build AS migration
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

FROM backend-build AS backend-runtime-deps
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
WORKDIR /app
COPY --chown=node:node --from=backend-runtime-deps /app/backend/node_modules ./backend/node_modules
COPY --chown=node:node backend/package.json ./backend/package.json
COPY --chown=node:node backend/src ./backend/src
COPY --chown=node:node --from=frontend-build /app/frontend/dist ./frontend/dist
COPY --chown=node:node start.sh ./start.sh
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3001/api/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
ENTRYPOINT ["./start.sh"]
