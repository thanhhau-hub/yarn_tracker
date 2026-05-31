# 🧵 Yarn Tracker — MVP

A factory floor yarn position tracking app built with **React Native Expo** and **Supabase**.
Replaces the physical whiteboard with a live digital board visible on any phone.

---

## Quick Start

### 1. Set Up Supabase (5 minutes)
1. Go to [supabase.com](https://supabase.com) and create a **free project**
2. Go to **SQL Editor** → paste and run the contents of [`supabase/setup.sql`](./supabase/setup.sql)
3. Go to **Project Settings → API** → copy your **Project URL** and **anon public key**

### 2. Configure Environment Variables
Edit the `.env` file in this folder:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Add Factory Workers
1. Go to Supabase Dashboard → **Authentication → Users**
2. Click **"Invite user"** and enter the worker's email
3. They receive an email to set their password

### 4. Run the App
```bash
npm start
```
Scan the QR code with **Expo Go** (install from App Store / Play Store) on your phone.

---

## Project Structure

```
yarn-tracker/
├── app/                    # All screens (file-based routing)
│   ├── _layout.tsx         # Auth gate + navigation root
│   ├── login.tsx           # Login screen
│   ├── (tabs)/             # Bottom tab screens
│   │   ├── _layout.tsx     # Tab bar configuration
│   │   ├── index.tsx       # 🏠 Board View (home)
│   │   ├── search.tsx      # 🔍 Search yarn by code
│   │   └── add.tsx         # ➕ Add new yarn roll
│   ├── area/[id].tsx       # Area detail (yarn list)
│   ├── yarn/[id].tsx       # Yarn movement history
│   └── move/[id].tsx       # Move yarn to new area
│
├── lib/
│   └── supabase.ts         # ← Supabase client (import this everywhere)
│
├── hooks/
│   ├── useBoard.ts         # Board data + real-time subscription
│   ├── useArea.ts          # Yarn rolls in one area
│   └── useYarn.ts          # Single yarn + movement history
│
├── types/
│   └── index.ts            # TypeScript types for Area, YarnRoll, MoveLog
│
├── supabase/
│   └── setup.sql           # ← Run this in Supabase SQL Editor first!
│
└── .env                    # ← Your Supabase credentials (never commit this!)
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `areas` | Storage zones (A1.1, A1.2, ...) — pre-filled once |
| `yarn_rolls` | All yarn rolls + their current area (`area_id`) |
| `move_logs` | Audit trail — one row per move, never deleted |

---

## App Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| Board View | `/` | Grid of all areas with yarn count |
| Search | `/search` | Find yarn by code |
| Add Yarn | `/add` | Register a new yarn roll |
| Area Detail | `/area/[id]` | See yarns inside one area |
| Yarn History | `/yarn/[id]` | Full movement timeline |
| Move Yarn | `/move/[id]` | Relocate yarn to another area |

---

## Development Order (Recommended)

1. ✅ Run `supabase/setup.sql` in Supabase
2. ✅ Fill in `.env` with your credentials
3. ✅ Test login screen works
4. ✅ Test Board View shows your areas
5. ✅ Add a yarn roll via the Add screen
6. ✅ Move it via Area Detail → Move screen
7. ✅ Verify history appears on Yarn History screen
8. ✅ Test on two phones simultaneously (real-time sync)

---

## Key npm Packages

| Package | What it does |
|---------|-------------|
| `@supabase/supabase-js` | Database, auth, real-time |
| `@react-native-async-storage/async-storage` | Persists login session |
| `expo-router` | File-based navigation |
| `expo-barcode-scanner` | Scan yarn labels (V1.1) |

---

## Common Issues

**"No areas found" on Board screen**
→ Make sure you ran `supabase/setup.sql` in the Supabase SQL Editor.

**Login fails immediately**
→ Check your `.env` file — copy the URL and anon key exactly from Supabase dashboard.

**Real-time not working**
→ In Supabase: Database → Replication → confirm `yarn_rolls` is in `supabase_realtime`.

**App shows white screen**
→ Run `npm start -- --clear` to clear the Expo cache.
