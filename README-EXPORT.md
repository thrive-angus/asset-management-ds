# Dental Stars Asset Manager — source export

Exported 6 October 2026 from the deployed source commit: f0f601b74a79230a6cd9c3aeb943cc838e16b765

## Included
Complete application source, internal UI components, Dental Stars logo, dependency lockfile, build configuration, database schema and SQL migrations. Includes QR/barcode scanning, registration, assignment/return histories, staff handovers, reports, inventory checks and the collapsible sidebar.

## Requirements and local development
Node.js 22.13 or later; pnpm 11.25.0 (as pinned in package.json).
Unzip this folder, install that pnpm version, then run from the project folder:

    pnpm install --frozen-lockfile
    copy .env.example .env
    pnpm dev

For a production build:

    pnpm build

The app is React/TypeScript running through Vinext/Vite, with a PostgreSQL database accessed by Drizzle. Existing scripts include managed environment support; do not copy checkout-local runtime settings from another machine.

## Database
Source definitions are in db/schema.ts. Configure DATABASE_URL in .env (see .env.example), then apply migrations:

    pnpm db:migrate

The SQL files under drizzle/ are PostgreSQL-compatible and can be applied by Drizzle or manually in sequence.

An empty new database needs the migrations before the API can read/write records. The export does not include equipment, staff, audit or activity records from the live database. A separate data export is needed to migrate existing records.

## Authentication
The app now uses in-app session authentication with secure HTTP-only cookies and a login page at /login. Configure APP_SESSION_SECRET in production (minimum 32 characters), and set APP_LOGIN_EMAIL and APP_LOGIN_PASSWORD to your staff credentials.

For production, replace the dummy login credentials with your own staff auth flow or SSO provider.

## Migration notes
If you are migrating from ChatGPT Sites + D1 to your own hosting:

1. Provision PostgreSQL on your server and create a database.
2. Set DATABASE_URL, APP_SESSION_SECRET, APP_LOGIN_EMAIL and APP_LOGIN_PASSWORD.
3. Run pnpm db:migrate before starting the app.
4. Import historical asset/staff/audit data from your previous export.
5. Validate QR links after domain cutover.

## QR labels
QR labels contain the current browser origin plus an asset ID. If the app domain changes, existing URL-based printed labels may need replacement; asset IDs and supported barcode scanning can still be reused. Phone camera access requires HTTPS in production and camera permission.

## Main files
- app/asset-app.tsx: main interface and sidebar
- app/qr-tools.tsx: scanner and QR labels
- app/staff-workflows.tsx: staff equipment handovers
- app/inventory-checks.tsx: inventory verification
- app/api/: database APIs
- db/ and drizzle/: schema and migrations
- public/dental-stars-logo.png: brand logo

## Export notes
Dependencies, build output, Git history, credentials, local runtime state and uploaded reference screenshots are excluded. Install dependencies from the included lockfile. The most recent source build passed before export; independent hosting and phone camera scanning require testing in the target environment. Third-party dependency licenses still apply; retained vendor license files are included.
