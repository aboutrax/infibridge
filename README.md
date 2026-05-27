<div align="center">

<img src="src/lib/assets/img/logo.png" width="128" height="128" alt="Infibridge Logo">
    
# Infibridge

A self-hosted webhook bridge that syncs [Infisical](https://infisical.com) secrets to [Convex](https://convex.dev) and [Dokploy](https://dokploy.com) in real time.

When a secret changes in Infisical, Infisical fires a webhook to this bridge. The bridge verifies the signature, fetches the latest secrets, diffs them against the current environment variables, and applies only the changes.

---

## How it works

**Convex**

```
Infisical (secret changed)
    → POST /convex/{projectId}/{environment}/{secretPath}
    → Verify HMAC signature
    → Fetch secrets from Infisical
    → Diff against current Convex env vars
    → Upsert changed vars / delete removed vars
```

**Dokploy**

```
Infisical (secret changed)
    → POST /dokploy/{projectId}/{environment}/{secretPath}
    → Verify HMAC signature
    → Fetch secrets from Infisical
    → Fetch current env blob from Dokploy
    → Merge and write back full env blob
```

---

## Requirements

- Docker and Docker Compose

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/aboutrax/infibridge
cd infibridge
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in your values:

```bash
# Postgres password — pick anything strong
POSTGRES_PASSWORD=""

# Database (Docker Compose — host is 'db', port 5432)
# For local dev with Docker:
DATABASE_URL="postgres://root:mysecretpassword@localhost:15432/local"
# For production with Docker Compose:
DATABASE_URL="postgres://infibridge:${POSTGRES_PASSWORD}@db:5432/infibridge"

# Your public URL (e.g. https://infibridge.example.com)
ORIGIN="https://infibridge.example.com"

# https://www.better-auth.com/docs/installation
BETTER_AUTH_SECRET=""

# Must be exactly 64 hex characters. Generate with: openssl rand -hex 32
# Keep this safe — losing it means losing access to all stored credentials.
ENCRYPTION_KEY=""
```

### 3. Start

```bash
docker compose up -d
```

On first boot, Docker Compose will:

1. Start the Postgres database and wait for it to be healthy
2. Run the `migrate` service to apply all database migrations
3. Start the application on port `15300`

### 4. Verify

```bash
docker compose logs -f
```

You should see:

```
migrate-1  | No config path provided, using default 'drizzle.config.ts'
migrate-1  | ...migrations applied
app-1      | Listening on 0.0.0.0:3000
```

---

## First-time setup

On first visit, you will be redirected to `/setup` to create the admin account. This route is permanently locked once an admin exists.

---

## Configuring a bridge

### 1. Create an environment

Go to **Settings → Infisical Environments** and create an environment matching your Infisical environment slug (e.g. `dev`, `staging`, `prod`). Activate it.

### 2. Create a service bridge

Go to **Projects**, open or create a project, then click **New Service** and choose the target platform.

---

### Convex

| Field          | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| Service Name   | Display name                                                 |
| Convex URL     | Your Convex deployment URL (e.g. `https://xxx.convex.cloud`) |
| Deploy Key     | Convex deploy key (`prod:xxx...`)                            |
| Infisical URL  | Your Infisical instance URL                                  |
| Client ID      | Infisical Machine Identity client ID                         |
| Client Secret  | Infisical Machine Identity client secret                     |
| Project ID     | Infisical project ID                                         |
| Environment    | Select the environment created in step 1                     |
| Secret Path    | Path to sync (e.g. `/`, `/backend`)                          |
| Webhook Secret | A secret you will configure in Infisical                     |

---

### Dokploy

| Field                  | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| Service Name           | Display name                                                   |
| Dokploy URL            | Your Dokploy instance URL (e.g. `https://dokploy.example.com`) |
| API Token              | Generate at Settings → Profile → API/CLI                       |
| App Type               | `application` or `compose`                                     |
| Application/Compose ID | Found in the URL when viewing the service in Dokploy           |
| Infisical URL          | Your Infisical instance URL                                    |
| Client ID              | Infisical Machine Identity client ID                           |
| Client Secret          | Infisical Machine Identity client secret                       |
| Project ID             | Infisical project ID                                           |
| Environment            | Select the environment created in step 1                       |
| Secret Path            | Path to sync (e.g. `/`, `/backend`)                            |
| Webhook Secret         | A secret you will configure in Infisical                       |

---

### 3. Configure the webhook in Infisical

In your Infisical project, go to **Integrations → Webhooks** and create a new webhook:

- **URL**: Copy from the service card (see format below)
- **Secret**: The webhook secret you entered when creating the service
- **Environment**: The environment to watch

### 4. Test it

Trigger a test webhook from Infisical. The bridge will verify the signature and sync all secrets to the target service.

---

## Webhook URL format

**Convex**

```
POST /convex/{infisicalProjectId}/{environment}/{secretPath}
```

**Dokploy**

```
POST /dokploy/{infisicalProjectId}/{environment}/{secretPath}
```

Examples:

```
/convex/1f1cdbd0-.../dev
/convex/1f1cdbd0-.../prod/backend
/dokploy/1f1cdbd0-.../dev
/dokploy/1f1cdbd0-.../prod/backend
/dokploy/1f1cdbd0-.../staging/frontend/api
```

---

## Updating

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

The `migrate` service runs automatically on every `up`, so any new migrations are applied before the app restarts.

---

## Security

### Secrets at rest

All sensitive credentials (deploy keys, API tokens, Infisical client secrets, webhook secrets) are encrypted at rest using AES-256-GCM before being stored in the database. The encryption key is your `ENCRYPTION_KEY` environment variable — protect it carefully.

A database dump without the encryption key is useless.

### Webhook verification

Every incoming webhook is verified using HMAC-SHA256 with a timing-safe comparison. Webhooks older than 5 minutes are rejected to prevent replay attacks.

### Known limitations

- The encryption key cannot be rotated without re-encrypting all rows. Document your key in a secure location.
- The Convex API key is instance-wide (Convex does not support per-service tokens yet). This is an upstream limitation.
- Dokploy's `application.saveEnvironment` replaces the entire env blob. The bridge reads the current blob first, merges changes, and writes it back — but concurrent writes from other sources (e.g. the Dokploy UI) between the read and write will be overwritten.

---

## Roles

| Role    | Permissions                               |
| ------- | ----------------------------------------- |
| `admin` | Full access to all resources              |
| `user`  | Read-only access to projects and services |

The first registered user becomes admin.

---

## Tech stack

- [SvelteKit](https://kit.svelte.dev) — full-stack framework
- [PostgreSQL](https://postgresql.org) + [Drizzle ORM](https://orm.drizzle.team)
- [Better Auth](https://better-auth.com) — authentication
- [Infisical Node SDK](https://infisical.com/docs/sdks/languages/node)
- [Shadcn Svelte](https://shadcn-svelte.com) — UI components
- [Iconify](https://iconify.design) + [Unplugin Icon](https://github.com/unplugin/unplugin-icons) — icons

---

## Contributing

Pull requests are welcome. For significant changes, open an issue first to discuss what you'd like to change.

---

## License

MIT
