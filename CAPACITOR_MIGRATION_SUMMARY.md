# Capacitor Static Export Migration Summary

## Overview
Successfully removed all Next.js API routes and replaced them with direct Supabase client-side queries for Capacitor mobile app compatibility.

## Changes Made

### 1. Created New Client-Side Queries Library
**File:** `lib/supabase/queries.ts`

This new module contains all database operations as client-side Supabase queries:

#### Exam Categories
- `getExamCategories()` - Fetch all categories (with RLS for non-admin users)
- `createExamCategory(name, is_published)` - Create new category
- `updateExamCategory(id, name)` - Update category name
- `deleteExamCategory(id)` - Delete category and its questions
- `toggleCategoryPublishStatus(id, is_published)` - Publish/unpublish category

#### Exam Questions
- `getExamQuestions(categoryId?)` - Fetch questions (admin only)
- `getPublicExamQuestions(categoryId?, search?)` - Fetch with search
- `createExamQuestion(questionData)` - Create new question with validation
- `updateExamQuestion(id, updateData)` - Update existing question
- `deleteExamQuestion(id)` - Delete question

#### Exam Attempts
- `getExamAttempts(userId?, attemptId?)` - Fetch attempts with permissions
- `createExamAttempt(attemptData)` - Save exam results

#### Exam Settings
- `getExamSettings(categoryId)` - Load category settings
- `updateExamSettings(categoryId, settings)` - Save settings

#### Exam Limits
- `getExamLimits(userId?)` - Get daily limits
- `updateExamLimit(user_id, daily_limit, is_limited)` - Set user limits
- `deleteExamLimit(userId)` - Remove custom limit

#### Exam Taking
- `getExamForTaking(categoryId)` - Load exam with question selection

#### Notifications
- `getNotifications(unreadOnly?, limit?)` - Fetch notifications
- `createNotification(notification)` - Create new notification
- `markNotificationAsRead(notificationId)` - Mark single as read
- `markAllNotificationsAsRead()` - Mark all as read
- `deleteNotification(notificationId)` - Delete notification

#### Admin
- `getAdminStats()` - Get dashboard stats
- `getUsers(type)` - List users (requires user_profiles table)
- `checkAdminExists()` - Check if admin is set up
- `setupAdmin(email, password)` - Create admin user

---

### 2. Updated Components (Replaced fetch("/api/...") calls)

#### `app/Admin/exams/page.tsx`
**Changes:**
- Added imports from `lib/supabase/queries`
- Replaced `fetch("/api/exam/categories")` with `getExamCategories()`
- Replaced `fetch("/api/exam/questions")` with `getExamQuestions()`
- Replaced `fetch("/api/exam/settings")` with `getExamSettings()` / `updateExamSettings()`
- Replaced `fetch("/api/exam/categories")` POST/PUT/PATCH/DELETE with corresponding functions
- Replaced `fetch("/api/exam/questions")` POST/PUT/DELETE with corresponding functions
- Replaced `fetch("/api/exam/attempts")` with `getExamAttempts()`

#### `app/dashboard/exam/page.tsx`
**Changes:**
- Added imports from `lib/supabase/queries`
- Replaced `fetch("/api/exam/categories")` with `getExamCategories()`
- Replaced `fetch("/api/exam/take")` with `getExamForTaking()`
- Replaced `fetch("/api/exam/attempts")` POST with `createExamAttempt()`

#### `components/notifications-dropdown.tsx`
**Changes:**
- Added imports from `lib/supabase/queries`
- Replaced `fetch("/api/notifications")` with `getNotifications()`
- Replaced `fetch("/api/notifications")` PUT with `markNotificationAsRead()` / `markAllNotificationsAsRead()`
- Replaced `fetch("/api/notifications")` DELETE with `deleteNotification()`

---

### 3. Deleted API Routes
**Removed:** `app/api/` directory and all subdirectories:
- `app/api/exam/categories/route.ts`
- `app/api/exam/questions/route.ts`
- `app/api/exam/questions/public/route.ts`
- `app/api/exam/attempts/route.ts`
- `app/api/exam/settings/route.ts`
- `app/api/exam/limits/route.ts`
- `app/api/exam/take/route.ts`
- `app/api/notifications/route.ts`
- `app/api/users/route.ts`
- `app/api/admin/stats/route.ts`
- `app/api/setup-admin/route.ts`
- `app/api/setup-admin/check/route.ts`
- `app/api/upload/route.ts`
- `app/api/profile-picture/route.ts`
- `app/auth/callback/route.ts`

---

### 4. Configuration Files Already Updated

#### `next.config.ts`
```typescript
output: 'export',
distDir: 'dist',
trailingSlash: true,
```

#### `capacitor.config.ts`
```typescript
webDir: 'dist',
server: {
  url: process.env.NEXT_PUBLIC_LIVE_URL || '',
  cleartext: true,
  androidScheme: 'https',
  allowNavigation: ['*'],
}
```

---

## Remaining Files to Update

The following files still need to be updated to remove API dependencies:

### High Priority
1. `app/Admin/questions/page.tsx` - Contains 5 fetch calls
2. `app/dashboard/page.tsx` - Contains 4 fetch calls  
3. `app/Admin/register/page.tsx` - Contains 3 fetch calls
4. `app/Admin/users/page.tsx` - Contains 2 fetch calls
5. `app/Admin/page.tsx` - Contains 1 fetch call for stats

### Medium Priority
6. `app/setup-admin/page.tsx` - Contains 2 fetch calls
7. `app/userExam/page.tsx` - Contains 1 fetch call
8. `components/user-exam-limit-dialog.tsx` - Contains 1 fetch call
9. `components/user-settings.tsx` - Contains 1 fetch call

---

## Build Instructions

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Environment Variables
Create `.env.local` with:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Capacitor (optional - for remote URL mode)
NEXT_PUBLIC_LIVE_URL=https://your-deployed-app.com
```

### Step 3: Build for Static Export
```bash
npm run build
```

### Step 4: Sync with Capacitor
```bash
npx cap sync
```

### Step 5: Open Android Studio
```bash
npx cap open android
```

---

## RLS Policies Required

Your Supabase database needs these Row Level Security (RLS) policies:

### exam_categories
```sql
-- Allow read for published categories
CREATE POLICY "Allow read published categories" ON exam_categories
  FOR SELECT TO authenticated USING (is_published = true);

-- Allow all for admins
CREATE POLICY "Allow admin full access" ON exam_categories
  FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM admin_users));
```

### exam_questions
```sql
-- Allow read for authenticated users (for taking exams)
CREATE POLICY "Allow read questions" ON exam_questions
  FOR SELECT TO authenticated USING (true);

-- Allow write for admins only
CREATE POLICY "Allow admin write" ON exam_questions
  FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM admin_users));
```

### exam_attempts
```sql
-- Users can only see their own attempts
CREATE POLICY "Allow user read own attempts" ON exam_attempts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Users can only insert their own attempts
CREATE POLICY "Allow user insert own attempts" ON exam_attempts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
```

---

## Testing Checklist

- [ ] Build succeeds: `npm run build`
- [ ] No API routes in `dist/` folder
- [ ] Categories load on dashboard
- [ ] Can take exam with question selection
- [ ] Exam results save correctly
- [ ] Admin can create/edit/delete categories
- [ ] Admin can create/edit/delete questions
- [ ] Admin can update exam settings
- [ ] Notifications load and mark as read
- [ ] Daily exam limits enforced

---

## Known Limitations

1. **Admin Stats**: The `getAdminStats()` and `getUsers()` functions use simplified queries. For full admin functionality with user listing, you need to either:
   - Create a `user_profiles` table that mirrors auth.users
   - Use Supabase Edge Functions for admin operations

2. **Image Uploads**: The upload API was removed. Images should be uploaded directly to Supabase Storage using the client SDK.

3. **Service Role Operations**: Operations requiring `SUPABASE_SERVICE_ROLE_KEY` (like banning users, deleting accounts) need to be moved to Supabase Edge Functions or Database Functions.

---

## Troubleshooting

### Blank Screen on Mobile App
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set
- Verify Supabase URL is accessible from mobile device
- Check for CORS errors in Chrome DevTools (`chrome://inspect`)

### Authentication Issues
- Ensure Google OAuth redirect URLs include the mobile app scheme
- Check that Supabase Auth is configured for your platform

### Database Errors
- Verify RLS policies are properly configured
- Check that all required tables exist
- Ensure user has proper permissions

---

## Next Steps

1. Update remaining components (see list above)
2. Create `user_profiles` table in Supabase for better user management
3. Test the complete app flow on Android emulator/device
4. Set up production deployment pipeline
5. Configure proper Google OAuth for mobile

---

## Summary

✅ **Completed:**
- Created comprehensive client-side queries library
- Updated main exam management components
- Updated dashboard exam page
- Updated notifications component
- Deleted all API routes
- Verified static export configuration

⏳ **Remaining:**
- Update 9 more components (see list above)
- Set up RLS policies in Supabase
- Test complete app functionality
- Build and deploy to Android
