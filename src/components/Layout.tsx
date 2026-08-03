import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { MessageCircle, Facebook, X, Phone } from 'lucide-react';

export default function Layout() {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>
        {/* شريط سفلي */}
        <footer className="shrink-0 border-t border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-end bg-surface/80">
          <button
            type="button"
            onClick={() => setShowAbout(true)}
            className="group relative text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-secondary transition-colors"
          >
            <span className="relative z-10">
              Developed by{' '}
              <span className="font-bold text-cyan-500 dark:text-cyan-400 raqnova-glow">Raqnova</span>
            </span>
            <span className="raqnova-ray pointer-events-none absolute inset-0 overflow-hidden rounded" aria-hidden />
          </button>
        </footer>
      </div>

      {showAbout && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowAbout(false)}>
          <div
            className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-600 relative"
            onClick={e => e.stopPropagation()}
          >
            <button type="button" onClick={() => setShowAbout(false)} className="absolute left-3 top-3 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <X className="w-5 h-5 text-slate-400" />
            </button>
            <div className="flex flex-col items-center text-center space-y-4 pt-2">
              <img src="./raqnova-logo.png" alt="Raqnova" className="w-28 h-28 object-contain" />
              <div>
                <h3 className="text-xl font-bold text-cyan-500 dark:text-cyan-400">Raqnova</h3>
                <p className="text-xs text-slate-500 mt-1">Smart Software Solutions</p>
              </div>
              <a
                href="https://wa.me/2011115689670"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 w-full justify-center bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-medium"
              >
                <MessageCircle className="w-5 h-5" />
                <span>01115689670</span>
                <Phone className="w-4 h-4 opacity-80" />
              </a>
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 w-full justify-center bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-medium"
              >
                <Facebook className="w-5 h-5" />
                فيسبوك
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
