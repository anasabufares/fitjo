# Turning on the real AI calorie tracker

The calorie tracker works **right now in demo mode** — open the app, sign in,
go to **📷 Calorie tracker**, and add a food photo. It estimates from a built-in
food library, so it needs no setup, no key, and costs nothing. Great for showing
people the experience.

When you're ready for it to **truly read any photo** (not just match a library),
follow these 3 steps. This part needs the app to be **online** (deployed), because
the "AI key" must live on a server, never inside the app where visitors could see it.

---

## What you'll need
- The app deployed on **Netlify** (free tier is fine).
- An **Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com).
  Each photo costs roughly a cent or two. You can set a monthly spending cap in the console.

## Step 1 — Give Netlify your API key
In your Netlify site: **Site settings → Environment variables → Add a variable**
- **Key:** `ANTHROPIC_API_KEY`
- **Value:** your key (starts with `sk-ant-...`)

## Step 2 — Turn on the switch in the app
Open `index.html` and un-comment this line near the bottom (remove the `<!--` and `-->`):

```html
<script>window.FITJO_CONFIG = { aiEndpoint: "/.netlify/functions/analyze-food" };</script>
```

## Step 3 — Deploy
Push to Netlify (or drag-and-drop the folder). The cloud function
`netlify/functions/analyze-food.js` is already written and ready.

That's it. From then on, the tracker sends photos to Claude, and if anything ever
fails it quietly falls back to demo mode so the app never breaks.

---

### Good to know
- **Which AI model?** The function uses `claude-opus-4-8` (most accurate). To cut
  cost, open `analyze-food.js` and change the model to `claude-haiku-4-5`.
- **Cost control:** set a budget cap in the Anthropic console so there are no surprises.
- **Privacy:** photos are sent to Anthropic only to get the estimate; nothing is stored
  by the app beyond your own food log (which stays in your browser for this prototype).
