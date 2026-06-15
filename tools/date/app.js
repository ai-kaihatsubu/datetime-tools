/* ============================================
   年齢・日数計算ツール : app.js
   バニラJS / 外部依存なし
   - ダーク/ライト切替（localStorage保存）
   - Proフラグ判定（広告非表示などの分岐の起点）
   - ①満年齢・総日数・次の誕生日まで ②2日付の差 ③基準日からN日後/前
   - 日付はすべてこの端末（ブラウザ）内で処理。外部送信・保存なし
   ============================================ */

(function () {
  "use strict";

  const STORAGE_KEY_THEME = "tf_theme"; // "light" | "dark"
  const STORAGE_KEY_PRO = "tf_pro";     // "1" で Pro 有効（擬似フラグ）

  const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

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

  /* ---------- Pro判定（広告非表示など） ---------- */
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
     日付ユーティリティ
     入力は<input type="date">の "YYYY-MM-DD" 文字列。
     タイムゾーンによるズレを避けるため、年月日を分解して
     ローカルタイムのDateオブジェクト（時刻00:00:00）として扱う。
     ============================================ */

  function parseDateInput(value) {
    if (!value) return null;
    const parts = value.split("-");
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    const date = new Date(year, month - 1, day);
    // 不正な日付（例: 2月30日）はDateが自動補正してしまうため、補正されていないか検証
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    return date;
  }

  function formatDateToInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatDateJapanese(date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const w = WEEKDAY_LABELS[date.getDay()];
    return `${y}年${m}月${d}日（${w}）`;
  }

  function daysBetween(start, end) {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.round((endUTC - startUTC) / MS_PER_DAY);
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function daysInMonth(year, month) {
    // month: 0-11
    return new Date(year, month + 1, 0).getDate();
  }

  /* ---------- ①満年齢の計算 ---------- */
  function calcAge(birth, base) {
    let years = base.getFullYear() - birth.getFullYear();
    let months = base.getMonth() - birth.getMonth();
    let days = base.getDate() - birth.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonthDate = new Date(base.getFullYear(), base.getMonth(), 0);
      days += prevMonthDate.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return { years, months, days };
  }

  function calcTotalDays(birth, base) {
    return daysBetween(birth, base);
  }

  // 次の誕生日までの日数と日付を計算（うるう年2/29生まれの場合、平年は2/28とする）
  function calcNextBirthday(birth, base) {
    const birthMonth = birth.getMonth();
    const birthDay = birth.getDate();

    function birthdayInYear(year) {
      if (birthMonth === 1 && birthDay === 29 && !isLeapYear(year)) {
        return new Date(year, 1, 28); // 2/28
      }
      return new Date(year, birthMonth, birthDay);
    }

    let candidate = birthdayInYear(base.getFullYear());
    if (daysBetween(base, candidate) < 0) {
      candidate = birthdayInYear(base.getFullYear() + 1);
    } else if (daysBetween(base, candidate) === 0) {
      // 今日が誕生日の場合は「今日」と表示するため0日のまま
    }

    const diff = daysBetween(base, candidate);
    return { date: candidate, days: diff };
  }

  /* ---------- ②2つの日付の差 ---------- */
  function calcDateDiff(start, end) {
    // start <= end になるよう順序を揺れなく扱う
    const reversed = start.getTime() > end.getTime();
    const from = reversed ? end : start;
    const to = reversed ? start : end;

    const totalDays = daysBetween(from, to);
    const totalWeeks = totalDays / 7;

    // 概算の年月日
    let years = to.getFullYear() - from.getFullYear();
    let months = to.getMonth() - from.getMonth();
    let days = to.getDate() - from.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonthDate = new Date(to.getFullYear(), to.getMonth(), 0);
      days += prevMonthDate.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return {
      totalDays,
      totalWeeks,
      years,
      months,
      days,
      reversed,
      sameDay: totalDays === 0,
    };
  }

  /* ---------- ③基準日からN日/週/月後(前) ---------- */
  function calcOffsetDate(base, amount, unit, direction) {
    const sign = direction === "before" ? -1 : 1;
    const n = amount * sign;

    if (unit === "day") {
      const result = new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
      return result;
    }
    if (unit === "week") {
      const result = new Date(base.getFullYear(), base.getMonth(), base.getDate() + n * 7);
      return result;
    }
    if (unit === "month") {
      const targetMonthIndex = base.getMonth() + n;
      const targetYear = base.getFullYear() + Math.floor(targetMonthIndex / 12);
      const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
      const lastDay = daysInMonth(targetYear, normalizedMonth);
      const day = Math.min(base.getDate(), lastDay);
      return new Date(targetYear, normalizedMonth, day);
    }
    return new Date(base);
  }

  /* ============================================
     UI制御
     ============================================ */

  function today() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /* ---------- ①満年齢セクション ---------- */
  function initAgeSection() {
    const birthInput = document.getElementById("birth-date");
    const baseInput = document.getElementById("age-base-date");
    const resultBox = document.getElementById("age-result");

    baseInput.value = formatDateToInput(today());

    function render() {
      const birth = parseDateInput(birthInput.value);
      const base = parseDateInput(baseInput.value);

      if (!birth || !base) {
        resultBox.innerHTML = `<p class="result-placeholder">生年月日と基準日を入力してください。</p>`;
        return;
      }

      if (daysBetween(birth, base) < 0) {
        resultBox.innerHTML = `<p class="result-placeholder">基準日は生年月日より後の日付を指定してください。</p>`;
        return;
      }

      const age = calcAge(birth, base);
      const totalDays = calcTotalDays(birth, base);
      const next = calcNextBirthday(birth, base);

      resultBox.innerHTML = "";
      appendResultRow(resultBox, "満年齢", `${age.years}歳${age.months}ヶ月${age.days}日`);
      appendResultRow(resultBox, "生まれてからの総日数", `${totalDays.toLocaleString()}日`);
      if (next.days === 0) {
        appendResultRow(resultBox, "次の誕生日", "本日が誕生日です");
      } else {
        appendResultRow(resultBox, "次の誕生日まで", `${next.days}日（${formatDateJapanese(next.date)}）`);
      }
    }

    birthInput.addEventListener("input", render);
    baseInput.addEventListener("input", render);
    render();
  }

  /* ---------- ②日付の差セクション ---------- */
  function initDiffSection() {
    const startInput = document.getElementById("diff-start-date");
    const endInput = document.getElementById("diff-end-date");
    const resultBox = document.getElementById("diff-result");

    const t = today();
    startInput.value = formatDateToInput(t);
    endInput.value = formatDateToInput(t);

    function render() {
      const start = parseDateInput(startInput.value);
      const end = parseDateInput(endInput.value);

      if (!start || !end) {
        resultBox.innerHTML = `<p class="result-placeholder">開始日と終了日を入力してください。</p>`;
        return;
      }

      const diff = calcDateDiff(start, end);

      resultBox.innerHTML = "";

      if (diff.sameDay) {
        appendResultRow(resultBox, "日数の差", "0日（同じ日付です）");
        return;
      }

      if (diff.reversed) {
        appendResultRow(resultBox, "注記", "終了日が開始日より前のため、絶対値で表示します。");
      }

      appendResultRow(resultBox, "日数の差", `${diff.totalDays.toLocaleString()}日`);
      appendResultRow(resultBox, "週数の差", `約${(Math.floor(diff.totalWeeks * 10) / 10).toLocaleString()}週`);
      appendResultRow(resultBox, "概算の年月日", `約${diff.years}年${diff.months}ヶ月${diff.days}日`);
    }

    startInput.addEventListener("input", render);
    endInput.addEventListener("input", render);
    render();
  }

  /* ---------- ③N日後/前セクション ---------- */
  function initOffsetSection() {
    const baseInput = document.getElementById("offset-base-date");
    const amountInput = document.getElementById("offset-amount");
    const unitSelect = document.getElementById("offset-unit");
    const directionSelect = document.getElementById("offset-direction");
    const resultBox = document.getElementById("offset-result");

    baseInput.value = formatDateToInput(today());

    function render() {
      const base = parseDateInput(baseInput.value);
      const amountRaw = amountInput.value;
      const amount = parseInt(amountRaw, 10);

      if (!base) {
        resultBox.innerHTML = `<p class="result-placeholder">基準日を入力してください。</p>`;
        return;
      }
      if (amountRaw === "" || isNaN(amount) || amount < 0) {
        resultBox.innerHTML = `<p class="result-placeholder">0以上の整数を入力してください。</p>`;
        return;
      }

      const unit = unitSelect.value;
      const direction = directionSelect.value;
      const result = calcOffsetDate(base, amount, unit, direction);

      const unitLabel = unit === "day" ? "日" : unit === "week" ? "週" : "ヶ月";
      const directionLabel = direction === "before" ? "前" : "後";

      resultBox.innerHTML = "";
      appendResultRow(resultBox, "計算条件", `${formatDateJapanese(base)} の ${amount}${unitLabel}${directionLabel}`);
      appendResultRow(resultBox, "結果の日付", formatDateJapanese(result));
    }

    baseInput.addEventListener("input", render);
    amountInput.addEventListener("input", render);
    unitSelect.addEventListener("change", render);
    directionSelect.addEventListener("change", render);
    render();
  }

  /* ---------- 結果表示の共通ヘルパー ---------- */
  function appendResultRow(container, label, value) {
    const row = document.createElement("div");
    row.className = "result-row";

    const labelEl = document.createElement("p");
    labelEl.className = "result-row__label";
    labelEl.textContent = label;

    const valueEl = document.createElement("p");
    valueEl.className = "result-row__value";
    valueEl.textContent = value;

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    container.appendChild(row);
  }

  /* ---------- 起動 ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    applyProState();
    initDevProToggle();
    initAgeSection();
    initDiffSection();
    initOffsetSection();
  });
})();
