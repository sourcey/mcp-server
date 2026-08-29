FROM node:22.22.0-alpine@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34 AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --ignore-scripts
COPY src ./src
COPY scripts/clean.mjs ./scripts/clean.mjs
COPY distribution.json ./
RUN npm run build && npm prune --omit=dev

FROM node:22.22.0-alpine@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34
LABEL org.opencontainers.image.title="Sourcey MCP Server" \
      org.opencontainers.image.description="Stdio bridge to Sourcey's live MCP server" \
      org.opencontainers.image.source="https://github.com/sourcey/mcp-server" \
      org.opencontainers.image.url="https://sourcey.com" \
      org.opencontainers.image.licenses="MIT"
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json distribution.json ./
USER node
ENTRYPOINT ["node", "dist/index.js"]
