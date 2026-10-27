# JamBoost — Spotify Playlist Pitching Platform

JamBoost pitches artist releases directly to independent Spotify playlist curators. It features real-time Supabase database synchronisation, official Spotify Web API metadata verification, server-authoritative pricing, and secure PayPal hosted checkout in USD ($).

---

## 1. Required Secrets & Environment Variables

Configure these environment variables in your `.env` or deployment environment:

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `APP_URL` | Server | Public URL where this applet is hosted (e.g. `https://your-domain.com` or `http://localhost:3000`). |
| `VITE_SUPABASE_URL` | Client & Server | The URL of your Supabase project (e.g. `https://xyz.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | Client & Server | Public Supabase anon key for client-side authentication and RLS-protected queries. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | Secret service role key used by the server to verify tokens and insert payments / update submissions. |
| `SPOTIFY_CLIENT_ID` | Server Only | Spotify Developer Client ID for fetching track/album/playlist metadata. |
| `SPOTIFY_CLIENT_SECRET` | Server Only | Spotify Developer Client Secret (used in Client Credentials flow). |
| `PAYPAL_CLIENT_ID` | Server Only | PayPal REST App Client ID (Sandbox or Live). |
| `PAYPAL_CLIENT_SECRET` | Server Only | PayPal REST App Secret. |
| `PAYPAL_WEBHOOK_ID` | Server Only | PayPal Webhook ID registered for signature verification. |
| `PAYPAL_MODE` | Server Only | Environment mode: `sandbox` (default) or `production`. |

---

## 2. Server-Authoritative Pricing & Checkout Flow

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

## 3. How to Set Up PayPal Sandbox & Credentials

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

## 4. Testing with PayPal Sandbox Cards & Buyer Accounts

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

## 5. Refunds & Pitching Policy
 
The refund policy is accessible at `/refunds`:
- **100% Pre-Pitch Refund**: If a submission is rejected by JamBoost during initial editorial review prior to pitching commencing, a full 100% refund in USD is issued to the artist's PayPal account.
- **Outreach Phase**: Once custom curator outreach and playlist submissions have commenced, the service has been performed and fees become non-refundable. Results depend on track quality and curator editorial discretion; JamBoost does not sell or guarantee streams.
