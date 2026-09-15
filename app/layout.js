import './globals.css';

export const metadata = {
  title: 'PRO Chivilcoy | Prensa y actualidad',
  description: 'Archivo de notas y apariciones públicas del PRO, LLA-PRO y La Libertad Avanza en Chivilcoy.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
