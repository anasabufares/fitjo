/* =============================================================
   FitJo — gyms API (Netlify Function + Netlify Blobs)

   GET  /api/gyms  -> { gyms: [...] | null }         (public: the app + admin read this)
   POST /api/gyms  -> body is a JSON array of gyms    (protected: admin writes this)
                      header  x-admin-password  must equal the ADMIN_PASSWORD
                      environment variable you set in Netlify.

   The gym list lives in a Netlify Blobs store, so edits persist for every
   visitor without any external database.
   ============================================================= */

import { getStore } from "@netlify/blobs";

const KEY = "gyms";

export default async (req) => {
  const store = getStore("fitjo");

  // ---- Read the current list (public) ----
  if (req.method === "GET") {
    const gyms = await store.get(KEY, { type: "json" });
    return json({ gyms: gyms ?? null });
  }

  // ---- Save the list (password-protected) ----
  if (req.method === "POST") {
    if (!process.env.ADMIN_PASSWORD) {
      return json(
        { ok: false, error: "ADMIN_PASSWORD is not set. Add it in Netlify → Site settings → Environment variables, then redeploy." },
        500
      );
    }
    if ((req.headers.get("x-admin-password") || "") !== process.env.ADMIN_PASSWORD) {
      return json({ ok: false, error: "Wrong admin password." }, 401);
    }

    let body;
    try { body = await req.json(); }
    catch { return json({ ok: false, error: "Body must be valid JSON." }, 400); }
    if (!Array.isArray(body)) return json({ ok: false, error: "Body must be an array of gyms." }, 400);

    await store.setJSON(KEY, body);
    return json({ ok: true, count: body.length });
  }

  return json({ ok: false, error: "Method not allowed." }, 405);
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// Route /api/gyms straight to this function.
export const config = { path: "/api/gyms" };
