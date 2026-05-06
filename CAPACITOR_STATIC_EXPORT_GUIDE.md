# Capacitor Static Export Guide

## ⚠️ CRITICAL LIMITATION: API Routes

When using `output: 'export'` for Capacitor, **all API routes in `app/api/` are disabled**. 
This is because static export generates only HTML/JS/CSS files - no server-side code runs.

## What This Means

Your app uses these API routes that **will not work** in the mobile app:
- `/api/exam/questions` - Managing exam questions
- `/api/exam/attempts` - Saving exam results
- `/api/exam/categories` - Loading exam categories
- `/api/exam/settings` - Exam configuration
- `/api/exam/take` - Taking exams
- `/api/exam/limits` - Daily limits
- `/api/notifications` - Push notifications
- `/api/users` - User management
- `/api/setup-admin` - Admin setup
- `/auth/callback` - OAuth callbacks

## Solutions

### Option 1: Use Deployed Backend (Recommended)

Set `NEXT_PUBLIC_LIVE_URL` to your deployed web app URL:

```env
NEXT_PUBLIC_LIVE_URL=https://your-app.vercel.app
```

The mobile app will load the web content from this URL, and all API calls will work.

**Pros:**
- Full functionality
- Real-time data sync
- Works immediately

**Cons:**
- Requires internet connection
- Slower initial load

### Option 2: Convert APIs to Client-Side

Move API logic directly into components using Supabase client-side:

**Before (API route):**
```typescript
// app/api/exam/categories/route.ts
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from("exam_categories").select("*");
  return NextResponse.json({ categories: data });
}
```

**After (Client-side):**
```typescript
// In your component
const loadCategories = async () => {
  const supabase = createClient(); // browser client
  const { data } = await supabase.from("exam_categories").select("*");
  setCategories(data);
};
```

### Option 3: Hybrid Approach (Best for Offline Support)

Use a combination:
1. **Deploy backend** for admin features (managing questions, users)
2. **Client-side Supabase** for user features (taking exams, viewing results)
3. **LocalStorage** for offline caching

## Build Commands

```bash
# 1. Standard web build (for deployment)
npm run build

# 2. Build for Capacitor (static export)
npm run build

# 3. Sync to Android
npx cap sync

# 4. Open Android Studio
npx cap open android
```

## Testing Locally on Mobile Device

1. Find your computer's IP:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. Start Next.js dev server with host:
   ```bash
   npm run dev -- --host
   ```

3. Set in `.env.local`:
   ```env
   NEXT_PUBLIC_LIVE_URL=http://192.168.1.100:3000
   ```

4. Build and sync:
   ```bash
   npm run build && npx cap sync
   ```

## Environment Variables Checklist

Before building for Capacitor, ensure these are set in `.env.local`:

```env
# Required for Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Required for Google Sign-In
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id

# Required for Capacitor mobile app
NEXT_PUBLIC_LIVE_URL=https://your-deployed-url
```

## Common Blank Screen Causes

1. **Missing `NEXT_PUBLIC_LIVE_URL`** - App tries to load from empty URL
2. **API calls failing** - Check Network tab in Chrome DevTools (WebView)
3. **CORS errors** - Supabase must allow your mobile app origin
4. **Missing `output: 'export'`** - Build output not compatible
5. **Wrong `webDir`** - Capacitor looking in wrong folder

## Debugging Capacitor WebView

1. Open Android Studio
2. Run app on emulator or device
3. Open Chrome browser
4. Navigate to: `chrome://inspect/#devices`
5. Click "Inspect" on your app
6. Check Console for errors

## Capacitor-Specific Files Changed

- `next.config.ts` - Added `output: 'export'`, `distDir: 'dist'`, `trailingSlash: true`
- `capacitor.config.ts` - Updated server URL configuration
- `.env.example` - Added `NEXT_PUBLIC_LIVE_URL`

## Next Steps

1. **For immediate testing**: Deploy to Vercel/Netlify, set `NEXT_PUBLIC_LIVE_URL`
2. **For offline support**: Gradually convert API routes to client-side
3. **For production**: Consider using Ionic React or native modules for better mobile UX
