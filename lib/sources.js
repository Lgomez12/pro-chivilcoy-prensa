export const sources = [
  {
    name: 'De Chivilcoy',
    feeds: ['https://dechivilcoy.com.ar/feed/'],
    pages: [
      'https://dechivilcoy.com.ar/tag/noelia-ramos-nicieza/',
      'https://dechivilcoy.com.ar/tag/la-libertad-avanza/',
      'https://dechivilcoy.com.ar/tag/juan-felice/'
    ]
  },
  {
    name: 'Municipalidad / HCD Chivilcoy',
    feeds: ['https://chivilcoy.gov.ar/feed/'],
    pages: ['https://chivilcoy.gov.ar/hcd/']
  },
  {
    name: 'Hoy Chivilcoy',
    feeds: ['https://hoychivilcoy.com/feed/'],
    pages: ['https://hoychivilcoy.com/']
  },
  {
    name: 'Chivilcoy al Día',
    feeds: ['https://www.chivilcoyaldia.com.ar/feed/', 'https://www.chivilcoyaldia.com.ar/rss.xml'],
    pages: ['https://www.chivilcoyaldia.com.ar/']
  },
  {
    name: 'La Letra Chica',
    feeds: ['https://laletrachica.com.ar/rss'],
    pages: ['https://laletrachica.com.ar/']
  },
  {
    name: 'La Noticia Urbana',
    feeds: ['https://www.lanoticiaurbana.com/feed/'],
    pages: ['https://www.lanoticiaurbana.com/']
  },
  {
    name: 'La Razón de Chivilcoy',
    feeds: [],
    pages: [],
    searchPages: [
      'https://www.larazondechivilcoy.com.ar/noticias/buscar/?buscar=noelia',
      'https://www.larazondechivilcoy.com.ar/noticias/buscar/?buscar=juan+felice',
      'https://www.larazondechivilcoy.com.ar/noticias/buscar/?buscar=pro',
      'https://www.larazondechivilcoy.com.ar/noticias/buscar/?buscar=la+libertad+avanza',
      'https://www.larazondechivilcoy.com.ar/noticias/buscar/?buscar=lla-pro'
    ],
    specialParser: 'laRazonSearch'
  },
  {
    name: 'Diario La Campaña',
    feeds: [],
    pages: ['https://www.xn--diariolacampaa-2nb.com.ar/']
  }
];

export const keywords = [
  'noelia ramos nicieza',
  'ramos nicieza',
  'noelia',
  'juan ignacio felice',
  'juan felice',
  'felice',
  'lla-pro',
  'lla pro',
  'la libertad avanza-pro',
  'la libertad avanza pro',
  'pro chivilcoy',
  'bloque la libertad avanza',
  'alianza la libertad avanza',
  'la libertad avanza'
];

