# Scripts Documentation

## Server Management

When working with the backend server (`server/`), especially when changing data types or database schemas, you must restart the server process to pick up changes.

The `package.json` includes helper scripts for Windows development:

- `npm run kill:4000`: Forcefully terminates any process listening on port 4000.
- `npm run restart:server`: Kills the process on port 4000 and starts the server again.
- `npm run dev:server`: Alias for starting the server (`node server/index.cjs`).

### Type Changes

If you modify `server/db.cjs` (e.g., adding boolean normalization) or route handlers, use `npm run restart:server` to ensure the running instance reflects your code.
