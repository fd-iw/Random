// Core utilities shared by every booth: randomness helpers, storage, toasts,
// synthesized sound effects, confetti, the booth registry and achievements.
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (arr) => arr[rand(arr.length)];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Pick a random item that differs from the previous one.
  function freshPicker(arr) {
    let last = -1;
    return () => {
      let i = rand(arr.length);
      if (arr.length > 1) while (i === last) i = rand(arr.length);
      last = i;
      return arr[i];
    };
  }

  // Restart a CSS animation class on an element.
  function replay(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
    }
  };

  function icons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function copy(text, label) {
    const done = () => toast(`Copied ${label || text}`, "clipboard-check");
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => toast(text, "clipboard"));
    else toast(text, "clipboard");
    sfx.pop();
  }

  /* ---------- Toasts ---------- */
  function toast(message, icon = "sparkles", kind = "") {
    let wrap = $("toasts");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "toasts";
      wrap.className = "toasts";
      wrap.setAttribute("aria-live", "polite");
      document.body.appendChild(wrap);
    }
    const t = document.createElement("div");
    t.className = "toast " + kind;
    const i = document.createElement("i");
    i.setAttribute("data-lucide", icon);
    const span = document.createElement("span");
    span.textContent = message;
    t.append(i, span);
    wrap.appendChild(t);
    icons();
    setTimeout(() => t.classList.add("out"), 2600);
    setTimeout(() => t.remove(), 3000);
  }

  /* ---------- Sound effects (Web Audio, no files) ---------- */
  const sfx = (() => {
    let ctx = null;
    let muted = store.get("emporium-muted", false);
    const ac = () => {
      if (muted) return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    };

    function tone(freq, dur = 0.12, type = "sine", vol = 0.15, slideTo = null, delay = 0) {
      const c = ac();
      if (!c) return;
      const t0 = c.currentTime + delay;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(c.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    }

    function noise(dur = 0.2, vol = 0.1, filterFreq = 1200, delay = 0) {
      const c = ac();
      if (!c) return;
      const t0 = c.currentTime + delay;
      const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = filterFreq;
      const g = c.createGain();
      g.gain.value = vol;
      src.connect(f).connect(g).connect(c.destination);
      src.start(t0);
    }

    return {
      get muted() { return muted; },
      setMuted(m) { muted = m; store.set("emporium-muted", m); },
      tone,
      noise,
      click: () => tone(880, 0.05, "triangle", 0.08),
      pop: () => tone(520, 0.12, "sine", 0.18, 1040),
      tick: () => tone(1500, 0.03, "square", 0.04),
      whoosh: () => noise(0.35, 0.18, 800),
      shake: () => { noise(0.15, 0.15, 400); noise(0.15, 0.15, 500, 0.18); noise(0.15, 0.15, 450, 0.36); },
      crack: () => { noise(0.08, 0.3, 2500); tone(300, 0.1, "square", 0.05, 120); },
      roll: () => { for (let i = 0; i < 6; i++) noise(0.04, 0.2, 1800 + rand(1200), i * 0.06); },
      coin: () => { tone(988, 0.08, "square", 0.08); tone(1319, 0.3, "square", 0.08, null, 0.08); },
      success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "triangle", 0.12, null, i * 0.08)),
      fail: () => { tone(300, 0.18, "sawtooth", 0.08, 200); tone(200, 0.3, "sawtooth", 0.08, 110, 0.18); },
      magic: () => [1047, 1319, 1568, 2093, 1568].forEach((f, i) => tone(f, 0.25, "sine", 0.07, null, i * 0.06)),
      beep: () => tone(660, 0.15, "square", 0.08),
      achievement: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.22, "triangle", 0.12, null, i * 0.1))
    };
  })();

  /* ---------- Confetti ---------- */
  const confetti = (() => {
    let canvas, ctx, parts = [], running = false;
    const colors = ["#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#60a5fa", "#fb7185"];
    const setup = () => {
      canvas = document.createElement("canvas");
      canvas.className = "confetti";
      canvas.setAttribute("aria-hidden", "true");
      document.body.appendChild(canvas);
      ctx = canvas.getContext("2d");
      const size = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
      addEventListener("resize", size);
      size();
    };
    const frame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts = parts.filter((p) => p.y < canvas.height + 20 && p.life-- > 0);
      for (const p of parts) {
        p.vy += 0.18; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (parts.length) requestAnimationFrame(frame);
      else { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
    };
    return function burst(x = innerWidth / 2, y = innerHeight / 3, count = 120) {
      if (reducedMotion) return;
      if (!canvas) setup();
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 4 + Math.random() * 9;
        parts.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 5,
          w: 6 + Math.random() * 6, h: 4 + Math.random() * 6,
          r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
          c: pick(colors), life: 220
        });
      }
      if (!running) { running = true; requestAnimationFrame(frame); }
    };
  })();

  // Confetti from the centre of an element.
  function burstFrom(el, count) {
    const r = el.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top + r.height / 2, count);
  }

  /* ---------- Achievements ---------- */
  const ACHIEVEMENTS = {
    first: { title: "Hello, Chaos", desc: "Interact with your first booth", icon: "hand" },
    five: { title: "Window Shopper", desc: "Try 5 different booths", icon: "store" },
    fifteen: { title: "Regular Customer", desc: "Try 15 different booths", icon: "shopping-bag" },
    all: { title: "Emporium Completionist", desc: "Try every single booth", icon: "trophy" },
    clicks100: { title: "Button Enthusiast", desc: "Click 100 times", icon: "mouse-pointer-click" },
    clicks500: { title: "Clicking Machine", desc: "Click 500 times", icon: "cpu" },
    rpsStreak: { title: "Machine Slayer", desc: "Beat the computer 3 times in a row at RPS", icon: "swords" },
    fastHands: { title: "Fast Hands", desc: "React in under 250 ms", icon: "zap" },
    palette: { title: "Power User", desc: "Open the command palette", icon: "command" },
    konami: { title: "Cheat Code", desc: "Enter the Konami code", icon: "gamepad-2" },
    night: { title: "Night Owl", desc: "Switch the theme", icon: "moon-star" },
    jackpot: { title: "Jackpot", desc: "Roll a natural 20", icon: "gem" },
    streak5: { title: "Card Shark", desc: "Get a 5 streak in Higher or Lower", icon: "spade" },
    surprise10: { title: "Thrill Seeker", desc: "Press Surprise me 10 times", icon: "shuffle" },
    maestro: { title: "Maestro", desc: "Compose a melody", icon: "music" }
  };
  let unlocked = store.get("emporium-achievements", {});
  const achListeners = [];
  function unlock(key) {
    if (unlocked[key] || !ACHIEVEMENTS[key]) return;
    unlocked[key] = Date.now();
    store.set("emporium-achievements", unlocked);
    const a = ACHIEVEMENTS[key];
    toast(`Achievement unlocked: ${a.title}`, a.icon, "gold");
    sfx.achievement();
    confetti(innerWidth - 160, innerHeight - 80, 60);
    achListeners.forEach((fn) => fn());
  }

  /* ---------- Booth registry + stats ---------- */
  const booths = [];
  const stats = store.get("emporium-stats", { clicks: 0, booths: {} });
  const statListeners = [];
  function recordUse(id) {
    stats.clicks++;
    stats.booths[id] = (stats.booths[id] || 0) + 1;
    store.set("emporium-stats", stats);
    const tried = Object.keys(stats.booths).length;
    unlock("first");
    if (tried >= 5) unlock("five");
    if (tried >= 15) unlock("fifteen");
    if (booths.length && booths.every((b) => stats.booths[b.id])) unlock("all");
    if (stats.clicks >= 100) unlock("clicks100");
    if (stats.clicks >= 500) unlock("clicks500");
    statListeners.forEach((fn) => fn());
  }

  window.Emporium = {
    D: window.EMPORIUM_DATA,
    $, rand, pick, freshPicker, replay, store, icons, copy, reducedMotion,
    toast, sfx, confetti, burstFrom,
    ACHIEVEMENTS, unlock, get unlocked() { return unlocked; }, onAchievement: (fn) => achListeners.push(fn),
    booths, stats, recordUse, onStats: (fn) => statListeners.push(fn)
  };
})();
