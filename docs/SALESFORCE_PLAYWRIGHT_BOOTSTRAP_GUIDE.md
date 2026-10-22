# Salesforce Lightning UI Automation: Bootstrap Guide (Playwright + TypeScript)

> **Audience:** an AI coding assistant (and the engineer working with it) setting up a **new** repository
> that automates UI tests against a Salesforce Lightning org.
>
> **Origin:** this guide is distilled from a production Playwright suite that has run nightly in CI
> against a Salesforce sandbox for years. Everything here is either copied from that suite or is a
> deliberate improvement over it. The improvements fix real problems that suite ran into (see
> [§14 Lessons learned](#14-lessons-learned-from-the-reference-repo)).
>
> **This document is self-contained.** The new repo has no other reference. Every file you need is
> written out in full below. Values that differ per org are written as `<PLACEHOLDER>` and listed in
> [§2](#2-inputs-to-collect-from-the-user-before-writing-code).

---

## Table of contents

0. [Instructions for the AI assistant (read first)](#0-instructions-for-the-ai-assistant-read-first)
1. [What you are building](#1-what-you-are-building)
2. [Inputs to collect from the user before writing code](#2-inputs-to-collect-from-the-user-before-writing-code)
3. [One-time Salesforce org setup (done by a Salesforce admin)](#3-one-time-salesforce-org-setup-done-by-a-salesforce-admin)
4. [Repository scaffold (every file, in full)](#4-repository-scaffold-every-file-in-full)
5. [Bring-up and verification, step by step](#5-bring-up-and-verification-step-by-step)
6. [Authentication troubleshooting](#6-authentication-troubleshooting)
7. [Conventions for writing tests](#7-conventions-for-writing-tests)
8. [Salesforce Lightning interaction cookbook](#8-salesforce-lightning-interaction-cookbook)
9. [API / SOQL usage in tests](#9-api--soql-usage-in-tests)
10. [Debugging failing tests](#10-debugging-failing-tests)
11. [AI-assisted test authoring (MCP servers + workflow)](#11-ai-assisted-test-authoring-mcp-servers--workflow)
12. [CI/CD](#12-cicd)
13. [CLAUDE.md template for the new repo](#13-claudemd-template-for-the-new-repo)
14. [Lessons learned from the reference repo](#14-lessons-learned-from-the-reference-repo)
15. [Final acceptance checklist](#15-final-acceptance-checklist)

---

## 0. Instructions for the AI assistant (read first)

1. **Read this whole document before creating any file.** The sections depend on each other.
2. **Collect the inputs in §2 from the user first.** Don't guess org URLs, usernames, or record IDs.
   Use `<PLACEHOLDER>` values only where this guide says to, and tell the user which ones are still unfilled.
3. **Work in the phases below, in order.** Stop at each 🔴 checkpoint and wait for the user to confirm before you continue.

   | Phase | What | Who |
   |---|---|---|
   | A | Collect inputs (§2) | AI asks, user answers |
   | B | Salesforce org setup: key pair, External Client App, Login-As policy (§3) | User / SF admin. The AI can generate the key pair command |
   | 🔴 | User confirms the External Client App exists and has given you the Consumer Key | |
   | C | Scaffold the repo: create every file in §4 exactly as written, then fill placeholders | AI |
   | D | `npm install`, then `npx tsc --noEmit` must pass | AI (no network to Salesforce needed) |
   | 🔴 | User runs the auth setup project (§5 step 4) and pastes the output | User |
   | E | User runs the smoke spec (§5 step 5) | User |
   | F | Write feature tests, following §7–§9 | AI + user |

4. **Running browser tests from an AI sandbox usually fails.** The sandbox blocks the network or the
   browser. Don't burn time on it: give the user the exact command and ask them to run it and paste the
   output. In Claude Code they can prefix it with `!` (for example `! npx playwright test --project=setup`)
   so the output lands in the conversation.
5. **Never commit secrets.** That includes private keys, consumer keys, `.env`, and `playwright/.auth/*`.
   Check `.gitignore` before the first commit.
6. **Don't invent locators.** Get them from the live page. Ask the user, inspect through the Playwright MCP
   server (§11), or ask the user to run `npx playwright codegen` (§10). Salesforce markup is non-obvious and
   differs between standard pages and custom LWC components.
7. **When the guide and the real org disagree, the org wins.** Adapt, and leave a one-line comment
   explaining why.

---

## 1. What you are building

A Playwright Test (TypeScript) suite with these properties:

- **Passwordless, MFA-proof login.** An OAuth 2.0 **JWT Bearer** flow gets a Salesforce session with no
  password and no MFA prompt. The session is injected into the browser as a `sid` cookie and saved as
  Playwright `storageState`. Every test starts already logged in.
- **One privileged "automation user" logs in. Other personas are reached with "Login As".** The automation
  user is a System Administrator, or has the *Login As* permission. Tests that need a specific persona
  (sales rep, manager, and so on) open Setup → User → **Login** inside their own browser context.
- **Page Object Model.** One class per page or component, under `pages/`. Locators are `readonly` members
  set in the constructor. Shared Lightning helpers (navigation, spinners, toasts, app switching) live in `BasePage`.
- **Worker-scoped fixture `createTestContext()`.** Each call returns a fresh browser context and page,
  pre-wired with helpers. The fixture closes it automatically. On failure it logs the URL, an ARIA
  snapshot, HTTP ≥400 responses, and console errors, which is very useful when an AI is diagnosing the failure.
- **REST API helper (`SalesforceApi`).** Runs SOQL, creates, updates, and deletes records. Tests use it
  for fast setup, cleanup, and backend assertions. It authenticates as the automation user with the token
  from the auth setup, so it keeps working after a UI context switches persona with Login As.
- **JSON test data** under `test-data/`, with one file per persona under `test-data/users/`.
- **CI-ready**: JUnit plus HTML reports, retries in CI, video and screenshot on failure, optional Slack summary.

### Execution flow

```
npx playwright test --project=chromium
        │
        ├─▶ project "setup"  (tests/auth.setup.ts)
        │      1. sign JWT with private key  ─▶  POST <my-domain>/services/oauth2/token
        │      2. receive access_token (a Salesforce session id)
        │      3. write playwright/.auth/api-session.json   (for SalesforceApi)
        │      4. add cookie sid=<token> for *.my.salesforce.com and *.lightning.force.com
        │      5. open /lightning/page/home and verify the Lightning header renders
        │      6. save playwright/.auth/user.json (storageState)
        │
        └─▶ project "chromium" (dependencies: ['setup'], use.storageState = user.json)
               every spec ─▶ createTestContext() ─▶ new context (already authenticated)
                                  └─▶ optional setupPage.loginAsUser(personaId)
```

---

## 2. Inputs to collect from the user before writing code

Ask for all of these up front, in a single message.

| # | Input | Example | Where it goes |
|---|---|---|---|
| 1 | **My Domain URL** of the target org (the `*.my.salesforce.com` URL, **not** the lightning one) | `https://acme--uat.sandbox.my.salesforce.com` | `.env` → `SF_MY_DOMAIN_URL` |
| 2 | Is it a **sandbox** or **production/dev** org? | sandbox | auto-detected from URL; confirm |
| 3 | **Automation username** (admin or *Login As*-capable user) | `qa.automation@acme.com.uat` | `.env` → `SF_USERNAME` |
| 4 | **External Client App Consumer Key** (from §3) | `3MVG9...` | `.env` → `SF_CLIENT_ID` |
| 5 | Path to the **private key** for that app (from §3) | `certificates/sf_jwt.key` | `.env` → `SF_JWT_KEY` |
| 6 | **Business area / repo name** | `acme-service-cloud-ui-automation` | `package.json`, README |
| 7 | **Lightning apps** under test (App Launcher names) | `Sales`, `Service Console` | `BasePage.switchToApp()` usage |
| 8 | **Personas**: role name → Salesforce User Id (18-char, starts `005`) | `sales-rep` → `005...` | `test-data/users/*.json` |
| 9 | First 2–3 **features or flows** to automate | "Create Case and escalate" | first specs |
| 10 | CI system (GitHub Actions, GitLab, Jenkins, internal) and how it injects secrets | GitHub Actions | §12 |
| 11 | Optional: Slack webhook for result summaries | — | `.env` → `SLACK_WEBHOOK_URL` |
| 12 | Optional: does the network need an HTTP proxy to reach Salesforce? | `http://localhost:8080` | `.env` → `SF_PROXY_SERVER` |
| 13 | Optional: Salesforce API version to pin | `v64.0` | `.env` → `SF_API_VERSION` |

The user can look up persona User Ids with this SOQL (Developer Console, Workbench, or `sf data query`):

```sql
SELECT Id, Name, Username, Profile.Name, UserRole.Name
FROM User
WHERE IsActive = true AND Profile.Name IN ('<Profile A>', '<Profile B>')
ORDER BY Profile.Name
```

---

## 3. One-time Salesforce org setup (done by a Salesforce admin)

The JWT Bearer flow needs three things: a certificate and private key pair, an app in Salesforce that
trusts the certificate, and a user who is pre-authorized for that app.

### 3.1 Generate the key pair (on the engineer's machine)

```bash
mkdir -p certificates
openssl req -x509 -newkey rsa:2048 -sha256 -days 730 -nodes \
  -keyout certificates/sf_jwt.key \
  -out certificates/sf_jwt.crt \
  -subj "/CN=playwright-ui-automation"
```

- `sf_jwt.key` is the **private key**. It never leaves the machine or the CI secret store, and it is never committed.
- `sf_jwt.crt` is the **public certificate**. It gets uploaded to Salesforce.
- `-days 730` means the certificate expires in 2 years. Put a reminder in the calendar. An expired cert
  causes `invalid_grant` failures.

### 3.2 Create an External Client App (preferred) or a Connected App

New orgs steer you to **External Client Apps** (Setup → *External Client App Manager*). Connected Apps
work too, if the org still allows creating them. The settings are equivalent:

| Setting | Value |
|---|---|
| Name | `Playwright UI Automation` |
| Contact email | team DL |
| Enable OAuth | ✅ |
| Callback URL | `http://localhost:1717/OauthRedirect` (required field; not used by JWT flow) |
| OAuth scopes | **`api`**, **`web`**, **`refresh_token, offline_access`** (`web` is needed so the token works as a UI session) |
| Flow enablement | ✅ **Enable JWT Bearer Flow**, then upload `sf_jwt.crt` |
| "Issue JSON Web Token (JWT)-based access tokens for named users" | ❌ **OFF**. JWT-format access tokens are *not* session ids and won't work as a `sid` cookie |
| Require secret for web server flow / PKCE | irrelevant for JWT flow; leave defaults |

Then, under the app's **Policies**:

| Policy | Value |
|---|---|
| Permitted Users | **Admin approved users are pre-authorized** |
| Profiles / Permission Sets | add the **automation user's** profile or a permission set assigned to them |
| IP Relaxation | **Relax IP restrictions** (CI runners have unpredictable IPs) |
| Refresh token policy | default is fine |

Copy the **Consumer Key** and give it to the engineer. That's `SF_CLIENT_ID`. The Consumer Secret is
**not** needed.

> ⏱ Changes to External Client Apps and Connected Apps can take **2–10 minutes** to propagate. If the
> first login attempt fails right after creating the app, wait and retry before you start debugging.

### 3.3 Make "Login As" work (only needed for persona tests)

- Setup → **Login Access Policies** → enable **"Administrators Can Log in as Any User"**.
- The automation user must be a System Administrator, or have the *"Login As"* / *Manage Users*
  permissions that the org's security model requires.
- Check it manually once: Setup → Users → open a persona → the **Login** button must be visible.

### 3.4 Session settings that can break cookie-based login

Setup → **Session Settings**. If the auth setup lands on a login page instead of Lightning, check these:

- "Lock sessions to the IP address from which they originated": should be **off** for the automation user's profile.
- "Lock sessions to the domain in which they were first used": if this is on, cookie injection may fail.
  Use the `frontdoor.jsp` fallback (§6).
- Profile-level "Session Security Level Required at Login = High Assurance": the JWT flow can't satisfy
  this. Use a profile without it.

### 3.5 Sandboxes and refreshes

- A sandbox refresh **wipes data created in the sandbox**. Record IDs copied from production stay the
  same in full-copy sandboxes, but anything created in the sandbox (test personas, test accounts) changes.
  Prefer looking up records **by name or external id at runtime** (§9) over hardcoding IDs. Keep any
  hardcoded IDs in `test-data/` only, so a refresh means editing data files, not code.
- After a refresh, check that the External Client App and its certificate still exist in the sandbox
  and that the automation user is still pre-authorized.

---

## 4. Repository scaffold (every file, in full)

### 4.1 Target layout

```
<repo-name>/
├── .env.example
├── .gitignore
├── .prettierrc
├── CLAUDE.md                      ← from §13
├── README.md
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── config/
│   └── env.ts                     ← the ONLY place org URLs/env vars are read
├── fixtures/
│   └── base.fixtures.ts           ← `test` + `expect` that every spec imports
├── helpers/
│   └── salesforceApi.ts           ← REST/SOQL helper
├── pages/
│   ├── BasePage.ts
│   ├── SetupPage.ts               ← Login-As
│   └── <feature>/…Page.ts
├── utils/
│   ├── load.ts                    ← waitForNetworkIdle
│   └── utils.ts                   ← dates, money, unique suffixes, SOQL escaping
├── test-data/
│   ├── users/
│   │   └── <persona>.json
│   └── <feature>.json
├── tests/
│   ├── auth.setup.ts
│   ├── smoke/
│   │   └── smoke.spec.ts
│   └── <feature>/
│       └── <flow>.spec.ts
├── buildscripts/                  ← CI shell scripts (optional)
└── certificates/                  ← git-ignored; local private key lives here
```

### 4.2 Install

```bash
npm init -y
npm install -D @playwright/test typescript @types/node dotenv prettier
npm install -D playwright-ctrf-json-reporter slack-ctrf   # optional: Slack summaries
npx playwright install --with-deps chromium                  # add firefox webkit if needed
```

After installing, **pin exact versions** in `package.json` (remove the `^`). Playwright upgrades
sometimes change auto-wait behavior, and an unpinned upgrade shows up as unexplained flakiness.

### 4.3 `package.json` (scripts section; keep the generated dependency block)

```json
{
  "name": "<repo-name>",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "playwright test --project=chromium",
    "test:smoke": "playwright test --project=chromium --grep @smoke",
    "test:headed": "playwright test --project=chromium --headed",
    "test:ui": "playwright test --ui",
    "test:auth": "playwright test --project=setup",
    "test:slack": "playwright test --project=chromium; npx slack-ctrf results ./ctrf/ctrf-report.json",
    "report": "playwright show-report",
    "codegen": "playwright codegen --load-storage=playwright/.auth/user.json",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write ."
  }
}
```

### 4.4 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "noImplicitAny": false,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true,
    "baseUrl": ".",
    "types": ["node"]
  },
  "include": ["config", "fixtures", "helpers", "pages", "tests", "utils", "playwright.config.ts"],
  "exclude": ["node_modules"]
}
```

> Playwright transpiles TS without type-checking. Run `npm run typecheck` yourself, and in CI, to catch type errors.

### 4.5 `.prettierrc`

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 120
}
```

### 4.6 `.gitignore`

```gitignore
node_modules/
.env
certificates/
*.pem
*.key
*.crt

# Playwright
playwright/.auth/
test-results/
playwright-report/
blob-report/
ctrf/
.playwright-mcp/

# Editors / OS
.idea/
.vscode/
.DS_Store
```

### 4.7 `.env.example` (commit this; the real `.env` is git-ignored)

```dotenv
# My Domain URL of the org (NOT the lightning.force.com one). No trailing slash.
SF_MY_DOMAIN_URL=https://<mydomain>--<sandbox>.sandbox.my.salesforce.com
# Automation user that the JWT bearer flow logs in as (admin / Login-As capable)
SF_USERNAME=<automation.user@company.com.sandbox>
# Consumer Key of the External Client App (§3.2)
SF_CLIENT_ID=<consumer-key>
# Path to the private key file (or the PEM contents themselves, e.g. from a CI secret)
SF_JWT_KEY=certificates/sf_jwt.key
# Optional
SF_API_VERSION=v64.0
SF_PROXY_SERVER=
SLACK_WEBHOOK_URL=
```

> ⚠️ Use `SF_USERNAME`, **not** `USER`. On macOS and Linux, `USER` is always set to the OS login name. If
> someone forgets to pass it, the suite silently tries to log in as `jdoe`, and you get a confusing
> `invalid_grant` error. The reference repo had exactly this trap.

### 4.8 `config/env.ts`

```ts
import * as dotenv from 'dotenv'

dotenv.config()

export function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var ${name}. Copy .env.example to .env and fill it in.`)
  }
  return value
}

// e.g. https://acme--uat.sandbox.my.salesforce.com  →  https://acme--uat.sandbox.lightning.force.com
export const SF_MY_DOMAIN_URL = requiredEnv('SF_MY_DOMAIN_URL').replace(/\/+$/, '')
export const SF_LIGHTNING_URL = SF_MY_DOMAIN_URL.replace('.my.salesforce.com', '.lightning.force.com')
export const SF_API_VERSION = process.env.SF_API_VERSION || 'v64.0'
export const SF_IS_SANDBOX = SF_MY_DOMAIN_URL.includes('.sandbox.')
// JWT "aud" claim: sandboxes use test.salesforce.com, production/dev orgs use login.salesforce.com
export const SF_LOGIN_AUDIENCE = SF_IS_SANDBOX ? 'https://test.salesforce.com' : 'https://login.salesforce.com'

export const PROXY = process.env.SF_PROXY_SERVER ? { server: process.env.SF_PROXY_SERVER } : undefined

export const AUTH_DIR = 'playwright/.auth'
export const STORAGE_STATE = `${AUTH_DIR}/user.json`
export const API_SESSION_FILE = `${AUTH_DIR}/api-session.json`

// every record a test creates must start with this, so pre-cleanup queries can find leftovers
export const TEST_DATA_PREFIX = 'Autotest'
```

### 4.9 `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test'
import { STORAGE_STATE } from './config/env'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './tests',
  // Lightning is slow; these values are proven in a long-running nightly suite
  timeout: 120_000,
  expect: { timeout: 10_000 },
  retries: isCI ? 2 : 0,
  // Salesforce sandboxes throttle and tests share org data; keep parallelism low
  workers: 2,
  fullyParallel: false,
  forbidOnly: isCI,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: './test-results/junit-results.xml' }],
    // optional, for slack-ctrf summaries:
    // ['playwright-ctrf-json-reporter', { outputDir: 'ctrf', outputFile: 'ctrf-report.json' }],
  ],
  use: {
    headless: isCI,
    viewport: { width: 1720, height: 1080 }, // wide enough that Lightning doesn't collapse tabs into "More"
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1720, height: 1080 },
        storageState: STORAGE_STATE,
        // kept from the reference suite: avoids cross-origin issues with Setup/Visualforce iframes
        launchOptions: { args: ['--disable-web-security'] },
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1720, height: 1080 }, storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], viewport: { width: 1720, height: 1080 }, storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
  ],
})
```

### 4.10 `tests/auth.setup.ts`

```ts
import { test as setup, expect, request } from '@playwright/test'
import * as crypto from 'crypto'
import * as fs from 'fs'
import {
  API_SESSION_FILE,
  AUTH_DIR,
  PROXY,
  SF_LIGHTNING_URL,
  SF_LOGIN_AUDIENCE,
  SF_MY_DOMAIN_URL,
  STORAGE_STATE,
  requiredEnv,
} from '../config/env'

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// SF_JWT_KEY may be a file path (local) or the PEM itself (some CI secret stores)
function loadPrivateKey(): string {
  const value = requiredEnv('SF_JWT_KEY')
  return value.includes('-----BEGIN') ? value.replace(/\\n/g, '\n') : fs.readFileSync(value, 'utf8')
}

function buildSignedJwt(): string {
  const header = base64url(JSON.stringify({ alg: 'RS256' }))
  const payload = base64url(
    JSON.stringify({
      iss: requiredEnv('SF_CLIENT_ID'),
      sub: requiredEnv('SF_USERNAME'),
      aud: SF_LOGIN_AUDIENCE,
      exp: Math.floor(Date.now() / 1000) + 180,
    })
  )
  const signingInput = `${header}.${payload}`
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(loadPrivateKey())
  return `${signingInput}.${base64url(signature)}`
}

setup('authenticate', async ({ browser }) => {
  // 1. OAuth 2.0 JWT bearer flow: no password, no MFA, no UI login page
  const apiContext = await request.newContext({ proxy: PROXY })
  let accessToken: string
  let instanceUrl: string
  try {
    const tokenRes = await apiContext.post(`${SF_MY_DOMAIN_URL}/services/oauth2/token`, {
      form: {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: buildSignedJwt(),
      },
    })
    const tokenBody = await tokenRes.json()
    if (!tokenRes.ok()) {
      throw new Error(`Salesforce JWT bearer login failed: ${tokenRes.status()} ${JSON.stringify(tokenBody)}`)
    }
    accessToken = tokenBody.access_token
    instanceUrl = tokenBody.instance_url
  } finally {
    await apiContext.dispose()
  }

  // 2. Persist the token for SalesforceApi, so API calls stay as the automation user even after UI Login-As
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  fs.writeFileSync(API_SESSION_FILE, JSON.stringify({ accessToken, instanceUrl }, null, 2))

  // 3. The access token doubles as a session id: inject it as the sid cookie for both hostnames
  const context = await browser.newContext()
  const cookie = { name: 'sid', value: accessToken, path: '/', httpOnly: true, secure: true, sameSite: 'Lax' as const }
  await context.addCookies([
    { ...cookie, domain: new URL(SF_MY_DOMAIN_URL).hostname },
    { ...cookie, domain: new URL(SF_LIGHTNING_URL).hostname },
  ])

  // 4. Prove the session works in the UI
  const page = await context.newPage()
  await page.goto(`${SF_LIGHTNING_URL}/lightning/page/home`)
  await page.waitForURL(/\/lightning\//, { timeout: 60_000 })
  await expect(page.locator('#oneHeader')).toBeVisible({ timeout: 60_000 })

  // 5. Save the signed-in state for every downstream project
  await context.storageState({ path: STORAGE_STATE })
  await context.close()
})
```

> If step 4 ends on a login page, use the `frontdoor.jsp` fallback in §6.

### 4.11 `fixtures/base.fixtures.ts`

```ts
import { test as base, BrowserContext, Page } from '@playwright/test'
import { SetupPage } from '../pages/SetupPage'
import { SalesforceApi } from '../helpers/salesforceApi'

export type TestContextResult = {
  userContext: BrowserContext
  userPage: Page
  setupPage: SetupPage
}

type TestFixtures = { _snapshotOnFailure: void }
type WorkerFixtures = {
  createTestContext: () => Promise<TestContextResult>
  sfApi: SalesforceApi
  _contexts: BrowserContext[]
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  _contexts: [
    async ({}, use) => {
      const contexts: BrowserContext[] = []
      await use(contexts)
      for (const ctx of contexts) {
        await ctx.close()
      }
    },
    { scope: 'worker' },
  ],

  /**
   * Factory for authenticated browser contexts. Each call creates a new context that inherits
   * storageState from playwright.config (i.e. logged in as the automation user). Call it once per
   * persona / describe block. All contexts are closed automatically when the worker finishes.
   */
  createTestContext: [
    async ({ browser, _contexts }, use) => {
      await use(async () => {
        const context = await browser.newContext()
        _contexts.push(context)
        const page = await context.newPage()

        page.on('response', (response) => {
          if (response.status() >= 400) {
            console.log(`[HTTP_ERROR] ${response.status()} ${response.request().method()} ${response.url()}`)
          }
        })
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            console.log(`[CONSOLE_ERR] ${msg.text()}`)
          }
        })

        return { userContext: context, userPage: page, setupPage: new SetupPage(page) }
      })
    },
    { scope: 'worker' },
  ],

  // REST/SOQL client authenticated as the automation user (token from auth.setup.ts)
  sfApi: [
    async ({}, use) => {
      const api = new SalesforceApi()
      await use(api)
      await api.dispose()
    },
    { scope: 'worker' },
  ],

  // On failure, print every open page's URL + ARIA snapshot: gives an AI enough to diagnose without a browser
  _snapshotOnFailure: [
    async ({ _contexts }, use, testInfo) => {
      await use()
      if (testInfo.status !== testInfo.expectedStatus) {
        for (const ctx of _contexts) {
          for (const p of ctx.pages()) {
            console.log(`[FAIL_URL] ${p.url()}`)
            const snapshot = await p
              .locator('body')
              .ariaSnapshot({ timeout: 5_000 })
              .catch((e) => `<snapshot failed: ${e}>`)
            console.log('[ARIA_SNAPSHOT]\n' + snapshot.slice(0, 8000))
          }
        }
      }
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
```

### 4.12 `helpers/salesforceApi.ts`

```ts
import { APIRequestContext, Page, request } from '@playwright/test'
import * as fs from 'fs'
import { API_SESSION_FILE, PROXY, SF_API_VERSION, SF_MY_DOMAIN_URL } from '../config/env'

export type SfRecord = { Id: string; [field: string]: any }

export class SalesforceApi {
  private readonly accessToken: string
  private readonly instanceUrl: string
  private contextPromise?: Promise<APIRequestContext>

  /** Defaults to the automation user's token written by auth.setup.ts */
  constructor(session?: { accessToken: string; instanceUrl?: string }) {
    const s = session ?? JSON.parse(fs.readFileSync(API_SESSION_FILE, 'utf8'))
    this.accessToken = s.accessToken
    this.instanceUrl = (s.instanceUrl ?? SF_MY_DOMAIN_URL).replace(/\/+$/, '')
  }

  /** Act as whoever the page is currently logged in as (e.g. after Login-As). Login-As sessions may lack API access. */
  static async fromPage(page: Page): Promise<SalesforceApi> {
    const host = new URL(SF_MY_DOMAIN_URL).hostname
    const sid = (await page.context().cookies()).find((c) => c.name === 'sid' && c.domain.includes(host))
    if (!sid) throw new Error(`No sid cookie for ${host} in this page's context`)
    return new SalesforceApi({ accessToken: sid.value })
  }

  private api(): Promise<APIRequestContext> {
    this.contextPromise ??= request.newContext({
      baseURL: `${this.instanceUrl}/services/data/${SF_API_VERSION}/`,
      extraHTTPHeaders: { Authorization: `Bearer ${this.accessToken}` },
      proxy: PROXY,
    })
    return this.contextPromise
  }

  private async send(method: 'get' | 'post' | 'patch' | 'delete', url: string, data?: object) {
    const res = await (await this.api())[method](url, data ? { data } : undefined)
    if (!res.ok()) {
      // surface Salesforce's error body (INVALID_FIELD, MALFORMED_QUERY, ...) instead of a bare status code
      throw new Error(`Salesforce API ${method.toUpperCase()} ${url} failed: ${res.status()} ${await res.text()}`)
    }
    return res.status() === 204 ? undefined : res.json()
  }

  /** Runs a SOQL query and follows pagination. Pass plain SOQL; encoding is handled here. */
  async query<T extends SfRecord = SfRecord>(soql: string): Promise<T[]> {
    let body = await this.send('get', `query/?q=${encodeURIComponent(soql)}`)
    const records: T[] = [...body.records]
    while (!body.done && body.nextRecordsUrl) {
      body = await this.send('get', body.nextRecordsUrl) // absolute path, resolves against the host
      records.push(...body.records)
    }
    return records
  }

  async queryOne<T extends SfRecord = SfRecord>(soql: string): Promise<T | undefined> {
    return (await this.query<T>(soql))[0]
  }

  async getRecord<T extends SfRecord = SfRecord>(sobject: string, id: string, fields: string[]): Promise<T> {
    return this.send('get', `sobjects/${sobject}/${id}?fields=${fields.join(',')}`)
  }

  async create(sobject: string, fields: Record<string, unknown>): Promise<string> {
    return (await this.send('post', `sobjects/${sobject}/`, fields)).id
  }

  async update(sobject: string, id: string, fields: Record<string, unknown>): Promise<void> {
    await this.send('patch', `sobjects/${sobject}/${id}`, fields)
  }

  async delete(sobject: string, ids: string | string[]): Promise<void> {
    for (const id of typeof ids === 'string' ? [ids] : ids) {
      await this.send('delete', `sobjects/${sobject}/${id}`)
    }
  }

  /** e.g. deleteWhere('Case', "Subject LIKE 'Autotest%'"). Returns the number of records deleted. */
  async deleteWhere(sobject: string, whereClause: string): Promise<number> {
    const records = await this.query(`SELECT Id FROM ${sobject} WHERE ${whereClause}`)
    await this.delete(sobject, records.map((r) => r.Id))
    return records.length
  }

  async dispose(): Promise<void> {
    if (this.contextPromise) await (await this.contextPromise).dispose()
  }
}
```

### 4.13 `pages/BasePage.ts`

```ts
import { expect, Locator, Page } from '@playwright/test'
import { SF_LIGHTNING_URL } from '../config/env'

export class BasePage {
  readonly page: Page
  readonly loadSpinner: Locator
  readonly currentApp: Locator
  readonly appLauncherButton: Locator
  readonly appLauncherSearch: Locator
  readonly appLauncherItem: (appName: string) => Locator
  readonly navTab: (tabLabel: string) => Locator
  readonly toast: (text: string | RegExp) => Locator
  readonly toastClose: Locator

  constructor(page: Page) {
    this.page = page
    this.loadSpinner = page.locator('lightning-spinner, .slds-spinner_container')
    this.currentApp = page.locator('.appName span[title], span.appName[title], one-appnav .slds-context-bar__label-action span[title]').first()
    this.appLauncherButton = page.locator('one-app-launcher-header button, button[title="App Launcher"]').first()
    this.appLauncherSearch = page.getByPlaceholder('Search apps and items...')
    this.appLauncherItem = (appName: string) => page.locator(`one-app-launcher-menu-item a[data-label="${appName}"], [data-label="${appName}"] p`).first()
    this.navTab = (tabLabel: string) => page.locator(`one-app-nav-bar-item-root a[title="${tabLabel}"]`)
    this.toast = (text: string | RegExp) => page.locator('.forceToastMessage, [id*="toastDescription"]').filter({ hasText: text }).first()
    this.toastClose = page.locator('.forceToastMessage button[title="Close"]').first()
  }

  // ── Navigation: always by direct URL, it's faster and more stable than clicking through menus ──
  async openHomePage() {
    await this.page.goto(`${SF_LIGHTNING_URL}/lightning/page/home`, { waitUntil: 'load' })
  }

  /** Object list view, e.g. openListView('Case', 'AllOpenCases') */
  async openListView(sobject: string, filterName = 'Recent') {
    await this.page.goto(`${SF_LIGHTNING_URL}/lightning/o/${sobject}/list?filterName=${filterName}`, { waitUntil: 'load' })
  }
  async openNewRecordForm(sobject: string) {
    await this.page.goto(`${SF_LIGHTNING_URL}/lightning/o/${sobject}/new`, { waitUntil: 'load' })
  }

  async openRecordPage(sobject: string, recordId: string) {
    await this.page.goto(`${SF_LIGHTNING_URL}/lightning/r/${sobject}/${recordId}/view`, { waitUntil: 'load' })
  }

  /** Custom Lightning tabs / LWC app pages: /lightning/n/<TabApiName> */
  async openCustomTab(tabApiName: string) {
    await this.page.goto(`${SF_LIGHTNING_URL}/lightning/n/${tabApiName}`, { waitUntil: 'load' })
  }

  async openSetup(path = 'SetupOneHome/home') {
    await this.page.goto(`${SF_LIGHTNING_URL}/lightning/setup/${path}`, { waitUntil: 'load' })
  }

  /** Record Id of the record page currently open (after a create/save lands on /lightning/r/<Obj>/<Id>/view) */
  async currentRecordId(sobject: string): Promise<string> {
    const pattern = new RegExp(`/lightning/r/${sobject}/(\\w{15,18})/view`)
    await this.page.waitForURL(pattern)
    return this.page.url().match(pattern)![1]
  }

  // ── Waiting ──
  async waitLoadSpinnerHidden(timeout = 70_000) {
    for (const spinner of await this.loadSpinner.all()) {
      await spinner.waitFor({ state: 'hidden', timeout })
    }
  }

  async waitForToast(text: string | RegExp, { dismiss = true, timeout = 30_000 } = {}) {
    const toast = this.toast(text)
    await expect(toast).toBeVisible({ timeout })
    if (dismiss) {
      await this.toastClose.click().catch(() => {}) // toast may auto-dismiss first
      await expect(toast).toBeHidden({ timeout })
    }
  }

  // ── App switching ──
  async switchToApp(appName: string) {
    if ((await this.currentApp.textContent())?.trim() === appName) return
    await this.appLauncherButton.click()
    await this.appLauncherSearch.fill(appName)
    await this.appLauncherItem(appName).click()
    await expect(this.currentApp).toHaveText(appName)
    await this.waitLoadSpinnerHidden()
  }
}
```

> The currentApp, appLauncher*, and toast selectors use comma-separated fallbacks because Lightning markup changes between releases. **Check them against the real org on day one** (see §11) and trim each down to the one that matches.

### 4.14 `pages/SetupPage.ts`: Login As

```ts
import { FrameLocator, Locator, Page } from '@playwright/test'
import { BasePage } from './BasePage'
import { SF_LIGHTNING_URL } from '../config/env'

export class SetupPage extends BasePage {
  readonly userDetailFrame: FrameLocator
  readonly loginAsButton: Locator

  constructor(page: Page) {
    super(page)
    // Setup's user detail page is a classic page rendered inside an iframe titled "User: <Name> ~ Salesforce"
    this.userDetailFrame = page.frameLocator('iframe[title*="User:"]')
    this.loginAsButton = this.userDetailFrame.locator('#topButtonRow input[title="Login"], #topButtonRow [title="Login"]').first()
  }

  async openUserDetail(userId: string) {
    const address = encodeURIComponent(`/${userId}?noredirect=1&isUserEntityOverride=1&retURL=${encodeURIComponent('/setup/home')}`)
    await this.page.goto(`${SF_LIGHTNING_URL}/lightning/setup/ManageUsers/page?address=${address}`, { waitUntil: 'load' })
  }

  /**
   * Turns this page's context into a session for `userId` via Setup → Users → Login.
   * Requires "Administrators Can Log in as Any User" (§3.3). Retries once: the Setup iframe is occasionally slow.
   */
  async loginAsUser(userId: string): Promise<Page> {
    for (let attempt = 1; ; attempt++) {
      await this.openUserDetail(userId)
      await this.loginAsButton.click()
      try {
        // Login-As redirects through /servlet/servlet.su and lands on the persona's default Lightning page
        await this.page.waitForURL(
          (url) => url.pathname.startsWith('/lightning/') && !url.pathname.startsWith('/lightning/setup/'),
          { timeout: 45_000 }
        )
        await this.waitLoadSpinnerHidden()
        return this.page
      } catch (e) {
        if (attempt >= 2) throw new Error(`Login As ${userId} failed; last URL ${this.page.url()}: ${e}`)
      }
    }
  }
}
```

### 4.15 `utils/utils.ts`

```ts
import { TEST_DATA_PREFIX } from '../config/env'

export class Utils {
  /** 'Jan 15, 2026': the format en_US Lightning date inputs accept. Check the persona's locale. */
  static formatDateForInput(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  /** '$1,234.50' → 1234.5 */
  static clearMoneyValue(money: string): number {
    return +money.replace(/[^0-9.-]/g, '')
  }

  /** Readable unique suffix, e.g. 'Oct21-2026-143005-123' */
  static testRunSuffix(date = new Date()): string {
    const p = (n: number, l = 2) => String(n).padStart(l, '0')
    const mon = date.toLocaleString('en-US', { month: 'short' })
    return `${mon}${p(date.getDate())}-${date.getFullYear()}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}-${p(date.getMilliseconds(), 3)}`
  }

  /** e.g. uniqueName('Case') → 'Autotest Case Oct21-2026-143005-123' */
  static uniqueName(label: string): string {
    return `${TEST_DATA_PREFIX} ${label} ${this.testRunSuffix()}`
  }

  /** Escape a value for use inside single quotes in SOQL */
  static soqlEscape(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  }
}
```

### 4.16 `utils/load.ts`

Use this only when a page has no reliable visual signal for "done loading".

```ts
import { Page, Request } from '@playwright/test'

/** Resolves once no requests have been in flight for `idleTime` ms. Lightning keeps long-polling, so keep `timeout` modest. */
export const waitForNetworkIdle = async (page: Page, idleTime = 500, timeout = 10_000): Promise<void> => {
  const pending = new Set<Request>()
  let lastActivity = Date.now()
  const onRequest = (req: Request) => {
    pending.add(req)
    lastActivity = Date.now()
  }
  const onDone = (req: Request) => {
    pending.delete(req)
    lastActivity = Date.now()
  }
  page.on('request', onRequest)
  page.on('requestfinished', onDone)
  page.on('requestfailed', onDone)

  return new Promise((resolve, reject) => {
    const start = Date.now()
    const cleanup = () => {
      clearInterval(interval)
      page.off('request', onRequest)
      page.off('requestfinished', onDone)
      page.off('requestfailed', onDone)
    }
    const interval = setInterval(() => {
      if (pending.size === 0 && Date.now() - lastActivity >= idleTime) {
        cleanup()
        resolve()
      } else if (Date.now() - start > timeout) {
        cleanup()
        reject(new Error(`waitForNetworkIdle timed out after ${timeout}ms (${pending.size} pending)`))
      }
    }, 100)
  })
}
```

### 4.17 Test data

test-data/users/<persona>.json: one file per persona. Store **IDs and names only**, never credentials.

```json
{
  "label": "Sales Rep",
  "id": "<005xxxxxxxxxxxxxxx>",
  "name": "<Full Name>",
  "username": "<sales.rep@company.com.sandbox>",
  "profile": "<Profile Name>",
  "accountId": "<001xxxxxxxxxxxxxxx>",
  "accountName": "<An account this persona owns/can see>"
}

test-data/<feature>.json: form inputs and expected values. Use arrays for data-driven tests.

```

```json
{
  "cases": [
    { "testLabel": "Web origin, high priority", "origin": "Web", "priority": "High", "expectedStatus": "New" },
    { "testLabel": "Phone origin, low priority", "origin": "Phone", "priority": "Low", "expectedStatus": "New" }
  ]
}

Import them statically: import * as salesRep from '../../test-data/users/sales-rep.json'.
```

### 4.18 `tests/smoke/smoke.spec.ts`: the first spec to get green

```ts
import { test, expect } from '../../fixtures/base.fixtures'
import { Page } from '@playwright/test'
import { BasePage } from '../../pages/BasePage'
import { requiredEnv } from '../../config/env'
import * as salesRep from '../../test-data/users/sales-rep.json'

const automationUsername = requiredEnv('SF_USERNAME')
let adminPage: Page
let basePage: BasePage

test.describe('Smoke - session and navigation', () => {
  test.beforeAll(async ({ createTestContext }) => {
    const ctx = await createTestContext()
    adminPage = ctx.userPage
    basePage = new BasePage(adminPage)
  })

  test('Automation user lands on Lightning home @smoke', async () => {
    await basePage.openHomePage()
    await expect(adminPage).toHaveURL(/\/lightning\/page\/home/)
    await expect(adminPage.locator('#oneHeader')).toBeVisible()
  })

  test('API session can run SOQL as the automation user @smoke', async ({ sfApi }) => {
    const me = await sfApi.queryOne(`SELECT Id, Username FROM User WHERE Username = '${automationUsername}'`)
    expect(me?.Username).toBe(automationUsername)
  })

  test('Login As switches the context to a persona @smoke', async ({ createTestContext }) => {
    const { userPage, setupPage } = await createTestContext()
    await setupPage.loginAsUser(salesRep.id)
    // Lightning shows a "Logged in as <Name>" banner while impersonating
    await expect(userPage.getByText(`Logged in as ${salesRep.name}`)).toBeVisible()
  })
})

If the org has no personas yet, delete the third test; test-data/users/sales-rep.json is then not needed.
```

---

## 5. Bring-up and verification, step by step

Do these in order. Each step has a pass criterion. Don't move on until it passes.

| Step | Command | Pass criterion   |
| :---- | :---- | :---- |
| 1 | npm ci (or npm install the first time) | no errors |
| 2 | npx playwright install --with-deps chromium | browsers downloaded |
| 3 | npm run typecheck | exit 0 |
| 4 | npx playwright test --project=setup | 1 passed; files playwright/.auth/user.json and api-session.json exist |
| 5 | npx playwright test tests/smoke --project=chromium | all smoke tests pass |
| 6 | npx playwright test tests/smoke --project=chromium --headed | you can *see* the browser on Lightning home |
| 7 | npm run codegen -- <lightning-url>/lightning/page/home | codegen opens already logged in (proves storageState) |

Steps 4-7 talk to Salesforce. If you're an AI in a sandbox, **ask the user to run them** and paste the output.

---

## 6. Authentication troubleshooting

| Symptom (from step 4) | Cause | Fix   |
| :---- | :---- | :---- |
| invalid_grant / user hasn't approved this consumer | User not pre-authorized for the app | §3.2 Policies: *Admin approved users are pre-authorized*, and add the user's profile or permission set |
| invalid_grant / audience is invalid | Wrong aud | Sandbox → https://test.salesforce.com; prod/dev → https://login.salesforce.com. Check that SF_MY_DOMAIN_URL contains .sandbox. for sandboxes |
| invalid_client_id / invalid_client | Wrong Consumer Key, or the app hasn't propagated yet | Re-copy the key; wait 10 minutes |
| invalid_grant / invalid assertion or JWT signature verification failed | The private key doesn't match the uploaded cert | Re-upload sf_jwt.crt generated with the same sf_jwt.key |
| invalid_grant / authentication failure | Username wrong (sandbox usernames usually end in .<sandboxname>), user inactive, or **USER env var collision** | Fix SF_USERNAME |
| ENOENT ... sf_jwt.key | Key path relative to the wrong folder | Paths in .env are relative to the repo root. Run commands from the repo root |
| Token OK, but the page ends on a **login page** / waitForURL timeout | Token isn't usable as a UI session (JWT-based access tokens are on, web scope missing, or the session is domain-locked) | Turn off JWT-based access tokens, add the web scope, and/or use the frontdoor fallback below |
| Token OK, Lightning loads, but **Setup iframe asks to log in** | sid not set for the Setup/Visualforce domains | Use the frontdoor fallback below; it lets Salesforce set cookies on every domain itself |
| Login As button missing / not clickable | Login Access Policy off, or automation user lacks permission | §3.3 |
| Request timeouts reaching Salesforce | Corporate proxy | Set SF_PROXY_SERVER |

**Frontdoor fallback.** Replace step 3 of auth.setup.ts (the cookie injection) with this:

```ts
const context = await browser.newContext()
const page = await context.newPage()
// frontdoor.jsp exchanges the session id for a full set of UI cookies across all Salesforce domains
await page.goto(
  `${SF_MY_DOMAIN_URL}/secur/frontdoor.jsp?sid=${encodeURIComponent(accessToken)}` +
    `&retURL=${encodeURIComponent('/lightning/page/home')}`
)

Keep steps 4-5 as they are.
```

---

## 7. Conventions for writing tests

These rules are **mandatory**. They make tests readable to people and AIs and keep them stable against a shared org.

### 7.1 File placement and naming

- Specs: tests/<feature-area>/<flow>.spec.ts (kebab-case). One feature area per folder.
- Page objects: pages/<feature-area>/<Thing>Page.ts (PascalCase), or <Thing>Modal.ts for modals.
- Test data: test-data/<feature-area>.json or test-data/<feature-area>/<flow>.json.
- Personas: test-data/users/<persona>.json.

### 7.2 Canonical spec structure

```ts
import { test, expect } from '../../fixtures/base.fixtures' // ALWAYS this, never '@playwright/test' for test/expect
import { Page } from '@playwright/test'                       // types only
import { SalesforceApi } from '../../helpers/salesforceApi'
import { CasesPage } from '../../pages/cases/CasesPage'
import { Utils } from '../../utils/utils'
import { TEST_DATA_PREFIX } from '../../config/env'
import * as salesRep from '../../test-data/users/sales-rep.json'
import * as caseData from '../../test-data/cases.json'

let userPage: Page
let casesPage: CasesPage
let sfApi: SalesforceApi

test.describe('Cases - creation by sales rep', () => {
  test.beforeAll(async ({ createTestContext, sfApi: api }) => {
    sfApi = api
    // 1. Pre-cleanup leftovers from earlier failed runs. API calls run as the automation user,
    //    so this works regardless of UI persona
    await sfApi.deleteWhere('Case', `Subject LIKE '${TEST_DATA_PREFIX}%'`)

    // 2. Context + persona
    const ctx = await createTestContext()
    userPage = ctx.userPage
    await ctx.setupPage.loginAsUser(salesRep.id)

    // 3. Page objects + app
    casesPage = new CasesPage(userPage)
    await casesPage.switchToApp('<App Name>')
  })

  test.beforeEach(async () => {
    await casesPage.openListView('Case')
    await casesPage.waitLoadSpinnerHidden()
  })

  for (const data of caseData.cases) {
    test(`Verify a ${data.testLabel} case is created with status ${data.expectedStatus} @cases`, async () => {
      // Arrange
      const subject = Utils.uniqueName('Case')

      // Act
      const caseId = await casesPage.createCase({ ...data, subject })

      // Assert (UI)
      await expect(casesPage.recordHeaderTitle).toHaveText(subject)
      // Assert (backend): poll, because triggers/flows can update the record asynchronously
      await expect
        .poll(async () => (await sfApi.getRecord('Case', caseId, ['Status'])).Status, { timeout: 30_000 })
        .toBe(data.expectedStatus)
    })
  }
})
```

### 7.3 Rules

**Structure**

- Import test and expect from fixtures/base.fixtures. Import Playwright *types* from @playwright/test.
- Module-level let for pages and contexts. Assign them in beforeAll. **Don't close contexts by hand**; the fixture does it.
- Call createTestContext() **once per persona per describe block**. For multiple personas in one file, give each its own describe block, or create two contexts in the same beforeAll.
- Persona loops: ``for (const user of users) { test.describe(`... as ${user.label}`, () => {...}) }``.
- beforeEach navigates by direct URL, then waits for spinners. Tests must not depend on where the previous test left the page.
- Mark the body with // Arrange, // Act, and // Assert comments. Use test.step() for long flows.
- When tests must share state (create → edit → delete), use test.describe.configure({ mode: 'serial' }) inside a nested describe and say why in a comment.

**Naming and tags**

- Test titles describe behavior: 'Verify <actor/thing> <does/has> <outcome>'.
- Tags go at the end of the title: @smoke (critical path, fast) and @<feature>. Run them with --grep @smoke.

**Data**

- Every record a test creates is named with Utils.uniqueName(...) (prefix Autotest).
- **Pre-cleanup** in beforeAll deletes leftovers by prefix through the API. **Always await cleanup calls.**
- Prefer creating prerequisite records **through the API** (sfApi.create). Use the UI only for the behavior under test.
- Hardcoded record IDs and URLs live in test-data/ only, never in specs or page objects.
- Assume other people (and parallel workers) use the same org. Never assert on "the first row" or on global counts.

**Reliability**

- **No page.waitForTimeout()** in specs or page objects. Wait on a condition: expect(...), locator.waitFor(), waitForURL, or expect.poll.
- Call waitLoadSpinnerHidden() after navigation and after saves.
- Use web-first assertions (await expect(locator).toHaveText(...)), not expect(await locator.textContent()).
- try/catch is allowed **only** for documented Lightning quirks (lookup dropdown not opening, list needing a refresh). Keep the inner timeout short, and leave a comment naming the quirk.
- Don't use { force: true } unless a real overlay blocks a visible element (dual-listbox items do this). Add a comment.

**Page objects**

- Constructor takes Page. Every locator is a readonly member assigned in the constructor.
- Parameterized locators are readonly x: (arg: string) => Locator.
- Methods only for multi-step interactions (createCase, addTeamMember). Don't wrap a single click.
- Creation methods **return** what they created (id, name, or the filled data object).
- Extend BasePage to get navigation, spinner, toast, and app helpers.
- Reuse and extend existing page objects before creating new ones. Search pages/ first.

---

## 8. Salesforce Lightning interaction cookbook

Salesforce Lightning uses Aura and LWC components, open shadow DOM (Playwright CSS and role locators pierce it automatically), lots of async rendering, and some legacy iframes. These patterns are proven. **Always confirm the exact markup in the live org.**

### 8.1 Locator priority

1. getByRole(role, { name }), scoped to a container (page.getByRole('dialog'))
2. getByLabel('Field Label') for standard record forms
3. Stable attributes: [data-id=…], [data-label="Column"], [data-value=…], [title="…"], [name="…"], [field-label="…"]
> 4. Component tag names: lightning-combobox, records-record-layout-item, c-my-custom-component
> 5. Text: filter({ hasText }), getByText(..., { exact: true })
> 6. CSS classes (.slds-…): last resort. **Never** use auto-generated ids (#input-123); they change on every render.

Avoid .nth(), .first(), and .last() unless the position *is* the thing being tested.

### 8.2 Standard record create/edit modal

```ts
const modal = page.getByRole('dialog')
await modal.getByRole('textbox', { name: 'Account Name' }).fill(name)   // name match is substring + case-insensitive
await modal.getByRole('button', { name: 'Save', exact: true }).click()  // exact: avoid "Save & New"
await expect(modal).toBeHidden()
const id = await basePage.currentRecordId('Account')

If the object has **record types**, /lightning/o/<Obj>/new first shows a record-type picker: select the radio by label, then click **Next**.
```

### 8.3 Picklists (lightning-combobox)

```ts
await modal.getByRole('combobox', { name: 'Stage' }).click()
await page.getByRole('option', { name: 'Proposal', exact: true }).click()
// alternative when role names are ambiguous:
// page.locator('lightning-base-combobox-item[data-value="Proposal"]')
// assert the full list of offered values:
await expect(page.locator('lightning-base-combobox-item[role=option]')).toHaveText(['Pitch', 'Proposal'])
```

### 8.4 Lookups (search-as-you-type)

Lookups only search after a keystroke, so fill() often doesn't trigger results. Use pressSequentially with a small delay. A known quirk: the dropdown sometimes doesn't open. Deleting a character re-triggers it.

```ts
async fillLookup(input: Locator, value: string) {
  await input.pressSequentially(value, { delay: 50 })
  const option = this.page.getByRole('option', { name: value }).first()
  try {
    await option.click({ timeout: 3_000 })
  } catch {
    // Lightning lookup quirk: results don't render for the last keystroke; retyping one char re-triggers search
    await input.press('Backspace')
    await input.press(value.slice(-1))
    await option.click()
  }
}
```

### 8.5 Record detail fields

```ts
// read-only value on a record page
page.locator('records-record-layout-item[field-label="Status"]').locator('lightning-formatted-text, lightning-formatted-rich-text, a').first()
// highlights panel / page header title
page.locator('records-highlights2 h1, lightning-formatted-text[slot="primaryField"]').first()

For backend values, assert through the API (§9). It's more reliable than reading formatted UI text.
```

### 8.6 Datatables and list views

```ts
const row = (text: string) => page.locator('table[role=grid] tbody tr').filter({ hasText: text })
await row(subject).locator('[data-label="Case Number"] a').click()
// list views cache: if a just-created record is missing, click Refresh once
await page.getByRole('button', { name: 'Refresh' }).click()
```

### 8.7 Toasts

```ts
await basePage.waitForToast(`Account "${name}" was created`)   // waits, then dismisses
await expect(basePage.toast(/was saved/)).toBeVisible()        // or just assert
```

### 8.8 Spinners

Call waitLoadSpinnerHidden() after navigation, saves, tab switches, and filter changes. If a page shows no spinner but loads data, wait for a specific element instead (await expect(row(name)).toBeVisible()).

### 8.9 Links that open a new tab or window

Start waiting **before** you click, or the event can be missed:

```ts
const [newPage] = await Promise.all([page.context().waitForEvent('page'), link.click()])
await newPage.waitForLoadState()
const detail = new CaseDetailPage(newPage)

Close the extra page in afterEach.
```

### 8.10 Iframes (Setup pages, Visualforce, classic content)

```ts
const frame = page.frameLocator('iframe[title*="User:"]')        // Setup user detail
const vf = page.frameLocator('iframe[name^="vfFrameId"]')        // Visualforce in Lightning
await vf.getByRole('button', { name: 'Submit' }).click()
```

### 8.11 Click intercepted by the sticky global header

After a direct goto, the fixed Lightning header can sit on top of buttons near the top of the page, and a pointer click lands on the header instead:

```ts
// sticky global header can overlay the record header's Edit button after a direct goto
await editButton.dispatchEvent('click')
```

### 8.12 Dual listbox (move items between Available and Selected)

```ts
await page.locator('lightning-dual-listbox li').filter({ hasText: userName }).click({ force: true }) // option sits under an overlay span
await page.getByRole('button', { name: 'Move selection to Selected' }).click()
```

### 8.13 Dates and locale

Lightning date inputs accept the **persona's locale format**. For en_US that's Jan 15, 2026 (Utils.formatDateForInput). If personas use different locales, format per persona.

### 8.14 App and tab navigation

- Switch apps with basePage.switchToApp('App Name') in beforeAll. Lightning remembers the last app per user.
- Prefer direct URLs (§4.13) over clicking nav tabs. Tabs hidden under "More" break clicks.

### 8.15 Shadow DOM and getByText

CSS and role locators pierce open shadow roots automatically. **XPath does not pierce shadow DOM.** Avoid XPath in Lightning.

---

## 9. API / SOQL usage in tests

```ts
// query (plain SOQL; the helper encodes it)
const cases = await sfApi.query(`SELECT Id, Status, Owner.Name FROM Case WHERE Subject = '${Utils.soqlEscape(subject)}'`)

// create a prerequisite fast
const accountId = await sfApi.create('Account', { Name: Utils.uniqueName('Account'), Industry: 'Technology' })

// update / delete
await sfApi.update('Opportunity', oppId, { StageName: 'Closed Won' })
await sfApi.deleteWhere('Account', `Name LIKE '${TEST_DATA_PREFIX}%'`)

// look up IDs at runtime instead of hardcoding (survives sandbox refresh)
const owner = await sfApi.queryOne(`SELECT Id FROM User WHERE Username = '${salesRep.username}'`)

// asynchronous automation (flows, triggers, platform events) → poll
await expect.poll(async () => (await sfApi.getRecord('Case', id, ['OwnerId'])).OwnerId, { timeout: 30_000 }).toBe(queueId)

Gotchas:
```

> * In SOQL LIKE, both % and _ are wildcards.
> * Some fields can't be filtered in WHERE (long text, encrypted, some formula fields; one org even refused Opportunity.Name). Filter by Id or another field, then check in code.
> * Delete children before parents when there's no cascade. Some objects can't be deleted by non-admins, which is one more reason API cleanup runs as the automation user.
> * SalesforceApi.fromPage(page) runs calls as the impersonated persona. Use it only to test that persona's *API* permissions. Login-As sessions sometimes can't call the API.
> * Record type Ids differ between orgs. Query them: SELECT Id FROM RecordType WHERE SobjectType='Case' AND DeveloperName='Support'.

---

## 10. Debugging failing tests

| Tool | Command   |
| :---- | :---- |
| HTML report (traces, video, screenshots) | npm run report |
| Trace of one failure | npx playwright show-trace test-results/<test>/trace.zip |
| Headed run of one test | npx playwright test tests/x/y.spec.ts --project=chromium --headed --grep "title" |
| Step-through debugger | npx playwright test ... --debug |
| Record locators while already logged in | npm run codegen -- <lightning-url>/lightning/r/Account/<id>/view |
| UI mode (watch + time travel) | npm run test:ui |

The fixture prints these on failure. Paste them to the AI:

> * [FAIL_URL]: where each page was
> * [ARIA_SNAPSHOT]: an accessibility tree of the page, usually enough to fix a locator
> * [HTTP_ERROR] and [CONSOLE_ERR]: backend and LWC errors (a 400 from /aura? often means a validation rule fired)

Triage order for a failure: (1) Is the data still valid (record deleted, sandbox refreshed)? (2) Did the locator change (check the ARIA snapshot)? (3) Is it timing (spinner, async flow)? Fix it with a proper wait, not a retry or sleep. (4) Is it a real bug? Then report it and keep the test red.

---

## 11. AI-assisted test authoring (MCP servers + workflow)

### 11.1 `.mcp.json (repo root; git-ignore it if it holds personal aliases)**

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@<pinned-version>",
        "--isolated",
        "--storage-state", "playwright/.auth/user.json",
        "--allowed-origins",
        "https://*.salesforce.com;https://*.force.com;https://*.salesforce-setup.com;https://*.sfdcstatic.com;https://*.visualforce.com",
        "--block-service-workers"
      ]
    },
    "salesforce": {
      "command": "npx",
      "args": ["-y", "@salesforce/mcp@<pinned-version>", "--orgs", "<sf-cli-alias>", "--toolsets", "orgs,data"]
    }
  }
}
```

> * **Playwright MCP** lets the AI open the live org, take accessibility snapshots, and find real locators. `--storage-state` reuses the session from `npx playwright test --project=setup`, so it starts logged in. Re-run setup when the session expires (usually after 2-12 hours, depending on session settings).
> * `--block-service-workers` stops Lightning's service worker from interfering.
> * **Salesforce MCP** lets the AI run SOQL and inspect object metadata, so it can confirm field API names and picklist values. It needs the Salesforce CLI to be logged in once:
>
>   ```bash
>   sf org login web --alias <sf-cli-alias> --instance-url <SF_MY_DOMAIN_URL>
>   sf org display --target-org <sf-cli-alias>
>   ```
>
> * Pin both MCP package versions. Unpinned `npx -y` upgrades have broken setups before.

### 11.2 Workflow for each new test (AI)**

> 1. Restate the scenario: persona, steps, UI assertions, backend assertions.
> 2. Search pages/ and helpers/ for anything you can reuse.
> 3. Confirm the data model with Salesforce MCP or SOQL: object and field API names, picklist values, record types.
> 4. Inspect the live page with Playwright MCP, logged in as the right persona if visibility differs, and collect locators following §8.1.
> 5. Write or extend page objects, then test data, then the spec, following §7.
> 6. npm run typecheck.
> 7. Ask the user to run npx playwright test <file> --project=chromium and paste the output.
> 8. Fix failures using [ARIA_SNAPSHOT] and [HTTP_ERROR], then repeat. Don't add sleeps or retries to make it pass.
> 9. Report what you covered, what you didn't, and anything flaky or suspicious.

### 11.3 Prompt template (for the user)**

``` and docs/SALESFORCE_PLAYWRIGHT_BOOTSTRAP_GUIDE.md §7-§9.
Persona: test-data/users/<persona>.json
App: <App Name>
Steps:
1. <...>
2. <...>
UI assertions: <...>
Backend assertions (SOQL): object <Obj>, fields <Field__c = value>
Output: tests/<feature>/<flow>.spec.ts
Inspect the live UI with the Playwright MCP for locators; confirm field names with the Salesforce MCP.
```

---

## 12. CI/CD

Principles:

> * Secrets (SF_CLIENT_ID, SF_USERNAME, the private key) come from the CI secret store. The key can be a **file path** or the **PEM contents**; auth.setup.ts handles both.
> * Set CI=true. That turns on headless mode, retries, and forbidOnly.
> * Publish test-results/junit-results.xml, and archive playwright-report/ and test-results/.
> * Schedule nightly runs. Running on every push is usually too slow and too noisy for a shared org.
> * Split long suites per area with separate npm scripts (for example test:cases), so each pipeline stays under its timeout.

### 12.1 GitHub Actions example**

```yaml
name: ui-regression
on:
  schedule: [{ cron: '0 9 * * *' }]
  workflow_dispatch:
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 180
    env:
      CI: 'true'
      SF_MY_DOMAIN_URL: ${{ vars.SF_MY_DOMAIN_URL }}
      SF_USERNAME: ${{ secrets.SF_USERNAME }}
      SF_CLIENT_ID: ${{ secrets.SF_CLIENT_ID }}
      SF_JWT_KEY: ${{ secrets.SF_JWT_KEY }}        # PEM contents
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run typecheck
      - run: npx playwright test --project=chromium
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            playwright-report/
            test-results/
```

### 12.2 Shell-script style (Jenkins, internal CI that mounts secrets as files)**

```bash
#!/bin/bash
set +x                                             # never echo secrets
export CI=true
export SF_USERNAME=$(cat "$SECRETS_PATH/SF_USERNAME")
export SF_CLIENT_ID=$(cat "$SECRETS_PATH/SF_CLIENT_ID")
export SF_JWT_KEY="$SECRETS_PATH/SF_JWT_KEY"       # path to the mounted key file
set -Eeuo pipefail

npm ci --no-fund --no-audit
npx playwright install --with-deps chromium
npm run test:slack
```

Optional: strip skipped tests from JUnit so dashboards show only executed tests (the reference suite did this):

```bash
python3 - <<'EOF'
import xml.etree.ElementTree as ET
p = './test-results/junit-results.xml'
tree = ET.parse(p)
for suite in tree.getroot().iter('testsuite'):
    for case in list(suite):
        if case.find('skipped') is not None:
            suite.remove(case)
tree.write(p, xml_declaration=True, encoding='unicode')
EOF
```

---

## 13. CLAUDE.md template for the new repo

Create `CLAUDE.md` at the repo root (and copy this guide to `docs/SALESFORCE_PLAYWRIGHT_BOOTSTRAP_GUIDE.md`). Fill in the placeholders.

````markdown
# CLAUDE.md

## Project overview

Playwright + TypeScript UI automation for <Business Unit>'s Salesforce Lightning org
(`<SF_MY_DOMAIN_URL>` / `<SF_LIGHTNING_URL>`). Full conventions: `docs/SALESFORCE_PLAYWRIGHT_BOOTSTRAP_GUIDE.md`. Read §7-§9 before writing tests.

## Commands

```bash
npm run test:auth                                   # JWT login only → playwright/.auth/
npm test                                            # all tests, chromium
npm run test:smoke                                  # @smoke
npx playwright test tests/<area>/<file>.spec.ts --project=chromium
npx playwright test --project=chromium --grep "title"
npm run typecheck && npm run format
```

Config comes from `.env` (see `.env.example`): SF_MY_DOMAIN_URL, SF_USERNAME, SF_CLIENT_ID, SF_JWT_KEY.
Browser/Salesforce commands don't work from the AI sandbox. Ask the user to run them (`! <cmd>`) and paste the output.

## Architecture

- `tests/auth.setup.ts`: OAuth JWT bearer → sid cookie → `playwright/.auth/user.json` + `api-session.json`.
- `fixtures/base.fixtures.ts`: import `test`/`expect` from here. `createTestContext()` (worker-scoped, auto-closed) → `{ userContext, userPage, setupPage }`; `sfApi` worker fixture; ARIA snapshot on failure.
- `pages/`: Page Objects; extend `BasePage` (URL navigation, spinners, toasts, `switchToApp`). `SetupPage.loginAsUser(id)` = Login-As persona.
- `helpers/salesforceApi.ts`: SOQL/CRUD as the automation user.
- `config/env.ts`: the only place URLs and env vars are read. Never hardcode org URLs elsewhere.
- `test-data/`: JSON inputs; `test-data/users/` personas (IDs only, no secrets).

## Rules

- Test records use `Utils.uniqueName()` (prefix `Autotest`); pre-clean by prefix in `beforeAll` through the API (awaited).
- No `waitForTimeout`; web-first `expect`, `expect.poll` for async backend changes.
- Locators: role/label → data-attributes/title → component tags → text → classes. No XPath, no auto-generated ids.
- Tags at end of test title: `@smoke`, `@<feature>`.
- Apps under test: <App 1>, <App 2>. Personas: <list>.
````

---

## 14. Lessons learned from the reference repo

These problems happened for real. The scaffold above already avoids them. Don't bring them back.

| Problem in the reference repo | Consequence | What this guide does instead |
|---|---|---|
| Org URLs hardcoded in dozens of page methods and JSON files | Pointing at another sandbox meant a mass find-and-replace | `config/env.ts` + `BasePage` URL builders |
| Username taken from the `USER` env var | Forgetting to pass it logged in as the OS user, with a cryptic error | `SF_USERNAME` in `.env` |
| UI password login, then a SOAP `login()` API call | Broke on MFA/passkey enrollment; SOAP `login()` is being retired by Salesforce | OAuth JWT bearer flow |
| API helper reused the page's `sid` cookie | After Login-As, API calls ran as the persona and cleanup sometimes failed on permissions; specs had to clean up *before* Login-As | `SalesforceApi` uses the automation user's token from setup |
| `axios` with hand-URL-encoded SOQL strings (%20%27…) | Unreadable, error-prone queries | Plain SOQL; the helper encodes it and follows pagination |
| Fire-and-forget cleanup (`apiHelper.deleteRecords(...)` without `await`) | Cleanup raced the test and leftovers piled up | Always `await` cleanup |
| `waitForTimeout(7000)` after Login-As | Slow, and still flaky | `waitForURL` predicate + one retry |
| `waitForEvent('page')` started *after* the click | Occasionally missed new tabs, so the code needed try/catch | `Promise.all([waitForEvent, click])` |
| Firefox/WebKit projects without `dependencies: ['setup']` | Those projects ran with a stale or missing session | Every browser project depends on `setup` |
| Two competing test-writing guides (fixture vs raw browser) | Inconsistent specs | One pattern: the fixture |
| Mixed record prefixes (`Autotest`, `AP_Test_`, `AI_Automation_`) | Pre-cleanup missed records | One `TEST_DATA_PREFIX` |
| Unpinned / caret dependency versions | Surprise behavior changes | Pin exact versions |

---

## 15. Final acceptance checklist

The setup is **done** when all of these are true:

- [ ] `.env` filled in. `.env`, `certificates/`, `playwright/.auth/` are git-ignored (check with `git status`).
- [ ] `npm run typecheck` passes.
- [ ] `npx playwright test --project=setup` passes and writes `user.json` and `api-session.json`.
- [ ] `npx playwright test tests/smoke --project=chromium` is all green, including Login As (if personas exist).
- [ ] `BasePage` selectors (`currentApp`, app launcher, toast) were verified against the live org and trimmed.
- [ ] `test-data/users/` has one file per persona, with real User Ids.
- [ ] `CLAUDE.md` created from §13, and this guide copied to `docs/`.
- [ ] At least one real feature spec written per §7: creates its data, pre-cleans by prefix, asserts UI and backend.
- [ ] CI pipeline runs headless with secrets from the secret store and publishes the JUnit and HTML reports.
- [ ] Calendar reminder set for the certificate expiry (§3.1).
