/* =============================================================
   FitJo — PWA glue: register the service worker and offer an
   "Install app" button (Android/desktop) or an "Add to Home
   Screen" hint (iOS Safari, which has no install prompt event).
   Relies on globals from app.js/data.js: t, toast (both optional).
   ============================================================= */
(function () {
  "use strict";

  // Service workers only run in a secure context (https or localhost) — not file://
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => { /* SW optional; app still works */ });
    });
  }

  let deferredPrompt = null;
  const T = (k) => (typeof t === "function" ? t(k) : k);
  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isiOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  function ensureBtn() {
    let btn = document.getElementById("installFab");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "installFab";
      btn.className = "install-fab";
      btn.type = "button";
      btn.addEventListener("click", onInstallClick);
      document.body.appendChild(btn);
    }
    btn.innerHTML = `⬇️ <span>${T("installApp")}</span>`;
    return btn;
  }
  function showBtn() { if (!isStandalone()) ensureBtn().classList.add("show"); }
  function hideBtn() { const b = document.getElementById("installFab"); if (b) b.classList.remove("show"); }

  function onInstallClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      Promise.resolve(deferredPrompt.userChoice).finally(() => { deferredPrompt = null; hideBtn(); });
    } else if (isiOS()) {
      if (typeof toast === "function") toast(T("installIosHint")); else alert(T("installIosHint"));
    }
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();          // suppress the mini-infobar; we show our own button
    deferredPrompt = e;
    showBtn();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null; hideBtn();
    if (typeof toast === "function") toast(T("installedToast"));
  });

  // iOS never fires beforeinstallprompt — surface the manual hint instead.
  document.addEventListener("DOMContentLoaded", () => {
    if (isiOS() && !isStandalone()) showBtn();
  });

  // Keep the label correct if the user switches language while it's visible.
  window.addEventListener("fj:langchange", () => {
    const b = document.getElementById("installFab");
    if (b && b.classList.contains("show")) b.innerHTML = `⬇️ <span>${T("installApp")}</span>`;
  });
})();
