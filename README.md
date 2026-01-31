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

### Current Implementation (Day 1)
- ✅ Firebase Authentication integrated
- ✅ Login page with email/password
- ✅ Auth guard protecting routes
- ✅ Auth service with observables

### Login Flow
1. User enters email and password
2. Firebase authenticates credentials
3. On success → Navigate to `/home`
4. Auth state persists across sessions
5. Protected routes redirect to `/login` if unauthenticated

## 🧭 Routing

```typescript
/ (root)           → Redirects to /login
/login             → Login page (public)
/home              → Home feed (protected by AuthGuard)
/profile           → User profile (protected by AuthGuard)
```

### Route Protection
All routes except `/login` are protected by `AuthGuard` which:
- Checks if user is authenticated via `AuthService.user$`
- Redirects to `/login` if not authenticated
- Allows access if authenticated

## 🎨 Features Implemented (Day 1)

### ✅ Completed
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

### 📝 Coming Next (Day 2+)
- [ ] Firebase config integration
- [ ] Real authentication flow testing
- [ ] User registration page
- [ ] Password reset functionality
- [ ] Analysis feed with real Firestore data
- [ ] Push notifications setup
- [ ] Watchlist functionality
- [ ] Bookmark system
- [ ] Search and filtering
- [ ] Analysis detail page
- [ ] Price alerts

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

**Current Phase:** Day 1 - Foundation Complete ✅

**What Works:**
- ✅ App builds and runs successfully
- ✅ Login page renders
- ✅ Home page with demo cards
- ✅ Profile page with logout
- ✅ Route protection active
- ✅ Auth service connected to Firebase

**What's Stubbed:**
- ⚠️ Firebase config needs environment variables
- ⚠️ Login doesn't connect to real Firebase yet (needs config)
- ⚠️ Demo data hardcoded (not from Firestore)
- ⚠️ No error handling for network issues

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
