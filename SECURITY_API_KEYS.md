# 🔐 Security Alert: Exposed API Keys

**Date**: 2025-11-28
**Severity**: 🔴 **CRITICAL**
**Status**: ⚠️ **IMMEDIATE ACTION REQUIRED**

---

## ⚠️ Critical Security Issue Found

Multiple API keys were found **hardcoded and exposed** in the codebase:

### 1. Google Maps API Key
- **Location**: `webapp/js/google-maps-config.js` (line 18)
- **Key**: `AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s`
- **Risk**: HIGH - Can be used by anyone who views source code
- **Impact**:
  - Unauthorized usage can exhaust quota
  - Costs can accumulate from malicious actors
  - Key can be used on other websites

### 2. LocationIQ/MapBox API Key
- **Location**: Multiple HTML files
  - `webapp/buscar-usuarios.html` (line 41)
  - `webapp/cita-detalle.html` (line similar)
- **Key**: `AQ.Ab8RN6I6FQgaC1SltCBdMTyt6mM49BUATqwB32I7g5crKb91Vg`
- **Risk**: HIGH - Publicly exposed in HTML
- **Impact**: Same as above

---

## 🚨 IMMEDIATE ACTIONS REQUIRED

### Step 1: Rotate Compromised Keys (URGENT - Do this NOW)

#### Google Maps API Key:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Find the exposed key: `AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s`
3. Click "Delete" or "Restrict" immediately
4. Create a NEW API key
5. Add restrictions:
   - **HTTP referrers (websites)**:
     - `https://tucitasegura.vercel.app/*`
     - `http://localhost/*`
     - `http://127.0.0.1/*`
   - **API restrictions**:
     - Maps JavaScript API
     - Geocoding API
     - Places API (only enable what you need)

#### LocationIQ/MapBox Key:
1. Log into your LocationIQ/MapBox account
2. Revoke the exposed token: `AQ.Ab8RN6I6FQgaC1SltCBdMTyt6mM49BUATqwB32I7g5crKb91Vg`
3. Create a new restricted token
4. Add domain restrictions

### Step 2: Update Codebase

#### Create your local config file:
```bash
# Copy the example file
cp webapp/js/google-maps-config.example.js webapp/js/google-maps-config.js

# Edit and add your NEW restricted API key
nano webapp/js/google-maps-config.js
```

#### Add to .gitignore:
```bash
echo "webapp/js/google-maps-config.js" >> .gitignore
```

### Step 3: Use Environment Variables (Recommended)

For production deployment on Vercel:

```bash
# In Vercel dashboard, add environment variables:
GOOGLE_MAPS_API_KEY=your_new_restricted_key
LOCATIONIQ_API_KEY=your_new_restricted_key
```

Update code to use environment variables:
```javascript
// In build process, replace with env vars
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'TU_API_KEY_AQUI';
```

---

## 📋 Security Checklist

- [ ] **Rotate Google Maps API key** ← DO THIS FIRST
- [ ] **Rotate LocationIQ/MapBox API key** ← DO THIS FIRST
- [ ] Add `webapp/js/google-maps-config.js` to `.gitignore`
- [ ] Create `google-maps-config.js` from example file
- [ ] Add API key restrictions (domains + API limits)
- [ ] Remove hardcoded keys from HTML files
- [ ] Set up environment variables in Vercel
- [ ] Review all commits for exposed secrets
- [ ] Consider using Google Secret Manager for production
- [ ] Enable billing alerts in Google Cloud Console
- [ ] Review API usage logs for suspicious activity

---

## 🛡️ Prevention Strategies

### 1. Never Commit Secrets to Git
```bash
# Always add config files with secrets to .gitignore
echo "**/*config.js" >> .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

### 2. Use Environment Variables
```javascript
// Good ✅
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Bad ❌
const API_KEY = 'AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s';
```

### 3. Use API Key Restrictions
- **HTTP referrers**: Limit to your domains only
- **API restrictions**: Enable only required APIs
- **IP restrictions**: For server-side keys
- **Usage quotas**: Set daily limits

### 4. Use Secret Scanning Tools
```bash
# Install git-secrets
brew install git-secrets

# Set up hooks
git secrets --install
git secrets --register-aws
```

### 5. Regular Security Audits
- Review API usage monthly
- Check for unusual spikes in requests
- Monitor billing alerts
- Rotate keys quarterly

---

## 📚 Resources

- [Google Maps API Security Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 🔍 How This Was Discovered

During the XSS sanitization audit, source code review revealed hardcoded API keys in:
- JavaScript configuration files
- HTML `<script>` tags
- Firebase configuration files

**This is a common mistake but CRITICAL security issue.**

---

## ✅ Post-Remediation Verification

After fixing:
1. Confirm old keys are deleted/disabled
2. Verify new keys work in development
3. Test production deployment
4. Monitor API usage for 24-48 hours
5. Confirm no unauthorized requests

---

**Status**: 🔴 **UNRESOLVED - AWAITING KEY ROTATION**

**Next Steps**: Follow Step 1 immediately to rotate all exposed keys.
