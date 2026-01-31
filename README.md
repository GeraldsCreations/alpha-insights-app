# 📊 Alpha Insights - Trading Analysis Mobile App

A professional trading analysis platform built with **Angular 18**, **Ionic 8**, and **Firebase**.

## 🚀 Project Status

**Current Sprint:** Sprint 1 - Foundation & Authentication (Day 1 Complete)

### ✅ Day 1 Achievements

- [x] Project scaffolding (Angular + Ionic + Capacitor)
- [x] Firebase configuration and integration
- [x] Core folder structure (core, shared, features)
- [x] TypeScript data models and interfaces
- [x] Core services (Auth, Firestore, Analysis)
- [x] Basic routing and navigation
- [x] Placeholder pages (Login, Home, Profile)
- [x] Demo UI with trading analysis cards
- [x] Git repository initialized

### 🎯 Next Steps (Day 2)

- [ ] Implement full authentication flow
- [ ] Create Firebase project and add config
- [ ] Set up Firestore security rules
- [ ] Build real-time data fetching
- [ ] Add error handling and loading states
- [ ] Implement form validation
- [ ] Add authentication guards

## 📁 Project Structure

```
alpha-insights-app/
├── src/
│   ├── app/
│   │   ├── core/                   # Singleton services, guards
│   │   │   ├── auth/               # Authentication service
│   │   │   ├── services/           # Firebase, API services
│   │   │   ├── guards/             # Route guards (TBD)
│   │   │   └── models/             # TypeScript interfaces
│   │   │
│   │   ├── shared/                 # Reusable components (TBD)
│   │   │   ├── components/
│   │   │   ├── directives/
│   │   │   └── pipes/
│   │   │
│   │   ├── features/               # Feature modules (lazy-loaded)
│   │   │   ├── auth/
│   │   │   │   └── login/         # Login page
│   │   │   ├── home/              # Home feed
│   │   │   └── profile/           # User profile
│   │   │
│   │   ├── app.module.ts          # Root module with Firebase
│   │   └── app-routing.module.ts  # Main routing
│   │
│   ├── assets/                     # Images, icons
│   ├── theme/                      # Ionic theme & variables
│   └── environments/               # Firebase config
│       ├── environment.ts          # Development
│       └── environment.prod.ts     # Production
│
├── capacitor.config.ts             # Capacitor configuration
├── ionic.config.json               # Ionic configuration
└── package.json                    # Dependencies
```

## 🔧 Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- Ionic CLI: `npm install -g @ionic/cli`
- Firebase account

### Quick Start

1. **Clone the repository**
   ```bash
   cd /root/.openclaw/workspace/alpha-insights-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   
   Edit `src/environments/environment.ts` and add your Firebase credentials:
   
   ```typescript
   firebase: {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID",
     measurementId: "YOUR_MEASUREMENT_ID"
   }
   ```

4. **Run the app**
   ```bash
   ionic serve
   ```

   Or with live reload:
   ```bash
   ionic serve --lab
   ```

## 📱 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `ionic serve` | Run app in browser with live reload |
| `ionic serve --lab` | Run with iOS/Android/Desktop preview |
| `npm run build` | Build for production |
| `ionic capacitor add ios` | Add iOS platform |
| `ionic capacitor add android` | Add Android platform |
| `ionic capacitor run ios` | Run on iOS simulator |
| `ionic capacitor run android` | Run on Android emulator |

## 🔥 Firebase Setup

See [FIREBASE_SETUP.md](../alpha-insights/FIREBASE_SETUP.md) in the architecture docs for detailed Firebase configuration.

### Required Firebase Services

- ✅ **Authentication** - Email/Password authentication
- ✅ **Firestore Database** - NoSQL database for analysis posts
- ✅ **Storage** - Image hosting for charts and hero images
- 🔜 **Cloud Functions** - Price alerts, notifications (Sprint 3)
- 🔜 **Cloud Messaging** - Push notifications (Sprint 3)

## 🎨 Features

### Current Features (MVP)

- ✅ Beautiful Ionic UI components
- ✅ Demo trading analysis cards
- ✅ Navigation between pages
- ✅ Firebase integration (configured)
- ✅ Responsive design (mobile-first)

### Coming Soon (Sprint 1)

- 🔜 User authentication (login, register, logout)
- 🔜 Real-time analysis feed from Firestore
- 🔜 Filter by asset type (crypto/stock)
- 🔜 Filter by recommendation (LONG/SHORT)
- 🔜 Pull-to-refresh functionality
- 🔜 Loading states and error handling

### Future Sprints

- 📋 Analysis detail view with charts
- 📋 Watchlist management
- 📋 Price alerts
- 📋 Performance tracking
- 📋 Dark mode
- 📋 Push notifications
- 📋 PDF export/share

## 🏗️ Architecture

Built following Angular/Ionic best practices:

- **Lazy-loaded modules** - Fast initial load time
- **Singleton services** - Efficient state management
- **Observable patterns** - Reactive data streams with RxJS
- **Type safety** - Full TypeScript interfaces
- **Modular structure** - Clean separation of concerns

### Key Services

#### AuthService (`core/auth/auth.service.ts`)
- User authentication (login, register, logout)
- Password reset
- Auth state management with RxJS

#### FirestoreService (`core/services/firestore.service.ts`)
- Generic CRUD operations
- Real-time data streaming
- Type-safe document/collection methods

#### AnalysisService (`core/services/analysis.service.ts`)
- Fetch analysis posts
- Filter and search
- Bookmark management

## 📊 Data Models

All TypeScript interfaces are defined in `src/app/core/models/index.ts`:

- `User` - User profile and preferences
- `AnalysisPost` - Trading analysis with charts
- `PriceAlert` - User price alerts
- `PerformanceRecord` - Trade tracking
- And more...

## 🔐 Security

- Firebase Security Rules (TBD - Sprint 2)
- Environment variables never committed
- Authentication guards on protected routes
- Input validation and sanitization

## 🧪 Testing

- Unit tests: Jasmine + Karma (TBD)
- E2E tests: Cypress (TBD)
- Test coverage goal: 80%+

Run tests:
```bash
npm test                # Unit tests
npm run e2e             # E2E tests (when configured)
```

## 📦 Dependencies

### Core
- `@angular/core` ^18.0.0
- `@ionic/angular` ^8.0.0
- `@capacitor/core` ^6.0.0

### Firebase
- `firebase` ^11.0.0
- `@angular/fire` ^18.0.0

### Utilities
- `rxjs` ^7.8.0
- `chart.js` ^4.0.0 (for charts)
- `marked` ^12.0.0 (for markdown rendering)

## 🚀 Deployment

### Web (PWA)
```bash
npm run build --prod
# Deploy www/ folder to Firebase Hosting or Netlify
```

### iOS
```bash
ionic capacitor add ios
ionic capacitor run ios
# Build in Xcode and submit to App Store
```

### Android
```bash
ionic capacitor add android
ionic capacitor run android
# Build in Android Studio and submit to Google Play
```

## 📝 Development Notes

### Current Limitations

1. **Firebase not connected yet** - Need to create Firebase project and add credentials
2. **Demo data only** - Home feed shows hardcoded posts
3. **No authentication flow** - Login page is UI-only (no Firebase auth)
4. **No guards** - All routes are publicly accessible

### Next Development Session

**Priority tasks for Day 2:**

1. Create Firebase project
2. Add Firebase credentials to environment files
3. Implement real authentication flow
4. Test login/logout with Firebase
5. Create auth guard for protected routes
6. Add error handling and loading states
7. Test on web browser

## 👥 Team

- **Dev** - Senior Mobile Developer
- **Sprint:** Sprint 1 (Week 1)
- **Target:** Working MVP with Auth + Home Feed (5-7 days)

## 📄 License

Proprietary - Alpha Insights Trading Platform

---

**Built with 🍆 by Dev**

*Last updated: Day 1 - Project scaffolding complete*
