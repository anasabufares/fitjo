/* =============================================================
   FitJo — admin dashboard logic (vanilla JS)
   Add / edit / duplicate / remove gyms. Saving stores the gym
   list in the cloud (Netlify Function + Blobs) so every visitor
   sees it. Writes are protected by the ADMIN_PASSWORD you set in
   Netlify; the password you type here is sent with each save.
   ============================================================= */

const API = "/api/gyms";    // Netlify Function endpoint (GET public, POST needs password)

/* ---- Working copy of the gyms (edits here aren't saved until you Save). ---- */
const clone = (x) => JSON.parse(JSON.stringify(x));
let gyms = clone(typeof GYMS !== "undefined" ? GYMS : []);   // built-in list = fallback/seed
let editingIndex = -1;      // index in `gyms`, or -1 for a new gym
let cloudOnline = false;    // is the Netlify function reachable?
let adminPw = sessionStorage.getItem("fj_admin_pw") || "";   // the admin password (this session)

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

/* ---------- Wire up ---------- */
async function startDashboard() {
  applyTheme();
  renderList();                 // instant paint with built-in list
  await loadGymsFromCloud();     // then show whatever is saved in the cloud
  renderList();
  checkCloud();
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
