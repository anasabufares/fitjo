/* =============================================================
   FitJo — admin dashboard logic (vanilla JS)
   Add / edit / duplicate / remove gyms. Saving stores the gym
   list in the cloud (Netlify Function + Blobs) so every visitor
   sees it. Writes are protected by the ADMIN_PASSWORD you set in
   Netlify; the password you type here is sent with each save.
   ============================================================= */

const API = "/api/gyms";         // gyms Netlify Function (GET public, POST needs password)
const API_MEMBERS = "/api/members"; // members Netlify Function (POST; admin actions need password)

/* ---- Working copy of the gyms (edits here aren't saved until you Save). ---- */
const clone = (x) => JSON.parse(JSON.stringify(x));
let gyms = clone(typeof GYMS !== "undefined" ? GYMS : []);   // built-in list = fallback/seed
let editingIndex = -1;      // index in `gyms`, or -1 for a new gym
let cloudOnline = false;    // is the Netlify function reachable?
let adminPw = sessionStorage.getItem("fj_admin_pw") || "";   // the admin password (this session)
let view = "gyms";          // "gyms" | "members" | "coaches"
let members = null;         // loaded member list (null = not loaded yet)
let memberFilter = "";      // Members search box
let memberSort = "new";     // new | old | name | saved
let coachCodes = null;      // loaded coach passkeys (null = not loaded)

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const escAttr = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
  .replace(/</g, "&lt;").replace(/>/g, "&gt;");

const GRADIENTS = ["g-a", "g-b", "g-c", "g-d", "g-e", "g-f"];
const GENDERS = [["mixed", "Mixed"], ["women", "Women only"], ["men", "Men only"]];

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg, isErr = false) {
  const el = $("#atoast");
  el.textContent = msg;
  el.classList.toggle("err", isErr);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------- Theme (shares the app's saved preference) ---------- */
function applyTheme() {
  const theme = localStorage.getItem("fj_theme") || "light";
  const accent = localStorage.getItem("fj_accent") || "green";
  document.body.setAttribute("data-theme", theme);
  document.body.setAttribute("data-accent", accent);
  $("#themeBtn").textContent = theme === "light" ? "🌙" : "☀️";
}
function toggleTheme() {
  const next = (localStorage.getItem("fj_theme") || "light") === "light" ? "dark" : "light";
  localStorage.setItem("fj_theme", next);
  applyTheme();
}

/* ---------- Password gate ----------
   We can't check the password until a save (reads are public), so the gate
   just collects it. A wrong password is caught on the first Save (401). ---- */
function initGate() {
  if (adminPw) return unlock();
  const submit = () => {
    const val = $("#gatePass").value.trim();
    if (!val) { $("#gateErr").textContent = "Enter the admin password."; return; }
    adminPw = val;
    sessionStorage.setItem("fj_admin_pw", adminPw);
    unlock();
  };
  $("#gateBtn").addEventListener("click", submit);
  $("#gatePass").addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  $("#gatePass").focus();
}
function unlock() {
  $("#gate").style.display = "none";
  $("#dash").style.display = "block";
  startDashboard();
}
function relock(msg) {
  adminPw = "";
  sessionStorage.removeItem("fj_admin_pw");
  $("#dash").style.display = "none";
  $("#gate").style.display = "flex";
  $("#gateErr").textContent = msg || "";
  $("#gatePass").value = "";
  $("#gatePass").focus();
}

/* ---------- Cloud detection ---------- */
async function checkCloud() {
  const pill = $("#serverPill"), text = $("#serverPillText");
  try {
    const r = await fetch(API, { cache: "no-store" });
    cloudOnline = r.ok;
  } catch { cloudOnline = false; }

  if (cloudOnline) {
    pill.className = "pill ok"; text.textContent = "Connected to cloud";
    $("#serverBanner").style.display = "none";
  } else {
    pill.className = "pill warn"; text.textContent = "Cloud not reachable";
    $("#serverBanner").style.display = "block";
  }
}

/* ---------- Load the saved gym list from the cloud (falls back to built-in) ---------- */
async function loadGymsFromCloud() {
  try {
    const r = await fetch(API, { cache: "no-store" });
    if (!r.ok) return;
    const data = await r.json();
    if (data && Array.isArray(data.gyms) && data.gyms.length) gyms = data.gyms;
  } catch { /* keep the built-in fallback list */ }
}

/* ---------- Gym list ---------- */
function nextId() {
  let max = 0;
  gyms.forEach(g => { const m = /^g(\d+)$/.exec(g.id || ""); if (m) max = Math.max(max, +m[1]); });
  let id, n = max + 1;
  do { id = "g" + n++; } while (gyms.some(g => g.id === id));
  return id;
}

function renderList() {
  renderStats();
  $("#gymCount").textContent = `${gyms.length} gym${gyms.length === 1 ? "" : "s"}`;
  const list = $("#gymList");
  if (!gyms.length) {
    list.innerHTML = `<div style="color:var(--muted);padding:20px;text-align:center">No gyms yet. Add your first one below.</div>`;
    return;
  }
  list.innerHTML = gyms.map((g, i) => {
    const monthly = (g.plans || []).find(p => p.months === 1);
    const price = monthly ? `${monthly.priceJOD} JD/mo` : "—";
    const tags = [
      g.gender, price,
      g.pool ? "Pool" : null,
      g.open247 ? "24/7" : null,
      `★ ${g.rating ?? "—"}`,
      `${(g.facilities || []).length} facilities`,
    ].filter(Boolean);
    return `
      <div class="gym-row">
        <div class="gym-swatch ${GRADIENTS.includes(g.gradient) ? g.gradient : "g-a"}"></div>
        <div class="info">
          <div class="nm">${escAttr(g.name?.en || "(no name)")}</div>
          <div class="sub">${escAttr(g.name?.ar || "")} · ${escAttr(g.area?.en || "")} · <code>${escAttr(g.id)}</code></div>
          <div class="tags">${tags.map(t => `<span class="tag">${escAttr(t)}</span>`).join("")}</div>
        </div>
        <div class="acts">
          <button class="abtn ghost sm" data-edit="${i}">Edit</button>
          <button class="abtn ghost sm" data-dup="${i}">Duplicate</button>
          <button class="abtn danger sm" data-del="${i}">Delete</button>
        </div>
      </div>`;
  }).join("");

  $$("[data-edit]", list).forEach(b => b.onclick = () => openEditor(+b.dataset.edit));
  $$("[data-dup]", list).forEach(b => b.onclick = () => duplicateGym(+b.dataset.dup));
  $$("[data-del]", list).forEach(b => b.onclick = () => deleteGym(+b.dataset.del));
}

/* ---------- Editor: build form ---------- */
function fld(label, name, value, opts = {}) {
  const { type = "text", rtl = false, step, hint } = opts;
  const attrs = [
    `data-f="${name}"`, `type="${type}"`,
    rtl ? `dir="rtl"` : "",
    step ? `step="${step}"` : "",
    `value="${escAttr(value)}"`,
  ].filter(Boolean).join(" ");
  return `<div class="fld"><label>${label}</label><input ${attrs}>${hint ? `<div class="hint">${hint}</div>` : ""}</div>`;
}

function trainerRow(tr = {}) {
  return `<div class="repeat-row" style="grid-template-columns:1.1fr 1.1fr 1.1fr .7fr auto" data-row="trainer">
      <div class="fld"><label>Trainer name</label><input data-f="name" value="${escAttr(tr.name)}"></div>
      <div class="fld"><label>Specialty (EN)</label><input data-f="spec_en" value="${escAttr(tr.specialty?.en)}"></div>
      <div class="fld"><label>التخصص (AR)</label><input dir="rtl" data-f="spec_ar" value="${escAttr(tr.specialty?.ar)}"></div>
      <div class="fld"><label>JD/session</label><input type="number" step="1" data-f="price" value="${escAttr(tr.price)}"></div>
      <button class="iconbtn rm" data-rm type="button">✕</button>
    </div>`;
}
function planRow(pl = {}) {
  return `<div class="repeat-row" style="grid-template-columns:1.2fr 1.2fr .7fr .8fr auto" data-row="plan">
      <div class="fld"><label>Plan (EN)</label><input data-f="name_en" value="${escAttr(pl.name?.en)}"></div>
      <div class="fld"><label>الباقة (AR)</label><input dir="rtl" data-f="name_ar" value="${escAttr(pl.name?.ar)}"></div>
      <div class="fld"><label>Months</label><input type="number" step="1" data-f="months" value="${escAttr(pl.months)}"></div>
      <div class="fld"><label>Price (JD)</label><input type="number" step="1" data-f="price" value="${escAttr(pl.priceJOD)}"></div>
      <button class="iconbtn rm" data-rm type="button">✕</button>
    </div>`;
}
function offerRow(of = {}) {
  return `<div class="repeat-row" style="grid-template-columns:1fr 1fr auto" data-row="offer">
      <div class="fld"><label>Offer (EN)</label><input data-f="en" value="${escAttr(of.en)}"></div>
      <div class="fld"><label>العرض (AR)</label><input dir="rtl" data-f="ar" value="${escAttr(of.ar)}"></div>
      <button class="iconbtn rm" data-rm type="button">✕</button>
    </div>`;
}

function buildForm(g) {
  const facilityChecks = Object.entries(typeof FACILITIES !== "undefined" ? FACILITIES : {}).map(([key, f]) =>
    `<label><input type="checkbox" data-fac="${key}" ${(g.facilities || []).includes(key) ? "checked" : ""}>
       <span>${f.icon || ""} ${escAttr(f.en)}</span></label>`).join("");

  $("#edBody").innerHTML = `
    <div class="ed-section">Basics</div>
    <div class="grid3">
      ${fld("Gym ID", "id", g.id, { hint: "unique, e.g. g9" })}
      <div class="fld"><label>Gender access</label>
        <select data-f="gender">${GENDERS.map(([v, l]) => `<option value="${v}" ${g.gender === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="fld"><label>Cover color</label>
        <select data-f="gradient">${GRADIENTS.map(v => `<option value="${v}" ${g.gradient === v ? "selected" : ""}>${v}</option>`).join("")}</select></div>
    </div>
    <div class="grid2">
      ${fld("Name (EN)", "name_en", g.name?.en)}
      ${fld("الاسم (AR)", "name_ar", g.name?.ar, { rtl: true })}
      ${fld("Area (EN)", "area_en", g.area?.en)}
      ${fld("المنطقة (AR)", "area_ar", g.area?.ar, { rtl: true })}
      ${fld("Address (EN)", "address_en", g.address?.en)}
      ${fld("العنوان (AR)", "address_ar", g.address?.ar, { rtl: true })}
      ${fld("Phone", "phone", g.phone)}
      ${fld("WhatsApp", "whatsapp", g.whatsapp)}
    </div>
    <div class="grid3">
      ${fld("Rating (0–5)", "rating", g.rating, { type: "number", step: "0.1" })}
      ${fld("# Reviews", "reviews", g.reviews, { type: "number", step: "1" })}
      ${fld("Minimum age", "minAge", g.minAge, { type: "number", step: "1" })}
    </div>
    <div style="display:flex;gap:22px;margin-top:12px;flex-wrap:wrap">
      <label class="switch"><input type="checkbox" data-f="pool" id="poolChk" ${g.pool ? "checked" : ""}> Has a pool</label>
      <label class="switch"><input type="checkbox" data-f="open247" ${g.open247 ? "checked" : ""}> Open 24/7</label>
    </div>

    <div class="ed-section">Opening hours</div>
    <div class="grid2">
      ${fld("Sat–Thu", "hours_weekdays", g.hours?.weekdays, { hint: "e.g. 6:00 AM – 11:00 PM" })}
      ${fld("Friday", "hours_friday", g.hours?.friday, { hint: 'e.g. 10:00 AM – 10:00 PM or "Closed"' })}
    </div>

    <div id="poolWrap" style="${g.pool ? "" : "display:none"}">
      <div class="ed-section">Pool schedule</div>
      <div class="grid2">
        ${fld("Women", "pool_women", g.poolHours?.women)}
        ${fld("Men", "pool_men", g.poolHours?.men)}
      </div>
    </div>

    <div class="ed-section">Facilities</div>
    <div class="checkgrid" id="facGrid">${facilityChecks}</div>

    <div class="ed-section">Personal trainers</div>
    <div id="trainerList">${(g.trainers || []).map(trainerRow).join("")}</div>
    <button class="abtn ghost sm" id="addTrainer" type="button">＋ Add trainer</button>

    <div class="ed-section">Membership plans</div>
    <div id="planList">${(g.plans || []).map(planRow).join("")}</div>
    <button class="abtn ghost sm" id="addPlan" type="button">＋ Add plan</button>

    <div class="ed-section">Offers</div>
    <div id="offerList">${(g.offers || []).map(offerRow).join("")}</div>
    <button class="abtn ghost sm" id="addOffer" type="button">＋ Add offer</button>
  `;

  // Pool toggle shows/hides the pool schedule.
  $("#poolChk").addEventListener("change", (e) => {
    $("#poolWrap").style.display = e.target.checked ? "" : "none";
  });
  // Repeatable rows.
  $("#addTrainer").onclick = () => $("#trainerList").insertAdjacentHTML("beforeend", trainerRow());
  $("#addPlan").onclick = () => $("#planList").insertAdjacentHTML("beforeend", planRow());
  $("#addOffer").onclick = () => $("#offerList").insertAdjacentHTML("beforeend", offerRow());
  $("#edBody").addEventListener("click", (e) => {
    const rm = e.target.closest("[data-rm]");
    if (rm) rm.closest(".repeat-row").remove();
  });
}

/* ---------- Editor: open / read / save ---------- */
function blankGym() {
  return {
    id: nextId(), name: { en: "", ar: "" }, area: { en: "", ar: "" }, address: { en: "", ar: "" },
    phone: "", whatsapp: "", rating: 4.5, reviews: 0, gender: "mixed", minAge: 16, gradient: "g-a",
    pool: false, poolHours: null, hours: { weekdays: "", friday: "" },
    facilities: [], trainers: [], plans: [], offers: [], open247: false,
  };
}

function openEditor(index) {
  editingIndex = index;
  const isNew = index === -1;
  const g = isNew ? blankGym() : clone(gyms[index]);
  $("#edTitle").textContent = isNew ? "Add gym" : `Edit ${g.name?.en || g.id}`;
  buildForm(g);
  $("#edBack").classList.add("show");
  $(".ed-modal").scrollTop = 0;
}
function closeEditor() { $("#edBack").classList.remove("show"); editingIndex = -2; }

const numOr = (v, def) => { const n = parseFloat(v); return Number.isNaN(n) ? def : n; };

function readForm() {
  const v = (name) => { const el = $(`[data-f="${name}"]`); return el ? el.value.trim() : ""; };
  const id = v("id");
  if (!id) return { error: "Gym ID is required." };
  if (gyms.some((g, i) => g.id === id && i !== editingIndex)) return { error: `Gym ID "${id}" is already used.` };
  if (!v("name_en")) return { error: "English name is required." };

  const pool = $('[data-f="pool"]').checked;
  const facilities = $$('[data-fac]').filter(c => c.checked).map(c => c.dataset.fac);

  const trainers = $$('#trainerList .repeat-row').map(row => ({
    name: row.querySelector('[data-f="name"]').value.trim(),
    specialty: {
      en: row.querySelector('[data-f="spec_en"]').value.trim(),
      ar: row.querySelector('[data-f="spec_ar"]').value.trim(),
    },
    price: numOr(row.querySelector('[data-f="price"]').value, 0),
  })).filter(t => t.name);

  const plans = $$('#planList .repeat-row').map(row => ({
    name: {
      en: row.querySelector('[data-f="name_en"]').value.trim(),
      ar: row.querySelector('[data-f="name_ar"]').value.trim(),
    },
    months: Math.round(numOr(row.querySelector('[data-f="months"]').value, 1)),
    priceJOD: numOr(row.querySelector('[data-f="price"]').value, 0),
  })).filter(p => p.name.en || p.name.ar);

  const offers = $$('#offerList .repeat-row').map(row => ({
    en: row.querySelector('[data-f="en"]').value.trim(),
    ar: row.querySelector('[data-f="ar"]').value.trim(),
  })).filter(o => o.en || o.ar);

  const gym = {
    id,
    name: { en: v("name_en"), ar: v("name_ar") },
    area: { en: v("area_en"), ar: v("area_ar") },
    address: { en: v("address_en"), ar: v("address_ar") },
    phone: v("phone"), whatsapp: v("whatsapp"),
    rating: Math.max(0, Math.min(5, numOr(v("rating"), 0))),
    reviews: Math.max(0, Math.round(numOr(v("reviews"), 0))),
    gender: v("gender") || "mixed",
    minAge: Math.max(0, Math.round(numOr(v("minAge"), 0))),
    gradient: v("gradient") || "g-a",
    pool,
    poolHours: pool ? { women: v("pool_women"), men: v("pool_men") } : null,
    hours: { weekdays: v("hours_weekdays"), friday: v("hours_friday") },
    facilities, trainers, plans, offers,
    open247: $('[data-f="open247"]').checked,
  };
  return { gym };
}

async function saveEditor() {
  const { gym, error } = readForm();
  if (error) { toast(error, true); return; }
  if (editingIndex >= 0) gyms[editingIndex] = gym;
  else gyms.push(gym);
  closeEditor();
  renderList();
  await persist(editingIndex >= 0 ? "Gym updated" : "Gym added");
}

async function duplicateGym(index) {
  const copy = clone(gyms[index]);
  copy.id = nextId();
  copy.name = { en: (copy.name?.en || "") + " (copy)", ar: copy.name?.ar || "" };
  gyms.splice(index + 1, 0, copy);
  renderList();
  await persist("Gym duplicated");
}

async function deleteGym(index) {
  const g = gyms[index];
  if (!confirm(`Delete "${g.name?.en || g.id}"? This removes it for everyone.`)) return;
  gyms.splice(index, 1);
  renderList();
  await persist("Gym deleted");
}

/* ---------- Persistence (cloud) ---------- */
async function persist(okMsg) {
  try {
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": adminPw },
      body: JSON.stringify(gyms),
    });
    if (r.status === 401) { relock("Wrong admin password — try again."); return; }
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) { cloudOnline = true; toast(okMsg + " — published to everyone ✓"); }
    else toast("Save failed: " + (j.error || ("HTTP " + r.status)), true);
  } catch (e) {
    cloudOnline = false;
    checkCloud();
    toast("Save failed — cloud not reachable. Is the site deployed on Netlify?", true);
  }
}

/* ---- Download the current gyms as a data.js block (handy to refresh the built-in seed). ---- */
function downloadBackup() {
  const block = "const GYMS = " + JSON.stringify(gyms, null, 2) + ";\n";
  const blob = new Blob([block], { type: "text/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fitjo-gyms-backup.js";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Backup downloaded");
}

/* ---------- Members ---------- */
function renderStats() {
  const el = $("#adminStats"); if (!el) return;
  const withPlan = members ? members.filter(m => m.hasPlan).length : null;
  const cards = [
    ["🏋️", gyms.length, "Gyms"],
    ["👥", members ? members.length : "—", "Members"],
    ["📋", withPlan == null ? "—" : withPlan, "With a plan"],
  ];
  el.innerHTML = cards.map(([ic, n, l]) => `<div class="stat-card"><div class="sc-ic">${ic}</div><div class="sc-n">${n}</div><div class="sc-l">${l}</div></div>`).join("");
}

function switchView(v) {
  view = v;
  $$(".atab").forEach(b => b.classList.toggle("active", b.dataset.view === v));
  $("#gymsView").style.display = v === "gyms" ? "" : "none";
  $("#membersView").style.display = v === "members" ? "" : "none";
  $("#coachesView").style.display = v === "coaches" ? "" : "none";
  if (v === "members" && members === null) loadMembers();
  if (v === "coaches" && coachCodes === null) loadCoachCodes();
}

/* ---------- Coach passkeys ---------- */
async function coachAction(payload) {
  const r = await fetch(API_MEMBERS, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-password": adminPw },
    body: JSON.stringify(payload),
  });
  if (r.status === 401) { relock("Wrong admin password — try again."); return null; }
  return r.json().catch(() => ({}));
}
async function loadCoachCodes() {
  const list = $("#coachCodesList");
  list.innerHTML = `<div class="muted-note">Loading…</div>`;
  try {
    const j = await coachAction({ action: "coach-codes" });
    if (j && Array.isArray(j.codes)) { coachCodes = j.codes; renderCoachCodes(); }
    else if (j) list.innerHTML = `<div class="muted-note">Couldn't load: ${escAttr(j.error || "error")}</div>`;
  } catch (e) { list.innerHTML = `<div class="muted-note">Cloud not reachable — coach passkeys work on the deployed Netlify site.</div>`; }
}
function renderCoachCodes() {
  const arr = (coachCodes || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  $("#coachCount").textContent = `${arr.length} key${arr.length === 1 ? "" : "s"}`;
  const list = $("#coachCodesList");
  if (!arr.length) { list.innerHTML = `<div class="muted-note">No access keys yet. Generate one above for each coach.</div>`; return; }
  list.innerHTML = arr.map(c => `
    <div class="cc-row">
      <div class="cc-info">
        <div class="cc-code">${escAttr(c.code)}</div>
        <div class="cc-label">${escAttr(c.label || "Coach")} · ${fmtWhen(c.createdAt)}</div>
      </div>
      <div class="acts">
        <button class="abtn ghost sm" data-copycode="${escAttr(c.code)}">Copy</button>
        <button class="abtn danger sm" data-delcode="${escAttr(c.code)}">Revoke</button>
      </div>
    </div>`).join("");
  $$("[data-copycode]", list).forEach(b => b.onclick = () => copyCoachCode(b.dataset.copycode));
  $$("[data-delcode]", list).forEach(b => b.onclick = () => revokeCoachCode(b.dataset.delcode));
}
async function generateCoachCode() {
  const label = ($("#coachLabel").value || "").trim();
  const j = await coachAction({ action: "coach-code-add", label });
  if (j && j.ok) { coachCodes = j.codes; $("#coachLabel").value = ""; renderCoachCodes(); toast(`Access key generated: ${j.code}`); }
  else if (j) toast("Failed: " + (j.error || "error"), true);
}
async function revokeCoachCode(code) {
  if (!confirm(`Revoke access key ${code}? The coach using it will lose access.`)) return;
  const j = await coachAction({ action: "coach-code-del", code });
  if (j && j.ok) { coachCodes = j.codes; renderCoachCodes(); toast("Access key revoked"); }
}
function copyCoachCode(code) {
  try { navigator.clipboard.writeText(code); toast("Copied " + code); }
  catch (e) { toast(code); }
}

async function loadMembers() {
  const list = $("#memberList");
  list.innerHTML = `<div class="muted-note">Loading members…</div>`;
  try {
    const r = await fetch(API_MEMBERS, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": adminPw },
      body: JSON.stringify({ action: "list" }),
    });
    if (r.status === 401) { relock("Wrong admin password — try again."); return; }
    const j = await r.json().catch(() => ({}));
    if (Array.isArray(j.members)) { members = j.members; renderMembers(); renderStats(); }
    else { list.innerHTML = `<div class="muted-note">Couldn't load members: ${escAttr(j.error || ("HTTP " + r.status))}</div>`; }
  } catch (e) {
    list.innerHTML = `<div class="muted-note">Cloud not reachable — members only load on the deployed Netlify site.</div>`;
  }
}

function fmtWhen(ts) {
  if (!ts) return "—";
  try { return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); } catch (e) { return "—"; }
}

function renderMembers() {
  const list = $("#memberList");
  const all = (members || []);
  const q = memberFilter.trim().toLowerCase();
  let arr = all.slice();
  if (q) arr = arr.filter(m => (m.name || "").toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q) || (m.phone || "").includes(memberFilter.trim()));
  const sorters = {
    new: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    old: (a, b) => (a.createdAt || 0) - (b.createdAt || 0),
    name: (a, b) => (a.name || "").localeCompare(b.name || ""),
    saved: (a, b) => (b.favorites || 0) - (a.favorites || 0),
  };
  arr.sort(sorters[memberSort] || sorters.new);
  $("#memberCount").textContent = `${arr.length} member${arr.length === 1 ? "" : "s"}${q ? ` of ${all.length}` : ""}`;
  if (!all.length) { list.innerHTML = `<div class="muted-note">No members yet. They appear here once someone signs up on the live app.</div>`; return; }
  if (!arr.length) { list.innerHTML = `<div class="muted-note">No members match “${escAttr(memberFilter)}”.</div>`; return; }
  list.innerHTML = arr.map(m => `
    <div class="member-row" data-member="${escAttr(m.email)}" title="View details">
      <div class="member-avatar">${escAttr((m.name || m.email || "?").trim().charAt(0).toUpperCase())}</div>
      <div class="member-info">
        <div class="nm">${escAttr(m.name || "(no name)")}</div>
        <div class="sub">${escAttr(m.email)}</div>
        <div class="member-meta">
          <span class="tag">📱 ${escAttr(m.phone || "—")}</span>
          <span class="tag">🎂 ${escAttr(m.age ?? "—")}</span>
          <span class="tag">🏋️ ${escAttr(m.favorites ?? 0)} saved</span>
          <span class="tag">${m.hasPlan ? "📋 plan ✓" : "📋 no plan"}</span>
          ${m.goal ? `<span class="tag">🎯 ${escAttr(m.goal)}</span>` : ""}
          <span class="tag">🗓️ ${escAttr(fmtWhen(m.createdAt))}</span>
        </div>
      </div>
      <button class="abtn danger sm" data-delmember="${escAttr(m.email)}">Remove</button>
    </div>`).join("");
  $$(".member-row", list).forEach(row => row.onclick = (e) => {
    if (e.target.closest("[data-delmember]")) return deleteMember(e.target.closest("[data-delmember]").dataset.delmember);
    openMemberDetail(row.dataset.member);
  });
}

function openMemberDetail(email) {
  const m = (members || []).find(x => x.email === email);
  if (!m) return;
  const gymName = (id) => { const g = gyms.find(x => x.id === id); return g ? (g.name?.en || id) : id; };
  const favs = m.favoriteIds || [];
  const w = m.weights || {};
  const sub = m.subscription;
  const subGym = sub ? gymName(sub.gymId) : null;
  const subDays = sub ? Math.max(0, Math.ceil((sub.expiresAt - Date.now()) / 86400000)) : 0;
  const row = (label, value) => `<div class="md-cell"><span>${label}</span><b>${escAttr(value)}</b></div>`;
  $("#memberTitle").textContent = m.name || m.email;
  $("#memberBody").innerHTML = `
    <div class="md-grid">
      ${row("Email", m.email)}
      ${row("Phone", m.phone || "—")}
      ${row("Age", m.age ?? "—")}
      ${row("Goal", m.goal || "—")}
      ${row("City", m.city || "—")}
      ${row("Has plan", m.hasPlan ? "Yes" : "No")}
      ${row("Points", m.points ?? 0)}
      ${row("Check-ins", m.checkins ?? 0)}
      ${row("Joined", fmtWhen(m.createdAt))}
      ${row("Last seen", fmtWhen(m.lastSeen))}
    </div>
    <div class="ed-section">Subscription</div>
    ${sub ? `<div class="md-grid">${row("Gym", subGym)}${row("Plan", sub.months + " mo")}${row("Days left", subDays)}${row("Expires", fmtWhen(sub.expiresAt))}</div>`
      : `<div class="muted-note" style="padding:10px">Not subscribed.</div>`}
    <div class="ed-section">Saved gyms (${favs.length})</div>
    ${favs.length ? `<div class="md-tags">${favs.map(id => `<span class="tag">${escAttr(gymName(id))}</span>`).join("")}</div>` : `<div class="muted-note" style="padding:10px">None saved.</div>`}
    <div class="ed-section">Weight</div>
    ${w && w.count ? `<div class="md-grid">${row("Start", (w.start ?? "—") + " kg")}${row("Current", (w.current ?? "—") + " kg")}${row("Entries", w.count)}</div>`
      : `<div class="muted-note" style="padding:10px">No weight logged.</div>`}
    <div style="display:flex;gap:8px;margin-top:18px">
      <button class="abtn" id="editMemberBtn">✏️ Edit member</button>
      <button class="abtn danger" id="delMemberBtn">Remove</button>
    </div>`;
  $("#editMemberBtn").onclick = () => openEditMember(m.email);
  $("#delMemberBtn").onclick = () => { closeMemberDetail(); deleteMember(m.email); };
  $("#memberBack").classList.add("show");
}
function closeMemberDetail() { $("#memberBack").classList.remove("show"); }

function exportMembersCSV() {
  const arr = members || [];
  if (!arr.length) { toast("No members to export", true); return; }
  const cols = ["name", "email", "phone", "age", "goal", "city", "favorites", "hasPlan", "createdAt", "lastSeen"];
  const cell = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const rows = arr.map(m => cols.map(c => (c === "createdAt" || c === "lastSeen") ? cell(m[c] ? new Date(m[c]).toISOString() : "") : cell(m[c])).join(","));
  const csv = [cols.join(","), ...rows].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "fitjo-members.csv"; a.click(); URL.revokeObjectURL(a.href);
  toast(`Exported ${arr.length} members`);
}

function openAddMember() {
  ["amName", "amEmail", "amPhone", "amAge", "amGoal", "amCity"].forEach(id => { const el = $("#" + id); if (el) el.value = ""; });
  $("#addMemberBack").querySelector("h2").textContent = "Add a member";
  $("#addMemberSave").textContent = "Add member";
  $("#amEmail").disabled = false;
  $("#addMemberBack").classList.add("show");
}
function openEditMember(email) {
  const m = (members || []).find(x => x.email === email);
  if (!m) return;
  closeMemberDetail();
  $("#amName").value = m.name || ""; $("#amEmail").value = m.email || "";
  $("#amPhone").value = m.phone || ""; $("#amAge").value = m.age ?? "";
  $("#amGoal").value = m.goal || ""; $("#amCity").value = m.city || "";
  $("#amEmail").disabled = true;   // email is the key; keep it fixed while editing
  $("#addMemberBack").querySelector("h2").textContent = "Edit member";
  $("#addMemberSave").textContent = "Save changes";
  $("#addMemberBack").classList.add("show");
}
function closeAddMember() { $("#addMemberBack").classList.remove("show"); }
async function saveNewMember() {
  const name = $("#amName").value.trim();
  const email = $("#amEmail").value.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast("Enter a valid email", true); return; }
  const payload = {
    name, email, phone: $("#amPhone").value.trim(),
    age: parseInt($("#amAge").value, 10) || null,
    goal: $("#amGoal").value.trim(), city: $("#amCity").value.trim(),
  };
  try {
    // register endpoint (no admin header) upserts the member by email
    const r = await fetch(API_MEMBERS, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) { closeAddMember(); members = null; loadMembers(); toast("Member added"); }
    else toast("Failed: " + (j.error || ("HTTP " + r.status)), true);
  } catch (e) { toast("Cloud not reachable — add members on the deployed Netlify site.", true); }
}

async function deleteMember(email) {
  if (!confirm(`Remove member "${email}" from the list?`)) return;
  try {
    const r = await fetch(API_MEMBERS, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": adminPw },
      body: JSON.stringify({ action: "delete", email }),
    });
    if (r.status === 401) { relock("Wrong admin password — try again."); return; }
    const j = await r.json().catch(() => ({}));
    if (j.ok) { members = (members || []).filter(m => m.email !== email); renderMembers(); toast("Member removed"); }
    else toast("Remove failed: " + (j.error || ("HTTP " + r.status)), true);
  } catch (e) { toast("Cloud not reachable", true); }
}

/* ---------- Wire up ---------- */
async function startDashboard() {
  applyTheme();
  renderList();                 // instant paint with built-in list
  await loadGymsFromCloud();     // then show whatever is saved in the cloud
  renderList();
  checkCloud();
  $$(".atab").forEach(b => b.onclick = () => switchView(b.dataset.view));
  const rmb = $("#refreshMembers"); if (rmb) rmb.onclick = () => { members = null; loadMembers(); };
  const ms = $("#memberSearch"); if (ms) ms.oninput = () => { memberFilter = ms.value; if (members) renderMembers(); };
  const mso = $("#memberSort"); if (mso) mso.onchange = () => { memberSort = mso.value; if (members) renderMembers(); };
  const ex = $("#exportMembers"); if (ex) ex.onclick = exportMembersCSV;
  const gc = $("#genCoach"); if (gc) gc.onclick = generateCoachCode;
  const amb = $("#addMemberBtn"); if (amb) amb.onclick = openAddMember;
  const amc = $("#addMemberClose"); if (amc) amc.onclick = closeAddMember;
  const amx = $("#addMemberCancel"); if (amx) amx.onclick = closeAddMember;
  const ams = $("#addMemberSave"); if (ams) ams.onclick = saveNewMember;
  $("#addMemberBack").addEventListener("click", (e) => { if (e.target === $("#addMemberBack")) closeAddMember(); });
  const mc = $("#memberClose"); if (mc) mc.onclick = closeMemberDetail;
  $("#memberBack").addEventListener("click", (e) => { if (e.target === $("#memberBack")) closeMemberDetail(); });
  loadMembers();   // load in the background so the stats bar shows member counts
  $("#themeBtn").onclick = toggleTheme;
  const so = $("#signOutBtn"); if (so) so.onclick = () => relock("");
  $("#backupBtn").onclick = downloadBackup;
  $("#addBtn").onclick = () => openEditor(-1);
  $("#edClose").onclick = closeEditor;
  $("#edCancel").onclick = closeEditor;
  $("#edSave").onclick = saveEditor;
  $("#edBack").addEventListener("click", (e) => { if (e.target === $("#edBack")) closeEditor(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#edBack").classList.contains("show")) closeEditor(); });
}

initGate();
