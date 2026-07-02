/* =============================================================
   FitJo — accounts & profile (prototype, browser-stored)
   Sign in / sign up / Google / 2FA authenticator / profile /
   security / email / privacy / notifications / preferences.
   NOTE: demo storage in localStorage — real Google OAuth and
   real TOTP 2FA arrive with the backend (Phase 2).
   Relies on globals from app.js: state, t, I18N, persist,
   applyChrome, renderControls, renderStaticText, renderFilters,
   renderResults, renderAll, CURRENCIES.
   ============================================================= */

let authView = null;          // "signin" | "signup" | "account"
let acctSection = "profile";
let tempSecret = null;

/* extra labels (profile photo + weight units) */
Object.assign(I18N.en, { changePhoto: "Change photo", removePhoto: "Remove", lb: "lb" });
Object.assign(I18N.ar, { changePhoto: "تغيير الصورة", removePhoto: "إزالة", lb: "رطل" });

/* Resize an uploaded image to a small square data URL (keeps localStorage tiny). */
function resizeImage(file, max, cb) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = max;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, side, side, 0, 0, max, max);
      cb(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => cb(null);
    img.src = reader.result;
  };
  reader.onerror = () => cb(null);
  reader.readAsDataURL(file);
}
function avatarInner(u) { return u.avatar ? `<img class="avatar-img" src="${u.avatar}" alt="">` : initials(u.name); }

/* ---------- storage ---------- */
const getUsers  = () => JSON.parse(localStorage.getItem("fj_users") || "[]");
const saveUsers = (u) => localStorage.setItem("fj_users", JSON.stringify(u));
const getSession = () => localStorage.getItem("fj_session") || null;
const setSession = (email) => localStorage.setItem("fj_session", email);
const clearSession = () => localStorage.removeItem("fj_session");
const currentUser = () => { const s = getSession(); return s ? getUsers().find(u => u.email === s) || null : null; };

/* ---------- helpers ---------- */
const obf = (pw) => btoa(unescape(encodeURIComponent(pw)));
const val = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map(w => (w[0] || "").toUpperCase()).join("") || "?";
const fmtDate = (ts) => new Date(ts).toLocaleDateString(state.lang === "ar" ? "ar-JO" : "en-US", { year: "numeric", month: "short" });

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg; el.classList.add("show");
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 2200);
}
function showErr(msg) { const el = document.getElementById("authErr"); if (el) { el.textContent = msg; el.classList.add("show"); } }

function updateUser(patch) {
  const users = getUsers();
  const i = users.findIndex(u => u.email === getSession());
  if (i < 0) return;
  users[i] = { ...users[i], ...patch };
  saveUsers(users);
}
function createUser(data, provider = "email") {
  const users = getUsers();
  const u = {
    id: "u" + Date.now(), name: data.name, email: data.email, pw: obf(data.pw || Math.random().toString(36)),
    age: data.age || 18, gender: "na", goal: "fit", city: "", createdAt: Date.now(),
    twoFA: false, twoFASecret: null, recovery: [], passkeys: 0, provider,
    privacy: { profilePublic: true, showFav: false, trainerContact: true, shareData: true },
    notif: { offers: true, expiry: true, classes: true, news: false },
    intake: null, weights: [], reminders: { gym: { on: false, time: "19:00" }, rest: { on: false, time: "10:00" } },
  };
  users.push(u); saveUsers(users); return u;
}

/* ---------- top-bar button ---------- */
function renderAuthButton() {
  const slot = document.getElementById("authSlot"); if (!slot) return;
  const u = currentUser();
  if (u) {
    slot.innerHTML = `<button class="avatar-sm" id="acctBtn" title="${esc(u.name)}">${avatarInner(u)}</button>`;
    document.getElementById("acctBtn").onclick = () => openAuth("account");
  } else {
    slot.innerHTML = `<button class="control" id="signInBtn" style="font-weight:700">${t("signIn")}</button>`;
    document.getElementById("signInBtn").onclick = () => openAuth("signin");
  }
}

/* ---------- open / close ---------- */
function openAuth(view) {
  if (view === "account" && !currentUser()) view = "signin";
  authView = view;
  if (view === "account") acctSection = "profile";
  if (typeof resetPlanEditing === "function") resetPlanEditing();
  if (typeof resetNutrition === "function") resetNutrition();
  document.getElementById("authBack").classList.add("open");
  document.body.style.overflow = "hidden";
  renderAuthView();
}
function closeAuth() {
  document.getElementById("authBack").classList.remove("open");
  document.body.style.overflow = "";
}
function requireAuth() {
  if (currentUser()) return true;
  toast(t("loggedOutMsg")); openAuth("signin"); return false;
}
function renderAuthView() {
  const modal = document.getElementById("authModal");
  if (authView === "account") { modal.className = "auth-modal wide"; modal.innerHTML = accountHTML(); }
  else { modal.className = "auth-modal"; modal.innerHTML = authView === "signup" ? signupHTML() : signinHTML(); }
}

/* ---------- Google icon ---------- */
function googleG() {
  return `<svg class="google-g" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
}

/* ---------- sign in / sign up ---------- */
function signinHTML() {
  return `
  <button class="auth-x" id="authX">✕</button>
  <div class="auth-title">${t("welcomeBack")}</div>
  <div class="auth-sub">FitJo · ${t("brandTag")}</div>
  <div class="form-err" id="authErr"></div>
  <button class="google-btn" id="googleBtn">${googleG()} ${t("continueGoogle")}</button>
  <div class="divider">${t("orEmail")}</div>
  <div class="form-row"><label>${t("email")}</label><input id="inEmail" type="email" autocomplete="email" placeholder="you@email.com"></div>
  <div class="form-row"><label>${t("password")}</label><input id="inPassword" type="password" autocomplete="current-password" placeholder="••••••••"></div>
  <div style="text-align:end;margin:-4px 0 12px"><button class="auth-link" id="forgotPw">${t("forgotPw")}</button></div>
  <button class="btn block" id="doSignIn">${t("signIn")}</button>
  <div class="auth-foot"><button class="auth-link" id="toSignUp">${t("noAccount")}</button></div>
  <div class="note">${t("demoNote")}</div>`;
}
function signupHTML() {
  return `
  <button class="auth-x" id="authX">✕</button>
  <div class="auth-title">${t("createYourAccount")}</div>
  <div class="auth-sub">FitJo · ${t("brandTag")}</div>
  <div class="form-err" id="authErr"></div>
  <button class="google-btn" id="googleBtn">${googleG()} ${t("continueGoogle")}</button>
  <div class="divider">${t("orEmail")}</div>
  <div class="form-row"><label>${t("fullName")}</label><input id="inName" type="text" placeholder="${t("fullName")}"></div>
  <div class="form-two">
    <div class="form-row"><label>${t("email")}</label><input id="inEmail" type="email" placeholder="you@email.com"></div>
    <div class="form-row"><label>${t("age")}</label><input id="inAge" type="number" min="12" max="100" placeholder="25"></div>
  </div>
  <div class="form-two">
    <div class="form-row"><label>${t("password")}</label><input id="inPassword" type="password" placeholder="••••••••"></div>
    <div class="form-row"><label>${t("confirmPassword")}</label><input id="inConfirm" type="password" placeholder="••••••••"></div>
  </div>
  <label style="display:flex;gap:8px;align-items:center;font-size:13px;color:var(--muted);margin:4px 0 12px">
    <input type="checkbox" id="agreeAge"> ${t("agreeAge")}</label>
  <button class="btn block" id="doSignUp">${t("signUp")}</button>
  <div class="auth-foot"><button class="auth-link" id="toSignIn">${t("haveAccount")}</button></div>
  <div class="note">${t("demoNote")}</div>`;
}

/* ---------- account shell ---------- */
function accountHTML() {
  const u = currentUser();
  const nav = [
    ["profile", "👤", t("myProfile")], ["plan", "🎯", t("myPlan")],
    ["nutrition", "📷", t("calorieTracker")], ["progress", "📈", t("myProgress")],
    ["security", "🔒", t("security")], ["email", "✉️", t("changeEmail")],
    ["privacy", "🛡️", t("privacy")], ["notifications", "🔔", t("notifications")],
    ["preferences", "⚙️", t("preferences")], ["danger", "⚠️", t("dangerZone")],
  ];
  return `
  <div class="acct">
    <div class="acct-side">
      <button class="auth-x" id="authX">✕</button>
      <div class="acct-profilecard">
        <div class="avatar-lg">${avatarInner(u)}</div>
        <div class="acct-name">${esc(u.name)}</div>
        <div class="acct-email">${esc(u.email)}</div>
      </div>
      <nav class="acct-nav">
        ${nav.map(([k, ic, l]) => `<button data-sec="${k}" class="${acctSection === k ? "active" : ""}">${ic} ${l}</button>`).join("")}
        <button id="signOutBtn" style="color:#ef4444">↩ ${t("signOut")}</button>
      </nav>
    </div>
    <div class="acct-body" id="acctBody">${sectionHTML(acctSection)}</div>
  </div>`;
}
function switchSection(sec) {
  acctSection = sec;
  document.getElementById("acctBody").innerHTML = sectionHTML(sec);
  document.querySelectorAll(".acct-nav [data-sec]").forEach(b => b.classList.toggle("active", b.dataset.sec === sec));
}
function reRenderSection() { document.getElementById("acctBody").innerHTML = sectionHTML(acctSection); }

/* ---------- sections ---------- */
function sectionHTML(sec) {
  const u = currentUser();
  if (sec === "profile") return secProfile(u);
  if (sec === "plan" && typeof secPlan === "function") return secPlan(u);
  if (sec === "nutrition" && typeof secNutrition === "function") return secNutrition(u);
  if (sec === "progress") return secProgress(u);
  if (sec === "security") return secSecurity(u);
  if (sec === "email") return secEmail(u);
  if (sec === "privacy") return secPrivacy(u);
  if (sec === "notifications") return secNotif(u);
  if (sec === "preferences") return secPrefs();
  if (sec === "danger") return secDanger();
  return "";
}
function goalOptions(sel) {
  return [["lose", t("goalLose")], ["build", t("goalBuild")], ["gain", t("goalGain")], ["recomp", t("goalRecomp")], ["fit", t("goalFit")]]
    .map(([k, l]) => `<option value="${k}"${sel === k ? " selected" : ""}>${l}</option>`).join("");
}
function toggleRow(kind, key, label, checked, desc) {
  return `<div class="set-row"><div class="txt"><div class="t">${label}</div>${desc ? `<div class="d">${desc}</div>` : ""}</div>
    <label class="switch"><input type="checkbox" data-${kind}="${key}" ${checked ? "checked" : ""}><span class="slider"></span></label></div>`;
}

function secProfile(u) {
  return `
  <h3>${t("myProfile")}</h3>
  <div class="h-sub">${t("memberSince")} ${fmtDate(u.createdAt)}${u.provider === "google" ? " · Google" : ""}</div>
  <div class="avatar-edit">
    <div class="avatar-lg">${avatarInner(u)}</div>
    <div>
      <label class="btn ghost" for="avatarInput">📷 ${t("changePhoto")}</label>
      <input id="avatarInput" type="file" accept="image/*" hidden>
      ${u.avatar ? `<button class="btn ghost" id="removeAvatar">${t("removePhoto")}</button>` : ""}
    </div>
  </div>
  <div class="stat-row">
    <div class="stat"><div class="n">${state.favorites.length}</div><div class="l">${t("savedGyms")}</div></div>
    <div class="stat"><div class="n">0</div><div class="l">${t("activeSubs")}</div></div>
    <div class="stat"><div class="n">${u.age}</div><div class="l">${t("age")}</div></div>
  </div>
  <div class="form-row"><label>${t("fullName")}</label><input id="pfName" value="${esc(u.name)}"></div>
  <div class="form-two">
    <div class="form-row"><label>${t("age")}</label><input id="pfAge" type="number" min="12" max="100" value="${u.age}"></div>
    <div class="form-row"><label>${t("city")}</label><input id="pfCity" value="${esc(u.city || "")}" placeholder="Amman"></div>
  </div>
  <div class="form-two">
    <div class="form-row"><label>${t("gender")}</label>
      <select id="pfGender">
        <option value="na"${u.gender === "na" ? " selected" : ""}>${t("genderNA")}</option>
        <option value="f"${u.gender === "f" ? " selected" : ""}>${t("genderF")}</option>
        <option value="m"${u.gender === "m" ? " selected" : ""}>${t("genderM")}</option>
      </select></div>
    <div class="form-row"><label>${t("goal")}</label><select id="pfGoal">${goalOptions(u.goal)}</select></div>
  </div>
  <button class="btn" id="saveProfile">${t("saveChanges")}</button>`;
}

function goalLabel(goal) {
  return { lose: t("goalLose"), build: t("goalBuild"), gain: t("goalGain"), recomp: t("goalRecomp"), fit: t("goalFit") }[goal] || t("goalFit");
}
function weightChart(entries) {
  if (!entries.length) return "";
  const w = 320, h = 120, pad = 12;
  const kgs = entries.map(e => e.kg);
  const min = Math.min(...kgs) - 1, max = Math.max(...kgs) + 1;
  const n = entries.length;
  const X = (i) => pad + (n === 1 ? (w - 2 * pad) / 2 : i * (w - 2 * pad) / (n - 1));
  const Y = (v) => pad + (h - 2 * pad) * (1 - (v - min) / (max - min || 1));
  const pts = entries.map((e, i) => `${X(i).toFixed(1)},${Y(e.kg).toFixed(1)}`).join(" ");
  const dots = entries.map((e, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(e.kg).toFixed(1)}" r="3.5" fill="var(--accent)"/>`).join("");
  const line = n > 1 ? `<polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>` : "";
  return `<svg viewBox="0 0 ${w} ${h}" class="wchart">${line}${dots}</svg>`;
}
function secProgress(u) {
  const entries = (u.weights || []).slice().sort((a, b) => a.date - b.date);
  const cur = entries.length ? entries[entries.length - 1].kg : null;
  const start = entries.length ? entries[0].kg : null;
  const diff = (cur != null && start != null) ? (cur - start) : 0;
  return `
  <h3>${t("myProgress")}</h3>
  <div class="h-sub">${t("weightTracker")}${u.goal ? " · " + goalLabel(u.goal) : ""}</div>
  ${entries.length ? `
    <div class="stat-row">
      <div class="stat"><div class="n">${start}<small> kg · ${toLb(start)} lb</small></div><div class="l">${t("startWeight")}</div></div>
      <div class="stat"><div class="n">${cur}<small> kg · ${toLb(cur)} lb</small></div><div class="l">${t("currentWeight")}</div></div>
      <div class="stat"><div class="n" style="color:${diff < 0 ? "#16a34a" : diff > 0 ? "#dc2626" : "var(--text)"}">${diff > 0 ? "+" : ""}${diff.toFixed(1)}</div><div class="l">${t("change")}</div></div>
    </div>
    ${weightChart(entries)}
    <div class="wlist">${entries.slice().reverse().map(e => `<div class="w-entry"><span>${fmtDate(e.date)}</span><span><b>${e.kg}</b> kg · ${toLb(e.kg)} lb <button class="auth-link" data-delw="${e.date}" style="margin-inline-start:8px">✕</button></span></div>`).join("")}</div>
  ` : `<div class="note">${t("noWeights")}</div>`}
  <div class="form-two" style="margin-top:14px;align-items:end">
    <div class="form-row" style="margin:0"><label>${t("weightKg")}</label><input id="wKg" type="number" step="0.1" min="20" max="400" placeholder="72.5"></div>
    <button class="btn" id="addWeight">${t("addWeight")}</button>
  </div>`;
}
function addWeight() {
  const kg = parseFloat(val("wKg"));
  if (!(kg >= 20 && kg <= 400)) return toast(t("weightKg"));
  const weights = (currentUser().weights || []).slice();
  weights.push({ date: Date.now(), kg: Math.round(kg * 10) / 10 });
  updateUser({ weights }); reRenderSection(); toast(t("saved"));
}
function delWeight(dateStr) {
  const weights = (currentUser().weights || []).filter(e => String(e.date) !== String(dateStr));
  updateUser({ weights }); reRenderSection();
}

function secSecurity(u) {
  const twoFA = u.twoFA;
  return `
  <h3>${t("security")}</h3>
  <div class="h-sub">${t("changePassword")}</div>
  <div class="form-row"><label>${t("currentPassword")}</label><input id="curPw" type="password"></div>
  <div class="form-two">
    <div class="form-row"><label>${t("newPassword")}</label><input id="newPw" type="password"></div>
    <div class="form-row"><label>${t("confirmPassword")}</label><input id="confPw" type="password"></div>
  </div>
  <button class="btn" id="savePw">${t("changePassword")}</button>

  <div class="set-row" style="margin-top:22px">
    <div class="txt"><div class="t">${t("twoFA")} ${twoFA ? `<span class="pill on">${t("enabled")}</span>` : `<span class="pill off">${t("disabled")}</span>`}</div>
      <div class="d">${t("twoFADesc")}</div></div>
  </div>
  <div id="twoFABlock">${twoFA ? twoFAEnabledHTML(u) : `<button class="btn ghost" id="enable2fa">${t("enable")}</button>`}</div>

  <div class="set-row" style="margin-top:18px">
    <div class="txt"><div class="t">${t("passkey")}${u.passkeys ? ` <span class="pill on">${u.passkeys}</span>` : ""}</div><div class="d">${t("passkeyDesc")}</div></div>
    <button class="btn ghost" id="addPasskey">${t("addPasskey")}</button>
  </div>`;
}
function twoFAEnabledHTML(u) {
  return `
  <div class="note" style="margin-top:8px">✅ ${t("twoFAOn")}</div>
  <div style="font-weight:700;font-size:13px;margin-top:14px">${t("recoveryCodes")}</div>
  <div class="h-sub">${t("recoveryDesc")}</div>
  <div class="codes">${u.recovery.map(c => `<span>${c}</span>`).join("")}</div>
  <button class="btn ghost" id="disable2fa" style="margin-top:12px">${t("disable")}</button>`;
}

function secEmail(u) {
  return `
  <h3>${t("changeEmail")}</h3>
  <div class="h-sub">${t("email")}: ${esc(u.email)}</div>
  <div class="form-row"><label>${t("newEmail")}</label><input id="newEmailIn" type="email" placeholder="new@email.com"></div>
  <div class="form-row"><label>${t("currentPassword")}</label><input id="emailPw" type="password"></div>
  <button class="btn" id="saveEmail">${t("saveChanges")}</button>`;
}
function secPrivacy(u) {
  const rows = [["profilePublic", t("privProfilePublic")], ["showFav", t("privShowFav")], ["trainerContact", t("privTrainerContact")], ["shareData", t("privShareData")]];
  return `<h3>${t("privacy")}</h3><div class="h-sub">&nbsp;</div>` + rows.map(([k, l]) => toggleRow("priv", k, l, u.privacy[k])).join("");
}
function secNotif(u) {
  const rows = [["offers", t("notifOffers")], ["expiry", t("notifExpiry")], ["classes", t("notifClass")], ["news", t("notifNews")]];
  return `<h3>${t("notifications")}</h3><div class="h-sub">&nbsp;</div>` + rows.map(([k, l]) => toggleRow("notif", k, l, u.notif[k])).join("");
}
function secPrefs() {
  const accents = { green: "#16a34a", blue: "#2563eb", violet: "#7c3aed", orange: "#ea580c" };
  const L = state.lang === "ar";
  return `<h3>${t("preferences")}</h3><div class="h-sub">&nbsp;</div>
  <div class="form-row"><label>${t("theme")}</label>
    <div class="seg">
      <button data-pref-theme="light" class="${state.theme === "light" ? "active" : ""}">☀️ ${L ? "فاتح" : "Light"}</button>
      <button data-pref-theme="dark" class="${state.theme === "dark" ? "active" : ""}">🌙 ${L ? "داكن" : "Dark"}</button>
    </div></div>
  <div class="form-row"><label>${t("accentColor")}</label>
    <div class="seg">${Object.entries(accents).map(([k, c]) => `<button data-pref-accent="${k}" class="${state.accent === k ? "active" : ""}" style="${state.accent === k ? `background:${c};color:#fff;border-color:${c}` : ""}">${k}</button>`).join("")}</div></div>
  <div class="form-row"><label>${t("language")}</label>
    <div class="seg">
      <button data-pref-lang="en" class="${state.lang === "en" ? "active" : ""}">English</button>
      <button data-pref-lang="ar" class="${state.lang === "ar" ? "active" : ""}">العربية</button>
    </div></div>
  <div class="form-row"><label>${t("currency")}</label>
    <select id="prefCurrency">${Object.keys(CURRENCIES).map(k => `<option value="${k}"${state.currency === k ? " selected" : ""}>${k} — ${CURRENCIES[k][state.lang]}</option>`).join("")}</select></div>`;
}
function secDanger() {
  return `<h3 style="color:#ef4444">${t("dangerZone")}</h3><div class="h-sub">${t("deleteWarn")}</div>
  <div class="danger-box">
    <div style="font-weight:700;margin-bottom:8px">${t("deleteAccount")}</div>
    <button class="danger-btn" id="deleteAcct">${t("deleteAccount")}</button>
  </div>`;
}

/* ---------- 2FA / secrets ---------- */
function genSecret() {
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let s = "";
  for (let i = 0; i < 16; i++) s += a[Math.floor(Math.random() * a.length)];
  return s.match(/.{1,4}/g).join(" ");
}
function genRecovery() {
  const h = "0123456789abcdef";
  const part = () => Array.from({ length: 4 }, () => h[Math.floor(Math.random() * 16)]).join("");
  return Array.from({ length: 8 }, () => part() + "-" + part());
}
function qrSVG(seed) {
  const n = 23, cell = 5;
  let hh = 0; for (const c of seed) hh = (hh * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => { hh = (hh * 1103515245 + 12345) >>> 0; return (hh >>> 16) & 1; };
  const finder = (x, y) => {
    for (const [bx, by] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      if (x >= bx && x < bx + 7 && y >= by && y < by + 7) {
        const lx = x - bx, ly = y - by;
        return { in: true, on: (lx === 0 || lx === 6 || ly === 0 || ly === 6) || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4) };
      }
    }
    return { in: false };
  };
  let r = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const f = finder(x, y);
    const on = f.in ? f.on : rnd();
    if (on) r += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}"/>`;
  }
  return `<svg class="qr" viewBox="0 0 ${n * cell} ${n * cell}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#fff"/><g fill="#111">${r}</g></svg>`;
}
function start2FA() {
  tempSecret = genSecret();
  document.getElementById("twoFABlock").innerHTML = `
    <div class="qr-box">
      ${qrSVG(tempSecret)}
      <div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px">${t("scanCode")}</div>
        <div class="secret">${tempSecret}</div>
      </div>
    </div>
    <div class="form-row"><label>${t("enterCode")}</label><input id="code2fa" inputmode="numeric" maxlength="6" placeholder="123456"></div>
    <button class="btn" id="verify2fa">${t("verify")}</button>`;
}
function verify2FA() {
  const code = val("code2fa").trim();
  if (!/^\d{6}$/.test(code)) return toast(t("codeInvalid"));
  updateUser({ twoFA: true, twoFASecret: tempSecret, recovery: genRecovery() });
  toast(t("twoFAOn")); reRenderSection();
}
function disable2FA() {
  updateUser({ twoFA: false, twoFASecret: null, recovery: [] });
  toast(t("twoFAOff")); reRenderSection();
}
function addPasskey() { updateUser({ passkeys: currentUser().passkeys + 1 }); toast(t("saved")); reRenderSection(); }

/* ---------- actions ---------- */
function afterAuth() { closeAuth(); renderAll(); if (typeof startReminderScheduler === "function") startReminderScheduler(); const u = currentUser(); toast(`${t("hi")}, ${u.name.split(" ")[0]} 👋`); }

function handleSignIn() {
  const email = val("inEmail").trim().toLowerCase(), pw = val("inPassword");
  if (!email || !pw) return showErr(t("fillAll"));
  const u = getUsers().find(x => x.email === email);
  if (!u || u.pw !== obf(pw)) return showErr(t("badLogin"));
  setSession(email); afterAuth();
}
function handleSignUp() {
  const name = val("inName").trim(), email = val("inEmail").trim().toLowerCase();
  const ageStr = val("inAge"), age = parseInt(ageStr, 10), pw = val("inPassword"), cf = val("inConfirm");
  const agree = document.getElementById("agreeAge").checked;
  if (!name || !email || !ageStr || !pw) return showErr(t("fillAll"));
  if (!validEmail(email)) return showErr(t("emailInvalid"));
  if (!(age >= 12 && age <= 100)) return showErr(t("ageInvalid"));
  if (!agree) return showErr(t("ageInvalid"));
  if (pw.length < 6) return showErr(t("pwShort"));
  if (pw !== cf) return showErr(t("pwMismatch"));
  if (getUsers().some(x => x.email === email)) return showErr(t("emailTaken"));
  createUser({ name, email, age, pw }); setSession(email); afterAuth();
}
function handleGoogle() {
  const email = "demo.user@gmail.com";
  let u = getUsers().find(x => x.email === email);
  if (!u) u = createUser({ name: "Demo User", email, age: 25 }, "google");
  setSession(email); afterAuth();
}
function doLogout() { clearSession(); closeAuth(); renderAll(); toast(t("signOut")); }

function saveProfile() {
  const name = val("pfName").trim(), age = parseInt(val("pfAge"), 10);
  if (!name) return toast(t("fillAll"));
  if (!(age >= 12 && age <= 100)) return toast(t("ageInvalid"));
  updateUser({ name, age, city: val("pfCity").trim(), gender: val("pfGender"), goal: val("pfGoal") });
  renderAuthButton(); renderAuthView(); toast(t("profileUpdated"));
}
function changePassword() {
  const u = currentUser();
  if (u.pw !== obf(val("curPw"))) return toast(t("wrongCurrent"));
  const np = val("newPw"), cf = val("confPw");
  if (np.length < 6) return toast(t("pwShort"));
  if (np !== cf) return toast(t("pwMismatch"));
  updateUser({ pw: obf(np) }); reRenderSection(); toast(t("passwordUpdated"));
}
function changeEmail() {
  const u = currentUser(), ne = val("newEmailIn").trim().toLowerCase();
  if (!validEmail(ne)) return toast(t("emailInvalid"));
  if (u.pw !== obf(val("emailPw"))) return toast(t("wrongCurrent"));
  if (getUsers().some(x => x.email === ne && x.id !== u.id)) return toast(t("emailTaken"));
  updateUser({ email: ne }); setSession(ne); renderAuthView(); toast(t("emailUpdated"));
}
function askDelete() {
  const box = document.querySelector("#acctBody .danger-box");
  box.innerHTML = `<div style="font-weight:700;margin-bottom:8px;color:#ef4444">${t("deleteWarn")}</div>
    <button class="danger-btn" id="confirmDelete">${t("confirmDelete")}</button>
    <button class="btn ghost" id="cancelDelete" style="margin-inline-start:8px">${t("cancel")}</button>`;
}
function doDelete() {
  saveUsers(getUsers().filter(x => x.email !== getSession()));
  clearSession(); closeAuth(); renderAll(); toast(t("deleteAccount"));
}
function setPref(kind, value) {
  if (kind === "theme") state.theme = value;
  if (kind === "accent") state.accent = value;
  if (kind === "lang") state.lang = value;
  persist(); applyChrome(); renderControls();
  if (kind === "lang") { renderStaticText(); renderFilters(); renderResults(); renderAuthView(); }
  else reRenderSection();
}

/* ---------- event routing ---------- */
function onAuthClick(e) {
  const hit = (s) => e.target.closest(s);
  if (typeof handlePlanClick === "function" && handlePlanClick(e)) return;
  if (typeof handleFoodClick === "function" && handleFoodClick(e)) return;
  if (hit("#authX")) return closeAuth();
  if (hit("#toSignUp")) return openAuth("signup");
  if (hit("#toSignIn")) return openAuth("signin");
  if (hit("#googleBtn")) return handleGoogle();
  if (hit("#doSignIn")) return handleSignIn();
  if (hit("#doSignUp")) return handleSignUp();
  if (hit("#forgotPw")) return toast(state.lang === "ar" ? "إعادة تعيين كلمة المرور تأتي مع الخادم (المرحلة 2)" : "Password reset arrives with the backend (Phase 2)");
  if (hit("#signOutBtn")) return doLogout();
  const sec = hit("[data-sec]"); if (sec) return switchSection(sec.dataset.sec);
  if (hit("#saveProfile")) return saveProfile();
  if (hit("#removeAvatar")) { updateUser({ avatar: null }); renderAuthButton(); renderAuthView(); return toast(t("saved")); }
  if (hit("#addWeight")) return addWeight();
  const dw = hit("[data-delw]"); if (dw) return delWeight(dw.dataset.delw);
  if (hit("#savePw")) return changePassword();
  if (hit("#saveEmail")) return changeEmail();
  if (hit("#enable2fa")) return start2FA();
  if (hit("#verify2fa")) return verify2FA();
  if (hit("#disable2fa")) return disable2FA();
  if (hit("#addPasskey")) return addPasskey();
  if (hit("#deleteAcct")) return askDelete();
  if (hit("#confirmDelete")) return doDelete();
  if (hit("#cancelDelete")) return switchSection("danger");
  const pt = hit("[data-pref-theme]"); if (pt) return setPref("theme", pt.dataset.prefTheme);
  const pa = hit("[data-pref-accent]"); if (pa) return setPref("accent", pa.dataset.prefAccent);
  const pl = hit("[data-pref-lang]"); if (pl) return setPref("lang", pl.dataset.prefLang);
}
function onAuthChange(e) {
  if (typeof handlePlanChange === "function" && handlePlanChange(e)) return;
  if (typeof handleFoodChange === "function" && handleFoodChange(e)) return;
  if (e.target.id === "avatarInput") {
    const file = e.target.files && e.target.files[0];
    if (file) resizeImage(file, 256, (dataUrl) => {
      if (!dataUrl) return toast("⚠️");
      try { updateUser({ avatar: dataUrl }); } catch (err) { return toast("⚠️"); }
      renderAuthButton(); renderAuthView(); toast(t("saved"));
    });
    return;
  }
  const priv = e.target.dataset.priv, notif = e.target.dataset.notif;
  if (priv) { const p = { ...currentUser().privacy }; p[priv] = e.target.checked; updateUser({ privacy: p }); return toast(t("saved")); }
  if (notif) { const n = { ...currentUser().notif }; n[notif] = e.target.checked; updateUser({ notif: n }); return toast(t("saved")); }
  if (e.target.id === "prefCurrency") { state.currency = e.target.value; persist(); renderAll(); return reRenderSection(); }
}

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const back = document.getElementById("authBack");
  back.addEventListener("click", (e) => { if (e.target.id === "authBack") closeAuth(); });
  const modal = document.getElementById("authModal");
  modal.addEventListener("click", onAuthClick);
  modal.addEventListener("change", onAuthChange);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && back.classList.contains("open")) closeAuth(); });
  renderAuthButton();
});
