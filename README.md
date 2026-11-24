
# Wholesale of Oklahoma

## Project layout

- `client/` contains the React/Vite storefront and static assets.
- `server/` contains the Express app, API routes, services, and repositories.
- `shared/` contains types and catalog data used by both applications.
- `api/index.ts` is the Vercel serverless adapter; it forwards API requests to the Express app.
- `scripts/`, `tests/`, `data/`, and `storage/` remain at the repository root for existing tooling and runtime data paths.

The root `package.json` manages the client, server, and shared workspaces. Run `npm run dev`, `npm run build`, `npm start`, `npm run lint`, and `npm test` from the repository root.

## Persistence

PostgreSQL is the runtime source of truth for applications, customers, users, orders, inventory overrides, settings, security tokens, document metadata, and audit logs. Business records are held in typed relational columns and child tables; runtime writes update only changed records and never rewrite the whole database. The server requires `DATABASE_URL`; it will not silently fall back to JSON files.

1. Copy `.env.example` to `.env`.
2. Start local PostgreSQL with `docker compose up -d postgres`.
3. Run `npm run db:check` to verify connectivity.
4. Run `npm run db:migrate` to create the PostgreSQL schema.
5. To carry over existing file-backed data, run `npm run db:import-json`. The importer backs up `storage/database_state.json` (or `data/seed_database_state.json` if no runtime file exists) before importing. To create a separate backup without importing, run `npm run db:backup-json`.
6. If `storage/documents/document-index.json` exists, run `npm run db:import-legacy-documents` to import its metadata. When `S3_BUCKET` is configured, this command also uploads the indexed private blobs using the AWS credential chain.

The JSON importer is transactional and refuses to import over existing application records. Its backup step must succeed before import begins. Backups are saved under `storage/backups/` with restricted file permissions and contain sensitive customer information: keep them private and out of version control.

Attachments are stored privately outside the public web root. Local development writes blob files under `storage/documents` and persists metadata in PostgreSQL. Production must set `AWS_REGION` and `S3_BUCKET`; the AWS SDK uses the hosting environment's IAM role/default credential chain (never configure credentials in source). S3 objects are encrypted at rest and downloads continue to require admin authorization.

`npm test` uses the test adapter by default and does not connect to `DATABASE_URL`. Its JSON-backed fixtures are copied into a private temporary directory so the test suite cannot overwrite local development data. To run the suite against PostgreSQL, set `WOO_TEST_DATABASE_URL` to a dedicated disposable test database; when `WOO_TEST_MODE=true`, the application uses only that URL and never falls back to `DATABASE_URL`.
