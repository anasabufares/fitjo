/* =============================================================
   FitJo — personalized plan (subscription feature)
   Intake form -> workouts, nutrition/meal plan, supplements,
   water, gym schedule, and gym/rest reminders.
   Relies on globals from app.js / auth.js: state, t, I18N,
   currentUser, updateUser, toast, val, reRenderSection,
   renderAuthButton, goalOptions, fmtDate.
   ============================================================= */

let editingPlan = false;
let reminderTimer = null;
const firedKeys = {};

/* ---------- text (both languages) ---------- */
const PLAN_I18N = {
  en: {
    myPlan: "My plan",
    formTitle: "Tell us about you", formSub: "Fill this once — we build your workouts, meals, water and gym schedule.",
    height: "Height (cm)", curWeight: "Current weight (kg)", targetWeight: "Target weight (kg)",
    experience: "Experience", expBeginner: "Beginner", expIntermediate: "Intermediate", expAdvanced: "Advanced",
    activity: "Daily activity", actSedentary: "Sedentary (desk job)", actLight: "Lightly active", actModerate: "Moderately active", actActive: "Very active", actVery: "Athlete / heavy labor",
    daysPerWeek: "Days per week at the gym", gymTimePref: "Preferred gym time",
    timeMorning: "Morning", timeAfternoon: "Afternoon", timeEvening: "Evening",
    diet: "Diet preference", dietNone: "No restriction", dietVeg: "Vegetarian", dietVegan: "Vegan",
    generatePlan: "Build my plan", updateInfo: "Update my info", planReady: "Your plan is ready 🎉",
    formErr: "Please enter a valid height and weight.",
    dailyCalories: "Calories/day", protein: "Protein", carbs: "Carbs", fat: "Fat",
    waterTitle: "Water", waterPerDay: "Per day", cupsLabel: "cups",
    whenGym: "When to go to the gym", trainAt: "Train at", daysWord: "Days", perWeek: "days/week",
    weeklySchedule: "Weekly schedule", restDay: "Rest day", workoutPlan: "Your workout plan",
    mealPlan: "Meal plan (sample day)", kcal: "kcal",
    mealNote: "Portions scale to hit your daily calories. Prioritise protein and whole foods.",
    dietSwapNote: "Swap animal proteins for tofu, legumes and lentils.",
    supplements: "Suggested supplements", suppDisclaimer: "Talk to a doctor before starting any supplement.",
    reminders: "Reminders", gymReminder: "Gym reminder", restReminder: "Rest-day reminder", testReminder: "Test",
    remGymMsg: "🏋️ Time to train — head to the gym!", remRestMsg: "😴 Rest day — recover, stretch and hydrate.",
    remNote: "Reminders show while the app is open (plus a desktop notification if you allow it). Always-on push arrives with the backend.",
  },
  ar: {
    myPlan: "خطتي",
    formTitle: "أخبرنا عن نفسك", formSub: "املأ هذا مرة واحدة — نبني لك التمارين والوجبات والماء وجدول النادي.",
    height: "الطول (سم)", curWeight: "الوزن الحالي (كغ)", targetWeight: "الوزن المستهدف (كغ)",
    experience: "الخبرة", expBeginner: "مبتدئ", expIntermediate: "متوسط", expAdvanced: "متقدم",
    activity: "النشاط اليومي", actSedentary: "خامل (عمل مكتبي)", actLight: "نشاط خفيف", actModerate: "نشاط متوسط", actActive: "نشاط عالٍ", actVery: "رياضي / عمل شاق",
    daysPerWeek: "أيام التمرين أسبوعياً", gymTimePref: "وقت النادي المفضل",
    timeMorning: "صباحاً", timeAfternoon: "بعد الظهر", timeEvening: "مساءً",
    diet: "النظام الغذائي", dietNone: "بدون قيود", dietVeg: "نباتي", dietVegan: "نباتي صرف",
    generatePlan: "أنشئ خطتي", updateInfo: "تحديث معلوماتي", planReady: "خطتك جاهزة 🎉",
    formErr: "يرجى إدخال طول ووزن صحيحين.",
    dailyCalories: "سعرات/يوم", protein: "بروتين", carbs: "كربوهيدرات", fat: "دهون",
    waterTitle: "الماء", waterPerDay: "يومياً", cupsLabel: "كوب",
    whenGym: "متى تذهب للنادي", trainAt: "تمرّن", daysWord: "الأيام", perWeek: "أيام/أسبوع",
    weeklySchedule: "الجدول الأسبوعي", restDay: "يوم راحة", workoutPlan: "خطة تمارينك",
    mealPlan: "خطة الوجبات (يوم نموذجي)", kcal: "سعرة",
    mealNote: "تُعدّل الكميات لبلوغ سعراتك اليومية. أعطِ الأولوية للبروتين والأطعمة الكاملة.",
    dietSwapNote: "استبدل البروتين الحيواني بالتوفو والبقوليات والعدس.",
    supplements: "مكملات مقترحة", suppDisclaimer: "استشر الطبيب قبل البدء بأي مكمل.",
    reminders: "التذكيرات", gymReminder: "تذكير النادي", restReminder: "تذكير يوم الراحة", testReminder: "تجربة",
    remGymMsg: "🏋️ وقت التمرين — توجّه إلى النادي!", remRestMsg: "😴 يوم راحة — تعافَ ومدّد واشرب الماء.",
    remNote: "تظهر التذكيرات أثناء فتح التطبيق (مع إشعار سطح المكتب إن سمحت). الإشعارات الدائمة تأتي مع الخادم.",
  },
};
Object.assign(I18N.en, PLAN_I18N.en);
Object.assign(I18N.ar, PLAN_I18N.ar);

/* ---------- data ---------- */
const JDAYS = [
  { en: "Sat", ar: "السبت" }, { en: "Sun", ar: "الأحد" }, { en: "Mon", ar: "الإثنين" },
  { en: "Tue", ar: "الثلاثاء" }, { en: "Wed", ar: "الأربعاء" }, { en: "Thu", ar: "الخميس" }, { en: "Fri", ar: "الجمعة" },
];
const TRAIN_INDICES = { 2: [0, 4], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5] };

const WK = {
  push: { name: { en: "Push — Chest, Shoulders, Triceps", ar: "دفع — صدر، أكتاف، ترايسبس" }, ex: [
    { n: { en: "Bench press", ar: "بنش بريس" }, s: 4 }, { n: { en: "Incline dumbbell press", ar: "ضغط دمبل مائل" }, s: 3 },
    { n: { en: "Shoulder press", ar: "ضغط أكتاف" }, s: 3 }, { n: { en: "Lateral raises", ar: "رفرفة جانبية" }, s: 3 },
    { n: { en: "Triceps pushdown", ar: "دفع ترايسبس" }, s: 3 } ] },
  pull: { name: { en: "Pull — Back & Biceps", ar: "سحب — ظهر وبايسبس" }, ex: [
    { n: { en: "Deadlift", ar: "رفعة ميتة" }, s: 4 }, { n: { en: "Pull-ups / Lat pulldown", ar: "عقلة / سحب أمامي" }, s: 3 },
    { n: { en: "Barbell row", ar: "تجديف بار" }, s: 3 }, { n: { en: "Face pulls", ar: "سحب للوجه" }, s: 3 },
    { n: { en: "Biceps curls", ar: "مرجحة بايسبس" }, s: 3 } ] },
  legs: { name: { en: "Legs", ar: "أرجل" }, ex: [
    { n: { en: "Squats", ar: "سكوات" }, s: 4 }, { n: { en: "Romanian deadlift", ar: "رفعة رومانية" }, s: 3 },
    { n: { en: "Leg press", ar: "دفع أرجل" }, s: 3 }, { n: { en: "Leg curls", ar: "ثني أرجل" }, s: 3 },
    { n: { en: "Calf raises", ar: "رفع سمانة" }, s: 4 } ] },
  upper: { name: { en: "Upper body", ar: "الجزء العلوي" }, ex: [
    { n: { en: "Bench press", ar: "بنش بريس" }, s: 4 }, { n: { en: "Barbell row", ar: "تجديف بار" }, s: 4 },
    { n: { en: "Shoulder press", ar: "ضغط أكتاف" }, s: 3 }, { n: { en: "Lat pulldown", ar: "سحب أمامي" }, s: 3 },
    { n: { en: "Biceps + triceps superset", ar: "سوبر ست بايسبس وترايسبس" }, s: 3 } ] },
  lower: { name: { en: "Lower body", ar: "الجزء السفلي" }, ex: [
    { n: { en: "Squats", ar: "سكوات" }, s: 4 }, { n: { en: "Romanian deadlift", ar: "رفعة رومانية" }, s: 3 },
    { n: { en: "Walking lunges", ar: "طعنات مشي" }, s: 3 }, { n: { en: "Leg extension", ar: "تمديد أرجل" }, s: 3 },
    { n: { en: "Calf raises", ar: "رفع سمانة" }, s: 4 } ] },
  fullA: { name: { en: "Full body A", ar: "جسم كامل أ" }, ex: [
    { n: { en: "Squats", ar: "سكوات" }, s: 3 }, { n: { en: "Bench press", ar: "بنش بريس" }, s: 3 },
    { n: { en: "Barbell row", ar: "تجديف بار" }, s: 3 }, { n: { en: "Shoulder press", ar: "ضغط أكتاف" }, s: 3 },
    { n: { en: "Plank", ar: "بلانك" }, s: 3 } ] },
  fullB: { name: { en: "Full body B", ar: "جسم كامل ب" }, ex: [
    { n: { en: "Deadlift", ar: "رفعة ميتة" }, s: 3 }, { n: { en: "Incline press", ar: "ضغط مائل" }, s: 3 },
    { n: { en: "Lat pulldown", ar: "سحب أمامي" }, s: 3 }, { n: { en: "Leg press", ar: "دفع أرجل" }, s: 3 },
    { n: { en: "Hanging leg raises", ar: "رفع أرجل معلق" }, s: 3 } ] },
  cardio: { name: { en: "Cardio & Core", ar: "كارديو وبطن" }, ex: [
    { n: { en: "Incline treadmill walk", ar: "مشي مائل على الجهاز" }, s: 1, rep: "25–30 min" },
    { n: { en: "HIIT intervals", ar: "فترات هيت" }, s: 1, rep: "10 min" },
    { n: { en: "Cycling", ar: "دراجة ثابتة" }, s: 1, rep: "15 min" },
    { n: { en: "Crunches", ar: "كرنش" }, s: 3 }, { n: { en: "Plank", ar: "بلانك" }, s: 3 } ] },
};

const MEALS = [
  { slot: { en: "Breakfast", ar: "الفطور" }, items: { en: "Oats, banana, 3 eggs & labneh", ar: "شوفان، موز، 3 بيضات ولبنة" }, kcal: 450 },
  { slot: { en: "Snack", ar: "وجبة خفيفة" }, items: { en: "Greek yogurt & a handful of almonds", ar: "زبادي يوناني وحفنة لوز" }, kcal: 220 },
  { slot: { en: "Lunch", ar: "الغداء" }, items: { en: "Grilled chicken, rice & salad", ar: "دجاج مشوي، رز وسلطة" }, kcal: 600 },
  { slot: { en: "Pre-workout", ar: "قبل التمرين" }, items: { en: "Fruit & a coffee", ar: "فاكهة وقهوة" }, kcal: 150 },
  { slot: { en: "Dinner", ar: "العشاء" }, items: { en: "Salmon or lean beef, potato & veggies", ar: "سلمون أو لحم قليل الدهن، بطاطا وخضار" }, kcal: 550 },
];

const SUPP = {
  multi: { name: { en: "Multivitamin", ar: "مالتي فيتامين" }, note: { en: "Covers daily micronutrient gaps.", ar: "يسدّ نقص الفيتامينات اليومية." } },
  omega: { name: { en: "Omega-3 (fish oil)", ar: "أوميغا-3 (زيت سمك)" }, note: { en: "Heart, joints and recovery.", ar: "للقلب والمفاصل والتعافي." } },
  vitd: { name: { en: "Vitamin D", ar: "فيتامين د" }, note: { en: "Common deficiency; bones & immunity.", ar: "نقص شائع؛ للعظام والمناعة." } },
  whey: { name: { en: "Whey protein", ar: "بروتين واي" }, note: { en: "Helps hit your daily protein target.", ar: "يساعد على بلوغ هدف البروتين اليومي." } },
  creatine: { name: { en: "Creatine monohydrate", ar: "كرياتين مونوهيدرات" }, note: { en: "5 g/day — strength & muscle. Well-researched.", ar: "5غ يومياً — للقوة والعضل. مدروس جيداً." } },
  caffeine: { name: { en: "Caffeine / green tea", ar: "كافيين / شاي أخضر" }, note: { en: "Energy and appetite control.", ar: "طاقة وتحكّم بالشهية." } },
};
function suppsFor(goal) {
  const base = [SUPP.multi, SUPP.omega, SUPP.vitd];
  if (goal === "build" || goal === "gain" || goal === "recomp") return [SUPP.whey, SUPP.creatine, ...base];
  if (goal === "lose") return [SUPP.whey, SUPP.caffeine, ...base];
  return [SUPP.whey, ...base];
}

/* ---------- calculations ---------- */
function calcPlan(u) {
  const inx = u.intake, kg = inx.weight, cm = inx.height, age = u.age, g = u.gender;
  const bmrBase = 10 * kg + 6.25 * cm - 5 * age;
  const bmr = g === "m" ? bmrBase + 5 : g === "f" ? bmrBase - 161 : bmrBase - 78;
  const af = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very: 1.9 }[inx.activity] || 1.375;
  const tdee = bmr * af;
  let cals = tdee + (inx.goal === "lose" ? -400 : inx.goal === "gain" ? 400 : inx.goal === "build" ? 250 : 0);
  cals = Math.round(cals / 10) * 10;
  const protPerKg = (inx.goal === "build" || inx.goal === "gain" || inx.goal === "lose") ? 2.0 : 1.8;
  const protein = Math.round(protPerKg * kg);
  const fat = Math.round(cals * 0.25 / 9);
  const carbs = Math.max(0, Math.round((cals - protein * 4 - fat * 9) / 4));
  const waterMl = 35 * kg + ((inx.activity === "active" || inx.activity === "very") ? 500 : 0);
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), cals, protein, carbs, fat, waterL: Math.round(waterMl / 100) / 10, cups: Math.round(waterMl / 250) };
}
function repScheme(goal) { return { lose: "12–15", fit: "12–15", recomp: "10–12", build: "8–12", gain: "6–10" }[goal] || "10–12"; }
function splitFor(goal, days) {
  const strength = (goal === "build" || goal === "gain" || goal === "recomp");
  if (days <= 2) return ["fullA", "fullB"].slice(0, days);
  if (days === 3) return strength ? ["push", "pull", "legs"] : ["fullA", "cardio", "fullB"];
  if (days === 4) return strength ? ["upper", "lower", "upper", "lower"] : ["fullA", "cardio", "fullB", "cardio"];
  if (days === 5) return ["push", "pull", "legs", "upper", "lower"];
  return ["push", "pull", "legs", "push", "pull", "legs"];
}
function buildWeek(u) {
  const inx = u.intake, days = inx.daysPerWeek;
  const train = TRAIN_INDICES[days] || TRAIN_INDICES[3];
  const split = splitFor(inx.goal, days);
  return JDAYS.map((d, i) => {
    const ti = train.indexOf(i);
    return ti >= 0 ? { day: d, workout: split[ti] } : { day: d, rest: true };
  });
}
function uniqueWorkouts(week) {
  const seen = [], out = [];
  week.forEach(d => { if (d.workout && !seen.includes(d.workout)) { seen.push(d.workout); out.push(d.workout); } });
  return out;
}

/* ---------- rendering ---------- */
const optHTML = (pairs, sel) => pairs.map(([k, l]) => `<option value="${k}"${sel === k ? " selected" : ""}>${l}</option>`).join("");
function latestWeight(u) { const w = (u.weights || []).slice().sort((a, b) => a.date - b.date); return w.length ? w[w.length - 1].kg : ""; }
function defaultReminders() { return { gym: { on: false, time: "19:00" }, rest: { on: false, time: "10:00" } }; }

function secPlan(u) {
  if (!u.intake || editingPlan) return planFormHTML(u);
  return planViewHTML(u);
}

function planFormHTML(u) {
  const inx = u.intake || {};
  const wPre = inx.weight != null ? inx.weight : latestWeight(u);
  return `
  <h3>${t("formTitle")}</h3><div class="h-sub">${t("formSub")}</div>
  <div class="form-two">
    <div class="form-row"><label>${t("height")}</label><input id="pfHeight" type="number" min="120" max="230" value="${inx.height || ""}" placeholder="175"></div>
    <div class="form-row"><label>${t("curWeight")}</label><input id="pfWeight" type="number" step="0.1" min="30" max="300" value="${wPre}" placeholder="75"></div>
  </div>
  <div class="form-two">
    <div class="form-row"><label>${t("targetWeight")}</label><input id="pfTarget" type="number" step="0.1" min="30" max="300" value="${inx.target || ""}" placeholder="70"></div>
    <div class="form-row"><label>${t("goal")}</label><select id="pfGoal2">${goalOptions(inx.goal || u.goal)}</select></div>
  </div>
  <div class="form-two">
    <div class="form-row"><label>${t("experience")}</label><select id="pfExp">${optHTML([["beginner", t("expBeginner")], ["intermediate", t("expIntermediate")], ["advanced", t("expAdvanced")]], inx.experience || "beginner")}</select></div>
    <div class="form-row"><label>${t("daysPerWeek")}</label><select id="pfDays">${[2, 3, 4, 5, 6].map(n => `<option value="${n}"${(inx.daysPerWeek || 3) == n ? " selected" : ""}>${n}</option>`).join("")}</select></div>
  </div>
  <div class="form-two">
    <div class="form-row"><label>${t("activity")}</label><select id="pfAct">${optHTML([["sedentary", t("actSedentary")], ["light", t("actLight")], ["moderate", t("actModerate")], ["active", t("actActive")], ["very", t("actVery")]], inx.activity || "light")}</select></div>
    <div class="form-row"><label>${t("gymTimePref")}</label><select id="pfTime">${optHTML([["morning", t("timeMorning")], ["afternoon", t("timeAfternoon")], ["evening", t("timeEvening")]], inx.gymTime || "evening")}</select></div>
  </div>
  <div class="form-row"><label>${t("diet")}</label><select id="pfDiet">${optHTML([["none", t("dietNone")], ["veg", t("dietVeg")], ["vegan", t("dietVegan")]], inx.diet || "none")}</select></div>
  <button class="btn block" id="genPlan">${t("generatePlan")}</button>
  ${u.intake ? `<button class="btn ghost block" id="cancelPlan" style="margin-top:8px">${t("cancel")}</button>` : ""}`;
}

function planViewHTML(u) {
  const p = calcPlan(u), week = buildWeek(u), inx = u.intake, rep = repScheme(inx.goal);
  const r = u.reminders || defaultReminders();
  const timeLabel = { morning: t("timeMorning"), afternoon: t("timeAfternoon"), evening: t("timeEvening") }[inx.gymTime];
  const trainDays = week.filter(d => d.workout).map(d => d.day[state.lang]).join(state.lang === "ar" ? "، " : ", ");
  const restDays = week.filter(d => d.rest).map(d => d.day[state.lang]).join(state.lang === "ar" ? "، " : ", ");
  const dietNote = inx.diet !== "none" ? " " + t("dietSwapNote") : "";
  return `
  <h3>${t("myPlan")}</h3>
  <div class="h-sub">${goalLabel(inx.goal)} · ${inx.daysPerWeek} ${t("perWeek")} · ${timeLabel}</div>

  <div class="stat-row" style="flex-wrap:wrap">
    <div class="stat"><div class="n">${p.cals}</div><div class="l">${t("dailyCalories")}</div></div>
    <div class="stat"><div class="n">${p.protein}<small>g</small></div><div class="l">${t("protein")}</div></div>
    <div class="stat"><div class="n">${p.carbs}<small>g</small></div><div class="l">${t("carbs")}</div></div>
    <div class="stat"><div class="n">${p.fat}<small>g</small></div><div class="l">${t("fat")}</div></div>
  </div>

  <div class="section">
    <h4>💧 ${t("waterTitle")}</h4>
    <div class="kv"><span>${t("waterPerDay")}</span><span><b>${p.waterL} L</b> · ${p.cups} ${t("cupsLabel")}</span></div>
    <div style="font-size:18px;letter-spacing:2px">${Array.from({ length: p.cups }).map(() => "💧").join("")}</div>
  </div>

  <div class="section">
    <h4>📍 ${t("whenGym")}</h4>
    <div class="kv"><span>${t("trainAt")}</span><span>${timeLabel} · ${r.gym.time}</span></div>
    <div class="kv"><span>${t("daysWord")}</span><span>${trainDays}</span></div>
  </div>

  <div class="section">
    <h4>📅 ${t("weeklySchedule")}</h4>
    <div class="week">
      ${week.map(d => `<div class="wk ${d.rest ? "rest" : ""}"><div class="wk-d">${d.day[state.lang]}</div><div class="wk-w">${d.rest ? "😴 " + t("restDay") : WK[d.workout].name[state.lang].split("—")[0]}</div></div>`).join("")}
    </div>
  </div>

  <div class="section">
    <h4>🏋️ ${t("workoutPlan")}</h4>
    ${uniqueWorkouts(week).map(key => `
      <div class="wk-block">
        <div class="wk-title">${WK[key].name[state.lang]}</div>
        ${WK[key].ex.map(x => `<div class="ex-row"><span>${x.n[state.lang]}</span><span class="ex-sets">${x.s} × ${x.rep || rep}</span></div>`).join("")}
      </div>`).join("")}
  </div>

  <div class="section">
    <h4>🍽️ ${t("mealPlan")}</h4>
    ${MEALS.map(m => `<div class="meal-row"><div><b>${m.slot[state.lang]}</b><div class="meal-items">${m.items[state.lang]}</div></div><span class="meal-kcal">${m.kcal} ${t("kcal")}</span></div>`).join("")}
    <div class="note">${t("mealNote")}${dietNote}</div>
  </div>

  <div class="section">
    <h4>💊 ${t("supplements")}</h4>
    ${suppsFor(inx.goal).map(s => `<div class="supp-row"><b>${s.name[state.lang]}</b><span>${s.note[state.lang]}</span></div>`).join("")}
    <div class="note">⚠️ ${t("suppDisclaimer")}</div>
  </div>

  <div class="section">
    <h4>🔔 ${t("reminders")}</h4>
    <div class="set-row">
      <div class="txt"><div class="t">🏋️ ${t("gymReminder")}</div><div class="d">${trainDays}</div></div>
      <div style="display:flex;align-items:center;gap:8px">
        <input type="time" class="control" value="${r.gym.time}" data-remtime="gym">
        <label class="switch"><input type="checkbox" data-rem="gym" ${r.gym.on ? "checked" : ""}><span class="slider"></span></label>
      </div>
    </div>
    <div class="set-row">
      <div class="txt"><div class="t">😴 ${t("restReminder")}</div><div class="d">${restDays}</div></div>
      <div style="display:flex;align-items:center;gap:8px">
        <input type="time" class="control" value="${r.rest.time}" data-remtime="rest">
        <label class="switch"><input type="checkbox" data-rem="rest" ${r.rest.on ? "checked" : ""}><span class="slider"></span></label>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn ghost" id="testGym">${t("testReminder")} 🏋️</button>
      <button class="btn ghost" id="testRest">${t("testReminder")} 😴</button>
    </div>
    <div class="note">${t("remNote")}</div>
  </div>

  <button class="btn ghost block" id="retakePlan" style="margin-top:8px">${t("updateInfo")}</button>`;
}

/* ---------- actions ---------- */
function generatePlan() {
  const height = parseFloat(val("pfHeight")), weight = parseFloat(val("pfWeight"));
  if (!(height >= 120 && height <= 230) || !(weight >= 30 && weight <= 300)) return toast(t("formErr"));
  const gymTime = val("pfTime");
  const intake = {
    height, weight, target: parseFloat(val("pfTarget")) || null, goal: val("pfGoal2"),
    experience: val("pfExp"), daysPerWeek: parseInt(val("pfDays"), 10), activity: val("pfAct"), gymTime, diet: val("pfDiet"),
  };
  const u = currentUser();
  const r = u.reminders || defaultReminders();
  if (!r.gym.time) r.gym.time = { morning: "07:00", afternoon: "16:00", evening: "19:00" }[gymTime] || "19:00";
  const patch = { intake, goal: intake.goal, reminders: r };
  if (!(u.weights && u.weights.length)) patch.weights = [{ date: Date.now(), kg: Math.round(weight * 10) / 10 }];
  updateUser(patch);
  editingPlan = false;
  renderAuthButton(); reRenderSection(); toast(t("planReady"));
}
function resetPlanEditing() { editingPlan = false; }

function requestNotif() {
  try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch (e) {}
}
function fireReminder(type) {
  const msg = type === "gym" ? t("remGymMsg") : t("remRestMsg");
  try { if ("Notification" in window && Notification.permission === "granted") new Notification("FitJo", { body: msg }); } catch (e) {}
  toast(msg);
}
function jordanDayIndex(d) { return (d.getDay() + 1) % 7; }
function reminderTick() {
  const u = currentUser(); if (!u || !u.reminders) return;
  const now = new Date(), hhmm = now.toTimeString().slice(0, 5);
  const week = u.intake ? buildWeek(u) : null;
  const di = jordanDayIndex(now);
  ["gym", "rest"].forEach(type => {
    const r = u.reminders[type];
    if (!r || !r.on || r.time !== hhmm) return;
    if (week) { if (type === "gym" && !week[di].workout) return; if (type === "rest" && !week[di].rest) return; }
    const key = type + "|" + now.toDateString() + "|" + hhmm;
    if (firedKeys[key]) return;
    firedKeys[key] = true;
    fireReminder(type);
  });
}
function startReminderScheduler() {
  if (reminderTimer) clearInterval(reminderTimer);
  reminderTimer = setInterval(reminderTick, 30000);
  reminderTick();
}

/* ---------- hooks called by auth.js ---------- */
function handlePlanClick(e) {
  const hit = (s) => e.target.closest(s);
  if (hit("#genPlan")) { generatePlan(); return true; }
  if (hit("#cancelPlan")) { editingPlan = false; reRenderSection(); return true; }
  if (hit("#retakePlan")) { editingPlan = true; reRenderSection(); return true; }
  if (hit("#testGym")) { fireReminder("gym"); return true; }
  if (hit("#testRest")) { fireReminder("rest"); return true; }
  return false;
}
function handlePlanChange(e) {
  const rem = e.target.dataset.rem, remtime = e.target.dataset.remtime;
  if (rem) {
    const r = { ...(currentUser().reminders || defaultReminders()) };
    r[rem] = { ...r[rem], on: e.target.checked };
    updateUser({ reminders: r });
    if (e.target.checked) requestNotif();
    startReminderScheduler(); toast(t("saved"));
    return true;
  }
  if (remtime) {
    const r = { ...(currentUser().reminders || defaultReminders()) };
    r[remtime] = { ...r[remtime], time: e.target.value };
    updateUser({ reminders: r });
    startReminderScheduler();
    return true;
  }
  return false;
}

document.addEventListener("DOMContentLoaded", () => { if (currentUser()) startReminderScheduler(); });
