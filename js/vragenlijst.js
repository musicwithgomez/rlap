/* Vragenlijst-wizard: kies sessie → gegevens → vragen → overzicht → opslaan in Firestore */
(function () {
  const T = window.SESSIE_TYPES || {};
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);

  const state = { step: 1, type: T[params.get("sessie")] ? params.get("sessie") : null, pakket: params.get("pakket"), questions: null };
  const msg = $("#wiz-msg");
  const showErr = (t) => { msg.className = "form-msg show err"; msg.textContent = t; };
  const clearErr = () => { msg.className = "form-msg"; msg.textContent = ""; };

  /* ---- stap 1: types ---- */
  const typeGrid = $("#type-grid");
  typeGrid.innerHTML = Object.keys(T).map((k) =>
    '<button type="button" class="card type-card" role="radio" aria-checked="false" data-type="' + k + '">' +
    "<h3>" + esc(T[k].naam) + "</h3><p>" + esc(T[k].kort) + "</p></button>").join("");
  function selectType(k) {
    state.type = k;
    typeGrid.querySelectorAll(".type-card").forEach((b) => { const on = b.dataset.type === k; b.classList.toggle("selected", on); b.setAttribute("aria-checked", on); });
    const sel = $("#pakket");
    const pk = T[k].pakketten;
    sel.innerHTML = pk.map((p) => '<option value="' + p.id + '">' + esc(p.naam) + " · " + p.duur + " · €" + p.prijs + "</option>").join("");
    if (state.pakket && pk.some((p) => p.id === state.pakket)) sel.value = state.pakket;
    $("#pakket-field").classList.toggle("hidden", false);
    $("#dier-fields").classList.toggle("hidden", k !== "dieren");
  }
  typeGrid.addEventListener("click", (e) => { const b = e.target.closest(".type-card"); if (b) { selectType(b.dataset.type); clearErr(); } });
  if (state.type) selectType(state.type); else $("#pakket-field").classList.add("hidden");
  /* prijzen aangepast in de admin? keuzelijst bijwerken */
  window.addEventListener("rlap:settings", () => { if (state.type) { const keep = $("#pakket").value; selectType(state.type); if (keep) $("#pakket").value = keep; } });

  /* ---- vragen laden ---- */
  const qPromise = DB.getQuestions().then((q) => (state.questions = q));

  function renderQuestions() {
    const list = (state.questions && state.questions[state.type]) || [];
    $("#q-title").textContent = "Vragen · " + T[state.type].naam;
    if (!list.length) { $("#questions").innerHTML = '<p class="muted">Voor deze sessie zijn er (nog) geen vragen. Je kan meteen verder.</p>'; return; }
    $("#questions").innerHTML = list.map((q, i) => {
      const name = "q_" + q.id, req = q.verplicht ? ' <span class="req">*</span>' : "";
      let input = "";
      if (q.type === "text") input = '<input type="text" id="' + name + '" name="' + name + '" maxlength="500">';
      else if (q.type === "scale") input = '<div class="scale" role="radiogroup">' + Array.from({ length: 10 }, (_, n) => '<label class="choice"><input type="radio" name="' + name + '" value="' + (n + 1) + '"><span>' + (n + 1) + "</span></label>").join("") + '</div><div class="scale-labels"><span>Helemaal niet</span><span>Heel erg</span></div>';
      else if (q.type === "choice" || q.type === "multi") input = '<div class="choice-group">' + (q.opties || []).map((o) => '<label class="choice"><input type="' + (q.type === "multi" ? "checkbox" : "radio") + '" name="' + name + '" value="' + esc(o) + '"><span>' + esc(o) + "</span></label>").join("") + "</div>";
      else input = '<textarea id="' + name + '" name="' + name + '" maxlength="5000"></textarea>';
      return '<div class="question field" data-qid="' + esc(q.id) + '"><span class="qnum">Vraag ' + (i + 1) + "</span>" +
        '<label class="label" for="' + name + '">' + esc(q.label) + req + "</label>" + (q.hint ? '<span class="hint">' + esc(q.hint) + "</span>" : "") + input + "</div>";
    }).join("");
  }

  function collectAnswers() {
    const list = (state.questions && state.questions[state.type]) || [];
    const form = $("#wizard");
    return list.map((q) => {
      const name = "q_" + q.id; let val;
      if (q.type === "multi") val = [...form.querySelectorAll('input[name="' + name + '"]:checked')].map((i) => i.value).join(", ");
      else if (q.type === "scale" || q.type === "choice") { const c = form.querySelector('input[name="' + name + '"]:checked'); val = c ? c.value : ""; }
      else { const el = form.querySelector('[name="' + name + '"]'); val = el ? el.value.trim() : ""; }
      return { id: q.id, vraag: q.label, type: q.type, verplicht: !!q.verplicht, antwoord: val };
    });
  }

  /* ---- validatie per stap ---- */
  function validate(step) {
    if (step === 1 && !state.type) return "Kies eerst een sessie.";
    if (step === 2) {
      if (!$("#naam").value.trim()) return "Vul je naam in.";
      if (!/^\S+@\S+\.\S+$/.test($("#email").value.trim())) return "Vul een geldig e-mailadres in.";
      if (state.type === "dieren" && !$("#dierNaam").value.trim()) return "Vul de naam van je dier in.";
    }
    if (step === 3) {
      const miss = collectAnswers().find((a) => a.verplicht && !a.antwoord);
      if (miss) return "Beantwoord de verplichte vraag: " + miss.vraag;
    }
    if (step === 4 && !$("#akkoord").checked) return "Vink het akkoord met de privacyverklaring aan.";
    return null;
  }

  function renderSummary() {
    const t = T[state.type], p = t.pakketten.find((x) => x.id === $("#pakket").value) || t.pakketten[0];
    const rows = [["Sessie", t.naam], ["Pakket", p.naam + " · €" + p.prijs], ["Naam", $("#naam").value], ["E-mail", $("#email").value], ["Telefoon", $("#telefoon").value || "–"]];
    if (state.type === "dieren") rows.push(["Dier", $("#dierNaam").value + ($("#dierSoort").value ? " (" + $("#dierSoort").value + ")" : "")]);
    const ans = collectAnswers();
    $("#summary").innerHTML = '<dl class="kv">' + rows.map((r) => "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>").join("") + "</dl>" +
      ans.map((a) => '<div class="answer"><div class="q">' + esc(a.vraag) + '</div><div class="a">' + (a.antwoord ? esc(a.antwoord) : '<span class="muted">–</span>') + "</div></div>").join("");
  }

  /* ---- navigatie ---- */
  const steps = [...document.querySelectorAll(".wizard-step")];
  const bars = [...document.querySelectorAll(".progress div")];
  const prev = $("#prev"), next = $("#next");
  async function go(n, noScroll) {
    state.step = n;
    if (n === 3) { await qPromise; renderQuestionsIfNeeded(); }
    if (n === 4) renderSummary();
    steps.forEach((s) => s.classList.toggle("active", +s.dataset.step === n));
    bars.forEach((b, i) => b.classList.toggle("done", i < n));
    prev.style.visibility = n === 1 ? "hidden" : "visible";
    next.innerHTML = n === 4 ? 'Verstuur vragenlijst <span class="arrow">→</span>' : 'Volgende <span class="arrow">→</span>';
    clearErr();
    if (!noScroll) document.querySelector(".wizard").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  let renderedFor = null;
  function renderQuestionsIfNeeded() { if (renderedFor !== state.type) { renderQuestions(); renderedFor = state.type; } }

  prev.addEventListener("click", () => go(Math.max(1, state.step - 1)));
  next.addEventListener("click", async () => {
    const err = validate(state.step);
    if (err) return showErr(err);
    if (state.step < 4) return go(state.step + 1);
    await submit();
  });

  async function submit() {
    if ($("#wizard").website.value) return;
    const t = T[state.type], p = t.pakketten.find((x) => x.id === $("#pakket").value) || t.pakketten[0];
    const data = {
      naam: $("#naam").value.trim(),
      email: $("#email").value.trim().toLowerCase(),
      telefoon: $("#telefoon").value.trim(),
      sessieType: state.type,
      sessieNaam: t.naam,
      pakket: p.id,
      pakketNaam: p.naam,
      prijs: p.prijs,
      dier: state.type === "dieren" ? { naam: $("#dierNaam").value.trim(), soort: $("#dierSoort").value.trim() } : null,
      antwoorden: collectAnswers().map(({ id, vraag, antwoord }) => ({ id, vraag, antwoord })),
      akkoord: true,
      status: "nieuw"
    };
    next.disabled = true; next.textContent = "Versturen...";
    try {
      const id = await DB.add("vragenlijsten", data);
      if (window.MAIL) {
        const v = { ...data, id };
        await Promise.allSettled([MAIL.mail("bevestiging", v.email, v), MAIL.mail("nieuweBoeking", MAIL.admin, v)])
          .then((r) => r.forEach((x) => x.status === "rejected" && console.warn(x.reason)));
      }
      if (window.PLAN_LINK) {
        $("#done-text").textContent = "Je krijgt een bevestiging per mail. Kies hieronder alvast zelf een moment voor ons kennismakingsgesprek.";
        const a = $("#done-plan"); a.href = window.PLAN_LINK; a.classList.remove("hidden");
      }
      $("#wizard").classList.add("hidden"); document.querySelector(".progress").classList.add("hidden");
      $("#done").classList.remove("hidden");
      bars.forEach((b) => b.classList.add("done"));
    } catch (e) {
      console.error(e);
      showErr("Versturen lukte niet. Probeer het opnieuw of mail naar nathalie@riselikeaphoenix.be.");
      next.disabled = false; next.innerHTML = 'Verstuur vragenlijst <span class="arrow">→</span>';
    }
  }

  go(1, true);
})();
