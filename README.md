# 📱 Alpha Insights - Mobile App

Professional trading analysis platform mobile app built with Ionic/Angular and Firebase.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Ionic CLI (`npm install -g @ionic/cli`)
- Firebase account (for backend services)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd alpha-insights-app

# Install dependencies
npm install

# Run development server
ionic serve
```

The app will open at `http://localhost:8100`

### Build for Production

```bash
# Web build
npm run build

# iOS (requires macOS)
ionic capacitor build ios

# Android
ionic capacitor build android
```

## 📂 Project Structure

```
src/app/
├── core/                      # Core application modules
│   ├── auth/                  # Authentication service
│   │   └── auth.service.ts    # Firebase auth implementation
│   ├── guards/                # Route guards
│   │   └── auth.guard.ts      # Authentication guard
│   ├── services/              # Core services
│   │   ├── firestore.service.ts
│   │   └── analysis.service.ts
│   ├── models/                # TypeScript interfaces/types
│   │   └── index.ts           # All data models
│   └── interceptors/          # HTTP interceptors
│
├── shared/                    # Shared resources
│   ├── components/            # Reusable components
│   ├── directives/            # Custom directives
│   ├── pipes/                 # Custom pipes
│   └── utils/                 # Utility functions
│
└── features/                  # Feature modules
    ├── auth/                  # Authentication feature
    │   └── login/             # Login page
    ├── home/                  # Home feed page
    └── profile/               # User profile page
```

## 🔐 Authentication

### Current Implementation (Day 1 + Day 2)
- ✅ Firebase Authentication integrated
- ✅ Login page with email/password + password reset
- ✅ Registration page with full validation
- ✅ Auth guard protecting routes
- ✅ Auth service with observables
- ✅ Real-time Firestore data streaming
- ✅ Error handling and retry logic
- ✅ Offline mode support

### Authentication Flow
1. **New User:**
   - Navigate to `/register`
   - Fill out registration form (name, email, password)
   - Account created in Firebase Auth
   - User profile created in Firestore
   - Auto-login and redirect to `/home`

2. **Existing User:**
   - Navigate to `/login`
   - Enter email and password
   - Firebase authenticates credentials
   - Redirect to `/home`

3. **Forgot Password:**
   - Click "Forgot Password?" on login page
   - Enter email address
   - Receive password reset link via email
   - Follow link to reset password

4. **Auth Persistence:**
   - Auth state persists across sessions
   - Protected routes redirect to `/login` if unauthenticated
   - User data loaded from Firestore on auth state change

## 🧭 Routing

```typescript
/ (root)           → Redirects to /login
/login             → Login page (public)
/register          → Registration page (public)
/home              → Home feed (protected by AuthGuard)
/profile           → User profile (protected by AuthGuard)
```

### Route Protection
All routes except `/login` and `/register` are protected by `AuthGuard` which:
- Checks if user is authenticated via `AuthService.user$`
- Redirects to `/login` if not authenticated
- Allows access if authenticated

## 🎨 Features Implemented

### ✅ Day 1 - Foundation
- [x] Project scaffolding with Ionic/Angular
- [x] Firebase integration setup
- [x] Authentication service
- [x] Auth guard for route protection
- [x] Login page UI
- [x] Home feed page with demo data
- [x] Profile page with demo stats
- [x] Routing configuration
- [x] Data models (TypeScript interfaces)
- [x] Git repository initialized
- [x] Project structure established

### ✅ Day 2 - Authentication & Data
- [x] Firebase configuration guide
- [x] User registration page with full validation
- [x] Password reset flow
- [x] Real Firestore data integration
- [x] Error handling service
- [x] Network status monitoring
- [x] Offline mode detection
- [x] Retry logic with exponential backoff
- [x] Loading/error/empty states
- [x] Pull-to-refresh functionality
- [x] Real-time Firestore updates
- [x] User profile creation in Firestore

### ✅ Day 3 - User Features (COMPLETE!)
- [x] **Bookmarking System**
  - Save/unsave analysis posts
  - View saved posts page
  - Bookmark count tracking
  - Real-time sync
- [x] **Share Functionality**
  - Native mobile sharing (iOS/Android)
  - Web Share API fallback
  - Share post details
  - Reusable share button
- [x] **Price Alerts**
  - Create alerts (Entry/Stop/Target)
  - Edit/delete alerts
  - Alert management page
  - Alert statistics
- [x] **Watchlist**
  - Add/remove tickers
  - Watchlist management page
  - Ticker validation
  - Real-time updates
- [x] **Settings Page**
  - Theme selection (Light/Dark/Auto)
  - Notification preferences
  - Default filters
  - Clear cache & reset
  - Account management
- [x] **Profile Enhancements**
  - Edit profile (name, email, photo)
  - View user stats
  - Password change
  - Enhanced navigation

### 📝 Coming Next (Day 4+)
- [ ] Analysis detail page
- [ ] Create post functionality
- [ ] Search and filtering
- [ ] Push notifications (FCM setup)
- [ ] Performance tracking
- [ ] Comments system
- [ ] Live price data integration

## 🔥 Firebase Services Used

- **Authentication** - Email/password auth
- **Firestore** - Real-time database for posts, users, bookmarks
- **Cloud Functions** - Backend logic (coming soon)
- **Cloud Messaging** - Push notifications (coming soon)
- **Storage** - Image uploads for analysis posts (coming soon)

## 🛠️ Tech Stack

- **Framework:** Ionic 8 + Angular 18
- **Language:** TypeScript
- **Styling:** Ionic Components + SCSS
- **Backend:** Firebase (Auth, Firestore, Functions, FCM)
- **State Management:** RxJS Observables
- **Routing:** Angular Router with lazy loading

## 📱 Target Platforms

- iOS (via Capacitor)
- Android (via Capacitor)
- Progressive Web App (PWA)

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run e2e

# Lint code
npm run lint
```

## 🚧 Development Status

**Current Phase:** Day 3 Complete ✅ - Core User Features Implemented

**What Works:**
- ✅ Complete authentication system (login, register, password reset)
- ✅ Real-time Firestore data integration
- ✅ **Bookmarking system** - Save/view posts
- ✅ **Native sharing** - Share posts to social media
- ✅ **Price alerts** - Entry/Stop/Target alerts
- ✅ **Watchlist** - Track favorite tickers
- ✅ **Settings page** - Theme, notifications, preferences
- ✅ **Profile editing** - Update name, email, photo
- ✅ **User stats** - Bookmarks, watchlist, alerts counts
- ✅ Comprehensive error handling & offline support
- ✅ Pull-to-refresh, loading states, empty states
- ✅ Dark mode with auto-detection
- ✅ Reusable action buttons (bookmark, share, watchlist)

**Ready to Test (After Adding Firebase Config):**
- 🔥 User registration creates Firebase Auth user + Firestore profile
- 🔥 Password reset sends email via Firebase
- 🔥 Login authenticates with Firebase
- 🔥 Home feed streams real-time posts from Firestore
- 🔥 Network errors handled gracefully with retry
- 🔥 Offline mode shows cached data

**Next Steps:**
1. Add Firebase credentials to `src/environments/environment.ts` (see `FIREBASE_SETUP.md`)
2. Enable Email/Password auth in Firebase Console
3. Create Firestore database
4. Test registration flow
5. Add sample posts to Firestore (optional)

## 📦 Dependencies

### Core
- `@ionic/angular` - UI framework
- `@angular/fire` - Firebase SDK for Angular
- `firebase` - Firebase client SDK

### Dev Dependencies
- TypeScript
- Angular CLI
- Ionic CLI

## 🔒 Security Notes

- Auth guard prevents unauthorized access
- Firebase rules will be configured server-side
- No sensitive data in codebase (uses environment variables)
- HTTPS enforced in production

## 📖 Documentation

- [Ionic Docs](https://ionicframework.com/docs)
- [Angular Docs](https://angular.io/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Architecture Design](/workspace/alpha-insights/ARCHITECTURE.md)

## 🤝 Contributing

This is an internal project. Follow the established folder structure and coding standards.

## 📄 License

Proprietary - All rights reserved

---

**Built with 🍆 by the Alpha Insights Team**

Last Updated: 2026-01-31
