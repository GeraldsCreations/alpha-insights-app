// environment.ts - Development Configuration

export const environment = {
  production: false,
  
  // Firebase Configuration
  // TODO: Replace with your Firebase project credentials
  // Get these from Firebase Console → Project Settings → General
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
  },
  
  // External API Keys
  externalApis: {
    priceDataApiKey: "",
    priceDataBaseUrl: "https://api.example.com/v1"
  },
  
  // Feature Flags
  features: {
    enablePushNotifications: true,
    enablePriceAlerts: true,
    enablePerformanceTracking: true,
    enableDarkMode: true,
    enableOfflineMode: true
  },
  
  // App Configuration
  app: {
    name: "Alpha Insights",
    version: "1.0.0",
    defaultPageSize: 20,
    cacheExpirationMinutes: 30,
    maxImageSizeMB: 5,
    supportEmail: "support@alphainsights.com"
  },
  
  // Analytics
  analytics: {
    enabled: true,
    debug: true
  }
};
