/* =============================================================
   FitJo — coach portal (gym staff)
   Coaches sign in with a COACH_PASSWORD and see the members who
   opted in to "Let trainers contact me" (privacy setting), with
   Call / WhatsApp. Owners are routed to the admin dashboard.
   Relies on globals: state, esc, tL, toast, showErr, openAuth.
   ============================================================= */

let coachMembers = [];

async function enterCoachPortal(code) {
  try {
    const r = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-coach-password": code },
      body: JSON.stringify({ action: "coach-list" }),
    });
    if (r.status === 401) { showErr(tL("Wrong coach code — try again.", "رمز مدرب خاطئ — حاول مجدداً.")); return; }
    const j = await r.json().catch(() => ({}));
    if (!Array.isArray(j.members)) { showErr(j.error || tL("Couldn't open the coach portal.", "تعذّر فتح بوابة المدرب.")); return; }
    coachMembers = j.members;
    sessionStorage.setItem("fj_coach_pw", code);
    if (typeof closeAuth === "function") closeAuth();
    showCoachPortal();
  } catch (e) {
    showErr(tL("Couldn't reach the server (deploy on Netlify to use the coach portal).", "تعذّر الوصول للخادم."));
  }
}

function coachRow(m) {
  const digits = (m.phone || "").replace(/\D/g, "");
  return `
    <div class="member-row">
      <div class="member-avatar">${esc((m.name || "?").trim().charAt(0).toUpperCase())}</div>
      <div class="member-info">
        <div class="nm">${esc(m.name || "(no name)")}</div>
        <div class="sub">${esc(m.phone || "—")}</div>
        <div class="member-meta">
          ${m.goal ? `<span class="tag">🎯 ${esc(m.goal)}</span>` : ""}
          ${m.city ? `<span class="tag">📍 ${esc(m.city)}</span>` : ""}
          <span class="tag">🏋️ ${esc(m.favorites ?? 0)} saved</span>
          <span class="tag">${m.hasPlan ? "📋 plan ✓" : "📋 no plan"}</span>
        </div>
      </div>
      <div class="acts">
        ${digits ? `<button class="abtn ghost sm" data-call="${esc(m.phone)}">📞 ${tL("Call", "اتصال")}</button>
        <button class="abtn sm" data-wa="${esc(digits)}">💬 ${tL("WhatsApp", "واتساب")}</button>` : ""}
      </div>
    </div>`;
}

function showCoachPortal() {
  const el = document.getElementById("coachPortal");
  if (!el) return;
  const arr = coachMembers || [];
  el.innerHTML = `
    <div class="cp-top">
      <div class="admin-brand"><span class="logo">🧑‍🏫</span><span>FitJo<small>${tL("Coach portal", "بوابة المدرب")}</small></span></div>
      <span style="flex:1"></span>
      <button class="abtn ghost sm" id="coachRefresh">↻</button>
      <button class="abtn ghost sm" id="coachOut">${tL("Sign out", "خروج")}</button>
    </div>
    <div class="cp-wrap">
      <h1 style="font-size:22px;margin-bottom:4px">${tL("My members", "أعضائي")}</h1>
      <p style="color:var(--muted);margin-bottom:16px">${tL("Members who allowed trainers to contact them.", "الأعضاء الذين سمحوا للمدربين بالتواصل معهم.")} (${arr.length})</p>
      <div class="member-list">
        ${arr.length ? arr.map(coachRow).join("") : `<div class="muted-note" style="color:var(--muted);text-align:center;padding:30px">${tL("No members have opted in yet. They appear here when a member turns on “Let trainers contact me”.", "لا يوجد أعضاء وافقوا بعد.")}</div>`}
      </div>
    </div>`;
  el.classList.add("show");
  document.body.style.overflow = "hidden";
  document.getElementById("coachOut").onclick = exitCoachPortal;
  const rf = document.getElementById("coachRefresh");
  if (rf) rf.onclick = () => { const c = sessionStorage.getItem("fj_coach_pw"); if (c) enterCoachPortal(c); };
  el.querySelectorAll("[data-call]").forEach(b => b.onclick = () => { window.location.href = "tel:" + b.dataset.call; });
  el.querySelectorAll("[data-wa]").forEach(b => b.onclick = () => window.open("https://wa.me/" + b.dataset.wa, "_blank"));
}

function exitCoachPortal() {
  const el = document.getElementById("coachPortal");
  if (el) { el.classList.remove("show"); el.innerHTML = ""; }
  sessionStorage.removeItem("fj_coach_pw");
  coachMembers = [];
  document.body.style.overflow = "";
  if (typeof openAuth === "function") openAuth("signin");
}

/* Restore the coach portal on reload if a coach session is active. */
document.addEventListener("DOMContentLoaded", () => {
  const c = sessionStorage.getItem("fj_coach_pw");
  if (c) enterCoachPortal(c);
});
