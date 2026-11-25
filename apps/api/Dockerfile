FROM node:24-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/

RUN npm ci --workspace=api

COPY packages/contracts packages/contracts
COPY apps/api apps/api

RUN npm run build --workspace=api

FROM node:24-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/

RUN npm ci --omit=dev --workspace=api && npm cache clean --force

COPY --from=build /app/apps/api/dist apps/api/dist

COPY apps/api/db apps/api/db
COPY apps/api/test apps/api/test

WORKDIR /app/apps/api

USER node
EXPOSE 3101
CMD ["node", "dist/main.js"]
