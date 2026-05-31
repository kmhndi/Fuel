# Fuel ⚡

A simple, private app to track my daily calories and remind me to take my
supplements. Built for myself, not for the public.

## What it does
- **Calorie tracking** — quickly log meals (with quick-add presets) and see
  daily totals.
- **Supplement reminders** — schedule supplements and get local notifications
  when it's time to take them, with per-supplement on/off toggles.
- **History & trends** — a 14-day bar chart and daily average.
- **On-device & private** — data lives on the phone in SQLite, no account
  required.

## Roadmap
- [x] Calorie logging (quick-add foods, daily totals)
- [x] Supplement schedule + local notifications
- [x] History & simple trends
- [ ] 🤖 AI features (natural-language food entry, photo calorie estimates, insights)

## Tech
- [Expo](https://expo.dev/) SDK 52 + React Native (TypeScript), file-based
  routing via [Expo Router](https://docs.expo.dev/router/introduction/)
- Local storage via [`expo-sqlite`](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- Local notifications via [`expo-notifications`](https://docs.expo.dev/versions/latest/sdk/notifications/)

## Project structure
```
app/                  # Screens (Expo Router)
  _layout.tsx         # Root: DB init + notification setup, modal routes
  (tabs)/             # Tab bar: Today, Supplements, History
  add-meal.tsx        # Modal: quick-add a meal
  add-supplement.tsx  # Modal: add a supplement + pick reminder time
src/
  db/                 # SQLite connection, migrations, meal/supplement queries
  notifications/      # Permissions, Android channel, scheduling reminders
  components/         # Shared UI (Card, buttons, empty states)
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
