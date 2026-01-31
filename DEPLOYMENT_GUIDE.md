# 🚀 Alpha Insights - Deployment Guide

**Quick reference for deploying the Alpha Insights platform to production.**

---

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Ionic CLI installed: `npm install -g @ionic/cli`
- Firebase project created (console.firebase.google.com)
- Node.js 18+ installed

---

## 1. Initial Firebase Setup

### Login to Firebase
```bash
firebase login
```

### Initialize Firebase (if not already done)
```bash
firebase init

# Select:
# - Firestore
# - Functions
# - Hosting
# 
# Use existing project: alpha-insights (or your project name)
```

---

## 2. Configure Environment Variables

### Get Firebase Config
1. Go to Firebase Console → Project Settings → General
2. Scroll to "Your apps" → Web app
3. Copy the config object

### Update Environment Files

**File:** `src/environments/environment.ts`
```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID" // Optional
  }
};
```

**File:** `src/environments/environment.prod.ts`
```typescript
export const environment = {
  production: true,
  firebase: {
    // Same config as above
  }
};
```

---

## 3. Deploy Backend

### Deploy Firestore Security Rules
```bash
firebase deploy --only firestore:rules
```

**Expected output:**
```
✔  firestore: released rules firestore.rules to cloud.firestore
✔  Deploy complete!
```

### Install and Deploy Cloud Functions
```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

**Expected output:**
```
✔  functions[publishDailyReports]: Successful create operation.
✔  functions[checkPriceAlerts]: Successful create operation.
✔  functions[onAnalysisPublished]: Successful create operation.
✔  functions[onBookmarkCreated]: Successful create operation.
✔  functions[onBookmarkDeleted]: Successful create operation.
✔  functions[onUserCreated]: Successful create operation.
✔  functions[trackAnalytics]: Successful create operation.
✔  functions[getUserStats]: Successful create operation.
```

### Create Firestore Indexes

After first deployment, Firestore will prompt you to create composite indexes when you use the app. Click the links in the browser console or create manually:

**Console:** Firebase Console → Firestore → Indexes

**Required Indexes:**
1. **AnalysisPosts:**
   - `assetType` (Ascending) + `timestamp` (Descending)
   - `ticker` (Ascending) + `timestamp` (Descending)
   - `authorId` (Ascending) + `timestamp` (Descending)

2. **Bookmarks:**
   - `userId` (Ascending) + `createdAt` (Descending)

3. **PriceAlerts:**
   - `userId` (Ascending) + `triggered` (Ascending) + `createdAt` (Descending)
   - `ticker` (Ascending) + `triggered` (Ascending)

---

## 4. Enable Firebase Services

### Enable Authentication
1. Firebase Console → Authentication → Sign-in method
2. Enable "Email/Password"
3. (Optional) Enable "Google" for social login

### Enable Firestore Database
1. Firebase Console → Firestore Database
2. Create database in production mode
3. Select region (e.g., us-central1)

### Enable Cloud Messaging (Push Notifications)
1. Firebase Console → Cloud Messaging
2. Generate Server Key
3. Add to app config

---

## 5. Deploy Frontend (Web)

### Build Production App
```bash
npm run build --prod
```

**Output:** `www/` directory with production build

### Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

**Expected output:**
```
✔  hosting[alpha-insights]: file upload complete
✔  hosting[alpha-insights]: version finalized
✔  hosting[alpha-insights]: release complete

Hosting URL: https://alpha-insights.web.app
```

---

## 6. Test the Deployment

### Publish Sample Analysis
```bash
npm run publish:research AAPL
```

### Open the App
```bash
open https://alpha-insights.web.app
```

### Test Flow
1. ✅ Register new account
2. ✅ View home feed (should show AAPL analysis)
3. ✅ Tap AAPL card → View detail page
4. ✅ Bookmark the post
5. ✅ Add to watchlist
6. ✅ Create price alert
7. ✅ Navigate to Profile → Saved Posts (should show AAPL)

---

## 7. Mobile App Deployment

### iOS (requires macOS)

#### Setup
```bash
ionic capacitor add ios
ionic capacitor sync ios
```

#### Configure App
1. Open `ios/App/App.xcworkspace` in Xcode
2. Update Bundle ID, Team, App Name
3. Add app icons (Assets.xcassets)
4. Configure signing

#### Build
```bash
ionic capacitor build ios --prod
```

#### Submit to App Store
1. Archive in Xcode (Product → Archive)
2. Validate and upload to App Store Connect
3. Fill metadata in App Store Connect
4. Submit for review

---

### Android

#### Setup
```bash
ionic capacitor add android
ionic capacitor sync android
```

#### Configure App
1. Open `android/` in Android Studio
2. Update `applicationId` in `build.gradle`
3. Add app icons (res/mipmap)
4. Update strings and colors

#### Build
```bash
ionic capacitor build android --prod
```

**Generate Signed APK:**
1. Android Studio → Build → Generate Signed Bundle/APK
2. Select Android App Bundle
3. Create or use existing keystore
4. Build release variant

#### Submit to Play Store
1. Go to Google Play Console
2. Create new app
3. Upload AAB file
4. Fill metadata (screenshots, descriptions)
5. Submit for review

---

## 8. Schedule Research Pipeline

### Option A: Cloud Scheduler (Recommended)

The `publishDailyReports` Cloud Function is already scheduled to run daily at 6:00 AM EST.

**Verify:**
```bash
firebase functions:log --only publishDailyReports
```

### Option B: Manual Cron Job (Server)

If running research pipeline on your own server:

```bash
# Add to crontab
0 6 * * * cd /path/to/alpha-insights-app && npm run publish:research AAPL
```

---

## 9. Monitoring & Analytics

### Firebase Console
- **Authentication:** Monitor signups/logins
- **Firestore:** Monitor reads/writes
- **Functions:** Monitor executions/errors
- **Hosting:** Monitor traffic

### Enable Firebase Analytics
Already configured in the app. View:
- User engagement
- Screen views
- Custom events (bookmarks, shares, alerts)

### Error Monitoring (Optional)

**Sentry Integration:**
```bash
npm install @sentry/angular
```

Add to `app.module.ts`:
```typescript
import * as Sentry from "@sentry/angular";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: environment.production ? "production" : "development"
});
```

---

## 10. Post-Deployment Checklist

### Immediate
- [ ] Test registration flow
- [ ] Publish 3-5 sample analyses
- [ ] Test all user features (bookmark, alert, watchlist)
- [ ] Verify Cloud Functions are running
- [ ] Check security rules are applied
- [ ] Test push notifications (FCM)

### Week 1
- [ ] Monitor error logs (Cloud Functions)
- [ ] Create Firestore indexes if prompted
- [ ] Review Analytics data
- [ ] Test mobile builds on real devices
- [ ] Fix any reported bugs

### Month 1
- [ ] Submit to App Store / Play Store
- [ ] Implement feedback from beta testers
- [ ] Add more tickers to daily research
- [ ] Optimize performance (Lighthouse audit)
- [ ] Set up monitoring alerts

---

## 11. Troubleshooting

### "Permission Denied" Error
**Cause:** Security rules not deployed or user not authenticated  
**Fix:** `firebase deploy --only firestore:rules`

### Cloud Functions Not Running
**Cause:** Not deployed or missing dependencies  
**Fix:**
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### Analysis Not Showing in Feed
**Cause:** Collection name mismatch or indexing issue  
**Fix:** 
- Verify collection name is `AnalysisPosts` (case-sensitive)
- Create required indexes in Firestore Console

### Mobile Build Errors
**Cause:** Capacitor not synced  
**Fix:**
```bash
ionic capacitor sync ios
ionic capacitor sync android
```

### Firebase Config Not Working
**Cause:** Wrong config or missing in environment files  
**Fix:** Double-check `environment.ts` and `environment.prod.ts` have correct values

---

## 12. Useful Commands

### Development
```bash
ionic serve                     # Local dev server
firebase emulators:start        # Local Firebase emulators
npm run publish:research AAPL   # Publish analysis
```

### Deployment
```bash
npm run build --prod            # Production build
firebase deploy                 # Deploy all (rules, functions, hosting)
firebase deploy --only hosting  # Deploy frontend only
firebase deploy --only functions # Deploy backend only
```

### Monitoring
```bash
firebase functions:log          # View Cloud Function logs
firebase hosting:channel:list   # List hosting channels
```

### Mobile
```bash
ionic capacitor build ios --prod     # Build iOS
ionic capacitor build android --prod # Build Android
ionic capacitor sync                 # Sync web assets
```

---

## 13. Rollback Plan

### Rollback Hosting
```bash
firebase hosting:channel:deploy preview   # Deploy to preview channel first
firebase hosting:rollback                 # Rollback to previous version
```

### Rollback Functions
```bash
# Redeploy previous version
git checkout <previous-commit>
cd functions && npm run build && cd ..
firebase deploy --only functions
```

### Rollback Security Rules
```bash
# Revert firestore.rules file
git checkout <previous-commit> firestore.rules
firebase deploy --only firestore:rules
```

---

## 14. Environment Variables (Summary)

### Required in Firebase Console
- Authentication: Email/Password enabled
- Firestore: Database created
- Cloud Messaging: Server key generated

### Required in Code
- `src/environments/environment.ts` - Firebase config
- `src/environments/environment.prod.ts` - Firebase config (production)

### Optional
- `functions/.env` - API keys for price data, news APIs
- Service account key (for admin SDK in scripts)

---

## 15. Support & Resources

### Documentation
- Firebase Docs: https://firebase.google.com/docs
- Ionic Docs: https://ionicframework.com/docs
- Angular Docs: https://angular.io/docs

### Project Docs
- `FINAL_ARCHITECTURE.md` - Complete architecture
- `FINAL_BUILD_COMPLETE.md` - Feature list and status
- `docs/PUBLISH_RESEARCH.md` - Publishing guide
- `README.md` - Quick start

### Community
- Ionic Forum: https://forum.ionicframework.com
- Firebase Support: https://firebase.google.com/support

---

**Deployment completed! 🎉**

Your Alpha Insights app is now live and ready for users!

---

**Last Updated:** January 31, 2026  
**Maintainer:** DevOps Team  
**Version:** 1.0.0
