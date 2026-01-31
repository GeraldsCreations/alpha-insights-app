# 🚀 Quick Start Guide - Alpha Insights App

## Current Status: Day 2 Complete ✅

Everything is built and ready to test! Just need to add your Firebase credentials.

---

## 🔥 Step 1: Add Firebase Credentials (5 minutes)

### Get Your Config
1. Go to **Firebase Console**: https://console.firebase.google.com/
2. Select your project (or create new one)
3. Click **⚙️ Settings** → **Project Settings**
4. Scroll to **"Your apps"** section
5. Click **web icon (`</>`)** to add/view web app
6. **Copy the config object**

### Paste Into Environment File
Open `src/environments/environment.ts` and replace the placeholders:

```typescript
firebase: {
  apiKey: "AIzaSyDxxx...",              // ← Your real API key
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-XXXXXXXXXX"
}
```

**That's it!** Firebase is now connected.

---

## 📧 Step 2: Enable Email/Password Auth (2 minutes)

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click **Email/Password**
3. Toggle **Enable**
4. Click **Save**

---

## 🗄️ Step 3: Create Firestore Database (2 minutes)

1. In Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (we'll secure it later)
4. Select your region (e.g., `us-central`)
5. Click **Enable**

**Done!** Your database is ready.

---

## ✅ Step 4: Test It Out!

### Run the App
```bash
cd /root/.openclaw/workspace/alpha-insights-app
ionic serve
```

The app will open at `http://localhost:8100`

### Test Registration
1. Navigate to `/register` (or click "Create Account" on login)
2. Fill out the form:
   - Display Name: `Test User`
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm Password: `password123`
3. Click **Create Account**
4. ✅ You should be redirected to `/home`

### Verify in Firebase Console
1. Go to **Authentication** → Users
2. You should see `test@example.com` listed
3. Go to **Firestore Database** → `users` collection
4. You should see a user document with your UID

### Test Password Reset
1. Logout (click profile icon → logout)
2. On login page, click **Forgot Password?**
3. Enter `test@example.com`
4. Click **Send Reset Link**
5. ✅ Check your email for the reset link

### Test Firestore Feed
1. Login with your test account
2. Home page will show "No posts yet" (empty state)
3. Let's add a sample post...

---

## 📝 Optional: Add Sample Posts

### Via Firebase Console
1. Go to **Firestore Database**
2. Click **Start collection**
3. Collection ID: `posts`
4. Click **Next**
5. Add a document with these fields:

```javascript
// Document ID: Auto-generated
{
  title: "Bitcoin Breakout Analysis",
  ticker: "BTC",
  assetType: "crypto",
  recommendation: "LONG",
  description: "Strong bullish momentum with RSI confirming uptrend.",
  entry: 45000,
  target: 52000,
  stop: 42000,
  riskRewardRatio: 2.3,
  confidenceLevel: 8,
  authorId: "demo",
  authorName: "Demo Analyst",
  views: 0,
  likes: 0,
  tags: ["breakout", "bullish"],
  createdAt: [Click "timestamp" type → use current time],
  updatedAt: [Click "timestamp" type → use current time]
}
```

6. Click **Save**
7. Refresh the app → The post should appear instantly! 🎉

### Add More Posts
Repeat with different tickers (ETH, TSLA, AAPL) and asset types (crypto, stock).

---

## 🎯 What You Can Test Now

### ✅ Authentication
- [x] User registration
- [x] Login with email/password
- [x] Password reset via email
- [x] Auth persistence (refresh page, still logged in)
- [x] Logout
- [x] Route protection (try accessing `/home` while logged out)

### ✅ Real-time Data
- [x] Posts appear instantly when added to Firestore
- [x] Filter by asset type (All, Crypto, Stocks, Forex)
- [x] Pull-to-refresh updates the feed
- [x] Empty state when no posts exist

### ✅ Error Handling
- [x] Try registering with existing email → See error
- [x] Try weak password (< 6 chars) → See error
- [x] Try logging in with wrong password → See error
- [x] Disconnect internet → See offline banner
- [x] Reconnect internet → See auto-refresh

---

## 🐛 Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- **Fix:** Check that you replaced ALL placeholders in `environment.ts`
- **Check:** Make sure `apiKey`, `authDomain`, `projectId` are correct

### "Missing or insufficient permissions"
- **Fix:** Make sure Firestore is in **test mode**
- **Check:** Firestore Database → Rules tab
- **Should say:** `allow read, write: if true;` (for testing only!)

### "Email/password auth is not enabled"
- **Fix:** Go to Firebase Console → Authentication → Sign-in method
- **Enable:** Email/Password authentication

### Posts not appearing
- **Fix:** Make sure you created the `posts` collection in Firestore
- **Check:** Field names match exactly (case-sensitive!)
- **Check:** Both `createdAt` and `updatedAt` are **timestamp** type

---

## 📚 Documentation

- **Full Setup Guide:** `FIREBASE_SETUP.md`
- **Day 2 Details:** `DAY_2_COMPLETE.md`
- **Architecture:** `README.md`
- **Data Models:** `src/app/core/models/index.ts`

---

## 🎉 Success Checklist

- [ ] Firebase credentials added to `environment.ts`
- [ ] Email/Password auth enabled in Firebase Console
- [ ] Firestore database created (test mode)
- [ ] App runs with `ionic serve`
- [ ] Can create new account
- [ ] User appears in Firebase Auth + Firestore
- [ ] Can login with created account
- [ ] Can reset password via email
- [ ] Home page loads (empty or with posts)
- [ ] Optional: Sample posts added and displaying

---

## 🚀 Ready for Day 3?

Once you've tested everything, we can move on to:
- Analysis detail page
- Create post functionality
- Bookmarks and watchlist
- Push notifications
- And more!

---

**Need help?** Check `FIREBASE_SETUP.md` for detailed Firebase setup instructions.

**Questions?** All the code is documented and ready to go!

**Let's ship it! 🍆**
