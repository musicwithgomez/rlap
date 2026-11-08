# Rise Like A Phoenix — website

Gewone HTML, CSS en JavaScript. Geen Wix, geen Google Forms, geen Google Sheet.
Alle data (vragenlijsten, klanten, sessies, berichten, vragen) staat in **Firebase Firestore**.

## Wat zit erin

| Bestand | Wat |
|---|---|
| `index.html` | Home |
| `hartmuur.html` | Hartmuur |
| `bodycode-emotiecode.html` | Body Code & Emotie Code |
| `emotiecode-dieren.html` | Emotiecode voor Dieren |
| `sessies.html` | Alle pakketten en prijzen |
| `over-mij.html` | About Me |
| `contact.html` | Contactformulier (komt in Admin > Berichten) |
| `vragenlijst.html` | Vragenlijst per type sessie (komt in Admin > Vragenlijsten) |
| `login.html` / `admin.html` | Inloggen en je beheerpagina |
| `js/config.js` | **Het enige bestand dat je moet invullen**: Firebase, contactgegevens, foto's, prijzen |
| `js/questions.js` | Standaardvragen (3 placeholders per sessie). Aanpassen kan ook gewoon in Admin > Vragen beheren |
| `firestore.rules` | Beveiliging van je database |

## Eerst testen (demomodus)

Zolang `apiKey` in `js/config.js` leeg is, draait alles in **demomodus**: formulieren worden enkel in je eigen browser bewaard.
Inloggen in demomodus: eender welk e-mailadres + wachtwoord `phoenix`.

Open de map lokaal met een kleine webserver, bv. in VS Code de extensie "Live Server", of in een terminal in deze map:
`python3 -m http.server` en ga naar http://localhost:8000

## Live zetten met Firebase (± 20 minuten, eenmalig)

1. Ga naar https://console.firebase.google.com en maak een project aan (bv. `rise-like-a-phoenix`).
2. **Firestore Database** > Database maken > locatie `europe-west1` (België) > productiemodus.
3. **Authentication** > Aan de slag > Aanmeldmethode **E-mailadres/wachtwoord** aanzetten.
   Bij **Users** > Gebruiker toevoegen: jouw e-mail en een sterk wachtwoord. Kopieer de **User UID**.
4. Terug in **Firestore**: maak collectie `admins`, document-ID = jouw **User UID**, veld `naam` = `Nathalie`. Dit maakt jou admin.
5. **Projectinstellingen** > Je apps > Web-app toevoegen (`</>`). Kopieer de `firebaseConfig` en plak de waarden in `js/config.js`.
6. **Firestore > Regels**: plak de inhoud van `firestore.rules` en klik Publiceren.
7. Website online zetten, kies één:
   - **Firebase Hosting** (gratis): installeer Node.js, dan in deze map `npm i -g firebase-tools`, `firebase login`, `firebase init hosting` (kies je project, public directory `.`, geen single-page app, niets overschrijven), dan `firebase deploy`. Daarna bij Hosting > Aangepast domein `riselikeaphoenix.be` koppelen.
   - Of upload de map naar je eigen hosting (Combell, One.com, Netlify...). Voeg dan je domein toe bij Authentication > Instellingen > **Geautoriseerde domeinen**.

## Dagelijks gebruik (de admin)

Open elke dag even **Vandaag**: alles wat je moet doen staat daar, met een knop die het meteen doet (welkomstmail, inplannen, resultaten invullen en mailen, betaald aanduiden, review op de site zetten). In de admin staat ook een korte handleiding: **"Hoe werkt het?"** onderaan links.

Het menu: **Vandaag · Klanten · Agenda · Berichten · Instellingen**.

**Instellingen > Website & prijzen**: prijzen, je webadres, je planlink, telefoon, e-mail, IBAN, btw-nummer en btw op facturen. Wat je daar bewaart, staat meteen op je website. Je hoeft `js/config.js` dus niet meer aan te passen.

## 1-klik mails via je Mail-app

In het **Klantenoverzicht** klik je op een klant. Bovenaan staat "E-mail sturen" met de **volgende stap** (bv. de welkomstmail na een nieuwe vragenlijst) en alle andere mails. Eén klik opent de mail kant-en-klaar in je Mail-app (Mail op je MacBook): naam, sessie, datum, planlink... alles is ingevuld. Jij leest na en drukt op Versturen.

- **Sessie afronden + mail openen** en **Sessie opslaan + mail openen** doen het in één beweging.
- De teksten pas je aan in **Admin > E-mailteksten** (knop "Test naar mezelf" om te kijken hoe het eruitziet).
- Vul in `js/config.js` bij `SITE.website` je echte webadres in, zodat links in de mails (bv. de reviewlink) naar je website wijzen.
- Mails via je Mail-app zijn gewone tekst: emoji's en witregels werken, vet en kleur niet.
- Op je Mac: kies in Mail > Instellingen > Algemeen "Standaard e-mailprogramma: Mail" als de knop niet in Mail opent.

## Automatische e-mails (± 10 minuten, eenmalig)

De site stuurt mails via **EmailJS** (gratis tot 200 mails per maand, geen server nodig).

1. Maak een gratis account op https://www.emailjs.com.
2. **Email Services** > Add New Service > **Gmail** (of Outlook) > koppel het mailadres waarmee je wil versturen. Kopieer de **Service ID**.
3. **Email Templates** > Create New Template. Vul in:
   - **To Email**: `{{to_email}}`
   - **Subject**: `{{subject}}`
   - **Reply To**: `{{reply_to}}`
   - **Content**: klik op "Edit Content" > **Code** en plak enkel: `{{{message_html}}}` (met drie accolades)
   - Bewaar en kopieer de **Template ID**.
4. **Account** > General: kopieer je **Public Key**.
5. **Account** > Security: zet bij **Allowed origins** je website (bv. `https://jouwnaam.github.io` en `http://localhost:8000`). Zo kan niemand anders je account gebruiken.
6. Plak de drie codes in `js/config.js` bij `window.EMAIL`.

Welke mails gaan er automatisch?

| Wanneer | Naar | Mail |
|---|---|---|
| Iemand vult een vragenlijst in | klant | Bevestiging (+ link om een intakemoment te kiezen als `PLAN_LINK` ingevuld is) |
| Iemand vult een vragenlijst in | Nathalie | Melding nieuwe aanvraag |
| Contactformulier | Nathalie + afzender | Melding + "goed ontvangen" |
| Je plant een sessie in de admin | klant | Datum en uur (vinkje, standaard aan) |
| Dag vóór een sessie | klant | Herinnering |
| Je rondt een sessie af | klant | "Sessie x van y afgerond" + jouw persoonlijke boodschap |
| Nog 1 sessie over | klant | Voorstel vervolgtraject |
| 14 dagen na de laatste sessie | klant | Vraag om een review |

Herinneringen en reviewvragen worden verstuurd telkens je de admin opent (open hem dus elke dag even).

**Intake inplannen**: maak een gratis Calendly- of Cal.com-pagina en plak de link bij `window.PLAN_LINK` in `js/config.js`.

**Facturen**: in een traject klik je op "Maak factuur". Nummering loopt automatisch (2026-001, 2026-002...). Kijk `window.FACTUUR` in `js/config.js` na: btw-percentage en of je prijzen inclusief btw zijn.

## Belangrijk vóór je Wix opzegt

- **Foto's**: die komen nu nog van Wix. Download ze, zet ze in `images/` en pas de links aan in `js/config.js` (bv. `"images/nathalie.jpg"`).
- **Betalen en inboeken**: op Wix gebeurde dat via "Boek Nu". In deze site leidt "Boek Nu" naar de vragenlijst en plan jij daarna in via Admin > Sessies. Online betalen (Mollie/Stripe/Payconiq) kan er later bij.
- **Algemene Voorwaarden**: op je huidige site staat die titel zonder tekst. Plak ze in een pagina zodra je ze hebt.
- **Facebook/Instagram**: vul je links in bij `SITE` in `js/config.js`, dan verschijnen de iconen in de footer.

## Klant-login later

De database en `firestore.rules` zijn al voorbereid: een klant die inlogt met een geverifieerd e-mailadres kan enkel **zijn eigen** vragenlijsten en sessies lezen. Enkel de klantpagina zelf moet er nog bij.
