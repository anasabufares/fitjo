/* =============================================================
   FitJo — supplements shop (account section, 16+ only)
   Relies on globals: state, esc, tL, fmtPrice, currentUser, toast.
   ============================================================= */

const SUPPS_SHOP = [
  { id: "s1", icon: "🥛", name: { en: "Whey protein (2 kg)", ar: "واي بروتين (2كغ)" }, priceJOD: 35 },
  { id: "s2", icon: "💊", name: { en: "Creatine (300 g)", ar: "كرياتين (300غ)" }, priceJOD: 18 },
  { id: "s3", icon: "🐟", name: { en: "Omega-3 fish oil", ar: "أوميغا-3 زيت سمك" }, priceJOD: 12 },
  { id: "s4", icon: "☀️", name: { en: "Vitamin D3", ar: "فيتامين د3" }, priceJOD: 8 },
  { id: "s5", icon: "⚡", name: { en: "Pre-workout", ar: "قبل التمرين" }, priceJOD: 22 },
  { id: "s6", icon: "🌿", name: { en: "BCAA (400 g)", ar: "بي سي إيه إيه (400غ)" }, priceJOD: 20 },
  { id: "s7", icon: "💪", name: { en: "Mass gainer (3 kg)", ar: "مكمّل زيادة الوزن (3كغ)" }, priceJOD: 30 },
  { id: "s8", icon: "🧃", name: { en: "Electrolytes", ar: "إلكتروليتات" }, priceJOD: 10 },
  { id: "s9", icon: "🌙", name: { en: "ZMA (sleep & recovery)", ar: "ZMA للنوم والتعافي" }, priceJOD: 14 },
  { id: "s10", icon: "🔥", name: { en: "Fat burner", ar: "حارق دهون" }, priceJOD: 24 },
];

function secSupplements(u) {
  if ((u.age || 0) < 16) {
    return `<h3>💊 ${tL("Supplements shop", "متجر المكملات")}</h3>
      <div class="note">⚠️ ${tL("This shop is only available to members aged 16 and older.", "هذا المتجر متاح فقط للأعضاء بعمر 16 سنة فأكثر.")}</div>`;
  }
  return `<h3>💊 ${tL("Supplements shop", "متجر المكملات")}</h3>
    <div class="h-sub">${tL("Members 16+ · reserve now, pay at the gym on pickup (demo).", "الأعضاء 16+ · احجز الآن وادفع عند الاستلام (تجريبي).")}</div>
    <div class="rewards-grid">
      ${SUPPS_SHOP.map(s => `<div class="reward">
        <div class="rw-ic">${s.icon}</div>
        <div class="rw-name">${esc(s.name[state.lang])}</div>
        <button class="btn" data-buysupp="${s.id}">${fmtPrice(s.priceJOD)}</button>
      </div>`).join("")}
    </div>
    <div class="note">${tL("Supplement sales follow local age rules. Talk to a doctor before starting any supplement.", "مبيعات المكملات تخضع لقوانين العمر المحلية. استشر طبيباً قبل البدء.")}</div>`;
}

function buySupp(id) {
  const u = currentUser();
  if (!u || (u.age || 0) < 16) { toast(tL("16+ only", "16+ فقط")); return; }
  const s = SUPPS_SHOP.find(x => x.id === id);
  if (!s) return;
  toast(tL(`Reserved: ${s.name.en} — pay at the gym (demo)`, `تم الحجز: ${s.name.ar} — ادفع في النادي (تجريبي)`));
}

function handleSupplementsClick(e) {
  const b = e.target.closest("[data-buysupp]");
  if (b) { buySupp(b.dataset.buysupp); return true; }
  return false;
}
