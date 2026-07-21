# Luxen — Project Notes

## Build / Verify
- `npm run build` — production build (passes 2026-07-21)
- No test runner configured.

## Admin Data-Source Refactor — Plan (not yet implemented)

### Why
Admin pages currently fetch data via `lib/supabase/queries.ts` (marked
`"use client"`), which called `createAdminClient()` (service role key) from
the browser. That was patched on 2026-07-21 with `typeof window` guards so
the browser now falls back to the anon client + RLS. The underlying
architecture still needs to change: admin writes/reads should run on the
server so the service role key is used correctly and auth checks are not
bypassable.

### Target architecture
```
app/Admin/actions/
  _shared.ts        # requireAdmin(), getAdminUser() helpers
  stats.ts          # getAdminStats
  users.ts          # listUsers, banUser, deleteUser, bulkBan, bulkDelete
  exams.ts          # listCategories, create/update/deleteCategory, listQuestions
  questions.ts      # create/update/deleteQuestion
  courses.ts        # listLanguages, listModules, listLessons, reorder
hooks/admin/
  useAdminUsers.ts
  useAdminExams.ts
  useAdminCourses.ts
  useAdminStats.ts
types/admin.ts      # AdminUser, ExamCategory, ExamQuestion, CourseModule, ...
```

### Migration order (courses first — chosen 2026-07-21)
1. **Shared foundation**
   - Create `types/admin.ts` with typed interfaces for all admin entities.
   - Create `app/Admin/actions/_shared.ts`:
     - `requireAdmin()` — server-side, reads the user from cookies,
       throws if not admin.
     - `getAdminUser()` — returns the authenticated admin user or null.
   - No behavior change yet.

2. **Courses domain (proof of concept)**
   - Create `app/Admin/actions/courses.ts` (`"use server"`):
     - `listCourseLanguages()`, `listCourseModules(languageId)`,
       `listCourseLessons(moduleId)`, `reorderModules()`,
       `reorderLessons()`, `createLanguage()`, `createModule()`,
       `createLesson()`, `updateLanguage()`, `updateModule()`,
       `updateLesson()`, `deleteLanguage()`, `deleteModule()`,
       `deleteLesson()`.
     - Each calls `requireAdmin()` then uses `createAdminClient()`
       (server-only, safe).
   - Create `hooks/admin/useAdminCourses.ts` — SWR wrapper:
     `useCourseLanguages()`, `useCourseModules(languageId)`, etc.
   - Rewrite `app/Admin/course-management/page.tsx` to call the new
     actions/hooks instead of `createClient()` directly.
   - Delete the course functions from `lib/supabase/queries.ts`:
     `getCourseLanguages`, `getCourseModules`, `getCourseLessons`,
     `getModuleExamSettings`, `getModuleExamQuestions`,
     `getStudentModuleProgress`, `getStudentLessonProgress`,
     `markLessonComplete`, `createModuleExamAttempt`,
     `getModuleExamAttempts`, `getModuleExamForTaking`.
   - Update `app/dashboard/course/page.tsx` and
     `app/dashboard/course/[moduleId]/exam/page.tsx` to use the new
     hooks/actions (these are student-facing but share the same query
     functions — split student reads into a separate student actions
     file if needed, or reuse with a `requireUser()` helper).
   - Verify build + manual test of admin course management.

3. **Stats domain**
   - Move `getAdminStats` → `app/Admin/actions/stats.ts`.
   - Wire `app/Admin/page.tsx` to the new action.
   - Delete `getAdminStats` from `queries.ts`.

4. **Users domain**
   - Move `getUsers`, `updateExamLimit`, `deleteExamLimit` →
     `app/Admin/actions/users.ts`.
   - Wire `app/Admin/users/page.tsx` and
     `components/user-exam-limit-dialog.tsx` to the new actions.
   - Delete from `queries.ts`.

5. **Exams / questions domain**
   - Move exam category + question CRUD → `app/Admin/actions/exams.ts`
     and `app/Admin/actions/questions.ts`.
   - Wire `app/Admin/exams/page.tsx` and `app/Admin/questions/page.tsx`.
   - Delete from `queries.ts`.

6. **Cleanup**
   - Remove `"use client"` from `queries.ts` (or delete the file if all
     functions have been moved).
   - Remove the `typeof window` guards added on 2026-07-21 (no longer
     needed once all `createAdminClient` calls are server-side).
   - Audit RLS policies: ensure admin reads/writes work via the service
     role on the server, and student reads work via the anon client +
     RLS.

### Decisions to make before implementing
- **SWR vs TanStack Query vs plain hooks**: SWR is lighter (~5KB) and
  sufficient for admin (mostly reads + occasional mutations). TanStack
  Query adds optimistic updates + devtools (~50KB). Recommendation: SWR.
- **Student-facing course pages**: they share query functions with
  admin. Decide whether to (a) split into `app/dashboard/actions/` for
  students, or (b) keep one `courses.ts` action file with role-based
  branching inside each action. Recommendation: (b) — one file, branch
  on role, simpler.
- **API routes vs server actions**: server actions are simpler
  (no manual JSON parsing, automatic RPC). Keep existing
  `app/api/*` routes for now; new code uses server actions. Migrate
  existing routes opportunistically.

### Bug found during audit (not yet fixed)
- `getUsers` in `queries.ts` line ~1331 has a dead ternary:
  `.eq(type === "admins" ? "role" : "role", ...)` — both branches are
  `"role"`. Should be simplified to `.eq("role", ...)`.

## Google One Tap — Notes
- `app/page.tsx` uses `<GoogleOneTap alwaysPrompt />` — bypasses the
  client-side dismissal cooldown and retries on Google transient skips.
- Other pages (`/auth/login`, `/auth/sign-up`) use `<GoogleOneTap />`
  without `alwaysPrompt` — they respect the 30-min dismissal cooldown.
- Authorized JavaScript origins must include `http://localhost:3000`
  (dev) and the production origin in Google Cloud Console.
