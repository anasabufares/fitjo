/* =============================================================
   FitJo — membership, points & rewards (account section)
   - Subscribe to a gym (which gym + how long)
   - Earn points by checking in (location or photo), lose points
     for missed days; spend points on rewards / shop discounts.
   Relies on globals: state, t, esc, val, tL, currentUser, updateUser,
   toast, reRenderSection, openAccountSection, registerMember, GYMS.
   ============================================================= */

const CHECKIN_POINTS = 15;   // base points per gym visit
const STREAK_BONUS = 5;      // extra points per consecutive day, capped below
const STREAK_CAP = 7;        // max streak days that add bonus (15 + 7*5 = 50/day)
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

/* current streak: consecutive days with a check-in, still alive if the
   last one was yesterday (today's tap extends it) */
function streakOf(u) {
  const days = new Set((u.checkins || []).map(c => new Date(c.ts).toDateString()));
  let s = 0;
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) { s++; d.setDate(d.getDate() - 1); }
  return s;
}
function checkinValue(streakAfter) { return CHECKIN_POINTS + STREAK_BONUS * Math.min(Math.max(streakAfter - 1, 0), STREAK_CAP); }
function nextCheckinValue(u) { return checkedInToday(u) ? 0 : checkinValue(streakOf(u) + 1); }

/* ---------- weekly leaderboard (resets every Monday) ---------- */
function weekStart() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); }
function weekPointsOf(u) { const ws = weekStart(); return (u.checkins || []).filter(c => c.ts >= ws).reduce((a, c) => a + (c.pts || CHECKIN_POINTS), 0); }
const PTS_LB_NAMES = ["Zaid Al-Masri", "Layla H.", "Omar Q.", "Noor S.", "Tariq B.", "Rania K.", "Hashem D.", "Dana M.", "Faris A.", "Yazan T."];
function demoWeekly(name) {   // deterministic per name+week so the board changes weekly but not on every render
  let h = Math.floor(weekStart() / 86400000);
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 100000;
  return 40 + (h % 281);
}
function weeklyBoard(me) {
  const rows = PTS_LB_NAMES.map(n => ({ name: n, pts: demoWeekly(n) }));
  getUsers().forEach(x => {
    const wp = weekPointsOf(x);
    if (wp > 0 || (me && x.id === me.id)) rows.push({ name: x.name, pts: wp, me: me && x.id === me.id });
  });
  rows.sort((a, b) => b.pts - a.pts);
  const top = rows.slice(0, 10);
  const mine = rows.findIndex(r => r.me);
  if (mine >= 10) top.push({ ...rows[mine], place: mine + 1 });
  return top.map((r, i) => ({ ...r, place: r.place || i + 1 }));
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

  const streak = streakOf(u);
  const nextPts = nextCheckinValue(u);
  const pointsCard = `
    <div class="mem-card">
      <div class="pts-head">
        <div><div class="pts-num">${pts}</div><div class="l">${tL("points", "نقطة")}</div></div>
        <div class="streak-pill ${streak ? "hot" : ""}">🔥 ${streak} ${tL("day streak", "يوم متتالي")}</div>
      </div>
      ${didToday
        ? `<button class="btn block checkin-big" disabled>✓ ${tL("Checked in — see you tomorrow", "تم الحضور — نراك غداً")}</button>`
        : `<button class="btn block checkin-big" id="checkinBtn" ${active ? "" : "disabled"}>✅ ${tL("Check in", "سجّل حضورك")} · +${nextPts} ${tL("pts", "نقطة")}</button>`}
      ${active ? "" : `<div class="note">${tL("Start a membership above to check in.", "ابدأ عضوية بالأعلى لتسجيل الحضور.")}</div>`}
      <div class="note">${tL(`One tap a day. Every streak day is worth +${STREAK_BONUS} more (up to ${checkinValue(STREAK_CAP + 1)}/day). Miss a day: streak resets and −${MISS_PENALTY} pts.`, `ضغطة واحدة يومياً. كل يوم متتالٍ يزيد +${STREAK_BONUS} (حتى ${checkinValue(STREAK_CAP + 1)}/يوم). يوم غياب: تصفير السلسلة و−${MISS_PENALTY} نقطة.`)}</div>
    </div>`;

  const board = weeklyBoard(u);
  const leaderboardCard = `
    <div class="ed-section" style="margin-top:6px">🏁 ${tL("This week's leaderboard", "لوحة صدارة الأسبوع")}</div>
    <div class="mem-card">
      <div class="lb-list" style="margin-top:0">
        ${board.map(r => `<div class="lb-row ${r.me ? "me" : ""}">
          <span class="lb-place">${r.place}</span>
          <span class="portal-av lb-av">${initials(r.name)}</span>
          <span class="lb-name">${esc(r.name)}${r.me ? ` <span class="pill on">${tL("You", "أنت")}</span>` : ""}</span>
          <span class="lb-score">${r.pts} ${tL("pts", "ن")}</span>
        </div>`).join("")}
      </div>
      <div class="note">${tL("Resets every Monday. Show up more than they do.", "تُصفَّر كل اثنين. احضر أكثر منهم.")}</div>
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
    ${subCard}${pointsCard}${leaderboardCard}${rewardsCard}`;
}

/* ---------- actions ---------- */
function checkIn() {
  const u = currentUser(), g = memGym(u);
  if (!subActive(u) || !g) { toast(tL("Subscribe to a gym first", "اشترك في نادٍ أولاً")); return; }
  if (checkedInToday(u)) { toast(tL("Already checked in today", "سجّلت حضورك اليوم")); return; }
  const streakAfter = streakOf(u) + 1;
  const earned = checkinValue(streakAfter);
  const checkins = [...(u.checkins || []), { ts: Date.now(), gymId: g.id, pts: earned }];
  updateUser({ checkins, points: (u.points || 0) + earned });
  if (typeof registerMember === "function") registerMember(currentUser());
  reRenderSection();
  const streakMsg = streakAfter > 1 ? tL(` · 🔥 ${streakAfter}-day streak!`, ` · 🔥 ${streakAfter} أيام متتالية!`) : "";
  toast(tL(`+${earned} points!${streakMsg} 🎉`, `+${earned} نقطة!${streakMsg} 🎉`));
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
  if (hit("#checkinBtn")) { checkIn(); return true; }
  const rd = hit("[data-redeem]"); if (rd) { redeemReward(rd.dataset.redeem); return true; }
  return false;
}
function handleMembershipChange() { return false; }
