# Google Maps API Configuration Guide

> **Status:** ⚠️ **CRITICAL - REQUIRED FOR PRODUCTION**
> **Last Updated:** 2025-11-14
> **Affected Files:** `webapp/buscar-usuarios.html`, `webapp/cita-detalle.html`

---

## Overview

TuCitaSegura uses Google Maps JavaScript API for core functionality:
- **User Search Map** - Display potential matches on interactive map
- **Date Location** - Show meeting place with directions

**Current Status:** 🔴 **NOT CONFIGURED** - Placeholder API key needs replacement

---

## Step 1: Get Google Maps API Key

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Create Project**
3. Enter project name: `TuCitaSegura` (or your preferred name)
4. Click **Create**

### 1.2 Enable Required APIs

Navigate to **APIs & Services** > **Library** and enable:

- ✅ **Maps JavaScript API** (required)
- ✅ **Places API** (required for location search)
- ✅ **Geocoding API** (recommended for address validation)
- ✅ **Geolocation API** (recommended for user positioning)

### 1.3 Create API Key

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Copy the generated API key
4. Click **Restrict Key** (important for security)

---

## Step 2: Restrict API Key (Security)

### 2.1 Application Restrictions

Choose **HTTP referrers (web sites)**

Add your domains:
```
https://tuscitasseguras-2d1a6.web.app/*
https://tuscitasseguras-2d1a6.firebaseapp.com/*
http://localhost:8000/*
http://127.0.0.1:8000/*
```

### 2.2 API Restrictions

Select **Restrict key** and choose:
- Maps JavaScript API
- Places API
- Geocoding API
- Geolocation API

Click **Save**

---

## Step 3: Configure Application

### 3.1 Update HTML Files

Replace the placeholder in **2 files**:

#### File 1: `/webapp/buscar-usuarios.html`

**Line 11:** Change from:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places,geometry"></script>
```

To:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_ACTUAL_API_KEY_HERE&libraries=places,geometry"></script>
```

#### File 2: `/webapp/cita-detalle.html`

**Search for** `YOUR_GOOGLE_MAPS_API_KEY` and replace with your actual key.

### 3.2 Environment-Based Configuration (Recommended)

For better security, use environment variables:

**Option A: Build-time replacement**
```bash
# Replace in files during deployment
sed -i "s/YOUR_GOOGLE_MAPS_API_KEY/${GOOGLE_MAPS_API_KEY}/g" webapp/*.html
```

**Option B: Firebase Remote Config** (future enhancement)
Store API key in Firebase Remote Config and load dynamically.

---

## Step 4: Test Configuration

### 4.1 Local Testing

1. Start local server:
   ```bash
   python -m http.server 8000
   ```

2. Open browser:
   ```
   http://localhost:8000/webapp/buscar-usuarios.html
   ```

3. Open DevTools Console (F12)

4. Check for errors:
   ```
   ✅ GOOD: Map loads, no errors
   ❌ BAD: "Google Maps API error: InvalidKeyMapError"
   ❌ BAD: "Google Maps API error: RefererNotAllowedMapError"
   ```

### 4.2 Verify Functionality

Test these features:

**User Search Map:**
- [ ] Map renders correctly
- [ ] User markers appear
- [ ] Click marker shows user info
- [ ] Distance calculation works
- [ ] Geolocation button works

**Date Details:**
- [ ] Date location shows on map
- [ ] Address is accurate
- [ ] Directions link works

---

## Step 5: Monitor Usage & Costs

### 5.1 Enable Billing

1. Go to **Billing** in Google Cloud Console
2. Link a billing account (required for production)
3. Set up **Budget Alerts**:
   - Recommended: €50/month initial budget
   - Alerts at 50%, 90%, 100%

### 5.2 Understand Pricing

**Free tier (as of 2024):**
- $200 monthly credit
- ~28,000 map loads per month free

**Usage costs:**
- Maps JavaScript API: $7 per 1,000 loads
- Places API: $17 per 1,000 requests
- Geocoding API: $5 per 1,000 requests

**Estimated cost for TuCitaSegura:**
- 1,000 users/month
- Average 10 map loads per user
- Total: ~10,000 map loads = **$70/month** (covered by free tier)

### 5.3 Optimize Costs

**Enable caching:**
```javascript
// In buscar-usuarios.html, add to map options:
const mapOptions = {
  // ... existing options
  mapId: 'TUCITASEGURA_MAP_ID', // Use Map ID for better caching
};
```

**Implement lazy loading:**
Only load Google Maps script when needed:
```html
<!-- Instead of loading in <head>, load on demand -->
<script>
function loadGoogleMaps() {
  return new Promise((resolve) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=...';
    script.onload = resolve;
    document.head.appendChild(script);
  });
}
</script>
```

---

## Step 6: Deployment Checklist

Before deploying to production:

- [ ] Google Cloud project created
- [ ] Billing account linked
- [ ] Budget alerts configured
- [ ] All 4 APIs enabled (Maps, Places, Geocoding, Geolocation)
- [ ] API key created
- [ ] HTTP referrer restrictions configured
- [ ] API restrictions configured
- [ ] Both HTML files updated with real API key
- [ ] Local testing passed
- [ ] Map loads correctly
- [ ] No console errors
- [ ] User markers appear
- [ ] Distance calculation works
- [ ] Production domain added to restrictions
- [ ] Usage monitoring enabled

---

## Troubleshooting

### Error: "This page can't load Google Maps correctly"

**Cause:** Invalid API key or restrictions too strict

**Solution:**
1. Verify API key is correct
2. Check HTTP referrer restrictions include your domain
3. Ensure Maps JavaScript API is enabled

### Error: "RefererNotAllowedMapError"

**Cause:** Current domain not in HTTP referrer restrictions

**Solution:**
Add your domain to API key restrictions in Google Cloud Console

### Error: "ApiNotActivatedMapError"

**Cause:** Maps JavaScript API not enabled

**Solution:**
Enable "Maps JavaScript API" in Google Cloud Console > APIs & Services > Library

### Map shows but markers don't appear

**Cause:** Places API or Geocoding API not enabled

**Solution:**
Enable both APIs in Google Cloud Console

### High unexpected costs

**Cause:** API key leaked or unrestricted

**Solution:**
1. **IMMEDIATELY** delete compromised API key
2. Create new API key with proper restrictions
3. Update application with new key
4. Review usage logs in Google Cloud Console

---

## Security Best Practices

### ✅ DO:

- Use HTTP referrer restrictions
- Enable only required APIs
- Monitor usage regularly
- Set up budget alerts
- Use separate API keys for dev/staging/prod
- Rotate API keys periodically (every 6 months)

### ❌ DON'T:

- Commit API keys to Git (use environment variables)
- Share API keys publicly
- Use same API key across multiple projects
- Leave API key unrestricted
- Ignore unusual usage spikes

---

## Alternative Solutions

### Option 1: Mapbox (Alternative to Google Maps)

**Pros:**
- More generous free tier (50,000 loads/month)
- Better pricing for high usage
- Modern styling options

**Cons:**
- Different API (requires code changes)
- Less comprehensive Places API

### Option 2: OpenStreetMap + Leaflet (Free)

**Pros:**
- Completely free
- No API key required
- Open source

**Cons:**
- No built-in Places API
- Less detailed in some regions
- Manual geocoding required

---

## Resources

### Official Documentation
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [Maps Pricing](https://developers.google.com/maps/billing-and-pricing/pricing)

### TuCitaSegura Docs
- `GOOGLE_MAPS_FEATURES.md` - Feature documentation
- `CLAUDE.md` - General development guide

### Support
- [Stack Overflow - Google Maps](https://stackoverflow.com/questions/tagged/google-maps)
- [Google Maps Platform Support](https://developers.google.com/maps/support)

---

## Quick Reference

```bash
# Find all files using Google Maps API
grep -r "googleapis.com/maps" webapp/

# Replace API key in all files (macOS)
sed -i '' "s/YOUR_GOOGLE_MAPS_API_KEY/${MAPS_API_KEY}/g" webapp/*.html

# Replace API key in all files (Linux)
sed -i "s/YOUR_GOOGLE_MAPS_API_KEY/${MAPS_API_KEY}/g" webapp/*.html

# Test locally
python -m http.server 8000
# Open: http://localhost:8000/webapp/buscar-usuarios.html
```

---

**IMPORTANT:** This configuration is **REQUIRED** for production. The application's core feature (user search map) will not work without a valid Google Maps API key.

---

**Document Status:** ✅ Complete
**Next Steps:** Follow Step 1-6 to configure Google Maps API
**Questions?** Consult `GOOGLE_MAPS_FEATURES.md` for feature details
