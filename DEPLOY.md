# JamBoost — Production Deployment Guide

This guide provides step-by-step instructions for deploying JamBoost to production, attaching a custom domain with automatic SSL/TLS, configuring production Supabase authentication and database settings, activating live PayPal payments, and performing a post-launch smoke test.

---

## 1. Exporting the Project from AI Studio to GitHub

You can export the entire application from Google AI Studio to a private or public GitHub repository in two ways:

### Option A: Direct GitHub Export in AI Studio UI (Fastest)
1. In the AI Studio interface, click the **Export** or **Code** menu located at the top-right toolbar.
2. Select **Export to GitHub**.
3. If prompted, authorize your GitHub account.
4. Choose an organization or personal GitHub account, specify your repository name (e.g. `jamboost-production`), and set the repository visibility to **Private** (recommended to protect deployment secrets).
5. Click **Create Repository and Push**. AI Studio will commit all codebase files, including `server.ts`, `package.json`, Vite configurations, and assets.

### Option B: Local Git Clone & Push
If you have access to a local terminal or download the project archive:
```bash
# 1. Initialize git and add files (if starting locally)
git init
git add .
git commit -m "feat: production-ready JamBoost release"

# 2. Add your GitHub remote repository
git remote add origin https://github.com/<your-github-username>/jamboost-production.git
git branch -M main

# 3. Push to GitHub
git push -u origin main
```

---

## 2. Full-Stack Production Deployment (Render)

**Recommended Hosting Provider**: [Render](https://render.com) (Web Service).  
Render natively manages Node.js full-stack applications with built-in HTTPS, continuous deployment via GitHub webhooks, environment variable encryption, and HTTP proxy forwarding.

### Step 1: Create a New Web Service on Render
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository (`jamboost-production`).
4. Configure the basic settings:
   - **Name**: `jamboost-app`
   - **Region**: Choose the region closest to your primary audience (e.g. `Frankfurt (EU Central)` or `Oregon (US West)`).
   - **Branch**: `main`
   - **Root Directory**: `.` (leave blank for root)
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Instance Type**: Starter ($7/month) or Standard (recommended for production uptime).

### Step 2: Configure Production Environment Variables
Under the **Environment** tab in your Render service, add the following environment variables:

| Environment Variable | Scope | Required | Value / Format | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Server | **Yes** | `production` | Activates production optimizations, disables dev Vite middleware, and enables startup validation. |
| `PORT` | Server | **Yes** | `3000` (or leave default `$PORT`) | Port on which the Express HTTP server listens. Render automatically routes external traffic to this port. |
| `APP_URL` | Server | **Yes** | `https://yourdomain.com` | Primary public URL of your custom domain (e.g. `https://jamboost.com`). Used for PayPal returns and webhooks. |
| `VITE_SUPABASE_URL` | Client & Server | **Yes** | `https://<project-id>.supabase.co` | Supabase API URL. Built into the client bundle and used by server. |
| `VITE_SUPABASE_ANON_KEY` | Client & Server | **Yes** | `eyJhbGciOi...` | Public Supabase anon key for client-side queries and RLS auth. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | **Yes** | `eyJhbGciOi...` | **Secret** admin key. Verifies JWT tokens, updates submissions to `Pending`, and records payments. |
| `SPOTIFY_CLIENT_ID` | Server Only | **Yes** | `32-char hex string` | Spotify Developer Client ID for track/album/playlist metadata lookups. |
| `SPOTIFY_CLIENT_SECRET` | Server Only | **Yes** | `32-char hex string` | Spotify Developer Client Secret used for token retrieval. |
| `PAYPAL_MODE` | Server Only | **Yes** | `production` | Switches PayPal SDK and REST endpoints from sandbox to live `api-m.paypal.com`. |
| `PAYPAL_CLIENT_ID` | Server Only | **Yes** | Live Client ID | PayPal REST Live Application Client ID. |
| `PAYPAL_CLIENT_SECRET` | Server Only | **Yes** | Live Secret | PayPal REST Live Application Secret. |
| `PAYPAL_WEBHOOK_ID` | Server Only | **Yes** | Live Webhook ID | Webhook ID from PayPal Live Developer dashboard for signature verification. |

> **Note**: Click **Save Changes**. Render will automatically trigger an initial deployment build.

---

## 3. Attaching Your Custom Domain with HTTPS

Follow these steps to connect your custom domain (e.g. `jamboost.com`) with automated SSL/TLS encryption:

### Step 1: Add Custom Domain in Render
1. In the Render Dashboard, open your `jamboost-app` Web Service.
2. Go to **Settings** > **Custom Domains**.
3. Click **Add Custom Domain** and enter:
   - Root apex domain: `yourdomain.com`
   - Subdomain: `www.yourdomain.com`

### Step 2: Configure DNS Records at Your Registrar
Log in to your DNS provider (Cloudflare, Namecheap, GoDaddy, Google Domains, Route53, etc.) and add:

1. **Root Domain (Apex `@`)**:
   - **Type**: `A`
   - **Name / Host**: `@` (or leave blank)
   - **Value / Target**: `217.160.0.X` (Use the exact IP address displayed in your Render dashboard under Custom Domains)
   - **TTL**: `Auto` or `300 seconds`

2. **Subdomain (`www`)**:
   - **Type**: `CNAME`
   - **Name / Host**: `www`
   - **Value / Target**: `jamboost-app.onrender.com`
   - **TTL**: `Auto` or `300 seconds`

### Step 3: SSL/TLS Verification
- Render automatically provisions a free, auto-renewing **Let's Encrypt SSL/TLS certificate**.
- SSL provisioning typically completes within 5 to 15 minutes after DNS propagation.
- Render automatically enforces HTTP to HTTPS redirects and enables HTTP/2.

---

## 4. Production Supabase Configuration

Open your Supabase Project Dashboard (`https://supabase.com/dashboard/project/<project-id>`):

### A. Site URL & Redirect URLs
Navigate to **Authentication** > **URL Configuration**:
1. **Site URL**: Set to `https://yourdomain.com` (replace with your custom domain).
2. **Redirect URLs**: Add the following production redirect paths:
   - `https://yourdomain.com/**`
   - `https://yourdomain.com/dashboard`
   - `https://yourdomain.com/dashboard?payment=success`
   - `https://yourdomain.com/dashboard?payment=cancelled`
   - `https://yourdomain.com/` (Password recovery links redirect to the site origin where `#type=recovery` is detected by the application).

### B. Email Confirmation
Navigate to **Authentication** > **Providers** > **Email**:
1. Turn **Enable Email Provider** ON.
2. Turn **Confirm email** ON (enforces that artists must verify their email before accessing accounts).
3. Set **Secure email change** to ON.

### C. Custom SMTP Sender with Resend
Using Supabase's default shared mailer is strictly rate-limited (3 emails per hour). Configure a dedicated transactional SMTP provider:

1. Create a free account at [Resend](https://resend.com).
2. Add and verify your custom domain in Resend (**Domains** > **Add Domain** > add the DKIM/SPF TXT records to your DNS provider).
3. Generate an API Key under **API Keys** with "Sending access".
4. Return to the Supabase Dashboard: **Authentication** > **SMTP Settings**:
   - **Enable Custom SMTP**: Toggle to **ON**
   - **Sender email**: `support@yourdomain.com` or `noreply@yourdomain.com`
   - **Sender name**: `JamBoost`
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (SSL) or `587` (TLS)
   - **Username**: `resend`
   - **Password**: `re_YourResendApiKeyHere...`
5. Click **Save** and send a test confirmation email to verify delivery.

### D. Bot Protection / CAPTCHA
Navigate to **Authentication** > **Bot Protection**:
1. Toggle **Enable CAPTCHA protection** to **ON**.
2. Select **Cloudflare Turnstile** or **hCaptcha**.
3. Enter your Turnstile/hCaptcha Site Key and Secret Key to protect the registration and login forms from automated spam bots.

### E. Minimum Password Length
Navigate to **Authentication** > **Password Policy**:
1. Set **Minimum password length** to `10`.
2. Save changes. JamBoost's UI and validation rules are configured to require at least 10 characters for all new signups and password resets.

---

## 5. PayPal Live Production Setup & Webhooks

### Step 1: Switch from Sandbox to Live
1. Log in to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard).
2. In the top-right corner, toggle the environment switch from **Sandbox** to **Live**.
3. Under **Apps & Credentials**, click **Create App** (or select your existing Live app):
   - **App Name**: `JamBoost Live`
   - **App Type**: Merchant
4. Copy the **Live Client ID** and **Live Secret Key**.
5. Set `PAYPAL_MODE=production` in your hosting environment variables.

### Step 2: Register the Live PayPal Webhook
1. In your PayPal Live App details, scroll to the **Webhooks** section.
2. Click **Add Webhook**.
3. **Webhook URL**:
   ```
   https://yourdomain.com/api/webhooks/paypal
   ```
   *(Ensure you use `https://` with your live custom domain).*
4. Select the following **Event Types**:
   - `Payment capture completed` (`PAYMENT.CAPTURE.COMPLETED`)
   - `Checkout order approved` (`CHECKOUT.ORDER.APPROVED`)
5. Click **Save**.
6. Copy the newly generated **Webhook ID** and set it as `PAYPAL_WEBHOOK_ID` in your hosting provider's environment variables.

---

## 6. Post-Launch Smoke Test Checklist

Execute these 9 tests immediately after deploying to verify system stability:

- [ ] **1. Server Health Check**:
  Visit `https://yourdomain.com/api/health` in your browser.  
  Verify it returns HTTP 200 with:
  ```json
  {
    "status": "ok",
    "service": "jamboost",
    "environment": "production",
    "paypalMode": "production",
    "supabaseConfigured": true
  }
  ```

- [ ] **2. HTTPS & Domain Security**:
  Open `http://yourdomain.com` (without https). Verify that your browser automatically redirects to `https://yourdomain.com` with a valid SSL padlock.

- [ ] **3. Legal & Transparency Pages**:
  Visit each legal page directly in the browser and confirm content and "Last updated" timestamps load cleanly:
  - `https://yourdomain.com/refunds`
  - `https://yourdomain.com/terms`
  - `https://yourdomain.com/privacy`
  - `https://yourdomain.com/contact`

- [ ] **4. Spotify Web API Lookup**:
  1. Open the JamBoost homepage.
  2. Paste a valid public Spotify link (e.g. `https://open.spotify.com/track/...`) into the hero input.
  3. Verify that the server contacts Spotify Web API and displays official artwork, track title, and artist name in read-only format without errors.

- [ ] **5. Artist Account Registration & Email Confirmation**:
  1. Click **Sign In** > **Create an Account**.
  2. Enter a test email and a password with at least 10 characters.
  3. Submit the form. Verify that JamBoost displays: *"Check your email to confirm your account"*.
  4. Check your inbox, click the confirmation link sent by your custom Resend SMTP sender, and confirm you can log in.

- [ ] **6. Password Recovery Flow**:
  1. In the login modal, click **Forgot password?**.
  2. Enter your registered email.
  3. Verify receipt of the recovery email and click the link. Confirm the JamBoost recovery dialog opens to set a new password.

- [ ] **7. Campaign Creation & Duplicate Guard**:
  1. While signed in, launch the Submission Wizard.
  2. Enter your verified Spotify track link, select your genre and target territory, check both authorization checkboxes, and proceed.
  3. Verify that a submission row is created in `submissions` with status `'Awaiting payment'`.
  4. Attempt to submit the exact same track link again; verify the duplicate prevention guard alerts you that an active campaign already exists.

- [ ] **8. PayPal Checkout & Webhook Processing**:
  1. In your artist dashboard, click **Pay now** on the `'Awaiting payment'` campaign.
  2. Confirm the modal displays the exact USD amount ($29, $89, or $249) and links to `/refunds`.
  3. Click to proceed to PayPal. Verify redirection to PayPal's live hosted checkout session.
  4. Complete payment (or test with a minimal transaction).
  5. Confirm redirection back to `https://yourdomain.com/dashboard?payment=success`.
  6. Verify that the green success banner appears and the campaign status automatically updates from `'Awaiting payment'` to `'Pending'` via Supabase realtime.

- [ ] **9. Admin Access Gating**:
  1. Sign in with a standard artist account and visit `/admin`. Verify the custom 404 / Not Found screen is displayed.
  2. In your Supabase SQL editor or dashboard, set your user profile role to `'admin'` (`UPDATE profiles SET role = 'admin' WHERE id = '<your-id>';`).
  3. Refresh the page or click **Admin Area**. Verify the administrator dashboard opens, displaying campaigns, review transitions (Approve / Reject), and manual result logging.
