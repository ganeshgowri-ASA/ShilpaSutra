import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShilpaSutra - AI CAD & CFD Platform",
  description: "AI-powered Text/Multimodal to CAD & CFD platform with conversational design agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface text-white antialiased">
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className="w-16 bg-surface-light border-r border-gray-700 flex flex-col items-center py-4 gap-4">
            <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center font-bold text-lg">
              SS
            </div>
            <nav className="flex flex-col gap-3 mt-4">
              <a href="/" className="p-2 rounded-lg hover:bg-surface-lighter transition" title="Dashboard">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              </a>
              <a href="/designer" className="p-2 rounded-lg hover:bg-surface-lighter transition" title="CAD Designer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
              </a>
              <a href="/simulator" className="p-2 rounded-lg hover:bg-surface-lighter transition" title="CFD Simulator">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </a>
              <a href="/library" className="p-2 rounded-lg hover:bg-surface-lighter transition" title="Parts Library">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </a>
            </nav>
          </aside>
          {/* Main Content */}
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
