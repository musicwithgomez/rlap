/* =========================================================
   E-MAILTEKSTEN (1-klik mails via je Mail-app)
   Dit zijn de standaardteksten. Je past ze het makkelijkst aan in
   Admin > "E-mailteksten" (dan worden ze in Firestore bewaard).

   Invulvelden die automatisch ingevuld worden:
   {voornaam} {naam} {sessie} {pakket} {prijs} {dier}
   {datum} {tijd} {vorm} {nr} {totaal} {rest}
   {intake}      zin met je planlink (of "ik neem contact op")
   {reviewlink}  link naar het reviewformulier
   {ebooklink}   link naar het gratis e-book (PDF)
   {iban} {factuurnr} {telefoon} {boodschap}
   {notities}    je notities van de sessie
   Alles vanaf "(Disclaimer" komt in de opgemaakte versie in kleine letters.
   ========================================================= */
window.DEFAULT_MAILTEKSTEN = {
  welkom: {
    naam: "Welkom na de vragenlijst",
    wanneer: "Nieuwe aanvraag",
    onderwerp: "Welkom bij Rise Like A Phoenix, {voornaam}! 🔥",
    tekst:
`Joepieeee {voornaam}! 🙌

YESSS, je hebt de stap gezet! Je vragenlijst voor {sessie} is goed bij me aangekomen en ik ben oprecht blij dat je er bent. Welkom bij Rise Like A Phoenix! 🔥

Je hebt jezelf iets heel moois cadeau gedaan: tijd en ruimte om oude emoties en blokkades los te laten, zodat jij weer vrij kan stralen. ✨


EVEN PRAKTISCH
━━━━━━━━━━━━━━

📋 Ik lees je antwoorden met veel aandacht door.
📅 {intake}
💛 Je pakket: {pakket} (€{prijs}).


🎁 EEN CADEAUTJE VOOR JOU
━━━━━━━━━━━━━━━━━━━━━━━━

Omdat dit voor veel mensen helemaal nieuw is, krijg je van mij het e-book "Rijs op als een feniks". Je leest er rustig in wat de Emotiecode, de Hartmuur, de Body Code en de Belief Code zijn, wat je na een sessie mag verwachten, en je krijgt gouden tips om vandaag al mee te beginnen. ✨

👉 Download je e-book hier: {ebooklink}


WAT MAG JE VERWACHTEN?
━━━━━━━━━━━━━━━━━━━━━━

🕊️ Een warme, veilige plek waar alles er mag zijn
🔍 We gaan samen kijken wat er onder de oppervlakte zit
🔓 Vastzittende emoties en blokkades mogen loskomen
💌 Na elke sessie krijg je een berichtje van mij
🔥 En stap voor stap... rijs jij op, zoals een feniks

Kort gezegd: jij hoeft enkel open te staan. Ik doe de rest. 😉


EN VOOR NU...
━━━━━━━━━━━━━

Adem eens diep in. Drink voldoende water. Wees mild voor jezelf.
Heb je een vraag? Antwoord gewoon op deze mail of bel me op {telefoon}.

Ik kijk ernaar uit!

Liefs,
Nathalie 🔥
Rise Like A Phoenix`
  },

  gepland: {
    naam: "Sessie ingepland",
    wanneer: "Na het inplannen",
    onderwerp: "Je sessie staat vast: {datum} 📅",
    tekst:
`Dag {voornaam}!

Goed nieuws: je sessie {nr} van {totaal} ({sessie}) staat vast! 🙌

📅 {datum}
🕐 {tijd}
📍 {vorm}

Wat kan je doen?
✨ Zorg die dag voor wat rust en ruimte voor jezelf
💧 Drink voldoende water, voor én na de sessie
💛 En vooral: wees mild voor jezelf

Past het toch niet? Laat het me gerust weten, dan zoeken we een ander moment.

Tot dan!

Liefs,
Nathalie 🔥`
  },

  herinnering: {
    naam: "Herinnering sessie",
    wanneer: "Dag voor de sessie",
    onderwerp: "Morgen is het zover, {voornaam} ✨",
    tekst:
`Dag {voornaam},

Een klein berichtje om je eraan te herinneren dat morgen ({datum} om {tijd}) je sessie {sessie} is. ✨

💧 Drink vandaag en morgen voldoende water
🕊️ Plan na de sessie wat rustige tijd voor jezelf
💛 Alles wat je voelt, mag er zijn

Ik kijk ernaar uit!

Liefs,
Nathalie 🔥`
  },

  afgerond: {
    naam: "Sessie afgerond",
    wanneer: "Na een sessie",
    onderwerp: "Sessie {nr} van {totaal} is afgerond 💛",
    tekst:
`Dag {voornaam},

Je sessie {nr} van {totaal} is afgerond! 💛

{boodschap}

Het is heel normaal dat er de komende dagen dingen in beweging komen: emoties, herinneringen, vermoeidheid of juist een gevoel van lichtheid. Dat is een goed teken: er mag iets loskomen. 🕊️

💧 Drink voldoende water
😴 Gun jezelf extra rust
📝 Merk je iets op? Schrijf het gerust even op en deel het met me

Nog {rest} sessie(s) te gaan. Ik ben trots op je!

Liefs,
Nathalie 🔥`
  },

  resultaten: {
    naam: "Resultaten sessie",
    wanneer: "Na een sessie",
    onderwerp: "De resultaten van je sessie 🧡",
    tekst:
`Dag {voornaam},

Hier de resultaten van je sessie :)

{notities}

Happy Healing ;)



Warme groeten
Nathalie 🧡
www.riselikeaphoenix.be
nathalie@riselikeaphoenix.be
BE08 2323 4545


(Disclaimer:

Het loslaten van vastzittende emoties met behulp van de Emotiecode, Bodycode, Beliefcode of een andere vorm van energetische genezing die door deze beoefenaar wordt beoefend, hetzij in persoon of bij volmacht, is geen vervanging van medische zorg. Deze informatie is niet bedoeld als medisch advies en mag niet worden gebruikt voor medische diagnose of behandeling. De aan u verstrekte informatie is niet bedoeld om een arts-patiënt relatie op te bouwen.)`
  },

  bijnaKlaar: {
    naam: "Nog 1 sessie",
    wanneer: "Bijna klaar",
    onderwerp: "Nog één sessie te gaan, {voornaam} 🌱",
    tekst:
`Dag {voornaam},

Wat gaat de tijd snel! Je traject {sessie} nadert het einde: er staat nog één sessie open. 🌱

Ik ben benieuwd hoe het nu met je gaat. Merk je al verschil?

Voel je dat er nog meer mag loskomen? Dan kunnen we na deze laatste sessie gerust samen kijken naar een vervolgtraject. Laat het me gewoon weten. 💛

Liefs,
Nathalie 🔥`
  },

  review: {
    naam: "Traject afgerond + review",
    wanneer: "Afgerond",
    onderwerp: "Hoe gaat het nu met je, {voornaam}? 🔥",
    tekst:
`Dag {voornaam},

Het is een tijdje geleden dat we je traject {sessie} hebben afgerond, en ik ben benieuwd: hoe gaat het nu met je? 💛

Zou je in een paar zinnen willen delen wat de sessies voor jou betekend hebben? Daarmee help je anderen die twijfelen om ook de stap te zetten. Het duurt maar 2 minuutjes:

👉 {reviewlink}

En als er ooit opnieuw iets opborrelt: je weet me te vinden. 🔥

Merci voor je vertrouwen!

Liefs,
Nathalie 🔥`
  },

  betaling: {
    naam: "Betaalgegevens",
    wanneer: "Betaling",
    onderwerp: "Je betaalgegevens voor {sessie}",
    tekst:
`Dag {voornaam},

Hierbij de gegevens om je pakket {pakket} te betalen:

💶 Bedrag: €{prijs}
🏦 Rekening: {iban}
📝 Vermelding: {factuurnr}

Zodra je betaling binnen is, laat ik het je weten. Heb je vragen? Antwoord gewoon op deze mail.

Liefs,
Nathalie 🔥`
  },

  leeg: {
    naam: "Leeg mailtje",
    wanneer: "Altijd",
    onderwerp: "Rise Like A Phoenix",
    tekst:
`Dag {voornaam},



Liefs,
Nathalie 🔥`
  }
};
