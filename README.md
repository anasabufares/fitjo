# FitJo — Gyms of Jordan (Prototype)

A clickable prototype of your gym-finder app for Amman, Jordan. This is **Phase 1**:
the gym directory with search, filters, favorites, Arabic/English, themes and currencies.
It uses **sample data** and needs **no installation**.

---

## 📂 Project layout

```
public/            ← the website Netlify serves
  index.html       APP page
  manifest.json    installable-app settings
  css/             styles.css        (shared theme)
  js/              data.js (shared), app.js, auth.js, plan.js   (APP only)
  icons/           app icons
  admin/           ← ADMIN dashboard, self-contained (open at /admin/)
    index.html     the dashboard
    admin.css      admin-only styles
    admin.js       admin-only logic
netlify/functions/
  gyms.mjs         ← the cloud gym store (GET/POST /api/gyms)
package.json       ← the function's dependency (@netlify/blobs)
netlify.toml       ← publishes public/ and wires up the function
tools/             ← optional local preview only (NOT deployed)
  server.ps1, phone-preview.ps1
```

## ▶️ How to open it

**Easiest way:** double-click `public/index.html`. It opens in your web browser. That's it.

**Nicer way (runs on a local address, for previewing the app):**
1. Right-click inside this project folder → "Open in Terminal" (or open PowerShell here).
2. Paste this and press Enter:
   ```
   powershell -ExecutionPolicy Bypass -File tools/server.ps1
   ```
3. Open your browser to **http://localhost:8080**
4. To stop it, press `Ctrl + C` in the terminal.

---

## 📱 Add it to your phone like an app (no app store)

1. Run `tools/phone-preview.ps1` on your PC and open the address it shows on your phone's browser.
2. **iPhone (Safari):** tap **Share** → **Add to Home Screen** → **Add**.
   **Android (Chrome):** tap **⋮** menu → **Add to Home screen / Install app**.
3. A **FitJo** icon appears on your home screen and opens full-screen like a real app.

This is a *preview* app (an installable web app). A real App Store / Google Play app is a later phase.

---

## ✅ What works in this prototype

- **Gym directory** — 8 sample Amman gyms with photos (colored covers), ratings and reviews.
- **Search** — by gym name or area.
- **Filters** — area, facilities, pool / no pool, **open 24/7**, access (mixed / women / men), minimum age, max monthly price, and sorting. The panel **collapses** (tap "Filters") and shows a badge of how many filters are active — collapsed by default on phones so you see gyms first.
- **Live occupancy** — each gym shows a "Right now: Quiet / Moderate / Busy" indicator that changes with the time of day.
- **Reviews** — sample member reviews with star ratings on each gym.
- **Class schedule** — a weekly timetable on gyms that run classes.
- **Compare gyms** — pick up to 3 gyms and compare them side-by-side (price, pool, 24/7, rating, access, facilities).
- **Weight & progress tracker** — in your profile: log your weight, see a chart and your start → current change.
- **Personalized plan (subscription)** — fill a short form (height, weight, goal, days/week, activity, gym time, diet) and the app builds:
  - a **goal-based workout split** with exercises, sets & reps,
  - a **meal plan** and daily **calorie + protein/carb/fat** targets,
  - **water intake**, **suggested supplements**, and a **weekly gym schedule** (when to train, when to rest),
  - **gym & rest-day reminders** with times (desktop notification while the app is open).
  Change any answer and the whole plan regenerates.
- **Favorites** — tap the ♥ heart to save a gym; see them under the "Favorites" tab (saved in your browser).
- **Gym details** — opening hours, women's & men's pool times, full facilities, personal trainers with per-session prices, and membership plans.
- **Payment explainer** — the "Subscribe" button shows how the pay-us-then-we-pay-the-gym flow will work.
- **Languages** — English + Arabic with full right-to-left layout (tap العربية / EN top-right).
- **Themes** — light / dark toggle + accent color swatches.
- **Currencies** — JOD, USD, EUR, SAR, KWD, QAR (prices convert live).
- **Accounts** — sign up / sign in, "Continue with Google", and a full profile:
  - Profile: name, **age** (required at sign-up), gender, city, fitness goal, avatar.
  - Security: change password, **two-factor authentication** with an authenticator-app QR + recovery codes, and passkeys.
  - Change email, **privacy settings** (public profile, who sees your gyms, trainer contact, data use).
  - Notification preferences, theme/language/currency preferences, and delete account.
  - Signing up is required before "Subscribe". *(Accounts are stored in your browser for the demo.)*

## 🚧 Shown as "coming soon" (next build phases)

Weight tracking · goal-based workout plans · AI calorie tracker (photo → nutrients) ·
real in-app payments & digital membership pass.

---

## 📁 Files

| File | What it is |
|------|-----------|
| `public/index.html` | The page structure. |
| `public/css/styles.css` | All the styling and themes. |
| `public/js/data.js` | **The content** — edit gyms, prices, hours, trainers here. |
| `public/js/app.js` | The app logic (search, filters, favorites, translations). |
| `public/js/auth.js` | Accounts: sign in/up, Google, profile, 2FA, privacy, settings. |
| `public/js/plan.js` | Personalized plan: intake form, workouts, meals, water, supplements, reminders. |
| `public/admin/` (`index.html` · `admin.js` · `admin.css`) | **Admin dashboard** — add / edit / remove gyms (live, cloud-saved). |
| `netlify/functions/gyms.mjs` | Cloud gym store — reads/writes the list for all visitors. |
| `package.json` | The function's dependency (`@netlify/blobs`). |
| `netlify.toml` | Netlify config (publishes `public/`, wires the function). |
| `tools/server.ps1` · `tools/phone-preview.ps1` | Optional local **preview** only. |

## 🌍 Deploy to Netlify (with the live admin)

The admin dashboard edits gyms **on the live site** and saves them to the cloud, so every
visitor sees the change. That needs the Netlify Function, so deploy from Git:

1. **Put the project on GitHub** (create a repo and push this folder).
2. In Netlify: **Add new site → Import from an existing project** → pick the repo → **Deploy**.
   (`netlify.toml` already sets everything up — publish `public/`, function at `/api/gyms`.)
3. **Set your admin password:** in Netlify go to **Site settings → Environment variables**,
   add one named **`ADMIN_PASSWORD`** with a value of your choice, then **redeploy** (Deploys →
   Trigger deploy) so the function picks it up.

That's it — your site is live at `https://your-site.netlify.app`.

> Why Git and not drag-and-drop? The admin needs a server-side function with a dependency,
> which Netlify installs during a Git build. A plain drag-and-drop of `public/` would give you
> the app **without** the working admin.

## 🔐 Using the admin dashboard

1. Open **`https://your-site.netlify.app/admin/`**.
2. Enter your **`ADMIN_PASSWORD`** (the one you set in Netlify).
3. **Add**, **Edit**, **Duplicate** or **Delete** any gym. Each change is saved to the cloud and
   **shows for everyone** — refresh the app to see it. Every field is editable in English **and**
   Arabic: name, area, address, phone/WhatsApp, rating, access, min age, pool + schedule, opening
   hours, facilities, trainers, membership plans and offers.

- The green **“Connected to cloud”** badge means saving is working. A wrong password is rejected
  and the dashboard asks again. **Sign out** clears the password from your browser.
- **Download backup** saves a copy of the current list (as a `data.js` block) you can keep or
  paste into `public/js/data.js` to refresh the built-in starter list.
- The starter list in `public/js/data.js` is only a **fallback** shown before the cloud loads (or
  if the cloud is ever unreachable). Once you save from the admin, the cloud copy is what visitors see.

> ⚠️ `ADMIN_PASSWORD` is checked on the server, so it's real protection for saving — but keep it
> private. The passcode field alone doesn't expose it.

## ✏️ Want to change a gym by hand?

Edit `public/js/data.js` (the fallback list) and keep the `/* FITJO-GYMS-START */` …
`/* FITJO-GYMS-END */` markers in place. Note this only changes the starter list — anything you've
already saved through the admin (the cloud copy) still wins on the live site until you overwrite it
there.

---

## Next step (Phase 2)

Turn this into the real product: install Node.js → build the Next.js web app + Flutter
mobile app on a shared backend (Supabase) with real accounts, live gym data, reviews,
and payments through a licensed Jordanian gateway. See the roadmap discussed with Claude.
