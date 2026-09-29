(function () {
  "use strict";

  const D = window.EMPORIUM_DATA;
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

  /* ---------- Theme ---------- */
  function initTheme() {
    const btn = $("themeToggle");
    const saved = store.get("emporium-theme", null);
    if (saved) document.documentElement.dataset.theme = saved;
    const isDark = () => {
      const t = document.documentElement.dataset.theme;
      if (t) return t === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    };
    const sync = () => { btn.textContent = isDark() ? "☀️" : "🌙"; };
    btn.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      store.set("emporium-theme", next);
      sync();
    });
    sync();
  }

  /* ---------- Visitor counter (fake) ---------- */
  function initVisitor() {
    const el = $("visitorCount");
    let n = 100000 + rand(900000);
    el.textContent = n.toLocaleString();
    setInterval(() => {
      n += rand(4);
      el.textContent = n.toLocaleString();
    }, 2500);
  }

  /* ---------- Facts ---------- */
  function initFacts() {
    const next = freshPicker(D.facts);
    $("factBtn").addEventListener("click", () => { $("factOut").textContent = next(); });
  }

  /* ---------- Fortune ---------- */
  function initFortune() {
    const next = freshPicker(D.fortunes);
    const cookie = $("cookie");
    cookie.addEventListener("click", () => {
      replay(cookie, "cracked");
      const nums = new Set();
      while (nums.size < 6) nums.add(1 + rand(49));
      $("fortuneText").textContent = next();
      $("luckyNums").textContent = [...nums].sort((a, b) => a - b).join(", ");
      $("fortuneOut").hidden = false;
    });
  }

  /* ---------- 8 ball ---------- */
  function initEightBall() {
    const ball = $("ball");
    const out = $("ballOut");
    $("ballForm").addEventListener("submit", (e) => {
      e.preventDefault();
      out.textContent = "…";
      replay(ball, "shaking");
      setTimeout(() => {
        const q = $("question").value.trim();
        out.textContent = q ? pick(D.eightBall) : "Ask something first!";
      }, reducedMotion ? 0 : 600);
    });
  }

  /* ---------- Excuses ---------- */
  function initExcuses() {
    const { who, did, what } = D.excuses;
    const openers = ["Sorry, I can't make it:", "I'm running late because", "My homework is missing because", "I missed the meeting because"];
    $("excuseBtn").addEventListener("click", () => {
      $("excuseOut").textContent = `${pick(openers)} ${pick(who)} ${pick(did)} ${pick(what)}.`;
    });
  }

  /* ---------- Names ---------- */
  function initNames() {
    const out = $("nameOut");
    const generate = () => {
      const mode = document.querySelector('input[name="nameMode"]:checked').value;
      const set = D.names[mode];
      const prefix = mode === "band" && Math.random() < 0.4 ? "The " : "";
      out.textContent = `${prefix}${pick(set.a)} ${pick(set.b)}`;
    };
    $("nameBtn").addEventListener("click", generate);
    document.querySelectorAll('input[name="nameMode"]').forEach((r) => r.addEventListener("change", generate));
  }

  /* ---------- Palette ---------- */
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return "#" + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
  }

  function initPalette() {
    const wrap = $("swatches");
    const hint = $("paletteHint");
    const schemes = [
      (h) => [0, 30, 60, 90, 120].map((d) => [(h + d) % 360, 65, 60]),          // analogous
      (h) => [0, 0, 180, 180, 0].map((d, i) => [(h + d) % 360, 70, 30 + i * 12]), // complementary
      (h) => [0, 120, 240, 60, 300].map((d) => [(h + d) % 360, 70, 58]),         // triadic-ish
      (h) => [20, 35, 50, 65, 80].map((l) => [h, 55, l])                         // monochrome
    ];
    const build = () => {
      wrap.innerHTML = "";
      const colors = pick(schemes)(rand(360));
      colors.forEach(([h, s, l]) => {
        const hex = hslToHex(h, s, l);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "swatch";
        b.style.background = hex;
        b.style.color = l > 55 ? "#1f1d2b" : "#fff";
        b.textContent = hex;
        b.setAttribute("aria-label", `Copy ${hex}`);
        b.addEventListener("click", () => {
          const done = () => { hint.textContent = `Copied ${hex}!`; };
          if (navigator.clipboard) navigator.clipboard.writeText(hex).then(done, () => { hint.textContent = hex; });
          else hint.textContent = hex;
        });
        wrap.appendChild(b);
      });
    };
    $("paletteBtn").addEventListener("click", build);
    build();
  }

  /* ---------- Dice ---------- */
  function initDice() {
    const out = $("dieOut");
    const hist = [];
    const show = (val, label) => {
      out.textContent = val;
      replay(out, "rolling");
      hist.unshift(label);
      if (hist.length > 8) hist.pop();
      $("diceHistory").textContent = "History: " + hist.join(", ");
    };
    $("rollBtn").addEventListener("click", () => {
      const sides = Number($("dieType").value);
      const v = 1 + rand(sides);
      show(v, `d${sides}:${v}`);
    });
    $("coinBtn").addEventListener("click", () => {
      const heads = Math.random() < 0.5;
      show(heads ? "H" : "T", heads ? "Heads" : "Tails");
    });
  }

  /* ---------- Rock paper scissors ---------- */
  function initRps() {
    const moves = ["rock", "paper", "scissors"];
    const icon = { rock: "🪨", paper: "📄", scissors: "✂️" };
    const beats = { rock: "scissors", paper: "rock", scissors: "paper" };
    const score = { you: 0, tie: 0, cpu: 0 };
    const taunts = {
      win: ["You win! The computer is filing a complaint.", "Victory! Humanity prevails.", "You win. Enjoy it while it lasts."],
      lose: ["Computer wins. Beep boop.", "You lose. The machines are learning.", "Defeat. Try thinking like a toaster."],
      tie: ["A tie! Great minds.", "Tie. Spooky.", "Tie. Are you reading its mind?"]
    };
    const play = (you) => {
      const cpu = pick(moves);
      let result;
      if (you === cpu) { result = "tie"; score.tie++; }
      else if (beats[you] === cpu) { result = "win"; score.you++; }
      else { result = "lose"; score.cpu++; }
      $("rpsOut").textContent = `${icon[you]} vs ${icon[cpu]}: ${pick(taunts[result])}`;
      $("rpsYou").textContent = score.you;
      $("rpsTie").textContent = score.tie;
      $("rpsCpu").textContent = score.cpu;
    };
    document.querySelectorAll("[data-move]").forEach((b) => b.addEventListener("click", () => play(b.dataset.move)));
    $("rpsRandom").addEventListener("click", () => play(pick(moves)));
  }

  /* ---------- Pixel doodle ---------- */
  function initDoodle() {
    const N = 16;
    const grid = $("pixels");
    const pens = $("pens");
    const colors = ["#1f1d2b", "#e8455b", "#f48c06", "#f4b400", "#2fbf71", "#2a7de1", "#8f5bd8", "#ff8fb1", "#7a4b2a", "#9aa0a6", "#ffffff", "transparent"];
    let pen = colors[1];
    let painting = false;
    const cells = [];

    colors.forEach((c, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pen";
      b.style.background = c === "transparent"
        ? "repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 12px 12px"
        : c;
      b.setAttribute("aria-label", c === "transparent" ? "Eraser" : `Color ${c}`);
      b.setAttribute("aria-pressed", String(i === 1));
      b.addEventListener("click", () => {
        pen = c;
        pens.querySelectorAll(".pen").forEach((p) => p.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
      });
      pens.appendChild(b);
    });

    for (let i = 0; i < N * N; i++) {
      const cell = document.createElement("div");
      cell.className = "pixel";
      cells.push(cell);
      grid.appendChild(cell);
    }

    const paintAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      if (el && el.classList.contains("pixel")) el.style.background = pen;
    };
    grid.addEventListener("pointerdown", (e) => { painting = true; paintAt(e.clientX, e.clientY); });
    grid.addEventListener("pointermove", (e) => { if (painting) paintAt(e.clientX, e.clientY); });
    window.addEventListener("pointerup", () => { painting = false; });

    const palette = () => colors.slice(0, 10);
    $("doodleRandom").addEventListener("click", () => {
      const p = [pick(palette()), pick(palette()), pick(palette())];
      cells.forEach((c) => { c.style.background = Math.random() < 0.45 ? pick(p) : "transparent"; });
    });
    $("doodleSym").addEventListener("click", () => {
      // Random "space invader" style sprite mirrored left-to-right.
      const fg = pick(palette().slice(1));
      const fg2 = pick(palette());
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N / 2; x++) {
          const r = Math.random();
          const c = r < 0.4 ? fg : r < 0.5 ? fg2 : "transparent";
          cells[y * N + x].style.background = c;
          cells[y * N + (N - 1 - x)].style.background = c;
        }
      }
    });
    $("doodleClear").addEventListener("click", () => cells.forEach((c) => { c.style.background = "transparent"; }));
  }

  /* ---------- Emoji pit ---------- */
  function initEmojiPit() {
    const canvas = $("emojiCanvas");
    const ctx = canvas.getContext("2d");
    const items = [];
    const MAX = 150;
    let w = 0, h = 0, dpr = 1;

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const add = (x, y) => {
      if (items.length >= MAX) items.shift();
      const size = 22 + rand(22);
      items.push({
        x: x ?? size + Math.random() * Math.max(1, w - size * 2),
        y: y ?? size,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 4,
        r: size / 2,
        size,
        e: pick(D.emojis),
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.1
      });
    };

    const step = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const p of items) {
        p.vy += 0.25;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.y + p.r > h) { p.y = h - p.r; p.vy *= -0.72; p.vx *= 0.98; p.vr *= 0.95; }
        if (p.y - p.r < 0) { p.y = p.r; p.vy *= -0.72; }
        if (p.x - p.r < 0) { p.x = p.r; p.vx *= -0.9; }
        if (p.x + p.r > w) { p.x = w - p.r; p.vx *= -0.9; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.font = `${p.size}px serif`;
        ctx.fillText(p.e, 0, 0);
        ctx.restore();
      }
      requestAnimationFrame(step);
    };

    canvas.addEventListener("click", (e) => {
      const r = canvas.getBoundingClientRect();
      for (let i = 0; i < 3; i++) add(e.clientX - r.left, e.clientY - r.top);
    });
    $("emojiAdd").addEventListener("click", () => { for (let i = 0; i < 5; i++) add(); });
    $("emojiShake").addEventListener("click", () => {
      items.forEach((p) => { p.vy -= 8 + Math.random() * 8; p.vx += (Math.random() - 0.5) * 14; p.vr += (Math.random() - 0.5) * 0.4; });
    });
    $("emojiClear").addEventListener("click", () => { items.length = 0; });

    window.addEventListener("resize", resize);
    resize();
    for (let i = 0; i < 12; i++) add();
    requestAnimationFrame(step);
  }

  /* ---------- Reaction tester ---------- */
  function initReaction() {
    const pad = $("reactionPad");
    let state = "idle";
    let timer = null;
    let start = 0;
    let best = store.get("emporium-best-reaction", null);
    const showBest = () => { $("reactionBest").textContent = best ? `Best: ${best} ms` : "Best: —"; };
    const set = (s, text) => { state = s; pad.className = "reaction-pad " + s; pad.textContent = text; };

    pad.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (state === "idle" || state === "result") {
        set("wait", "Wait for green…");
        timer = setTimeout(() => { set("go", "CLICK!"); start = performance.now(); }, 1200 + Math.random() * 2800);
      } else if (state === "wait") {
        clearTimeout(timer);
        set("result", "Too soon! Click to try again.");
      } else if (state === "go") {
        const ms = Math.round(performance.now() - start);
        if (!best || ms < best) { best = ms; store.set("emporium-best-reaction", best); }
        const verdict = ms < 200 ? "Lightning! ⚡" : ms < 280 ? "Nice reflexes." : ms < 400 ? "Not bad." : "Sleepy sloth. 🦥";
        set("result", `${ms} ms. ${verdict} Click to go again.`);
        showBest();
      }
    });
    // Keyboard users: Enter/Space fires a click without pointerdown.
    pad.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pad.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      }
    });
    showBest();
  }

  /* ---------- Word ---------- */
  function initWord() {
    const next = freshPicker(D.words);
    const show = () => {
      const w = next();
      $("wordOut").textContent = w.word;
      $("wordType").textContent = w.type;
      $("wordDef").textContent = w.def;
    };
    $("wordBtn").addEventListener("click", show);
    show();
  }

  /* ---------- Guestbook ---------- */
  function initGuestbook() {
    const KEY = "emporium-guestbook";
    const list = $("guestList");
    let entries = store.get(KEY, null);
    if (!Array.isArray(entries)) {
      entries = [
        { name: "A Suspicious Pigeon", msg: "coo. 10/10 would peck again.", t: Date.now() - 86400000 * 3 },
        { name: "Anonymous Wizard", msg: "Rolled a d20 here and got a 1. Blaming the website.", t: Date.now() - 86400000 }
      ];
    }
    const render = () => {
      list.innerHTML = "";
      entries.slice().reverse().forEach((en) => {
        const li = document.createElement("li");
        const who = document.createElement("span");
        who.className = "who";
        who.textContent = en.name;
        const when = document.createElement("span");
        when.className = "when";
        when.textContent = new Date(en.t).toLocaleDateString();
        const msg = document.createElement("div");
        msg.textContent = en.msg;
        li.append(who, when, msg);
        list.appendChild(li);
      });
    };
    $("guestForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = $("guestMsg").value.trim();
      if (!msg) return;
      const name = $("guestName").value.trim() || pick(D.names.pet.a) + " " + pick(D.names.pet.b);
      entries.push({ name, msg, t: Date.now() });
      if (entries.length > 50) entries.shift();
      store.set(KEY, entries);
      $("guestMsg").value = "";
      render();
    });
    render();
  }

  /* ---------- Surprise me ---------- */
  function initSurprise() {
    const booths = [...document.querySelectorAll(".booth[data-trigger]")];
    let last = null;
    $("surpriseBtn").addEventListener("click", () => {
      let b;
      do { b = pick(booths); } while (booths.length > 1 && b === last);
      last = b;
      b.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      replay(b, "flash");
      const trigger = $(b.dataset.trigger);
      if (b.id === "eightball") {
        const q = $("question");
        if (!q.value) q.value = pick(["Will today be random?", "Should I eat a snack?", "Is the cake a lie?"]);
        $("ballForm").requestSubmit();
      } else if (b.id === "reaction") {
        // Don't auto-start a timing test; just draw attention to it.
      } else if (trigger) {
        trigger.click();
      }
    });
  }

  /* ---------- Footer ---------- */
  function initFooter() {
    const lines = [
      "Random tip: Press the 🎲 button in the corner.",
      "Random tip: Nothing on this page is saved to any server.",
      "Random tip: The emoji pit accepts clicks.",
      "Random tip: A d20 has 20 sides. You're welcome."
    ];
    $("footerQuote").textContent = pick(lines);
  }

  initTheme();
  initVisitor();
  initFacts();
  initFortune();
  initEightBall();
  initExcuses();
  initNames();
  initPalette();
  initDice();
  initRps();
  initDoodle();
  initEmojiPit();
  initReaction();
  initWord();
  initGuestbook();
  initSurprise();
  initFooter();
})();
