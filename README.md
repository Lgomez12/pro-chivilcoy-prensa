# PRO Chivilcoy · Archivo de prensa (v3)

Versión corregida y mejorada.

## Qué cambia
- Las noticias quedan ordenadas por fecha descendente: septiembre arriba, marzo abajo.
- El histórico comienza el 1 de marzo de 2026.
- Las notas automáticas sin fecha verificable no se publican.
- El extractor limpia HTML basura (`srcset`, `loading`, `decoding`, URLs incrustadas, etc.).
- Cuando una nota automática viene incompleta, el sistema abre la nota y busca `og:title`, `article:published_time`, `datePublished`, `time[datetime]` y descripción.
- Se descartan notas anteriores a marzo de 2026.
- Pie de página: “Creado por Lic. Gómez Leticia”.
- Vercel vuelve a consultar las fuentes cada 30 minutos mediante `revalidate`.

## Estructura correcta en GitHub
La raíz del repositorio debe mostrar:

- `app/`
- `components/`
- `lib/`
- `public/`
- `package.json`
- `next.config.mjs`
- `vercel.json`
- `README.md`

## Para volver a cargar desde cero
1. Crear un repositorio nuevo en GitHub.
2. Descomprimir este ZIP.
3. Subir **el contenido interno** del ZIP, no el ZIP ni una carpeta contenedora.
4. En Vercel: Add New → Project → importar el repositorio.
5. Framework: Next.js. Root Directory: `./`.
6. Deploy.
