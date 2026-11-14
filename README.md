# damiancehlarik.com

Malý statický web. Články sú textové súbory, obrázky sú 1-bitové duotóny a celý web sa zostaví nástrojom [Eleventy](https://www.11ty.dev). Zverejňuje sa cez GitHub Pages.

## Čo je kde

```
src/clanky/        články, jeden súbor = jeden článok (Markdown)
src/img/           obrázky (vyrába ich skript duoton.py)
src/_data/site.json  meno, predhovor, rozpočet stránky
src/css/style.css  celý vzhľad: písmo, farby, rozloženie
src/_includes/     šablóny (hlavička, článok, mriežka)
src/o-mne.md       stránka O mne
foto/              originálne fotky (na GitHub sa nenahrávajú)
scripts/duoton.py  z fotky urobí duotón
NOVY-CLANOK.md     vzor nového článku
```

## Prvé nastavenie (raz)

1. Nainštaluj **Node.js** (verzia LTS) z nodejs.org.
2. Nainštaluj knižnicu na obrázky: v Termináli `pip3 install Pillow`.
3. Nainštaluj **GitHub Desktop** a prihlás sa.
4. V GitHub Desktop: **File → Add Local Repository**, vyber tento priečinok, potom **Publish repository**.
5. Na github.com v repozitári: **Settings → Pages → Source: GitHub Actions**.
6. V **Settings → Pages → Custom domain** zadaj `damiancehlarik.com` a zaškrtni **Enforce HTTPS**.
7. U registrátora domény nastav DNS:
   - štyri záznamy **A** pre `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - **CNAME** pre `www` → `tvojucet.github.io`

## Náhľad na vlastnom počítači

V Termináli v tomto priečinku:

```
npm install      (len prvýkrát)
npm start
```

Web beží na http://localhost:8080 a pri každom uložení súboru sa sám obnoví.

## Nový článok

1. Fotky daj do priečinka `foto/`.
2. Preveď ich na duotón (farby: `modra`, `zelena`, `cervena`):
   ```
   python3 scripts/duoton.py foto/moja-fotka.jpg modra
   ```
   Pri svetlých objektoch pomôže `--jas 0.8`, pri plochých fotkách `--kontrast 1.5`.
3. Skopíruj `NOVY-CLANOK.md` do `src/clanky/` a premenuj ho. Názov súboru bude adresa článku, napríklad `src/clanky/lido.md` → damiancehlarik.com/clanky/lido/.
4. Vyplň hlavičku (názov, téma, dátum, perex, obrázok) a napíš text.
5. V GitHub Desktop daj **Commit** a **Push**. O minútu je článok na webe.

## Obrázky v článku

Rozloženie sa určí samé podľa toho, ako obrázky napíšeš:

| V texte | Na webe |
|---|---|
| jeden obrázok na šírku na samostatnom riadku | cez celú šírku |
| jeden obrázok na výšku na samostatnom riadku | užší, v strede |
| dva alebo tri obrázky na jednom riadku | vedľa seba, rovnaká výška, nič sa neoreže |

Text v hranatých zátvorkách `![takto]` je popis pod obrázkom. Číslovanie (№ 26.6.1) aj Obrazová príloha na konci článku sa doplnia samé.

## Témy

Téma je riadok `tema:` v hlavičke článku. Nová téma sa na webe objaví sama, keď ju použiješ v prvom článku.

## Úprava vzhľadu

Farby a písmo sú navrchu súboru `src/css/style.css`. Predhovor sa mení v `src/_data/site.json`. Ak niečo meníš s Claudom, pošli mu príslušný súbor a napíš, čo má byť inak.
