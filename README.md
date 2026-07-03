# FitJo — Gyms of Jordan (Prototype)

A gym-finder web app for Amman, Jordan: browse gyms, filter, compare, favorite,
Arabic/English, themes and currencies — plus a **cloud admin dashboard** to manage the
gym list and a **sign-up wall with phone verification**.

---

## 📂 Project layout

```
public/            ← the website Netlify serves
  index.html       APP page (gated behind sign-up)
  manifest.json    installable-app settings
  css/             styles.css        (shared theme)
  js/              data.js (shared), app.js, auth.js, plan.js   (APP only)
  icons/           app icons
  admin/           ← ADMIN dashboard, self-contained (open at /admin/)
    index.html · admin.css · admin.js
netlify/functions/
  gyms.mjs         cloud gym store — GET/POST /api/gyms (Netlify Blobs)
  analyze-food.js  optional AI food-photo analyzer (dormant — see AI-SETUP.md)
package.json       function dependencies
netlify.toml       publishes public/ and wires up the functions
AI-SETUP.md        how to switch on the real AI calorie analysis
tools/             ← optional local preview only (NOT deployed)
  server.ps1, phone-preview.ps1
```

---

## 🔑 Access gate — sign up + phone verification

You must **create an account and verify a phone number** before you can use the app.
On first visit a full-screen wall appears:

1. **Create account** — name, email, age, **phone number**, password.
2. **Verify your phone** — a 6-digit code step. In this prototype the code is generated
   in-app and shown on screen (**demo mode — no real SMS**, like the demo Google sign-in).
3. Enter the code → the app unlocks. Sign out and the wall returns.

The phone + verified flag are stored on the account (in the browser for the demo).

---

## 🌍 Deploy to Netlify (with the live admin)

The admin dashboard edits gyms **on the live site** and saves them to the cloud, so every
visitor sees the change. That needs the Netlify Functions, so deploy from Git:

1. **Push this project to GitHub.**
2. In Netlify: **Add new site → Import an existing project** → pick the repo → **Deploy**.
   (`netlify.toml` sets it up — publish `public/`, functions at `/api/gyms`.)
3. **Set your admin password:** Netlify → **Site configuration → Environment variables** →
   add **`ADMIN_PASSWORD`** = a value of your choice → **redeploy** (Deploys → Trigger deploy).

App is then live at `https://your-site.netlify.app`, admin at `.../admin/`.

---

## 🔐 Admin dashboard

1. Open **`https://your-site.netlify.app/admin/`**.
2. Enter your **`ADMIN_PASSWORD`**.
3. **Add / Edit / Duplicate / Delete** any gym — saved to the cloud and shown to everyone.
   Every field is bilingual (EN/AR): name, area, address, phone/WhatsApp, rating, access,
   min age, pool + schedule, hours, facilities, trainers, plans, offers.

The green **“Connected to cloud”** badge means saving works. **Download backup** saves the
current list as a `data.js` block. The list in `public/js/data.js` is a **fallback** shown
before the cloud loads; once you save from the admin, the cloud copy is what visitors see.

---

## ✅ What works

- **Gym directory, search, filters, live occupancy, reviews, class schedule, compare**.
- **Favorites**, full **gym details** (hours, pool times, trainers, plans), payment explainer.
- **Accounts** — sign up / sign in, "Continue with Google" (demo), profile, security (demo 2FA),
  privacy, notifications, preferences. **Sign-up + phone verification is required to enter.**
- **Weight & progress tracker**.
- **Languages** (EN/AR with RTL), **themes** (light/dark + accents), **currencies** (JOD/USD/EUR/SAR/KWD/QAR).
- **Cloud admin dashboard** for managing gyms.

## 🍎 Optional: real AI calorie analysis

`netlify/functions/analyze-food.js` is a ready backend that sends a food photo to Claude and
returns estimated calories/macros. It is **dormant** — its frontend isn't wired into the
current `public/` app yet. To enable the backend and learn how it works, see **`AI-SETUP.md`**
(needs an `ANTHROPIC_API_KEY` in Netlify).

---

## ▶️ Run locally (preview only)

Double-click `public/index.html`, or serve it:
```
powershell -ExecutionPolicy Bypass -File tools/server.ps1
```
then open **http://localhost:8080**. Note: the cloud admin only saves on the deployed Netlify
site (the local server has no `/api/gyms` function).

## ✏️ Change a gym by hand

Edit `public/js/data.js` (the fallback list) and keep the
`/* FITJO-GYMS-START */` … `/* FITJO-GYMS-END */` markers. On the live site, anything saved
through the admin (the cloud copy) takes precedence until you overwrite it there.
