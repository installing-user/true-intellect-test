FROM node:24-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/

RUN npm ci --workspace=web

COPY packages/contracts packages/contracts
COPY apps/web apps/web

# rewrites are resolved at build time and baked into the routes manifest
ARG API_ORIGIN=http://api:3101
ENV API_ORIGIN=$API_ORIGIN NEXT_TELEMETRY_DISABLED=1

RUN npm run build --workspace=web

FROM node:24-slim

ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3100
WORKDIR /app

COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static apps/web/.next/static

USER node
EXPOSE 3100
CMD ["node", "apps/web/server.js"]
