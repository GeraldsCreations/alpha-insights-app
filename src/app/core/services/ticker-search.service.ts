import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Search result interface - unified format for stocks and crypto
 */
export interface SearchResult {
  symbol: string;        // AAPL, BTC, GOLD
  name: string;          // Apple Inc., Bitcoin, Gold
  type: 'stock' | 'crypto' | 'commodity';
  logo?: string;         // URL
  price?: number;        // Optional current price
  marketCap?: number;    // Optional
}

/**
 * CoinGecko API response interfaces
 */
interface CoinGeckoSearchResponse {
  coins: Array<{
    id: string;
    symbol: string;
    name: string;
    thumb: string;
    market_cap_rank: number;
  }>;
}

/**
 * Finnhub API response interface
 */
interface FinnhubSearchResponse {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

/**
 * Cache entry interface
 */
interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class TickerSearchService {
  
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  
  constructor(private http: HttpClient) {}
  
  /**
   * Search tickers across both stock and crypto APIs
   * Debounced and cached for performance
   */
  searchTickers(query: string): Observable<SearchResult[]> {
    // Normalize query
    const normalizedQuery = query.trim().toLowerCase();
    
    // Minimum 2 characters
    if (normalizedQuery.length < 2) {
      return of([]);
    }
    
    // Check cache first
    const cached = this.getFromCache(normalizedQuery);
    if (cached) {
      return of(cached);
    }
    
    // Search across all asset types in parallel
    return forkJoin({
      stocks: this.searchStocks(normalizedQuery),
      crypto: this.searchCrypto(normalizedQuery),
      commodities: this.searchCommodities(normalizedQuery)
    }).pipe(
      map(({ stocks, crypto, commodities }) => {
        // Combine results: commodities, crypto, then stocks
        const combined = [...commodities, ...crypto, ...stocks];
        
        // Cache results
        this.saveToCache(normalizedQuery, combined);
        
        return combined;
      }),
      catchError(error => {
        console.error('Search error:', error);
        // Return cached results if available, even if expired
        const expired = this.cache.get(normalizedQuery);
        return of(expired ? expired.results : []);
      })
    );
  }
  
  /**
   * Search stocks using Finnhub API
   */
  private searchStocks(query: string): Observable<SearchResult[]> {
    const apiKey = environment.externalApis.finnhubApiKey;
    
    // If no API key, return empty results
    if (!apiKey) {
      console.warn('Finnhub API key not configured');
      return of([]);
    }
    
    const url = `${environment.externalApis.finnhubBaseUrl}/search?q=${encodeURIComponent(query)}&token=${apiKey}`;
    
    return this.http.get<FinnhubSearchResponse>(url).pipe(
      map(response => {
        if (!response.result || response.result.length === 0) {
          return [];
        }
        
        // Convert to SearchResult format
        return response.result
          .filter(item => item.type === 'Common Stock' || item.type === 'ETP') // Filter to stocks only
          .slice(0, 10) // Limit to 10 results
          .map(item => ({
            symbol: item.symbol,
            name: item.description,
            type: 'stock' as const,
            logo: undefined, // Finnhub free tier doesn't include logos
            price: undefined,
            marketCap: undefined
          }));
      }),
      catchError(error => {
        console.error('Finnhub API error:', error);
        return of([]);
      })
    );
  }
  
  /**
   * Search crypto using CoinGecko API
   */
  private searchCrypto(query: string): Observable<SearchResult[]> {
    const url = `${environment.externalApis.coinGeckoBaseUrl}/search?query=${encodeURIComponent(query)}`;
    
    return this.http.get<CoinGeckoSearchResponse>(url).pipe(
      map(response => {
        if (!response.coins || response.coins.length === 0) {
          return [];
        }
        
        // Convert to SearchResult format
        return response.coins
          .slice(0, 10) // Limit to 10 results
          .map(coin => ({
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            type: 'crypto' as const,
            logo: coin.thumb,
            price: undefined,
            marketCap: coin.market_cap_rank
          }));
      }),
      catchError(error => {
        console.error('CoinGecko API error:', error);
        return of([]);
      })
    );
  }
  
  /**
   * Search commodities using a predefined list
   * (Could be enhanced with an API in the future)
   */
  private searchCommodities(query: string): Observable<SearchResult[]> {
    const commodities: SearchResult[] = [
      { symbol: 'GOLD', name: 'Gold', type: 'commodity' },
      { symbol: 'SILVER', name: 'Silver', type: 'commodity' },
      { symbol: 'OIL', name: 'Crude Oil', type: 'commodity' },
      { symbol: 'BRENT', name: 'Brent Crude Oil', type: 'commodity' },
      { symbol: 'NATGAS', name: 'Natural Gas', type: 'commodity' },
      { symbol: 'COPPER', name: 'Copper', type: 'commodity' },
      { symbol: 'PLATINUM', name: 'Platinum', type: 'commodity' },
      { symbol: 'PALLADIUM', name: 'Palladium', type: 'commodity' },
      { symbol: 'WHEAT', name: 'Wheat', type: 'commodity' },
      { symbol: 'CORN', name: 'Corn', type: 'commodity' },
      { symbol: 'SOYBEANS', name: 'Soybeans', type: 'commodity' },
      { symbol: 'COFFEE', name: 'Coffee', type: 'commodity' },
      { symbol: 'SUGAR', name: 'Sugar', type: 'commodity' },
      { symbol: 'COTTON', name: 'Cotton', type: 'commodity' }
    ];
    
    // Filter commodities by query match (symbol or name)
    const results = commodities.filter(c => 
      c.symbol.toLowerCase().includes(query) || 
      c.name.toLowerCase().includes(query)
    );
    
    return of(results);
  }

  /**
   * Get popular/trending tickers for pre-population
   */
  getPopularTickers(): SearchResult[] {
    return [
      // Popular stocks
      { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
      { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock' },
      
      // Popular crypto
      { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
      { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
      { symbol: 'SOL', name: 'Solana', type: 'crypto' },
      { symbol: 'BNB', name: 'Binance Coin', type: 'crypto' },
      
      // Popular commodities
      { symbol: 'GOLD', name: 'Gold', type: 'commodity' },
      { symbol: 'OIL', name: 'Crude Oil', type: 'commodity' },
      { symbol: 'SILVER', name: 'Silver', type: 'commodity' }
    ];
  }
  
  /**
   * Get result from cache if valid
   */
  private getFromCache(query: string): SearchResult[] | null {
    const cached = this.cache.get(query);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache is still valid
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL_MS) {
      this.cache.delete(query);
      return null;
    }
    
    return cached.results;
  }
  
  /**
   * Save results to cache
   */
  private saveToCache(query: string, results: SearchResult[]): void {
    this.cache.set(query, {
      results,
      timestamp: Date.now()
    });
    
    // Limit cache size (keep last 50 searches)
    if (this.cache.size > 50) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }
  
  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
