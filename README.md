# Dental Stars Asset Manager

## Release versioning

The first Semantic Versioning release is **1.0.0**. `package.json` is the version source of truth; the footer and Settings → Version History use it directly. Historical releases 150–233 retain their original numbers under “Legacy v…” and are not reinterpreted as semantic releases.

Follow [Semantic Versioning](https://semver.org/): **PATCH** for compatible bug/security fixes, **MINOR** for compatible features, and **MAJOR** for breaking changes to supported API contracts, data import/export formats or required workflows. Compatible navigation/style changes do not by themselves require a major bump. The current release tool prepares stable production versions; prerelease channels are not configured.

Prepare a release after finishing its changes:

```sh
pnpm release patch "Fix a user-access validation issue"
pnpm release minor "Add a new reporting workflow"
pnpm release major "Describe the breaking change and migration"
```

Choose **one** command appropriate to the release. Add `--dry-run` to preview without writing. The command updates the package version, prepends dated notes in `app/releases.json`, and updates `SOURCE_VERSION.txt`. It does not commit, tag or push. Previous release notes must remain unchanged. No dependency lockfile update is needed when only this private root package's version changes.

Run `pnpm version:check`, `pnpm test:version`, the checks relevant to the change, and `pnpm run build`. Development and production builds reject inconsistent release metadata. Review and commit the changes, then create an annotated tag on that exact commit, for example `git tag -a v1.0.1 -m "Release v1.0.1"`. Push `main` for the existing Dokploy auto-deployment and push the matching tag, for example `git push origin v1.0.1`. Tags identify releases; they do not replace the existing branch deployment trigger. Never move an already published release tag or change the contents of that release; prepare a new patch instead. Version numbers describe releases, not every intermediate development commit.

A clean full-stack starter running on [vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`
- Portable: Windows, macOS, or Linux; no Bash required
- Managed Linux: managed Linux runtime with Bash, `flock`, `curl`, `sha256sum`, and GNU `timeout`
- Git is required only for publishing

## Sites Lifecycle

The Sites initializer copies the shared starter and selects managed-linux only when `SITES_MANAGED_LINUX_CONTAINER=1`; otherwise it selects portable. It saves the selection only in ignored `.sites-runtime/execution-profile.json`. Both profiles copy/configure first, then use the plugin's separate `install-dependencies.mjs` step to measure installation independently. Edit source under `app/` and follow the Sites skill for installation, preview, builds, and publishing.

Run `node <plugin-root>/scripts/configure-execution-profile.mjs` only when the profile is unknown for the current checkout and environment. Profile changes do not alter tracked source or require reinstalling otherwise-valid dependencies; restart an existing preview to use the new selection. Do not commit or upload `.sites-runtime/`.

This starter does not use `wrangler.jsonc`.

`install:ci` runs `npm ci` once against the shared lockfile, disables parent-workspace discovery, and includes required dev/optional dependencies despite production/omit settings. Sharp defaults to prebuilt binaries unless explicitly configured otherwise. Do not overlap installers.

- **Portable:** Preserve host HOME, npm cache, registry, proxy, temporary paths, retry/concurrency settings, and lifecycle-script policy. Use `--prefer-offline --no-audit --no-fund`.
- **Managed Linux:** Use the existing project-local HOME/cache/tmp setup and Linux install lock, tarball preflight, and timeout. Restore the image-seeded npm cache only when its lockfile hash matches; retain network fallback. Builds keep their existing timeout. These helpers are not invoked by the portable profile.

`scripts/sites-env.mjs` preserves the caller's HOME, npm cache, proxy, XDG, and temporary-directory configuration while defaulting Wrangler and Miniflare state to the checkout. If npm reports an unwritable cache, select a writable path with `npm_config_cache` for that install. The `dev` and `start` scripts also keep Wrangler logs inside the checkout. Generated `.sites-runtime/` and `.wrangler/` directories are disposable and ignored by Git.

On portable, `npm run dev` uses `vinext dev` with HMR, starting at port 5173. Vinext records the running server in ignored `.vinext/` state, rejects an ordinary duplicate launch, and recovers stale state after a stopped process; exactly simultaneous starts can race. Pass `--port <port>` or `--hostname <host>` after `npm run dev --` when needed; keep portable previews on loopback.

For browser QA on managed Linux, use `sites-preview start`. The project's dev script runs Vite and accepts the supervisor's `--host 0.0.0.0 --port 4173 --strictPort` arguments. The internal browser uses `http://terminal.local:4173/`; it is not a user-facing URL. The supervisor owns the preview lifecycle. The ignored local profile survives the supervisor's cleared process environment.

The portable profile simulates ChatGPT sign-in only for loopback development requests. Visit `/signin-with-chatgpt?return_to=/` to sign in as `local_seedy` (`seedy@sites.test`, display name `Seedy`) and `/signout-with-chatgpt?return_to=/` to sign out. The development cookie preserves that identity across server restarts. Mock auth is disabled in the managed-linux profile and is not included in production builds; hosted authentication remains dispatch-owned.

The Worker uses `vinext/server/fetch-handler`, including Vinext's config-aware image handling. After building, `npm start` runs that Worker locally through Wrangler on `127.0.0.1`, sharing `.wrangler/state` with dev preview and local D1 migrations; it does not deploy the site or simulate sign-in. Use the URL printed by the server. Pass `npm start -- --port <port>` to select a different built-preview port.

Local previews use Miniflare's placeholder `Request.cf` metadata without a network lookup. Set `CLOUDFLARE_CF_FETCH_ENABLED=true` to opt into fetching preview metadata; this setting does not change hosted request metadata.

Local tool usage metrics are disabled by default. Set `WRANGLER_SEND_METRICS=true` to opt in.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` now resolves identity from app-managed sessions
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` connects to PostgreSQL using `DATABASE_URL`
- `db/schema.ts` starts intentionally empty
- `@cloudflare/workers-types` provides Worker types; `cloudflare-env.d.ts` declares optional `DB`/`BUCKET` bindings—update these declarations if binding names change
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Custom Login (App-Managed)

This project now supports an app-managed login page at `/login`:

- `POST /api/auth/login` authenticates with email + password and sets an HTTP-only session cookie.
- `/logout` clears the session and redirects to `return_to`.
- Compatibility routes keep existing links working:
  - `/signin-with-chatgpt` → redirects to `/login`
  - `/signout-with-chatgpt` → redirects to `/logout`

Session records are persisted in `auth_sessions`; users are stored in `auth_users`.

Administrators can manage login users directly in **People → Login access**:

- create users with username (email), role, and password
- update username, display name, and role
- reset passwords without exposing existing hashes
- force first-login password reset automatically for newly created users and admin-set password changes
- enforce role-based dashboard access (`Administrator`, `Asset Manager`, `Viewer`, `Staff`, `Suspended`)

## Workspace navigation

| Section | Tools |
| --- | --- |
| Home | Common tasks, equipment/staff counts, follow-ups and recent activity. Full status breakdown is expandable. |
| Equipment | Equipment register, receipts, inventory checks, labels/unused IDs and the administrator archive. Essential columns appear first; Show all columns restores the full register. |
| People | Staff directory, assignments, returns, offboarding and administrator login access/approvals. Unlinked logins can open a prefilled Add person form directly. |
| Activity | Follow-ups, tickets, notifications and searchable equipment history. |
| Reports | Existing reporting with common filters first; date, issuance and warranty filters are under More filters. |
| Settings | Exports, backup/recovery, administrative audit log, equipment types, bundles and version history. People & access opens the People section. |

The navigation redesign keeps the existing API permissions, record dialogs, receipts, label printing, assignment/return actions and reporting calculations. Staff accounts continue to use their personal portal. Browser QA uses local sample records, not the deployed database.

Equipment records open as dedicated pages at `/equipment/<asset-id>`. The default Summary is read-only; Assignment & Returns, Purchase & Maintenance, Documents and History retain their existing actions and permission checks. Edit details opens the existing form, and saving returns to Summary. Back to the originating workspace list retains its filters, pagination and scroll position during in-app navigation. Browser Back/Forward and legacy `?asset=` links are supported. Direct links require sign-in and show only records available through the current user's protected APIs; unavailable records have a safe return to Equipment. Registering a new asset still uses its focused dialog.

Bootstrap your first administrator account by setting:

- `AUTH_BOOTSTRAP_EMAIL`
- `AUTH_BOOTSTRAP_PASSWORD`

The first app start creates that user if it doesn't already exist.

## Dokploy Deployment (GitHub + Docker)

1. Connect your GitHub repository in Dokploy.
2. Create an app from the repository and build it with Docker.
3. Set environment variables:
   - `DATABASE_URL=<dokploy postgres internal connection url>`
   - `AUTH_BOOTSTRAP_EMAIL=<admin email>`
   - `AUTH_BOOTSTRAP_PASSWORD=<strong password>`
   - `NODE_ENV=production`
4. Expose container port `3000`.

`start:docker` runs `scripts/init-postgres.mjs` before starting the app. This script creates required tables and ensures the bootstrap admin user has Administrator access.

### Receipt and evidence storage on the VPS

When `DATABASE_URL` is configured, receipts, evidence, adjusted documents and saved in-app backups use the PostgreSQL `document_objects` table. Startup creates it automatically. File bytes persist in the database service's volume across application redeployments; no Cloudflare account, public bucket, extra environment variables or application-container disk mount is required. Include this table in hosting-level PostgreSQL backups and monitor database disk usage. The application keeps the existing 5 MB document upload and 20 MB in-app backup file limits; saved backups also consume database space. Cloudflare deployments without `DATABASE_URL` retain their original R2 binding.

Moving SQLite/database records alone does **not** move the former ChatGPT-hosted app's uploaded file bytes. A valid complete Dental Stars JSON backup includes a `files` array containing `key`, `type` and `base64` for each receipt/evidence file, including originals retained in history. To recover those files, preview that backup in Settings → Backup & Recovery using **Import Missing Records**: this also restores missing files by their original keys while retaining existing records and existing files. Review the preview before confirming because missing business records may also be added. Do not use Full Restore merely to recover documents. If the original app still opens, export a complete backup there; otherwise locate a previously downloaded complete backup. Missing original bytes cannot be recovered from filenames or database references; upload the originals again if no complete backup is available.

Run `node scripts/verify-document-storage.cjs` for adapter and preview error checks using isolated SQL fixtures. These do not replace a deployment check against the real PostgreSQL service. Deployments that bypass `start:docker` must run `pnpm run db:init:postgres` before serving document requests.

## Security controls

API writes require a same-origin browser request. If the reverse proxy rewrites the Host header, set `APP_ORIGIN` to the public HTTPS origin (for example `https://assets.example.com`). Cookie-authenticated API clients must send that Origin header. This applies to login, password reset, JSON writes, and file uploads.

Login attempts are limited to 10 per email in 15 minutes using an atomic PostgreSQL counter shared across app replicas. Successful sign-in clears that email's counter. `start:docker` also creates `auth_login_attempts`; deployments using another start command must run `pnpm run db:init:postgres` before serving requests. Expired counters can be removed periodically with `DELETE FROM auth_login_attempts WHERE window_started_at < NOW() - INTERVAL '2 days'`.

Login and first-login password reset accept JSON only and enforce a streaming 16 KB body limit, including requests without Content-Length. Password inputs are capped at 1,024 characters before hashing.

Administrator password resets and sign-in email changes revoke the affected user's existing sessions. Mandatory-reset sessions cannot access business APIs. Unexpected API errors return a generic response rather than database details. API responses use private/no-store caching, and middleware applies same-origin framing and MIME-sniffing protections.

Run `node scripts/verify-security.cjs`, `node scripts/verify-user-access.cjs`, and `pnpm audit --prod` after security changes. These handler checks use isolated fixtures; they do not replace a live deployment test with PostgreSQL and the production reverse proxy.

For HTTP checks, start a built preview with `node node_modules/vinext/dist/cli.js start --hostname 127.0.0.1 --port 3199`, then run `node scripts/verify-security-http.cjs`. The HTTP script sends no credentials and checks every protected API method, cross-origin login rejection, authentication body limits and response headers.

At the reverse proxy, enforce HTTPS, request body size limits and IP/global login throttling in addition to the account limit. Keep PostgreSQL private, use a dedicated database user, and keep database/bootstrap secrets in deployment settings. `.dockerignore` excludes `.env` files and private keys from the build context. This source review does not verify deployed firewall rules, TLS, secrets, or bucket access policies. Uploaded files have size/type allowlists but still need content validation or malware scanning for higher assurance; no malware scanner is included.

Audit results (2026-10-16): all 38 protected API methods rejected anonymous requests in handler checks; built HTTP checks confirmed anonymous rejection, cross-origin rejection and security headers. Production dependency advisories fell from 15 to 0. Including development dependencies, two advisories remain: [esbuild under Drizzle Kit](https://github.com/advisories/GHSA-67mh-4wv8-2f99) (moderate; its development server must not be exposed) and [braces under build/lint glob tooling](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) (high; no upstream patch listed). The latter processes build-time patterns, and no business API path to it was identified. Avoid untrusted build patterns and run builds in isolated environments. A limited secret-pattern scan of tracked working-tree files found no candidates; Git history, deployed secrets and remote storage were not scanned. Full TypeScript checking still reports existing PostgreSQL migration/UI typing errors even though the production build and focused security checks pass. The new throttle's actual PostgreSQL execution and the production proxy must be verified after redeployment; local checks use SQL fixtures.

The Node deployment has no Cloudflare R2 binding. Attachment routes now resolve that binding after authorization so anonymous requests receive an authentication error instead of a module-load failure. Authenticated uploads/downloads still require a compatible storage adapter or a runtime with BUCKET configured; moving the lookup does not provide Node storage.

## Migrating Existing SQLite Data to PostgreSQL

If you are migrating from the earlier SQLite deployment, run:

```bash
DATABASE_URL=<postgres-url> SQLITE_PATH=./data/app.db npm run db:migrate:sqlite-to-postgres
```

The migration copies rows for: `assets`, `history`, `staff`, `audits`, `audit_checks`, `settings`, `auth_users`, and `auth_sessions`.

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Use it as the durable user key; use email and name for display or contact purposes.

SIWC-authenticated workspace sites may also receive `oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty `name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by `oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use the returned `userId` as the stable user key for user-owned records; do not use email as a durable identifier.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send anonymous visitors through Sign in with ChatGPT.
- In a Server Component, start sign-in with `<a href={chatGPTSignInPath(returnTo)} target="_top">`. The auth helper module is server-only; do not import it into a Client Component.
- Do not use `fetch`, XHR, a client-side router, or a framework link that can prefetch the sign-in route. SIWC must start as a top-level navigation.
- Never request the AuthAPI authorization endpoint directly. The dispatch-owned `/signin-with-chatgpt` route must start the SIWC flow.
- Use `chatGPTSignOutPath(returnTo)` for browser sign-out links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the OAuth cookies, and identity header injection. Do not implement app routes for those reserved paths. Routes that do not import and call the helper remain anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the Sites hosting platform's access policy controls for workspace-wide restrictions, or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write actions tied to the current ChatGPT user. Leave public content anonymous.

## Local D1 migrations

For a D1-backed local preview, generate SQL with `npm run db:generate`. Build once through the Sites skill's build entrypoint (or `npm run build` for standalone use) to generate `dist/server/wrangler.json`, rebuilding if bindings change. From the project root, apply each pending migration in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_example.sql
```

Replace the filename with the pending migration and `DB` with your D1 binding name if different. Use `.wrangler/state`, not `.wrangler/state/v3`; Wrangler adds the versioned directories. Do not replay migrations already applied locally. This updates only the preview database; publishing applies production migrations separately.

## Diagnostic Commands

- `npm run install:ci`: perform the one locked dependency install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build the deployable Sites artifact
- `npm run start`: preview the built Worker locally with D1/R2 support
- `npm run db:generate`: generate Drizzle migrations after schema changes

When using the Sites plugin, follow its skill instructions for installation, builds, and publishing. These npm commands remain available for standalone use.

The portable build runs Vinext directly without a host `timeout` command. The managed-linux build uses `scripts/build-verified.sh` and its existing `SITES_BUILD_TIMEOUT` setting.

## Table pagination

Screen layouts adapt from narrow phones through tablets and desktops. Filters wrap at tablet widths, small-screen forms use one column, dialogs stay within the available viewport, and wide tables/tabs scroll within their own panels. Touch controls use larger targets and editable fields avoid automatic phone zoom. Safe-area padding supports notched screens. Responsive rules are screen-only so printed label dimensions remain unchanged. The responsive pass was checked with sample data at 320, 390, 768, 1024 and 1440 CSS pixels, plus short landscape layouts; this is viewport testing rather than certification on every physical device/browser.

Tables with more than 10 results offer **Rows per page**: 10, 20, 30, 40, 50 or 100. Activity history offers the same **Entries per page** options. The default is 10. Changing the size returns to the first page, and keyed lists remember the chosen size and page when reopened during the same app session. Small tables keep their compact footer; a previously selected larger size remains available after filtering. Page size controls only the displayed rows; exports continue to include all matching records.

## Password changes and email recovery (VPS / Docker)

Signed-in users can open **Change password** from their account menu (or the Staff portal header). They must enter their current password. A successful change signs out all sessions; they sign in again with the new password. This works without an email provider.

**Forgot password?** on the login screen sends a single-use reset link to the account's sign-in email. Email delivery requires an SMTP provider; it is disabled until configured. In Dokploy's application environment, add the values supplied by your mail provider:

```dotenv
APP_ORIGIN=https://assetmanagement.dentalstarstracker.com.au
SMTP_HOST=smtp.your-provider.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-provider-username
SMTP_PASSWORD=your-provider-password-or-app-password
MAIL_FROM=Dental Stars <no-reply@your-verified-domain.example>
```

Use your actual verified sender address. Port 587 uses required STARTTLS; for port 465 use `SMTP_SECURE=true`. Certificate validation stays enabled. Store credentials in Dokploy, never in Git or chat. See your provider's SMTP settings and [Nodemailer's SMTP documentation](https://nodemailer.com/smtp).

Redeploy after saving the environment. `start:docker` creates the password-reset table in the existing PostgreSQL database. In the deployed container, `node /app/scripts/check-password-email.mjs` checks the configuration, connection and SMTP authentication without sending an email. The absolute path works even when the terminal opens in `/`. The checker distinguishes missing/invalid settings from authentication, DNS, network and TLS errors. It prints only recognized error codes and numeric SMTP status codes, never credential values or raw provider responses. For Mailgun authentication errors, use the sending domain's SMTP credentials (not an API key) and the matching US/EU SMTP host. Then request a reset for a controlled test account and check actual inbox delivery; the connection check alone cannot confirm sender approval or inbox delivery. If delivery fails, the app logs a generic failure without credentials or reset links. Check provider delivery logs and request a fresh link after resolving the configuration.

Links expire after 30 minutes. Only the newest link works. The database stores a token digest, and the link secret is held in a URL fragment and removed from the address bar on opening. Reset completion revokes sessions and other links, and requires signing in again. Password changes do not reactivate suspended access or alter roles. Reset requests return a generic account-independent response and are rate limited. Until SMTP is configured, the request form shows that email recovery is unavailable; it does not claim an email was sent.

Run `node scripts/verify-password-recovery.cjs` for isolated SQL/SMTP security fixtures (no actual database or outbound mail), and `node scripts/verify-security-http.cjs http://127.0.0.1:3199` against a running production preview for HTTP authorization, request limits, origin checks and recovery page headers.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
