# Frederik Urbančík – finančné sprostredkovanie

Osobná webová prezentácia s konzultačným formulárom, ktorý skutočne doručuje e-maily (server-side cez Resend).

**Stack:** Vite + TypeScript (bez frameworku), čisté CSS, serverless funkcia `api/contact.ts` (Vercel), Vitest, ESLint.

## Rýchly štart

```bash
npm install
cp .env.example .env      # vyplňte hodnoty
npm run dev               # web + lokálne /api/contact
npm run check             # lint + typecheck + testy + build
```

## 1. Povinné doplnenie údajov (pred zverejnením)

Brief neobsahoval overené kontaktné ani regulačné údaje. Žiadne neboli vymyslené. Vyplňte ich v
`site.config.ts` (alebo cez premenné prostredia pri builde, pozri `.env.example`):

| Pole | Na čo slúži |
|---|---|
| `email` | odkazy `mailto:`, tlačidlo „Napísať email“, záložný kontakt pri chybe formulára |
| `phone`, `phoneE164` | zobrazenie a odkazy `tel:` |
| `BUSINESS_ADDRESS` | vložená Google mapa a tlačidlo „Otvoriť trasu v Google Maps“ |
| `siteUrl` | kanonická URL a absolútna URL obrázka pre zdieľanie (`og:image`) |
| `regulatory.*` | povinné informácie v päte (postavenie, číslo registrácie NBS, samostatný finančný agent, sektory, IČO) |
| `solutions` | ponechajte len oblasti, ktoré skutočne sprostredkúva (karty aj výber vo formulári sa prispôsobia) |
| `testimonials` | iba skutočné referencie so súhlasom klientov. Prázdne pole = sekcia sa nezobrazí. |

Kým pole chýba, web zobrazí zreteľne označený zástupný text („Doplniť: …“) a súvisiace tlačidlo
(mailto/tel/trasa/mapa) **nevykreslí**, takže na stránke nie sú nefunkčné odkazy. Build vypíše zoznam chýbajúcich polí.

Doplňte aj vzor stránky `ochrana-osobnych-udajov.html` a nechajte ho právne skontrolovať.

## 2. Doručovanie e-mailov (Resend)

1. Založte účet na [resend.com](https://resend.com), overte svoju doménu (DNS záznamy SPF/DKIM).
2. Vytvorte API kľúč.
3. Nastavte **serverové** premenné prostredia (nikdy nie s prefixom `VITE_`):
   - `RESEND_API_KEY` – API kľúč
   - `CONTACT_EMAIL` – skutočná adresa Frederika Urbančíka, kam majú správy chodiť
   - `CONTACT_FROM_EMAIL` – odosielateľ na overenej doméne, napr. `Web <web@vasa-domena.sk>`
   - `ALLOWED_ORIGIN` – voliteľne, napr. `https://www.vasa-domena.sk`

Bez týchto premenných endpoint vráti `503` a formulár zobrazí chybové hlásenie, nikdy nie falošný úspech.

### Ochrana a validácia na serveri (`server/contact.ts`)
- validácia všetkých polí, overenie súhlasu so spracúvaním údajov
- honeypot pole + minimálny čas vyplnenia (3 s) a maximálny vek formulára
- limit 5 požiadaviek / 10 min z jednej IP (best-effort v pamäti inštancie, pri vyššej záťaži použite napr. Upstash/KV)
- escapovanie HTML v e-maile, ochrana hlavičiek, limit veľkosti tela požiadavky
- odpoveď návštevníkovi sa dá poslať priamo cez „Odpovedať“ (`reply_to`)

## 3. Nasadenie

**Vercel (odporúčané):** importujte repozitár. Vercel rozpozná Vite (build `npm run build`, výstup `dist`)
a `api/contact.ts` nasadí ako serverless funkciu. Premenné z bodov 1 a 2 nastavte v *Project → Settings →
Environment Variables* a nasaďte znova.

**Iný hosting:** statický obsah z `dist/` + ľubovoľný Node server, ktorý na `POST /api/contact` zavolá
`contactNodeHandler` zo `server/node-adapter.ts` (Express, Fastify, Netlify Functions s adaptérom a pod.).

## Google Maps

Mapa používa štandardný embed `https://www.google.com/maps?q=…&output=embed` a odkaz na trasu
`https://www.google.com/maps/dir/?api=1&destination=…`. Ani jeden nepotrebuje API kľúč. Ak by ste prešli na
Maps Embed API (`/maps/embed/v1/…`), kľúč je potrebný a musí byť obmedzený na vašu doménu.

## Štruktúra

```
index.html, ochrana-osobnych-udajov.html   stránky so šablónovými značkami {{…}} a <!--@if …-->
site.config.ts                             verejné údaje webu (DOPLNIŤ)
build/template.ts                          šablónovanie HTML pri builde
server/contact.ts                          validácia, antispam, odoslanie cez Resend
server/node-adapter.ts                     Node (req, res) adaptér
api/contact.ts                             Vercel funkcia
src/                                       klientske skripty (navigácia, animácie, formulár, karusel) a štýly
tests/                                     Vitest testy servera a šablón
```

## Fotografie

Ilustračné fotografie sa načítavajú z Unsplash. Pri nedostupnosti sa zobrazí decentné tmavé pozadie.
Pre produkciu odporúčame vlastné fotografie (ideálne aj portrét) optimalizované do WebP/AVIF a hostované s webom.
