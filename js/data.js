/* =========================================================
   DATA-LAAG
   Eén plek die praat met Firestore (of met de browser in demomodus).
   Collecties:
     vragenlijsten  – ingevulde vragenlijsten (publiek mag aanmaken)
     berichten      – contactformulier (publiek mag aanmaken)
     klanten        – klantenfiches (enkel admin)
     sessies        – geplande/afgeronde sessies (enkel admin)
     instellingen   – o.a. doc "vragen" met de vragen per sessietype
     admins         – doc per admin-UID (maak je aan in de Firebase Console)
   ========================================================= */
(function () {
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const cfg = window.FIREBASE_CONFIG || {};
  const isDemo = !cfg.apiKey;
  let fb = null, fs = null, auth = null;

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new Error("Kon " + src + " niet laden"));
      document.head.appendChild(s);
    });
  }

  const ready = (async () => {
    if (isDemo) return;
    await loadScript(SDK + "firebase-app-compat.js");
    await Promise.all([loadScript(SDK + "firebase-auth-compat.js"), loadScript(SDK + "firebase-firestore-compat.js")]);
    fb = firebase.initializeApp(cfg);
    fs = firebase.firestore();
    auth = firebase.auth();
  })();

  /* ---------- helpers ---------- */
  const toMs = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : v);
  function norm(id, d) {
    const o = { id, ...d };
    ["createdAt", "updatedAt"].forEach((k) => { if (o[k]) o[k] = toMs(o[k]); });
    return o;
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* ---------- demo-opslag (localStorage) ---------- */
  const demo = {
    key: (c) => "rlap_demo_" + c,
    all(c) { try { return JSON.parse(localStorage.getItem(this.key(c)) || "[]"); } catch (e) { return []; } },
    save(c, arr) { try { localStorage.setItem(this.key(c), JSON.stringify(arr)); } catch (e) {} },
  };

  /* ---------- generieke CRUD ---------- */
  async function list(col) {
    await ready;
    if (isDemo) return demo.all(col).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const snap = await fs.collection(col).orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => norm(d.id, d.data()));
  }
  async function add(col, data) {
    await ready;
    if (isDemo) {
      const arr = demo.all(col);
      const doc = { id: uid(), ...data, createdAt: Date.now() };
      arr.push(doc); demo.save(col, arr); return doc.id;
    }
    const ref = await fs.collection(col).add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    return ref.id;
  }
  async function update(col, id, patch) {
    await ready;
    if (isDemo) {
      const arr = demo.all(col).map((d) => (d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d));
      demo.save(col, arr); return;
    }
    await fs.collection(col).doc(id).update({ ...patch, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  }
  async function remove(col, id) {
    await ready;
    if (isDemo) { demo.save(col, demo.all(col).filter((d) => d.id !== id)); return; }
    await fs.collection(col).doc(id).delete();
  }
  /* documenten waar veld == waarde (zonder orderBy, dus geen index nodig) */
  async function where(col, field, value) {
    await ready;
    if (isDemo) return demo.all(col).filter((d) => d[field] === value).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const snap = await fs.collection(col).where(field, "==", value).get();
    return snap.docs.map((d) => norm(d.id, d.data())).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
  async function getDoc(col, id) {
    await ready;
    if (isDemo) return demo.all(col).find((d) => d.id === id) || null;
    const d = await fs.collection(col).doc(id).get();
    return d.exists ? norm(d.id, d.data()) : null;
  }
  async function setDoc(col, id, data) {
    await ready;
    if (isDemo) {
      const arr = demo.all(col).filter((d) => d.id !== id);
      arr.push({ id, ...data, createdAt: Date.now() }); demo.save(col, arr); return;
    }
    await fs.collection(col).doc(id).set({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  }

  /* ---------- vragen ---------- */
  async function getQuestions() {
    const defaults = JSON.parse(JSON.stringify(window.DEFAULT_QUESTIONS || {}));
    try {
      const doc = await getDoc("instellingen", "vragen");
      if (doc && doc.perType) return { ...defaults, ...doc.perType };
    } catch (e) { console.warn("Vragen niet geladen, standaardvragen gebruikt.", e); }
    return defaults;
  }
  const saveQuestions = (perType) => setDoc("instellingen", "vragen", { perType });

  /* ---------- instellingen uit de admin (prijzen, links, gegevens) ----------
     Overschrijven wat in config.js staat, zonder code aan te passen. */
  function applySettings(d) {
    if (!d) return;
    const S = window.SITE || (window.SITE = {}), T = window.SESSIE_TYPES || {}, F = window.FACTUUR || (window.FACTUUR = {});
    ["website", "telefoon", "email", "iban", "btw", "facebook", "instagram"].forEach((k) => { if (d[k] != null && d[k] !== "") S[k] = d[k]; });
    if (d.telefoon) S.telefoonLink = String(d.telefoon).replace(/[^\d+]/g, "");
    if (d.planLink != null) window.PLAN_LINK = d.planLink;
    if (d.btwPercent != null && d.btwPercent !== "") F.btwPercent = Number(d.btwPercent);
    if (d.vrijstellingTekst != null) F.vrijstellingTekst = d.vrijstellingTekst;
    const pr = d.prijzen || {};
    Object.values(T).forEach((t) => (t.pakketten || []).forEach((p) => { const o = pr[p.id]; if (o) { if (o.prijs !== "" && o.prijs != null) p.prijs = Number(o.prijs); if (o.duur) p.duur = o.duur; } }));
  }
  const settings = (async () => {
    try { await ready; applySettings(await getDoc("instellingen", "site")); } catch (e) { console.warn("Instellingen niet geladen", e); }
    window.dispatchEvent(new Event("rlap:settings"));
  })();
  async function saveSettings(d) { await setDoc("instellingen", "site", d); applySettings(d); window.dispatchEvent(new Event("rlap:settings")); }

  /* ---------- e-mailteksten (1-klik mails) ---------- */
  async function getMailteksten() {
    const defaults = JSON.parse(JSON.stringify(window.DEFAULT_MAILTEKSTEN || {}));
    try {
      const doc = await getDoc("instellingen", "mailteksten");
      if (doc && doc.teksten) Object.keys(doc.teksten).forEach((k) => { if (defaults[k]) Object.assign(defaults[k], doc.teksten[k]); });
      /* e-book cadeautje toevoegen aan een eerder bewaarde welkomstmail */
      const w = defaults.welkom, def = (window.DEFAULT_MAILTEKSTEN || {}).welkom;
      if (w && def && w.tekst && !w.tekst.includes("{ebooklink}")) {
        const blok = def.tekst.slice(def.tekst.indexOf("🎁"), def.tekst.indexOf("WAT MAG JE VERWACHTEN?"));
        const at = w.tekst.indexOf("WAT MAG JE VERWACHTEN?");
        w.tekst = at > -1 ? w.tekst.slice(0, at) + blok + w.tekst.slice(at) : w.tekst.replace(/\n*(Liefs,)/, "\n\n" + blok + "$1");
      }
    } catch (e) { console.warn("Mailteksten niet geladen, standaardteksten gebruikt.", e); }
    return defaults;
  }
  const saveMailteksten = (teksten) => setDoc("instellingen", "mailteksten", { teksten });

  /* ---------- auth ---------- */
  const DEMO_PW = "phoenix";
  async function login(email, password) {
    await ready;
    if (isDemo) {
      if (password !== DEMO_PW) throw new Error("demo-wachtwoord");
      sessionStorage.setItem("rlap_demo_user", email || "admin@demo");
      return;
    }
    await auth.signInWithEmailAndPassword(email, password);
  }
  async function logout() {
    await ready;
    if (isDemo) { sessionStorage.removeItem("rlap_demo_user"); return; }
    await auth.signOut();
  }
  async function resetPassword(email) {
    await ready;
    if (isDemo) return;
    await auth.sendPasswordResetEmail(email);
  }
  /* cb({ user, isAdmin }) */
  async function onAuth(cb) {
    await ready;
    if (isDemo) {
      const u = sessionStorage.getItem("rlap_demo_user");
      cb({ user: u ? { email: u, uid: "demo" } : null, isAdmin: !!u });
      return;
    }
    auth.onAuthStateChanged(async (user) => {
      if (!user) return cb({ user: null, isAdmin: false });
      let isAdmin = false;
      try { isAdmin = (await fs.collection("admins").doc(user.uid).get()).exists; } catch (e) { isAdmin = false; }
      cb({ user: { email: user.email, uid: user.uid }, isAdmin });
    });
  }

  function errorText(e) {
    const c = (e && (e.code || e.message)) || "";
    if (c.includes("demo-wachtwoord")) return "In demomodus is het wachtwoord: " + DEMO_PW;
    if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found") || c.includes("invalid-login")) return "E-mail of wachtwoord klopt niet.";
    if (c.includes("too-many-requests")) return "Te veel pogingen. Probeer het binnen enkele minuten opnieuw.";
    if (c.includes("permission-denied") || c.includes("insufficient permissions")) return "Geen toegang. Is dit account als admin ingesteld?";
    if (c.includes("network")) return "Geen verbinding. Controleer je internet.";
    return "Er ging iets mis. Probeer het opnieuw.";
  }

  window.DB = { isDemo, ready, list, where, add, update, remove, getDoc, setDoc, getQuestions, saveQuestions, getMailteksten, saveMailteksten, settings, saveSettings, login, logout, resetPassword, onAuth, errorText };
})();
