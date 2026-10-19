// Everything is block-scoped so it never clashes with page-specific inline scripts
{
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(pointer: fine)").matches;
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Split hero headline into words for the staggered entrance
$$("[data-split]").forEach((el) => {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((w) => {
          if (!w.trim()) return frag.append(w);
          const s = document.createElement("span");
          s.className = "word";
          s.style.setProperty("--i", i++);
          s.textContent = w;
          frag.append(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains("rotator")) walk(n);
      else if (n.nodeType === 1) {
        n.classList.add("word");
        n.style.setProperty("--i", i++);
      }
    });
  };
  walk(el);
});

// Typewriter rotator
const rot = document.querySelector(".rotator .txt");
if (rot) {
  const words = JSON.parse(rot.parentElement.dataset.words);
  let w = 0, c = words[0].length, del = true;
  const tick = () => {
    const word = words[w];
    rot.textContent = word.slice(0, c);
    let wait = del ? 45 : 85;
    if (del && c === 0) { del = false; w = (w + 1) % words.length; wait = 300; }
    else if (!del && c === words[w].length) { del = true; wait = 2200; }
    else c += del ? -1 : 1;
    setTimeout(tick, wait);
  };
  if (!reduce) setTimeout(tick, 2600);
}

// Scroll progress + timeline fill
const tl = document.querySelector(".timeline");
const onScroll = () => {
  const h = document.documentElement;
  h.style.setProperty("--p", h.scrollTop / (h.scrollHeight - h.clientHeight || 1));
  if (tl) {
    const r = tl.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height));
    tl.style.setProperty("--tp", p);
  }
};
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Reveal on scroll, count-up stats
const countUp = (el) => {
  const to = +el.dataset.count, pre = el.dataset.pre || "", suf = el.dataset.suf || "";
  if (reduce) return (el.textContent = pre + to + suf);
  const t0 = performance.now(), dur = 1600;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
    el.textContent = pre + Math.round(to * e) + suf;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    $$("[data-count]", e.target).forEach(countUp);
    io.unobserve(e.target);
  });
}, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
$$(".reveal, .timeline .item, .stats").forEach((el) => io.observe(el));

// Card spotlight + tilt, magnetic buttons
if (fine && !reduce) {
  $$(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty("--mx", x + "px");
      card.style.setProperty("--my", y + "px");
      const rx = (y / r.height - 0.5) * -6, ry = (x / r.width - 0.5) * 6;
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    });
    card.addEventListener("pointerleave", () => (card.style.transform = ""));
  });
  $$(".btn").forEach((b) => {
    b.addEventListener("pointermove", (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px,${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    b.addEventListener("pointerleave", () => (b.style.transform = ""));
  });
}

// Copy email
$$("[data-copy]").forEach((b) => {
  b.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      const tip = b.querySelector(".copied");
      tip.textContent = "Copied!";
      tip.classList.add("show");
      setTimeout(() => { tip.classList.remove("show"); tip.textContent = ""; }, 1400);
    } catch { location.href = "mailto:" + b.dataset.copy; }
  });
});

// Interactive constellation field
const cv = document.getElementById("field");
if (cv) {
  const ctx = cv.getContext("2d");
  let W, H, dpr, pts = [], mouse = { x: -9999, y: -9999 }, running = true, cols, lineRgb;
  const hex2rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].join(","); };
  const readColors = () => {
    const css = getComputedStyle(document.documentElement);
    cols = ["--accent", "--accent-2", "--gold"].map((v) => css.getPropertyValue(v).trim());
    lineRgb = hex2rgb(css.getPropertyValue("--fg").trim());
    pts.forEach((p, i) => (p.c = cols[i % cols.length]));
    if (reduce) draw();
  };
  addEventListener("themechange", readColors);

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.offsetWidth; H = cv.offsetHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(130, Math.round((W * H) / 11000));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.6, c: "#888",
    }));
    pts.forEach((p, i) => (p.c = cols[i % cols.length]));
  };

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 140 && d > 0) { p.x += (dx / d) * 1.4; p.y += (dy / d) * 1.4; }
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) {
          ctx.strokeStyle = `rgba(${lineRgb},${(1 - d / 120) * 0.14})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      if (md < 200) {
        ctx.strokeStyle = a.c; ctx.globalAlpha = (1 - md / 200) * 0.6;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = a.c;
      ctx.shadowColor = a.c; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (running && !reduce) requestAnimationFrame(draw);
  };

  cols = ["#888"]; lineRgb = "128,128,128";
  resize();
  readColors();
  addEventListener("resize", resize);
  const hero = cv.parentElement;
  hero.addEventListener("pointermove", (e) => {
    const r = cv.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  hero.addEventListener("pointerleave", () => (mouse = { x: -9999, y: -9999 }));
  new IntersectionObserver(([e]) => {
    const was = running; running = e.isIntersecting;
    if (running && !was && !reduce) requestAnimationFrame(draw);
  }).observe(hero);
  draw();
}

// Theme toggle (the initial theme is set by an inline script in <head> to avoid a flash)
const root = document.documentElement;
const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : !matchMedia("(prefers-color-scheme: light)").matches);
const themeBtn = document.getElementById("theme");
const sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const paintThemeBtn = () => {
  if (!themeBtn) return;
  themeBtn.innerHTML = isDark() ? sun : moon;
  themeBtn.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme");
};
const toggleTheme = () => {
  const next = isDark() ? "light" : "dark";
  root.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch {}
  paintThemeBtn();
  dispatchEvent(new Event("themechange"));
};
themeBtn?.addEventListener("click", toggleTheme);
paintThemeBtn();

// Toast
const toast = (msg) => {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2600);
};

// Gryfi easter egg: Konami code or typing "gryfi"
const base = document.body.dataset.base || "";
const flyGryfi = () => {
  toast("You found Gryfi! 🪽");
  if (reduce) return;
  const g = document.createElement("div");
  g.className = "gryfi-fly";
  g.innerHTML = `<img src="https://gryfi.app/_astro/logo-hero-lockup-1024.DGI3WZ8i.webp" alt="">`;
  g.querySelector("img").onerror = (e) => e.target.replaceWith(Object.assign(document.createElement("span"), { textContent: "🦅" }));
  document.body.append(g);
  const w = innerWidth, h = innerHeight;
  const anim = g.animate([
    { transform: `translate(-160px, ${h * 0.7}px) rotate(-10deg) scale(.7)` },
    { transform: `translate(${w * 0.3}px, ${h * 0.35}px) rotate(6deg) scale(1)` },
    { transform: `translate(${w * 0.6}px, ${h * 0.5}px) rotate(-6deg) scale(1.1)` },
    { transform: `translate(${w + 160}px, ${h * 0.1}px) rotate(10deg) scale(.8)` },
  ], { duration: 3200, easing: "ease-in-out" });
  const spark = setInterval(() => {
    const r = g.getBoundingClientRect(), s = document.createElement("i");
    s.className = "spark"; s.textContent = ["✦", "✧", "⋆"][(Math.random() * 3) | 0];
    s.style.left = r.left + r.width / 2 + "px"; s.style.top = r.top + r.height / 2 + "px";
    document.body.append(s); setTimeout(() => s.remove(), 1000);
  }, 60);
  anim.onfinish = () => { clearInterval(spark); g.remove(); };
};
const konami = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
let kHist = [], typed = "";
addEventListener("keydown", (e) => {
  if (e.target.closest?.("input, textarea, select")) return;
  kHist = [...kHist, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-konami.length);
  typed = (typed + (e.key.length === 1 ? e.key.toLowerCase() : "")).slice(-5);
  if (kHist.join() === konami.join() || typed === "gryfi") { kHist = []; typed = ""; flyGryfi(); }
});
console.log("%c✦ Hi, fellow developer! %cTry the Konami code, or type “gryfi”.", "color:#8f7bff;font-weight:bold;font-size:14px", "color:inherit");

// Command palette (Cmd/Ctrl+K)
const onHome = !!document.getElementById("field");
const sec = (id) => (onHome ? "#" + id : base + "index.html#" + id);
const commands = [
  ["Go to", "About", sec("about")], ["Go to", "Work", sec("work")], ["Go to", "Demos", sec("demos")],
  ["Go to", "Gryfi studio", sec("gryfi")], ["Go to", "Writing", sec("writing")], ["Go to", "Now", sec("now")],
  ["Go to", "Experience", sec("experience")], ["Go to", "Contact", sec("contact")],
  ["Article", "Buy vs build: halving the cost of notifications", base + "blog/buy-vs-build.html"],
  ["Article", "From 30 to 72: Angular performance wins", base + "blog/angular-performance.html"],
  ["Article", "What cozy games taught me about UX", base + "blog/cozy-games-ux.html"],
  ["Article", "All writing", base + "blog/"],
  ["Project", "Shiftline · roster concept", base + "projects/shiftline.html"],
  ["Project", "TokenKit · design tokens", base + "projects/tokenkit.html"],
  ["Project", "Pulse · dashboard", base + "projects/pulse.html"],
  ["Demo", "Brasa · restaurant", base + "demos/brasa/"],
  ["Demo", "Flowright · plumbing", base + "demos/flowright/"],
  ["Demo", "Fluff & Co. · dog grooming", base + "demos/fluff/"],
  ["Action", "Toggle light / dark theme", toggleTheme],
  ["Action", "Copy email address", () => navigator.clipboard?.writeText("maria@gryfi.app").then(() => toast("Email copied!"), () => (location.href = "mailto:maria@gryfi.app"))],
  ["Action", "Download CV (PDF)", base + "cv.pdf"],
  ["Action", "Make Gryfi fly", flyGryfi],
  ["Link", "GitHub", "https://github.com/MariaJunqueira"],
  ["Link", "LinkedIn", "https://www.linkedin.com/in/maria-junqueira"],
  ["Link", "gryfi.app", "https://gryfi.app"],
];
const pal = document.createElement("dialog");
pal.className = "palette";
pal.setAttribute("aria-label", "Command palette");
pal.innerHTML = `<div class="pal-in"><input type="text" placeholder="Search pages, articles, actions…" aria-label="Search commands" aria-controls="pal-list" autocomplete="off" spellcheck="false"><kbd>esc</kbd></div><ul id="pal-list" role="listbox"></ul><div class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span></div>`;
document.body.append(pal);
const pIn = pal.querySelector("input"), pList = pal.querySelector("ul");
let sel = 0, shown = [];
const renderPal = () => {
  const q = pIn.value.trim().toLowerCase();
  shown = commands.filter(([g, l]) => !q || (g + " " + l).toLowerCase().includes(q));
  sel = Math.min(sel, Math.max(0, shown.length - 1));
  pList.innerHTML = shown.length
    ? shown.map(([g, l], i) => `<li role="option" id="pal-${i}" aria-selected="${i === sel}"><span>${l}</span><small>${g}</small></li>`).join("")
    : `<li class="empty">No results. Try “article” or “demo”.</li>`;
  pIn.setAttribute("aria-activedescendant", shown.length ? "pal-" + sel : "");
  pList.querySelector("[aria-selected=true]")?.scrollIntoView({ block: "nearest" });
};
const run = (cmd) => {
  pal.close();
  const t = cmd[2];
  if (typeof t === "function") return t();
  if (t.startsWith("http")) return window.open(t, "_blank", "noopener");
  location.href = t;
};
const openPal = () => { pIn.value = ""; sel = 0; renderPal(); pal.showModal(); pIn.focus(); };
pIn.addEventListener("input", () => { sel = 0; renderPal(); });
pIn.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % (shown.length || 1); renderPal(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + shown.length) % (shown.length || 1); renderPal(); }
  else if (e.key === "Enter" && shown[sel]) run(shown[sel]);
});
pList.addEventListener("click", (e) => { const li = e.target.closest("li[role=option]"); if (li) run(shown[+li.id.slice(4)]); });
pal.addEventListener("click", (e) => { if (e.target === pal) pal.close(); });
addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.open ? pal.close() : openPal(); }
});
document.getElementById("k")?.addEventListener("click", openPal);
const kbtn = document.querySelector("#k kbd");
if (kbtn && !/Mac|iPhone|iPad/.test(navigator.platform)) kbtn.textContent = "Ctrl K";

// Live performance numbers for this visit
const perf = document.getElementById("perf");
if (perf) addEventListener("load", () => setTimeout(() => {
  const nav = performance.getEntriesByType("navigation")[0];
  const res = performance.getEntriesByType("resource");
  const size = (e) => e.transferSize || e.encodedBodySize || 0;
  const local = res.filter((r) => new URL(r.name).origin === location.origin);
  const kb = Math.round((size(nav || {}) + local.reduce((a, r) => a + size(r), 0)) / 1024);
  const js = Math.round(local.filter((r) => r.initiatorType === "script").reduce((a, r) => a + (r.encodedBodySize || 0), 0) / 1024);
  const ms = nav ? Math.round(nav.loadEventStart || nav.domContentLoadedEventEnd) : 0;
  const set = (k, v) => { const el = perf.querySelector(`[data-p=${k}]`); if (el) el.textContent = v; };
  set("time", ms ? (ms < 1000 ? ms + " ms" : (ms / 1000).toFixed(1) + " s") : "–");
  set("req", res.length + 1);
  set("kb", kb ? kb + " KB" : "–");
  set("js", js ? js + " KB" : "–");
}, 0));
}
