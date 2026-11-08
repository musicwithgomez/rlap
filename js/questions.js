/* =========================================================
   STANDAARDVRAGEN PER SESSIETYPE
   Dit zijn de beginvragen (placeholders). Je kan ze later gewoon
   aanpassen in de adminpagina > "Vragen beheren" — dan worden ze in
   Firestore bewaard en hoef je dit bestand niet meer aan te raken.

   Vraagtypes:
   - "textarea"  lang antwoord
   - "text"      kort antwoord
   - "scale"     schaal van 1 tot 10
   - "choice"    één keuze uit opties   (opties: ["A","B"])
   - "multi"     meerdere keuzes        (opties: ["A","B"])
   ========================================================= */
/* Naam, e-mail en telefoon worden al gevraagd in stap 2 ("Jouw gegevens"). */
const CODE_VRAGEN = [
  { id: "geslacht", label: "Geslacht", type: "choice", opties: ["Vrouw", "Man", "Anders"], verplicht: true },
  { id: "leeftijd", label: "Leeftijd", type: "text", verplicht: true },
  { id: "kinderen", label: "Kinderen: leeftijd (+ geboortejaar) en namen", hint: "Geen kinderen? Dan mag je dit leeg laten.", type: "textarea", verplicht: false },
  { id: "top5", label: "Wat zijn de 5 belangrijkste problemen waar je nu mee zit?", hint: "Bijvoorbeeld 1. ... 2. ... 3. ... 4. ... 5. ...", type: "textarea", verplicht: true },
  { id: "trauma", label: "Wat is de meest ingrijpende gebeurtenis in je leven geweest?", hint: "Deel enkel wat goed voelt voor jou.", type: "textarea", verplicht: false },
  { id: "ouders", label: "Zijn je mama en papa nog bij ons?", type: "textarea", verplicht: false },
  { id: "band", label: "Hoe is (of was) de band met je ouders, je kinderen en andere naasten?", type: "textarea", verplicht: false },
  { id: "broerszussen", label: "Heb je broers of zussen? Hoeveel, en hoe is de band met hen?", type: "textarea", verplicht: false }
];

window.DEFAULT_QUESTIONS = {
  hartmuur: [
    { id: "geslacht", label: "Geslacht", type: "choice", opties: ["Vrouw", "Man", "Anders"], verplicht: true },
    { id: "leeftijd", label: "Leeftijd", type: "text", verplicht: true },
    { id: "kinderen", label: "Kinderen: leeftijd en namen", hint: "Geen kinderen? Dan mag je dit leeg laten.", type: "textarea", verplicht: false }
  ],
  bodycode: CODE_VRAGEN,
  beliefcode: CODE_VRAGEN,
  dieren: [
    { id: "q1", label: "Emotiecode voor Dieren – vraag 1 (placeholder)", type: "textarea", verplicht: true },
    { id: "q2", label: "Emotiecode voor Dieren – vraag 2 (placeholder)", type: "textarea", verplicht: false },
    { id: "q3", label: "Emotiecode voor Dieren – vraag 3 (placeholder)", type: "textarea", verplicht: false }
  ]
};
