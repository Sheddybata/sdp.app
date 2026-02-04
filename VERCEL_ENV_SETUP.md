# Vercel Environment Variables Setup

## Issue
Login works locally but fails on Vercel with "Invalid email or password"

## Root Cause
Environment variables are not set correctly in Vercel, or the password hash has escape characters that need to be handled differently.

## Solution: Set Environment Variables in Vercel

### Step 1: Go to Vercel Dashboard
1. Visit https://vercel.com/dashboard
2. Select your project: **sdp.app**
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Each Variable

Add these variables **exactly as shown below** (one at a time):

#### 1. Supabase Variables
```
NEXT_PUBLIC_SUPABASE_URL
Value: https://soynrliuukpmnslljvrp.supabase.co
Environment: Production, Preview, Development
```

```
NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveW5ybGl1dWtwbW5zbGxqdnJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDYwNDQsImV4cCI6MjA4NTc4MjA0NH0.bTlGWCAF9RVwZDgVBEOJu_umwBFhrgfbigms9-Wr9-0
Environment: Production, Preview, Development
```

```
SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveW5ybGl1dWtwbW5zbGxqdnJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIwNjA0NCwiZXhwIjoyMDg1NzgyMDQ0fQ.QSeTcZ54EYCrWIT0_hFOuyeCbs4B-q6YG8Hqpi68F9s
Environment: Production, Preview, Development
```

#### 2. Admin Authentication Variables

**⚠️ IMPORTANT: For ADMIN_PASSWORD_HASH, use the value WITHOUT escape characters!**

In your `.env.local`, you have:
```
ADMIN_PASSWORD_HASH=\$2b\$10\$C6jwSH3NMLQIPQUsTs2sOOYdI6680uHYQ10rho8wAEr54RuOi0rd.
```

**In Vercel, set it as:**
```
ADMIN_PASSWORD_HASH
Value: $2b$10$C6jwSH3NMLQIPQUsTs2sOOYdI6680uHYQ10rho8wAEr54RuOi0rd.
Environment: Production, Preview, Development
```

**Note:** Remove the backslashes (`\`) before the `$` signs!

```
ADMIN_EMAIL
Value: admin@sdp.org
Environment: Production, Preview, Development
```

```
SESSION_SECRET
Value: 4ed2c8bb1d68c5775e49d9bccad960bd28f1feaa055f5eaa598e8d07c890db98
Environment: Production, Preview, Development
```

### Step 3: Verify Password Hash

If login still fails, regenerate the password hash:

1. **Locally**, run:
   ```bash
   node scripts/generate-password-hash.js
   ```

2. Copy the **full hash** (should be 60 characters, not ending with `.`)

3. Update `ADMIN_PASSWORD_HASH` in Vercel with the complete hash

### Step 4: Redeploy

After adding all environment variables:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger automatic deployment

## Troubleshooting

### Check Vercel Logs
1. Go to **Deployments** → Click on latest deployment
2. Click **Functions** → Find `/admin/login` function
3. Check **Logs** tab for `[AUTH]` messages

### Common Issues

1. **Password hash truncated**: Make sure the full 60-character hash is set
2. **Escape characters**: Don't use `\$` in Vercel, use `$` directly
3. **Environment scope**: Make sure variables are set for **Production** environment
4. **Redeploy needed**: Environment variables only apply to new deployments

### Test After Setup

1. Visit your Vercel URL: `https://your-app.vercel.app/admin/login`
2. Try logging in with:
   - Email: `admin@sdp.org`
   - Password: `Hermit@19`

## Quick Copy-Paste Values

```
NEXT_PUBLIC_SUPABASE_URL=https://soynrliuukpmnslljvrp.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveW5ybGl1dWtwbW5zbGxqdnJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDYwNDQsImV4cCI6MjA4NTc4MjA0NH0.bTlGWCAF9RVwZDgVBEOJu_umwBFhrgfbigms9-Wr9-0

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveW5ybGl1dWtwbW5zbGxqdnJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIwNjA0NCwiZXhwIjoyMDg1NzgyMDQ0fQ.QSeTcZ54EYCrWIT0_hFOuyeCbs4B-q6YG8Hqpi68F9s

ADMIN_EMAIL=admin@sdp.org

ADMIN_PASSWORD_HASH=$2b$10$C6jwSH3NMLQIPQUsTs2sOOYdI6680uHYQ10rho8wAEr54RuOi0rd.

SESSION_SECRET=4ed2c8bb1d68c5775e49d9bccad960bd28f1feaa055f5eaa598e8d07c890db98
```

**Remember:** For `ADMIN_PASSWORD_HASH`, use `$2b$...` NOT `\$2b$...`
