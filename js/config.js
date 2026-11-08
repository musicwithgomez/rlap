/* =========================================================
   CONFIG — dit is het enige bestand dat je moet aanpassen
   om de site aan Firebase te koppelen.
   ========================================================= */

/* 1) FIREBASE
   Plak hier de config uit Firebase Console > Projectinstellingen > Je apps (web).
   Zolang apiKey leeg is, draait de site in DEMOMODUS: alles wordt dan
   enkel in deze browser bewaard (handig om te testen). */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBQPSeaYA_Yd16jvxjGDtXJrvWMkFRANe4",
  authDomain: "rlap-9179d.firebaseapp.com",
  projectId: "rlap-9179d",
  storageBucket: "rlap-9179d.firebasestorage.app",
  messagingSenderId: "124695951777",
  appId: "1:124695951777:web:cabf731efd0f1f2b7473e0"
};

/* 1b) AUTOMATISCHE E-MAILS via EmailJS (gratis tot 200 mails/maand)
   Zie README "Automatische e-mails" voor de 5 minuten setup.
   Zolang publicKey leeg is, worden er geen mails verstuurd (de rest werkt gewoon). */
window.EMAIL = {
  serviceId: "",     // bv. "service_abc123"
  templateId: "",    // bv. "template_xyz789"
  publicKey: "",     // bv. "AbCdEfGh123"
  naarNathalie: "nathalie@riselikeaphoenix.be",  // hier komen meldingen van nieuwe boekingen/berichten
  reviewNaDagen: 14, // zoveel dagen na de laatste sessie gaat de vraag om een review
  herinneringDagErvoor: true // dag vóór een geplande sessie een herinnering sturen
};

/* 1c) INTAKE INPLANNEN
   Link naar je online agenda (Calendly, Cal.com, Google Agenda afspraakpagina...).
   Klanten krijgen deze link na hun vragenlijst om zelf een intakemoment te kiezen.
   Laat leeg als je liever zelf contact opneemt. */
window.PLAN_LINK = "";

/* 1d) FACTUREN */
window.FACTUUR = {
  btwPercent: 21,          // 0 als je vrijgesteld bent van btw
  prijzenInclBtw: true,    // de prijzen op de site zijn inclusief btw
  vrijstellingTekst: "",   // bv. "Bijzondere vrijstellingsregeling kleine ondernemingen" als btwPercent 0 is
  betaaltermijnDagen: 14
};

/* 2) CONTACTGEGEVENS (worden overal op de site gebruikt) */
window.SITE = {
  naam: "Rise Like A Phoenix",
  website: "",   // het echte webadres, bv. "https://riselikeaphoenix.be" of "https://jouwnaam.github.io/rise-like-a-phoenix" (voor links in mails)
  eigenaar: "Nathalie De Ruysscher",
  rol: "Healer",
  telefoon: "+32 495 99 34 59",
  telefoonLink: "+32495993459",
  email: "nathalie@riselikeaphoenix.be",
  adres: ["Kardinaal Cardijnlaan 86,", "2340 Beerse"],
  iban: "ING BE86 3632 3272 3450",
  btw: "BE 08 2323 4545",
  facebook: "",   // bv. "https://www.facebook.com/..."
  instagram: "",  // bv. "https://www.instagram.com/..."
  privacy: "https://www.iubenda.com/privacy-policy/21140043",
  cookies: "https://www.iubenda.com/privacy-policy/21140043/cookie-policy"
};

/* 3) AFBEELDINGEN
   Deze verwijzen nu nog naar je foto's op Wix. Zet je eigen bestanden in de map
   /images en vervang de links door bv. "images/nathalie.jpg".
   (Doe dit vóór je Wix opzegt, anders verdwijnen de foto's.) */
window.IMAGES = {
  portret: "https://static.wixstatic.com/media/a67f0c_da7ce2c0d6414a87b13addb1d9b5540b~mv2.jpeg",
  portret2: "https://static.wixstatic.com/media/a67f0c_644fb2498bad4c769aa87b8df2bcee12~mv2.jpg",
  hero: "https://static.wixstatic.com/media/a67f0c_4b924ab907b3434abdcfb98797ae0876~mv2.jpeg",
  hartmuur: "https://static.wixstatic.com/media/24c1d1388bc04d0b867bdd388e1dc03b.jpg",
  bodycode: "https://static.wixstatic.com/media/a67f0c_15ab83e0c5ca4c3482255efc40c449b8~mv2.jpg",
  beliefcode: "https://static.wixstatic.com/media/a67f0c_4b924ab907b3434abdcfb98797ae0876~mv2.jpeg",
  dieren: "https://static.wixstatic.com/media/a67f0c_c073e5550155476fb3f0983151d29c9b~mv2.jpg",
  bodycodeApp: "https://static.wixstatic.com/media/a67f0c_871b31cf65044272bc9d6f4e0440d744~mv2.jpeg",
  overMijBanner: "https://static.wixstatic.com/media/a3c153_20122b9a32cc4e9a9faca835b9f82d14~mv2.jpg"
};

/* 4) SESSIETYPES EN PAKKETTEN (prijzen van de huidige site) */
window.SESSIE_TYPES = {
  hartmuur: {
    naam: "Hartmuur",
    kort: "Het hebben van een Hartmuur kan je vermogen blokkeren om vrijelijk liefde te geven en te ontvangen.",
    pakketten: [
      { id: "hartmuur-3", naam: "3 Sessies Hartmuur", sessies: 3, duur: "45 min.", prijs: 180 }
    ]
  },
  bodycode: {
    naam: "Body Code & Emotiecode",
    kort: "Sessies voor het losmaken van vastzittende emoties en onevenwichtigheden.",
    pakketten: [
      { id: "bodycode-3", naam: "Body & Emotie Code - 3", sessies: 3, duur: "45 min.", prijs: 180 },
      { id: "bodycode-6", naam: "Body & Emotie Code - 6", sessies: 6, duur: "45 min.", prijs: 330 },
      { id: "bodycode-12", naam: "Body & Emotie Code - 12", sessies: 12, duur: "45 min.", prijs: 600 }
    ]
  },
  /* PRIJZEN BELIEF CODE: nu dezelfde als Body Code — pas aan naar je echte prijzen */
  beliefcode: {
    naam: "Belief Code",
    kort: "Negatieve overtuigingen in je onderbewustzijn opsporen en loslaten.",
    pakketten: [
      { id: "beliefcode-3", naam: "Belief Code - 3", sessies: 3, duur: "45 min.", prijs: 180 },
      { id: "beliefcode-6", naam: "Belief Code - 6", sessies: 6, duur: "45 min.", prijs: 330 },
      { id: "beliefcode-12", naam: "Belief Code - 12", sessies: 12, duur: "45 min.", prijs: 600 }
    ]
  },
  dieren: {
    naam: "Emotiecode voor Dieren",
    kort: "1 Sessie voor het losmaken van vastzittende emoties bij een huisdier.",
    pakketten: [
      { id: "dieren-1", naam: "Emotie Code voor Dieren", sessies: 1, duur: "30 min.", prijs: 40 }
    ]
  }
};
