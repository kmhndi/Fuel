# Fuel ⚡

A simple, private app to track my daily calories and remind me to take my
supplements. Built for myself, not for the public.

## What it does

### Calorie & macro tracking
- A daily **calorie budget** shown as an animated progress ring — see at a
  glance how much you have left (or how far over you are).
- **Macros** (protein / carbs / fat) tracked against goals, with a calorie
  estimate auto-filled from the macros you enter.
- Meals are grouped by **Breakfast / Lunch / Dinner / Snacks**, each with its
  own subtotal.
- A **food library**: anything you log becomes a one-tap quick-add next time,
  sorted by favorites and recency. Star the ones you eat often.
- **Edit** any entry, **delete** with a long-press, and **navigate to any past
  day** to review or back-fill.

### Supplements
- A daily **checklist** — tap to check off each supplement and build a
  **streak** 🔥.
- Per-supplement **daily reminders** via local notifications, each with its own
  on/off bell.
- A progress bar showing how many you've taken today.

### History & trends
- 14-day **calorie chart** with a goal reference line (bars turn amber when you
  go over).
- Daily-average calories, days on target, average protein, and **supplement
  adherence %**.

### Private by design
- Everything lives on the device in **SQLite** — no account, no cloud, no
  tracking. A one-tap "clear all data" lives in Settings.

## Tech
- [Expo](https://expo.dev/) SDK 52 + React Native (TypeScript), file-based
  routing via [Expo Router](https://docs.expo.dev/router/introduction/)
- Local storage via [`expo-sqlite`](https://docs.expo.dev/versions/latest/sdk/sqlite/)
  with versioned migrations
- Local notifications via [`expo-notifications`](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [`react-native-svg`](https://github.com/software-mansion/react-native-svg)
  for the calorie ring, plus haptic feedback

## Project structure
```
app/                  # Screens (Expo Router)
  _layout.tsx         # Root: DB init, notifications, goals provider, modals
  (tabs)/             # Tab bar: Today, Supplements, History
  add-meal.tsx        # Modal: add/edit a meal, macros, food-library search
  add-supplement.tsx  # Modal: add a supplement + pick reminder time
  settings.tsx        # Modal: goals, notifications, clear data
src/
  db/                 # SQLite connection, migrations, queries (meals, foods,
                      #   supplements, settings) and date helpers
  notifications/      # Permissions, Android channel, scheduling reminders
  state/              # Goals context shared across tabs
  components/         # ProgressRing, MacroBars, shared UI kit
  nutrition.ts        # Macro math, colors, meal-type metadata
  theme.ts            # Colors, spacing, typography
  types.ts            # Domain types
```

## Getting started
```bash
npm install
npx expo start
```
Then open in [Expo Go](https://expo.dev/go) or a dev build. Notifications need
a physical device — they don't fire on simulators/emulators.

## Scripts
- `npm start` — start the Expo dev server
- `npm run typecheck` — TypeScript check (`tsc --noEmit`)
