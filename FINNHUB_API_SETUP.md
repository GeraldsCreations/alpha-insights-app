# 🔧 URGENT FIX: Finnhub API Key Setup

## Bug Report
**Issue:** Search only returns crypto, not stocks or commodities  
**Root Cause:** Missing Finnhub API key in environment configuration  
**Impact:** Stock ticker search is completely broken  

---

## The Problem

The ticker search service (`ticker-search.service.ts`) searches across THREE asset types:
- ✅ **Crypto** - Works (CoinGecko API, no key required)
- ❌ **Stocks** - Broken (Finnhub API, requires free API key)
- ✅ **Commodities** - Works (static list, no API needed)

When `finnhubApiKey` is empty, the service returns `[]` for stock searches, making it appear like only crypto exists.

**Code Location:**
```typescript
// src/app/core/services/ticker-search.service.ts:125
private searchStocks(query: string): Observable<SearchResult[]> {
  const apiKey = environment.externalApis.finnhubApiKey;
  
  // If no API key, return empty results
  if (!apiKey) {
    console.warn('Finnhub API key not configured');
    return of([]); // ❌ This is what's happening now
  }
  ...
}
```

---

## The Fix (5 Minutes)

### Step 1: Sign Up for Finnhub (FREE)

1. Go to: **https://finnhub.io/register**
2. Sign up with email (Google OAuth works too)
3. Verify your email
4. You'll be automatically logged in

### Step 2: Get Your API Key

1. After login, you'll see your dashboard
2. Your API key is displayed on the main dashboard page
3. Look for: **"API Key"** section
4. Copy the key (looks like: `cnxxxxxxxxxxxxxx`)

**OR navigate manually:**
- Click **"API Keys"** in the sidebar
- Copy your default API key

### Step 3: Add Key to Environment Files

**Development environment:**
```bash
# Edit: src/environments/environment.ts
finnhubApiKey: "YOUR_API_KEY_HERE"
```

**Production environment:**
```bash
# Edit: src/environments/environment.prod.ts
finnhubApiKey: "YOUR_API_KEY_HERE"
```

**Example:**
```typescript
externalApis: {
  coinGeckoBaseUrl: "https://api.coingecko.com/api/v3",
  finnhubApiKey: "cn5a2c1ad3ie80ceg0g0", // ✅ Like this
  finnhubBaseUrl: "https://finnhub.io/api/v1"
}
```

### Step 4: Test Locally

```bash
cd /root/.openclaw/workspace/alpha-insights-app

# Serve the app
ionic serve

# In the app:
# 1. Go to "Request Analysis" page
# 2. Search for "apple" or "tesla"
# 3. You should now see STOCK results! 🎉
```

**Expected results for "apple":**
- AAPL - Apple Inc. (Stock) ✅
- APT - Alpha Pro Tech Ltd. (Stock) ✅
- APLD - Applied Digital Corp. (Stock) ✅

### Step 5: Rebuild and Deploy

```bash
# Build production version
ionic build --prod

# Deploy to Firebase
export GOOGLE_APPLICATION_CREDENTIALS="./firebase-service-account.json"
firebase deploy --only hosting

# Deployment time: ~2-3 minutes
```

---

## Verification Checklist

After deploying, test these searches:

**Stocks:**
- [ ] "apple" → Returns AAPL, APT, APLD
- [ ] "tesla" → Returns TSLA
- [ ] "microsoft" → Returns MSFT
- [ ] "google" → Returns GOOGL, GOOG

**Crypto:**
- [ ] "bitcoin" → Returns BTC
- [ ] "ethereum" → Returns ETH
- [ ] "solana" → Returns SOL

**Commodities:**
- [ ] "gold" → Returns GOLD
- [ ] "oil" → Returns OIL, BRENT
- [ ] "silver" → Returns SILVER

---

## API Key Limits (Free Tier)

Finnhub free tier includes:
- ✅ **60 API calls/minute**
- ✅ **Symbol search** (what we use)
- ✅ **Company profile**
- ✅ **Stock quotes**
- ❌ No historical data (requires paid tier)

**Our usage:** Very light, well within limits due to:
- 300ms debouncing (reduces calls)
- 5-minute caching (avoids repeat searches)
- Minimum 2 characters to search

---

## Troubleshooting

### "Search still not working"
1. Check browser console for errors
2. Verify API key is correct (no extra spaces)
3. Rebuild the app: `ionic build --prod`
4. Clear browser cache
5. Check Finnhub dashboard for API call stats

### "Rate limit exceeded"
- Wait 1 minute
- Check if you're making too many searches too fast
- Increase debounce time in `ticker-search.service.ts`

### "Invalid API key"
- Double-check the key from Finnhub dashboard
- Make sure no quotes or spaces in the string
- Regenerate key if needed (Finnhub dashboard)

---

## Alternative Solution (If Finnhub Fails)

If Finnhub doesn't work, we can switch to an alternative API:

**Option A: Alpha Vantage**
- Free tier: 25 requests/day (very limited)
- Requires API key: https://www.alphavantage.co/support/#api-key

**Option B: Polygon.io**
- Free tier: 5 calls/minute
- Requires API key: https://polygon.io/

**Option C: Yahoo Finance (unofficial)**
- No API key required
- Unreliable, may break anytime
- Not recommended for production

---

## Next Steps After Fix

Once API key is added and deployed:

1. ✅ Test all three asset types (stock, crypto, commodity)
2. ✅ Verify search speed is acceptable
3. ✅ Monitor Finnhub API usage in their dashboard
4. ✅ Update this document if anything changes
5. ✅ Mark bug as RESOLVED

---

## Questions?

- **Finnhub docs:** https://finnhub.io/docs/api
- **Ticker search code:** `src/app/core/services/ticker-search.service.ts`
- **Environment config:** `src/environments/environment.ts`

**Estimated fix time:** 5 minutes  
**Deployment time:** 3 minutes  
**Total time to resolution:** 8 minutes ⚡
