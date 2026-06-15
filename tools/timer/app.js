/* ============================================
   タイマー＆ストップウォッチ : app.js
   バニラJS / 外部依存なし
   - タブ切替（タイマー / ストップウォッチ / ポモドーロ）
   - Date.nowベースのドリフト補正タイマー
   - WebAudio APIによるビープ音生成
   - タブタイトル点滅による終了通知
   - ダーク/ライト切替（localStorage保存）・Proフラグ
   ============================================ */

(function () {
  "use strict";

  const STORAGE_KEY_THEME = "tf_theme"; // "light" | "dark"
  const STORAGE_KEY_PRO = "tf_pro";     // "1" で Pro 有効（擬似フラグ）

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

  function initDevProToggle() {
    const btn = document.getElementById("dev-pro-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const next = isPro() ? "0" : "1";
      localStorage.setItem(STORAGE_KEY_PRO, next);
      location.reload();
    });
  }

  /* ============================================
     WebAudio ビープ音
     ============================================ */
  let audioCtx = null;

  function ensureAudioContext() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // 単発のビープ音を再生する
  function beep(frequency, durationMs, delaySec) {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const startTime = ctx.currentTime + (delaySec || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + durationMs / 1000 + 0.02);
  }

  // 終了時の複数ビープ
  function playAlarm() {
    beep(880, 200, 0);
    beep(880, 200, 0.3);
    beep(880, 350, 0.6);
  }

  /* ============================================
     タブタイトル点滅
     ============================================ */
  const ORIGINAL_TITLE = document.title;
  let titleFlashTimer = null;

  function startTitleFlash(message) {
    stopTitleFlash();
    let toggled = false;
    titleFlashTimer = setInterval(() => {
      document.title = toggled ? ORIGINAL_TITLE : message;
      toggled = !toggled;
    }, 1000);

    // タブがアクティブになったら止める
    document.addEventListener("visibilitychange", onVisible);
  }

  function onVisible() {
    if (!document.hidden) {
      stopTitleFlash();
    }
  }

  function stopTitleFlash() {
    if (titleFlashTimer) {
      clearInterval(titleFlashTimer);
      titleFlashTimer = null;
      document.title = ORIGINAL_TITLE;
    }
    document.removeEventListener("visibilitychange", onVisible);
  }

  /* ============================================
     時間表示フォーマット
     ============================================ */
  function pad2(n) {
    return String(Math.floor(n)).padStart(2, "0");
  }

  // ms -> "HH:MM:SS"
  function formatHMS(ms) {
    const totalSec = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  }

  // ms -> "HH:MM:SS.CC"（ストップウォッチ用、センチ秒まで）
  function formatHMSC(ms) {
    const totalCs = Math.max(0, Math.floor(ms / 10));
    const cs = totalCs % 100;
    const totalSec = Math.floor(totalCs / 100);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}.${pad2(cs)}`;
  }

  // ms -> "MM:SS"（ポモドーロ用）
  function formatMS(ms) {
    const totalSec = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${pad2(m)}:${pad2(s)}`;
  }

  /* ============================================
     タブ切替
     ============================================ */
  function initTabs() {
    const tabs = [
      { btn: "tab-timer", panel: "panel-timer" },
      { btn: "tab-stopwatch", panel: "panel-stopwatch" },
      { btn: "tab-pomodoro", panel: "panel-pomodoro" },
    ];

    tabs.forEach(({ btn, panel }) => {
      const btnEl = document.getElementById(btn);
      if (!btnEl) return;
      btnEl.addEventListener("click", () => {
        tabs.forEach(({ btn: b, panel: p }) => {
          const bEl = document.getElementById(b);
          const pEl = document.getElementById(p);
          const active = b === btn;
          bEl.setAttribute("aria-selected", active ? "true" : "false");
          bEl.classList.toggle("is-active", active);
          if (active) {
            pEl.hidden = false;
            pEl.classList.remove("is-hidden");
          } else {
            pEl.hidden = true;
            pEl.classList.add("is-hidden");
          }
        });
      });
    });
  }

  /* ============================================
     ① タイマー（カウントダウン）
     ============================================ */
  function initCountdownTimer() {
    const display = document.getElementById("timer-display");
    const hoursInput = document.getElementById("timer-hours");
    const minutesInput = document.getElementById("timer-minutes");
    const secondsInput = document.getElementById("timer-seconds");
    const startBtn = document.getElementById("timer-start");
    const pauseBtn = document.getElementById("timer-pause");
    const resetBtn = document.getElementById("timer-reset");
    const statusEl = document.getElementById("timer-status");
    const presetBtns = document.querySelectorAll(".preset-btn");

    if (!display) return;

    let durationMs = 0;       // 設定された総時間
    let endTime = null;       // カウントダウン終了予定時刻（Date.now基準）
    let remainingMs = 0;      // 一時停止時の残り時間
    let intervalId = null;
    let running = false;

    function getInputDurationMs() {
      const h = Math.max(0, Math.min(99, parseInt(hoursInput.value, 10) || 0));
      const m = Math.max(0, Math.min(59, parseInt(minutesInput.value, 10) || 0));
      const s = Math.max(0, Math.min(59, parseInt(secondsInput.value, 10) || 0));
      return (h * 3600 + m * 60 + s) * 1000;
    }

    function render(ms) {
      display.textContent = formatHMS(ms);
    }

    function tick() {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        render(0);
        finish();
        return;
      }
      render(remaining);
    }

    function finish() {
      stopInterval();
      running = false;
      endTime = null;
      remainingMs = 0;
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      pauseBtn.textContent = "一時停止";
      statusEl.textContent = "時間になりました！";
      playAlarm();
      startTitleFlash("⏰ 時間になりました");
    }

    function stopInterval() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    startBtn.addEventListener("click", () => {
      ensureAudioContext();
      stopTitleFlash();
      statusEl.textContent = "";

      if (!running && remainingMs <= 0) {
        durationMs = getInputDurationMs();
        if (durationMs <= 0) {
          statusEl.textContent = "1秒以上の時間を設定してください。";
          return;
        }
        remainingMs = durationMs;
      }

      endTime = Date.now() + remainingMs;
      running = true;
      startBtn.disabled = true;
      pauseBtn.disabled = false;
      hoursInput.disabled = true;
      minutesInput.disabled = true;
      secondsInput.disabled = true;

      stopInterval();
      intervalId = setInterval(tick, 200);
      tick();
    });

    pauseBtn.addEventListener("click", () => {
      if (!running) return;
      remainingMs = Math.max(0, endTime - Date.now());
      running = false;
      stopInterval();
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      render(remainingMs);
    });

    resetBtn.addEventListener("click", () => {
      stopInterval();
      stopTitleFlash();
      running = false;
      endTime = null;
      remainingMs = 0;
      durationMs = 0;
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      hoursInput.disabled = false;
      minutesInput.disabled = false;
      secondsInput.disabled = false;
      statusEl.textContent = "";
      render(getInputDurationMs());
    });

    [hoursInput, minutesInput, secondsInput].forEach((input) => {
      input.addEventListener("input", () => {
        if (!running) {
          render(getInputDurationMs());
        }
      });
    });

    presetBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (running) return;
        const minutes = parseInt(btn.getAttribute("data-preset-minutes"), 10) || 0;
        hoursInput.value = "0";
        minutesInput.value = String(minutes);
        secondsInput.value = "0";
        render(getInputDurationMs());
      });
    });

    // 初期表示
    render(getInputDurationMs());
  }

  /* ============================================
     ② ストップウォッチ
     ============================================ */
  function initStopwatch() {
    const display = document.getElementById("stopwatch-display");
    const startBtn = document.getElementById("stopwatch-start");
    const lapBtn = document.getElementById("stopwatch-lap");
    const resetBtn = document.getElementById("stopwatch-reset");
    const lapList = document.getElementById("lap-list");

    if (!display) return;

    let startTime = null;   // 計測開始時刻（Date.now基準）
    let elapsedMs = 0;      // 一時停止までの累積経過時間
    let running = false;
    let intervalId = null;
    let lapCount = 0;
    let lastLapMs = 0;

    function currentElapsed() {
      if (running) {
        return elapsedMs + (Date.now() - startTime);
      }
      return elapsedMs;
    }

    function render() {
      display.textContent = formatHMSC(currentElapsed());
    }

    function tick() {
      render();
    }

    startBtn.addEventListener("click", () => {
      if (!running) {
        // 開始 / 再開
        running = true;
        startTime = Date.now();
        startBtn.textContent = "停止";
        startBtn.classList.remove("btn-primary");
        startBtn.classList.add("btn-danger");
        lapBtn.disabled = false;
        resetBtn.disabled = false;
        intervalId = setInterval(tick, 50);
      } else {
        // 停止
        running = false;
        elapsedMs += Date.now() - startTime;
        startTime = null;
        clearInterval(intervalId);
        intervalId = null;
        startBtn.textContent = "再開";
        startBtn.classList.remove("btn-danger");
        startBtn.classList.add("btn-primary");
        lapBtn.disabled = true;
        render();
      }
    });

    lapBtn.addEventListener("click", () => {
      const total = currentElapsed();
      const lapTime = total - lastLapMs;
      lastLapMs = total;
      lapCount += 1;

      const li = document.createElement("li");
      const lapNumber = document.createElement("span");
      lapNumber.className = "lap-number";
      lapNumber.textContent = `#${lapCount}`;
      const lapDuration = document.createElement("span");
      lapDuration.className = "lap-duration";
      lapDuration.textContent = formatHMSC(lapTime);
      const lapTotal = document.createElement("span");
      lapTotal.className = "lap-total";
      lapTotal.textContent = `合計 ${formatHMSC(total)}`;

      li.appendChild(lapNumber);
      li.appendChild(lapDuration);
      li.appendChild(lapTotal);
      lapList.insertBefore(li, lapList.firstChild);
    });

    resetBtn.addEventListener("click", () => {
      running = false;
      startTime = null;
      elapsedMs = 0;
      lapCount = 0;
      lastLapMs = 0;
      clearInterval(intervalId);
      intervalId = null;
      startBtn.textContent = "開始";
      startBtn.classList.remove("btn-danger");
      startBtn.classList.add("btn-primary");
      lapBtn.disabled = true;
      resetBtn.disabled = true;
      lapList.innerHTML = "";
      render();
    });

    render();
  }

  /* ============================================
     ③ ポモドーロ
     ============================================ */
  function initPomodoro() {
    const phaseEl = document.getElementById("pomodoro-phase");
    const display = document.getElementById("pomodoro-display");
    const startBtn = document.getElementById("pomodoro-start");
    const pauseBtn = document.getElementById("pomodoro-pause");
    const resetBtn = document.getElementById("pomodoro-reset");
    const statusEl = document.getElementById("pomodoro-status");
    const countEl = document.getElementById("pomodoro-count");

    if (!display) return;

    const WORK_MS = 25 * 60 * 1000;
    const BREAK_MS = 5 * 60 * 1000;

    let phase = "work"; // "work" | "break"
    let endTime = null;
    let remainingMs = WORK_MS;
    let running = false;
    let intervalId = null;
    let completedSessions = 0;

    function render() {
      display.textContent = formatMS(running ? Math.max(0, endTime - Date.now()) : remainingMs);
      phaseEl.textContent = phase === "work" ? "作業時間" : "休憩時間";
      countEl.textContent = String(completedSessions);
    }

    function tick() {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        switchPhase();
        return;
      }
      display.textContent = formatMS(remaining);
    }

    function switchPhase() {
      playAlarm();
      if (phase === "work") {
        completedSessions += 1;
        phase = "break";
        remainingMs = BREAK_MS;
        statusEl.textContent = "作業完了！休憩しましょう。";
        startTitleFlash("☕ 休憩時間です");
      } else {
        phase = "work";
        remainingMs = WORK_MS;
        statusEl.textContent = "休憩終了。作業を始めましょう。";
        startTitleFlash("🍅 作業時間です");
      }
      endTime = Date.now() + remainingMs;
      render();
    }

    function stopInterval() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    startBtn.addEventListener("click", () => {
      ensureAudioContext();
      stopTitleFlash();
      statusEl.textContent = "";

      if (!running) {
        endTime = Date.now() + remainingMs;
        running = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopInterval();
        intervalId = setInterval(tick, 200);
        tick();
      }
    });

    pauseBtn.addEventListener("click", () => {
      if (!running) return;
      remainingMs = Math.max(0, endTime - Date.now());
      running = false;
      stopInterval();
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      render();
    });

    resetBtn.addEventListener("click", () => {
      stopInterval();
      stopTitleFlash();
      running = false;
      phase = "work";
      remainingMs = WORK_MS;
      completedSessions = 0;
      endTime = null;
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      statusEl.textContent = "";
      render();
    });

    render();
  }

  /* ---------- 起動 ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    applyProState();
    initDevProToggle();
    initTabs();
    initCountdownTimer();
    initStopwatch();
    initPomodoro();
  });

  // 他ファイルから利用できるよう公開
  window.ToolFactory = {
    isPro,
    STORAGE_KEY_PRO,
    STORAGE_KEY_THEME,
  };
})();
