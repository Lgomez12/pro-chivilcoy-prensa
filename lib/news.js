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

async function safeFetch(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PRO-Chivilcoy-Prensa/3.0; +https://vercel.app)'
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
    for (const page of (source.pages || []).slice(0, feedWorked ? 2 : (source.pages || []).length)) {
      const html = await safeFetch(page);
      if (html) liveCandidates.push(...parseHtmlLinks(html, page, source.name));
    }

    // Algunos medios, especialmente La Razón de Chivilcoy, pueden bloquear
    // consultas automatizadas con 403. En esos casos usamos RSS de buscadores
    // como vía de descubrimiento. Los resultados siguen apuntando al artículo
    // indexado y pasan por los mismos filtros de relevancia y fecha.
    for (const searchFeed of (source.searchFeeds || [])) {
      const xml = await safeFetch(searchFeed);
      if (xml && /<(rss|feed)\b/i.test(xml)) {
        liveCandidates.push(...parseFeed(xml, source.name));
      }
    }
  }));

  const dedupedLive = dedupe(liveCandidates).slice(0, 70);
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

