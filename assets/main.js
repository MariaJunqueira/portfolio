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
  const css = getComputedStyle(document.documentElement);
  const cols = ["--accent", "--accent-2", "--gold"].map((v) => css.getPropertyValue(v).trim());
  const lineCol = css.getPropertyValue("--fg").trim();
  let W, H, dpr, pts = [], mouse = { x: -9999, y: -9999 }, running = true;
  const hex2rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].join(","); };
  const lineRgb = hex2rgb(lineCol);

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.offsetWidth; H = cv.offsetHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(130, Math.round((W * H) / 11000));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.6, c: cols[(Math.random() * cols.length) | 0],
    }));
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

  resize();
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
