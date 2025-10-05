# Motivate (Web)

A clean Next.js + Tailwind + Firebase starter for your Motivate app: login, vertical one-at-a-time video feed, saved grid, and admin upload.

## Quick Start

1. **Install deps**
   ```bash
   pnpm install   # or npm i / yarn
   ```

2. **Configure Firebase**
   - Create a Firebase project (Auth (Email/Password), Firestore, Storage).
   - Copy `.env.local.example` to `.env.local` and fill values.
   - Add your admin email(s) to `NEXT_PUBLIC_ADMIN_EMAILS` (comma separated).

3. **Run dev**
   ```bash
   pnpm dev
   ```

4. **Add videos**
   - Go to `/admin` (must be logged in with an admin email).
   - Upload MP4/MOV files — they are stored in Firebase Storage; metadata saved in Firestore under `videos` collection:
     ```json
     { "url": "https://...", "title": "My Clip", "hashtags": [], "createdAt": <serverTimestamp> }
     ```

## Collections

- `videos`: public video docs
- `users/{uid}/likes/{videoId}`
- `users/{uid}/saved/{videoId}`

## Notes

- Feed uses CSS snap + IntersectionObserver to ensure only the centered video plays (others pause).
- Like/Save buttons animate and stay "glowing" when active; haptics via `navigator.vibrate` when available.
- Saved page shows a 3xN grid ordered by most recent save; clicking a tile navigates to the feed (you can extend to jump to that video id).

## Roadmap to your previous asks

- 🔐 Login page styling: black inputs, green primary button (done).
- ⏯️ One-at-a-time playback with loading indicator (done).
- 💾 Saved grid 3x5 paging (base done; extend with pagination as desired).
- 🗑️ Admin delete & "Not for me" hide (todo).
- 🧠 Whisper transcription, speaker/tone detection, auto hashtags/categories (todo).
- 🔁 Background loops pool per page (optional to add later).

---

Made to be copy‑paste friendly. Enjoy!


## Single home / no duplicates

This project uses the **App Router** and has exactly one landing flow:
- `/` (app/page.tsx) is a tiny client redirector:
  - If logged in → `/mainmenu`
  - If logged out → `/login`
- The main feed is only at `/mainmenu`.
- Do **not** add a `pages/` directory or `pages/index.*`—that would cause two homepages.

If you are migrating from an older repo that used the Pages Router, delete any `pages/` folder (or at least its `index.js`) to avoid confusion.
