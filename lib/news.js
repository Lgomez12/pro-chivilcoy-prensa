import { sources, laRazonSearches, keywords } from './sources';
import { seedArticles } from './seeds';

const START_DATE = new Date('2026-03-01T00:00:00-03:00');
const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

const MONTHS_ES = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10',
  noviembre: '11', diciembre: '12'
};

function decodeEntities(str = '') {
  return String(str)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(str = '') {
  return decodeEntities(str)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(str = '') {
  let s = stripTags(str);
  const junk = /\s+(?:decoding|loading|srcset|sizes|src|class|style|width|height|fetchpriority|aria-[\w-]+)=/i;
  const idx = s.search(junk);
  if (idx > 0) s = s.slice(0, idx);
  return s.replace(/https?:\/\/\S+/g, '').replace(/\s*\/?>\s*$/g, '').replace(/\s+/g, ' ').trim().slice(0, 240);
}

function cleanExcerpt(str = '') {
  return stripTags(str).replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 320);
}

function isRelevant(text = '') {
  const t = String(text).toLowerCase();
  return keywords.some((k) => t.includes(k));
}

function hasStrongLocalIdentity(text = '') {
  const t = String(text).toLowerCase();
  return t.includes('noelia') || t.includes('ramos nicieza') || t.includes('felice') ||
    t.includes('lla-pro') || t.includes('lla pro') || t.includes('pro chivilcoy') ||
    t.includes('libertad avanza-pro') || t.includes('libertad avanza pro');
}

function isLocalPoliticalArticle(text = '', source = '') {
  const t = String(text).toLowerCase();
  if (hasStrongLocalIdentity(t)) return true;
  const hasParty = /\bpro\b/.test(t) || t.includes('la libertad avanza');
  if (!hasParty) return false;
  const localSignals = ['chivilcoy', 'britos', 'concejo deliberante', 'hcd', 'municipio', 'municipal', 'plaza 25 de mayo'];
  return localSignals.some((x) => t.includes(x));
}

function getTagRaw(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1] : '';
}

function getLink(block) {
  const atom = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  if (atom) return decodeEntities(atom[1]).trim();
  const normal = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  return normal ? stripTags(normal[1]) : '';
}

function normalizeDateValue(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseSpanishDate(text = '') {
  const normalized = String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const m = normalized.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(20\d{2})\b/i);
  if (!m) return null;
  const dd = String(Number(m[1])).padStart(2, '0');
  const mm = MONTHS_ES[m[2]];
  return `${m[3]}-${mm}-${dd}`;
}

function inferPeople(text = '') {
  const t = String(text).toLowerCase();
  const p = [];
  if (t.includes('noelia') || t.includes('ramos nicieza')) p.push('Noelia Ramos Nicieza');
  if (t.includes('felice')) p.push('Juan Ignacio Felice');
  if (t.includes('lla-pro') || t.includes('lla pro') || t.includes('libertad avanza-pro') || t.includes('libertad avanza pro')) p.push('LLA-PRO');
  if (/\bpro\b/i.test(text) || t.includes('pro chivilcoy')) p.push('PRO');
  if (t.includes('libertad avanza')) p.push('La Libertad Avanza');
  return [...new Set(p)];
}

function inferTopics(text = '') {
  const t = String(text).toLowerCase();
  const map = [
    ['seguridad', 'Seguridad'], ['robo', 'Seguridad'], ['delito', 'Seguridad'],
    ['vivienda', 'Vivienda'], ['terreno', 'Vivienda'], ['habitacional', 'Vivienda'],
    ['licit', 'Licitaciones'], ['obra', 'Obras públicas'], ['tasa', 'Tasas'],
    ['rafam', 'Rendición de cuentas'], ['cuentas', 'Rendición de cuentas'],
    ['empleado', 'Empleo municipal'], ['municipal', 'Gestión municipal'],
    ['transpar', 'Transparencia'], ['concejo', 'HCD'], ['hcd', 'HCD'],
    ['terminal', 'Gestión municipal'], ['comercio', 'Comercio']
  ];
  return [...new Set(map.filter(([k]) => t.includes(k)).map(([, v]) => v))].slice(0, 4);
}

function parseFeed(xml, sourceName) {
  const blocks = [
    ...(xml.match(/<item\b[\s\S]*?<\/item>/gi) || []),
    ...(xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [])
  ];
  return blocks.map((block) => {
    const title = cleanTitle(getTagRaw(block, 'title'));
    const rawDescription = getTagRaw(block, 'description') || getTagRaw(block, 'summary') || getTagRaw(block, 'content:encoded');
    const description = cleanExcerpt(rawDescription);
    const pub = stripTags(getTagRaw(block, 'pubDate') || getTagRaw(block, 'published') || getTagRaw(block, 'updated'));
    const link = getLink(block);
    const combined = `${title} ${description}`;
    return { date: normalizeDateValue(pub), title, source: sourceName, url: link, people: inferPeople(combined), topics: inferTopics(combined), excerpt: description, live: true };
  }).filter((a) => a.title && a.url && isRelevant(`${a.title} ${a.excerpt}`));
}

function parseHtmlLinks(html, baseUrl, sourceName) {
  const out = [];
  const seen = new Set();
  const re = /<a\s+[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const title = cleanTitle(m[2]);
    if (title.length < 24 || !isRelevant(title)) continue;
    let url;
    try { url = new URL(decodeEntities(m[1]), baseUrl).toString(); } catch { continue; }
    const key = url.replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ date: null, title, source: sourceName, url, people: inferPeople(title), topics: inferTopics(title), excerpt: '', live: true });
    if (out.length >= 20) break;
  }
  return out;
}

function metaContent(html, attr, value) {
  const patterns = [
    new RegExp(`<meta[^>]+${attr}=["']${value}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${value}["'][^>]*>`, 'i')
  ];
  for (const p of patterns) { const m = html.match(p); if (m) return decodeEntities(m[1]); }
  return '';
}

function extractArticleMeta(html) {
  if (!html) return {};
  const ogTitle = metaContent(html, 'property', 'og:title') || metaContent(html, 'name', 'twitter:title');
  const description = metaContent(html, 'property', 'og:description') || metaContent(html, 'name', 'description');
  const published = metaContent(html, 'property', 'article:published_time') || metaContent(html, 'name', 'article:published_time') || metaContent(html, 'name', 'date') || (html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1] || '') || (html.match(/["']datePublished["']\s*:\s*["']([^"']+)["']/i)?.[1] || '');
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '';
  return { title: cleanTitle(ogTitle || h1), excerpt: cleanExcerpt(description), date: normalizeDateValue(published) };
}

async function safeFetch(url, { jina = false } = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const target = jina ? `https://r.jina.ai/${url}` : url;
    const headers = jina
      ? {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
          'X-Return-Format': 'markdown',
          'X-No-Cache': 'true'
        }
      : {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-AR,es;q=0.9,en;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': 'https://larazondechivilcoy.com.ar/'
        };
    const res = await fetch(target, {
      headers,
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store'
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function isWithinRange(date) {
  if (!date) return false;
  const d = new Date(`${date}T12:00:00-03:00`);
  if (Number.isNaN(d.getTime())) return false;
  return d >= START_DATE && d.getTime() <= Date.now() + MAX_FUTURE_MS;
}

async function enrichArticle(article) {
  const suspiciousTitle = /(?:decoding=|loading=|srcset=|sizes=|https?:\/\/|<img|\/>)|.{220,}/i.test(article.title || '');
  const needsMeta = !article.date || suspiciousTitle || !(article.excerpt || '').trim();
  if (!needsMeta) return article;
  const html = await safeFetch(article.url);
  if (!html) return article;
  const meta = extractArticleMeta(html);
  const title = meta.title || cleanTitle(article.title);
  const excerpt = meta.excerpt || cleanExcerpt(article.excerpt);
  const combined = `${title} ${excerpt}`;
  return { ...article, title, excerpt, date: meta.date || article.date, people: inferPeople(combined), topics: inferTopics(combined) };
}


function isLaRazonUtilityPage(url = '', title = '') {
  let path = '';
  try {
    path = new URL(String(url || ''), 'https://larazondechivilcoy.com.ar').pathname.toLowerCase();
  } catch {
    path = String(url || '').split('?')[0].toLowerCase();
  }
  const t = cleanTitle(title).toLowerCase();
  const blockedPathBits = [
    'politica_de_privacidad', 'politica-de-privacidad', 'privacidad',
    'terminos', 'condiciones', 'cookies', 'cookie', 'mapa_del_sitio',
    'mapa-del-sitio', 'registrarse', 'registro', 'login', 'contacto',
    'buscar', 'busqueda', 'ediciones-anteriores', 'ediciones_anteriores'
  ];
  const blockedTitles = [
    'términos y condiciones', 'terminos y condiciones', 'política de cookies',
    'politica de cookies', 'política de privacidad', 'politica de privacidad',
    'mapa del sitio', 'registrarse', 'resultados de búsqueda', 'resultados de busqueda'
  ];
  return blockedPathBits.some((x) => path.includes(x)) || blockedTitles.some((x) => t === x || t.startsWith(x));
}

function normalizeLaRazonUrl(raw) {
  try {
    const cleaned = decodeEntities(String(raw || '').trim());
    const u = new URL(cleaned, 'https://larazondechivilcoy.com.ar');
    if (!/(^|\.)larazondechivilcoy\.com\.ar$/i.test(u.hostname)) return null;
    if (/\/noticias\/buscar\//i.test(u.pathname)) return null;
    if (!/\/noticias\//i.test(u.pathname)) return null;
    if (isLaRazonUtilityPage(u.toString())) return null;
    // Los resultados del buscador pueden agregar ?buscar=noelia / ?buscar=pro
    // al enlace de una nota real. Ese query no convierte la nota en una página de búsqueda.
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch { return null; }
}

function extractMarkdownLinks(line = '') {
  const links = [];
  const re = /\[([^\]]{3,300})\]\(([^\)]+)\)/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    links.push({ label: cleanTitle(m[1]), href: m[2].trim() });
  }
  return links;
}

function parseLaRazonMarkdown(md = '') {
  const lines = md.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const out = [];
  const seen = new Set();
  let currentDate = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parsedDate = parseSpanishDate(line);
    if (parsedDate) currentDate = parsedDate;

    const candidates = extractMarkdownLinks(line);

    // Algunas respuestas de Jina pueden dejar la URL en una línea separada.
    const bareUrls = line.match(/https?:\/\/[^\s)>]+/g) || [];
    for (const href of bareUrls) {
      candidates.push({ label: '', href });
    }

    for (const candidate of candidates) {
      const url = normalizeLaRazonUrl(candidate.href);
      if (!url) continue;
      const key = url.replace(/\/$/, '').toLowerCase();
      if (seen.has(key)) continue;

      const prev = lines.slice(Math.max(0, i - 3), i).join(' ');
      const next = lines.slice(i + 1, i + 5).join(' ');
      const nearby = cleanExcerpt(`${prev} ${line} ${next}`);

      let title = candidate.label;
      if (!title || title.length < 18) {
        const heading = [...lines.slice(Math.max(0, i - 3), i + 1)].reverse()
          .map((x) => cleanTitle(x.replace(/^#{1,6}\s*/, '').replace(/^[-*]\s*/, '')))
          .find((x) => x.length >= 18 && !/^https?:\/\//i.test(x));
        title = heading || '';
      }

      if (!title || title.length < 18) continue;
      if (isLaRazonUtilityPage(url, title)) continue;
      if (!isRelevant(`${title} ${nearby}`) && !isLocalPoliticalArticle(`${title} ${nearby}`, 'La Razón de Chivilcoy')) continue;

      const date = currentDate || parseSpanishDate(nearby);
      seen.add(key);
      out.push({
        date,
        title,
        source: 'La Razón de Chivilcoy',
        url,
        people: inferPeople(`${title} ${nearby}`),
        topics: inferTopics(`${title} ${nearby}`),
        excerpt: cleanExcerpt(next.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')),
        live: true
      });
    }
  }
  return out;
}

function pickLaRazonTitleFromContext(fragment = '', anchorText = '') {
  const candidates = [];
  if (anchorText) candidates.push(cleanTitle(anchorText));
  for (const tag of ['h1', 'h2', 'h3', 'h4', 'strong']) {
    const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let m;
    while ((m = re.exec(fragment)) !== null) candidates.push(cleanTitle(m[1]));
  }
  // La Razón suele usar el título dentro de un <a> distinto del enlace de imagen.
  const are = /<a\s+[^>]*href=["'][^"']+["'][^>]*>([\s\S]*?)<\/a>/gi;
  let am;
  while ((am = are.exec(fragment)) !== null) candidates.push(cleanTitle(am[1]));
  return candidates.find((x) => x && x.length >= 18 && !isLaRazonUtilityPage('', x)) || '';
}

function parseLaRazonHtml(html = '', baseUrl = 'https://larazondechivilcoy.com.ar') {
  const out = [];
  const seen = new Set();
  const re = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = normalizeLaRazonUrl(m[1]);
    if (!url) continue;
    const key = url.replace(/\/$/, '').toLowerCase();
    if (seen.has(key)) continue;

    const fragment = html.slice(Math.max(0, m.index - 2200), Math.min(html.length, m.index + m[0].length + 2800));
    const title = pickLaRazonTitleFromContext(fragment, m[2]);
    if (!title || title.length < 18) continue;
    if (isLaRazonUtilityPage(url, title)) continue;

    const around = cleanExcerpt(fragment);
    const combined = `${title} ${around}`;
    if (!isRelevant(combined) && !isLocalPoliticalArticle(combined, 'La Razón de Chivilcoy')) continue;

    seen.add(key);
    out.push({
      date: parseSpanishDate(fragment) || parseSpanishDate(around),
      title,
      source: 'La Razón de Chivilcoy',
      url,
      people: inferPeople(combined),
      topics: inferTopics(combined),
      excerpt: around.slice(0, 320),
      live: true
    });
  }
  return out;
}

function parseLaRazonPagination(md = '', searchUrl) {
  const urls = [];
  const wanted = (new URL(searchUrl).searchParams.get('buscar') || '').replace(/\+/g, ' ').trim().toLowerCase();

  for (const line of md.split(/\r?\n/)) {
    for (const link of extractMarkdownLinks(line)) {
      try {
        const u = new URL(link.href, searchUrl);
        if (!/(^|\.)larazondechivilcoy\.com\.ar$/i.test(u.hostname)) continue;
        if (!/\/noticias\/buscar\//i.test(u.pathname)) continue;
        const q = (u.searchParams.get('buscar') || '').replace(/\+/g, ' ').trim().toLowerCase();
        if (q !== wanted) continue;
        if (u.toString() !== searchUrl) urls.push(u.toString());
      } catch {}
    }
  }
  return [...new Set(urls)];
}

async function fetchLaRazon() {
  const all = [];

  for (const search of laRazonSearches) {
    const canonical = search.url.replace('://www.larazondechivilcoy.com.ar', '://larazondechivilcoy.com.ar');
    const queue = [canonical];
    const seenPages = new Set();

    while (queue.length && seenPages.size < search.maxPages) {
      const pageUrl = queue.shift();
      if (!pageUrl || seenPages.has(pageUrl)) continue;
      seenPages.add(pageUrl);

      // Camino principal: sitio canónico SIN www, igual que el navegador del diario.
      const direct = await safeFetch(pageUrl);
      if (direct) all.push(...parseLaRazonHtml(direct, pageUrl));

      // Segundo intento: variante www por si el hosting responde distinto desde Vercel.
      if (!direct || !parseLaRazonHtml(direct, pageUrl).length) {
        const wwwUrl = pageUrl.replace('://larazondechivilcoy.com.ar', '://www.larazondechivilcoy.com.ar');
        const directWww = await safeFetch(wwwUrl);
        if (directWww) all.push(...parseLaRazonHtml(directWww, wwwUrl));
      }

      // Respaldo: Reader. Lo usamos solo como complemento, no como fuente principal.
      const md = await safeFetch(pageUrl, { jina: true });
      if (md) {
        all.push(...parseLaRazonMarkdown(md));
        for (const p of parseLaRazonPagination(md, canonical)) {
          if (!seenPages.has(p) && queue.length < 8) queue.push(p.replace('://www.larazondechivilcoy.com.ar', '://larazondechivilcoy.com.ar'));
        }
      }
    }
  }

  const unique = dedupe(all).filter((a) => a.title && a.url && !isLaRazonUtilityPage(a.url, a.title));
  const enriched = await Promise.all(unique.map(enrichArticle));
  return enriched.filter((a) => a.title && a.url && !isLaRazonUtilityPage(a.url, a.title));
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((a) => {
    const key = (a.url || a.title || '').replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function validArticle(a) {
  if (!a?.title || !a?.url || !a?.date) return false;
  if (!isWithinRange(a.date)) return false;
  const text = `${a.title} ${a.excerpt || ''} ${(a.people || []).join(' ')}`;
  if (!isRelevant(text) && !isLocalPoliticalArticle(text, a.source)) return false;
  if (!isLocalPoliticalArticle(text, a.source)) return false;
  return true;
}

export async function getAllNews() {
  const liveCandidates = [];

  await Promise.all(sources.map(async (source) => {
    let feedWorked = false;
    for (const feed of source.feeds || []) {
      const xml = await safeFetch(feed);
      if (!xml) continue;
      const parsed = parseFeed(xml, source.name);
      if (parsed.length) { liveCandidates.push(...parsed); feedWorked = true; }
    }
    if (!feedWorked || source.pages?.length) {
      for (const page of source.pages || []) {
        const html = await safeFetch(page);
        if (html) liveCandidates.push(...parseHtmlLinks(html, page, source.name));
      }
    }
  }));

  const laRazon = await fetchLaRazon();
  liveCandidates.push(...laRazon);

  const initial = dedupe([...liveCandidates, ...seedArticles]);
  const enriched = await Promise.all(initial.map(enrichArticle));

  return dedupe(enriched)
    .filter(validArticle)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

