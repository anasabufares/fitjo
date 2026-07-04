/* =============================================================
   FitJo — members API (Netlify Function + Netlify Blobs)

   All requests are POST /api/members. The x-admin-password header
   decides the mode:

   • No password  -> REGISTER a member (public; called by the app on
                     sign-up / login).  body: {name,email,phone,age,createdAt}
   • With correct password -> ADMIN action. body:
        { action: "list" }             -> { members: [...] }
        { action: "delete", email }    -> remove that member

   Members (name/email/phone) are stored in Netlify Blobs so the admin
   dashboard can see everyone who signed up, from any device. Email is
   never put in a URL; the list is only readable with the admin password.
   ============================================================= */

import { getStore } from "@netlify/blobs";

const KEY = "members";

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "Use POST" }, 405);
  const store = getStore("fitjo");
  const pw = req.headers.get("x-admin-password");

  let body;
  try { body = await req.json(); } catch { body = {}; }

  // ---- Admin actions (password required) ----
  if (pw != null && pw !== "") {
    if (!process.env.ADMIN_PASSWORD) return json({ ok: false, error: "ADMIN_PASSWORD is not set in Netlify." }, 500);
    if (pw !== process.env.ADMIN_PASSWORD) return json({ ok: false, error: "Wrong admin password." }, 401);

    const list = (await store.get(KEY, { type: "json" })) || [];
    if (body.action === "list") return json({ members: list });
    if (body.action === "delete") {
      const email = String(body.email || "").trim().toLowerCase();
      const next = list.filter(m => m.email !== email);
      await store.setJSON(KEY, next);
      return json({ ok: true, count: next.length });
    }
    return json({ ok: false, error: "Unknown admin action." }, 400);
  }

  // ---- Public: register / upsert a member on sign-up ----
  const email = String(body.email || "").trim().toLowerCase();
  if (!email) return json({ ok: false, error: "email required" }, 400);
  const list = (await store.get(KEY, { type: "json" })) || [];
  const rec = {
    name: body.name || "", email,
    phone: body.phone || "", age: body.age ?? null,
    goal: body.goal || "", city: body.city || "",
    favorites: body.favorites ?? 0, favoriteIds: Array.isArray(body.favoriteIds) ? body.favoriteIds : [],
    hasPlan: !!body.hasPlan, weights: body.weights || null,
    createdAt: body.createdAt || Date.now(),
    lastSeen: Date.now(),
  };
  const i = list.findIndex(m => m.email === email);
  if (i >= 0) list[i] = { ...list[i], ...rec, createdAt: list[i].createdAt || rec.createdAt };
  else list.push(rec);
  await store.setJSON(KEY, list);
  return json({ ok: true, count: list.length });
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const config = { path: "/api/members" };
