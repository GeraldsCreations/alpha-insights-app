# Fix Summary - Document ID Navigation Issue

## Date: 2026-02-01
## Issue: BTC Analysis Not Loading

---

## 🔍 Root Cause Analysis

### The Problem
The app was trying to load: `BTC-1769975642442` (ticker-timestamp format)
But the actual Firestore document ID was: `lJhS0569KPG7b9cZAw95` (auto-generated)

Error: "Analysis not found (ID: BTC-1769975642442)"

### Why This Happened

1. **Upload Script Creates Custom IDs**
   - `scripts/publish-to-firestore.ts` creates documents with custom IDs like `BTC-1769975642442`
   - It also stores this ID **inside** the document data as the `id` field

2. **Firestore Service Bug**
   - When fetching documents, `FirestoreService` used:
     ```typescript
     items.push({ id: doc.id, ...data } as T);  // ❌ WRONG!
     ```
   - The spread operator `...data` **overwrites** `id: doc.id` because it comes after
   - So the stored `id` field (BTC-1769975642442) replaced the actual document ID

3. **Result**
   - Posts displayed with the wrong ID in the feed
   - Navigation tried to load `/analysis/BTC-1769975642442`
   - But the actual Firestore path is `/research_reports/lJhS0569KPG7b9cZAw95`
   - **404 Not Found**

---

## ✅ Fixes Applied

### 1. FirestoreService - Correct ID Priority
**File:** `src/app/core/services/firestore.service.ts`

**Changed all document mapping from:**
```typescript
{ id: doc.id, ...data }  // ❌ data.id overwrites doc.id
```

**To:**
```typescript
{ ...data, id: doc.id }  // ✅ doc.id always wins
```

**Applied to 3 methods:**
- `getDocument()` - Single document fetch
- `getCollection()` - Batch document fetch
- `streamCollection()` - Real-time listener (used by feed)

### 2. Sidebar Layout Fix
**File:** `src/app/shared/components/app-shell/app-shell.component.scss`

**Added:**
```scss
max-width: calc(100% - var(--ai-sidebar-width));
```

This prevents the main content from overflowing beyond the sidebar width on desktop.

---

## 🚀 Deployment

1. ✅ Built production bundle: `ionic build --prod`
2. ✅ Committed changes to Git
3. ✅ Pushed to GitHub: `git push`
4. ✅ Deployed to Firebase: `firebase deploy --only hosting`

**Live URL:** https://alpha-insights-84c51.web.app

---

## 🧪 Testing

### Before Fix
- Clicking BTC card → 404 Error
- Error: "Analysis not found (ID: BTC-1769975642442)"
- Sidebar overlapping content on some screens

### After Fix
- Clicking BTC card → Loads correctly using `lJhS0569KPG7b9cZAw95`
- All research reports now navigate with their actual Firestore document IDs
- Sidebar respects layout boundaries

---

## 📝 Notes

### Why Two IDs?
The document has TWO ID values:
1. **Firestore Document ID** (path): `lJhS0569KPG7b9cZAw95` ← The REAL ID
2. **Stored `id` field** (data): `BTC-1769975642442` ← Legacy from upload script

### Future Recommendation
Consider updating the upload script to either:
- Use Firestore auto-generated IDs and remove the `id` field from data
- Or ensure the stored `id` field matches the document ID

This would prevent confusion and ensure consistency.

---

## 🎯 Impact

**Fixed:**
- ✅ All research reports now load correctly
- ✅ Navigation uses actual Firestore document IDs
- ✅ Sidebar layout no longer overlaps
- ✅ Feed displays and routing work seamlessly

**Files Modified:**
1. `src/app/core/services/firestore.service.ts` - 3 methods updated
2. `src/app/shared/components/app-shell/app-shell.component.scss` - Layout fix

**Commit:** `114b4d8`
