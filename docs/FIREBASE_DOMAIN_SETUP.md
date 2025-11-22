# Firebase Domain Authorization Setup Guide

## Problem: Network Request Failed on Vercel Deployment

When deploying to Vercel (or other hosting platforms), you may encounter `auth/network-request-failed` errors during user registration/login. This happens because Firebase Auth needs to explicitly authorize your deployment domain.

## Solution: Authorize Your Domain in Firebase Console

### Step 1: Get Your Deployment Domain
- For Vercel: `https://[your-project].vercel.app`
- For Netlify: `https://[your-name].netlify.app`
- For Custom Domain: `https://yourdomain.com`

### Step 2: Add Domain to Firebase Authorized Domains

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Select your project** (tuscitasseguras-2d1a6)
3. **Navigate to Authentication** → **Settings** → **Authorized domains**
4. **Click "Add domain"**
5. **Enter your deployment domain** (without https://)
   - Example: `traext5oyy6q.vercel.app`
6. **Click "Add"**

### Step 3: Also Add Local Development Domains
Make sure these are authorized for local development:
- `localhost`
- `127.0.0.1`

### Step 4: Wait for Propagation
Domain authorization can take up to 15 minutes to take effect.

## Verification

After authorization, test registration/login again. The `auth/network-request-failed` error should disappear.

## Troubleshooting

If the error persists:

1. **Check for typos** in the domain name
2. **Clear browser cache** and cookies
3. **Try incognito/private mode**
4. **Check Firebase Console** for any service outages
5. **Verify domain is correctly added** in authorized domains list

## Alternative: Development Mode

For immediate development, you can use localhost which should already be authorized:
```bash
python -m http.server 8080
# Then access: http://localhost:8080/webapp/register.html
```

## Security Note

Only authorize domains you trust. Never authorize unknown or suspicious domains as they could potentially abuse your Firebase project.

## Related Error Messages

This setup resolves errors like:
- `auth/network-request-failed`
- `auth/internal-error` (when domain-related)
- `auth/unavailable` (when domain-related)

## Need Help?

If you continue experiencing issues after domain authorization:
1. Check browser console for detailed error messages
2. Verify your Firebase configuration is correct
3. Contact Firebase support if the issue persists