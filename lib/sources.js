export const sources = [
  {
    name: 'De Chivilcoy',
    feeds: ['https://dechivilcoy.com.ar/feed/'],
    pages: [
      'https://dechivilcoy.com.ar/tag/noelia-ramos-nicieza/',
      'https://dechivilcoy.com.ar/tag/la-libertad-avanza/',
      'https://dechivilcoy.com.ar/tag/juan-felice/'
    ],
    searchFeeds: []
  },
  {
    name: 'Municipalidad / HCD Chivilcoy',
    feeds: ['https://chivilcoy.gov.ar/feed/'],
    pages: ['https://chivilcoy.gov.ar/hcd/'],
    searchFeeds: []
  },
  {
    name: 'Hoy Chivilcoy',
    feeds: ['https://hoychivilcoy.com/feed/'],
    pages: ['https://hoychivilcoy.com/'],
    searchFeeds: []
  },
  {
    name: 'Chivilcoy al Día',
    feeds: ['https://www.chivilcoyaldia.com.ar/feed/', 'https://www.chivilcoyaldia.com.ar/rss.xml'],
    pages: ['https://www.chivilcoyaldia.com.ar/'],
    searchFeeds: []
  },
  {
    name: 'La Letra Chica',
    feeds: ['https://laletrachica.com.ar/rss'],
    pages: ['https://laletrachica.com.ar/'],
    searchFeeds: []
  },
  {
    name: 'La Noticia Urbana',
    feeds: ['https://www.lanoticiaurbana.com/feed/'],
    pages: ['https://www.lanoticiaurbana.com/'],
    searchFeeds: []
  },
  {
    name: 'La Razón de Chivilcoy',
    // El sitio puede responder 403 a robots/servidores. Por eso se prueban
    // primero sus feeds y páginas y, como respaldo, búsquedas RSS indexadas.
    feeds: [
      'https://www.larazondechivilcoy.com.ar/feed/',
      'https://www.larazondechivilcoy.com.ar/rss',
      'https://www.larazondechivilcoy.com.ar/rss.xml'
    ],
    pages: [
      'https://www.larazondechivilcoy.com.ar/',
      'https://www.larazondechivilcoy.com.ar/locales/'
    ],
    searchFeeds: [
      'https://www.bing.com/search?q=site%3Alarazondechivilcoy.com.ar+%22Noelia+Ramos+Nicieza%22&format=rss',
      'https://www.bing.com/search?q=site%3Alarazondechivilcoy.com.ar+%22Ramos+Nicieza%22&format=rss',
      'https://www.bing.com/search?q=site%3Alarazondechivilcoy.com.ar+%22Juan+Felice%22&format=rss',
      'https://www.bing.com/search?q=site%3Alarazondechivilcoy.com.ar+%22La+Libertad+Avanza%22+Chivilcoy&format=rss',
      'https://www.bing.com/search?q=site%3Alarazondechivilcoy.com.ar+%22LLA-PRO%22&format=rss',
      'https://www.bing.com/search?q=site%3Alarazondechivilcoy.com.ar+%22PRO+Chivilcoy%22&format=rss'
    ]
  },
  {
    name: 'Diario La Campaña',
    feeds: [],
    pages: ['https://www.xn--diariolacampaa-2nb.com.ar/'],
    searchFeeds: []
  }
];

export const keywords = [
  'noelia ramos nicieza',
  'ramos nicieza',
  'juan ignacio felice',
  'juan felice',
  'lla-pro',
  'lla pro',
  'la libertad avanza-pro',
  'la libertad avanza pro',
  'pro chivilcoy',
  'bloque la libertad avanza',
  'alianza la libertad avanza'
];

