# BLINK Walk Page Auth-Gate Bug

**User complaint:** "The virtually walk there button isn't working.. it just refreshes the page"

## Root cause (confirmed)

In `src/app/gift/[short_code]/walk/WalkClient.tsx`, line 287–288:

```ts
useEffect(() => {
  if (!authLoading && !user) router.replace(`/gift/${code}`);
}, [authLoading, user, router, code]);
```

When an unauthenticated visitor clicks "Virtually Walk There" on a gift link, this effect fires and **silently bounces them back to `/gift/{code}`** — looks exactly like a page refresh. This is wrong: gift recipients should be able to virtually walk to a gift WITHOUT signing in first. They only need an account at the actual claim moment.

This breaks the whole point of a shareable gift link.

## What to do

### 1. Remove the auth redirect at mount

Delete or rewrite the `useEffect` at lines 286–289. Don't redirect on missing user.

### 2. Allow anonymous walking, defer auth to claim time

- The user should be able to:
  - Land on `/gift/{code}/walk` without an account
  - See the opening cinematic
  - Steer the avatar with the joystick
  - Approach the spawn point
- At the **catch moment** (when user reaches the gift within `CATCH_RADIUS_M`), the WalkClient already has a catch flow that calls the claim API. THAT's where the auth requirement belongs.

### 3. Update the catch handler

Find the catch handler (where the user reaches the gift). When `!user`:
- Open the existing `AuthModal` (we already have one — `src/components/AuthModal.tsx`)
- Or push to `/auth/signin?next=/gift/{code}/walk&action=claim` if the auth modal isn't available in walk context
- After signup, complete the claim and animate the capture

If signup/wallet creation is too disruptive at the catch moment, the simplest UX:
- Pause the catch (show "Sign in to claim" overlay)
- Sign in inline OR redirect to `/auth/signin?next=/gift/{code}/walk?stage=catch`
- Resume catch animation after auth

### 4. Other places that read `user` in WalkClient

There are subscriptions and presence-tracking calls that use `user.id` (lines 292, 299, 313, 328, 340). Audit each — these should:
- Skip entirely if `!user` (don't crash, don't subscribe)
- Only run after auth is established at catch time
- Wrap each `if (!user) return` early-exit, no redirect

### 5. The landing page (GiftLandingClient) auth flow

Check `src/app/gift/[short_code]/GiftLandingClient.tsx` for a parallel auth-gate. If the user has to sign in BEFORE seeing the landing page, that's another problem. Looking at the screenshot, the user CAN see the landing ("A Spirit Gift Awaits", "Walk to your gift", "Virtually Walk There" button), so the landing is anonymous-friendly. Confirm by reading the file — if it's anon-friendly, leave it alone. If it requires auth, mirror the same fix (defer auth to claim).

## Acceptance

- Tap "Virtually Walk There" while signed OUT → page navigates to `/gift/{code}/walk` and the walk experience starts (cinematic, joystick, avatar)
- Joystick works, avatar moves, can approach the gift
- At the catch moment (within 5m of spawn), if not signed in → AuthModal opens (or redirect to signin with return-to-walk path)
- After signing in → claim completes, capture animation plays, gift is awarded
- Signed-in users continue to work exactly as before — no regression
- `npm run build` green, `npx tsc --noEmit` clean on touched files
- Commit: `fix(walk): allow anonymous virtual-walk; defer auth to claim`
- Deploy `vercel --prod` and confirm by opening an incognito tab to a gift link and clicking Virtually Walk There.

## Hard rules
- No Tailwind, inline styles only
- Don't break the joystick, perf wins, map declutter, or any other recent work
- Mainnet contracts LIVE — only touch UI logic
