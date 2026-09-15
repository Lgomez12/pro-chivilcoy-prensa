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
    name: 'Diario La Campaña',
    feeds: [],
    pages: ['https://www.xn--diariolacampaa-2nb.com.ar/']
  }
];

// La Razón se obtiene por búsqueda indexada en Bing RSS.
// Así evitamos depender del buscador interno del diario, que bloquea consultas de Vercel.
export const laRazonIndexedQueries = [
  'site:larazondechivilcoy.com.ar/noticias "Noelia Ramos Nicieza"',
  'site:larazondechivilcoy.com.ar/noticias "Ramos Nicieza"',
  'site:larazondechivilcoy.com.ar/noticias "Juan Felice"',
  'site:larazondechivilcoy.com.ar/noticias "Juan Ignacio Felice"',
  'site:larazondechivilcoy.com.ar/noticias "LLA-PRO" Chivilcoy',
  'site:larazondechivilcoy.com.ar/noticias "La Libertad Avanza" Chivilcoy',
  'site:larazondechivilcoy.com.ar/noticias PRO Chivilcoy'
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
