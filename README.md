# FitJo — Gyms of Jordan (Prototype)

A clickable prototype of your gym-finder app for Amman, Jordan. This is **Phase 1**:
the gym directory with search, filters, favorites, Arabic/English, themes and currencies.
It uses **sample data** and needs **no installation**.

---

## ▶️ How to open it

**Easiest way:** double-click `index.html`. It opens in your web browser. That's it.

**Nicer way (runs on a local address):**
1. Right-click inside this folder → "Open in Terminal" (or open PowerShell here).
2. Paste this and press Enter:
   ```
   powershell -ExecutionPolicy Bypass -File server.ps1
   ```
3. Open your browser to **http://localhost:8080**
4. To stop it, press `Ctrl + C` in the terminal.

---

## 📱 Add it to your phone like an app (no app store)

1. Run `phone-preview.ps1` on your PC and open the address it shows on your phone's browser.
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
- **AI calorie tracker** — in your profile: snap or upload a photo of a meal and get estimated **calories, protein, carbs and fat**, tweak the portion, and **log it to your day**. A calorie ring + macro bars track the day against your plan's targets, with a short history of recent days. Works offline in **demo mode** (estimates from a built-in food library); real photo AI can be switched on later — see `AI-SETUP.md`.
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

Goal-based workout plans · real in-app payments & digital membership pass.

---

## 📁 Files

| File | What it is |
|------|-----------|
| `index.html` | The page structure. |
| `styles.css` | All the styling and themes. |
| `data.js` | **The content** — edit gyms, prices, hours, trainers here. |
| `app.js` | The app logic (search, filters, favorites, translations). |
| `auth.js` | Accounts: sign in/up, Google, profile, 2FA, privacy, settings. |
| `plan.js` | Personalized plan: intake form, workouts, meals, water, supplements, reminders. |
| `nutrition.js` | AI calorie tracker: food photo analysis, editable results, daily food log & targets. |
| `netlify/functions/analyze-food.js` | Optional cloud function for **real** photo AI (see `AI-SETUP.md`). |
| `server.ps1` | Optional tiny local server (no install needed). |

## ✏️ Want to change a gym?

Open `data.js`. Each gym is a block with its name, area, phone, hours, facilities,
trainers and plans — in both English and Arabic. Edit the text and save; refresh the page.

---

## Next step (Phase 2)

Turn this into the real product: install Node.js → build the Next.js web app + Flutter
mobile app on a shared backend (Supabase) with real accounts, live gym data, reviews,
and payments through a licensed Jordanian gateway. See the roadmap discussed with Claude.
