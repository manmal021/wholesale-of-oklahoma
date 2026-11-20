
# Wholesale of Oklahoma

## Project layout

- `client/` contains the React/Vite storefront and static assets.
- `server/` contains the Express app, API routes, services, and repositories.
- `shared/` contains types and catalog data used by both applications.
- `api/index.ts` is the Vercel serverless adapter; it forwards API requests to the Express app.
- `scripts/`, `tests/`, `data/`, and `storage/` remain at the repository root for existing tooling and runtime data paths.

The root `package.json` manages the client, server, and shared workspaces. Run `npm run dev`, `npm run build`, `npm start`, `npm run lint`, and `npm test` from the repository root.

## Persistence

The current application still uses its existing file-backed stores. Prisma and PostgreSQL have not been configured or adopted yet; database migration should be done separately with a schema and data migration plan.
