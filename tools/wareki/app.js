/* ============================================
   西暦・和暦変換 : app.js
   バニラJS / 外部依存なし
   - ダーク/ライト切替（localStorage保存）
   - お布施フラグ判定（分岐の起点）
   - ①西暦→和暦 ②和暦→西暦 の相互変換、満年齢表示
   - 入力値はサーバーに送信・保存しない（表示設定のみ保存）
   ============================================ */

(function () {
  "use strict";

  const STORAGE_KEY_THEME = "tf_theme"; // "light" | "dark"
  const STORAGE_KEY_PRO = "tf_pro";     // "1" でお布施済みフラグ（擬似）

  /* ---------- テーマ切替 ---------- */
  function initTheme() {
    const toggle = document.getElementById("theme-toggle");
    const root = document.documentElement;

    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved || (prefersDark ? "dark" : "light");
    applyTheme(initial);

    if (toggle) {
      toggle.addEventListener("click", () => {
        const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
        const next = current === "dark" ? "light" : "dark";
        applyTheme(next);
        localStorage.setItem(STORAGE_KEY_THEME, next);
      });
    }

    function applyTheme(theme) {
      if (theme === "dark") {
        root.setAttribute("data-theme", "dark");
        if (toggle) {
          toggle.setAttribute("aria-pressed", "true");
          toggle.innerHTML = '<span aria-hidden="true">☀️</span>';
        }
      } else {
        root.removeAttribute("data-theme");
        if (toggle) {
          toggle.setAttribute("aria-pressed", "false");
          toggle.innerHTML = '<span aria-hidden="true">🌙</span>';
        }
      }
    }
  }

  /* ---------- お布施フラグ判定 ---------- */
  function isPro() {
    return localStorage.getItem(STORAGE_KEY_PRO) === "1";
  }

  function applyProState() {
    if (isPro()) {
      document.body.classList.add("is-pro");
      document.querySelectorAll(".ad-slot").forEach((el) => {
        el.style.display = "none";
      });
    }
  }

  /* ---------- 開発用Pro切替ボタン ---------- */
  function initDevProToggle() {
    const btn = document.getElementById("dev-pro-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const next = isPro() ? "0" : "1";
      localStorage.setItem(STORAGE_KEY_PRO, next);
      location.reload();
    });
  }

  window.ToolFactory = { isPro: isPro };

  /* ============================================
     西暦・和暦変換本体
     ============================================ */

  // 元号定義: 開始日（西暦年月日）が新しい順。endはJS Dateとの比較用にUTC日付で扱う。
  // 境界日: 令和=2019/5/1〜, 平成=1989/1/8〜2019/4/30, 昭和=1926/12/25〜1989/1/7,
  //         大正=1912/7/30〜1926/12/24, 明治=1868/1/25〜1912/7/29
  const ERAS = [
    { name: "令和", start: { y: 2019, m: 5, d: 1 } },
    { name: "平成", start: { y: 1989, m: 1, d: 8 } },
    { name: "昭和", start: { y: 1926, m: 12, d: 25 } },
    { name: "大正", start: { y: 1912, m: 7, d: 30 } },
    { name: "明治", start: { y: 1868, m: 1, d: 25 } },
  ];

  // 「今日」は現在日時を使用（プレビュー環境に依存しないようnewDate()を使う）
  function today() {
    return new Date();
  }

  // 日付比較用: y/m/dを比較可能な数値に変換（YYYYMMDD形式）
  function dateKey(y, m, d) {
    return y * 10000 + m * 100 + d;
  }

  /* ---------- ①西暦→和暦 ---------- */
  function seirekiToWareki(y, m, d) {
    const key = dateKey(y, m, d);
    for (const era of ERAS) {
      const startKey = dateKey(era.start.y, era.start.m, era.start.d);
      if (key >= startKey) {
        const warekiYear = y - era.start.y + 1;
        return { era: era.name, year: warekiYear };
      }
    }
    return null; // 明治より前
  }

  /* ---------- ②和暦→西暦 ---------- */
  function warekiToSeireki(eraName, warekiYear) {
    const era = ERAS.find((e) => e.name === eraName);
    if (!era) return null;
    if (!isFinite(warekiYear) || warekiYear < 1) return null;
    return era.start.y + warekiYear - 1;
  }

  /* ---------- 満年齢計算 ---------- */
  function calcAge(birthY, birthM, birthD, baseDate) {
    let age = baseDate.getFullYear() - birthY;
    const birthMonthDay = birthM * 100 + birthD;
    const baseMonthDay = (baseDate.getMonth() + 1) * 100 + baseDate.getDate();
    if (baseMonthDay < birthMonthDay) {
      age -= 1;
    }
    return age;
  }

  /* ---------- 日付の妥当性チェック ---------- */
  function isValidDate(y, m, d) {
    if (!isFinite(y) || !isFinite(m) || !isFinite(d)) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }

  let dom = {};

  function initTool() {
    dom = {
      tabs: Array.from(document.querySelectorAll(".mode-tab")),
      panels: {
        "to-wareki": document.getElementById("panel-to-wareki"),
        "to-seireki": document.getElementById("panel-to-seireki"),
        table: document.getElementById("panel-table"),
      },
      // ①西暦→和暦
      seirekiDate: document.getElementById("seireki-date"),
      toWarekiResult: document.getElementById("to-wareki-result"),
      toWarekiAge: document.getElementById("to-wareki-age"),
      // ②和暦→西暦
      warekiEra: document.getElementById("wareki-era"),
      warekiYear: document.getElementById("wareki-year"),
      warekiMonth: document.getElementById("wareki-month"),
      warekiDay: document.getElementById("wareki-day"),
      toSeirekiResult: document.getElementById("to-seireki-result"),
      toSeirekiAge: document.getElementById("to-seireki-age"),
      // 共通
      copyStatus: document.getElementById("copy-status"),
    };

    if (!dom.tabs.length) return; // tool-root未実装ページでは何もしない

    bindEvents();
    initDevProToggle();
    calcToWareki();
    calcToSeireki();
  }

  /* ---------- タブ切替 ---------- */
  function bindEvents() {
    dom.tabs.forEach((tab) => {
      tab.addEventListener("click", () => switchMode(tab.dataset.mode));
    });

    dom.seirekiDate.addEventListener("input", calcToWareki);

    [dom.warekiEra, dom.warekiYear, dom.warekiMonth, dom.warekiDay].forEach((el) => {
      el.addEventListener("input", calcToSeireki);
      el.addEventListener("change", calcToSeireki);
    });

    document.querySelectorAll(".copy-btn").forEach((btn) => {
      btn.addEventListener("click", () => copyResult(btn.dataset.target));
    });
  }

  function switchMode(mode) {
    dom.tabs.forEach((tab) => {
      const isActive = tab.dataset.mode === mode;
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.tabIndex = isActive ? 0 : -1;
    });
    Object.keys(dom.panels).forEach((key) => {
      const panel = dom.panels[key];
      if (key === mode) {
        panel.hidden = false;
        panel.classList.add("is-active");
      } else {
        panel.hidden = true;
        panel.classList.remove("is-active");
      }
    });
    dom.copyStatus.textContent = "";
  }

  /* ---------- ①西暦→和暦 ---------- */
  function calcToWareki() {
    const value = dom.seirekiDate.value; // "YYYY-MM-DD"
    if (!value) {
      dom.toWarekiResult.textContent = "-";
      dom.toWarekiAge.textContent = "日付を入力してください。";
      return;
    }
    const [y, m, d] = value.split("-").map(Number);
    if (!isValidDate(y, m, d)) {
      dom.toWarekiResult.textContent = "-";
      dom.toWarekiAge.textContent = "正しい日付を入力してください。";
      return;
    }

    const wareki = seirekiToWareki(y, m, d);
    if (!wareki) {
      dom.toWarekiResult.textContent = "対応する元号がありません";
      dom.toWarekiAge.textContent = "明治より前の日付には対応していません。";
      return;
    }

    const yearLabel = wareki.year === 1 ? "元年" : `${wareki.year}年`;
    dom.toWarekiResult.textContent = `${wareki.era}${yearLabel}${m}月${d}日`;

    const age = calcAge(y, m, d, today());
    if (age >= 0) {
      dom.toWarekiAge.textContent = `この日付を基準にすると、本日時点の満年齢は ${age}歳 です。`;
    } else {
      dom.toWarekiAge.textContent = "未来の日付のため、満年齢は算出できません。";
    }
  }

  /* ---------- ②和暦→西暦 ---------- */
  function calcToSeireki() {
    const eraName = dom.warekiEra.value;
    const warekiYear = Number(dom.warekiYear.value);
    const m = Number(dom.warekiMonth.value);
    const d = Number(dom.warekiDay.value);

    if (!isFinite(warekiYear) || warekiYear < 1) {
      dom.toSeirekiResult.textContent = "-";
      dom.toSeirekiAge.textContent = "年は1以上の数値を入力してください。";
      return;
    }

    const seirekiYear = warekiToSeireki(eraName, warekiYear);
    if (seirekiYear === null) {
      dom.toSeirekiResult.textContent = "-";
      dom.toSeirekiAge.textContent = "元号を選択してください。";
      return;
    }

    if (!isValidDate(seirekiYear, m, d)) {
      dom.toSeirekiResult.textContent = "-";
      dom.toSeirekiAge.textContent = "正しい月日を入力してください。";
      return;
    }

    // 元号の在位期間内かどうかをチェック（次の元号の開始日以降になっていないか）
    const era = ERAS.find((e) => e.name === eraName);
    const eraIndex = ERAS.indexOf(era);
    const key = dateKey(seirekiYear, m, d);
    const startKey = dateKey(era.start.y, era.start.m, era.start.d);
    let outOfRange = key < startKey;
    if (!outOfRange && eraIndex > 0) {
      const nextEra = ERAS[eraIndex - 1]; // ERASは新しい順なので、ひとつ前が次の元号
      const nextStartKey = dateKey(nextEra.start.y, nextEra.start.m, nextEra.start.d);
      if (key >= nextStartKey) outOfRange = true;
    }

    dom.toSeirekiResult.textContent = `${seirekiYear}年${m}月${d}日`;

    if (outOfRange) {
      dom.toSeirekiAge.textContent = `注意: ${eraName}${warekiYear === 1 ? "元年" : warekiYear + "年"}${m}月${d}日は、${eraName}の在位期間外の可能性があります。`;
      return;
    }

    const age = calcAge(seirekiYear, m, d, today());
    if (age >= 0) {
      dom.toSeirekiAge.textContent = `この日付を基準にすると、本日時点の満年齢は ${age}歳 です。`;
    } else {
      dom.toSeirekiAge.textContent = "未来の日付のため、満年齢は算出できません。";
    }
  }

  /* ---------- コピー ---------- */
  function copyResult(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const text = target.textContent;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          dom.copyStatus.textContent = `「${text}」をコピーしました。`;
        })
        .catch(() => {
          dom.copyStatus.textContent = "コピーに失敗しました。";
        });
    } else {
      dom.copyStatus.textContent = "コピー機能はこのブラウザでは利用できません。";
    }
  }

  /* ---------- 起動 ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    applyProState();
    initTool();
  });
})();
