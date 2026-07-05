/* =============================================================
   FitJo — membership, points & rewards (account section)
   - Subscribe to a gym (which gym + how long)
   - Earn points by checking in (location or photo), lose points
     for missed days; spend points on rewards / shop discounts.
   Relies on globals: state, t, esc, val, tL, currentUser, updateUser,
   toast, reRenderSection, openAccountSection, registerMember, GYMS.
   ============================================================= */

const CHECKIN_POINTS = 15;   // earned per gym visit
const MISS_PENALTY = 5;      // lost per missed day while subscribed
let pendingSubGym = null;    // gym preselected from a gym's "Subscribe" button

const REWARDS = [
  { id: "r1", icon: "🥤", name: { en: "Free protein shake", ar: "شيك بروتين مجاني" }, cost: 80 },
  { id: "r2", icon: "🏋️", name: { en: "Free personal-training session", ar: "جلسة تدريب شخصي مجانية" }, cost: 200 },
  { id: "r3", icon: "👟", name: { en: "20% off sportswear shop", ar: "خصم 20% على متجر الرياضة" }, cost: 120 },
  { id: "r4", icon: "🎟️", name: { en: "Free day pass for a friend", ar: "دخول يوم مجاني لصديق" }, cost: 60 },
  { id: "r5", icon: "🧴", name: { en: "Free gym towel", ar: "منشفة نادي مجانية" }, cost: 40 },
  { id: "r6", icon: "💊", name: { en: "15% off supplements", ar: "خصم 15% على المكملات" }, cost: 100 },
];

/* ---------- helpers ---------- */
function memGym(u) { const s = u && u.subscription; return (s && typeof GYMS !== "undefined") ? GYMS.find(g => g.id === s.gymId) : null; }
function subActive(u) { return !!(u && u.subscription && u.subscription.expiresAt > Date.now()); }
function daysLeft(s) { return s ? Math.max(0, Math.ceil((s.expiresAt - Date.now()) / 86400000)) : 0; }
function checkedInToday(u) { const d = new Date().toDateString(); return (u.checkins || []).some(c => new Date(c.ts).toDateString() === d); }
function haversineKm(a1, o1, a2, o2) {
  const R = 6371, r = x => x * Math.PI / 180;
  const dA = r(a2 - a1), dO = r(o2 - o1);
  const h = Math.sin(dA / 2) ** 2 + Math.cos(r(a1)) * Math.cos(r(a2)) * Math.sin(dO / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function reconcilePoints(u) {
  const today = new Date().toDateString();
  if (u.pointsSyncedDate === today) return;
  const last = (u.checkins || []).slice(-1)[0];
  let pts = u.points || 0;
  if (u.subscription && last) {
    const l = new Date(last.ts); l.setHours(0, 0, 0, 0);
    const n = new Date(); n.setHours(0, 0, 0, 0);
    const missed = Math.round((n - l) / 86400000) - 1;
    if (missed > 0) pts = Math.max(0, pts - missed * MISS_PENALTY);
  }
  updateUser({ points: pts, pointsSyncedDate: today });
}

/* ---------- section ---------- */
function secMembership(u) {
  reconcilePoints(u);
  u = currentUser();
  const g = memGym(u), active = subActive(u), pts = u.points || 0;
  const didToday = checkedInToday(u);
  const redeemed = (u.rewards || []).slice().reverse();

  const subCard = active && g ? `
    <div class="mem-card">
      <div class="mem-gym"><span class="mem-badge">${g.gradient ? `<span class="gym-swatch ${g.gradient}"></span>` : ""}</span>
        <div><div class="mem-gymname">${esc(g.name[state.lang])}</div><div class="h-sub" style="margin:0">📍 ${esc(g.area[state.lang])}</div></div></div>
      <div class="stat-row">
        <div class="stat"><div class="n">${u.subscription.months}<small>${tL(" mo", " شهر")}</small></div><div class="l">${tL("Plan", "الباقة")}</div></div>
        <div class="stat"><div class="n">${daysLeft(u.subscription)}</div><div class="l">${tL("Days left", "يوم متبقٍ")}</div></div>
        <div class="stat"><div class="n">${new Date(u.subscription.expiresAt).toLocaleDateString(state.lang === "ar" ? "ar-JO" : "en-US", { month: "short", day: "numeric" })}</div><div class="l">${tL("Expires", "ينتهي")}</div></div>
      </div>
      <button class="btn ghost block" id="cancelSub">${tL("Cancel membership", "إلغاء العضوية")}</button>
    </div>` : `
    <div class="mem-card">
      <div class="h-sub" style="margin-top:0">${tL("Subscribe to a gym to start earning points.", "اشترك في نادٍ لتبدأ بجمع النقاط.")}</div>
      <div class="form-row"><label>${tL("Gym", "النادي")}</label><select id="subGym">${(typeof GYMS !== "undefined" ? GYMS : []).map(x => `<option value="${x.id}" ${x.id === pendingSubGym ? "selected" : ""}>${esc(x.name[state.lang])} — ${esc(x.area[state.lang])}</option>`).join("")}</select></div>
      <div class="form-row"><label>${tL("Duration", "المدة")}</label><select id="subMonths">
        <option value="1">${tL("1 month", "شهر واحد")}</option><option value="3">${tL("3 months", "3 أشهر")}</option><option value="12">${tL("12 months", "12 شهر")}</option></select></div>
      <button class="btn block" id="startSub">${tL("Start membership", "ابدأ العضوية")}</button>
    </div>`;

  const pointsCard = `
    <div class="mem-card">
      <div class="pts-head"><div><div class="pts-num">${pts}</div><div class="l">${tL("points", "نقطة")}</div></div>
        <div class="pts-check">${didToday ? `<span class="pill on">${tL("Checked in ✓", "تم الحضور ✓")}</span>` : ""}</div></div>
      <div class="mem-actions">
        <input type="file" accept="image/*" id="checkinPhoto" hidden>
        <button class="btn block" id="checkinLoc" ${!active || didToday ? "disabled" : ""}>📍 ${tL("Check in (location)", "تسجيل حضور (الموقع)")}</button>
        <button class="btn ghost block" id="checkinPhotoBtn" ${!active || didToday ? "disabled" : ""}>📷 ${tL("Check in with a photo", "تسجيل حضور بصورة")}</button>
      </div>
      <div class="note">${tL(`Earn +${CHECKIN_POINTS} per visit. Miss a day and you lose ${MISS_PENALTY}.`, `اكسب +${CHECKIN_POINTS} لكل زيارة. يوم غياب يخصم ${MISS_PENALTY}.`)}</div>
    </div>`;

  const rewardsCard = `
    <div class="ed-section" style="margin-top:6px">${tL("Rewards & shop", "المكافآت والمتجر")}</div>
    <div class="rewards-grid">
      ${REWARDS.map(r => `<div class="reward ${pts >= r.cost ? "" : "locked"}">
        <div class="rw-ic">${r.icon}</div>
        <div class="rw-name">${esc(r.name[state.lang])}</div>
        <button class="btn ${pts >= r.cost ? "" : "ghost"}" data-redeem="${r.id}" ${pts >= r.cost ? "" : "disabled"}>${r.cost} ${tL("pts", "نقطة")}</button>
      </div>`).join("")}
    </div>
    ${redeemed.length ? `<div class="ed-section">${tL("Your redeemed rewards", "مكافآتك المستبدلة")}</div>
      ${redeemed.map(x => `<div class="kv"><span>${esc(x.name)} · <code>${esc(x.code)}</code></span><span class="tag">${new Date(x.ts).toLocaleDateString(state.lang === "ar" ? "ar-JO" : "en-US", { month: "short", day: "numeric" })}</span></div>`).join("")}` : ""}`;

  return `<h3>🎟️ ${tL("Membership & points", "العضوية والنقاط")}</h3>
    <div class="h-sub">${tL("Your gym, your points, your rewards.", "ناديك، نقاطك، مكافآتك.")}</div>
    ${subCard}${pointsCard}${rewardsCard}`;
}

/* ---------- actions ---------- */
function awardCheckin(method, gymId) {
  const u = currentUser();
  if (checkedInToday(u)) { toast(tL("Already checked in today", "سجّلت حضورك اليوم")); return; }
  const checkins = [...(u.checkins || []), { ts: Date.now(), gymId, method }];
  updateUser({ checkins, points: (u.points || 0) + CHECKIN_POINTS });
  if (typeof registerMember === "function") registerMember(currentUser());
  reRenderSection();
  toast(tL(`+${CHECKIN_POINTS} points! 🎉`, `+${CHECKIN_POINTS} نقطة! 🎉`));
}
function checkInLocation() {
  const u = currentUser(), g = memGym(u);
  if (!subActive(u) || !g) { toast(tL("Subscribe to a gym first", "اشترك في نادٍ أولاً")); return; }
  if (!g.coords) { toast(tL("No location set for this gym — use photo check-in", "لا يوجد موقع لهذا النادي — استخدم الصورة")); return; }
  if (!navigator.geolocation) { toast(tL("Location not supported", "الموقع غير مدعوم")); return; }
  toast(tL("Getting your location…", "جارٍ تحديد موقعك…"));
  navigator.geolocation.getCurrentPosition(pos => {
    const d = haversineKm(pos.coords.latitude, pos.coords.longitude, g.coords.lat, g.coords.lng);
    if (d <= 0.3) awardCheckin("location", g.id);
    else toast(tL(`You're ~${d.toFixed(1)} km away — get closer to check in.`, `أنت على بعد ~${d.toFixed(1)} كم — اقترب لتسجيل الحضور.`));
  }, () => toast(tL("Couldn't get location (permission denied).", "تعذّر تحديد الموقع (رُفض الإذن).")), { enableHighAccuracy: true, timeout: 10000 });
}
function startSubscription() {
  const gymId = val("subGym"), months = parseInt(val("subMonths"), 10) || 1;
  const g = (typeof GYMS !== "undefined" ? GYMS : []).find(x => x.id === gymId);
  if (!g) { toast(tL("Pick a gym", "اختر نادياً")); return; }
  const startedAt = Date.now();
  updateUser({ subscription: { gymId, months, startedAt, expiresAt: startedAt + months * 30 * 86400000 } });
  pendingSubGym = null;
  if (typeof registerMember === "function") registerMember(currentUser());
  reRenderSection();
  toast(tL(`Subscribed to ${g.name[state.lang]} 🎉`, `تم الاشتراك في ${g.name[state.lang]} 🎉`));
}
function cancelSubscription() {
  updateUser({ subscription: null });
  if (typeof registerMember === "function") registerMember(currentUser());
  reRenderSection(); toast(tL("Membership cancelled", "تم إلغاء العضوية"));
}
function redeemReward(id) {
  const u = currentUser(), r = REWARDS.find(x => x.id === id);
  if (!r) return;
  if ((u.points || 0) < r.cost) { toast(tL("Not enough points", "نقاط غير كافية")); return; }
  const code = "FJ-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const rewards = [...(u.rewards || []), { id: r.id, name: r.name[state.lang], cost: r.cost, code, ts: Date.now() }];
  updateUser({ points: (u.points || 0) - r.cost, rewards });
  if (typeof registerMember === "function") registerMember(currentUser());
  reRenderSection();
  toast(tL(`Redeemed! Code: ${code}`, `تم الاستبدال! الرمز: ${code}`));
}
/* opens the membership section from a gym's Subscribe button, preselecting that gym */
function goSubscribe(gymId) { pendingSubGym = gymId; if (typeof openAccountSection === "function") openAccountSection("membership"); }

/* ---------- hooks called by auth.js ---------- */
function handleMembershipClick(e) {
  const hit = (s) => e.target.closest(s);
  if (hit("#startSub")) { startSubscription(); return true; }
  if (hit("#cancelSub")) { cancelSubscription(); return true; }
  if (hit("#checkinLoc")) { checkInLocation(); return true; }
  if (hit("#checkinPhotoBtn")) { const el = document.getElementById("checkinPhoto"); if (el) el.click(); return true; }
  const rd = hit("[data-redeem]"); if (rd) { redeemReward(rd.dataset.redeem); return true; }
  return false;
}
async function photoCheckin(file, g) {
  toast(tL("Checking your photo…", "جارٍ فحص صورتك…"));
  try {
    const dataUrl = await fileToDataURL(file);   // fileToDataURL is defined in nutrition.js
    const base64 = String(dataUrl).split(",")[1];
    const r = await fetch("/.netlify/functions/verify-gym", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_base64: base64, mime: file.type }),
    });
    if (r.ok) {
      const j = await r.json();
      if (j && typeof j.inGym === "boolean") {
        if (j.inGym) awardCheckin("photo", g.id);
        else toast(tL("That photo doesn't look like a gym — check in from inside.", "الصورة لا تبدو داخل نادٍ — سجّل من الداخل."), true);
        return;
      }
    }
  } catch (e) { /* fall through to demo */ }
  awardCheckin("photo", g.id);   // demo fallback when AI isn't configured
}
function handleMembershipChange(e) {
  if (e.target.id === "checkinPhoto") {
    const u = currentUser(), g = memGym(u);
    if (!subActive(u) || !g) { toast(tL("Subscribe to a gym first", "اشترك في نادٍ أولاً")); return true; }
    if (e.target.files && e.target.files[0]) photoCheckin(e.target.files[0], g);
    return true;
  }
  return false;
}
