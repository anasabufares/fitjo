/* =============================================================
   FitJo — coach portal (gym staff)
   Coaches sign in with an access key and see the members who opted
   in to "Let trainers contact me", with Call / WhatsApp. The list
   auto-refreshes (~every 15s + on tab focus) so new opt-ins appear.
   Relies on globals: state, esc, tL, toast, showErr, openAuth.
   ============================================================= */

let coachMembers = [];
let coachName = "";
let coachPollTimer = null;

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
    coachName = j.coach || "";
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

function renderCoachList() {
  const el = document.getElementById("cpList");
  if (!el) return;
  const arr = coachMembers || [];
  el.innerHTML = arr.length
    ? arr.map(coachRow).join("")
    : `<div class="muted-note" style="color:var(--muted);text-align:center;padding:30px">${tL("No members have opted in yet. They appear here when a member turns on “Let trainers contact me”.", "لا يوجد أعضاء وافقوا بعد.")}</div>`;
  const c = document.getElementById("cpCount"); if (c) c.textContent = "(" + arr.length + ")";
  el.querySelectorAll("[data-call]").forEach(b => b.onclick = () => { window.location.href = "tel:" + b.dataset.call; });
  el.querySelectorAll("[data-wa]").forEach(b => b.onclick = () => window.open("https://wa.me/" + b.dataset.wa, "_blank"));
}

function showCoachPortal() {
  const el = document.getElementById("coachPortal");
  if (!el) return;
  el.innerHTML = `
    <div class="cp-top">
      <div class="admin-brand"><span class="logo">🧑‍🏫</span><span>FitJo<small>${tL("Coach portal", "بوابة المدرب")}${coachName ? " · " + esc(coachName) : ""}</small></span></div>
      <span style="flex:1"></span>
      <span class="live-dot" title="auto-updating">● ${tL("live", "مباشر")}</span>
      <button class="abtn ghost sm" id="coachRefresh">↻</button>
      <button class="abtn ghost sm" id="coachOut">${tL("Sign out", "خروج")}</button>
    </div>
    <div class="cp-wrap">
      <h1 style="font-size:22px;margin-bottom:4px">${tL("My members", "أعضائي")} <span id="cpCount">(${(coachMembers || []).length})</span></h1>
      <p style="color:var(--muted);margin-bottom:16px">${tL("Members who allowed trainers to contact them.", "الأعضاء الذين سمحوا للمدربين بالتواصل معهم.")}</p>
      <div class="member-list" id="cpList"></div>
    </div>`;
  el.classList.add("show");
  document.body.style.overflow = "hidden";
  document.getElementById("coachOut").onclick = exitCoachPortal;
  const rf = document.getElementById("coachRefresh"); if (rf) rf.onclick = refreshCoach;
  renderCoachList();
  startCoachPolling();
}

async function refreshCoach() {
  const code = sessionStorage.getItem("fj_coach_pw");
  if (!code) return;
  try {
    const r = await fetch("/api/members", {
      method: "POST", headers: { "Content-Type": "application/json", "x-coach-password": code },
      body: JSON.stringify({ action: "coach-list" }),
    });
    if (!r.ok) return;
    const j = await r.json();
    if (Array.isArray(j.members) && JSON.stringify(j.members) !== JSON.stringify(coachMembers)) {
      coachMembers = j.members;
      renderCoachList();
    }
  } catch (e) { /* ignore */ }
}
function coachVis() { if (document.visibilityState === "visible") refreshCoach(); }
function startCoachPolling() {
  stopCoachPolling();
  coachPollTimer = setInterval(() => { if (document.visibilityState === "visible") refreshCoach(); }, 15000);
  document.addEventListener("visibilitychange", coachVis);
}
function stopCoachPolling() {
  if (coachPollTimer) { clearInterval(coachPollTimer); coachPollTimer = null; }
  document.removeEventListener("visibilitychange", coachVis);
}

function exitCoachPortal() {
  stopCoachPolling();
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
