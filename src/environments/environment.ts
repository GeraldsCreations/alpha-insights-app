// environment.ts - Development Configuration

export const environment = {
  production: false,

  // Firebase Configuration
  // TODO: Replace with your Firebase project credentials
  // Get these from Firebase Console → Project Settings → General
  firebase: {
    apiKey: 'AIzaSyBnVoxuXvF1qDac2J5_h6inG89Wvm3aCmQ',
    authDomain: 'alpha-insights-84c51.firebaseapp.com',
    projectId: 'alpha-insights-84c51',
    storageBucket: 'alpha-insights-84c51.firebasestorage.app',
    messagingSenderId: '1051741188643',
    appId: '1:1051741188643:web:99d0e8a04315c34e7db796',
    measurementId: 'G-3S36N19CKD',
  },

  // External API Keys
  externalApis: {
    priceDataApiKey: '',
    priceDataBaseUrl: 'https://api.example.com/v1',

    // Ticker Search APIs
    coinGeckoBaseUrl: 'https://api.coingecko.com/api/v3',
    // REQUIRED: Get free API key from https://finnhub.io/register
    // Without this key, stock search will NOT work (only crypto will show)
    finnhubApiKey: 'c4sh0taad3ieaa570u20', // ⚠️ ADD YOUR FINNHUB API KEY HERE
    finnhubBaseUrl: 'https://finnhub.io/api/v1',
  },

  // Feature Flags
  features: {
    enablePushNotifications: true,
    enablePriceAlerts: true,
    enablePerformanceTracking: true,
    enableDarkMode: true,
    enableOfflineMode: true,
  },

  // App Configuration
  app: {
    name: 'Alpha Insights',
    version: '1.0.0',
    defaultPageSize: 20,
    cacheExpirationMinutes: 30,
    maxImageSizeMB: 5,
    supportEmail: 'support@alphainsights.com',
  },

  // URLs
  productionUrl: 'http://localhost:8100', // Development URL

  // Analytics
  analytics: {
    enabled: true,
    debug: true,
  },
};
