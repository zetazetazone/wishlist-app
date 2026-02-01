# Quick Start Guide

## Get Up and Running in 5 Minutes

### Step 1: Set Up Supabase (2 minutes)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project"
3. Fill in:
   - Project name: `wishlist-app`
   - Database password: (choose a strong password)
   - Region: (closest to you)
4. Wait for project to provision (~2 minutes)

### Step 2: Get Your API Keys (1 minute)

1. In your Supabase project, click "Settings" (gear icon)
2. Click "API" in the sidebar
3. Copy these two values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (the `anon` `public` key, not the `service_role` key)

### Step 3: Configure Your App (30 seconds)

1. Open `.env` file in the project root
2. Replace the placeholder values:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Set Up Database (1 minute)

1. In Supabase, click "SQL Editor" in the sidebar
2. Click "New Query"
3. Copy the SQL from `README.md` (Database Schema section)
4. Paste and click "Run"
5. You should see "Success. No rows returned"

### Step 5: Run the App (30 seconds)

```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Or scan QR code with Expo Go app

### Step 6: Test It Out

1. Click "Sign Up" on the login screen
2. Create an account with your email
3. Check your email for verification link (check spam folder)
4. Click the verification link
5. Return to app and login

**You're all set!** 🎉

## What's Next?

The app currently has:
- ✅ Authentication (Login/Signup)
- ✅ Three tab screens (Home, Wishlist, Groups)
- ✅ Basic UI structure

**Ready to build?** Check out `README.md` for the full roadmap and next features to implement.

## Troubleshooting

**"Missing Supabase URL or Anon Key" error?**
- Double-check your `.env` file has the correct values
- Make sure there are no extra spaces or quotes
- Restart the Expo server (`npm start`)

**Authentication not working?**
- Verify your email by clicking the link sent to your inbox
- Check Supabase Dashboard → Authentication → Users to see if account was created
- Check the Logs tab in Supabase for error details

**App won't start?**
- Clear cache: `npm start -- --clear`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

**Need help?** Check the [Expo Forums](https://forums.expo.dev) or [Supabase Discord](https://discord.supabase.com).
