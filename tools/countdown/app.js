/* ============================================
   018-countdown-timer : app.js
   バニラJS / 外部依存なし
   - ダーク/ライト切替（localStorage保存）
   - Proフラグ判定
   - イベントカウントダウン（複数登録・localStorage保存）
   - Date.nowベースで1秒ごとに残り時間/経過時間を更新
   ============================================ */

(function () {
  "use strict";

  const STORAGE_KEY_THEME = "tf_theme"; // "light" | "dark"
  const STORAGE_KEY_PRO = "tf_pro";     // "1" で Pro 有効（擬似フラグ）
  const STORAGE_KEY_EVENTS = "cdt_events"; // イベント一覧の保存キー

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

  /* ---------- Pro判定 ---------- */
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

  /* ============================================
     イベントカウントダウン本体
     ============================================ */

  // イベント一覧をlocalStorageから読み込む
  function loadEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((e) => e && typeof e.name === "string" && typeof e.target === "number");
    } catch (e) {
      return [];
    }
  }

  // イベント一覧をlocalStorageに保存する
  function saveEvents(events) {
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
  }

  // 残り（または経過）のミリ秒を 日/時/分/秒 に分解する
  function decomposeMs(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds };
  }

  // 日時を「YYYY/MM/DD HH:mm」形式で表示する
  function formatDateTime(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return y + "/" + m + "/" + d + " " + hh + ":" + mm;
  }

  function initTool() {
    const form = document.getElementById("event-form");
    const nameInput = document.getElementById("event-name");
    const dateInput = document.getElementById("event-datetime");
    const errorEl = document.getElementById("form-error");
    const listEl = document.getElementById("event-list");
    const emptyMsg = document.getElementById("empty-message");
    if (!form || !nameInput || !dateInput || !listEl) return;

    let events = loadEvents();

    // イベント一覧のDOMを再構築する
    function renderList() {
      listEl.innerHTML = "";

      if (events.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove("is-hidden");
        return;
      }
      if (emptyMsg) emptyMsg.classList.add("is-hidden");

      // 目標日時が近い順に並べる
      const sorted = events.slice().sort((a, b) => a.target - b.target);

      sorted.forEach((ev) => {
        const li = document.createElement("li");
        li.className = "event-card";
        li.dataset.id = String(ev.id);

        const info = document.createElement("div");
        info.className = "event-card-info";

        const nameEl = document.createElement("div");
        nameEl.className = "event-name";
        nameEl.textContent = ev.name;

        const targetEl = document.createElement("div");
        targetEl.className = "event-target";
        targetEl.textContent = "目標: " + formatDateTime(new Date(ev.target));

        info.appendChild(nameEl);
        info.appendChild(targetEl);

        const remainingEl = document.createElement("div");
        remainingEl.className = "event-remaining";
        remainingEl.setAttribute("aria-live", "off");

        const actions = document.createElement("div");
        actions.className = "event-actions";
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "btn btn-danger";
        delBtn.textContent = "削除";
        delBtn.addEventListener("click", () => {
          events = events.filter((e) => e.id !== ev.id);
          saveEvents(events);
          renderList();
        });
        actions.appendChild(delBtn);

        li.appendChild(info);
        li.appendChild(remainingEl);
        li.appendChild(actions);
        listEl.appendChild(li);
      });

      updateRemaining();
    }

    // 各カードの残り時間/経過時間を更新する（1秒ごとに呼ばれる）
    function updateRemaining() {
      const now = Date.now();
      const cards = listEl.querySelectorAll(".event-card");
      cards.forEach((card) => {
        const id = Number(card.dataset.id);
        const ev = events.find((e) => e.id === id);
        if (!ev) return;

        const remainingEl = card.querySelector(".event-remaining");
        if (!remainingEl) return;

        const diff = ev.target - now;
        const isPast = diff <= 0;
        const parts = decomposeMs(Math.abs(diff));

        const text =
          (isPast ? "経過: " : "あと ") +
          parts.days + "日 " +
          parts.hours + "時間 " +
          parts.minutes + "分 " +
          parts.seconds + "秒";

        remainingEl.textContent = text;
        remainingEl.classList.toggle("is-past", isPast);
        card.classList.toggle("is-past", isPast);
      });
    }

    // フォーム送信（イベント追加）
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (errorEl) errorEl.textContent = "";

      const name = nameInput.value.trim();
      const dateStr = dateInput.value;

      if (!name) {
        if (errorEl) errorEl.textContent = "イベント名を入力してください。";
        return;
      }
      if (!dateStr) {
        if (errorEl) errorEl.textContent = "目標日時を入力してください。";
        return;
      }

      const target = new Date(dateStr).getTime();
      if (isNaN(target)) {
        if (errorEl) errorEl.textContent = "目標日時の形式が正しくありません。";
        return;
      }

      events.push({
        id: Date.now(),
        name: name,
        target: target,
      });
      saveEvents(events);
      renderList();

      form.reset();
      nameInput.focus();
    });

    renderList();

    // 1秒ごとに残り時間/経過時間を更新（Date.nowベースで正確に）
    setInterval(updateRemaining, 1000);
  }

  /* ---------- 起動 ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    applyProState();
    initTool();
  });

  window.ToolFactory = {
    isPro,
    STORAGE_KEY_PRO,
    STORAGE_KEY_THEME,
  };
})();
