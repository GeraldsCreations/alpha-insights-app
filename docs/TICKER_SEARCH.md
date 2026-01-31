# Ticker Search Feature

Real-time ticker search with autocomplete for stocks and cryptocurrencies.

## Overview

The ticker search feature allows users to search for stock and crypto tickers in real-time using external APIs. Results are displayed in an autocomplete dropdown with logos, names, and type badges.

## APIs Used

### 1. CoinGecko API (Cryptocurrency)

**Endpoint:** `https://api.coingecko.com/api/v3/search?query={term}`

**Features:**
- **Free tier:** 50 calls/minute
- **No API key required**
- **Returns:** id, symbol, name, thumb (logo), market_cap_rank

**Response Example:**
```json
{
  "coins": [
    {
      "id": "bitcoin",
      "symbol": "btc",
      "name": "Bitcoin",
      "thumb": "https://...",
      "market_cap_rank": 1
    }
  ]
}
```

**Rate Limits:**
- 50 calls/minute (free tier)
- Consider implementing rate limiting if needed

### 2. Finnhub API (Stocks)

**Endpoint:** `https://finnhub.io/api/v1/search?q={term}&token={API_KEY}`

**Features:**
- **Free tier:** 60 calls/minute
- **Requires API key** (free signup at [finnhub.io](https://finnhub.io))
- **Returns:** symbol, description, type

**Response Example:**
```json
{
  "count": 2,
  "result": [
    {
      "description": "Apple Inc.",
      "displaySymbol": "AAPL",
      "symbol": "AAPL",
      "type": "Common Stock"
    }
  ]
}
```

**Rate Limits:**
- 60 calls/minute (free tier)
- 30 API calls/second

**How to get API key:**
1. Go to [finnhub.io](https://finnhub.io)
2. Sign up for free account
3. Navigate to Dashboard → API Keys
4. Copy your API key
5. Add to `environment.ts`: `finnhubApiKey: 'YOUR_KEY_HERE'`

## Implementation

### Service: `TickerSearchService`

**Location:** `src/app/core/services/ticker-search.service.ts`

**Key Methods:**
- `searchTickers(query: string): Observable<SearchResult[]>` - Main search method that combines both APIs
- `getPopularTickers(): SearchResult[]` - Returns pre-defined popular tickers
- `clearCache(): void` - Clears the search cache

**Features:**
- **Debouncing:** 300ms delay to reduce API calls
- **Caching:** 5-minute TTL in-memory cache
- **Error handling:** Falls back to cached results on network errors
- **Parallel requests:** Searches both APIs simultaneously using `forkJoin`

### UI Component

**Location:** `src/app/features/request-analysis/`

**Key Features:**
- Autocomplete dropdown with search results
- Loading spinner during search
- Empty state for no results
- Logo display (when available)
- Type badges (Stock/Crypto)
- Auto-fill on selection

## Caching Strategy

### In-Memory Cache

**TTL:** 5 minutes
**Max entries:** 50 (FIFO)

**Why caching?**
- Reduce API calls for popular searches
- Improve performance
- Avoid rate limits
- Better offline experience

**Cache invalidation:**
- Automatic after 5 minutes
- Manual via `clearCache()` method
- On app restart (in-memory only)

## Error Handling

### API Rate Limits

**Behavior:**
- Returns cached results if available
- Shows friendly message to user
- Logs error to console

**Prevention:**
- Debouncing (300ms)
- Caching (5 min)
- Minimum 2 characters to search

### Network Errors

**Behavior:**
- Returns expired cached results if available
- Shows empty state if no cache
- Allows manual ticker entry as fallback

**User Message:**
"Unable to fetch search results. Please check your connection."

### Invalid Ticker

**Behavior:**
- Validation happens before submission
- Shows error message from `CustomRequestService.validateTicker()`

## Configuration

### Environment Variables

Add to `src/environments/environment.ts`:

```typescript
externalApis: {
  // Ticker Search APIs
  coinGeckoBaseUrl: 'https://api.coingecko.com/api/v3',
  finnhubApiKey: '', // Add your key here
  finnhubBaseUrl: 'https://finnhub.io/api/v1'
}
```

### Production Config

Add to `src/environments/environment.prod.ts`:

```typescript
externalApis: {
  coinGeckoBaseUrl: 'https://api.coingecko.com/api/v3',
  finnhubApiKey: 'YOUR_PRODUCTION_KEY', // Add production key
  finnhubBaseUrl: 'https://finnhub.io/api/v1'
}
```

## Testing

### Manual Testing Checklist

**Stock Search:**
- [ ] Search "app" → Shows AAPL, APP, etc.
- [ ] Search "tesla" → Shows TSLA
- [ ] Search "google" → Shows GOOGL, GOOG
- [ ] Search "micro" → Shows MSFT, etc.

**Crypto Search:**
- [ ] Search "bit" → Shows BTC, Bitcoin
- [ ] Search "eth" → Shows ETH, Ethereum
- [ ] Search "sol" → Shows SOL, Solana
- [ ] Search "bnb" → Shows BNB, Binance Coin

**UI/UX:**
- [ ] Minimum 2 characters required
- [ ] Loading spinner appears
- [ ] Results display with logos (crypto)
- [ ] Type badges show correctly
- [ ] Selecting result fills form
- [ ] Asset type auto-detected
- [ ] Submit button enables after selection

**Error Cases:**
- [ ] No results → Shows empty state
- [ ] Network error → Shows cached or error message
- [ ] Rate limit → Falls back gracefully

### Build Test

```bash
npm run build
```

**Expected:** Zero errors, zero warnings

## Troubleshooting

### No Search Results

**Possible causes:**
1. Finnhub API key missing/invalid
2. Network connectivity issues
3. API rate limits exceeded

**Solutions:**
1. Add valid API key to environment.ts
2. Check internet connection
3. Wait 1 minute and try again
4. Check browser console for errors

### Search Results Not Showing

**Check:**
1. Minimum 2 characters entered
2. `showSearchResults` flag is true
3. No JavaScript errors in console
4. CSS properly loaded

### Logos Not Displaying

**Note:** 
- CoinGecko provides logos for crypto
- Finnhub free tier does NOT include logos for stocks
- This is expected behavior

**Solution for stocks:**
- Upgrade to Finnhub paid tier, OR
- Integrate additional logo API (e.g., Clearbit, Logo.dev)

### Build Errors

**Common issues:**
1. Missing HttpClient import
2. Environment config mismatch
3. TypeScript strict mode errors

**Solutions:**
1. Ensure HttpClientModule is provided in app config
2. Match interface types exactly
3. Check null/undefined handling

## Future Enhancements

### Potential Improvements

1. **Price Data Integration**
   - Add real-time prices to search results
   - Show price change percentage
   - Display 24h volume for crypto

2. **Logo Service**
   - Integrate dedicated logo API
   - Cache logos locally
   - Fallback to generic icons

3. **Advanced Filtering**
   - Filter by market cap
   - Filter by exchange
   - Sort by relevance/popularity

4. **Offline Support**
   - IndexedDB caching
   - Service worker integration
   - Offline-first architecture

5. **Analytics**
   - Track popular searches
   - Measure search performance
   - A/B test different UX patterns

## Resources

- [CoinGecko API Documentation](https://www.coingecko.com/en/api/documentation)
- [Finnhub API Documentation](https://finnhub.io/docs/api)
- [Ionic Searchbar Component](https://ionicframework.com/docs/api/searchbar)
- [RxJS Debouncing Guide](https://rxjs.dev/api/operators/debounceTime)

## Support

For issues or questions:
- Check browser console for errors
- Review this documentation
- Contact development team
- Open GitHub issue (if applicable)
