"""Z tlačových verzií článkov (_site/tlac/<jazyk>-<slug>/index.html) vyrobí A4 PDF do _site/pdf/
a tlačové HTML potom zmaže, aby sa nezverejňovalo. Spúšťa sa po `npm run build`:  python3 scripts/pdf.py"""
import pathlib, shutil, sys
from weasyprint import HTML

SITE = pathlib.Path(__file__).resolve().parent.parent / "_site"
zdroj, ciel = SITE / "tlac", SITE / "pdf"
ciel.mkdir(exist_ok=True)
pocet = 0
for html in sorted(zdroj.glob("*/index.html")):
    pdf = ciel / (html.parent.name + ".pdf")
    HTML(filename=str(html)).write_pdf(str(pdf))
    pocet += 1
    print(f"{pdf.relative_to(SITE)}  {pdf.stat().st_size // 1024} KB")
if "--nechat" not in sys.argv:
    shutil.rmtree(zdroj, ignore_errors=True)
print(f"Hotovo: {pocet} PDF")
