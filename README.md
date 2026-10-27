# Savar Tour Lover - Vercel Deployment Guide

This project is optimized for direct deployment on [Vercel](https://vercel.com). All serverless functions, ISR page caching, Supabase database synchronization, and background cron keep-alive tasks are configured for Vercel.

---

## 🚀 One-Click / Git Deployment on Vercel

1. Push this repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..." → "Project"**.
3. Import your repository.
4. Framework Preset will be automatically detected as **Next.js**.
5. Add the **Environment Variables** in the Vercel project settings (see below).
6. Click **Deploy**.

---

## 🔑 Required Environment Variables

Configure these in **Vercel Dashboard → Project Settings → Environment Variables**:

### Core Secrets (Required in Production)
- `JWT_SECRET`: Random 64-char string for authentication token generation (e.g., generate via `openssl rand -base64 48`).
- `CLEARANCE_SECRET`: Random string for clearance security token generation.
- `NEXT_PUBLIC_API_URL`: `/api/v1`

### Supabase Database & Storage (Required)
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL (e.g. `https://xyzcompany.supabase.co`).
- `SUPABASE_URL`: Your Supabase Project URL (same as above).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/public key.
- `SUPABASE_PUBLISHABLE_KEY`: Supabase anon/public key (same as above).
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase `service_role` secret key (bypasses RLS for secure serverless API writes).
- `SUPABASE_STORAGE_BUCKET`: `tourlover-data` (or your chosen storage bucket).
- `SUPABASE_WEBHOOK_SECRET`: Shared secret for database sync webhook (send via `x-webhook-secret` header).

### Payment Gateways (bKash & DBBL Rocket)
- `BKASH_APP_KEY`: bKash API App Key
- `BKASH_APP_SECRET`: bKash API App Secret
- `BKASH_USERNAME`: bKash API Username
- `BKASH_PASSWORD`: bKash API Password
- `BKASH_BASE_URL`: bKash endpoint URL (`https://tokenized.sandbox.bka.sh/v1.2.0-beta` for sandbox or live URL)
- `BKASH_SANDBOX`: `true` (sandbox) or `false` (production)
- `ROCKET_MERCHANT_ID`: DBBL Rocket Merchant ID
- `ROCKET_APP_KEY`: DBBL Rocket App Key
- `ROCKET_APP_SECRET`: DBBL Rocket App Secret
- `ROCKET_BASE_URL`: Rocket Gateway endpoint URL
- `ROCKET_SANDBOX`: `true` or `false`

### Crons & Keep-Alive
- `CRON_SECRET`: Random secret used to secure `/api/cron/keepalive`. Vercel Cron automatically passes this header on scheduled invocations to keep your Supabase project active without pausing.

---

## ⏰ Cron Jobs (`vercel.json`)

Vercel Cron is configured in `vercel.json`:
- **Path**: `/api/cron/keepalive`
- **Schedule**: `0 5 * * *` (Daily at 05:00 UTC / 11:00 AM BST)

This automatically sends a lightweight count query to Supabase once per day to prevent free-tier projects from pausing after 7 days of inactivity.

---

## 🛠 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Build for production test
npm run build
```
