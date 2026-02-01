# Critical Production Fixes - Full System Audit

**Status:** 🚨 HIGH PRIORITY - User-blocking bugs
**Reporter:** Chadizzle
**Date:** 2026-02-01

---

## Issues Reported

1. ✅ **FIXED:** No content showing (all sections say "No X available")
2. 🔧 **IN PROGRESS:** Navigation broken - only first analysis loads, then clicking others reloads home
3. ❌ **NOT STARTED:** Custom report request fails with "Failed to submit request"
4. ❌ **NOT STARTED:** Fix sidebar, chart, verdicts, price levels from senior dev work needs deployment

---

## Issue #1: No Content Showing ✅ FIXED

**Root Cause:**
- Publish script was creating `article` field but no `content` object
- UI expected `content.detailedAnalysis`, `content.technicalAnalysis`, etc.
- Firestore had `article` but `content` was undefined

**Fix Applied:**
- ✅ Updated `publish-to-firestore.ts` to create `content` object with all sections
- ✅ Republished all 5 reports (NVDA, TSLA, GOLD, OIL, TIG)
- ✅ Verified NVDA-1769960465761 has content object with all keys
- ✅ Committed: `f75d840`

**Test:**
```bash
# Check any report has content
firebase firestore:get ResearchReports/NVDA-1769960465761
# Should show content.detailedAnalysis, content.technicalAnalysis, etc.
```

---

## Issue #2: Navigation Broken 🔧 IN PROGRESS

**Root Cause:**
- `analysis-detail.page.ts` line 42: `this.route.snapshot.paramMap.get('id')`
- Uses snapshot instead of observable
- Component instance is reused when navigating between analyses
- `ngOnInit` only fires once, so clicking second analysis doesn't load new data

**Fix Required:**
```typescript
// BEFORE (broken):
ngOnInit() {
  this.postId = this.route.snapshot.paramMap.get('id') || '';
  if (this.postId) {
    this.loadPost();
  }
}

// AFTER (working):
ngOnInit() {
  this.route.paramMap
    .pipe(takeUntil(this.destroy$))
    .subscribe(params => {
      this.postId = params.get('id') || '';
      if (this.postId) {
        this.loadPost();
      }
    });
}
```

**Files to Fix:**
- `src/app/features/analysis-detail/analysis-detail.page.ts`

**Test Steps:**
1. Load app, click on NVDA analysis
2. Click back, click on TSLA analysis
3. Verify TSLA loads (not NVDA again)
4. Click back, click on GOLD
5. Verify GOLD loads correctly

---

## Issue #3: Custom Request Submission Fails ❌ NOT STARTED

**Error:** "Failed to submit request"

**Possible Causes:**
1. Cloud Function `submitCustomReportRequest` error
2. Firebase Auth token issue
3. Firestore permissions issue
4. Network/CORS issue
5. Quota check failing

**Debug Steps:**
1. Check browser console for error details
2. Check Firebase Functions logs:
   ```bash
   firebase functions:log --only submitCustomReportRequest
   ```
3. Test Cloud Function directly:
   ```bash
   # Check if function is deployed
   firebase functions:list
   ```
4. Check Firestore rules allow CustomReportRequests creation

**Files to Check:**
- `functions/src/custom-request-functions.ts` (submitCustomReportRequest)
- `src/app/core/services/custom-request.service.ts` (client-side)
- `firestore.rules` (CustomReportRequests collection)

**Expected Flow:**
1. User clicks request button
2. Client calls `submitCustomReportRequest` Cloud Function
3. Function checks quota (new logic in Cloud Function)
4. Function creates doc in CustomReportRequests collection
5. Returns success with requestId

**Test:**
```typescript
// In browser console (when logged in):
const functions = firebase.functions();
const submit = functions.httpsCallable('submitCustomReportRequest');
submit({ ticker: 'TEST', assetType: 'stock' })
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error));
```

---

## Issue #4: Deploy Senior Dev Fixes ❌ NOT STARTED

**Context:**
- Senior dev fixed 6 critical bugs
- Code is committed to master
- NOT yet deployed to production
- Users still seeing old broken version

**Commits to Deploy:**
- `53ad8c7` - Fix sidebar layout, TradingView charts, verdicts, price levels, etc.
- `df263e9` - Add fixes summary docs
- `bcb4b3f` - Add visual test docs
- `f75d840` - Add content object to Firestore (THIS ONE)

**Deploy Command:**
```bash
cd /root/.openclaw/workspace/alpha-insights-app
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/firebase-service-account.json"

# Build frontend
npm run build

# Deploy everything
firebase deploy

# OR deploy separately:
firebase deploy --only hosting  # Frontend
firebase deploy --only firestore:rules  # Security rules (may need manual Console update)
```

**Deployment Checklist:**
- [ ] Build completes without errors
- [ ] All 5 reports have content object in Firestore
- [ ] Hosting deployed (www/ directory)
- [ ] Functions deployed (if changed)
- [ ] Firestore rules deployed (or updated in Console)
- [ ] Test in production: https://alpha-insights-84c51.web.app

---

## Full Audit Results

### ✅ What's Working:
- Reports showing on home screen (5 total)
- Firestore documents have correct structure now
- Content object exists with all sections
- Verdicts array populated correctly
- Price data present (entry, target, stop)

### ❌ What's Broken:
1. Navigation between analyses (route param not observed)
2. Custom request submission
3. Latest fixes not deployed to production
4. Possibly sidebar layout, charts, etc. (not deployed)

### 🎯 Priority Order:
1. **P0:** Fix navigation issue (blocking all multi-analysis usage)
2. **P0:** Debug custom request submission (blocking new reports)
3. **P0:** Deploy all fixes to production
4. **P1:** Test everything end-to-end
5. **P2:** Clean up old duplicate reports in Firestore

---

## Success Criteria

User should be able to:
- ✅ See 5 reports on home screen
- ❌ Click on any report and see full content (currently fails on #2+)
- ❌ Navigate between reports without reloading
- ❌ Submit custom report request successfully
- ❌ See correct charts, verdicts, price levels (not deployed yet)

---

## Next Actions

1. **Immediate:** Fix analysis-detail route subscription issue
2. **Immediate:** Debug custom request submission failure
3. **Immediate:** Deploy all committed fixes to production
4. **After:** Full end-to-end testing
5. **After:** Clean up duplicate/old Firestore documents

---

**Assigned To:** Senior Dev Agent (analysis-detail fix) + Deploy Agent (deployment)
**Status:** Waiting for execution
**ETA:** <30 minutes for all fixes
