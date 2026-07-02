/* =============================================================
   FitJo — AI calorie tracker (photo → nutrients + daily food log)
   -------------------------------------------------------------
   DEMO NOW, REAL-AI-READY.
   By default this works fully offline: it estimates a meal from a
   built-in food library so you can double-click index.html and
   demo it with no key and no cost.

   To switch on REAL photo AI later, set (before this script runs):
       window.FITJO_CONFIG = { aiEndpoint: "/.netlify/functions/analyze-food" };
   analyzeFood() will then POST the photo to that endpoint and use
   the AI's answer, falling back to demo mode if anything fails.
   A ready-to-deploy endpoint stub is in netlify/functions/analyze-food.js
   (see AI-SETUP.md).

   Relies on globals from app.js / auth.js / plan.js:
   state, t, I18N, currentUser, updateUser, reRenderSection, toast,
   esc, calcPlan.
   ============================================================= */

/* ---------- text (both languages) ---------- */
const NUT_I18N = {
  en: {
    calorieTracker: "Calorie tracker",
    ctSub: "Snap a photo of your meal — get calories and macros, and log your day.",
    ctPhotoCta: "📷 Take or choose a food photo",
    ctPhotoHint: "Point at your plate. We'll estimate the food and its nutrients.",
    ctAnalyzing: "Analyzing your photo…",
    ctConfidence: "match",
    ctAiNote: "Analyzed by AI ✨",
    ctNotRight: "Not this? Pick the correct food:",
    ctPortion: "Portion",
    ctAddDay: "Add to today",
    ctDiscard: "Discard",
    ctToday: "Today",
    ctTotals: "Total today",
    ctRemaining: "left",
    ctOver: "over",
    ctNoTarget: "Build your plan (My plan) to see daily targets.",
    ctEmptyDay: "No food logged yet today. Scan a meal to get started.",
    ctHistory: "Recent days",
    ctAdded: "Added to today 🍽️",
    ctRemoved: "Removed",
    ctTry: "Try it",
    ctSearchPh: "Search foods — chicken, water, sushi…",
    ctByPhoto: "📷 Add by photo (auto-guesses the food)",
    ctNoMatch: "No match. Try another word, or add by photo.",
    ctPickTitle: "What did you eat?",
    ctDemoNote: "Pick what you ate from the list, or add by photo. Photo guessing uses a built-in library in demo mode; real photo AI turns on when connected to the cloud (see AI-SETUP).",
  },
  ar: {
    calorieTracker: "حاسبة السعرات",
    ctSub: "صوّر وجبتك — احصل على السعرات والعناصر الغذائية وسجّل يومك.",
    ctPhotoCta: "📷 التقط أو اختر صورة طعام",
    ctPhotoHint: "وجّه الكاميرا نحو طبقك، وسنقدّر الطعام وعناصره الغذائية.",
    ctAnalyzing: "نحلّل صورتك…",
    ctConfidence: "تطابق",
    ctAiNote: "تحليل بالذكاء الاصطناعي ✨",
    ctNotRight: "ليس هذا؟ اختر الطعام الصحيح:",
    ctPortion: "الحصة",
    ctAddDay: "أضف لليوم",
    ctDiscard: "تجاهل",
    ctToday: "اليوم",
    ctTotals: "إجمالي اليوم",
    ctRemaining: "متبقٍ",
    ctOver: "زائد",
    ctNoTarget: "أنشئ خطتك (خطتي) لعرض الأهداف اليومية.",
    ctEmptyDay: "لم تُسجّل أي طعام اليوم بعد. صوّر وجبة لتبدأ.",
    ctHistory: "الأيام الأخيرة",
    ctAdded: "أُضيفت لليوم 🍽️",
    ctRemoved: "حُذفت",
    ctTry: "جرّبها",
    ctSearchPh: "ابحث عن طعام — دجاج، ماء، سوشي…",
    ctByPhoto: "📷 أضف بصورة (تخمين تلقائي للطعام)",
    ctNoMatch: "لا نتائج. جرّب كلمة أخرى أو أضف بصورة.",
    ctPickTitle: "ماذا أكلت؟",
    ctDemoNote: "اختر ما أكلته من القائمة أو أضف بصورة. تخمين الصورة يستخدم مكتبة مدمجة في الوضع التجريبي؛ يعمل تحليل الصور بالذكاء الاصطناعي عند الربط بالسحابة (راجع AI-SETUP).",
  },
};
Object.assign(I18N.en, NUT_I18N.en);
Object.assign(I18N.ar, NUT_I18N.ar);

/* ---------- built-in food library (per 1 serving) ----------
   Values are realistic estimates for a typical serving. Mix of
   Middle-Eastern staples and common gym foods. ------------------ */
const FOODS = [
  { key: "chicken_rice", emoji: "🍗", name: { en: "Grilled chicken & rice", ar: "دجاج مشوي مع رز" }, serving: { en: "1 plate", ar: "طبق" }, kcal: 650, p: 55, c: 70, f: 15 },
  { key: "shawarma", emoji: "🌯", name: { en: "Chicken shawarma", ar: "شاورما دجاج" }, serving: { en: "1 sandwich", ar: "سندويشة" }, kcal: 480, p: 30, c: 40, f: 22 },
  { key: "falafel", emoji: "🧆", name: { en: "Falafel wrap", ar: "عرَبية فلافل" }, serving: { en: "1 wrap", ar: "لفة" }, kcal: 520, p: 16, c: 60, f: 24 },
  { key: "hummus", emoji: "🥣", name: { en: "Hummus with pita", ar: "حمّص مع خبز" }, serving: { en: "1 bowl", ar: "صحن" }, kcal: 380, p: 12, c: 45, f: 18 },
  { key: "mansaf", emoji: "🍚", name: { en: "Mansaf", ar: "منسف" }, serving: { en: "1 plate", ar: "طبق" }, kcal: 850, p: 45, c: 80, f: 40 },
  { key: "maqluba", emoji: "🍛", name: { en: "Maqluba", ar: "مقلوبة" }, serving: { en: "1 plate", ar: "طبق" }, kcal: 600, p: 25, c: 75, f: 22 },
  { key: "eggs", emoji: "🍳", name: { en: "Eggs", ar: "بيض" }, serving: { en: "3 eggs", ar: "3 بيضات" }, kcal: 215, p: 18, c: 2, f: 15 },
  { key: "oats", emoji: "🥣", name: { en: "Oatmeal bowl", ar: "شوفان" }, serving: { en: "1 bowl", ar: "صحن" }, kcal: 300, p: 10, c: 50, f: 6 },
  { key: "banana", emoji: "🍌", name: { en: "Banana", ar: "موز" }, serving: { en: "1 banana", ar: "موزة" }, kcal: 105, p: 1, c: 27, f: 0 },
  { key: "apple", emoji: "🍎", name: { en: "Apple", ar: "تفاح" }, serving: { en: "1 apple", ar: "تفاحة" }, kcal: 95, p: 0, c: 25, f: 0 },
  { key: "protein_shake", emoji: "🥤", name: { en: "Protein shake", ar: "بروتين شيك" }, serving: { en: "1 scoop", ar: "مغرفة" }, kcal: 160, p: 30, c: 6, f: 3 },
  { key: "greek_yogurt", emoji: "🥛", name: { en: "Greek yogurt", ar: "زبادي يوناني" }, serving: { en: "1 cup", ar: "كوب" }, kcal: 150, p: 15, c: 10, f: 5 },
  { key: "salad", emoji: "🥗", name: { en: "Fattoush / green salad", ar: "فتوش / سلطة خضراء" }, serving: { en: "1 bowl", ar: "صحن" }, kcal: 120, p: 3, c: 12, f: 7 },
  { key: "salmon", emoji: "🐟", name: { en: "Salmon fillet", ar: "شريحة سلمون" }, serving: { en: "1 fillet", ar: "شريحة" }, kcal: 350, p: 34, c: 0, f: 23 },
  { key: "beef_steak", emoji: "🥩", name: { en: "Lean beef steak", ar: "ستيك لحم" }, serving: { en: "1 steak", ar: "قطعة" }, kcal: 400, p: 50, c: 0, f: 22 },
  { key: "pasta", emoji: "🍝", name: { en: "Pasta", ar: "معكرونة" }, serving: { en: "1 plate", ar: "طبق" }, kcal: 600, p: 20, c: 90, f: 16 },
  { key: "pizza", emoji: "🍕", name: { en: "Pizza", ar: "بيتزا" }, serving: { en: "2 slices", ar: "قطعتان" }, kcal: 570, p: 24, c: 64, f: 22 },
  { key: "burger", emoji: "🍔", name: { en: "Beef burger", ar: "برجر لحم" }, serving: { en: "1 burger", ar: "برجر" }, kcal: 550, p: 28, c: 42, f: 30 },
  { key: "nuts", emoji: "🥜", name: { en: "Handful of almonds", ar: "حفنة لوز" }, serving: { en: "30 g", ar: "30 غ" }, kcal: 180, p: 6, c: 6, f: 16 },
  { key: "rice", emoji: "🍚", name: { en: "Rice", ar: "رز" }, serving: { en: "1 bowl", ar: "صحن" }, kcal: 340, p: 6, c: 74, f: 1 },
  { key: "pita", emoji: "🫓", name: { en: "Pita bread", ar: "خبز عربي" }, serving: { en: "1 loaf", ar: "رغيف" }, kcal: 165, p: 6, c: 33, f: 1 },
  { key: "avocado", emoji: "🥑", name: { en: "Avocado", ar: "أفوكادو" }, serving: { en: "½ avocado", ar: "نصف حبة" }, kcal: 160, p: 2, c: 9, f: 15 },
  { key: "tuna", emoji: "🐟", name: { en: "Tuna", ar: "تونة" }, serving: { en: "1 can", ar: "علبة" }, kcal: 180, p: 40, c: 0, f: 2 },
  { key: "potato", emoji: "🥔", name: { en: "Baked potato", ar: "بطاطا مشوية" }, serving: { en: "1 potato", ar: "حبة" }, kcal: 160, p: 4, c: 37, f: 0 },
  { key: "kunafa", emoji: "🍮", name: { en: "Kunafa", ar: "كنافة" }, serving: { en: "1 piece", ar: "قطعة" }, kcal: 430, p: 8, c: 55, f: 20 },
  { key: "dates", emoji: "🌴", name: { en: "Dates", ar: "تمر" }, serving: { en: "3 dates", ar: "3 حبات" }, kcal: 200, p: 1, c: 54, f: 0 },
  { key: "latte", emoji: "☕", name: { en: "Latte", ar: "لاتيه" }, serving: { en: "1 cup", ar: "كوب" }, kcal: 120, p: 6, c: 12, f: 5 },
  // ---- drinks ----
  { key: "water", emoji: "💧", name: { en: "Water", ar: "ماء" }, serving: { en: "1 glass", ar: "كوب" }, kcal: 0, p: 0, c: 0, f: 0 },
  { key: "coffee", emoji: "☕", name: { en: "Black coffee", ar: "قهوة سادة" }, serving: { en: "1 cup", ar: "كوب" }, kcal: 5, p: 0, c: 1, f: 0 },
  { key: "tea", emoji: "🍵", name: { en: "Tea", ar: "شاي" }, serving: { en: "1 cup", ar: "كوب" }, kcal: 2, p: 0, c: 0, f: 0 },
  { key: "soda", emoji: "🥤", name: { en: "Soft drink", ar: "مشروب غازي" }, serving: { en: "1 can", ar: "علبة" }, kcal: 140, p: 0, c: 39, f: 0 },
  { key: "juice", emoji: "🧃", name: { en: "Orange juice", ar: "عصير برتقال" }, serving: { en: "1 glass", ar: "كوب" }, kcal: 110, p: 2, c: 26, f: 0 },
  { key: "milk", emoji: "🥛", name: { en: "Milk", ar: "حليب" }, serving: { en: "1 glass", ar: "كوب" }, kcal: 120, p: 8, c: 12, f: 5 },
  { key: "whey", emoji: "🥤", name: { en: "Whey protein", ar: "واي بروتين" }, serving: { en: "1 scoop", ar: "مغرفة" }, kcal: 120, p: 25, c: 3, f: 2 },
  // ---- proteins ----
  { key: "chicken_breast", emoji: "🍗", name: { en: "Grilled chicken breast", ar: "صدر دجاج مشوي" }, serving: { en: "1 breast", ar: "صدر" }, kcal: 220, p: 40, c: 0, f: 5 },
  { key: "egg_boiled", emoji: "🥚", name: { en: "Boiled egg", ar: "بيضة مسلوقة" }, serving: { en: "1 egg", ar: "بيضة" }, kcal: 70, p: 6, c: 1, f: 5 },
  { key: "sushi", emoji: "🍣", name: { en: "Sushi", ar: "سوشي" }, serving: { en: "6 pieces", ar: "6 قطع" }, kcal: 350, p: 12, c: 60, f: 6 },
  { key: "shrimp", emoji: "🦐", name: { en: "Shrimp", ar: "روبيان" }, serving: { en: "100 g", ar: "100 غ" }, kcal: 100, p: 20, c: 1, f: 1 },
  { key: "turkey", emoji: "🦃", name: { en: "Turkey slices", ar: "شرائح حبش" }, serving: { en: "100 g", ar: "100 غ" }, kcal: 130, p: 22, c: 2, f: 4 },
  { key: "tofu", emoji: "🧈", name: { en: "Tofu", ar: "توفو" }, serving: { en: "100 g", ar: "100 غ" }, kcal: 145, p: 16, c: 3, f: 9 },
  { key: "lentils", emoji: "🍲", name: { en: "Lentils", ar: "عدس" }, serving: { en: "1 bowl", ar: "صحن" }, kcal: 230, p: 18, c: 40, f: 1 },
  { key: "chickpeas", emoji: "🫘", name: { en: "Chickpeas", ar: "حمّص حب" }, serving: { en: "1 cup", ar: "كوب" }, kcal: 270, p: 15, c: 45, f: 4 },
  // ---- carbs ----
  { key: "noodles", emoji: "🍜", name: { en: "Noodles", ar: "نودلز" }, serving: { en: "1 plate", ar: "طبق" }, kcal: 380, p: 10, c: 55, f: 12 },
  { key: "bread", emoji: "🍞", name: { en: "Bread", ar: "خبز توست" }, serving: { en: "2 slices", ar: "شريحتان" }, kcal: 160, p: 6, c: 30, f: 2 },
  { key: "fries", emoji: "🍟", name: { en: "French fries", ar: "بطاطا مقلية" }, serving: { en: "medium", ar: "وسط" }, kcal: 365, p: 4, c: 48, f: 17 },
  { key: "cereal", emoji: "🥣", name: { en: "Cereal & milk", ar: "حبوب مع حليب" }, serving: { en: "1 bowl", ar: "صحن" }, kcal: 250, p: 8, c: 45, f: 5 },
  // ---- meals / fast food ----
  { key: "kebab", emoji: "🍢", name: { en: "Kebab", ar: "كباب" }, serving: { en: "1 skewer", ar: "سيخ" }, kcal: 300, p: 25, c: 5, f: 20 },
  { key: "mixed_grill", emoji: "🥩", name: { en: "Mixed grill", ar: "مشاوي مشكّلة" }, serving: { en: "1 plate", ar: "طبق" }, kcal: 700, p: 55, c: 10, f: 45 },
  { key: "fried_chicken", emoji: "🍗", name: { en: "Fried chicken", ar: "دجاج مقلي" }, serving: { en: "2 pieces", ar: "قطعتان" }, kcal: 480, p: 35, c: 16, f: 30 },
  { key: "sandwich", emoji: "🥪", name: { en: "Chicken sandwich", ar: "ساندويش دجاج" }, serving: { en: "1", ar: "واحد" }, kcal: 350, p: 25, c: 35, f: 12 },
  { key: "chicken_salad", emoji: "🥗", name: { en: "Chicken salad", ar: "سلطة دجاج" }, serving: { en: "1 bowl", ar: "صحن" }, kcal: 320, p: 30, c: 15, f: 15 },
  { key: "wrap", emoji: "🌯", name: { en: "Grilled wrap", ar: "راب مشوي" }, serving: { en: "1", ar: "واحد" }, kcal: 400, p: 28, c: 40, f: 14 },
  // ---- snacks / fruit ----
  { key: "orange", emoji: "🍊", name: { en: "Orange", ar: "برتقالة" }, serving: { en: "1", ar: "واحدة" }, kcal: 62, p: 1, c: 15, f: 0 },
  { key: "grapes", emoji: "🍇", name: { en: "Grapes", ar: "عنب" }, serving: { en: "1 cup", ar: "كوب" }, kcal: 104, p: 1, c: 27, f: 0 },
  { key: "protein_bar", emoji: "🍫", name: { en: "Protein bar", ar: "لوح بروتين" }, serving: { en: "1 bar", ar: "لوح" }, kcal: 220, p: 20, c: 24, f: 7 },
  { key: "chips", emoji: "🥔", name: { en: "Potato chips", ar: "شيبس" }, serving: { en: "small bag", ar: "كيس صغير" }, kcal: 150, p: 2, c: 15, f: 10 },
  { key: "chocolate", emoji: "🍫", name: { en: "Chocolate", ar: "شوكولاتة" }, serving: { en: "1 bar", ar: "لوح" }, kcal: 230, p: 3, c: 26, f: 13 },
  { key: "ice_cream", emoji: "🍨", name: { en: "Ice cream", ar: "آيس كريم" }, serving: { en: "1 scoop", ar: "كرة" }, kcal: 140, p: 2, c: 17, f: 7 },
  { key: "cheese", emoji: "🧀", name: { en: "Cheese", ar: "جبنة" }, serving: { en: "1 slice", ar: "شريحة" }, kcal: 110, p: 7, c: 1, f: 9 },
  { key: "labneh", emoji: "🥛", name: { en: "Labneh", ar: "لبنة" }, serving: { en: "1 serving", ar: "حصة" }, kcal: 120, p: 6, c: 5, f: 9 },
  { key: "peanut_butter", emoji: "🥜", name: { en: "Peanut butter", ar: "زبدة فول سوداني" }, serving: { en: "2 tbsp", ar: "ملعقتان" }, kcal: 190, p: 8, c: 6, f: 16 },
  { key: "baklava", emoji: "🍮", name: { en: "Baklava", ar: "بقلاوة" }, serving: { en: "1 piece", ar: "قطعة" }, kcal: 245, p: 4, c: 28, f: 14 },
];

/* ---------- transient scan state (not persisted) ---------- */
let nScan = { status: "idle", previewURL: null, base: null, portion: 1 };
let nQuery = "";
function resetNutrition() { nScan = { status: "idle", previewURL: null, base: null, portion: 1 }; nQuery = ""; }

/* ---------- helpers ---------- */
function todayKey(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function foodTargets(u) {
  if (u && u.intake && typeof calcPlan === "function") {
    const p = calcPlan(u);
    return { cals: p.cals, protein: p.protein, carbs: p.carbs, fat: p.fat };
  }
  return null;
}
function toBase(food) {
  return { key: food.key, emoji: food.emoji, name: food.name, serving: food.serving, kcal: food.kcal, p: food.p, c: food.c, f: food.f, confidence: null, source: "corrected" };
}
function scaled(base, portion) {
  return { kcal: Math.round(base.kcal * portion), p: Math.round(base.p * portion), c: Math.round(base.c * portion), f: Math.round(base.f * portion) };
}
function foodOptions(sel) {
  return FOODS.map(f => `<option value="${f.key}"${f.key === sel ? " selected" : ""}>${f.emoji} ${f.name[state.lang]}</option>`).join("");
}
function foodResultsHTML() {
  const q = nQuery.trim().toLowerCase();
  const qa = nQuery.trim();
  const list = FOODS.filter(f => !q || f.name.en.toLowerCase().includes(q) || (f.name.ar || "").includes(qa));
  if (!list.length) return `<div class="note">${t("ctNoMatch")}</div>`;
  return list.map(f =>
    `<button class="ct-food" data-food-pick="${f.key}">
       <span class="fr-emo">${f.emoji}</span>
       <span class="ct-food-n">${f.name[state.lang]}</span>
       <small>${f.kcal} ${t("kcal")}</small>
     </button>`).join("");
}

/* ---------- the "brain": real-AI-ready analyzer ---------- */
function fileToBase64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
}
function demoPick(file) {
  let h = 0; const s = (file.name || "") + "|" + file.size + "|" + (file.lastModified || 0);
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { food: FOODS[h % FOODS.length], conf: 78 + (h % 19) };
}
function demoAnalyze(file) {
  return new Promise(res => {
    const { food, conf } = demoPick(file);
    setTimeout(() => res({ ...toBase(food), confidence: conf, source: "demo" }), 850);
  });
}
function normalizeAI(d) {
  let it = d;
  if (Array.isArray(d.items) && d.items.length) {
    const sum = (k) => d.items.reduce((a, x) => a + (+x[k] || 0), 0);
    it = { name: d.items.map(x => x.name).filter(Boolean).join(", "), kcal: sum("kcal"), protein: sum("protein"), carbs: sum("carbs"), fat: sum("fat"), confidence: d.confidence };
  }
  if (it == null || it.kcal == null) return null;
  const nm = esc(it.name || "Meal");
  let conf = null;
  if (it.confidence != null) conf = it.confidence <= 1 ? Math.round(it.confidence * 100) : Math.round(it.confidence);
  return {
    key: null, emoji: "🍽️", name: { en: nm, ar: nm },
    serving: { en: it.serving || "AI estimate", ar: it.serving || "تقدير الذكاء الاصطناعي" },
    kcal: Math.round(it.kcal), p: Math.round(it.protein || 0), c: Math.round(it.carbs || 0), f: Math.round(it.fat || 0),
    confidence: conf, source: "ai",
  };
}
async function analyzeFood(file) {
  const cfg = window.FITJO_CONFIG || {};
  if (cfg.aiEndpoint) {
    try {
      const b64 = await fileToBase64(file);
      const r = await fetch(cfg.aiEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image_base64: b64, mime: file.type }) });
      if (r.ok) { const nb = normalizeAI(await r.json()); if (nb) return nb; }
    } catch (e) { /* fall through to demo */ }
  }
  return demoAnalyze(file);
}

/* ---------- rendering ---------- */
function calRing(total, target) {
  const r = 34, C = 2 * Math.PI * r;
  const pct = target ? Math.min(1, total / target) : 0;
  const off = C * (1 - pct);
  const over = target && total > target;
  const col = over ? "#ef4444" : "var(--accent)";
  const sub = target ? `<tspan x="44" dy="15" class="ct-ringsub">/ ${target}</tspan>` : "";
  return `<svg class="ct-ring" viewBox="0 0 88 88" width="88" height="88">
    <circle cx="44" cy="44" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="9"/>
    <circle cx="44" cy="44" r="${r}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round"
      stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 44 44)"/>
    <text x="44" y="40" text-anchor="middle" class="ct-ringnum">${total}${sub}</text>
  </svg>`;
}
function macroBar(label, color, val, target) {
  const pct = target ? Math.min(100, Math.round((val / target) * 100)) : 0;
  return `<div class="mb">
    <div class="mb-top"><span>${label}</span><span>${val}${target ? ` / ${target}` : ""} g</span></div>
    <div class="mb-track"><span style="width:${pct}%;background:${color}"></span></div>
  </div>`;
}
function summaryHTML(tot, tg) {
  let cap;
  if (tg) {
    const rem = tg.cals - tot.kcal;
    cap = rem >= 0 ? `${rem} ${t("kcal")} ${t("ctRemaining")}` : `<span style="color:#ef4444">${-rem} ${t("kcal")} ${t("ctOver")}</span>`;
  } else cap = t("ctNoTarget");
  return `<div class="ct-summary">
    <div class="ct-ringwrap">${calRing(tot.kcal, tg ? tg.cals : null)}<div class="ct-ringcap">${cap}</div></div>
    <div class="ct-macros">
      ${macroBar(t("protein"), "#16a34a", tot.p, tg ? tg.protein : null)}
      ${macroBar(t("carbs"), "#f59e0b", tot.c, tg ? tg.carbs : null)}
      ${macroBar(t("fat"), "#8b5cf6", tot.f, tg ? tg.fat : null)}
    </div>
  </div>`;
}
function scannerHTML() {
  if (nScan.status === "analyzing") {
    return `<div class="section ct-scan">
      <div class="ct-preview"><img src="${nScan.previewURL}" alt="">
        <div class="ct-analyzing"><span class="ct-spin"></span>${t("ctAnalyzing")}</div></div>
    </div>`;
  }
  if (nScan.status === "result" && nScan.base) {
    const b = nScan.base, s = scaled(b, nScan.portion);
    const tag = b.source === "ai"
      ? `<span class="ct-conf ai">${t("ctAiNote")}</span>`
      : (b.confidence != null ? `<span class="ct-conf">${b.confidence}% ${t("ctConfidence")}</span>` : "");
    const portions = [0.5, 1, 1.5, 2, 3];
    return `<div class="section ct-scan">
      <div class="ct-result">
        ${nScan.previewURL ? `<div class="ct-preview sm"><img src="${nScan.previewURL}" alt=""></div>` : ""}
        <div class="ct-rbody">
          <div class="ct-detected"><span class="fr-emo">${b.emoji}</span> <b>${b.name[state.lang]}</b> ${tag}</div>
          <div class="ct-serving">${b.serving[state.lang]}</div>
          <div class="ct-kcal"><span>${s.kcal}</span> ${t("kcal")}</div>
          <div class="ct-macmini">${t("protein")} ${s.p}g · ${t("carbs")} ${s.c}g · ${t("fat")} ${s.f}g</div>
          <div class="ct-portion"><span class="ct-plabel">${t("ctPortion")}</span>
            ${portions.map(p => `<button class="chip ${nScan.portion === p ? "active" : ""}" data-portion="${p}">${p}×</button>`).join("")}</div>
          <div class="ct-correct"><label>${t("ctNotRight")}</label><select data-food="pick">${foodOptions(b.key)}</select></div>
          <div class="ct-actions">
            <button class="btn" id="foodAdd">${t("ctAddDay")}</button>
            <button class="btn ghost" id="foodDiscard">${t("ctDiscard")}</button>
          </div>
        </div>
      </div>
    </div>`;
  }
  // idle: pick-what-you-ate first, photo optional
  return `<div class="section ct-scan">
    <h4>🍽️ ${t("ctPickTitle")}</h4>
    <input id="ctSearch" class="ct-searchbox" data-food="search" type="text" placeholder="${esc(t("ctSearchPh"))}" value="${esc(nQuery)}">
    <div id="ctFoodResults" class="ct-foods">${foodResultsHTML()}</div>
    <label class="ct-photobtn" for="foodPhotoInput">${t("ctByPhoto")}</label>
    <input id="foodPhotoInput" type="file" accept="image/*" capture="environment" data-food="photo" hidden>
  </div>`;
}
function todayListHTML(today, tot) {
  if (!today.length) return `<div class="section"><h4>🗓️ ${t("ctToday")}</h4><div class="note">${t("ctEmptyDay")}</div></div>`;
  return `<div class="section"><h4>🗓️ ${t("ctToday")}</h4>
    ${today.map(x => `<div class="food-row">
      <div class="fr-l"><span class="fr-emo">${x.emoji}</span>
        <div><div class="fr-name">${x.name[state.lang]}${x.portion !== 1 ? ` <small>×${x.portion}</small>` : ""}</div>
          <div class="fr-mac">${t("protein")} ${x.p} · ${t("carbs")} ${x.c} · ${t("fat")} ${x.f} g</div></div></div>
      <div class="fr-r"><b>${x.kcal}</b> <small>${t("kcal")}</small>
        <button class="auth-link fr-del" data-delfood="${x.id}" aria-label="remove">✕</button></div>
    </div>`).join("")}
    <div class="food-row total"><div class="fr-l"><b>${t("ctTotals")}</b></div>
      <div class="fr-r"><b>${tot.kcal}</b> <small>${t("kcal")}</small></div></div>
  </div>`;
}
function histDate(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(state.lang === "ar" ? "ar-JO" : "en-US", { weekday: "short", day: "numeric", month: "short" });
}
function historyHTML(log) {
  const tk = todayKey();
  const days = Object.keys(log).filter(k => k !== tk && log[k] && log[k].length).sort().reverse().slice(0, 7);
  if (!days.length) return "";
  return `<div class="section"><h4>📆 ${t("ctHistory")}</h4>
    ${days.map(k => { const kc = log[k].reduce((a, x) => a + x.kcal, 0); return `<div class="kv"><span>${histDate(k)}</span><span><b>${kc}</b> ${t("kcal")} · ${log[k].length}</span></div>`; }).join("")}
  </div>`;
}
function secNutrition(u) {
  const tg = foodTargets(u);
  const log = u.food || {};
  const today = log[todayKey()] || [];
  const tot = today.reduce((a, x) => ({ kcal: a.kcal + x.kcal, p: a.p + x.p, c: a.c + x.c, f: a.f + x.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  return `
  <h3>📷 ${t("calorieTracker")}</h3>
  <div class="h-sub">${t("ctSub")}</div>
  ${summaryHTML(tot, tg)}
  ${scannerHTML()}
  ${todayListHTML(today, tot)}
  ${historyHTML(log)}
  <div class="note">${t("ctDemoNote") || ""}</div>`;
}

/* ---------- actions ---------- */
function foodAdd() {
  const u = currentUser(); if (!u || !nScan.base) return;
  const b = nScan.base, s = scaled(b, nScan.portion);
  const log = { ...(u.food || {}) }, k = todayKey();
  const list = (log[k] || []).slice();
  list.push({ id: "f" + Date.now() + Math.floor(Math.random() * 1000), emoji: b.emoji, name: b.name, portion: nScan.portion, kcal: s.kcal, p: s.p, c: s.c, f: s.f, source: b.source, ts: Date.now() });
  log[k] = list; updateUser({ food: log });
  resetNutrition(); reRenderSection(); toast(t("ctAdded"));
}
function foodRemove(id) {
  const u = currentUser(); if (!u) return;
  const log = { ...(u.food || {}) }, k = todayKey();
  log[k] = (log[k] || []).filter(x => x.id !== id);
  updateUser({ food: log }); reRenderSection(); toast(t("ctRemoved"));
}

/* ---------- hooks called by auth.js ---------- */
function handleFoodClick(e) {
  const hit = (s) => e.target.closest(s);
  const pick = hit("[data-food-pick]");
  if (pick) {
    const food = FOODS.find(x => x.key === pick.dataset.foodPick);
    if (food) { nScan = { status: "result", previewURL: null, base: toBase(food), portion: 1 }; reRenderSection(); }
    return true;
  }
  const p = hit("[data-portion]"); if (p) { nScan.portion = parseFloat(p.dataset.portion) || 1; reRenderSection(); return true; }
  if (hit("#foodAdd")) { foodAdd(); return true; }
  if (hit("#foodDiscard")) { resetNutrition(); reRenderSection(); return true; }
  const df = hit("[data-delfood]"); if (df) { foodRemove(df.dataset.delfood); return true; }
  return false;
}
function handleFoodChange(e) {
  const el = e.target;
  if (el.dataset.food === "photo") {
    const file = el.files && el.files[0];
    if (!file) return true;
    const reader = new FileReader();
    reader.onload = () => {
      nScan = { status: "analyzing", previewURL: reader.result, base: null, portion: 1 };
      reRenderSection();
      analyzeFood(file)
        .then(base => { nScan.base = base; nScan.portion = 1; nScan.status = "result"; reRenderSection(); })
        .catch(() => { resetNutrition(); reRenderSection(); toast("⚠️"); });
    };
    reader.readAsDataURL(file);
    return true;
  }
  if (el.dataset.food === "pick") {
    const food = FOODS.find(x => x.key === el.value);
    if (food) { nScan.base = toBase(food); reRenderSection(); }
    return true;
  }
  return false;
}

/* ---------- live food search (input event, focus-preserving) ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("authModal");
  if (!modal) return;
  modal.addEventListener("input", (e) => {
    if (e.target && e.target.id === "ctSearch") {
      nQuery = e.target.value;
      const box = document.getElementById("ctFoodResults");
      if (box) box.innerHTML = foodResultsHTML();
    }
  });
});
