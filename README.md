# DSA Verse — Local Development

This is a LeetCode-style practice platform built with Next.js, TypeScript, Tailwind and Firebase.

Quick start

1. Install dependencies

```bash
npm install
```

2. Run dev server

```bash
npm run dev
```

Open http://localhost:3000

Firebase setup

- `src/firebase/firebase.ts` is configured with a Firebase web config (client). To use Firestore authentication, make sure your Firebase project allows authenticated writes or configure rules appropriately.

Service account (server/admin) credentials

This project supports two ways to provide Firebase Admin credentials for server-side APIs:

- Option A — stringified env var (`FIREBASE_SERVICE_ACCOUNT`):

   PowerShell (temporary for current shell):

   ```powershell
   $env:FIREBASE_SERVICE_ACCOUNT = Get-Content '.\service-account.json' -Raw
   npm run dev
   ```

   Bash / macOS / Linux:

   ```bash
   export FIREBASE_SERVICE_ACCOUNT="$(cat ./service-account.json)"
   npm run dev
   ```

   This method passes the JSON contents directly to the app (useful for CI or ephemeral shells).

- Option B — Application Default Credentials via `GOOGLE_APPLICATION_CREDENTIALS` (path):

   PowerShell:

   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS = 'D:\path\to\service-account.json'
   npm run dev
   ```

   Bash / macOS / Linux:

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/full/path/to/service-account.json"
   npm run dev
   ```

   This is the standard Google Cloud approach; the Admin SDK will pick up credentials automatically from that path.

Security notes

- Do NOT commit `service-account.json` to version control. This repo now includes `service-account.json` in `.gitignore` to help avoid accidental commits.
- Prefer storing secrets in your environment or a secrets manager for CI/CD.

Which to use?

- For local development, either option works. If you already have a file, Option B is simplest. If you need to inject JSON in CI, Option A is handy.

The server initializer will prefer `FIREBASE_SERVICE_ACCOUNT` (stringified JSON), then `service-account.json` at the project root, then `GOOGLE_APPLICATION_CREDENTIALS` (ADC).

Admin UI note

To enable the admin UI for the admin user created by the scripts, set the following environment variable locally or in your hosting provider:

```env
NEXT_PUBLIC_ADMIN_EMAIL=admin@dsa-verse.test
```

This value should match the admin account created by `scripts/create_admin.js`.

Continuous integration and deploy

This repo includes a GitHub Actions workflow at `.github/workflows/ci.yml` that:

- Runs `npm ci`, `npx tsc --noEmit`, and `npm run build` on pushes and PRs to `main`/`master`.
- Optionally deploys to Vercel when you add a repository secret named `VERCEL_TOKEN` (the workflow uses the Vercel CLI). To enable automatic deploys:

1. Create a Vercel project and obtain a deployment token (`VERCEL_TOKEN`) from your Vercel dashboard.
2. In your GitHub repo, go to Settings → Secrets and variables → Actions → New repository secret, add `VERCEL_TOKEN`.
3. Push to `main`/`master` or open a PR — the workflow will build and then deploy to Vercel when the secret is present.

If you prefer to use Vercel's Git integration instead of the workflow, link the repository in the Vercel dashboard and add the same Firebase-related environment variables (`FIREBASE_SERVICE_ACCOUNT` or `GOOGLE_APPLICATION_CREDENTIALS`) in your Vercel project settings.

Seeding sample problems (two options)

Client-side (quick, uses currently signed-in user):

- Visit `http://localhost:3000/dev/seed` and click **Seed Problems**. The page uses the web SDK and requires Firestore write permissions for the signed-in user. If you see **Missing or insufficient permissions**, your Firestore rules prevent client writes.

Server-side (recommended for dev with admin access):

1. Create a Firebase service account JSON (from Firebase Console → Project Settings → Service accounts) and either:
   - Set the environment variable `FIREBASE_SERVICE_ACCOUNT` to the JSON string (e.g. in your shell or `.env.local`), or
   - Set `GOOGLE_APPLICATION_CREDENTIALS` to the path of the service account file.

2. Call the server seed endpoint:

```bash
curl -X POST http://localhost:3000/api/seed
```

This uses the Admin SDK and will write problems regardless of Firestore client rules.

Create a demo user (server-side)

If you want a demo user you can sign in with, and you have a Firebase service account set up as described above, you can call the create-demo-user API:

```bash
# set the service account for the current shell (PowerShell example)
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content '.\service-account.json' -Raw
curl -X POST http://localhost:3000/api/create-demo-user -H "Content-Type: application/json" -d '{"email":"demo@dsa-verse.test","password":"password123"}'
```

The endpoint will create the user via the Admin SDK and return the `uid` and `email`. Then sign in at `/login` using the provided credentials.

Notes

- The project contains a `ProtectedRoute` component to guard pages that require authentication.
- Problem starring is persisted in Firestore under the `favorites` collection (writes require appropriate permissions).
- Use the app UI to signup/login at `/signup` and `/login`.

Final verification checklist (local, no deploy)

1. Install dependencies and start dev server:

```bash
npm install
npm run dev
```

2. (Optional) Seed problems:

- Client seed (quick): open http://localhost:3000/dev/seed and click **Seed Problems** (requires client write permissions).
- Server seed (recommended for dev): set `FIREBASE_SERVICE_ACCOUNT` or `GOOGLE_APPLICATION_CREDENTIALS` then:

```bash
curl -X POST http://localhost:3000/api/seed
```

3. (Optional) Create a demo user (server-side):

```powershell
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content '.\service-account.json' -Raw
curl -X POST http://localhost:3000/api/create-demo-user -H "Content-Type: application/json" -d '{"email":"demo@dsa-verse.test","password":"password123"}'
```

4. Sign in at http://localhost:3000/login using a real account or the demo user credentials.

5. Visit http://localhost:3000/problems to browse problems, click a problem to solve, write `solution` function and press **Run Code** to execute test cases.

6. Admin panel (optional): set `NEXT_PUBLIC_ADMIN_EMAIL` in `.env.local` to the admin email you will sign in with, then sign in and visit:

```
http://localhost:3000/admin/problems
```

7. Inspect submissions at http://localhost:3000/submissions and verify run results and code are saved.

If you want, I can run an end-to-end demo locally (seed problems + create demo user + sign-in flow). Tell me to proceed and I'll execute the server API calls from this environment.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
