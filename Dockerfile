FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable && corepack prepare pnpm@11.0.9 --activate

# --- deps (full install for build/migrate) ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml svelte.config.js .npmrc ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# --- prod-deps (no devDependencies) ---
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# --- build ---
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# --- migrate ---
FROM base AS migrate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENTRYPOINT ["pnpm", "drizzle-kit", "migrate"]

# --- production ---
FROM base AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
EXPOSE 3000
CMD ["node", "build"]
