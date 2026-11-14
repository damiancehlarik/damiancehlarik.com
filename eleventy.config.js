import fs from "node:fs";
import path from "node:path";

/* Rozmery obrázka (PNG aj JPG) bez ďalších knižníc */
function imageSize(file) {
  try {
    const b = fs.readFileSync(file);
    if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i < b.length) {
        const m = b[i + 1], len = b.readUInt16BE(i + 2);
        if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
        i += 2 + len;
      }
    }
  } catch (e) {}
  return [3, 2];
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/img": "img", "src/css": "css", "src/CNAME": "CNAME" });

  /* všetky články, najnovšie prvé */
  eleventyConfig.addCollection("clanky", (api) =>
    api.getFilteredByGlob("src/clanky/*.md").sort((a, b) => b.date - a.date));

  /* zoznam tém zo všetkých článkov */
  eleventyConfig.addCollection("temy", (api) => {
    const t = new Set();
    api.getFilteredByGlob("src/clanky/*.md").forEach((p) => p.data.tema && t.add(p.data.tema));
    return [...t];
  });

  eleventyConfig.addFilter("slug2", (s) =>
    String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  eleventyConfig.addFilter("nahlad", (src) => String(src).replace(/^\/img\//, "/img/nahlad/"));
  eleventyConfig.addFilter("rok", (d) => new Date(d).getFullYear());
  eleventyConfig.addFilter("cislo", (d) => { const x = new Date(d); return `${x.getFullYear() % 100}.${x.getMonth() + 1}`; });
  eleventyConfig.addFilter("tematicke", (list, tema) => list.filter((p) => p.data.tema === tema));

  /* Obrázky v článkoch:
     - odsek, v ktorom sú len obrázky, sa zmení na riadok obrázkov
     - 1 obrázok na šírku = cez celú šírku, 1 na výšku = užší a v strede
     - 2 až 3 obrázky = vedľa seba, zarovnané na rovnakú výšku
     - popis = alt text, číslovanie a obrazová príloha sa doplnia samé */
  eleventyConfig.addTransform("obrazky", function (html) {
    if (!this.page.outputPath || !this.page.outputPath.endsWith(".html")) return html;
    const num = (html.match(/data-num="([^"]+)"/) || [])[1];
    const caps = [];
    let k = 0;
    html = html.replace(/<p>((?:\s*<img [^>]+>\s*)+)<\/p>/g, (m, inner) => {
      const imgs = [...inner.matchAll(/<img src="([^"]+)" alt="([^"]*)"[^>]*>/g)];
      const figs = imgs.map(([, src, alt]) => {
        const [w, h] = imageSize(path.join("src", src.replace(/^\//, "")));
        k++;
        const c = num ? `№ ${num}.${k}` : "";
        caps.push(`${c} ${alt}`.trim());
        return { w, h, html: `<img src="${src}" alt="${alt}" width="${w}" height="${h}" loading="lazy"><figcaption>${c}${alt ? "&nbsp; " + alt : ""}</figcaption>` };
      });
      if (figs.length === 1) {
        const f = figs[0], cls = f.h > f.w ? "obr jeden vyska" : "obr jeden";
        return `<figure class="${cls}">${f.html}</figure>`;
      }
      return `<div class="obr rad">${figs.map((f) => `<figure style="flex:${(f.w / f.h).toFixed(4)}">${f.html}</figure>`).join("")}</div>`;
    });
    if (caps.length)
      html = html.replace("<!--priloha-->", `<section class="priloha"><h2 class="caps">Obrazová príloha</h2><ol>${caps.map((c) => `<li>${c}</li>`).join("")}</ol></section>`);

    /* veľkosť stránky: HTML + obrázky, ktoré načíta */
    let bytes = Buffer.byteLength(html);
    for (const [, src] of html.matchAll(/<img src="(\/img\/[^"]+)"/g)) {
      try { bytes += fs.statSync(path.join("src", src)).size; } catch (e) {}
    }
    return html.replace("<!--VELKOST-->", (bytes / 1024).toFixed(1).replace(".", ",") + " KB");
  });

  return { dir: { input: "src", output: "_site" }, markdownTemplateEngine: "njk", htmlTemplateEngine: "njk" };
}
