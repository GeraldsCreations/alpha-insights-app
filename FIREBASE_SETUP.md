# 🔥 Firebase Setup Guide

## Step 1: Get Your Firebase Configuration

### From Firebase Console:

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project** (or create a new one)
3. **Click the gear icon** (⚙️) → **Project Settings**
4. **Scroll down** to "Your apps" section
5. **Click the web icon** (`</>`) to add a web app (if you haven't already)
6. **Copy the firebaseConfig object**

It will look like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDxxx...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-XXXXXXXXXX"
};
```

### Step 2: Add to Environment File

Replace the placeholder values in `src/environments/environment.ts`:

```typescript
firebase: {
  apiKey: "AIzaSyDxxx...",           // Your actual API key
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-XXXXXXXXXX"
}
```

### Step 3: Enable Authentication Methods

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** authentication
3. Click **Save**

### Step 4: Create Firestore Database

1. Go to **Firestore Database** in Firebase Console
2. Click **Create database**
3. Choose **Start in test mode** (for now - we'll secure it later)
4. Select your preferred region
5. Click **Enable**

### Step 5: Initial Firestore Structure

Create these collections manually in Firestore Console:

```
📁 users
  └── {userId}
      - email: string
      - displayName: string
      - photoURL: string (optional)
      - createdAt: timestamp
      - watchlist: array of strings
      - notificationPreferences: map

📁 posts
  └── {postId}
      - authorId: string
      - authorName: string
      - title: string
      - ticker: string
      - assetType: string (stock|crypto|forex|commodity)
      - recommendation: string (LONG|SHORT|HOLD)
      - description: string
      - entry: number
      - target: number
      - stop: number
      - riskRewardRatio: number
      - confidenceLevel: number (1-10)
      - tags: array of strings
      - createdAt: timestamp
      - updatedAt: timestamp
      - views: number
      - likes: number

📁 bookmarks
  └── {userId}
      └── posts
          └── {postId}
              - postId: string
              - createdAt: timestamp
```

### Step 6: Security Rules (Later)

Once authentication is working, update Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Everyone can read posts, only authenticated users can write
    match /posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.authorId;
    }
    
    // Users can only access their own bookmarks
    match /bookmarks/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

### Step 7: Test Authentication

After adding real credentials:

1. Run `ionic serve`
2. Navigate to `/login`
3. Try creating an account (will work once we build the signup page)
4. Check Firebase Console → Authentication to see the new user

---

## 🚨 Security Notes

- **Never commit** your `environment.ts` file with real credentials to public repos
- Add `environment.ts` to `.gitignore` for production projects
- Use Firebase Security Rules to protect your data
- Enable App Check for production apps

## 🎯 Next Steps

Once Firebase is configured:
- ✅ Authentication will work
- ✅ Firestore queries will connect
- ✅ Real-time updates will stream
- ✅ User data will persist

**Ready to continue with Day 2 implementation!**
