/* =========================================================
   LAYOUT — header, footer, iconen, feniks, sintels, animaties.
   Menu aanpassen? Doe dat in NAV hieronder.
   ========================================================= */
(function () {
  const NAV = [
    { href: "index.html", label: "Home", key: "home" },
    { href: "hartmuur.html", label: "Hartmuur", key: "hartmuur" },
    { href: "bodycode-emotiecode.html", label: "Body Code & Emotiecode", key: "bodycode" },
    { href: "belief-code.html", label: "Belief Code", key: "beliefcode" },
    { href: "emotiecode-dieren.html", label: "Emotiecode voor Dieren", key: "dieren" },
    { href: "sessies.html", label: "Sessies", key: "sessies" },
    { href: "over-mij.html", label: "About Me", key: "about" }
  ];

  /* ---------- iconen ---------- */
  const I = {
    heart: '<path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 4 4.5 7.2 4.5c2 0 3.4 1.1 4.8 2.9 1.4-1.8 2.8-2.9 4.8-2.9 3.2 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z"/>',
    body: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7.5v6m0 0-3 7m3-7 3 7M6 10l6-1.5 6 1.5"/><path d="M4.5 13.5c1.2.8 2.2.8 3.2 0M16.3 13.5c1.2.8 2.2.8 3.2 0" opacity=".6"/>',
    paw: '<ellipse cx="7" cy="9" rx="1.8" ry="2.4"/><ellipse cx="17" cy="9" rx="1.8" ry="2.4"/><ellipse cx="10" cy="5.5" rx="1.7" ry="2.3"/><ellipse cx="14" cy="5.5" rx="1.7" ry="2.3"/><path d="M12 12c-3 0-5.5 3.2-5.5 5.4 0 1.8 1.6 2.6 3 2.1 1.1-.4 1.6-.9 2.5-.9s1.4.5 2.5.9c1.4.5 3-.3 3-2.1C17.5 15.2 15 12 12 12z"/>',
    shield: '<path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6l7-3z"/><path d="m9 12 2 2 4-4"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    spark: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.3 2.4 2.4 4.8-5"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    phone: '<path d="M6.6 3.5h2.6l1.4 4.1-2 1.4a12.4 12.4 0 0 0 6.4 6.4l1.4-2 4.1 1.4v2.6a2 2 0 0 1-2.1 2C10.7 19 5 13.3 4.6 5.6a2 2 0 0 1 2-2.1z"/>',
    pin: '<path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/>',
    facebook: '<path d="M14 8.5V6.8c0-.8.5-1.3 1.3-1.3H17V2.5h-2.6C11.9 2.5 11 4 11 6.3v2.2H8.5v3H11v10h3v-10h2.6l.4-3H14z" fill="currentColor" stroke="none"/>',
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    clipboard: '<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5V3.5h6v1M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.6c2.3.2 4 1.7 4.5 4.4"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    chat: '<path d="M4 5.5h16v10H9l-5 4v-14z"/>',
    sliders: '<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="9" cy="6" r="2" fill="var(--surface)"/><circle cx="15" cy="12" r="2" fill="var(--surface)"/><circle cx="8" cy="18" r="2" fill="var(--surface)"/>',
    home: '<path d="M4 11 12 4l8 7v9h-5.5v-5.5h-5V20H4z"/>',
    logout: '<path d="M14 4.5h4.5v15H14M10 8l-4 4 4 4M6 12h10"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (I[name] || "") + "</svg>";
  }

  /* ---------- feniks (SVG) ---------- */
  let pid = 0;
  function phoenix(cls, glow, style) {
    const id = "ph" + (++pid);
    const wing = "M206 176 C244 138 296 88 376 34 C356 66 346 82 358 90 C334 104 322 118 336 126 C310 138 300 150 312 160 C290 170 276 180 286 190 C262 196 242 206 226 222 Z";
    const wingInner = "M214 186 C250 160 288 130 330 104 M218 196 C250 178 280 160 308 146 M222 206 C248 194 268 184 286 176";
    const body = "M200 128 C212 128 215 148 211 172 C218 202 213 238 200 266 C187 238 182 202 189 172 C185 148 188 128 200 128 Z";
    const tail = "M198 252 C184 300 152 334 118 392 C158 358 180 334 196 304 Z M202 256 C196 314 176 350 168 398 C196 360 206 318 204 262 Z";
    const crest = "M200 112 C196 96 200 84 210 72 C206 88 208 98 204 112 Z M194 114 C186 104 184 92 188 80 C190 94 194 102 198 112 Z";
    return '<svg class="' + (cls || "") + '"' + (style ? ' style="' + style + '"' : "") + ' viewBox="0 0 400 410" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6a14a"/><stop offset=".4" stop-color="#e8692c"/><stop offset=".75" stop-color="#d14a1c"/><stop offset="1" stop-color="#a8341a" stop-opacity=".45"/></linearGradient>' +
      '<radialGradient id="' + id + 'r" cx=".5" cy=".38" r=".55"><stop offset="0" stop-color="#ffcf87" stop-opacity=".55"/><stop offset="1" stop-color="#e8572a" stop-opacity="0"/></radialGradient>' +
      (glow ? '<filter id="' + id + 'f" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' : "") +
      "</defs>" +
      (glow ? '<circle cx="200" cy="170" r="190" fill="url(#' + id + 'r)"/>' : "") +
      '<g fill="url(#' + id + 'g)"' + (glow ? ' filter="url(#' + id + 'f)"' : "") + ">" +
      '<path d="' + wing + '"/><path d="' + wing + '" transform="translate(400 0) scale(-1 1)"/>' +
      '<path d="' + body + '"/><circle cx="200" cy="122" r="10"/>' +
      '<path d="' + crest + '"/><path d="' + crest + '" transform="translate(400 0) scale(-1 1)"/>' +
      '<path d="' + tail + '"/><path d="' + tail + '" transform="translate(400 0) scale(-1 1)"/>' +
      '<path d="M200 262 C194 320 200 360 200 408 C200 360 206 320 200 262 Z"/>' +
      "</g>" +
      (glow ? '<g fill="none" stroke="#ffe2a3" stroke-opacity=".45" stroke-width="1.4" stroke-linecap="round"><path d="' + wingInner + '"/><path d="' + wingInner + '" transform="translate(400 0) scale(-1 1)"/></g>' : "") +
      "</svg>";
  }

  /* ---------- logo (images/logo.avif) ---------- */
  const LOGO_SRC = "images/logo.avif";
  function logo(cls, style) {
    return '<img class="logo-img' + (cls ? " " + cls : "") + '" src="' + LOGO_SRC + '" alt=""' + (style ? ' style="' + style + '"' : "") + ">";
  }

  /* ---------- header & footer ---------- */
  function header(active) {
    const links = NAV.map((n) => '<li><a href="' + n.href + '"' + (n.key === active ? ' class="active" aria-current="page"' : "") + ">" + n.label + "</a></li>").join("") + '<li class="mobile-only"><a href="contact.html"' + (active === "contact" ? ' class="active"' : "") + '>Contact</a></li>';
    return '<header class="site-header" id="top">' +
      '<div class="container nav">' +
      '<a class="brand" href="index.html" aria-label="Rise Like A Phoenix, naar home">' + logo() + "<span>Rise Like A Phoenix</span></a>" +
      '<ul class="nav-links" id="nav-links">' + links + "</ul>" +
      '<div class="nav-cta"><a class="btn btn-primary btn-sm" href="contact.html">Contact</a>' +
      '<button class="nav-toggle" aria-label="Menu openen" aria-expanded="false" aria-controls="nav-links"><span></span><span></span><span></span></button></div>' +
      "</div></header>";
  }
  function footer() {
    const S = window.SITE || {};
    const social = [];
    if (S.facebook) social.push('<a href="' + S.facebook + '" target="_blank" rel="noopener" aria-label="Facebook">' + icon("facebook") + "</a>");
    if (S.instagram) social.push('<a href="' + S.instagram + '" target="_blank" rel="noopener" aria-label="Instagram">' + icon("instagram") + "</a>");
    return '<footer class="site-footer"><div class="container">' +
      '<div class="footer-grid">' +
      '<div><a class="brand" href="index.html">' + logo() + "<span>Rise Like A Phoenix</span></a>" +
      '<p style="margin-top:14px;max-width:300px">Transformeer je leven door Energiegenezing.</p>' +
      (social.length ? '<div class="socials">' + social.join("") + "</div>" : "") + "</div>" +
      "<div><h4>Menu</h4><ul>" + NAV.map((n) => '<li><a href="' + n.href + '">' + n.label + "</a></li>").join("") + '<li><a href="contact.html">Contact</a></li></ul></div>' +
      '<div><h4>Voorwaarden</h4><ul><li><a href="' + S.privacy + '" target="_blank" rel="noopener">Privacy Verklaring</a></li><li><a href="' + S.cookies + '" target="_blank" rel="noopener">Cookies</a></li><li><a href="login.html">Inloggen</a></li></ul></div>' +
      "<div><h4>Contact</h4><ul>" +
      "<li>" + S.eigenaar + "</li>" +
      '<li><a href="tel:' + S.telefoonLink + '">' + S.telefoon + "</a></li>" +
      '<li><a href="mailto:' + S.email + '">' + S.email + "</a></li>" +
      "<li>" + (S.adres || []).join("<br>") + "</li></ul></div>" +
      "</div>" +
      '<div class="footer-bottom"><span>© ' + new Date().getFullYear() + " Rise Like A Phoenix · " + S.eigenaar + "</span><span>" + S.iban + " · BTW " + S.btw + "</span></div>" +
      "</div></footer>";
  }

  /* ---------- sintels (canvas) ---------- */
  function embers(canvas) {
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    let w, h, parts = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(initial) {
      return { x: w * (0.35 + Math.random() * 0.65), y: initial ? Math.random() * h : h + 10, r: 0.6 + Math.random() * 2.2, vy: 0.25 + Math.random() * 0.9, vx: (Math.random() - 0.5) * 0.35, life: 0, max: 200 + Math.random() * 300, hue: 18 + Math.random() * 25 };
    }
    size(); window.addEventListener("resize", size);
    const count = w < 700 ? 35 : 70;
    for (let i = 0; i < count; i++) parts.push(spawn(true));
    let visible = true;
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(canvas);
    (function loop() {
      requestAnimationFrame(loop);
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      parts.forEach((p, i) => {
        p.life++; p.y -= p.vy; p.x += p.vx + Math.sin((p.life + i) / 30) * 0.25;
        const a = Math.max(0, Math.sin((p.life / p.max) * Math.PI));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "hsla(" + p.hue + ",90%,58%," + a * 0.55 + ")";
        ctx.shadowColor = "hsla(" + p.hue + ",100%,60%,1)"; ctx.shadowBlur = 8;
        ctx.fill();
        if (p.life > p.max || p.y < -10) parts[i] = spawn(false);
      });
    })();
  }

  /* ---------- init ---------- */
  function init() {
    const active = document.body.dataset.page;
    const h = document.getElementById("site-header");
    const f = document.getElementById("site-footer");
    if (h) h.outerHTML = header(active);
    if (f) f.outerHTML = footer();

    document.querySelectorAll("[data-icon]").forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
    document.querySelectorAll("[data-phoenix]").forEach((el) => { el.outerHTML = logo(el.className, el.getAttribute("style")); });
    document.querySelectorAll("[data-img]").forEach((el) => { const src = (window.IMAGES || {})[el.dataset.img]; if (src) el.src = src; });
    document.querySelectorAll("[data-site]").forEach((el) => { const v = (window.SITE || {})[el.dataset.site]; if (v) el.textContent = Array.isArray(v) ? v.join(" ") : v; });

    const hdr = document.querySelector(".site-header");
    if (hdr) {
      if (document.body.dataset.solid !== undefined) hdr.classList.add("solid");
      const onScroll = () => hdr.classList.toggle("scrolled", window.scrollY > 20);
      onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
      const t = hdr.querySelector(".nav-toggle"), l = hdr.querySelector(".nav-links");
      t && t.addEventListener("click", () => { const o = l.classList.toggle("open"); t.setAttribute("aria-expanded", o); });
    }

    embers(document.getElementById("embers"));

    /* gegevens aangepast in de admin? footer opnieuw opbouwen */
    window.addEventListener("rlap:settings", () => { const ft = document.querySelector(".site-footer"); if (ft) ft.outerHTML = footer(); });

    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    document.querySelectorAll(".testimonial .toggle").forEach((b) => b.addEventListener("click", () => {
      const t = b.closest(".testimonial"); const o = t.classList.toggle("open"); b.textContent = o ? "Minder lezen" : "Lees verder";
    }));

    if (window.DB && DB.isDemo && !document.body.dataset.noDemoBanner && !sessionStorage.getItem("rlap_hide_demo")) {
      const d = document.createElement("div"); d.className = "demo-banner";
      d.innerHTML = '<button aria-label="Sluiten">×</button><strong>Demomodus.</strong> Firebase is nog niet gekoppeld: ingevulde formulieren worden enkel in deze browser bewaard. Vul <code>js/config.js</code> in om live te gaan.';
      d.querySelector("button").onclick = () => { d.remove(); sessionStorage.setItem("rlap_hide_demo", "1"); };
      document.body.appendChild(d);
    }
  }

  window.UI = { icon, phoenix, logo };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
