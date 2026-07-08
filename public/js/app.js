/* =============================================================
   FitJo — app logic (vanilla JS, runs directly from file://)
   ============================================================= */

const state = {
  lang: localStorage.getItem("fj_lang") || "en",
  theme: localStorage.getItem("fj_theme") || "light",
  currency: localStorage.getItem("fj_cur") || "JOD",
  unit: localStorage.getItem("fj_unit") || "kg",   // weight unit: kg | lbs
  favorites: JSON.parse(localStorage.getItem("fj_favs") || "[]"),
  tab: "all",             // all | favorites
  view: "list",           // list | detail
  viewMode: localStorage.getItem("fj_view") || "list",   // list | map (results display)
  geo: null,              // { lat, lng } once the user shares their location
  currentGym: null,
  compare: [],            // gym ids selected for comparison (max 3)
  filtersOpen: (localStorage.getItem("fj_filtersOpen") ?? (window.innerWidth > 860 ? "true" : "false")) === "true",
  filters: { q: "", area: "", facilities: [], pool: "any", access: "any", minAge: 0, maxPrice: 80, sort: "rating", open247: false },
};

/* ---------- Live occupancy (computed from current hour) ---------- */
function occupancy(gym) {
  const hour = new Date().getHours();
  let base = 30;
  if (hour >= 6 && hour < 9) base += 35;
  else if (hour >= 17 && hour < 21) base += 45;
  else if (hour >= 9 && hour < 12) base += 15;
  else if (hour >= 12 && hour < 17) base += 20;
  else if (hour >= 21) base += 8;
  else base -= 12; // late night
  if (gym.open247 && (hour < 6)) base = 15;
  let h = 0; for (const c of gym.id) h += c.charCodeAt(0);
  base += (h % 18) - 9 + Math.round((gym.rating - 4.5) * 12);
  const pct = Math.max(6, Math.min(96, base));
  const level = pct < 35 ? "quiet" : pct < 65 ? "moderate" : "busy";
  return { pct, level };
}

/* ---------- Reviews (pick 3 per gym deterministically) ---------- */
function pickReviews(gym) {
  let h = 0; for (const c of gym.id) h += c.charCodeAt(0);
  const start = h % REVIEWS.length;
  return [0, 1, 2].map(i => REVIEWS[(start + i) % REVIEWS.length]);
}

const $ = (sel, root = document) => root.querySelector(sel);
const t = (key) => I18N[state.lang][key] ?? key;

/* ---------- Persistence + global chrome ---------- */
function persist() {
  localStorage.setItem("fj_lang", state.lang);
  localStorage.setItem("fj_theme", state.theme);
  localStorage.setItem("fj_cur", state.currency);
  localStorage.setItem("fj_unit", state.unit);
  localStorage.setItem("fj_favs", JSON.stringify(state.favorites));
  localStorage.setItem("fj_filtersOpen", String(state.filtersOpen));
  localStorage.setItem("fj_view", state.viewMode);
}
function activeFilterCount() {
  const f = state.filters; let n = 0;
  if (f.area) n++;
  n += f.facilities.length;
  if (f.pool !== "any") n++;
  if (f.open247) n++;
  if (f.access !== "any") n++;
  if (f.minAge) n++;
  if (f.maxPrice < 80) n++;
  return n;
}
function toggleFilters() { state.filtersOpen = !state.filtersOpen; persist(); renderFilters(); }

function applyChrome() {
  document.documentElement.setAttribute("dir", I18N[state.lang].dir);
  document.documentElement.setAttribute("lang", state.lang);
  document.body.setAttribute("data-theme", state.theme);
}

/* ---------- Money ---------- */
function fmtPrice(jod) {
  const c = CURRENCIES[state.currency];
  let v = jod * c.rate;
  v = v >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  const num = v.toLocaleString(state.lang === "ar" ? "ar-JO" : "en-US");
  return state.currency === "JOD" || state.currency === "KWD"
    ? `${num} ${c.symbol}`
    : `${c.symbol}${num}`;
}
function minPlanJOD(g) { return Math.min(...g.plans.map(p => p.priceJOD)); }
function monthlyJOD(g) {
  const m = g.plans.find(p => p.months === 1);
  return m ? m.priceJOD : minPlanJOD(g);
}

/* ---------- Weight units (kg internal; display kg or lbs) ---------- */
const KG_PER_LB = 0.45359237;
function wLabel() { return state.unit === "lbs" ? "lbs" : "kg"; }
function wDisplay(kg) { const v = state.unit === "lbs" ? kg / KG_PER_LB : kg; return Math.round(v * 10) / 10; }
function wToKg(v) { const n = parseFloat(v); if (isNaN(n)) return NaN; return state.unit === "lbs" ? n * KG_PER_LB : n; }

/* ---------- Filtering ---------- */
function filteredGyms() {
  let list = GYMS.slice();
  const f = state.filters;

  if (state.tab === "favorites") list = list.filter(g => state.favorites.includes(g.id));

  if (f.q.trim()) {
    const q = f.q.trim().toLowerCase();
    list = list.filter(g =>
      g.name.en.toLowerCase().includes(q) || g.name.ar.includes(q) ||
      g.area.en.toLowerCase().includes(q) || g.area.ar.includes(q));
  }
  if (f.area) list = list.filter(g => g.area.en === f.area);
  if (f.facilities.length) list = list.filter(g => f.facilities.every(fc => g.facilities.includes(fc)));
  if (f.pool === "yes") list = list.filter(g => g.pool);
  if (f.pool === "no") list = list.filter(g => !g.pool);
  if (f.open247) list = list.filter(g => g.open247);
  if (f.access !== "any") list = list.filter(g => g.gender === f.access);
  if (f.minAge) list = list.filter(g => g.minAge <= f.minAge);
  list = list.filter(g => monthlyJOD(g) <= f.maxPrice);

  if (f.sort === "rating") list.sort((a, b) => b.rating - a.rating);
  if (f.sort === "priceLow") list.sort((a, b) => monthlyJOD(a) - monthlyJOD(b));
  if (f.sort === "priceHigh") list.sort((a, b) => monthlyJOD(b) - monthlyJOD(a));
  if (f.sort === "nearest") {
    if (state.geo && typeof gymDistanceKm === "function") {
      list.sort((a, b) => (gymDistanceKm(a) ?? Infinity) - (gymDistanceKm(b) ?? Infinity));
    } else {
      list.sort((a, b) => b.rating - a.rating);   // no location yet — fall back to top-rated
    }
  }
  return list;
}

/* ---------- Render: top bar controls ---------- */
function renderControls() {
  const langBtn = $("#langToggle");
  langBtn.textContent = state.lang === "en" ? "العربية" : "EN";

  const themeBtn = $("#themeToggle");
  themeBtn.textContent = state.theme === "light" ? "🌙" : "☀️";

  const cur = $("#currencySel");
  if (!cur.dataset.built) {
    cur.innerHTML = Object.keys(CURRENCIES).map(k => `<option value="${k}">${k}</option>`).join("");
    cur.dataset.built = "1";
  }
  cur.value = state.currency;
}

/* ---------- Render: hero + labels ---------- */
function renderStaticText() {
  $("#brandTag").textContent = t("brandTag");
  $("#heroTitle").textContent = t("heroTitle");
  $("#heroSub").textContent = t("heroSub");
  $("#searchInput").placeholder = t("searchPlaceholder");
  $("#searchInput").value = state.filters.q;
  renderServices();
}

/* ---------- Render: services hub (Careem-style) ---------- */
function renderServices() {
  const L = state.lang === "ar";
  $("#svcTitle").textContent = L ? "الخدمات" : "Services";
  $("#svcGymLbl").textContent = L ? "النادي" : "Gym";
  $("#svcNutritionLbl").textContent = L ? "التغذية" : "Nutrition";
  $("#svcSuppsLbl").textContent = L ? "المكملات" : "Supplements";
  $("#svcRankLbl").textContent = L ? "التصنيف" : "Rank";
  $("#svcPointsLbl").textContent = L ? "نقطة" : "points";
  const u = (typeof currentUser === "function") ? currentUser() : null;
  const chip = $("#svcPoints");
  if (u) { $("#svcPointsNum").textContent = u.points || 0; chip.style.display = ""; }
  else chip.style.display = "none";
  renderRankTile(u);
  if (svcGroup) renderServicePanel();   // keep the inline panel in sync on language change
}

/* Rank tile: show the user's own rank as a medal instead of the logo */
function rankMedalSVG(color, roman) {
  return `<svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true">
    <path d="M16 28 L11 44 L18.5 40.5 L22 47 L26 33" fill="${color}" opacity=".75"/>
    <path d="M32 28 L37 44 L29.5 40.5 L26 47 L22 33" fill="${color}" opacity=".55"/>
    <circle cx="24" cy="19" r="13.5" fill="${color}"/>
    <circle cx="24" cy="19" r="13.5" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2.5"/>
    <text x="24" y="24" text-anchor="middle" font-size="13" font-weight="900" fill="#fff" font-family="inherit">${roman}</text>
  </svg>`;
}
function renderRankTile(u) {
  const ico = $("#svcRank") && $("#svcRank").querySelector(".svc-ico");
  if (!ico) return;
  if (u && u.liftLog && u.rankBw && typeof overallScore === "function") {
    const o = overallScore(u.liftLog, u.rankBw, u.gender);
    if (o) {
      const td = tierOfScore(o.score);
      const col = RANK_TIERS[td.tier].color;
      ico.innerHTML = rankMedalSVG(col, divRoman(td.div));
      ico.style.background = `color-mix(in srgb, ${col} 20%, var(--surface-2))`;
      $("#svcRank").title = `${tierName(td.tier)} ${divRoman(td.div)}`;
      return;
    }
  }
  ico.textContent = "🏆"; ico.style.background = ""; $("#svcRank").title = "";
}

/* ---------- inline service panels (show in place of the gym list) ---------- */
const SVC_GROUPS = { gym: ["gyms", "workouts"], nutrition: ["plan", "nutrition", "progress"], rank: ["rank"], supplements: ["supplements"] };
const SVC_TABS = {
  gyms: ["🏋️", "Gyms", "الأندية"],
  workouts: ["💪", "Workouts", "التمارين"],
  plan: ["🎯", "My plan", "خطتي"],
  nutrition: ["🍎", "Calorie tracker", "متتبّع السعرات"],
  progress: ["📈", "My progress", "تقدّمي"],
  rank: ["🏆", "Rank", "التصنيف"],
  supplements: ["💊", "Supplements", "المكملات"],
};
let svcGroup = null;     // "nutrition" | "rank" | "supplements" while the panel is open
let svcSection = null;   // active section inside the group

function openServicePanel(group, sub) {
  if (typeof currentUser !== "function" || !currentUser()) return openAuth("signin");
  svcGroup = group;
  svcSection = sub || SVC_GROUPS[group][0];
  if (svcSection !== "gyms") acctSection = svcSection;   // section helpers re-render via #acctBody
  closeAuth();
  renderServicePanel();
  $("#svcPanel").hidden = false;
  $("#svcPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}
function openNutritionPanel(sub) { openServicePanel("nutrition", sub); }
function closeServicePanel() {
  const p = $("#svcPanel");
  if (!p || p.hidden) return;
  p.hidden = true; p.innerHTML = "";
  $(".layout").style.display = "";
  svcGroup = null; svcSection = null;
}
function renderServicePanel() {
  const L = state.lang === "ar";
  const keys = SVC_GROUPS[svcGroup];
  const head = keys.length > 1
    ? `<div class="tabs">${keys.map(k => `<button class="tab ${svcSection === k ? "active" : ""}" data-svctab="${k}">${SVC_TABS[k][0]} ${SVC_TABS[k][L ? 2 : 1]}</button>`).join("")}</div>`
    : `<div class="svcp-title">${SVC_TABS[svcSection][0]} ${SVC_TABS[svcSection][L ? 2 : 1]}</div>`;
  // the "gyms" tab shows the real directory below the tab bar instead of a section
  const showsGyms = svcSection === "gyms";
  $("#svcPanel").innerHTML = `
    <div class="svcp-head">
      ${head}
      <button class="icon-btn" id="svcPanelClose" title="✕">✕</button>
    </div>
    ${showsGyms ? "" : `<div class="acct-body svcp-body" id="acctBody">${sectionHTML(svcSection)}</div>`}`;
  $(".layout").style.display = showsGyms ? "" : "none";
}

/* ---------- Render: filters panel ---------- */
function renderFilters() {
  const f = state.filters;
  const areas = [...new Set(GYMS.map(g => g.area.en))];
  const areaSel = $("#areaSel");
  areaSel.innerHTML = `<option value="">${t("allAreas")}</option>` +
    areas.map(a => {
      const g = GYMS.find(x => x.area.en === a);
      return `<option value="${a}">${g.area[state.lang]}</option>`;
    }).join("");
  areaSel.value = f.area;

  $("#lblFilters").textContent = t("filters");
  // collapse / expand state + active-filter count badge
  $("#filtersPanel").classList.toggle("collapsed", !state.filtersOpen);
  const cnt = activeFilterCount();
  const cEl = $("#filtersCount");
  cEl.textContent = cnt;
  cEl.classList.toggle("show", cnt > 0);
  $("#lblArea").textContent = t("area");
  $("#lblFacilities").textContent = t("facilities");
  $("#lblPool").textContent = t("pool");
  $("#lblAccess").textContent = t("access");
  $("#lblAge").textContent = t("minAge");
  $("#lblPrice").textContent = t("maxPrice");
  $("#lblSort").textContent = t("sort");
  $("#clearBtn").textContent = t("clearFilters");

  // facilities chips
  $("#facilChips").innerHTML = Object.entries(FACILITIES).map(([k, v]) =>
    `<button class="chip ${f.facilities.includes(k) ? "active" : ""}" data-facil="${k}">${v.icon} ${v[state.lang]}</button>`
  ).join("");

  // pool chips
  $("#poolChips").innerHTML = [["any", t("poolAny")], ["yes", t("poolYes")], ["no", t("poolNo")]]
    .map(([k, l]) => `<button class="chip ${f.pool === k ? "active" : ""}" data-pool="${k}">${l}</button>`).join("");

  // 24/7 chip
  $("#lbl247").textContent = t("h247");
  $("#h247Chips").innerHTML = `<button class="chip ${f.open247 ? "active" : ""}" data-247="1">🕛 ${t("open247")}</button>`;

  // access chips
  $("#accessChips").innerHTML = [["any", t("accessAny")], ["mixed", t("accessMixed")], ["women", t("accessWomen")], ["men", t("accessMen")]]
    .map(([k, l]) => `<button class="chip ${f.access === k ? "active" : ""}" data-access="${k}">${l}</button>`).join("");

  // age
  const ageSel = $("#ageSel");
  ageSel.innerHTML = `<option value="0">${t("anyAge")}</option>` +
    [12, 14, 16, 18].map(a => `<option value="${a}">${a}+</option>`).join("");
  ageSel.value = String(f.minAge);

  // price
  $("#priceRange").value = f.maxPrice;
  $("#priceVal").textContent = `${t("from")} — ${fmtPrice(f.maxPrice)}${t("perMonth")}`;

  // sort
  const sortSel = $("#sortSel");
  sortSel.innerHTML = [["rating", t("sortRating")], ["priceLow", t("sortPriceLow")], ["priceHigh", t("sortPriceHigh")], ["nearest", t("sortNearest")]]
    .map(([k, l]) => `<option value="${k}">${l}</option>`).join("");
  sortSel.value = f.sort;
}

/* ---------- Render: tabs + results ---------- */
function renderResults() {
  $("#tabAll").textContent = t("all");
  $("#tabFav").textContent = `${t("favorites")} (${state.favorites.length})`;
  $("#tabAll").classList.toggle("active", state.tab === "all");
  $("#tabFav").classList.toggle("active", state.tab === "favorites");

  const list = filteredGyms();
  $("#resultCount").textContent = `${list.length} ${t("resultsFound")}`;
  updateTools();

  const isMap = state.viewMode === "map";
  const grid = $("#grid"), mapWrap = $("#mapWrap");
  if (grid) grid.style.display = isMap ? "none" : "grid";
  if (mapWrap) mapWrap.style.display = isMap ? "block" : "none";

  if (isMap) {
    if (typeof renderMap === "function") renderMap(list);
    return;
  }
  if (!list.length) {
    grid.innerHTML = `<div class="empty">${state.tab === "favorites" && !state.favorites.length ? t("favEmpty") : t("noResults")}</div>`;
    return;
  }
  grid.innerHTML = list.map(cardHTML).join("");
}

/* ---------- Results tools: List/Map toggle + Near-me button ---------- */
function updateTools() {
  const nb = $("#nearMeBtn");
  if (nb) {
    const lbl = $("#nearMeLbl"); if (lbl) lbl.textContent = t("nearMe");
    nb.classList.toggle("active", state.filters.sort === "nearest" && !!state.geo);
  }
  const vl = $("#viewListBtn"), vm = $("#viewMapBtn");
  if (vl) { const l = $("#viewListLbl"); if (l) l.textContent = t("viewList"); vl.classList.toggle("active", state.viewMode === "list"); }
  if (vm) { const l = $("#viewMapLbl"); if (l) l.textContent = t("viewMap"); vm.classList.toggle("active", state.viewMode === "map"); }
}
function setViewMode(m) {
  state.viewMode = m; persist();
  if (state.view === "detail") showList();
  renderResults();
}
/* Ask for location, then sort by distance and refresh (map re-centres on the user). */
function requestNearMe() {
  state.filters.sort = "nearest";
  const apply = () => { renderFilters(); renderResults(); if (state.viewMode === "map" && typeof centerOnUser === "function") centerOnUser(); };
  const fail = () => { if (state.filters.sort === "nearest" && !state.geo) state.filters.sort = "rating"; renderFilters(); renderResults(); };
  if (typeof requestGeo === "function") requestGeo(apply, fail);
  else apply();
}

function cardHTML(g) {
  const isFav = state.favorites.includes(g.id);
  const inCmp = state.compare.includes(g.id);
  const occ = occupancy(g);
  const occLabel = t("occ" + occ.level[0].toUpperCase() + occ.level.slice(1));
  const accessLabel = { mixed: t("accessMixed"), women: t("accessWomen"), men: t("accessMen") }[g.gender];
  const facils = g.facilities.slice(0, 6).map(k => `<span class="facil" title="${FACILITIES[k][state.lang]}">${FACILITIES[k].icon}</span>`).join("");
  return `
  <div class="card" data-open="${g.id}">
    <div class="card-media ${g.gradient}">
      <span class="media-emoji">🏋️</span>
      <div class="badges">
        <span class="badge">${accessLabel}${g.pool ? " · 🏊" : ""}</span>
        ${g.open247 ? `<span class="badge badge-247">🕛 ${t("h247")}</span>` : ""}
      </div>
      <button class="fav ${isFav ? "on" : ""}" data-fav="${g.id}" aria-label="favorite">${isFav ? "♥" : "♡"}</button>
    </div>
    <div class="card-body">
      <div class="card-title">${g.name[state.lang]}</div>
      <div class="card-meta">📍 ${g.area[state.lang]} <span class="rating">★ ${g.rating}</span> <span style="color:var(--muted)">(${g.reviews})</span>${typeof distanceBadge === "function" ? distanceBadge(g) : ""}</div>
      <div class="occ occ-${occ.level}"><span class="dot"></span>${t("busyNow")}: ${occLabel}</div>
      <div class="facil-row">${facils}</div>
      <button class="cmp-toggle ${inCmp ? "on" : ""}" data-cmp="${g.id}">${inCmp ? "✓ " + t("inCompare") : "⇄ " + t("addCompare")}</button>
      <div class="card-foot">
        <div class="price"><small>${t("from")} </small>${fmtPrice(monthlyJOD(g))}<small>${t("perMonth")}</small></div>
        <button class="btn" data-open="${g.id}">${t("viewDetails")}</button>
      </div>
    </div>
  </div>`;
}

/* ---------- Render: detail view ---------- */
function renderDetail(g) {
  const el = $("#detailView");
  const poolBlock = g.pool ? `
    <div class="section">
      <h4>🏊 ${t("poolSchedule")}</h4>
      <div class="pool-times">
        <div class="pool-card"><div class="lbl">👩 ${t("women")}</div><div class="val">${g.poolHours.women}</div></div>
        <div class="pool-card"><div class="lbl">👨 ${t("men")}</div><div class="val">${g.poolHours.men}</div></div>
      </div>
    </div>` : "";

  const offers = g.offers.map(o => `<span class="offer">🎁 ${o[state.lang]}</span>`).join("");
  const isFav = state.favorites.includes(g.id);
  const occ = occupancy(g);
  const occLabel = t("occ" + occ.level[0].toUpperCase() + occ.level.slice(1));
  const occColor = occ.level === "quiet" ? "#22c55e" : occ.level === "moderate" ? "#f59e0b" : "#ef4444";

  const reviewsBlock = `
    <div class="section">
      <h4>⭐ ${t("reviewsTitle")} (${g.reviews})</h4>
      ${pickReviews(g).map(r => `
        <div class="review">
          <div class="rev-top"><b>${r.author}</b><span class="rev-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span></div>
          <div class="rev-text">${r.text[state.lang]}</div>
          <div class="rev-date">${new Date(Date.now() - r.days * 86400000).toLocaleDateString(state.lang === "ar" ? "ar-JO" : "en-US", { day: "numeric", month: "short", year: "numeric" })}</div>
        </div>`).join("")}
    </div>`;

  const scheduleBlock = g.facilities.includes("classes") ? `
    <div class="section">
      <h4>📅 ${t("classScheduleTitle")}</h4>
      <div class="sched">
        ${CLASS_SCHEDULE.map(d => `
          <div class="sched-day">
            <div class="sched-dname">${d.day[state.lang]}</div>
            <div class="sched-items">${d.items.map(it => `<span class="sched-item">${it.time} · ${it.name[state.lang]}</span>`).join("")}</div>
          </div>`).join("")}
      </div>
    </div>` : "";

  el.innerHTML = `
    <button class="backbtn" id="backBtn">← ${t("back")}</button>
    <div class="detail-hero ${g.gradient}">
      <span class="media-emoji">🏋️</span>
      <button class="fav ${isFav ? "on" : ""}" data-fav="${g.id}" style="top:12px;inset-inline-end:12px">${isFav ? "♥" : "♡"}</button>
    </div>

    <h1 style="margin-bottom:4px">${g.name[state.lang]}</h1>
    <div class="card-meta" style="margin-bottom:8px">📍 ${g.address[state.lang]} <span class="rating">★ ${g.rating}</span> <span style="color:var(--muted)">(${g.reviews} ${t("reviews")})</span></div>
    <div>${g.open247 ? `<span class="offer" style="background:#16a34a;color:#fff;border-color:#16a34a">🕛 ${t("open247")}</span>` : ""}${offers}</div>

    <div class="detail-grid" style="margin-top:18px">
      <div>
        <div class="section">
          <h4>🕐 ${t("openingHours")}</h4>
          ${g.open247
            ? `<div class="kv"><span>${t("open247")}</span><span>🕛 ${t("hours247short")}</span></div>`
            : `<div class="kv"><span>${t("weekdays")}</span><span>${g.hours.weekdays}</span></div>
               <div class="kv"><span>${t("friday")}</span><span>${g.hours.friday}</span></div>`}
          <div class="kv"><span>${t("howBusy")}</span><span class="occ occ-${occ.level}"><span class="dot"></span>${occLabel} · ${occ.pct}%</span></div>
          <div class="occ-bar"><span style="width:${occ.pct}%;background:${occColor}"></span></div>
        </div>
        ${poolBlock}
        <div class="section">
          <h4>✅ ${t("facilities")}</h4>
          <div class="facil-grid">
            ${g.facilities.map(k => `<div class="facil-item">${FACILITIES[k].icon} ${FACILITIES[k][state.lang]}</div>`).join("")}
          </div>
        </div>
        <div class="section">
          <h4>🎯 ${t("trainersTitle")}</h4>
          ${g.trainers.map(tr => `
            <div class="trainer">
              <div class="who">
                <div class="avatar">${tr.name[0]}</div>
                <div><div style="font-weight:700">${tr.name}</div><div class="spec">${tr.specialty[state.lang]}</div></div>
              </div>
              <div class="price">${fmtPrice(tr.price)}<small>${t("perSession")}</small></div>
            </div>`).join("")}
        </div>
        ${scheduleBlock}
        ${reviewsBlock}
        <div class="section">
          <h4>✨ ${t("comingSoonTitle")}</h4>
          <p style="color:var(--muted);font-size:13px;margin-bottom:10px">${t("comingSoonSub")}</p>
          <div class="coming">
            <div class="tile"><div class="ico">⚖️</div><div class="t">${t("f_weight")}</div><div class="soon">soon</div></div>
            <div class="tile"><div class="ico">📋</div><div class="t">${t("f_workout")}</div><div class="soon">soon</div></div>
            <div class="tile"><div class="ico">📷</div><div class="t">${t("f_ai")}</div><div class="soon">soon</div></div>
            <div class="tile"><div class="ico">💳</div><div class="t">${t("f_pay")}</div><div class="soon">soon</div></div>
          </div>
        </div>
      </div>

      <div class="panel">
        <h4 style="margin-bottom:12px">💳 ${t("plansTitle")}</h4>
        ${g.plans.map((p, i) => `
          <div class="plan ${i === 1 ? "best" : ""}">
            <div>
              <div class="pname">${p.name[state.lang]}</div>
              <div style="font-size:12px;color:var(--muted)">${p.months} ${state.lang === "ar" ? "شهر" : "month(s)"}</div>
            </div>
            <div style="text-align:${I18N[state.lang].dir === "rtl" ? "left" : "right"}">
              <div class="price">${fmtPrice(p.priceJOD)}</div>
              <button class="btn" data-subscribe="1" style="margin-top:6px">${t("subscribe")}</button>
            </div>
          </div>`).join("")}
        <div class="contact-btns">
          <a class="btn ghost" href="tel:${g.phone}">📞 ${t("call")}</a>
          <a class="btn" href="https://wa.me/${g.whatsapp.replace('+','')}" target="_blank" rel="noopener" style="background:#25D366">🟢 ${t("whatsapp")}</a>
        </div>
      </div>
    </div>`;
  el.style.display = "block";
  $("#listWrap").style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- View switching ---------- */
function showList() {
  state.view = "list";
  state.currentGym = null;
  $("#detailView").style.display = "none";
  $("#listWrap").style.display = "block";
}
function openGym(id) {
  const g = GYMS.find(x => x.id === id);
  if (!g) return;
  state.view = "detail";
  state.currentGym = g;
  renderDetail(g);
}

/* ---------- Favorites ---------- */
function toggleFav(id) {
  const i = state.favorites.indexOf(id);
  if (i >= 0) state.favorites.splice(i, 1);
  else state.favorites.push(id);
  persist();
  renderAll();
  if (state.view === "detail" && state.currentGym) renderDetail(state.currentGym);
}

/* ---------- Compare gyms ---------- */
function toggleCompare(id) {
  const i = state.compare.indexOf(id);
  if (i >= 0) state.compare.splice(i, 1);
  else {
    if (state.compare.length >= 3) { if (typeof toast === "function") toast(t("compareFull")); return; }
    state.compare.push(id);
  }
  renderCompareTray();
  renderResults();
  if (state.view === "detail" && state.currentGym) renderDetail(state.currentGym);
}
function clearCompare() { state.compare = []; renderCompareTray(); renderResults(); }
function renderCompareTray() {
  const tray = $("#cmpTray");
  if (!tray) return;
  if (!state.compare.length) { tray.classList.remove("show"); tray.innerHTML = ""; return; }
  const chips = state.compare.map(id => {
    const g = GYMS.find(x => x.id === id);
    return `<span class="cmp-chip">${g.name[state.lang]} <button data-cmp="${id}" aria-label="remove">✕</button></span>`;
  }).join("");
  tray.innerHTML = `<div class="cmp-inner">
      <div class="cmp-chips">${chips}</div>
      <div style="display:flex;gap:8px">
        <button class="btn ghost" id="cmpClear">${t("clearCompare")}</button>
        <button class="btn" id="cmpOpen">${t("compare")} (${state.compare.length})</button>
      </div>
    </div>`;
  tray.classList.add("show");
}
function openCompare() {
  if (!state.compare.length) return;
  const gyms = state.compare.map(id => GYMS.find(x => x.id === id));
  const yn = b => b ? t("yes") : t("no");
  const access = { mixed: t("accessMixed"), women: t("accessWomen"), men: t("accessMen") };
  const row = (label, fn) => `<tr><td class="cmp-lbl">${label}</td>${gyms.map(g => `<td>${fn(g)}</td>`).join("")}</tr>`;
  const head = `<tr><th></th>${gyms.map(g => `<th>${g.name[state.lang]}<div class="cmp-th-sub">${g.area[state.lang]}</div></th>`).join("")}</tr>`;
  const rows = [
    row(t("cmpRating"), g => `<span class="rating">★ ${g.rating}</span>`),
    row(t("cmpPrice"), g => `<b>${fmtPrice(monthlyJOD(g))}</b><small>${t("perMonth")}</small>`),
    row(t("cmpAccess"), g => access[g.gender]),
    row(t("cmpPool"), g => yn(g.pool)),
    row(t("cmp247"), g => g.open247 ? `✅ ${t("yes")}` : t("no")),
    row(t("cmpAge"), g => `${g.minAge}+`),
    row(t("cmpFacilities"), g => g.facilities.length),
  ].join("");
  const foot = `<tr><td></td>${gyms.map(g => `<td><button class="btn" data-open="${g.id}">${t("viewDetails")}</button></td>`).join("")}</tr>`;
  $("#cmpModal").innerHTML = `<button class="auth-x" id="cmpClose">✕</button>
    <div style="padding:24px">
      <h3 style="margin-bottom:14px">${t("compareTitle")}</h3>
      <div style="overflow-x:auto"><table class="cmp-table">${head}${rows}${foot}</table></div>
    </div>`;
  $("#cmpBack").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeCompare() { $("#cmpBack").classList.remove("open"); document.body.style.overflow = ""; }

/* ---------- Master render ---------- */
function renderAll() {
  applyChrome();
  renderControls();
  renderStaticText();
  renderFilters();
  renderResults();
  renderCompareTray();
  if (typeof renderAuthButton === "function") renderAuthButton();
}

/* ---------- Events ---------- */
function bind() {
  // top bar
  $("#langToggle").onclick = () => { state.lang = state.lang === "en" ? "ar" : "en"; persist(); window.dispatchEvent(new Event("fj:langchange")); state.view === "detail" ? (renderAll(), renderDetail(state.currentGym)) : renderAll(); };
  $("#themeToggle").onclick = () => { state.theme = state.theme === "light" ? "dark" : "light"; persist(); applyChrome(); renderControls(); };
  $("#currencySel").onchange = (e) => { state.currency = e.target.value; persist(); state.view === "detail" ? renderDetail(state.currentGym) : renderAll(); };
  // services hub
  $("#svcGym").onclick = () => {
    if (svcGroup === "gym") return closeServicePanel();
    if (state.view === "detail") showList();
    if (typeof currentUser === "function" && currentUser()) openServicePanel("gym");
    else { closeServicePanel(); document.querySelector(".layout").scrollIntoView({ behavior: "smooth" }); }
  };
  $("#svcNutrition").onclick = () => (svcGroup === "nutrition" ? closeServicePanel() : openServicePanel("nutrition"));
  $("#svcRank").onclick = () => (svcGroup === "rank" ? closeServicePanel() : openServicePanel("rank"));
  $("#svcSupps").onclick = () => (svcGroup === "supplements" ? closeServicePanel() : openServicePanel("supplements"));
  const sp = $("#svcPanel");
  sp.addEventListener("click", (e) => {
    const tb = e.target.closest("[data-svctab]");
    if (tb) {
      svcSection = tb.dataset.svctab;
      if (svcSection !== "gyms") acctSection = svcSection;
      renderServicePanel();
      return;
    }
    if (e.target.closest("#svcPanelClose")) return closeServicePanel();
    if (typeof onAuthClick === "function") onAuthClick(e);
  });
  sp.addEventListener("change", (e) => { if (typeof onAuthChange === "function") onAuthChange(e); });
  $("#svcPoints").onclick = () => openAccountSection("membership");

  // search
  $("#searchInput").addEventListener("input", (e) => { state.filters.q = e.target.value; if (state.view === "detail") showList(); renderResults(); });

  // collapse / expand filters
  $("#filtersToggle").onclick = toggleFilters;

  // filters panel (delegated)
  const fp = $("#filtersPanel");
  fp.addEventListener("click", (e) => {
    const fc = e.target.closest("[data-facil]");
    const pl = e.target.closest("[data-pool]");
    const ac = e.target.closest("[data-access]");
    const h247 = e.target.closest("[data-247]");
    if (fc) { const k = fc.dataset.facil; const arr = state.filters.facilities; const i = arr.indexOf(k); i >= 0 ? arr.splice(i, 1) : arr.push(k); afterFilterChange(); }
    else if (pl) { state.filters.pool = pl.dataset.pool; afterFilterChange(); }
    else if (ac) { state.filters.access = ac.dataset.access; afterFilterChange(); }
    else if (h247) { state.filters.open247 = !state.filters.open247; afterFilterChange(); }
  });
  $("#areaSel").onchange = (e) => { state.filters.area = e.target.value; afterFilterChange(); };
  $("#ageSel").onchange = (e) => { state.filters.minAge = Number(e.target.value); afterFilterChange(); };
  $("#sortSel").onchange = (e) => {
    state.filters.sort = e.target.value;
    if (e.target.value === "nearest" && !state.geo) return requestNearMe();
    renderResults();
  };

  // near-me + list/map view toggle
  const nearBtn = $("#nearMeBtn"); if (nearBtn) nearBtn.onclick = requestNearMe;
  const vListBtn = $("#viewListBtn"); if (vListBtn) vListBtn.onclick = () => setViewMode("list");
  const vMapBtn = $("#viewMapBtn"); if (vMapBtn) vMapBtn.onclick = () => setViewMode("map");
  $("#priceRange").addEventListener("input", (e) => { state.filters.maxPrice = Number(e.target.value); $("#priceVal").textContent = `${t("from")} — ${fmtPrice(state.filters.maxPrice)}${t("perMonth")}`; renderResults(); });
  $("#clearBtn").onclick = () => { state.filters = { q: "", area: "", facilities: [], pool: "any", access: "any", minAge: 0, maxPrice: 80, sort: "rating", open247: false }; showList(); renderAll(); };

  // tabs
  $("#tabAll").onclick = () => { state.tab = "all"; showList(); renderResults(); };
  $("#tabFav").onclick = () => { state.tab = "favorites"; showList(); renderResults(); };

  // grid + detail delegated clicks
  document.body.addEventListener("click", (e) => {
    const favBtn = e.target.closest("[data-fav]");
    if (favBtn) { e.stopPropagation(); toggleFav(favBtn.dataset.fav); return; }
    const cmpBtn = e.target.closest("[data-cmp]");
    if (cmpBtn) { e.stopPropagation(); toggleCompare(cmpBtn.dataset.cmp); return; }
    if (e.target.closest("#cmpOpen")) { openCompare(); return; }
    if (e.target.closest("#cmpClear")) { clearCompare(); return; }
    if (e.target.closest("#cmpClose")) { closeCompare(); return; }
    const openBtn = e.target.closest("[data-open]");
    if (openBtn) { if ($("#cmpBack").classList.contains("open")) closeCompare(); openGym(openBtn.dataset.open); return; }
    if (e.target.closest("#backBtn")) { showList(); return; }
    if (e.target.closest("[data-subscribe]")) { if (typeof requireAuth === "function" && !requireAuth()) return; openPayModal(); return; }
  });

  // modals
  $("#modalClose").onclick = closePayModal;
  $("#modalBack").addEventListener("click", (e) => { if (e.target.id === "modalBack") closePayModal(); });
  $("#cmpBack").addEventListener("click", (e) => { if (e.target.id === "cmpBack") closeCompare(); });
}

function afterFilterChange() { if (state.view === "detail") showList(); renderFilters(); renderResults(); }

/* ---------- Payment explainer modal ---------- */
function openPayModal() {
  $("#modalTitle").textContent = t("payTitle");
  $("#modalBody").innerHTML = `
    <div class="steps">
      <div class="step"><span class="n">1</span><span>${t("payBody").split(".")[0]}.</span></div>
      <div class="step"><span class="n">2</span><span>${t("payBody").split(".")[1] || ""}.</span></div>
      <div class="step"><span class="n">3</span><span>${t("payBody").split(".")[2] || ""}.</span></div>
    </div>
    <button class="btn block" id="startSubFromPay" style="margin-top:14px">${state.lang === "ar" ? "ابدأ العضوية واجمع النقاط" : "Start membership & earn points"}</button>`;
  const sb = $("#startSubFromPay");
  if (sb) sb.onclick = () => { closePayModal(); if (typeof goSubscribe === "function") goSubscribe(state.currentGym ? state.currentGym.id : null); };
  $("#modalClose").textContent = t("close");
  $("#modalBack").classList.add("open");
}
function closePayModal() { $("#modalBack").classList.remove("open"); }

/* ---------- Load gyms from the cloud (Netlify), falling back to the built-in list ---------- */
let lastGymsJSON = "";
function applyCloudGyms(list) {
  GYMS.length = 0;
  list.forEach(g => GYMS.push(g));
  GYMS.forEach(g => { if (typeof g.open247 !== "boolean") g.open247 = false; });
  if (typeof AREA_COORDS !== "undefined") GYMS.forEach(g => { if (!g.coords && g.area && AREA_COORDS[g.area.en]) g.coords = AREA_COORDS[g.area.en]; });
  lastGymsJSON = JSON.stringify(list);
}
async function hydrateGymsFromCloud() {
  try {
    const res = await fetch("/api/gyms", { cache: "no-store" });
    if (!res.ok) return false;
    const data = await res.json();
    if (data && Array.isArray(data.gyms) && data.gyms.length) { applyCloudGyms(data.gyms); return true; }
  } catch (e) { /* offline or no backend yet — keep the built-in gyms */ }
  return false;
}
/* Poll the cloud so gyms added/edited in the admin show up in the app quickly. */
async function pollGyms() {
  if (document.visibilityState !== "visible") return;
  try {
    const res = await fetch("/api/gyms", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (data && Array.isArray(data.gyms) && data.gyms.length) {
      const j = JSON.stringify(data.gyms);
      if (j !== lastGymsJSON) {
        applyCloudGyms(data.gyms);
        if (state.view !== "detail") { renderResults(); renderFilters(); }
      }
    }
  } catch (e) { /* ignore */ }
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  bind();
  renderAll();                             // instant paint with the built-in list
  if (await hydrateGymsFromCloud()) {       // then swap in the cloud list, if any
    if (state.view !== "detail") renderResults();
    renderFilters();
  }
  setInterval(pollGyms, 6000);             // ~every 6s so admin edits show up quickly
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pollGyms(); });
});
