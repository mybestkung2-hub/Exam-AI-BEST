# Deployment Guide for Vercel

## Prerequisites
- Vercel account
- Git repository connected to Vercel

## Environment Variables Setup

**IMPORTANT:** You must add these environment variables in your Vercel project settings:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xhhzgligordzrpymdmkb.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_OnkKW21vGqg48vmWHmsAYQ_uCz5WqSj
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_OnkKW21vGqg48vmWHmsAYQ_uCz5WqSj
```

4. Make sure to add them for **Production**, **Preview**, and **Development** environments

## Deployment Steps

### Option 1: Automatic Deployment (Recommended)
1. Push your code to GitHub/GitLab/Bitbucket
2. Vercel will automatically detect changes and deploy
3. Check the deployment logs for any errors

### Option 2: Manual Deployment via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## Troubleshooting 404 Errors

If you're getting a 404 error on Vercel, try these solutions:

### 1. Clear Build Cache
- Go to Vercel Dashboard → Your Project → Settings → General
- Scroll down and click **"Clear Build Cache & Redeploy"**

### 2. Verify Environment Variables
- Ensure all `NEXT_PUBLIC_*` variables are set in Vercel
- Variables must be added BEFORE deployment

### 3. Check Build Logs
- Go to Deployments tab
- Click on the failed deployment
- Review the build logs for errors

### 4. Verify Framework Preset
- Go to Settings → General
- Ensure **Framework Preset** is set to **Next.js**
- Build Command: `npm run build` or leave empty (auto-detected)
- Output Directory: leave empty (auto-detected)

### 5. Force Redeploy
```bash
# Using Vercel CLI
vercel --prod --force

# Or via dashboard
# Go to Deployments → Click "..." → Redeploy
```

## Common Issues

### Issue: "404: NOT_FOUND"
**Cause:** Missing environment variables or build cache issues
**Solution:** 
1. Add all environment variables in Vercel dashboard
2. Clear build cache and redeploy

### Issue: Build succeeds but page shows 404
**Cause:** Routing configuration or missing pages
**Solution:**
1. Verify `src/app/page.tsx` exists
2. Check `next.config.ts` for any routing overrides
3. Ensure no `.vercelignore` is blocking necessary files

### Issue: "Module not found" errors
**Cause:** Dependencies not installed properly
**Solution:**
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install`
3. Commit and push changes

## Verification

After deployment, verify:
- [ ] Homepage loads at your-domain.vercel.app
- [ ] No console errors in browser DevTools
- [ ] All environment variables are accessible (check Network tab)
- [ ] Supabase connection works (if applicable)

## Support

If issues persist:
1. Check Vercel Status: https://www.vercel-status.com/
2. Review Next.js 16 docs: https://nextjs.org/docs
3. Contact Vercel Support: https://vercel.com/support
