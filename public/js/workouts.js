/* =============================================================
   FitJo — workout picker (Pro). Build today's workout from the full
   gym catalog; add/remove, tick off as you go, tracked per day.
   Relies on globals: state, esc, tL, currentUser, updateUser, toast, reRenderSection.
   ============================================================= */

const WORKOUTS = [
  // Chest
  { id: "w_bench", m: "chest", n: { en: "Barbell bench press", ar: "بنش بريس بار" } },
  { id: "w_incline", m: "chest", n: { en: "Incline dumbbell press", ar: "ضغط دمبل مائل" } },
  { id: "w_declinep", m: "chest", n: { en: "Decline press", ar: "ضغط مائل سفلي" } },
  { id: "w_fly", m: "chest", n: { en: "Cable / pec-deck fly", ar: "تفتيح كيبل" } },
  { id: "w_dip", m: "chest", n: { en: "Chest dips", ar: "غطس للصدر" } },
  { id: "w_pushup", m: "chest", n: { en: "Push-ups", ar: "تمرين الضغط" } },
  // Back
  { id: "w_deadlift", m: "back", n: { en: "Deadlift", ar: "رفعة ميتة" } },
  { id: "w_pullup", m: "back", n: { en: "Pull-ups", ar: "عقلة" } },
  { id: "w_latpull", m: "back", n: { en: "Lat pulldown", ar: "سحب أمامي" } },
  { id: "w_bbrow", m: "back", n: { en: "Barbell row", ar: "تجديف بار" } },
  { id: "w_dbrow", m: "back", n: { en: "Dumbbell row", ar: "تجديف دمبل" } },
  { id: "w_seatedrow", m: "back", n: { en: "Seated cable row", ar: "تجديف كيبل" } },
  { id: "w_facepull", m: "back", n: { en: "Face pulls", ar: "سحب للوجه" } },
  { id: "w_hyper", m: "back", n: { en: "Back extensions", ar: "تمديد الظهر" } },
  // Shoulders
  { id: "w_ohp", m: "shoulders", n: { en: "Overhead press", ar: "ضغط أكتاف" } },
  { id: "w_arnold", m: "shoulders", n: { en: "Arnold press", ar: "أرنولد بريس" } },
  { id: "w_lateral", m: "shoulders", n: { en: "Lateral raises", ar: "رفرفة جانبية" } },
  { id: "w_front", m: "shoulders", n: { en: "Front raises", ar: "رفرفة أمامية" } },
  { id: "w_reardelt", m: "shoulders", n: { en: "Rear-delt fly", ar: "تفتيح خلفي" } },
  { id: "w_shrug", m: "shoulders", n: { en: "Shrugs", ar: "هز الأكتاف" } },
  // Biceps
  { id: "w_curl", m: "biceps", n: { en: "Barbell curl", ar: "مرجحة بار" } },
  { id: "w_dbcurl", m: "biceps", n: { en: "Dumbbell curl", ar: "مرجحة دمبل" } },
  { id: "w_hammer", m: "biceps", n: { en: "Hammer curl", ar: "مرجحة مطرقة" } },
  { id: "w_preacher", m: "biceps", n: { en: "Preacher curl", ar: "مرجحة بريتشر" } },
  { id: "w_concentration", m: "biceps", n: { en: "Concentration curl", ar: "مرجحة تركيز" } },
  // Triceps
  { id: "w_pushdown", m: "triceps", n: { en: "Triceps pushdown", ar: "دفع ترايسبس" } },
  { id: "w_skull", m: "triceps", n: { en: "Skull crushers", ar: "سحق الجمجمة" } },
  { id: "w_overheadext", m: "triceps", n: { en: "Overhead extension", ar: "تمديد علوي" } },
  { id: "w_closebench", m: "triceps", n: { en: "Close-grip bench", ar: "بنش ضيق" } },
  { id: "w_kickback", m: "triceps", n: { en: "Triceps kickback", ar: "ركلة ترايسبس" } },
  // Legs
  { id: "w_squat", m: "legs", n: { en: "Barbell squat", ar: "سكوات بار" } },
  { id: "w_frontsquat", m: "legs", n: { en: "Front squat", ar: "سكوات أمامي" } },
  { id: "w_legpress", m: "legs", n: { en: "Leg press", ar: "دفع أرجل" } },
  { id: "w_rdl", m: "legs", n: { en: "Romanian deadlift", ar: "رفعة رومانية" } },
  { id: "w_lunge", m: "legs", n: { en: "Walking lunges", ar: "طعنات مشي" } },
  { id: "w_legext", m: "legs", n: { en: "Leg extension", ar: "تمديد أرجل" } },
  { id: "w_legcurl", m: "legs", n: { en: "Leg curl", ar: "ثني أرجل" } },
  { id: "w_calf", m: "legs", n: { en: "Calf raises", ar: "رفع سمانة" } },
  { id: "w_bulgarian", m: "legs", n: { en: "Bulgarian split squat", ar: "سكوات بلغاري" } },
  // Glutes
  { id: "w_hipthrust", m: "glutes", n: { en: "Hip thrust", ar: "دفع الورك" } },
  { id: "w_gluteback", m: "glutes", n: { en: "Glute kickback", ar: "ركلة المؤخرة" } },
  { id: "w_abduction", m: "glutes", n: { en: "Hip abduction", ar: "تبعيد الورك" } },
  // Core
  { id: "w_plank", m: "core", n: { en: "Plank", ar: "بلانك" } },
  { id: "w_crunch", m: "core", n: { en: "Crunches", ar: "كرنش" } },
  { id: "w_legraise", m: "core", n: { en: "Hanging leg raises", ar: "رفع أرجل معلق" } },
  { id: "w_russian", m: "core", n: { en: "Russian twists", ar: "لف روسي" } },
  { id: "w_cablecrunch", m: "core", n: { en: "Cable crunch", ar: "كرنش كيبل" } },
  { id: "w_mountain", m: "core", n: { en: "Mountain climbers", ar: "متسلق الجبل" } },
  // Cardio
  { id: "w_treadmill", m: "cardio", n: { en: "Treadmill run/walk", ar: "جري/مشي على الجهاز" } },
  { id: "w_cycle", m: "cardio", n: { en: "Stationary bike", ar: "دراجة ثابتة" } },
  { id: "w_row", m: "cardio", n: { en: "Rowing machine", ar: "جهاز التجديف" } },
  { id: "w_elliptical", m: "cardio", n: { en: "Elliptical", ar: "إليبتيكال" } },
  { id: "w_hiit", m: "cardio", n: { en: "HIIT intervals", ar: "فترات هيت" } },
  { id: "w_jumprope", m: "cardio", n: { en: "Jump rope", ar: "نط الحبل" } },
  { id: "w_stair", m: "cardio", n: { en: "Stair climber", ar: "جهاز الدرج" } },
  // Full body / functional
  { id: "w_clean", m: "full", n: { en: "Power clean", ar: "باور كلين" } },
  { id: "w_snatch", m: "full", n: { en: "Snatch", ar: "خطف" } },
  { id: "w_thruster", m: "full", n: { en: "Thruster", ar: "ثراستر" } },
  { id: "w_kbswing", m: "full", n: { en: "Kettlebell swing", ar: "أرجحة كيتل بيل" } },
  { id: "w_burpee", m: "full", n: { en: "Burpees", ar: "بيربي" } },
  { id: "w_boxjump", m: "full", n: { en: "Box jumps", ar: "قفز الصندوق" } },
  { id: "w_battlerope", m: "full", n: { en: "Battle ropes", ar: "حبال القتال" } },
  { id: "w_farmer", m: "full", n: { en: "Farmer's carry", ar: "حمل المزارع" } },
];
const MUSCLES = [
  ["chest", { en: "Chest", ar: "صدر" }, "🫁"], ["back", { en: "Back", ar: "ظهر" }, "🔙"],
  ["shoulders", { en: "Shoulders", ar: "أكتاف" }, "🎯"], ["biceps", { en: "Biceps", ar: "بايسبس" }, "💪"],
  ["triceps", { en: "Triceps", ar: "ترايسبس" }, "🦾"], ["legs", { en: "Legs", ar: "أرجل" }, "🦵"],
  ["glutes", { en: "Glutes", ar: "مؤخرة" }, "🍑"], ["core", { en: "Core", ar: "بطن" }, "🧱"],
  ["cardio", { en: "Cardio", ar: "كارديو" }, "🏃"], ["full", { en: "Full body", ar: "جسم كامل" }, "🤸"],
];
let woMuscle = "chest";   // catalog filter

function todayWorkout(u) {
  const d = new Date().toDateString();
  const w = u.workout;
  if (!w || w.date !== d) return [];
  return w.today || [];
}
function saveToday(list) {
  updateUser({ workout: { date: new Date().toDateString(), today: list } });
}

function secWorkouts(u) {
  const today = todayWorkout(u);
  const done = today.filter(x => x.done).length;
  const inToday = new Set(today.map(x => x.id));
  const nameOf = (id) => { const e = WORKOUTS.find(w => w.id === id); return e ? e.n[state.lang] : id; };
  const cat = WORKOUTS.filter(w => w.m === woMuscle);

  return `<h3>🏋️ ${tL("Today's workout", "تمرين اليوم")}</h3>
    <div class="h-sub">${tL("Pick exercises, then tick them off as you train.", "اختر التمارين ثم علّمها أثناء التمرين.")}</div>

    ${today.length ? `
      <div class="macro" style="margin:10px 0 6px"><div class="macro-top"><span>${tL("Progress", "التقدّم")}</span><span>${done}/${today.length}</span></div>
        <div class="macro-track"><div class="macro-fill" style="width:${today.length ? Math.round(done / today.length * 100) : 0}%;background:var(--accent)"></div></div></div>
      <div class="wo-today">
        ${today.map(x => `<label class="wo-item ${x.done ? "done" : ""}">
          <input type="checkbox" data-wodone="${x.id}" ${x.done ? "checked" : ""}>
          <span>${esc(nameOf(x.id))}</span>
          <button class="auth-link" data-worem="${x.id}" title="remove">✕</button></label>`).join("")}
      </div>
      <button class="btn ghost block" id="woClear" style="margin-bottom:14px">${tL("Clear today", "مسح اليوم")}</button>
    ` : `<div class="note">${tL("No exercises yet — add some from the catalog below.", "لا تمارين بعد — أضف من القائمة بالأسفل.")}</div>`}

    <div class="ed-section">${tL("Exercise catalog", "قائمة التمارين")}</div>
    <div class="wo-muscles">
      ${MUSCLES.map(([k, lbl, ic]) => `<button class="wo-mtab ${woMuscle === k ? "active" : ""}" data-womuscle="${k}">${ic} ${lbl[state.lang]}</button>`).join("")}
    </div>
    <div class="wo-cat">
      ${cat.map(w => `<div class="wo-catitem">
        <span>${esc(w.n[state.lang])}</span>
        ${inToday.has(w.id) ? `<span class="tag">${tL("Added", "مضاف")} ✓</span>` : `<button class="btn sm-btn" data-woadd="${w.id}">＋</button>`}
      </div>`).join("")}
    </div>`;
}

function handleWorkoutsClick(e) {
  const u = currentUser();
  const add = e.target.closest("[data-woadd]");
  if (add) { const id = add.dataset.woadd; const list = todayWorkout(u); if (!list.some(x => x.id === id)) saveToday([...list, { id, done: false }]); reRenderSection(); return true; }
  const rem = e.target.closest("[data-worem]");
  if (rem) { saveToday(todayWorkout(u).filter(x => x.id !== rem.dataset.worem)); reRenderSection(); return true; }
  const mt = e.target.closest("[data-womuscle]");
  if (mt) { woMuscle = mt.dataset.womuscle; reRenderSection(); return true; }
  if (e.target.closest("#woClear")) { saveToday([]); reRenderSection(); toast(tL("Cleared", "تم المسح")); return true; }
  return false;
}
function handleWorkoutsChange(e) {
  const chk = e.target.closest("[data-wodone]");
  if (chk) {
    const u = currentUser(), id = chk.dataset.wodone;
    const list = todayWorkout(u).map(x => x.id === id ? { ...x, done: chk.checked } : x);
    saveToday(list); reRenderSection();
    return true;
  }
  return false;
}
