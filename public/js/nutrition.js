/* =============================================================
   FitJo — AI calorie tracker (account section)
   Snap a meal photo or type a food -> estimated calories & macros,
   log it to your day, and track against your plan's targets.

   Demo mode by default (built-in food library / plausible meal
   guesses, no key, no cost). When window.FITJO_CONFIG.aiEndpoint is
   set (see AI-SETUP.md) photos are sent to the real analyzer.

   Relies on globals from app.js / auth.js / plan.js:
   state, t, I18N, esc, val, currentUser, updateUser, toast,
   reRenderSection, calcPlan.
   ============================================================= */

/* ---------- text (both languages) ---------- */
const NUTR_I18N = {
  en: {
    calorieTracker: "Calorie tracker",
    calSub: "Snap a meal or type a food to log calories & macros.",
    addPhoto: "Add a food photo", orType: "or type a food",
    searchFoodPh: "e.g. chicken breast, rice, banana", addFood: "Add",
    analyzing: "Analyzing your photo…",
    demoEstimate: "Demo estimate — adjust the amount or name, then add.",
    aiEstimate: "AI estimate — adjust if needed, then add.",
    amount: "Amount (g)", food: "Food",
    addToToday: "Add to today", discard: "Discard",
    eaten: "eaten", ofTarget: "of", left: "left over", over: "over",
    protein: "Protein", carbs: "Carbs", fat: "Fat",
    noFoodToday: "No food logged today yet — add your first meal above.",
    recentDays: "Recent days", setTargetsHint: "Fill in “My plan” for personalized targets.",
    demoBadge: "Demo mode", aiBadge: "AI on", today: "Today",
  },
  ar: {
    calorieTracker: "متتبّع السعرات",
    calSub: "صوّر وجبة أو اكتب طعاماً لتسجيل السعرات والعناصر.",
    addPhoto: "أضف صورة طعام", orType: "أو اكتب طعاماً",
    searchFoodPh: "مثال: صدر دجاج، رز، موز", addFood: "أضف",
    analyzing: "جارٍ تحليل صورتك…",
    demoEstimate: "تقدير تجريبي — عدّل الكمية أو الاسم ثم أضف.",
    aiEstimate: "تقدير بالذكاء الاصطناعي — عدّل عند الحاجة ثم أضف.",
    amount: "الكمية (غ)", food: "الطعام",
    addToToday: "أضف لليوم", discard: "تجاهل",
    eaten: "مستهلك", ofTarget: "من", left: "متبقٍ", over: "زائد",
    protein: "بروتين", carbs: "كربوهيدرات", fat: "دهون",
    noFoodToday: "لم تُسجّل أي طعام اليوم بعد — أضف وجبتك الأولى بالأعلى.",
    recentDays: "الأيام السابقة", setTargetsHint: "املأ «خطتي» للحصول على أهداف مخصّصة.",
    demoBadge: "وضع تجريبي", aiBadge: "الذكاء مفعّل", today: "اليوم",
  },
};
Object.assign(I18N.en, NUTR_I18N.en);
Object.assign(I18N.ar, NUTR_I18N.ar);

/* ---------- built-in food library (per 100 g) ---------- */
const FOODS = [
  { name: { en: "Chicken breast", ar: "صدر دجاج" }, kcal: 165, p: 31, c: 0, f: 3.6 },
  { name: { en: "White rice (cooked)", ar: "رز أبيض" }, kcal: 130, p: 2.7, c: 28, f: 0.3 },
  { name: { en: "Egg", ar: "بيض" }, kcal: 155, p: 13, c: 1.1, f: 11 },
  { name: { en: "Banana", ar: "موز" }, kcal: 89, p: 1.1, c: 23, f: 0.3 },
  { name: { en: "Apple", ar: "تفاح" }, kcal: 52, p: 0.3, c: 14, f: 0.2 },
  { name: { en: "Oats (dry)", ar: "شوفان" }, kcal: 379, p: 13, c: 67, f: 7 },
  { name: { en: "Greek yogurt", ar: "زبادي يوناني" }, kcal: 59, p: 10, c: 3.6, f: 0.4 },
  { name: { en: "Almonds", ar: "لوز" }, kcal: 579, p: 21, c: 22, f: 50 },
  { name: { en: "Salmon", ar: "سلمون" }, kcal: 208, p: 20, c: 0, f: 13 },
  { name: { en: "Lean beef", ar: "لحم قليل الدهن" }, kcal: 250, p: 26, c: 0, f: 15 },
  { name: { en: "Potato (boiled)", ar: "بطاطا مسلوقة" }, kcal: 87, p: 1.9, c: 20, f: 0.1 },
  { name: { en: "Bread", ar: "خبز" }, kcal: 265, p: 9, c: 49, f: 3.2 },
  { name: { en: "Hummus", ar: "حمص" }, kcal: 166, p: 8, c: 14, f: 10 },
  { name: { en: "Falafel", ar: "فلافل" }, kcal: 333, p: 13, c: 32, f: 18 },
  { name: { en: "Chicken shawarma", ar: "شاورما دجاج" }, kcal: 190, p: 15, c: 8, f: 11 },
  { name: { en: "Labneh", ar: "لبنة" }, kcal: 174, p: 9, c: 6, f: 12 },
  { name: { en: "Lentils (cooked)", ar: "عدس" }, kcal: 116, p: 9, c: 20, f: 0.4 },
  { name: { en: "Pasta (cooked)", ar: "معكرونة" }, kcal: 131, p: 5, c: 25, f: 1.1 },
  { name: { en: "White cheese", ar: "جبنة بيضاء" }, kcal: 350, p: 21, c: 3, f: 28 },
  { name: { en: "Milk", ar: "حليب" }, kcal: 61, p: 3.2, c: 4.8, f: 3.3 },
  { name: { en: "Avocado", ar: "أفوكادو" }, kcal: 160, p: 2, c: 9, f: 15 },
  { name: { en: "Dates", ar: "تمر" }, kcal: 282, p: 2.5, c: 75, f: 0.4 },
  { name: { en: "Salad (dressed)", ar: "سلطة" }, kcal: 60, p: 1.5, c: 6, f: 3 },
  { name: { en: "Whey protein (powder)", ar: "بروتين واي" }, kcal: 400, p: 80, c: 8, f: 6 },
];
/* plausible full-meal guesses for the demo photo flow (per serving) */
const DEMO_MEALS = [
  { name: { en: "Grilled chicken & rice", ar: "دجاج مشوي ورز" }, kcal: 520, p: 42, c: 55, f: 12 },
  { name: { en: "Falafel wrap", ar: "سندويش فلافل" }, kcal: 430, p: 14, c: 52, f: 18 },
  { name: { en: "Chicken shawarma plate", ar: "صحن شاورما دجاج" }, kcal: 610, p: 38, c: 45, f: 28 },
  { name: { en: "Salmon, potato & veg", ar: "سلمون وبطاطا وخضار" }, kcal: 540, p: 40, c: 35, f: 24 },
  { name: { en: "Oats, banana & eggs", ar: "شوفان وموز وبيض" }, kcal: 460, p: 26, c: 55, f: 14 },
  { name: { en: "Greek salad & feta", ar: "سلطة يونانية وفيتا" }, kcal: 320, p: 12, c: 14, f: 24 },
];

/* ---------- state ---------- */
let pendingFood = null;   // { name, source, grams, per100:{kcal,p,c,f} }
let nutAnalyzing = false;

/* ---------- helpers ---------- */
function nutTargets(u) {
  if (u.intake && typeof calcPlan === "function") { const p = calcPlan(u); return { cals: p.cals, protein: p.protein, carbs: p.carbs, fat: p.fat, personalized: true }; }
  return { cals: 2000, protein: 140, carbs: 220, fat: 65, personalized: false };
}
const dayKey = (ts) => new Date(ts).toDateString();
const todayKey = () => new Date().toDateString();
function foodLog(u) { return (u.food && u.food.log) || []; }
function entriesFor(u, key) { return foodLog(u).filter(e => dayKey(e.ts) === key); }
function sumEntries(list) { return list.reduce((a, e) => ({ kcal: a.kcal + e.kcal, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }), { kcal: 0, p: 0, c: 0, f: 0 }); }
function scaledFood(p) { const k = p.grams / 100; return { kcal: Math.round(p.per100.kcal * k), p: Math.round(p.per100.p * k), c: Math.round(p.per100.c * k), f: Math.round(p.per100.f * k) }; }
function lookupFood(q) {
  const s = q.trim().toLowerCase();
  const f = FOODS.find(x => x.name.en.toLowerCase().includes(s) || (x.name.ar || "").includes(q.trim()));
  if (f) return { name: f.name[state.lang], source: "lib", grams: 150, per100: { kcal: f.kcal, p: f.p, c: f.c, f: f.f } };
  return { name: q.trim(), source: "manual", grams: 150, per100: { kcal: 150, p: 8, c: 15, f: 5 } };
}
function fileToDataURL(file) {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
}

/* ---------- rendering ---------- */
function calorieRing(eaten, target) {
  const pct = Math.max(0, Math.min(1, target ? eaten / target : 0));
  const R = 52, C = 2 * Math.PI * R, off = C * (1 - pct);
  const over = eaten > target;
  const color = over ? "#ef4444" : "var(--accent)";
  const remain = Math.round(Math.abs(target - eaten));
  return `
  <div class="cal-ring-wrap">
    <svg viewBox="0 0 120 120" class="cal-ring">
      <circle cx="60" cy="60" r="${R}" class="ring-bg"></circle>
      <circle cx="60" cy="60" r="${R}" class="ring-fg" style="stroke:${color};stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${off.toFixed(1)}"></circle>
      <text x="60" y="56" class="ring-num">${Math.round(eaten)}</text>
      <text x="60" y="74" class="ring-sub">/ ${target} ${t("kcal")}</text>
    </svg>
    <div class="ring-side">
      <div class="ring-line"><b>${Math.round(eaten)}</b> ${t("eaten")}</div>
      <div class="ring-line" style="color:${over ? "#ef4444" : "var(--muted)"}"><b>${remain}</b> ${over ? t("over") : t("left")}</div>
    </div>
  </div>`;
}
function macroBar(label, val, target, color) {
  const pct = Math.max(0, Math.min(100, target ? Math.round(val / target * 100) : 0));
  return `<div class="macro">
    <div class="macro-top"><span>${label}</span><span>${Math.round(val)} / ${target} g</span></div>
    <div class="macro-track"><div class="macro-fill" style="width:${pct}%;background:${color}"></div></div>
  </div>`;
}
function pendingCardHTML() {
  const p = pendingFood, s = scaledFood(p);
  return `
  <div class="pending-food">
    <div class="pf-note">${p.source === "ai" ? t("aiEstimate") : t("demoEstimate")}</div>
    <div class="form-two">
      <div class="form-row"><label>${t("food")}</label><input id="foodName" value="${esc(p.name)}"></div>
      <div class="form-row"><label>${t("amount")}</label><input id="foodGrams" type="number" min="1" max="2000" value="${p.grams}"></div>
    </div>
    <div class="pf-macros">
      <span><b>${s.kcal}</b> ${t("kcal")}</span>
      <span>${t("protein")} <b>${s.p}g</b></span>
      <span>${t("carbs")} <b>${s.c}g</b></span>
      <span>${t("fat")} <b>${s.f}g</b></span>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn block" id="addFoodConfirm">${t("addToToday")}</button>
      <button class="btn ghost" id="discardFood">${t("discard")}</button>
    </div>
  </div>`;
}
function addControlsHTML() {
  return `
  <div class="add-food">
    <input type="file" accept="image/*" id="foodPhoto" hidden>
    <button class="btn block" id="pickFood">📷 ${t("addPhoto")}</button>
    <div class="divider">${t("orType")}</div>
    <div class="form-two" style="align-items:end;grid-template-columns:1fr auto">
      <div class="form-row" style="margin:0"><input id="foodSearch" placeholder="${esc(t("searchFoodPh"))}"></div>
      <button class="btn" id="foodTypeAdd">${t("addFood")}</button>
    </div>
  </div>`;
}
function recentDaysHTML(u) {
  const byDay = {};
  foodLog(u).forEach(e => { byDay[dayKey(e.ts)] = (byDay[dayKey(e.ts)] || 0) + e.kcal; });
  const keys = Object.keys(byDay).filter(k => k !== todayKey()).sort((a, b) => new Date(b) - new Date(a)).slice(0, 5);
  if (!keys.length) return "";
  return `<div class="section"><h4>📅 ${t("recentDays")}</h4>
    ${keys.map(k => `<div class="kv"><span>${new Date(k).toLocaleDateString(state.lang === "ar" ? "ar-JO" : "en-US", { weekday: "short", month: "short", day: "numeric" })}</span><span><b>${Math.round(byDay[k])}</b> ${t("kcal")}</span></div>`).join("")}
  </div>`;
}

function secNutrition(u) {
  const tg = nutTargets(u);
  const today = entriesFor(u, todayKey());
  const tot = sumEntries(today);
  const aiOn = !!(window.FITJO_CONFIG && window.FITJO_CONFIG.aiEndpoint);
  return `
  <h3>${t("calorieTracker")} <span class="pill ${aiOn ? "on" : "off"}" style="font-size:11px;vertical-align:middle">${aiOn ? t("aiBadge") : t("demoBadge")}</span></h3>
  <div class="h-sub">${t("calSub")}</div>

  ${calorieRing(tot.kcal, tg.cals)}

  <div class="macros">
    ${macroBar(t("protein"), tot.p, tg.protein, "#2563eb")}
    ${macroBar(t("carbs"), tot.c, tg.carbs, "#f59e0b")}
    ${macroBar(t("fat"), tot.f, tg.fat, "#ec4899")}
  </div>
  ${tg.personalized ? "" : `<div class="note">${t("setTargetsHint")}</div>`}

  <div class="section">
    ${nutAnalyzing ? `<div class="analyzing"><span class="spin"></span> ${t("analyzing")}</div>`
      : pendingFood ? pendingCardHTML() : addControlsHTML()}
  </div>

  <div class="section">
    <h4>🍽️ ${t("today")}</h4>
    ${today.length ? today.slice().reverse().map(e => `
      <div class="food-row">
        <div><b>${esc(e.name)}</b><div class="meal-items">${e.grams}g · ${t("protein")} ${e.p}g · ${t("carbs")} ${e.c}g · ${t("fat")} ${e.f}g</div></div>
        <span class="meal-kcal">${e.kcal} ${t("kcal")} <button class="auth-link" data-rmfood="${e.id}" title="remove" style="margin-inline-start:6px">✕</button></span>
      </div>`).join("") : `<div class="note">${t("noFoodToday")}</div>`}
  </div>

  ${recentDaysHTML(u)}`;
}

/* ---------- analyze (AI when configured, otherwise demo) ---------- */
async function analyzePhoto(file) {
  nutAnalyzing = true; pendingFood = null; reRenderSection();
  let item = null;
  const cfg = window.FITJO_CONFIG;
  try {
    if (cfg && cfg.aiEndpoint) {
      const dataUrl = await fileToDataURL(file);
      const base64 = String(dataUrl).split(",")[1];
      const res = await fetch(cfg.aiEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image_base64: base64, mime: file.type }) });
      if (res.ok) {
        const j = await res.json();
        if (j && Array.isArray(j.items) && j.items.length) {
          const sum = j.items.reduce((a, x) => ({ kcal: a.kcal + (+x.kcal || 0), p: a.p + (+x.protein || 0), c: a.c + (+x.carbs || 0), f: a.f + (+x.fat || 0) }), { kcal: 0, p: 0, c: 0, f: 0 });
          item = { name: j.items.map(x => x.name).filter(Boolean).join(", ") || "Meal", source: "ai", grams: 100, per100: { kcal: sum.kcal, p: sum.p, c: sum.c, f: sum.f } };
        }
      }
    }
  } catch (e) { /* fall back to demo */ }
  if (!item) { const m = DEMO_MEALS[Math.floor(Math.random() * DEMO_MEALS.length)]; item = { name: m.name[state.lang], source: "demo", grams: 100, per100: { kcal: m.kcal, p: m.p, c: m.c, f: m.f } }; }
  nutAnalyzing = false; pendingFood = item; reRenderSection();
}

/* ---------- hooks called by auth.js ---------- */
function handleNutritionClick(e) {
  const hit = (s) => e.target.closest(s);
  if (hit("#pickFood")) { const el = document.getElementById("foodPhoto"); if (el) el.click(); return true; }
  if (hit("#foodTypeAdd")) {
    const q = (val("foodSearch") || "").trim();
    if (!q) return true;
    pendingFood = lookupFood(q); nutAnalyzing = false; reRenderSection(); return true;
  }
  if (hit("#discardFood")) { pendingFood = null; reRenderSection(); return true; }
  if (hit("#addFoodConfirm")) {
    if (!pendingFood) return true;
    const name = ((val("foodName") || pendingFood.name).trim()) || pendingFood.name;
    const grams = Math.max(1, Math.min(2000, parseInt(val("foodGrams"), 10) || pendingFood.grams));
    pendingFood.grams = grams;
    const s = scaledFood(pendingFood);
    const entry = { id: "f" + Date.now(), ts: Date.now(), name, grams, kcal: s.kcal, p: s.p, c: s.c, f: s.f };
    const food = { log: [...foodLog(currentUser()), entry] };
    updateUser({ food });
    pendingFood = null; reRenderSection(); toast(t("saved"));
    return true;
  }
  const rm = hit("[data-rmfood]");
  if (rm) {
    const id = rm.dataset.rmfood;
    const food = { log: foodLog(currentUser()).filter(x => String(x.id) !== String(id)) };
    updateUser({ food }); reRenderSection();
    return true;
  }
  return false;
}
function handleNutritionChange(e) {
  if (e.target.id === "foodPhoto") {
    const file = e.target.files && e.target.files[0];
    if (file) analyzePhoto(file);
    return true;
  }
  if (e.target.id === "foodGrams" && pendingFood) {
    pendingFood.grams = Math.max(1, Math.min(2000, parseInt(e.target.value, 10) || pendingFood.grams));
    reRenderSection();
    return true;
  }
  if (e.target.id === "foodName" && pendingFood) { pendingFood.name = e.target.value; return true; }
  return false;
}
function resetNutritionEditing() { pendingFood = null; nutAnalyzing = false; }
