/* =============================================================
   FitJo — Rank (Liftoff-style)
   Log any exercise you actually do (weight x reps). Each lift gets
   an estimated 1RM (Epley), ranked Iron -> Grandmaster against
   bodyweight standards (female-scaled). Overall rank = average of
   your logged exercises. Leaderboard with a public/private toggle.
   Standards are simplified for the prototype.
   ============================================================= */

const RANK_I18N = {
  en: {
    rankTitle: "Rank",
    rankSub: "Log the lifts you actually do — every exercise gets a rank. Climb from Iron to Grandmaster.",
    bodyweight: "Bodyweight", liftUnit: "Units", exercise: "Exercise",
    weightLabel: "Weight", repsLabel: "Reps",
    addLift: "Add / update lift", rankErr: "Enter bodyweight, weight and reps first.",
    myLifts: "My lifts", e1rmLabel: "est. 1RM", removeLift: "remove",
    overallRank: "Overall rank", nextRank: "Next rank", toGo: "to go", maxRank: "Top of the ladder 👑",
    percentile: "Stronger than ~{p}% of lifters (est.)",
    liftsCounted: "{n} lifts counted",
    leaderboard: "Leaderboard",
    lbSub: "Where you stand among FitJo lifters.",
    publicToggle: "Show me on the leaderboard",
    publicDesc: "Your name, rank and score become visible to everyone. Turn off anytime.",
    youTag: "You", hiddenNote: "You're hidden — turn on the toggle to appear on the board.",
    scoreLabel: "score",
    rankNote: "Ranks use simplified 1RM-to-bodyweight standards for this prototype.",
    noLifts: "No lifts yet. Add your first one below.",
    tier_iron: "Iron", tier_bronze: "Bronze", tier_silver: "Silver", tier_gold: "Gold",
    tier_platinum: "Platinum", tier_diamond: "Diamond", tier_master: "Master", tier_grandmaster: "Grandmaster",
    ex_bench: "Bench press", ex_squat: "Squat", ex_deadlift: "Deadlift", ex_ohp: "Overhead press",
    ex_row: "Barbell row", ex_curl: "Barbell curl", ex_latpull: "Lat pulldown", ex_legpress: "Leg press",
    ex_hipthrust: "Hip thrust", ex_dbbench: "Dumbbell bench (per hand)",
  },
  ar: {
    rankTitle: "التصنيف",
    rankSub: "سجّل التمارين التي تؤديها فعلاً — كل تمرين يحصل على تصنيف. اصعد من الحديدي إلى الغراند ماستر.",
    bodyweight: "وزن الجسم", liftUnit: "الوحدة", exercise: "التمرين",
    weightLabel: "الوزن", repsLabel: "التكرارات",
    addLift: "أضف / حدّث الرفعة", rankErr: "أدخل وزن الجسم والوزن والتكرارات أولاً.",
    myLifts: "رفعاتي", e1rmLabel: "أقصى تقديري", removeLift: "إزالة",
    overallRank: "التصنيف العام", nextRank: "التصنيف التالي", toGo: "متبقٍ", maxRank: "قمة السلم 👑",
    percentile: "أقوى من ~{p}% من الرياضيين (تقديري)",
    liftsCounted: "{n} رفعات محسوبة",
    leaderboard: "لوحة الصدارة",
    lbSub: "موقعك بين رياضيي FitJo.",
    publicToggle: "أظهرني على لوحة الصدارة",
    publicDesc: "سيظهر اسمك وتصنيفك ونقاطك للجميع. يمكنك الإيقاف متى شئت.",
    youTag: "أنت", hiddenNote: "أنت مخفي — فعّل الخيار لتظهر على اللوحة.",
    scoreLabel: "نقاط",
    rankNote: "التصنيفات تعتمد معايير مبسّطة لنسبة الرفعة القصوى إلى وزن الجسم في هذا النموذج.",
    noLifts: "لا رفعات بعد. أضف أول رفعة بالأسفل.",
    tier_iron: "حديدي", tier_bronze: "برونزي", tier_silver: "فضي", tier_gold: "ذهبي",
    tier_platinum: "بلاتيني", tier_diamond: "ماسي", tier_master: "ماستر", tier_grandmaster: "غراند ماستر",
    ex_bench: "بنش برس", ex_squat: "سكوات", ex_deadlift: "رفعة ميتة", ex_ohp: "ضغط أكتاف",
    ex_row: "تجديف بار", ex_curl: "مرجحة بار", ex_latpull: "سحب أمامي", ex_legpress: "دفع أرجل",
    ex_hipthrust: "رفع الورك", ex_dbbench: "ضغط دمبل (لكل يد)",
  },
};
Object.assign(I18N.en, RANK_I18N.en);
Object.assign(I18N.ar, RANK_I18N.ar);

/* tiers, weakest -> strongest */
const RANK_TIERS = [
  { key: "iron",        color: "#8d96a5" },
  { key: "bronze",      color: "#cd7f32" },
  { key: "silver",      color: "#9fb3c8" },
  { key: "gold",        color: "#f59e0b" },
  { key: "platinum",    color: "#2dd4bf" },
  { key: "diamond",     color: "#60a5fa" },
  { key: "master",      color: "#a78bfa" },
  { key: "grandmaster", color: "#ef4444" },
];
const tierName = (i) => t("tier_" + RANK_TIERS[i].key);
const divRoman = (d) => ({ 1: "I", 2: "II", 3: "III" })[d];
const rkLb = (kg) => Math.round(kg / KG_PER_LB * 10) / 10;

/* exercise catalog: est-1RM-to-bodyweight thresholds to ENTER tiers 1..7
   (7 boundaries -> 8 tiers). Female standards scale by 0.72. */
const RANK_EXERCISES = {
  bench:     { emoji: "🏋️", bounds: [0.50, 0.80, 1.10, 1.40, 1.70, 2.00, 2.30] },
  squat:     { emoji: "🦵", bounds: [0.75, 1.10, 1.50, 1.90, 2.30, 2.70, 3.10] },
  deadlift:  { emoji: "⚡", bounds: [1.00, 1.40, 1.80, 2.20, 2.60, 3.00, 3.40] },
  ohp:       { emoji: "🙆", bounds: [0.35, 0.55, 0.75, 0.95, 1.15, 1.35, 1.55] },
  row:       { emoji: "🚣", bounds: [0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00] },
  curl:      { emoji: "💪", bounds: [0.20, 0.35, 0.50, 0.65, 0.80, 0.95, 1.10] },
  latpull:   { emoji: "⬇️", bounds: [0.50, 0.70, 0.90, 1.10, 1.30, 1.50, 1.70] },
  legpress:  { emoji: "🦿", bounds: [1.00, 1.80, 2.60, 3.40, 4.20, 5.00, 5.80] },
  hipthrust: { emoji: "🍑", bounds: [0.80, 1.20, 1.60, 2.00, 2.40, 2.80, 3.20] },
  dbbench:   { emoji: "🔩", bounds: [0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80] },
};
const exName = (k) => t("ex_" + k);

/* Epley estimated 1RM from a working set */
function e1rm(kg, reps) { return Math.round(kg * (1 + Math.min(reps, 15) / 30) * 10) / 10; }

/* ratio -> continuous score 0..8 (tier + progress inside tier) */
function rankScore(exKey, ratio, gender) {
  const f = gender === "f" ? 0.72 : 1;
  const bounds = RANK_EXERCISES[exKey].bounds.map(b => b * f);
  let tier = 0;
  while (tier < bounds.length && ratio >= bounds[tier]) tier++;
  const lo = tier === 0 ? 0 : bounds[tier - 1];
  const hi = tier < bounds.length ? bounds[tier] : null;
  const progress = hi == null ? 1 : Math.max(0, Math.min(1, (ratio - lo) / (hi - lo)));
  return { tier, progress, score: Math.min(8, tier + progress) };
}
function tierOfScore(score) {
  const tier = Math.min(7, Math.floor(score));
  const frac = score - tier;
  const div = score >= 8 ? 1 : frac < 1 / 3 ? 3 : frac < 2 / 3 ? 2 : 1;
  return { tier, div, frac };
}

function overallScore(log, bw, gender) {
  const keys = Object.keys(log).filter(k => RANK_EXERCISES[k]);
  if (!keys.length || !bw) return null;
  const scores = keys.map(k => rankScore(k, log[k].e1rm / bw, gender).score);
  return { score: scores.reduce((a, b) => a + b, 0) / scores.length, count: keys.length };
}

/* ---------- demo leaderboard lifters ---------- */
const LB_DEMO = [
  { name: "Zaid Al-Masri", score: 7.42 }, { name: "Layla H.", score: 6.85 },
  { name: "Omar Q.", score: 6.31 }, { name: "Tariq B.", score: 5.72 },
  { name: "Noor S.", score: 5.28 }, { name: "Hashem D.", score: 4.66 },
  { name: "Rania K.", score: 4.12 }, { name: "Faris A.", score: 3.55 },
  { name: "Dana M.", score: 2.94 }, { name: "Yazan T.", score: 2.31 },
];
function leaderboardRows(me) {
  const locals = getUsers()
    .filter(x => x.rankPublic && x.liftLog && x.rankBw)
    .map(x => {
      const o = overallScore(x.liftLog, x.rankBw, x.gender);
      return o ? { name: x.name, score: o.score, me: me && x.id === me.id } : null;
    }).filter(Boolean);
  return LB_DEMO.concat(locals).sort((a, b) => b.score - a.score).slice(0, 15);
}

/* ---------- section ---------- */
function secRank(u) {
  const log = u.liftLog || {};
  const bw = u.rankBw || null;
  const keys = Object.keys(log).filter(k => RANK_EXERCISES[k]);
  const overall = overallScore(log, bw, u.gender);

  /* overall card */
  let card = "";
  if (overall) {
    const { tier, div, frac } = tierOfScore(overall.score);
    const tcol = RANK_TIERS[tier].color;
    const pct = Math.min(99.9, Math.round(Math.pow(overall.score / 8.2, 1.6) * 99 * 10) / 10);
    const next = tier >= 7
      ? `<div class="note">${t("maxRank")}</div>`
      : `<div class="mb-top"><span>${t("nextRank")}: ${tierName(tier + 1)}</span><span>${Math.round((1 - frac) * 100)}% ${t("toGo")}</span></div>
         <div class="mb-track"><span style="width:${Math.round(frac * 100)}%;background:${tcol}"></span></div>`;
    card = `
    <div class="rank-card" style="--tier:${tcol}">
      <div class="rank-medal">🏆</div>
      <div class="rank-tier">${tierName(tier)} ${divRoman(div)}</div>
      <div class="rank-total"><b>${Math.round(overall.score * 100)}</b> ${t("scoreLabel")} <small>· ${t("liftsCounted").replace("{n}", overall.count)}</small></div>
      <div class="rank-next">${next}</div>
      <div class="rank-pct">${t("percentile").replace("{p}", pct)}</div>
    </div>`;
  }

  /* my lifts */
  const liftRows = keys.length ? keys.map(k => {
    const L = log[k], r = rankScore(k, L.e1rm / bw, u.gender);
    return `<div class="portal-row">
      <div class="pr-l"><span class="fr-emo">${RANK_EXERCISES[k].emoji}</span>
        <div><div class="pr-name">${exName(k)} <span class="rl-badge" style="background:${RANK_TIERS[r.tier].color}">${tierName(r.tier)}</span></div>
        <div class="pr-meta">${L.kg} kg × ${L.reps} → ${L.e1rm} kg · ${rkLb(L.e1rm)} lb ${t("e1rmLabel")}</div></div></div>
      <div class="pr-r"><button class="auth-link fr-del" data-dellift="${k}">✕</button></div>
    </div>`;
  }).join("") : `<div class="note">${t("noLifts")}</div>`;

  /* add form */
  const latestW = bw || ((u.weights && u.weights.length) ? u.weights[u.weights.length - 1].kg : "");
  const form = `
  <div class="section">
    <h4>➕ ${t("addLift")}</h4>
    <div class="form-two">
      <div class="form-row"><label>${t("exercise")}</label>
        <select id="rkEx">${Object.keys(RANK_EXERCISES).map(k => `<option value="${k}">${RANK_EXERCISES[k].emoji} ${exName(k)}</option>`).join("")}</select></div>
      <div class="form-row"><label>${t("bodyweight")} (kg)</label><input id="rkBw" type="number" step="0.5" min="30" max="300" value="${latestW}" placeholder="80"></div>
    </div>
    <div class="form-two">
      <div class="form-row"><label>${t("weightLabel")}</label><input id="rkW" type="number" step="0.5" min="0" placeholder="80"></div>
      <div class="form-row"><label>${t("repsLabel")}</label><input id="rkReps" type="number" step="1" min="1" max="20" value="5"></div>
    </div>
    <div class="form-row"><label>${t("liftUnit")}</label>
      <select id="rkUnit"><option value="kg"${state.unit !== "lbs" ? " selected" : ""}>kg</option><option value="lb"${state.unit === "lbs" ? " selected" : ""}>lb</option></select></div>
    <button class="btn block" id="rankSave">${t("addLift")}</button>
  </div>`;

  /* leaderboard */
  const rows = leaderboardRows(u);
  const board = `
  <div class="section">
    <h4>🥇 ${t("leaderboard")}</h4>
    <div class="h-sub">${t("lbSub")}</div>
    <div class="set-row">
      <div class="txt"><div class="t">${t("publicToggle")}</div><div class="d">${t("publicDesc")}</div></div>
      <label class="switch"><input type="checkbox" data-rank-public="1" ${u.rankPublic ? "checked" : ""}><span class="slider"></span></label>
    </div>
    ${!u.rankPublic && overall ? `<div class="note">${t("hiddenNote")}</div>` : ""}
    <div class="lb-list">
      ${rows.map((r, i) => {
        const td = tierOfScore(r.score);
        return `<div class="lb-row ${r.me ? "me" : ""}">
          <span class="lb-place">${i + 1}</span>
          <span class="portal-av lb-av">${initials(r.name)}</span>
          <span class="lb-name">${esc(r.name)}${r.me ? ` <span class="pill on">${t("youTag")}</span>` : ""}</span>
          <span class="rl-badge" style="background:${RANK_TIERS[td.tier].color}">${tierName(td.tier)} ${divRoman(td.div)}</span>
          <span class="lb-score">${Math.round(r.score * 100)}</span>
        </div>`;
      }).join("")}
    </div>
  </div>`;

  return `
  <h3>🏆 ${t("rankTitle")}</h3>
  <div class="h-sub">${t("rankSub")}</div>
  ${card}
  <div class="section"><h4>📋 ${t("myLifts")}</h4>${liftRows}</div>
  ${form}
  ${board}
  <div class="note">${t("rankNote")}</div>`;
}

/* ---------- actions ---------- */
function rankSave() {
  const toKg = (v) => (val("rkUnit") === "lb" ? v * KG_PER_LB : v);
  const bw = parseFloat(val("rkBw"));
  const kg = Math.round(toKg(parseFloat(val("rkW")) || 0) * 10) / 10;
  const reps = Math.max(1, Math.min(20, parseInt(val("rkReps"), 10) || 0));
  const ex = val("rkEx");
  if (!(bw >= 30 && bw <= 300) || kg <= 0 || !RANK_EXERCISES[ex]) return toast(t("rankErr"));
  const u = currentUser();
  const log = { ...(u.liftLog || {}) };
  log[ex] = { kg, reps, e1rm: e1rm(kg, reps), date: Date.now() };
  updateUser({ liftLog: log, rankBw: Math.round(bw * 10) / 10 });
  reRenderSection();
  toast("🏆");
}
function handleRankClick(e) {
  if (e.target.closest("#rankSave")) { rankSave(); return true; }
  const del = e.target.closest("[data-dellift]");
  if (del) {
    const log = { ...(currentUser().liftLog || {}) };
    delete log[del.dataset.dellift];
    updateUser({ liftLog: log });
    reRenderSection();
    return true;
  }
  return false;
}
function handleRankChange(e) {
  if (e.target.dataset.rankPublic) {
    updateUser({ rankPublic: e.target.checked });
    reRenderSection();
    toast(t("saved"));
    return true;
  }
  return false;
}
