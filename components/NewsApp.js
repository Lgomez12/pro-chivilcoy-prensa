'use client';

import { useEffect, useMemo, useState } from 'react';

const YEARS = ['2026', '2027', '2028', '2029'];
const MONTHS = [
  ['Todos', 'Todos los meses'], ['01', 'Enero'], ['02', 'Febrero'], ['03', 'Marzo'],
  ['04', 'Abril'], ['05', 'Mayo'], ['06', 'Junio'], ['07', 'Julio'], ['08', 'Agosto'],
  ['09', 'Septiembre'], ['10', 'Octubre'], ['11', 'Noviembre'], ['12', 'Diciembre']
];

function formatDate(date) {
  if (!date) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(`${date}T12:00:00`)).replace('.', '');
}

export default function NewsApp() {
  const [data, setData] = useState({ articles: [], updatedAt: null });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [person, setPerson] = useState('Todas');
  const currentYear = String(new Date().getFullYear());
  const [year, setYear] = useState(YEARS.includes(currentYear) ? currentYear : '2026');
  const [month, setMonth] = useState('Todos');

  useEffect(() => {
    fetch('/api/noticias', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const people = ['Todas', 'Noelia Ramos Nicieza', 'Juan Ignacio Felice', 'LLA-PRO', 'PRO', 'La Libertad Avanza'];

  const filtered = useMemo(() => {
    return [...data.articles]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .filter((a) => {
        const haystack = `${a.title} ${a.source} ${a.excerpt || ''} ${(a.people || []).join(' ')} ${(a.topics || []).join(' ')}`.toLowerCase();
        const okQuery = !query || haystack.includes(query.toLowerCase());
        const okPerson = person === 'Todas' || (a.people || []).includes(person);
        const okYear = !year || (a.date || '').slice(0, 4) === year;
        const okMonth = month === 'Todos' || (a.date || '').slice(5, 7) === month;
        return okQuery && okPerson && okYear && okMonth;
      });
  }, [data.articles, query, person, year, month]);

  const sourceCount = new Set(data.articles.map((a) => a.source)).size;
  const noeliaCount = data.articles.filter((a) => (a.people || []).includes('Noelia Ramos Nicieza')).length;

  return (
    <main>
      <header className="hero">
        <div className="heroInner">
          <img src="/logo-pro.png" alt="PRO" className="logo" />
          <div>
            <p className="eyebrow">CHIVILCOY · ARCHIVO DE PRENSA</p>
            <h1>Actualidad del PRO y LLA–PRO</h1>
            <p className="lead">Notas, apariciones públicas y actividad legislativa desde marzo de 2026. La publicación más reciente aparece siempre primero.</p>
          </div>
        </div>
      </header>

      <section className="container stats">
        <div><strong>{data.articles.length}</strong><span>notas relevadas</span></div>
        <div><strong>{sourceCount}</strong><span>medios / fuentes</span></div>
        <div><strong>{noeliaCount}</strong><span>con Noelia</span></div>
        <div><strong>30 min</strong><span>actualización automática</span></div>
      </section>

      <section className="container controls controls3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por tema, medio o palabra…" />
        <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Año">
          {YEARS.map((y) => <option value={y} key={y}>{y}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Mes">
          {MONTHS.map(([v, l]) => <option value={v} key={v}>{l}</option>)}
        </select>
      </section>

      <section className="container pills" aria-label="Filtros por protagonista">
        {people.map((p) => <button key={p} onClick={() => setPerson(p)} className={person === p ? 'active' : ''}>{p}</button>)}
      </section>

      <section className="container resultsHeader">
        <h2>Últimas noticias</h2>
        <p>{loading ? 'Buscando publicaciones…' : `${filtered.length} resultados`}</p>
      </section>

      <section className="container grid">
        {filtered.map((a, i) => (
          <article className="card" key={`${a.url}-${i}`}>
            <div className="cardTop"><span className="date">{formatDate(a.date)}</span><span className="source">{a.source}</span></div>
            <h3>{a.title}</h3>
            {a.excerpt && <p className="excerpt">{a.excerpt}</p>}
            <div className="tags">
              {(a.people || []).slice(0, 3).map((x) => <span key={x}>{x}</span>)}
              {(a.topics || []).slice(0, 2).map((x) => <span className="topic" key={x}>{x}</span>)}
            </div>
            <a href={a.url} target="_blank" rel="noreferrer" className="read">Leer nota original <span>↗</span></a>
          </article>
        ))}
      </section>

      {!loading && filtered.length === 0 && <div className="container empty">No hay notas que coincidan con esos filtros.</div>}

      <footer className="footer">
        <div className="container footerInner">
          <p><strong>PRO Chivilcoy · Archivo de prensa</strong></p>
          <p>Este sitio no reproduce notas completas: organiza títulos, referencias y enlaces hacia los medios originales.</p>
          <p className="creator">Creado por Lic. Gómez Leticia</p>
          {data.updatedAt && <p className="updated">Última consulta automática: {new Date(data.updatedAt).toLocaleString('es-AR')}</p>}
        </div>
      </footer>
    </main>
  );
}
