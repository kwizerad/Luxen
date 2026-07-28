# Luxen — Project Notes

## Build / Verify
- `npm run build` — production build (passes 2026-07-22)
- No test runner configured.

## Admin Portal — Premium Dark Glassmorphism Design (2026-07-22)

The admin portal (`/Admin/*`) uses a dedicated design system scoped under
the `.admin-portal` CSS class in `app/globals.css`. Student-facing pages
are **not** affected.

### Architecture
- **Layout** (`app/Admin/layout.tsx`): no top header. A floating bottom pill
  navbar is the only navigation on all screen sizes (the desktop sidebar was
  also removed). It contains the main admin routes plus a logout action.
- **Dashboard** (`app/Admin/page.tsx`): analytics stat cards with animated
  counters, recharts area chart (traffic), radial pass-rate ring, donut
  distribution chart, recent activity feed, system status, quick actions.
  Uses Framer Motion for staggered fade-up entrance animations.
- **Sub-pages** (users, exams, questions, course-management, course-studio,
  settings, register): `course-management` is a read-only overview of courses
  and `course-studio` is a module/lesson/exam builder for the selected course.
  Both are admin-only.
  Other sub-pages use shadcn `Card`/`Table`/`Button`/`Input`/`Badge`/`Dialog`/
  `DropdownMenu`/`Select`/`Switch`/`Tabs` restyled via scoped CSS overrides
  inside `.admin-portal`.

### Design tokens (CSS custom properties in `.admin-portal`)
- Background: `#0B1020` (dark navy, not pure black)
- Aurora mesh gradient: soft blue/purple/indigo radial gradients, low
  opacity, animated drift (`.admin-aurora`)
- Card: `rgba(255,255,255,0.06)`, blur 20px, radius 22px, hover lift -4px
- Border: `rgba(255,255,255,0.08)`, hover `rgba(255,255,255,0.14)`
- Primary gradient: `linear-gradient(90deg, #2563EB, #6366F1)`
- Text: `#F8FAFC`, Muted: `#94A3B8`
- Success `#22C55E`, Warning `#F59E0B`, Danger `#EF4444`

### Custom CSS classes available
`.admin-card`, `.admin-stat-card`, `.admin-sidebar`, `.admin-sidebar-item`,
`.admin-topbar`, `.admin-btn` (`-primary`/`-secondary`/`-ghost`),
`.admin-table`, `.admin-badge` (`-success`/`-warning`/`-danger`/`-info`/
`-purple`), `.admin-input`, `.admin-skeleton`, `.admin-page-title`,
`.admin-section-title`, `.admin-card-title`, `.admin-shell`, `.admin-content`.

## Admin Data-Source Refactor — Plan (partially implemented)

### Why
Admin pages currently fetch data via `lib/supabase/queries.ts` (marked
`"use client"`), which called `createAdminClient()` (service role key) from
the browser. That was patched on 2026-07-21 with `typeof window` guards so
the browser now falls back to the anon client + RLS. The underlying
architecture still needs to change: admin writes/reads should run on the
server so the service role key is used correctly and auth checks are not
bypassable.

### Course-management / course-studio implementation (2026-07-27)
- Server actions live in `app/Admin/actions/_shared.ts` (`requireAdmin`,
  `getAdminUser`) and `app/Admin/actions/courses.ts` (CRUD for courses,
  modules, lessons, module-exam settings, module-exam questions).
- `hooks/use-course-studio.ts` uses SWR for caching, debounced autosave,
  and Supabase real-time subscriptions for multi-admin sync.
- `lib/course-storage.ts` uploads course assets to the `course-assets`
  bucket via signed URLs.
- `app/Admin/course-management/page.tsx` and `app/dashboard/course/page.tsx`
  read from Supabase instead of localStorage.
- `supabase/migrations/update_module_exams_schema.sql` adds soft deletes,
  status columns, indexes, triggers, RLS policies, and the `course-assets`
  storage bucket.
- `lib/database.types.ts` and `lib/courses-store.ts` carry DB-aligned types
  plus DB<->UI transform helpers.

### Remaining refactor work
- Move `getAdminStats` → `app/Admin/actions/stats.ts`.
- Move user CRUD → `app/Admin/actions/users.ts`.
- Move exam-category/question CRUD → `app/Admin/actions/exams.ts` and
  `app/Admin/actions/questions.ts`.
- Remove `lib/supabase/queries.ts` `"use client"` and `typeof window` guards
  once all server calls are moved.

## Feature History
- **Course Management removed (2026-07-26)**: Admin course authoring,
  student course catalog/module/lesson pages, course-related API routes,
  progress tables, and course-language settings were removed from the
  codebase. The database migrations remain in Supabase but are no longer
  referenced by the app.
- **Course Management page added (2026-07-26)**: A standalone admin page at
  `/Admin/course-management` was created using local React state only (no
  backend). It provides a table of courses with status filtering.
- **Course Studio page added (2026-07-26)**: A standalone admin page at
  `/Admin/course-studio` for building modules and lessons inside a course.
  Uses local React state only; includes course selection sidebar, module/lesson
  CRUD, status toggles, and reordering.
- **Student course catalog added (2026-07-26)**: `/dashboard/course` lists
  published courses whose `language` matches the student's selected language.
- **Languages restricted (2026-07-26)**: Arabic support removed. The app now
  supports only English, French, and Kinyarwanda.
- **Fixed three courses (2026-07-26)**: The course catalog is limited to exactly
  three courses — English, Kinyarwanda, and French.
  The courses start with empty modules.
- **Course registration restored (2026-07-27)**: Admins can register new courses
  from `/Admin/course-management`. The unique constraint on
  `course_languages.language` was removed so multiple courses can share a
  language. Course Studio remains for editing modules/lessons; it does not have
  course registration.
- **Course Management backend integration (2026-07-27)**: course-management
  and course-studio now persist to Supabase via server actions with SWR caching,
  real-time sync, and Supabase Storage for assets. Course Studio uses an explicit
  Save button with dirty-state detection and unsaved-changes guards when switching
  items or closing the tab.
- **Rich content editor & enhanced exam builder (2026-07-27)**: Course Studio
  uses a Tiptap-based editor (formatting, headings, lists, tables, task lists,
  links, images, YouTube, drag-and-drop image upload, slash commands, image
  resizing, and a floating image toolbar). Exam Studio supports multiple choice,
  multiple select, true/false, matching, and short answer questions with tags,
  partial scoring, validation indicators, collapsible blocks, preview, and
  drag-and-drop reordering. All content is persisted to Supabase as Tiptap JSON
  or question metadata.

## Google One Tap — Notes
- `app/page.tsx` uses `<GoogleOneTap alwaysPrompt />` — bypasses the
  client-side dismissal cooldown and retries on Google transient skips.
- Other pages (`/auth/login`, `/auth/sign-up`) use `<GoogleOneTap />`
  without `alwaysPrompt` — they respect the 30-min dismissal cooldown.
- Authorized JavaScript origins must include `http://localhost:3000`
  (dev) and the production origin in Google Cloud Console.
