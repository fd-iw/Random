// Page shell: card chrome, theme, sound, filters, command palette, shortcuts,
// hero effects, the randomness report and the Surprise me button.
(function () {
  "use strict";
  const E = window.Emporium;
  const { D, $, rand, pick, replay, store, icons, sfx, toast, confetti, unlock, booths, stats, recordUse, reducedMotion } = E;

  const CATS = { generators: "Generators", games: "Games", art: "Art & Toys", mystic: "Mystic", knowledge: "Knowledge" };
  const CAT_ICONS = { generators: "wand-sparkles", games: "gamepad-2", art: "palette", mystic: "moon-star", knowledge: "book-open" };

  /* ---------- Card chrome + registry ---------- */
  function initCards() {
    document.querySelectorAll(".card").forEach((card) => {
      const b = {
        id: card.id,
        title: card.dataset.title,
        desc: card.dataset.desc,
        icon: card.dataset.icon,
        cat: card.dataset.cat,
        trigger: card.dataset.trigger,
        el: card
      };
      booths.push(b);

      const head = document.createElement("header");
      head.className = "card-head";
      const badge = document.createElement("span");
      badge.className = "badge";
      const i = document.createElement("i");
      i.setAttribute("data-lucide", b.icon);
      badge.appendChild(i);
      const text = document.createElement("div");
      text.className = "card-title";
      const h3 = document.createElement("h3");
      h3.textContent = b.title;
      const p = document.createElement("p");
      p.textContent = b.desc;
      text.append(h3, p);
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = CATS[b.cat];
      head.append(badge, text, tag);
      card.prepend(head);

      const glow = document.createElement("div");
      glow.className = "spotlight";
      glow.setAttribute("aria-hidden", "true");
      card.prepend(glow);

      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
      // Every real interaction inside a booth counts toward the report.
      card.addEventListener("click", (e) => {
        if (e.target.closest("button, canvas, .pixels, label")) recordUse(b.id);
      });
    });
  }

  /* ---------- Theme + sound ---------- */
  function initToggles() {
    const root = document.documentElement;
    const themeBtn = $("themeToggle");
    const soundBtn = $("soundToggle");
    const syncTheme = () => {
      const dark = root.dataset.theme !== "light";
      themeBtn.innerHTML = `<i data-lucide="${dark ? "sun" : "moon"}"></i>`;
      document.querySelector('meta[name="theme-color"]').content = dark ? "#0b0a14" : "#f7f5ff";
      icons();
    };
    const syncSound = () => {
      soundBtn.innerHTML = `<i data-lucide="${sfx.muted ? "volume-x" : "volume-2"}"></i>`;
      soundBtn.setAttribute("aria-pressed", String(!sfx.muted));
      icons();
    };
    E.toggleTheme = () => {
      root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
      store.set("emporium-theme", root.dataset.theme);
      syncTheme();
      sfx.click();
      unlock("night");
      document.dispatchEvent(new Event("themechange"));
    };
    E.toggleSound = () => {
      sfx.setMuted(!sfx.muted);
      syncSound();
      if (!sfx.muted) sfx.pop();
      toast(sfx.muted ? "Sound off" : "Sound on", sfx.muted ? "volume-x" : "volume-2");
    };
    themeBtn.addEventListener("click", E.toggleTheme);
    soundBtn.addEventListener("click", E.toggleSound);
    syncTheme();
    syncSound();
  }

  /* ---------- Hero ---------- */
  function initHero() {
    // Animated counters.
    document.querySelectorAll("[data-count], [data-count-from]").forEach((el) => {
      const target = el.dataset.count ? Number(el.dataset.count) : D[el.dataset.countFrom].length;
      if (reducedMotion) { el.textContent = target.toLocaleString(); return; }
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / 1600);
        el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))).toLocaleString();
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    // Rotating headline word.
    const words = ["randomness", "chaos", "nonsense", "serendipity", "entropy", "whimsy"];
    const el = $("heroWord");
    let i = 0;
    if (!reducedMotion) {
      setInterval(() => {
        el.classList.add("swap");
        setTimeout(() => { i = (i + 1) % words.length; el.textContent = words[i]; el.classList.remove("swap"); }, 300);
      }, 2600);
    }

    // Click the 3D die to roll it.
    const cube = $("heroCube");
    const faces = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
    let spins = 0;
    cube.parentElement.parentElement.addEventListener("click", () => {
      const v = 1 + rand(6);
      spins++;
      const [x, y] = faces[v];
      cube.classList.add("rolled");
      cube.style.transform = `rotateX(${x + spins * 720}deg) rotateY(${y + spins * 360}deg)`;
      sfx.roll();
      setTimeout(() => toast(`You rolled a ${v}`, "dices"), 900);
    });
  }

  /* ---------- Marquee ---------- */
  function initMarquee() {
    const track = $("marquee");
    const facts = D.facts.slice().sort(() => Math.random() - 0.5).slice(0, 12);
    const build = () => facts.forEach((f) => {
      const s = document.createElement("span");
      s.className = "marquee-item";
      const i = document.createElement("i");
      i.setAttribute("data-lucide", "sparkle");
      s.append(i, document.createTextNode(f));
      track.appendChild(s);
    });
    build();
    build(); // duplicated for a seamless loop
  }

  /* ---------- Reveal on scroll + nav state ---------- */
  function initScrollFx() {
    const nav = $("nav");
    const onScroll = () => nav.classList.toggle("scrolled", scrollY > 8);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (!reducedMotion && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
      }, { rootMargin: "0px 0px -8% 0px" });
      document.querySelectorAll(".card, .cat-head, .kpi, .panel").forEach((el) => { el.classList.add("reveal"); io.observe(el); });
    }

    const links = [...document.querySelectorAll(".nav-links a")];
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll(".cat, #report").forEach((s) => spy.observe(s));
  }

  /* ---------- Filters ---------- */
  let activeFilter = "all";
  function applyFilter() {
    const q = $("filterInput").value.trim().toLowerCase();
    let shown = 0;
    booths.forEach((b) => {
      const hay = `${b.title} ${b.desc} ${CATS[b.cat]}`.toLowerCase();
      const ok = (activeFilter === "all" || b.cat === activeFilter) && (!q || hay.includes(q));
      b.el.hidden = !ok;
      if (ok) shown++;
    });
    document.querySelectorAll(".cat").forEach((sec) => {
      sec.hidden = !sec.querySelector(".card:not([hidden])");
    });
    $("filterCount").textContent = `${shown}/${booths.length}`;
    $("emptyState").hidden = shown > 0;
  }
  function setFilter(f) {
    activeFilter = f;
    document.querySelectorAll("[data-filter]").forEach((c) => {
      const on = c.dataset.filter === f;
      c.classList.toggle("active", on);
      c.setAttribute("aria-selected", String(on));
    });
    applyFilter();
  }
  function initFilters() {
    document.querySelectorAll("[data-filter]").forEach((c) => c.addEventListener("click", () => { setFilter(c.dataset.filter); sfx.click(); }));
    $("filterInput").addEventListener("input", applyFilter);
    applyFilter();
  }
  function resetFilters() {
    $("filterInput").value = "";
    setFilter("all");
  }

  /* ---------- Go to / run a booth ---------- */
  function runBooth(b, { trigger = true } = {}) {
    if (b.el.hidden) resetFilters();
    b.el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    replay(b.el, "flash");
    if (!trigger) return;
    if (b.id === "eightball") {
      const q = $("question");
      if (!q.value) q.value = pick(["Will today be random?", "Should I eat a snack?", "Is the cake a lie?"]);
      $("ballForm").requestSubmit();
    } else if (b.trigger && $(b.trigger)) {
      $(b.trigger).click();
    }
  }

  let surprises = 0;
  let lastSurprise = null;
  function surprise() {
    const pool = booths.filter((x) => x.trigger && x !== lastSurprise);
    const b = pick(pool);
    lastSurprise = b;
    sfx.whoosh();
    runBooth(b);
    if (++surprises >= 10) unlock("surprise10");
  }

  /* ---------- Command palette ---------- */
  function initCmdk() {
    const dlg = $("cmdk");
    const input = $("cmdkInput");
    const list = $("cmdkList");
    let items = [];
    let sel = 0;

    const actions = [
      { title: "Surprise me", desc: "Jump to a random booth", icon: "shuffle", run: surprise },
      { title: "Toggle theme", desc: "Light / dark", icon: "sun-moon", run: () => E.toggleTheme() },
      { title: "Toggle sound", desc: "Mute / unmute effects", icon: "volume-2", run: () => E.toggleSound() },
      { title: "View your report", desc: "Stats & achievements", icon: "chart-no-axes-column", run: () => $("report").scrollIntoView({ behavior: "smooth" }) },
      { title: "Keyboard shortcuts", desc: "Show all shortcuts", icon: "keyboard", run: () => $("keys").showModal() }
    ];

    // Subsequence fuzzy match; lower score is better.
    const score = (text, q) => {
      text = text.toLowerCase();
      if (!q) return 0;
      const idx = text.indexOf(q);
      if (idx >= 0) return idx;
      let ti = 0, gaps = 0;
      for (const ch of q) {
        const f = text.indexOf(ch, ti);
        if (f < 0) return Infinity;
        gaps += f - ti;
        ti = f + 1;
      }
      return 100 + gaps;
    };

    const render = () => {
      const q = input.value.trim().toLowerCase();
      const all = [
        ...booths.map((b) => ({ title: b.title, desc: `${CATS[b.cat]} · ${b.desc}`, icon: b.icon, group: "Booths", run: () => runBooth(b) })),
        ...actions.map((a) => ({ ...a, group: "Actions" }))
      ];
      items = all
        .map((it) => ({ it, s: Math.min(score(it.title, q), score(it.desc, q) + 50) }))
        .filter((x) => x.s !== Infinity)
        .sort((a, b) => a.s - b.s)
        .map((x) => x.it)
        .slice(0, 12);
      sel = 0;
      list.innerHTML = "";
      if (!items.length) {
        const li = document.createElement("li");
        li.className = "cmdk-empty";
        li.textContent = "Nothing found. Randomly, that's rare.";
        list.appendChild(li);
      }
      items.forEach((it, i) => {
        const li = document.createElement("li");
        li.setAttribute("role", "option");
        li.id = "cmdk-opt-" + i;
        const ic = document.createElement("i");
        ic.setAttribute("data-lucide", it.icon);
        const body = document.createElement("div");
        const t = document.createElement("strong");
        t.textContent = it.title;
        const d = document.createElement("span");
        d.textContent = it.desc;
        body.append(t, d);
        const g = document.createElement("small");
        g.textContent = it.group;
        li.append(ic, body, g);
        li.addEventListener("click", () => choose(i));
        li.addEventListener("pointermove", () => { if (sel !== i) { sel = i; highlight(); } });
        list.appendChild(li);
      });
      highlight();
      icons();
    };
    const highlight = () => {
      [...list.children].forEach((li, i) => li.setAttribute("aria-selected", String(i === sel)));
      input.setAttribute("aria-activedescendant", items.length ? "cmdk-opt-" + sel : "");
      const cur = list.children[sel];
      if (cur) cur.scrollIntoView({ block: "nearest" });
    };
    const choose = (i) => {
      const it = items[i];
      if (!it) return;
      dlg.close();
      setTimeout(it.run, 50);
    };

    E.openCmdk = () => {
      if (dlg.open) return;
      input.value = "";
      render();
      dlg.showModal();
      input.focus();
      sfx.click();
      unlock("palette");
    };
    input.addEventListener("input", render);
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % Math.max(items.length, 1); highlight(); sfx.tick(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + items.length) % Math.max(items.length, 1); highlight(); sfx.tick(); }
      else if (e.key === "Enter") { e.preventDefault(); choose(sel); }
    });
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    $("keys").addEventListener("click", (e) => { if (e.target === $("keys")) $("keys").close(); });
    $("openCmdk").addEventListener("click", E.openCmdk);
  }

  /* ---------- Keyboard shortcuts + Konami ---------- */
  function initKeys() {
    const konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let kpos = 0;
    document.addEventListener("keydown", (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      kpos = k === konami[kpos] ? kpos + 1 : k === konami[0] ? 1 : 0;
      if (kpos === konami.length) {
        kpos = 0;
        document.documentElement.classList.toggle("party");
        confetti(innerWidth / 2, innerHeight / 2, 250);
        sfx.achievement();
        toast("PARTY MODE " + (document.documentElement.classList.contains("party") ? "ENGAGED" : "OFF"), "party-popper", "gold");
        unlock("konami");
      }

      if ((e.metaKey || e.ctrlKey) && k === "k") { e.preventDefault(); E.openCmdk(); return; }
      const t = e.target;
      const typing = t.closest && t.closest("input, textarea, select, [contenteditable]");
      if (typing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]")) return;
      if (k === "/") { e.preventDefault(); E.openCmdk(); }
      else if (k === "r") surprise();
      else if (k === "t") E.toggleTheme();
      else if (k === "m") E.toggleSound();
      else if (k === "?") $("keys").showModal();
    });
    document.querySelectorAll("[data-surprise]").forEach((b) => b.addEventListener("click", surprise));
  }

  /* ---------- Report ---------- */
  function initReport() {
    const keys = Object.keys(E.ACHIEVEMENTS);
    const render = () => {
      const tried = booths.filter((b) => stats.booths[b.id]).length;
      $("kpiClicks").textContent = stats.clicks.toLocaleString();
      $("kpiTried").textContent = `${tried}/${booths.length}`;
      $("kpiTriedBar").style.width = `${(tried / booths.length) * 100}%`;
      const fav = booths.slice().sort((a, b) => (stats.booths[b.id] || 0) - (stats.booths[a.id] || 0))[0];
      $("kpiFav").textContent = fav && stats.booths[fav.id] ? `${fav.title} (${stats.booths[fav.id]})` : "—";
      const got = keys.filter((k) => E.unlocked[k]).length;
      $("kpiAch").textContent = `${got}/${keys.length}`;

      const perCat = {};
      Object.keys(CATS).forEach((c) => { perCat[c] = 0; });
      booths.forEach((b) => { perCat[b.cat] += stats.booths[b.id] || 0; });
      const max = Math.max(1, ...Object.values(perCat));
      const bars = $("catBars");
      bars.innerHTML = "";
      Object.entries(perCat).forEach(([c, v]) => {
        const row = document.createElement("div");
        row.className = "bar-row";
        const label = document.createElement("span");
        label.className = "bar-label";
        const i = document.createElement("i");
        i.setAttribute("data-lucide", CAT_ICONS[c]);
        label.append(i, document.createTextNode(CATS[c]));
        const track = document.createElement("div");
        track.className = "bar-track";
        const fill = document.createElement("span");
        fill.className = "bar-fill";
        fill.dataset.cat = c;
        fill.style.width = `${(v / max) * 100}%`;
        track.appendChild(fill);
        const val = document.createElement("span");
        val.className = "bar-val mono";
        val.textContent = v;
        row.append(label, track, val);
        bars.appendChild(row);
      });

      const ul = $("achList");
      ul.innerHTML = "";
      keys.forEach((k) => {
        const a = E.ACHIEVEMENTS[k];
        const li = document.createElement("li");
        li.className = E.unlocked[k] ? "got" : "";
        const ic = document.createElement("span");
        ic.className = "ach-icon";
        const i = document.createElement("i");
        i.setAttribute("data-lucide", E.unlocked[k] ? a.icon : "lock");
        ic.appendChild(i);
        const body = document.createElement("div");
        const t = document.createElement("strong");
        t.textContent = a.title;
        const d = document.createElement("span");
        d.textContent = a.desc;
        body.append(t, d);
        li.append(ic, body);
        ul.appendChild(li);
      });
      icons();
    };
    let pending = false;
    const schedule = () => {
      if (pending) return;
      pending = true;
      setTimeout(() => { pending = false; render(); }, 250);
    };
    E.onStats(schedule);
    E.onAchievement(schedule);
    $("resetStats").addEventListener("click", () => {
      stats.clicks = 0;
      stats.booths = {};
      store.set("emporium-stats", stats);
      Object.keys(E.unlocked).forEach((k) => delete E.unlocked[k]);
      store.set("emporium-achievements", {});
      render();
      toast("Stats reset. Fresh chaos awaits.", "rotate-ccw");
      sfx.whoosh();
    });
    render();
  }

  /* ---------- Footer ---------- */
  function initFooter() {
    $("year").textContent = new Date().getFullYear();
    $("footerQuote").textContent = pick([
      "tip: press R for a random booth",
      "tip: ⌘K opens the command palette",
      "tip: click the big die in the hero",
      "tip: try the Konami code",
      "tip: click inside the Game of Life to drop gliders"
    ]);
    const jokes = {
      careers: ["We're hiring! Position: Chief Randomness Officer. Salary: a d20 roll.", "briefcase"],
      pricing: ["Free forever. Or $4.20/month. We rolled a die and it said free.", "badge-dollar-sign"],
      legal: ["By reading this you agree to nothing. Terms may change randomly.", "scale"]
    };
    document.querySelectorAll("[data-joke]").forEach((b) => b.addEventListener("click", () => {
      const [msg, icon] = jokes[b.dataset.joke];
      toast(msg, icon);
      sfx.pop();
    }));
    $("newsForm").addEventListener("submit", (e) => {
      e.preventDefault();
      $("newsEmail").value = "";
      toast("Subscribed! You will receive absolutely nothing.", "mail-check");
      sfx.success();
    });
  }

  initCards();
  initToggles();
  initHero();
  initMarquee();
  initScrollFx();
  initFilters();
  initCmdk();
  initKeys();
  initReport();
  initFooter();
  icons();
})();
