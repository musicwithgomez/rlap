/* =========================================================
   ADMIN — klantenoverzicht (trajecten), te doen, sessies,
   berichten, reviews, vragen, facturen en automatische mails.

   Een TRAJECT = één aanvraag (vragenlijst) + de sessies die eraan hangen.
   De fase van elk traject wordt automatisch berekend.
   ========================================================= */
(function () {
  const T = window.SESSIE_TYPES || {};
  const S = window.SITE || {};
  const M = window.MAIL || { enabled: false, mail: async () => false };
  const EM = window.EMAIL || {};
  const ic = (n) => UI.icon(n);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString("nl-BE", { day: "2-digit", month: "short", year: "numeric" }) : "–");
  const fmtDateTime = (ms) => (ms ? new Date(ms).toLocaleString("nl-BE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "–");
  const fmtDay = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("nl-BE", { weekday: "short", day: "2-digit", month: "short" }) : "–");
  const typeName = (k) => (T[k] ? T[k].naam : k || "–");
  const lc = (s) => String(s || "").trim().toLowerCase();
  const status = (s) => '<span class="status st-' + esc(s || "nieuw") + '">' + esc(s || "nieuw") + "</span>";
  const isoDay = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
  const today = () => isoDay(new Date());
  const plusDays = (n) => isoDay(Date.now() + n * 864e5);
  const daysSince = (ms) => Math.floor((Date.now() - (ms || Date.now())) / 864e5);
  const euro = (n) => "€" + Number(n || 0).toLocaleString("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const SES_STATUS = ["gepland", "afgerond", "geannuleerd"];
  const BR_STATUS = ["nieuw", "bekeken", "afgerond"];
  const FASES = [
    { k: "nieuw", l: "Nieuwe aanvraag", hint: "Lees de vragenlijst" },
    { k: "contact", l: "Contact & intake", hint: "Plan de eerste sessie" },
    { k: "gepland", l: "Ingepland", hint: "Eerste sessie gepland" },
    { k: "bezig", l: "Bezig", hint: "Sessies lopen" },
    { k: "bijna", l: "Bijna klaar", hint: "Nog 1 sessie" },
    { k: "afgerond", l: "Afgerond", hint: "Nazorg & review" }
  ];
  const faseLabel = (k) => (FASES.find((f) => f.k === k) || { l: k === "archief" ? "Archief" : k }).l;
  const fase = (k) => '<span class="fase fase-' + k + '">' + esc(faseLabel(k)) + "</span>";

  const data = { vragenlijsten: [], klanten: [], sessies: [], berichten: [], reviews: [], vragen: {}, mailteksten: {} };
  let current = "overzicht";
  const filters = { tr: { q: "", archief: false }, kl: { q: "" }, ses: { q: "", status: "", wanneer: "komend" }, br: { q: "", status: "" }, rv: "nieuw" };

  /* ---------- toast & panel ---------- */
  function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("show"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 3200); }
  function openPanel(title, body, foot) {
    $("#panel-title").innerHTML = title; $("#panel-body").innerHTML = body; $("#panel-foot").innerHTML = foot || ""; $("#panel-foot").style.display = foot ? "" : "none";
    $("#panel-body").scrollTop = 0;
    $("#panel").classList.add("open"); $("#panel-back").classList.add("open"); $("#panel").setAttribute("aria-hidden", "false");
  }
  function closePanel() { lastTraject = null; flushNotes().catch(() => toast("Je laatste notities zijn nog niet bewaard. Controleer je internet.")); $("#panel").classList.remove("open"); $("#panel-back").classList.remove("open"); $("#panel").setAttribute("aria-hidden", "true"); }
  async function guard(fn, okMsg, keepPanel) {
    try { await flushNotes(); /* eerst alle getypte notities bewaren */ const r = await fn(); if (okMsg) toast(typeof okMsg === "function" ? okMsg(r) : okMsg); await loadAll(); render(); return r; }
    catch (e) { console.error(e); toast(DB.errorText(e)); }
  }
  const confirmDel = (what) => window.confirm("Ben je zeker dat je " + what + " wil verwijderen? Dit kan niet ongedaan gemaakt worden.");

  /* ---------- data ---------- */
  async function loadAll() {
    const [vl, kl, ses, br, rv, vr, mt] = await Promise.all([DB.list("vragenlijsten"), DB.list("klanten"), DB.list("sessies"), DB.list("berichten"), DB.list("reviews").catch(() => []), DB.getQuestions(), DB.getMailteksten()]);
    Object.assign(data, { vragenlijsten: vl, klanten: kl, sessies: ses, berichten: br, reviews: rv, vragen: vr, mailteksten: mt });
    /* notities die nog onderweg zijn naar Firestore gaan voor op wat er (nog) in de database staat */
    pendingNotes.forEach((p, sid) => { const s = ses.find((x) => x.id === sid); if (s) s.notities = p.text; });
    const badge = (id, n) => { $(id).textContent = n; $(id).classList.toggle("hidden", !n); };
    badge("#c-tr", trajecten().filter((t) => t.fase === "nieuw").length);
    badge("#c-br", br.filter((v) => (v.status || "nieuw") === "nieuw").length + rv.filter((v) => (v.status || "nieuw") === "nieuw").length);
    badge("#c-todo", todos().length);
  }

  /* ---------- trajecten ---------- */
  function pakketTotaal(v) {
    const p = ((T[v.sessieType] || {}).pakketten || []).find((x) => x.id === v.pakket);
    return v.sessiesTotaal || (p ? p.sessies : 1);
  }
  function traject(v) {
    const ses = data.sessies.filter((s) => s.vragenlijstId === v.id).sort((a, b) => ((a.datum || "") + (a.tijd || "")).localeCompare((b.datum || "") + (b.tijd || "")));
    const totaal = pakketTotaal(v);
    const gedaan = ses.filter((s) => s.status === "afgerond").length;
    const gepland = ses.filter((s) => s.status === "gepland");
    const volgende = gepland.find((s) => (s.datum || "") >= today());
    const achterstand = gepland.filter((s) => (s.datum || "") < today());
    let f;
    if (v.status === "gearchiveerd") f = "archief";
    else if (v.status === "afgerond" || gedaan >= totaal) f = "afgerond";
    else if (gedaan > 0 && totaal - gedaan === 1) f = "bijna";
    else if (gedaan > 0) f = "bezig";
    else if (gepland.length) f = "gepland";
    else if ((v.status || "nieuw") === "nieuw") f = "nieuw";
    else f = "contact";
    const review = data.reviews.find((r) => r.trajectId === v.id);
    const mails = v.mails || [];
    return { v, id: v.id, ses, totaal, gedaan, gepland, volgende, achterstand, fase: f, review, mails, betaald: !!v.betaald };
  }
  const trajecten = () => data.vragenlijsten.map(traject);
  const mailSent = (t, type) => t.mails.some((m) => m.type === type);
  async function logMail(v, type) {
    const mails = [...(v.mails || []), { type, op: Date.now() }];
    await DB.update("vragenlijsten", v.id, { mails }); v.mails = mails;
  }
  const MAILNAMEN = { bevestiging: "Bevestiging aanvraag", sessieGepland: "Sessie ingepland", herinnering: "Herinnering", sessieAfgerond: "Sessie afgerond", bijnaKlaar: "Nog 1 sessie", review: "Vraag om review" };
  const mailNaam = (type) => (type.startsWith("app_") ? ((data.mailteksten[type.slice(4)] || {}).naam || type.slice(4)) + " · via Mail-app" : (MAILNAMEN[type] || type) + " · automatisch");

  /* ---------- 1-klik mails via de Mail-app (mailto) ---------- */
  const siteBase = () => (S.website ? S.website.replace(/\/?$/, "/") : location.origin + location.pathname.replace(/[^/]*$/, ""));
  const langeDatum = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" }) : "");
  /* welke sessie hoort bij welke mail */
  function mailSessie(key, t) {
    const actief = t.ses.filter((s) => s.status !== "geannuleerd");
    if (key === "gepland" || key === "herinnering") { const s = t.volgende || t.gepland[t.gepland.length - 1]; return s ? { s, nr: actief.indexOf(s) + 1 } : null; }
    if (key === "afgerond" || key === "resultaten") { const done = actief.filter((s) => s.status === "afgerond"); const s = done[done.length - 1]; return s ? { s, nr: done.length } : null; }
    return { s: null, nr: t.gedaan };
  }
  function mailHref(key, t, extra) {
    const m = mailFill(key, t, extra); if (!m) return null;
    return "mailto:" + m.to + "?subject=" + encodeURIComponent(m.subject) + "&body=" + encodeURIComponent(m.body.replace(/\n/g, "\r\n"));
  }
  /* Opgemaakte versie (HTML) voor het klembord: alles vanaf "(Disclaimer" in kleine letters */
  function mailRich(key, t, extra) {
    const m = mailFill(key, t, extra); if (!m) return null;
    const i = m.body.search(/\(Disclaimer/i);
    const main = i > -1 ? m.body.slice(0, i).replace(/\s+$/, "") : m.body, small = i > -1 ? m.body.slice(i) : "";
    const html = (s) => esc(s).replace(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/g, (u) => '<a href="' + (u.startsWith("http") ? u : "https://" + u) + '">' + u + "</a>").replace(/\n/g, "<br>");
    return { plain: m.body, html: '<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#3b2a21">' + html(main) +
      (small ? '<br><br><div style="font-size:10px;line-height:1.45;color:#9a8577">' + html(small) + "</div>" : "") + "</div>" };
  }
  async function copyRich(key, t, extra) {
    const r = mailRich(key, t, extra); if (!r || !navigator.clipboard) return false;
    try {
      if (window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([r.html], { type: "text/html" }), "text/plain": new Blob([r.plain], { type: "text/plain" }) })]);
      else await navigator.clipboard.writeText(r.plain);
      return true;
    } catch (e) { console.warn("Klembord niet beschikbaar", e); return false; }
  }
  function mailFill(key, t, extra) {
    const tpl = data.mailteksten[key]; if (!tpl) return null;
    const v = t.v, ms = mailSessie(key, t) || { s: null, nr: 0 }, s = (extra && extra.s) || ms.s;
    const nr = (extra && extra.nr) || ms.nr;
    const voornaam = String(v.naam || "").trim().split(/\s+/)[0] || "";
    const vars = {
      voornaam, naam: v.naam || "", sessie: v.sessieNaam || typeName(v.sessieType), pakket: v.pakketNaam || "", prijs: v.prijs || "", dier: (v.dier && v.dier.naam) || "",
      datum: s ? langeDatum(s.datum) : "", tijd: (s && s.tijd) || "", vorm: (s && s.vorm) || "", nr, totaal: t.totaal, rest: Math.max(0, t.totaal - (key === "afgerond" ? nr : t.gedaan)),
      intake: window.PLAN_LINK ? "Kies hier alvast zelf een moment voor ons kennismakingsgesprek: " + window.PLAN_LINK : "Ik neem binnen enkele dagen contact met je op om samen je eerste sessie in te plannen.",
      ebooklink: siteBase() + "downloads/rise-like-a-phoenix-ebook.pdf",
      reviewlink: siteBase() + "review.html?t=" + encodeURIComponent(v.id) + "&n=" + encodeURIComponent(voornaam),
      iban: S.iban || "", factuurnr: v.factuurNr || v.naam || "", telefoon: S.telefoon || "", boodschap: (extra && extra.boodschap) || "",
      notities: (s && String(s.notities || "").trim()) || "(Nog geen notities voor deze sessie.)"
    };
    const fill = (str) => String(str || "").replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return { to: v.email, subject: fill(tpl.onderwerp), body: fill(tpl.tekst).replace(/\n{5,}/g, "\n\n\n\n") };
  }
  const AANRADER = { nieuw: "welkom", contact: "welkom", gepland: "gepland", bezig: "resultaten", bijna: "resultaten", afgerond: "review" };
  const RICH = { resultaten: 1 }; /* mails met een opgemaakte versie (kleine disclaimer) */
  function richToast(ok) { toast(ok ? "Mail geopend ✓ Wil je de disclaimer in kleine letters? Druk in Mail op ⌘A en dan ⌘V." : "Mail geopend in je Mail-app"); }
  function mailButtons(t) {
    const keys = Object.keys(data.mailteksten);
    const can = (k) => (k === "gepland" || k === "herinnering" ? !!t.gepland.length : k === "afgerond" || k === "resultaten" ? t.gedaan > 0 : true);
    const aan = AANRADER[t.fase];
    const btn = (k, primary) => {
      const tpl = data.mailteksten[k];
      const done = mailSent(t, "app_" + k);
      if (!can(k)) return '<span class="btn btn-ghost btn-sm mail-btn is-disabled" title="' + (k === "afgerond" ? "Nog geen afgeronde sessie" : "Nog geen geplande sessie") + '">' + esc(tpl.naam) + "</span>";
      return '<a class="btn ' + (primary ? "btn-primary" : "btn-ghost") + ' btn-sm mail-btn" href="' + esc(mailHref(k, t)) + '" data-mlog="' + k + '">' + ic("mail") + " " + esc(tpl.naam) + (done ? " ✓" : "") + "</a>";
    };
    return '<p class="hint" style="margin:0 0 10px">Eén klik opent de mail kant-en-klaar in je Mail-app. Jij drukt enkel nog op Versturen.</p>' +
      '<div class="mail-grid">' + keys.filter((k) => can(k)).map((k) => btn(k, false)).join("") + "</div>" +
      mailLog(t);
  }
  /* Verstuurde mails: per soort gegroepeerd, standaard dichtgeklapt */
  function mailLog(t) {
    if (!t.mails.length) return "";
    const groups = {};
    t.mails.forEach((m) => { const g = groups[m.type] || (groups[m.type] = { type: m.type, n: 0, last: 0 }); g.n++; g.last = Math.max(g.last, m.op || 0); });
    const rows = Object.values(groups).sort((a, b) => b.last - a.last);
    return '<details class="mail-log"><summary><span class="ml-ic">' + ic("mail") + '</span><span class="ml-title">Verstuurde mails</span><span class="ml-cnt">' + rows.length + '</span><span class="ml-last">' + esc(mailNaam(rows[0].type).split(" · ")[0]) + " · " + fmtDate(rows[0].last) + '</span><span class="ml-arrow">' + ic("down") + "</span></summary>" +
      '<ul class="ml-list">' + rows.map((g) => '<li class="ml-row">' +
        '<span class="ml-dot ' + (g.type.startsWith("app_") ? "app" : "auto") + '"></span>' +
        '<span class="ml-text"><span class="ml-name">' + esc(mailNaam(g.type).split(" · ")[0]) + (g.n > 1 ? '<span class="ml-times">' + g.n + "×</span>" : "") + "</span>" +
        '<span class="ml-meta">' + (g.type.startsWith("app_") ? "Via Mail-app" : "Automatisch") + " · " + fmtDateTime(g.last) + "</span></span>" +
        '<button type="button" class="ml-del" data-mdel="' + esc(g.type) + '" aria-label="Verwijder uit lijst" title="Verwijder uit lijst">' + ic("trash") + "</button></li>").join("") +
      '</ul><div class="ml-foot"><button type="button" class="ml-clear" data-mdel="*">' + ic("trash") + "Lijst leegmaken</button></div></details>";
  }
  function bindMailButtons(t, reopen) {
    $$("[data-mdel]").forEach((b) => b.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      const type = b.dataset.mdel;
      const naam = type === "*" ? "alle verstuurde mails" : "'" + mailNaam(type).split(" · ")[0] + "'";
      if (!confirm("Wil je " + naam + " uit deze lijst verwijderen? (De mail zelf blijft verstuurd.)")) return;
      const mails = type === "*" ? [] : (t.v.mails || []).filter((m) => m.type !== type);
      guard(() => DB.update("vragenlijsten", t.v.id, { mails }), "Verwijderd uit de lijst").then(() => {
        if (reopen) { reopen(); const d = $("details.mail-log"); if (d && mails.length) d.open = true; }
      });
    }));
    $$("[data-mlog]").forEach((a) => a.addEventListener("click", (e) => {
      e.stopPropagation(); /* niet ook de sessie openen */
      const sid = a.dataset.mses, s = sid ? data.sessies.find((x) => x.id === sid) : null;
      if (RICH[a.dataset.mlog]) copyRich(a.dataset.mlog, t, s ? { s, nr: +a.dataset.nr || undefined } : undefined).then(richToast); else toast("Mail geopend in je Mail-app ✓");
      if (s && a.dataset.mlog === "resultaten") DB.update("sessies", s.id, { resultatenGemaild: Date.now() }).catch(() => {});
      logMail(t.v, "app_" + a.dataset.mlog).then(() => { loadAll().then(() => { render(); if (reopen) reopen(); }); }).catch((e) => console.warn(e));
    }));
  }
  function openMail(href) { if (href) window.location.href = href; }

  /* Klanten = klantenfiches + iedereen die een vragenlijst invulde of een sessie heeft (gegroepeerd op e-mail) */
  function clients() {
    const map = new Map();
    const get = (email) => { const k = lc(email); if (!map.has(k)) map.set(k, { email: k, naam: "", telefoon: "", notities: "", fiche: null, vragenlijsten: [], sessies: [], laatste: 0 }); return map.get(k); };
    data.klanten.forEach((k) => { const c = get(k.email); c.fiche = k; c.naam = k.naam || c.naam; c.telefoon = k.telefoon || c.telefoon; c.notities = k.notities || ""; c.laatste = Math.max(c.laatste, k.createdAt || 0); });
    data.vragenlijsten.forEach((v) => { const c = get(v.email); c.vragenlijsten.push(v); if (!c.naam) c.naam = v.naam; if (!c.telefoon) c.telefoon = v.telefoon; c.laatste = Math.max(c.laatste, v.createdAt || 0); });
    data.sessies.forEach((s) => { const c = get(s.klantEmail); c.sessies.push(s); if (!c.naam) c.naam = s.klantNaam; const d = s.datum ? new Date(s.datum).getTime() : 0; c.laatste = Math.max(c.laatste, Math.min(d, Date.now()) || 0, s.createdAt || 0); });
    map.delete("");
    return [...map.values()].sort((a, b) => b.laatste - a.laatste);
  }

  /* ---------- te doen ---------- */
  /* Elke taak heeft een knop die het werk meteen doet (act). Klik op de rest van de regel = openen. */
  function todos() {
    const out = [];
    trajecten().forEach((t) => {
      if (t.fase === "archief") return;
      const n = "<strong>" + esc(t.v.naam) + "</strong>";
      const nrOf = (s) => t.ses.filter((x) => x.status !== "geannuleerd").indexOf(s) + 1;
      if (["nieuw", "contact"].includes(t.fase) && !mailSent(t, "app_welkom"))
        out.push({ p: 1, icon: "mail", txt: n + " vroeg " + esc(typeName(t.v.sessieType)) + " aan", sub: "Stuur je welkomstmail met het e-book", tr: t.id, act: { kind: "mail", key: "welkom", label: "Welkomstmail" } });
      else if (t.fase === "contact")
        out.push({ p: 2, icon: "calendar", txt: "Eerste sessie van " + n + " inplannen", sub: daysSince(t.v.createdAt) ? "Wacht sinds " + daysSince(t.v.createdAt) + (daysSince(t.v.createdAt) === 1 ? " dag" : " dagen") : "Vandaag aangevraagd", tr: t.id, act: { kind: "plan", label: "Inplannen" } });
      if (t.achterstand.length) {
        /* één taak per klant, voor de laatste voorbije sessie (niet de oudste) */
        const s = t.achterstand[t.achterstand.length - 1], ouder = t.achterstand.slice(0, -1), heeft = String(s.notities || "").trim();
        out.push({ p: 1, icon: "clipboard", txt: (heeft ? "Sessie " + nrOf(s) + " van " + n + " afronden" : "Resultaten van sessie " + nrOf(s) + " invullen voor " + n),
          sub: fmtDay(s.datum) + (heeft ? " · notities staan klaar" : "") + (ouder.length ? " · sessie " + ouder.map(nrOf).join(" en ") + " ook nog open" : ""),
          tr: t.id, act: { kind: "results", sid: s.id, label: heeft ? "Afronden" : "Invullen" } });
      }
      /* afgerond maar resultaten nog niet gemaild (laatste 14 dagen) */
      t.ses.filter((s) => s.status === "afgerond" && !s.resultatenGemaild && (s.afgerondOp || 0) > Date.now() - 14 * 864e5).forEach((s) => {
        const heeft = String(s.notities || "").trim();
        out.push({ p: 1, icon: "mail", txt: "Resultaten van sessie " + nrOf(s) + " naar " + n + " mailen", sub: heeft ? "Je notities staan klaar" : "Nog geen notities ingevuld", tr: t.id,
          act: heeft ? { kind: "mail", key: "resultaten", sid: s.id, nr: nrOf(s), label: "Mailen" } : { kind: "results", sid: s.id, label: "Invullen" } });
      });
      if (!t.betaald && ["gepland", "bezig", "bijna"].includes(t.fase)) out.push({ p: 3, icon: "shield", txt: n + " heeft nog niet betaald", sub: esc(t.v.pakketNaam) + " · €" + esc(t.v.prijs), tr: t.id, act: { kind: "paid", label: "✓ Betaald" } });
      if (["bezig", "bijna"].includes(t.fase) && !t.volgende && !t.achterstand.length && t.gedaan < t.totaal) out.push({ p: 2, icon: "calendar", txt: "Sessie " + (t.gedaan + 1) + " van " + n + " inplannen", sub: t.gedaan + " van " + t.totaal + " gedaan", tr: t.id, act: { kind: "plan", label: "Inplannen" } });
      if (!M.enabled) {
        /* manuele mails: seintje op het juiste moment */
        const morgen = t.gepland.find((s) => s.datum === plusDays(1));
        if (morgen && !t.mails.some((m) => m.type === "app_herinnering" && m.op > Date.now() - 2 * 864e5)) out.push({ p: 2, icon: "mail", txt: "Herinnering sturen naar " + n, sub: "Sessie morgen" + (morgen.tijd ? " om " + esc(morgen.tijd) : ""), tr: t.id, act: { kind: "mail", key: "herinnering", label: "Herinnering" } });
        if (t.fase === "bijna" && !mailSent(t, "app_bijnaKlaar")) out.push({ p: 3, icon: "mail", txt: "Vervolg voorstellen aan " + n, sub: "Nog 1 sessie te gaan", tr: t.id, act: { kind: "mail", key: "bijnaKlaar", label: "Mail" } });
        const klaar = t.v.afgerondOp || Math.max(0, ...t.ses.map((s) => s.afgerondOp || 0));
        if (t.fase === "afgerond" && !t.review && !mailSent(t, "app_review") && klaar && Date.now() - klaar >= (EM.reviewNaDagen || 14) * 864e5) out.push({ p: 3, icon: "star", txt: "Vraag " + n + " hoe het gaat", sub: "Afgerond " + daysSince(klaar) + " dagen geleden · met reviewlink", tr: t.id, act: { kind: "mail", key: "review", label: "Mail" } });
      }
    });
    data.reviews.filter((r) => (r.status || "nieuw") === "nieuw").forEach((r) => out.push({ p: 2, icon: "star", txt: "Nieuwe review van <strong>" + esc(r.naam) + "</strong>", sub: "“" + esc((r.tekst || "").slice(0, 70)) + ((r.tekst || "").length > 70 ? "…" : "") + "”", rv: r.id, act: r.toestemming ? { kind: "rvok", rv: r.id, label: "Op site zetten" } : null }));
    data.berichten.filter((b) => (b.status || "nieuw") === "nieuw").forEach((b) => out.push({ p: 2, icon: "chat", txt: "Bericht van <strong>" + esc(b.naam) + "</strong>", sub: esc(b.onderwerp || (b.bericht || "").slice(0, 60)), br: b.id, act: { kind: "read", label: "Lezen" } }));
    return out.sort((a, b) => a.p - b.p);
  }
  /* knop van een taak */
  function todoAct(x) {
    const a = x.act; if (!a) return "";
    if (a.kind === "mail") {
      const v = data.vragenlijsten.find((y) => y.id === x.tr), t = traject(v), s = a.sid ? data.sessies.find((y) => y.id === a.sid) : null;
      return '<a class="btn btn-primary btn-sm td-act" href="' + esc(mailHref(a.key, t, s ? { s, nr: a.nr } : undefined)) + '" data-tdmail="' + a.key + '" data-tr2="' + x.tr + '"' + (a.sid ? ' data-sid="' + a.sid + '" data-nr="' + (a.nr || "") + '"' : "") + ">" + ic("mail") + " " + a.label + "</a>";
    }
    const attrs = { paid: 'data-tdpaid="' + x.tr + '"', plan: 'data-tdplan="' + x.tr + '"', results: 'data-tdres="' + x.tr + '" data-sid="' + a.sid + '"', rvok: 'data-tdrvok="' + a.rv + '"', read: 'data-tdread="' + x.br + '"' }[a.kind];
    return '<button type="button" class="btn ' + (a.kind === "paid" ? "btn-ghost" : "btn-primary") + ' btn-sm td-act" ' + attrs + ">" + a.label + "</button>";
  }
  /* sessie inplannen voor een klant (traject) */
  const planFor = (v) => openSession(null, { klantEmail: v.email, klantNaam: v.naam, sessieType: v.sessieType, vragenlijstId: v.id });
  /* klant openen met een bepaalde sessiekaart open en klaar om te typen */
  function openResults(trId, sid) {
    lastTraject = trId; openSes = sid; openTraject(trId);
    setTimeout(() => { const ta = $('[data-snotes="' + sid + '"]'); if (ta) { ta.closest("details").scrollIntoView({ block: "center" }); ta.focus(); } }, 120);
  }
  function bindTodoActs() {
    $$(".td-act").forEach((b) => b.addEventListener("click", (e) => e.stopPropagation()));
    $$("[data-tdmail]").forEach((a) => a.addEventListener("click", () => {
      const v = data.vragenlijsten.find((y) => y.id === a.dataset.tr2), t = traject(v), key = a.dataset.tdmail;
      const s = a.dataset.sid ? data.sessies.find((y) => y.id === a.dataset.sid) : null;
      if (RICH[key]) copyRich(key, t, s ? { s, nr: +a.dataset.nr || undefined } : undefined).then(richToast); else toast("Mail geopend in je Mail-app ✓");
      (async () => {
        await logMail(v, "app_" + key);
        if (key === "welkom" && (v.status || "nieuw") === "nieuw") await DB.update("vragenlijsten", v.id, { status: "bekeken" });
        if (s && key === "resultaten") await DB.update("sessies", s.id, { resultatenGemaild: Date.now() });
        await loadAll(); render();
      })().catch((e) => console.warn(e));
    }));
    $$("[data-tdpaid]").forEach((b) => b.onclick = () => guard(() => DB.update("vragenlijsten", b.dataset.tdpaid, { betaald: true, betaaldOp: Date.now() }), "Als betaald aangeduid ✓"));
    $$("[data-tdplan]").forEach((b) => b.onclick = () => planFor(data.vragenlijsten.find((y) => y.id === b.dataset.tdplan)));
    $$("[data-tdres]").forEach((b) => b.onclick = () => openResults(b.dataset.tdres, b.dataset.sid));
    $$("[data-tdrvok]").forEach((b) => b.onclick = () => guard(() => DB.update("reviews", b.dataset.tdrvok, { status: "goedgekeurd" }), "Review staat op je website ✓"));
    $$("[data-tdread]").forEach((b) => b.onclick = () => openBericht(b.dataset.tdread));
  }

  /* ---------- render ---------- */
  /* subpagina's horen bij een hoofdmenu */
  const PARENT = { reviews: "berichten", vragen: "site", mailteksten: "site", klanten: "trajectenView" };
  function setTab(t) {
    current = t;
    const main = PARENT[t] || t;
    $$(".admin-tab[data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === main));
    $("#side").classList.remove("open");
    try { sessionStorage.setItem("rlap_admin_tab", t); } catch (e) {}
    render();
    window.scrollTo(0, 0);
  }
  function render() { ({ overzicht, trajectenView, klanten, sessies, berichten, reviews, vragen, mailteksten, site })[current](); }
  /* kleine tabjes bovenaan een pagina */
  const subnav = (items, active) => '<div class="subnav">' + items.map((x) => '<button data-sub="' + x[0] + '" class="' + (x[0] === active ? "active" : "") + '">' + x[1] + (x[2] ? ' <span class="cnt">' + x[2] + "</span>" : "") + "</button>").join("") + "</div>";
  const bindSubnav = () => $$("[data-sub]").forEach((b) => b.onclick = () => setTab(b.dataset.sub));
  const nieuwRv = () => data.reviews.filter((r) => (r.status || "nieuw") === "nieuw").length;
  const nieuwBr = () => data.berichten.filter((r) => (r.status || "nieuw") === "nieuw").length;
  const BR_NAV = () => subnav([["berichten", "Berichten", nieuwBr()], ["reviews", "Reviews", nieuwRv()]], current);
  const SET_NAV = () => subnav([["site", "Website &amp; prijzen"], ["vragen", "Vragenlijst"], ["mailteksten", "E-mailteksten"]], current);
  const top = (title, actions) => '<div class="admin-top"><h1>' + title + "</h1><div style=\"display:flex;gap:10px;flex-wrap:wrap\">" + (actions || "") + "</div></div>";
  const emptyState = (iconName, text) => '<div class="empty">' + ic(iconName) + "<p>" + text + "</p></div>";
  const bar = (a, b) => '<div class="progress-bar" title="' + a + " van " + b + '"><span style="width:' + Math.min(100, Math.round((a / Math.max(b, 1)) * 100)) + '%"></span></div>';

  /* ===== Overzicht ===== */
  function overzicht() {
    const td = todos();
    const vandaag = data.sessies.filter((s) => s.datum === today() && s.status !== "geannuleerd").sort((a, b) => (a.tijd || "99").localeCompare(b.tijd || "99"));
    const week = data.sessies.filter((s) => s.status === "gepland" && s.datum > today() && s.datum <= plusDays(7)).sort((a, b) => (a.datum + (a.tijd || "")).localeCompare(b.datum + (b.tijd || "")));
    const uur = new Date().getHours();
    const groet = (uur < 12 ? "Goeiemorgen" : uur < 18 ? "Dag" : "Goeienavond") + " Nathalie";
    const zin = [vandaag.length ? vandaag.length + (vandaag.length === 1 ? " sessie" : " sessies") + " vandaag" : "geen sessies vandaag", td.length ? td.length + (td.length === 1 ? " ding" : " dingen") + " te doen" : "niets te doen"];
    const sesRow = (s, metDag) => {
      const v = data.vragenlijsten.find((x) => x.id === s.vragenlijstId);
      return '<div class="day-ses t-' + esc(s.sessieType) + '"' + (v ? ' data-tr="' + v.id + '"' : ' data-ses="' + s.id + '"') + '><span class="ds-time">' + (metDag ? fmtDay(s.datum).replace(/ \d{4}$/, "") + "<br>" : "") + esc(s.tijd || "–") + '</span><span class="ds-main"><strong>' + esc(s.klantNaam || s.klantEmail) + '</strong><span class="sub">' + esc(typeName(s.sessieType)) + " · " + esc(s.vorm || "") + "</span></span>" +
        (!metDag && v ? (s.status === "afgerond" ? '<span class="chip ok">✓ afgerond</span>' : '<button type="button" class="btn btn-ghost btn-sm td-act" data-tdres="' + v.id + '" data-sid="' + s.id + '">Resultaten</button>') : "") + "</div>";
    };
    $("#view").innerHTML =
      '<div class="today-head"><div><h1>' + groet + '</h1><p class="today-sub">' + new Date().toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" }) + " · " + zin.join(" · ") + "</p></div></div>" +
      (!S.website ? '<div class="notice" style="cursor:pointer" data-go="site">' + ic("eye") + '<div><strong>Nog één ding instellen:</strong> vul het webadres van je site in bij Instellingen, zodat de links in je mails (e-book, review) bij je klanten werken. <u>Nu invullen</u></div></div>' : "") +
      '<div class="today-grid">' +
      '<section><h3 class="block-title">Te doen</h3><div class="todo-list">' +
      (td.length ? td.map((x) => '<div class="todo"' + (x.tr ? ' data-tr="' + x.tr + '"' : x.rv ? ' data-rv="' + x.rv + '"' : x.br ? ' data-br="' + x.br + '"' : "") + '><span class="todo-ic">' + ic(x.icon) + '</span><span class="todo-txt">' + x.txt + '<span class="sub">' + x.sub + "</span></span>" + todoAct(x) + "</div>").join("")
        : '<div class="all-done">' + UI.logo() + "<strong>Alles is bij.</strong><span>Geniet van je dag ✨</span></div>") +
      "</div></section>" +
      "<aside>" +
      '<h3 class="block-title">Vandaag</h3><div class="day-list">' + (vandaag.length ? vandaag.map((s) => sesRow(s, false)).join("") : '<div class="day-empty">Geen sessies vandaag.</div>') + "</div>" +
      '<h3 class="block-title" style="margin-top:24px">Deze week</h3><div class="day-list">' + (week.length ? week.map((s) => sesRow(s, true)).join("") : '<div class="day-empty">Geen sessies gepland.</div>') + "</div>" +
      '<button type="button" class="btn btn-ghost btn-sm" data-go="sessies" style="margin-top:14px">' + ic("calendar") + " Open agenda</button>" +
      "</aside></div>";
    bindRows();
    bindTodoActs();
    $$("[data-go]").forEach((s) => s.addEventListener("click", () => setTab(s.dataset.go)));
  }
  const stat = (n, l, go) => '<div class="card stat" data-go="' + go + '" style="cursor:pointer"><div class="n">' + n + '</div><div class="l">' + l + "</div></div>";

  /* ===== Klantenoverzicht (bord met fases) ===== */
  function trCard(t) {
    const v = t.v;
    const flags = [];
    if (t.betaald) flags.push('<span class="chip ok">Betaald</span>');
    else if (!["nieuw", "afgerond"].includes(t.fase)) flags.push('<span class="chip warn">Niet betaald</span>');
    if (t.achterstand.length) flags.push('<span class="chip err">Sessie afronden</span>');
    if (["nieuw", "contact"].includes(t.fase) && daysSince(v.createdAt) >= 3) flags.push('<span class="chip warn">' + daysSince(v.createdAt) + " d wachtend</span>");
    if (t.fase === "afgerond") flags.push(t.review ? '<span class="chip ok">Review ontvangen</span>' : mailSent(t, "review") ? '<span class="chip">Review gevraagd</span>' : "");
    return '<div class="tr-card" data-tr="' + t.id + '">' +
      '<div class="tr-name">' + esc(v.naam) + "</div>" +
      '<div class="tr-sub">' + esc(typeName(v.sessieType)) + (v.dier && v.dier.naam ? " · " + esc(v.dier.naam) : "") + "</div>" +
      '<div class="tr-prog">' + bar(t.gedaan, t.totaal) + "<span>" + t.gedaan + "/" + t.totaal + "</span></div>" +
      (t.volgende ? '<div class="tr-next">' + ic("calendar") + fmtDay(t.volgende.datum) + (t.volgende.tijd ? " " + esc(t.volgende.tijd) : "") + "</div>" : "") +
      (flags.join("") ? '<div class="tr-flags">' + flags.join("") + "</div>" : "") +
      "</div>";
  }
  /* Klanten: twee weergaves. "Bord" (kolommen per stap) en "Lijst" (tabel met filters). */
  function trajectenView() {
    const f = filters.tr;
    if (!f.view) { try { f.view = localStorage.getItem("rlap_klanten_view") || "bord"; } catch (e) { f.view = "bord"; } }
    const zoek = (t) => !f.q || (t.v.naam + " " + t.v.email + " " + (t.v.telefoon || "") + " " + (t.v.dier ? t.v.dier.naam : "")).toLowerCase().includes(f.q.toLowerCase());
    const all = trajecten().filter(zoek);
    const toggle = '<div class="seg">' + [["bord", "clipboard", "Bord"], ["lijst", "users", "Lijst"]].map((x) => '<button data-kview="' + x[0] + '" class="' + (f.view === x[0] ? "active" : "") + '">' + ic(x[1]) + x[2] + "</button>").join("") + "</div>";
    const head = top("Klanten", toggle + '<button class="btn btn-ghost btn-sm" data-copy="' + esc(siteBase() + "vragenlijst.html") + '" title="Stuur deze link naar nieuwe klanten">' + ic("clipboard") + ' Link vragenlijst</button><button class="btn btn-primary btn-sm" id="new-tr">' + ic("plus") + " Klant toevoegen</button>");

    if (f.view === "lijst") {
      /* ---- lijstweergave met filters ---- */
      const flt = f.lijst || (f.lijst = { fase: "actief", type: "", betaald: "", sort: "nieuw" });
      const sleutel = (t) => (t.volgende ? t.volgende.datum + (t.volgende.tijd || "") : "9999");
      let rows = all.filter((t) =>
        (flt.fase === "alle" || (flt.fase === "actief" ? !["afgerond", "archief"].includes(t.fase) : t.fase === flt.fase)) &&
        (!flt.type || t.v.sessieType === flt.type) &&
        (!flt.betaald || (flt.betaald === "ja" ? t.betaald : !t.betaald)));
      const sorts = { nieuw: (a, b) => (b.v.createdAt || 0) - (a.v.createdAt || 0), naam: (a, b) => a.v.naam.localeCompare(b.v.naam), volgende: (a, b) => sleutel(a).localeCompare(sleutel(b)), stap: (a, b) => FASES.findIndex((x) => x.k === a.fase) - FASES.findIndex((x) => x.k === b.fase) };
      rows.sort(sorts[flt.sort] || sorts.nieuw);
      const opt = (val, label, cur) => '<option value="' + val + '"' + (val === cur ? " selected" : "") + ">" + label + "</option>";
      const totaal = rows.reduce((n, t) => n + Number(t.v.prijs || 0), 0), open = rows.filter((t) => !t.betaald && !["nieuw", "archief"].includes(t.fase)).reduce((n, t) => n + Number(t.v.prijs || 0), 0);
      $("#view").innerHTML = head +
        '<div class="toolbar list-filters">' +
        '<input type="search" class="grow" id="f-q" placeholder="Zoek op naam, e-mail, telefoon of dier" value="' + esc(f.q) + '">' +
        '<select id="lf-fase" aria-label="Stap">' + opt("actief", "Lopende klanten", flt.fase) + opt("alle", "Alle klanten", flt.fase) + FASES.map((x) => opt(x.k, x.l, flt.fase)).join("") + opt("archief", "Archief", flt.fase) + "</select>" +
        '<select id="lf-type" aria-label="Sessie">' + opt("", "Alle sessies", flt.type) + Object.keys(T).map((k) => opt(k, T[k].naam, flt.type)).join("") + "</select>" +
        '<select id="lf-bet" aria-label="Betaald">' + opt("", "Betaald én niet betaald", flt.betaald) + opt("ja", "Enkel betaald", flt.betaald) + opt("nee", "Enkel niet betaald", flt.betaald) + "</select>" +
        '<select id="lf-sort" aria-label="Sorteren">' + opt("nieuw", "Nieuwste eerst", flt.sort) + opt("naam", "Op naam (A-Z)", flt.sort) + opt("volgende", "Eerstvolgende sessie", flt.sort) + opt("stap", "Op stap", flt.sort) + "</select>" +
        "</div>" +
        '<div class="list-summary"><span><strong>' + rows.length + "</strong> " + (rows.length === 1 ? "klant" : "klanten") + "</span>" + (rows.length ? "<span>Samen €" + totaal.toLocaleString("nl-BE") + "</span>" + (open ? '<span class="warn">Nog te betalen: €' + open.toLocaleString("nl-BE") + "</span>" : "") : "") +
        ((flt.fase !== "actief" || flt.type || flt.betaald || f.q) ? '<button type="button" class="sc-link" id="lf-reset">Filters wissen</button>' : "") + "</div>" +
        (rows.length ? '<div class="table-wrap"><table class="tbl klant-tbl"><thead><tr><th>Klant</th><th>Sessie</th><th>Stap</th><th>Voortgang</th><th>Volgende sessie</th><th>Betaald</th><th>Aangevraagd</th></tr></thead><tbody>' +
          rows.map((t) => '<tr data-tr="' + t.id + '">' +
            "<td><strong>" + esc(t.v.naam) + '</strong><div class="sub">' + esc(t.v.email) + (t.v.telefoon ? " · " + esc(t.v.telefoon) : "") + "</div></td>" +
            "<td>" + esc(typeName(t.v.sessieType)) + '<div class="sub">' + esc(t.v.pakketNaam || "") + (t.v.dier && t.v.dier.naam ? " · " + esc(t.v.dier.naam) : "") + "</div></td>" +
            "<td>" + fase(t.fase) + (t.achterstand.length ? '<div class="sub" style="color:var(--err)">Sessie afronden</div>' : "") + "</td>" +
            '<td><div class="tr-prog" style="min-width:110px">' + bar(t.gedaan, t.totaal) + "<span>" + t.gedaan + "/" + t.totaal + "</span></div></td>" +
            "<td>" + (t.volgende ? fmtDay(t.volgende.datum) + '<div class="sub">' + esc(t.volgende.tijd || "") + "</div>" : '<span class="muted">–</span>') + "</td>" +
            "<td>" + (t.betaald ? '<span class="chip ok">Betaald</span>' : t.fase === "nieuw" ? '<span class="muted">–</span>' : '<span class="chip warn">Open · €' + esc(t.v.prijs) + "</span>") + "</td>" +
            "<td>" + fmtDate(t.v.createdAt) + "</td></tr>").join("") +
          "</tbody></table></div>"
          : '<div class="table-wrap">' + emptyState("users", "Geen klanten met deze filters.") + "</div>");
      const keep = (k, id) => $(id).addEventListener("change", (e) => { flt[k] = e.target.value; trajectenView(); });
      keep("fase", "#lf-fase"); keep("type", "#lf-type"); keep("betaald", "#lf-bet"); keep("sort", "#lf-sort");
      if ($("#lf-reset")) $("#lf-reset").onclick = () => { f.lijst = null; f.q = ""; trajectenView(); };
    } else {
      /* ---- bordweergave ---- */
      const cols = f.archief ? [...FASES, { k: "archief", l: "Archief", hint: "Gearchiveerd" }] : FASES;
      $("#view").innerHTML = head +
        '<p class="muted" style="margin-top:-12px">Iedereen schuift vanzelf naar de juiste kolom. Klik op een naam om alles van die klant te zien.</p>' +
        '<div class="toolbar"><input type="search" class="grow" id="f-q" placeholder="Zoek op naam, e-mail of dier" value="' + esc(f.q) + '">' +
        '<label class="checkbox" style="align-items:center"><input type="checkbox" id="f-arch"' + (f.archief ? " checked" : "") + "> Toon archief</label></div>" +
        '<div class="board">' + cols.map((c) => {
          const items = all.filter((t) => t.fase === c.k).sort((a, b) => (b.v.createdAt || 0) - (a.v.createdAt || 0));
          return '<div class="board-col"><div class="board-head">' + fase(c.k) + '<span class="cnt">' + items.length + '</span></div><div class="board-hint">' + esc(c.hint) + "</div>" +
            (items.map(trCard).join("") || '<div class="board-empty">—</div>') + "</div>";
        }).join("") + "</div>";
      $("#f-arch").addEventListener("change", (e) => { f.archief = e.target.checked; trajectenView(); });
    }
    $$("[data-kview]").forEach((b) => b.onclick = () => { f.view = b.dataset.kview; try { localStorage.setItem("rlap_klanten_view", f.view); } catch (e) {} trajectenView(); });
    $("#f-q").addEventListener("input", (e) => { f.q = e.target.value; const pos = e.target.selectionStart; trajectenView(); const i = $("#f-q"); i.focus(); i.setSelectionRange(pos, pos); });
    $("#new-tr").onclick = newTraject;
    $$("[data-copy]").forEach((b) => b.onclick = () => navigator.clipboard.writeText(b.dataset.copy).then(() => toast("Link gekopieerd ✓ Plak hem in een mail, WhatsApp of sms.")).catch(() => toast(b.dataset.copy)));
    bindRows();
  }

  /* Nieuw traject handmatig (bv. klant die belde) */
  function newTraject() {
    const opts = Object.keys(T).map((k) => T[k].pakketten.map((p) => '<option value="' + k + "|" + p.id + '">' + esc(T[k].naam + " – " + p.naam + " (€" + p.prijs + ")") + "</option>").join("")).join("");
    const body = '<div class="form">' +
      '<div class="row-2"><div class="field"><label for="n-naam">Naam <span class="req">*</span></label><input id="n-naam" type="text"></div>' +
      '<div class="field"><label for="n-email">E-mail <span class="req">*</span></label><input id="n-email" type="email" list="klant-list2"><datalist id="klant-list2">' + clients().map((c) => '<option value="' + esc(c.email) + '">' + esc(c.naam) + "</option>").join("") + "</datalist></div></div>" +
      '<div class="field"><label for="n-tel">Telefoon</label><input id="n-tel" type="tel"></div>' +
      '<div class="field"><label for="n-pk">Sessie en pakket</label><select id="n-pk">' + opts + "</select></div>" +
      '<label class="checkbox"><input type="checkbox" id="n-paid"> Al betaald</label></div>';
    openPanel('<span class="eyebrow" style="margin:0 0 4px">Klanten</span><h2>Klant toevoegen</h2>', '<p class="muted" style="margin:0">Voor iemand die belde of mailde. Liever niet typen? Stuur de klant de link naar je vragenlijst, dan komt die er vanzelf bij.</p>' + body, '<span style="flex:1"></span><button class="btn btn-primary btn-sm" id="n-save">Toevoegen</button>');
    $("#n-email").addEventListener("change", () => { const c = clients().find((k) => k.email === lc($("#n-email").value)); if (c) { if (!$("#n-naam").value) $("#n-naam").value = c.naam; if (!$("#n-tel").value) $("#n-tel").value = c.telefoon || ""; } });
    $("#n-save").onclick = () => {
      const [k, pid] = $("#n-pk").value.split("|"); const p = T[k].pakketten.find((x) => x.id === pid);
      const v = { naam: $("#n-naam").value.trim(), email: lc($("#n-email").value), telefoon: $("#n-tel").value.trim(), sessieType: k, sessieNaam: T[k].naam, pakket: p.id, pakketNaam: p.naam, prijs: p.prijs, dier: null, antwoorden: [], akkoord: true, status: "bekeken", handmatig: true };
      if ($("#n-paid").checked) { v.betaald = true; v.betaaldOp = Date.now(); }
      if (!v.naam || !/^\S+@\S+\.\S+$/.test(v.email)) return toast("Vul naam en een geldig e-mailadres in.");
      guard(async () => { const id = await DB.add("vragenlijsten", v); return id; }, "Klant toegevoegd ✓").then((id) => id && openTraject(id));
    };
  }

  /* ===== Sessiekaart met resultaten (open/dicht) ===== */
  let openSes = null; /* welke sessiekaart open blijft na opslaan */

  /* ---------- Notities per sessie: bewaren vanzelf, gaan nooit verloren ----------
     Elke letter komt meteen in het geheugen (data.sessies) en wordt na 0,8 s in
     Firestore bewaard (veld "notities" van die ene sessie). Vóór elke actie die het
     scherm opnieuw opbouwt, wordt alles wat nog onderweg is eerst bewaard (flushNotes). */
  const pendingNotes = new Map(); /* sessie-id -> { text, timer } */
  function setSaved(sid, txt, cls) { const el = $('[data-saved="' + sid + '"]'); if (el) { el.textContent = txt; el.className = "sc-saved " + (cls || ""); } }
  function queueNote(sid, text) {
    const s = data.sessies.find((x) => x.id === sid); if (s) s.notities = text;
    const p = pendingNotes.get(sid) || {}; clearTimeout(p.timer);
    p.text = text; p.timer = setTimeout(() => saveNote(sid).catch(() => {}), 800);
    pendingNotes.set(sid, p); setSaved(sid, "Bewaren…", "busy");
  }
  function saveNote(sid) {
    const p = pendingNotes.get(sid); if (!p) return Promise.resolve();
    clearTimeout(p.timer); const text = p.text;
    return DB.update("sessies", sid, { notities: text }).then(() => {
      const cur = pendingNotes.get(sid); if (cur && cur.text === text) pendingNotes.delete(sid);
      setSaved(sid, "Bewaard ✓", "ok");
    }).catch((e) => { setSaved(sid, "Niet bewaard. Controleer je internet en typ verder.", "err"); throw e; });
  }
  const flushNotes = () => Promise.all([...pendingNotes.keys()].map((sid) => saveNote(sid)));
  window.addEventListener("beforeunload", (e) => { if (pendingNotes.size) { flushNotes().catch(() => {}); e.preventDefault(); e.returnValue = ""; } });

  /* nummer van een sessie binnen het traject (geannuleerde tellen niet mee) */
  const sesNr = (t, s) => (s.status === "geannuleerd" ? 0 : t.ses.filter((x) => x.status !== "geannuleerd").indexOf(s) + 1);

  function sesCard(s, nr) {
    const heeft = !!String(s.notities || "").trim();
    const gemaild = s.resultatenGemaild ? "Resultaten gemaild op " + fmtDateTime(s.resultatenGemaild) : "";
    const isGepland = s.status === "gepland";
    const label = nr ? "Sessie " + nr : "Geannuleerde sessie";
    return '<details class="ses-card is-' + esc(s.status) + '" data-sid="' + s.id + '"' + (openSes === s.id ? " open" : "") + ">" +
      '<summary><span class="sc-nr">' + (nr || "–") + "</span>" +
      '<span class="sc-main"><strong>' + label + '</strong><span class="sc-meta">' + fmtDay(s.datum) + (s.tijd ? " · " + esc(s.tijd) : "") + (s.vorm ? " · " + esc(s.vorm) : "") + "</span></span>" +
      '<span class="sc-flags">' + (heeft ? '<span class="sc-chip' + (s.resultatenGemaild ? " sent" : "") + '">' + (s.resultatenGemaild ? "✓ gemaild" : "Resultaten") + "</span>" : "") + status(s.status) + "</span>" +
      '<span class="sc-arrow">' + ic("down") + "</span></summary>" +
      '<div class="sc-body">' +
      '<div class="sc-labelrow"><label class="sc-label" for="sn-' + s.id + '">Resultaten van ' + label.toLowerCase() + '</label><span class="sc-saved" data-saved="' + s.id + '">Bewaart vanzelf</span></div>' +
      '<textarea id="sn-' + s.id + '" data-snotes="' + s.id + '" placeholder="Bv. Vrijgemaakte emoties:&#10;• Verdriet – 7 jaar – overgeërfd van mama&#10;• Angst – 23 jaar&#10;&#10;Hartmuur: 2 lagen vrijgemaakt">' + esc(s.notities || "") + "</textarea>" +
      '<div class="sc-actions">' +
      (isGepland
        ? '<button type="button" class="btn btn-primary btn-sm" data-sfinish="' + s.id + '" data-mail="1">' + ic("mail") + ' Afronden + resultaten mailen</button><button type="button" class="btn btn-ghost btn-sm" data-sfinish="' + s.id + '">✓ Enkel afronden</button>'
        : s.status === "afgerond" ? '<button type="button" class="btn btn-primary btn-sm" data-ssend="' + s.id + '">' + ic("mail") + " Resultaten mailen</button>" : "") +
      '<span style="flex:1"></span><button type="button" class="sc-link" data-sedit="' + s.id + '">Datum of uur wijzigen</button></div>' +
      (gemaild ? '<div class="sc-sent">' + ic("mail") + esc(gemaild) + "</div>" : '<p class="hint" style="margin:0">Tip: wil je de disclaimer in kleine letters? Druk in de geopende mail op <strong>⌘A</strong> en dan <strong>⌘V</strong>.</p>') +
      "</div></details>";
  }
  function bindSesCards(t) {
    const v = t.v;
    const nrOf = (sid) => sesNr(t, t.ses.find((x) => x.id === sid) || {});
    const notesOf = (sid) => $('[data-snotes="' + sid + '"]').value;
    $$(".ses-card").forEach((d) => d.addEventListener("toggle", () => { if (d.open) openSes = d.dataset.sid; else if (openSes === d.dataset.sid) openSes = null; }));
    /* typen = vanzelf bewaren, voor elke sessie apart */
    $$("[data-snotes]").forEach((ta) => {
      ta.addEventListener("input", () => queueNote(ta.dataset.snotes, ta.value));
      ta.addEventListener("blur", () => { if (pendingNotes.has(ta.dataset.snotes)) saveNote(ta.dataset.snotes).catch(() => {}); });
    });
    const sendNow = (s, notes) => {
      const extra = { s: { ...s, notities: notes }, nr: nrOf(s.id) };
      copyRich("resultaten", t, extra);
      openMail(mailHref("resultaten", t, extra));
    };
    $$("[data-ssend]").forEach((b) => b.onclick = () => {
      const sid = b.dataset.ssend, s = data.sessies.find((x) => x.id === sid), notes = notesOf(sid);
      if (!notes.trim() && !confirm("Er staan nog geen resultaten bij deze sessie. Toch een mail openen?")) return;
      sendNow(s, notes); openSes = sid;
      guard(async () => { await DB.update("sessies", sid, { notities: notes, resultatenGemaild: Date.now() }); await logMail(v, "app_resultaten"); }).then(() => openTraject(v.id));
    });
    $$("[data-sfinish]").forEach((b) => b.onclick = () => {
      const sid = b.dataset.sfinish, s = data.sessies.find((x) => x.id === sid), notes = notesOf(sid), mail = !!b.dataset.mail;
      /* oudere sessies die nog op "gepland" staan? vraag of ze mee afgerond mogen worden */
      const sleutel = (x) => (x.datum || "") + (x.tijd || "");
      const eerder = t.ses.filter((x) => x.id !== sid && x.status === "gepland" && sleutel(x) < sleutel(s));
      let ookEerder = false;
      if (eerder.length) {
        const namen = eerder.map((x) => "sessie " + nrOf(x.id)).join(" en ");
        ookEerder = confirm(namen.charAt(0).toUpperCase() + namen.slice(1) + (eerder.length === 1 ? " staat" : " staan") + " nog op 'gepland'.\n\nWil je " + (eerder.length === 1 ? "die" : "die") + " ook als afgerond markeren? Je notities blijven gewoon bewaard.\n\nOK = ja, mee afronden · Annuleren = nee, enkel sessie " + nrOf(sid));
      }
      if (mail) sendNow({ ...s, status: "afgerond" }, notes);
      openSes = sid;
      guard(async () => {
        await DB.update("sessies", sid, { status: "afgerond", notities: notes, afgerondOp: Date.now(), ...(mail ? { resultatenGemaild: Date.now() } : {}) });
        s.status = "afgerond";
        if (ookEerder) for (const x of eerder) { await DB.update("sessies", x.id, { status: "afgerond", afgerondOp: x.afgerondOp || Date.now() }); x.status = "afgerond"; }
        const after = traject(v);
        if (after.gedaan >= after.totaal && v.status !== "afgerond") await DB.update("vragenlijsten", v.id, { status: "afgerond", afgerondOp: Date.now() });
        if (mail) await logMail(v, "app_resultaten");
      }, (mail ? "Sessie " + nrOf(sid) + " afgerond ✓ Je mail staat klaar in je Mail-app" : "Sessie " + nrOf(sid) + " afgerond ✓")).then(() => openTraject(v.id));
    });
    $$("[data-sedit]").forEach((b) => b.onclick = () => openSession(b.dataset.sedit));
  }

  /* ===== Eén klant, alles op één plek ===== */
  let lastTraject = null;
  function openTraject(id) {
    const v0 = data.vragenlijsten.find((x) => x.id === id); if (!v0) return;
    if (lastTraject !== id) { openSes = null; lastTraject = id; } /* andere klant: alle sessies dicht */
    if ((v0.status || "nieuw") === "nieuw") DB.update("vragenlijsten", id, { status: "bekeken" }).then(() => { v0.status = "bekeken"; loadAll().then(render); }).catch(() => {});
    const t = traject(v0), v = t.v;
    const others = data.vragenlijsten.filter((x) => lc(x.email) === lc(v.email) && x.id !== v.id);
    const statusSel = v.status === "afgerond" ? "afgerond" : v.status === "gearchiveerd" ? "gearchiveerd" : "auto";
    const ns = nextStep(t);
    const sec = (title, inner, open, extra) => '<details class="more-sec"' + (open ? " open" : "") + '><summary><span>' + title + "</span>" + (extra || "") + '<span class="sc-arrow">' + ic("down") + "</span></summary><div class=\"more-body\">" + inner + "</div></details>";
    const body =
      '<div class="tr-head">' + fase(t.fase) + '<div class="tr-prog big">' + bar(t.gedaan, t.totaal) + "<span>" + t.gedaan + " van " + t.totaal + (t.totaal === 1 ? " sessie" : " sessies") + "</span></div></div>" +

      /* 1. wat moet ik nu doen? */
      '<div class="next-step' + (ns.klaar ? " is-done" : "") + '"><span class="ns-label">' + (ns.klaar ? "Alles in orde" : "Volgende stap") + '</span><strong>' + ns.txt + "</strong>" + (ns.sub ? '<span class="ns-sub">' + ns.sub + "</span>" : "") + (ns.btns ? '<div class="ns-btns">' + ns.btns + "</div>" : "") + "</div>" +

      /* 2. contact en betaling, compact */
      '<div class="cl-info">' +
      '<a href="mailto:' + esc(v.email) + '">' + ic("mail") + esc(v.email) + "</a>" +
      (v.telefoon ? '<a href="tel:' + esc(v.telefoon) + '">' + ic("phone") + esc(v.telefoon) + "</a>" : "") +
      "<span>" + ic("heart") + esc(v.pakketNaam || typeName(v.sessieType)) + (v.prijs ? " · €" + esc(v.prijs) : "") + (v.dier && v.dier.naam ? " · " + esc(v.dier.naam) : "") + "</span>" +
      '<label class="pay-toggle' + (t.betaald ? " on" : "") + '"><input type="checkbox" id="t-paid"' + (t.betaald ? " checked" : "") + "><span>" + (t.betaald ? "Betaald" : "Nog niet betaald") + "</span></label>" +
      "</div>" +

      /* 3. sessies met resultaten */
      '<div><h3 class="block-title">Sessies &amp; resultaten</h3><div class="ses-cards">' +
      (t.ses.map((s) => sesCard(s, sesNr(t, s))).join("") || '<p class="muted" style="margin:0">Nog geen sessies ingepland.</p>') +
      "</div>" +
      (t.gedaan + t.gepland.length < t.totaal || !t.ses.length ? '<button class="btn btn-ghost btn-sm" id="t-plan" style="margin-top:10px">' + ic("plus") + " Sessie inplannen</button>" : "") +
      "</div>" +

      (t.review ? '<div class="answer"><div class="q">Review · ' + "★".repeat(t.review.sterren || 5) + '</div><div class="a">' + esc(t.review.tekst) + "</div></div>" : "") +

      /* 4. de rest, dichtgeklapt */
      '<div class="more-list">' +
      sec("Antwoorden vragenlijst", (v.antwoorden || []).map((a) => '<div class="answer"><div class="q">' + esc(a.vraag) + '</div><div class="a">' + (a.antwoord ? esc(a.antwoord) : '<span class="muted">–</span>') + "</div></div>").join("") || '<p class="muted">Geen antwoorden (klant manueel toegevoegd).</p>', (v.status || "nieuw") === "nieuw", '<span class="more-cnt">' + (v.antwoorden || []).length + "</span>") +
      sec("Andere e-mails", mailButtons(t)) +
      sec("Mijn notities over deze klant", '<p class="hint" style="margin:0 0 6px">Enkel voor jou, wordt nooit gemaild. Bewaart vanzelf.</p><textarea id="t-notes" placeholder="Bv. werkt graag \'s avonds, heeft een hond, gevoelig voor…">' + esc(v.notities || "") + "</textarea>", false, v.notities ? '<span class="more-cnt">✓</span>' : "") +
      sec("Factuur, archief en meer",
        '<div class="more-row"><span>Factuur</span><button class="btn btn-ghost btn-sm" id="t-inv">' + ic("download") + (v.factuurNr ? " Factuur " + esc(v.factuurNr) : " Maak factuur") + "</button></div>" +
        '<div class="more-row"><span>Waar staat deze klant?</span><select id="t-status"><option value="auto"' + (statusSel === "auto" ? " selected" : "") + '>Automatisch</option><option value="afgerond"' + (statusSel === "afgerond" ? " selected" : "") + '>Afgerond</option><option value="gearchiveerd"' + (statusSel === "gearchiveerd" ? " selected" : "") + ">Archief (verbergen)</option></select></div>" +
        (others.length ? '<div class="more-row" style="display:block"><span>Eerdere aanvragen van deze klant</span><div class="mini-list" style="margin-top:8px">' + others.map((o) => { const ot = traject(o); return '<div class="mini-item" data-tr="' + o.id + '"><span>' + esc(typeName(o.sessieType)) + '<br><span class="muted" style="font-size:.84rem">' + fmtDate(o.createdAt) + "</span></span>" + fase(ot.fase) + "</div>"; }).join("") + "</div></div>" : "") +
        '<div class="more-row"><span>Aangevraagd op ' + fmtDateTime(v.createdAt) + '</span><button class="btn btn-danger btn-sm" id="t-del">' + ic("trash") + " Klant verwijderen</button></div>") +
      "</div>";
    openPanel('<span class="eyebrow" style="margin:0 0 4px">Klant</span><h2>' + esc(v.naam) + "</h2>", body, "");
    $("#panel-foot").style.display = "none";
    bindRows($("#panel-body"));
    bindMailButtons(t, () => openTraject(id));
    bindSesCards(t);
    bindNextStep(t);
    const openCard = openSes && $('.ses-card[data-sid="' + openSes + '"]');
    if (openCard) setTimeout(() => openCard.scrollIntoView({ block: "nearest" }), 50);

    $("#t-paid").onchange = (e) => guard(() => DB.update("vragenlijsten", id, e.target.checked ? { betaald: true, betaaldOp: Date.now() } : { betaald: false, betaaldOp: null }), e.target.checked ? "Als betaald aangeduid ✓" : "Betaling verwijderd").then(() => openTraject(id));
    $("#t-inv").onclick = () => invoice(id);
    if ($("#t-plan")) $("#t-plan").onclick = () => planFor(v);
    /* notities bewaren vanzelf */
    let nt; $("#t-notes").addEventListener("input", () => { clearTimeout(nt); nt = setTimeout(() => DB.update("vragenlijsten", id, { notities: $("#t-notes").value }).then(() => { v.notities = $("#t-notes").value; toast("Notities bewaard ✓"); }).catch((e) => toast(DB.errorText(e))), 900); });
    $("#t-status").onchange = () => {
      const sel = $("#t-status").value, patch = {};
      if (sel === "auto") patch.status = "bekeken"; else { patch.status = sel; if (sel === "afgerond" && !v.afgerondOp) patch.afgerondOp = Date.now(); }
      guard(() => DB.update("vragenlijsten", id, patch), sel === "gearchiveerd" ? "Naar het archief verplaatst" : "Bewaard ✓").then(() => openTraject(id));
    };
    $("#t-del").onclick = () => { if (confirmDel("deze klant (de aanvraag; sessies blijven bewaard)")) guard(async () => { await DB.remove("vragenlijsten", id); closePanel(); }, "Verwijderd"); };
  }

  /* Wat is nu de volgende stap voor deze klant? Eén zin + 1 à 2 knoppen. */
  function nextStep(t) {
    const v = t.v, actief = t.ses.filter((x) => x.status !== "geannuleerd"), nrOf = (s) => actief.indexOf(s) + 1;
    const mailBtn = (key, label, s) => '<a class="btn btn-primary btn-sm mail-btn" href="' + esc(mailHref(key, t, s ? { s, nr: nrOf(s) } : undefined)) + '" data-mlog="' + key + '"' + (s ? ' data-mses="' + s.id + '" data-nr="' + nrOf(s) + '"' : "") + ">" + ic("mail") + " " + label + "</a>";
    const planBtn = (label, primary) => '<button type="button" class="btn ' + (primary ? "btn-primary" : "btn-ghost") + ' btn-sm" data-nsplan="1">' + ic("calendar") + " " + label + "</button>";
    const resBtn = (s, label) => '<button type="button" class="btn btn-primary btn-sm" data-nsres="' + s.id + '">' + ic("clipboard") + " " + label + "</button>";
    if (["nieuw", "contact"].includes(t.fase) && !mailSent(t, "app_welkom"))
      return { txt: "Stuur je welkomstmail", sub: "Met je warme welkom en het gratis e-book. Lees eventueel eerst de antwoorden hieronder.", btns: mailBtn("welkom", "Welkomstmail openen") + planBtn("Eerste sessie inplannen") };
    if (t.achterstand.length) {
      /* altijd de LAATSTE voorbije sessie: daar ben je mee bezig */
      const s = t.achterstand[t.achterstand.length - 1], ouder = t.achterstand.slice(0, -1);
      const heeft = String(s.notities || "").trim();
      return { txt: (heeft ? "Rond sessie " : "Vul de resultaten van sessie ") + nrOf(s) + (heeft ? " af" : " in"),
        sub: (heeft ? "Je notities staan klaar. " : "Die sessie was op " + fmtDay(s.datum) + ". ") + (ouder.length ? "Sessie " + ouder.map(nrOf).join(" en ") + (ouder.length === 1 ? " staat" : " staan") + " ook nog open: bij het afronden vraag ik of die mee mogen." : "Typ je notities en mail ze in 1 klik."),
        btns: resBtn(s, heeft ? "Afronden" : "Resultaten invullen") };
    }
    const nietGemaild = actief.filter((s) => s.status === "afgerond" && !s.resultatenGemaild && String(s.notities || "").trim()).pop();
    if (nietGemaild) return { txt: "Mail de resultaten van sessie " + nrOf(nietGemaild), sub: "Je notities staan klaar.", btns: mailBtn("resultaten", "Resultaten mailen", nietGemaild) };
    if (t.fase === "contact") return { txt: "Plan de eerste sessie", sub: "Welkomstmail is verstuurd.", btns: planBtn("Sessie inplannen", true) };
    if (t.volgende) {
      const morgen = t.volgende.datum === plusDays(1), vandaag = t.volgende.datum === today();
      return { txt: (vandaag ? "Vandaag" : morgen ? "Morgen" : fmtDay(t.volgende.datum)) + (t.volgende.tijd ? " om " + esc(t.volgende.tijd) : "") + ": sessie " + nrOf(t.volgende), sub: vandaag ? "Na de sessie vul je hier de resultaten in." : morgen ? "Stuur eventueel nog een herinnering." : "Je hoeft nu niets te doen.",
        btns: vandaag ? resBtn(t.volgende, "Resultaten invullen") : morgen ? mailBtn("herinnering", "Herinnering sturen") : "", klaar: !vandaag && !morgen };
    }
    if (t.gedaan < t.totaal && !["afgerond", "archief"].includes(t.fase)) return { txt: "Plan sessie " + (t.gedaan + 1) + " van " + t.totaal, btns: planBtn("Sessie inplannen", true) + (t.fase === "bijna" && !mailSent(t, "app_bijnaKlaar") ? mailBtn("bijnaKlaar", "Vervolg voorstellen") : "") };
    if (t.fase === "afgerond" && !t.review && !mailSent(t, "app_review")) return { txt: "Traject afgerond 🎉", sub: "Over een paar weken vraag je hoe het gaat (met reviewlink). Je krijgt er een seintje voor in Vandaag.", btns: mailBtn("review", "Nu al vragen") , klaar: true };
    return { txt: t.fase === "archief" ? "Deze klant staat in het archief" : "Alles is in orde ✨", sub: "", btns: "", klaar: true };
  }
  function bindNextStep(t) {
    $$("[data-nsplan]").forEach((b) => b.onclick = () => planFor(t.v));
    $$("[data-nsres]").forEach((b) => b.onclick = () => openResults(t.v.id, b.dataset.nsres));
  }

  /* Sessie afronden: status + nota + mail + automatisch volgende stap */
  function completeSession(sid) {
    const s = data.sessies.find((x) => x.id === sid); if (!s) return;
    const v = data.vragenlijsten.find((x) => x.id === s.vragenlijstId);
    const t = v ? traject(v) : null;
    const nr = t ? t.gedaan + 1 : 1, totaal = t ? t.totaal : 1;
    const body = '<p class="muted" style="margin:0">' + esc(s.klantNaam || s.klantEmail) + " · " + esc(typeName(s.sessieType)) + " · " + fmtDay(s.datum) + (t ? " · sessie " + nr + " van " + totaal : "") + "</p>" +
      '<div class="field"><label for="c-notes">Resultaten van de sessie</label><span class="hint">Deze notities gaan met "Afronden + resultaten mailen" in 1 klik naar je klant.</span><textarea id="c-notes" style="min-height:240px" placeholder="Bv. Vrijgemaakte emoties:&#10;• Verdriet – 7 jaar – overgeërfd van mama&#10;• Angst – 23 jaar&#10;&#10;Hartmuur: 3 lagen vrijgemaakt">' + esc(s.notities || "") + "</textarea></div>" +
      (M.enabled ? '<label class="checkbox"><input type="checkbox" id="c-mail" checked> <span>Stuur de klant ook automatisch een korte mail dat de sessie afgerond is</span></label>' +
        '<div class="field"><label for="c-msg">Persoonlijke boodschap in die automatische mail (optioneel)</label><textarea id="c-msg"></textarea></div>'
        : '<input type="checkbox" id="c-mail" hidden><input type="hidden" id="c-msg" value="">') +
      (t && totaal - nr === 1 ? '<p class="muted" style="margin:0">Na deze sessie is er nog 1 over. Tip: stuur daarna de mail "Nog 1 sessie".</p>' : "") +
      (t && nr >= totaal ? '<p class="muted" style="margin:0">Dit is de laatste sessie: het traject gaat naar <strong>Afgerond</strong>. Over een paar weken stuur je de mail "Traject afgerond + review".</p>' : "");
    openPanel('<span class="eyebrow" style="margin:0 0 4px">Sessie afronden</span><h2>' + esc(s.klantNaam || "") + "</h2>", body,
      '<button class="btn btn-ghost btn-sm" id="c-back">← Terug</button><span style="flex:1"></span>' +
      (v ? '<button class="btn btn-ghost btn-sm" id="c-save">✓ Enkel afronden</button><button class="btn btn-primary btn-sm" id="c-save-mail">' + ic("mail") + " Afronden + resultaten mailen</button>" : '<button class="btn btn-primary btn-sm" id="c-save">✓ Sessie afronden</button>'));
    $("#c-back").onclick = () => (v ? openTraject(v.id) : closePanel());
    if ($("#c-save-mail")) $("#c-save-mail").onclick = () => {
      $("#c-mail").checked = false; /* geen dubbele automatische mail */
      /* mail meteen openen (binnen de klik), met de notities zoals ze nu in het veld staan */
      const extra = { s: { ...s, status: "afgerond", notities: $("#c-notes").value }, nr };
      const t0 = traject(v);
      copyRich("resultaten", t0, extra).then(richToast);
      openMail(mailHref("resultaten", t0, extra));
      run().then(async (res) => {
        if (res === undefined) return;
        await logMail(data.vragenlijsten.find((x) => x.id === v.id), "app_resultaten");
        await loadAll(); render(); openTraject(v.id);
      });
    };
    $("#c-save").onclick = () => run().then(() => (v ? openTraject(v.id) : closePanel()));
    const run = () => guard(async () => {
      await DB.update("sessies", sid, { status: "afgerond", notities: $("#c-notes").value, afgerondOp: Date.now() });
      s.status = "afgerond";
      let sent = 0;
      if (v) {
        const after = traject(v);
        if (after.gedaan >= after.totaal && v.status !== "afgerond") await DB.update("vragenlijsten", v.id, { status: "afgerond", afgerondOp: Date.now() });
        if (M.enabled && $("#c-mail").checked) { await M.mail("sessieAfgerond", v.email, { ...s, klantNaam: s.klantNaam || v.naam }, nr, totaal, $("#c-msg").value.trim()); await logMail(v, "sessieAfgerond"); sent++; }
        if (M.enabled && after.totaal - after.gedaan === 1 && after.totaal > 1 && !mailSent(after, "bijnaKlaar")) { await M.mail("bijnaKlaar", v.email, v); await logMail(v, "bijnaKlaar"); sent++; }
      } else if (M.enabled && $("#c-mail").checked) { await M.mail("sessieAfgerond", s.klantEmail, s, 1, 1, $("#c-msg").value.trim()); sent++; }
      return sent;
    }, (n) => "Sessie afgerond" + (n ? " · " + n + (n === 1 ? " mail" : " mails") + " verstuurd" : ""));
  }

  /* ===== Factuur ===== */
  function showInvoice(html) {
    let ov = $("#inv-overlay");
    if (!ov) {
      ov = document.createElement("div"); ov.id = "inv-overlay"; ov.className = "inv-overlay";
      ov.innerHTML = '<div class="inv-bar"><strong>Factuur</strong><span style="flex:1"></span><button class="btn btn-primary btn-sm" id="inv-print">Afdrukken / opslaan als PDF</button><button class="icon-btn" id="inv-close" aria-label="Sluiten">' + ic("close") + '</button></div><iframe id="inv-frame" title="Factuur"></iframe>';
      document.body.appendChild(ov);
      $("#inv-close").onclick = () => ov.classList.remove("open");
      $("#inv-print").onclick = () => $("#inv-frame").contentWindow.print();
    }
    $("#inv-frame").srcdoc = html;
    ov.classList.add("open");
  }
  async function invoice(id) {
    try {
      let v = data.vragenlijsten.find((x) => x.id === id);
      if (!v.factuurNr) {
        const jaar = new Date().getFullYear();
        const cur = (await DB.getDoc("instellingen", "facturen")) || {};
        const n = cur.jaar === jaar ? (cur.laatste || 0) + 1 : 1;
        const nr = jaar + "-" + String(n).padStart(3, "0");
        await DB.setDoc("instellingen", "facturen", { jaar, laatste: n });
        await DB.update("vragenlijsten", id, { factuurNr: nr, factuurDatum: Date.now() });
        await loadAll(); render();
        v = data.vragenlijsten.find((x) => x.id === id);
        openTraject(id);
      }
      showInvoice(invoiceHtml(v));
    } catch (e) { console.error(e); toast(DB.errorText(e)); }
  }
  function invoiceHtml(v) {
    const F = window.FACTUUR || {};
    const pct = Number(F.btwPercent || 0);
    const bedrag = Number(v.prijs || 0);
    const excl = pct ? (F.prijzenInclBtw !== false ? bedrag / (1 + pct / 100) : bedrag) : bedrag;
    const btw = pct ? excl * pct / 100 : 0;
    const totaal = excl + btw;
    const d = new Date(v.factuurDatum || Date.now());
    const verval = new Date(d.getTime() + (F.betaaltermijnDagen || 14) * 864e5);
    const f = (x) => x.toLocaleDateString("nl-BE", { day: "2-digit", month: "long", year: "numeric" });
    return '<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Factuur ' + esc(v.factuurNr) + '</title><style>' +
      "body{font-family:Arial,Helvetica,sans-serif;color:#3b2a21;margin:0;padding:40px;font-size:14px;line-height:1.5}" +
      ".wrap{max-width:760px;margin:0 auto}.top{display:flex;justify-content:space-between;gap:30px;margin-bottom:40px}" +
      "h1{font-family:Georgia,serif;color:#d9531f;font-weight:normal;font-size:30px;margin:0 0 4px}.muted{color:#8a7466}" +
      "table{width:100%;border-collapse:collapse;margin:30px 0}th{text-align:left;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8a7466;border-bottom:2px solid #f0dccb;padding:8px 6px}" +
      "td{padding:10px 6px;border-bottom:1px solid #f3e6da}.r{text-align:right}.tot td{border:0;padding:4px 6px}.tot .big td{font-size:17px;font-weight:bold;border-top:2px solid #f0dccb;padding-top:10px}" +
      ".box{background:#fdf3ea;border-radius:10px;padding:16px 18px;margin-top:20px}.noprint{text-align:center;margin-bottom:24px}" +
      "button{background:#d9531f;color:#fff;border:0;border-radius:999px;padding:10px 22px;font-size:14px;cursor:pointer}" +
      "@media print{.noprint{display:none}body{padding:0}}</style></head><body><div class='wrap'>" +
      "<div class='top'><div><h1>Rise Like A Phoenix</h1><div>" + esc(S.eigenaar) + "<br>" + (S.adres || []).map(esc).join("<br>") + "<br>BTW " + esc(S.btw) + "<br>" + esc(S.email) + " · " + esc(S.telefoon) + "</div></div>" +
      "<div style='text-align:right'><div style='font-size:22px;font-family:Georgia,serif'>Factuur</div><div><strong>Nr. " + esc(v.factuurNr) + "</strong></div><div class='muted'>Datum: " + f(d) + "<br>Vervaldatum: " + f(verval) + "</div></div></div>" +
      "<div><div class='muted' style='font-size:12px;text-transform:uppercase;letter-spacing:.08em'>Factuur aan</div><strong>" + esc(v.naam) + "</strong><br>" + esc(v.email) + (v.telefoon ? "<br>" + esc(v.telefoon) : "") + "</div>" +
      "<table><thead><tr><th>Omschrijving</th><th class='r'>Aantal</th><th class='r'>Bedrag" + (pct ? " excl. btw" : "") + "</th></tr></thead><tbody>" +
      "<tr><td>" + esc(v.sessieNaam || typeName(v.sessieType)) + " – " + esc(v.pakketNaam || "") + "</td><td class='r'>1</td><td class='r'>" + euro(excl) + "</td></tr></tbody></table>" +
      "<table class='tot' style='width:300px;margin-left:auto'><tbody>" +
      (pct ? "<tr><td>Subtotaal</td><td class='r'>" + euro(excl) + "</td></tr><tr><td>BTW " + pct + "%</td><td class='r'>" + euro(btw) + "</td></tr>" : "") +
      "<tr class='big'><td>Totaal</td><td class='r'>" + euro(totaal) + "</td></tr></tbody></table>" +
      (!pct && F.vrijstellingTekst ? "<p class='muted'>" + esc(F.vrijstellingTekst) + "</p>" : "") +
      "<div class='box'>" + (v.betaald ? "<strong>Betaald" + (v.betaaldOp ? " op " + f(new Date(v.betaaldOp)) : "") + ".</strong> Bedankt!" : "Gelieve " + euro(totaal) + " over te schrijven vóór " + f(verval) + " op <strong>" + esc(S.iban) + "</strong> met vermelding van <strong>" + esc(v.factuurNr) + "</strong>.") + "</div>" +
      "</div></body></html>";
  }

  /* ===== Klanten ===== */
  function klanten() {
    const f = filters.kl;
    const rows = clients().filter((c) => !f.q || (c.naam + " " + c.email).toLowerCase().includes(f.q.toLowerCase()));
    $("#view").innerHTML = top("Klanten", '<button class="btn btn-primary btn-sm" id="new-client">' + ic("plus") + " Nieuwe klant</button>") +
      '<div class="toolbar"><input type="search" class="grow" id="f-q" placeholder="Zoek op naam of e-mail" value="' + esc(f.q) + '"></div>' +
      (rows.length ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>Klant</th><th>Huidige fase</th><th>Sessies</th><th>Laatste activiteit</th></tr></thead><tbody>' +
        rows.map((c) => { const tr = c.vragenlijsten.map(traject); const act = tr.find((t) => !["afgerond", "archief"].includes(t.fase)) || tr[0];
          return '<tr data-kl="' + esc(c.email) + '"><td><strong>' + esc(c.naam || "–") + '</strong><div class="sub">' + esc(c.email) + (c.telefoon ? " · " + esc(c.telefoon) : "") + "</div></td><td>" + (act ? fase(act.fase) + '<div class="sub">' + esc(typeName(act.v.sessieType)) + "</div>" : '<span class="muted">–</span>') + "</td><td>" + c.sessies.filter((s) => s.status === "afgerond").length + " afgerond" + '<div class="sub">' + c.sessies.filter((s) => s.status === "gepland").length + " gepland</div></td><td>" + fmtDate(c.laatste) + "</td></tr>"; }).join("") +
        "</tbody></table></div>" : '<div class="table-wrap">' + emptyState("users", "Nog geen klanten. Ze verschijnen hier zodra iemand een vragenlijst invult, of voeg er zelf een toe.") + "</div>");
    $("#f-q").addEventListener("input", (e) => { f.q = e.target.value; const pos = e.target.selectionStart; klanten(); const i = $("#f-q"); i.focus(); i.setSelectionRange(pos, pos); });
    $("#new-client").onclick = () => openClient(null);
    bindRows();
  }
  function openClient(email) {
    const c = email ? clients().find((x) => x.email === email) : null;
    const isNew = !c;
    const losse = c ? c.sessies.filter((s) => !s.vragenlijstId || !data.vragenlijsten.some((v) => v.id === s.vragenlijstId)).sort((a, b) => (b.datum || "").localeCompare(a.datum || "")) : [];
    const body =
      '<div class="form"><div class="row-2"><div class="field"><label for="k-naam">Naam</label><input id="k-naam" type="text" value="' + esc(c ? c.naam : "") + '"></div>' +
      '<div class="field"><label for="k-email">E-mail</label><input id="k-email" type="email" value="' + esc(c ? c.email : "") + '"' + (isNew ? "" : " readonly") + "></div></div>" +
      '<div class="field"><label for="k-tel">Telefoon</label><input id="k-tel" type="tel" value="' + esc(c ? c.telefoon : "") + '"></div>' +
      '<div class="field"><label for="k-notes">Notities over deze klant</label><textarea id="k-notes">' + esc(c ? c.notities : "") + "</textarea></div></div>" +
      (c ? '<div><h3 class="block-title">Trajecten (' + c.vragenlijsten.length + ')</h3><div class="mini-list">' +
        (c.vragenlijsten.map((v) => { const t = traject(v); return '<div class="mini-item" data-tr="' + v.id + '"><span><strong>' + esc(typeName(v.sessieType)) + "</strong> · " + esc(v.pakketNaam || "") + '<br><span class="muted" style="font-size:.84rem">' + t.gedaan + " van " + t.totaal + " sessies · " + fmtDate(v.createdAt) + "</span></span>" + fase(t.fase) + "</div>"; }).join("") || '<p class="muted">Nog geen trajecten.</p>') +
        "</div></div>" +
        (losse.length ? '<div><h3 class="block-title">Losse sessies</h3><div class="mini-list">' + losse.map((s) => '<div class="mini-item" data-ses="' + s.id + '"><span>' + esc(typeName(s.sessieType)) + '<br><span class="muted" style="font-size:.84rem">' + fmtDay(s.datum) + " " + esc(s.tijd || "") + "</span></span>" + status(s.status) + "</div>").join("") + "</div></div>" : "") : "");
    const foot = (c && c.fiche ? '<button class="btn btn-danger btn-sm" id="k-del">' + ic("trash") + " Verwijder fiche</button>" : "") + '<span style="flex:1"></span>' +
      (c ? '<button class="btn btn-ghost btn-sm" id="k-plan">' + ic("calendar") + " Sessie toevoegen</button>" : "") + '<button class="btn btn-primary btn-sm" id="k-save">Opslaan</button>';
    openPanel('<span class="eyebrow" style="margin:0 0 4px">Klant</span><h2>' + esc(c ? c.naam || c.email : "Nieuwe klant") + "</h2>", body, foot);
    bindRows($("#panel-body"));
    $("#k-save").onclick = () => {
      const payload = { naam: $("#k-naam").value.trim(), email: lc($("#k-email").value), telefoon: $("#k-tel").value.trim(), notities: $("#k-notes").value };
      if (!/^\S+@\S+\.\S+$/.test(payload.email)) return toast("Vul een geldig e-mailadres in.");
      guard(async () => {
        if (c && c.fiche) await DB.update("klanten", c.fiche.id, payload); else await DB.add("klanten", payload);
        closePanel();
      }, "Klant opgeslagen");
    };
    if ($("#k-del")) $("#k-del").onclick = () => { if (confirmDel("deze klantfiche (vragenlijsten en sessies blijven bewaard)")) guard(async () => { await DB.remove("klanten", c.fiche.id); closePanel(); }, "Fiche verwijderd"); };
    if ($("#k-plan")) $("#k-plan").onclick = () => { const act = c.vragenlijsten.map(traject).find((t) => !["afgerond", "archief"].includes(t.fase)); openSession(null, { klantEmail: c.email, klantNaam: c.naam, sessieType: act ? act.v.sessieType : undefined, vragenlijstId: act ? act.id : "" }); };
  }

  /* ===== Sessies ===== */
  const viewToggle = (v) => '<div class="seg">' + [["kalender", "calendar", "Kalender"], ["lijst", "clipboard", "Lijst"]].map((x) => '<button data-view="' + x[0] + '" class="' + (v === x[0] ? "active" : "") + '">' + ic(x[1]) + x[2] + "</button>").join("") + "</div>";
  function bindViewToggle() { $$("[data-view]").forEach((b) => b.onclick = () => { filters.ses.view = b.dataset.view; sessies(); }); }

  /* ===== Kalender ===== */
  function kalender() {
    const f = filters.ses;
    if (!f.maand) f.maand = today().slice(0, 7);
    const [jj, mm] = f.maand.split("-").map(Number);
    const eerste = new Date(jj, mm - 1, 1);
    const start = new Date(eerste); start.setDate(1 - ((eerste.getDay() + 6) % 7)); /* maandag */
    const dagen = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return isoDay(d); });
    const perDag = {};
    data.sessies.forEach((s) => { if (s.datum) (perDag[s.datum] || (perDag[s.datum] = [])).push(s); });
    Object.values(perDag).forEach((l) => l.sort((a, b) => (a.tijd || "99").localeCompare(b.tijd || "99")));
    const kort = (n) => { const p = String(n || "").trim().split(/\s+/); return p[0] + (p[1] ? " " + p[1][0] + "." : ""); };
    const ev = (s) => '<div class="cal-ev t-' + esc(s.sessieType) + " is-" + esc(s.status) + '" data-ses="' + s.id + '" title="' + esc((s.tijd ? s.tijd + " · " : "") + (s.klantNaam || s.klantEmail) + " · " + typeName(s.sessieType) + " · " + s.status) + '">' +
      (s.status === "afgerond" ? "✓ " : "") + (s.tijd ? "<b>" + esc(s.tijd) + "</b> " : "") + esc(kort(s.klantNaam || s.klantEmail)) + "</div>";
    const maandNaam = eerste.toLocaleDateString("nl-BE", { month: "long", year: "numeric" });
    const inMaand = dagen.filter((d) => d.slice(0, 7) === f.maand);
    const telMaand = inMaand.reduce((n, d) => n + (perDag[d] || []).filter((s) => s.status !== "geannuleerd").length, 0);
    const agenda = inMaand.filter((d) => (perDag[d] || []).length);
    $("#view").innerHTML = top("Sessies", viewToggle("kalender") + '<button class="btn btn-primary btn-sm" id="new-ses">' + ic("plus") + " Nieuwe sessie</button>") +
      '<div class="cal-wrap">' +
      '<div class="cal-bar"><div class="cal-nav"><button class="icon-btn" id="cal-prev" aria-label="Vorige maand">‹</button><h2>' + esc(maandNaam) + '</h2><button class="icon-btn" id="cal-next" aria-label="Volgende maand">›</button></div>' +
      '<span class="muted" style="font-size:.88rem">' + telMaand + (telMaand === 1 ? " sessie" : " sessies") + " deze maand</span><span style=\"flex:1\"></span>" +
      '<div class="cal-legend">' + Object.keys(T).map((k) => '<span><i class="dot t-' + k + '"></i>' + esc(T[k].naam) + "</span>").join("") + "</div>" +
      '<button class="btn btn-ghost btn-sm" id="cal-today">Vandaag</button></div>' +
      '<div class="cal">' + ["ma", "di", "wo", "do", "vr", "za", "zo"].map((d) => '<div class="cal-wd">' + d + "</div>").join("") +
      dagen.map((d) => {
        const list = perDag[d] || [];
        const cls = ["cal-day", d.slice(0, 7) !== f.maand ? "other" : "", d === today() ? "today" : "", d < today() ? "past" : ""].join(" ");
        return '<div class="' + cls + '" data-newday="' + d + '"><div class="cal-num">' + Number(d.slice(8)) + "</div>" + list.slice(0, 4).map(ev).join("") +
          (list.length > 4 ? '<div class="cal-more" data-day="' + d + '">+' + (list.length - 4) + " meer</div>" : "") + "</div>";
      }).join("") + "</div>" +
      '<div class="cal-agenda">' + (agenda.length ? agenda.map((d) => '<div class="ag-day' + (d === today() ? " today" : "") + '"><div class="ag-date">' + fmtDay(d) + "</div>" + perDag[d].map((s) =>
        '<div class="ag-ev t-' + esc(s.sessieType) + " is-" + esc(s.status) + '" data-ses="' + s.id + '"><span class="ag-time">' + esc(s.tijd || "–") + "</span><span><strong>" + esc(s.klantNaam || s.klantEmail) + '</strong><span class="sub">' + esc(typeName(s.sessieType)) + " · " + esc(s.vorm || "") + "</span></span>" + status(s.status) + "</div>").join("") + "</div>").join("")
        : emptyState("calendar", "Geen sessies in " + esc(maandNaam) + ".")) + "</div>" +
      '<p class="muted" style="font-size:.84rem;margin:12px 0 0">Klik op een sessie om ze te openen, of op een lege dag om daar een sessie in te plannen.</p>' +
      "</div>";
    const shift = (n) => { const d = new Date(jj, mm - 1 + n, 1); f.maand = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); kalender(); };
    $("#cal-prev").onclick = () => shift(-1); $("#cal-next").onclick = () => shift(1);
    $("#cal-today").onclick = () => { f.maand = today().slice(0, 7); kalender(); };
    $("#new-ses").onclick = () => openSession(null, {});
    bindViewToggle();
    bindRows();
    $$("[data-newday]").forEach((c) => c.addEventListener("click", (e) => { if (e.target.closest("[data-ses],[data-day]")) return; openSession(null, { datum: c.dataset.newday }); }));
    $$("[data-day]").forEach((m) => m.onclick = () => {
      const list = perDag[m.dataset.day];
      openPanel('<span class="eyebrow" style="margin:0 0 4px">Sessies</span><h2>' + esc(fmtDay(m.dataset.day)) + "</h2>",
        '<div class="mini-list">' + list.map((s) => '<div class="mini-item" data-ses="' + s.id + '"><span><strong>' + esc(s.tijd || "–") + "</strong> · " + esc(s.klantNaam || s.klantEmail) + '<br><span class="muted" style="font-size:.84rem">' + esc(typeName(s.sessieType)) + "</span></span>" + status(s.status) + "</div>").join("") + "</div>");
      bindRows($("#panel-body"));
    });
  }

  function sessies() {
    const f = filters.ses;
    if ((f.view || "kalender") === "kalender") return kalender();
    let rows = data.sessies.filter((s) => (!f.status || s.status === f.status) && (!f.q || ((s.klantNaam || "") + " " + (s.klantEmail || "")).toLowerCase().includes(f.q.toLowerCase())));
    if (f.wanneer === "komend") rows = rows.filter((s) => (s.datum || "") >= today()).sort((a, b) => (a.datum + (a.tijd || "")).localeCompare(b.datum + (b.tijd || "")));
    else if (f.wanneer === "voorbij") rows = rows.filter((s) => (s.datum || "") < today()).sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));
    else rows = rows.sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));
    $("#view").innerHTML = top("Sessies", viewToggle("lijst") + '<button class="btn btn-primary btn-sm" id="new-ses">' + ic("plus") + " Nieuwe sessie</button>") +
      '<div class="tabs-inline">' + [["komend", "Komend"], ["voorbij", "Voorbij"], ["alle", "Alle"]].map((w) => '<button data-w="' + w[0] + '" class="' + (f.wanneer === w[0] ? "active" : "") + '">' + w[1] + "</button>").join("") + "</div>" +
      '<div class="toolbar"><input type="search" class="grow" id="f-q" placeholder="Zoek op klant" value="' + esc(f.q) + '">' +
      '<select id="f-status"><option value="">Alle statussen</option>' + SES_STATUS.map((s) => "<option" + (f.status === s ? " selected" : "") + ">" + s + "</option>").join("") + "</select></div>" +
      (rows.length ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>Datum</th><th>Klant</th><th>Sessie</th><th>Vorm</th><th>Status</th></tr></thead><tbody>' +
        rows.map((s) => '<tr data-ses="' + s.id + '"><td>' + fmtDay(s.datum) + '<div class="sub">' + esc(s.tijd || "") + "</div></td><td><strong>" + esc(s.klantNaam || "–") + '</strong><div class="sub">' + esc(s.klantEmail) + "</div></td><td>" + esc(typeName(s.sessieType)) + "</td><td>" + esc(s.vorm || "–") + "</td><td>" + (s.status === "gepland" && s.datum <= today() ? '<button class="btn btn-primary btn-sm" data-done="' + s.id + '">✓ Afgerond</button>' : status(s.status)) + "</td></tr>").join("") +
        "</tbody></table></div>" : '<div class="table-wrap">' + emptyState("calendar", "Geen sessies gevonden.") + "</div>");
    bindViewToggle();
    $$(".tabs-inline button").forEach((b) => b.onclick = () => { f.wanneer = b.dataset.w; sessies(); });
    $("#f-q").addEventListener("input", (e) => { f.q = e.target.value; const pos = e.target.selectionStart; sessies(); const i = $("#f-q"); i.focus(); i.setSelectionRange(pos, pos); });
    $("#f-status").addEventListener("change", (e) => { f.status = e.target.value; sessies(); });
    $("#new-ses").onclick = () => openSession(null, {});
    bindRows();
    $$("[data-done]").forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      const s = data.sessies.find((x) => x.id === b.dataset.done), v = s && data.vragenlijsten.find((x) => x.id === s.vragenlijstId);
      v ? openResults(v.id, s.id) : completeSession(b.dataset.done);
    });
  }
  function openSession(id, preset) {
    const s = id ? data.sessies.find((x) => x.id === id) : { status: "gepland", datum: today(), tijd: "", vorm: "Op afstand", vragenlijstId: "", ...preset };
    if (!s) return;
    const known = clients();
    const vPre = data.vragenlijsten.find((x) => x.id === s.vragenlijstId);
    /* vaste klant gekend? dan enkel datum/uur/vorm vragen */
    const vast = !!vPre;
    const actieveTr = trajecten().filter((x) => !["afgerond", "archief"].includes(x.fase)).sort((a, b) => a.v.naam.localeCompare(b.v.naam));
    const wie = vast
      ? '<div class="who-box">' + ic("users") + "<div><strong>" + esc(vPre.naam) + "</strong><span>" + esc(typeName(vPre.sessieType)) + " · sessie " + (traject(vPre).ses.filter((x) => x.status !== "geannuleerd" && (!id || x.id !== id)).length + (id ? 0 : 1)) + " van " + pakketTotaal(vPre) + "</span></div></div>"
      : '<div class="field"><label for="s-who">Voor wie?</label><select id="s-who"><option value="">— Kies een klant —</option>' + actieveTr.map((x) => '<option value="' + x.id + '">' + esc(x.v.naam + " · " + typeName(x.v.sessieType)) + "</option>").join("") + '<option value="__ander">Iemand anders…</option></select></div>' +
        '<div id="s-ander" class="hidden"><div class="row-2"><div class="field"><label for="s-naam">Naam</label><input id="s-naam" type="text" value="' + esc(s.klantNaam || "") + '"></div>' +
        '<div class="field"><label for="s-email">E-mail</label><input id="s-email" type="email" list="klant-list" value="' + esc(s.klantEmail || "") + '" autocomplete="off"><datalist id="klant-list">' + known.map((c) => '<option value="' + esc(c.email) + '">' + esc(c.naam) + "</option>").join("") + "</datalist></div></div>" +
        '<div class="field"><label for="s-type">Soort sessie</label><select id="s-type">' + Object.keys(T).map((k) => '<option value="' + k + '"' + (s.sessieType === k ? " selected" : "") + ">" + esc(T[k].naam) + "</option>").join("") + "</select></div></div>";
    const body = '<div class="form">' + wie +
      '<div class="row-2"><div class="field"><label for="s-datum">Datum</label><input id="s-datum" type="date" value="' + esc(s.datum || "") + '"></div>' +
      '<div class="field"><label for="s-tijd">Uur</label><input id="s-tijd" type="time" value="' + esc(s.tijd || "") + '"></div></div>' +
      '<div class="field"><span class="label">Hoe?</span><div class="choice-group">' + ["Op afstand", "Videocall", "In de praktijk"].map((x) => '<label class="choice"><input type="radio" name="s-vorm" value="' + x + '"' + ((s.vorm || "Op afstand") === x ? " checked" : "") + "><span>" + x + "</span></label>").join("") + "</div></div>" +
      (id ? '<div class="field"><span class="label">Status</span><div class="choice-group">' + [["gepland", "Gepland"], ["afgerond", "Afgerond"], ["geannuleerd", "Geannuleerd"]].map((x) => '<label class="choice"><input type="radio" name="s-status" value="' + x[0] + '"' + (s.status === x[0] ? " checked" : "") + "><span>" + x[1] + "</span></label>").join("") + "</div></div>" : "") +
      (!vast ? '<div class="field"><label for="s-notes">Notities</label><textarea id="s-notes" style="min-height:110px">' + esc(s.notities || "") + "</textarea></div>" : (id ? '<p class="hint" style="margin:0">De resultaten van deze sessie vul je in bij de klant, onder "Sessies &amp; resultaten".</p>' : "")) +
      (!id && M.enabled ? '<label class="checkbox"><input type="checkbox" id="s-mail" checked> <span>Stuur de klant automatisch een bevestiging met datum en uur</span></label>' : "") +
      "</div>";
    const foot = (id ? '<button class="btn btn-danger btn-sm" id="s-del">' + ic("trash") + "</button>" : "") + '<span style="flex:1"></span>' +
      (id && vast ? '<button class="btn btn-ghost btn-sm" id="s-open">Naar de klant</button>' : "") +
      (!id ? '<button class="btn btn-ghost btn-sm" id="s-save">Enkel inplannen</button><button class="btn btn-primary btn-sm" id="s-save-mail">' + ic("mail") + " Inplannen + bevestiging mailen</button>" : '<button class="btn btn-primary btn-sm" id="s-save">Opslaan</button>');
    openPanel('<span class="eyebrow" style="margin:0 0 4px">Sessie</span><h2>' + (id ? "Sessie aanpassen" : "Sessie inplannen") + "</h2>", body, foot);
    if ($("#s-who")) $("#s-who").onchange = () => { $("#s-ander").classList.toggle("hidden", $("#s-who").value !== "__ander"); };
    if ($("#s-email")) $("#s-email").addEventListener("change", () => { const c = known.find((k) => k.email === lc($("#s-email").value)); if (c && !$("#s-naam").value) $("#s-naam").value = c.naam; });
    if ($("#s-open")) $("#s-open").onclick = () => openTraject(vPre.id);
    $("#s-save").onclick = () => save(false);
    if ($("#s-save-mail")) $("#s-save-mail").onclick = () => save(true);
    const val = (n) => { const r = $('input[name="' + n + '"]:checked'); return r ? r.value : ""; };
    const save = (openApp) => {
      if (openApp && $("#s-mail")) $("#s-mail").checked = false; /* geen dubbele automatische mail */
      let vSel = vPre;
      if (!vast) { const w = $("#s-who").value; if (!w) return toast("Kies eerst voor wie de sessie is."); if (w !== "__ander") vSel = data.vragenlijsten.find((x) => x.id === w); }
      const payload = vSel
        ? { klantEmail: lc(vSel.email), klantNaam: vSel.naam, sessieType: vSel.sessieType, vragenlijstId: vSel.id }
        : { klantEmail: lc($("#s-email").value), klantNaam: $("#s-naam").value.trim(), sessieType: $("#s-type").value, vragenlijstId: "" };
      Object.assign(payload, { vorm: val("s-vorm") || "Op afstand", datum: $("#s-datum").value, tijd: $("#s-tijd").value, status: id ? val("s-status") || s.status : "gepland" });
      if ($("#s-notes")) payload.notities = $("#s-notes").value;
      if (!/^\S+@\S+\.\S+$/.test(payload.klantEmail)) return toast("Vul het e-mailadres van de klant in.");
      if (!payload.datum) return toast("Kies een datum.");
      const v = data.vragenlijsten.find((x) => x.id === payload.vragenlijstId);
      if (id && s.status !== "afgerond" && payload.status === "afgerond") {
        /* afronden gaat via de sessiekaart bij de klant (met resultaten) */
        if (v) return DB.update("sessies", id, { ...payload, status: "gepland" }).then(() => loadAll()).then(() => openResults(v.id, id));
        return DB.update("sessies", id, { ...payload, status: "gepland" }).then(() => { Object.assign(s, payload, { status: "gepland" }); completeSession(id); });
      }
      guard(async () => {
        if (id) { await DB.update("sessies", id, payload); return 0; }
        await DB.add("sessies", payload);
        if (v && ["nieuw", "bekeken"].includes(v.status || "nieuw")) await DB.update("vragenlijsten", v.id, { status: "gepland" });
        if (M.enabled && $("#s-mail") && $("#s-mail").checked) {
          const nr = v ? data.sessies.filter((x) => x.vragenlijstId === v.id && x.status !== "geannuleerd").length + 1 : 1;
          await M.mail("sessieGepland", payload.klantEmail, payload, v, nr, v ? pakketTotaal(v) : 1);
          if (v) await logMail(v, "sessieGepland");
          return 1;
        }
        return 0;
      }, (n) => "Sessie opgeslagen" + (n ? " · bevestiging verstuurd" : "")).then(async (res) => {
        if (res === undefined) return; /* fout: paneel open laten */
        if (openApp) {
          const vv = v || { id: "", naam: payload.klantNaam || payload.klantEmail, email: payload.klantEmail, sessieType: payload.sessieType, sessieNaam: typeName(payload.sessieType), mails: [] };
          const t = v ? traject(data.vragenlijsten.find((x) => x.id === v.id)) : { v: vv, ses: [payload], totaal: 1, gedaan: 0, gepland: [payload], mails: [] };
          const actief = t.ses.filter((x) => x.status !== "geannuleerd");
          const nieuw = actief.find((x) => x.datum === payload.datum && (x.tijd || "") === (payload.tijd || "")) || payload;
          openMail(mailHref("gepland", t, { s: nieuw, nr: actief.indexOf(nieuw) + 1 || 1 }));
          if (v) { await logMail(t.v, "app_gepland"); await loadAll(); render(); }
        }
        v ? openTraject(v.id) : closePanel();
      });
    };
    if ($("#s-del")) $("#s-del").onclick = () => { if (confirmDel("deze sessie")) guard(async () => { await DB.remove("sessies", id); closePanel(); }, "Sessie verwijderd"); };
  }

  /* ===== Berichten ===== */
  function berichten() {
    const f = filters.br;
    const rows = data.berichten.filter((b) => (!f.status || (b.status || "nieuw") === f.status) && (!f.q || (b.naam + " " + b.email + " " + b.bericht).toLowerCase().includes(f.q.toLowerCase())));
    $("#view").innerHTML = top("Berichten") + BR_NAV() +
      '<div class="toolbar"><input type="search" class="grow" id="f-q" placeholder="Zoek in berichten" value="' + esc(f.q) + '">' +
      '<select id="f-status"><option value="">Alle statussen</option>' + BR_STATUS.map((s) => "<option" + (f.status === s ? " selected" : "") + ">" + s + "</option>").join("") + "</select></div>" +
      (rows.length ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>Ontvangen</th><th>Van</th><th>Onderwerp</th><th>Status</th></tr></thead><tbody>' +
        rows.map((b) => '<tr data-br="' + b.id + '"><td>' + fmtDate(b.createdAt) + "</td><td><strong>" + esc(b.naam) + '</strong><div class="sub">' + esc(b.email) + "</div></td><td>" + esc(b.onderwerp || "–") + '<div class="sub">' + esc((b.bericht || "").slice(0, 70)) + ((b.bericht || "").length > 70 ? "…" : "") + "</div></td><td>" + status(b.status) + "</td></tr>").join("") +
        "</tbody></table></div>" : '<div class="table-wrap">' + emptyState("chat", "Nog geen berichten via het contactformulier.") + "</div>");
    $("#f-q").addEventListener("input", (e) => { f.q = e.target.value; const pos = e.target.selectionStart; berichten(); const i = $("#f-q"); i.focus(); i.setSelectionRange(pos, pos); });
    $("#f-status").addEventListener("change", (e) => { f.status = e.target.value; berichten(); });
    bindRows(); bindSubnav();
  }
  function openBericht(id) {
    const b = data.berichten.find((x) => x.id === id); if (!b) return;
    if ((b.status || "nieuw") === "nieuw") DB.update("berichten", id, { status: "bekeken" }).then(() => loadAll().then(render)).catch(() => {});
    const body = '<dl class="kv"><dt>Ontvangen</dt><dd>' + fmtDateTime(b.createdAt) + '</dd><dt>E-mail</dt><dd><a href="mailto:' + esc(b.email) + '">' + esc(b.email) + "</a></dd><dt>Telefoon</dt><dd>" + esc(b.telefoon || "–") + "</dd><dt>Onderwerp</dt><dd>" + esc(b.onderwerp || "–") + "</dd></dl>" +
      '<div class="answer"><div class="a">' + esc(b.bericht) + "</div></div>" +
      '<div class="field"><label for="b-status">Status</label><select id="b-status">' + BR_STATUS.map((s) => "<option" + ((b.status === s) || (s === "bekeken" && (b.status || "nieuw") === "nieuw") ? " selected" : "") + ">" + s + "</option>").join("") + "</select></div>";
    const foot = '<button class="btn btn-danger btn-sm" id="b-del">' + ic("trash") + '</button><span style="flex:1"></span><a class="btn btn-ghost btn-sm" href="mailto:' + esc(b.email) + "?subject=" + encodeURIComponent("Re: " + (b.onderwerp || "je bericht")) + '">' + ic("mail") + ' Beantwoord</a><button class="btn btn-primary btn-sm" id="b-save">Opslaan</button>';
    openPanel('<span class="eyebrow" style="margin:0 0 4px">Bericht</span><h2>' + esc(b.naam) + "</h2>", body, foot);
    $("#b-save").onclick = () => guard(async () => { await DB.update("berichten", id, { status: $("#b-status").value }); closePanel(); }, "Opgeslagen");
    $("#b-del").onclick = () => { if (confirmDel("dit bericht")) guard(async () => { await DB.remove("berichten", id); closePanel(); }, "Verwijderd"); };
  }

  /* ===== Reviews ===== */
  function reviews() {
    const f = filters.rv;
    const rows = data.reviews.filter((r) => f === "alle" || (r.status || "nieuw") === f);
    $("#view").innerHTML = top("Berichten", '<a class="btn btn-ghost btn-sm" href="review.html" target="_blank">' + ic("eye") + " Reviewformulier</a>") + BR_NAV() +
      '<p class="muted" style="margin-top:-12px">' + (M.enabled ? "Klanten krijgen automatisch " + (EM.reviewNaDagen || 14) + " dagen na hun laatste sessie een mail met de vraag om een review." : (EM.reviewNaDagen || 14) + " dagen na de laatste sessie verschijnt in Te doen een seintje om de reviewmail te sturen.") + " Goedgekeurde reviews (met toestemming) verschijnen meteen op de homepagina.</p>" +
      '<div class="tabs-inline">' + [["nieuw", "Te keuren"], ["goedgekeurd", "Op de site"], ["verborgen", "Verborgen"], ["alle", "Alle"]].map((w) => '<button data-r="' + w[0] + '" class="' + (f === w[0] ? "active" : "") + '">' + w[1] + " (" + (w[0] === "alle" ? data.reviews.length : data.reviews.filter((r) => (r.status || "nieuw") === w[0]).length) + ")</button>").join("") + "</div>" +
      (rows.length ? '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">' + rows.map((r) => '<div class="card">' +
        '<div style="display:flex;justify-content:space-between;gap:10px;align-items:start"><div><strong style="font-family:var(--serif);font-size:1.3rem">' + esc(r.naam) + '</strong><div class="sub muted" style="font-size:.84rem">' + "★".repeat(r.sterren || 5) + " · " + fmtDate(r.createdAt) + "</div></div>" + status(r.status || "nieuw") + "</div>" +
        '<p style="white-space:pre-wrap;margin:14px 0">' + esc(r.tekst) + "</p>" +
        (r.toestemming ? "" : '<p class="muted" style="font-size:.85rem">⚠ Geen toestemming om te publiceren</p>') +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        ((r.status || "nieuw") !== "goedgekeurd" ? '<button class="btn btn-primary btn-sm" data-rv-ok="' + r.id + '"' + (r.toestemming ? "" : " disabled") + ">Toon op site</button>" : "") +
        ((r.status || "nieuw") !== "verborgen" ? '<button class="btn btn-ghost btn-sm" data-rv-hide="' + r.id + '">Verberg</button>' : "") +
        (r.trajectId && data.vragenlijsten.some((v) => v.id === r.trajectId) ? '<button class="btn btn-ghost btn-sm" data-tr="' + r.trajectId + '">Traject</button>' : "") +
        '<span style="flex:1"></span><button class="icon-btn" data-rv-del="' + r.id + '" aria-label="Verwijder">' + ic("trash") + "</button></div></div>").join("") + "</div>"
        : '<div class="table-wrap">' + emptyState("star", "Geen reviews in deze lijst.") + "</div>");
    $$("[data-r]").forEach((b) => b.onclick = () => { filters.rv = b.dataset.r; reviews(); });
    $$("[data-rv-ok]").forEach((b) => b.onclick = () => guard(() => DB.update("reviews", b.dataset.rvOk, { status: "goedgekeurd" }), "Staat nu op de site"));
    $$("[data-rv-hide]").forEach((b) => b.onclick = () => guard(() => DB.update("reviews", b.dataset.rvHide, { status: "verborgen" }), "Verborgen"));
    $$("[data-rv-del]").forEach((b) => b.onclick = () => { if (confirmDel("deze review")) guard(() => DB.remove("reviews", b.dataset.rvDel), "Verwijderd"); });
    bindRows(); bindSubnav();
  }

  /* ===== Vragen beheren ===== */
  let qType = Object.keys(T)[0];
  let qDraft = null;
  function vragen() {
    if (!qDraft) qDraft = JSON.parse(JSON.stringify(data.vragen));
    const list = qDraft[qType] || (qDraft[qType] = []);
    const TYPES = [["textarea", "Lang antwoord"], ["text", "Kort antwoord"], ["scale", "Schaal 1-10"], ["choice", "Eén keuze"], ["multi", "Meerdere keuzes"]];
    $("#view").innerHTML = top("Instellingen", '<a class="btn btn-ghost btn-sm" target="_blank" href="vragenlijst.html?sessie=' + qType + '">' + ic("eye") + ' Bekijk vragenlijst</a><button class="btn btn-primary btn-sm" id="q-save">Opslaan</button>') + SET_NAV() +
      '<p class="muted" style="margin-top:0">Pas de vragen per type sessie aan. Na opslaan zien nieuwe klanten meteen de nieuwe vragen. Reeds ingevulde vragenlijsten blijven ongewijzigd. (Naam, e-mail en telefoon worden altijd gevraagd.)</p>' +
      '<div class="tabs-inline">' + Object.keys(T).map((k) => '<button data-qt="' + k + '" class="' + (k === qType ? "active" : "") + '">' + esc(T[k].naam) + " (" + (qDraft[k] || []).length + ")</button>").join("") + "</div>" +
      '<div class="q-editor" id="q-editor">' +
      list.map((q, i) => '<div class="q-row" data-i="' + i + '">' +
        '<input type="text" data-f="label" value="' + esc(q.label) + '" placeholder="Vraag ' + (i + 1) + '" aria-label="Vraag ' + (i + 1) + '">' +
        '<select data-f="type" aria-label="Type antwoord">' + TYPES.map((t) => '<option value="' + t[0] + '"' + (q.type === t[0] ? " selected" : "") + ">" + t[1] + "</option>").join("") + "</select>" +
        '<label class="inline"><input type="checkbox" data-f="verplicht"' + (q.verplicht ? " checked" : "") + "> Verplicht</label>" +
        '<div class="q-actions"><button class="icon-btn" data-a="up" aria-label="Omhoog"' + (i === 0 ? " disabled" : "") + ">" + ic("up") + '</button><button class="icon-btn" data-a="down" aria-label="Omlaag"' + (i === list.length - 1 ? " disabled" : "") + ">" + ic("down") + '</button><button class="icon-btn" data-a="del" aria-label="Verwijder">' + ic("trash") + "</button></div>" +
        (q.type === "choice" || q.type === "multi" ? '<div class="opts"><input type="text" data-f="opties" value="' + esc((q.opties || []).join(", ")) + '" placeholder="Opties, gescheiden door komma’s (bv. Ja, Nee, Soms)"></div>' : "") +
        "</div>").join("") +
      "</div>" +
      '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" id="q-add">' + ic("plus") + ' Vraag toevoegen</button><span style="flex:1"></span><button class="btn btn-ghost btn-sm" id="q-reset">Standaardvragen herstellen</button></div>';

    bindSubnav();
    $$(".tabs-inline button").forEach((b) => b.onclick = () => { qType = b.dataset.qt; vragen(); });
    $("#q-editor").addEventListener("input", (e) => {
      const row = e.target.closest(".q-row"); if (!row) return; const q = list[+row.dataset.i]; const f = e.target.dataset.f;
      if (f === "label") q.label = e.target.value;
      if (f === "opties") q.opties = e.target.value.split(",").map((x) => x.trim()).filter(Boolean);
    });
    $("#q-editor").addEventListener("change", (e) => {
      const row = e.target.closest(".q-row"); if (!row) return; const q = list[+row.dataset.i]; const f = e.target.dataset.f;
      if (f === "type") { q.type = e.target.value; vragen(); }
      if (f === "verplicht") q.verplicht = e.target.checked;
    });
    $("#q-editor").addEventListener("click", (e) => {
      const b = e.target.closest("[data-a]"); if (!b) return; const i = +b.closest(".q-row").dataset.i;
      if (b.dataset.a === "up" && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
      if (b.dataset.a === "down" && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
      if (b.dataset.a === "del") { if (!confirm("Deze vraag verwijderen?")) return; list.splice(i, 1); }
      vragen();
    });
    $("#q-add").onclick = () => { list.push({ id: "q" + Date.now().toString(36), label: "", type: "textarea", verplicht: false }); vragen(); const inputs = $$('#q-editor input[data-f="label"]'); inputs[inputs.length - 1].focus(); };
    $("#q-reset").onclick = () => { if (confirm("De vragen van " + T[qType].naam + " terugzetten naar de standaardvragen?")) { qDraft[qType] = JSON.parse(JSON.stringify((window.DEFAULT_QUESTIONS || {})[qType] || [])); vragen(); } };
    $("#q-save").onclick = () => {
      for (const k of Object.keys(qDraft)) {
        qDraft[k] = qDraft[k].map((q) => ({ ...q, label: (q.label || "").trim() }));
        if (qDraft[k].some((q) => !q.label)) { qType = k; vragen(); return toast("Er is nog een lege vraag bij " + typeName(k) + "."); }
        if (qDraft[k].some((q) => (q.type === "choice" || q.type === "multi") && !(q.opties || []).length)) { qType = k; vragen(); return toast("Geef opties op voor de keuzevragen bij " + typeName(k) + "."); }
      }
      guard(async () => { await DB.saveQuestions(qDraft); qDraft = null; }, "Vragen opgeslagen");
    };
  }

  /* ===== Instellingen: website, prijzen, gegevens (zonder code) ===== */
  function site() {
    const F = window.FACTUUR || {};
    const inp = (id, label, val, hint, type, ph) => '<div class="field"><label for="' + id + '">' + label + "</label>" + (hint ? '<span class="hint">' + hint + "</span>" : "") + '<input id="' + id + '" type="' + (type || "text") + '" value="' + esc(val || "") + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : "") + "></div>";
    $("#view").innerHTML = top("Instellingen") + SET_NAV() +
      '<div class="set-grid">' +
      '<section class="card set-card"><h3>' + ic("eye") + ' Je website</h3>' +
      inp("st-web", "Webadres van je website", S.website, "Nodig zodat de links in je mails (e-book, review) bij je klanten werken.", "url", "https://www.riselikeaphoenix.be") +
      inp("st-plan", "Link om een intake te plannen (optioneel)", window.PLAN_LINK, "Bv. je Calendly-pagina. Staat dan in je welkomstmail. Leeg laten = jij neemt zelf contact op.", "url", "https://calendly.com/…") +
      '<div class="field"><span class="label">Link naar je vragenlijst</span><span class="hint">Stuur deze naar mensen via mond-tot-mond, dan komen ze vanzelf in je admin.</span><div class="copy-row"><input type="text" readonly value="' + esc(siteBase() + "vragenlijst.html") + '"><button type="button" class="btn btn-ghost btn-sm" data-copy="' + esc(siteBase() + "vragenlijst.html") + '">Kopieer</button></div></div>' +
      "</section>" +
      '<section class="card set-card"><h3>' + ic("user") + " Je gegevens</h3><p class=\"hint\" style=\"margin-top:-6px\">Op je website, in je mails en op je facturen.</p>" +
      '<div class="row-2">' + inp("st-tel", "Telefoon", S.telefoon, "", "tel") + inp("st-mail", "E-mail", S.email, "", "email") + "</div>" +
      '<div class="row-2">' + inp("st-iban", "Rekeningnummer (IBAN)", S.iban) + inp("st-btw", "Btw-nummer", S.btw) + "</div>" +
      '<div class="field"><span class="label">Btw op je facturen</span><div class="choice-group">' + [[21, "21%"], [6, "6%"], [0, "Vrijgesteld (0%)"]].map((x) => '<label class="choice"><input type="radio" name="st-btwp" value="' + x[0] + '"' + (Number(F.btwPercent) === x[0] ? " checked" : "") + "><span>" + x[1] + "</span></label>").join("") + "</div></div>" +
      inp("st-vrij", "Tekst bij vrijstelling (enkel bij 0%)", F.vrijstellingTekst, "", "text", "Bijzondere vrijstellingsregeling kleine ondernemingen") +
      "</section>" +
      '<section class="card set-card set-prices"><h3>' + ic("heart") + " Prijzen</h3><p class=\"hint\" style=\"margin-top:-6px\">Wat je hier aanpast, staat meteen op je website: op de sessiepagina's, bij Sessies en in de vragenlijst.</p>" +
      '<div class="price-groups">' + Object.keys(T).map((k) => '<div class="price-group"><div class="pg-title">' + esc(T[k].naam) + "</div>" + T[k].pakketten.map((p) => '<div class="price-row"><span>' + esc(p.naam) + '</span><label class="euro"><span>€</span><input type="number" min="0" step="1" data-prijs="' + p.id + '" value="' + esc(p.prijs) + '"></label><input type="text" data-duur="' + p.id + '" value="' + esc(p.duur) + '" aria-label="Duur"></div>').join("") + "</div>").join("") + "</div>" +
      "</section></div>" +
      '<div class="save-bar"><span class="muted">Vergeet niet te bewaren.</span><button class="btn btn-primary" id="st-save">Bewaren</button></div>';
    bindSubnav();
    $$("[data-copy]").forEach((b) => b.onclick = () => navigator.clipboard.writeText(b.dataset.copy).then(() => toast("Link gekopieerd ✓ Plak hem in een mail of bericht.")).catch(() => toast("Kopiëren lukte niet, selecteer de link en kopieer zelf.")));
    $("#st-save").onclick = () => {
      const web = $("#st-web").value.trim();
      if (web && !/^https?:\/\//i.test(web)) return toast("Het webadres moet beginnen met https://");
      const prijzen = {};
      $$("[data-prijs]").forEach((i) => { prijzen[i.dataset.prijs] = { prijs: i.value === "" ? "" : Number(i.value), duur: ($('[data-duur="' + i.dataset.prijs + '"]').value || "").trim() }; });
      const btwp = ($('input[name="st-btwp"]:checked') || {}).value;
      const d = { website: web, planLink: $("#st-plan").value.trim(), telefoon: $("#st-tel").value.trim(), email: $("#st-mail").value.trim(), iban: $("#st-iban").value.trim(), btw: $("#st-btw").value.trim(), btwPercent: btwp == null ? "" : Number(btwp), vrijstellingTekst: $("#st-vrij").value.trim(), prijzen };
      guard(() => DB.saveSettings(d), "Bewaard ✓ Je website toont de nieuwe gegevens meteen.");
    };
  }

  /* ===== Handleiding ===== */
  function help() {
    const stap = (n, t, x) => '<div class="help-step"><span class="hs-n">' + n + "</span><div><strong>" + t + "</strong><p>" + x + "</p></div></div>";
    openPanel('<span class="eyebrow" style="margin:0 0 4px">Handleiding</span><h2>Zo werk je met je admin</h2>',
      '<p class="lead" style="margin:0">Open elke dag even <strong>Vandaag</strong>. Alles wat je moet doen staat daar, met een knop die het meteen doet.</p>' +
      '<div class="help-steps">' +
      stap(1, "Iemand vult je vragenlijst in", "Die persoon verschijnt in Vandaag. Klik op <em>Welkomstmail</em>: je Mail-app opent met een warme welkom en het e-book. Jij drukt op Versturen.") +
      stap(2, "Plan de eerste sessie", "Klik op <em>Inplannen</em>, kies datum en uur, en klik op <em>Inplannen + bevestiging mailen</em>.") +
      stap(3, "Na de sessie", "In Vandaag staat <em>Resultaten invullen</em>. Typ wat er vrijkwam en klik op <em>Afronden + resultaten mailen</em>. Klaar.") +
      stap(4, "Betaling", "Is er betaald? Klik op <em>✓ Betaald</em>. Een factuur maak je bij de klant onder <em>Factuur, archief en meer</em>.") +
      stap(5, "Na de laatste sessie", "Een paar weken later vraagt Vandaag je om te mailen hoe het gaat, met een link voor een review. Goedgekeurde reviews komen vanzelf op je website.") +
      "</div>" +
      '<h3 class="block-title" style="margin-top:6px">Wat staat waar?</h3><dl class="kv help-kv">' +
      "<dt>Vandaag</dt><dd>Je takenlijst en sessies van vandaag.</dd>" +
      "<dt>Klanten</dt><dd>Iedereen per stap. Klik op een naam voor alles van die klant.</dd>" +
      "<dt>Agenda</dt><dd>Je sessies in een kalender. Klik op een lege dag om iets in te plannen.</dd>" +
      "<dt>Berichten</dt><dd>Berichten via je contactformulier en reviews.</dd>" +
      "<dt>Instellingen</dt><dd>Prijzen, je gegevens, de vragenlijst en de teksten van je mails.</dd></dl>" +
      '<div class="note" style="margin:0">Twijfel je ergens over? Niets gaat ooit vanzelf naar een klant: elke mail opent eerst in je Mail-app, en jij beslist of je op Versturen drukt.</div>',
      '<span style="flex:1"></span><button class="btn btn-primary btn-sm" id="help-ok">Begrepen</button>');
    $("#help-ok").onclick = closePanel;
  }

  /* ===== E-mailteksten (1-klik mails) ===== */
  let mtKey = null, mtDraft = null;
  const VELDEN = ["voornaam", "naam", "sessie", "pakket", "prijs", "dier", "datum", "tijd", "vorm", "nr", "totaal", "rest", "notities", "intake", "ebooklink", "reviewlink", "iban", "factuurnr", "telefoon", "boodschap"];
  function mailteksten() {
    if (!mtDraft) mtDraft = JSON.parse(JSON.stringify(data.mailteksten));
    const keys = Object.keys(mtDraft); if (!mtKey || !mtDraft[mtKey]) mtKey = keys[0];
    const m = mtDraft[mtKey];
    $("#view").innerHTML = top("Instellingen", '<a class="btn btn-ghost btn-sm" id="mt-test" href="#">' + ic("mail") + ' Test naar mezelf</a><button class="btn btn-primary btn-sm" id="mt-save">Opslaan</button>') + SET_NAV() +
      '<p class="muted" style="margin-top:0">Dit zijn de mails die je met 1 klik opent in je Mail-app, vanuit Vandaag of bij een klant. Woorden tussen {accolades} worden automatisch ingevuld per klant. Mails via je Mail-app zijn gewone tekst: emoji\'s en witregels werken, vet of kleur niet.</p>' +
      '<div class="tabs-inline">' + keys.map((k) => '<button data-mt="' + k + '" class="' + (k === mtKey ? "active" : "") + '">' + esc(mtDraft[k].naam) + "</button>").join("") + "</div>" +
      '<div class="card" style="display:grid;gap:18px">' +
      '<div class="field"><label for="mt-ond">Onderwerp</label><input id="mt-ond" type="text" value="' + esc(m.onderwerp) + '"></div>' +
      '<div class="field"><label for="mt-tekst">Tekst</label><textarea id="mt-tekst" style="min-height:460px;font-size:.95rem;line-height:1.6">' + esc(m.tekst) + "</textarea></div>" +
      '<div><span class="hint" style="display:block;margin-bottom:8px">Klik om een invulveld in te voegen:</span><div class="pill-grid">' + VELDEN.map((f) => '<button type="button" class="pill mt-field" data-f="' + f + '" style="cursor:pointer;font-size:.82rem">{' + f + "}</button>").join("") + "</div></div>" +
      '<div><button class="btn btn-ghost btn-sm" id="mt-reset">Standaardtekst herstellen</button></div></div>';
    bindSubnav();
    $$("[data-mt]").forEach((b) => b.onclick = () => { mtKey = b.dataset.mt; mailteksten(); });
    $("#mt-ond").oninput = (e) => (m.onderwerp = e.target.value);
    $("#mt-tekst").oninput = (e) => (m.tekst = e.target.value);
    let lastField = $("#mt-tekst");
    ["#mt-ond", "#mt-tekst"].forEach((s) => $(s).addEventListener("focus", (e) => (lastField = e.target)));
    $$(".mt-field").forEach((b) => b.onclick = () => {
      const el = lastField, ins = "{" + b.dataset.f + "}", a = el.selectionStart ?? el.value.length, z = el.selectionEnd ?? a;
      el.value = el.value.slice(0, a) + ins + el.value.slice(z); el.focus(); el.setSelectionRange(a + ins.length, a + ins.length);
      el.dispatchEvent(new Event("input"));
    });
    $("#mt-reset").onclick = () => { if (confirm("De tekst van '" + m.naam + "' terugzetten naar de standaardtekst?")) { mtDraft[mtKey] = JSON.parse(JSON.stringify((window.DEFAULT_MAILTEKSTEN || {})[mtKey])); mailteksten(); } };
    $("#mt-test").onclick = (e) => {
      e.preventDefault();
      const voorbeeld = { id: "voorbeeld", naam: "Sofie Peeters", email: M.admin || S.email, sessieType: Object.keys(T)[0], sessieNaam: "Body Code & Emotiecode", pakketNaam: "Body & Emotie Code - 6", prijs: 330, mails: [] };
      const ses = { datum: plusDays(3), tijd: "10:00", vorm: "Op afstand", status: "gepland", notities: "Vrijgemaakte emoties:\n• Verdriet – 7 jaar – overgeërfd van mama\n• Angst – 23 jaar\n• Frustratie – 31 jaar\n\nHartmuur: 2 lagen vrijgemaakt" };
      const keep = data.mailteksten; data.mailteksten = mtDraft;
      const tt = { v: voorbeeld, ses: [ses], totaal: 6, gedaan: 2, gepland: [ses], volgende: ses, mails: [] }, ex = { s: ses, nr: 3, boodschap: "(Hier komt je persoonlijke boodschap.)" };
      const href = mailHref(mtKey, tt, ex);
      if (RICH[mtKey]) copyRich(mtKey, tt, ex).then(richToast);
      data.mailteksten = keep; openMail(href);
    };
    $("#mt-save").onclick = () => {
      /* enkel bewaren wat afwijkt van de standaardtekst, zodat verbeteringen aan de standaard je blijven bereiken */
      const D = window.DEFAULT_MAILTEKSTEN || {}, out = {};
      Object.keys(mtDraft).forEach((k) => { const d = D[k] || {}; if (mtDraft[k].onderwerp !== d.onderwerp || mtDraft[k].tekst !== d.tekst) out[k] = { onderwerp: mtDraft[k].onderwerp, tekst: mtDraft[k].tekst }; });
      guard(async () => { await DB.saveMailteksten(out); mtDraft = null; }, "E-mailteksten opgeslagen");
    };
  }

  /* ---------- automatische mails (lopen telkens als je de admin opent) ---------- */
  async function runAutomations() {
    if (!M.enabled) return;
    let n = 0;
    try {
      if (EM.herinneringDagErvoor !== false) {
        const morgen = plusDays(1);
        for (const s of data.sessies.filter((x) => x.status === "gepland" && x.datum === morgen && !x.herinnering && x.klantEmail)) {
          await M.mail("herinnering", s.klantEmail, s);
          await DB.update("sessies", s.id, { herinnering: true }); n++;
          const v = data.vragenlijsten.find((x) => x.id === s.vragenlijstId); if (v) await logMail(v, "herinnering");
        }
      }
      const wacht = (EM.reviewNaDagen || 14) * 864e5;
      for (const t of trajecten().filter((x) => x.fase === "afgerond" && !x.review && !mailSent(x, "review"))) {
        const klaar = t.v.afgerondOp || Math.max(0, ...t.ses.map((s) => s.afgerondOp || 0));
        if (klaar && Date.now() - klaar >= wacht) { await M.mail("review", t.v.email, t.v); await logMail(t.v, "review"); n++; }
      }
    } catch (e) { console.error(e); toast("Een automatische mail kon niet verstuurd worden."); }
    if (n) { toast(n + (n === 1 ? " automatische mail" : " automatische mails") + " verstuurd"); await loadAll(); render(); }
  }

  /* ---------- rijen klikbaar maken ---------- */
  function bindRows(root) {
    $$("[data-tr]", root).forEach((r) => r.onclick = () => openTraject(r.dataset.tr));
    $$("[data-kl]", root).forEach((r) => r.onclick = () => openClient(r.dataset.kl));
    /* sessie aanklikken: hoort ze bij een klant, open dan die klant met de sessie open */
    $$("[data-ses]", root).forEach((r) => r.onclick = () => {
      const s = data.sessies.find((x) => x.id === r.dataset.ses), v = s && data.vragenlijsten.find((x) => x.id === s.vragenlijstId);
      v ? openResults(v.id, s.id) : openSession(r.dataset.ses);
    });
    $$("[data-br]", root).forEach((r) => r.onclick = () => openBericht(r.dataset.br));
    $$("[data-rv]", root).forEach((r) => r.onclick = () => setTab("reviews"));
  }

  /* ---------- start ---------- */
  function initChrome() {
    $$("[data-i]").forEach((el) => (el.innerHTML = ic(el.dataset.i)));
    $("#s-logo").outerHTML = UI.logo(); $("#m-logo").outerHTML = UI.logo();
    $("#side-open").innerHTML = ic("menu"); $("#panel-close").innerHTML = ic("close");
    $("#side-open").onclick = () => $("#side").classList.toggle("open");
    $$(".admin-tab[data-tab]").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
    $("#panel-close").onclick = closePanel; $("#panel-back").onclick = closePanel;
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });
    $("#logout").onclick = async () => { await DB.logout(); location.replace("login.html"); };
    $("#help").onclick = () => { $("#side").classList.remove("open"); help(); };
    if (DB.isDemo) $("#demo-tag").classList.remove("hidden");
  }

  let started = false;
  DB.onAuth(async ({ user, isAdmin }) => {
    if (!user) return location.replace("login.html");
    if (!isAdmin) {
      $("#gate").innerHTML = '<div class="card center" style="max-width:420px"><h2>Geen toegang</h2><p class="muted">Dit account (' + esc(user.email) + ') heeft geen admin-rechten.</p><button class="btn btn-ghost" id="lo">Uitloggen</button></div>';
      $("#lo").onclick = async () => { await DB.logout(); location.replace("login.html"); };
      return;
    }
    if (started) return; started = true;
    initChrome();
    $("#who").textContent = user.email;
    try { await DB.settings; await loadAll(); }
    catch (e) { console.error(e); toast(DB.errorText(e)); }
    $("#gate").classList.add("hidden"); $("#app").classList.remove("hidden");
    let t = "overzicht"; try { t = sessionStorage.getItem("rlap_admin_tab") || t; } catch (e) {}
    if (!["overzicht", "trajectenView", "klanten", "sessies", "berichten", "reviews", "vragen", "mailteksten", "site"].includes(t)) t = "overzicht";
    setTab(t);
    runAutomations();
    /* eerste keer? korte uitleg tonen */
    try { if (!localStorage.getItem("rlap_help_gezien")) { localStorage.setItem("rlap_help_gezien", "1"); help(); } } catch (e) {}
  });
})();
