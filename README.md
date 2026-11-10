# Agentflow_AI

Agentflow_AI turns natural language requests into editable workflow graphs, then executes each run through a persisted agent timeline. The application is split into a Next.js client and an Express API.

## Project layout

```text
client/   Next.js Pages Router, React Flow editor, Zustand auth, Socket.IO client
server/   Express API, Mongoose models, agent orchestration, integrations, queues
spec.md   Full product and implementation specification
```

## Local setup

1. Copy `server/.env.example` to `server/.env` and set `JWT_SECRET` and a 32-byte `CREDENTIAL_ENCRYPTION_KEY` (hex or base64). Add OAuth credentials for any provider you want to connect.
2. In `server/`, install dependencies and run `npm run dev`. MongoDB is required for production; development attempts a local MongoDB connection and falls back to `mongodb-memory-server`.
3. Copy `client/.env.example` to `client/.env.local`. In `client/`, install dependencies and run `npm run dev`.
4. Open `http://localhost:3000`. The API listens on `http://localhost:4000` by default.

Set `REDIS_URL` to enable BullMQ. Without Redis, a bounded in-memory execution queue is used. OpenRouter and Gemini keys are optional; generation uses deterministic graph templates when neither key is set. Individual provider tokens can also be saved from the Integrations page.

## Implemented areas

- Phase 1: project setup, database connection, registration/login, JWT sessions, protected client routes, and app shell foundation.
- Phase 2: workflow CRUD/search/versioning, dashboard metrics, React Flow canvas, node palette, and configuration panel.
- Phase 3: OpenRouter/Gemini workflow generation with deterministic fallbacks.
- Phase 4: persisted executions and logs, planner/execution/validation/recovery/monitoring agents, controls, retries, and notifications.
- Phase 5: OAuth connection flows and encrypted credentials for Gmail, Slack, Discord, and Google Sheets; provider actions execute through their APIs.
- Phase 6: BullMQ or in-memory execution queue, authenticated Socket.IO events, live timelines, and a notifications drawer.

OAuth callback URLs are configured in `server/.env` and must match the redirect URLs registered with each provider. Set `SLACK_SIGNING_SECRET` and subscribe your Slack app to events at `POST /api/integrations/slack/events` to receive Slack event notifications. Discord bot actions need a bot token saved through the Integrations page.
