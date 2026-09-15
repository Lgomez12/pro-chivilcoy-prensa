import { sources, keywords } from './sources';
import { seedArticles } from './seeds';

const START_DATE = new Date('2026-03-01T00:00:00-03:00');
const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

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
  // Corta basura de atributos HTML que a veces queda pegada al título.
  const junk = /\s+(?:decoding|loading|srcset|sizes|src|class|style|width|height|fetchpriority|aria-[\w-]+)=/i;
  const idx = s.search(junk);
  if (idx > 0) s = s.slice(0, idx);
  s = s
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s*\/?>\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s.slice(0, 240);
}

function cleanExcerpt(str = '') {
  return stripTags(str)
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 260);
}

function isRelevant(text = '') {
  const t = String(text).toLowerCase();
  return keywords.some((k) => t.includes(k));
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
    ['licit', 'Licitaciones'], ['obra', 'Obras públicas'],
    ['tasa', 'Tasas'], ['rafam', 'Rendición de cuentas'], ['cuentas', 'Rendición de cuentas'],
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
    const rawTitle = getTagRaw(block, 'title');
    const rawDescription = getTagRaw(block, 'description') || getTagRaw(block, 'summary') || getTagRaw(block, 'content:encoded');
    const title = cleanTitle(rawTitle);
    const description = cleanExcerpt(rawDescription);
    const pub = stripTags(getTagRaw(block, 'pubDate') || getTagRaw(block, 'published') || getTagRaw(block, 'updated'));
    const link = getLink(block);
    const combined = `${title} ${description}`;
    return {
      date: normalizeDateValue(pub),
      title,
      source: sourceName,
      url: link,
      people: inferPeople(combined),
      topics: inferTopics(combined),
      excerpt: description,
      live: true
    };
  }).filter((a) => a.title && a.url && isRelevant(`${a.title} ${a.excerpt}`));
}



const SPANISH_MONTHS = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10',
  noviembre: '11', diciembre: '12'
};

function normalizeSpanishDate(text = '') {
  const m = stripTags(text).toLowerCase().match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(20\d{2})\b/i);
  if (!m) return null;
  return `${m[3]}-${SPANISH_MONTHS[m[2].toLowerCase()]}-${String(m[1]).padStart(2, '0')}`;
}

function parseLaRazonSearch(html, pageUrl, sourceName) {
  const out = [];
  const seen = new Set();
  const anchorRe = /<a\s+[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;

  while ((m = anchorRe.exec(html)) !== null) {
    const title = cleanTitle(m[2]);
    if (title.length < 16) continue;

    let url;
    try {
      url = new URL(decodeEntities(m[1]), pageUrl).toString();
    } catch {
      continue;
    }

    // Solo notas reales de La Razón; excluye buscador, secciones y navegación.
    if (!/larazondechivilcoy\.com\.ar\/noticias\//i.test(url)) continue;
    if (/\/noticias\/buscar\//i.test(url)) continue;

    const key = url.replace(/[?#].*$/, '').replace(/\/$/, '');
    if (seen.has(key)) continue;

    // El título no siempre nombra a Noelia/Felice. En La Razón muchas veces
    // el nombre aparece en la bajada; por eso evaluamos el bloque completo.
    const before = html.slice(Math.max(0, m.index - 2200), m.index);
    const after = html.slice(anchorRe.lastIndex, Math.min(html.length, anchorRe.lastIndex + 1800));
    const context = cleanExcerpt(`${before} ${title} ${after}`).slice(-1200);
    if (!isRelevant(`${title} ${context}`)) continue;

    seen.add(key);

    // La fecha suele aparecer inmediatamente antes de la tarjeta.
    const dateMatches = [...before.matchAll(/\b\d{1,2}\s+DE\s+(?:ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+DE\s+20\d{2}\b/gi)];
    const dateText = dateMatches.length ? dateMatches[dateMatches.length - 1][0] : '';
    const date = normalizeSpanishDate(dateText);

    // Busca una bajada cercana sin tragarse la tarjeta siguiente.
    let excerptCandidate = cleanExcerpt(after
      .replace(/<img\b[^>]*>/gi, ' ')
      .replace(/<a\b[\s\S]*$/i, ' '));
    if (excerptCandidate.length < 20) excerptCandidate = cleanExcerpt(context);

    const combined = `${title} ${excerptCandidate} ${context}`;

    out.push({
      date,
      title,
      source: sourceName,
      url,
      people: inferPeople(combined),
      topics: inferTopics(combined),
      excerpt: excerptCandidate.slice(0, 260),
      live: true
    });
  }
  return out;
}

function getLaRazonPaginationLinks(html, pageUrl) {
  const links = new Set();
  const re = /<a\s+[^>]*href=["']([^"'#]+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let url;
    try { url = new URL(decodeEntities(m[1]), pageUrl).toString(); } catch { continue; }
    if (!/larazondechivilcoy\.com\.ar\/noticias\/buscar\//i.test(url)) continue;
    // Conserva solo páginas de la misma búsqueda (paginación), no otros términos.
    try {
      const current = new URL(pageUrl);
      const candidate = new URL(url);
      if ((candidate.searchParams.get('buscar') || '') !== (current.searchParams.get('buscar') || '')) continue;
      if (candidate.toString() === current.toString()) continue;
      links.add(candidate.toString());
    } catch {}
  }
  return [...links];
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
    try {
      url = new URL(decodeEntities(m[1]), baseUrl).toString();
    } catch {
      continue;
    }
    const key = url.replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      date: null,
      title,
      source: sourceName,
      url,
      people: inferPeople(title),
      topics: inferTopics(title),
      excerpt: '',
      live: true
    });
    if (out.length >= 14) break;
  }
  return out;
}

function metaContent(html, attr, value) {
  const patterns = [
    new RegExp(`<meta[^>]+${attr}=["']${value}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${value}["'][^>]*>`, 'i')
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return decodeEntities(m[1]);
  }
  return '';
}

function extractArticleMeta(html) {
  if (!html) return {};
  const ogTitle = metaContent(html, 'property', 'og:title') || metaContent(html, 'name', 'twitter:title');
  const description = metaContent(html, 'property', 'og:description') || metaContent(html, 'name', 'description');
  const published =
    metaContent(html, 'property', 'article:published_time') ||
    metaContent(html, 'name', 'article:published_time') ||
    metaContent(html, 'name', 'date') ||
    (html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1] || '') ||
    (html.match(/["']datePublished["']\s*:\s*["']([^"']+)["']/i)?.[1] || '');
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '';

  return {
    title: cleanTitle(ogTitle || h1),
    excerpt: cleanExcerpt(description),
    date: normalizeDateValue(published)
  };
}

async function fetchText(url, timeoutMs = 5500) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.7'
      },
      signal: controller.signal,
      next: { revalidate: 1800 }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function safeFetch(url) {
  // 1) Intento directo.
  const direct = await fetchText(url);
  if (direct) return direct;

  // 2) La Razón bloquea con 403 a servidores de Vercel aunque abre bien en navegador.
  //    Para ese medio usamos AllOrigins como proxy de lectura de respaldo.
  if (/larazondechivilcoy\.com\.ar/i.test(url)) {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const proxied = await fetchText(proxyUrl, 7000);
    if (proxied) return proxied;
  }

  return null;
}
function isWithinRange(date) {
  if (!date) return false;
  const d = new Date(`${date}T12:00:00-03:00`);
  if (Number.isNaN(d.getTime())) return false;
  const now = Date.now();
  return d >= START_DATE && d.getTime() <= now + MAX_FUTURE_MS;
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
  return {
    ...article,
    title,
    excerpt,
    date: meta.date || article.date,
    people: inferPeople(combined),
    topics: inferTopics(combined)
  };
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
  if (!isRelevant(`${a.title} ${a.excerpt || ''} ${(a.people || []).join(' ')}`)) return false;
  return true;
}

export async function getAllNews() {
  const liveCandidates = [];

  await Promise.all(sources.map(async (source) => {
    let feedWorked = false;
    for (const feed of source.feeds) {
      const xml = await safeFetch(feed);
      if (xml && /<(rss|feed)\b/i.test(xml)) {
        liveCandidates.push(...parseFeed(xml, source.name));
        feedWorked = true;
        break;
      }
    }

    // Las páginas por etiqueta/home sirven de respaldo incluso si el feed funciona.
    // Se limita la cantidad para no sobrecargar la función.
    for (const page of source.pages.slice(0, feedWorked ? 2 : source.pages.length)) {
      const html = await safeFetch(page);
      if (html) liveCandidates.push(...parseHtmlLinks(html, page, source.name));
    }

    // La Razón de Chivilcoy: consulta su buscador interno. Además sigue la paginación
    // para recuperar el histórico y no quedarse solo con la primera página reciente.
    const searchPages = source.searchPages || [];
    if (searchPages.length) {
      const firstRound = await Promise.all(searchPages.map(async (page) => ({
        page,
        html: await safeFetch(page)
      })));

      const pagination = new Set();
      for (const { page, html } of firstRound) {
        if (!html) continue;
        if (source.specialParser === 'laRazonSearch') {
          liveCandidates.push(...parseLaRazonSearch(html, page, source.name));
          for (const p of getLaRazonPaginationLinks(html, page)) pagination.add(p);
        } else {
          liveCandidates.push(...parseHtmlLinks(html, page, source.name));
        }
      }

      // Tope razonable para Vercel Hobby. Se priorizan páginas encontradas por el propio sitio.
      const extraPages = [...pagination].slice(0, 12);
      const extraRound = await Promise.all(extraPages.map(async (page) => ({
        page,
        html: await safeFetch(page)
      })));
      for (const { page, html } of extraRound) {
        if (!html) continue;
        if (source.specialParser === 'laRazonSearch') {
          liveCandidates.push(...parseLaRazonSearch(html, page, source.name));
        } else {
          liveCandidates.push(...parseHtmlLinks(html, page, source.name));
        }
      }
    }
  }));

  const dedupedLive = dedupe(liveCandidates).slice(0, 140);
  const enrichedLive = await Promise.all(dedupedLive.map(enrichArticle));

  // Las notas históricas verificadas quedan siempre disponibles, aun cuando el feed deje de mostrarlas.
  const merged = dedupe([...enrichedLive, ...seedArticles])
    .map((a) => ({
      ...a,
      title: cleanTitle(a.title),
      excerpt: cleanExcerpt(a.excerpt || ''),
      people: a.people?.length ? a.people : inferPeople(`${a.title} ${a.excerpt || ''}`),
      topics: a.topics?.length ? a.topics : inferTopics(`${a.title} ${a.excerpt || ''}`)
    }))
    .filter(validArticle)
    // Orden estricto: la noticia más nueva siempre arriba; marzo y las más viejas quedan abajo.
    .sort((a, b) => b.date.localeCompare(a.date));

  return merged;
}
