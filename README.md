# JamBoost — Spotify Playlist Pitching Platform

JamBoost pitches artist releases directly to independent Spotify playlist curators. It features real-time Supabase database synchronisation, official Spotify Web API metadata verification, server-authoritative pricing, and secure PayPal hosted checkout in USD ($).

---

## 1. Environment Variables & Secret Separation

All secrets are strictly confined to the backend server runtime (`server.ts` and `server/email.ts`). **No secret ever appears in any file under `src/`, in the client-side JavaScript bundle, or across the browser network tab.** Only variables prefixed with `VITE_` are exposed to the browser.

| Variable | Side / Runtime | Visibility | Description |
| :--- | :--- | :--- | :--- |
| `APP_URL` | Server | **Server Config** | Base URL of the deployed application (e.g. `https://your-domain.com`). Used for OAuth/payment redirects and email links. |
| `PORT` | Server | **Server Config** | Port on which the Express server listens (default: `3000`). |
| `NODE_ENV` | Server | **Server Config** | Node environment (`development` or `production`). |
| `VITE_SUPABASE_URL` | Client & Server | **Public** | Public HTTPS endpoint for your Supabase project. |
| `VITE_SUPABASE_ANON_KEY` | Client & Server | **Public** | Public client anonymous key for user auth and RLS-protected queries. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | **SECRET** | Elevated service role key for webhook payment inserts and admin transitions. **Never expose to client.** |
| `SPOTIFY_CLIENT_ID` | Server Only | **SECRET** | Spotify Developer Application Client ID for metadata lookups. |
| `SPOTIFY_CLIENT_SECRET` | Server Only | **SECRET** | Spotify Developer Application Secret. **Never expose to client.** |
| `PAYPAL_CLIENT_ID` | Server Only | **SECRET** | PayPal REST App Client ID (Sandbox or Live). |
| `PAYPAL_CLIENT_SECRET` | Server Only | **SECRET** | PayPal REST App Secret for order capture and token exchange. **Never expose to client.** |
| `PAYPAL_WEBHOOK_ID` | Server Only | **SECRET** | PayPal Webhook ID for HMAC signature verification. |
| `PAYPAL_MODE` | Server Only | **Server Config** | PayPal operational mode (`sandbox` or `production`). |
| `PAYPAL_API_BASE` | Server Only | **Server Config** | Optional override for PayPal REST API base URL. |
| `RESEND_API_KEY` | Server Only | **SECRET** | API key for Resend transactional email service. **Never expose to client.** |
| `RESEND_FROM_EMAIL` | Server Only | **Server Config** | Sender identity for transactional emails (default: `JamBoost <notifications@jamboost.com>`). |
| `VITE_PLAUSIBLE_DOMAIN` | Client Only | **Public (Optional)** | Domain for lightweight privacy-first analytics (e.g. `jamboost.com`). Off when unset. |
| `VITE_TURNSTILE_SITE_KEY` | Client Only | **Public (Optional)** | Cloudflare Turnstile public site key for bot protection during sign-in and registration. |

---

## 2. Cloudflare Turnstile Bot Protection & Supabase Auth Configuration

To enable server-enforced bot protection on sign-up and sign-in:
1. **Get Cloudflare Turnstile Keys**:
   - In Cloudflare Dashboard, go to **Turnstile** and add a widget for your domain.
   - Set widget mode to **Managed** or **Non-interactive**.
   - Copy the **Site Key** to `VITE_TURNSTILE_SITE_KEY`.
   - Copy the **Secret Key** for use in Supabase.
2. **Switch on CAPTCHA in Supabase**:
   - In your Supabase Project Dashboard, navigate to **Authentication** > **Attack Protection** (or **Bot Detection / CAPTCHA**).
   - Toggle **Enable CAPTCHA protection** to `ON`.
   - Select **Cloudflare Turnstile** as the CAPTCHA Provider.
   - Enter your Cloudflare Turnstile **Secret Key**.
   - Click **Save**.
   Once enabled, Supabase Auth will reject sign-ups and logins that lack a valid Turnstile token. When `VITE_TURNSTILE_SITE_KEY` is configured, JamBoost renders the Turnstile challenge in the auth modal and passes `captchaToken` directly to `supabase.auth.signUp` and `supabase.auth.signInWithPassword`.

---

## 3. Server Endpoints & Health Check

- `GET /api/health`: Health status endpoint returning HTTP 200 with `{ status: "ok", timestamp: "...", uptime: 123.45 }`. Used by load balancers and container orchestrators for liveness/readiness probes.
- `POST /api/auth/rate-limit-check`: Server-side IP rate limiter check (enforces 5 attempts per hour for sign-up and password reset).
- `POST /api/checkout`: Creates a server-authoritative PayPal order for a submission. Requires Supabase bearer token.
- `POST /api/checkout/capture`: Server-side capture of approved PayPal order. Requires Supabase bearer token.
- `POST /api/webhooks/paypal`: Cryptographically verified webhook handler for PayPal order completions and cancellations.
- `POST /api/admin/submissions/:id/transition`: Admin-only state machine transition endpoint (`Pending -> Approved/Rejected -> Live -> Completed`) that sends transactional emails.
- `GET /api/spotify/lookup`: Server-side cached Spotify track metadata resolver.

---

## 4. Transactional Emails (Resend)

JamBoost sends transactional emails using Resend (`RESEND_API_KEY`) with clean, branded responsive HTML and plaintext fallbacks:
1. **Artist Payment Received**: Sent immediately upon payment capture or webhook confirmation, acknowledging the campaign is queued for editorial review.
2. **Internal Order Alert**: Sent to `orders@sanelowmusiclabel.co.za` whenever a new paid submission arrives, detailing track title, artist, plan, and payment ID.
3. **Artist Submission Approved**: Sent when an admin transitions a campaign from `Pending` to `Approved`.
4. **Artist Submission Rejected**: Sent when an admin rejects a submission, containing the curator's honest rejection reason and note regarding eligible refunds.
5. **Campaign Completed**: Sent when a campaign transitions to `Completed`, detailing the reported results (curator playlists added, saves delivered, and streams delivered).

---

## 5. Server-Authoritative Pricing & Checkout Flow

All campaign pricing is enforced strictly on the server:
- **Starter Plan**: $29.00 USD (2,900 cents) — Deliverable: Pitched to 20 independent playlist curators
- **Pro Plan**: $89.00 USD (8,900 cents) — Deliverable: Pitched to 60 independent playlist curators
- **Premium Plan**: $249.00 USD (24,900 cents) — Deliverable: Pitched to 150 independent playlist curators (mapped from legacy 'Viral' tier)

Client amounts are never accepted by the server. The checkout process proceeds as follows:
1. **Creation**: The artist submits their verified Spotify release link in the Submission Wizard. A campaign row is created in `submissions` with status `'Awaiting payment'`.
2. **Checkout Session**: The client calls `POST /api/checkout` with `{ submission_id }` and the Supabase bearer token.
   - The server verifies ownership via user-scoped Supabase client (Row-Level Security).
   - Rejects if status is not `'Awaiting payment'`.
   - Looks up the official price from `SERVER_PLAN_PRICES` based on the submission's plan.
   - Generates a PayPal Hosted Checkout Order with `submission_id` stored in metadata (`custom_id` and `reference_id`).
   - Success URL: `${APP_URL}/dashboard?payment=success`
   - Cancel URL: `${APP_URL}/dashboard?payment=cancelled`
3. **Redirection**: The browser redirects to PayPal's secure checkout page.
4. **Webhook & Confirmation**: PayPal sends a cryptographically signed webhook to `POST /api/webhooks/paypal`.
   - Signature headers (`paypal-auth-algo`, `paypal-cert-url`, `paypal-transmission-id`, `paypal-transmission-sig`, `paypal-transmission-time`) are verified against PayPal's verification API with the raw request body. Unsigned or invalid requests are rejected with `400`.
   - On `PAYMENT.CAPTURE.COMPLETED` or `CHECKOUT.ORDER.APPROVED`, a payment row is inserted into `payments` (`provider: 'paypal'`, `provider_ref`, `amount_cents`, `currency: 'usd'`, `status: 'completed'`).
   - The submission status is automatically updated to `'Pending'` (Curator Review).
   - **Idempotency**: Duplicate webhook deliveries for the same `provider_ref` are checked against existing payments and skipped without duplication or error.
5. **Realtime Dashboard**: The artist dashboard listens to Supabase `postgres_changes` on the `submissions` table, automatically updating the campaign badge from `'Awaiting payment'` to `'Pending'` in real-time.

---

## 6. How to Set Up PayPal Sandbox & Credentials

1. **Sign in to PayPal Developer**:
   - Go to [developer.paypal.com](https://developer.paypal.com) and log in.
2. **Create a REST API App**:
   - Navigate to **Apps & Credentials** > **Sandbox**.
   - Click **Create App**, name it `JamBoost Sandbox`, and select your sandbox business account.
   - Copy the generated **Client ID** into `PAYPAL_CLIENT_ID`.
   - Copy the **Secret** into `PAYPAL_CLIENT_SECRET`.
   - Set `PAYPAL_MODE=sandbox`.
3. **Register Webhook**:
   - Scroll down to the **Webhooks** section on the app page and click **Add Webhook**.
   - Set the Webhook URL to: `${APP_URL}/api/webhooks/paypal` (e.g. `https://your-domain.com/api/webhooks/paypal`).
   - Select event types:
     - `Payment capture completed` (`PAYMENT.CAPTURE.COMPLETED`)
     - `Checkout order approved` (`CHECKOUT.ORDER.APPROVED`)
   - Save the webhook and copy the **Webhook ID** into `PAYPAL_WEBHOOK_ID`.

---

## 7. Testing with PayPal Sandbox Cards & Buyer Accounts

### Option A: Sandbox Personal Account (Recommended)
1. Go to **Testing Tools** > **Sandbox Accounts** in your PayPal Developer dashboard.
2. Find the auto-generated **Personal (Buyer)** account (e.g. `sb-buyer123@personal.example.com`).
3. Click the three dots > **View/Edit Account** to copy its login email and password.
4. In JamBoost:
   - Create a new campaign through the Submission Wizard or click **Pay now** on an existing `'Awaiting payment'` row in your dashboard.
   - You will see the plan, price in USD ($29, $89, or $249), and refund policy link.
   - Proceed to PayPal checkout and log in with your sandbox buyer credentials.
   - Complete payment and confirm the redirect returns to `/dashboard?payment=success`.

### Option B: Sandbox Test Credit Cards
You can test direct card payments using PayPal's official sandbox test cards:
- **Card Type**: Visa or MasterCard
- **Card Number**: Use standard PayPal Sandbox test card numbers (generated in your PayPal Developer account under **Testing Tools** > **Credit Card Generator**).
- **Expiration Date**: Any date in the future (e.g. `12/28`).
- **CVV**: `123`
- **Billing Address**: Any valid US address (e.g. 123 Main St, San Jose, CA 95131).

### Testing Cancellation
- At the PayPal checkout screen, click **Cancel and return to JamBoost**.
- You will be redirected to `/dashboard?payment=cancelled`.
- The dashboard displays a notification banner: "PayPal Checkout Cancelled".
- The submission remains in `'Awaiting payment'` status, and you can click **Pay now** at any time to resume checkout.

### Testing Idempotency
- Send the same `PAYMENT.CAPTURE.COMPLETED` payload twice to `POST /api/webhooks/paypal` (using PayPal's Webhook Simulator).
- The server logs `[Webhook Outcome] Idempotent hit: provider_ref already processed. Skipping duplicate insert.` and returns `HTTP 200 { received: true, idempotent: true }`.
- No duplicate payment row is inserted.

---

## 8. Refunds & Pitching Policy
 
The refund policy is accessible at `/refunds`:
- **100% Pre-Pitch Refund**: If a submission is rejected by JamBoost during initial editorial review prior to pitching commencing, a full 100% refund in USD is issued to the artist's PayPal account.
- **Outreach Phase**: Once custom curator outreach and playlist submissions have commenced, the service has been performed and fees become non-refundable. Results depend on track quality and curator editorial discretion; JamBoost does not sell or guarantee streams.
