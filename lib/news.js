import { sources, laRazonIndexedQueries, keywords } from './sources';
import { seedArticles } from './seeds';

const START_DATE = new Date('2026-03-01T00:00:00-03:00');
const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

const LA_RAZON = 'La Razón de Chivilcoy';
const LA_RAZON_ORIGIN = 'https://larazondechivilcoy.com.ar';

const MONTHS_ES = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12'
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
    .replace(/&#(\d+);/g, (_, n) =>
      String.fromCharCode(Number(n))
    );
}

function stripTags(str = '') {
  return decodeEntities(str)
    .replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      ' '
    )
    .replace(
      /<style\b[^>]*>[\s\S]*?<\/style>/gi,
      ' '
    )
    .replace(
      /<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,
      ' '
    )
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(str = '') {
  return stripTags(str)
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

function cleanExcerpt(str = '') {
  return stripTags(str)
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 360);
}

function normalizeText(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function isRelevant(text = '') {
  const t = normalizeText(text);

  return keywords.some((k) =>
    t.includes(normalizeText(k))
  );
}

function hasStrongLocalIdentity(text = '') {
  const t = normalizeText(text);

  return [
    'noelia ramos nicieza',
    'noelia ramos',
    'ramos nicieza',
    'juan ignacio felice',
    'juan felice',
    'felice',
    'lla-pro',
    'lla pro',
    'libertad avanza-pro',
    'libertad avanza - pro',
    'libertad avanza / pro',
    'alianza la libertad avanza-pro',
    'pro chivilcoy'
  ].some((x) => t.includes(x));
}

function isLocalPoliticalArticle(text = '') {
  const t = normalizeText(text);

  if (hasStrongLocalIdentity(t)) {
    return true;
  }

  const hasParty =
    /\bpro\b/.test(t) ||
    t.includes('la libertad avanza');

  if (!hasParty) {
    return false;
  }

  const localSignals = [
    'chivilcoy',
    'concejo deliberante',
    'hcd',
    'municipio',
    'municipal',
    'britos',
    'plaza 25 de mayo',
    'concej',
    'bloque'
  ];

  return localSignals.some((x) =>
    t.includes(x)
  );
}

function getTagRaw(block, tag) {
  const m = block.match(
    new RegExp(
      `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
      'i'
    )
  );

  return m ? m[1] : '';
}

function getLink(block) {
  const atom = block.match(
    /<link[^>]+href=["']([^"']+)["'][^>]*>/i
  );

  if (atom) {
    return decodeEntities(atom[1]).trim();
  }

  const normal = block.match(
    /<link[^>]*>([\s\S]*?)<\/link>/i
  );

  return normal
    ? stripTags(normal[1])
    : '';
}

function normalizeDateValue(value) {
  if (!value) {
    return null;
  }

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  return d.toISOString().slice(0, 10);
}

function parseSpanishDate(text = '') {
  const n = normalizeText(text);

  const m = n.match(
    /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(20\d{2})\b/i
  );

  if (!m) {
    return null;
  }

  return (
    `${m[3]}-` +
    `${MONTHS_ES[m[2]]}-` +
    `${String(Number(m[1])).padStart(2, '0')}`
  );
}

function inferPeople(text = '') {
  const t = normalizeText(text);
  const p = [];

  if (
    t.includes('noelia') ||
    t.includes('ramos nicieza')
  ) {
    p.push('Noelia Ramos Nicieza');
  }

  if (t.includes('felice')) {
    p.push('Juan Ignacio Felice');
  }

  if (
    t.includes('lla-pro') ||
    t.includes('lla pro') ||
    t.includes('libertad avanza-pro') ||
    t.includes('libertad avanza - pro') ||
    t.includes('libertad avanza / pro')
  ) {
    p.push('LLA-PRO');
  }

  if (
    /\bpro\b/.test(t) ||
    t.includes('pro chivilcoy')
  ) {
    p.push('PRO');
  }

  if (
    t.includes('libertad avanza')
  ) {
    p.push(
      'La Libertad Avanza'
    );
  }

  return [...new Set(p)];
}

function inferTopics(text = '') {
  const t = normalizeText(text);

  const map = [
    ['seguridad', 'Seguridad'],
    ['robo', 'Seguridad'],
    ['delito', 'Seguridad'],
    ['vivienda', 'Vivienda'],
    ['terreno', 'Vivienda'],
    ['habitacional', 'Vivienda'],
    ['licit', 'Licitaciones'],
    ['obra', 'Obras públicas'],
    ['tasa', 'Tasas'],
    [
      'rafam',
      'Rendición de cuentas'
    ],
    [
      'cuentas',
      'Rendición de cuentas'
    ],
    [
      'empleado',
      'Empleo municipal'
    ],
    [
      'municipal',
      'Gestión municipal'
    ],
    [
      'transpar',
      'Transparencia'
    ],
    ['concejo', 'HCD'],
    ['hcd', 'HCD'],
    [
      'terminal',
      'Gestión municipal'
    ],
    ['comercio', 'Comercio']
  ];

  return [
    ...new Set(
      map
        .filter(([k]) =>
          t.includes(k)
        )
        .map(([, v]) => v)
    )
  ].slice(0, 4);
}

function parseFeed(
  xml,
  sourceName
) {
  const blocks = [
    ...(
      xml.match(
        /<item\b[\s\S]*?<\/item>/gi
      ) || []
    ),
    ...(
      xml.match(
        /<entry\b[\s\S]*?<\/entry>/gi
      ) || []
    )
  ];

  return blocks
    .map((block) => {
      const title =
        cleanTitle(
          getTagRaw(
            block,
            'title'
          )
        );

      const rawDescription =
        getTagRaw(
          block,
          'description'
        ) ||
        getTagRaw(
          block,
          'summary'
        ) ||
        getTagRaw(
          block,
          'content:encoded'
        );

      const excerpt =
        cleanExcerpt(
          rawDescription
        );

      const pub =
        stripTags(
          getTagRaw(
            block,
            'pubDate'
          ) ||
          getTagRaw(
            block,
            'published'
          ) ||
          getTagRaw(
            block,
            'updated'
          )
        );

      const url =
        getLink(block);

      const combined =
        `${title} ${excerpt}`;

      return {
        date:
          normalizeDateValue(pub),
        title,
        source:
          sourceName,
        url,
        people:
          inferPeople(
            combined
          ),
        topics:
          inferTopics(
            combined
          ),
        excerpt,
        live: true
      };
    })
    .filter(
      (a) =>
        a.title &&
        a.url &&
        isRelevant(
          `${a.title} ${a.excerpt}`
        )
    );
}

function parseHtmlLinks(
  html,
  baseUrl,
  sourceName
) {
  const out = [];
  const seen =
    new Set();

  const re =
    /<a\s+[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let m;

  while (
    (m = re.exec(html)) !== null
  ) {
    const title =
      cleanTitle(m[2]);

    if (
      title.length < 24 ||
      !isRelevant(title)
    ) {
      continue;
    }

    let url;

    try {
      url =
        new URL(
          decodeEntities(
            m[1]
          ),
          baseUrl
        ).toString();
    } catch {
      continue;
    }

    const key =
      url.replace(/\/$/, '');

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    out.push({
      date: null,
      title,
      source:
        sourceName,
      url,
      people:
        inferPeople(title),
      topics:
        inferTopics(title),
      excerpt: '',
      live: true
    });

    if (
      out.length >= 30
    ) {
      break;
    }
  }

  return out;
}

function metaContent(
  html,
  attr,
  value
) {
  const patterns = [
    new RegExp(
      `<meta[^>]+${attr}=["']${value}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${value}["'][^>]*>`,
      'i'
    )
  ];

  for (
    const p of patterns
  ) {
    const m =
      html.match(p);

    if (m) {
      return decodeEntities(
        m[1]
      );
    }
  }

  return '';
}

function extractArticleMeta(
  html
) {
  if (!html) {
    return {};
  }

  const title =
    metaContent(
      html,
      'property',
      'og:title'
    ) ||
    metaContent(
      html,
      'name',
      'twitter:title'
    ) ||
    cleanTitle(
      html.match(
        /<h1\b[^>]*>([\s\S]*?)<\/h1>/i
      )?.[1] || ''
    );

  const excerpt =
    metaContent(
      html,
      'property',
      'og:description'
    ) ||
    metaContent(
      html,
      'name',
      'description'
    );

  const published =
    metaContent(
      html,
      'property',
      'article:published_time'
    ) ||
    metaContent(
      html,
      'name',
      'article:published_time'
    ) ||
    metaContent(
      html,
      'name',
      'date'
    ) ||
    html.match(
      /<time[^>]+datetime=["']([^"']+)["']/i
    )?.[1] ||
    html.match(
      /["']datePublished["']\s*:\s*["']([^"']+)["']/i
    )?.[1] ||
    '';

  return {
    title:
      cleanTitle(title),
    excerpt:
      cleanExcerpt(excerpt),
    date:
      normalizeDateValue(
        published
      )
  };
}

async function safeFetch(
  url,
  {
    jina = false,
    timeoutMs = 9000
  } = {}
) {
  try {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        timeoutMs
      );

    const target =
      jina
        ? `https://r.jina.ai/${url}`
        : url;

    const headers =
      jina
        ? {
            'User-Agent':
              'Mozilla/5.0',
            'X-Return-Format':
              'markdown',
            'X-No-Cache':
              'true'
          }
        : {
            'User-Agent':
              'Mozilla/5.0',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language':
              'es-AR,es;q=0.9',
            'Cache-Control':
              'no-cache',
            Pragma:
              'no-cache'
          };

    const res =
      await fetch(
        target,
        {
          headers,
          signal:
            controller.signal,
          redirect:
            'follow',
          cache:
            'no-store'
        }
      );

    clearTimeout(
      timeout
    );

    if (!res.ok) {
      return null;
    }

    return await res.text();
  } catch {
    return null;
  }
}

function isWithinRange(
  date
) {
  if (!date) {
    return false;
  }

  const d =
    new Date(
      `${date}T12:00:00-03:00`
    );

  if (
    Number.isNaN(
      d.getTime()
    )
  ) {
    return false;
  }

  return (
    d >= START_DATE &&
    d.getTime() <=
      Date.now() +
        MAX_FUTURE_MS
  );
}

async function enrichArticle(
  article
) {
  const needsMeta =
    !article.date ||
    !(article.excerpt || '')
      .trim();

  if (!needsMeta) {
    return article;
  }

  const html =
    await safeFetch(
      article.url
    );

  if (!html) {
    return article;
  }

  const meta =
    extractArticleMeta(
      html
    );

  const title =
    meta.title ||
    cleanTitle(
      article.title
    );

  const excerpt =
    meta.excerpt ||
    cleanExcerpt(
      article.excerpt
    );

  const combined =
    `${title} ${excerpt}`;

  return {
    ...article,
    title,
    excerpt,
    date:
      meta.date ||
      article.date,
    people:
      inferPeople(
        combined
      ),
    topics:
      inferTopics(
        combined
      )
  };
}

function laRazonDateFromUrl(
  url = ''
) {
  try {
    const p =
      new URL(
        url,
        LA_RAZON_ORIGIN
      ).pathname;

    const m =
      p.match(
        /\/(20\d{2})\/(\d{1,2})\/(\d{1,2})\//
      );

    if (!m) {
      return null;
    }

    return (
      `${m[1]}-` +
      `${String(
        Number(m[2])
      ).padStart(2, '0')}-` +
      `${String(
        Number(m[3])
      ).padStart(2, '0')}`
    );
  } catch {
    return null;
  }
}

function normalizeLaRazonUrl(
  raw = ''
) {
  try {
    const u =
      new URL(
        decodeEntities(
          String(raw).trim()
        ),
        LA_RAZON_ORIGIN
      );

    if (
      !/(^|\.)larazondechivilcoy\.com\.ar$/i.test(
        u.hostname
      )
    ) {
      return null;
    }

    const articlePattern =
      /^\/(locales|regionales|rurales|sociales|nacionales|cultura|opinion|deportes)\/20\d{2}\/\d{1,2}\/\d{1,2}\/.+\.html$/i;

    if (
      !articlePattern.test(
        u.pathname
      )
    ) {
      return null;
    }

    u.search = '';
    u.hash = '';

    return u.toString();
  } catch {
    return null;
  }
}

function extractLaRazonUrlsFromHtml(
  html = '',
  baseUrl =
    LA_RAZON_ORIGIN
) {
  const urls = [];

  const re =
    /href=["']([^"']+)["']/gi;

  let m;

  while (
    (m = re.exec(html)) !== null
  ) {
    try {
      const absolute =
        new URL(
          decodeEntities(
            m[1]
          ),
          baseUrl
        ).toString();

      const url =
        normalizeLaRazonUrl(
          absolute
        );

      if (url) {
        urls.push(url);
      }
    } catch {}
  }

  return [
    ...new Set(urls)
  ];
}

function extractLaRazonUrlsFromText(
  text = ''
) {
  const urls = [];

  const absolute =
    text.match(
      /https?:\/\/(?:www\.)?larazondechivilcoy\.com\.ar\/[^\s)"'<>]+\.html/gi
    ) || [];

  for (
    const raw of absolute
  ) {
    const url =
      normalizeLaRazonUrl(
        raw
      );

    if (url) {
      urls.push(url);
    }
  }

  const md =
    /\[[^\]]+\]\(([^)]+)\)/g;

  let m;

  while (
    (m = md.exec(text)) !== null
  ) {
    try {
      const absoluteUrl =
        new URL(
          m[1],
          LA_RAZON_ORIGIN
        ).toString();

      const url =
        normalizeLaRazonUrl(
          absoluteUrl
        );

      if (url) {
        urls.push(url);
      }
    } catch {}
  }

  return [
    ...new Set(urls)
  ];
}

function extractSitemapLocs(
  xml = ''
) {
  return [
    ...xml.matchAll(
      /<loc>\s*([^<]+)\s*<\/loc>/gi
    )
  ].map(
    (m) =>
      decodeEntities(
        m[1]
      ).trim()
  );
}

async function collectLaRazonCandidateUrls() {
  const found =
    new Set();

  const landingPages = [
    LA_RAZON_ORIGIN,
    `${LA_RAZON_ORIGIN}/locales/`
  ];

  for (
    const page
    of landingPages
  ) {
    const html =
      await safeFetch(
        page,
        {
          timeoutMs: 7000
        }
      );

    if (html) {
      extractLaRazonUrlsFromHtml(
        html,
        page
      ).forEach(
        (u) =>
          found.add(u)
      );
    }

    const md =
      await safeFetch(
        page,
        {
          jina: true,
          timeoutMs: 7000
        }
      );

    if (md) {
      extractLaRazonUrlsFromText(
        md
      ).forEach(
        (u) =>
          found.add(u)
      );
    }
  }

  const sitemapUrls = [
    `${LA_RAZON_ORIGIN}/sitemap.xml`,
    `${LA_RAZON_ORIGIN}/sitemap_index.xml`
  ];

  for (
    const sitemapUrl
    of sitemapUrls
  ) {
    const xml =
      await safeFetch(
        sitemapUrl,
        {
          timeoutMs: 7000
        }
      );

    if (!xml) {
      continue;
    }

    const locs =
      extractSitemapLocs(
        xml
      );

    for (
      const loc of locs
    ) {
      const article =
        normalizeLaRazonUrl(
          loc
        );

      if (article) {
        found.add(
          article
        );
      }
    }

    const childMaps =
      locs
        .filter(
          (x) =>
            /\.xml(?:\?|$)/i.test(
              x
            )
        )
        .slice(0, 8);

    for (
      const child
      of childMaps
    ) {
      const childXml =
        await safeFetch(
          child,
          {
            timeoutMs: 7000
          }
        );

      if (!childXml) {
        continue;
      }

      for (
        const loc
        of extractSitemapLocs(
          childXml
        )
      ) {
        const article =
          normalizeLaRazonUrl(
            loc
          );

        if (article) {
          found.add(
            article
          );
        }
      }
    }
  }

  return [
    ...found
  ]
    .map((url) => ({
      url,
      date:
        laRazonDateFromUrl(
          url
        )
    }))
    .filter(
      (x) =>
        x.date &&
        isWithinRange(
          x.date
        )
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(
          a.date
        )
    )
    .slice(0, 50)
    .map(
      (x) => x.url
    );
}

function extractArticleBody(
  html = ''
) {
  const article =
    html.match(
      /<article\b[^>]*>([\s\S]*?)<\/article>/i
    )?.[1];

  const main =
    html.match(
      /<main\b[^>]*>([\s\S]*?)<\/main>/i
    )?.[1];

  return stripTags(
    article ||
    main ||
    html
  ).slice(
    0,
    18000
  );
}

async function parseLaRazonArticle(
  url
) {
  let html =
    await safeFetch(
      url,
      {
        timeoutMs: 8000
      }
    );

  let text = '';
  let meta = {};

  if (html) {
    meta =
      extractArticleMeta(
        html
      );

    text =
      extractArticleBody(
        html
      );
  }

  if (
    !html ||
    text.length < 300
  ) {
    const md =
      await safeFetch(
        url,
        {
          jina: true,
          timeoutMs: 8000
        }
      );

    if (md) {
      text =
        `${text} ${stripTags(md)}`
          .trim();

      if (!meta.title) {
        const heading =
          md.match(
            /^#\s+(.+)$/m
          )?.[1] ||
          md.match(
            /^##\s+(.+)$/m
          )?.[1] ||
          '';

        meta.title =
          cleanTitle(
            heading
          );
      }
    }
  }

  const title =
    meta.title || '';

  const excerpt =
    meta.excerpt ||
    cleanExcerpt(
      text
    );

  const combined =
    `${title} ${excerpt} ${text}`;

  if (
    !isLocalPoliticalArticle(
      combined
    )
  ) {
    return null;
  }

  return {
    date:
      meta.date ||
      laRazonDateFromUrl(
        url
      ) ||
      parseSpanishDate(
        text
      ),
    title:
      title ||
      cleanTitle(
        text.slice(
          0,
          220
        )
      ),
    source:
      LA_RAZON,
    url,
    people:
      inferPeople(
        combined
      ),
    topics:
      inferTopics(
        combined
      ),
    excerpt,
    live: true
  };
}

async function fetchLaRazonDirect() {
  const urls =
    await collectLaRazonCandidateUrls();

  const results = [];
  const batchSize = 6;

  for (
    let i = 0;
    i < urls.length;
    i += batchSize
  ) {
    const batch =
      urls.slice(
        i,
        i + batchSize
      );

    const parsed =
      await Promise.all(
        batch.map(
          parseLaRazonArticle
        )
      );

    results.push(
      ...parsed.filter(
        Boolean
      )
    );
  }

  return dedupe(
    results
  ).filter(
    (a) =>
      a.title &&
      a.url &&
      a.date &&
      isWithinRange(
        a.date
      )
  );
}

function decodeUrlRepeatedly(
  value = ''
) {
  let out =
    String(
      value || ''
    ).trim();

  for (
    let i = 0;
    i < 3;
    i++
  ) {
    try {
      const next =
        decodeURIComponent(
          out
        );

      if (
        next === out
      ) {
        break;
      }

      out = next;
    } catch {
      break;
    }
  }

  return decodeEntities(
    out
  );
}

function extractLaRazonUrlFromBing(
  rawLink = '',
  description = ''
) {
  const candidates = [
    rawLink,
    ...[
      ...String(
        description
      ).matchAll(
        /href=["']([^"']+)["']/gi
      )
    ].map(
      (m) => m[1]
    )
  ];

  for (
    const raw
    of candidates
  ) {
    if (!raw) {
      continue;
    }

    const decoded =
      decodeUrlRepeatedly(
        raw
      );

    const direct =
      normalizeLaRazonUrl(
        decoded
      );

    if (direct) {
      return direct;
    }

    try {
      const u =
        new URL(
          decoded,
          'https://www.bing.com'
        );

      for (
        const key
        of [
          'url',
          'u',
          'r',
          'target'
        ]
      ) {
        const v =
          u.searchParams.get(
            key
          );

        if (!v) {
          continue;
        }

        const original =
          normalizeLaRazonUrl(
            decodeUrlRepeatedly(
              v
            )
          );

        if (original) {
          return original;
        }
      }
    } catch {}
  }

  return null;
}

function parseBingRssForLaRazon(
  xml = ''
) {
  const blocks =
    xml.match(
      /<item\b[\s\S]*?<\/item>/gi
    ) || [];

  const out = [];

  for (
    const block
    of blocks
  ) {
    const title =
      cleanTitle(
        getTagRaw(
          block,
          'title'
        )
      );

    const rawDescription =
      getTagRaw(
        block,
        'description'
      );

    const excerpt =
      cleanExcerpt(
        rawDescription
      );

    const bingLink =
      getLink(block);

    const url =
      extractLaRazonUrlFromBing(
        bingLink,
        rawDescription
      );

    const date =
      laRazonDateFromUrl(
        url || ''
      ) ||
      normalizeDateValue(
        stripTags(
          getTagRaw(
            block,
            'pubDate'
          )
        )
      );

    if (
      !url ||
      !title ||
      !date
    ) {
      continue;
    }

    const combined =
      `${title} ${excerpt}`;

    if (
      !isLocalPoliticalArticle(
        combined
      ) &&
      !isRelevant(
        combined
      )
    ) {
      continue;
    }

    out.push({
      date,
      title,
      source:
        LA_RAZON,
      url,
      people:
        inferPeople(
          combined
        ),
      topics:
        inferTopics(
          combined
        ),
      excerpt,
      live: true
    });
  }

  return out;
}

function bingRssUrl(
  query,
  first = 1
) {
  return (
    `https://www.bing.com/search?q=` +
    `${encodeURIComponent(query)}` +
    `&format=rss&setlang=es-AR&cc=AR&first=${first}`
  );
}

async function fetchLaRazonIndexed() {
  const urls = [];

  for (
    const query
    of laRazonIndexedQueries
  ) {
    urls.push(
      bingRssUrl(
        query,
        1
      )
    );

    urls.push(
      bingRssUrl(
        query,
        11
      )
    );
  }

  const responses =
    await Promise.all(
      urls.map(
        async (url) => {
          const xml =
            await safeFetch(
              url,
              {
                timeoutMs: 7000
              }
            );

          return xml
            ? parseBingRssForLaRazon(
                xml
              )
            : [];
        }
      )
    );

  return dedupe(
    responses.flat()
  ).filter(
    (a) =>
      a.title &&
      a.url &&
      a.date &&
      isWithinRange(
        a.date
      )
  );
}

function dedupe(items) {
  const seen =
    new Set();

  return items.filter(
    (a) => {
      const key =
        (
          a.url ||
          a.title ||
          ''
        )
          .replace(
            /[?#].*$/,
            ''
          )
          .replace(
            /\/$/,
            ''
          )
          .toLowerCase();

      if (
        !key ||
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}

function validArticle(a) {
  if (
    !a?.title ||
    !a?.url ||
    !a?.date
  ) {
    return false;
  }

  if (
    !isWithinRange(
      a.date
    )
  ) {
    return false;
  }

  const text =
    `${a.title} ` +
    `${a.excerpt || ''} ` +
    `${(a.people || []).join(' ')}`;

  return isLocalPoliticalArticle(
    text
  );
}

export async function getAllNews() {
  const liveCandidates = [];

  await Promise.all(
    sources.map(
      async (source) => {
        let feedWorked =
          false;

        for (
          const feed
          of source.feeds || []
        ) {
          const xml =
            await safeFetch(
              feed
            );

          if (!xml) {
            continue;
          }

          const parsed =
            parseFeed(
              xml,
              source.name
            );

          if (
            parsed.length
          ) {
            liveCandidates.push(
              ...parsed
            );

            feedWorked =
              true;
          }
        }

        if (
          !feedWorked ||
          source.pages?.length
        ) {
          for (
            const page
            of source.pages || []
          ) {
            const html =
              await safeFetch(
                page
              );

            if (html) {
              liveCandidates.push(
                ...parseHtmlLinks(
                  html,
                  page,
                  source.name
                )
              );
            }
          }
        }
      }
    )
  );

  const [
    laRazonDirect,
    laRazonIndexed
  ] =
    await Promise.all([
      fetchLaRazonDirect(),
      fetchLaRazonIndexed()
    ]);

  liveCandidates.push(
    ...laRazonDirect,
    ...laRazonIndexed
  );

  const initial =
    dedupe([
      ...liveCandidates,
      ...seedArticles
    ]);

  const enriched =
    await Promise.all(
      initial.map(
        enrichArticle
      )
    );

  return dedupe(
    enriched
  )
    .filter(
      validArticle
    )
    .sort(
      (a, b) =>
        (
          b.date || ''
        ).localeCompare(
          a.date || ''
        )
    );
}
