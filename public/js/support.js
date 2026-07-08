/* =============================================================
   FitJo — Support (lives inside Security)
   Contact us (phone / email / WhatsApp), FAQ, privacy policy and
   code of conduct. Contact details are demo placeholders — change
   FITJO_CONTACT below to the real ones.
   ============================================================= */

const FITJO_CONTACT = {
  phone: "+962 79 000 0000",
  phoneHref: "tel:+962790000000",
  email: "support@fitjo.app",
  emailHref: "mailto:support@fitjo.app",
  whatsapp: "+962 79 000 0000",
  whatsappHref: "https://wa.me/962790000000",
};

function secSupport() {
  return `
  ${backLink("security", t("security"))}
  <h3>🆘 ${tL("Support", "الدعم")}</h3>
  <div class="h-sub">${tL("We're here to help.", "نحن هنا للمساعدة.")}</div>
  <div class="menu-list">
    ${menuRow("contact", "📞", tL("Contact us", "اتصل بنا"), tL("Phone, email & WhatsApp", "هاتف وبريد وواتساب"))}
    ${menuRow("faq", "❓", tL("FAQ", "الأسئلة الشائعة"), tL("Quick answers to common questions", "إجابات سريعة للأسئلة الشائعة"))}
    ${menuRow("policy", "🛡️", tL("Privacy policy", "سياسة الخصوصية"), tL("How we handle your data", "كيف نتعامل مع بياناتك"))}
    ${menuRow("conduct", "🤝", tL("Code of conduct", "قواعد السلوك"), tL("Community rules in gyms & on the app", "قواعد المجتمع في الأندية والتطبيق"))}
  </div>`;
}

function secContact() {
  const C = FITJO_CONTACT;
  const row = (href, icon, label, value, ext) => `
    <a class="menu-row" href="${href}"${ext ? ` target="_blank" rel="noopener"` : ""}>
      <span class="mr-ico">${icon}</span>
      <span class="mr-txt"><span class="mr-t">${label}</span><span class="mr-d" dir="ltr">${value}</span></span>
      <span class="mr-chev">›</span>
    </a>`;
  return `
  ${backLink("support", tL("Support", "الدعم"))}
  <h3>📞 ${tL("Contact us", "اتصل بنا")}</h3>
  <div class="h-sub">${tL("Every day 9:00–21:00 (Amman time).", "يومياً 9:00–21:00 (بتوقيت عمّان).")}</div>
  <div class="menu-list">
    ${row(C.phoneHref, "📱", tL("Phone", "الهاتف"), C.phone)}
    ${row(C.emailHref, "✉️", tL("Email", "البريد الإلكتروني"), C.email)}
    ${row(C.whatsappHref, "💬", "WhatsApp", C.whatsapp, true)}
  </div>
  <div class="note">${tL("Demo contact details — they will be replaced by the real support numbers at launch.", "بيانات تواصل تجريبية — ستُستبدل بأرقام الدعم الحقيقية عند الإطلاق.")}</div>`;
}

function secFaq() {
  const faqs = [
    [tL("How do I subscribe to a gym?", "كيف أشترك في نادٍ؟"),
     tL("Open the gym's page, pick a plan (monthly, 3-month or yearly) and tap Subscribe. Your membership card appears under Membership.", "افتح صفحة النادي، اختر خطة (شهرية أو ٣ أشهر أو سنوية) واضغط اشترك. تظهر بطاقة عضويتك في قسم العضوية.")],
    [tL("How do points work?", "كيف تعمل النقاط؟"),
     tL("You earn points every day you check in at your gym and lose a few for days you skip. Spend them on rewards and shop discounts in Membership.", "تكسب نقاطاً كل يوم تسجّل فيه حضورك في النادي وتخسر القليل في أيام الغياب. استبدلها بمكافآت وخصومات المتجر في قسم العضوية.")],
    [tL("What is Rank?", "ما هو التصنيف؟"),
     tL("Log the lifts you do (weight × reps) and each exercise gets a tier from Iron to Grandmaster based on your estimated 1RM vs bodyweight. Your overall rank can appear on the leaderboard if you turn that on.", "سجّل رفعاتك (الوزن × التكرارات) وسيحصل كل تمرين على فئة من الحديدي إلى الغراند ماستر حسب أقصى رفعة تقديرية مقابل وزن جسمك. يمكن أن يظهر تصنيفك العام على لوحة الصدارة إذا فعّلت ذلك.")],
    [tL("Is the calorie tracker accurate?", "هل متتبّع السعرات دقيق؟"),
     tL("Food estimates (photo or text) are close but not perfect — you can always adjust the amount, unit and food before adding it to your day.", "تقديرات الطعام (بالصورة أو النص) قريبة لكنها ليست مثالية — يمكنك دائماً تعديل الكمية والوحدة والصنف قبل إضافته ليومك.")],
    [tL("How do I cancel my subscription?", "كيف ألغي اشتراكي؟"),
     tL("Go to Membership and tap Cancel under your active plan. Your access stays until the period you paid for ends.", "اذهب إلى العضوية واضغط إلغاء تحت خطتك الفعالة. يبقى دخولك متاحاً حتى نهاية الفترة المدفوعة.")],
    [tL("Is my data safe?", "هل بياناتي آمنة؟"),
     tL("In this prototype your data lives only on your device (local storage). See the Privacy policy for details.", "في هذا النموذج تبقى بياناتك على جهازك فقط (التخزين المحلي). راجع سياسة الخصوصية للتفاصيل.")],
  ];
  return `
  ${backLink("support", tL("Support", "الدعم"))}
  <h3>❓ ${tL("FAQ", "الأسئلة الشائعة")}</h3>
  <div class="h-sub">${tL("Quick answers to common questions.", "إجابات سريعة للأسئلة الشائعة.")}</div>
  ${faqs.map(([q, a]) => `<details class="faq"><summary>${q}</summary><p>${a}</p></details>`).join("")}`;
}

function secPolicy() {
  return `
  ${backLink("support", tL("Support", "الدعم"))}
  <h3>🛡️ ${tL("Privacy policy", "سياسة الخصوصية")}</h3>
  <div class="h-sub">${tL("The short, honest version.", "النسخة القصيرة والصادقة.")}</div>
  <div class="doc">
    <p><b>${tL("What we store", "ما نخزّنه")}</b> — ${tL("Your profile, plan, weights, lifts, food log and membership. In this prototype everything is stored only on your device; nothing is uploaded to a server.", "ملفك الشخصي وخطتك وأوزانك ورفعاتك وسجل طعامك وعضويتك. في هذا النموذج يُخزَّن كل شيء على جهازك فقط ولا يُرفع أي شيء إلى خادم.")}</p>
    <p><b>${tL("What we share", "ما نشاركه")}</b> — ${tL("Nothing, unless you opt in: the leaderboard toggle makes your name, rank and score visible; privacy toggles control what coaches can see.", "لا شيء، إلا إذا وافقت: خيار لوحة الصدارة يجعل اسمك وتصنيفك ونقاطك مرئية؛ ومفاتيح الخصوصية تتحكم بما يراه المدربون.")}</p>
    <p><b>${tL("Photos", "الصور")}</b> — ${tL("Food, gym check-in and in-body photos are analyzed and then discarded; they are not kept.", "تُحلَّل صور الطعام وتسجيل الحضور وفحص الجسم ثم تُحذف؛ لا يتم الاحتفاظ بها.")}</p>
    <p><b>${tL("Delete everything", "احذف كل شيء")}</b> — ${tL("Account → Danger zone → Delete account removes all of your data instantly.", "الحساب ← منطقة الخطر ← حذف الحساب يزيل كل بياناتك فوراً.")}</p>
  </div>`;
}

function secConduct() {
  return `
  ${backLink("support", tL("Support", "الدعم"))}
  <h3>🤝 ${tL("Code of conduct", "قواعد السلوك")}</h3>
  <div class="h-sub">${tL("Keep FitJo friendly — in the app and in the gym.", "لنُبقِ FitJo ودوداً — في التطبيق وفي النادي.")}</div>
  <div class="doc">
    <p>💪 ${tL("Respect every member, coach and staff member regardless of level, gender or background.", "احترم كل عضو ومدرب وموظف بغضّ النظر عن المستوى أو الجنس أو الخلفية.")}</p>
    <p>🏋️ ${tL("Re-rack your weights, wipe equipment after use and share machines between sets.", "أعد الأوزان لمكانها، امسح الأجهزة بعد الاستخدام وشارك الآلات بين الجولات.")}</p>
    <p>📵 ${tL("No photos or videos of other members without their clear permission.", "لا تصوّر الأعضاء الآخرين صوراً أو فيديو دون إذن واضح منهم.")}</p>
    <p>🏆 ${tL("Log honest lifts — fake numbers on the leaderboard will be removed.", "سجّل رفعات صادقة — الأرقام المزيفة على لوحة الصدارة ستُحذف.")}</p>
    <p>🚫 ${tL("Harassment, discrimination or unsafe behaviour leads to a ban from the app and partner gyms.", "التحرّش أو التمييز أو السلوك غير الآمن يؤدي إلى حظر من التطبيق والأندية الشريكة.")}</p>
    <p>${tL("See something wrong? Report it via Support → Contact us.", "لاحظت خطأً ما؟ أبلغ عنه عبر الدعم ← اتصل بنا.")}</p>
  </div>`;
}
