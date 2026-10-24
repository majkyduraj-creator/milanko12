# Súdny znalec – odhad hodnoty nehnuteľností

Webová prezentácia súdneho znalca v odbore stavebníctvo, odhad hodnoty nehnuteľností a pozemných stavieb
(Košická 49D, 821 01 Bratislava).

## Technológie

Statický web: **Vite + TypeScript** (bez frameworku), čisté CSS s design tokenmi, ESLint.

Vizuálny štýl: tmavá polnočná modrá `#0A0E27`, takmer čierna `#080A10`, šampanské zlato `#C9A876`,
teplá slonovinová `#F7F5F0`, sivá `#A4A6B3`; písma Playfair Display + Inter; tlačidlá v tvare pilulky.
Súčasťou je vložená Google mapa adresy Košická 49D (bez API kľúča).

```
index.html            obsah a štruktúra stránky (sémantické HTML)
src/main.ts           vstupný bod
src/nav.ts            sticky hlavička, mobilné menu (Esc, focus trap), aktívna sekcia
src/motion.ts         hero animácia, scroll reveal, načítanie/záloha fotografií
src/form.ts           validácia kontaktného formulára a odoslanie
src/config.ts         kontaktné údaje, voliteľný VITE_FORM_ENDPOINT
src/styles/           tokens, base, components, sections, valuation (doplnky pre web znalca)
public/favicon.svg
```

## Príkazy

```bash
npm install
npm run dev        # vývojový server
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run build      # typecheck + produkčný build do dist/
npm run preview    # náhľad produkčného buildu
```

## Kontaktný formulár – aktuálny stav

Formulár **neodosiela e-mail sám**, nie je napojený na žiadny backend. Po úspešnej validácii
otvorí e-mailový program návštevníka s predvyplnenou správou na `peter.villant@gmail.com`
a návštevník ju odošle sám. Stránka to návštevníkovi otvorene uvádza.

Priame odosielanie zapnete takto:

1. Založte formulár v službe, ktorá prijíma JSON POST (napr. Formspree, Basin, Getform) alebo pripravte vlastný endpoint.
   Príjemcu nastavte na `peter.villant@gmail.com`.
2. Skopírujte `.env.example` do `.env` a vyplňte `VITE_FORM_ENDPOINT=https://...`.
3. Znova zostavte web (`npm run build`). Tlačidlo sa zmení na „Odoslať požiadavku“. Hlásenie o úspechu sa zobrazí
   až vtedy, keď služba vráti úspešnú odpoveď (2xx). Pri chybe sa zobrazí chybové hlásenie s e-mailovou alternatívou.

Odosielané polia: `name`, `email`, `phone`, `propertyType`, `purpose`, `message`.

## Fotografie

Ilustračné fotografie sa načítavajú z Unsplash (`images.unsplash.com`, licencia Unsplash). Ak sa niektorá
nenačíta, zobrazí sa decentná architektonická grafika. Pred spustením odporúčame fotografie stiahnuť,
optimalizovať (WebP/AVIF) a hostovať priamo s webom, prípadne ich nahradiť vlastnými. Stránka uvádza, že ide
o ilustračné fotografie, ktoré nezobrazujú nehnuteľnosti posudzované znalcom.

## Obsahové zásady

Web zámerne neuvádza meno, registračné číslo, roky praxe, ceny, referencie ani realizované zákazky,
pretože tieto údaje neboli overené. Pred doplnením ich overte (napr. zoznam znalcov Ministerstva spravodlivosti SR).
