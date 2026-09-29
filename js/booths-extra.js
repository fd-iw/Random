// New v2 booths: generators, games, generative art, music and mysticism.
(function () {
  "use strict";
  const E = window.Emporium;
  const { D, $, rand, pick, freshPicker, replay, store, copy, sfx, confetti, burstFrom, unlock, toast, icons, reducedMotion } = E;

  // Small seeded PRNG so artworks can show a reproducible seed.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /* ---------- Startup ideas ---------- */
  function initStartup() {
    const { a, b, c } = D.startup;
    $("startupBtn").addEventListener("click", () => {
      $("startupOut").textContent = `It's ${pick(a)} for ${pick(b)}, ${pick(c)}.`;
      const val = (1 + rand(999)) * (Math.random() < 0.3 ? 1000 : 1);
      const round = pick(["Pre-seed", "Seed", "Series A", "Series B", "Series F"]);
      $("startupVal").textContent = `${round} · $${val >= 1000 ? (val / 1000).toFixed(1) + "B" : val + "M"} valuation · ${rand(3) === 0 ? "0" : 1 + rand(40)} users`;
      sfx.coin();
    });
  }

  /* ---------- Superpower ---------- */
  function initSuperpower() {
    $("powerBtn").addEventListener("click", () => {
      $("powerOut").textContent = pick(D.superpowers) + "…";
      $("powerCatch").textContent = pick(D.drawbacks) + ".";
      sfx.magic();
    });
  }

  /* ---------- Haiku ---------- */
  function initHaiku() {
    $("haikuBtn").addEventListener("click", () => {
      const l1 = pick(D.haiku.five);
      let l3 = pick(D.haiku.five);
      while (l3 === l1) l3 = pick(D.haiku.five);
      const out = $("haikuOut");
      out.innerHTML = "";
      [l1, pick(D.haiku.seven), l3].forEach((line, i) => {
        const s = document.createElement("span");
        s.textContent = line;
        s.style.animationDelay = `${i * 0.15}s`;
        out.appendChild(s);
        sfx.tone(523 * [1, 1.25, 1.5][i], 0.3, "sine", 0.08, null, i * 0.15);
      });
    });
  }

  /* ---------- Insult ---------- */
  function initInsult() {
    const { a, b, c } = D.insults;
    $("insultBtn").addEventListener("click", () => {
      const first = pick(a);
      const art = /^[aeiou]/.test(first) ? "an" : "a";
      $("insultOut").textContent = `Thou art ${art} ${first}, ${pick(b)} ${pick(c)}!`;
      sfx.tone(196, 0.25, "sawtooth", 0.07, 147);
    });
  }

  /* ---------- Recipe ---------- */
  function initRecipe() {
    const r = D.recipe;
    $("recipeBtn").addEventListener("click", () => {
      const base = pick(r.base);
      const adds = [pick(r.add)];
      let second = pick(r.add);
      while (second === adds[0]) second = pick(r.add);
      adds.push(second);
      const baseName = base.replace(/^(a |an |a whole |a single )/, "");
      $("recipeName").textContent = `${baseName[0].toUpperCase() + baseName.slice(1)} ${pick(r.name)}`;
      const ol = $("recipeOut");
      ol.innerHTML = "";
      const method = pick(r.method);
      [`Take ${base}.`, `Add ${adds[0]} and ${adds[1]}.`, `${method[0].toUpperCase()}${method.slice(1)}.`, `Garnish with ${pick(r.add)}. Serves ${1 + rand(4)}.`]
        .forEach((step) => { const li = document.createElement("li"); li.textContent = step; ol.appendChild(li); });
      sfx.tone(700, 0.08, "sine", 0.1); sfx.tone(900, 0.12, "sine", 0.1, null, 0.08);
    });
  }

  /* ---------- Passphrase ---------- */
  function initPassphrase() {
    const words = D.passphraseWords;
    const len = $("passLen");
    const secureInt = (n) => {
      const buf = new Uint32Array(1);
      // Rejection sampling avoids modulo bias.
      const limit = Math.floor(0x100000000 / n) * n;
      do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
      return buf[0] % n;
    };
    const gen = (silent) => {
      const n = Number(len.value);
      const parts = Array.from({ length: n }, () => words[secureInt(words.length)]);
      const phrase = parts.join("-") + "-" + secureInt(100);
      $("passOut").textContent = phrase;
      const bits = n * Math.log2(words.length) + Math.log2(100);
      const rating = bits < 40 ? "weak-ish" : bits < 60 ? "decent" : "strong";
      $("passEntropy").textContent = `≈ ${bits.toFixed(0)} bits of entropy · ${rating}`;
      if (!silent) sfx.tick();
    };
    len.addEventListener("input", () => { $("passLenOut").textContent = len.value; gen(); });
    $("passBtn").addEventListener("click", () => gen());
    $("passCopy").addEventListener("click", () => copy($("passOut").textContent, "passphrase"));
    gen(true);
  }

  /* ---------- Lorem ---------- */
  function initLorem() {
    const gen = (silent) => {
      const mode = document.querySelector('input[name="loremMode"]:checked').value;
      const src = D.lorem[mode];
      const sentences = [];
      for (let s = 0; s < 4 + rand(3); s++) {
        const words = Array.from({ length: 5 + rand(7) }, () => pick(src)).join(" ");
        sentences.push(words[0].toUpperCase() + words.slice(1) + pick([".", ".", ".", "!", "?"]));
      }
      $("loremOut").textContent = sentences.join(" ");
      if (!silent) sfx.whoosh();
    };
    $("loremBtn").addEventListener("click", () => gen());
    $("loremCopy").addEventListener("click", () => copy($("loremOut").textContent, "lorem ipsum"));
    document.querySelectorAll('input[name="loremMode"]').forEach((r) => r.addEventListener("change", () => gen()));
    gen(true);
  }

  /* ---------- Wheel of fortune ---------- */
  function initWheel() {
    const canvas = $("wheelCanvas");
    const ctx = canvas.getContext("2d");
    const ta = $("wheelEntries");
    const S = canvas.width;
    const colors = ["#a78bfa", "#f472b6", "#fb923c", "#fbbf24", "#34d399", "#22d3ee", "#60a5fa", "#e879f9"];
    let angle = 0;
    let spinning = false;
    const entries = () => ta.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 24);

    const draw = () => {
      const items = entries();
      const n = Math.max(items.length, 1);
      const seg = (Math.PI * 2) / n;
      const r = S / 2 - 8;
      ctx.clearRect(0, 0, S, S);
      ctx.save();
      ctx.translate(S / 2, S / 2);
      for (let i = 0; i < n; i++) {
        const a0 = angle + i * seg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, a0, a0 + seg);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        if (n % colors.length === 1 && i === n - 1) ctx.fillStyle = colors[3];
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,.25)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.save();
        ctx.rotate(a0 + seg / 2);
        ctx.fillStyle = "#12101e";
        ctx.font = "600 26px Inter, system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        const label = (items[i] || "Add slices!").slice(0, 16);
        ctx.fillText(label, r - 24, 0);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.stroke();
      ctx.restore();
    };

    const indexAtPointer = (n) => {
      const seg = (Math.PI * 2) / n;
      const pointer = Math.PI * 1.5; // top of the wheel
      const rel = (((pointer - angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      return Math.floor(rel / seg);
    };

    $("wheelSpin").addEventListener("click", () => {
      const items = entries();
      if (spinning) return;
      if (items.length < 2) { toast("Add at least two slices", "circle-alert"); sfx.fail(); return; }
      spinning = true;
      const start = angle;
      const total = Math.PI * 2 * (5 + Math.random() * 4) + Math.random() * Math.PI * 2;
      const dur = reducedMotion ? 10 : 4200;
      const t0 = performance.now();
      let lastIdx = indexAtPointer(items.length);
      $("wheelOut").textContent = "Spinning…";
      const frame = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - t, 4);
        angle = start + total * eased;
        draw();
        const idx = indexAtPointer(items.length);
        if (idx !== lastIdx) { sfx.tick(); lastIdx = idx; }
        if (t < 1) requestAnimationFrame(frame);
        else {
          spinning = false;
          const winner = items[indexAtPointer(items.length)];
          $("wheelOut").textContent = `The wheel has chosen: ${winner}!`;
          sfx.success();
          burstFrom(canvas, 120);
        }
      };
      requestAnimationFrame(frame);
    });
    ta.addEventListener("input", draw);
    draw();
  }

  /* ---------- Would you rather ---------- */
  function initWyr() {
    const next = freshPicker(D.wouldYouRather);
    const A = $("wyrA"), B = $("wyrB");
    let voted = false;
    const load = (silent) => {
      const [a, b] = next();
      A.querySelector(".wyr-text").textContent = a;
      B.querySelector(".wyr-text").textContent = b;
      [A, B].forEach((el) => { el.classList.remove("voted", "chosen"); el.style.setProperty("--pct", "0%"); el.querySelector(".wyr-pct").textContent = ""; });
      voted = false;
      if (!silent) sfx.whoosh();
    };
    const vote = (chosen) => {
      if (voted) return;
      voted = true;
      const pa = 8 + rand(85);
      [[A, pa], [B, 100 - pa]].forEach(([el, p]) => {
        el.classList.add("voted");
        el.style.setProperty("--pct", p + "%");
        el.querySelector(".wyr-pct").textContent = p + "%";
      });
      chosen.classList.add("chosen");
      const mine = chosen === A ? pa : 100 - pa;
      toast(mine >= 50 ? `You're with the ${mine}% majority` : `Bold. Only ${mine}% agree with you`, mine >= 50 ? "users" : "user");
      sfx.pop();
    };
    A.addEventListener("click", () => vote(A));
    B.addEventListener("click", () => vote(B));
    $("wyrNext").addEventListener("click", () => load());
    load(true);
  }

  /* ---------- Random number slot ---------- */
  function initNumber() {
    const out = $("numOut");
    let busy = false;
    $("numBtn").addEventListener("click", () => {
      if (busy) return;
      let min = Math.trunc(Number($("numMin").value) || 0);
      let max = Math.trunc(Number($("numMax").value) || 0);
      if (min > max) [min, max] = [max, min];
      const final = min + rand(max - min + 1);
      busy = true;
      out.classList.add("spinning");
      let n = 0;
      const steps = reducedMotion ? 1 : 14;
      const iv = setInterval(() => {
        n++;
        if (n >= steps) {
          clearInterval(iv);
          out.textContent = final;
          out.classList.remove("spinning");
          replay(out, "land");
          sfx.coin();
          busy = false;
        } else {
          out.textContent = min + rand(max - min + 1);
          sfx.tick();
        }
      }, 45);
    });
  }

  /* ---------- Higher or lower ---------- */
  function initHilo() {
    const card = $("hiloCard");
    let cur = 1 + rand(13);
    let streak = 0;
    let best = store.get("emporium-hilo-best", 0);
    const show = (v) => {
      const suit = pick(D.suits);
      card.textContent = D.cards[v - 1] + suit;
      card.classList.toggle("red", suit === "♥" || suit === "♦");
      replay(card, "deal");
    };
    const guess = (higher) => {
      let nxt = 1 + rand(13);
      while (nxt === cur) nxt = 1 + rand(13);
      const right = higher ? nxt > cur : nxt < cur;
      show(nxt);
      if (right) {
        streak++;
        $("hiloOut").textContent = pick(["Correct!", "Nailed it.", "You're psychic.", "Keep going!"]);
        sfx.success();
        if (streak > best) { best = streak; store.set("emporium-hilo-best", best); }
        if (streak >= 5) unlock("streak5");
      } else {
        $("hiloOut").textContent = `Wrong! Streak lost at ${streak}.`;
        streak = 0;
        sfx.fail();
      }
      cur = nxt;
      $("hiloStreak").textContent = streak;
      $("hiloBest").textContent = best;
    };
    $("hiloHigher").addEventListener("click", () => guess(true));
    $("hiloLower").addEventListener("click", () => guess(false));
    show(cur);
    $("hiloBest").textContent = best;
  }

  /* ---------- Generative art (flow field) ---------- */
  function initGenArt() {
    const canvas = $("genCanvas");
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    let job = 0;
    let seed = 0;

    const paint = (silent) => {
      const my = ++job;
      seed = rand(1e9);
      const R = mulberry32(seed);
      $("genSeed").textContent = `seed #${seed.toString(36)}`;
      const hue = Math.floor(R() * 360);
      const dark = R() < 0.7;
      ctx.fillStyle = dark ? `hsl(${hue} 30% 7%)` : `hsl(${hue} 30% 94%)`;
      ctx.fillRect(0, 0, W, H);
      const pal = Array.from({ length: 4 }, (_, i) => `hsla(${(hue + i * (30 + R() * 60)) % 360}, ${60 + R() * 30}%, ${dark ? 55 + R() * 20 : 35 + R() * 20}%, 0.5)`);

      // Value noise on a coarse random grid.
      const G = 8;
      const grid = Array.from({ length: (G + 2) * (G + 2) }, () => R() * Math.PI * 4);
      const sm = (t) => t * t * (3 - 2 * t);
      const field = (x, y) => {
        const gx = (x / W) * G, gy = (y / H) * G;
        const x0 = Math.floor(gx), y0 = Math.floor(gy);
        const fx = sm(gx - x0), fy = sm(gy - y0);
        const g = (i, j) => grid[(j + 0) * (G + 2) + i];
        const a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * fx;
        const b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * fx;
        return a + (b - a) * fy;
      };

      const total = 1400;
      const perFrame = reducedMotion ? total : 90;
      let drawn = 0;
      ctx.lineCap = "round";
      const step = () => {
        if (my !== job) return;
        for (let k = 0; k < perFrame && drawn < total; k++, drawn++) {
          let x = R() * W, y = R() * H;
          ctx.strokeStyle = pal[Math.floor(R() * pal.length)];
          ctx.lineWidth = 0.6 + R() * 2.4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let s = 0; s < 60; s++) {
            const a = field(Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(H - 1, y)));
            x += Math.cos(a) * 3;
            y += Math.sin(a) * 3;
            if (x < 0 || x > W || y < 0 || y > H) break;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        if (drawn < total) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      if (!silent) sfx.magic();
    };

    $("genBtn").addEventListener("click", () => paint());
    $("genSave").addEventListener("click", () => {
      const a = document.createElement("a");
      a.download = `random-emporium-${seed.toString(36)}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      toast("Artwork downloaded", "download");
      sfx.pop();
    });
    paint(true);
  }

  /* ---------- Gradient ---------- */
  function initGradient() {
    let css = "";
    const gen = (silent) => {
      const n = 2 + rand(3);
      const h0 = rand(360);
      const stops = Array.from({ length: n }, (_, i) => E.hslToHex((h0 + i * (40 + rand(80))) % 360, 70 + rand(25), 50 + rand(20)));
      const type = pick(["linear", "linear", "radial", "conic"]);
      if (type === "linear") css = `linear-gradient(${rand(360)}deg, ${stops.join(", ")})`;
      else if (type === "radial") css = `radial-gradient(circle at ${rand(100)}% ${rand(100)}%, ${stops.join(", ")})`;
      else css = `conic-gradient(from ${rand(360)}deg, ${stops.join(", ")}, ${stops[0]})`;
      $("gradPreview").style.background = css;
      $("gradCode").textContent = `background: ${css};`;
      if (!silent) sfx.whoosh();
    };
    $("gradBtn").addEventListener("click", () => gen());
    $("gradCopy").addEventListener("click", () => copy(`background: ${css};`, "CSS"));
    gen(true);
  }

  /* ---------- Melody maker ---------- */
  function initMelody() {
    const roll = $("pianoRoll");
    const COLS = 16, ROWS = 10;
    // C major pentatonic across two octaves.
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
    const cells = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const d = document.createElement("span");
        roll.appendChild(d);
        cells.push(d);
      }
    }
    let timers = [];
    const compose = () => {
      const notes = [];
      let pos = rand(ROWS);
      for (let c = 0; c < COLS; c++) {
        if (Math.random() < 0.18 && c > 0) { notes.push(null); continue; }
        pos = Math.max(0, Math.min(ROWS - 1, pos + pick([-2, -1, -1, 0, 1, 1, 2])));
        notes.push(pos);
      }
      return notes;
    };
    $("melodyBtn").addEventListener("click", () => {
      timers.forEach(clearTimeout);
      timers = [];
      const notes = compose();
      const wave = $("melodyWave").value;
      cells.forEach((c) => c.classList.remove("on", "hit"));
      notes.forEach((n, c) => { if (n !== null) cells[(ROWS - 1 - n) * COLS + c].classList.add("on"); });
      const beat = 0.18;
      notes.forEach((n, c) => {
        if (n !== null) sfx.tone(scale[n], beat * 1.4, wave, 0.12, null, c * beat);
        timers.push(setTimeout(() => {
          for (let r = 0; r < ROWS; r++) cells[r * COLS + c].classList.add("hit");
        }, c * beat * 1000));
      });
      timers.push(setTimeout(() => cells.forEach((c) => c.classList.remove("hit")), COLS * beat * 1000 + 300));
      if (sfx.muted) toast("Sound is muted. Unmute to hear it", "volume-x");
      unlock("maestro");
    });
  }

  /* ---------- Game of life ---------- */
  function initLife() {
    const canvas = $("lifeCanvas");
    const ctx = canvas.getContext("2d");
    const N = 60, C = canvas.width / N;
    let grid = new Uint8Array(N * N);
    let age = new Uint16Array(N * N);
    let running = true, visible = true, gen = 0, last = 0;

    const seed = (silent) => {
      for (let i = 0; i < N * N; i++) { grid[i] = Math.random() < 0.3 ? 1 : 0; age[i] = 0; }
      gen = 0;
      draw();
      if (!silent) sfx.pop();
    };
    const step = () => {
      const next = new Uint8Array(N * N);
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          let n = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (dx || dy) n += grid[((y + dy + N) % N) * N + ((x + dx + N) % N)];
          }
          const i = y * N + x;
          next[i] = (grid[i] && (n === 2 || n === 3)) || (!grid[i] && n === 3) ? 1 : 0;
          age[i] = next[i] ? Math.min(age[i] + 1, 60) : 0;
        }
      }
      grid = next;
      gen++;
    };
    const draw = () => {
      ctx.fillStyle = cssVar("--canvas-bg") || "#0d0b18";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < N * N; i++) {
        if (!grid[i]) continue;
        const a = age[i];
        ctx.fillStyle = `hsl(${320 - a * 3} 85% ${70 - a * 0.4}%)`;
        ctx.fillRect((i % N) * C + 1, Math.floor(i / N) * C + 1, C - 2, C - 2);
      }
      $("lifeGen").textContent = `Gen ${gen}`;
    };
    const loop = (now) => {
      if (running && visible && now - last > 90) { step(); draw(); last = now; }
      requestAnimationFrame(loop);
    };
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(canvas);
    canvas.addEventListener("click", (e) => {
      const r = canvas.getBoundingClientRect();
      const x = Math.floor(((e.clientX - r.left) / r.width) * N);
      const y = Math.floor(((e.clientY - r.top) / r.height) * N);
      // Drop a glider where you click.
      [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]].forEach(([dx, dy]) => { grid[((y + dy) % N) * N + ((x + dx) % N)] = 1; });
      draw();
      sfx.click();
    });
    $("lifeSeed").addEventListener("click", () => seed());
    $("lifeToggle").addEventListener("click", () => {
      running = !running;
      const btn = $("lifeToggle");
      btn.innerHTML = running ? '<i data-lucide="pause"></i>Pause' : '<i data-lucide="play"></i>Play';
      icons();
      sfx.click();
    });
    seed(true);
    requestAnimationFrame(loop);
  }

  /* ---------- Maze ---------- */
  function initMaze() {
    const canvas = $("mazeCanvas");
    const ctx = canvas.getContext("2d");
    const N = 20, S = canvas.width, C = S / N;
    let walls, job = 0;

    const drawAll = (visited, current) => {
      ctx.fillStyle = cssVar("--canvas-bg") || "#0d0b18";
      ctx.fillRect(0, 0, S, S);
      if (visited) {
        ctx.fillStyle = "rgba(167,139,250,.12)";
        for (let i = 0; i < N * N; i++) if (visited[i]) ctx.fillRect((i % N) * C, Math.floor(i / N) * C, C, C);
      }
      if (current !== undefined) {
        ctx.fillStyle = "#f472b6";
        ctx.fillRect((current % N) * C + 3, Math.floor(current / N) * C + 3, C - 6, C - 6);
      }
      ctx.strokeStyle = cssVar("--ink") || "#fff";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < N * N; i++) {
        const x = (i % N) * C, y = Math.floor(i / N) * C, w = walls[i];
        if (w & 1) { ctx.moveTo(x, y); ctx.lineTo(x + C, y); }
        if (w & 2) { ctx.moveTo(x + C, y); ctx.lineTo(x + C, y + C); }
        if (w & 4) { ctx.moveTo(x, y + C); ctx.lineTo(x + C, y + C); }
        if (w & 8) { ctx.moveTo(x, y); ctx.lineTo(x, y + C); }
      }
      ctx.stroke();
      ctx.fillStyle = "#34d399";
      ctx.fillRect(4, 4, C - 8, C - 8);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(S - C + 4, S - C + 4, C - 8, C - 8);
    };

    // Walls: 1=top 2=right 4=bottom 8=left
    const generate = (silent) => {
      const my = ++job;
      walls = new Uint8Array(N * N).fill(15);
      const visited = new Uint8Array(N * N);
      const stack = [0];
      visited[0] = 1;
      const dirs = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];
      const tick = () => {
        if (my !== job) return;
        for (let k = 0; k < (reducedMotion ? 1e6 : 6) && stack.length; k++) {
          const cur = stack[stack.length - 1];
          const cx = cur % N, cy = Math.floor(cur / N);
          const opts = dirs.filter(([dx, dy]) => {
            const nx = cx + dx, ny = cy + dy;
            return nx >= 0 && ny >= 0 && nx < N && ny < N && !visited[ny * N + nx];
          });
          if (!opts.length) { stack.pop(); continue; }
          const [dx, dy, w, ow] = pick(opts);
          const nxt = (cy + dy) * N + (cx + dx);
          walls[cur] &= ~w;
          walls[nxt] &= ~ow;
          visited[nxt] = 1;
          stack.push(nxt);
        }
        if (stack.length) { drawAll(visited, stack[stack.length - 1]); requestAnimationFrame(tick); }
        else drawAll();
      };
      tick();
      if (!silent) sfx.whoosh();
    };

    const solve = () => {
      if (!walls) return;
      const my = ++job;
      const prev = new Int32Array(N * N).fill(-1);
      prev[0] = 0;
      const q = [0];
      const dirs = [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]];
      while (q.length) {
        const cur = q.shift();
        if (cur === N * N - 1) break;
        const cx = cur % N, cy = Math.floor(cur / N);
        for (const [dx, dy, w] of dirs) {
          if (walls[cur] & w) continue;
          const nxt = (cy + dy) * N + (cx + dx);
          if (prev[nxt] === -1) { prev[nxt] = cur; q.push(nxt); }
        }
      }
      const path = [];
      for (let c = N * N - 1; c !== 0; c = prev[c]) { if (c < 0) return; path.unshift(c); }
      path.unshift(0);
      let i = 1;
      drawAll();
      const tick = () => {
        if (my !== job) return;
        ctx.strokeStyle = "#f472b6";
        ctx.lineWidth = C * 0.35;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        const p = (c) => [(c % N) * C + C / 2, Math.floor(c / N) * C + C / 2];
        ctx.moveTo(...p(path[0]));
        for (let k = 1; k <= i && k < path.length; k++) ctx.lineTo(...p(path[k]));
        ctx.stroke();
        if (i % 3 === 0) sfx.tick();
        i += 2;
        if (i < path.length + 1) requestAnimationFrame(tick);
        else sfx.success();
      };
      tick();
    };

    $("mazeBtn").addEventListener("click", () => generate());
    $("mazeSolve").addEventListener("click", solve);
    generate(true);
  }

  /* ---------- Tarot ---------- */
  function initTarot() {
    const cards = [...document.querySelectorAll("#tarotRow .tarot")];
    let busy = false;
    $("tarotBtn").addEventListener("click", () => {
      if (busy) return;
      busy = true;
      const deck = D.tarot.slice().sort(() => Math.random() - 0.5).slice(0, 3);
      const flippedAlready = cards[0].classList.contains("flipped");
      cards.forEach((c) => c.classList.remove("flipped"));
      setTimeout(() => {
        cards.forEach((c, i) => {
          const t = deck[i];
          const front = c.querySelector(".tarot-front");
          front.innerHTML = "";
          const ic = document.createElement("i");
          ic.setAttribute("data-lucide", t.icon);
          const name = document.createElement("strong");
          name.textContent = t.name;
          const m = document.createElement("p");
          m.textContent = t.meaning;
          front.append(ic, name, m);
          setTimeout(() => { c.classList.add("flipped"); sfx.tone(600 + i * 200, 0.25, "sine", 0.1, 900 + i * 200); }, i * 350);
        });
        icons();
        setTimeout(() => { busy = false; sfx.magic(); }, 1100);
      }, flippedAlready ? 450 : 0);
    });
  }

  /* ---------- Cowsay ---------- */
  function initCowsay() {
    const next = freshPicker(D.facts);
    const wrap = (text, width) => {
      const lines = [];
      let line = "";
      text.split(" ").forEach((w) => {
        if ((line + " " + w).trim().length > width) { lines.push(line.trim()); line = w; }
        else line += " " + w;
      });
      if (line.trim()) lines.push(line.trim());
      return lines;
    };
    const say = (silent) => {
      const lines = wrap(next(), 30);
      const w = Math.max(...lines.map((l) => l.length));
      const pad = (l) => l + " ".repeat(w - l.length);
      let bubble = " " + "_".repeat(w + 2) + "\n";
      if (lines.length === 1) bubble += `< ${pad(lines[0])} >\n`;
      else lines.forEach((l, i) => {
        const [o, c] = i === 0 ? ["/", "\\"] : i === lines.length - 1 ? ["\\", "/"] : ["|", "|"];
        bubble += `${o} ${pad(l)} ${c}\n`;
      });
      bubble += " " + "-".repeat(w + 2) + "\n";
      const eyes = pick(["oo", "oo", "oo", "^^", "@@", "xx", "$$", "--"]);
      bubble += `        \\   ^__^\n         \\  (${eyes})\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`;
      $("cowOut").textContent = bubble;
      if (!silent) sfx.tone(110, 0.5, "sawtooth", 0.06, 90);
    };
    $("cowBtn").addEventListener("click", () => say());
    say(true);
  }

  initStartup();
  initSuperpower();
  initHaiku();
  initInsult();
  initRecipe();
  initPassphrase();
  initLorem();
  initWheel();
  initWyr();
  initNumber();
  initHilo();
  initGenArt();
  initGradient();
  initMelody();
  initLife();
  initMaze();
  initTarot();
  initCowsay();
})();
