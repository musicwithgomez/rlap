/* Prijskaarten (uit SESSIE_TYPES in config.js) en het contactformulier */
(function () {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const T = window.SESSIE_TYPES || {};

  function priceCard(typeKey, p, featured) {
    const t = T[typeKey];
    const desc = t.kort;
    return '<div class="card price-card reveal in' + (featured ? " featured" : "") + '">' +
      '<span class="count">' + p.sessies + "</span>" +
      '<span class="badge">' + esc(t.naam) + "</span>" +
      '<h3 style="margin-top:8px">' + esc(p.naam) + "</h3>" +
      '<div class="meta"><span>' + esc(p.duur) + "</span><span>" + p.sessies + (p.sessies === 1 ? " sessie" : " sessies") + "</span></div>" +
      '<div class="price">€' + p.prijs + "</div>" +
      "<p>" + esc(desc) + "</p>" +
      '<a class="btn btn-primary" href="vragenlijst.html?sessie=' + typeKey + "&pakket=" + p.id + '">Boek Nu <span class="arrow">→</span></a>' +
      "</div>";
  }

  function renderPrices() {
  /* losse prijzen in de tekst: <span data-pakket-prijs="hartmuur-3"> */
  const pk = (id) => Object.values(T).flatMap((t) => t.pakketten || []).find((p) => p.id === id);
  document.querySelectorAll("[data-pakket-prijs]").forEach((el) => { const p = pk(el.dataset.pakketPrijs); if (p) el.textContent = "€" + p.prijs; });
  document.querySelectorAll("[data-pakket-duur]").forEach((el) => { const p = pk(el.dataset.pakketDuur); if (p) el.textContent = p.duur; });
  /* <div data-prices="bodycode"> toont de pakketten van dat sessietype */
  document.querySelectorAll("[data-prices]").forEach((el) => {
    const k = el.dataset.prices;
    if (T[k]) el.innerHTML = T[k].pakketten.map((p, i) => priceCard(k, p, T[k].pakketten.length > 1 && i === 1)).join("");
  });

  const all = document.getElementById("all-prices");
  if (all) {
    all.innerHTML = Object.keys(T).map((k) => {
      const t = T[k];
      const link = { hartmuur: "hartmuur.html", bodycode: "bodycode-emotiecode.html", beliefcode: "belief-code.html", dieren: "emotiecode-dieren.html" }[k];
      return '<div style="margin-bottom:64px"><div class="section-head" style="margin-bottom:24px;display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap"><h2 style="margin:0">' + esc(t.naam) + "</h2>" +
        (link ? '<a class="link-arrow" href="' + link + '">Lees meer... <span>→</span></a>' : "") + "</div>" +
        '<div class="grid grid-3">' + t.pakketten.map((p, i) => priceCard(k, p, t.pakketten.length > 1 && i === 1)).join("") + "</div></div>";
    }).join("");
  }
  }
  renderPrices();
  /* prijzen aangepast in de admin? dan opnieuw tonen */
  window.addEventListener("rlap:settings", renderPrices);

  /* ---------- reviewformulier (review.html?t=<traject>&n=<voornaam>) ---------- */
  const rf = document.getElementById("review-form");
  if (rf) {
    const qs = new URLSearchParams(location.search);
    if (qs.get("n")) rf.naam.value = qs.get("n");
    const msg = document.getElementById("review-msg");
    rf.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (rf.website.value) return;
      const naam = rf.naam.value.trim(), tekst = rf.tekst.value.trim();
      if (!naam || !tekst) { msg.className = "form-msg show err"; msg.textContent = "Vul je naam en je ervaring in."; return; }
      const btn = rf.querySelector("button[type=submit]"); btn.disabled = true;
      try {
        await DB.add("reviews", { naam, tekst, sterren: +rf.sterren.value, toestemming: rf.toestemming.checked, trajectId: (qs.get("t") || "").slice(0, 60), status: "nieuw" });
        rf.classList.add("hidden"); document.getElementById("review-done").classList.remove("hidden");
      } catch (err) {
        console.error(err); msg.className = "form-msg show err"; msg.textContent = "Versturen lukte niet. Probeer het later opnieuw."; btn.disabled = false;
      }
    });
  }

  /* ---------- goedgekeurde reviews op de homepagina ---------- */
  const tl = document.querySelector("[data-live-reviews]");
  if (tl && window.DB) {
    const kort = (n) => { const p = String(n || "").trim().split(/\s+/); return p[0] + (p[1] ? " " + p[1][0] + "." : ""); };
    DB.where("reviews", "status", "goedgekeurd").then((rows) => {
      tl.insertAdjacentHTML("afterbegin", rows.filter((r) => r.toestemming).map((r) =>
        '<article class="card testimonial reveal in"><div class="who">' + esc(kort(r.naam)) + '</div><p style="color:var(--gold);margin:-6px 0 8px">' + "★".repeat(r.sterren || 5) + "</p><p>“" + esc(r.tekst) + "”</p></article>").join(""));
    }).catch((e) => console.warn("Reviews niet geladen", e));
  }

  /* ---------- contactformulier ---------- */
  const form = document.getElementById("contact-form");
  if (form) {
    const msg = document.getElementById("contact-msg");
    const show = (type, text) => { msg.className = "form-msg show " + type; msg.textContent = text; };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(form);
      if (f.get("website")) return; // spam
      const naam = (f.get("naam") || "").trim(), email = (f.get("email") || "").trim(), bericht = (f.get("bericht") || "").trim();
      if (!naam || !/^\S+@\S+\.\S+$/.test(email) || !bericht) return show("err", "Vul je naam, een geldig e-mailadres en je bericht in.");
      if (!f.get("akkoord")) return show("err", "Vink het akkoord met de privacyverklaring aan.");
      const btn = form.querySelector("button[type=submit]"); btn.disabled = true;
      try {
        const b = { naam, email, telefoon: (f.get("telefoon") || "").trim(), onderwerp: f.get("onderwerp") || "", bericht, status: "nieuw" };
        await DB.add("berichten", b);
        if (window.MAIL) await Promise.allSettled([MAIL.mail("nieuwBericht", MAIL.admin, b), MAIL.mail("berichtOntvangen", email, b)]);
        form.reset();
        show("ok", "Merci voor je bericht! Ik neem zo snel mogelijk contact met je op.");
      } catch (err) {
        console.error(err);
        show("err", "Versturen lukte niet. Mail me gerust rechtstreeks via nathalie@riselikeaphoenix.be.");
      } finally { btn.disabled = false; }
    });
  }
})();
