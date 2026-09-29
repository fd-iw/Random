// The original v1 booths, restyled for v2 and wired to sound effects.
(function () {
  "use strict";
  const { D, $, rand, pick, freshPicker, replay, store, copy, sfx, burstFrom, unlock, toast, reducedMotion } = window.Emporium;

  /* ---------- Facts ---------- */
  function initFacts() {
    const next = freshPicker(D.facts);
    $("factBtn").addEventListener("click", () => { $("factOut").textContent = next(); sfx.pop(); });
  }

  /* ---------- Fortune ---------- */
  function initFortune() {
    const next = freshPicker(D.fortunes);
    const cookie = $("cookie");
    cookie.addEventListener("click", () => {
      replay(cookie, "cracked");
      sfx.crack();
      const nums = new Set();
      while (nums.size < 6) nums.add(1 + rand(49));
      $("fortuneText").textContent = next();
      $("luckyNums").textContent = [...nums].sort((a, b) => a - b).join(" · ");
      $("fortuneOut").hidden = false;
      setTimeout(sfx.magic, 150);
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
      sfx.shake();
      setTimeout(() => {
        const q = $("question").value.trim();
        out.textContent = q ? pick(D.eightBall) : "Ask something first!";
        if (q) sfx.magic(); else sfx.fail();
      }, reducedMotion ? 0 : 600);
    });
  }

  /* ---------- Excuses ---------- */
  function initExcuses() {
    const { who, did, what } = D.excuses;
    const openers = ["Sorry, I can't make it:", "I'm running late because", "My homework is missing because", "I missed the meeting because"];
    $("excuseBtn").addEventListener("click", () => {
      $("excuseOut").textContent = `${pick(openers)} ${pick(who)} ${pick(did)} ${pick(what)}.`;
      sfx.pop();
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
      sfx.pop();
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
  window.Emporium.hslToHex = hslToHex;

  function initPalette() {
    const wrap = $("swatches");
    const schemes = [
      (h) => [0, 30, 60, 90, 120].map((d) => [(h + d) % 360, 65, 60]),
      (h) => [0, 0, 180, 180, 0].map((d, i) => [(h + d) % 360, 70, 30 + i * 12]),
      (h) => [0, 120, 240, 60, 300].map((d) => [(h + d) % 360, 70, 58]),
      (h) => [20, 35, 50, 65, 80].map((l) => [h, 55, l])
    ];
    const build = (silent) => {
      wrap.innerHTML = "";
      pick(schemes)(rand(360)).forEach(([h, s, l]) => {
        const hex = hslToHex(h, s, l);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "swatch mono";
        b.style.background = hex;
        b.style.color = l > 55 ? "#111" : "#fff";
        b.textContent = hex;
        b.setAttribute("aria-label", `Copy ${hex}`);
        b.addEventListener("click", () => copy(hex));
        wrap.appendChild(b);
      });
      if (!silent) sfx.whoosh();
    };
    $("paletteBtn").addEventListener("click", () => build());
    build(true);
  }

  /* ---------- Dice ---------- */
  function initDice() {
    const out = $("dieOut");
    const hist = [];
    const show = (val, label) => {
      out.textContent = val;
      replay(out, "rolling");
      hist.unshift(label);
      if (hist.length > 6) hist.pop();
      $("diceHistory").textContent = "History: " + hist.join(" · ");
    };
    $("rollBtn").addEventListener("click", () => {
      const sides = Number($("dieType").value);
      const v = 1 + rand(sides);
      sfx.roll();
      show(v, `d${sides}→${v}`);
      if (sides === 20 && v === 20) {
        setTimeout(() => { sfx.success(); burstFrom(out, 100); toast("NATURAL 20!", "gem", "gold"); unlock("jackpot"); }, 350);
      }
    });
    $("coinBtn").addEventListener("click", () => {
      const heads = Math.random() < 0.5;
      sfx.coin();
      show(heads ? "H" : "T", heads ? "Heads" : "Tails");
    });
  }

  /* ---------- Rock paper scissors ---------- */
  function initRps() {
    const moves = ["rock", "paper", "scissors"];
    const label = { rock: "Rock", paper: "Paper", scissors: "Scissors" };
    const beats = { rock: "scissors", paper: "rock", scissors: "paper" };
    const score = { you: 0, tie: 0, cpu: 0 };
    let streak = 0;
    const taunts = {
      win: ["You win! The computer is filing a complaint.", "Victory! Humanity prevails.", "You win. Enjoy it while it lasts."],
      lose: ["Computer wins. Beep boop.", "You lose. The machines are learning.", "Defeat. Try thinking like a toaster."],
      tie: ["A tie! Great minds.", "Tie. Spooky.", "Tie. Are you reading its mind?"]
    };
    const play = (you) => {
      const cpu = pick(moves);
      let result;
      if (you === cpu) { result = "tie"; score.tie++; sfx.beep(); }
      else if (beats[you] === cpu) { result = "win"; score.you++; streak++; sfx.success(); }
      else { result = "lose"; score.cpu++; streak = 0; sfx.fail(); }
      if (result === "win" && streak >= 3) { unlock("rpsStreak"); burstFrom($("rpsOut"), 60); }
      $("rpsOut").textContent = `${label[you]} vs ${label[cpu]}: ${pick(taunts[result])}`;
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
    const colors = ["#0f0e17", "#f472b6", "#fb923c", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#fda4af", "#92400e", "#94a3b8", "#ffffff", "transparent"];
    let pen = colors[1];
    let painting = false;
    let lastCell = null;
    const cells = [];

    colors.forEach((c, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pen";
      b.style.background = c === "transparent" ? "repeating-conic-gradient(#999 0 25%, #fff 0 50%) 0 0 / 12px 12px" : c;
      b.setAttribute("aria-label", c === "transparent" ? "Eraser" : `Color ${c}`);
      b.setAttribute("aria-pressed", String(i === 1));
      b.addEventListener("click", () => {
        pen = c;
        pens.querySelectorAll(".pen").forEach((p) => p.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        sfx.click();
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
      if (el && el.classList.contains("pixel") && el !== lastCell) {
        el.style.background = pen;
        lastCell = el;
        sfx.tone(300 + cells.indexOf(el) * 3, 0.04, "square", 0.03);
      }
    };
    grid.addEventListener("pointerdown", (e) => { painting = true; lastCell = null; paintAt(e.clientX, e.clientY); });
    grid.addEventListener("pointermove", (e) => { if (painting) paintAt(e.clientX, e.clientY); });
    window.addEventListener("pointerup", () => { painting = false; });

    const palette = colors.slice(0, 10);
    $("doodleRandom").addEventListener("click", () => {
      const p = [pick(palette), pick(palette), pick(palette)];
      cells.forEach((c) => { c.style.background = Math.random() < 0.45 ? pick(p) : "transparent"; });
      sfx.whoosh();
    });
    $("doodleSym").addEventListener("click", () => {
      const fg = pick(palette.slice(1));
      const fg2 = pick(palette);
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N / 2; x++) {
          const r = Math.random();
          const c = r < 0.4 ? fg : r < 0.5 ? fg2 : "transparent";
          cells[y * N + x].style.background = c;
          cells[y * N + (N - 1 - x)].style.background = c;
        }
      }
      sfx.magic();
    });
    $("doodleClear").addEventListener("click", () => { cells.forEach((c) => { c.style.background = "transparent"; }); sfx.whoosh(); });
  }

  /* ---------- Emoji pit ---------- */
  function initEmojiPit() {
    const canvas = $("emojiCanvas");
    const ctx = canvas.getContext("2d");
    const items = [];
    const MAX = 150;
    let w = 0, h = 0;
    let visible = true; // updated by an IntersectionObserver below

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const add = (x, y) => {
      if (items.length >= MAX) items.shift();
      const size = 24 + rand(24);
      items.push({
        x: x ?? size + Math.random() * Math.max(1, w - size * 2),
        y: y ?? size,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 4,
        r: size / 2, size, e: pick(D.emojis),
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.1
      });
    };

    const step = () => {
      if (visible) {
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
      }
      requestAnimationFrame(step);
    };

    new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(canvas);
    canvas.addEventListener("click", (e) => {
      const r = canvas.getBoundingClientRect();
      for (let i = 0; i < 3; i++) add(e.clientX - r.left, e.clientY - r.top);
      sfx.pop();
    });
    $("emojiAdd").addEventListener("click", () => { for (let i = 0; i < 5; i++) add(); sfx.pop(); });
    $("emojiShake").addEventListener("click", () => {
      items.forEach((p) => { p.vy -= 8 + Math.random() * 8; p.vx += (Math.random() - 0.5) * 14; p.vr += (Math.random() - 0.5) * 0.4; });
      sfx.tone(60, 0.6, "sawtooth", 0.15, 30);
      sfx.noise(0.6, 0.2, 200);
    });
    $("emojiClear").addEventListener("click", () => { items.length = 0; sfx.whoosh(); });

    window.addEventListener("resize", resize);
    resize();
    for (let i = 0; i < 14; i++) add();
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

    const press = () => {
      if (state === "idle" || state === "result") {
        set("wait", "Wait for green…");
        sfx.click();
        timer = setTimeout(() => { set("go", "CLICK!"); sfx.beep(); start = performance.now(); }, 1200 + Math.random() * 2800);
      } else if (state === "wait") {
        clearTimeout(timer);
        set("result", "Too soon! Click to try again.");
        sfx.fail();
      } else if (state === "go") {
        const ms = Math.round(performance.now() - start);
        const isBest = !best || ms < best;
        if (isBest) { best = ms; store.set("emporium-best-reaction", best); }
        if (ms < 250) unlock("fastHands");
        const verdict = ms < 200 ? "Lightning!" : ms < 280 ? "Nice reflexes." : ms < 400 ? "Not bad." : "Sleepy sloth.";
        set("result", `${ms} ms. ${verdict} Click to go again.`);
        if (isBest) { sfx.success(); burstFrom(pad, 50); } else sfx.pop();
        showBest();
      }
    };
    pad.addEventListener("pointerdown", (e) => { e.preventDefault(); press(); });
    pad.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); press(); }
    });
    showBest();
  }

  /* ---------- Word ---------- */
  function initWord() {
    const next = freshPicker(D.words);
    const show = (silent) => {
      const w = next();
      $("wordOut").textContent = w.word;
      $("wordType").textContent = w.type;
      $("wordDef").textContent = w.def;
      if (!silent) sfx.pop();
    };
    $("wordBtn").addEventListener("click", () => show());
    show(true);
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
        const av = document.createElement("span");
        av.className = "avatar";
        av.textContent = (en.name.trim()[0] || "?").toUpperCase();
        av.style.background = `hsl(${[...en.name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360} 70% 60%)`;
        const body = document.createElement("div");
        const head = document.createElement("div");
        const who = document.createElement("span");
        who.className = "who";
        who.textContent = en.name;
        const when = document.createElement("span");
        when.className = "when mono";
        when.textContent = new Date(en.t).toLocaleDateString();
        head.append(who, when);
        const msg = document.createElement("div");
        msg.textContent = en.msg;
        body.append(head, msg);
        li.append(av, body);
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
      sfx.success();
      toast("Signed the guestbook", "notebook-pen");
    });
    render();
  }

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
})();
