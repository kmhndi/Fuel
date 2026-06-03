# Fuel ⚡

A private, on-device app to track my calories, macros, supplements and more —
built for myself, not for the public. No account, no cloud, no tracking.
Bilingual (English / العربية) with a deep-indigo "glass" interface.

---

## Features

### Calories & macros
- **Animated calorie ring** showing how much you have left (or how far over),
  on a frosted-glass hero card.
- **Macros** — protein, carbs, fat, plus **fiber, sugar and net carbs**. Enter
  macros and calories auto-estimate (4/4/9).
- **Meal categories** — Breakfast / Lunch / Dinner / Snacks by default, each
  with a subtotal, and you can **add your own** categories with icons.
- **Food library** — anything you log is saved for **one-tap re-adding**, sorted
  by favorites & recency. Manage/search/star/delete saved foods.
- **Custom quick-add presets** for your go-to foods.
- **Fast logging** — quick-calories (no name), copy yesterday's meals, duplicate
  a meal, optional per-meal **notes** and **tags**, edit/delete, and **navigate
  to any past day**.
- **Global search** across everything you've ever logged (name / note / tag).

### Energy balance
- Honest **eaten vs burned → daily deficit / surplus**, not just a goal.
- Log **exercise** (calories add to what you burned).
- Optional **resting burn (RMR)** — entered or estimated from your profile.
- Built-in **TDEE goal calculator** — Mifflin-St Jeor, or **Katch-McArdle** when
  you add body-fat %. Choose a goal and a **weekly pace** (gentle / standard /
  aggressive), and it suggests **calories + macros** (protein scaled to your
  bodyweight) in an **editable confirmation step** before applying as your goal.
- **Per-weekday calorie goals** (training vs rest days).

### Hydration, caffeine, body
- **Water** tracking with a daily glass goal + optional reminder notifications.
- **Caffeine** tracking against a daily limit.
- **Weight** with a trend chart, **goal weight + ETA projection**, **body
  measurements** (waist, body-fat %), and **kg/lb** units.

### Supplements
- Daily **checklist** with tap-to-take and 🔥 **streaks**.
- **Reminders** via local notifications — custom times, specific weekdays, or
  twice-daily; per-supplement on/off.
- **Inventory** (doses left + refill warning), **mark all taken**, edit, and
  adherence tracking.

### Insights & motivation
- **Trends** tab: 7 / 14 / 30-day calorie chart with goal line + 7-day moving
  average, daily averages, on-target days, protein/water, and supplement
  adherence.
- **Calendar heatmap** of logged & on-target days.
- **Achievements** / badges, logging streaks, a "what to eat" remaining helper,
  daily **mood & energy** check-in, and a goal-met **confetti** celebration.

### Personal & private
- **Guided setup** — an animated, tap-to-answer onboarding wizard (language,
  sex, goal, activity, your stats, pace) that builds your calorie + macro
  targets for you, then lets you fine-tune them before you start.
- **Light / dark theme** + a choice of **accent color** (the home-screen app
  icon switches to match).
- **Backup / restore** your data as a file; share a daily **summary card**.
- **Bilingual** UI (English / Arabic) with full RTL.
- Everything is stored locally in **SQLite** — no account, no servers, no
  analytics. One-tap **clear all data** in Settings.

---

## Tech
- [Expo](https://expo.dev/) **SDK 54** + React Native (TypeScript), file-based
  routing via [Expo Router](https://docs.expo.dev/router/introduction/)
- Local storage: [`expo-sqlite`](https://docs.expo.dev/versions/latest/sdk/sqlite/)
  with versioned migrations
- Local notifications: [`expo-notifications`](https://docs.expo.dev/versions/latest/sdk/notifications/)
- UI: `react-native-svg` (ring/charts), `expo-blur` + `expo-linear-gradient`
  (glass + gradient), haptics, `expo-alternate-app-icons`
- Backup/share: `expo-file-system`, `expo-sharing`, `expo-document-picker`,
  `react-native-view-shot`
- Custom lightweight i18n (English / Arabic)

## Project structure
```
app/                      # Screens (Expo Router)
  _layout.tsx             # Root: DB init, providers, gradient backdrop, modal routes
  (tabs)/                 # Tab bar (glass bubble): Today, Supplements, Trends, More
  add-meal / add-supplement / add-exercise / checkin / share-day   # modals
  settings / goal-calculator / weekday-goals / weight / food-library
  meal-search / calendar / achievements / presets / categories / onboarding
src/
  db/                     # SQLite + migrations + queries: meals, foods,
                          #   supplements, water, weights, exercise, caffeine,
                          #   checkins, measurements, presets, categories,
                          #   settings, backup, achievements, dates
  notifications/          # Permissions, channel, reminder scheduling
  i18n/                   # Translations (en/ar) + useT() + RTL
  state/                  # Goals context
  components/             # ScreenBackground, ProgressRing, MacroBars,
                          #   WaterCard, CaffeineCard, Celebration, UI kit
  theme.ts  health.ts  nutrition.ts  stats.ts  haptics.ts  backup.ts  types.ts
scripts/gen-icons.mjs     # Generate the bolt app icon in each accent (sharp)
scripts/bump-build.mjs    # Bump iOS/Android build numbers
```

## Getting started
Requires **Node ≥ 20.19.4** (Expo SDK 54 / RN 0.81 use Node 20+ APIs).
```bash
npm install
npx expo start
```
The blur/gradient and notifications need a **dev build** (not Expo Go) on a real
device or simulator:
```bash
npx expo prebuild --clean
npx expo run:ios            # or: npm run ios
```

## Scripts
- `npm start` — Expo dev server
- `npm run ios` / `npm run android` — build & run a dev build
- `npm run typecheck` — `tsc --noEmit`
- `npm run bump` — increment iOS/Android build numbers before a store upload
