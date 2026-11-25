import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import footnote from "markdown-it-footnote";
const require_hash = (buf) => crypto.createHash("md5").update(buf).digest("hex").slice(0, 8);

/* Model Sustainable Web Design v4: 0,30 kWh na GB (prevádzka 0,194 + výroba zariadení 0,106),
   svetový priemer 494 g CO2e na kWh. Výsledok je odhad na jedno zobrazenie stránky. */
const KWH_NA_GB = 0.30;
const G_NA_KWH = 494;

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/img": "img", "src/css": "css", "src/CNAME": "CNAME", "src/favicon.ico": "favicon.ico" });

  /* články pre každý jazyk, zoradené podľa poľa poradie */
  const glob = { sk: "src/clanky/*.md", en: "src/en/clanky/*.md" };
  for (const [lang, g] of Object.entries(glob)) {
    eleventyConfig.addCollection("clanky_" + lang, (api) =>
      api.getFilteredByGlob(g).sort((a, b) => (a.data.poradie || 99) - (b.data.poradie || 99)));
  }

  /* všetky články oboch jazykov, z nich sa robia PDF */
  eleventyConfig.addCollection("clanky_vsetky", (api) =>
    [...api.getFilteredByGlob(glob.sk), ...api.getFilteredByGlob(glob.en)]);

  /* adresa tej istej stránky v druhom jazyku */
  eleventyConfig.addFilter("prepnut", (url, ciel) => {
    const jeEn = url.startsWith("/en/") || url === "/en";
    const bez = jeEn ? url.slice(3) || "/" : url;
    return ciel === "en" ? (jeEn ? url : "/en" + bez) : bez;
  });

  /* verzia štýlu podľa obsahu súboru, aby prehliadač po zmene nenačítal starý štýl z pamäte */
  eleventyConfig.addGlobalData("cssVerzia", () => {
    try { return require_hash(fs.readFileSync("src/css/style.css")); } catch (e) { return "1"; }
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


  /* poznámky pod čiarou v Markdowne: text[^1] a dole [^1]: citácia; čísla 01, 02 */
  const dvojmiestne = (n) => String(n).padStart(2, "0");
  eleventyConfig.amendLibrary("md", (md) => {
    md.use(footnote);
    md.renderer.rules.footnote_caption = (tokens, idx) => dvojmiestne(Number(tokens[idx].meta.id) + 1);
    md.renderer.rules.footnote_block_open = () => '<section class="poznamky"><ol>\n';
    md.renderer.rules.footnote_block_close = () => "</ol></section>\n";
    md.renderer.rules.footnote_anchor = (tokens, idx, options, env, slf) => {
      const id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);
      return ` <a href="#fnref${id}" class="spat" aria-label="späť">↑</a>`;
    };
  });

  /* dátum z hlavičky článku (RRRR-MM-DD) po slovensky alebo anglicky */
  const MESIACE_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  eleventyConfig.addFilter("datum", (d, lang) => {
    if (!d) return "";
    const x = new Date(d);
    if (isNaN(x)) return String(d);
    return lang === "en" ? `${x.getUTCDate()} ${MESIACE_EN[x.getUTCMonth()]} ${x.getUTCFullYear()}`
      : `${x.getUTCDate()}. ${x.getUTCMonth() + 1}. ${x.getUTCFullYear()}`;
  });
  eleventyConfig.addFilter("rok", (d) => (d ? new Date(d).getUTCFullYear() : ""));
  eleventyConfig.addFilter("dvojmiestne", dvojmiestne);
  eleventyConfig.addFilter("bezBodky", (t) => String(t || "").replace(/[.\s]+$/, ""));

  /* PDF: poznámky sa presunú na miesto odkazu, aby ich WeasyPrint dal dole na tú istú stranu */
  eleventyConfig.addFilter("poznamkyNaStranu", (html) => {
    const texty = {};
    const blok = html.match(/<section class="poznamky">[\s\S]*?<\/section>/);
    if (blok) {
      for (const [, id, obsah] of blok[0].matchAll(/<li id="fn(\d+)"[^>]*>([\s\S]*?)<\/li>/g)) {
        texty[id] = obsah.replace(/<a href="#fnref[^"]*" class="spat"[^>]*>.*?<\/a>/g, "").replace(/<\/?p>/g, "").trim();
      }
      html = html.replace(blok[0], "");
    }
    return html.replace(/<sup class="footnote-ref"><a href="#fn(\d+)"[^>]*>[^<]*<\/a><\/sup>/g,
      (m, id) => `<span class="poznamka">${texty[id] || ""}</span>`);
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
      .replace("<!--CO2-->", ((g) => g < 0.01 ? g.toFixed(3) : g.toFixed(2))(bytes / 1024 ** 3 * KWH_NA_GB * G_NA_KWH).replace(".", html.includes('<html lang="en"') ? "." : ","));
    /* HTML sa prenáša komprimované; počíta sa dvakrát, aby čísla v päte boli zahrnuté */
    let out = odhad(html);
    bytes += zlib.gzipSync(out).length;
    return odhad(html);
  });

  return { dir: { input: "src", output: "_site" }, markdownTemplateEngine: "njk", htmlTemplateEngine: "njk" };
}
