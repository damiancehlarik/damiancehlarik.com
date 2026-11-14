#!/usr/bin/env python3
"""
Duotón: z fotky urobí 1-bitový obrázok v jednej z farieb webu.

Použitie:
  python3 scripts/duoton.py foto/skrina.jpg cervena
  python3 scripts/duoton.py foto/skrina.jpg modra --sirka 1000 --kontrast 1.4
  python3 scripts/duoton.py foto/*.jpg zelena          (viac fotiek naraz)

Farby: modra, zelena, cervena
Výsledok sa uloží do src/img/<nazov>.png a náhľad do src/img/nahlad/<nazov>.png

Možnosti:
  --sirka 800     šírka v pixeloch (predvolené 800)
  --kontrast 1.25 viac = výraznejšie svetlá a tiene
  --jas 1.0       menej ako 1 = tmavší obrázok (hodí sa pri svetlých objektoch)
  --invert        prevráti svetlé a tmavé
"""
import sys, os, argparse
from PIL import Image, ImageOps, ImageEnhance

FARBY = {
    "modra":   ("#3D4FA3", "#E0E2EE"),
    "zelena":  ("#3E7D62", "#E0E8E5"),
    "cervena": ("#C4533F", "#F2E3E0"),
}

def hex2rgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]

def duoton(src, farba, sirka, kontrast, jas, invert, ciel):
    """Uloží obrázok pre článok a menší náhľad pre mriežku (img/nahlad/)."""
    spracuj(src, farba, sirka, kontrast, jas, invert, ciel)
    spracuj(src, farba, 400, kontrast, jas, invert, os.path.join(ciel, "nahlad"))

def spracuj(src, farba, sirka, kontrast, jas, invert, ciel):
    os.makedirs(ciel, exist_ok=True)
    img = Image.open(src)
    img = ImageOps.exif_transpose(img).convert("L")
    if img.width > sirka:
        img = img.resize((sirka, round(img.height * sirka / img.width)), Image.LANCZOS)
    img = ImageOps.autocontrast(img, cutoff=1)
    img = ImageEnhance.Contrast(img).enhance(kontrast)
    img = ImageEnhance.Brightness(img).enhance(jas)
    if invert:
        img = ImageOps.invert(img)
    bit = img.convert("1")  # Floyd-Steinberg dithering
    tmava, svetla = FARBY[farba]
    out = bit.convert("P")
    out.putpalette(hex2rgb(tmava) + hex2rgb(svetla) + [0] * 762)
    nazov = os.path.splitext(os.path.basename(src))[0] + ".png"
    cesta = os.path.join(ciel, nazov)
    out.save(cesta, optimize=True, bits=1)
    print(f"{cesta}  {out.width}×{out.height}  {os.path.getsize(cesta) // 1024} KB")

if __name__ == "__main__":
    p = argparse.ArgumentParser(description="1-bitový duotón pre web")
    p.add_argument("fotky", nargs="+")
    p.add_argument("farba", choices=FARBY.keys())
    p.add_argument("--sirka", type=int, default=800)
    p.add_argument("--kontrast", type=float, default=1.25)
    p.add_argument("--jas", type=float, default=1.0)
    p.add_argument("--invert", action="store_true")
    a = p.parse_args()
    ciel = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "img")
    os.makedirs(ciel, exist_ok=True)
    for f in a.fotky:
        duoton(f, a.farba, a.sirka, a.kontrast, a.jas, a.invert, os.path.normpath(ciel))
