/* =============================================================
   FitJo — in-body scanner (Pro). Enter a body-composition scan
   (weight, body-fat %, muscle mass) and get workout + nutrition
   guidance. Demo: values are entered manually / "simulated".
   Relies on globals: state, esc, tL, val, wDisplay, wLabel, wToKg,
   currentUser, updateUser, toast, reRenderSection.
   ============================================================= */

function bodyFatCategory(bf, gender) {
  const f = gender === "f";
  if (bf == null) return null;
  if (bf < (f ? 21 : 14)) return { key: "lean", en: "Lean / athletic", ar: "رشيق / رياضي" };
  if (bf < (f ? 25 : 18)) return { key: "fit", en: "Fit", ar: "لائق" };
  if (bf < (f ? 32 : 25)) return { key: "average", en: "Average", ar: "متوسط" };
  return { key: "high", en: "Above average", ar: "أعلى من المتوسط" };
}
function inbodyAdvice(scan, u) {
  const cat = bodyFatCategory(scan.bodyFat, u.gender);
  const key = cat ? cat.key : "average";
  const workout = {
    lean: { en: "Focus on progressive strength & hypertrophy — heavy compounds, 4–6 days/week.", ar: "ركّز على القوة والتضخيم — تمارين مركّبة ثقيلة 4-6 أيام." },
    fit: { en: "Balanced strength + 2 cardio sessions/week to stay lean while building.", ar: "قوة متوازنة + جلستا كارديو أسبوعياً." },
    average: { en: "Mix full-body strength 3–4×/week with 3 moderate cardio sessions.", ar: "قوة لكامل الجسم 3-4 مرات مع 3 جلسات كارديو." },
    high: { en: "Prioritise fat loss: strength 3×/week + 4–5 cardio/HIIT sessions & a step goal.", ar: "أولوية حرق الدهون: قوة 3 مرات + 4-5 كارديو/هيت." },
  }[key];
  const nutrition = {
    lean: { en: "Slight surplus (+250 kcal), 2.0 g/kg protein to add muscle.", ar: "فائض بسيط (+250) وبروتين 2غ/كغ." },
    fit: { en: "Maintenance calories, 1.8–2.0 g/kg protein.", ar: "سعرات صيانة وبروتين 1.8-2غ/كغ." },
    average: { en: "Small deficit (−300 kcal), high protein, whole foods.", ar: "عجز بسيط (-300) وبروتين عالٍ." },
    high: { en: "Deficit (−400 to −500 kcal), 2.0 g/kg protein, cut liquid calories.", ar: "عجز (-400/-500) وبروتين 2غ/كغ." },
  }[key];
  return { cat, workout, nutrition };
}

function secInbody(u) {
  const scan = u.inbody || null;
  const form = `
    <div class="ed-section">${scan ? tL("Update your scan", "حدّث فحصك") : tL("Enter your scan", "أدخل فحصك")}</div>
    <div class="grid2b">
      <div class="form-row"><label>${tL("Weight", "الوزن")} (${wLabel()})</label><input id="ibWeight" type="number" step="0.1" value="${scan ? wDisplay(scan.weightKg) : ""}"></div>
      <div class="form-row"><label>${tL("Body fat %", "نسبة الدهون %")}</label><input id="ibBF" type="number" step="0.1" value="${scan ? (scan.bodyFat ?? "") : ""}"></div>
      <div class="form-row"><label>${tL("Muscle mass", "الكتلة العضلية")} (${wLabel()})</label><input id="ibMuscle" type="number" step="0.1" value="${scan && scan.muscleKg != null ? wDisplay(scan.muscleKg) : ""}"></div>
      <div class="form-row"><label>${tL("Water %", "نسبة الماء %")}</label><input id="ibWater" type="number" step="0.1" value="${scan ? (scan.water ?? "") : ""}"></div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn block" id="ibSave">${tL("Save scan", "حفظ الفحص")}</button>
      <button class="btn ghost" id="ibSimulate" title="${tL("Fill demo values", "قيم تجريبية")}">🔬 ${tL("Simulate", "محاكاة")}</button>
    </div>`;

  if (!scan) {
    return `<h3>🧬 ${tL("In-body scan", "فحص الجسم")}</h3>
      <div class="h-sub">${tL("Log a body-composition scan to get tailored workout & nutrition guidance.", "سجّل فحص تكوين الجسم للحصول على إرشادات مخصصة.")}</div>${form}`;
  }
  const adv = inbodyAdvice(scan, u);
  const bmi = scan.heightCm ? (scan.weightKg / ((scan.heightCm / 100) ** 2)) : (u.intake && u.intake.height ? scan.weightKg / ((u.intake.height / 100) ** 2) : null);
  return `<h3>🧬 ${tL("In-body scan", "فحص الجسم")}</h3>
    <div class="h-sub">${tL("Last scan", "آخر فحص")}: ${new Date(scan.ts).toLocaleDateString(state.lang === "ar" ? "ar-JO" : "en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
    <div class="stat-row" style="flex-wrap:wrap">
      <div class="stat"><div class="n">${wDisplay(scan.weightKg)}<small> ${wLabel()}</small></div><div class="l">${tL("Weight", "الوزن")}</div></div>
      <div class="stat"><div class="n">${scan.bodyFat ?? "—"}<small>%</small></div><div class="l">${tL("Body fat", "الدهون")}</div></div>
      <div class="stat"><div class="n">${scan.muscleKg != null ? wDisplay(scan.muscleKg) : "—"}<small> ${wLabel()}</small></div><div class="l">${tL("Muscle", "العضل")}</div></div>
      ${bmi ? `<div class="stat"><div class="n">${bmi.toFixed(1)}</div><div class="l">BMI</div></div>` : ""}
    </div>
    ${adv.cat ? `<div class="note" style="border-style:solid;border-color:var(--accent)">📊 ${tL("Category", "التصنيف")}: <b>${adv.cat[state.lang]}</b></div>` : ""}
    <div class="section"><h4>🏋️ ${tL("Recommended training", "التدريب الموصى به")}</h4><div class="note">${adv.workout[state.lang]}</div></div>
    <div class="section"><h4>🍎 ${tL("Recommended nutrition", "التغذية الموصى بها")}</h4><div class="note">${adv.nutrition[state.lang]}</div></div>
    ${form}`;
}

function handleInbodyClick(e) {
  if (e.target.closest("#ibSave")) {
    const weightKg = wToKg(val("ibWeight"));
    if (!(weightKg >= 20 && weightKg <= 400)) { toast(tL("Enter a valid weight", "أدخل وزناً صحيحاً")); return true; }
    const bf = parseFloat(val("ibBF")); const muscle = val("ibMuscle") ? wToKg(val("ibMuscle")) : null; const water = parseFloat(val("ibWater"));
    updateUser({ inbody: { ts: Date.now(), weightKg: Math.round(weightKg * 10) / 10, bodyFat: isNaN(bf) ? null : bf, muscleKg: muscle != null && !isNaN(muscle) ? Math.round(muscle * 10) / 10 : null, water: isNaN(water) ? null : water } });
    reRenderSection(); toast(tL("Scan saved", "تم حفظ الفحص"));
    return true;
  }
  if (e.target.closest("#ibSimulate")) {
    const u = currentUser();
    const baseKg = (u.weights && u.weights.length) ? u.weights[u.weights.length - 1].kg : 75;
    const bf = u.gender === "f" ? 26 : 19;
    document.getElementById("ibWeight").value = wDisplay(baseKg);
    document.getElementById("ibBF").value = bf;
    document.getElementById("ibMuscle").value = wDisplay(Math.round(baseKg * (1 - bf / 100) * 0.55 * 10) / 10);
    document.getElementById("ibWater").value = 55;
    toast(tL("Demo scan filled — review & save", "تم ملء فحص تجريبي — راجع واحفظ"));
    return true;
  }
  return false;
}
