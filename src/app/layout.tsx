import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Allo Inventory',
  description: 'Multi-warehouse inventory & reservation platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-semibold text-slate-900 text-lg">Allo Inventory</span>
            </a>
            <div className="flex items-center gap-4">
              <a href="/" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Products
              </a>
              <a href="/api/warehouses" target="_blank" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                Warehouses
              </a>
            </div>
          </div>
        </nav>
        <main className="min-h-screen">{children}</main>
        <footer className="bg-white border-t border-slate-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
            Allo Inventory Platform — Multi-warehouse reservation system
          </div>
        </footer>
      </body>
    </html>
  );
}
