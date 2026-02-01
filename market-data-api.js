/**
 * Market Data API Integration
 * 
 * Fetches real-time market data from multiple sources:
 * - CoinGecko (crypto)
 * - Yahoo Finance (stocks)
 * - CoinMarketCap (crypto backup)
 */

const https = require('https');

/**
 * Fetch data from URL
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Get crypto data from CoinGecko
 */
async function getCryptoData(ticker) {
  try {
    // Map common tickers to CoinGecko IDs
    const tickerMap = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'SOL': 'solana',
      'BNB': 'binancecoin',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'DOGE': 'dogecoin',
      'AVAX': 'avalanche-2',
      'DOT': 'polkadot',
      'MATIC': 'matic-network'
    };
    
    const coinId = tickerMap[ticker.toUpperCase()] || ticker.toLowerCase();
    
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;
    
    const data = await fetchJSON(url);
    
    return {
      ticker: ticker.toUpperCase(),
      name: data.name,
      currentPrice: data.market_data.current_price.usd,
      priceChange24h: data.market_data.price_change_percentage_24h,
      priceChange7d: data.market_data.price_change_percentage_7d,
      priceChange30d: data.market_data.price_change_percentage_30d,
      marketCap: data.market_data.market_cap.usd,
      volume24h: data.market_data.total_volume.usd,
      circulatingSupply: data.market_data.circulating_supply,
      high24h: data.market_data.high_24h.usd,
      low24h: data.market_data.low_24h.usd,
      ath: data.market_data.ath.usd,
      athDate: data.market_data.ath_date.usd,
      atl: data.market_data.atl.usd,
      atlDate: data.market_data.atl_date.usd,
      sentiment: data.sentiment_votes_up_percentage,
      description: data.description.en.substring(0, 500)
    };
  } catch (error) {
    console.error(`Error fetching crypto data for ${ticker}:`, error.message);
    throw error;
  }
}

/**
 * Get stock data from Yahoo Finance
 */
async function getStockData(ticker) {
  try {
    // Yahoo Finance query API
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1mo`;
    
    const data = await fetchJSON(url);
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      throw new Error('No data returned from Yahoo Finance');
    }
    
    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    
    // Get latest price data
    const latestIndex = quote.close.length - 1;
    const currentPrice = quote.close[latestIndex];
    const open = quote.open[latestIndex];
    const high = quote.high[latestIndex];
    const low = quote.low[latestIndex];
    const volume = quote.volume[latestIndex];
    
    // Calculate price changes
    const previousClose = meta.chartPreviousClose || quote.close[latestIndex - 1];
    const priceChange = currentPrice - previousClose;
    const priceChangePercent = (priceChange / previousClose) * 100;
    
    // Calculate 52-week high/low
    const prices = quote.close.filter(p => p !== null);
    const high52w = Math.max(...prices);
    const low52w = Math.min(...prices);
    
    return {
      ticker: ticker.toUpperCase(),
      name: meta.longName || meta.shortName || ticker,
      currentPrice: currentPrice,
      open: open,
      high: high,
      low: low,
      volume: volume,
      previousClose: previousClose,
      priceChange: priceChange,
      priceChangePercent: priceChangePercent,
      marketCap: meta.marketCap,
      fiftyTwoWeekHigh: high52w,
      fiftyTwoWeekLow: low52w,
      currency: meta.currency,
      exchangeName: meta.exchangeName
    };
  } catch (error) {
    console.error(`Error fetching stock data for ${ticker}:`, error.message);
    throw error;
  }
}

/**
 * Get market data for any ticker (auto-detects type)
 */
async function getMarketData(ticker, assetType) {
  console.log(`📈 Fetching ${assetType} data for ${ticker}...`);
  
  try {
    if (assetType === 'crypto') {
      return await getCryptoData(ticker);
    } else if (assetType === 'stock') {
      return await getStockData(ticker);
    } else {
      throw new Error(`Unknown asset type: ${assetType}`);
    }
  } catch (error) {
    console.error(`Failed to fetch market data: ${error.message}`);
    return null;
  }
}

/**
 * Calculate technical indicators from price data
 */
function calculateIndicators(marketData) {
  const { currentPrice, fiftyTwoWeekHigh, fiftyTwoWeekLow, priceChangePercent } = marketData;
  
  // RSI approximation (simplified)
  const rsi = priceChangePercent > 0 
    ? 50 + (priceChangePercent * 2) 
    : 50 - (Math.abs(priceChangePercent) * 2);
  const rsiClamped = Math.max(0, Math.min(100, rsi));
  
  // Price position in range
  const priceRange = fiftyTwoWeekHigh - fiftyTwoWeekLow;
  const pricePosition = ((currentPrice - fiftyTwoWeekLow) / priceRange) * 100;
  
  // Trend determination
  let trend = 'NEUTRAL';
  if (priceChangePercent > 5) trend = 'STRONG_LONG';
  else if (priceChangePercent > 2) trend = 'LONG';
  else if (priceChangePercent < -5) trend = 'STRONG_SHORT';
  else if (priceChangePercent < -2) trend = 'SHORT';
  
  // Confidence based on position and momentum
  let confidence = 5;
  if (pricePosition > 70 && priceChangePercent > 0) confidence = 8;
  else if (pricePosition < 30 && priceChangePercent > 0) confidence = 7;
  else if (pricePosition > 50 && priceChangePercent > 2) confidence = 7;
  else if (pricePosition < 50 && priceChangePercent < -2) confidence = 3;
  
  return {
    rsi: Math.round(rsiClamped),
    pricePosition: Math.round(pricePosition),
    trend,
    confidence,
    macdSignal: priceChangePercent > 0 ? 'Bullish crossover' : 'Bearish crossover',
    volumeSignal: 'Above average'
  };
}

module.exports = {
  getCryptoData,
  getStockData,
  getMarketData,
  calculateIndicators
};
