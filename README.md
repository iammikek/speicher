# Speicher

## The Brief

Implement a small microservice that will interact with the upload service. Its purpose is to store, and surface through a restful API , attributes that have been uploaded, both meta details about the file and custom attributes. The application can be written in a language of your choice but should include unit test coverage and a comprehensive readme to understand how to run, deploy and get started with the solution.

## The service
Built with [Orchestr](https://github.com/orchestr-sh/orchestr).

## Index
- [The Brief](#the-brief)
- [The service](#the-service)
  - [Installation](#installation)
  - [Testing](#testing)
  - [Deploying](#deploying)

### Installation
Prerequisites:
- Node.js 18+ and npm
- SQLite (better-sqlite3 is embedded; no external server required)

Install dependencies:

```bash
npm install
```

Configuration (optional):
- PORT: HTTP port (default 3000)
- DATABASE_FILE: SQLite file path (default ./data/database.db). For ephemeral runs you can use ':memory:'.

Start the API in dev mode:

```bash
npm run dev
```

After first boot the service will auto-create the SQLite schema and expose routes. OpenAPI spec is available at openapi/openapi.yaml.

### Testing
Run the test suite:

```bash
npm run test
```

What’s covered:
- Unit tests for service and controller
- Model relation tests
- Response validation against OpenAPI spec

Tests use in-memory SQLite and set up schema on the active connection to ensure portability in CI.

Type checking:

```bash
npm run typecheck
```

### Deploying
Build and run:

```bash
npm run build
PORT=3000 DATABASE_FILE=/var/lib/speicher/files.db npm start
```

Docker (example):

```Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
ENV PORT=3000
ENV DATABASE_FILE=/data/database.db
EXPOSE 3000
CMD ["node","dist/server.js"]
```

API Overview:
- GET /health
- POST /files
- GET /files/{id}
- GET /files
- POST /files/{id}/attributes
- GET /files/{id}/attributes

OpenAPI:
- File: openapi/openapi.yaml
- The server enforces request validation at runtime via express-openapi-validate using this spec.

Examples:

Create a file:
```bash
curl -X POST http://localhost:3000/files \
  -H "Content-Type: application/json" \
  -d '{
    "externalUploadId": "upl_123",
    "filename": "image.png",
    "contentType": "image/png",
    "sizeBytes": 2048,
    "attributes": [{"key":"quality","value":"high"}]
  }'
```

List files (paginated):
```bash
curl "http://localhost:3000/files?page=1&perPage=20"
```

Get file:
```bash
curl "http://localhost:3000/files/1"
```

Add attributes:
```bash
curl -X POST "http://localhost:3000/files/1/attributes" \
  -H "Content-Type: application/json" \
  -d '{"attributes":[{"key":"env","value":"prod"}]}'
```
