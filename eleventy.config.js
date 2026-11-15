import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

/* Model Sustainable Web Design v4: 0,30 kWh na GB (prevádzka 0,194 + výroba zariadení 0,106),
   svetový priemer 494 g CO2e na kWh. Výsledok je odhad na jedno zobrazenie stránky. */
const KWH_NA_GB = 0.30;
const G_NA_KWH = 494;

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/img": "img", "src/css": "css", "src/CNAME": "CNAME" });

  /* články pre každý jazyk, zoradené podľa poľa poradie */
  const glob = { sk: "src/clanky/*.md", en: "src/en/clanky/*.md" };
  for (const [lang, g] of Object.entries(glob)) {
    eleventyConfig.addCollection("clanky_" + lang, (api) =>
      api.getFilteredByGlob(g).sort((a, b) => (a.data.poradie || 99) - (b.data.poradie || 99)));
  }

  /* adresa tej istej stránky v druhom jazyku */
  eleventyConfig.addFilter("prepnut", (url, ciel) => {
    const jeEn = url.startsWith("/en/") || url === "/en";
    const bez = jeEn ? url.slice(3) || "/" : url;
    return ciel === "en" ? (jeEn ? url : "/en" + bez) : bez;
  });

  /* články s daným filtrom (režim alebo sila) */
  eleventyConfig.addFilter("sFiltrom", (list, key) =>
    (list || []).filter((p) => p.data.rezim === key || (p.data.sily || []).includes(key)));

  /* bio: [[slug|text]] je odkaz, ak článok existuje, inak obyčajný text; skratky dostanú <abbr> */
  eleventyConfig.addFilter("bio", (text, clanky, zaklad, skratky) => {
    const sl = new Set((clanky || []).map((p) => p.page.fileSlug));
    let out = String(text).replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (m, slug, label) =>
      sl.has(slug) ? `<a href="${zaklad}/clanky/${slug}/">${label}</a>` : label);
    for (const [k, v] of Object.entries(skratky || {})) {
      const re = new RegExp(`(^|[\\s(])(${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?=[\\s,.;:)?]|$)`);
      out = out.replace(re, `$1<abbr data-plne="${v}" aria-label="${k}, ${v}" tabindex="0">$2</abbr>`);
    }
    return out;
  });

  /* váha stránky a odhad emisií, vpísané do päty pri zostavení */
  let cssGz = null;
  eleventyConfig.addTransform("vaha", function (html) {
    if (!this.page.outputPath || !this.page.outputPath.endsWith(".html")) return html;
    if (!html.includes("<!--VAHA-->")) return html;
    if (cssGz === null) {
      try { cssGz = zlib.gzipSync(fs.readFileSync("src/css/style.css")).length; } catch (e) { cssGz = 0; }
    }
    const site = JSON.parse(fs.readFileSync("src/_data/site.json", "utf8"));
    let bytes = cssGz + (site.pismo_bajty || 0);
    const obr = new Set();
    for (const [, src] of html.matchAll(/<img [^>]*src="(\/img\/[^"]+)"/g)) obr.add(src);
    for (const src of obr) { try { bytes += fs.statSync(path.join("src", src)).size; } catch (e) {} }
    const odhad = (h) => h.replace("<!--VAHA-->", Math.round(bytes / 1024) + " KB")
      .replace("<!--CO2-->", (bytes / 1024 ** 3 * KWH_NA_GB * G_NA_KWH).toFixed(2).replace(".", html.includes('<html lang="en"') ? "." : ","));
    /* HTML sa prenáša komprimované; počíta sa dvakrát, aby čísla v päte boli zahrnuté */
    let out = odhad(html);
    bytes += zlib.gzipSync(out).length;
    return odhad(html);
  });

  return { dir: { input: "src", output: "_site" }, markdownTemplateEngine: "njk", htmlTemplateEngine: "njk" };
}
