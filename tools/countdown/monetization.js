/* ============================================
   018-countdown-timer : monetization.js
   収益3レール: 1) AdSense  2) アフィリエイト  3) Stripe Payment Link (Pro)
   ============================================ */

(function () {
  "use strict";

  const CONFIG = {
    // 1) AdSense
    ADSENSE_CLIENT_ID: "ca-pub-6568622993777242",

    // 2) アフィリエイト（提携先決定後に実リンクへ更新）
    AFFILIATE_ITEMS: [
      {
        label: "TODO: カレンダー・スケジュール管理グッズ",
        url: "https://example.com/affiliate-link-1", // TODO
      },
      {
        label: "TODO: イベント・記念日ギフト",
        url: "https://example.com/affiliate-link-2", // TODO
      },
    ],

    // 3) Stripe
    STRIPE_PAYMENT_LINK_URL: "", // TODO 例: "https://buy.stripe.com/XXXXXXXX"
  };

  /* ---------- 1) AdSense 自動読み込み（Pro時は除外） ---------- */
  var ADSENSE_CLIENT_ID = CONFIG.ADSENSE_CLIENT_ID;
  (function () {
    try {
      var p = window.ToolFactory && window.ToolFactory.isPro && window.ToolFactory.isPro();
      if (ADSENSE_CLIENT_ID && !p && !document.querySelector('script[src*="adsbygoogle.js"]')) {
        var s = document.createElement("script");
        s.async = true;
        s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + ADSENSE_CLIENT_ID;
        s.crossOrigin = "anonymous";
        document.head.appendChild(s);
      }
    } catch (e) {}
  })();

  /* ---------- 2) アフィリエイト枠レンダリング ---------- */
  function renderAffiliateLinks() {
    const list = document.getElementById("affiliate-list");
    if (!list) return;

    list.innerHTML = "";
    CONFIG.AFFILIATE_ITEMS.forEach((item) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = item.url;
      a.textContent = item.label;
      a.rel = "sponsored nofollow noopener";
      a.target = "_blank";
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  /* ---------- 3) Stripe Payment Link（Proボタン） ---------- */
  function initProButton() {
    const btn = document.getElementById("pro-button");
    if (!btn) return;

    btn.addEventListener("click", () => {
      if (!CONFIG.STRIPE_PAYMENT_LINK_URL) {
        alert("Pro機能は準備中です。公開までお待ちください。");
        return;
      }
      window.open(CONFIG.STRIPE_PAYMENT_LINK_URL, "_blank", "noopener");
    });
  }

  /* ---------- 起動 ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    renderAffiliateLinks();
    initProButton();
  });

  window.ToolFactoryMonetization = { CONFIG };
})();
