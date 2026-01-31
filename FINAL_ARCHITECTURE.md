# 🏗️ Alpha Insights - Final Architecture Document

**Version:** 1.0.0  
**Date:** January 31, 2026  
**Status:** Production-Ready Blueprint  
**Team:** Frontend Dev + Backend Dev + UI/UX Designer

---

## 📋 Executive Summary

Alpha Insights is a mobile-first AI-powered trading analysis platform that delivers daily stock/crypto analysis reports with multi-timeframe verdicts and actionable trading insights.

**Core Value Proposition:**
- Professional AI-generated analysis reports published daily
- Multi-timeframe trading verdicts (7 timeframes: 5m → 1D)
- Price alerts and watchlist management
- Clean, scannable UI optimized for mobile
- Offline-first with real-time sync

---

## 🎯 Product Vision

### User Flows

#### 1. New User Onboarding
```
Open App → 3-Screen Intro → Register → Select Interests → Home Feed
```

#### 2. Daily Usage
```
Open App → Pull-to-Refresh → Browse Reports → Read Analysis → Add to Watchlist → Set Alerts → Bookmark
```

#### 3. Power User
```
Search Ticker → View Historical Reports → Compare Timeframes → Track Watchlist → Manage Alerts
```

---

## 🏛️ System Architecture

### High-Level Stack

```
┌─────────────────────────────────────────────────────┐
│              MOBILE APP (Ionic/Angular)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   iOS App   │  │ Android App │  │   PWA Web   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│                  FIREBASE BACKEND                    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ Firestore DB │  │ Cloud Funcs  │  │    Auth   │ │
│  │ - Posts      │  │ - Scheduler  │  │ - Email   │ │
│  │ - Users      │  │ - Alerts     │  │ - Google  │ │
│  │ - Bookmarks  │  │ - Analytics  │  │           │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│             RESEARCH PIPELINE (Node.js)              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Data Fetch  │→ │  AI Analysis │→ │  Publish  │ │
│  │ (Price/News) │  │  (OpenAI)    │  │ (Script)  │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 🗄️ Firestore Schema

### Collections

#### `AnalysisPosts/`
**Purpose:** Main feed content - daily analysis reports

```typescript
{
  id: string;                        // "AAPL-1738350000000"
  title: string;                     // "AAPL Analysis - January 31, 2026"
  ticker: string;                    // "AAPL"
  assetType: 'stock' | 'crypto';     // Asset classification
  
  // Trading Data
  recommendation: 'LONG' | 'SHORT' | 'NO_TRADE';
  confidenceLevel: number;           // 1-10 scale
  entry: number;                     // Entry price
  stop: number;                      // Stop loss
  target: number;                    // Target price
  riskRewardRatio: number;           // Calculated (target-entry)/(entry-stop)
  
  // Content (Markdown)
  content: {
    technicalAnalysis: string;       // Full technical analysis
    newsSummary: string;             // News sentiment analysis
    detailedAnalysis: string;        // Comprehensive report
    priceAnalysis?: string;          // Price action details
    worldEvents?: string;            // Macro context
    verdicts?: string;               // Multi-timeframe verdicts
    charts?: string[];               // Chart image URLs (future)
  };
  
  // Metadata
  heroImage?: string;                // Thumbnail image URL
  timestamp: Timestamp;              // Analysis date
  createdAt: Timestamp;
  updatedAt: Timestamp;
  authorId: string;                  // "alpha-insights-research-team"
  
  // Engagement
  views: number;                     // View count
  bookmarks: number;                 // Bookmark count
  searchTerms: string[];             // For search functionality
}
```

**Indexes:**
- `ticker` (ascending)
- `timestamp` (descending)
- `assetType` + `timestamp` (composite)
- `authorId` + `timestamp` (composite)

---

#### `Users/`
**Purpose:** User profiles and preferences

```typescript
{
  id: string;                        // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL?: string;
  
  // Preferences
  theme: 'light' | 'dark' | 'auto';
  notificationPreferences: {
    watchlistUpdates: boolean;
    highConfidence: boolean;
    priceAlerts: boolean;
  };
  defaultAssetFilter?: 'crypto' | 'stock' | 'all';
  
  // User Data
  watchlist: string[];               // Array of ticker symbols
  fcmToken?: string;                 // For push notifications
  
  // Metadata
  createdAt: Timestamp;
  lastLogin: Timestamp;
  onboardingCompleted: boolean;
}
```

**Indexes:**
- `email` (ascending)

---

#### `Bookmarks/`
**Purpose:** User saved posts (many-to-many relationship)

```typescript
{
  id: string;                        // "{userId}_{postId}"
  userId: string;
  postId: string;
  createdAt: Timestamp;
}
```

**Indexes:**
- `userId` + `createdAt` (composite, descending)
- `postId` (ascending)

---

#### `PriceAlerts/`
**Purpose:** User-created price alerts

```typescript
{
  id: string;                        // Auto-generated
  userId: string;
  ticker: string;
  alertType: 'ENTRY' | 'STOP' | 'TARGET';
  targetPrice: number;
  currentPrice: number;              // Snapshot at creation
  postId?: string;                   // Reference to analysis post
  
  triggered: boolean;
  triggeredAt?: Timestamp;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- `userId` + `triggered` + `createdAt` (composite)
- `ticker` + `triggered` (composite)

---

#### `Analytics/` (Future)
**Purpose:** User behavior tracking

```typescript
{
  id: string;
  userId: string;
  eventType: 'view' | 'bookmark' | 'share' | 'alert_create';
  postId?: string;
  ticker?: string;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}
```

---

## ☁️ Cloud Functions

### Scheduled Functions

#### `publishDailyReports`
**Trigger:** Cloud Scheduler (Daily at 6:00 AM EST)  
**Purpose:** Run research pipeline and publish new analyses

```typescript
export const publishDailyReports = functions.pubsub
  .schedule('0 6 * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    const tickers = ['AAPL', 'TSLA', 'NVDA', 'BTC', 'ETH'];
    
    for (const ticker of tickers) {
      // Run research pipeline
      await runResearchPipeline(ticker);
      
      // Publish to Firestore
      await publishAnalysis(ticker);
      
      // Trigger notifications
      await notifyWatchlistUsers(ticker);
    }
  });
```

---

#### `checkPriceAlerts`
**Trigger:** Cloud Scheduler (Every 5 minutes)  
**Purpose:** Monitor price alerts and send notifications

```typescript
export const checkPriceAlerts = functions.pubsub
  .schedule('*/5 * * * *')
  .onRun(async (context) => {
    const alerts = await getActiveAlerts();
    const prices = await getCurrentPrices(alerts.map(a => a.ticker));
    
    for (const alert of alerts) {
      const currentPrice = prices[alert.ticker];
      
      if (shouldTriggerAlert(alert, currentPrice)) {
        await sendPushNotification(alert.userId, {
          title: `${alert.ticker} Alert Triggered!`,
          body: `${alert.alertType}: $${currentPrice} reached`,
        });
        
        await markAlertAsTriggered(alert.id);
      }
    }
  });
```

---

### Triggered Functions

#### `onAnalysisPublished`
**Trigger:** Firestore onCreate `AnalysisPosts/{postId}`  
**Purpose:** Send notifications to watchlist users

```typescript
export const onAnalysisPublished = functions.firestore
  .document('AnalysisPosts/{postId}')
  .onCreate(async (snap, context) => {
    const post = snap.data() as AnalysisPost;
    
    // Find users watching this ticker
    const users = await getUsersWatchingTicker(post.ticker);
    
    // Send push notifications
    await sendBatchNotifications(users, {
      title: `New ${post.ticker} Analysis`,
      body: `${post.recommendation} - ${post.confidenceLevel}/10 confidence`,
      data: { postId: post.id },
    });
    
    // Update analytics
    await trackEvent('analysis_published', { ticker: post.ticker });
  });
```

---

#### `onBookmarkCreated`
**Trigger:** Firestore onCreate `Bookmarks/{bookmarkId}`  
**Purpose:** Update bookmark count on posts

```typescript
export const onBookmarkCreated = functions.firestore
  .document('Bookmarks/{bookmarkId}')
  .onCreate(async (snap, context) => {
    const bookmark = snap.data();
    
    await admin.firestore()
      .doc(`AnalysisPosts/${bookmark.postId}`)
      .update({
        bookmarks: admin.firestore.FieldValue.increment(1)
      });
  });
```

---

#### `onUserCreated`
**Trigger:** Firebase Auth onCreate  
**Purpose:** Create Firestore user document

```typescript
export const onUserCreated = functions.auth.user()
  .onCreate(async (user) => {
    await admin.firestore()
      .doc(`Users/${user.uid}`)
      .set({
        id: user.uid,
        email: user.email,
        displayName: user.displayName || 'Trader',
        photoURL: user.photoURL || null,
        theme: 'auto',
        watchlist: [],
        notificationPreferences: {
          watchlistUpdates: true,
          highConfidence: true,
          priceAlerts: true,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        onboardingCompleted: false,
      });
  });
```

---

## 🔒 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // AnalysisPosts - Public read, admin write
    match /AnalysisPosts/{postId} {
      allow read: if true;  // Public posts
      allow write: if request.auth.token.admin == true;  // Admin only
    }
    
    // Users - Owner read/write
    match /Users/{userId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId);
    }
    
    // Bookmarks - Owner read/write
    match /Bookmarks/{bookmarkId} {
      allow read: if isAuthenticated() && 
                     resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && 
                       request.resource.data.userId == request.auth.uid;
      allow delete: if isOwner(resource.data.userId);
    }
    
    // PriceAlerts - Owner read/write
    match /PriceAlerts/{alertId} {
      allow read: if isAuthenticated() && 
                     resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && 
                       request.resource.data.userId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.userId);
    }
    
    // Analytics - Write only (for tracking)
    match /Analytics/{eventId} {
      allow read: if request.auth.token.admin == true;
      allow create: if isAuthenticated();
    }
  }
}
```

---

## 📱 Frontend Features

### Implemented (Days 1-3) ✅

- [x] Authentication (Login/Register/Password Reset)
- [x] Bookmarking system
- [x] Share functionality
- [x] Price alerts management
- [x] Watchlist tracking
- [x] Settings page (theme, notifications)
- [x] Profile editing
- [x] Reusable action buttons
- [x] Dark mode support
- [x] Offline mode

### To Implement (Final Build) 🚧

#### Home Feed
- [ ] Display latest AnalysisPosts from Firestore
- [ ] Infinite scroll / pagination
- [ ] Filter by asset type (stock/crypto)
- [ ] Sort by date/confidence/ticker
- [ ] Pull-to-refresh for new posts
- [ ] Report card layout with key metrics
- [ ] Empty state when no posts

#### Report Detail Page
- [ ] Full analysis content display
- [ ] Tabbed sections (Technical/News/Overview)
- [ ] Verdict visualization (7 timeframes)
- [ ] Chart images (when available)
- [ ] Trade setup card (entry/stop/target)
- [ ] Risk/reward visualization
- [ ] Quick actions (bookmark/share/watchlist/alerts)
- [ ] Related reports (same ticker)

#### Search & Filter
- [ ] Search bar with ticker autocomplete
- [ ] Filter by asset type
- [ ] Filter by recommendation (LONG/SHORT)
- [ ] Filter by confidence level (High/Med/Low)
- [ ] Date range picker
- [ ] Save search preferences

#### Ticker Detail Page
- [ ] Historical reports for specific ticker
- [ ] Performance timeline
- [ ] Price chart integration (TradingView widget)
- [ ] Current watchlist status
- [ ] Active alerts for ticker
- [ ] All-time recommendation accuracy

#### Onboarding Flow
- [ ] Welcome screen (brand intro)
- [ ] Features showcase (3 screens)
- [ ] Interest selection (tickers to watch)
- [ ] Push notification permission request
- [ ] Skip option
- [ ] Only show on first launch

#### Empty States
- [ ] No posts yet (new user)
- [ ] No bookmarks yet
- [ ] No watchlist items
- [ ] No active alerts
- [ ] Search results empty
- [ ] Network error state
- [ ] All with actionable CTAs

---

## 🎨 UI/UX Design System

### Color Palette

#### Primary Colors
```scss
--primary: #6200EE;           // Deep Purple (brand)
--primary-light: #7F39FB;
--primary-dark: #3700B3;

--secondary: #03DAC6;         // Teal (accents)
--secondary-light: #66FFF9;
--secondary-dark: #00A896;
```

#### Semantic Colors
```scss
--success: #00C853;           // Green (LONG/positive)
--warning: #FF9800;           // Orange (caution)
--danger: #F44336;            // Red (SHORT/negative)
--info: #2196F3;              // Blue (neutral info)
```

#### Confidence Levels
```scss
--confidence-high: #00C853;   // 8-10
--confidence-medium: #FF9800; // 5-7
--confidence-low: #F44336;    // 1-4
```

#### Recommendation Colors
```scss
--long: #00C853;              // Bullish
--short: #F44336;             // Bearish
--no-trade: #9E9E9E;          // Neutral
```

### Typography

```scss
// Headers
--h1: 32px / 700;             // Page titles
--h2: 24px / 600;             // Section headers
--h3: 20px / 600;             // Card titles
--h4: 18px / 500;             // Subsections

// Body
--body-large: 16px / 400;     // Main content
--body: 14px / 400;           // Secondary text
--caption: 12px / 400;        // Labels, timestamps

// Monospace
--mono: 'Roboto Mono', monospace;  // Prices, tickers
```

### Spacing Scale

```scss
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-xxl: 48px;
```

### Component Designs

#### Report Card (Feed View)
```
┌─────────────────────────────────────┐
│ AAPL                       🔖 📤 ⭐ │
│ Apple Inc.                           │
│                                      │
│ LONG ↗  •  8/10 ⚡ •  R:R 1:3.89    │
│                                      │
│ Entry: $259 | Stop: $250 | Tgt: $305│
│                                      │
│ Technical breakout above resistance  │
│ with strong volume confirmation...   │
│                                      │
│ 📊 7 Timeframe Analysis  👁 1.2k     │
│ Jan 31, 2026 • 2 hours ago          │
└─────────────────────────────────────┘
```

#### Verdict Visualization (7 Timeframes)
```
5-Min   ▓▓▓▓▓▓▓▓░░  BUY (80%)
15-Min  ▓▓▓▓▓▓▓░░░  BUY (70%)
1-Hour  ▓▓▓▓▓▓░░░░  BUY (60%)
4-Hour  ▓▓▓▓▓░░░░░  HOLD (50%)
Daily   ▓▓▓▓▓▓░░░░  BUY (60%)
Weekly  ▓▓▓▓▓▓▓▓░░  BUY (80%)
1-Day   ▓▓▓▓▓▓▓▓▓░  BUY (90%)
```

#### Trade Setup Card
```
┌─────────────────────────────────────┐
│ 📈 TRADE SETUP                       │
├─────────────────────────────────────┤
│ Entry      $259.48  ← Current       │
│ Stop       $250.00  ↓ -3.7%         │
│ Target     $305.00  ↑ +17.5%        │
│                                      │
│ Risk/Reward: 1:3.89  ⚡ Excellent    │
│ Position Size: Calculate →           │
└─────────────────────────────────────┘
```

---

## 🔄 Integration Flow

### Full Lifecycle: Research → Publish → Display

```
1. RESEARCH PIPELINE (Node.js)
   ├─ Fetch price data (TradingView/Yahoo Finance)
   ├─ Fetch news headlines (NewsAPI)
   ├─ Fetch world events (NewsAPI)
   ├─ Run AI analysis (OpenAI GPT-4)
   ├─ Generate 6 markdown files
   └─ Output to research-output/

2. PUBLISH SCRIPT (ts-node)
   ├─ Read 6 markdown files
   ├─ Parse verdicts and recommendations
   ├─ Extract price targets
   ├─ Calculate risk/reward
   ├─ Generate AnalysisPost object
   └─ Write to Firestore AnalysisPosts/

3. CLOUD FUNCTION (onAnalysisPublished)
   ├─ Detect new document in AnalysisPosts/
   ├─ Find users watching ticker
   ├─ Send push notifications
   └─ Track analytics event

4. MOBILE APP (Ionic/Angular)
   ├─ Real-time Firestore listener
   ├─ Update Home feed UI
   ├─ Show notification badge
   ├─ Update ticker detail page
   └─ Trigger pull-to-refresh callback
```

---

## ⚡ Performance Optimization

### Frontend

#### Lazy Loading
```typescript
// All feature modules lazy-loaded
{
  path: 'home',
  loadChildren: () => import('./features/home/home.module')
    .then(m => m.HomePageModule)
}
```

#### Virtual Scrolling
```html
<!-- For long lists (100+ items) -->
<cdk-virtual-scroll-viewport itemSize="120">
  <app-report-card 
    *cdkVirtualFor="let post of posts$ | async"
    [post]="post">
  </app-report-card>
</cdk-virtual-scroll-viewport>
```

#### Image Optimization
```html
<!-- Lazy load images with placeholder -->
<ion-img 
  [src]="post.heroImage" 
  [alt]="post.title"
  loading="lazy">
</ion-img>
```

#### Query Optimization
```typescript
// Paginated queries (20 posts per page)
const first = query(
  collection(db, 'AnalysisPosts'),
  orderBy('timestamp', 'desc'),
  limit(20)
);

// Cache query results
const posts$ = collectionData(first, { idField: 'id' }).pipe(
  shareReplay(1) // Share result across subscribers
);
```

### Backend

#### Firestore Indexing
- Composite indexes for filtered queries
- TTL policies for old analytics data
- Denormalization for read-heavy data

#### Cloud Function Optimization
- Use batched writes (500 docs max)
- Minimize cold starts with `min-instances`
- Use Pub/Sub for async tasks

---

## 📊 Analytics & Tracking

### Events to Track

#### User Actions
```typescript
trackEvent('post_viewed', { postId, ticker, source });
trackEvent('post_bookmarked', { postId, ticker });
trackEvent('post_shared', { postId, ticker, method });
trackEvent('alert_created', { ticker, alertType, targetPrice });
trackEvent('watchlist_added', { ticker });
```

#### Performance
```typescript
trackTiming('page_load', duration, { page });
trackTiming('api_response', duration, { endpoint });
```

#### Business Metrics
```typescript
trackMetric('daily_active_users', userCount);
trackMetric('posts_published', count);
trackMetric('alerts_triggered', count);
```

---

## 🧪 Testing Strategy

### Unit Tests
- All services (Firebase mocked)
- Pure functions (calculations, parsers)
- Pipes and directives

### Integration Tests
- Firestore queries with emulator
- Cloud Functions with emulator
- Auth flows

### E2E Tests
- Critical user paths (register → view post → bookmark)
- Search and filtering
- Settings persistence

### Manual Testing
- iOS device testing
- Android device testing
- PWA on various browsers
- Offline mode testing
- Push notification testing

---

## 🚀 Deployment

### Web (Firebase Hosting)
```bash
npm run build
firebase deploy --only hosting
```

### iOS (App Store)
```bash
ionic capacitor build ios --prod
# Open Xcode, archive, upload to App Store Connect
```

### Android (Play Store)
```bash
ionic capacitor build android --prod
# Open Android Studio, generate signed APK/AAB
```

### Cloud Functions
```bash
cd functions
npm run build
firebase deploy --only functions
```

---

## 📚 Documentation

### User Guides
- [ ] Getting Started
- [ ] Understanding Verdicts
- [ ] Setting Price Alerts
- [ ] Reading Analysis Reports
- [ ] Managing Your Watchlist

### Developer Docs
- [ ] Architecture Overview (this file)
- [ ] API Reference (Firestore schema)
- [ ] Cloud Functions Reference
- [ ] Contributing Guidelines
- [ ] Deployment Guide

### Operational
- [ ] Monitoring Dashboard Setup
- [ ] Error Tracking (Sentry/Firebase Crashlytics)
- [ ] Analytics Dashboards
- [ ] Runbook (incident response)

---

## 🛣️ Roadmap

### Phase 1: MVP (Current)
- ✅ Authentication
- ✅ Bookmarks, Alerts, Watchlist
- ✅ Settings & Profile
- 🚧 Report Feed & Detail
- 🚧 Search & Filter
- 🚧 Onboarding

### Phase 2: Enhancement
- [ ] Live price data integration
- [ ] Chart generation (TradingView)
- [ ] Push notifications
- [ ] Comments/discussions
- [ ] User profiles (follow traders)

### Phase 3: Advanced Features
- [ ] Trade tracking & P&L
- [ ] Portfolio management
- [ ] Social trading (copy trades)
- [ ] Premium subscriptions
- [ ] API access for developers

---

## 👥 Team Responsibilities

### Backend Dev
- ✅ Firestore schema design
- 🚧 Cloud Functions implementation
- 🚧 Security rules configuration
- 🚧 Research pipeline integration
- 🚧 Admin dashboard

### Frontend Dev
- ✅ Core app structure
- ✅ Authentication flows
- ✅ User features (bookmarks, alerts, watchlist)
- 🚧 Report feed & detail pages
- 🚧 Search & filtering
- 🚧 Onboarding flow
- 🚧 Performance optimization

### UI/UX Designer
- 🚧 Report card design
- 🚧 Detail page layout
- 🚧 Verdict visualization
- 🚧 Onboarding screens
- 🚧 Empty states
- 🚧 Color scheme finalization
- 🚧 Icon set creation

---

## 🎯 Success Metrics

### Technical
- Page load time < 2s
- Time to interactive < 3s
- Lighthouse score > 90
- Crash rate < 0.1%

### Business
- Daily active users (DAU)
- Posts viewed per session
- Bookmark rate
- Alert creation rate
- User retention (D7, D30)

### User Satisfaction
- App Store rating > 4.5
- NPS score > 50
- Support ticket volume

---

**End of Architecture Document**

This document serves as the single source of truth for the Alpha Insights platform. All implementation should reference and update this document as needed.

**Last Updated:** January 31, 2026  
**Maintained By:** Core Team (Frontend + Backend + UX)  
**Next Review:** February 15, 2026
