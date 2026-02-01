# Collection Naming - Migration to Best Practices

**Date:** 2026-02-01  
**Status:** ✅ Code Updated (Awaiting DB Clear)

## What Changed

Migrated all Firestore collection names from `PascalCase` to `lowercase_snake_case` following Firebase best practices.

## Collection Mapping

| Old Name (PascalCase) | New Name (snake_case) | Status |
|-----------------------|-----------------------|--------|
| `Users` | `users` | ✅ Updated |
| `AnalysisPosts` | `analysis_posts` | ✅ Updated |
| `ResearchReports` | `research_reports` | ✅ Updated |
| `CustomReportRequests` | `custom_report_requests` | ✅ Updated |
| `PriceAlerts` | `price_alerts` | ✅ Updated |
| `ResearchTriggers` | `research_triggers` | ✅ Updated |
| `Analytics` | `analytics` | ✅ Updated |
| `Bookmarks` | `bookmarks` | ✅ Already correct |

## Files Updated

### Backend (Cloud Functions)
- ✅ `functions/src/index.ts`
- ✅ `functions/src/quota-functions.ts`
- ✅ `functions/src/custom-request-functions.ts`
- ✅ `functions/src/init-missing-user.ts`

### Frontend (Angular)
- ✅ `src/app/core/services/analysis.service.ts`
- ✅ `src/app/core/services/bookmark.service.ts`
- ✅ `src/app/core/services/firestore.service.ts`
- ✅ `src/app/core/services/custom-request.service.ts`

### Security & Config
- ✅ `firestore.rules` (updated all match paths)

## Deployment Status

### ✅ Deployed Successfully
- Frontend (Hosting): Feb 1 19:35 UTC
- Cloud Functions (13/16): Feb 1 19:36 UTC
  - All callable functions working
  - All Firestore triggers working

### ⚠️ Partial Deploy Issues
The following **scheduled functions** failed to deploy due to service account permissions:
- `publishDailyReports` (not critical - manual research pipeline)
- `checkPriceAlerts` (not critical - no active alerts yet)
- `resetMonthlyQuotas` (not critical - quota resets on demand)

**Note:** These are background jobs and don't affect app functionality.

### ❌ Not Deployed (Permissions)
- Firestore Rules: Service account lacks `firebaserules.googleapis.com` permission
  - **Workaround:** Deploy rules from Firebase Console manually

## Next Steps

### 1. Clear Database (User Action Required)
Since you're clearing the DB, no data migration is needed. Once cleared:
- All new data will use lowercase_snake_case collections
- No old PascalCase collections will exist

### 2. Optional: Fix Permissions
If you want scheduled functions + auto-deploy of firestore rules:

```bash
# In Firebase Console > IAM & Admin
# Grant service account these roles:
- Cloud Scheduler Admin
- Firebase Rules Admin
```

### 3. Verify After DB Clear
After clearing the database:
1. Sign up a new test account
2. Submit a custom report request
3. Create a bookmark
4. Verify collections appear as: `users`, `custom_report_requests`, `bookmarks`

## Impact

### Breaking Changes
⚠️ **If you DON'T clear the DB first**, the app will look for new collection names but data exists in old collections.

### After DB Clear
✅ Clean slate - everything uses proper conventions from day one!

## Why This Matters

Following Firebase best practices for collection naming:
1. **Consistency** - Easier to read and maintain
2. **Convention** - Matches Firebase docs and examples
3. **Lowercase** - Prevents case-sensitivity issues
4. **Snake case** - Standard for multi-word identifiers in NoSQL

## References

- [Firebase Collection Naming Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- Conventions: `lowercase_plural_snake_case`
- Examples: `users`, `blog_posts`, `user_preferences`
