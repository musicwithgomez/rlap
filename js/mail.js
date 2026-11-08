/* =========================================================
   MAIL — automatische e-mails via EmailJS (geen server nodig)
   Eén EmailJS-template met: To = {{to_email}}, Subject = {{subject}},
   Reply-To = {{reply_to}}, Content (HTML) = {{{message_html}}}
   ========================================================= */
(function () {
  const C = window.EMAIL || {};
  const S = window.SITE || {};
  const enabled = !!(C.serviceId && C.templateId && C.publicKey);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const base = () => (S.website ? S.website.replace(/\/?$/, "/") : location.origin + location.pathname.replace(/[^/]*$/, ""));
  const first = (naam) => esc(String(naam || "").trim().split(/\s+/)[0] || "");

  /* opmaak van elke mail */
  function wrap(inner) {
    return '<div style="font-family:Georgia,serif;background:#fcf8f4;padding:28px 16px;color:#3b2a21">' +
      '<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #f1dfd0;border-radius:14px;padding:28px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6">' +
      '<div style="font-family:Georgia,serif;font-size:22px;color:#d9531f;margin-bottom:18px">Rise Like A Phoenix</div>' +
      inner +
      '<p style="margin-top:26px">Warme groet,<br><strong>' + esc(S.eigenaar || "Nathalie") + "</strong><br>" +
      '<span style="color:#9a8577;font-size:13px">' + esc(S.telefoon || "") + " · " + esc(S.email || "") + "</span></p>" +
      "</div></div>";
  }
  const btn = (href, label) => '<p style="margin:22px 0"><a href="' + href + '" style="background:#d9531f;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block">' + esc(label) + "</a></p>";

  async function send(to, subject, html, replyTo) {
    if (!enabled) { console.info("[mail] niet verstuurd (EmailJS niet ingesteld):", subject, "→", to); return false; }
    const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: C.serviceId, template_id: C.templateId, user_id: C.publicKey,
        template_params: { to_email: to, subject, message_html: wrap(html), reply_to: replyTo || S.email || "" }
      })
    });
    if (!r.ok) throw new Error("Mail niet verstuurd: " + (await r.text()));
    return true;
  }

  /* ---------- de mails ---------- */
  const T = () => window.SESSIE_TYPES || {};

  const templates = {
    /* naar klant, meteen na de vragenlijst */
    bevestiging(v) {
      const plan = window.PLAN_LINK;
      return ["Je aanvraag voor " + v.sessieNaam + " is goed ontvangen",
        "<p>Dag " + first(v.naam) + ",</p>" +
        "<p>Merci voor je vertrouwen! Ik heb je vragenlijst voor <strong>" + esc(v.sessieNaam) + "</strong> (" + esc(v.pakketNaam) + ") goed ontvangen.</p>" +
        (plan
          ? "<p>De volgende stap: kies zelf een moment voor ons kennismakingsgesprek.</p>" + btn(plan, "Kies je moment")
          : "<p>Ik bekijk je antwoorden met aandacht en neem binnen enkele dagen contact met je op om alles in te plannen.</p>") +
        "<p>🎁 Als welkomstcadeautje krijg je mijn e-book <em>Rijs op als een feniks</em>, met uitleg over hoe ik werk en gouden tips om alvast te beginnen.</p>" +
        btn(base() + "downloads/rise-like-a-phoenix-ebook.pdf", "Download je gratis e-book") +
        "<p>Heb je intussen een vraag? Antwoord gewoon op deze mail.</p>"];
    },
    /* naar Nathalie, meteen na de vragenlijst */
    nieuweBoeking(v) {
      return ["Nieuwe aanvraag: " + v.naam + " – " + v.sessieNaam,
        "<p>Er is een nieuwe vragenlijst binnen.</p>" +
        '<table style="border-collapse:collapse">' +
        [["Naam", v.naam], ["E-mail", v.email], ["Telefoon", v.telefoon || "–"], ["Sessie", v.sessieNaam], ["Pakket", v.pakketNaam + " · €" + v.prijs]]
          .map((r) => '<tr><td style="padding:3px 14px 3px 0;color:#9a8577">' + r[0] + "</td><td>" + esc(r[1]) + "</td></tr>").join("") +
        "</table>" + btn(base() + "admin.html", "Open in admin")];
    },
    /* naar Nathalie, na contactformulier */
    nieuwBericht(b) {
      return ["Nieuw bericht van " + b.naam + (b.onderwerp ? " – " + b.onderwerp : ""),
        "<p><strong>" + esc(b.naam) + "</strong> (" + esc(b.email) + (b.telefoon ? ", " + esc(b.telefoon) : "") + ") schreef:</p>" +
        '<blockquote style="border-left:3px solid #e2702e;margin:0;padding:6px 14px;white-space:pre-wrap">' + esc(b.bericht) + "</blockquote>" +
        "<p>Je kan rechtstreeks op deze mail antwoorden.</p>"];
    },
    /* naar afzender van het contactformulier */
    berichtOntvangen(b) {
      return ["Je bericht is goed ontvangen",
        "<p>Dag " + first(b.naam) + ",</p><p>Merci voor je bericht! Ik lees het met aandacht en antwoord je zo snel mogelijk, meestal binnen 2 werkdagen.</p>"];
    },
    /* naar klant, als Nathalie een sessie inplant */
    sessieGepland(s, v, nr, totaal) {
      const wanneer = new Date(s.datum + "T00:00:00").toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long" }) + (s.tijd ? " om " + s.tijd : "");
      return ["Je sessie is ingepland: " + wanneer,
        "<p>Dag " + first(s.klantNaam) + ",</p><p>Je " + (totaal > 1 ? "sessie " + nr + " van " + totaal + " " : "sessie ") + "<strong>" + esc((T()[s.sessieType] || {}).naam || "") + "</strong> staat ingepland op <strong>" + esc(wanneer) + "</strong> (" + esc((s.vorm || "").toLowerCase()) + ").</p>" +
        (s.vorm === "Op afstand" ? "<p>Je hoeft hiervoor niets te doen. Zorg die dag voor wat rust, drink voldoende water en wees mild voor jezelf.</p>" : "") +
        "<p>Past het toch niet? Laat het me gerust weten.</p>"];
    },
    /* naar klant, dag voor de sessie */
    herinnering(s) {
      return ["Herinnering: morgen je sessie",
        "<p>Dag " + first(s.klantNaam) + ",</p><p>Een kleine herinnering: morgen" + (s.tijd ? " om " + esc(s.tijd) : "") + " is je sessie <strong>" + esc((T()[s.sessieType] || {}).naam || "") + "</strong> (" + esc((s.vorm || "").toLowerCase()) + ").</p><p>Ik kijk ernaar uit.</p>"];
    },
    /* naar klant, na een afgeronde sessie */
    sessieAfgerond(s, nr, totaal, persoonlijk) {
      const rest = totaal - nr;
      return ["Sessie " + nr + (totaal > 1 ? " van " + totaal : "") + " is afgerond",
        "<p>Dag " + first(s.klantNaam) + ",</p>" +
        "<p>Je " + (totaal > 1 ? "sessie " + nr + " van " + totaal : "sessie") + " is afgerond. 💛</p>" +
        (persoonlijk ? '<p style="white-space:pre-wrap">' + esc(persoonlijk) + "</p>" : "") +
        "<p>Het is normaal dat er de komende dagen dingen in beweging komen. Gun jezelf rust, drink voldoende water en neem tijd om te voelen wat er loskomt.</p>" +
        (rest > 0 ? "<p>Nog " + rest + (rest === 1 ? " sessie" : " sessies") + " te gaan.</p>" : "")];
    },
    /* naar klant, als er nog 1 sessie over is */
    bijnaKlaar(v) {
      return ["Nog één sessie te gaan",
        "<p>Dag " + first(v.naam) + ",</p><p>Je traject <strong>" + esc(v.sessieNaam) + "</strong> nadert het einde: er staat nog één sessie open.</p>" +
        "<p>Voel je dat er nog meer mag loskomen? Dan kan je gerust een vervolgtraject boeken.</p>" + btn(base() + "sessies.html", "Bekijk de sessies")];
    },
    /* naar klant, X dagen na de laatste sessie */
    review(v) {
      return ["Hoe gaat het nu met je?",
        "<p>Dag " + first(v.naam) + ",</p><p>Het is een tijdje geleden dat we je traject <strong>" + esc(v.sessieNaam) + "</strong> hebben afgerond. Ik ben benieuwd hoe het nu met je gaat!</p>" +
        "<p>Zou je in een paar zinnen willen delen wat de sessies voor jou betekend hebben? Daarmee help je anderen die twijfelen enorm.</p>" +
        btn(base() + "review.html?t=" + encodeURIComponent(v.id) + "&n=" + encodeURIComponent(first(v.naam)), "Deel je ervaring") +
        "<p>En als je nog vragen hebt of opnieuw iets voelt opborrelen: je weet me te vinden.</p>"];
    }
  };

  /* mail(type, naar, ...args) */
  async function mail(type, to, ...args) {
    const [subject, html] = templates[type](...args);
    const replyTo = type === "nieuweBoeking" || type === "nieuwBericht" ? (args[0] && args[0].email) : "";
    return send(to, subject, html, replyTo);
  }

  window.MAIL = { enabled, mail, admin: C.naarNathalie || S.email };
})();
